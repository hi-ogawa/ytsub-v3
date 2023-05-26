#!/bin/bash
set -eux -o pipefail

export NODE_ENV=test
export PORT=3001
export E2E_NO_SERVER=1
export E2E_COVERAGE_SERVER=1
export E2E_COVERAGE_CLIENT=1

log_file=logs/remix-coverage.log
trap 'cat "${log_file}"' EXIT

# run remix server with c8
pnpm dev-pre
pnpm dev:remix > "$log_file" 2>&1 &
coverage_pid="$!"

# wait server
docker run --rm --network=host jwilder/dockerize:0.6.1 -wait tcp://localhost:3001

# run e2e test
playwright test "${@}"

# process e2e-client coverage (TODO: not working)
npx c8 report -o coverage/e2e-client -r text -r html --exclude build --exclude-after-remap --temp-directory coverage/e2e-client/tmp

# stop remix server
curl "http://localhost:$PORT/dev/stop" || true

# wait for c8 to create e2e-server coverage
wait "$coverage_pid" || true
