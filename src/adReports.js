import { HTTPException } from 'hono/http-exception'

import { createGitHubIssueForAdReport } from './github';

import { sign, get, upload, getScreenshot } from './signedR2Bucket'

export async function uploadAdReport(c, opts) {
    return upload(c, opts, async (uuid, adReport, env) =>
        adReport.github = await createGitHubIssueForAdReport(uuid, adReport, env))
}

export function createAdReportEndpoint(app, opts) {

    let { bucketName, pathPrefix } = opts;

    app.get(`/${pathPrefix}/sign`,
        (c) => sign(c, { pathPrefix }));
    app.get(`/${pathPrefix}/:uuid`,
        (c) => get(c, { bucket: c.env[bucketName] }));
    app.post(`/${pathPrefix}/:uuid`,
        (c) => uploadAdReport(c, { bucket: c.env[bucketName] }));
    app.get(`/${pathPrefix}/:uuid/screenshot`,
        (c) => getScreenshot(c, { bucket: c.env[bucketName] }, obj => obj.data.screenshot));
}

export default {
    uploadAdReport,
    createAdReportEndpoint,
}
