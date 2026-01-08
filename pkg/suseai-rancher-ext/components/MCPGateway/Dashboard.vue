<template>
  <div class="mcp-gateway-content">
    <h1>MCP Gateway</h1>
    <p>Monitor and manage your Model Context Protocol endpoints</p>

    <MetricsGrid
      :discovered-count="discoveredCount"
      :registered-count="registeredCount"
      :adapters-in-error-count="adaptersInErrorCount"
      :proxy-health="proxyHealth"
      :loading="loading"
    />

    <ScanActions
      :scanning="scanning"
      :security-scanning="false"
      :scan-progress="scanProgress"
      :scan-status="scanning ? 'running' : 'idle'"
      @scan-start="handleScanStart"
      @rule-management-open="handleRuleManagement"
    />

    <!-- Registered MCP Adapters Table -->
    <div class="table-section">
      <h2>Registered MCP Adapters</h2>
      <div>Debug: adapters.length = {{ adapters?.length || 0 }}, adaptersLoading = {{ adaptersLoading }}</div>
      <div v-if="adaptersLoading" class="loading-state">
        <i class="icon icon-spinner icon-spin"></i>
        <p>Loading adapters...</p>
      </div>
      <!-- Error State -->
      <div v-else-if="adaptersError" class="error-state">
        <i class="icon icon-error"></i>
        <p>Error loading adapters: {{ adaptersError }}</p>
      </div>
      <div v-else-if="!adapters || adapters.length === 0" class="empty-state">
        <p>No adapters found</p>
      </div>
      <AdaptersTable
        v-else
        :adapters="adapters"
        :loading="adaptersLoading"
        :ping-results="adapterPingResults"
        @view-logs="handleViewAdapterLogs"
        @sync-adapter="handleSyncAdapter"
        @edit-adapter="handleEditAdapter"
        @delete-adapter="handleDeleteAdapter"
        @refresh-adapters="handleRefreshAdapters"
      />
    </div>

    <!-- Discovered MCP Servers Table -->
    <div class="table-section" :key="discoveredServers?.length || 0">
      <h2>Discovered MCP Servers</h2>
      <div v-if="discoveryLoading" class="loading-state">
        <i class="icon icon-spinner icon-spin"></i>
        <p>Loading discovered servers...</p>
      </div>
      <!-- Error State -->
      <div v-if="discoveryError" class="error-state">
        <i class="icon icon-error"></i>
        <p>Error loading discovered servers: {{ discoveryError }}</p>
        <button class="btn btn-secondary" @click="$emit('retry-discovery')">
          Retry
        </button>
      </div>
      <DiscoveredServersTable
        :discovered-servers="servers"
        :loading="false"
        :registered-server-ids="[]"
        @view-server-details="handleViewServerDetails"
        @register-server="handleRegisterServer"
      />

      <!-- TEMP: Debug display -->
      <div style="border: 1px solid red; padding: 10px; margin: 10px;">
        <h3>DEBUG: Discovered Servers</h3>
        <p>Loading: {{ discoveryLoading }}</p>
        <p>Error: {{ discoveryError }}</p>
        <p>Servers count: {{ discoveredServers?.length || 0 }}</p>
        <div v-for="server in discoveredServers" :key="server.id">
          <strong>{{ server.name }}</strong> - {{ server.address }}:{{ server.port }}
        </div>
        <div v-if="discoveredServers?.length === 0">
          No servers in array
        </div>
      </div>
     </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, watch } from 'vue';
import { useDiscovery } from '../../composables/useDiscovery';
import ScanActions from './ScanActions.vue';
import MetricsGrid from './MetricsGrid.vue';
import AdaptersTable from './AdaptersTable.vue';
import DiscoveredServersTable from './DiscoveredServersTable.vue';

import { useHealthMonitoring } from '../../composables/useHealthMonitoring';

