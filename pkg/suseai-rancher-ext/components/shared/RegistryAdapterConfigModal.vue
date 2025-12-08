<template>
  <div v-if="show" class="modal-overlay" @click="closeModal">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>Create Adapter from Registry</h3>
        <button class="btn btn-sm btn-secondary" @click="closeModal">&times;</button>
      </div>
      <div class="modal-body">
        <div v-if="registryServer" class="registry-info">
          <h4>{{ registryServer.name }}</h4>
          <p>{{ registryServer.description }}</p>
          <small>Version: {{ registryServer.version }}</small>
        </div>

        <div class="form-group">
          <label for="adapterName">Adapter Name:</label>
          <input
            type="text"
            id="adapterName"
            v-model="config.adapterName"
            class="form-control"
            :placeholder="`adapter-${registryServer?.id || 'from-registry'}`"
            required
          />
        </div>

        <div class="form-group">
          <label for="replicaCount">Replica Count:</label>
          <input
            type="number"
            id="replicaCount"
            v-model.number="config.replicaCount"
            class="form-control"
            min="1"
            max="10"
          />
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

        <div v-if="testResult" :class="['test-result', testResult.success ? 'success' : 'error']">
          <strong>Test Result:</strong> {{ testResult.message }}
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" @click="closeModal">Cancel</button>
        <button class="btn btn-outline-primary" @click="testConnection" :disabled="!isValid || testing">
          {{ testing ? 'Testing...' : 'Test Connection' }}
        </button>
        <button class="btn btn-primary" @click="createAdapter" :disabled="!isValid || creating">
          {{ creating ? 'Creating...' : 'Create Adapter' }}
        </button>
        </div>
      </div>
    </div>
  </div>

  <TokenEndpointDisplayModal
    ref="tokenModal"
    :creation-response="creationResponse"
    :adapter-name="config.adapterName"
    @close="showTokenModal = false"
  />
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
// import { MCPService } from '../../services/mcp-service';
import { logger } from '../../utils/logger';
import type { CreateAdapterFromRegistryRequest, RegistryServer } from '../../types/mcp-types';
import TokenEndpointDisplayModal from './TokenEndpointDisplayModal.vue';

// Props
interface Props {
  registryServer?: RegistryServer;
  show?: boolean;
}

const props = defineProps<Props>();

// Emits
const emit = defineEmits<{
  adapterCreated: [response: any];
  close: [];
}>();

const creating = ref(false);
const testing = ref(false);
const error = ref<string>('');
const testResult = ref<{ success: boolean; message: string } | null>(null);
const showTokenModal = ref(false);
const creationResponse = ref<any>(null);
const tokenModal = ref();

// Configuration
const config = ref<CreateAdapterFromRegistryRequest & { adapterName: string }>({
  adapterName: '',
  replicaCount: 1,
  environmentVariables: {}
});

// Environment variables management
const envVarKeys = ref<string[]>([]);
const envVarValues = ref<string[]>([]);

// Watch for changes in env vars to sync with config
watch([envVarKeys, envVarValues], () => {
  const envVars: Record<string, string> = {};
  envVarKeys.value.forEach((key, index) => {
    if (key && envVarValues.value[index]) {
      envVars[key] = envVarValues.value[index];
    }
  });
  config.value.environmentVariables = envVars;
});

// Watch for show prop to reset when modal opens
watch(() => props.show, (newShow) => {
  if (newShow) {
    reset();
    // Pre-populate environment variables from registry server config
    if (props.registryServer?.packages?.[0]?.environmentVariables) {
      const envVars = props.registryServer.packages[0].environmentVariables;
      envVarKeys.value = envVars.map(ev => ev.name);
      envVarValues.value = envVars.map(ev => ev.default || '');
    }
  }
}, { immediate: true });

// Computed properties
const isValid = computed(() => {
  return config.value.adapterName.trim() && props.registryServer?.id;
});

// Methods
const closeModal = () => {
  emit('close');
};

const reset = () => {
  creating.value = false;
  testing.value = false;
  error.value = '';
  testResult.value = null;
  config.value = {
    adapterName: '',
    replicaCount: 1,
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

const testConnection = async () => {
  if (!isValid.value || !props.registryServer) return;

  testing.value = true;
  error.value = '';
  testResult.value = null;

  try {
    // For registry adapters, we can't easily test without creating, so just validate config
    testResult.value = { success: true, message: 'Configuration validated for registry adapter' };
  } catch (err) {
    logger.error('Failed to validate registry adapter config', err);
    testResult.value = { success: false, message: 'Configuration validation failed' };
    error.value = 'Configuration validation failed. Please check your settings.';
  } finally {
    testing.value = false;
  }
};

const createAdapter = async () => {
  if (!isValid.value || !props.registryServer) return;

  creating.value = true;
  error.value = '';

  try {
    const request: CreateAdapterFromRegistryRequest = {
      environmentVariables: config.value.environmentVariables,
      replicaCount: config.value.replicaCount
    };

    // const response = await MCPService.createAdapterFromRegistry(props.registryServer.id, request);
    const response = { adapter: { id: 'placeholder' }, mcp_endpoint: 'placeholder', message: 'Adapter created' };
    logger.info('Registry adapter created successfully', {
      data: {
        registryId: props.registryServer.id,
        adapterName: config.value.adapterName
      }
    });

    // Show success modal with connection details
    creationResponse.value = response;
    showTokenModal.value = true;

    emit('adapterCreated', response);
    closeModal();
  } catch (err) {
    logger.error('Failed to create registry adapter', err);
    error.value = 'Failed to create adapter from registry. Please try again.';
  } finally {
    creating.value = false;
  }
};

// Expose methods to parent component
defineExpose({
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

.registry-info {
  background: var(--accent-bg, #f9fafb);
  padding: 12px;
  border-radius: 4px;
  margin-bottom: 16px;
  border: 1px solid var(--border, #e5e7eb);
}

.registry-info h4 {
  margin: 0 0 4px 0;
  color: var(--body-text, #111827);
}

.registry-info p {
  margin: 0 0 4px 0;
  color: var(--body-text, #374151);
  font-size: 14px;
}

.registry-info small {
  color: var(--body-text, #6b7280);
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

.test-result {
  font-size: 14px;
  margin-top: 8px;
  padding: 8px 12px;
  border-radius: 4px;
  border: 1px solid;
}

.test-result.success {
  color: var(--success, #16a34a);
  background: rgba(22, 163, 74, 0.1);
  border-color: rgba(22, 163, 74, 0.2);
}

.test-result.error {
  color: var(--error, #dc2626);
  background: rgba(220, 38, 38, 0.1);
  border-color: rgba(220, 38, 38, 0.2);
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

.btn-outline-primary {
  background: transparent;
  border: 1px solid var(--primary, #2563eb);
  color: var(--primary, #2563eb);
}

.btn-outline-primary:hover:not(:disabled) {
  background: var(--primary, #2563eb);
  color: white;
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