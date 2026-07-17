# 07 Security

We implement enterprise-grade security protocols.

## Key Measures
1. **HTTP-only Cookies**: Protects web client sessions against cross-site scripting (XSS) attacks.
2. **CORS Configuration**: Restricts access to API resources to trusted origins.
3. **Zod Validation**: Prevents execution errors caused by invalid system environment variables.
4. **Input Sanitization**: Global validation pipes reject malformed payloads.
5. **Soft Deletes**: Business critical rows are flag-deleted (`deletedAt`) to prevent accidental deletion and preserve operational history.
