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
      v-if="proxyInstalled && hasSelectedServices"
      @scan-modal-open="openScanModal"
      @security-modal-open="openSecurityModal"
      @rule-modal-open="openRuleModal"
    />

    <!-- Show message when proxy not installed (shouldn't happen since Home.vue handles installation) -->
    <div v-else class="proxy-not-installed">
      <div class="empty-state">
        <h3>SUSE AI Universal Proxy Not Installed</h3>
        <p>Please return to the main page to install the proxy first.</p>
      </div>
    </div>

    <!-- Schedule Scan Modal -->
    <ScheduleScanModal ref="scanModal" @scanStarted="onScanStarted" />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, watch, onMounted, computed } from 'vue';
import { useStore } from 'vuex';
import { useMCPGateway } from '../composables/useMCPGateway';
import { ExperimentalBanner, Dashboard } from '../components/MCPGateway';
import FeatureFlag from '../components/shared/FeatureFlag.vue';
import ScheduleScanModal from '../components/shared/ScheduleScanModal.vue';
import SecurityFindingsModal from '../components/shared/SecurityFindingsModal.vue';
import RuleManagementModal from '../components/shared/RuleManagementModal.vue';


export default defineComponent({
  name: 'MCPGateway',
  components: {
    ExperimentalBanner,
    Dashboard,
    ScheduleScanModal,
    SecurityFindingsModal,
    RuleManagementModal
  },
  setup() {
    const store = useStore();

    const {
      // Store getters
      proxyInstalled,
      hasSelectedServices,

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

    // Service enablement check
    const selectedServices = computed(() => store.state.suseai.settings.selectedServices);
    const isEnabled = computed(() => proxyInstalled.value && selectedServices.value.includes('mcp-gateway'));

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

    // MCPGateway is now only for management - service discovery handled in Home.vue

    return {
      // Store getters
      proxyInstalled,
      hasSelectedServices,
      isEnabled,

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

