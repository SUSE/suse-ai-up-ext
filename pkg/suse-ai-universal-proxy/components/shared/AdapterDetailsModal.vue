<template>
  <div v-if="props.show" class="modal-overlay" @click="closeModal">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>Adapter Details: {{ adapter?.name }}</h3>
        <button class="btn btn-sm btn-secondary" @click="closeModal">&times;</button>
      </div>
      <div class="modal-body">
        <div v-if="adapter" class="adapter-details">
          <!-- MCP URL Section -->
          <div class="detail-section mcp-url-section">
            <h4>
              <i class="icon icon-globe"></i>
              MCP Connection URL
            </h4>
            <div class="url-input-group">
              <input 
                :value="mcpUrl" 
                readonly 
                class="form-control url-input"
                @click="selectText"
              />
              <button 
                class="btn btn-sm btn-primary copy-btn"
                @click="copyToClipboard(mcpUrl, 'MCP URL')"
                :disabled="copying"
              >
                <i class="icon icon-copy" v-if="!copiedField"></i>
                <i class="icon icon-check" v-else></i>
                {{ copiedField === 'MCP URL' ? 'Copied!' : 'Copy' }}
              </button>
            </div>
            <div class="form-help">
              Use this URL to connect your MCP client to this adapter
            </div>
          </div>

           <!-- Authentication Token Section -->
           <div class="detail-section token-section">
             <h4>
               <i class="icon icon-lock"></i>
               Authentication Token
             </h4>
             <div class="token-input-group">
               <input
                 :value="token"
                 :type="showToken ? 'text' : 'password'"
                 readonly
                 class="form-control token-input"
                 @click="selectText"
               />
               <button
                 class="btn btn-sm btn-secondary toggle-btn"
                 @click="toggleTokenVisibility"
               >
                 <i :class="showToken ? 'icon icon-eye-slash' : 'icon icon-eye'"></i>
                 {{ showToken ? 'Hide' : 'Show' }}
               </button>
               <button
                 class="btn btn-sm btn-primary copy-btn"
                 @click="copyToClipboard(token, 'Token')"
                 :disabled="copying"
               >
                 <i class="icon icon-copy" v-if="!copiedField"></i>
                 <i class="icon icon-check" v-else></i>
                 {{ copiedField === 'Token' ? 'Copied!' : 'Copy' }}
               </button>
             </div>
             <div class="form-help">
               Include this token in your MCP client authentication headers
             </div>
           </div>

           <!-- Client Configuration Section -->
           <div class="detail-section client-config-section">
             <h4>
               <i class="icon icon-settings"></i>
               Client Configuration
             </h4>
             <p class="section-description">
               Copy and paste these configurations into your preferred MCP client.
             </p>
             <div class="client-config-buttons">
               <button
                 class="btn btn-sm btn-outline-primary client-config-btn"
                 @click="showClientConfig('google-gemini')"
                 :disabled="!hasGeminiConfig"
               >
                 <i class="icon icon-copy"></i>
                 Google Gemini Config
               </button>
               <button
                 class="btn btn-sm btn-outline-primary client-config-btn"
                 @click="showClientConfig('vscode')"
                 :disabled="!hasVSCodeConfig"
               >
                 <i class="icon icon-copy"></i>
                 VSCode Config
               </button>
             </div>
           </div>

          <!-- General Information -->
          <div class="detail-section">
            <h4>
              <i class="icon icon-info"></i>
              General Information
            </h4>
            <div class="info-grid">
              <div class="info-item">
                <label>Name:</label>
                <span>{{ adapter.name }}</span>
              </div>
              <div class="info-item">
                <label>Status:</label>
                <span :class="getStatusClass(adapter.status)">
                  {{ getStatusLabel(adapter.status) }}
                </span>
              </div>
              <div class="info-item">
                <label>Protocol:</label>
                <span>{{ adapter.protocol || 'MCP' }}</span>
              </div>
              <div class="info-item">
                <label>Endpoint:</label>
                <span>{{ adapter.endpoint || '-' }}</span>
              </div>
              <div class="info-item">
                <label>Connection Type:</label>
                <span>{{ adapter.connectionType || 'N/A' }}</span>
              </div>
              <div class="info-item">
                <label>Replicas:</label>
                <span>{{ adapter.replicaCount || 0 }}</span>
              </div>
            </div>
          </div>

          <!-- Container Information -->
          <div class="detail-section">
            <h4>
              <i class="icon icon-cube"></i>
              Container Information
            </h4>
            <div class="info-grid">
              <div class="info-item">
                <label>Image:</label>
                <span>{{ adapter.imageName || 'N/A' }}</span>
              </div>
              <div class="info-item">
                <label>Version:</label>
                <span>{{ adapter.imageVersion || 'N/A' }}</span>
              </div>
              <div class="info-item">
                <label>Workload Identity:</label>
                <span>{{ adapter.useWorkloadIdentity ? 'Enabled' : 'Disabled' }}</span>
              </div>
            </div>
          </div>

          <!-- Activity Information -->
          <div class="detail-section">
            <h4>
              <i class="icon icon-activity"></i>
              Activity Information
            </h4>
            <div class="info-grid">
              <div class="info-item">
                <label>Errors:</label>
                <span class="error-count">{{ adapter.errorCount || 0 }}</span>
              </div>
              <div class="info-item">
                <label>Requests:</label>
                <span>{{ adapter.requestCount || 0 }}</span>
              </div>
              <div class="info-item">
                <label>Last Active:</label>
                <span>{{ adapter.lastActive ? new Date(adapter.lastActive).toLocaleString() : 'Never' }}</span>
              </div>
              <div class="info-item">
                <label>Created:</label>
                <span>{{ adapter.createdAt ? new Date(adapter.createdAt).toLocaleString() : 'Unknown' }}</span>
              </div>
              <div class="info-item">
                <label>Last Updated:</label>
                <span>{{ adapter.lastUpdatedAt ? new Date(adapter.lastUpdatedAt).toLocaleString() : 'Unknown' }}</span>
              </div>
            </div>
          </div>

          <!-- Description -->
          <div class="detail-section" v-if="adapter.description">
            <h4>
              <i class="icon icon-file-text"></i>
              Description
            </h4>
            <p class="description">{{ adapter.description }}</p>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" @click="closeModal">Close</button>
      </div>
    </div>
  </div>

  <!-- Client Configuration Modal -->
  <div v-if="showClientConfigModal" class="modal-overlay" @click="closeClientConfigModal">
    <div class="modal-content client-config-modal" @click.stop>
      <div class="modal-header">
        <h3>
          <i class="icon icon-settings"></i>
          {{ selectedClientConfig === 'google-gemini' ? 'Google Gemini' : 'VSCode' }} MCP Configuration
        </h3>
        <button class="btn btn-sm btn-secondary" @click="closeClientConfigModal">&times;</button>
      </div>
      <div class="modal-body">
        <div class="config-instructions">
          <p><strong>Instructions:</strong> Copy the configuration below and use it in your {{ selectedClientConfig === 'google-gemini' ? 'Google Gemini' : 'VSCode' }} MCP client settings.</p>
        </div>
        <div class="config-display">
          <pre class="config-json">{{ getClientConfig(selectedClientConfig) }}</pre>
        </div>
      </div>
      <div class="modal-footer">
        <button
          class="btn btn-primary"
          @click="copyClientConfig(selectedClientConfig)"
          :disabled="copying"
        >
          <i class="icon icon-copy" v-if="!copiedField || !copiedField.includes(selectedClientConfig)"></i>
          <i class="icon icon-check" v-else></i>
          {{ copiedField === `${selectedClientConfig}-config` ? 'Copied!' : 'Copy Configuration' }}
        </button>
        <button class="btn btn-secondary" @click="closeClientConfigModal">Close</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useStore } from 'vuex';
