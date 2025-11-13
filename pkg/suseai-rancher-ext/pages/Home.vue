<template>
  <!-- Discovery Wizard - shown when authenticated but no instances discovered yet -->
  <APIDiscoveryWizard
    v-if="showDiscoveryWizard"
    @complete="onDiscoveryComplete"
    @install-new="onInstallNew"
  />

  <!-- Service Selection Wizard - shown when user connects to a discovered instance -->
  <!-- <ServiceSelectionWizard
    v-if="showServiceSelectionWizard"
    :selected-instance="selectedInstance"
    @complete="onServiceSelectionComplete"
    @cancel="onServiceSelectionCancel"
  /> -->

  <!-- Installation Wizard - shown when authenticated but no proxy installed -->
  <InstallWizard
    v-else-if="showInstallWizard"
    @install-complete="onInstallComplete"
  />

  <!-- Main application - shown when proxy is installed and instances are available -->
  <div v-else-if="showMainLayout" class="main-layout">
    <main class="main-content-wrapper">
      <div class="experimental-banner">
       <span class="banner-icon">⚠️</span>
       <strong>Experimental Feature</strong>
       <p>This SUSE AI Universal Proxy feature is experimental and may not be fully compatible with all providers. <a href="https://github.com/SUSE/suse-ai-up/issues" target="_blank">Report Issue</a> or <a href="https://github.com/SUSE/suse-ai-up/pulls" target="_blank">Submit PR</a> to help improve compatibility.</p>
     </div>
     <div class="outlet">
      <header class="fixed-header">
         <div class="title">
           <h1 class="m-0" id="page-title">Service Configuration</h1>
         </div>
      </header>

      <div class="main-content">
         <div class="welcome-section">
           <h2>SUSE AI Universal Proxy is Installed</h2>
           <p>Your SUSE AI Universal Proxy is running and configured. Use the sidebar menu to access individual services.</p>

           <div class="status-summary">
             <div class="status-item">
               <h3>Installation Status</h3>
               <p class="status-success">✅ Proxy Installed</p>
             </div>
             <div class="status-item">
               <h3>Service Discovery</h3>
               <p class="status-success">✅ Completed</p>
             </div>
             <div class="status-item">
               <h3>Configuration</h3>
               <p class="status-success">✅ Ready</p>
             </div>
           </div>
         </div>
       </div>
     </div>
    </main>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, ref } from 'vue'
import { useAuth } from '../composables/useAuth'
// import { useClusterDiscovery } from '../composables/useClusterDiscovery'
import { useMCPGateway } from '../composables/useMCPGateway'
import { useStore } from 'vuex'
import APIDiscoveryWizard from './components/wizard/APIDiscoveryWizard.vue'
// import ServiceSelectionWizard from './components/wizard/ServiceSelectionWizard.vue'
import InstallWizard from '../components/MCPGateway/InstallWizard.vue'

export default defineComponent({
  name: 'Home',
  components: {
    APIDiscoveryWizard,
    // ServiceSelectionWizard,
    InstallWizard
  },

  setup() {
    const { isAuthenticated, hasAdminPrivileges } = useAuth()
    // const { hasDiscoveredInstances } = useClusterDiscovery()
    const hasDiscoveredInstances = ref(false) // Mock for development
    const { proxyInstalled } = useMCPGateway()
    const store = useStore()

    // Get selected services from store
    const selectedServices = computed(() => store.getters.selectedServices)

    // Debug logging
    console.log('Home.vue setup - auth state:', {
      isAuthenticated: isAuthenticated.value,
      hasAdminPrivileges: hasAdminPrivileges.value,
      hasDiscoveredInstances: hasDiscoveredInstances.value,
      proxyInstalled: proxyInstalled.value
    })

    // Determine when to show discovery wizard
    const showDiscoveryWizard = computed(() => {
      // For now, always show discovery wizard if not proxy installed
      const result = !proxyInstalled.value
      console.log('showDiscoveryWizard:', result, { proxyInstalled: proxyInstalled.value })
      return result
    })

    // Determine when to show installation wizard
    const showInstallWizard = computed(() => {
      const result = isAuthenticated.value &&
             hasAdminPrivileges.value &&
             !proxyInstalled.value &&
             !hasDiscoveredInstances.value
      console.log('showInstallWizard:', result)
      return result
    })

    // Determine when to show main layout
    const showMainLayout = computed(() => {
      const result = proxyInstalled.value
      console.log('showMainLayout:', result)
      return result
    })

    // Event handlers
    const onDiscoveryComplete = (config: any) => {
      console.log('Discovery completed with configuration:', config)
      if (config && config.instance && config.services) {
        // Store the selected configuration
        console.log('Selected instance:', config.instance.name, 'Services:', config.services)

        // Store selected services in Vuex store
        store.dispatch('suseai/setSelectedServices', config.services)

        // Store selected instance
        store.dispatch('suseai/setSelectedInstance', config.instance)

        // Mark proxy as installed since we have a configuration
        store.dispatch('suseai/setProxyInstalled', true)

        // Store service URL for the selected instance
        const serviceUrl = `http://${config.instance.externalIPs?.[0] || 'localhost'}:${config.instance.port}`
        store.dispatch('suseai/setServiceUrl', serviceUrl)

        console.log('Configuration stored in Vuex:', {
          selectedServices: config.services,
          proxyInstalled: true,
          serviceUrl
        })
      }
    }

    const onInstallNew = (manualUrl?: string) => {
      console.log('User chose to install new instance', manualUrl ? `with manual URL: ${manualUrl}` : '')
      // TODO: Pass manual URL to InstallWizard if provided
    }

    const onInstallComplete = () => {
      console.log('Installation completed')
    }

    return {
      isAuthenticated,
      hasAdminPrivileges,
      hasDiscoveredInstances,
      proxyInstalled,
      selectedServices,
      showDiscoveryWizard,
      showInstallWizard,
      showMainLayout,
      onDiscoveryComplete,
      onInstallNew,
      onInstallComplete
    }
  }
})
</script>

