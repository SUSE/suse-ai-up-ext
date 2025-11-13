<template>
  <div v-if="show" class="modal-overlay" @click="handleOverlayClick">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h2>{{ isEditing ? 'Edit User' : 'User Details' }}</h2>
        <button class="close-btn" @click="$emit('close')" aria-label="Close modal">
          ×
        </button>
      </div>

      <div class="modal-body">
        <form v-if="isEditing && formData" @submit.prevent="handleSave" class="user-form">
          <div class="form-group">
            <label for="username">Username *</label>
            <input
              id="username"
              v-model="formData.username"
              type="text"
              required
              :disabled="!canEditUsername"
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
              placeholder="Optional description for this user"
            ></textarea>
          </div>

          <div class="form-group">
            <label class="checkbox-label">
              <input
                v-model="formData.enabled"
                type="checkbox"
                class="form-checkbox"
              />
              <span>Account Enabled</span>
            </label>
          </div>
        </form>

        <div v-else class="user-details">
          <div class="detail-section">
            <h3>Basic Information</h3>
            <div class="detail-grid">
              <div class="detail-item">
                <label>Username:</label>
                <span>{{ user?.username }}</span>
              </div>
              <div class="detail-item">
                <label>Display Name:</label>
                <span>{{ user?.displayName || user?.username }}</span>
              </div>
              <div class="detail-item">
                <label>Status:</label>
                <span class="status-badge" :class="{ 'enabled': user?.enabled, 'disabled': !user?.enabled }">
                  {{ user?.enabled ? 'Enabled' : 'Disabled' }}
                </span>
              </div>
              <div class="detail-item">
                <label>Created:</label>
                <span>{{ formatDate(user?.created) }}</span>
              </div>
              <div class="detail-item">
                <label>Last Login:</label>
                <span>{{ user?.lastLogin ? formatDate(user?.lastLogin) : 'Never' }}</span>
              </div>
              <div class="detail-item">
                <label>Auth Provider:</label>
                <span>{{ getAuthProvider(user) }}</span>
              </div>
            </div>
          </div>

          <div v-if="user?.description" class="detail-section">
            <h3>Description</h3>
            <p>{{ user.description }}</p>
          </div>

          <div class="detail-section">
            <h3>Principal IDs</h3>
            <div v-if="user?.principalIds?.length" class="principal-ids">
              <div
                v-for="principalId in user.principalIds"
                :key="principalId"
                class="principal-id"
              >
                {{ principalId }}
              </div>
            </div>
            <p v-else class="no-data">No principal IDs available</p>
          </div>

          <div v-if="userPermissions" class="detail-section">
            <h3>Permissions</h3>
            <div class="permissions-summary">
              <div v-if="userPermissions.global.length > 0" class="permission-group">
                <h4>Global Permissions</h4>
                <ul>
                  <li v-for="perm in userPermissions.global.slice(0, 5)" :key="perm.resource">
                    {{ perm.resource }}: {{ perm.verbs.join(', ') }}
                  </li>
                  <li v-if="userPermissions.global.length > 5">
                    ... and {{ userPermissions.global.length - 5 }} more
                  </li>
                </ul>
              </div>
              <div v-if="Object.keys(userPermissions.cluster).length > 0" class="permission-group">
                <h4>Cluster Permissions</h4>
                <p>{{ Object.keys(userPermissions.cluster).length }} clusters</p>
              </div>
              <div v-if="Object.keys(userPermissions.project).length > 0" class="permission-group">
                <h4>Project Permissions</h4>
                <p>{{ Object.keys(userPermissions.project).length }} projects</p>
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
          v-else-if="canEditUser"
          type="button"
          class="btn btn-outline"
          @click="startEditing"
        >
          Edit User
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, watch } from 'vue';
import type { RancherUser, UserPermissions } from '../../types/auth-types';

export default defineComponent({
  name: 'UserDetailsModal',
  props: {
    user: {
      type: Object as () => RancherUser | null,
      default: null
    },
    show: {
      type: Boolean,
      default: false
    },
    canEditUser: {
      type: Boolean,
      default: false
    },
    userPermissions: {
      type: Object as () => UserPermissions | null,
      default: null
    }
  },
  emits: ['close', 'save'],
  setup(props, { emit }) {
    const isEditing = ref(false);
    const formData = ref<RancherUser | null>(null);

    // Watch for user changes to reset form
    watch(() => props.user, (newUser) => {
      if (newUser) {
        formData.value = { ...newUser };
        isEditing.value = false;
      }
    }, { immediate: true });

    // Computed properties
    const isFormValid = computed(() => {
      return formData.value?.username?.trim();
    });

    const canEditUsername = computed(() => {
      // Allow editing username for new users, but not for existing ones
      return !props.user?.id;
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

    const getAuthProvider = (user?: RancherUser | null): string => {
      if (!user?.principalIds?.length) return 'Local';

      const principalId = user.principalIds.find(id => id.includes(':'));
      if (!principalId) return 'Local';

      const parts = principalId.split(':');
      if (parts.length >= 2) {
        const provider = parts[1];
        return provider.charAt(0).toUpperCase() + provider.slice(1);
      }

      return 'Local';
    };

    return {
      isEditing,
      formData,
      isFormValid,
      canEditUsername,
      startEditing,
      handleSave,
      handleOverlayClick,
      formatDate,
      getAuthProvider
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
  background: rgba(0, 0, 0, 0.5);
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
  max-width: 600px;
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

.user-details {
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

.status-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.enabled {
  background: var(--success-bg);
  color: var(--success);
}

.status-badge.disabled {
  background: var(--error-bg);
  color: var(--error);
}

.principal-ids {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.principal-id {
  background: var(--input-bg);
  padding: 8px 12px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 14px;
  color: var(--text);
  word-break: break-all;
}

.permissions-summary {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.permission-group h4 {
  margin: 0 0 8px 0;
  color: var(--text);
  font-size: 14px;
  font-weight: 600;
}

.permission-group ul {
  margin: 0;
  padding-left: 20px;
}

.permission-group li {
  color: var(--text-muted);
  font-size: 14px;
  margin-bottom: 4px;
}

.no-data {
  color: var(--text-muted);
  font-style: italic;
  margin: 0;
}

.user-form {
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

.form-input {
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--input-bg);
  color: var(--text);
  font-size: 14px;
}

.form-input:focus {
  outline: none;
  border-color: var(--primary);
}

.form-input:disabled {
  background: var(--disabled-bg);
  color: var(--text-muted);
  cursor: not-allowed;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-weight: normal;
}

.form-checkbox {
  width: 16px;
  height: 16px;
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