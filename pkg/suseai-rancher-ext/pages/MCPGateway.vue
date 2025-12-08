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
      :discovered-servers="discoveredServers as any[]"
      :adapters="adapters as any[]"
      :discovery-loading="discoveryLoading"
      :adapters-loading="adaptersLoading"
      :scanning="scanning"
      :scan-progress="scanProgress"
      @scan-modal-open="openScanModal"
      @security-modal-open="openSecurityModal"
      @rule-modal-open="openRuleModal"
      @sync-adapter="handleSyncAdapter"
      @view-server-details="openServerDetailsModal"
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
    <ScheduleScanModal ref="scanModal" @scanStarted="onScanStarted" />

    <!-- Server Details Modal -->
    <ServerDetailsModal
      :show="showServerDetailsModal"
      :server="selectedServer"
      @close="closeServerDetailsModal"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, watch, onMounted, computed } from 'vue';
import { useStore } from 'vuex';
import { useDiscovery } from '../composables/useDiscovery';
import { useAdapters } from '../composables/useAdapters';
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

    // Use new composables
    const {
      discoveredServers,
      loading: discoveryLoading,
      scanning,
      currentScan,
      scanProgress,
      startScan,
      loadDiscoveredServers,
      getServerDetails,
      hasSecurityFindings,
      getSecurityRiskLevel,
      getVulnerabilityScore
    } = useDiscovery();

    const {
      adapters,
      loading: adaptersLoading,
      loadAdapters,
      createAdapter,
      deleteAdapter,
      syncAdapter
    } = useAdapters();

    // Service enablement check
    const proxyInstalled = computed(() => store.state.suseai.settings.proxyInstalled);
    const selectedServices = computed(() => store.state.suseai.settings.selectedServices);
    const isEnabled = computed(() => proxyInstalled.value && selectedServices.value.includes('mcp-gateway'));

    // Load data on mount
    onMounted(async () => {
      if (proxyInstalled.value) {
        await loadAdapters()
      }
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

    const onScanStarted = () => {
      console.log('Scan started');
      // Additional logic for when scan starts can be added here
    };

    // MCPGateway is now only for management - service discovery handled in Home.vue

    return {
      // Store getters
      proxyInstalled,
      isEnabled,

      // Discovery data
      discoveredServers,
      discoveryLoading,
      scanning,
      currentScan,
      scanProgress,

      // Adapters data
      adapters,
      adaptersLoading,

      // Modal refs
      scanModal,
      securityModal,
      ruleModal,

      // Methods
      openScanModal,
      openSecurityModal,
      openRuleModal,
      handleSyncAdapter,
      onScanStarted,

      // Server details modal
      showServerDetailsModal,
      selectedServer,
      openServerDetailsModal,
      closeServerDetailsModal
    }
  }
});
</script>

<style scoped>
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

