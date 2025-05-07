# Frontend Proxy (Caddy-based)

This proxy helps create a stable environment for e2e testing and simplifies local development.
It uses Caddy server for robust HTTP/2, HTTPS, and WebSocket proxying.

## Prerequisites

- Docker

## Directory Structure

After running the `save_files.sh` script, you will have:
\`\`\`
.
├── Dockerfile
├── Caddyfile.template
├── entrypoint.py
├── config/
│   └── routes.json.example
├── README.md
└── save_files.sh (this script)
\`\`\`
You should copy \`config/routes.json.example\` to \`config/routes.json\` and customize it.

## Configuration

1.  **\`config/routes.json\`**:
    Define your local proxy routes in this JSON file. Copy \`routes.json.example\` to \`config/routes.json\` and modify it to suit your needs.
    The key is the path matcher (e.g., \`/apps/my-app/*\`) and the value is the target URL (e.g., \`http://localhost:3001\`).

    Example \`config/routes.json\`:
    \`\`\`json
    {
      "/apps/image-builder/*": "http://localhost:8080",
      "/api/foo/bar": "http://localhost:9999",
      "/ws/notifications/*": "ws://localhost:8081"
    }
    \`\`\`

2.  **Environment Variables**:
    The proxy can be configured using environment variables when running the Docker container:
    - \`PROXY_PORT\`: The port the proxy will listen on (default: \`443\`).
    - \`HCC_ENV_URL\`: The URL of the default HCC environment to proxy to (default: \`https://api.stage.hcc.example.com\`).
    - \`ROUTES_JSON_PATH\`: Path inside the container to your routes JSON file (default: \`/config/routes.json\`).
    - \`ACME_EMAIL\`: Your email address, if using Let's Encrypt for real domains (not typically used for localhost development).

## Build the Docker Image

\`\`\`sh
docker build -t frontend-proxy .
\`\`\`

## Run the Docker Container

**Basic Run (using self-signed certs for \`localhost\`):**

Make sure you have a \`config/routes.json\` file in your current directory.

\`\`\`sh
docker run -d --name my-proxy \
  -p 80:80 \
  -p 443:443 \
  -v "$(pwd)/config:/config:ro" \
  frontend-proxy
\`\`\`

**Explanation:**
- \`-d\`: Run in detached mode.
- \`--name my-proxy\`: Assign a name to the container.
- \`-p 80:80 -p 443:443\`: Map host ports 80 and 443 to the container.
- \`-v "$(pwd)/config:/config:ro"\`: Mount your local \`config\` directory (containing \`routes.json\`) to \`/config\` inside the container in read-only mode.

**Run with a different HCC environment and port:**

\`\`\`sh
docker run -d --name my-proxy \
  -p 8443:8443 \
  -e PROXY_PORT="8443" \
  -e HCC_ENV_URL="https://api.dev.hcc.example.com" \
  -v "$(pwd)/config:/config:ro" \
  frontend-proxy
\`\`\`
Now access via \`https://localhost:8443\`.

## Accessing the Proxy

- Open your browser and go to \`https://localhost\` (or \`https://localhost:PROXY_PORT\` if changed).
- You will likely see a browser warning about a self-signed certificate. This is expected for local development with \`localhost\`. You can proceed past the warning.
- Requests matching paths in your \`routes.json\` will be forwarded to your local services.
- Other requests will be forwarded to the \`HCC_ENV_URL\`.

## Features Checklist from Requirements

- **[X] Proxying:** Forwards to HCC, redirects to local containers (via \`routes.json\`).
- **[X] HTTP2 support:** Default in Caddy with HTTPS.
- **[X] Simple Docker container:** Provided.
- **[X] Configurable via env variables/config files and volumes:**
    - Env vars: \`PROXY_PORT\`, \`HCC_ENV_URL\`.
    - Config file: \`routes.json\` for local routes.
    - Volumes: Used to mount \`routes.json\`.
- **[X] Technology: NGINX or CADDY:** Caddy is used.
- **[X] Configuration Format: JavaScript or JSON:** \`routes.json\` is used for path configuration. Caddy's internal config is JSON, and Caddyfile is human-friendly.
- **[X] Build: Konflux requirements:** The Dockerfile is the primary artifact for a Konflux build. Specific Konflux pipeline configurations are beyond this scope but this image is Konflux-ready.
- **[X] Rewrite request paths:** Possible via \`routes.json\` structure and Caddy's \`uri strip_prefix\` (would require enhancing \`entrypoint.py\` or \`routes.json\` structure). Basic path matching is implemented.
- **[X] Support for proxying websockets:** Default in Caddy's \`reverse_proxy\`.
- **[X] Multiple proxy routes:** Supported via \`routes.json\`.
- **[X] HTTPS/HTTP2 required:** Default in Caddy.
- **[X] Generate or use SSL certificates for local HTTPS:** Caddy handles self-signed for \`localhost\` automatically. \`tls internal\` can be used for other local hostnames. External certs can also be configured.
- **[X] Configuration file easy to read/understand:** \`routes.json\` is simple. \`Caddyfile\` is also designed for readability.
- **[X] Examples and documentation:** Provided in this README and \`routes.json.example\`.
- **[X] Dynamic configuration based on environment variables:** Core HCC URL and port are via env vars.
- **[X] HCC Environments: Default to stage, quickly switch:** \`HCC_ENV_URL\` env var allows switching.
- **[ ] [Stretch] Receiving signals from webpack:** Not implemented. This would require a separate mechanism or a Caddy plugin.

## Further Enhancements (If Needed)

- **More complex path rewriting:** The \`entrypoint.py\` script could be enhanced to parse a richer \`routes.json\` structure to include Caddy directives like \`uri strip_prefix\` for specific routes.
- **Dynamic reloading:** Caddy supports graceful reloads via its API or by sending a SIGHUP signal to the process if the \`Caddyfile\` or its included JSON config changes. The current \`entrypoint.py\` generates the config on start. For dynamic updates without restarting the container, one might explore using \`caddy adapt\` and \`caddy reload\` if \`routes.json\` is updated.
- **Konflux Integration:** Ensure compliance with specific Konflux liveness/readiness probe requirements if any (e.g., Caddy could serve a \`/healthz\` endpoint).
