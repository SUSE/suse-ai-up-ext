<template>
  <div class="settings-page">
    <ExperimentalBanner />
    <div class="fixed-header">
      <h1>SUSE AI Proxy Settings</h1>
      <p class="page-description">Configure the SUSE AI Universal Proxy</p>
    </div>

     <div class="tabs-container">
       <div class="tab-nav">
         <button 
           class="tab-button" 
           :class="{ active: activeTab === 'proxy' }"
           @click="activeTab = 'proxy'"
         >
           Universal Proxy
         </button>
         <button 
           v-if="wizardCompleted"
           class="tab-button" 
           :class="{ active: activeTab === 'users' }"
           @click="activeTab = 'users'"
         >
           Users
         </button>
         <button 
           v-if="wizardCompleted"
           class="tab-button" 
           :class="{ active: activeTab === 'groups' }"
           @click="activeTab = 'groups'"
         >
           Groups
         </button>
       </div>

       <div class="tab-content">
         <div v-if="activeTab === 'proxy'" class="tab-pane">
           <UniversalProxyTab />
         </div>
         
         <div v-if="activeTab === 'users' && wizardCompleted" class="tab-pane">
           <UsersTable 
             :users="users"
             :loading="usersLoading"
             :error="usersError || undefined"
             :is-external="true"
             :can-manage-users="true"
             @view-user="handleViewUser"
             @edit-user="handleEditUser"
             @add-user="handleAddUser"
             @delete-user="handleDeleteUser"
             @retry="handleRetryUsers"
           />
         </div>

         <div v-if="activeTab === 'groups' && wizardCompleted" class="tab-pane">
           <GroupsTable 
             :groups="groups"
             :loading="groupsLoading"
             :error="groupsError || undefined"
             :can-manage-groups="true"
             @view-group="handleViewGroup"
             @edit-group="handleEditGroup"
             @add-group="handleAddGroup"
             @manage-members="handleManageMembers"
             @delete-group="handleDeleteGroup"
             @retry="handleRetryGroups"
           />
         </div>
       </div>
     </div>

     <!-- Modals -->
     <UserDetailsModal
       :show="showUserModal"
       :user="selectedUser"
       :can-edit-user="true"
       :is-external="true"
       @close="showUserModal = false"
       @save="handleSaveUser"
     />

     <GroupDetailsModal
       :show="showGroupModal"
       :group="selectedGroup"
       :all-users="users"
       :can-edit-group="true"
       @close="showGroupModal = false"
       @save="handleSaveGroup"
       @add-member="handleAddMemberToGroup"
       @remove-member="handleRemoveMemberFromGroup"
     />
   </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, watch } from 'vue'
import { useStore } from 'vuex'
import { ExperimentalBanner } from '../components/MCPGateway'
import UniversalProxyTab from '../components/settings/UniversalProxyTab.vue'
import UsersTable from '../components/settings/UsersTable.vue'
import GroupsTable from '../components/settings/GroupsTable.vue'
import UserDetailsModal from '../components/settings/UserDetailsModal.vue'
import GroupDetailsModal from '../components/settings/GroupDetailsModal.vue'
import { useExternalUsers } from '../composables/useExternalUsers'
import { useExternalGroups } from '../composables/useExternalGroups'
import { updateApiBaseUrls } from '../config/api-config'

