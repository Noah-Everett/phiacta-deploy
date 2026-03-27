#!/usr/bin/env bash
# SPDX-License-Identifier: GPL-3.0-or-later
#
# Generic deploy script for phiacta stacks.
#
# Usage:
#   ./deploy.sh                    Start the default stack (docker-compose.yml)
#   ./deploy.sh <type>             Start a named stack (docker-compose.<type>.yml)
#   ./deploy.sh [type] <command>   Run a command against a stack
#
# Commands: up (default), down, logs, status, pull, or any docker compose command.
#
# Env files are loaded automatically:
#   .env          — always loaded if present (shared overrides)
#   .env.<type>   — loaded for named stacks (stack-specific secrets/overrides)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# ── Helpers ────────────────────────────────────────────────────

is_command() {
    case "$1" in up|down|logs|status|pull) return 0 ;; *) return 1 ;; esac
}

list_stacks() {
    echo "Available stacks:"
    echo "  (default)  docker-compose.yml"
    for f in "$SCRIPT_DIR"/docker-compose.*.yml; do
        [ -f "$f" ] || continue
        name="$(basename "$f" .yml)"
        name="${name#docker-compose.}"
        echo "  $name"
    done
}

usage() {
    echo "Usage: $0 [type] [command] [args...]"
    echo ""
    echo "Commands: up (default), down, logs, status, pull,"
    echo "          or any docker compose command."
    echo ""
    list_stacks
    exit 1
}

# ── Parse arguments ────────────────────────────────────────────

STACK_TYPE=""
ARG1="${1:-}"

if [ -z "$ARG1" ]; then
    COMPOSE_FILE="$SCRIPT_DIR/docker-compose.yml"
    COMMAND="up"
elif is_command "$ARG1"; then
    # First arg is a known command — use the default compose file
    COMPOSE_FILE="$SCRIPT_DIR/docker-compose.yml"
    COMMAND="$ARG1"
    shift
elif [ -f "$SCRIPT_DIR/docker-compose.${ARG1}.yml" ]; then
    # First arg is a stack type
    STACK_TYPE="$ARG1"
    COMPOSE_FILE="$SCRIPT_DIR/docker-compose.${STACK_TYPE}.yml"
    shift
    COMMAND="${1:-up}"
    [ $# -gt 0 ] && shift
else
    # Unknown — pass through to docker compose on the default file
    COMPOSE_FILE="$SCRIPT_DIR/docker-compose.yml"
    COMMAND="$ARG1"
    shift
fi

if [ ! -f "$COMPOSE_FILE" ]; then
    echo "Error: $(basename "$COMPOSE_FILE") not found."
    echo ""
    list_stacks
    exit 1
fi

# ── Build compose command with env files ───────────────────────

COMPOSE_CMD=(docker compose -f "$COMPOSE_FILE")
[ -f "$SCRIPT_DIR/.env" ]                                              && COMPOSE_CMD+=(--env-file "$SCRIPT_DIR/.env")
[ -n "$STACK_TYPE" ] && [ -f "$SCRIPT_DIR/.env.${STACK_TYPE}" ]        && COMPOSE_CMD+=(--env-file "$SCRIPT_DIR/.env.${STACK_TYPE}")

compose() { "${COMPOSE_CMD[@]}" "$@"; }

# ── Pull sibling repos ────────────────────────────────────────

pull_repos() {
    echo "==> Pulling repositories..."
    for repo in "$SCRIPT_DIR" "$SCRIPT_DIR"/../*/; do
        [ -d "$repo/.git" ] || continue
        name="$(cd "$repo" && basename "$(pwd)")"
        echo "    $name"
        git -C "$repo" pull --ff-only 2>/dev/null \
            || echo "      (skipped — not on a tracking branch or diverged)"
    done
    echo ""
}

# ── Run command ────────────────────────────────────────────────

LABEL="${STACK_TYPE:-default}"

case "$COMMAND" in
    up)
        echo "==> Starting $LABEL stack..."
        compose up -d --build
        echo ""
        compose ps
        ;;
    down)
        echo "==> Stopping $LABEL stack..."
        compose down "$@"
        ;;
    logs)
        compose logs -f "$@"
        ;;
    status)
        compose ps "$@"
        ;;
    pull)
        pull_repos
        echo "==> Starting $LABEL stack..."
        compose up -d --build
        echo ""
        compose ps
        ;;
    *)
        compose "$COMMAND" "$@"
        ;;
esac
