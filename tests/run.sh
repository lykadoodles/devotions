#!/usr/bin/env bash
# Runs Lamp's browser tests (Playwright + Chromium) against www/ served locally.
# Usage: tests/run.sh            all tests
#        tests/run.sh bible-tab  one test (file name without .test.js)
# Screenshots go to tests/out/. Each test prints what it checked and ends with
# "errors []" when the page threw no errors.
set -u
cd "$(dirname "$0")/.."
mkdir -p tests/out
if ! curl -s -o /dev/null localhost:8080/; then
  (cd www && python3 -m http.server 8080 >/dev/null 2>&1 &)
  sleep 1
fi
fail=0
for f in tests/${1:-*}.test.js; do
  echo "=== $(basename "$f" .test.js)"
  if ! timeout 240 node "$f"; then echo "!!! FAILED: $f"; fail=1; fi
done
exit $fail
