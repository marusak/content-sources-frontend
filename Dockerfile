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
EXPOSE 1337

# Default location for the user's routes configuration
ENV ROUTES_JSON_PATH="/config/routes.json"
# Default HCC Environment URL (Stage)
ENV HCC_ENV_URL="https://api.stage.hcc.example.com"
# Default proxy port
ENV PROXY_PORT="443"
# Email for Let's Encrypt (if using real domains, not for localhost)
# ENV ACME_EMAIL="your-email@example.com"
ENV PYTHONUNBUFFERED=1

# Entrypoint
ENTRYPOINT ["/usr/local/bin/entrypoint.py"]

# CMD is not strictly needed as execvp in python script handles running caddy
# However, it can serve as documentation for what the container runs.
# CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
