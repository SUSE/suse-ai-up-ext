<template>
  <div v-if="show" class="modal-overlay" @click="handleOverlayClick">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
         <h2>{{ !user ? 'Create User' : isEditing ? 'Edit User' : 'User Details' }}</h2>
        <button class="close-btn" @click="$emit('close')" aria-label="Close modal">
          ×
        </button>
      </div>

      <div class="modal-body">
        <form v-if="(!user || isEditing) && formData" @submit.prevent="handleSave" class="user-form">
           <div class="form-group">
             <label for="username">Username *</label>
             <input
               id="username"
               v-model="formUsername"
               type="text"
               required
               class="form-input"
             />
           </div>

           <div class="form-group">
             <label for="firstName">First Name</label>
             <input
               id="firstName"
               v-model="firstName"
               type="text"
               class="form-input"
             />
           </div>

           <div class="form-group">
             <label for="lastName">Last Name</label>
             <input
               id="lastName"
               v-model="lastName"
               type="text"
               class="form-input"
             />
           </div>

           <div class="form-group">
             <label for="email">Email *</label>
             <input
               id="email"
               v-model="formEmail"
               type="email"
               required
               class="form-input"
             />
           </div>

           <div v-if="props.isExternal" class="form-group">
             <label>Groups</label>
             <select multiple v-model="selectedGroups" class="form-input">
               <option v-for="group in availableGroups" :key="group.id" :value="group.id">
                 {{ group.name }}
               </option>
             </select>
           </div>

          <div v-if="!props.isExternal" class="form-group">
            <label for="displayName">Display Name</label>
            <input
              id="displayName"
              v-model="formDisplayName"
              type="text"
              class="form-input"
            />
          </div>

          <div v-if="!props.isExternal" class="form-group">
            <label for="description">Description</label>
            <textarea
              id="description"
              v-model="formDescription"
              rows="3"
              class="form-input"
              placeholder="Optional description for this user"
            ></textarea>
          </div>

          <div v-if="!props.isExternal" class="form-group">
            <label class="checkbox-label">
              <input
                v-model="formEnabled"
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
                <label>{{ props.isExternal ? 'Name:' : 'Username:' }}</label>
                <span>{{ getUserField('username') }}</span>
              </div>
              <div v-if="props.isExternal" class="detail-item">
                <label>Email:</label>
                <span>{{ getUserField('email') }}</span>
              </div>
              <div v-if="!props.isExternal" class="detail-item">
                <label>Display Name:</label>
                <span>{{ getUserField('displayName') }}</span>
              </div>
              <div v-if="!props.isExternal" class="detail-item">
                <label>Status:</label>
                <span class="status-badge" :class="{ 'enabled': getUserField('enabled'), 'disabled': !getUserField('enabled') }">
                  {{ getUserField('enabled') ? 'Enabled' : 'Disabled' }}
                </span>
              </div>
              <div class="detail-item">
                <label>Created:</label>
                <span>{{ formatDate(getUserField('created')) }}</span>
              </div>
              <div v-if="!props.isExternal" class="detail-item">
                <label>Last Login:</label>
                <span>{{ getUserField('lastLogin') ? formatDate(getUserField('lastLogin')) : 'Never' }}</span>
              </div>
              <div v-if="!props.isExternal" class="detail-item">
                <label>Auth Provider:</label>
                <span>{{ getAuthProvider(user as any) }}</span>
              </div>
            </div>
          </div>

           <div v-if="(user as any)?.description" class="detail-section">
             <h3>Description</h3>
             <p>{{ (user as any).description }}</p>
           </div>

          <div v-if="!isExternal" class="detail-section">
            <h3>Principal IDs</h3>
            <div v-if="getUserField('principalIds')?.length" class="principal-ids">
              <div
                v-for="principalId in getUserField('principalIds')"
                :key="principalId"
                class="principal-id"
              >
                {{ principalId }}
              </div>
            </div>
            <p v-else class="no-data">No principal IDs available</p>
          </div>

          <div v-if="!props.isExternal && userPermissions" class="detail-section">
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
           <div v-if="isExternal" class="detail-section">
             <h3>Groups</h3>
             <div v-if="getUserField('groups')?.length" class="groups-list">
               <div
                 v-for="groupId in getUserField('groups')"
                 :key="groupId"
                 class="group-item"
               >
                 {{ getGroupName(groupId) || groupId }}
               </div>
             </div>
             <p v-else class="no-data">No groups assigned</p>
           </div>
        </div>
      </div>

      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" @click="$emit('close')">
          {{ isEditing ? 'Cancel' : 'Close' }}
        </button>
         <button
           v-if="!user || isEditing"
           type="submit"
           class="btn btn-primary"
           @click="handleSave"
           :disabled="!isFormValid"
         >
           {{ !user ? 'Create User' : 'Save Changes' }}
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
import { defineComponent, ref, computed, watch, onMounted } from 'vue';
import type { RancherUser, ExternalUser, UserPermissions } from '../../types/auth-types';
import { API_BASE_URLS } from '../../config/api-config';

