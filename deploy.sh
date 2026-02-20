#!/usr/bin/env bash
set -euo pipefail

# Deploy script for the phiacta platform
#
# Usage:
#   ./deploy.sh              # Pull + build + start (production)
#   ./deploy.sh dev          # Pull + build + start (development)
#   ./deploy.sh build-runners # Build verification runner images only
#   ./deploy.sh pull         # Pull all repos only
#   ./deploy.sh down         # Stop all services
#   ./deploy.sh down dev     # Stop dev services
#   ./deploy.sh logs         # Tail production logs
#   ./deploy.sh logs dev     # Tail dev logs

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPOS=(
    "$SCRIPT_DIR"
    "$SCRIPT_DIR/../phiacta"
    "$SCRIPT_DIR/../phiacta-web"
    "$SCRIPT_DIR/../phiacta-verify"
)

pull_all() {
    echo "==> Pulling all repositories..."
    for repo in "${REPOS[@]}"; do
        if [ -d "$repo/.git" ]; then
            echo "    $(basename "$repo")..."
            git -C "$repo" pull --ff-only
        else
            echo "    $(basename "$repo") — skipped (not a git repo or missing)"
        fi
    done
    echo ""
}

compose_dev() {
    docker compose -f "$SCRIPT_DIR/docker-compose.yml" "$@"
}

compose_prod() {
    docker compose -f "$SCRIPT_DIR/docker-compose.prod.yml" --env-file "$SCRIPT_DIR/.env.prod" "$@"
}

case "${1:-prod}" in
    prod)
        pull_all
        echo "==> Building runner images..."
        compose_prod --profile build-runners build
        echo ""
        echo "==> Starting production services..."
        compose_prod up -d --build
        echo ""
        echo "==> Production stack is up."
        compose_prod ps
        ;;

    dev)
        pull_all
        echo "==> Building Python runner image..."
        compose_dev --profile build-runners build verify-runner-python
        echo ""
        echo "==> Starting development services..."
        compose_dev up -d --build
        echo ""
        echo "==> Dev stack is up."
        echo "    Backend:  http://localhost:8000"
        echo "    Frontend: http://localhost:3001"
        echo "    Verify:   http://localhost:8001"
        echo ""
        compose_dev ps
        ;;

    build-runners)
        ENV="${2:-prod}"
        echo "==> Building all runner images..."
        if [ "$ENV" = "dev" ]; then
            compose_dev --profile build-runners build
        else
            compose_prod --profile build-runners build
        fi
        echo "==> Done."
        ;;

    pull)
        pull_all
        ;;

    down)
        ENV="${2:-prod}"
        echo "==> Stopping services..."
        if [ "$ENV" = "dev" ]; then
            compose_dev down
        else
            compose_prod down
        fi
        ;;

    logs)
        ENV="${2:-prod}"
        SERVICES="${3:-}"
        if [ "$ENV" = "dev" ]; then
            compose_dev logs -f $SERVICES
        else
            compose_prod logs -f $SERVICES
        fi
        ;;

    status)
        ENV="${2:-prod}"
        if [ "$ENV" = "dev" ]; then
            compose_dev ps
        else
            compose_prod ps
        fi
        ;;

    *)
        echo "Usage: $0 {prod|dev|build-runners|pull|down|logs|status} [dev|prod]"
        echo ""
        echo "Commands:"
        echo "  prod           Pull, build runners, start production stack"
        echo "  dev            Pull, build Python runner, start dev stack"
        echo "  build-runners  Build all verification runner images"
        echo "  pull           Pull all repositories"
        echo "  down [env]     Stop services (default: prod)"
        echo "  logs [env]     Tail logs (default: prod)"
        echo "  status [env]   Show service status (default: prod)"
        exit 1
        ;;
esac
