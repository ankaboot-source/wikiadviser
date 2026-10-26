# Internal connectivity & deployment topology

WikiAdviser's deployment on the **mediawiki host** uses an **edge + separate frontend caddies**
architecture so prod and QA can be deployed independently (a QA deploy never restarts prod).

## Containers (all `network_mode: host`)

| Container | Image | Listens on | Role |
|---|---|---|---|
| `wikiadviser-edge` | `caddy:2.11.7-alpine` | host `80`/`443` | **TLS/ACME owner** + per-domain reverse proxy |
| `wikiadviser-frontend-prod` | `wikiadviser-frontend-prod:git` | `127.0.0.1:8083` | prod SPA + mediawiki proxy |
| `wikiadviser-frontend-qa` | `wikiadviser-frontend-qa:git` | `127.0.0.1:8084` (+`8085`) | qa SPA + mediawiki proxy (qa & dev) |

Compose file: `docker-compose.mediawiki.yml`. Configs: `Caddyfile.edge`, `Caddyfile.frontend-prod`,
`Caddyfile.frontend-qa`. (The dev-only `docker/conf/Caddyfile.dev` is separate.)

Because they run with **host networking**, all three bind the host's real interfaces and loopback
directly (no `ports:` mapping) and reach the mediawiki Apache over `127.0.0.1`.

## Request flow & SSL
```
browser -> https://<domain>  (80/443)
   edge:  Terminates TLS (Caddy auto-provisions Let's Encrypt over ACME).
          reverse_proxy to loopback backend:
            prod -> 127.0.0.1:8083
            qa   -> 127.0.0.1:8084
            dev  -> 127.0.0.1:8085
   frontend caddy (plain HTTP on loopback, host-agnostic site):
      - serves the SPA from /usr/share/caddy/html (root/try_files/file_server)
      - /wiki/* -> mediawiki Apache:
            prod -> 127.0.0.1:8082
            qa   -> 127.0.0.1:8080
            dev  -> 127.0.0.1:8081
      - forward_auth -> Supabase edge function (restrict-mediawiki-access)
      - search-articles -> wiki.adminforge.de (TLS)
```
- **TLS is handled only at the edge.** The backends are plain HTTP on loopback (not exposed
  externally), so no TLS/ACME between edge↔backend or backend↔mediawiki. Outbound TLS (Supabase,
  `wiki.adminforge.de`) is from the backends to external services.

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

## Port map (mediawiki host, all loopback unless noted)
| Service | Port |
|---|---|
| edge (TLS) | 80 / 443 |
| prod frontend caddy | 127.0.0.1:8083 |
| qa frontend caddy | 127.0.0.1:8084 |
| dev mediawiki (via qa caddy) | 127.0.0.1:8085 |
| mediawiki prod apache | 127.0.0.1:8082 |
| mediawiki demo apache | 127.0.0.1:8080 |
| mediawiki dev apache | 127.0.0.1:8081 |