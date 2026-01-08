<template>
  <div v-if="show" class="modal-overlay" @click="handleOverlayClick">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h2>{{ isEditing ? 'Edit Group' : 'Group Details' }}</h2>
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
            <label for="description">Description</label>
            <textarea
              id="description"
              v-model="formData.description"
              rows="3"
              class="form-input"
              placeholder="Optional description for this group"
            ></textarea>
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

    // Watch for group changes to reset form
    watch(() => props.group, (newGroup) => {
      if (newGroup) {
        formData.value = { ...newGroup };
        isEditing.value = false;
        selectedUserId.value = '';
      }
    }, { immediate: true });

    // Computed properties
    const isFormValid = computed(() => {
      return formData.value?.name?.trim();
    });

    const canEditName = computed(() => {
      // Allow editing name for new groups, but not for existing ones
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
      isFormValid,
      canEditName,
      groupMembers,
      availableUsers,
      startEditing,
      handleSave,
      handleOverlayClick,
      handleAddMember,
      formatDate
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
</style>