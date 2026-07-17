# GitHub Repository Setup Guide

To ensure your GitHub repository looks and functions like a premium commercial project, follow these instructions to configure **Labels**, **Milestones**, and the **Project Board**.

## 1. Automated GitHub Labels Setup

We have created an automation script in `scripts/setup-labels.js` that populates your repository with professional, color-coded categories (e.g. `type/bug`, `priority/high`, `status/in-progress`).

### Steps to Run:
1. Generate a **GitHub Personal Access Token (classic)** with `repo` scope permissions.
2. In your terminal, set the token and run the script:
   ```bash
   # For Bash / Linux / macOS:
   export GITHUB_TOKEN="your_token_here"
   node scripts/setup-labels.js

   # For Windows PowerShell:
   $env:GITHUB_TOKEN="your_token_here"
   node scripts/setup-labels.js
   ```

---

## 2. GitHub Milestones Setup

Milestones align issues and pull requests to your Sprint roadmap. Create the following milestones in your repository settings:

* **Sprint 0: Infrastructure & Foundation**
  * *Description*: Monorepo setup, workspaces, tsconfig/eslint, Docker Compose local database, Prisma shared packages, NestJS & Next.js skeletons, and CI validation.
* **Sprint 1: Authentication & Organization Management**
  * *Description*: User signup and login (hybrid JWT cookie/bearer), Organization CRUD, RBAC, soft deletes, auditing logs, and dashboard profile view.
* **Sprint 2: File Storage & Processing**
  * *Description*: File uploads, S3/MinIO storage integrations, document parsing engines, and BullMQ background tasks.
* **Sprint 3: Vector Search & AI RAG**
  * *Description*: Text embeddings generation, Qdrant vector database storage, AI chat interfaces, and RAG citation mapping.

---

## 4. GitHub Project Board Setup

Create a **GitHub Project (Beta)** in your repository to track progress:

1. Click on **Projects** at the top tab of your repository page -> **New Project**.
2. Select **Board** layout and name it **AIOps Hub Roadmap**.
3. Customize the columns to match a standard Agile Kanban board:
   * 📋 **Backlog**: Work waiting to be prioritized.
   * 📅 **Todo**: Tasks approved for the current Sprint.
   * 🚧 **In Progress**: Tasks actively being worked on.
   * 🔍 **In Review**: Pull requests waiting for review or manual testing.
   * ✅ **Done**: Completed and merged features.
4. Set up workflows to automatically move issues:
   * Move to **In Progress** when a branch or draft PR is linked.
   * Move to **In Review** when a Pull Request is opened.
   * Move to **Done** when a Pull Request is merged.
