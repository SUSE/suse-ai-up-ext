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
</template>

<script lang="ts">
import { defineComponent, ref, watch } from 'vue';
import { useMCPGateway } from '../composables/useMCPGateway';
import { ExperimentalBanner, InstallWizard, Dashboard } from '../components/MCPGateway';
import ScheduleScanModal from '../components/shared/ScheduleScanModal.vue';
import SecurityFindingsModal from '../components/shared/SecurityFindingsModal.vue';
import RuleManagementModal from '../components/shared/RuleManagementModal.vue';

export default defineComponent({
  name: 'MCPGateway',
  components: {
    ExperimentalBanner,
    InstallWizard,
    Dashboard,
    ScheduleScanModal,
    SecurityFindingsModal,
    RuleManagementModal
  },
  setup() {
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

    return {
      // Store getters
      proxyInstalled,
      hasSelectedServices,
      showConfigurationWizard,

      // Modal data
      selectedServerFindings,
      selectedServerName,
      selectedServer,

      // Modal refs
      scanModal,
      securityModal,
      ruleModal,

      // Methods
      openScanModal,
      openSecurityModal,
      openRuleModal,
      onScanStarted,
      onRulesLoaded
    };
  }
});
</script>

