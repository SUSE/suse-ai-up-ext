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
       <h2>Adapters</h2>
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
        @view-details="handleViewAdapterDetails"
        @delete-adapter="handleDeleteAdapter"
      />
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteModal" class="modal-overlay" @click="cancelDelete">
      <div class="modal-content delete-modal" @click.stop>
        <div class="modal-header">
          <h3 class="text-warning">
            <i class="icon icon-warning"></i>
            Delete Adapter
          </h3>
        </div>
        <div class="modal-body">
          <div class="delete-warning">
            <p><strong>Warning:</strong> This action cannot be undone.</p>
            <p>Are you sure you want to delete the adapter <strong>{{ adapterToDelete?.name }}</strong>?</p>
            <p class="text-muted">This will permanently remove the adapter and all its associated data.</p>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="cancelDelete" :disabled="deleteLoading">
            Cancel
          </button>
          <button class="btn btn-danger" @click="confirmDelete" :disabled="deleteLoading">
            <i v-if="deleteLoading" class="icon icon-spinner icon-spin"></i>
            {{ deleteLoading ? 'Deleting...' : 'Delete Adapter' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Discovered MCP Servers Table -->
    <div class="table-section" :key="discoveredServers?.length || 0">
       <h2>Discovery</h2>
      <div v-if="discoveryLoading" class="loading-state">
        <i class="icon icon-spinner icon-spin"></i>
        <p>Loading discovered servers...</p>
      </div>
       <!-- Show error only if there are no servers and there's an error -->
       <div v-if="discoveryError && (!discoveredServers || discoveredServers.length === 0)" class="error-state">
         <i class="icon icon-error"></i>
         <p>Error loading discovered servers: {{ discoveryError }}</p>
         <button class="btn btn-secondary" @click="$emit('retry-discovery')">
           Retry
         </button>
       </div>
       <DiscoveredServersTable
         :discovered-servers="discoveredServers"
         :loading="discoveryLoading"
          :registered-server-ids="new Set()"
         @view-server-details="handleViewServerDetails"
         @register-server="handleRegisterServer"
       />
     </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, watch, onMounted } from 'vue';
import ScanActions from './ScanActions.vue';
import MetricsGrid from './MetricsGrid.vue';
import AdaptersTable from './AdaptersTable.vue';
import DiscoveredServersTable from './DiscoveredServersTable.vue';

import { useHealthMonitoring } from '../../composables/useHealthMonitoring';
import { useAdapters } from '../../composables/useAdapters';
import { MCPService } from '../../services/mcp-service';

export default defineComponent({
  name: 'Dashboard',
  components: {
    ScanActions,
    MetricsGrid,
    AdaptersTable,
    DiscoveredServersTable
  },
   emits: ['scan-modal-open', 'security-modal-open', 'rule-modal-open', 'sync-adapter', 'view-server-details', 'server-registered', 'retry-discovery'],
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
    },
    // Discovery state props to avoid multiple composable instances
    discoveredServers: {
      type: Array as () => any[],
      default: () => []
    },
    discoveryLoading: {
      type: Boolean,
      default: false
    },
    discoveryError: {
      type: String,
      default: null
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

    // Debug: Check what adapters prop we receive
    console.log('Dashboard setup - adapters prop:', props.adapters?.length || 0, 'items')

    // Use props for discovery state to share state with parent component
    const servers = computed(() => {
      console.log('Dashboard computed servers:', props.discoveredServers?.length || 0)
      return props.discoveredServers || []
    })

    // Health monitoring
    const { proxyHealth, registryHealth, discoveryHealth, initialize: initHealth } = useHealthMonitoring();

    // Initialize health monitoring on mount
    onMounted(() => {
      initHealth();
    });

    // Adapters management
    const { deleteAdapter } = useAdapters();

    // Computed properties for metrics and data
    const discoveredCount = computed(() => servers.value.length);
    const adaptersData = computed(() => {
      const adapters = props.adapters || []
      console.log('Dashboard computed adaptersData:', adapters.length, 'items from props.adapters with', props.adapters?.length || 0, 'items')
      return adapters
    });
    const registeredCount = computed(() => {
      const count = adaptersData.value.length
      console.log('Dashboard registeredCount:', count, 'items')
      return count
    });
    const adaptersInErrorCount = computed(() => {
      return adaptersData.value.filter(adapter => adapter.status === 'error' || adapter.errorCount > 0).length;
    });
    const loading = computed(() => props.discoveryLoading || props.adaptersLoading);

    // Mock data for now (will be updated when we implement sessions/metrics)
    const sessions = ref([]);
    const loadingSessions = ref(false);
    const systemMetrics = ref(null);
    const loadingMetrics = ref(false);
    const adapterPingResults = ref({});

    // Delete functionality
    const showDeleteModal = ref(false);
    const adapterToDelete = ref<any>(null);
    const deleteLoading = ref(false);

    const handleScanStart = () => {
      emit('scan-modal-open');
    };

    const handleRuleManagement = () => {
      emit('rule-modal-open');
    };

    const handleViewAdapterDetails = (adapter: any) => {
      console.log('View adapter details:', adapter.name);
      // TODO: Implement adapter details modal
    };

    const handleDeleteAdapter = (adapter: any) => {
      adapterToDelete.value = adapter;
      showDeleteModal.value = true;
    };

    const cancelDelete = () => {
      adapterToDelete.value = null;
      showDeleteModal.value = false;
      deleteLoading.value = false;
    };

    const confirmDelete = async () => {
      if (!adapterToDelete.value) return;

      deleteLoading.value = true;
      try {
        const success = await deleteAdapter(adapterToDelete.value.id || adapterToDelete.value.name);
        if (success) {
          console.log('Adapter deleted successfully:', adapterToDelete.value.name);
          // The adapter will be automatically removed from the list by the composable
        } else {
          console.error('Failed to delete adapter:', adapterToDelete.value.name);
        }
      } catch (error) {
        console.error('Error deleting adapter:', error);
      } finally {
        deleteLoading.value = false;
        cancelDelete();
      }
    };

    const handleViewServerDetails = (server: any) => {
      emit('view-server-details', server);
    };

    const handleRegisterServer = async (server: any) => {
      try {
        console.log('Registering discovered server:', server.name, 'with ID:', server.id);

        // Call the discovery register API to create an adapter
        const result = await MCPService.registerDiscoveredServer(server.id);

        console.log('Server registered successfully:', result);

        // Emit event to notify parent component that a server was registered
        emit('server-registered', { server, result });

      } catch (error: any) {
        console.error('Failed to register server:', error);

        // Emit event to notify parent component of the error
        emit('server-registered', { server, error });
      }
    };



    return {
      discoveredServers: servers,
      adapters: adaptersData,
      adapterPingResults,
      proxyHealth,
      registryHealth,
      discoveryHealth,
      discoveredCount,
      registeredCount,
      adaptersInErrorCount,
      loading,
      handleScanStart,
      handleRuleManagement,
      handleViewAdapterDetails,
      handleDeleteAdapter,
      cancelDelete,
      confirmDelete,
      showDeleteModal,
      adapterToDelete,
      deleteLoading,
      handleViewServerDetails,
      handleRegisterServer
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

/* Delete Confirmation Modal */
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
  max-width: 500px;
  width: 90%;
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
  display: flex;
  align-items: center;
  gap: 8px;
}

.modal-header h3 i {
  color: var(--warning, #f59e0b);
}

.modal-body {
  padding: 16px 24px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px 24px;
  border-top: 1px solid var(--border, #e5e7eb);
  background: var(--accent-bg, #f9fafb);
}

.delete-modal {
  max-width: 450px;
}

.delete-warning {
  text-align: center;
}

.delete-warning p {
  margin: 12px 0;
  line-height: 1.5;
}

.delete-warning p:first-child {
  font-weight: 600;
  color: var(--error, #dc2626);
}

.text-warning {
  color: var(--warning, #f59e0b) !important;
}

.text-muted {
  color: var(--muted, #6b7280);
}

.btn-danger {
  background: var(--error, #dc2626);
  color: white;
  border: none;
}

.btn-danger:hover:not(:disabled) {
  background: var(--error-hover, #b91c1c);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(220, 38, 38, 0.2);
}
</style>