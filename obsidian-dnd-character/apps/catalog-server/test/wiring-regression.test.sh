#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────
# Regression test: Phase 5 operator wiring
# ──────────────────────────────────────────────────────────────
# Validates that the Docker operator configuration is correct:
#   1. Root package.json docker:catalog script points to an
#      existing Compose file (not a stale path).
#   2. Compose service uses the canonical environment variables
#      from the repository .env.example: CATALOG_PORT,
#      CATALOG_BIND_ADDRESS, CATALOG_DATA_PATH.
#   3. The catalog volume mount retains the :ro (read-only) flag.
#   4. The healthcheck is still present.
#
# This test does NOT require Docker or Compose to be installed.
# It validates configuration files and paths only.
# ──────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CATALOG_SERVER_DIR="$SCRIPT_DIR/.."
PROJECT_DIR="$(cd "$CATALOG_SERVER_DIR/../.." && pwd)"
REPO_ROOT="$(cd "$PROJECT_DIR/.." && pwd)"

COMPOSE_FILE="$CATALOG_SERVER_DIR/docker-compose.yml"
PACKAGE_JSON="$PROJECT_DIR/package.json"
ENV_EXAMPLE="$REPO_ROOT/.env.example"

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

echo "=== Phase 5 Operator Wiring Regression Test ==="
echo ""

# ── Test 1: docker:catalog script exists in package.json ──────
if grep -q '"docker:catalog"' "$PACKAGE_JSON"; then
    report "docker:catalog script exists in package.json" "PASS"
else
    report "docker:catalog script exists in package.json" "FAIL"
fi

# ── Test 2: docker:catalog script points to existing file ─────
COMPOSE_PATH=$(grep '"docker:catalog"' "$PACKAGE_JSON" | sed 's/.*docker compose -f \([^ ]*\).*/\1/')
if [ -n "$COMPOSE_PATH" ]; then
    FULL_PATH="$PROJECT_DIR/$COMPOSE_PATH"
    if [ -f "$FULL_PATH" ]; then
        report "docker:catalog resolves to existing file ($COMPOSE_PATH)" "PASS"
    else
        report "docker:catalog resolves to existing file ($COMPOSE_PATH -> $FULL_PATH NOT FOUND)" "FAIL"
    fi
else
    report "docker:catalog resolves to existing file (could not parse path)" "FAIL"
fi

# ── Test 3: Compose file does NOT reference stale path ────────
if grep -q 'services/docker-compose\.yml' "$PACKAGE_JSON"; then
    report "package.json does not reference stale services/docker-compose.yml" "FAIL"
else
    report "package.json does not reference stale services/docker-compose.yml" "PASS"
fi

# ── Test 4: Compose uses CATALOG_PORT (not CATALOG_SERVER_PORT) ─
if grep -q 'CATALOG_PORT' "$COMPOSE_FILE"; then
    report "Compose uses canonical CATALOG_PORT" "PASS"
else
    report "Compose uses canonical CATALOG_PORT" "FAIL"
fi

if grep -q 'CATALOG_SERVER_PORT' "$COMPOSE_FILE"; then
    report "Compose does not use stale CATALOG_SERVER_PORT" "FAIL"
else
    report "Compose does not use stale CATALOG_SERVER_PORT" "PASS"
fi

# ── Test 5: Compose uses CATALOG_BIND_ADDRESS ──────────────────
if grep -q 'CATALOG_BIND_ADDRESS' "$COMPOSE_FILE"; then
    report "Compose uses canonical CATALOG_BIND_ADDRESS" "PASS"
else
    report "Compose uses canonical CATALOG_BIND_ADDRESS" "FAIL"
fi

# ── Test 6: Compose uses CATALOG_DATA_PATH ─────────────────────
if grep -q 'CATALOG_DATA_PATH' "$COMPOSE_FILE"; then
    report "Compose uses canonical CATALOG_DATA_PATH" "PASS"
else
    report "Compose uses canonical CATALOG_DATA_PATH" "FAIL"
fi

# ── Test 7: Port mapping includes bind address ─────────────────
# Expected form: ${CATALOG_BIND_ADDRESS:-0.0.0.0}:${CATALOG_PORT:-8080}:8080
if grep -q 'CATALOG_BIND_ADDRESS.*CATALOG_PORT.*:8080' "$COMPOSE_FILE"; then
    report "Port mapping includes bind address and port" "PASS"
else
    report "Port mapping includes bind address and port" "FAIL"
fi

# ── Test 8: Catalog volume mount is read-only ──────────────────
if grep -q '/usr/share/nginx/html/catalog:ro' "$COMPOSE_FILE"; then
    report "Catalog volume mount is read-only (:ro)" "PASS"
else
    report "Catalog volume mount is read-only (:ro)" "FAIL"
fi

# ── Test 9: Healthcheck is present ─────────────────────────────
if grep -q 'healthcheck:' "$COMPOSE_FILE"; then
    report "Healthcheck is present in Compose file" "PASS"
else
    report "Healthcheck is present in Compose file" "FAIL"
fi

# ── Test 10: Healthcheck probes /health endpoint ───────────────
if grep -q '/health' "$COMPOSE_FILE"; then
    report "Healthcheck probes /health endpoint" "PASS"
else
    report "Healthcheck probes /health endpoint" "FAIL"
fi

# ── Test 11: Local .env.example uses CATALOG_PORT ─────────────
LOCAL_ENV="$CATALOG_SERVER_DIR/.env.example"
if [ -f "$LOCAL_ENV" ]; then
    if grep -q 'CATALOG_PORT=' "$LOCAL_ENV"; then
        report "Local .env.example uses CATALOG_PORT" "PASS"
    else
        report "Local .env.example uses CATALOG_PORT" "FAIL"
    fi

    if grep -q 'CATALOG_SERVER_PORT=' "$LOCAL_ENV"; then
        report "Local .env.example does not use stale CATALOG_SERVER_PORT" "FAIL"
    else
        report "Local .env.example does not use stale CATALOG_SERVER_PORT" "PASS"
    fi

    if grep -q 'CATALOG_BIND_ADDRESS=' "$LOCAL_ENV"; then
        report "Local .env.example defines CATALOG_BIND_ADDRESS" "PASS"
    else
        report "Local .env.example defines CATALOG_BIND_ADDRESS" "FAIL"
    fi
else
    report "Local .env.example exists" "FAIL"
fi

# ── Test 12: Root .env.example variables match Compose ────────
# Verify the canonical env vars from root .env.example are used
# in the Compose file.
if [ -f "$ENV_EXAMPLE" ]; then
    ROOT_VARS_PASS=true
    for var in CATALOG_PORT CATALOG_BIND_ADDRESS CATALOG_DATA_PATH; do
        if grep -q "$var=" "$ENV_EXAMPLE"; then
            if ! grep -q "$var" "$COMPOSE_FILE"; then
                ROOT_VARS_PASS=false
            fi
        fi
    done
    if [ "$ROOT_VARS_PASS" = "true" ]; then
        report "Root .env.example variables are used in Compose" "PASS"
    else
        report "Root .env.example variables are used in Compose" "FAIL"
    fi
else
    report "Root .env.example exists for cross-check" "FAIL"
fi

# ── Summary ───────────────────────────────────────────────────
echo ""
echo "=== Results: $pass passed, $fail failed ==="

if [ "$fail" -gt 0 ]; then
    exit 1
fi
