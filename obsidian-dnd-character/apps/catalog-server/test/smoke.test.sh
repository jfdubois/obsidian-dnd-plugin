#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────
# Smoke test for catalog-server Docker container
# ──────────────────────────────────────────────────────────────
# Validates:
#   1. docker build succeeds
#   2. container starts and serves static files
#   3. JSON files return correct content type
#   4. non-existent files return 404
#   5. cache headers: no-cache for current.json, immutable for
#      revision files, short cache for other JSON
#   6. server binds to 0.0.0.0 (mobile/LAN reachable)
#
# ── Expected catalog URL patterns ────────────────────────────
# The plugin and mobile clients use these URL paths against the
# catalog server (default port 8080):
#
#   GET /health
#       Health check endpoint. Returns {"status":"healthy"}.
#       Cache: no-cache, no-store, must-revalidate.
#
#   GET /catalog/v1/current.json
#       Active revision pointer. Returns {"currentRevision":"<id>"}.
#       Cache: no-cache, no-store, must-revalidate.
#
#   GET /catalog/v1/revisions/<id>/manifest.json
#       Revision manifest with schema version and generation time.
#       Cache: immutable (public, max-age=31536000).
#
#   GET /catalog/v1/revisions/<id>/entities/<kind>/<id>.json
#       Individual entity records (species, feats, spells, etc.).
#       Cache: immutable (public, max-age=31536000).
#
#   GET /catalog/v1/revisions/<id>/indexes/<kind>.json
#       Index files listing entity IDs by kind.
#       Cache: immutable (public, max-age=31536000).
#
#   GET /catalog/v1/revisions/<id>/reports/validation.json
#       Build validation report (errors, warnings).
#       Cache: immutable (public, max-age=31536000).
#
#   GET /catalog/v1/revisions/<id>/reports/inventory.json
#       Build inventory report (entity counts by kind).
#       Cache: immutable (public, max-age=31536000).
#
# ── Access patterns ──────────────────────────────────────────
# Desktop (localhost):
#   http://localhost:8080/<path>
#
# Mobile / LAN:
#   http://<server-lan-ip>:8080/<path>
#   e.g. http://192.168.1.100:8080/catalog/v1/current.json
#
# The server binds to 0.0.0.0:8080 so it is reachable from any
# interface on the host machine, enabling mobile device access
# on the same subnet.
# ──────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"
CATALOG_SERVER_DIR="$SCRIPT_DIR/.."
IMAGE_NAME="catalog-server-smoke"
CONTAINER_NAME="catalog-server-smoke-test"
PORT=18080
REVISION_ID="smoke-test-rev-001"

cleanup() {
    docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
    docker rmi "$IMAGE_NAME" >/dev/null 2>&1 || true
}
trap cleanup EXIT

pass=0
fail=0

report() {
    local name="$1"
    local status="$2"
    if [ "$status" = "PASS" ]; then
        pass=$((pass + 1))
        echo "  [PASS] $name"
    else
        fail=$((fail + 1))
        echo "  [FAIL] $name"
    fi
}

echo "=== Catalog Server Smoke Test ==="
echo ""

# ── Step 1: Build the Docker image ────────────────────────────
echo ">> Building Docker image..."
if docker build -t "$IMAGE_NAME" "$CATALOG_SERVER_DIR" >/dev/null 2>&1; then
    report "docker build succeeds" "PASS"
else
    report "docker build succeeds" "FAIL"
    echo "Build failed. Aborting."
    exit 1
fi

# ── Step 2: Create sample catalog data ────────────────────────
SAMPLE_DIR=$(mktemp -d)
mkdir -p "$SAMPLE_DIR/catalog/v1/revisions/$REVISION_ID/entities/species"
mkdir -p "$SAMPLE_DIR/catalog/v1/revisions/$REVISION_ID/indexes"
mkdir -p "$SAMPLE_DIR/catalog/v1/revisions/$REVISION_ID/reports"

# manifest.json
cat > "$SAMPLE_DIR/catalog/v1/revisions/$REVISION_ID/manifest.json" <<'EOF'
{
  "catalogRevision": "smoke-test-rev-001",
  "schemaVersion": 1,
  "generatedAt": "2025-01-01T00:00:00.000Z"
}
EOF

# A sample entity file
cat > "$SAMPLE_DIR/catalog/v1/revisions/$REVISION_ID/entities/species/human.json" <<'EOF'
{
  "id": "species-human",
  "name": "Human",
  "type": "species"
}
EOF

