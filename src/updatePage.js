import semver from "semver";

import { HTTPException } from 'hono/http-exception'

export async function generateUrl(c) {
    let updateUrl = new URL(c.env.UPDATE_URL);
    let prevVersion, curVersion;
    let responseData = {
        open_update_page: false,
        reasons: [],
    }

    let data = await c.req.json();
    console.log("updatePageUrl.get", data);

    try {
        // Try to parse the version numbers
        prevVersion = semver.coerce(data.installed_reason.previous_version);
        curVersion = semver.coerce(data.meta.extension.version);

        // and add them to the update url
        updateUrl.searchParams.set("from", prevVersion.format());
        updateUrl.searchParams.set("to", curVersion.format());
    } catch (e) {
        throw new HTTPException(401, "Unknown parsing version(s)");
    }

    // Show update page for major updates
    if (curVersion.major > prevVersion.major) {
        responseData.open_update_page = true;
        responseData.reasons.push("major_update");
    }

    // Also look for ad report match (both can be valid reasons simultaneously)
    // And add the matching ad reports to the update url
    for (let adReport of data.ad_reports.ad_reports) {
        if (data.ad_reports.ad_reports_fixed.includes(adReport)) {
            updateUrl.searchParams.append("matchingAdReports", adReport);
            if (!responseData.open_update_page) {
                responseData.open_update_page = true;
                responseData.reasons.push("ad_report_match");
            }
        }
    }

    // append the update url in case we want to show it
    if (responseData.open_update_page) {
        responseData.update_url = updateUrl.toString();
    }

    return c.json(responseData);
}

export default { generateUrl }