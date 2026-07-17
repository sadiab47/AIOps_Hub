# Contributing Guidelines

Thank you for contributing to AIOps Hub! To maintain a world-class standard, please follow these guidelines when submitting bug reports, feature requests, or code updates.

## Getting Started

1. **Fork & Clone**: Fork the repository on GitHub and clone your fork locally.
2. **Setup Dependencies**: Make sure you have Node.js >= 22 and `pnpm` installed. Run:
   ```bash
   pnpm install
   ```
3. **Database Setup**: Start the database services using Docker Compose:
   ```bash
   docker compose -f infra/docker/docker-compose.yml up -d
   ```
4. **Generate Prisma Client**: Build types for the database schema:
   ```bash
   pnpm --filter @aiops-hub/db db:generate
   ```
5. **Run Dev Servers**: Run all applications in development mode:
   ```bash
   pnpm dev
   ```

## Coding Standards

- **Strict TypeScript**: We use strict compiler flags. Ensure your code passes all type checks before pushing (`pnpm typecheck`).
- **Clean Architecture**: Follow the modular monolith rules. Business logic must live inside modules, and application services should call repositories instead of interacting with Prisma directly.
- **Linting & Formatting**: Format code with Prettier and run Lint checks before committing:
   ```bash
   pnpm lint
   pnpm format
   ```

## Git Workflow

### Branch Naming Conventions

Use the following prefixes when creating a new branch:

- `feat/` for new features (e.g. `feat/auth-jwt`)
- `fix/` for bug fixes (e.g. `fix/db-connection-retry`)
- `docs/` for updates to documentation (e.g. `docs/api-guide`)
- `chore/` for updates to builds, dependencies, or repository files (e.g. `chore/pnpm-upgrade`)

### Commit Message Format

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```text
<type>(<scope>): <short summary description>

[optional body explanation]
```

**Common Types**:
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code (formatting)
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `test`: Adding missing tests or correcting existing tests
- `chore`: Changes to the build process or auxiliary tools

### Pull Request Process

1. Create a branch from `main`.
2. Implement your changes, including updates to tests and documentation where applicable.
3. Verify that your branch builds and passes all checks:
   ```bash
   pnpm build
   ```
4. Commit your changes using Conventional Commits.
5. Push to your fork and submit a Pull Request to `main`.
6. Ensure the Github Action CI checks pass. A maintainer will review your code shortly.