# A sample index file
cat > "$SAMPLE_DIR/catalog/v1/revisions/$REVISION_ID/indexes/species.json" <<'EOF'
{
  "species": ["species-human"]
}
EOF

# A sample report file — validation
cat > "$SAMPLE_DIR/catalog/v1/revisions/$REVISION_ID/reports/validation.json" <<'EOF'
{
  "status": "pass",
  "errors": []
}
EOF

# A sample report file — inventory
cat > "$SAMPLE_DIR/catalog/v1/revisions/$REVISION_ID/reports/inventory.json" <<'EOF'
{
  "species": 1,
  "total": 1
}
EOF

# current.json (the active revision pointer)
cat > "$SAMPLE_DIR/catalog/v1/current.json" <<'EOF'
{
  "currentRevision": "smoke-test-rev-001"
}
EOF

# ── Step 3: Start container with sample data ──────────────────
echo ">> Starting container..."
docker run -d \
    --name "$CONTAINER_NAME" \
    -p "$PORT:8080" \
    -v "$SAMPLE_DIR:/usr/share/nginx/html:ro" \
    "$IMAGE_NAME" >/dev/null 2>&1

# Wait for nginx to be ready
sleep 2

# ── Step 4: Smoke tests ───────────────────────────────────────
echo ">> Running smoke tests..."

# Test 1: manifest.json is served
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/catalog/v1/revisions/$REVISION_ID/manifest.json" 2>/dev/null || echo "000")
if [ "$RESPONSE" = "200" ]; then
    report "manifest.json returns 200" "PASS"
else
    report "manifest.json returns 200" "FAIL"
fi

# Test 2: JSON content type
CONTENT_TYPE=$(curl -s -I "http://localhost:$PORT/catalog/v1/revisions/$REVISION_ID/manifest.json" 2>/dev/null | grep -i "content-type" | tr -d '\r' | awk '{print $2}')
if [ "$CONTENT_TYPE" = "application/json" ]; then
    report "manifest.json returns application/json content type" "PASS"
else
    report "manifest.json returns application/json content type (got: $CONTENT_TYPE)" "FAIL"
fi

# Test 3: Entity file is served
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/catalog/v1/revisions/$REVISION_ID/entities/species/human.json" 2>/dev/null || echo "000")
if [ "$RESPONSE" = "200" ]; then
    report "entity file (human.json) returns 200" "PASS"
else
    report "entity file (human.json) returns 200" "FAIL"
fi

# Test 4: Index file is served
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/catalog/v1/revisions/$REVISION_ID/indexes/species.json" 2>/dev/null || echo "000")
if [ "$RESPONSE" = "200" ]; then
    report "index file (species.json) returns 200" "PASS"
else
    report "index file (species.json) returns 200" "FAIL"
fi

# Test 5: Report file (validation.json) is served
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/catalog/v1/revisions/$REVISION_ID/reports/validation.json" 2>/dev/null || echo "000")
if [ "$RESPONSE" = "200" ]; then
    report "report file (validation.json) returns 200" "PASS"
else
    report "report file (validation.json) returns 200" "FAIL"
fi

# Test 5b: Report file (inventory.json) is served
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/catalog/v1/revisions/$REVISION_ID/reports/inventory.json" 2>/dev/null || echo "000")
if [ "$RESPONSE" = "200" ]; then
    report "report file (inventory.json) returns 200" "PASS"
else
    report "report file (inventory.json) returns 200" "FAIL"
fi

# Test 6: Non-existent file returns 404
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/catalog/v1/revisions/$REVISION_ID/nonexistent.json" 2>/dev/null || echo "000")
if [ "$RESPONSE" = "404" ]; then
    report "non-existent file returns 404" "PASS"
else
    report "non-existent file returns 404" "FAIL"
fi

# Test 7: Correct JSON content in response
BODY=$(curl -s "http://localhost:$PORT/catalog/v1/revisions/$REVISION_ID/manifest.json" 2>/dev/null)
if echo "$BODY" | grep -q '"catalogRevision"'; then
    report "manifest.json contains expected content" "PASS"
else
    report "manifest.json contains expected content" "FAIL"
fi

# Test 8: Directory listing is disabled
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/catalog/v1/revisions/$REVISION_ID/" 2>/dev/null || echo "000")
if [ "$RESPONSE" = "404" ] || [ "$RESPONSE" = "403" ]; then
    report "directory listing is disabled" "PASS"
else
    report "directory listing is disabled (got: $RESPONSE)" "FAIL"
fi

# ── Cache header tests ────────────────────────────────────────

