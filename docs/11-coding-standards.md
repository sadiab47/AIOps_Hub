# 11 Coding Standards

We enforce strict coding practices to ensure readability and maintainability.

## Guidelines
1. **Conventional Commits**: Every commit message must follow standard prefixes (e.g. `feat:`, `fix:`, `chore:`).
2. **Formatting**: Automatic Prettier formatting run before commits.
3. **TypeScript**: Strict flag configuration. Avoid using `any` type assignments.
4. **Clean Code**: Follow the Controller-Service-Repository pattern. Do not run direct raw SQL inside controllers or services.
