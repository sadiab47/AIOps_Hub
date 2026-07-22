import { Agent, AgentVersion } from '@aiops-hub/db';

export const AGENT_REPOSITORY_TOKEN = Symbol('AGENT_REPOSITORY_TOKEN');

export interface AgentWithVersions extends Agent {
  versions: AgentVersion[];
}

export interface CreateAgentInput {
  organizationId: string;
  name: string;
  slug: string;
  description?: string;
  createdById: string;
  version: {
    providerConfigId: string;
    model: string;
    promptVersionId?: string;
    temperature?: number;
    maxTokens?: number;
  };
}

export interface AgentRepositoryInterface {
  create(data: CreateAgentInput): Promise<AgentWithVersions>;

  findById(id: string, orgId: string): Promise<AgentWithVersions | null>;

  findBySlug(slug: string, orgId: string): Promise<Agent | null>;

  list(orgId: string): Promise<Agent[]>;

  updateVersion(
    id: string,
    orgId: string,
    nextVersion: number,
    data: CreateAgentInput['version'],
  ): Promise<AgentWithVersions>;

  updateMetadata(
    id: string,
    orgId: string,
    data: { name?: string; description?: string },
  ): Promise<Agent>;

  softDelete(id: string, orgId: string): Promise<Agent>;

  enable(id: string, orgId: string): Promise<Agent>;

  disable(id: string, orgId: string): Promise<Agent>;

  existsByName(name: string, orgId: string): Promise<boolean>;

  existsBySlug(slug: string, orgId: string): Promise<boolean>;
}
