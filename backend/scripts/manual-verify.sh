#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────
# Quick manual verification of the Google Auth fix
# Usage: bash scripts/manual-verify.sh
# Prerequisites: node, curl, jq
# ─────────────────────────────────────────────────────────────────

BASE_URL="${BASE_URL:-http://localhost:5000}"
echo "🔍 Testing against: $BASE_URL"
echo ""

# ── Step 1: Generate a forged JWT (no Google signature) ────────────────────────
echo "━━━ Step 1: Generate forged JWT ━━━"
FORGED_TOKEN=$(node -e "
  const jwt = require('jsonwebtoken');
  // Forged: signed with a random secret, NOT Google's private key
  const token = jwt.sign({
    sub: 'fake-sub-12345',
    email: 'hacker@evil.com',
    email_verified: true,
    iss: 'accounts.google.com',
    aud: 'fake-audience',
    iat: Math.floor(Date.now()/1000),
    exp: Math.floor(Date.now()/1000) + 3600,
  }, 'not-googles-private-key');
  process.stdout.write(token);
")
echo "Forged token: ${FORGED_TOKEN:0:50}..."
echo ""

# ── Step 2: Send forged token → expect 401 ─────────────────────────────────────
echo "━━━ Step 2: POST forged token → expect 401 ━━━"
HTTP_CODE=$(curl -s -o /tmp/forge-response.json -w "%{http_code}" \
  -X POST "$BASE_URL/api/auth/google" \
  -H "Content-Type: application/json" \
  -d "{\"token\": \"$FORGED_TOKEN\"}")

echo "HTTP status: $HTTP_CODE"
cat /tmp/forge-response.json | python3 -m json.tool 2>/dev/null || cat /tmp/forge-response.json

if [ "$HTTP_CODE" = "401" ]; then
  echo "✅ PASS: Forged token correctly rejected"
else
  echo "❌ FAIL: Expected 401 but got $HTTP_CODE"
  exit 1
fi
echo ""

# ── Step 3 (optional): Real token test ──────────────────────────────────────────
echo "━━━ Step 3: Real token test (optional) ━━━"
if [ -n "$GOOGLE_ID_TOKEN" ]; then
  HTTP_CODE=$(curl -s -o /tmp/real-response.json -w "%{http_code}" \
    -X POST "$BASE_URL/api/auth/google" \
    -H "Content-Type: application/json" \
    -d "{\"token\": \"$GOOGLE_ID_TOKEN\"}")

  echo "HTTP status: $HTTP_CODE"
  cat /tmp/real-response.json | python3 -m json.tool 2>/dev/null || cat /tmp/real-response.json

  if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ PASS: Real token accepted"
  else
    echo "❌ FAIL: Expected 200 but got $HTTP_CODE"
    exit 1
  fi
else
  echo "⏭️  Skipped — set GOOGLE_ID_TOKEN env var to test"
  echo "   Get one from: https://developers.google.com/oauthplayground"
fi

echo ""
echo "━━━ Done ━━━"
echo "💡 Tip: Check server logs for '[verifyGoogleIdToken]' entries"
