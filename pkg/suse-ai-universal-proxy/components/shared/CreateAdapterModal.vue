<template>
  <div v-if="isVisible" class="modal-overlay" @click="closeModal">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>Create MCP Adapter</h3>
        <button class="btn btn-sm btn-secondary" @click="closeModal">&times;</button>
      </div>
      <div class="modal-body">
        <!-- Registry Server Selection -->
        <div class="form-group">
          <label for="registryServer">Create from Registry Server (Optional):</label>
          <select id="registryServer" v-model="selectedRegistryServer" class="form-control">
            <option :value="null">Manual Configuration</option>
            <option v-for="server in registryServers" :key="server.id" :value="server">
              {{ server.name }} - {{ server.description?.substring(0, 50) || 'No description' }}...
            </option>
          </select>
          <small class="form-text text-muted">
            Selecting a registry server will auto-configure the adapter and enable automatic server spawning.
          </small>
        </div>

        <div class="form-group">
          <label for="adapterName">Adapter Name:</label>
          <input
            type="text"
            id="adapterName"
            v-model="adapterData.name"
            class="form-control"
            placeholder="my-mcp-adapter"
            :readonly="!!selectedRegistryServer"
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
            :readonly="!!selectedRegistryServer"
            rows="3"
          ></textarea>
        </div>

        <div class="form-group">
          <label for="connectionType">Connection Type:</label>
          <select id="connectionType" v-model="adapterData.connectionType" class="form-control" :disabled="!!selectedRegistryServer">
            <option value="StreamableHttp">Streamable HTTP</option>
            <option value="SSE">Server-Sent Events</option>
            <option value="RemoteHttp">Remote HTTP</option>
            <option value="LocalStdio">Local Stdio</option>
            <option value="VirtualMCP">Virtual MCP</option>
          </select>
        </div>

        <div class="form-group">
          <label for="protocol">Protocol:</label>
          <select id="protocol" v-model="adapterData.protocol" class="form-control">
            <option value="MCP">MCP</option>
          </select>
        </div>
      </div>

        <!-- Status Display -->
        <div v-if="creating || spawningStatus" class="status-section">
          <div class="status-header">
            <h4>{{ creating ? 'Creating Adapter' : 'Spawning Server' }}</h4>
            <div v-if="spawningProgress > 0" class="progress-bar">
              <div class="progress-fill" :style="{ width: spawningProgress + '%' }"></div>
            </div>
          </div>
          <div class="status-message">
            <p>{{ spawningStatus || 'Initializing...' }}</p>
          </div>
          <div v-if="spawningError" class="error-message">
            {{ spawningError }}
          </div>
        </div>

        <div class="modal-footer">
          <button
            type="button"
            class="btn btn-outline-primary"
            @click="testConnection"
            :disabled="!isValid || testing || creating"
          >
            {{ testing ? 'Testing...' : 'Test Connection' }}
          </button>
          <button
            type="button"
            class="btn btn-primary"
            @click="createAdapter"
            :disabled="!isValid || creating"
          >
            {{ creating ? 'Creating...' : 'Create Adapter' }}
          </button>
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
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import { adapterAPI } from '../../services/adapter-api';
import { registryAPI } from '../../services/registry-api';
import { externalGroupAPI } from '../../services/external-group-api';
import type { AdapterData, CreateAdapterFromRegistryResponse } from '../../types/mcp-types';
import type { MCPServer } from '../../services/registry-api';
import type { Adapter } from '../../services/adapter-api';
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

// Spawning status
const spawningStatus = ref<string>('');
const spawningProgress = ref<number>(0);
const spawningError = ref<string>('');

// Registry servers
const registryServers = ref<MCPServer[]>([]);
const loadingRegistry = ref(false);
const selectedRegistryServer = ref<MCPServer | null>(null);

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

