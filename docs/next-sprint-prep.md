# Next Sprint Preparation (v0.2.0)

This document captures architectural notes and details the templates for starting the next sprint on **Organizations & RBAC**.

---

## 💡 Notes & Architectural Ideas from Today

1. **Session-to-Organization Binding**:
   - As we move to `v0.2.0`, consider whether a session should be bound to a *single* organization context at a time, or if the access token should contain the user's *current active organization ID* (allowing them to switch organizations by rotating their session/access token).
   - This prevents cross-tenant data leaks and simplifies resource authorization.

2. **RBAC Guard Design**:
   - Create a reusable `@Roles()` decorator and `RolesGuard` that checks the user's role within their active organization context (retrieved via `request.user` and verified against organization members).

3. **Audit Event Scaling**:
   - As new features are added, scale the auditing enum: `ORGANIZATION_CREATE`, `ORGANIZATION_UPDATE`, `MEMBER_INVITED`, `MEMBER_JOINED`.

---

## 📋 ORG-001 Issue Template

Below is the template to open the first issue for the next sprint (**v0.2.0**):

```markdown
Title: ORG-001: Implement Organization CRUD & Tenant Isolation

### Description
Establish the core multi-tenant organization infrastructure. Every user must belong to at least one organization, and all data queries must be logically partitioned by organization.

### Requirements
- [ ] Create `OrganizationRepository` and `OrganizationsService` to manage organization lifecycle.
- [ ] Implement `POST /api/v1/organizations` endpoint to create a new organization.
- [ ] Implement automatic organization creator-membership assignment (assigning the creator as `OWNER`).
- [ ] Create `TenantInterceptor` or custom request guards to extract and validate `organizationId` from headers/requests to enforce logical tenant isolation.
- [ ] Add unit tests for `OrganizationsService` and integration tests for organization isolation.

### References
- Prisma Schema: `Organization` & `Member` models
- ADR-0004: Multi-Tenancy Architecture
```
