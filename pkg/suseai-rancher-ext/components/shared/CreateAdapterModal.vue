<template>
  <div v-if="isVisible" class="modal-overlay" @click="closeModal">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>Create MCP Adapter</h3>
        <button class="btn btn-sm btn-secondary" @click="closeModal">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label for="adapterName">Adapter Name:</label>
          <input
            type="text"
            id="adapterName"
            v-model="adapterData.name"
            class="form-control"
            placeholder="my-mcp-adapter"
            required
          />
        </div>

        <div class="form-group">
          <label for="imageName">Image Name:</label>
          <input
            type="text"
            id="imageName"
            v-model="adapterData.imageName"
            class="form-control"
            placeholder="nginx"
            required
          />
        </div>

        <div class="form-group">
          <label for="imageVersion">Image Version:</label>
          <input
            type="text"
            id="imageVersion"
            v-model="adapterData.imageVersion"
            class="form-control"
            placeholder="latest"
            required
          />
        </div>

        <div class="form-group">
          <label for="description">Description:</label>
          <textarea
            id="description"
            v-model="adapterData.description"
            class="form-control"
            placeholder="Description of this MCP adapter"
            rows="3"
          ></textarea>
        </div>

        <div class="form-group">
          <label for="connectionType">Connection Type:</label>
          <select id="connectionType" v-model="adapterData.connectionType" class="form-control">
            <option value="StreamableHttp">Streamable HTTP</option>
            <option value="SSE">Server-Sent Events</option>
          </select>
        </div>

        <div class="form-group">
          <label for="protocol">Protocol:</label>
          <select id="protocol" v-model="adapterData.protocol" class="form-control">
            <option value="MCP">MCP</option>
          </select>
        </div>

        <div class="form-group">
          <label for="replicaCount">Replica Count:</label>
          <input
            type="number"
            id="replicaCount"
            v-model.number="adapterData.replicaCount"
            class="form-control"
            min="1"
            max="10"
          />
        </div>

        <div class="form-group">
          <label class="checkbox-label">
            <input
              type="checkbox"
              v-model="adapterData.useWorkloadIdentity"
            />
            <span>Use Workload Identity</span>
          </label>
        </div>

        <div class="form-group">
          <label>Environment Variables:</label>
          <div class="env-vars">
            <div v-for="(item, index) in envVarKeys" :key="index" class="env-var-item">
              <input
                type="text"
                v-model="envVarKeys[index]"
                class="form-control"
                placeholder="KEY"
              />
              <input
                type="text"
                v-model="envVarValues[index]"
                class="form-control"
                placeholder="VALUE"
              />
              <button
                type="button"
                class="btn btn-sm btn-secondary"
                @click="removeEnvVar(index)"
              >
                &times;
              </button>
            </div>
            <button type="button" class="btn btn-sm btn-secondary" @click="addEnvVar">
              Add Environment Variable
            </button>
          </div>
        </div>

        <div v-if="error" class="error-message">
          {{ error }}
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" @click="closeModal">Cancel</button>
        <button class="btn btn-primary" @click="createAdapter" :disabled="!isValid || creating">
          {{ creating ? 'Creating...' : 'Create Adapter' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { MCPService, type AdapterData } from '../../services/mcp-service';
import { logger } from '../../utils/logger';

const isVisible = ref(false);
const creating = ref(false);
const error = ref<string>('');

// Form data
const adapterData = ref<AdapterData>({
  name: '',
  imageName: '',
  imageVersion: '',
  description: '',
  connectionType: 'StreamableHttp',
  protocol: 'MCP',
  replicaCount: 1,
  useWorkloadIdentity: false,
  environmentVariables: {}
});

// Environment variables management
const envVarKeys = ref<string[]>([]);
const envVarValues = ref<string[]>([]);

// Watch for changes in env vars to sync with adapterData
watch([envVarKeys, envVarValues], () => {
  const envVars: Record<string, string> = {};
  envVarKeys.value.forEach((key, index) => {
    if (key && envVarValues.value[index]) {
      envVars[key] = envVarValues.value[index];
    }
  });
  adapterData.value.environmentVariables = envVars;
});

// Computed properties
const isValid = computed(() => {
  return adapterData.value.name.trim() &&
         adapterData.value.imageName.trim() &&
         adapterData.value.imageVersion.trim();
});

// Methods
const openModal = () => {
  isVisible.value = true;
  reset();
};

const closeModal = () => {
  isVisible.value = false;
  reset();
};

const reset = () => {
  creating.value = false;
  error.value = '';
  adapterData.value = {
    name: '',
    imageName: '',
    imageVersion: '',
    description: '',
    connectionType: 'StreamableHttp',
    protocol: 'MCP',
    replicaCount: 1,
    useWorkloadIdentity: false,
    environmentVariables: {}
  };
  envVarKeys.value = [];
  envVarValues.value = [];
};

const addEnvVar = () => {
  envVarKeys.value.push('');
  envVarValues.value.push('');
};

const removeEnvVar = (index: number) => {
  envVarKeys.value.splice(index, 1);
  envVarValues.value.splice(index, 1);
};

const createAdapter = async () => {
  if (!isValid.value) return;

  creating.value = true;
  error.value = '';

  try {
    await MCPService.createAdapter(adapterData.value);
    logger.info('Adapter created successfully', { data: { adapterName: adapterData.value.name } });
    closeModal();

    // Emit event to parent component to refresh data
    // This would need to be handled by the parent component

  } catch (err) {
    logger.error('Failed to create adapter', err);
    error.value = 'Failed to create adapter. Please try again.';
  } finally {
    creating.value = false;
  }
};

// Expose methods to parent component
defineExpose({
  openModal,
  closeModal
});
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
  overflow-y: auto;
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
  max-height: 60vh;
  overflow-y: auto;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid var(--border, #e5e7eb);
  background: var(--accent-bg, #f9fafb);
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 4px;
  font-weight: 500;
  color: var(--body-text, #111827);
}

.form-control {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border, #d1d5db);
  border-radius: 4px;
  font-size: 14px;
}

.form-control:focus {
  outline: none;
  border-color: var(--primary, #2563eb);
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
}

textarea.form-control {
  resize: vertical;
  min-height: 80px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-weight: normal;
}

.checkbox-label input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: var(--primary, #2563eb);
  cursor: pointer;
}

.env-vars {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.env-var-item {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 8px;
  align-items: center;
}

.error-message {
  color: var(--error, #dc2626);
  font-size: 14px;
  margin-top: 8px;
  padding: 8px 12px;
  background: rgba(220, 38, 38, 0.1);
  border-radius: 4px;
  border: 1px solid rgba(220, 38, 38, 0.2);
}

.btn {
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--primary, #2563eb);
  border: 1px solid var(--primary, #2563eb);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-hover, #1d4ed8);
  border-color: var(--primary-hover, #1d4ed8);
}

.btn-secondary {
  background: var(--body-bg, #ffffff);
  border: 1px solid var(--border, #d1d5db);
  color: var(--body-text, #111827);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--accent-bg, #f9fafb);
  border-color: var(--border-hover, #9ca3af);
}

.btn-sm {
  padding: 4px 8px;
  font-size: 12px;
}
</style>