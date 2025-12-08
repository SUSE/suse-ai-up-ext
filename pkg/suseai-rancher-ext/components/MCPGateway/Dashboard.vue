<template>
  <div class="mcp-gateway-content">
    <h1>MCP Gateway</h1>
    <p>Monitor and manage your Model Context Protocol endpoints</p>

    <MetricsGrid
      :discovered-count="discoveredCount"
      :registered-count="registeredCount"
      :available-count="availableCount"
      :error-rate="errorRate"
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

    <div class="tabs-container">
      <div class="tab-nav">
        <button 
          v-for="tab in tabs" 
          :key="tab.id"
          :class="['tab-button', { active: activeTab === tab.id }]"
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </div>

      <div class="tab-content">
        <!-- Overview Tab -->
        <div v-if="activeTab === 'overview'" class="tab-pane">
           <AdaptersTable
              :adapters="adapters"
              :loading="adaptersLoading"
              :ping-results="adapterPingResults"
              @view-logs="handleViewAdapterLogs"
              @sync-adapter="handleSyncAdapter"
              @edit-adapter="handleEditAdapter"
              @delete-adapter="handleDeleteAdapter"
              @refresh-adapters="handleRefreshAdapters"
           />

           <DiscoveredServersTable
             :discovered-servers="discoveredServers"
             :loading="discoveryLoading"
            :registered-server-ids="registeredServerIds"
            @view-server-details="handleViewServerDetails"
            @register-server="handleRegisterServer"
          />
        </div>

        <!-- Adapter Details Tab -->
        <div v-if="activeTab === 'adapters'" class="tab-pane">
          <div v-if="adapters.length === 0" class="no-data">
            <p>No adapters available</p>
          </div>
          <div v-else>
            <div class="adapter-selector">
              <label>Select Adapter:</label>
              <select v-model="selectedAdapterName">
                <option v-for="adapter in adapters" :key="adapter.name" :value="adapter.name">
                  {{ adapter.name }}
                </option>
              </select>
            </div>
            <AdapterDetails
              v-if="selectedAdapter"
              :adapter="selectedAdapter"
              @edit-adapter="handleEditAdapter"
            />
          </div>
        </div>

        <!-- Session Manager Tab -->
        <div v-if="activeTab === 'sessions'" class="tab-pane">
          <SessionManager
            :adapters="adapters"
            @create-session="handleCreateSession"
            @terminate-session="handleTerminateSession"
            @view-session-details="handleViewSessionDetails"
          />
        </div>

        <!-- Real-time Metrics Tab -->
        <div v-if="activeTab === 'metrics'" class="tab-pane">
          <RealTimeMetrics
            :adapters="adapters"
            @refresh-metrics="handleRefreshMetrics"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from 'vue';
import MetricsGrid from './MetricsGrid.vue';
import ScanActions from './ScanActions.vue';
import AdaptersTable from './AdaptersTable.vue';
import DiscoveredServersTable from './DiscoveredServersTable.vue';
import AdapterDetails from './AdapterDetails.vue';
import SessionManager from './SessionManager.vue';
import RealTimeMetrics from './RealTimeMetrics.vue';

