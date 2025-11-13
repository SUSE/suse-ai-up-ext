<template>
  <div class="settings-page">
    <!-- Access denied message for non-admin users -->
    <div v-if="!isAuthenticated || !hasAdminPrivileges" class="access-denied">
      <div class="access-denied-content">
        <h2>Access Denied</h2>
        <p>You need administrator privileges to access the Settings page.</p>
        <p v-if="!isAuthenticated">Please log in with an administrator account.</p>
        <p v-else-if="currentUser">Current user: {{ currentUser.displayName || currentUser.username }}</p>

        <!-- Debug information for troubleshooting -->
        <details class="debug-section">
          <summary>🔍 Authentication Debug Info (Click to expand)</summary>
          <div class="debug-content">
            <div class="debug-item">
              <strong>Is Authenticated:</strong> {{ debugInfo.isAuthenticated }}
            </div>
            <div class="debug-item">
              <strong>Has Admin Privileges:</strong> {{ debugInfo.hasAdminPrivileges }}
            </div>
            <div class="debug-item">
              <strong>Current User:</strong>
              <pre>{{ JSON.stringify(debugInfo.currentUser, null, 2) }}</pre>
            </div>
            <div class="debug-item">
              <strong>Available Auth Getters:</strong>
              <ul>
                <li v-for="getter in debugInfo.availableGetters" :key="getter">{{ getter }}</li>
              </ul>
            </div>
            <div class="debug-item">
              <strong>Store State (Auth):</strong>
              <pre>{{ JSON.stringify(debugInfo.storeState?.auth, null, 2) }}</pre>
            </div>
            <div class="debug-item">
              <strong>Store State (Management):</strong>
              <pre>{{ JSON.stringify(debugInfo.storeState?.management, null, 2) }}</pre>
            </div>
          </div>
        </details>
      </div>
    </div>

    <!-- Settings content for admin users -->
    <div v-else>
      <header class="fixed-header">
        <div class="title">
          <h1 class="m-0" id="page-title">Settings</h1>
          <p class="page-description">Manage users, roles, and authentication settings</p>
        </div>
      </header>

    <div class="main-content">
      <div class="tabs-container">
        <div class="tab-nav">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            :class="['tab-button', { active: activeTab === tab.id }]"
            @click="activeTab = tab.id"
          >
            {{ tab.label }}
          </button>
        </div>

        <div class="tab-content">
          <!-- Users Tab -->
          <div v-if="activeTab === 'users'" class="tab-pane">
            <UsersTable
              :users="users"
              :loading="loadingUsers"
              :error="usersError || undefined"
              :can-manage-users="hasAdminPrivileges"
              @view-user="handleViewUser"
              @edit-user="handleEditUser"
              @add-user="handleAddUser"
              @retry="loadUsers"
            />
          </div>

          <!-- Roles Tab -->
          <div v-if="activeTab === 'roles'" class="tab-pane">
            <RolesTable
              :roles="roles"
              :loading="loadingRoles"
              :error="rolesError || undefined"
              :can-manage-roles="hasAdminPrivileges"
              @view-role="handleViewRole"
              @edit-role="handleEditRole"
              @add-role="handleAddRole"
              @retry="loadRoles"
            />
          </div>
        </div>
      </div>
    </div>

      <!-- User Details Modal -->
      <UserDetailsModal
        v-if="showUserModal"
        :user="selectedUser"
        :show="showUserModal"
        :can-edit-user="hasAdminPrivileges"
        @close="showUserModal = false"
        @save="handleSaveUser"
      />

      <!-- Role Details Modal -->
      <RoleDetailsModal
        v-if="showRoleModal"
        :role="selectedRole"
        :show="showRoleModal"
        :can-edit-role="hasAdminPrivileges"
        @close="showRoleModal = false"
        @save="handleSaveRole"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue';
import { useStore } from 'vuex';
import { useAuth } from '../composables/useAuth';
import type { RancherUser, RancherRole } from '../types/auth-types';
import UsersTable from '../components/settings/UsersTable.vue';
import RolesTable from '../components/settings/RolesTable.vue';
import UserDetailsModal from '../components/settings/UserDetailsModal.vue';
import RoleDetailsModal from '../components/settings/RoleDetailsModal.vue';

