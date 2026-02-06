<template>
  <div v-if="show" class="modal-overlay" @click="handleOverlayClick">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h2>{{ modalTitle }}</h2>
        <button class="close-btn" @click="$emit('close')" aria-label="Close modal">
          ×
        </button>
      </div>

      <div class="modal-body">
        <form v-if="isEditing && formData" @submit.prevent="handleSave" class="group-form">
          <div class="form-group">
            <label for="name">Group Name *</label>
            <input
              id="name"
              v-model="formData.name"
              type="text"
              required
              :disabled="!canEditName"
              class="form-input"
            />
          </div>

          <div class="form-group">
            <label for="id">Group ID *</label>
            <input
              id="id"
              v-model="formData.id"
              type="text"
              required
              :disabled="!canEditName"
              class="form-input"
              placeholder="Unique identifier (e.g. weather-team)"
            />
          </div>

          <div class="form-group">
            <label for="description">Description</label>
            <textarea
              id="description"
              v-model="formData.description"
              rows="3"
              class="form-input"
              placeholder="Optional description for this group"
            ></textarea>
          </div>

          <div class="form-group">
            <label>Permissions</label>
            <div class="permissions-container">
              <div v-for="(perms, category) in permissionCategories" :key="category" class="permission-category">
                <h4>{{ category }}</h4>
                <div class="checkbox-group">
                  <div v-for="perm in perms" :key="perm" class="checkbox-item">
                    <input
                      type="checkbox"
                      :id="'perm-' + perm"
                      :value="perm"
                      v-model="formData.permissions"
                      class="form-checkbox"
                    />
                    <label :for="'perm-' + perm">{{ perm }}</label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>

        <div v-else class="group-details">
          <div class="detail-section">
            <h3>Basic Information</h3>
            <div class="detail-grid">
              <div class="detail-item">
                <label>Name:</label>
                <span>{{ group?.name }}</span>
              </div>
              <div class="detail-item">
                <label>ID:</label>
                <span>{{ group?.id }}</span>
              </div>
              <div class="detail-item">
                <label>Created:</label>
                <span>{{ formatDate(group?.createdAt) }}</span>
              </div>
            </div>
          </div>

          <div v-if="group?.description" class="detail-section">
            <h3>Description</h3>
            <p>{{ group.description }}</p>
          </div>

          <div class="detail-section">
            <h3>Members</h3>
            <div class="members-section">
              <div v-if="groupMembers.length > 0" class="members-list">
                <div
                  v-for="member in groupMembers"
                  :key="member.id"
                  class="member-item"
                >
                  <span class="member-name">{{ member.name }}</span>
                  <span class="member-email">{{ member.email }}</span>
                  <button
                    v-if="canEditGroup && group"
                    class="btn btn-sm btn-outline remove-btn"
                    @click="$emit('remove-member', group.id, member.id)"
                    title="Remove member"
                  >
                    ×
                  </button>
                </div>
              </div>
              <div v-else class="no-members">
                <p>No members in this group</p>
              </div>

              <div v-if="canEditGroup" class="add-member-section">
                <select v-model="selectedUserId" class="form-select">
                  <option value="">Select user to add...</option>
                  <option
                    v-for="user in availableUsers"
                    :key="user.id"
                    :value="user.id"
                  >
                    {{ user.name }} ({{ user.email }})
                  </option>
                </select>
                <button
                  class="btn btn-sm btn-primary"
                  :disabled="!selectedUserId"
                  @click="handleAddMember"
                >
                  Add Member
                </button>
              </div>
            </div>
          </div>

          <div class="detail-section">
            <h3>Assigned Adapters</h3>
            <div v-if="loadingAdapters" class="loading-state">
              Loading adapters...
            </div>
            <div v-else-if="assignedAdapters.length > 0" class="adapters-list">
              <table class="adapters-table">
                <thead>
                  <tr>
                    <th>Adapter Name</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="adapter in assignedAdapters" :key="adapter.id">
                    <td>{{ adapter.name }}</td>
                    <td>
                      <span class="status-badge" :class="adapter.status === 'active' || adapter.status === 'ready' ? 'status-active' : 'status-inactive'">
                        {{ adapter.status || 'Unknown' }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p v-else class="no-data">No adapters assigned to this group</p>
          </div>

          <div class="detail-section">
            <h3>Permissions</h3>
            <div v-if="group?.permissions?.length" class="permissions-list">
              <div
                v-for="permission in group.permissions"
                :key="permission"
                class="permission-item"
              >
                {{ permission }}
              </div>
            </div>
            <p v-else class="no-data">No permissions assigned to this group</p>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" @click="$emit('close')">
          {{ isEditing ? 'Cancel' : 'Close' }}
        </button>
        <button
          v-if="isEditing"
          type="submit"
          class="btn btn-primary"
          @click="handleSave"
          :disabled="!isFormValid"
        >
          Save Changes
        </button>
        <button
          v-else-if="canEditGroup"
          type="button"
          class="btn btn-outline"
          @click="startEditing"
        >
          Edit Group
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, watch } from 'vue';
import type { ExternalGroup, ExternalUser } from '../../types/auth-types';
import { adapterAPI, type Adapter } from '../../services/adapter-api';
import { logger } from '../../utils/logger';

