# ADR 0005: Multi-Device Session Management

## Status
Proposed

## Context
For **AUTH-002 (User Login)**, the platform requires establishing active user sessions. We need to decide whether user login represents a single-session state (where logging in on a new device terminates all previous sessions) or a multi-session state (where a user can remain logged in on multiple devices simultaneously).

## Decision
We choose **Option B: Multi-Device Sessions**. 
- Each login attempt creates a distinct `RefreshToken` record mapped to the user.
- We extend the `RefreshToken` database model to store contextual metadata: `ipAddress` and `userAgent`.
- The `RefreshToken` `id` (UUID) serves as the `sessionId` in our JWT access and refresh token payloads:
  ```json
  {
    "sub": "userId",
    "email": "user@example.com",
    "sessionId": "refreshTokenId"
  }
  ```
- This allows tracking active devices, displaying active sessions to users, auditing activity, and performing targeted or global session revocations (e.g., logging out from a single device, or revoking all sessions).

## Consequences
- **Storage Requirement**: Creating a record for each device session increases the DB storage footprint compared to single session setups. We will implement database cleanup jobs in a future sprint to remove expired/revoked session tokens.
- **Traceability**: Enhanced audit trail mapping every request trace directly to a specific session ID, client IP, and device User-Agent.