export default defineComponent({
  name: 'Dashboard',
  components: {
    MetricsGrid,
    ScanActions,
    AdaptersTable,
    DiscoveredServersTable,
    AdapterDetails,
    SessionManager,
    RealTimeMetrics
  },
  emits: ['scan-modal-open', 'security-modal-open', 'rule-modal-open', 'sync-adapter'],
  props: {
    discoveredServers: {
      type: Array as () => any[],
      default: () => []
    },
    adapters: {
      type: Array as () => any[],
      default: () => []
    },
    discoveryLoading: {
      type: Boolean,
      default: false
    },
    adaptersLoading: {
      type: Boolean,
      default: false
    },
    scanning: {
      type: Boolean,
      default: false
    },
    scanProgress: {
      type: Number,
      default: 0
    }
  },
  setup(props, { emit }) {
    const activeTab = ref('overview');
    const selectedAdapterName = ref('');
    
    const tabs = [
      { id: 'overview', label: 'Overview' },
      { id: 'adapters', label: 'Adapter Details' },
      { id: 'sessions', label: 'Session Manager' },
      { id: 'metrics', label: 'Real-time Metrics' }
    ];

    const selectedAdapter = computed(() => {
      return props.adapters.find(adapter => adapter.name === selectedAdapterName.value) || null;
    });

    // Computed properties for metrics
    const discoveredCount = computed(() => props.discoveredServers.length);
    const registeredCount = computed(() => props.adapters.length);
    const availableCount = computed(() => props.adapters.filter(a => a.status === 'ready').length);
    const errorRate = computed(() => {
      const totalAdapters = props.adapters.length;
      if (totalAdapters === 0) return '0%';
      const errorAdapters = props.adapters.filter(a => a.status === 'error').length;
      return ((errorAdapters / totalAdapters) * 100).toFixed(1) + '%';
    });
    const loading = computed(() => props.discoveryLoading || props.adaptersLoading);

    // Mock data for now (will be updated when we implement sessions/metrics)
    const sessions = ref([]);
    const loadingSessions = ref(false);
    const systemMetrics = ref(null);
    const loadingMetrics = ref(false);
    const adapterPingResults = ref({});
    const registeredServerIds = ref(new Set());

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
      // TODO: Implement adapter sync functionality
    };

    const handleEditAdapter = (adapter: any) => {
      console.log('Edit adapter:', adapter.name);
    };

    const handleDeleteAdapter = (adapter: any) => {
      console.log('Delete adapter:', adapter.name);
    };

    const handleViewServerDetails = (server: any) => {
      emit('security-modal-open');
    };

    const handleRefreshAdapters = () => {
      console.log('Refresh adapters');
    };

    const handleRegisterServer = (server: any) => {
      console.log('Register server:', server.name);
    };

    const handleCreateSession = (adapterId: string) => {
      console.log('Create session for adapter:', adapterId);
    };

    const handleTerminateSession = (adapterId: string, sessionId: string) => {
      console.log('Terminate session:', sessionId, 'for adapter:', adapterId);
    };

    const handleViewSessionDetails = (sessionId: string) => {
      console.log('View session details:', sessionId);
    };

    const handleRefreshMetrics = () => {
      console.log('Refresh metrics');
    };

    return {
      // Tab management
      activeTab,
      tabs,
      selectedAdapterName,
      selectedAdapter,

      // Data from props
      discoveredServers: props.discoveredServers,
      adapters: props.adapters,
      loading,
      scanning: props.scanning,
      scanProgress: props.scanProgress,
      discoveredCount,
      registeredCount,
      availableCount,
      errorRate,
      adapterPingResults,
      registeredServerIds,

      // Enhanced data (mock for now)
      sessions,
      loadingSessions,
      systemMetrics,
      loadingMetrics,

      // Handlers
      handleScanStart,
      handleRuleManagement,
      handleViewAdapterLogs,
      handleEditAdapter,
      handleDeleteAdapter,
      handleViewServerDetails,
      handleRegisterServer,
      handleCreateSession,
      handleTerminateSession,
      handleViewSessionDetails,
      handleRefreshAdapters,
      handleRefreshMetrics
    };
  }
});
</script>

<style scoped>
.mcp-gateway-content {
  padding: 24px;
}

.tabs-container {
  margin-top: 24px;
}

.tab-nav {
  display: flex;
  border-bottom: 1px solid var(--border);
  margin-bottom: 16px;
}

.tab-button {
  background: none;
  border: none;
  padding: 12px 16px;
  cursor: pointer;
  font-size: 14px;
  color: var(--input-label);
  border-bottom: 2px solid transparent;
  transition: all 0.2s ease;
}

.tab-button:hover {
  color: var(--primary);
  background-color: var(--muted);
}

.tab-button.active {
  color: var(--primary);
  border-bottom-color: var(--primary);
  font-weight: 600;
}

.tab-content {
  min-height: 400px;
}

.tab-pane {
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>