export default defineComponent({
  name: 'GroupDetailsModal',
  props: {
    group: {
      type: Object as () => ExternalGroup | null,
      default: null
    },
    allUsers: {
      type: Array as () => readonly ExternalUser[],
      default: () => []
    },
    show: {
      type: Boolean,
      default: false
    },
    canEditGroup: {
      type: Boolean,
      default: false
    }
  },
  emits: ['close', 'save', 'add-member', 'remove-member'],
  setup(props, { emit }) {
    const isEditing = ref(false);
    const formData = ref<ExternalGroup | null>(null);
    const selectedUserId = ref('');
    const assignedAdapters = ref<Adapter[]>([]);
    const loadingAdapters = ref(false);

    const permissionCategories = {
      Users: ['user:create', 'user:read', 'user:update', 'user:delete'],
      Groups: ['group:create', 'group:read', 'group:update', 'group:delete'],
      Adapters: ['adapter:create', 'adapter:read', 'adapter:update', 'adapter:delete', 'adapter:assign'],
      Server: ['server:create', 'server:read', 'server:update', 'server:delete'],
      Discovery: ['discovery:create', 'discovery:read', 'discovery:update', 'discovery:delete'],
      Registry: ['registry:create', 'registry:read', 'registry:update', 'registry:delete']
    };

    // Ensure permissions array exists when editing
    watch(() => props.group, async (newGroup) => {
      if (newGroup) {
        // Editing existing group
        formData.value = { ...newGroup };
        if (!formData.value.permissions) {
          formData.value.permissions = [];
        }
        isEditing.value = false; // Start in view mode for existing groups
        selectedUserId.value = '';
        await fetchAssignedAdapters(newGroup.id);
      } else {
        // Adding new group
        formData.value = { 
          id: '', 
          name: '', 
          description: '', 
          members: [], 
          permissions: ["adapter:read", "adapter:assign"], // Default permissions
          createdAt: '', 
          updatedAt: '' 
        };
        isEditing.value = true; // Start in edit mode for new groups
        selectedUserId.value = '';
        assignedAdapters.value = []; // Clear adapters for new groups
      }
    }, { immediate: true });

    const fetchAssignedAdapters = async (groupId: string) => {
      loadingAdapters.value = true;
      try {
        // Fetch all adapters
        const allAdapters = await adapterAPI.list();
        
        // Check assignments for each adapter
        // Note: This is an N+1 operation. Ideally the backend would provide a "get adapters for group" endpoint.
        // We use Promise.all to fetch concurrently.
        const results = await Promise.all(allAdapters.map(async (adapter) => {
          try {
            // Use adapter.name as ID if that's the convention, or adapter.id
            // Based on AssignGroupModal usage, we use adapter.name
            const groups = await adapterAPI.getAdapterGroups(adapter.name);
            
            const isAssigned = groups.some((g: any) => 
              (g.id && g.id === groupId) || 
              (g.groupId && g.groupId === groupId) ||
              (typeof g === 'string' && g === groupId)
            );
            
            return isAssigned ? adapter : null;
          } catch (err) {
            logger.error(`Failed to fetch groups for adapter ${adapter.name}`, err);
            return null;
          }
        }));

        assignedAdapters.value = results.filter((a): a is Adapter => a !== null);
      } catch (err) {
        logger.error('Failed to fetch assigned adapters', err);
        assignedAdapters.value = [];
      } finally {
        loadingAdapters.value = false;
      }
    };

    // Computed properties
    const isFormValid = computed(() => {
      // Both Name and ID are required
      return formData.value?.name?.trim() && formData.value?.id?.trim();
    });

    const canEditName = computed(() => {
      // Allow editing name/id for new groups, but not for existing ones
      return !props.group?.id;
    });

    const groupMembers = computed(() => {
      if (!props.group?.members || props.group.members.length === 0) return [];
      return props.allUsers.filter(user => props.group!.members.includes(user.id));
    });

    const availableUsers = computed(() => {
      if (!props.group?.members) return props.allUsers;
      return props.allUsers.filter(user => !props.group!.members.includes(user.id));
    });

    // Dynamic Modal Title
    const modalTitle = computed(() => {
      if (!props.group?.id) {
        return 'Add Group';
      }
      return isEditing.value ? 'Edit Group' : 'Group Details';
    });

    // Methods
    const startEditing = () => {
      isEditing.value = true;
    };

    const handleSave = () => {
      if (!isFormValid.value || !formData.value) return;

      emit('save', formData.value);
    };

    const handleOverlayClick = (event: Event) => {
      if (event.target === event.currentTarget) {
        emit('close');
      }
    };

    const handleAddMember = () => {
      if (!selectedUserId.value || !props.group) return;

      emit('add-member', props.group.id, selectedUserId.value);
      selectedUserId.value = '';
    };

    const formatDate = (dateString?: string): string => {
      if (!dateString) return 'Unknown';

      const date = new Date(dateString);
      return date.toLocaleString();
    };

    return {
      isEditing,
      formData,
      selectedUserId,
      assignedAdapters,
      loadingAdapters,
      isFormValid,
      canEditName,
      groupMembers,
      availableUsers,
      modalTitle,
      startEditing,
      handleSave,
      handleOverlayClick,
      handleAddMember,
      formatDate,
      permissionCategories
    };
  }
});
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(2px);
}