import type { AdapterResource } from '../../types/mcp-types';
import { API_BASE_URLS } from '../../config/api-config';

interface Props {
  show: boolean;
  adapterData: any;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  close: [];
}>();

const store = useStore();
const adapter = ref<AdapterResource | null>(null);
const showToken = ref(false);
const copying = ref(false);
const copiedField = ref<string | null>(null);
const showClientConfigModal = ref(false);
const selectedClientConfig = ref<string>('');

// Watch for adapter data changes
watch(() => props.adapterData, (newAdapter) => {
  console.log('AdapterDetailsModal adapterData changed:', newAdapter);
  adapter.value = newAdapter;
}, { immediate: true });

// Get public IP from store
const publicIp = computed(() => {
  const availableClusters = store.getters['suseai/availableClusters'];
  if (availableClusters && availableClusters.length > 0) {
    // Return the primaryIP of the first cluster/service
    return availableClusters[0].primaryIP;
  }
  return null;
});

// Generate MCP URL
const mcpUrl = computed(() => {
  if (!adapter.value?.name) return '';
  
  let baseUrl = API_BASE_URLS.MCP_GATEWAY;
  
  // Prefer public IP if available for external clients
  if (publicIp.value) {
    // Assuming HTTP for direct IP access to avoid cert errors, unless HTTPS is enforced globally
    // We use port 8911 as standardized
    baseUrl = `http://${publicIp.value}:8911`;
  }
  
  const url = `${baseUrl}/api/v1/adapters/${adapter.value.name}/mcp`;
  console.log('AdapterDetailsModal mcpUrl:', url, 'PublicIP:', publicIp.value, 'ProxyURL:', API_BASE_URLS.MCP_GATEWAY);
  return url;
});