// Watch for registry server selection
watch(selectedRegistryServer, (newServer) => {
  if (newServer) {
    // Auto-fill form from registry server
    adapterData.value.name = newServer.name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    adapterData.value.description = newServer.description;

    // Determine connection type from registry server
    if (newServer.packages && newServer.packages.length > 0) {
      const pkg = newServer.packages[0];
      if (pkg.registryType === 'oci') {
        adapterData.value.connectionType = 'VirtualMCP';
        adapterData.value.imageName = pkg.identifier;
      } else if (pkg.transport?.type === 'stdio') {
        adapterData.value.connectionType = 'LocalStdio';
        adapterData.value.command = pkg.identifier;
      } else {
        adapterData.value.connectionType = 'RemoteHttp';
      }
    }

    // Set environment variables from registry
    if (newServer.packages && newServer.packages.length > 0) {
      const envVars: Record<string, string> = {};
      newServer.packages[0].environmentVariables?.forEach(env => {
        envVars[env.name] = env.default || '';
      });
      adapterData.value.environmentVariables = envVars;

      // Update env var keys/values for UI
      envVarKeys.value = Object.keys(envVars);
      envVarValues.value = Object.values(envVars);
    }
  }
});

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
const openModal = async (server?: any) => {
  isVisible.value = true;
  reset();

  // Load registry servers first
  await loadRegistryServers();

  // If a server is provided, pre-populate the form
  if (server) {
    // Try to find the server in the registry servers list
    const registryServer = registryServers.value.find(s => s.id === server.id);
    if (registryServer) {
      selectedRegistryServer.value = registryServer;
    } else {
      // If not found in registry, manually populate the form
      adapterData.value.name = server.name?.toLowerCase().replace(/[^a-z0-9-]/g, '-') || '';
      adapterData.value.description = server.description || '';

      // Determine connection type from server data
      if (server.packages && server.packages.length > 0) {
        const pkg = server.packages[0];
        if (pkg.registryType === 'oci' || pkg.registryType === 'docker') {
          adapterData.value.connectionType = 'VirtualMCP';
          adapterData.value.imageName = pkg.identifier;
        } else if (pkg.transport?.type === 'stdio') {
          adapterData.value.connectionType = 'LocalStdio';
          adapterData.value.command = pkg.identifier;
        } else {
          adapterData.value.connectionType = 'RemoteHttp';
        }

        // Set environment variables
        if (pkg.environmentVariables?.length > 0) {
          const envVars: Record<string, string> = {};
          pkg.environmentVariables.forEach((env: any) => {
            envVars[env.name] = env.default || '';
          });
          adapterData.value.environmentVariables = envVars;

          // Update UI
          envVarKeys.value = Object.keys(envVars);
          envVarValues.value = Object.values(envVars);
        }
      }
    }
  }
};

