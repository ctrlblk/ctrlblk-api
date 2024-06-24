
import { sign, get, upload, getScreenshot } from './signedR2Bucket'

export function createCrawlResultEndpoint(app, opts) {

    let { bucketName, pathPrefix } = opts;

    app.get(`/${pathPrefix}/sign`, (c) => sign(c, { pathPrefix }));
    app.get(`/${pathPrefix}/:uuid`, (c) => get(c, { bucket: c.env[bucketName] }));
    app.post(`/${pathPrefix}/:uuid`, (c) => upload(c, { bucket: c.env[bucketName] }));
    app.get(`/${pathPrefix}/:uuid/screenshot`,
        (c) => getScreenshot(c, { bucket: c.env[bucketName] },
        (obj) => obj.data.outputs.screenshot));
}