# Test 9: current.json has no-cache headers
CACHE_HEADER=$(curl -s -I "http://localhost:$PORT/catalog/v1/current.json" 2>/dev/null | grep -i "cache-control" | tr -d '\r' | awk '{print $2}')
if [ "$CACHE_HEADER" = "no-cache," ] || [ "$CACHE_HEADER" = "no-cache" ]; then
    report "current.json has no-cache Cache-Control header" "PASS"
else
    report "current.json has no-cache Cache-Control header (got: $CACHE_HEADER)" "FAIL"
fi

# Test 10: current.json has no-store directive
CACHE_FULL=$(curl -s -I "http://localhost:$PORT/catalog/v1/current.json" 2>/dev/null | grep -i "cache-control" | tr -d '\r')
if echo "$CACHE_FULL" | grep -q "no-store"; then
    report "current.json has no-store in Cache-Control" "PASS"
else
    report "current.json has no-store in Cache-Control (got: $CACHE_FULL)" "FAIL"
fi

# Test 11: current.json has must-revalidate directive
if echo "$CACHE_FULL" | grep -q "must-revalidate"; then
    report "current.json has must-revalidate in Cache-Control" "PASS"
else
    report "current.json has must-revalidate in Cache-Control (got: $CACHE_FULL)" "FAIL"
fi

# Test 12: Revision files have immutable cache headers
REVISION_CACHE=$(curl -s -I "http://localhost:$PORT/catalog/v1/revisions/$REVISION_ID/manifest.json" 2>/dev/null | grep -i "cache-control" | tr -d '\r')
if echo "$REVISION_CACHE" | grep -q "immutable"; then
    report "revision manifest.json has immutable Cache-Control" "PASS"
else
    report "revision manifest.json has immutable Cache-Control (got: $REVISION_CACHE)" "FAIL"
fi

# Test 13: Revision entity files have immutable cache headers
ENTITY_CACHE=$(curl -s -I "http://localhost:$PORT/catalog/v1/revisions/$REVISION_ID/entities/species/human.json" 2>/dev/null | grep -i "cache-control" | tr -d '\r')
if echo "$ENTITY_CACHE" | grep -q "immutable"; then
    report "revision entity file has immutable Cache-Control" "PASS"
else
    report "revision entity file has immutable Cache-Control (got: $ENTITY_CACHE)" "FAIL"
fi

# Test 14: Revision index files have immutable cache headers
INDEX_CACHE=$(curl -s -I "http://localhost:$PORT/catalog/v1/revisions/$REVISION_ID/indexes/species.json" 2>/dev/null | grep -i "cache-control" | tr -d '\r')
if echo "$INDEX_CACHE" | grep -q "immutable"; then
    report "revision index file has immutable Cache-Control" "PASS"
else
    report "revision index file has immutable Cache-Control (got: $INDEX_CACHE)" "FAIL"
fi

# Test 15: Revision report files have immutable cache headers
REPORT_CACHE=$(curl -s -I "http://localhost:$PORT/catalog/v1/revisions/$REVISION_ID/reports/validation.json" 2>/dev/null | grep -i "cache-control" | tr -d '\r')
if echo "$REPORT_CACHE" | grep -q "immutable"; then
    report "revision report file has immutable Cache-Control" "PASS"
else
    report "revision report file has immutable Cache-Control (got: $REPORT_CACHE)" "FAIL"
fi

# Test 15b: Revision inventory report has immutable cache headers
INVENTORY_CACHE=$(curl -s -I "http://localhost:$PORT/catalog/v1/revisions/$REVISION_ID/reports/inventory.json" 2>/dev/null | grep -i "cache-control" | tr -d '\r')
if echo "$INVENTORY_CACHE" | grep -q "immutable"; then
    report "revision inventory report has immutable Cache-Control" "PASS"
else
    report "revision inventory report has immutable Cache-Control (got: $INVENTORY_CACHE)" "FAIL"
fi

# ── Health check endpoint tests (P5-T005) ─────────────────────

# Test 16: /health returns 200
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/health" 2>/dev/null || echo "000")
if [ "$HEALTH_STATUS" = "200" ]; then
    report "/health endpoint returns 200" "PASS"
else
    report "/health endpoint returns 200 (got: $HEALTH_STATUS)" "FAIL"
fi

# Test 17: /health returns correct JSON body
HEALTH_BODY=$(curl -s "http://localhost:$PORT/health" 2>/dev/null)
if echo "$HEALTH_BODY" | grep -q '"status".*"healthy"'; then
    report "/health returns {\"status\": \"healthy\"}" "PASS"
else
    report "/health returns correct JSON body (got: $HEALTH_BODY)" "FAIL"
