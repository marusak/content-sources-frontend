#!/usr/bin/env python3

print("ENTRYPOINT.PY SCRIPT EXECUTION STARTED", flush=True)

import os
import json
import re
import sys

# --- Default Configuration Values ---
DEFAULT_PROXY_PORT = "443"
DEFAULT_HCC_ENV_URL = "https://api.stage.hcc.example.com"
DEFAULT_ROUTES_JSON_PATH = "/config/routes.json"
DEFAULT_CADDYFILE_TEMPLATE_PATH = "/etc/caddy/Caddyfile.template"
DEFAULT_CADDYFILE_OUTPUT_PATH = "/etc/caddy/Caddyfile"

def generate_local_routes_config(routes_json_path: str) -> str:
    local_routes_config_parts = []
    print(f"Attempting to read routes from: {routes_json_path}", flush=True)

    if not os.path.exists(routes_json_path):
        print(f"No routes configuration file found at {routes_json_path}. Skipping local routes.", flush=True)
        return "# No local routes file provided."
    if not os.path.isfile(routes_json_path):
        print(f"Warning: {routes_json_path} is not a file. Skipping local routes.", flush=True)
        return f"# {routes_json_path} is not a file."

    try:
        with open(routes_json_path, 'r', encoding='utf-8') as f:
            first_char = f.read(1)
            if not first_char:
                print(f"Warning: {routes_json_path} is empty. Skipping local routes.", flush=True)
                return "# Routes file is empty."
            f.seek(0)
            routes_data = json.load(f)
    except json.JSONDecodeError:
        print(f"Warning: {routes_json_path} is not valid JSON. No local routes will be added from file.", flush=True)
        return "# Invalid JSON in routes file."
    except Exception as e:
        print(f"Error reading {routes_json_path}: {e}", file=sys.stderr, flush=True)
        return f"# Error reading routes file: {e}"

    if not isinstance(routes_data, dict):
        print(f"Warning: Content of {routes_json_path} is not a JSON object. Skipping local routes.", flush=True)
        return "# Routes file does not contain a JSON object."

    if not routes_data:
        print(f"Warning: {routes_json_path} contains an empty JSON object. No routes to add.", flush=True)
        return "# No routes defined in the JSON object."

    print(f"Found routes configuration at {routes_json_path}. Processing...", flush=True)
    for path_matcher_key, target_url in routes_data.items():
        if not isinstance(path_matcher_key, str) or not isinstance(target_url, str):
            print(f"Warning: Skipping invalid route entry: key='{path_matcher_key}', value='{target_url}'. Both must be strings.", flush=True)
            continue

        # Ensure target_url has a scheme, defaulting to http if missing
        if not (target_url.startswith("http://") or target_url.startswith("https://") or target_url.startswith("ws://") or target_url.startswith("wss://")):
            print(f"Warning: Target URL '{target_url}' for path '{path_matcher_key}' does not have a valid scheme. Defaulting to http://{target_url}", flush=True)
            target_url = f"http://{target_url}"

        # Use handle with the path_matcher_key directly
        route_block = f"""
    handle {path_matcher_key} {{
        reverse_proxy {target_url} {{
            header_up Host {{http.reverse_proxy.upstream.hostport}}
        }}
    }}"""
        local_routes_config_parts.append(route_block)

    if not local_routes_config_parts:
        print("# No valid routes were processed from routes.json.", flush=True)
        return "# No valid routes were processed from routes.json."

    print("Generated local routes configuration using simplified 'handle' blocks.", flush=True)
    return "\n".join(local_routes_config_parts)

def main():
    print("ENTRYPOINT.PY: main() function started", flush=True)
    proxy_port = os.getenv("PROXY_PORT", DEFAULT_PROXY_PORT)
    hcc_env_url = os.getenv("HCC_ENV_URL", DEFAULT_HCC_ENV_URL)
    routes_json_path = os.getenv("ROUTES_JSON_PATH", DEFAULT_ROUTES_JSON_PATH)
    caddyfile_template_path = os.getenv("CADDYFILE_TEMPLATE_PATH", DEFAULT_CADDYFILE_TEMPLATE_PATH)
    caddyfile_output_path = os.getenv("CADDYFILE_OUTPUT_PATH", DEFAULT_CADDYFILE_OUTPUT_PATH)

    print("----------------------------------", flush=True)
    print(f"Starting Caddy Frontend Proxy (Python entrypoint)...", flush=True)
    print(f"Proxy Port: {proxy_port}", flush=True)
    print(f"HCC Environment URL: {hcc_env_url}", flush=True)
    print(f"Routes JSON Path: {routes_json_path}", flush=True)
    print(f"Caddyfile Template: {caddyfile_template_path}", flush=True)
    print(f"Generated Caddyfile: {caddyfile_output_path}", flush=True)
    print("----------------------------------", flush=True)

    local_routes_caddy_config = generate_local_routes_config(routes_json_path)

    try:
        with open(caddyfile_template_path, 'r', encoding='utf-8') as f_template:
            caddyfile_template_content = f_template.read()
    except FileNotFoundError:
        print(f"Error: Caddyfile template not found at {caddyfile_template_path}", file=sys.stderr, flush=True)
        sys.exit(1)
    except Exception as e:
        print(f"Error reading Caddyfile template {caddyfile_template_path}: {e}", file=sys.stderr, flush=True)
        sys.exit(1)

    # Replace placeholders in the Caddyfile template
    final_caddyfile_content = re.sub(r'\{\$PROXY_PORT(:-\d+)?\}', proxy_port, caddyfile_template_content) # Handles {$PROXY_PORT} and {$PROXY_PORT:-443}
    final_caddyfile_content = final_caddyfile_content.replace("{$HCC_ENV_URL}", hcc_env_url)
    final_caddyfile_content = final_caddyfile_content.replace("{{LOCAL_ROUTES_PLACEHOLDER}}", local_routes_caddy_config)

    try:
        with open(caddyfile_output_path, 'w', encoding='utf-8') as f_output:
            f_output.write(final_caddyfile_content)
    except Exception as e:
        print(f"Error writing generated Caddyfile to {caddyfile_output_path}: {e}", file=sys.stderr, flush=True)
        sys.exit(1)

    print(f"\nGenerated Caddyfile ({caddyfile_output_path}):", flush=True)
    print("----------------------------------", flush=True)
    print(final_caddyfile_content, flush=True)
    print("----------------------------------\n", flush=True)

    caddy_command = ["caddy", "run", "--config", caddyfile_output_path, "--adapter", "caddyfile"]
    print(f"Executing Caddy: {' '.join(caddy_command)}", flush=True)
    try:
        os.execvp(caddy_command[0], caddy_command)
    except FileNotFoundError:
        print(f"Error: Caddy command '{caddy_command[0]}' not found. Ensure Caddy is installed and in PATH.", file=sys.stderr, flush=True)
        sys.exit(1)
    except Exception as e:
        print(f"Error executing Caddy: {e}", file=sys.stderr, flush=True)
        sys.exit(1)

if __name__ == "__main__":
    print("ENTRYPOINT.PY: __main__ guard entered", flush=True)
    main()
