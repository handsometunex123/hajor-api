#!/usr/bin/env bash
# Quick test script: send BVN to local API endpoint
set -euo pipefail
USER_ID=${1:-<replace-user-id>}
BVN=${2:-2233445543}
API_URL=${API_URL:-http://localhost:3000}

echo "Calling $API_URL/users/$USER_ID/verify-bvn with BVN=$BVN"
curl -sS -X POST "$API_URL/users/$USER_ID/verify-bvn" -H "Content-Type: application/json" -d "{\"bvn\": \"$BVN\"}" | jq
