# phiacta-deploy

Deployment orchestration for the phiacta platform. Docker Compose configs, deploy scripts, and infrastructure for running the backend, web frontend, verification engine, and supporting services.

## Repository Layout

This repo expects sibling directories for each service:

```
parent/
├── phiacta/           # Backend API
├── phiacta-web/       # Web frontend
├── phiacta-verify/    # Verification engine
└── phiacta-deploy/    # This repo
```

## Quick Start (Development)

```bash
# Clone all repos side by side
git clone https://github.com/Noah-Everett/phiacta.git
git clone https://github.com/Noah-Everett/phiacta-web.git
git clone https://github.com/Noah-Everett/phiacta-verify.git
git clone https://github.com/Noah-Everett/phiacta-deploy.git

# Start everything
cd phiacta-deploy
./deploy.sh dev
```

Services will be available at:
- **Backend API**: http://localhost:8000
- **Web Frontend**: http://localhost:3001
- **Verify API**: http://localhost:8001
- **PostgreSQL**: localhost:5433
- **Redis**: localhost:6379

## Production

```bash
# Set up secrets
cp .env.template .env.prod
# Edit .env.prod with real values

# Set up Cloudflare tunnel (optional)
mkdir -p cloudflared
# Add your config.yml and credentials.json

# Deploy
./deploy.sh
```

## Commands

| Command | Description |
|---------|-------------|
| `./deploy.sh` | Pull all repos, build runners, start production |
| `./deploy.sh dev` | Pull all repos, start development stack |
| `./deploy.sh build-runners` | Build verification runner images only |
| `./deploy.sh pull` | Pull all repositories |
| `./deploy.sh down` | Stop production services |
| `./deploy.sh down dev` | Stop dev services |
| `./deploy.sh logs` | Tail production logs |
| `./deploy.sh logs dev` | Tail dev logs |
| `./deploy.sh status` | Show service status |

## Services

| Service | Description | Port (dev) |
|---------|-------------|------------|
| `db` | PostgreSQL 16 + pgvector | 5433 |
| `backend` | phiacta API (FastAPI) | 8000 |
| `web` | phiacta frontend (Next.js) | 3001 |
| `verify` | Verification engine (FastAPI) | 8001 |
| `verify-redis` | Redis for verification job queue | 6379 |
| `tunnel` | Cloudflare tunnel (prod only) | - |

## Runner Images

Verification runner containers are built via the `build-runners` profile. They are not long-running services — they're Docker images that the verify service spawns ephemerally to execute code in sandboxed containers.

| Image | Languages/Tools |
|-------|----------------|
| `phiacta-verify-runner-python` | Python 3.12, matplotlib, numpy, scipy, pandas, scikit-learn, sympy, nbconvert |
| `phiacta-verify-runner-r` | R 4.4, tidyverse, ggplot2, rmarkdown, knitr |
| `phiacta-verify-runner-julia` | Julia 1.10, Plots, DataFrames, CSV, StatsBase |
| `phiacta-verify-runner-lean4` | Lean 4.14, elan |
| `phiacta-verify-runner-symbolic` | Python 3.12, sympy, numpy |

## License

GPL-3.0-or-later
