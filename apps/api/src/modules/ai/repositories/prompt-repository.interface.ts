import { Prompt, PromptVersion, PromptVisibility, Prisma } from '@aiops-hub/db';

export const PROMPT_REPOSITORY_TOKEN = Symbol('PROMPT_REPOSITORY_TOKEN');

export interface PromptRepositoryInterface {
  create(
    data: Prisma.PromptCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<Prompt>;

  update(
    id: string,
    data: Prisma.PromptUpdateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<Prompt>;

  delete(id: string, tx?: Prisma.TransactionClient): Promise<void>;

  findById(id: string, orgId: string | null): Promise<Prompt | null>;

  findBySlug(orgId: string | null, slug: string): Promise<Prompt | null>;

  list(
    orgId: string | null,
    categoryId?: string,
    visibility?: PromptVisibility,
  ): Promise<Prompt[]>;

  getLatestVersion(promptId: string): Promise<PromptVersion | null>;

  getVersion(promptId: string, version: number): Promise<PromptVersion | null>;

  listVersions(promptId: string): Promise<PromptVersion[]>;

  createVersion(
    data: Prisma.PromptVersionCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<PromptVersion>;

  existsSlug(orgId: string | null, slug: string): Promise<boolean>;

  executeTransaction<T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T>;
}
