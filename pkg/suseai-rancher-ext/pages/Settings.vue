<template>
  <div class="settings-page">
    <div class="fixed-header">
      <h1>SUSE AI Proxy Settings</h1>
      <p class="page-description">Manage users and groups for the SUSE AI Universal Proxy</p>
    </div>

    <!-- Service Not Enabled -->
    <div v-if="!serviceEnabled" class="blank-page">
      <div class="empty-state">
        <h3>SUSE AI Universal Proxy Not Configured</h3>
        <p>Please configure the SUSE AI Universal Proxy service before managing users and groups.</p>
      </div>
    </div>

    <!-- Access Denied -->
    <div v-else-if="!hasAccess" class="access-denied">
      <div class="access-denied-content">
        <h2>Access Denied</h2>
        <p>You need administrator privileges to manage SUSE AI Proxy users and groups.</p>
        <p>Please contact your system administrator if you believe this is an error.</p>
      </div>
    </div>

    <!-- Authentication Required -->
    <div v-else-if="!isAuthenticated" class="access-denied">
      <div class="access-denied-content">
        <h2>Authentication Required</h2>
        <p>You need to authenticate with the SUSE AI Universal Proxy to manage users and groups.</p>
        <p>Please log in through the service selection wizard first.</p>
      </div>
    </div>

    <!-- Main Content -->
    <div v-else class="main-content">
      <div class="tabs-container">
        <div class="tab-nav">
          <button
            class="tab-button"
            :class="{ active: activeTab === 'users' }"
            @click="activeTab = 'users'"
          >
            Users
          </button>
          <button
            class="tab-button"
            :class="{ active: activeTab === 'groups' }"
            @click="activeTab = 'groups'"
          >
            Groups
          </button>
        </div>

        <div class="tab-content">
          <!-- Users Tab -->
          <div v-if="activeTab === 'users'" class="tab-pane">
            <UsersTable
              :users="users"
              :loading="usersLoading"
              :error="usersError || undefined"
              :can-manage-users="canManageUsers"
              :is-external="true"
              @view-user="handleViewUser"
              @edit-user="handleEditUser"
              @add-user="handleAddUser"
              @delete-user="handleDeleteUser"
              @retry="loadUsers"
            />
          </div>

          <!-- Groups Tab -->
          <div v-if="activeTab === 'groups'" class="tab-pane">
            <GroupsTable
              :groups="groups"
              :all-users="users"
              :loading="groupsLoading"
              :error="groupsError || undefined"
              :can-manage-groups="canManageGroups"
              @view-group="handleViewGroup"
              @edit-group="handleEditGroup"
              @add-group="handleAddGroup"
              @manage-members="handleManageMembers"
              @delete-group="handleDeleteGroup"
              @retry="loadGroups"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- User Details Modal -->
    <UserDetailsModal
      v-if="userModal.show"
      :show="userModal.show"
      :user="userModal.user"
      :is-editing="userModal.isEditing"
      :can-edit-user="canManageUsers"
      :is-external="true"
      @close="closeUserModal"
      @save="handleSaveUser"
      @delete="handleDeleteUserModal"
    />

    <!-- Group Details Modal -->
    <GroupDetailsModal
      v-if="groupModal.show"
      :show="groupModal.show"
      :group="groupModal.group"
      :all-users="users"
      :is-editing="groupModal.isEditing"
      :can-edit-group="canManageGroups"
      @close="closeGroupModal"
      @save="handleSaveGroup"
      @delete="handleDeleteGroupModal"
      @add-member="handleAddMember"
      @remove-member="handleRemoveMember"
    />

    <!-- Debug Information (commented out due to type issues) -->
    <!-- <details class="debug-section">
      <summary>Debug Information</summary>
      <div class="debug-content">
        <div class="debug-item">
          <strong>Service Status:</strong>
          <pre>{{ JSON.stringify({ serviceEnabled, hasAccess, isAuthenticated }, null, 2) }}</pre>
        </div>
        <div class="debug-item">
          <strong>Authentication:</strong>
          <pre>{{ JSON.stringify({ authMode, currentUser }, null, 2) }}</pre>
        </div>
        <div class="debug-item">
          <strong>Users Count:</strong>
          <span>{{ users.length }}</span>
        </div>
        <div class="debug-item">
          <strong>Groups Count:</strong>
          <span>{{ groups.length }}</span>
        </div>
      </div>
    </details> -->
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, watch } from 'vue'
import { useStore } from 'vuex'
import { MANAGEMENT } from '@shell/config/types'
import { useExternalUsers } from '../composables/useExternalUsers'
import { useExternalGroups } from '../composables/useExternalGroups'
import { ProxyAuthService } from '../services/proxy-auth-service'
import type { AuthMode } from '../services/base-api'
import UsersTable from '../components/settings/UsersTable.vue'
import GroupsTable from '../components/settings/GroupsTable.vue'
import UserDetailsModal from '../components/settings/UserDetailsModal.vue'
import GroupDetailsModal from '../components/settings/GroupDetailsModal.vue'
import type { ExternalUser, ExternalGroup } from '../types/auth-types'

