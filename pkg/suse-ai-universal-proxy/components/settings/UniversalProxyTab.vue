<template>
  <div class="universal-proxy-tab">
    <!-- Always show the wizard -->
    <div class="proxy-setup-state">
      <!-- Full Wizard -->
      <SimpleWizard
        ref="wizardRef"
        @complete="handleWizardComplete"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted } from 'vue'
import { useStore } from 'vuex'
import SimpleWizard from './SimpleWizard.vue'

export default defineComponent({
  name: 'UniversalProxyTab',
  components: {
    SimpleWizard
  },
  setup() {
    const store = useStore()
    const wizardRef = ref()

    // Store state
    const proxyInstalled = computed(() => store.state.suseai.settings.proxyInstalled)
    const selectedServices = computed(() => store.state.suseai.settings.selectedServices || [])
    const availableClusters = computed(() => store.state.suseai.settings.availableClusters || [])
    const serviceUrls = computed(() => store.state.suseai.settings.serviceUrls || [])
    const proxyConfig = computed(() => store.state.suseai.proxyConfig || {})

    // Service name mapping
    const getServiceName = (serviceId: string): string => {
      const serviceMap: Record<string, string> = {
        'mcp-gateway': 'MCP Gateway',
        'mcp-registry': 'MCP Registry',
        'virtual-mcp': 'Virtual MCP',
        'smart-agents': 'SmartAgents'
      }
      return serviceMap[serviceId] || serviceId
    }

    // Handle wizard completion
    const handleWizardComplete = (config: { clusters: any[]; services: string[] }) => {
      console.log('Wizard completed with config:', config)
      // The wizard component should handle setting proxyInstalled to true
      // Additional completion handling can be added here if needed
    }

    // Re-run wizard functionality
    const rerunWizard = () => {
      // Reset wizard state to allow re-running
      if (wizardRef.value) {
        // Reset the wizard to the first step
        wizardRef.value.resetWizard?.()
      }
    }

    onMounted(() => {
      // Any initialization if needed
    })

    return {
      proxyInstalled,
      selectedServices,
      availableClusters,
      serviceUrls,
      proxyConfig,
      wizardRef,
      getServiceName,
      handleWizardComplete,
      rerunWizard
    }
  }
})
</script>

<style scoped>
.universal-proxy-tab {
  padding: 20px;
}

/* Setup State Styles */
.proxy-setup-state {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.setup-header {
  margin-bottom: 20px;
}

.setup-notice {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background: var(--warning-bg, #fff3cd);
  border: 1px solid var(--warning-border, #ffeaa7);
  border-radius: 6px;
}

.setup-notice .icon {
  color: var(--warning, #856404);
  font-size: 20px;
  margin-top: 2px;
}

.notice-content h4 {
  margin: 0 0 8px 0;
  color: var(--warning, #856404);
  font-size: 16px;
  font-weight: 600;
}

.notice-content p {
  margin: 0;
  color: var(--text-muted, #6c757d);
  font-size: 14px;
  line-height: 1.4;
}

/* Completion State Styles */
.proxy-completion-state {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.completion-header {
  margin-bottom: 20px;
}

.completion-banner {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background: var(--success-bg, #d4edda);
  border: 1px solid var(--success-border, #c3e6cb);
  border-radius: 6px;
}

.completion-banner .icon {
  color: var(--success, #155724);
  font-size: 20px;
  margin-top: 2px;
}

.banner-content h3 {
  margin: 0 0 8px 0;
  color: var(--success, #155724);
  font-size: 18px;
  font-weight: 600;
}

.banner-content p {
  margin: 0;
  color: var(--text-muted, #6c757d);
  font-size: 14px;
  line-height: 1.4;
}

.completion-details {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.detail-section {
  background: var(--card-bg, #fff);
  border: 1px solid var(--border, #dee2e6);
  border-radius: 8px;
  padding: 20px;
}

.detail-section h4 {
  margin: 0 0 16px 0;
  color: var(--text, #333);
  font-size: 16px;
  font-weight: 600;
}

.services-list, .proxy-services-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.service-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px;
  background: var(--card-bg, #fff);
  border: 1px solid var(--border, #dee2e6);
  border-radius: 6px;
}

.service-item .icon {
  font-size: 16px;
  min-width: 16px;
  margin-top: 2px;
  color: var(--primary, #007bff);
}

.service-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.service-url {
  color: var(--text, #333);
  font-size: 14px;
  font-family: monospace;
  font-weight: 500;
  word-break: break-all;
}

.service-info {
  color: var(--text-muted, #6c757d);
  font-size: 12px;
}

.cluster-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
}

.cluster-item .icon {
  font-size: 16px;
  min-width: 16px;
}

.cluster-item span {
  color: var(--text, #333);
  font-size: 14px;
}

.no-services, .no-clusters {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  color: var(--text-muted, #6c757d);
  font-style: italic;
}

.no-services .icon, .no-clusters .icon {
  color: var(--text-muted, #6c757d);
}

.completion-actions {
  display: flex;
  justify-content: center;
  padding-top: 20px;
  border-top: 1px solid var(--border, #dee2e6);
}

.completion-actions .btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 500;
}

/* Hide wizard breadcrumb/step indicator */
.universal-proxy-tab :deep(.wizard-breadcrumb),
.universal-proxy-tab :deep(.wizard-step-indicator),
.universal-proxy-tab :deep(.step-indicator),
.universal-proxy-tab :deep(.wizard-progress) {
  display: none !important;
}

/* Hide any async button text or translation keys */
.universal-proxy-tab :deep([data-testid*="async"]),
.universal-proxy-tab :deep(.async-button),
.universal-proxy-tab :deep(.wizard-step-info) {
  display: none !important;
}

/* Wizard Button Positioning Override */
.universal-proxy-tab :deep(.wizard-footer) {
  position: fixed !important;
  bottom: 0 !important;
  left: 0 !important;
  right: 0 !important;
  background: var(--card-bg, #fff) !important;
  border-top: 1px solid var(--border, #dee2e6) !important;
  padding: 16px 24px !important;
  display: flex !important;
  justify-content: flex-end !important;
  gap: 12px !important;
  z-index: 100 !important;
}

.universal-proxy-tab :deep(.wizard-footer .btn) {
  margin: 0 !important;
}

.universal-proxy-tab :deep(.wizard-content) {
  padding-bottom: 80px !important; /* Make room for fixed footer */
}

/* Responsive Design */
@media (max-width: 768px) {
  .completion-details {
    grid-template-columns: 1fr;
  }

  .setup-notice, .completion-banner {
    flex-direction: column;
    text-align: center;
  }

  .setup-notice .icon, .completion-banner .icon {
    align-self: center;
  }

  .universal-proxy-tab :deep(.wizard-footer) {
    padding: 12px 16px !important;
    gap: 8px !important;
  }
}
</style>