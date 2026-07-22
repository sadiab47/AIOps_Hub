export const WILDCARD_PERMISSION = '*';

export const Permissions = {
  organization: {
    view: 'organization:view',
    update: 'organization:update',
    delete: 'organization:delete',
  },
  member: {
    list: 'member:list',
    view: 'member:view',
    invite: 'member:invite',
    update: 'member:update',
    remove: 'member:remove',
    transferOwnership: 'member:transfer_ownership',
  },
  invitation: {
    create: 'invitation:create',
    view: 'invitation:view',
    revoke: 'invitation:revoke',
  },
  settings: {
    update: 'settings:update',
  },
  provider: {
    view: 'provider:view',
    create: 'provider:create',
    update: 'provider:update',
    delete: 'provider:delete',
    validate: 'provider:validate',
    setDefault: 'provider:setDefault',
  },
  prompt: {
    view: 'prompt:view',
    create: 'prompt:create',
    update: 'prompt:update',
    delete: 'prompt:delete',
    versionCreate: 'prompt:version:create',
    versionView: 'prompt:version:view',
    render: 'prompt:render',
  },
  agent: {
    view: 'agent:view',
    create: 'agent:create',
    update: 'agent:update',
    delete: 'agent:delete',
    execute: 'agent:execute',
  },
} as const;

type ValueOf<T> = T[keyof T];
type DeepValueOf<T> = ValueOf<{ [K in keyof T]: ValueOf<T[K]> }>;

/**
 * Union type of all valid permission strings in the system,
 * plus the WILDCARD_PERMISSION constant ('*').
 */
export type Permission = typeof WILDCARD_PERMISSION | DeepValueOf<typeof Permissions>;