export default defineComponent({
  name: 'UserDetailsModal',
  props: {
    user: {
      type: Object as () => RancherUser | ExternalUser | null,
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
    },
    isExternal: {
      type: Boolean,
      default: false
    }
  },
  emits: ['close', 'save'],
  setup(props, { emit }) {
    const isEditing = ref(false);
    const formData = ref<RancherUser | ExternalUser | null>(null);
    const availableGroups = ref<any[]>([]);
    const firstName = ref('');
    const lastName = ref('');
    const selectedGroups = ref<string[]>([]);

    // Watch for user changes to reset form
    watch(() => props.user, (newUser) => {
      if (newUser) {
        // Create a mutable copy of the user data
        formData.value = JSON.parse(JSON.stringify(newUser));
        // Initialize selected groups for external users
        if (props.isExternal && (newUser as ExternalUser).groups) {
          selectedGroups.value = [...(newUser as ExternalUser).groups];
        }
        isEditing.value = false;
      } else {
        // For creation
        formData.value = {
          id: '',
          name: '',
          email: '',
          groups: []
        } as any;
        selectedGroups.value = [];
        isEditing.value = true;
      }
    }, { immediate: true });

    // Fetch available groups for external users
    onMounted(async () => {
      if (props.isExternal) {
        try {
          // Assuming API_BASE_URLS is available, fetch groups
          const response = await fetch(`${API_BASE_URLS.MCP_GATEWAY}/api/v1/groups`);
          if (response.ok) {
            availableGroups.value = await response.json();
          }
        } catch (error) {
          console.error('Failed to fetch groups:', error);
        }
      }
    });

    // Computed properties
    const isFormValid = computed(() => {
      if (!formData.value) return false;

      const username = formUsername.value?.trim();
      const email = formEmail.value?.trim();

      return username && email;
    });

    const canEditUsername = computed(() => {
      // Allow editing username for new users, but not for existing ones
      return !props.user?.id;
    });

    // Form field computed properties for v-model
    const formUsername = computed({
      get: () => {
        if (!formData.value) return '';
        return props.isExternal ? (formData.value as any).name : (formData.value as any).username;
      },
      set: (value: string) => {
        if (!formData.value) return;
        if (props.isExternal) {
          (formData.value as any).name = value;
        } else {
          (formData.value as any).username = value;
        }
      }
    });

    const formEmail = computed({
      get: () => {
        if (!formData.value || !props.isExternal) return '';
        return (formData.value as ExternalUser).email;
      },
      set: (value: string) => {
        if (!formData.value || !props.isExternal) return;
        (formData.value as ExternalUser).email = value;
      }
    });

    const formDisplayName = computed({
      get: () => {
        if (!formData.value || props.isExternal) return '';
        return (formData.value as any).displayName || '';
      },
      set: (value: string) => {
        if (!formData.value || props.isExternal) return;
        (formData.value as any).displayName = value;
      }
    });

    const formDescription = computed({
      get: () => {
        if (!formData.value || props.isExternal) return '';
        return (formData.value as any).description || '';
      },
      set: (value: string) => {
        if (!formData.value || props.isExternal) return;
        (formData.value as any).description = value;
      }
    });

    const formEnabled = computed({
      get: () => {
        if (!formData.value || props.isExternal) return true;
        return (formData.value as any).enabled || false;
      },
      set: (value: boolean) => {
        if (!formData.value || props.isExternal) return;
        (formData.value as any).enabled = value;
      }
    });

    // Methods
    const startEditing = () => {
      isEditing.value = true;
    };

    const handleSave = () => {
      if (!isFormValid.value || !formData.value) return;

      if (!props.user) {
        // Creation payload
        const name = `${firstName.value} ${lastName.value}`.trim();
        const payload = {
          id: formUsername.value,
          name: name || formUsername.value,
          email: formEmail.value,
          groups: selectedGroups.value
        };
        emit('save', payload);
      } else {
        // Update payload - include selected groups for external users
        const payload = {
          ...formData.value,
          ...(props.isExternal && { groups: selectedGroups.value })
        };
        emit('save', payload);
      }
    };

    const getGroupName = (groupId: string): string => {
      const group = availableGroups.value.find(g => g.id === groupId);
      return group?.name || groupId;
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

    // Helper methods for different user types
    const getUserField = (field: string): any => {
      if (!props.user) return '';

      if (props.isExternal) {
        const externalUser = props.user as ExternalUser;
        switch (field) {
          case 'username': return externalUser.name;
          case 'email': return externalUser.email;
          case 'created': return externalUser.createdAt;
          default: return '';
        }
      } else {
        const rancherUser = props.user as RancherUser;
        return rancherUser[field as keyof RancherUser] || '';
      }
    };

    const getFormField = (field: string): any => {
      if (!formData.value) return '';

      if (props.isExternal) {
        const externalForm = formData.value as ExternalUser;
        switch (field) {
          case 'username': return externalForm.name;
          case 'email': return externalForm.email;
          default: return '';
        }
      } else {
        const rancherForm = formData.value as RancherUser;
        return rancherForm[field as keyof RancherUser] || '';
      }
    };

    const setFormField = (field: string, value: any): void => {
      if (!formData.value) return;

      if (props.isExternal) {
        const externalForm = formData.value as ExternalUser;
        switch (field) {
          case 'username': externalForm.name = value; break;
          case 'email': externalForm.email = value; break;
        }
      } else {
        const rancherForm = formData.value as RancherUser;
        (rancherForm as any)[field] = value;
      }
    };

    return {
      isEditing,
      formData,
      isFormValid,
      canEditUsername,
      formUsername,
      formEmail,
      formDisplayName,
      formDescription,
      formEnabled,
      availableGroups,
      firstName,
      lastName,
      selectedGroups,
      startEditing,
      handleSave,
      handleOverlayClick,
      formatDate,
      getAuthProvider,
      getUserField,
      getFormField,
      setFormField,
      getGroupName,
      props
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