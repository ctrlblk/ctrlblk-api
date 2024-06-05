import { HTTPException } from 'hono/http-exception'

import { createGitHubIssueForAdReport } from './github';

import { sign, get, upload } from './signedR2Bucket'

function dataURItoBlob(dataURI) {
    // convert base64/URLEncoded data component to raw binary data held in a string
    var byteString;
    if (dataURI.split(',')[0].indexOf('base64') >= 0)
        byteString = atob(dataURI.split(',')[1]);
    else
        byteString = unescape(dataURI.split(',')[1]);

    // separate out the mime component
    var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];

    // write the bytes of the string to a typed array
    var ia = new Uint8Array(byteString.length);
    for (var i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }

    return new Blob([ia], {type:mimeString});
}

export async function uploadAdReport(c, opts) {
    return upload(c, opts, async (uuid, adReport, env) =>
        adReport.github = await createGitHubIssueForAdReport(uuid, adReport, env))
}

export async function getScreenshot(c, opts) {
    console.log("getScreenshot", opts);
    const uuid = c.req.param("uuid");

    let object = await opts.bucket.get(`${uuid}.json`);

    if (object === null) {
        throw new HTTPException(404, "Not Found");
    }

    try {
        let adReport = await object.json();

        c.header("Content-Type", "image/jpeg");

        return c.body(dataURItoBlob(adReport.data.screenshot));
    } catch (e) {
        throw new HTTPException(500, "Error fetching screenshot from ad report");
    }
}

export function createAdReportEndpoint(app, opts) {

    console.log("createAdReportEndpoint", JSON.stringify(opts));

    let { bucketName, pathPrefix } = opts;

    app.get(`/${pathPrefix}/sign`,
        (c) => sign(c, { pathPrefix }));
    app.get(`/${pathPrefix}/:uuid`,
        (c) => get(c, { bucket: c.env[bucketName] }));
    app.post(`/${pathPrefix}/:uuid`,
        (c) => uploadAdReport(c, { bucket: c.env[bucketName] }));
    app.get(`/${pathPrefix}/:uuid/screenshot`,
        (c) => getScreenshot(c, { bucket: c.env[bucketName] }));
}

export default {
    uploadAdReport,
    getScreenshot,
    createAdReportEndpoint,
}
