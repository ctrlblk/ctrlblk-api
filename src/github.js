async function hashReportData(data) {
    let dataToHash = structuredClone(data);
    // Don't hash the image
    dataToHash.screenshot = dataToHash.screenshot.split(';')[0];
    // Don't hash the timestamp
    dataToHash.page.datetime = ""


    // encode as UTF-8
    const msgBuffer = new TextEncoder().encode(JSON.stringify(dataToHash));                    

    // hash the message
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);

    // convert ArrayBuffer to Array
    const hashArray = Array.from(new Uint8Array(hashBuffer));

    // convert bytes to hex string                  
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    return hashHex;
}

async function findFirstDuplicate(object, headers, env) {
    let requestDuplicatesSearchParams = new URLSearchParams({
        "q": `DUP=${object.hash} is:issue is:open repo:${env.GITHUB_REPO}`
    })
    let responseDuplicates = await fetch(
        `https://api.github.com/search/issues?${requestDuplicatesSearchParams.toString()}`,
        { method: "GET", headers }
    );

    let responseJson = await responseDuplicates.json();
    return responseJson?.items[0];
}

async function findByUUID(object, headers, env) {
    let requestAlreadyExistsSearchParams = new URLSearchParams({
        "q": `UUID=${object.uuid} is:issue repo:${env.GITHUB_REPO}`
    })
    let responseAlreadyExists = await fetch(
        `https://api.github.com/search/issues?${requestAlreadyExistsSearchParams.toString()}`,
        { method: "GET", headers }
    );
   
    let responseJson = await responseAlreadyExists.json();
    return responseJson?.items[0];
}

async function createFromObject(object, headers, env) {
    let createIssueURL = new URL(`https://api.github.com/repos/${env.GITHUB_REPO}/issues`);

    let dataForBody = structuredClone(object.data);
    dataForBody.screenshot = dataForBody.screenshot.split(';')[0];

    let issueUrl = new URL(object.data.page.url);

    let body = {
        "title": `${issueUrl.host}`,
        "body": [
            "### Meta",
            `UUID=${object.uuid}`,
            `DUP=${object.hash}`,
            "### Screenshot",
            `![Issue Report Screenshot](https://${env.ADREPORT_WORKER_DOMAIN}/adreports/${object.uuid}/screenshot)`,
            `[Issue Report Screenshot](https://${env.ADREPORT_WORKER_DOMAIN}/adreports/${object.uuid}/screenshot)`,
            "### Raw data",
            `\`\`\`\n${JSON.stringify(dataForBody, null, 4)}\n\`\`\``
        ].join('\n'),
    }

    let request = new Request(createIssueURL, {
        method: "POST",
        headers,
        body: JSON.stringify(body)
    });
    
    let response = await fetch(request);

    if (response.ok) {
        return await response.json();
    }
    return undefined;
}

async function closeAsDuplicate(issue, firstDuplicate, headers, env) {
    // first add a comment to reference duplicate
    let commentIssueUrl = new URL(`https://api.github.com/repos/${env.GITHUB_REPO}/issues/${issue.number}/comments`);

    let requestCommentIssue = new Request(commentIssueUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
            'body': `Duplicate of #${firstDuplicate.number}`,
        })
    });

    let responseCommentIssue = await fetch(requestCommentIssue);
    if (!responseCommentIssue.ok) {
        console.error(responseCommentIssue.status, await responseCommentIssue.text());
    }
    
    // then close issue as duplicate
    let updateIssueUrl = new URL(`https://api.github.com/repos/${env.GITHUB_REPO}/issues/${issue.number}`);

    let requestUpdateIssue = new Request(updateIssueUrl, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
            state : "closed",
            state_reason: "not_planned",
            labels: ["duplicate"],
        })
    });

    let responseUpdateIssue = await fetch(requestUpdateIssue);
    if (!responseUpdateIssue.ok) {
        console.error(responseUpdateIssue.status, await responseUpdateIssue.text());
    }
}

async function createGitHubIssue(object, env) {
    let githubApiHeaders = {
        "Accept": "application/vnd.github+json",
        "Authorization": `Bearer ${env.GITHUB_ACCESS_TOKEN}`,
        "X-GitHub-Api-Version": "2022-11-28",
        'User-Agent': 'request',
    };

    // Find first duplicate if any
    let firstDuplicate = await findFirstDuplicate(object, githubApiHeaders, env);

    // Next see if an issue for this UUID already exists
    let issue = await findByUUID(object, githubApiHeaders, env);

    if (issue === undefined) {
        // if there is none create new issue
        issue = await createFromObject(object, githubApiHeaders, env);

        // finally close as duplicate if neccesary
        if (firstDuplicate !== undefined) {
            await closeAsDuplicate(issue, firstDuplicate, githubApiHeaders, env);
        }
    }

    return {
        number: issue.number,
        url: issue.html_url,
    };
}

async function createKVEntry(object, env) {
    try {
        await env.AdReportsKV.put(object.uuid, JSON.stringify(object.data));
    } catch (e) {
        console.error(e);
    }

    return;
}

export async function createGitHubIssueForAdReport(uuid, adReport, env) {
    // create a hash for the data which is later used to find existing duplicates
    adReport.hash = await hashReportData(adReport.data);

    // Create GitHub Issue for the incoming report
    adReport.github = await createGitHubIssue(adReport, env);

    // Create KV entry for the incoming report
    await createKVEntry(adReport, env);

    // finally delete incomging request
    await env.IncomingBucket.delete(uuid);

    // TODO: Return github issue URL
    return adReport.github;
}

export default {
    createGitHubIssueForAdReport,
}