export default defineComponent({
  name: 'Settings',
  components: {
    UsersTable,
    GroupsTable,
    UserDetailsModal,
    GroupDetailsModal
  },
  setup() {
    const store = useStore()
    const activeTab = ref<'users' | 'groups'>('users')

    // Service and auth state
    const serviceEnabled = ref(false)
    const hasAccess = ref(false)
    const isAuthenticated = ref(false)
    const authMode = ref<AuthMode | undefined>(undefined)
    const currentUser = ref<any>(null)

    // Modal states
    const userModal = ref({
      show: false,
      user: null as ExternalUser | null,
      isEditing: false
    })

    const groupModal = ref({
      show: false,
      group: null as ExternalGroup | null,
      isEditing: false
    })

    // Auth service
    const serviceUrl = localStorage.getItem('suseai-service-url') || ''
    const authService = new ProxyAuthService({
      baseURL: serviceUrl,
      timeout: 10000,
      retries: 3
    })

    // Composables
    const {
      users,
      loading: usersLoading,
      error: usersError,
      loadUsers,
      createUser,
      updateUser,
      deleteUser: deleteUserComposable
    } = useExternalUsers()

    const {
      groups,
      loading: groupsLoading,
      error: groupsError,
      loadGroups,
      createGroup,
      updateGroup,
      deleteGroup: deleteGroupComposable,
      addUserToGroup,
      removeUserFromGroup
    } = useExternalGroups()

    // Computed properties
    const canManageUsers = computed(() => hasAccess.value && isAuthenticated.value)
    const canManageGroups = computed(() => hasAccess.value && isAuthenticated.value)

    // Check service and auth status
    const checkStatus = async () => {
      try {
        // Check service configuration first
        const serviceUrl = localStorage.getItem('suseai-service-url')
        serviceEnabled.value = !!serviceUrl

        // Check authentication mode
        if (serviceEnabled.value) {
          try {
            const mode = await authService.getAuthMode()
            authMode.value = mode

            // Check if user is Rancher admin OR authentication is disabled (dev mode)
            const user = store.getters['auth/user']
            const isRancherAdmin = user?.isAdmin || false
            const isAuthDisabled = mode?.mode === 'dev'

            hasAccess.value = isRancherAdmin || isAuthDisabled

            isAuthenticated.value = authService.isAuthenticated()

            // Auto-login for admin users (only if not in dev mode)
            if (hasAccess.value && !isAuthenticated.value && !isAuthDisabled) {
              await authService.login({
                user_id: 'admin',
                password: 'admin'
              })
              isAuthenticated.value = authService.isAuthenticated()
            }

            // In dev mode with disabled auth, consider authenticated
            if (isAuthDisabled) {
              isAuthenticated.value = true
            }
          } catch (err) {
            console.warn('Failed to check auth mode:', err)
            // Fallback: check if user is Rancher admin
            const user = store.getters['auth/user']
            hasAccess.value = user?.isAdmin || false
            isAuthenticated.value = false
          }
        } else {
          // No service configured - fallback to Rancher admin check
          const user = store.getters['auth/user']
          hasAccess.value = user?.isAdmin || false
        }

        // Load data if authenticated
        if (isAuthenticated.value) {
          await Promise.all([loadUsers(), loadGroups()])
        }
      } catch (err) {
        console.error('Failed to check status:', err)
      }
    }

    // User modal handlers
    const handleViewUser = (userId: string) => {
      const user = users.value.find(u => u.id === userId)
      if (user) {
        userModal.value = {
          show: true,
          user,
          isEditing: false
        }
      }
    }

    const handleEditUser = (userId: string) => {
      const user = users.value.find(u => u.id === userId)
      if (user) {
        userModal.value = {
          show: true,
          user,
          isEditing: true
        }
      }
    }

    const handleAddUser = () => {
      userModal.value = {
        show: true,
        user: null,
        isEditing: true
      }
    }

    const handleSaveUser = async (userData: any) => {
      try {
        console.log('handleSaveUser called with:', userData)

        let createdUser: any = null

        if (userModal.value.user) {
          // Update existing user
          const { groups, ...userUpdateData } = userData // Extract groups from update data

          // Update user data (without groups)
          createdUser = await updateUser(userModal.value.user.id, userUpdateData)

          // Handle group membership changes if groups were provided
          if (groups !== undefined) {
            const currentGroups = (userModal.value.user as any).groups || []
            const newGroups = groups || []

            console.log('Handling group membership changes:', { currentGroups, newGroups })

            // Groups to add
            const groupsToAdd = newGroups.filter((g: string) => !currentGroups.includes(g))
            // Groups to remove
            const groupsToRemove = currentGroups.filter((g: string) => !newGroups.includes(g))

            console.log('Groups to add:', groupsToAdd, 'Groups to remove:', groupsToRemove)

            // Add user to new groups
            for (const groupId of groupsToAdd) {
              try {
                await addUserToGroup(groupId, userModal.value.user.id)
                console.log(`Added user ${userModal.value.user.id} to group ${groupId}`)
              } catch (err) {
                console.error(`Failed to add user to group ${groupId}:`, err)
              }
            }

            // Remove user from old groups
            for (const groupId of groupsToRemove) {
              try {
                await removeUserFromGroup(groupId, userModal.value.user.id)
                console.log(`Removed user ${userModal.value.user.id} from group ${groupId}`)
              } catch (err) {
                console.error(`Failed to remove user from group ${groupId}:`, err)
              }
            }
          }
        } else {
          // Create new user
          const { groups, ...userCreateData } = userData // Extract groups from create data

          // Create user without groups first
          createdUser = await createUser(userCreateData)

          // Add user to groups if specified
          if (groups && groups.length > 0) {
            console.log('Adding new user to groups:', groups)
            for (const groupId of groups) {
              try {
                await addUserToGroup(groupId, createdUser.id)
                console.log(`Added new user ${createdUser.id} to group ${groupId}`)
              } catch (err) {
                console.error(`Failed to add new user to group ${groupId}:`, err)
              }
            }
          }
        }
        closeUserModal()
      } catch (err) {
        console.error('Failed to save user:', err)
        // Error handling is done in the modal
      }
    }

    const handleDeleteUser = async (userId: string) => {
      const success = await deleteUserComposable(userId)
      return success
    }

    const handleDeleteUserModal = async () => {
      if (userModal.value.user) {
        const success = await deleteUserComposable(userModal.value.user.id)
        if (success) {
          closeUserModal()
        }
      }
    }

    const closeUserModal = () => {
      userModal.value.show = false
      userModal.value.user = null
      userModal.value.isEditing = false
    }

    // Group modal handlers
    const handleViewGroup = (groupId: string) => {
      const group = groups.value.find(g => g.id === groupId)
      if (group) {
        groupModal.value = {
          show: true,
          group,
          isEditing: false
        }
      }
    }

    const handleEditGroup = (groupId: string) => {
      const group = groups.value.find(g => g.id === groupId)
      if (group) {
        groupModal.value = {
          show: true,
          group,
          isEditing: true
        }
      }
    }

    const handleAddGroup = () => {
      groupModal.value = {
        show: true,
        group: null,
        isEditing: true
      }
    }

    const handleSaveGroup = async (groupData: any) => {
      try {
        if (groupModal.value.group) {
          // Update existing group
          await updateGroup(groupModal.value.group.id, groupData)
        } else {
          // Create new group
          await createGroup(groupData)
        }
        closeGroupModal()
      } catch (err) {
        console.error('Failed to save group:', err)
        // Error handling is done in the modal
      }
    }

    const handleDeleteGroup = async (groupId: string) => {
      const success = await deleteGroupComposable(groupId)
      return success
    }

    const handleDeleteGroupModal = async () => {
      if (groupModal.value.group) {
        const success = await deleteGroupComposable(groupModal.value.group.id)
        if (success) {
          closeGroupModal()
        }
      }
    }

    const handleManageMembers = (group: ExternalGroup) => {
      // For now, just open edit mode - member management can be enhanced later
      handleEditGroup(group.id)
    }

    const handleAddMember = async (groupId: string, userId: string) => {
      await addUserToGroup(groupId, userId)
    }

    const handleRemoveMember = async (groupId: string, userId: string) => {
      await removeUserFromGroup(groupId, userId)
    }

    const closeGroupModal = () => {
      groupModal.value.show = false
      groupModal.value.group = null
      groupModal.value.isEditing = false
    }

    // Watch for auth changes
    watch(isAuthenticated, (newVal) => {
      if (newVal) {
        loadUsers()
        loadGroups()
      }
    })

    // Initialize
    onMounted(() => {
      checkStatus()
    })

    return {
      activeTab,
      serviceEnabled,
      hasAccess,
      isAuthenticated,
      authMode,
      currentUser,
      userModal,
      groupModal,
      users,
      usersLoading,
      usersError,
      groups,
      groupsLoading,
      groupsError,
      canManageUsers,
      canManageGroups,
      loadUsers,
      loadGroups,
      handleViewUser,
      handleEditUser,
      handleAddUser,
      handleSaveUser,
      handleDeleteUser,
      handleDeleteUserModal,
      closeUserModal,
      handleViewGroup,
      handleEditGroup,
      handleAddGroup,
      handleSaveGroup,
      handleDeleteGroup,
      handleDeleteGroupModal,
      handleManageMembers,
      handleAddMember,
      handleRemoveMember,
      closeGroupModal
    }
  }
})
</script>

<style scoped>
.settings-page {
  padding: 20px;
}

/* Service not enabled state */
.blank-page {
  text-align: center;
  padding: 50px;
  font-size: 18px;
  color: #666;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
}

.empty-state h3 {
  color: var(--body-text, #1a1a1a);
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 12px;
}

.empty-state p {
  color: var(--muted, #666);
  font-size: 16px;
  margin: 0;
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