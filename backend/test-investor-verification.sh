#!/bin/bash

# Investor Verification API Test Suite
# This script manually tests all investor verification endpoints

BASE_URL="http://localhost:3001/api/verification"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counter
PASS=0
FAIL=0

test_endpoint() {
  local name=$1
  local method=$2
  local endpoint=$3
  local token=$4
  local data=$5
  local expected_status=$6

  echo -e "\n${YELLOW}Testing: $name${NC}"

  if [ "$method" = "GET" ]; then
    response=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL$endpoint" \
      -H "Authorization: Bearer $token" \
      -H "Content-Type: application/json")
  else
    response=$(curl -s -w "\n%{http_code}" -X $method "$BASE_URL$endpoint" \
      -H "Authorization: Bearer $token" \
      -H "Content-Type: application/json" \
      -d "$data")
  fi

  status=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')

  if [ "$status" = "$expected_status" ]; then
    echo -e "${GREEN}✓ PASS${NC} (Status: $status)"
    ((PASS++))
  else
    echo -e "${RED}✗ FAIL${NC} (Expected: $expected_status, Got: $status)"
    echo "Response: $body"
    ((FAIL++))
  fi
}

# Generate test tokens (you'll need JWT_SECRET from your .env)
INVESTOR_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InVzZXItMSIsInJvbGUiOiJpbnZlc3RvciIsImludmVzdG9yVGllciI6MX0.test"
ADMIN_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImFkbWluLTEiLCJyb2xlIjoiYWRtaW4ifQ.test"

echo "========================================"
echo "Investor Verification API Tests"
echo "========================================"

# Investor Endpoints Tests
echo -e "\n${YELLOW}INVESTOR ENDPOINTS${NC}"

test_endpoint "Get verification status" \
  "GET" "/investor/status" \
  "$INVESTOR_TOKEN" \
  "" \
  "200"

test_endpoint "Verify LinkedIn account" \
  "POST" "/investor/verify-social" \
  "$INVESTOR_TOKEN" \
  '{"platform":"linkedin","profileUrl":"https://www.linkedin.com/in/johndoe/"}' \
  "200"

test_endpoint "Verify Twitter account" \
  "POST" "/investor/verify-social" \
  "$INVESTOR_TOKEN" \
  '{"platform":"twitter","profileUrl":"https://twitter.com/username"}' \
  "200"

test_endpoint "Verify GitHub account" \
  "POST" "/investor/verify-social" \
  "$INVESTOR_TOKEN" \
  '{"platform":"github","profileUrl":"https://github.com/username"}' \
  "200"

test_endpoint "Verify AngelList account" \
  "POST" "/investor/verify-social" \
  "$INVESTOR_TOKEN" \
  '{"platform":"angellist","profileUrl":"https://angel.co/username"}' \
  "200"

test_endpoint "Request accreditation" \
  "POST" "/investor/request-accreditation" \
  "$INVESTOR_TOKEN" \
  '{}' \
  "200"

test_endpoint "Get investor profile" \
  "GET" "/investor/profile" \
  "$INVESTOR_TOKEN" \
  "" \
  "200"

# Admin Endpoints Tests
echo -e "\n${YELLOW}ADMIN ENDPOINTS${NC}"

test_endpoint "Get pending verifications" \
  "GET" "/admin/pending" \
  "$ADMIN_TOKEN" \
  "" \
  "200"

test_endpoint "Approve verification" \
  "POST" "/admin/approve/queue-123" \
  "$ADMIN_TOKEN" \
  '{"notes":"Verified legitimate VC"}' \
  "200"

test_endpoint "Reject verification" \
  "POST" "/admin/reject/queue-123" \
  "$ADMIN_TOKEN" \
  '{"reason":"Profile incomplete"}' \
  "200"

# Error Handling Tests
echo -e "\n${YELLOW}ERROR HANDLING${NC}"

test_endpoint "No authentication" \
  "GET" "/investor/status" \
  "" \
  "" \
  "401"

test_endpoint "Invalid token" \
  "GET" "/investor/status" \
  "invalid-token" \
  "" \
  "401"

test_endpoint "Non-admin cannot access admin endpoint" \
  "GET" "/admin/pending" \
  "$INVESTOR_TOKEN" \
  "" \
  "403"

test_endpoint "Missing required fields" \
  "POST" "/investor/verify-social" \
  "$INVESTOR_TOKEN" \
  '{}' \
  "400"

test_endpoint "Invalid platform" \
  "POST" "/investor/verify-social" \
  "$INVESTOR_TOKEN" \
  '{"platform":"invalid","profileUrl":"https://example.com"}' \
  "400"

test_endpoint "Invalid URL format" \
  "POST" "/investor/verify-social" \
  "$INVESTOR_TOKEN" \
  '{"platform":"linkedin","profileUrl":"not-a-url"}' \
  "400"

# Summary
echo -e "\n========================================"
echo -e "Test Results:"
echo -e "${GREEN}Passed: $PASS${NC}"
echo -e "${RED}Failed: $FAIL${NC}"
echo "========================================"

if [ $FAIL -eq 0 ]; then
  exit 0
else
  exit 1
fi
