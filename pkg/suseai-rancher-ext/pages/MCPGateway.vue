<template>
  <ExperimentalBanner />

  <InstallWizard v-if="!proxyInstalled || showConfigurationWizard || (proxyInstalled && !hasSelectedServices)" />

  <Dashboard
    v-else-if="proxyInstalled && hasSelectedServices"
    @scan-modal-open="openScanModal"
    @security-modal-open="openSecurityModal"
    @rule-modal-open="openRuleModal"
  />

  <!-- Scan Modal -->
  <ScheduleScanModal ref="scanModal" @scan-started="onScanStarted" />

  <!-- Security Findings Modal -->
  <SecurityFindingsModal
    ref="securityModal"
    :findings="selectedServerFindings"
    :server-name="selectedServerName"
    :server="selectedServer"
  />

  <!-- Rule Management Modal -->
  <RuleManagementModal ref="ruleModal" @rules-loaded="onRulesLoaded" />

  <!-- Custom URL Modal -->
  <CustomUrlModal
    :show="showCustomUrlModal"
    :initial-url="currentServiceUrl"
    @close="showCustomUrlModal = false"
    @save="handleSaveCustomUrl"
  />
</template>

<script lang="ts">
import { defineComponent, ref, watch, onMounted } from 'vue';
import { useStore } from 'vuex';
import { useMCPGateway } from '../composables/useMCPGateway';
import { useServiceDiscovery } from '../composables/useServiceDiscovery';
import { logger } from '../utils/logger';
import { updateApiBaseUrl } from '../services/mcp-service';
import { ExperimentalBanner, InstallWizard, Dashboard } from '../components/MCPGateway';
import ScheduleScanModal from '../components/shared/ScheduleScanModal.vue';
import SecurityFindingsModal from '../components/shared/SecurityFindingsModal.vue';
import RuleManagementModal from '../components/shared/RuleManagementModal.vue';
import CustomUrlModal from '../components/shared/CustomUrlModal.vue';

export default defineComponent({
  name: 'MCPGateway',
  components: {
    ExperimentalBanner,
    InstallWizard,
    Dashboard,
    ScheduleScanModal,
    SecurityFindingsModal,
    RuleManagementModal,
    CustomUrlModal
  },
  setup() {
    const store = useStore();
    const { discoverServices, hasDetectedServices, getPrimaryService, isLoading, error } = useServiceDiscovery();

    const showCustomUrlModal = ref(false);
    const currentServiceUrl = ref('');

    const {
      // Store getters
      proxyInstalled,
      hasSelectedServices,
      showConfigurationWizard,

      // Modal data
      selectedServerFindings,
      selectedServerName,
      selectedServer,

      // Scan state
      scanning,

      // Methods
      onScanStarted,
      onRulesLoaded
    } = useMCPGateway();

    // Modal refs
    const scanModal = ref<any>();
    const securityModal = ref<any>();
    const ruleModal = ref<any>();

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

    // Service discovery logic
    const checkServiceUrl = async () => {
      try {
        const existingUrl = store.getters['suseai/serviceUrl'];
        if (existingUrl) {
          logger.info('Service URL already configured:', existingUrl);
          updateApiBaseUrl(existingUrl);
          return;
        }

        const clusterId = store.getters['currentCluster']?.id || 'local';
        logger.info('Using cluster ID for service discovery:', clusterId);

        logger.info('Discovering SUSE AI Universal Proxy service...');
        const detected = await discoverServices(store, clusterId);
        logger.info(`Service discovery completed, found ${detected.length} services`);

        if (hasDetectedServices.value) {
          const primary = getPrimaryService.value;
          logger.info('Primary service:', primary);
          if (primary?.url) {
            logger.info('Using detected service URL:', primary.url);
            await store.dispatch('suseai/setServiceUrl', primary.url);
            updateApiBaseUrl(primary.url);
            currentServiceUrl.value = primary.url;
          } else {
            logger.warn('Service detected but no accessible URL found');
            showCustomUrlModal.value = true;
          }
        } else {
          logger.info('No service detected, prompting for custom URL');
          showCustomUrlModal.value = true;
        }
      } catch (err) {
        logger.error('Service discovery failed:', err);
        showCustomUrlModal.value = true;
      }
    };

    const handleSaveCustomUrl = async (url: string) => {
      await store.dispatch('suseai/setServiceUrl', url);
      updateApiBaseUrl(url);
      currentServiceUrl.value = url;
      showCustomUrlModal.value = false;
      logger.info('Custom service URL saved:', url);
    };

    // Initialize discovery on mount
    onMounted(async () => {
      await checkServiceUrl();
    });

    return {
      // Store getters
      proxyInstalled,
      hasSelectedServices,
      showConfigurationWizard,

      // Modal data
      selectedServerFindings,
      selectedServerName,
      selectedServer,

      // Service discovery
      showCustomUrlModal,
      currentServiceUrl,

      // Modal refs
      scanModal,
      securityModal,
      ruleModal,

      // Methods
      openScanModal,
      openSecurityModal,
      openRuleModal,
      onScanStarted,
      onRulesLoaded,
      handleSaveCustomUrl
    };
  }
});
</script>

