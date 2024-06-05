import { Hono } from "hono"
import { cors } from "hono/cors"

import { createAdReportEndpoint } from './adReports'

import updatePage from './updatePage'

import { createR2Endpoint } from './signedR2Bucket'

const app = new Hono()

const corsOptions = {
    origin: ['https://ctrlblk.dev', 'https://ctrlblk.com'],
};

async function corsWrapper(c, next) {
    // Allow CORS for local development
    if (c.env.CORS_DEBUG) {
        corsOptions.origin = "*";
    }
    return await cors(corsOptions)(c, next);
}

app.use('*', corsWrapper)

app.post('/updatePageUrl', updatePage.generateUrl);

createAdReportEndpoint(app, {
    // Bucket where uploaded objetcs get stored
    bucketName: "IncomingBucket",
    // path prefix used in url that gets signed
    // e.g. api.ctrlblk.dev|com/adreports/UUID
    pathPrefix: "adreports",
});

createR2Endpoint(app, {
    // Bucket where uploaded objetcs get stored
    bucketName: "CrawlResultBucket",
    // path prefix used in url that gets signed
    // e.g. api.ctrlblk.dev|com/crawlresult/UUID
    pathPrefix: "crawlresult",
});

export default app