export default defineComponent({
  name: 'Settings',
  components: {
    UsersTable,
    RolesTable,
    UserDetailsModal,
    RoleDetailsModal
  },
  setup() {
    const store = useStore();
    const activeTab = ref('users');

    const tabs = [
      { id: 'users', label: 'Users' },
      { id: 'roles', label: 'Roles' }
    ];

    // Modal states
    const showUserModal = ref(false);
    const showRoleModal = ref(false);
    const selectedUser = ref<RancherUser | null>(null);
    const selectedRole = ref<RancherRole | null>(null);

    // Auth composable
    const {
      users,
      roles,
      loadingUsers,
      loadingRoles,
      usersError,
      rolesError,
      currentUser,
      hasAdminPrivileges,
      isAuthenticated,
      loadUsers,
      loadRoles,
      getUserDetails,
      getRoleDetails,
      updateUser,
      updateRole,
      loadClusterAccess,
      canAccessCluster,
      canManageCluster,
      debugInfo
    } = useAuth();

    // Load data on mount
    onMounted(async () => {
      if (hasAdminPrivileges.value) {
        await Promise.all([
          loadUsers(),
          loadRoles(),
          loadClusterAccess()
        ]);
      }
    });

    // Event handlers
    const handleViewUser = async (userId: string) => {
      try {
        const user = await getUserDetails(userId);
        selectedUser.value = user;
        showUserModal.value = true;
      } catch (error) {
        console.error('Failed to load user details:', error);
      }
    };

    const handleEditUser = (userId: string) => {
      // For now, same as view - edit functionality can be added later
      handleViewUser(userId);
    };

    const handleViewRole = async (roleId: string) => {
      try {
        const role = await getRoleDetails(roleId);
        selectedRole.value = role;
        showRoleModal.value = true;
      } catch (error) {
        console.error('Failed to load role details:', error);
      }
    };

    const handleEditRole = (roleId: string) => {
      // For now, same as view - edit functionality can be added later
      handleViewRole(roleId);
    };

    const handleSaveUser = async (userData: any) => {
      try {
        await updateUser(userData.id, userData);
        showUserModal.value = false;
        // Reload users list
        await loadUsers();
      } catch (error) {
        console.error('Failed to save user:', error);
      }
    };

    const handleSaveRole = async (roleData: any) => {
      try {
        await updateRole(roleData.id, roleData);
        showRoleModal.value = false;
        // Reload roles list
        await loadRoles();
      } catch (error) {
        console.error('Failed to save role:', error);
      }
    };

    const handleAddUser = () => {
      // For now, just show an alert - full user creation would need additional UI
      alert('User creation functionality would be implemented here');
    };

    const handleAddRole = () => {
      // For now, just show an alert - full role creation would need additional UI
      alert('Role creation functionality would be implemented here');
    };

    return {
      activeTab,
      tabs,
      showUserModal,
      showRoleModal,
      selectedUser,
      selectedRole,
      users,
      roles,
      loadingUsers,
      loadingRoles,
      usersError,
      rolesError,
      currentUser,
      hasAdminPrivileges,
      isAuthenticated,
      debugInfo,
      handleViewUser,
      handleEditUser,
      handleViewRole,
      handleEditRole,
      handleSaveUser,
      handleSaveRole,
      handleAddUser,
      handleAddRole,
      loadUsers,
      loadRoles
    };
  }
});
</script>

<style scoped>
.settings-page {
  padding: 20px;
}

.fixed-header {
  margin-bottom: 20px;
}

.page-description {
  color: var(--text-muted);
  margin: 5px 0 0 0;
  font-size: 14px;
}

.main-content {
  margin-top: 20px;
}

.tabs-container {
  background: var(--card-bg);
  border-radius: 8px;
  box-shadow: var(--card-shadow);
}

.tab-nav {
  display: flex;
  border-bottom: 1px solid var(--border);
}

.tab-button {
  padding: 12px 24px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-muted);
  border-bottom: 2px solid transparent;
  transition: all 0.2s ease;
}

.tab-button:hover {
  color: var(--text);
  background: var(--hover-bg);
}

.tab-button.active {
  color: var(--primary);
  border-bottom-color: var(--primary);
}

.tab-content {
  padding: 20px;
}

.tab-pane {
  min-height: 400px;
}

.access-denied {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  padding: 40px 20px;
}

.access-denied-content {
  text-align: center;
  max-width: 400px;
}

.access-denied-content h2 {
  color: var(--error);
  margin-bottom: 16px;
}

.access-denied-content p {
  color: var(--text-muted);
  margin-bottom: 8px;
  line-height: 1.5;
}

.debug-section {
  margin-top: 20px;
  border: 1px solid var(--border);
  border-radius: 4px;
}

.debug-section summary {
  padding: 10px;
  cursor: pointer;
  background: var(--hover-bg);
  border-radius: 4px;
  font-weight: 500;
}

.debug-content {
  padding: 15px;
  background: var(--card-bg);
  border-radius: 0 0 4px 4px;
}

.debug-item {
  margin-bottom: 15px;
}

.debug-item:last-child {
  margin-bottom: 0;
}

.debug-item strong {
  color: var(--text);
  display: block;
  margin-bottom: 5px;
}

.debug-item pre {
  background: var(--input-bg);
  padding: 10px;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 12px;
  max-height: 200px;
  overflow-y: auto;
}

.debug-item ul {
  background: var(--input-bg);
  padding: 10px;
  border-radius: 4px;
  margin: 0;
}

.debug-item li {
  font-family: monospace;
  font-size: 12px;
  color: var(--text-muted);
}
</style>