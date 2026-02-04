<template>
  <div v-if="!isEnabled" class="blank-page">
    <div class="empty-state">
      <h3>This service is not enabled</h3>
      <p>Please enable it from the service selection page.</p>
    </div>
  </div>

  <div v-else>
    <ExperimentalBanner />

      <Dashboard
        v-if="proxyInstalled && isEnabled"
        :adapters="adapters"
        :adapters-error="adaptersError || undefined"
        :adapters-loading="adaptersLoading"
        :discovered-servers="Array.from(discoveredServers)"
        :discovery-loading="discoveryLoading"
        :discovery-error="discoveryError || undefined"
        :scanning="scanning"
        :scan-progress="scanProgress"
        :announced-mcps="announcedMcps"
        @scan-modal-open="openScanModal"
        @security-modal-open="openSecurityModal"
        @rule-modal-open="openRuleModal"
        @sync-adapter="handleSyncAdapter"
        @view-server-details="openServerDetailsModal"
        @server-registered="handleServerRegistered"
      />

    <ProxyStatus v-if="proxyInstalled && isEnabled" />

    <!-- Show message when proxy not installed (shouldn't happen since Home.vue handles installation) -->
    <div v-else class="proxy-not-installed">
      <div class="empty-state">
        <h3>SUSE AI Universal Proxy Not Installed</h3>
        <p>Please return to the main page to install the proxy first.</p>
      </div>
    </div>

     <!-- Schedule Scan Modal -->
     <ScheduleScanModal
       ref="scanModal"
       :start-scan="startScan"
       :scanning="scanning"
       :scan-progress="scanProgress"
       @scanStarted="onScanStarted"
     />

    <!-- Server Details Modal -->
    <ServerDetailsModal
      :show="showServerDetailsModal"
      :server="selectedServer"
      @close="closeServerDetailsModal"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, watch, onMounted, computed, nextTick } from 'vue';
import { useStore } from 'vuex';
import { useDiscovery } from '../composables/useDiscovery';
import { useAdapters } from '../composables/useAdapters';
import { updateApiBaseUrls, API_BASE_URLS } from '../config/api-config';
import { ExperimentalBanner, Dashboard, ProxyStatus, ServerDetailsModal } from '../components/MCPGateway';
import FeatureFlag from '../components/shared/FeatureFlag.vue';
import ScheduleScanModal from '../components/shared/ScheduleScanModal.vue';
import SecurityFindingsModal from '../components/shared/SecurityFindingsModal.vue';
import RuleManagementModal from '../components/shared/RuleManagementModal.vue';


