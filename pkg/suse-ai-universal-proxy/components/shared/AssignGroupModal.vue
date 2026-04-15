<template>
  <div v-if="show" class="modal-overlay" @click="closeModal">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>Manage Access: {{ adapter?.name }}</h3>
        <button class="btn btn-sm btn-secondary" @click="closeModal">&times;</button>
      </div>
      <div class="modal-body">
        <div v-if="loading" class="loading-state">
          Loading permissions...
        </div>
        <div v-else-if="error" class="error-message">
          {{ error }}
        </div>
        <div v-else class="groups-list">
          <table class="groups-table">
            <thead>
              <tr>
                <th>Group Name</th>
                <th>Access</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="group in groups" :key="group.id">
                <td>
                  <div class="group-name">{{ group.name }}</div>
                  <div class="group-desc">{{ group.description }}</div>
                </td>
                <td>
                  <div class="access-controls">
                    <label class="radio-label" :class="{ 'disabled': group.id === MCP_CONSTANTS.ADMIN_GROUP_ID }">
                      <input 
                        type="radio" 
                        :name="'access-' + group.id" 
                        value="read"
                        v-model="permissions[group.id]"
                        :disabled="group.id === MCP_CONSTANTS.ADMIN_GROUP_ID"
                      >
                      Read
                    </label>
                    <label class="radio-label" :class="{ 'disabled': group.id === MCP_CONSTANTS.ADMIN_GROUP_ID }">
                      <input 
                        type="radio" 
                        :name="'access-' + group.id" 
                        value="deny"
                        v-model="permissions[group.id]"
                        :disabled="group.id === MCP_CONSTANTS.ADMIN_GROUP_ID"
                      >
                      Deny
                    </label>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" @click="closeModal" :disabled="saving">Cancel</button>
        <button class="btn btn-primary" @click="savePermissions" :disabled="saving || loading">
          {{ saving ? 'Saving...' : 'Save Changes' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { adapterAPI, type Adapter } from '../../services/adapter-api';
import { externalGroupAPI } from '../../services/external-group-api';
import type { ExternalGroup } from '../../types/auth-types';
import { logger } from '../../utils/logger';
import { MCP_CONSTANTS } from '../../config/constants';

const props = defineProps<{
  show: boolean;
  adapter: Adapter | null;
}>();

const emit = defineEmits<{
  close: [];
}>();

const loading = ref(false);
const saving = ref(false);
const error = ref<string>('');
const groups = ref<ExternalGroup[]>([]);
const permissions = ref<Record<string, 'read' | 'deny'>>({});
const initialPermissions = ref<Record<string, 'read' | 'deny'>>({});

// Load data when modal is shown or adapter changes
watch(() => props.show, async (newValue) => {
  if (newValue && props.adapter) {
    await loadData();
  }
});

const loadData = async () => {
  if (!props.adapter) return;

  loading.value = true;
  error.value = '';
  
  try {
    // 1. Fetch all groups
    const allGroups = await externalGroupAPI.list();
    groups.value = allGroups;

    // 2. Fetch current assignments
    const assignedGroups = await adapterAPI.getAdapterGroups(props.adapter.name);
    
    // 3. Map to permissions state
    const perms: Record<string, 'read' | 'deny'> = {};
    
    allGroups.forEach(group => {
      // Check if group is in the assigned list
      // The API returns assigned groups as objects with id/name etc.
      // Handle potential ID mismatch (some APIs return groupId instead of id)
      const isAssigned = assignedGroups.some((g: any) => 
        (g.id && g.id === group.id) || 
        (g.groupId && g.groupId === group.id) ||
        (typeof g === 'string' && g === group.id)
      );
      
      // Force admin group to be 'read' regardless of backend state (self-healing)
      if (group.id === MCP_CONSTANTS.ADMIN_GROUP_ID) {
        perms[group.id] = 'read';
      } else {
        perms[group.id] = isAssigned ? 'read' : 'deny';
      }
    });

    permissions.value = perms;
    // Deep copy for diffing later
    initialPermissions.value = JSON.parse(JSON.stringify(perms));

  } catch (err: any) {
    logger.error('Failed to load permission data', err);
    error.value = 'Failed to load permissions. Please try again.';
  } finally {
    loading.value = false;
  }
};

const savePermissions = async () => {
  if (!props.adapter) return;

  saving.value = true;
  error.value = '';

  try {
    const promises: Promise<any>[] = [];

    // Calculate diffs
    for (const group of groups.value) {
      const current = permissions.value[group.id];
      const initial = initialPermissions.value[group.id];

      if (current !== initial) {
        if (current === 'read') {
          // Grant access
          promises.push(adapterAPI.assignGroup(props.adapter.name, group.id, MCP_CONSTANTS.DEFAULT_ADAPTER_PERMISSION));
        } else {
          // Revoke access
          promises.push(adapterAPI.unassignGroup(props.adapter.name, group.id));
        }
      }
    }

    await Promise.all(promises);
    logger.info('Permissions updated successfully', { adapter: props.adapter.name });
    closeModal();
    
  } catch (err: any) {
    logger.error('Failed to save permissions', err);
    error.value = 'Failed to save changes. Please try again.';
  } finally {
    saving.value = false;
  }
};

const closeModal = () => {
  emit('close');
  // Reset state after transition
  setTimeout(() => {
    error.value = '';
    permissions.value = {};
  }, 300);
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: var(--body-bg, #ffffff);
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  max-width: 600px;
  width: 90%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border, #e5e7eb);
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--body-text, #111827);
}

.modal-body {
  padding: 20px 24px;
  overflow-y: auto;
  flex: 1;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid var(--border, #e5e7eb);
  background: var(--accent-bg, #f9fafb);
}

.loading-state {
  text-align: center;
  padding: 40px;
  color: var(--muted, #6b7280);
}

.error-message {
  color: var(--error, #dc2626);
  padding: 12px;
  background: rgba(220, 38, 38, 0.1);
  border-radius: 4px;
  border: 1px solid rgba(220, 38, 38, 0.2);
}

.groups-table {
  width: 100%;
  border-collapse: collapse;
}

.groups-table th {
  text-align: left;
  padding: 8px 12px;
  border-bottom: 2px solid var(--border, #e5e7eb);
  color: var(--muted, #6b7280);
  font-size: 14px;
  font-weight: 600;
}

.groups-table td {
  padding: 12px;
  border-bottom: 1px solid var(--border, #e5e7eb);
}

.group-name {
  font-weight: 500;
  color: var(--body-text, #111827);
}

.group-desc {
  font-size: 12px;
  color: var(--muted, #6b7280);
  margin-top: 2px;
}

.access-controls {
  display: flex;
  gap: 16px;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: 14px;
}

.radio-label.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.radio-label input[type="radio"] {
  accent-color: var(--primary, #2563eb);
}

.btn {
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--primary, #2563eb);
  color: white;
}

.btn-secondary {
  background: var(--body-bg, #ffffff);
  border: 1px solid var(--border, #d1d5db);
  color: var(--body-text, #111827);
}
</style>
