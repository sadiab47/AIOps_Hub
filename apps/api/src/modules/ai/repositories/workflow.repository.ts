export abstract class WorkflowRepository {
  abstract create(
    organizationId: string,
    data: {
      name: string;
      description?: string;
      definition: any;
      createdById?: string;
    },
  ): Promise<any>;

  abstract findById(organizationId: string, id: string): Promise<any | null>;

  abstract findByName(organizationId: string, name: string): Promise<any | null>;

  abstract findAll(organizationId: string): Promise<any[]>;

  abstract update(
    organizationId: string,
    id: string,
    data: {
      name?: string;
      description?: string;
      status?: any;
      definition?: any;
      createdById?: string;
    },
  ): Promise<any>;

  abstract delete(organizationId: string, id: string): Promise<boolean>;

  abstract findLatestVersion(workflowId: string): Promise<any | null>;

  abstract findVersion(workflowId: string, versionNumber: number): Promise<any | null>;
}