export default defineComponent({
  name: 'MCPGateway',
  components: {
    ExperimentalBanner,
    Dashboard,
    ProxyStatus,
    ScheduleScanModal,
    SecurityFindingsModal,
    RuleManagementModal,
    ServerDetailsModal
  },
  setup() {
    const store = useStore();

    const {
      discoveredServers,
      loading: discoveryLoading,
      error: discoveryError,
      scanning,
      currentScan,
      scanProgress,
      startScan,
      loadDiscoveredServers,
      startPolling,
      getServerDetails,
      hasSecurityFindings,
      getSecurityRiskLevel,
      getVulnerabilityScore
    } = useDiscovery();



    const {
      adapters,
      loading: adaptersLoading,
      error: adaptersError,
      loadAdapters,
      createAdapter,
      startPolling: startAdaptersPolling,
      deleteAdapter,
      syncAdapter
    } = useAdapters();

    // Initialize API URLs immediately in setup to ensure child components have correct config
    const serviceUrls = store.state.suseai?.settings?.serviceUrls || []
    const serviceUrl = serviceUrls.length > 0 ? serviceUrls[0] : undefined
    console.log('MCPGateway setup: Initializing API URLs with:', serviceUrl)
    updateApiBaseUrls(serviceUrl)

    // Service enablement check
    const proxyInstalled = computed(() => store.state.suseai.settings.proxyInstalled);
    const selectedServices = computed(() => store.state.suseai.settings.selectedServices);
    const isEnabled = computed(() => proxyInstalled.value && selectedServices.value.includes('mcp-gateway'));

    // Remove intermediate ref - pass adapters directly

    // Test service connectivity - force use of configured IP ADDRESS, no fallback
    const testServiceUrl = async () => {
      try {
        console.log('MCPGateway testing configured service URL:', API_BASE_URLS.MCP_GATEWAY)

        // Test current configured URL
        const currentUrl = `${API_BASE_URLS.MCP_GATEWAY}/health`
        try {
          const response = await fetch(currentUrl, {
            method: 'GET',
            signal: AbortSignal.timeout(5000)
          })
          if (response.ok) {
            console.log('MCPGateway configured service URL is accessible:', currentUrl)
            return // Current URL works
          } else {
            console.warn('MCPGateway configured service URL returned non-OK status:', response.status)
          }
        } catch (error) {
          console.error('MCPGateway configured service URL failed:', error)
        }

        console.warn('MCPGateway configured service URL is not accessible - will use it anyway as requested')
      } catch (error) {
        console.error('MCPGateway error during service URL testing:', error)
      }
    }

    // Load data on mount
    onMounted(async () => {
      console.log('MCPGateway onMounted: Starting initialization')

      // Load discovered servers
      await loadDiscoveredServers()

      // Load adapters
      console.log('MCPGateway onMounted: Loading adapters')
      await loadAdapters()

      console.log('MCPGateway onMounted: Adapters loaded, starting polling')

      // Start continuous polling for server updates
      startPolling()

      // Start continuous polling for adapter updates
      startAdaptersPolling()
    });

    // Modal refs
    const scanModal = ref<any>();
    const securityModal = ref<any>();
    const ruleModal = ref<any>();

    // Server details modal
    const showServerDetailsModal = ref(false);
    const selectedServer = ref<any>(null);

    // Track if scan was running to detect completion
    const scanWasRunning = ref(false);

    // Mock Announced MCPs
    const announcedMcps = ref([
      {
        id: '1',
        name: 'Weather MCP',
        ip: '192.168.1.105',
        port: 8080,
        availability: 'Available',
        toolsCount: 5,
        lastSeen: new Date().toISOString()
      },
      {
        id: '2',
        name: 'Stock Market MCP',
        ip: '192.168.1.106',
        port: 3000,
        availability: 'Busy',
        toolsCount: 12,
        lastSeen: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: '3',
        name: 'File System MCP',
        ip: '192.168.1.107',
        port: 9090,
        availability: 'Offline',
        toolsCount: 3,
        lastSeen: new Date(Date.now() - 86400000).toISOString()
      }
    ]);

    // Track scan state for modal management
    watch(scanning, (newScanning, oldScanning) => {
      if (newScanning && !oldScanning) {
        // Scan just started
        scanWasRunning.value = true;
      } else if (oldScanning && !newScanning) {
        // Scan completed
        scanWasRunning.value = false;
      }
    });

    const openScanModal = () => {
      if (scanModal.value) {
        scanModal.value.openModal();
      }
    };

    const openSecurityModal = () => {
      if (securityModal.value) {
        securityModal.value.openModal();
      }
    };

    const openRuleModal = () => {
      if (ruleModal.value) {
        ruleModal.value.openModal();
      }
    };

    const openServerDetailsModal = async (server: any) => {
      selectedServer.value = server;
      showServerDetailsModal.value = true;
    };

    const closeServerDetailsModal = () => {
      showServerDetailsModal.value = false;
      selectedServer.value = null;
    };

    const handleSyncAdapter = async (adapter: any) => {
      try {
        await syncAdapter(adapter.id)
        console.log('Adapter synced successfully:', adapter.name)
      } catch (error) {
        console.error('Failed to sync adapter:', error)
      }
    }

    const handleServerRegistered = async (data: any) => {
      const { server, result, error } = data

      if (error) {
        console.error('Server registration failed:', error)
        // Show error notification if available
        if (store?.dispatch) {
          store.dispatch('growl/error', {
            title: 'Registration Failed',
            message: `Failed to register ${server.name}: ${error.message || 'Unknown error'}`
          })
        }
      } else {
        console.log('Server registration successful:', result)
        // Refresh adapters list to show the newly registered adapter
        await loadAdapters()

        // Show success notification
        if (store?.dispatch) {
          store.dispatch('growl/success', {
            title: 'Server Registered',
            message: `${server.name} has been successfully registered as an MCP adapter.`
          })
        }
      }
    }

    const handleRegisterAnnounced = (mcp: any) => {
      console.log('Registering announced MCP:', mcp);
      // Logic to register the announced MCP will go here
    };

    const onScanStarted = () => {
      console.log('Scan started');
      // Additional logic for when scan starts can be added here
    };

    // MCPGateway is now only for management - service discovery handled in Home.vue

    return {
      // Store getters
      proxyInstalled,
      isEnabled,
      
      // Mock data
      announcedMcps,

      // Discovery data
      discoveredServers,
      discoveryLoading,
      discoveryError,
      scanning,
      currentScan,
      scanProgress,

      // Adapters data
      adapters,
      adaptersLoading,
      adaptersError,

      // Modal refs
      scanModal,
      securityModal,
      ruleModal,

       // Methods
       openScanModal,
       openSecurityModal,
       openRuleModal,
        handleSyncAdapter,
        handleServerRegistered,
        handleRegisterAnnounced,
        onScanStarted,
       loadDiscoveredServers,
       startPolling,
       startScan,

      // Server details modal
      showServerDetailsModal,
      selectedServer,
      openServerDetailsModal,
      closeServerDetailsModal
    };
  }
});
</script>

<style scoped>
/* Service not enabled state */
.blank-page {
  text-align: center;
  padding: 50px;
  font-size: 18px;
  color: #666;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
}

.empty-state h3 {
  color: var(--body-text, #1a1a1a);
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 12px;
}

.empty-state p {
  color: var(--muted, #666);
  font-size: 16px;
  margin: 0;
}

.proxy-not-installed {
  text-align: center;
  padding: 50px 20px;
}

.proxy-not-installed .empty-state {
  max-width: 400px;
  margin: 0 auto;
}

.proxy-not-installed h3 {
  color: var(--body-text);
  margin-bottom: 16px;
}

.proxy-not-installed p {
  color: var(--muted);
}
</style>

