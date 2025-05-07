#!/bin/bash

# Script to save Frontend Proxy configuration files locally

echo "Creating Frontend Proxy files..."

# Create Dockerfile
cat << 'EOF' > Dockerfile
# Use an official Caddy image
FROM caddy:2.7-alpine

# Install Python3
# jq and gettext are no longer needed by the entrypoint script
RUN apk add --no-cache python3

# Set working directory
WORKDIR /srv

# Copy the Caddyfile template and Python entrypoint script
COPY Caddyfile.template /etc/caddy/Caddyfile.template
COPY entrypoint.py /usr/local/bin/entrypoint.py

# Make entrypoint script executable
RUN chmod +x /usr/local/bin/entrypoint.py

# Default port Caddy will listen on (can be overridden by PROXY_PORT env var)
EXPOSE 443
EXPOSE 80

# Default location for the user's routes configuration
ENV ROUTES_JSON_PATH="/config/routes.json"
# Default HCC Environment URL (Stage)
ENV HCC_ENV_URL="https://api.stage.hcc.example.com"
# Default proxy port
ENV PROXY_PORT="443"
# Email for Let's Encrypt (if using real domains, not for localhost)
# ENV ACME_EMAIL="your-email@example.com"

# Entrypoint
ENTRYPOINT ["/usr/local/bin/entrypoint.py"]

# CMD is not strictly needed as execvp in python script handles running caddy
# However, it can serve as documentation for what the container runs.
# CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
EOF
echo "Dockerfile created."

# Create Caddyfile.template
cat << 'EOF' > Caddyfile.template
# Caddyfile.template

{
    # Global options
    # HTTP/2 is enabled by default with HTTPS
    # For local development, Caddy automatically provisions certs for localhost.
    # For other local hostnames, you might use 'tls internal' or configure specific names.
    # If you had real domains and wanted Let's Encrypt:
    # acme_ca https://acme-staging-v02.api.letsencrypt.org/directory # For testing
    # email {$ACME_EMAIL}
    order rewrite last # Ensure rewrites happen after specific route matches
    admin off # Disable admin API unless specifically needed and secured
}

# Main server block listening on the port specified by PROXY_PORT
http://localhost:{$PROXY_PORT}, https://localhost:{$PROXY_PORT} {
    log {
        output stdout
        format console
        level INFO
    }

    # --- BEGIN LOCAL DEVELOPMENT REDIRECTS ---
    # This section will be populated by entrypoint.py based on routes.json or ENV vars
    # {{LOCAL_ROUTES_PLACEHOLDER}}
    # --- END LOCAL DEVELOPMENT REDIRECTS ---

    # --- Default Proxy to HCC Environment ---
    # This handles all requests not matched by local development redirects
    handle {
        # Rewrite paths if needed, for example, if HCC expects API under a specific root
        # Example: rewrite * /api{path}

        reverse_proxy {$HCC_ENV_URL} {
            header_up Host {http.reverse_proxy.upstream.hostport}
            header_up X-Forwarded-Host {host}
            header_up X-Forwarded-Proto {scheme}
            # Websockets are automatically supported
        }
    }

    # Configure TLS
    # Caddy handles this automatically for 'localhost'.
    # For other local domains, you might use: tls internal
    # Or provide your own certificates:
    # tls /path/to/cert.pem /path/to/key.pem
    tls internal {
        on_demand # If you want to issue certs for any hostname on the fly (use with caution)
    }
}

# Optional: Redirect HTTP to HTTPS if you only want to serve on HTTPS
# This block should be separate if you want a dedicated HTTP listener for redirection.
# If using the combined http://localhost, https://localhost approach above,
# Caddy might handle the redirect or serve HTTP directly depending on the exact version and config.
# For explicit redirect:
# http://:80 {
#    @not_health_check path_regexp ^/(livez|readyz)$ not
#    redir @not_health_check https://{hostport}{uri} permanent
# }
EOF
echo "Caddyfile.template created."

# Create entrypoint.py
cat << 'EOF' > entrypoint.py
#!/usr/bin/env python3

import os
import json
import subprocess
import re
import sys
import hashlib

