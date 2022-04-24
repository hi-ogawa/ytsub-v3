#!/bin/bash
set -eux -o pipefail

export NODE_ENV=test
export PORT=3001
export E2E_NO_SERVER=1
export E2E_COVERAGE_CLIENT=1

log_file=logs/remix-coverage.log

# run remix server with c8
npm run dev:prepare
npm run remix:dev:coverage >> "$log_file" 2>&1 &
coverage_pid="$!"

# wait server
docker run --rm --network=host jwilder/dockerize:0.6.1 -wait tcp://localhost:3001

# run e2e test
playwright test "${@}"

# kill remix server
curl "http://localhost:$PORT/kill"

# wait for c8 to create coverage
wait "$coverage_pid"

# print logs
cat "$log_file"

# print client coverage
npx c8 report -o coverage/e2e-client -r text -r html --all --src app --exclude build --exclude-after-remap --temp-directory coverage/e2e-client/tmp