// Extract token from authentication object in API response
const token = computed(() => {
  return adapter.value?.authentication?.bearerToken?.token || '';
});

// Check if client configs are available
const hasGeminiConfig = computed(() => {
  const hasGemini = !!(adapter.value?.mcpClientConfig?.gemini);
  const hasMcpServers = !!(adapter.value?.mcpClientConfig?.mcpServers);
  const hasConfig = hasGemini || hasMcpServers;
  console.log('AdapterDetailsModal hasGeminiConfig:', hasConfig, 'hasGemini:', hasGemini, 'hasMcpServers:', hasMcpServers, 'mcpClientConfig:', adapter.value?.mcpClientConfig);
  return hasConfig;
});

const hasVSCodeConfig = computed(() => {
  const hasVSCode = !!(adapter.value?.mcpClientConfig?.vscode);
  const hasMcpServers = !!(adapter.value?.mcpClientConfig?.mcpServers);
  const hasConfig = hasVSCode || hasMcpServers;
  console.log('AdapterDetailsModal hasVSCodeConfig:', hasConfig, 'hasVSCode:', hasVSCode, 'hasMcpServers:', hasMcpServers, 'mcpClientConfig:', adapter.value?.mcpClientConfig);
  return hasConfig;
});

const closeModal = () => {
  emit('close');
  resetState();
  setTimeout(() => {
    adapter.value = null;
  }, 300);
};

const resetState = () => {
  showToken.value = false;
  copying.value = false;
  copiedField.value = null;
};

const toggleTokenVisibility = () => {
  showToken.value = !showToken.value;
};

const selectText = (event: Event) => {
  const target = event.target as HTMLInputElement;
  target.select();
};

const copyToClipboard = async (text: string, fieldName: string) => {
  if (copying.value) return;
  
  try {
    copying.value = true;
    await navigator.clipboard.writeText(text);
    copiedField.value = fieldName;
    
    // Reset copied state after 2 seconds
    setTimeout(() => {
      copiedField.value = null;
    }, 2000);
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    copiedField.value = fieldName;
    
    setTimeout(() => {
      copiedField.value = null;
    }, 2000);
  } finally {
    copying.value = false;
  }
};

