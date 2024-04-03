import { Hono } from "hono"
import { cors } from "hono/cors"

import adreports from './adReports'

import updatePage from './updatePage'

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

app.get('/adreports/sign', adreports.sign);

app.post('/adreports/:uuid', adreports.upload);

app.get('/adreports/:uuid', adreports.get);

app.get('/adreports/:uuid/screenshot', adreports.getScreenshot);

app.post('/updatePageUrl', updatePage.generateUrl);

export default app