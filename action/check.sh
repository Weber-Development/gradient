#!/usr/bin/env bash
# Runs Gradient on a pull request and reports the result as a step summary and a comment.
# Inputs come from the environment, see action.yml.
set -uo pipefail

GRADIENT="${GRADIENT_CMD:-npx --yes @sweberdev/gradient@${GRADIENT_VERSION:-latest}}"
report="${RUNNER_TEMP:-/tmp}/gradient-report.md"
status=0

{
  echo "<!-- gradient-check -->"
  echo "### Gradient"
  echo
} >"$report"

ran=0
if [ -n "${GRADIENT_CONFIG:-}" ] && [ -f "$GRADIENT_CONFIG" ]; then
  ran=1
  # shellcheck disable=SC2086
  $GRADIENT build --verify --markdown --config "$GRADIENT_CONFIG" >>"$report" || status=1
fi

if [ -n "${GRADIENT_AUDIT:-}" ]; then
  ran=1
  # Files are separated by spaces or new lines.
  # shellcheck disable=SC2086
  files=$(echo $GRADIENT_AUDIT)
  # shellcheck disable=SC2086
  $GRADIENT audit $files --markdown >>"$report" || status=1
fi

if [ "$ran" = 0 ]; then
  echo "Nothing to check: no ${GRADIENT_CONFIG:-gradient.config.json} found and no files in the audit input." >>"$report"
  status=1
fi

if [ "$status" = 0 ]; then
  printf '\nEverything passes.\n' >>"$report"
fi

cat "$report"
[ -n "${GITHUB_STEP_SUMMARY:-}" ] && cat "$report" >>"$GITHUB_STEP_SUMMARY"

if [ "${GRADIENT_COMMENT:-true}" = "true" ] && [ -n "${GRADIENT_PR:-}" ] && [ -n "${GITHUB_REPOSITORY:-}" ]; then
  id=$(gh api "repos/$GITHUB_REPOSITORY/issues/$GRADIENT_PR/comments" --paginate \
    --jq '.[] | select(.body | contains("<!-- gradient-check -->")) | .id' 2>/dev/null | head -n 1)
  if [ -n "$id" ]; then
    gh api -X PATCH "repos/$GITHUB_REPOSITORY/issues/comments/$id" -F body=@"$report" >/dev/null ||
      echo "Could not update the comment (a pull request from a fork has a read-only token)."
  else
    gh api -X POST "repos/$GITHUB_REPOSITORY/issues/$GRADIENT_PR/comments" -F body=@"$report" >/dev/null ||
      echo "Could not post the comment (a pull request from a fork has a read-only token)."
  fi
fi

exit "$status"
