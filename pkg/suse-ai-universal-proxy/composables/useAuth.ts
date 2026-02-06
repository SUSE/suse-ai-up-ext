// Authentication composable for managing users, roles, and permissions

import { ref, computed, readonly } from 'vue';
import { useStore } from 'vuex';
import { createAuthService } from '../services/auth-service';
import type {
  RancherUser,
  RancherRole,
  AuthProvider,
  ClusterAccess,
  UserPermissions
} from '../types/auth-types';

export function useAuth() {
  const store = useStore();
  const authService = createAuthService(store);

  // Reactive state
  const users = ref<RancherUser[]>([]);
  const roles = ref<RancherRole[]>([]);
  const authProviders = ref<AuthProvider[]>([]);
  const clusterAccess = ref<ClusterAccess[]>([]);
  const loadingUsers = ref(false);
  const loadingRoles = ref(false);
  const loadingProviders = ref(false);
  const usersError = ref<string | null>(null);
  const rolesError = ref<string | null>(null);
  const providersError = ref<string | null>(null);

  // Computed properties
  const currentUser = computed(() => {
    const user = authService.getCurrentUser();
    console.log('🔍 [useAuth] Current user computed:', user);
    return user;
  });

  const hasAdminPrivileges = computed(() => {
    const isAdmin = authService.hasAdminPrivileges();
    console.log('🔍 [useAuth] Admin privileges computed:', isAdmin);
    return isAdmin;
  });

  const isAuthenticated = computed(() => {
    const authenticated = !!currentUser.value;
    console.log('🔍 [useAuth] Is authenticated computed:', authenticated);
    return authenticated;
  });

  // Debug information
  const debugInfo = computed(() => ({
    currentUser: currentUser.value,
    hasAdminPrivileges: hasAdminPrivileges.value,
    isAuthenticated: isAuthenticated.value,
    availableGetters: Object.keys(store.getters).filter(k =>
      k.includes('auth') || k.includes('user') || k.includes('principal')
    ),
    storeState: {
      auth: store.state.auth,
      management: store.state.management?.auth
    }
  }));

  // User management methods
  const loadUsers = async () => {
    loadingUsers.value = true;
    usersError.value = null;
    try {
      users.value = await authService.getUsers();
    } catch (error: any) {
      usersError.value = error.message || 'Failed to load users';
      console.error('Error loading users:', error);
    } finally {
      loadingUsers.value = false;
    }
  };

  const getUserDetails = async (userId: string): Promise<RancherUser> => {
    try {
      return await authService.getUser(userId);
    } catch (error: any) {
      console.error(`Error loading user ${userId}:`, error);
      throw error;
    }
  };

  const updateUser = async (userId: string, userData: Partial<RancherUser>): Promise<RancherUser> => {
    try {
      const updatedUser = await authService.updateUser(userId, userData);
      // Update the user in the local list
      const index = users.value.findIndex(u => u.id === userId);
      if (index !== -1) {
        users.value[index] = updatedUser;
      }
      return updatedUser;
    } catch (error: any) {
      console.error(`Error updating user ${userId}:`, error);
      throw error;
    }
  };

  // Role management methods
  const loadRoles = async () => {
    loadingRoles.value = true;
    rolesError.value = null;
    try {
      const [globalRoles, clusterRoles, projectRoles] = await Promise.all([
        authService.getGlobalRoles(),
        authService.getClusterRoles(),
        authService.getProjectRoles()
      ]);

      // Combine all roles
      roles.value = [...globalRoles, ...clusterRoles, ...projectRoles];
    } catch (error: any) {
      rolesError.value = error.message || 'Failed to load roles';
      console.error('Error loading roles:', error);
    } finally {
      loadingRoles.value = false;
    }
  };

  const getRoleDetails = async (roleId: string): Promise<RancherRole> => {
    try {
      return await authService.getRole(roleId);
    } catch (error: any) {
      console.error(`Error loading role ${roleId}:`, error);
      throw error;
    }
  };

  const updateRole = async (roleId: string, roleData: Partial<RancherRole>): Promise<RancherRole> => {
    try {
      // For now, just return the role data as roles are typically read-only
      // In a real implementation, you'd call an update API
      const existingRole = roles.value.find(r => r.id === roleId);
      if (!existingRole) {
        throw new Error('Role not found');
      }

      const updatedRole = { ...existingRole, ...roleData };
      const index = roles.value.findIndex(r => r.id === roleId);
      if (index !== -1) {
        roles.value[index] = updatedRole;
      }
      return updatedRole;
    } catch (error: any) {
      console.error(`Error updating role ${roleId}:`, error);
      throw error;
    }
  };

  // Auth provider methods
  const loadAuthProviders = async () => {
    loadingProviders.value = true;
    providersError.value = null;
    try {
      authProviders.value = await authService.getAuthProviders();
    } catch (error: any) {
      providersError.value = error.message || 'Failed to load auth providers';
      console.error('Error loading auth providers:', error);
    } finally {
      loadingProviders.value = false;
    }
  };

  // Cluster access methods
  const loadClusterAccess = async () => {
    try {
      clusterAccess.value = await authService.getAccessibleClusters();
    } catch (error: any) {
      console.error('Error loading cluster access:', error);
      clusterAccess.value = [];
    }
  };

  // Permission methods
  const getUserPermissions = async (userId: string): Promise<UserPermissions> => {
    try {
      return await authService.getUserPermissions(userId);
    } catch (error: any) {
      console.error(`Error loading permissions for user ${userId}:`, error);
      throw error;
    }
  };

  // Role assignment methods
  const assignRoleToUser = async (
    userId: string,
    roleId: string,
    context?: { clusterId?: string; projectId?: string }
  ): Promise<void> => {
    try {
      await authService.assignRoleToUser(userId, roleId, context);
    } catch (error: any) {
      console.error(`Error assigning role ${roleId} to user ${userId}:`, error);
      throw error;
    }
  };

  const removeRoleFromUser = async (
    userId: string,
    roleId: string,
    context?: { clusterId?: string; projectId?: string }
  ): Promise<void> => {
    try {
      await authService.removeRoleFromUser(userId, roleId, context);
    } catch (error: any) {
      console.error(`Error removing role ${roleId} from user ${userId}:`, error);
      throw error;
    }
  };

  // Utility methods
  const canAccessCluster = (clusterId: string): boolean => {
    return clusterAccess.value.some(access => access.clusterId === clusterId && access.permissions.read);
  };

  const canManageCluster = (clusterId: string): boolean => {
    return clusterAccess.value.some(access => access.clusterId === clusterId && access.permissions.admin);
  };

  const getAuthProviderByType = (type: string): AuthProvider | undefined => {
    return authProviders.value.find(provider => provider.type === type);
  };

  const getEnabledAuthProviders = (): AuthProvider[] => {
    return authProviders.value.filter(provider => provider.enabled);
  };

  return {
    // State
    users: readonly(users),
    roles: readonly(roles),
    authProviders: readonly(authProviders),
    clusterAccess: readonly(clusterAccess),
    loadingUsers: readonly(loadingUsers),
    loadingRoles: readonly(loadingRoles),
    loadingProviders: readonly(loadingProviders),
    usersError: readonly(usersError),
    rolesError: readonly(rolesError),
    providersError: readonly(providersError),

    // Computed
    currentUser,
    hasAdminPrivileges,
    isAuthenticated,

    // User methods
    loadUsers,
    getUserDetails,
    updateUser,

    // Role methods
    loadRoles,
    getRoleDetails,
    updateRole,

    // Auth provider methods
    loadAuthProviders,

    // Cluster access methods
    loadClusterAccess,

    // Permission methods
    getUserPermissions,
    assignRoleToUser,
    removeRoleFromUser,

    // Utility methods
    canAccessCluster,
    canManageCluster,
    getAuthProviderByType,
    getEnabledAuthProviders,

    // Debug information
    debugInfo
  };
}