export default defineComponent({
  name: 'Dashboard',
  components: {
    ScanActions,
    MetricsGrid,
    AdaptersTable,
    DiscoveredServersTable
  },
  emits: ['scan-modal-open', 'security-modal-open', 'rule-modal-open', 'sync-adapter', 'view-server-details'],
  props: {
    adapters: {
      type: Array as () => any[],
      default: () => []
    },
    adaptersError: {
      type: String,
      default: null
    },
    adaptersLoading: {
      type: Boolean,
      default: false
    }
  },
  setup(props, { emit }) {

    // Use the composable directly instead of relying on props
    const { discoveredServers, loading: discoveryLoading } = useDiscovery()

    const servers = computed(() => {
      console.log('Dashboard computed servers:', discoveredServers.value?.length || 0)
      return discoveredServers.value || []
    })

    console.log('Dashboard setup - using composable directly')



    // Health monitoring
    const { proxyHealth, registryHealth, discoveryHealth } = useHealthMonitoring();

    // Computed properties for metrics
    const discoveredCount = computed(() => servers.value.length);
    const registeredCount = computed(() => props.adapters.length);
    const adaptersInErrorCount = computed(() => {
      return props.adapters.filter(adapter => adapter.status === 'error' || adapter.errorCount > 0).length;
    });
    const loading = computed(() => discoveryLoading.value || props.adaptersLoading);

    // Mock data for now (will be updated when we implement sessions/metrics)
    const sessions = ref([]);
    const loadingSessions = ref(false);
    const systemMetrics = ref(null);
    const loadingMetrics = ref(false);
    const adapterPingResults = ref({});
    const registeredServerIds = ref(new Set<string>());

    const handleScanStart = () => {
      emit('scan-modal-open');
    };

    const handleRuleManagement = () => {
      emit('rule-modal-open');
    };

    const handleViewAdapterLogs = (adapter: any) => {
      console.log('View adapter logs:', adapter.name);
    };

    const handleSyncAdapter = (adapter: any) => {
      console.log('Sync adapter:', adapter.name);
    };

    const handleEditAdapter = (adapter: any) => {
      console.log('Edit adapter:', adapter.name);
    };

    const handleDeleteAdapter = (adapter: any) => {
      console.log('Delete adapter:', adapter.name);
    };

    const handleViewServerDetails = (server: any) => {
      emit('view-server-details', server);
    };

    const handleRefreshAdapters = () => {
      console.log('Refresh adapters');
    };

    const handleRegisterServer = (server: any) => {
      console.log('Register server:', server.name);
    };

    const handleCreateSession = (adapter: any) => {
      console.log('Create session for adapter:', adapter.name);
    };

    const handleTerminateSession = (session: any) => {
      console.log('Terminate session:', session.id);
    };

    const handleViewSessionDetails = (session: any) => {
      console.log('View session details:', session.id);
    };

    const handleRefreshMetrics = () => {
      console.log('Refresh metrics');
    };

    return {

      discoveredServers: servers,
      adapters: props.adapters,
      adapterPingResults,
      registeredServerIds,
       proxyHealth,
       registryHealth,
       discoveryHealth,
       discoveredCount,
       registeredCount,
       adaptersInErrorCount,
       loading,
      handleScanStart,
      handleRuleManagement,
      handleViewAdapterLogs,
      handleSyncAdapter,
      handleEditAdapter,
      handleDeleteAdapter,
      handleViewServerDetails,
      handleRefreshAdapters,
      handleRegisterServer,
      handleCreateSession,
      handleTerminateSession,
      handleViewSessionDetails,
      handleRefreshMetrics
    };
  }
});
</script>

<style scoped>
.mcp-gateway-content {
  padding: 24px;
}

/* Table Sections */
.table-section {
  margin-top: 32px;
}

.table-section h2 {
  margin: 0 0 16px 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--body-text, #1a1a1a);
}

.loading-state,
.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: var(--muted, #666);
}

.loading-state i,
.empty-state i {
  font-size: 48px;
  margin-bottom: 16px;
  display: block;
}

.empty-state {
  border: 2px dashed var(--border, #e1e5e9);
  border-radius: 8px;
  background: var(--accent-bg, #f8f9fa);
}
</style>