<template>
  <div class="virtual-mcp-page">
    <ExperimentalBanner />

    <!-- Service not enabled message -->
    <div v-if="!proxyInstalled" class="blank-page">
      <div class="empty-state">
        <h3>This service is not enabled</h3>
        <p>Please enable it from the service selection page.</p>
      </div>
    </div>

    <!-- Main Content -->
    <div v-else class="main-content">
      <div class="page-header-container mb-30">
        <div class="header-info">
          <h1>Virtual MCP Aggregators</h1>
          <p>Combine multiple MCP adapters into a single, unified endpoint.</p>
          <button v-if="virtualAdapters.length > 0" class="btn btn-primary mt-15" @click="showCreateModal = true">
            <i class="icon icon-plus mr-5"></i>
            Create Aggregator
          </button>
        </div>
      </div>

      <div v-if="loading && virtualAdapters.length === 0" class="loading-state">
        <div class="spinner"></div>
        <p>Loading aggregators...</p>
      </div>

      <div v-else-if="virtualAdapters.length === 0" class="empty-aggregators">
        <div class="empty-icon">
          <i class="icon icon-merge"></i>
        </div>
        <h3>No Aggregators Found</h3>
        <p>Create your first virtual MCP aggregator by selecting existing adapters.</p>
        <button class="btn btn-outline mt-10" @click="showCreateModal = true">
          Get Started
        </button>
      </div>

      <div v-else class="aggregators-section">
        <table class="aggregators-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th>Aggregated Adapters</th>
              <th>Capabilities</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="adapter in sortedVirtualAdapters" :key="adapter.id">
              <td class="name-cell"><strong>{{ adapter.name }}</strong></td>
              <td>
                <span class="status-badge ready">Ready</span>
              </td>
              <td>
                <div class="source-adapters-list">
                  <span v-for="sourceId in getSources(adapter)" :key="sourceId" class="source-badge">
                    {{ getSourceName(sourceId) }}
                  </span>
                  <span v-if="!getSources(adapter).length" class="text-muted italic">None</span>
                </div>
              </td>
              <td>
                <div class="caps-summary">
                  <span class="cap-item">{{ getAggregatedCapabilities(adapter).tools }} tools</span>
                  <span class="cap-divider">|</span>
                  <span class="cap-item">{{ getAggregatedCapabilities(adapter).resources }} resources</span>
                </div>
              </td>
              <td>
                <div class="action-buttons">
                  <button class="btn btn-sm btn-primary action-btn" @click="viewDetails(adapter)" title="View Details">
                    <i class="icon icon-info"></i>
                  </button>
                  <button class="btn btn-sm btn-danger-link action-btn" @click="confirmDelete(adapter)" title="Delete">
                    <i class="icon icon-trash"></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Create Aggregator Modal -->
    <CreateVirtualAdapterModal
      :show="showCreateModal"
      :available-adapters="sourceableAdapters"
      :is-creating="loading"
      :creation-error="error"
      @close="showCreateModal = false"
      @create="handleCreateAggregator"
    />

    <!-- Token Modal -->
    <TokenEndpointDisplayModal
      v-if="selectedAdapter && showTokenModal"
      ref="tokenModal"
      :creation-response="selectedAdapter.creationResponse"
      :adapter-name="selectedAdapter.name"
      :show="showTokenModal"
      :title="`Aggregator Details: ${selectedAdapter.name}`"
      :hide-success="true"
      @close="showTokenModal = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useStore } from 'vuex';
import { ExperimentalBanner } from '../components/MCPGateway';
import { useAdapters } from '../composables/useAdapters';
import CreateVirtualAdapterModal from '../components/VirtualMCP/CreateVirtualAdapterModal.vue';
import TokenEndpointDisplayModal from '../components/shared/TokenEndpointDisplayModal.vue';

const store = useStore();
const { 
  loading, 
  error, 
  loadAdapters, 
  createAdapter, 
  deleteAdapter,
  getUserConfig,
  virtualAdapters, 
  sourceableAdapters,
  adapters
} = useAdapters();

const sortedVirtualAdapters = computed(() => 
  [...virtualAdapters.value].sort((a, b) => (a.name || '').localeCompare(b.name || ''))
);

const proxyInstalled = computed(() => store.state.suseai.settings.proxyInstalled);