const getStatusClass = (status?: string) => {
  switch (status) {
    case 'active':
    case 'healthy':
      return 'status-active';
    case 'error':
    case 'failed':
      return 'status-error';
    default:
      return 'status-inactive';
  }
};

const getStatusLabel = (status?: string) => {
  switch (status) {
    case 'active':
    case 'healthy':
      return 'Active';
    case 'error':
    case 'failed':
      return 'Error';
    default:
      return status || 'Unknown';
  }
};

const showClientConfig = async (clientType: string) => {
  let hasConfig = false;
  switch (clientType) {
    case 'google-gemini':
      hasConfig = hasGeminiConfig.value;
      break;
    case 'vscode':
      hasConfig = hasVSCodeConfig.value;
      break;
  }

  if (!hasConfig) return;

  selectedClientConfig.value = clientType;
  showClientConfigModal.value = true;
};

const closeClientConfigModal = () => {
  showClientConfigModal.value = false;
  selectedClientConfig.value = '';
};

const getClientConfig = (clientType: string): string => {
  if (!adapter.value?.mcpClientConfig) return '';

  let clientConfig;

  // Check if new structure exists (gemini/vscode properties)
  if (adapter.value.mcpClientConfig.gemini || adapter.value.mcpClientConfig.vscode) {
    switch (clientType) {
      case 'google-gemini':
        clientConfig = adapter.value.mcpClientConfig.gemini;
        break;
      case 'vscode':
        clientConfig = adapter.value.mcpClientConfig.vscode;
        break;
      default:
        return '';
    }
  }
  // Fall back to old structure (mcpServers) - transform for each client
  else if (adapter.value.mcpClientConfig.mcpServers) {
    const adapterName = adapter.value.name;
    const mcpServer = (adapter.value.mcpClientConfig as any).mcpServers[adapterName];

    if (!mcpServer) return '';

    switch (clientType) {
      case 'google-gemini':
        clientConfig = {
          mcpServers: {
            [adapterName]: {
              headers: mcpServer.headers,
              httpUrl: mcpUrl.value // Use the computed public URL
            }
          }
        };
        break;
      case 'vscode':
        clientConfig = {
          inputs: [],
          servers: {
            [adapterName]: {
              headers: mcpServer.headers,
              type: 'http',
              url: mcpUrl.value // Use the computed public URL
            }
          }
        };
        break;
      default:
        return '';
    }
  }

  if (!clientConfig) return '';

  return JSON.stringify(clientConfig, null, 2);
};

const copyClientConfig = async (clientType: string) => {
  const config = getClientConfig(clientType);
  if (!config) return;

  try {
    copying.value = true;
    await navigator.clipboard.writeText(config);
    copiedField.value = `${clientType}-config`;

    setTimeout(() => {
      copiedField.value = null;
    }, 2000);
  } catch (err) {
    console.error('Failed to copy client config:', err);
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = config;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    copiedField.value = `${clientType}-config`;

    setTimeout(() => {
      copiedField.value = null;
    }, 2000);
  } finally {
    copying.value = false;
  }
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
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  max-width: 800px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  animation: modalSlideIn 0.3s ease-out;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 24px 16px;
  border-bottom: 1px solid var(--border, #e5e7eb);
}

.modal-header h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--body-text, #111827);
}

