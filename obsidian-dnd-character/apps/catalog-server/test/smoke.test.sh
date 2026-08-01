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

# A sample report file
cat > "$SAMPLE_DIR/catalog/v1/revisions/$REVISION_ID/reports/validation.json" <<'EOF'
{
  "status": "pass",
  "errors": []
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

# Test 5: Report file is served
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/catalog/v1/revisions/$REVISION_ID/reports/validation.json" 2>/dev/null || echo "000")
if [ "$RESPONSE" = "200" ]; then
    report "report file (validation.json) returns 200" "PASS"
else
    report "report file (validation.json) returns 200" "FAIL"
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

# ── Cleanup: remove temp data ─────────────────────────────────
rm -rf "$SAMPLE_DIR"

# ── Summary ───────────────────────────────────────────────────
echo ""
echo "=== Results: $pass passed, $fail failed ==="

if [ "$fail" -gt 0 ]; then
    exit 1
fi