const adapterNameMap = computed(() => {
  const map: Record<string, string> = {};
  adapters.value.forEach(a => {
    map[a.id] = a.name;
    map[a.name] = a.name;
  });
  return map;
});

const getSourceName = (id: string) => {
  return adapterNameMap.value[id] || id;
};

const getSources = (adapter: any): string[] => {
  return adapter.sourceAdapters || adapter.source_adapters || adapter.config?.sourceAdapters || [];
};

const getAggregatedCapabilities = (adapter: any) => {
  const sources = getSources(adapter);
  
  // If the virtual adapter already has tools/resources count in capabilities, use it
  if (adapter.capabilities?.tools?.length || adapter.capabilities?.resources?.length) {
    return {
      tools: adapter.capabilities.tools?.length || 0,
      resources: adapter.capabilities.resources?.length || 0
    };
  }

  // Otherwise, sum them up from the known adapters
  let totalTools = 0;
  let totalResources = 0;

  sources.forEach(sourceId => {
    const source = adapters.value.find(a => a.id === sourceId || a.name === sourceId);
    if (source && source.capabilities) {
      totalTools += source.capabilities.tools?.length || 0;
      totalResources += source.capabilities.resources?.length || 0;
    }
  });

  return {
    tools: totalTools,
    resources: totalResources
  };
};

// Get public IP from store
const publicIp = computed(() => {
  const availableClusters = store.getters['suseai/availableClusters'];
  if (availableClusters && availableClusters.length > 0) {
    return availableClusters[0].primaryIP;
  }
  return null;
});

const getUnifiedRoute = (adapter: any) => {
  if (adapter.mcpClientConfig?.gemini?.mcpServers?.[adapter.id]?.httpUrl) {
    return adapter.mcpClientConfig.gemini.mcpServers[adapter.id].httpUrl;
  }
  
  let baseUrl = window.location.origin;
  if (publicIp.value) {
    baseUrl = `http://${publicIp.value}:8911`;
  }
  return `${baseUrl}/api/v1/mcp/${adapter.id}`;
};

const showCreateModal = ref(false);
const showTokenModal = ref(false);
const selectedAdapter = ref<any>(null);

onMounted(async () => {
  await loadAdapters();
});

const handleCreateAggregator = async (data: { name: string, sourceAdapters: string[] }) => {
  const result = await createAdapter({
    name: data.name,
    connectionType: 'Virtual',
    sourceAdapters: data.sourceAdapters,
    authentication: { type: 'bearer', required: true }
  });

  if (result) {
    showCreateModal.value = false;
    loadAdapters();
  }
};

const viewDetails = async (adapter: any) => {
  const userConfig = await getUserConfig();
  if (userConfig && userConfig.mcpServers && userConfig.mcpServers[adapter.id]) {
    const serverConfig = userConfig.mcpServers[adapter.id];
    const userToken = serverConfig.headers?.Authorization?.replace('Bearer ', '');
    
    selectedAdapter.value = {
      ...adapter,
      adapter: adapter,
      creationResponse: {
        mcp_endpoint: serverConfig.httpUrl,
        token_info: {
          token: userToken,
          tokenType: 'Bearer',
          expiresAt: 'N/A'
        }
      }
    };
  } else {
    // Fallback using adapter name and public IP
    selectedAdapter.value = {
      ...adapter,
      adapter: adapter,
      creationResponse: {
        mcp_endpoint: getUnifiedRoute(adapter),
        token_info: {
          token: 'TOKEN_REQUIRED',
          tokenType: 'Bearer',
          expiresAt: 'N/A'
        },
        note: 'Please ensure you have generated a token for this adapter.'
      }
    };
  }
  showTokenModal.value = true;
};

const confirmDelete = async (adapter: any) => {
  if (confirm(`Are you sure you want to delete the aggregator "${adapter.name}"?`)) {
    await deleteAdapter(adapter.id);
  }
};
</script>

<style scoped>
.virtual-mcp-page {
  padding: 0;
  min-height: calc(100vh - 64px);
  background: var(--body-bg);
}