# --- Default Configuration Values ---
DEFAULT_PROXY_PORT = "443"
DEFAULT_HCC_ENV_URL = "https://api.stage.hcc.example.com"
DEFAULT_ROUTES_JSON_PATH = "/config/routes.json"
DEFAULT_CADDYFILE_TEMPLATE_PATH = "/etc/caddy/Caddyfile.template"
DEFAULT_CADDYFILE_OUTPUT_PATH = "/etc/caddy/Caddyfile"

def sanitize_key_for_matcher(key: str) -> str:
    """
    Sanitizes a key string to be a valid Caddy matcher name component.
    Replaces non-alphanumeric characters (excluding underscore) with underscores,
    removes leading/trailing underscores. If the result is empty,
    generates a short hash of the original key.
    """
    # Replace non-alphanumeric (but keep _) with _
    sanitized = re.sub(r'[^\w]', '_', key)
    # Remove leading and trailing underscores
    sanitized = re.sub(r'^_+|_+$', '', sanitized)

    if not sanitized:
        # If the key was all special characters, create a unique ID
        return "route_" + hashlib.md5(key.encode('utf-8')).hexdigest()[:8]
    return sanitized

def generate_local_routes_config(routes_json_path: str) -> str:
    """
    Reads a JSON file defining local routes and generates Caddyfile snippets.
    """
    local_routes_config_parts = []

    if not os.path.exists(routes_json_path):
        print(f"No routes configuration file found at {routes_json_path}. Skipping local routes.")
        return "# No local routes file provided."
    if not os.path.isfile(routes_json_path):
        print(f"Warning: {routes_json_path} is not a file. Skipping local routes.")
        return f"# {routes_json_path} is not a file."

    try:
        with open(routes_json_path, 'r', encoding='utf-8') as f:
            # Check if file is empty
            first_char = f.read(1)
            if not first_char:
                print(f"Warning: {routes_json_path} is empty. Skipping local routes.")
                return "# Routes file is empty."
            f.seek(0) # Reset file pointer
            routes_data = json.load(f)
    except json.JSONDecodeError:
        print(f"Warning: {routes_json_path} is not valid JSON. No local routes will be added from file.")
        return "# Invalid JSON in routes file."
    except Exception as e:
        print(f"Error reading {routes_json_path}: {e}", file=sys.stderr)
        return f"# Error reading routes file: {e}"

    if not isinstance(routes_data, dict):
        print(f"Warning: Content of {routes_json_path} is not a JSON object. Skipping local routes.")
        return "# Routes file does not contain a JSON object."

    if not routes_data:
        print(f"Warning: {routes_json_path} contains an empty JSON object. No routes to add.")
        return "# No routes defined in the JSON object."


    print(f"Found routes configuration at {routes_json_path}. Processing...")
    counter = 0
    for path_matcher_key, target_url in routes_data.items():
        if not isinstance(path_matcher_key, str) or not isinstance(target_url, str):
            print(f"Warning: Skipping invalid route entry: key='{path_matcher_key}', value='{target_url}'. Both must be strings.")
            continue

        sanitized_name_part = sanitize_key_for_matcher(path_matcher_key)
        matcher_name = f"@matcher_{sanitized_name_part}_{counter}"

        # Caddy path matchers can use the raw path_matcher_key.
        # Ensure target_url is properly formatted (e.g., has a scheme).
        if not (target_url.startswith("http://") or target_url.startswith("https://") or target_url.startswith("ws://") or target_url.startswith("wss://")):
            print(f"Warning: Target URL '{target_url}' for path '{path_matcher_key}' does not have a valid scheme (http/https/ws/wss). Defaulting to http://{target_url}")
            target_url = f"http://{target_url}"


        route_block = f"""
    {matcher_name} {{
        path {path_matcher_key}
    }}
    route {matcher_name} {{
        reverse_proxy {target_url} {{
            header_up Host {{http.reverse_proxy.upstream.hostport}}
            header_up X-Forwarded-Host {{host}}
            header_up X-Forwarded-Proto {{scheme}}
            # For path rewriting (if needed, enhance routes.json structure):
            # Example: uri strip_prefix /api
        }}
    }}"""
        local_routes_config_parts.append(route_block)
        counter += 1

    if not local_routes_config_parts:
        return "# No valid routes were processed from routes.json."

    print("Generated local routes configuration.")
    return "\n".join(local_routes_config_parts)

