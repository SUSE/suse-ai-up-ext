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

        <!-- Dynamic fields based on connection type -->
        <div v-if="adapterData.connectionType === 'LocalStdio'" class="form-group">
          <label for="command">Command:</label>
          <input
            type="text"
            id="command"
            v-model="adapterData.command"
            class="form-control"
            placeholder="python"
            required
          />
        </div>

        <div v-if="adapterData.connectionType === 'LocalStdio'" class="form-group">
          <label>Arguments:</label>
          <div class="args-list">
            <div v-for="(arg, index) in argsList" :key="index" class="arg-item">
              <input
                type="text"
                v-model="argsList[index]"
                class="form-control"
                :placeholder="`Argument ${index + 1}`"
              />
              <button
                type="button"
                class="btn btn-sm btn-secondary"
                @click="removeArg(index)"
              >
                &times;
              </button>
            </div>
            <button type="button" class="btn btn-sm btn-secondary" @click="addArg">
              Add Argument
            </button>
          </div>
        </div>

        <div v-if="adapterData.connectionType === 'RemoteHttp' || adapterData.connectionType === 'StreamableHttp'" class="form-group">
          <label for="remoteUrl">Remote URL:</label>
          <input
            type="url"
            id="remoteUrl"
            v-model="adapterData.remoteUrl"
            class="form-control"
            placeholder="https://remote-mcp.example.com"
            required
          />
        </div>

        <div v-if="adapterData.connectionType === 'VirtualMCP'" class="form-group">
          <label for="apiBaseUrl">API Base URL:</label>
          <input
            type="url"
            id="apiBaseUrl"
            v-model="adapterData.apiBaseUrl"
            class="form-control"
            placeholder="http://localhost:8000"
            required
          />
        </div>

        <div v-if="adapterData.connectionType !== 'LocalStdio'" class="form-group">
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

        <div v-if="adapterData.connectionType !== 'LocalStdio'" class="form-group">
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

        <div v-if="adapterData.connectionType === 'VirtualMCP'" class="form-group">
          <label>Tools:</label>
          <div class="tools-builder">
            <div v-for="(tool, index) in toolsList" :key="index" class="tool-item">
              <div class="tool-header">
                <input
                  type="text"
                  v-model="tool.name"
                  class="form-control"
                  placeholder="Tool name"
                  required
                />
                <button
                  type="button"
                  class="btn btn-sm btn-secondary"
                  @click="removeTool(index)"
                >
                  &times;
                </button>
              </div>
              <textarea
                v-model="tool.description"
                class="form-control"
                placeholder="Tool description"
                rows="2"
              ></textarea>
              <textarea
                v-model="tool.inputSchema"
                class="form-control"
                placeholder="Input schema (JSON)"
                rows="3"
              ></textarea>
            </div>
            <button type="button" class="btn btn-sm btn-secondary" @click="addTool">
              Add Tool
            </button>
          </div>
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
            <option value="RemoteHttp">Remote HTTP</option>
            <option value="LocalStdio">Local Stdio</option>
          </select>
        </div>

        <div class="form-group">
          <label for="protocol">Protocol:</label>
          <select id="protocol" v-model="adapterData.protocol" class="form-control">
            <option value="MCP">MCP</option>
          </select>
        </div>

        <!-- Authentication Configuration -->
        <div class="form-group">
          <label>Authentication:</label>
          <div class="auth-config">
            <div class="form-group">
              <label for="authRequired">Authentication Required:</label>
              <input
                type="checkbox"
                id="authRequired"
                v-model="adapterData.authentication.required"
              />
            </div>

            <div class="form-group" v-if="adapterData.authentication?.required">
              <label for="authType">Authentication Type:</label>
              <select id="authType" v-model="adapterData.authentication!.type" class="form-control">
                <option value="none">None</option>
                <option value="bearer">Bearer Token</option>
                <option value="basic">Basic Auth</option>
                <option value="apikey">API Key</option>
                <option value="oauth">OAuth</option>
              </select>
            </div>

            <!-- Bearer Token Config -->
            <div v-if="adapterData.authentication?.required && adapterData.authentication?.type === 'bearer'" class="auth-details">
              <div class="form-group">
                <label for="bearerToken">Bearer Token:</label>
                <input
                  type="password"
                  id="bearerToken"
                  v-model="adapterData.authentication!.bearerToken!.token"
                  class="form-control"
                  placeholder="Enter bearer token"
                />
              </div>
              <div class="form-group">
                <label for="bearerDynamic">Use Dynamic Token:</label>
                <input
                  type="checkbox"
                  id="bearerDynamic"
                  v-model="adapterData.authentication!.bearerToken!.dynamic"
                />
              </div>
            </div>

            <!-- Basic Auth Config -->
            <div v-if="adapterData.authentication?.required && adapterData.authentication?.type === 'basic'" class="auth-details">
              <div class="form-group">
                <label for="basicUsername">Username:</label>
                <input
                  type="text"
                  id="basicUsername"
                  v-model="adapterData.authentication!.basic!.username"
                  class="form-control"
                  placeholder="Enter username"
                />
              </div>
              <div class="form-group">
                <label for="basicPassword">Password:</label>
                <input
                  type="password"
                  id="basicPassword"
                  v-model="adapterData.authentication!.basic!.password"
                  class="form-control"
                  placeholder="Enter password"
                />
              </div>
            </div>

            <!-- API Key Config -->
            <div v-if="adapterData.authentication?.required && adapterData.authentication?.type === 'apikey'" class="auth-details">
              <div class="form-group">
                <label for="apiKey">API Key:</label>
                <input
                  type="password"
                  id="apiKey"
                  v-model="adapterData.authentication!.apiKey!.key"
                  class="form-control"
                  placeholder="Enter API key"
                />
              </div>
              <div class="form-group">
                <label for="apiKeyLocation">Location:</label>
                <select id="apiKeyLocation" v-model="adapterData.authentication!.apiKey!.location" class="form-control">
                  <option value="header">Header</option>
                  <option value="query">Query Parameter</option>
                  <option value="cookie">Cookie</option>
                </select>
              </div>
              <div class="form-group">
                <label for="apiKeyName">Name:</label>
                <input
                  type="text"
                  id="apiKeyName"
                  v-model="adapterData.authentication!.apiKey!.name"
                  class="form-control"
                  placeholder="Header name, query param, or cookie name"
                />
        </div>
      </div>
    </div>
  </div>

  <TokenEndpointDisplayModal
    ref="tokenModal"
    :creation-response="creationResponse"
    :adapter-name="adapterData.name"
    @close="showTokenModal = false"
  />
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { MCPService } from '../../services/mcp-service';
import type { AdapterData } from '../../types/mcp-types';
import { API_BASE_URLS } from '../../config/api-config';
import { logger } from '../../utils/logger';
import TokenEndpointDisplayModal from './TokenEndpointDisplayModal.vue';

