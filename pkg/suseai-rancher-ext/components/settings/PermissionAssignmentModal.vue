<template>
  <div v-if="show" class="modal-overlay" @click="handleOverlayClick">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h2>{{ assignment ? 'Edit Permission Assignment' : 'Assign Adapter Permissions' }}</h2>
        <button class="close-btn" @click="$emit('close')" aria-label="Close modal">
          ×
        </button>
      </div>

      <div class="modal-body">
        <form @submit.prevent="handleSave" class="permission-form">
          <div class="form-group">
            <label for="serverId">Adapter/Server ID *</label>
            <input
              id="serverId"
              v-model="formData.serverId"
              type="text"
              required
              placeholder="e.g., my-adapter, weather-api"
              class="form-input"
              :disabled="!!assignment"
            />
            <small class="form-help">The ID of the MCP adapter or server to grant permissions for</small>
          </div>

          <div class="form-group">
            <label for="permissions">Permission Level *</label>
            <select
              id="permissions"
              v-model="formData.permissions"
              required
              class="form-select"
            >
              <option value="read">Read - View adapter and use basic features</option>
              <option value="write">Write - Full access to use the adapter</option>
              <option value="admin">Admin - Manage adapter configuration</option>
            </select>
          </div>

          <div class="form-group">
            <label>Auto-spawn</label>
            <div class="checkbox-group">
              <input
                id="autoSpawn"
                v-model="formData.autoSpawn"
                type="checkbox"
                class="form-checkbox"
              />
              <label for="autoSpawn" class="checkbox-label">
                Automatically start adapter when accessed
              </label>
            </div>
          </div>

          <div class="form-section">
            <h3>Assign to Users</h3>
            <div class="assignment-group">
              <div class="available-list">
                <h4>Available Users</h4>
                <div class="user-list">
                  <div
                    v-for="user in availableUsers"
                    :key="user.id"
                    class="user-item"
                    @click="addUser(user.id)"
                  >
                    <span class="user-name">{{ user.name }}</span>
                    <span class="user-email">{{ user.email }}</span>
                    <span class="add-icon">+</span>
                  </div>
                </div>
              </div>
              <div class="assigned-list">
                <h4>Assigned Users ({{ formData.userIds.length }})</h4>
                <div class="user-list">
                  <div
                    v-for="userId in formData.userIds"
                    :key="userId"
                    class="user-item assigned"
                    @click="removeUser(userId)"
                  >
                    <span class="user-name">{{ getUserName(userId) }}</span>
                    <span class="user-email">{{ getUserEmail(userId) }}</span>
                    <span class="remove-icon">×</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="form-section">
            <h3>Assign to Groups</h3>
            <div class="assignment-group">
              <div class="available-list">
                <h4>Available Groups</h4>
                <div class="group-list">
                  <div
                    v-for="group in availableGroups"
                    :key="group.id"
                    class="group-item"
                    @click="addGroup(group.id)"
                  >
                    <span class="group-name">{{ group.name }}</span>
                    <span class="group-members">{{ group.members.length }} members</span>
                    <span class="add-icon">+</span>
                  </div>
                </div>
              </div>
              <div class="assigned-list">
                <h4>Assigned Groups ({{ formData.groupIds.length }})</h4>
                <div class="group-list">
                  <div
                    v-for="groupId in formData.groupIds"
                    :key="groupId"
                    class="group-item assigned"
                    @click="removeGroup(groupId)"
                  >
                    <span class="group-name">{{ getGroupName(groupId) }}</span>
                    <span class="group-members">{{ getGroupMemberCount(groupId) }} members</span>
                    <span class="remove-icon">×</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>

      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" @click="$emit('close')">
          Cancel
        </button>
        <button
          type="submit"
          class="btn btn-primary"
          @click="handleSave"
          :disabled="!isFormValid"
        >
          {{ assignment ? 'Update Assignment' : 'Create Assignment' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, watch } from 'vue';
import type { RouteAssignment, ExternalUser, ExternalGroup } from '../../types/auth-types';

export default defineComponent({
  name: 'PermissionAssignmentModal',
  props: {
    assignment: {
      type: Object as () => RouteAssignment | null,
      default: null
    },
    allUsers: {
      type: Array as () => readonly ExternalUser[],
      default: () => []
    },
    allGroups: {
      type: Array as () => readonly ExternalGroup[],
      default: () => []
    },
    show: {
      type: Boolean,
      default: false
    },
    canManagePermissions: {
      type: Boolean,
      default: false
    }
  },
  emits: ['close', 'save'],
  setup(props, { emit }) {
    const formData = ref<RouteAssignment>({
      id: '',
      serverId: '',
      userIds: [],
      groupIds: [],
      permissions: 'read',
      autoSpawn: true,
      createdAt: '',
      updatedAt: ''
    });

    // Watch for assignment changes to populate form
    watch(() => props.assignment, (newAssignment) => {
      if (newAssignment) {
        formData.value = { ...newAssignment };
      } else {
        // Reset form for new assignment
        formData.value = {
          id: '',
          serverId: '',
          userIds: [],
          groupIds: [],
          permissions: 'read',
          autoSpawn: true,
          createdAt: '',
          updatedAt: ''
        };
      }
    }, { immediate: true });

    // Computed properties
    const isFormValid = computed(() => {
      return formData.value.serverId.trim() &&
             (formData.value.userIds.length > 0 || formData.value.groupIds.length > 0);
    });

    const availableUsers = computed(() => {
      return props.allUsers.filter(user => !formData.value.userIds.includes(user.id));
    });

    const availableGroups = computed(() => {
      return props.allGroups.filter(group => !formData.value.groupIds.includes(group.id));
    });

    // Methods
    const addUser = (userId: string) => {
      if (!formData.value.userIds.includes(userId)) {
        formData.value.userIds.push(userId);
      }
    };

    const removeUser = (userId: string) => {
      formData.value.userIds = formData.value.userIds.filter(id => id !== userId);
    };

    const addGroup = (groupId: string) => {
      if (!formData.value.groupIds.includes(groupId)) {
        formData.value.groupIds.push(groupId);
      }
    };

    const removeGroup = (groupId: string) => {
      formData.value.groupIds = formData.value.groupIds.filter(id => id !== groupId);
    };

    const getUserName = (userId: string): string => {
      const user = props.allUsers.find(u => u.id === userId);
      return user?.name || userId;
    };

    const getUserEmail = (userId: string): string => {
      const user = props.allUsers.find(u => u.id === userId);
      return user?.email || '';
    };

    const getGroupName = (groupId: string): string => {
      const group = props.allGroups.find(g => g.id === groupId);
      return group?.name || groupId;
    };

    const getGroupMemberCount = (groupId: string): number => {
      const group = props.allGroups.find(g => g.id === groupId);
      return group?.members.length || 0;
    };

    const handleSave = () => {
      if (!isFormValid.value) return;

      emit('save', formData.value);
    };

    const handleOverlayClick = (event: Event) => {
      if (event.target === event.currentTarget) {
        emit('close');
      }
    };

    return {
      formData,
      isFormValid,
      availableUsers,
      availableGroups,
      addUser,
      removeUser,
      addGroup,
      removeGroup,
      getUserName,
      getUserEmail,
      getGroupName,
      getGroupMemberCount,
      handleSave,
      handleOverlayClick
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
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: var(--card-bg);
  border-radius: 8px;
  box-shadow: var(--card-shadow);
  max-width: 800px;
  width: 100%;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
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

.permission-form {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-section {
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 16px;
}

.form-section h3 {
  margin: 0 0 16px 0;
  color: var(--text);
  font-size: 16px;
  font-weight: 600;
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

.form-input:disabled {
  background: var(--disabled-bg);
  color: var(--text-muted);
  cursor: not-allowed;
}

.form-select {
  cursor: pointer;
}

.form-help {
  color: var(--text-muted);
  font-size: 12px;
  margin-top: 4px;
}

.checkbox-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.checkbox-label {
  cursor: pointer;
  font-weight: normal;
  margin: 0;
}

.form-checkbox {
  width: 16px;
  height: 16px;
}

.assignment-group {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.available-list,
.assigned-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.available-list h4,
.assigned-list h4 {
  margin: 0;
  color: var(--text);
  font-size: 14px;
  font-weight: 600;
}

.user-list,
.group-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 8px;
}

.user-item,
.group-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
  border: 1px solid transparent;
}

.user-item:hover,
.group-item:hover {
  background: var(--hover-bg);
  border-color: var(--border);
}

.user-item.assigned,
.group-item.assigned {
  background: var(--primary-bg);
  border-color: var(--primary);
}

.user-name,
.group-name {
  font-weight: 500;
  color: var(--text);
  flex: 1;
}

.user-email {
  color: var(--text-muted);
  font-size: 12px;
  flex: 1;
}

.group-members {
  color: var(--text-muted);
  font-size: 12px;
}

.add-icon,
.remove-icon {
  font-size: 16px;
  font-weight: bold;
  color: var(--primary);
  min-width: 16px;
  text-align: center;
}

.remove-icon {
  color: var(--error);
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
</style>