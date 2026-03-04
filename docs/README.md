# RAG AI Chatbot — Documentation

Detailed documentation for the RAG Knowledge Assistant project.

## Contents

| Document | Description |
|----------|-------------|
| [**ARCHITECTURE.md**](./ARCHITECTURE.md) | High-level architecture, RAG pipeline, and folder structure |
| [**SYSTEM_DESIGN.md**](./SYSTEM_DESIGN.md) | System design document: context, components, data model, flows, multi-tenancy, and trade-offs |
| [**SETUP.md**](./SETUP.md) | Step-by-step setup, prerequisites, and first run |
| [**CONFIGURATION.md**](./CONFIGURATION.md) | Environment variables, RAG tuning, and feature flags |
| [**API.md**](./API.md) | Server actions, types, validation schemas, and usage examples |
| [**DEPLOYMENT.md**](./DEPLOYMENT.md) | Production deployment (Vercel, Neon, Clerk), checklist, and troubleshooting |
| [**DEVELOPMENT.md**](./DEVELOPMENT.md) | Local dev workflow, scripts, and conventions |
| [**PRODUCT_FEATURES.md**](./PRODUCT_FEATURES.md) | Product roadmap: research-backed features and prioritization for the internal knowledge base |
| [**PRODUCTION_CHECKLIST.md**](./PRODUCTION_CHECKLIST.md) | Production readiness: security, validation, error handling, pre-deploy verification |
| [**MULTI_TENANT_SAAS.md**](./MULTI_TENANT_SAAS.md) | Multi-tenant SaaS: architecture analysis, Clerk Organizations as tenant, implementation plan |
| [**CLERK_MULTI_TENANT_SETUP.md**](./CLERK_MULTI_TENANT_SETUP.md) | Clerk Dashboard setup for Organizations and multi-tenant flows |

## Quick links

- **I want to run the app locally** → [SETUP.md](./SETUP.md)
- **I want to tune retrieval or models** → [CONFIGURATION.md](./CONFIGURATION.md#rag-config)
- **I want to understand how RAG works** → [ARCHITECTURE.md](./ARCHITECTURE.md#rag-pipeline)
- **I want the full system design (multi-tenant, flows, trade-offs)** → [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md)
- **I want to deploy to production** → [DEPLOYMENT.md](./DEPLOYMENT.md)
- **I want to use or extend server actions** → [API.md](./API.md)
- **I want to run locally and contribute** → [DEVELOPMENT.md](./DEVELOPMENT.md)
- **I want to see planned features and product rationale** → [PRODUCT_FEATURES.md](./PRODUCT_FEATURES.md)
- **I want to verify production readiness** → [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md)
- **I want to make this app multi-tenant SaaS** → [MULTI_TENANT_SAAS.md](./MULTI_TENANT_SAAS.md)