// Emits
const emit = defineEmits<{
  adapterCreated: [];
  close: [];
}>();

const isVisible = ref(false);
const creating = ref(false);
const testing = ref(false);
const error = ref<string>('');
const testResult = ref<{ success: boolean; message: string } | null>(null);
const showTokenModal = ref(false);
const creationResponse = ref<any>(null);
const tokenModal = ref();

// Form data
const adapterData = ref<AdapterData>({
  name: '',
  description: '',
  connectionType: 'StreamableHttp',
  protocol: 'MCP',
  replicaCount: 1,
  useWorkloadIdentity: false,
  environmentVariables: {},
  authentication: {
    required: false,
    type: 'none',
    bearerToken: { dynamic: false },
    basic: { username: '', password: '' },
    apiKey: { key: '', location: 'header', name: '' }
  }
});

// Environment variables management
const envVarKeys = ref<string[]>([]);
const envVarValues = ref<string[]>([]);

// Arguments management
const argsList = ref<string[]>([]);

// Tools management
interface ToolConfig {
  name: string;
  description: string;
  inputSchema: string;
}
const toolsList = ref<ToolConfig[]>([]);

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

// Watch for changes in args to sync with adapterData
watch(argsList, () => {
  adapterData.value.args = argsList.value.filter(arg => arg.trim() !== '');
}, { deep: true });

// Watch for changes in tools to sync with adapterData
watch(toolsList, () => {
  adapterData.value.tools = toolsList.value
    .filter(tool => tool.name.trim() !== '')
    .map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.inputSchema ? JSON.parse(tool.inputSchema) : {}
    }));
}, { deep: true });

