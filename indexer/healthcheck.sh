#!/bin/sh
# Robust Ponder healthcheck - detects crash loops and failed startup

set -e

CONTAINER_NAME="aurellion_indexer"
MAX_RESTARTS=2
MIN_UPTIME_SECONDS=45

# Check curl responds
if ! curl -sf http://localhost:42069/ > /dev/null 2>&1; then
    echo "Healthcheck failed: Ponder not responding on port 42069"
    exit 1
fi

# Check restart count (detect crash loops)
RESTARTS=$(docker inspect "$CONTAINER_NAME" --format='{{.RestartCount}}' 2>/dev/null || echo "0")
if [ "$RESTARTS" -gt "$MAX_RESTARTS" ]; then
    echo "Healthcheck failed: Container restarted $RESTARTS times (max: $MAX_RESTARTS) - likely crash looping"
    exit 1
fi

# Check uptime (ensure it's been running, not just started)
STARTED_AT=$(docker inspect "$CONTAINER_NAME" --format='{{.State.StartedAt}}' 2>/dev/null)
if [ -n "$STARTED_AT" ]; then
    START_EPOCH=$(date -d "$STARTED_AT" +%s 2>/dev/null) || START_EPOCH=0
    NOW_EPOCH=$(date +%s)
    UPTIME=$((NOW_EPOCH - START_EPOCH))
    
    if [ "$UPTIME" -lt "$MIN_UPTIME_SECONDS" ]; then
        # Container just started, double-check exit code
        EXIT_CODE=$(docker inspect "$CONTAINER_NAME" --format='{{.State.ExitCode}}' 2>/dev/null || echo "0")
        if [ "$EXIT_CODE" -ne 0 ] && [ "$RESTARTS" -gt 0 ]; then
            echo "Healthcheck failed: Recent crash detected (exit code: $EXIT_CODE, restarts: $RESTARTS)"
            exit 1
        fi
    fi
fi

echo "Healthcheck passed: Ponder responding, uptime: ${UPTIME:-unknown}s, restarts: $RESTARTS"
exit 0