.modal-body {
  padding: 16px 24px;
  max-height: 60vh;
  overflow-y: auto;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px 24px;
  border-top: 1px solid var(--border, #e5e7eb);
  background: var(--accent-bg, #f9fafb);
}

.detail-section {
  margin-bottom: 24px;
  padding: 20px;
  background: var(--card-bg, #ffffff);
  border: 1px solid var(--border, #e5e7eb);
  border-radius: 8px;
  transition: box-shadow 0.2s ease;
}

.detail-section:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.detail-section h4 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--body-text, #111827);
  display: flex;
  align-items: center;
  gap: 8px;
}

.detail-section h4 i {
  color: var(--primary, #2563eb);
}

.mcp-url-section {
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  border-color: var(--primary, #2563eb);
}

.token-section {
  background: linear-gradient(135deg, #fefce8 0%, #fef3c7 100%);
  border-color: var(--warning, #f59e0b);
}

.url-input-group,
.token-input-group {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
}

.url-input,
.token-input {
  flex: 1;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
  background: var(--input-bg, #ffffff);
}

.copy-btn,
.toggle-btn {
  white-space: nowrap;
  min-width: 80px;
}

.copy-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 12px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--border-light, #f3f4f6);
}

.info-item:last-child {
  border-bottom: none;
}

.info-item label {
  font-weight: 500;
  color: var(--muted, #6b7280);
  font-size: 14px;
}

.info-item span {
  color: var(--body-text, #111827);
  font-size: 14px;
  text-align: right;
  word-break: break-all;
}

.error-count {
  color: var(--error, #dc2626);
  font-weight: 600;
}

.status-active {
  color: var(--success, #16a34a);
  font-weight: 600;
}

.status-error {
  color: var(--error, #dc2626);
  font-weight: 600;
}

.status-inactive {
  color: var(--muted, #6b7280);
  font-weight: 500;
}

.description {
  margin: 0;
  line-height: 1.6;
  color: var(--body-text, #111827);
  background: var(--accent-bg, #f9fafb);
  padding: 12px;
  border-radius: 6px;
  border-left: 4px solid var(--primary, #2563eb);
}

.form-help {
  font-size: 12px;
  color: var(--muted, #6b7280);
  margin-top: 4px;
  font-style: italic;
}

.btn {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--primary, #2563eb);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-hover, #1d4ed8);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(37, 99, 235, 0.2);
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
  padding: 6px 12px;
  font-size: 13px;
}

.form-control {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border, #d1d5db);
  border-radius: 6px;
  font-size: 14px;
  transition: all 0.2s ease;
}

.form-control:focus {
  outline: none;
  border-color: var(--primary, #2563eb);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.form-control:read-only {
  background: var(--input-bg, #f9fafb);
  cursor: pointer;
}

.form-control:read-only:hover {
  background: var(--accent-bg, #f3f4f6);
}

.client-config-section {
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  border-color: var(--info, #0ea5e9);
}

.client-config-buttons {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.client-config-btn {
  border: 1px solid var(--primary, #2563eb);
  color: var(--primary, #2563eb);
  background: transparent;
  transition: all 0.2s ease;
}

.client-config-btn:hover:not(:disabled) {
  background: var(--primary, #2563eb);
  color: white;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(37, 99, 235, 0.2);
}

.client-config-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.client-config-modal {
  max-width: 700px;
  width: 90%;
}

.config-instructions {
  margin-bottom: 16px;
  padding: 12px;
  background: var(--accent-bg, #f9fafb);
  border-radius: 6px;
  border-left: 4px solid var(--primary, #2563eb);
}

.config-instructions p {
  margin: 0;
  font-size: 14px;
  color: var(--body-text, #111827);
}

.config-display {
  background: var(--input-bg, #ffffff);
  border: 1px solid var(--border, #d1d5db);
  border-radius: 8px;
  overflow: hidden;
}

.config-json {
  margin: 0;
  padding: 16px;
  background: var(--input-bg, #f9fafb);
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
  line-height: 1.4;
  color: var(--body-text, #111827);
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 400px;
  overflow-y: auto;
}

/* Responsive design */
@media (max-width: 768px) {
  .modal-content {
    width: 95%;
    max-height: 95vh;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }

  .url-input-group,
  .token-input-group {
    flex-direction: column;
    align-items: stretch;
  }

  .copy-btn,
  .toggle-btn {
    width: 100%;
  }

  .client-config-buttons {
    flex-direction: column;
  }

  .client-config-btn {
    width: 100%;
  }
}
</style>