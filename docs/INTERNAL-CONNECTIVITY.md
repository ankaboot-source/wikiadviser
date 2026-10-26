# Internal connectivity & deployment topology

WikiAdviser's deployment on the **mediawiki host** uses an **edge + separate frontend caddies**
architecture so prod and QA can be deployed independently (a QA deploy never restarts prod).
The caddy containers are network-isolated — only the edge is exposed to the public interface.

## Containers (private docker network `wikiadviser-net`)

| Container | Image | Exposed/Internal | Role |
|---|---|---|---|
| `wikiadviser-edge` | `caddy:2.11.7-alpine` | **host `80`/`443` (published)** | **TLS/ACME owner** + per-domain reverse proxy |
| `wikiadviser-frontend-prod` | `wikiadviser-frontend-prod:git` | internal `:8083` | prod SPA + mediawiki proxy |
| `wikiadviser-frontend-qa` | `wikiadviser-frontend-qa:git` | internal `:8084` (+`:8085`) | qa SPA + mediawiki proxy (qa & dev) |

Compose file: `docker-compose.mediawiki.yml`. Configs: `Caddyfile.edge`, `Caddyfile.frontend-prod`,
`Caddyfile.frontend-qa`. (The dev-only `docker/conf/Caddyfile.dev` is separate.)

All three join the **private bridge network `wikiadviser-net`**. Only the **edge publishes host
ports (80/443)**; the backends expose **no host interface** — they are reachable only from the edge
(by container name) on the internal network, never from the public IP.

## Request flow & SSL
```
browser -> https://<domain>  (host 80/443, published only by the edge)
   edge:  Terminates TLS (Caddy auto-provisions Let's Encrypt over ACME).
          reverse_proxy (over wikiadviser-net, by container name):
            prod -> http://wikiadviser-frontend-prod:8083
            qa   -> http://wikiadviser-frontend-qa:8084
            dev  -> http://wikiadviser-frontend-qa:8085
   frontend caddy (internal, host-agnostic http://:PORT site, plain HTTP):
      - serves the SPA from /usr/share/caddy/html (root/try_files/file_server)
      - /wiki/* -> mediawiki Apache on the host's PRIVATE IP:
            prod -> 10.114.0.8:8082
            qa   -> 10.114.0.8:8080
            dev  -> 10.114.0.8:8081
      - forward_auth -> Supabase edge function (restrict-mediawiki-access)
      - search-articles -> wiki.adminforge.de (TLS)
```
- **TLS is handled only at the edge** (the only container bound to the public interface).
- **Backend -> mediawiki:** the isolated backend containers reach the mediawiki Apache on the host's
  **private IP `10.114.0.8`** (`eth1`), which Apache **already binds** — a docker container can route
  to the host's routable interface IP, so no docker-network/gateway `Listen` is needed. Apache must
  **not** bind `0.0.0.0` (see `docker/conf/ports.conf`).
- Outbound TLS (Supabase, `wiki.adminforge.de`) is from the backends to external services.

## Deployment split
| Workflow | Trigger | Deploys | Approval |
|---|---|---|---|
| `wikiadviser-deploy-prod.yml` | `release: published` / `workflow_dispatch` | `wikiadviser-edge` + `wikiadviser-frontend-prod` | ✅ manual approval gate |
| `wikiadviser-deploy-qa.yml` | `push: main` / `workflow_dispatch` | `wikiadviser-edge` + `wikiadviser-frontend-qa` | — |

QA deploy rebuilds/restarts only the **qa backend** (edge is a no-op unless its config changed);
the **prod container is never touched**. Prod deploy is the only path that rebuilds prod.

## Env & build
- Single `frontend/Dockerfile` with **generic** build args. Values come from a per-env `--env-file`:
  - prod deploy writes `.env.prod`, QA writes `.env.qa`.
  - Each carries that env's secrets under the generic names (e.g. `SUPABASE_PROJECT_URL`,
    `X_API_KEY`) **plus** the three static endpoint vars the edge needs
    (`WIKIADVISER_FRONTEND_ENDPOINT_PROD`, `_QA`, `MEDIAWIKI_DEV_ENDPOINT`).
- Caddy is pinned to `caddy:2.11.7-alpine`.

## MediaWiki Apache listener (`docker/conf/ports.conf`)
Apache listens on loopback **and** the host's private IP so the docker-networked caddies can reach it,
while it is **not** exposed publicly:
```
Listen 127.0.0.1:${MW_PORT}
Listen 10.114.0.8:${MW_PORT}
```
On the live co-located host the ports are `8080` (demo), `8081` (dev), `8082` (prod) bound on both
`127.0.0.1` and `10.114.0.8`.

## Port map (mediawiki host)
| Service | Where |
|---|---|
| edge (TLS, public) | host 80 / 443 |
| prod / qa / dev frontend caddy | internal only (`wikiadviser-net`), 8083 / 8084 / 8085 |
| mediawiki apache (prod / demo / dev) | 10.114.0.8:8082 / 8080 / 8081 (+ 127.0.0.1) |