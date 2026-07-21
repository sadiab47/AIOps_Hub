export const Permissions = {
  organization: {
    view:   'organization:view',
    update: 'organization:update',
    delete: 'organization:delete',
  },
  member: {
    list:              'member:list',
    view:              'member:view',
    invite:            'member:invite',
    remove:            'member:remove',
    changeRole:        'member:role:change',
    transferOwnership: 'member:ownership:transfer',
  },
  invitation: {
    create: 'invitation:create',
    accept: 'invitation:accept',
    revoke: 'invitation:revoke',
  },
  settings: {
    update: 'settings:update',
  },
} as const;

/**
 * Union type of all permission string literals.
 * Use for typed permission checks once PermissionGuard is introduced in RBAC-001.
 *
 * Example:
 *   const perm: Permission = Permissions.member.remove; // 'member:remove'
 */
export type Permission =
  (typeof Permissions)[keyof typeof Permissions][
    keyof (typeof Permissions)[keyof typeof Permissions]
  ];
