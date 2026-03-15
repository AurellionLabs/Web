#!/usr/bin/env bash
# Debug driver assignments - use cast to inspect on-chain state
# Usage: ./scripts/debug-driver-assignments.sh <DRIVER_ADDRESS> [RPC_URL]
# Example: ./scripts/debug-driver-assignments.sh 0xa90714a15d6e6c0eb3096462d8dc4b22e01588a

set -e
DRIVER="${1:?Usage: $0 <DRIVER_ADDRESS> [RPC_URL]}"
RPC="${2:-${NEXT_PUBLIC_RPC_URL_84532:-https://sepolia.base.org}}"
DIAMOND="${NEXT_PUBLIC_DIAMOND_ADDRESS:-0x8ed92Ff64dC6e833182a4743124FE3e48E2966A7}"
INDEXER_URL="${NEXT_PUBLIC_INDEXER_URL_84532:-https://dev.indexer.aurellionlabs.com/graphql}"

# Normalize address (add 0x if missing, lowercase for GraphQL)
[[ "$DRIVER" != 0x* ]] && DRIVER="0x$DRIVER"
DRIVER_LC=$(echo "$DRIVER" | tr '[:upper:]' '[:lower:]')

echo "=== Driver Assignment Debug ==="
echo "Driver:  $DRIVER"
echo "Diamond: $DIAMOND"
echo "RPC:     $RPC"
echo ""

# 1. Try getDriverJourneyCount (if AuSysFacet was upgraded with this view)
echo "--- On-chain: getDriverJourneyCount ---"
COUNT=$(cast call "$DIAMOND" "getDriverJourneyCount(address)(uint256)" "$DRIVER" --rpc-url "$RPC" 2>/dev/null || echo "")
if [[ -n "$COUNT" ]]; then
  echo "driverToJourneyIds.length = $COUNT (max 10)"
else
  echo "(getDriverJourneyCount not available on deployed facet)"
fi
echo ""

# 2. Fetch journey IDs from indexer (DriverAssigned events)
echo "--- Indexer: journeys assigned to driver ---"
GQL='{"query":"query GetJourneysByDriver($driverAddress: String!) { assigned: diamondDriverAssignedEventss(where: { driver: $driverAddress } limit: 50 orderBy: \"block_timestamp\" orderDirection: \"desc\") { items { journey_id } } }","variables":{"driverAddress":"'$DRIVER_LC'"}}'
JOURNEY_IDS=$(curl -s -X POST "$INDEXER_URL" -H "Content-Type: application/json" -d "$GQL" | jq -r '.data.assigned.items[].journey_id' 2>/dev/null || echo "")

if [[ -z "$JOURNEY_IDS" ]]; then
  echo "No journeys found in indexer for driver $DRIVER"
  echo "(Indexer may use different schema - try with journey IDs from dashboard)"
else
  echo "Found $(echo "$JOURNEY_IDS" | wc -l | tr -d ' ') journey(s) from indexer"
  echo ""

  # 3. Query each journey on-chain via getJourney
  echo "--- On-chain: getJourney status per journey ---"
  echo "Journey status: 0=Pending, 1=InTransit (STUCK if receiver never signs), 2=Delivered"
  echo ""
  STUCK=0
  while IFS= read -r JID; do
    [[ -z "$JID" ]] && continue
    RAW=$(cast call "$DIAMOND" "getJourney(bytes32)" "$JID" --rpc-url "$RPC" 2>/dev/null || echo "FAIL")
    if [[ "$RAW" == "FAIL" ]]; then
      echo "  $JID  -> (call failed)"
      continue
    fi
    # ABI encoding: word0=root offset, word1=parcelData offset, word2=journeyId, word3=currentStatus
    HEX="${RAW#0x}"
    STATUS_WORD="${HEX:192:64}"  # 4th 32-byte word (currentStatus)
    STATUS=$((16#${STATUS_WORD: -2}))  # last byte
    case "$STATUS" in
      0) LABEL="Pending" ;;
      1) LABEL="InTransit (STUCK - receiver must sign)"; STUCK=$((STUCK+1)) ;;
      2) LABEL="Delivered" ;;
      3) LABEL="Canceled" ;;
      *) LABEL="status=$STATUS" ;;
    esac
    echo "  ${JID:0:18}...${JID: -6}  -> $LABEL"
  done <<< "$JOURNEY_IDS"

  if [[ $STUCK -gt 0 ]]; then
    echo ""
    echo ">>> $STUCK journey(s) stuck InTransit. These count toward the 10 limit."
    echo "    Receiver must call packageSign(journeyId) then handOff(journeyId) can complete."
  fi
fi
echo ""

# 4. Error selector reference
echo "--- Error Selector ---"
echo "DriverMaxAssignment() = $(cast sig 'DriverMaxAssignment()')"
echo ""
echo "Journeys are only REMOVED from driverToJourneyIds when handOff() succeeds."