<style scoped>
.main-layout {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.outlet {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.fixed-header {
  background: var(--header-bg);
  border-bottom: 1px solid var(--header-border);
  padding: 16px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  flex-shrink: 0;
  z-index: 10;
}

.title h1 {
  font-size: 24px;
  font-weight: 600;
  color: var(--header-text);
  margin: 0;
}

.main-content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
  background: var(--body-bg);
}

.welcome-section {
  max-width: 800px;
  margin: 0 auto;
}

.welcome-section h2 {
  font-size: 28px;
  font-weight: 600;
  color: var(--body-text);
  margin-bottom: 16px;
  text-align: center;
}

.welcome-section > p {
  font-size: 16px;
  color: var(--muted);
  line-height: 1.5;
  margin-bottom: 32px;
  text-align: center;
}

.services-selection {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 32px;
}

.service-option {
  background: var(--card-bg, var(--body-bg));
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 20px;
  transition: all 0.2s ease;
}

.service-option:hover {
  border-color: var(--primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.service-checkbox {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  cursor: pointer;
  width: 100%;
}

.service-checkbox input[type="checkbox"] {
  position: absolute;
  opacity: 0;
  cursor: pointer;
}

.checkmark {
  width: 24px;
  height: 24px;
  border: 2px solid var(--border);
  border-radius: 4px;
  background: var(--body-bg);
  position: relative;
  flex-shrink: 0;
  margin-top: 2px;
  transition: all 0.2s ease;
}

.service-checkbox input[type="checkbox"]:checked ~ .checkmark {
  background: var(--primary);
  border-color: var(--primary);
}

.service-checkbox input[type="checkbox"]:checked ~ .checkmark::after {
  content: '';
  position: absolute;
  left: 7px;
  top: 3px;
  width: 6px;
  height: 10px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.service-info h3 {
  font-size: 18px;
  font-weight: 600;
  color: var(--body-text);
  margin: 0 0 8px 0;
}

.service-info p {
  font-size: 14px;
  color: var(--muted);
  line-height: 1.4;
  margin: 0;
}

.selection-summary {
  background: var(--card-bg, var(--body-bg));
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 24px;
  text-align: left;
}

.selection-summary h3 {
  font-size: 20px;
  font-weight: 600;
  color: var(--body-text);
  margin: 0 0 16px 0;
}

.selection-summary ul {
  list-style: none;
  padding: 0;
  margin: 0 0 16px 0;
}

.selection-summary li {
  padding: 8px 0;
  border-bottom: 1px solid var(--border-light, rgba(0,0,0,0.1));
  color: var(--body-text);
  font-size: 14px;
}

.selection-summary li:last-child {
  border-bottom: none;
}

.info-text {
  font-size: 14px;
  color: var(--muted);
  font-style: italic;
  margin: 0;
}

/* Blank page for when proxy not installed */
.blank-page {
  text-align: center;
  padding: 50px;
  font-size: 18px;
  color: #666;
}

/* Utility classes */
.mr-5 {
  margin-right: 5px;
}

.icon-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Experimental Banner */
.experimental-banner {
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 4px;
  padding: 12px 16px;
  margin: 16px 24px 0;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  color: #856404;
}

.banner-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.experimental-banner strong {
  font-weight: 600;
  color: #856404;
}

.experimental-banner p {
  margin: 0;
  font-size: 14px;
  line-height: 1.4;
}

.experimental-banner a {
  color: #d63384;
  text-decoration: underline;
}

.experimental-banner a:hover {
  color: #b02a5b;
}

/* Status Summary Styles */
.status-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-top: 32px;
}

.status-item {
  background: var(--card-bg, var(--body-bg));
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 20px;
  text-align: center;
}

.status-item h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--body-text);
  margin: 0 0 12px 0;
}

.status-item p {
  font-size: 14px;
  margin: 0;
  color: var(--muted);
}

.status-success {
  color: var(--success, #28a745) !important;
  font-weight: 500;
}

.main-content-wrapper {
  flex: 1;
}
</style>