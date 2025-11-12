<template>

  <div v-if="!proxyInstalled" class="blank-page">
    <p>Please install the SUSE AI Universal Proxy first via the MCP Gateway page.</p>
  </div>
   <main v-else class="main-layout">
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
           <h2>Configure SUSE AI Universal Proxy Services</h2>
           <p>Select the services you want to enable in your universal adapter:</p>

           <div class="services-selection">
             <div class="service-option" v-for="service in availableServices" :key="service.id">
               <label class="service-checkbox">
                 <input
                   type="checkbox"
                   :value="service.id"
                   v-model="selectedServices"
                   @change="updateSelectedServices"
                 />
                 <span class="checkmark"></span>
                 <div class="service-info">
                   <h3>{{ service.name }}</h3>
                   <p>{{ service.description }}</p>
                 </div>
               </label>
             </div>
           </div>

           <div class="selection-summary" v-if="selectedServices.length > 0">
             <h3>Enabled Services ({{ selectedServices.length }})</h3>
             <ul>
               <li v-for="serviceId in selectedServices" :key="serviceId">
                 {{ getServiceName(serviceId) }}
               </li>
             </ul>
             <p class="info-text">
                These services are available in the sidebar menu under "SUSE AI Universal Proxy".
             </p>
           </div>
         </div>
       </div>
     </div>
  </main>
</template>

<script lang="ts">
import { defineComponent, ref, computed, watch, onMounted } from 'vue'
import { useStore } from 'vuex'


export default defineComponent({
  name: 'Home',

  metaInfo() {
    return {
      title: 'Service Configuration'
    }
  },



  setup() {
    const store = useStore()


    // Check if proxy is installed
    const proxyInstalled = computed(() => store.state.suseai.settings.proxyInstalled)

    // Available services
    const availableServices = [
      {
        id: 'mcp-registry',
        name: 'MCP Registry',
        description: 'Manage MCP server registries and installations'
      },
      {
        id: 'virtual-mcp',
        name: 'Virtual MCP',
        description: 'Create and manage virtual MCP server instances'
      },
      {
        id: 'smart-agents',
        name: 'SmartAgents',
        description: 'Configure and monitor intelligent agent services'
      }
    ]

    // Reactive selected services from store
    const selectedServices = ref([...store.state.suseai.settings.selectedServices])

    // Watch for store changes
    watch(
      () => store.state.suseai.settings.selectedServices,
      (newSelected) => {
        selectedServices.value = [...newSelected]
        // Update menu visibility when store changes
        setTimeout(updateMenuVisibility, 50)
      }
    )

    // Initialize menu visibility on mount
    onMounted(() => {
      setTimeout(updateMenuVisibility, 100)
    })



    // Update selected services in store and refresh menu visibility
    const updateSelectedServices = () => {
      store.dispatch('suseai/setSelectedServices', selectedServices.value)
      // Update menu visibility after a short delay to allow store to update
      setTimeout(updateMenuVisibility, 100)
    }

    // Update menu item visibility based on selected services
    const updateMenuVisibility = () => {
      const currentSelected = store.state.suseai.settings.selectedServices

      // Service name mappings for menu text
      const serviceLabels = {
        'mcp-registry': 'MCP Registry',
        'virtual-mcp': 'Virtual MCP',
        'smart-agents': 'SmartAgents'
      }

      // Find menu items by their text content and toggle visibility
      Object.entries(serviceLabels).forEach(([serviceId, label]) => {
        // Look for menu links containing the service label
        const menuLinks = document.querySelectorAll('a[href*="' + serviceId + '"]')
        menuLinks.forEach(link => {
          const menuItem = link.closest('.side-menu-item, [role="menuitem"], li') as HTMLElement
          if (menuItem) {
            if (currentSelected.includes(serviceId)) {
              menuItem.classList.remove('suse-menu-hidden')
            } else {
              menuItem.classList.add('suse-menu-hidden')
            }
          }
        })

        // Also try to find by text content
        const textElements = document.querySelectorAll('*')
        textElements.forEach(element => {
          if (element.textContent?.trim() === label) {
            const menuItem = element.closest('.side-menu-item, [role="menuitem"], li') as HTMLElement
            if (menuItem) {
              if (currentSelected.includes(serviceId)) {
                menuItem.classList.remove('suse-menu-hidden')
              } else {
                menuItem.classList.add('suse-menu-hidden')
              }
            }
          }
        })
      })
    }

    // Get service name by ID
    const getServiceName = (serviceId: string) => {
      const service = availableServices.find(s => s.id === serviceId)
      return service ? service.name : serviceId
    }

    return {
      proxyInstalled,
      availableServices,
      selectedServices,
      updateSelectedServices,
      getServiceName,
      updateMenuVisibility
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
</style>