# MediaSentinel — Infrastructure Architecture

## Overview

MediaSentinel runs on Google Kubernetes Engine (GKE) Autopilot as part of a shared cluster that also hosts PokerForge website. Autopilot manages nodes automatically — we only pay for pod resources consumed.

## Target Architecture

```
                    ┌─────────────────────────────────┐
                    │         GKE Autopilot            │
                    │        (shared cluster)          │
                    │                                  │
  Internet ──────▶  │  ┌─── Ingress (GKE managed) ──┐ │
                    │  │                              │ │
                    │  │  mediasentinel-web            │ │
                    │  │  (Next.js, 1+ pod)            │ │
                    │  │                              │ │
                    │  │  pokerforge-web (future)      │ │
                    │  └──────────────────────────────┘ │
                    │                                  │
                    │  mediasentinel-worker             │
                    │  (ingestion/analysis, 1 pod)      │
                    │                                  │
                    │  mediasentinel-cron               │
                    │  (scheduled jobs, CronJob)        │
                    │                                  │
                    └───────────┬──────────────────────┘
                                │
                    ┌───────────┴──────────────────────┐
                    │       Google Cloud Services       │
                    │                                  │
                    │  Cloud SQL (PostgreSQL 17)        │
                    │  Cloud Storage (raw content)      │
                    │  Artifact Registry (images)       │
                    │  Secret Manager (API keys)        │
                    └──────────────────────────────────┘
```

## Components

### mediasentinel-web
- **What:** Next.js 16 app serving the website
- **Image:** Built from project root Dockerfile
- **Resources:** 256Mi-512Mi memory, 250m-500m CPU
- **Scaling:** 1-3 pods based on traffic
- **Health check:** HTTP GET /api/health

### mediasentinel-worker
- **What:** Long-running process that monitors sources, runs the ingestion pipeline, executes analysis jobs, and processes the pg-boss queue
- **Image:** Same image as web, different entrypoint
- **Resources:** 512Mi-1Gi memory, 500m-1000m CPU
- **Scaling:** 1 pod (singleton — queue ensures no duplicate processing)

### mediasentinel-cron
- **What:** Kubernetes CronJob that triggers periodic tasks
- **Jobs:**
  - Source check: every 5 minutes (check monitored sources for new content)
  - Blog draft generation: daily (generate drafts from recent analyses)
  - Profile updates: weekly (recompute pundit profiles from accumulated data)

### Cloud SQL
- **Instance:** db-f1-micro (shared core, 614MB RAM) — upgrade as needed
- **Version:** PostgreSQL 17
- **Connection:** Cloud SQL Auth Proxy sidecar in each pod
- **Backup:** Automated daily backups, 7-day retention
- **Migration:** pg_dump from local → Cloud SQL import

### Cloud Storage
- **Bucket:** mediasentinel-content
- **Contents:** Raw scraped HTML, archived article text, analysis artifacts, blog post assets
- **Lifecycle:** Move to Nearline after 90 days for cost savings

### Artifact Registry
- **Repository:** mediasentinel
- **Images:** mediasentinel:latest, mediasentinel:sha-<commit>
- **CI/CD:** GitHub Actions builds and pushes on merge to main

## Kubernetes Manifests

All manifests live in `k8s/` directory:

```
k8s/
├── namespace.yaml
├── web/
│   ├── deployment.yaml
│   ├── service.yaml
│   └── hpa.yaml              # horizontal pod autoscaler
├── worker/
│   └── deployment.yaml
├── cron/
│   └── cronjob.yaml
├── config/
│   ├── configmap.yaml         # non-secret config
│   └── external-secrets.yaml  # pulls from Secret Manager
└── ingress.yaml
```

## CI/CD Pipeline (GitHub Actions)

```
push to main
  → lint + typecheck + build
  → docker build + push to Artifact Registry
  → kubectl apply manifests
  → health check
```

### Environments
- **dev:** Local PostgreSQL 17, `npm run dev`
- **staging:** GKE Autopilot, separate namespace, Cloud SQL dev instance
- **prod:** GKE Autopilot, prod namespace, Cloud SQL prod instance

## Cost Estimate

| Component | Monthly Cost |
|-----------|-------------|
| GKE Autopilot pods (~2 pods avg) | $15-25 |
| Cloud SQL (db-f1-micro) | $10 |
| Cloud Storage (<10GB) | $1 |
| Artifact Registry | $1 |
| Ingress/Load Balancer | $5 |
| **Total** | **$30-40** |

Scales up naturally as ingestion and traffic grow. Autopilot means no idle node costs.

## Migration Path (Local → GKE)

### Phase 1: Containerize (do now, run locally)
1. Create Dockerfile (multi-stage: build + runtime)
2. Create k8s manifests
3. Test locally with `docker build` + `docker run`

### Phase 2: GKE Setup (when ready to deploy)
1. Create GCP project
2. Enable GKE, Cloud SQL, Artifact Registry, Secret Manager APIs
3. Create GKE Autopilot cluster
4. Create Cloud SQL instance
5. Migrate database: `pg_dump` local → `gcloud sql import`
6. Configure GitHub Actions for CI/CD
7. Apply k8s manifests
8. Point domain to Ingress IP

### Phase 3: Production Hardening
1. SSL/TLS via GKE managed certificates
2. Cloud Armor WAF rules
3. Monitoring: Cloud Monitoring + Alerting
4. Log aggregation: Cloud Logging
5. Database connection pooling (PgBouncer sidecar or Cloud SQL proxy)

## Shared Cluster Notes

MediaSentinel and PokerForge website share the GKE cluster but are isolated by namespace:

```
Namespaces:
  mediasentinel/    ← MediaSentinel pods, services, config
  pokerforge/       ← PokerForge website pods (future)
```

Each namespace has its own:
- Resource quotas (prevent one project from starving the other)
- Network policies (pods can't cross-namespace by default)
- Secrets and config
- Service accounts

Alphabreak is NOT on this cluster — too large, gets its own infrastructure.
