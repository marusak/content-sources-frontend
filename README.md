# Content Sources

Frontend for content sources service. [What is it?](https://github.com/content-services/content-sources-backend?tab=readme-ov-file#what-is-it)

<!--toc:start-->

- [Initial etc/hosts setup](#initial-etchosts-setup)
- [Getting started - Installation](#getting-started-installation)
- [Getting started - Running the app](#getting-started-running-the-app)
  - [Unit Testing](#unit-testing)
- [Testing with Playwright](#testing-with-playwright)
  - [Shared Playwright test utilities](#shared-playwright-test-utilities)
- [PR checks and linking front-end/back-end PRs for testing](#pr-checks-and-linking-front-endback-end-prs-for-testing)
- [Deploying](#deploying)
<!--toc:end-->

## Initial etc/hosts setup

In order to access the https://[env].foo.redhat.com in your browser, you have to add entries to your `/etc/hosts` file. This is a **one-time** setup that has to be done only once (unless you modify hosts) on each machine.

To setup the hosts file run following command:

```bash
yarn patch:hosts
```

Alternatively, add these lines to your /etc/hosts file:

```
127.0.0.1 prod.foo.redhat.com
::1 prod.foo.redhat.com
127.0.0.1 stage.foo.redhat.com
::1 stage.foo.redhat.com
127.0.0.1 qa.foo.redhat.com
::1 qa.foo.redhat.com
127.0.0.1 ci.foo.redhat.com
::1 ci.foo.redhat.com
```

## Getting started - Installation

1. Make sure [nvm](https://github.com/nvm-sh/nvm) is installed

2. To ensure you have the correct node version installed do: `nvm use`.
   Yarn WILL prevent you from progressing if you have not updated your node version to match the one in the .nvmrc file.

3. To run Playwright tests, you need to set up the `_playwright-tests/test-utils` submodule. If you haven't already cloned the repo with all its submodules, you can do this by running `./test-utils.sh setup`. This is a one-time setup, but if the submodule folder ever becomes empty, you'll need to run this command again. Additionally, for any existing setups, be sure to update your packages with `yarn install` to ensure everything is up to date.

4. `yarn install`

5. `yarn build` (only required when setting up for the first time)

## Getting started - Running the app

Keep in mind that you have to be connected to the VPN for this to work, even in the offices.

1. `yarn start` to choose whether to run against stage or prod environments. <br/>
   OR <br/>
   `yarn start:stage` to run against stage environment. <br/>
   OR <br/>
   `yarn start:prod` to run against prod environment. <br/>
   OR <br/>
   `yarn local` to run against a local backend running on port 8000.<br/>

2. With a browser, open the URL listed in the terminal output, <https://stage.foo.redhat.com:1337/insights/content> for example.

### Running the app in static mode with a testing proxy

Sometimes the default development proxy started with `yarn start||local` can be
slow and unstable, which can be problematic while testing. To overcome this you
can use the [frontend-development-proxy](https://github.com/RedHatInsights/frontend-development-proxy)
and run the app in static mode.

1. `yarn fec static` to start the app in static mode

2. `podman run -d -e HTTPS_PROXY=$RH_PROXY_URL -p 1337:1337 -v "$(pwd)/config:/config:ro,Z" --replace --name frontend-development-proxy quay.io/redhat-user-workloads/hcc-platex-services-tenant/frontend-development-proxy:latest` to run the proxy against stage

## Unit Testing

`yarn verify` will run `yarn build` `yarn lint` (eslint), `yarn format:check` Prettier formatting check and `yarn test` (Jest unit tests)

One can also: `yarn test` to run the unit tests directly.

## Testing with Playwright

1. Ensure the correct node version is installed and in use: `nvm use`

2. Copy the [example env file](playwright_example.env) and create a file named:`.env`
   For local development only the BASE*URL:`https://stage.foo.redhat.com:1337` and `ADMIN*\*` credentials (stage user) are required, which is already set in the example config.

3. Install Playwright browsers and dependencies
   `yarn playwright install`

   OR

   If using any OS other than Fedora/Rhel (IE:mac, ubuntu linux):

   `yarn playwright install  --with-deps`

4. Run the backend locally, steps to do this can be found in the [backend repository](https://github.com/content-services/content-sources-backend).

   Ensure that the backend is running prior to the following steps.

5. `yarn local` will start up the front-end repository. If you do `yarn start` and choose stage, your tests will attempt to run against the stage ENV, please do not test in stage.

6. `yarn playwright test` will run the playwright test suite. `yarn playwright test --headed` will run the suite in a vnc-like browser so you can watch it's interactions.

For tips and recommendations on how to write Playwright tests. Check out the Playwright [style guide](/_playwright-tests/style_guide.md) in this repo.

It is recommended to test using vs-code and the [Playwright Test module for VSCode](https://marketplace.visualstudio.com/items?itemName=ms-playwright.playwright). But other editors do have similar plugins to for ease of use, if so desired.

For running the integration tests you will need to point playwright to stage directly (i.e.: set proxy and change URL, check `playwright_example.env`), set the `INTEGRATION` flag to true and run the tests.

For running RBAC tests locally you just need to set the RBAC environment variable to `true`. See the `playwright_example.env` file for the `RBAC` flag.

### Shared Playwright test utilities

This repo contains a `_playwright-tests/test-utils` git submodule which has a set of shared helpers and fixtures (and API client) across our Playwright testing suites.
For easier interaction with this submodule there is a `test-utils.sh` script that contains 4 helper commands.

1. `setup` - This sets up (initializes the submodule and configures sparse checkout) the submodule in the regular/intended way, i.e.: pointing to our [BE repo](https://github.com/content-services/content-sources-backend) and to the commit specified in this repo. \
2. `setup-dev 'your-forks-url'` - This command is meant to be run when you would like to work on new shared test utilities while in the FE repo. To make this easier this command will setup the submodule to point to your fork as origin and our BE repo as upstream.
3. `remove` - This is meant to be run when switching between the regular and dev setups (before the setup commands), this will throw away any non-committed changes in the submodule.
4. `update` - This will fetch the newest changes of the submodule's origin and make it point to the latest commit.

<details>

  <summary>Example workflow:</summary>

_I am using the regular submodule setup. When working on new tests I thought of a new handy helper and want to add it as a shared one. \
 For that I want to work on my fork of our BE repo, so I run the `./test-utils.sh remove` and `./test-utils setup-dev 'my.forks.url'` commands. \
 Then I finish the helper, push those changes to my fork and make a PR from there (switch to the git context of the BE repo by entering the `_playwright-tests/test-utils` directory). \
 After that I make a FE draft PR and return back to the regular submodule setup by running `./test-utils.sh remove` and `./test-utils setup`. \
 When the BE PR merges I will update the FE PR to point to the newest changes in the BE by running `./test-utils.sh update` and committing, then make it ready for review!_

</details>

## Running integration tests

## Podman

For podman to serve the API for client testing, enter:

```
podman system service -t 0 unix:///tmp/podman.sock
```

Uncomment the DOCKER_SOCKET option in the `.env file:

```
DOCKER_SOCKET="/tmp/podman.sock"
```

## PR checks and linking front-end/back-end PRs for testing

The CICD pipeline for playwright (both front-end and back-end) will check in the description of the front-end PRs for the following formatted text:
`#testwith https://github.com/content-services/content-sources-backend/pull/<PR NUMBER>`

Note the space in `#testwith https`.

If a backend PR is linked, the front-end and back-end PR's in question will both use the corresponding linked branch for their Playwright tests in the PR check.

## Deploying

- The starter repo uses Travis to deploy the webpack build to another Github repo defined in `.travis.yml`
  - That Github repo has the following branches:
    - `ci-beta` (deployed by pushing to `master` or `main` on this repo)
    - `ci-stable` (deployed by pushing to `ci-stable` on this repo)
    - `qa-beta` (deployed by pushing to `qa-beta` on this repo)
    - `qa-stable` (deployed by pushing to `qa-stable` on this repo)
    - `prod-beta` (deployed by pushing to `prod-beta` on this repo)
    - `prod-stable` (deployed by pushing to `prod-stable` on this repo)
- Travis uploads results to RedHatInsight's [codecov](https://codecov.io) account. To change the account, modify CODECOV_TOKEN on <https://travis-ci.com/>.
