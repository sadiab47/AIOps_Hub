import { AiProviderConfig, Prisma } from '@aiops-hub/db';

export const AI_PROVIDER_REPOSITORY_TOKEN = Symbol('AI_PROVIDER_REPOSITORY_TOKEN');

export interface AiProviderRepositoryInterface {
  create(
    data: Prisma.AiProviderConfigCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<AiProviderConfig>;

  update(
    id: string,
    data: Prisma.AiProviderConfigUpdateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<AiProviderConfig>;

  delete(id: string, tx?: Prisma.TransactionClient): Promise<void>;

  findById(id: string, orgId: string): Promise<AiProviderConfig | null>;

  findByName(orgId: string, name: string): Promise<AiProviderConfig | null>;

  findDefault(orgId: string): Promise<AiProviderConfig | null>;

  listByOrg(orgId: string): Promise<AiProviderConfig[]>;

  unsetDefault(orgId: string, tx?: Prisma.TransactionClient): Promise<void>;

  executeTransaction<T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T>;
}