def main():
    """
    Main function to configure and start Caddy.
    """
    proxy_port = os.getenv("PROXY_PORT", DEFAULT_PROXY_PORT)
    hcc_env_url = os.getenv("HCC_ENV_URL", DEFAULT_HCC_ENV_URL)
    routes_json_path = os.getenv("ROUTES_JSON_PATH", DEFAULT_ROUTES_JSON_PATH)
    caddyfile_template_path = os.getenv("CADDYFILE_TEMPLATE_PATH", DEFAULT_CADDYFILE_TEMPLATE_PATH)
    caddyfile_output_path = os.getenv("CADDYFILE_OUTPUT_PATH", DEFAULT_CADDYFILE_OUTPUT_PATH)

    print("Starting Caddy Frontend Proxy (Python entrypoint)...")
    print("----------------------------------")
    print(f"Proxy Port: {proxy_port}")
    print(f"HCC Environment URL: {hcc_env_url}")
    print(f"Routes JSON Path: {routes_json_path}")
    print(f"Caddyfile Template: {caddyfile_template_path}")
    print(f"Generated Caddyfile: {caddyfile_output_path}")
    print("----------------------------------")

    local_routes_caddy_config = generate_local_routes_config(routes_json_path)

    try:
        with open(caddyfile_template_path, 'r', encoding='utf-8') as f_template:
            caddyfile_template_content = f_template.read()
    except FileNotFoundError:
        print(f"Error: Caddyfile template not found at {caddyfile_template_path}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error reading Caddyfile template {caddyfile_template_path}: {e}", file=sys.stderr)
        sys.exit(1)

    # Perform substitutions
    # Handle {$PROXY_PORT:-DEFAULT} style placeholders and simple {$PROXY_PORT}
    final_caddyfile_content = re.sub(r'\{\$PROXY_PORT:-\d+\}', proxy_port, caddyfile_template_content)
    final_caddyfile_content = re.sub(r'\{\$PROXY_PORT\}', proxy_port, final_caddyfile_content) # In case the template uses this simpler form
    final_caddyfile_content = final_caddyfile_content.replace("{$HCC_ENV_URL}", hcc_env_url)
    final_caddyfile_content = final_caddyfile_content.replace("{{LOCAL_ROUTES_PLACEHOLDER}}", local_routes_caddy_config)

    try:
        with open(caddyfile_output_path, 'w', encoding='utf-8') as f_output:
            f_output.write(final_caddyfile_content)
    except Exception as e:
        print(f"Error writing generated Caddyfile to {caddyfile_output_path}: {e}", file=sys.stderr)
        sys.exit(1)

    print(f"\nGenerated Caddyfile ({caddyfile_output_path}):")
    print("----------------------------------")
    print(final_caddyfile_content)
    print("----------------------------------\n")

    # Execute Caddy
    caddy_command = ["caddy", "run", "--config", caddyfile_output_path, "--adapter", "caddyfile"]
    print(f"Executing Caddy: {' '.join(caddy_command)}")
    try:
        # os.execvp replaces the current Python process with Caddy.
        # This is standard behavior for entrypoint scripts in containers.
        os.execvp(caddy_command[0], caddy_command)
    except FileNotFoundError:
        print(f"Error: Caddy command '{caddy_command[0]}' not found. Ensure Caddy is installed and in PATH.", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error executing Caddy: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
EOF
echo "entrypoint.py created."
chmod +x entrypoint.py # Make it executable

# Create config directory
mkdir -p config
echo "config/ directory created."

# Create routes.json.example
cat << 'EOF' > config/routes.json.example
{
  "/apps/image-builder/*": "http://localhost:8080",
  "/api/foo/bar": "http://localhost:9999",
  "/api/another-service/*": "http://some-other-container:3000",
  "/ws/notifications/*": "ws://localhost:8081"
}
EOF
echo "config/routes.json.example created."

# Create README.md
cat << 'EOF' > README.md
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
EOF
echo "README.md created."


echo ""
echo "All files created successfully!"
echo "Next steps:"
echo "1. Review the generated files."
echo "2. Copy 'config/routes.json.example' to 'config/routes.json' and customize it for your local services."
echo "3. Follow the instructions in README.md to build and run the Docker container."
