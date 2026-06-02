#!/usr/bin/env bash
set -euo pipefail
# Rejects any staged .vue, .ts, or .js file that exceeds the line limit.
# Components and pages: 200 lines. Composables and utilities: 300 lines.
# Keeps files reviewable and prevents LLM-generated monoliths sneaking in.

COMPONENT_MAX=200
UTILITY_MAX=300
FAILED=0

for file in "$@"; do
  lines=$(wc -l < "$file")

  # composables/ and utils/ get the higher limit
  if [[ "$file" == *"/composables/"* ]] || [[ "$file" == *"/utils/"* ]] || [[ "$file" == *"/types/"* ]]; then
    limit=$UTILITY_MAX
  else
    limit=$COMPONENT_MAX
  fi

  if [ "$lines" -gt "$limit" ]; then
    echo "ERROR: $file has $lines lines (max $limit for this file type)"
    FAILED=1
  fi
done

exit $FAILED
