<template>
  <div v-if="show" class="modal-overlay" @click="handleOverlayClick">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h2>{{ isEditing ? 'Edit Role' : 'Role Details' }}</h2>
        <button class="close-btn" @click="$emit('close')" aria-label="Close modal">
          ×
        </button>
      </div>

      <div class="modal-body">
        <form v-if="isEditing && formData" @submit.prevent="handleSave" class="role-form">
          <div class="form-group">
            <label for="name">Role Name *</label>
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
            <label for="displayName">Display Name</label>
            <input
              id="displayName"
              v-model="formData.displayName"
              type="text"
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
              placeholder="Optional description for this role"
            ></textarea>
          </div>

          <div class="form-group">
            <label for="type">Role Type</label>
            <select
              id="type"
              v-model="formData.type"
              class="form-select"
              :disabled="!canEditType"
            >
              <option value="global">Global</option>
              <option value="cluster">Cluster</option>
              <option value="project">Project</option>
              <option value="namespaced">Namespaced</option>
            </select>
          </div>
        </form>

        <div v-else class="role-details">
          <div class="detail-section">
            <h3>Basic Information</h3>
            <div class="detail-grid">
              <div class="detail-item">
                <label>Name:</label>
                <span>{{ role?.name }}</span>
              </div>
              <div class="detail-item">
                <label>Display Name:</label>
                <span>{{ role?.displayName || role?.name }}</span>
              </div>
              <div class="detail-item">
                <label>Type:</label>
                <span class="type-badge" :class="`type-${role?.type}`">
                  {{ formatRoleType(role?.type) }}
                </span>
              </div>
              <div class="detail-item">
                <label>Created:</label>
                <span>{{ formatDate(role?.created) }}</span>
              </div>
            </div>
          </div>

          <div v-if="role?.description" class="detail-section">
            <h3>Description</h3>
            <p>{{ role.description }}</p>
          </div>

          <div class="detail-section">
            <h3>Permissions (Rules)</h3>
            <div v-if="role?.rules?.length" class="rules-list">
              <div
                v-for="(rule, index) in role.rules"
                :key="index"
                class="rule-item"
              >
                <div class="rule-header">
                  <strong>Rule {{ index + 1 }}</strong>
                </div>
                <div class="rule-details">
                  <div class="rule-row">
                    <span class="rule-label">Verbs:</span>
                    <span class="rule-value">{{ rule.verbs?.join(', ') || 'None' }}</span>
                  </div>
                  <div class="rule-row">
                    <span class="rule-label">API Groups:</span>
                    <span class="rule-value">{{ rule.apiGroups?.join(', ') || 'None' }}</span>
                  </div>
                  <div v-if="rule.resources?.length" class="rule-row">
                    <span class="rule-label">Resources:</span>
                    <span class="rule-value">{{ rule.resources.join(', ') }}</span>
                  </div>
                  <div v-if="rule.resourceNames?.length" class="rule-row">
                    <span class="rule-label">Resource Names:</span>
                    <span class="rule-value">{{ rule.resourceNames.join(', ') }}</span>
                  </div>
                  <div v-if="rule.nonResourceURLs?.length" class="rule-row">
                    <span class="rule-label">Non-Resource URLs:</span>
                    <span class="rule-value">{{ rule.nonResourceURLs.join(', ') }}</span>
                  </div>
                </div>
              </div>
            </div>
            <p v-else class="no-data">No rules defined for this role</p>
          </div>

          <div v-if="assignedUsers?.length" class="detail-section">
            <h3>Assigned Users</h3>
            <div class="assigned-users">
              <div
                v-for="user in assignedUsers.slice(0, 10)"
                :key="user.id"
                class="assigned-user"
              >
                {{ user.displayName || user.username }}
              </div>
              <div v-if="assignedUsers.length > 10" class="more-users">
                ... and {{ assignedUsers.length - 10 }} more users
              </div>
            </div>
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
          v-else-if="canEditRole"
          type="button"
          class="btn btn-outline"
          @click="startEditing"
        >
          Edit Role
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, watch } from 'vue';
import type { RancherRole, RancherUser } from '../../types/auth-types';

export default defineComponent({
  name: 'RoleDetailsModal',
  props: {
    role: {
      type: Object as () => RancherRole | null,
      default: null
    },
    show: {
      type: Boolean,
      default: false
    },
    canEditRole: {
      type: Boolean,
      default: false
    },
    assignedUsers: {
      type: Array as () => RancherUser[],
      default: () => []
    }
  },
  emits: ['close', 'save'],
  setup(props, { emit }) {
    const isEditing = ref(false);
    const formData = ref<RancherRole | null>(null);

    // Watch for role changes to reset form
    watch(() => props.role, (newRole) => {
      if (newRole) {
        formData.value = { ...newRole };
        isEditing.value = false;
      }
    }, { immediate: true });

    // Computed properties
    const isFormValid = computed(() => {
      return formData.value?.name?.trim();
    });

    const canEditName = computed(() => {
      // Allow editing name for new roles, but not for existing ones
      return !props.role?.id;
    });

    const canEditType = computed(() => {
      // Allow editing type for new roles, but not for existing ones
      return !props.role?.id;
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

    const formatDate = (dateString?: string): string => {
      if (!dateString) return 'Unknown';

      const date = new Date(dateString);
      return date.toLocaleString();
    };

    const formatRoleType = (type?: string): string => {
      if (!type) return 'Unknown';

      return type.charAt(0).toUpperCase() + type.slice(1);
    };

    return {
      isEditing,
      formData,
      isFormValid,
      canEditName,
      canEditType,
      startEditing,
      handleSave,
      handleOverlayClick,
      formatDate,
      formatRoleType
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

.role-details {
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

.type-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.type-global {
  background: var(--primary-bg);
  color: var(--primary);
}

.type-cluster {
  background: var(--warning-bg);
  color: var(--warning);
}

.type-project {
  background: var(--success-bg);
  color: var(--success);
}

.type-namespaced {
  background: var(--info-bg);
  color: var(--info);
}

.rules-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.rule-item {
  background: var(--input-bg);
  border-radius: 6px;
  padding: 16px;
  border: 1px solid var(--border);
}

.rule-header {
  margin-bottom: 12px;
  color: var(--text);
}

.rule-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rule-row {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.rule-label {
  font-weight: 500;
  color: var(--text-muted);
  font-size: 14px;
  min-width: 120px;
  flex-shrink: 0;
}

.rule-value {
  color: var(--text);
  font-family: monospace;
  font-size: 14px;
  word-break: break-word;
}

.assigned-users {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.assigned-user {
  background: var(--input-bg);
  padding: 8px 12px;
  border-radius: 4px;
  color: var(--text);
  font-size: 14px;
}

.more-users {
  color: var(--text-muted);
  font-style: italic;
  padding: 4px 12px;
}

.no-data {
  color: var(--text-muted);
  font-style: italic;
  margin: 0;
}

.role-form {
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
</style>