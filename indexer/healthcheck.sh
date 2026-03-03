#!/bin/sh
# Simple Ponder healthcheck for Alpine container

set -e

# Check curl responds on the Ponder port
if ! curl -sf http://localhost:8080/health > /dev/null 2>&1; then
    echo "Healthcheck failed: Ponder not responding on port 8080"
    exit 1
fi

echo "Healthcheck passed: Ponder responding on port 8080"
exit 0