export default defineComponent({
  name: 'Settings',
  components: {
    ExperimentalBanner,
    UniversalProxyTab,
    UsersTable,
    GroupsTable,
    UserDetailsModal,
    GroupDetailsModal
  },
  setup() {
    const store = useStore()
    const activeTab = ref('proxy')
    const wizardCompleted = computed(() => store.getters['suseai/wizardCompleted'])

    // Initialize API URLs from store to ensure correct proxy connection
    const serviceUrls = computed(() => store.state.suseai?.settings?.serviceUrls || [])
    
    // Watch for service URL changes (e.g. after wizard completion)
    watch(serviceUrls, (newUrls) => {
      if (newUrls && newUrls.length > 0) {
        console.log('Settings page detected Service URL update:', newUrls[0])
        updateApiBaseUrls(newUrls[0])
      }
    }, { immediate: true })

    // Modal State
    const showUserModal = ref(false)
    const selectedUser = ref<any>(null)
    const isUserEditing = ref(false)
    
    const showGroupModal = ref(false)
    const selectedGroup = ref<any>(null)
    const isGroupEditing = ref(false)

    // User management composables
    const { 
      users, 
      loading: usersLoading, 
      error: usersError, 
      loadUsers,
      createUser,
      updateUser,
      deleteUser,
      getUser
    } = useExternalUsers()

    const { 
      groups, 
      loading: groupsLoading, 
      error: groupsError, 
      loadGroups,
      createGroup,
      updateGroup,
      deleteGroup,
      getGroup,
      addUserToGroup,
      removeUserFromGroup
    } = useExternalGroups()

    // Handle tab switching and data loading
    watch(activeTab, async (newTab) => {
      if (newTab === 'users' && users.value.length === 0) {
        await loadUsers()
      } else if (newTab === 'groups' && groups.value.length === 0) {
        await loadGroups()
      }
    })

    const handleRetryUsers = () => loadUsers()
    const handleRetryGroups = () => loadGroups()

    // User Actions
    const handleViewUser = async (arg: string | any) => {
      const id = typeof arg === 'string' ? arg : arg?.id
      console.log('View user:', id)
      if (!id) return

      try {
        const user = await getUser(id)
        if (user) {
          selectedUser.value = user
          isUserEditing.value = false
          showUserModal.value = true
        }
      } catch (e) {
        console.error('Failed to get user details:', e)
      }
    }

    const handleEditUser = async (arg: string | any) => {
      const id = typeof arg === 'string' ? arg : arg?.id
      console.log('Edit user:', id)
      if (!id) return

      try {
        const user = await getUser(id)
        if (user) {
          selectedUser.value = user
          isUserEditing.value = true
          showUserModal.value = true
        }
      } catch (e) {
        console.error('Failed to get user details:', e)
      }
    }

    const handleAddUser = () => {
      console.log('Add user clicked')
      selectedUser.value = null
      isUserEditing.value = true
      showUserModal.value = true
    }

    const handleSaveUser = async (userData: any) => {
      console.log('Saving user:', userData)
      try {
        if (selectedUser.value?.id) {
          // Update
          // Handle password change if present (not supported by API yet but prepared)
          if (userData.password) {
             console.log('Password change requested for user:', selectedUser.value.id)
             // TODO: Call API to change password when supported
          }
          
          await updateUser(selectedUser.value.id, userData)
        } else {
          // Create
          await createUser(userData)
        }
        
        // Refresh list and close modal
        await loadUsers()
        showUserModal.value = false
      } catch (e) {
        console.error('Failed to save user:', e)
        // Ideally show error notification
      }
    }

    const handleDeleteUser = async (arg: string | any) => {
      const id = typeof arg === 'string' ? arg : arg?.id
      if (id && confirm('Are you sure you want to delete this user?')) {
        await deleteUser(id)
      }
    }

    // Group Actions
    const handleViewGroup = async (arg: string | any) => {
      const id = typeof arg === 'string' ? arg : arg?.id
      console.log('View group:', id)
      if (!id) return

      try {
        // Load users to ensure member resolution works in the modal
        // We do this in parallel with fetching group details
        const [group] = await Promise.all([
          getGroup(id),
          loadUsers() // Refresh users list to get latest member info
        ])

        if (group) {
          selectedGroup.value = group
          isGroupEditing.value = false
          showGroupModal.value = true
        }
      } catch (e) {
        console.error('Failed to get group details:', e)
      }
    }

    const handleEditGroup = async (arg: string | any) => {
      const id = typeof arg === 'string' ? arg : arg?.id
      console.log('Edit group:', id)
      
      // If we have the full object, use it initially to show modal faster
      if (typeof arg !== 'string' && arg?.id) {
        selectedGroup.value = arg
      }
      
      try {
        // Refresh users list for member management
        loadUsers()

        // Then fetch fresh details if we have an ID
        if (id) {
          const fullGroup = await getGroup(id)
          if (fullGroup) {
            selectedGroup.value = fullGroup
          }
        }
        
        if (selectedGroup.value) {
          isGroupEditing.value = true
          showGroupModal.value = true
        }
      } catch (e) {
        console.error('Failed to prepare group edit:', e)
      }
    }

    const handleAddGroup = () => {
      console.log('Add group clicked')
      selectedGroup.value = null
      isGroupEditing.value = true
      showGroupModal.value = true
    }

    const handleSaveGroup = async (groupData: any) => {
      console.log('Saving group:', groupData)
      try {
        if (selectedGroup.value?.id) {
          // Update
          await updateGroup(selectedGroup.value.id, groupData)
        } else {
          // Create
          await createGroup(groupData)
        }
        
        // Refresh list and close modal
        await loadGroups()
        showGroupModal.value = false
      } catch (e) {
        console.error('Failed to save group:', e)
      }
    }

    const handleManageMembers = (group: any) => {
      console.log('Manage members:', group)
      handleEditGroup(group) // Members managed in edit modal
    }

    const handleAddMemberToGroup = async (groupId: string, userId: string) => {
      try {
        await addUserToGroup(groupId, userId)
        // Refresh group data
        const updatedGroup = await getGroup(groupId)
        if (updatedGroup) {
          selectedGroup.value = updatedGroup
        }
      } catch (e) {
        console.error('Failed to add member:', e)
      }
    }

    const handleRemoveMemberFromGroup = async (groupId: string, userId: string) => {
      if (confirm('Are you sure you want to remove this user from the group?')) {
        try {
          await removeUserFromGroup(groupId, userId)
          // Refresh group data
          const updatedGroup = await getGroup(groupId)
          if (updatedGroup) {
            selectedGroup.value = updatedGroup
          }
        } catch (e) {
          console.error('Failed to remove member:', e)
        }
      }
    }

    const handleDeleteGroup = async (id: string) => {
      if (confirm('Are you sure you want to delete this group?')) {
        await deleteGroup(id)
      }
    }

    return {
      activeTab,
      wizardCompleted,
      users,
      usersLoading,
      usersError,
      groups,
      groupsLoading,
      groupsError,
      
      // Modal State
      showUserModal,
      selectedUser,
      isUserEditing,
      showGroupModal,
      selectedGroup,
      isGroupEditing,

      handleRetryUsers,
      handleRetryGroups,
      handleViewUser,
      handleEditUser,
      handleAddUser,
      handleSaveUser,
      handleDeleteUser,
      handleViewGroup,
      handleEditGroup,
      handleAddGroup,
      handleSaveGroup,
      handleManageMembers,
      handleAddMemberToGroup,
      handleRemoveMemberFromGroup,
      handleDeleteGroup
    }
  }
})
</script>

