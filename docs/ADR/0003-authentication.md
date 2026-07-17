# ADR 0003: Hybrid Authentication (Cookie & Bearer Token)

## Status
Approved

## Context
AIOps Hub serves both a primary Next.js web application and future integration clients, such as mobile apps, CLI developer utilities, Model Context Protocol (MCP) servers, and external third-party webhooks. Web browsers and API clients have different security constraints and access requirements.

## Decision
We implement a **Hybrid Authentication** architecture:
1. **Web App Clients**: Secure, HTTP-only, SameSite=Strict cookies containing the JWT session.
2. **API & Integration Clients**: Standard Bearer JWT tokens sent via the `Authorization` header.

## Rationale
- **Security for Web App**: HTTP-only cookies prevent Cross-Site Scripting (XSS) attacks from stealing user session tokens from browser local storage.
- **Flexibility for APIs**: API scripts, CLI tools, and background worker systems cannot easily handle cookie stores. Sending bearer tokens via headers is the standard industry practice for automated integrations.
- **Single Backend Module**: The authentication service uses the same JWT verification key and payload schema, meaning only the extraction logic differs (cookie extractor vs. header extractor).