// Computed properties
const isValid = computed(() => {
  const data = adapterData.value;

  // Basic validation
  if (!data.name.trim()) return false;

  // Connection type specific validation
  switch (data.connectionType) {
    case 'LocalStdio':
      return data.command?.trim() && validateArgs();
    case 'RemoteHttp':
    case 'StreamableHttp':
      return data.remoteUrl?.trim() && data.imageName?.trim() && data.imageVersion?.trim();
    case 'VirtualMCP':
      return data.apiBaseUrl?.trim() && data.imageName?.trim() && data.imageVersion?.trim() && validateTools();
    case 'SSE':
    default:
      return data.imageName?.trim() && data.imageVersion?.trim();
  }
});

const validateArgs = () => {
  return argsList.value.every(arg => arg.trim() !== '');
};

const validateTools = () => {
  return toolsList.value.every(tool =>
    tool.name.trim() !== '' &&
    tool.description.trim() !== '' &&
    tool.inputSchema.trim() !== ''
  );
};

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
  testing.value = false;
  error.value = '';
  testResult.value = null;
  adapterData.value = {
    name: '',
    description: '',
    connectionType: 'StreamableHttp',
    protocol: 'MCP',
    replicaCount: 1,
    useWorkloadIdentity: false,
    environmentVariables: {},
    authentication: {
      required: false,
      type: 'none',
      bearerToken: { dynamic: false },
      basic: { username: '', password: '' },
      apiKey: { key: '', location: 'header', name: '' }
    }
  };
  envVarKeys.value = [];
  envVarValues.value = [];
  argsList.value = [];
  toolsList.value = [];
};

const addEnvVar = () => {
  envVarKeys.value.push('');
  envVarValues.value.push('');
};

const removeEnvVar = (index: number) => {
  envVarKeys.value.splice(index, 1);
  envVarValues.value.splice(index, 1);
};

// Arguments management
const addArg = () => {
  argsList.value.push('');
};

const removeArg = (index: number) => {
  argsList.value.splice(index, 1);
};

// Tools management
const addTool = () => {
  toolsList.value.push({ name: '', description: '', inputSchema: '' });
};

const removeTool = (index: number) => {
  toolsList.value.splice(index, 1);
};

const testConnection = async () => {
  if (!isValid.value) return;

  testing.value = true;
  error.value = '';
  testResult.value = null;

  try {
    const result = await MCPService.testAdapterConnection(adapterData.value);
    testResult.value = result;
    if (!result.success) {
      error.value = result.message;
    }
  } catch (err) {
    logger.error('Failed to test connection', err);
    testResult.value = { success: false, message: 'Connection test failed unexpectedly' };
    error.value = 'Connection test failed. Please check your configuration.';
  } finally {
    testing.value = false;
  }
};

const createAdapter = async () => {
  if (!isValid.value) return;

  creating.value = true;
  error.value = '';

  try {
    const adapter = await MCPService.createAdapter(adapterData.value);
    logger.info('Adapter created successfully', { data: { adapterName: adapterData.value.name } });

    // Fetch token information
    try {
      const tokenInfo = await MCPService.getAdapterToken(adapter.name || adapterData.value.name);
      creationResponse.value = {
        adapter,
        mcp_endpoint: `${API_BASE_URLS.MCP_GATEWAY.replace('/api/v1', '')}/adapters/${adapter.name || adapterData.value.name}`,
        message: 'Adapter created successfully',
        token_info: {
          token: tokenInfo.accessToken || tokenInfo.token,
          tokenType: tokenInfo.tokenType,
          expiresAt: tokenInfo.expiresAt
        }
      };
      showTokenModal.value = true;
    } catch (tokenErr) {
      logger.warn('Failed to fetch token info', tokenErr);
      // Still show success modal without token
      creationResponse.value = {
        adapter,
        mcp_endpoint: `${API_BASE_URLS.MCP_GATEWAY.replace('/api/v1', '')}/adapters/${adapter.name || adapterData.value.name}`,
        message: 'Adapter created successfully'
      };
      showTokenModal.value = true;
    }

    emit('adapterCreated');
    closeModal();
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

.args-list, .tools-builder {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.arg-item, .tool-item {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.arg-item {
  align-items: center;
}

.tool-item {
  flex-direction: column;
  padding: 12px;
  border: 1px solid var(--border, #d1d5db);
  border-radius: 4px;
  background: var(--accent-bg, #f9fafb);
}

.tool-header {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
}

.tool-header .form-control {
  flex: 1;
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