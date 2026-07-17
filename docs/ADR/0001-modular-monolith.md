# ADR 0001: Modular Monolith Architecture

## Status
Approved

## Context
AIOps Hub is designed to serve as a flagship SaaS platform capable of scaling to support multiple business tenants, background job pipelines, and LLM integrations. When launching a new startup or platform, choosing the right structural boundary is critical. 

We considered two primary architectures:
1. **Microservices**: Independent deployable services communicating over RPC/message queues.
2. **Modular Monolith**: A single deployable unit where modules are logically separated with clear interface boundaries and strict dependency rules.

## Decision
We chose a **Modular Monolith** architecture for AIOps Hub. 

### Rationale
- **Development Velocity**: A modular monolith allows a solo developer or small team to write code, share interfaces, and run migrations without the operational overhead of running 5+ microservices locally.
- **Low Operational Complexity**: Deploying a single application container to AWS ECS/App Runner is simpler and cheaper than managing a Kubernetes cluster or ECS cluster with container networking, service discovery, and tracing.
- **Refactoring Ease**: At an early stage, domain boundaries change frequently. Refactoring inside a single repo is significantly easier than moving code and databases across microservices.

## Why Not Microservices?
- **Premature Optimization**: Designing for infinite scale on day one introduces distributed transaction problems, complex authentication forwarding, and latency issues before the business model is proven.
- **Network Overhead**: Microservices require writing RPC/HTTP API code for internal communication. A modular monolith uses direct class/service calls, maintaining compile-time safety and optimal performance.

## Trade-offs
- **Shared Resources**: The backend API application shares memory and CPU. A memory leak in the document parsing logic could impact the auth service. We mitigate this by moving heavy background tasks to a separate worker instance (using Redis & BullMQ).
- **Database Sharing**: While modular monoliths support separate databases per module, we share a single PostgreSQL database instance but enforce strict logical separation inside the schema (schemas/tables prefixes) and only access database tables through designated module repositories.

## Migration Strategy
If a specific module (e.g. AI Workflow Executor or Document Parser) experiences high load or resource constraints, it can be extracted:
1. Since modules are strictly separated inside `apps/api/src/modules/`, we can isolate the module's services and repositories.
2. We can move the module's database tables to a separate database.
3. Extract the module into a separate application folder under `apps/` or `services/` and deploy it independently.