<style scoped>
.settings-page {
  padding: 20px;
}

.fixed-header {
  position: sticky;
  top: 0;
  background: var(--body-bg, #fff);
  z-index: 10;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border, #dee2e6);
  margin-bottom: 24px;
}

.fixed-header h1 {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 600;
  color: var(--text, #333);
}

.page-description {
  margin: 0;
  color: var(--text-muted, #666);
  font-size: 14px;
}

.tabs-container {
  background: var(--card-bg, #fff);
  border: 1px solid var(--border, #dee2e6);
  border-radius: 8px;
  overflow: hidden;
}

.tab-nav {
  display: flex;
  background: var(--nav-bg, #f8f9fa);
  border-bottom: 1px solid var(--border, #dee2e6);
}

.tab-button {
  padding: 12px 20px;
  border: none;
  background: transparent;
  color: var(--text-muted, #6c757d);
  font-size: 14px;
  font-weight: 500;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab-button:hover {
  color: var(--primary, #007bff);
  background: var(--hover-bg, #f1f3f5);
}

.tab-button.active {
  color: var(--primary, #007bff);
  border-bottom: 2px solid var(--primary, #007bff);
  background: transparent;
}

.tab-content {
  padding: 24px;
}

.tab-pane {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 768px) {
  .settings-page {
    padding: 16px;
  }

  .fixed-header h1 {
    font-size: 20px;
  }
}
</style>