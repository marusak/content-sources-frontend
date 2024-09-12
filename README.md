## Setting up environment

Firstly you need to prepare your environment. Do these steps only once. You won't need to repeat these actions unless there is a new version of node or new npm packages.

1. Make sure [nvm](https://github.com/nvm-sh/nvm) is installed

2. `nvm use` to ensure you have the correct node version installed. If you do not, follow the instructions nvm gives you to install the appropriate version.

3. `npm install`

4. `npm run build`

## Initializing `/etc/hosts` setup

Very first time you also need to setup `/etc/hosts`. This is a __one-time__ setup that has to be done only once (unless you modify hosts) on each machine. It adds entries to your `/etc/hosts` file so you are able to access `https://[env].foo.redhat.com`.

    npm run patch:hosts

If it errors out, try running it as root or alternatively add these lines to your `/etc/hosts`:

    127.0.0.1 prod.foo.redhat.com
    ::1 prod.foo.redhat.com
    127.0.0.1 stage.foo.redhat.com
    ::1 stage.foo.redhat.com
    127.0.0.1 qa.foo.redhat.com
    ::1 qa.foo.redhat.com
    127.0.0.1 ci.foo.redhat.com
    ::1 ci.foo.redhat.com

## Running the app

TODO: keeping in mind that you have to be connected to the VPN for this to work, even in the offices
TODO: Update `config/dev.webpack.config.js` according to your application URL. [Read more](https://github.com/RedHatInsights/frontend-components/tree/master/packages/config#useproxy).

### In staging environment

__Note__: Connecting to staging environment requires access to Red Hat internal VPN, even in the offices. Following links might also be only available for Red Hat employees.

_Prerequisite_: [configure your browser](https://redhat.service-now.com/help?id=kb_article_view&sysparm_article=KB0006375&sys_kb_id=26c75be61b538490384411761a4bcbf9) to be able to access [console.stage.redhat.com](console.stage.redhat.com)
_Prerequisite_: [create stage account](https://account-manager-stage.app.eng.rdu2.redhat.com/) and include following SKUs: ES0113909,MCT3558,RH00069,RV00045,RV00099,RV00045,MCT3718,MCT3695,MCT4022,RH00004

### Locally

To run against __stage__ or __prod__ environments:

    npm run start

__OR__

To run against __local backend__ running on port 8000:

    npm run local

Now you can navigate with you browser to URL listen in the terminal output

## Testing

`npm run verify` will run `npm run lint` (eslint) and `npm test` (Jest)

## Deploying

- The starter repo uses Travis to deploy the webpack build to another Github repo defined in `.travis.yml`
  - That Github repo has the following branches:
    - `ci-beta` (deployed by pushing to `master` or `main` on this repo)
    - `ci-stable` (deployed by pushing to `ci-stable` on this repo)
    - `qa-beta` (deployed by pushing to `qa-beta` on this repo)
    - `qa-stable` (deployed by pushing to `qa-stable` on this repo)
    - `prod-beta` (deployed by pushing to `prod-beta` on this repo)
    - `prod-stable` (deployed by pushing to `prod-stable` on this repo)
- Travis uploads results to RedHatInsight's [codecov](https://codecov.io) account. To change the account, modify CODECOV_TOKEN on https://travis-ci.com/.
