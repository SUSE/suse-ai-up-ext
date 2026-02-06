// Authentication Service for Rancher API integration

import type {
  RancherUser,
  RancherRole,
  AuthProvider,
  ClusterAccess,
  RancherApiResponse,
  RancherApiSingleResponse,
  UserPermissions
} from '../types/auth-types';

export class AuthService {
  private store: any;

  constructor(store: any) {
    this.store = store;
  }

  /**
   * Get all users from Rancher
   */
  async getUsers(): Promise<RancherUser[]> {
    try {
      const response: RancherApiResponse<RancherUser> = await this.store.dispatch('rancher/request', {
        url: '/v3/users',
        method: 'GET'
      });
      return response.data || [];
    } catch (error) {
      console.error('Failed to fetch users:', error);
      throw new Error('Unable to load users');
    }
  }

  /**
   * Get a specific user by ID
   */
  async getUser(userId: string): Promise<RancherUser> {
    try {
      const response: RancherApiSingleResponse<RancherUser> = await this.store.dispatch('rancher/request', {
        url: `/v3/users/${userId}`,
        method: 'GET'
      });
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch user ${userId}:`, error);
      throw new Error('Unable to load user details');
    }
  }

  /**
   * Update a user
   */
  async updateUser(userId: string, userData: Partial<RancherUser>): Promise<RancherUser> {
    try {
      const response: RancherApiSingleResponse<RancherUser> = await this.store.dispatch('rancher/request', {
        url: `/v3/users/${userId}`,
        method: 'PUT',
        data: userData
      });
      return response.data;
    } catch (error) {
      console.error(`Failed to update user ${userId}:`, error);
      throw new Error('Unable to update user');
    }
  }

  /**
   * Get all global roles
   */
  async getGlobalRoles(): Promise<RancherRole[]> {
    try {
      const response: RancherApiResponse<RancherRole> = await this.store.dispatch('rancher/request', {
        url: '/v3/globalRoles',
        method: 'GET'
      });
      return response.data || [];
    } catch (error) {
      console.error('Failed to fetch global roles:', error);
      throw new Error('Unable to load roles');
    }
  }

  /**
   * Get cluster roles
   */
  async getClusterRoles(): Promise<RancherRole[]> {
    try {
      const response: RancherApiResponse<RancherRole> = await this.store.dispatch('rancher/request', {
        url: '/v3/roletemplates?context=cluster',
        method: 'GET'
      });
      return response.data || [];
    } catch (error) {
      console.error('Failed to fetch cluster roles:', error);
      throw new Error('Unable to load cluster roles');
    }
  }

  /**
   * Get project roles
   */
  async getProjectRoles(): Promise<RancherRole[]> {
    try {
      const response: RancherApiResponse<RancherRole> = await this.store.dispatch('rancher/request', {
        url: '/v3/roletemplates?context=project',
        method: 'GET'
      });
      return response.data || [];
    } catch (error) {
      console.error('Failed to fetch project roles:', error);
      throw new Error('Unable to load project roles');
    }
  }

  /**
   * Get a specific role by ID
   */
  async getRole(roleId: string): Promise<RancherRole> {
    try {
      const response: RancherApiSingleResponse<RancherRole> = await this.store.dispatch('rancher/request', {
        url: `/v3/globalRoles/${roleId}`,
        method: 'GET'
      });
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch role ${roleId}:`, error);
      throw new Error('Unable to load role details');
    }
  }

  /**
   * Get authentication providers
   */
  async getAuthProviders(): Promise<AuthProvider[]> {
    try {
      const response: RancherApiResponse<AuthProvider> = await this.store.dispatch('rancher/request', {
        url: '/v3/authConfigs',
        method: 'GET'
      });
      return response.data || [];
    } catch (error) {
      console.error('Failed to fetch auth providers:', error);
      throw new Error('Unable to load authentication providers');
    }
  }

  /**
   * Get current authenticated user
   */
  getCurrentUser(): RancherUser | null {
    // Try multiple possible getter paths for Rancher auth
    const possiblePaths = [
      'auth/user',
      'management/auth/user',
      'rancher/auth/user',
      'auth/principal',
      'management/auth/principal',
      'auth/v3User',
      'management/auth/v3User'
    ];

    console.log('🔍 [AuthService] Looking for current user...');

    for (const path of possiblePaths) {
      try {
        const user = this.store.getters[path];
        if (user && (user.id || user.username || user.principalId || user.loginName)) {
          console.log(`✅ [AuthService] Found user via getter '${path}':`, user);
          return this.normalizeUserObject(user);
        }
      } catch (e: any) {
        // Getter doesn't exist or threw error, continue to next
        console.log(`❌ [AuthService] Getter '${path}' not available or failed:`, e?.message || e);
      }
    }

    console.warn('❌ [AuthService] No valid user found via any getter path');

    // Try to get user via API as fallback
    this.getCurrentUserViaAPI().then(apiUser => {
      if (apiUser) {
        console.log('✅ [AuthService] Found user via API fallback:', apiUser);
      } else {
        console.log('❌ [AuthService] No user found via API fallback either');
      }
    }).catch(error => {
      console.error('❌ [AuthService] API fallback failed:', error);
    });

    return null;
  }

  /**
   * Normalize user object from different Rancher formats to our interface
   */
  private normalizeUserObject(user: any): RancherUser {
    console.log('🔄 [AuthService] Normalizing user object:', user);

    const normalized: RancherUser = {
      id: user.id || user.principalId || user.username || `user-${Date.now()}`,
      name: user.name || user.username || user.loginName || 'unknown',
      username: user.username || user.loginName || user.name || 'unknown',
      displayName: user.displayName || user.name || user.username || 'Unknown User',
      description: user.description || '',
      enabled: user.enabled !== false, // Default to enabled if not specified
      principalIds: Array.isArray(user.principalIds) ? user.principalIds :
                   user.principalId ? [user.principalId] : [],
      created: user.created || user.createdAt || new Date().toISOString(),
      lastLogin: user.lastLogin || user.lastLoginAt || undefined,
      mustChangePassword: user.mustChangePassword,
      password: user.password,
      annotations: user.annotations || {},
      labels: user.labels || {}
    };

    console.log('✅ [AuthService] Normalized user:', normalized);
    return normalized;
  }

  /**
   * Try to get current user via Rancher API as fallback
   */
  private async getCurrentUserViaAPI(): Promise<RancherUser | null> {
    try {
      console.log('🔍 [AuthService] Trying API fallback for current user...');

      const response = await this.store.dispatch('rancher/request', {
        url: '/v3/users?me=true',
        method: 'GET'
      });

      if (response.data && response.data.length > 0) {
        const apiUser = response.data[0];
        console.log('✅ [AuthService] API returned user:', apiUser);
        return this.normalizeUserObject(apiUser);
      }

      console.log('❌ [AuthService] API returned no users');
      return null;
    } catch (error) {
      console.error('❌ [AuthService] API fallback failed:', error);
      return null;
    }
  }

  /**
   * Check if current user has admin privileges
   */
  hasAdminPrivileges(): boolean {
    try {
      const user = this.getCurrentUser();
      if (!user) {
        console.log('❌ [AuthService] No user found for admin check');
        return false;
      }

      console.log('🔍 [AuthService] Checking admin privileges for user:', user);

      // Multiple ways to detect admin privileges in Rancher
      const adminChecks = [
        // 1. Principal ID contains admin
        () => {
          const hasAdminPrincipal = user.principalIds?.some(id =>
            id.includes('admin') ||
            id.includes('Admin') ||
            id === 'local://user-admin' ||
            id.includes('local://user-admin')
          );
          console.log('🔍 [AuthService] Admin principal check:', hasAdminPrincipal, user.principalIds);
          return hasAdminPrincipal;
        },

        // 2. Username indicates admin
        () => {
          const isAdminUsername = user.username === 'admin' ||
                                 user.username === 'Admin' ||
                                 user.name === 'admin' ||
                                 user.name === 'Admin';
          console.log('🔍 [AuthService] Admin username check:', isAdminUsername, user.username, user.name);
          return isAdminUsername;
        },

        // 3. Check for admin role in annotations/labels
        () => {
          const hasAdminAnnotation = user.annotations?.['authz.management.cattle.io/admin'] === 'true' ||
                                    user.labels?.['authz.management.cattle.io/admin'] === 'true';
          console.log('🔍 [AuthService] Admin annotation check:', hasAdminAnnotation, user.annotations, user.labels);
          return hasAdminAnnotation;
        },

        // 4. Check if user ID indicates admin
        () => {
          const isAdminId = user.id === 'user-admin' ||
                           user.id === 'admin' ||
                           user.id?.includes('admin');
          console.log('🔍 [AuthService] Admin ID check:', isAdminId, user.id);
          return isAdminId;
        }
      ];

      const isAdmin = adminChecks.some(check => {
        try {
          return check();
        } catch (error) {
          console.warn('⚠️ [AuthService] Admin check failed:', error);
          return false;
        }
      });

      console.log('✅ [AuthService] Final admin privilege result:', isAdmin);
      return isAdmin;
    } catch (error) {
      console.error('❌ [AuthService] Failed to check admin privileges:', error);
      return false;
    }
  }

  /**
   * Get clusters accessible to the current user
   */
  async getAccessibleClusters(): Promise<ClusterAccess[]> {
    try {
      const response: RancherApiResponse<any> = await this.store.dispatch('rancher/request', {
        url: '/v3/clusters',
        method: 'GET'
      });

      const clusters = response.data || [];
      return clusters.map((cluster: any) => ({
        clusterId: cluster.id,
        name: cluster.name,
        permissions: {
          read: true, // Assume read access if visible
          write: this.hasAdminPrivileges(),
          admin: this.hasAdminPrivileges()
        }
      }));
    } catch (error) {
      console.error('Failed to fetch accessible clusters:', error);
      throw new Error('Unable to load cluster access information');
    }
  }

  /**
   * Get user permissions
   */
  async getUserPermissions(userId: string): Promise<UserPermissions> {
    try {
      // This is a simplified implementation
      // In a real scenario, you'd need to check role bindings
      const user = await this.getUser(userId);
      const isAdmin = user.principalIds.some(id => id.includes(':admin'));

      return {
        global: isAdmin ? [{ resource: '*', verbs: ['*'] }] : [],
        cluster: {},
        project: {}
      };
    } catch (error) {
      console.error(`Failed to get permissions for user ${userId}:`, error);
      throw new Error('Unable to load user permissions');
    }
  }

  /**
   * Assign a role to a user
   */
  async assignRoleToUser(userId: string, roleId: string, context?: { clusterId?: string; projectId?: string }): Promise<void> {
    try {
      const data: any = {
        userId,
        roleTemplateId: roleId,
        type: 'roleTemplateBinding'
      };

      if (context?.clusterId) {
        data.clusterId = context.clusterId;
      }

      if (context?.projectId) {
        data.projectId = context.projectId;
      }

      await this.store.dispatch('rancher/request', {
        url: '/v3/roleTemplateBindings',
        method: 'POST',
        data
      });
    } catch (error) {
      console.error(`Failed to assign role ${roleId} to user ${userId}:`, error);
      throw new Error('Unable to assign role to user');
    }
  }

  /**
   * Remove a role from a user
   */
  async removeRoleFromUser(userId: string, roleId: string, context?: { clusterId?: string; projectId?: string }): Promise<void> {
    try {
      // Find the role binding first
      const bindingsResponse: RancherApiResponse<any> = await this.store.dispatch('rancher/request', {
        url: '/v3/roleTemplateBindings',
        method: 'GET',
        params: {
          userId,
          roleTemplateId: roleId,
          ...(context?.clusterId && { clusterId: context.clusterId }),
          ...(context?.projectId && { projectId: context.projectId })
        }
      });

      const bindings = bindingsResponse.data || [];
      if (bindings.length === 0) {
        throw new Error('Role binding not found');
      }

      // Delete the binding
      await this.store.dispatch('rancher/request', {
        url: `/v3/roleTemplateBindings/${bindings[0].id}`,
        method: 'DELETE'
      });
    } catch (error) {
      console.error(`Failed to remove role ${roleId} from user ${userId}:`, error);
      throw new Error('Unable to remove role from user');
    }
  }
}

// Export singleton instance factory
export function createAuthService(store: any): AuthService {
  return new AuthService(store);
}