.modal-content {
  background: var(--body-bg, white);
  border-radius: var(--border-radius, 8px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  max-width: 90vw;
  width: 800px;
  max-height: 80vh;
  overflow-y: auto;
  border: 1px solid var(--border, #e0e0e0);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid var(--border);
}

.modal-header h2 {
  margin: 0;
  color: var(--text);
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--text-muted);
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color 0.2s;
}

.close-btn:hover {
  background: var(--hover-bg);
  color: var(--text);
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.modal-footer {
  padding: 20px;
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.group-details {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.detail-section h3 {
  margin: 0 0 16px 0;
  color: var(--text);
  font-size: 16px;
  font-weight: 600;
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-item label {
  font-weight: 500;
  color: var(--text-muted);
  font-size: 14px;
}

.detail-item span {
  color: var(--text);
}

.members-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.members-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.member-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--input-bg);
  border-radius: 6px;
  border: 1px solid var(--border);
}

.member-name {
  font-weight: 500;
  color: var(--text);
  flex: 1;
}

.member-email {
  color: var(--text-muted);
  font-size: 14px;
  flex: 1;
}

.remove-btn {
  color: var(--error);
  border-color: var(--error);
  min-width: 24px;
  height: 24px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.remove-btn:hover {
  background: var(--error-bg);
}

.no-members {
  color: var(--text-muted);
  font-style: italic;
  text-align: center;
  padding: 20px;
}

.add-member-section {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 16px;
  background: var(--hover-bg);
  border-radius: 6px;
}

.permissions-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.permission-item {
  padding: 8px 12px;
  background: var(--input-bg);
  border-radius: 4px;
  font-family: monospace;
  font-size: 14px;
  color: var(--text);
}

.loading-state {
  color: var(--text-muted);
  font-style: italic;
  padding: 10px 0;
}

.adapters-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 8px;
}

.adapters-table th,
.adapters-table td {
  padding: 8px 12px;
  text-align: left;
  border-bottom: 1px solid var(--border);
  font-size: 14px;
}

.adapters-table th {
  font-weight: 600;
  color: var(--text-muted);
  background-color: var(--hover-bg);
}

.status-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-active {
  background-color: #d1fae5;
  color: #065f46;
}

.status-inactive {
  background-color: #f3f4f6;
  color: #1f2937;
}

.no-data {
  color: var(--text-muted);
  font-style: italic;
  margin: 0;
}

.group-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-weight: 500;
  color: var(--text);
}

.form-input,
.form-select {
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--input-bg);
  color: var(--text);
  font-size: 14px;
}

.form-input:focus,
.form-select:focus {
  outline: none;
  border-color: var(--primary);
}

.form-input:disabled,
.form-select:disabled {
  background: var(--disabled-bg);
  color: var(--text-muted);
  cursor: not-allowed;
}

.form-select {
  cursor: pointer;
}

.btn {
  padding: 8px 16px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--button-bg);
  color: var(--button-text);
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.btn:hover:not(:disabled) {
  background: var(--button-hover-bg);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

.btn-secondary {
  background: var(--secondary);
  color: var(--secondary-text);
}

.btn-outline {
  background: transparent;
  border-color: var(--border);
}

.btn-outline:hover {
  background: var(--hover-bg);
}

.btn-sm {
  padding: 4px 8px;
  font-size: 12px;
}

.permissions-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.permission-category h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  text-transform: capitalize;
}

.permission-category .checkbox-group {
  border: none;
  background: transparent;
  padding: 0;
}

.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--input-bg);
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.form-checkbox {
  width: 16px;
  height: 16px;
  cursor: pointer;
}
</style>