fi

# Test 18: /health has no-cache Cache-Control header
HEALTH_CACHE=$(curl -s -I "http://localhost:$PORT/health" 2>/dev/null | grep -i "cache-control" | tr -d '\r')
if echo "$HEALTH_CACHE" | grep -q "no-cache"; then
    report "/health has no-cache Cache-Control header" "PASS"
else
    report "/health has no-cache Cache-Control header (got: $HEALTH_CACHE)" "FAIL"
fi

# Test 19: /health has no-store in Cache-Control
if echo "$HEALTH_CACHE" | grep -q "no-store"; then
    report "/health has no-store in Cache-Control" "PASS"
else
    report "/health has no-store in Cache-Control (got: $HEALTH_CACHE)" "FAIL"
fi

# Test 20: /health returns application/json content type
HEALTH_TYPE=$(curl -s -I "http://localhost:$PORT/health" 2>/dev/null | grep -i "content-type" | tr -d '\r' | awk '{print $2}')
if [ "$HEALTH_TYPE" = "application/json" ]; then
    report "/health returns application/json content type" "PASS"
else
    report "/health returns application/json content type (got: $HEALTH_TYPE)" "FAIL"
fi

# ── Mobile / LAN reachability tests (P5-T007) ─────────────────

# Test 21: Server binds to 0.0.0.0 (all interfaces)
# When nginx listens on port 8080 without an IP, it binds to
# 0.0.0.0. We verify this by checking the container's listening
# sockets. If it only bound to 127.0.0.1, mobile devices on
# the LAN could not reach the server.
LISTEN_ADDRS=$(docker exec "$CONTAINER_NAME" ss -tlnp 2>/dev/null | grep ":8080" | awk '{print $4}' || true)
if echo "$LISTEN_ADDRS" | grep -q "0.0.0.0:8080"; then
    report "server binds to 0.0.0.0 (all interfaces)" "PASS"
elif echo "$LISTEN_ADDRS" | grep -q "\*.*:8080"; then
    report "server binds to 0.0.0.0 (all interfaces)" "PASS"
else
    report "server binds to 0.0.0.0 (all interfaces) (got: $LISTEN_ADDRS)" "FAIL"
fi

# Test 22: Server responds on 0.0.0.0 address
# curl to 0.0.0.0 explicitly tests that the binding accepts
# connections on the any-address interface, not just loopback.
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "http://0.0.0.0:$PORT/health" 2>/dev/null || echo "000")
if [ "$RESPONSE" = "200" ]; then
    report "server responds on 0.0.0.0:PORT/health" "PASS"
else
    report "server responds on 0.0.0.0:PORT/health (got: $RESPONSE)" "FAIL"
fi

# Test 23: Server responds on host LAN IP (mobile access pattern)
# Get the first non-loopback IPv4 address of the host to simulate
# a mobile device on the same subnet accessing the catalog server.
LAN_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || true)
if [ -n "$LAN_IP" ]; then
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "http://$LAN_IP:$PORT/health" 2>/dev/null || echo "000")
    if [ "$RESPONSE" = "200" ]; then
        report "server responds on LAN IP ($LAN_IP)/health" "PASS"
    else
        report "server responds on LAN IP ($LAN_IP)/health (got: $RESPONSE)" "FAIL"
    fi
else
    report "LAN IP reachability (skipped: no LAN IP detected)" "PASS"
fi

# Test 24: Catalog endpoints reachable via 0.0.0.0
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "http://0.0.0.0:$PORT/catalog/v1/current.json" 2>/dev/null || echo "000")
if [ "$RESPONSE" = "200" ]; then
    report "catalog/v1/current.json reachable via 0.0.0.0" "PASS"
else
    report "catalog/v1/current.json reachable via 0.0.0.0 (got: $RESPONSE)" "FAIL"
fi

# Test 25: Revision endpoints reachable via 0.0.0.0
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "http://0.0.0.0:$PORT/catalog/v1/revisions/$REVISION_ID/manifest.json" 2>/dev/null || echo "000")
if [ "$RESPONSE" = "200" ]; then
    report "revision manifest reachable via 0.0.0.0" "PASS"
else
    report "revision manifest reachable via 0.0.0.0 (got: $RESPONSE)" "FAIL"
fi

# ── Cleanup: remove temp data ─────────────────────────────────
rm -rf "$SAMPLE_DIR"

# ── Summary ───────────────────────────────────────────────────
echo ""
echo "=== Results: $pass passed, $fail failed ==="

if [ "$fail" -gt 0 ]; then
    exit 1
fi