.main-content {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header-container {
  margin-bottom: 32px;
}

.header-info h1 {
  margin: 0 0 8px 0;
  font-size: 24px;
  color: var(--body-text);
  font-weight: 600;
}

.header-info p {
  margin: 0;
  color: var(--muted);
}

/* Empty State */
.empty-aggregators {
  text-align: center;
  padding: 60px 24px;
  background: var(--card-bg, white);
  border: 1px dashed var(--border);
  border-radius: 12px;
  margin-top: 40px;
}

.empty-icon {
  font-size: 64px;
  color: var(--muted);
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-aggregators h3 {
  margin: 0 0 12px 0;
  font-size: 20px;
  color: var(--body-text);
}

.empty-aggregators p {
  color: var(--muted);
  max-width: 400px;
  margin: 0 auto;
}

/* Aggregators Table */
.aggregators-section {
  margin-top: 20px;
}

.aggregators-table {
  width: 100%;
  border-collapse: collapse;
  background: var(--card-bg, #ffffff);
  border: 1px solid var(--border, #e5e7eb);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.aggregators-table th,
.aggregators-table td {
  padding: 8px 16px;
  text-align: left;
  border-bottom: 1px solid var(--border, #e5e7eb);
  vertical-align: middle;
}

.aggregators-table th {
  background: var(--accent-bg, #f9fafb);
  font-weight: 600;
  color: var(--body-text, #111827);
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.aggregators-table tbody tr:hover {
  background: var(--accent-bg, #f9fafb);
}

.name-cell {
  font-weight: 600;
  color: var(--body-text);
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.action-btn {
  padding: 4px 8px;
  min-height: unset;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.status-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 600;
  text-transform: uppercase;
  width: fit-content;
  display: inline-block;
}

.status-badge.ready {
  background: #e6fffa;
  color: #0b3835;
  border: 1px solid rgba(11, 56, 53, 0.1);
}

.source-adapters-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.source-badge {
  background: #edf2ff;
  color: #364fc7;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  border: 1px solid rgba(54, 79, 199, 0.1);
}

.caps-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--body-text);
}

.cap-divider {
  color: var(--border);
  font-weight: 300;
}


@media (max-width: 1400px) {
  .aggregators-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 1000px) {
  .aggregators-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 700px) {
  .aggregators-grid {
    grid-template-columns: 1fr;
  }
}

.aggregator-card {
  background: var(--card-bg, white);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  transition: transform 0.2s, box-shadow 0.2s;
  min-height: 160px;
}

.aggregator-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-light, #f1f3f5);
}

.header-title {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.header-actions {
  display: flex;
  gap: 4px;
  align-items: center;
}

.action-btn {
  padding: 4px 8px;
  min-height: unset;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.header-title h3 {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 160px;
}

.status-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 600;
  text-transform: uppercase;
  width: fit-content;
}

.status-badge.ready {
  background: #e6fffa;
  color: #0b3835;
}

.card-body {
  flex: 1;
}

.info-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-row label {
  font-size: 12px;
  font-weight: 600;
  color: var(--muted);
  text-transform: uppercase;
}

.source-adapters-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.source-badge {
  background: #edf2ff;
  color: #364fc7;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.caps-summary {
  display: flex;
  gap: 16px;
}

.cap-item {
  font-size: 14px;
  color: var(--body-text);
}

.loading-state {
  text-align: center;
  padding: 100px 0;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--border);
  border-top: 4px solid var(--primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

.btn-danger-link {
  background: none;
  border: none;
  color: var(--error, #dc3545);
  cursor: pointer;
  padding: 4px;
  opacity: 0.6;
  transition: opacity 0.2s;
}

.btn-danger-link:hover {
  opacity: 1;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Blank Page Styling (for disabled state) */
.blank-page {
  text-align: center;
  padding: 100px 24px;
}

.empty-state h3 {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 12px;
}

.empty-state p {
  color: var(--muted);
  font-size: 16px;
}

/* Standard Button Styles */
.btn {
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  display: inline-flex;
  align-items: center;
}

.btn-primary {
  background: var(--primary);
  color: white;
}

.btn-outline {
  background: none;
  border: 1px solid var(--border);
  color: var(--body-text);
}

.btn-outline:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.mr-5 { margin-right: 5px; }
.mt-10 { margin-top: 10px; }
.mt-15 { margin-top: 15px; }
.mb-30 { margin-bottom: 30px; }
.italic { font-style: italic; }
</style>
