
import { Buffer } from "node:buffer";

import { HTTPException } from 'hono/http-exception'

import { v4 as uuidv4 } from 'uuid';

const EXPIRY = 60; // 1 minute

async function signData(data, secret) {
    const encoder = new TextEncoder();

    const secretKeyData = JSON.parse(secret);

    const key = await crypto.subtle.importKey(
        "jwk",
        secretKeyData,
        { name: "HMAC", hash: "SHA-512" },
        false,
        ["sign"]
    );

    const timestamp = Math.floor(Date.now() / 1000);
    const dataToAuthenticate = `${data}${timestamp}`;

    const mac = await crypto.subtle.sign(
        "HMAC",
        key,
        encoder.encode(dataToAuthenticate)
    );

    const base64Mac = Buffer.from(mac).toString("base64");

    return `${timestamp}-${base64Mac}`;
}

async function verifySignature(data, signature, secret) {
    const encoder = new TextEncoder();
    const secretKeyData = JSON.parse(secret);

    const key = await crypto.subtle.importKey(
        "jwk",
        secretKeyData,
        { name: "HMAC", hash: "SHA-512" },
        false,
        ["verify"]
    );

    const [timestamp, hmac] = signature.split("-");

    const receivedMac = Buffer.from(hmac, "base64");
    const assertedTimestamp = Number(timestamp);

    const dataToVerify = `${data}${assertedTimestamp}`;
    
    const verified = await crypto.subtle.verify(
        "HMAC",
        key,
        receivedMac,
        encoder.encode(dataToVerify),
    );

    // Check if the signature is expired
    if (verified && Date.now() / 1000 - assertedTimestamp > EXPIRY) {
        return false;
    }

    return verified;
}


// TODO: Add signature to /adreports/sign requests and verify it here
export async function sign(c, opts) {
    const selfURL = new URL(c.req.url);

    // Worker uses "real" url even when developing locally
    // So check LOCAL_URL_DEBUG to see if we should return a local url instead
    if (c.env.LOCAL_URL_DEBUG) {
        selfURL.protocol = "http";
        selfURL.hostname = "localhost";
        selfURL.port = "8787";
    }

    // Get UUID from request or generate new one
    const newUUID = c.req.query("uuid") || uuidv4();

    const url = new URL(`${selfURL.origin}/${opts.pathPrefix}/${newUUID}`);

    const signature = await signData(url.toString(), c.env.URL_SIGN_KEY);
    url.searchParams.set("signature", signature);

    return c.json({ url: url.toJSON() });
}

export async function upload(c, opts, cb) {
    const uuid = c.req.param("uuid");

    let url = new URL(c.req.url);
    url.searchParams.delete("signature");
    let signature = c.req.query("signature");

    // See comment above
    if (c.env.LOCAL_URL_DEBUG) {
        url.protocol = "http";
        url.hostname = "localhost";
        url.port = "8787";
    }

    let verified = await verifySignature(url.toString(), signature, c.env.URL_SIGN_KEY);

    if (!verified) {
        throw new HTTPException(401, "Unauthorized");
    }

    const data = await c.req.json()

    let adReport = {
        uuid,
        data,
    };

    // Call callback if present, allows caller to update adReport object before
    // uploading, see adReports.uploadAdReport
    if (cb) {
        cb(uuid, adReport, c.env);
    }

    await opts.bucket.put(`${uuid}.json`, JSON.stringify(adReport));

    return c.json({"status": "ok"});
}

export async function get(c, opts) {
    console.log("signedR2Bucket.get", opts);
    const uuid = c.req.param("uuid");

    let object = await opts.bucket.get(`${uuid}.json`);

    if (object === null) {
        throw new HTTPException(404, "Not Found");
    }

    return c.json(await object.json());
};

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

export async function getScreenshot(c, opts, screenshotCB) {
    const uuid = c.req.param("uuid");

    let object = await opts.bucket.get(`${uuid}.json`);

    if (object === null) {
        throw new HTTPException(404, "Not Found");
    }

    try {
        let objectJSON = await object.json();

        c.header("Content-Type", "image/jpeg");

        return c.body(dataURItoBlob(screenshotCB(objectJSON)));
    } catch (e) {
        console.log(e.message)
        throw new HTTPException(500, "Error fetching screenshot from object");
    }
}

export function createR2Endpoint(app, opts) {

    let { bucketName, pathPrefix } = opts;

    app.get(`/${pathPrefix}/sign`, (c) => sign(c, { pathPrefix }));
    app.get(`/${pathPrefix}/:uuid`, (c) => get(c, { bucket: c.env[bucketName] }));
    app.post(`/${pathPrefix}/:uuid`, (c) => upload(c, { bucket: c.env[bucketName] }));
}


export default {
    sign,
    upload,
    get,
    getScreenshot,
    createR2Endpoint,
}