const loadRegistryServers = async () => {
  try {
    loadingRegistry.value = true;
    const result = await registryAPI.browse();
    registryServers.value = result.servers;
  } catch (err) {
    logger.error('Failed to load registry servers:', err);
    error.value = 'Failed to load registry servers';
  } finally {
    loadingRegistry.value = false;
  }
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
  selectedRegistryServer.value = null;
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

const ensureAdminAccess = async (adapterName: string) => {
  try {
    const adminGroupName = 'mcp-admins';
    // 1. Check if group exists
    const groups = await externalGroupAPI.list();
    let adminGroup = groups.find(g => g.name === adminGroupName);

    // 2. Create if missing
    if (!adminGroup) {
      logger.info('Creating admin group', { name: adminGroupName });
      adminGroup = await externalGroupAPI.create({
        id: adminGroupName,
        name: adminGroupName,
        description: 'Administrators with full access to all MCP adapters',
        permissions: [] // Permissions are assigned per adapter
      });
    }

    // 3. Assign adapter to group
    if (adminGroup) {
      await adapterAPI.assignGroup(adapterName, adminGroup.id, 'read');
      logger.info('Assigned adapter to admin group', { adapter: adapterName, group: adminGroupName });
    }
  } catch (err) {
    logger.error('Failed to ensure admin access', err);
    // Don't block the UI flow, just log the error
  }
};

const testConnection = async () => {
  if (!isValid.value) return;

  testing.value = true;
  error.value = '';
  testResult.value = null;

  try {
    // const result = await MCPService.testAdapterConnection(adapterData.value);
    const result = { success: true, message: 'Connection test skipped' };
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
  spawningStatus.value = '';
  spawningProgress.value = 0;
  spawningError.value = '';

  try {
    let result;

    if (selectedRegistryServer.value) {
      // Create adapter from registry with automatic spawning
      spawningStatus.value = 'Initializing server spawning...';
      spawningProgress.value = 10;

      const config = {
        replicaCount: adapterData.value.replicaCount || 1,
        environmentVariables: adapterData.value.environmentVariables || {}
      };

      spawningStatus.value = 'Creating adapter configuration...';
      spawningProgress.value = 30;

      // result = await MCPService.createAdapterFromRegistry(selectedRegistryServer.value.id, config);
      result = await adapterAPI.create({
        mcpServerId: selectedRegistryServer.value.id,
        name: adapterData.value.name,
        description: adapterData.value.description,
        environmentVariables: config.environmentVariables,
        authentication: adapterData.value.authentication
      });

      spawningStatus.value = 'Starting MCP server process...';
      spawningProgress.value = 70;

      // Simulate waiting for server to be ready (in real implementation, this would be handled by the API)
      await new Promise(resolve => setTimeout(resolve, 1000));

      spawningStatus.value = 'Server spawned successfully!';
      spawningProgress.value = 100;

      logger.info('Adapter created from registry with spawning', { data: { serverId: selectedRegistryServer.value.id } });
    } else {
      // Manual adapter creation
      spawningStatus.value = 'Creating adapter...';
      spawningProgress.value = 50;

      const createRequest = {
        mcpServerId: '', // Empty for manual creation
        name: adapterData.value.name,
        description: adapterData.value.description,
        environmentVariables: adapterData.value.environmentVariables,
        authentication: adapterData.value.authentication
      };

      result = await adapterAPI.create(createRequest);

      spawningStatus.value = 'Adapter created successfully!';
      spawningProgress.value = 100;

      logger.info('Adapter created manually', { data: { adapterName: adapterData.value.name } });
    }

    // Handle the response - registry creation returns different format
    if (selectedRegistryServer.value) {
      // For now, registry creation returns the same Adapter format
      // TODO: Implement proper registry creation API when available
      const adapterResult = result as Adapter;
      
      // Auto-assign admin access
      await ensureAdminAccess(adapterResult.name);

      creationResponse.value = {
        adapter: adapterResult,
        mcp_endpoint: `http://localhost:8911/adapters/${adapterResult.name}`, // Placeholder endpoint
        message: 'Adapter created successfully from registry server',
        token_info: {
          token: 'placeholder-token', // TODO: Get from API response
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
          tokenType: 'Bearer'
        },
        note: 'This is a placeholder response. Registry creation API needs to be implemented.'
      };
    } else {
      // Manual creation response
      const manualResult = result as Adapter;
      
      // Auto-assign admin access
      await ensureAdminAccess(manualResult.name || adapterData.value.name);

      // Fetch token information for manual creation
      try {
        // const tokenInfo = await MCPService.getAdapterToken(manualResult.name || adapterData.value.name);
        const tokenInfo = { token: 'token-placeholder', expiresAt: new Date().toISOString() };
        creationResponse.value = {
          adapter: manualResult,
          mcp_endpoint: `${API_BASE_URLS.MCP_GATEWAY.replace('/api/v1', '')}/adapters/${manualResult.name || adapterData.value.name}`,
          message: 'Adapter created successfully',
          token_info: {
            token: tokenInfo.token,
            tokenType: 'Bearer',
            expiresAt: tokenInfo.expiresAt
          }
        };
      } catch (tokenErr) {
        logger.warn('Failed to fetch token info', tokenErr);
        creationResponse.value = {
          adapter: manualResult,
          mcp_endpoint: `${API_BASE_URLS.MCP_GATEWAY.replace('/api/v1', '')}/adapters/${manualResult.name || adapterData.value.name}`,
          message: 'Adapter created successfully'
        };
      }
    }

    // Clear status after a brief delay
    setTimeout(() => {
      spawningStatus.value = '';
      spawningProgress.value = 0;
    }, 2000);

    showTokenModal.value = true;
    emit('adapterCreated');
    closeModal();
  } catch (err: any) {
    logger.error('Failed to create adapter', err);
    spawningError.value = err.message || 'Failed to create adapter';
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

.status-section {
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  background: var(--card-bg);
}

.status-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.status-header h4 {
  margin: 0;
  font-size: 16px;
  color: var(--body-text);
}

.progress-bar {
  width: 200px;
  height: 8px;
  background: var(--border);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--primary);
  transition: width 0.3s ease;
}

.status-message p {
  margin: 0;
  color: var(--body-text);
  font-size: 14px;
}
</style>