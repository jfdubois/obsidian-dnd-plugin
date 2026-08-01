# ──────────────────────────────────────────────────────────────
# Phase 5 — P5-T001: Static catalog server container
# ──────────────────────────────────────────────────────────────
# Serves immutable catalog revisions produced by the catalog
# builder (Phase 4).  The revision tree is mounted or copied
# into /usr/share/nginx/html/catalog/ at build or runtime.
# ──────────────────────────────────────────────────────────────

FROM nginx:1.27-alpine AS runtime

# Replace the default nginx config with our catalog-server config.
COPY nginx.conf /etc/nginx/nginx.conf

# Ensure the catalog root exists (mount or copy at runtime).
RUN mkdir -p /usr/share/nginx/html/catalog

# Non-privileged port.
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
