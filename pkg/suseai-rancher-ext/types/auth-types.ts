// Authentication and Authorization Types

export interface RancherUser {
  readonly id: string;
  readonly name: string;
  readonly username: string;
  readonly displayName: string;
  readonly description?: string;
  readonly enabled: boolean;
  readonly principalIds: readonly string[];
  readonly created: string;
  readonly lastLogin?: string;
  // Additional fields that may be present
  readonly mustChangePassword?: boolean;
  readonly password?: string; // Only for creation/update
  readonly annotations?: Readonly<Record<string, string>>;
  readonly labels?: Readonly<Record<string, string>>;
}

export interface RancherRole {
  readonly id: string;
  readonly name: string;
  readonly displayName: string;
  readonly description?: string;
  readonly type: 'global' | 'cluster' | 'project' | 'namespaced';
  readonly rules: readonly RoleRule[];
  readonly created: string;
  // Additional fields
  readonly annotations?: Readonly<Record<string, string>>;
  readonly labels?: Readonly<Record<string, string>>;
}

export interface RoleRule {
  readonly verbs: readonly string[];
  readonly apiGroups: readonly string[];
  readonly resources: readonly string[];
  readonly resourceNames?: readonly string[];
  readonly nonResourceURLs?: readonly string[];
}

export interface AuthProvider {
  type: 'local' | 'ldap' | 'saml' | 'oidc' | 'activeDirectory' | 'github' | 'google';
  name: string;
  config: Record<string, any>;
  enabled: boolean;
}

export interface UserRoleAssignment {
  userId: string;
  roleId: string;
  clusterId?: string;
  projectId?: string;
  namespace?: string;
}

export interface ClusterAccess {
  clusterId: string;
  name: string;
  permissions: {
    read: boolean;
    write: boolean;
    admin: boolean;
  };
}

export interface AuthState {
  currentUser: RancherUser | null;
  users: RancherUser[];
  roles: RancherRole[];
  authProviders: AuthProvider[];
  clusterAccess: ClusterAccess[];
  loading: boolean;
  error: string | null;
}

// API Response types
export interface RancherApiResponse<T> {
  data: T[];
  pagination?: {
    limit: number;
    page: number;
    pages: number;
    total: number;
  };
}

export interface RancherApiSingleResponse<T> {
  data: T;
}

// Permission types
export interface Permission {
  resource: string;
  verbs: string[];
}

export interface UserPermissions {
  global: Permission[];
  cluster: Record<string, Permission[]>;
  project: Record<string, Permission[]>;
}