# phiacta-deploy

Docker Compose stacks for the [Phiacta](https://phiacta.com) platform.

## Quick start

```bash
# Clone all repos side by side
git clone https://github.com/Noah-Everett/phiacta.git
git clone https://github.com/Noah-Everett/phiacta-web.git
git clone https://github.com/Noah-Everett/phiacta-deploy.git

# Start the stack
cd phiacta-deploy
./deploy.sh
```

Services will be available at:
- **API**: http://localhost:8000
- **Web**: http://localhost:3001
- **Forgejo**: http://localhost:3000
- **PostgreSQL**: localhost:5433

## Usage

```
./deploy.sh [type] [command] [args...]
```

The base `docker-compose.yml` is used by default. To use a named stack, pass its type as the first argument — it maps to `docker-compose.<type>.yml`.

| Command | Description |
|---------|-------------|
| `./deploy.sh` | Build and start the default stack |
| `./deploy.sh down` | Stop the default stack |
| `./deploy.sh logs` | Tail logs |
| `./deploy.sh logs backend` | Tail logs for one service |
| `./deploy.sh status` | Show service status |
| `./deploy.sh pull` | Pull all sibling repos, then build and start |
| `./deploy.sh <type>` | Start a named stack (`docker-compose.<type>.yml`) |
| `./deploy.sh <type> down` | Stop a named stack |
| `./deploy.sh <cmd> [args]` | Pass any command to `docker compose` |

## Custom stacks

Create a `docker-compose.<name>.yml` file and run it with `./deploy.sh <name>`.

Env files are loaded automatically:
- `.env` — shared overrides (always loaded if present)
- `.env.<type>` — stack-specific overrides (loaded for named stacks)

Use `generate-env.sh` to create an `.env.<type>` with random secrets for production-like stacks.

## Configuration

The default stack works with zero configuration — all dev credentials are hardcoded. To override paths or ports, copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

| Variable | Default | Description |
|----------|---------|-------------|
| `BACKEND_PATH` | `../phiacta` | Path to the backend repo |
| `WEB_PATH` | `../phiacta-web` | Path to the web repo |
| `FORGEJO_PORT` | `3000` | Host port for Forgejo |
| `WEB_PORT` | `3001` | Host port for the web frontend |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | API URL as seen by the browser |

## Services

| Service | Description | Default port |
|---------|-------------|--------------|
| `db` | PostgreSQL 16 + pgvector | 5433 |
| `forgejo` | Forgejo (git backend) | 3000 |
| `backend` | Phiacta API (FastAPI) | 8000 |
| `web` | Phiacta frontend (Next.js) | 3001 |
| `pgadmin` | pgAdmin (debug profile only) | 5050 |

## License

GPL-3.0-or-later
