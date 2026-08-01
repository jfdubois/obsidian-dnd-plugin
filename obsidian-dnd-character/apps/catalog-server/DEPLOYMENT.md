# Catalog Server — Deployment Notes

Practical guide for serving the D&D catalog over HTTPS on a local network and accessing it from mobile devices.

## Quick Start

```bash
# 1. Ensure catalog data exists (built by the catalog builder)
ls catalog/v1/current.json

# 2. Start the server
docker compose up -d

# 3. Verify it is running
curl http://localhost:8080/health
# {"status":"healthy"}

# 4. Stop the server
docker compose down
```

The server listens on port **8080** by default on all interfaces (`0.0.0.0`). Override with `CATALOG_PORT` and `CATALOG_BIND_ADDRESS`:

```bash
CATALOG_PORT=9090 docker compose up -d
CATALOG_BIND_ADDRESS=127.0.0.1 docker compose up -d  # Restrict to loopback only
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `CATALOG_PORT` | `8080` | Host port mapped to the container's internal port 8080. |
| `CATALOG_BIND_ADDRESS` | `0.0.0.0` | Host interface to bind to. Use `0.0.0.0` for all interfaces, `127.0.0.1` for loopback only. |
| `CATALOG_DATA_PATH` | `./catalog` | Host path to the generated catalog directory. Mounted read-only at `/usr/share/nginx/html/catalog` inside the container. |

Copy `.env.example` to `.env` and adjust values before running `docker compose up`.

## Local HTTPS

The catalog server container serves plain HTTP on port 8080. HTTPS is provided by an external reverse proxy. This is the recommended approach for mobile access.

### Why HTTPS matters

- **Mixed content**: Browsers block HTTP resources loaded on HTTPS pages. If the Obsidian plugin fetches catalog data, it must use HTTPS when the plugin itself is served over HTTPS.
- **Service workers**: Require HTTPS to register and function.
- **Network transparency**: Home routers and public Wi-Fi networks may inspect or modify unencrypted HTTP traffic.
- **Certificate pinning**: Mobile apps can validate server identity when HTTPS is in use.

### Option A — Caddy (recommended for simplicity)

Caddy obtains and renews Let's Encrypt certificates automatically.

```caddy
# Caddyfile
catalog.example.com {
    reverse_proxy localhost:8080
}
```

```bash
docker run -d --name caddy \
  -p 80:80 -p 443:443 \
  -v "$(pwd)/Caddyfile:/etc/caddy/Caddyfile" \
  -v caddy_data:/data \
  caddy:latest
```

### Option B — Nginx reverse proxy with Let's Encrypt

```nginx
server {
    listen 443 ssl;
    server_name catalog.example.com;

    ssl_certificate     /etc/letsencrypt/live/catalog.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/catalog.example.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
    }
}
```

Use `certbot` to obtain the certificate:

```bash
certbot certonly --standalone -d catalog.example.com
```

### Option C — Self-signed certificate (local development)

Generate a certificate with OpenSSL:

```bash
openssl req -x509 -nodes -days 365 \
  -newkey rsa:2048 \
  -keyout server.key \
  -out server.crt \
  -subj "/CN=localhost"
```

Configure nginx or Caddy to terminate TLS with these files. Browsers will show a certificate warning; accept it manually on each device.

### Option D — mkcert (local development certificates)

[mkcert](https://github.com/FiloSottile/mkcert) creates locally-trusted certificates.

```bash
# Install mkcert (requires a local CA)
mkcert -install

# Create a certificate for your LAN address
mkcert 192.168.1.100 localhost catalog.local

# Use the generated .crt and .key files in your reverse proxy config
```

mkcert certificates are trusted by the local machine's certificate store, so no browser warnings appear on the machine where `mkcert -install` was run.

## VPN and Network Access

### Direct LAN access

If the mobile device and the catalog server are on the same subnet, no VPN is needed. Access the server at:

```
http://<server-ip>:8080
```

Replace `<server-ip>` with the server's LAN address (e.g., `192.168.1.100`).

### Tailscale (recommended for remote access)

[Tailscale](https://tailscale.com) creates a secure mesh network between devices without port forwarding.

```bash
# Install Tailscale on the server host
sudo tailscale up

# Note the server's Tailscale IP (e.g., 100.x.y.z)
tailscale ip -4

# Install Tailscale on the mobile device and log in with the same account
```

Access the catalog at `http://100.x.y.z:8080` from any device on the same Tailscale network.

### WireGuard

WireGuard is a lightweight VPN alternative. Create a server configuration and peer configurations for each mobile device.

```ini
# Example server config (/etc/wireguard/wg0.conf)
[Interface]
Address = 10.200.0.1/24
ListenPort = 51820
PrivateKey = <server-private-key>

[Peer]
PublicKey = <mobile-public-key>
AllowedIPs = 10.200.0.2/32
```

Access the catalog at `http://10.200.0.1:8080` from the mobile device once the WireGuard tunnel is established.

### Port forwarding (not recommended)

Exposing the catalog server directly to the internet via router port forwarding is **not recommended** without a reverse proxy and authentication. The catalog server has no built-in authentication. If you must use port forwarding:

1. Place a reverse proxy (Caddy, nginx) in front of the catalog server.
2. Enable HTTPS with a valid certificate.
3. Consider adding HTTP basic auth or a firewall rule restricting access to specific IPs.

## Health Check

The server exposes a health endpoint for monitoring:

```
GET /health
```

Response:

```json
{"status": "healthy"}
```

The Docker healthcheck probes this endpoint every 30 seconds. Use it to verify the server is running before mobile devices attempt to connect.

## Troubleshooting

| Symptom | Check |
|---|---|
| Container fails to start | `docker compose logs catalog-server` |
| Port conflict | Verify `CATALOG_PORT` is not in use: `ss -tlnp \| grep <port>` |
| Catalog data not served | Ensure `CATALOG_DATA_PATH` points to a directory containing `catalog/v1/current.json` |
| Mobile device cannot connect | Verify firewall allows inbound traffic on the configured port; try pinging the server IP from the mobile device |
| HTTPS proxy not reaching server | Confirm the proxy can resolve `localhost:8080` or the server's LAN IP |
