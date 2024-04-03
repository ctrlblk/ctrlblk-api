# CtrlBlk API

This is the backend code for [CtrlBlk](https://github.com/ctrlblk/ctrlblk). It's a [cloudflare worker](https://developers.cloudflare.com/workers/) providing various endpoints used by [CtrlBlk](https://github.com/ctrlblk/ctrlblk), most noteable the ability to receive Ad Reports.

## Build CtrlBlk API

Prerequisites:

- [nodejs](https://nodejs.org/en) >= v21.2.0
- [npm](https://www.npmjs.com/) 10.2.4

To preview the worker locally locally:

```
$ git clone https://github.com/ctrlblk/ctrlblck-web.git
$ cd ctrblk
$ npm install
$ npx wrangler dev -c wrangler.toml
```

To deploy the worker to cloudflare:

```
$ git clone https://github.com/ctrlblk/ctrlblck-web.git
$ cd ctrblk
$ npm install
$ npx wrangler deploy -c api-ctrlblk-com.wrangler.toml
```

## CI Secrets

`CLOUDFLARE_ACCOUNT_ID` the cloudflare account id used for wrangler deployments via actions.

`CLOUDFLARE_API_TOKEN` a cloudflare api token used for wrangler deployments via actions.

## Worker Environment Variables & Secrets

`ADREPORT_WORKER_DOMAIN` the base domain under which CtrlBlk API is hosted.

`UPDATE_URL` the url that hosts the update page shown by CtrlBlk for new versions.

`GITHUB_REPO` the GitHub repo in which to create issues for Ad Reports.

`GITHUB_ACCESS_TOKEN` the secret GitHub access token to access above repo.

`URL_SIGN_KEY` the key used to sign access tokens needed to upload Ad Reports.

## About

- [GPLv3 license](LICENSE.txt)
- [Privacy Policy](https://ctrlblk.com/privacy)

## Acknowledgements

CtrlBlk Web makes use of the following open source projects:

- [nodejs](https://nodejs.org/en)
- [npm](https://www.npmjs.com/)
- Various others, see [package.json](package.json)