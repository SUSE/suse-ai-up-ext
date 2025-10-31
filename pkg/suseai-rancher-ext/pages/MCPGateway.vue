 <template>
   <div v-if="!proxyInstalled || showConfigurationWizard" class="wizard-container">
     <!-- Wizard Header -->
     <div class="wizard-header">
        <h1>Install Universal Proxy</h1>
        <p>Configure your SUSE AI Universal Proxy installation</p>
     </div>

     <!-- Step Navigation -->
     <div class="wizard-nav">
       <div class="steps-container">
         <div
           v-for="(step, index) in wizardSteps"
           :key="step.name"
           class="step-item"
           :class="{
             'active': index === currentStep,
             'completed': index < currentStep,
             'disabled': !step.ready && index > currentStep
           }"
         >
           <div class="step-number">
             <i v-if="index < currentStep" class="icon icon-checkmark" />
             <span v-else>{{ index + 1 }}</span>
           </div>
           <div class="step-label">{{ step.label }}</div>
         </div>
       </div>
     </div>

     <!-- Step Content -->
     <div class="wizard-content-wrapper">
       <div class="wizard-content">
          <!-- Step 1: Install Universal Proxy -->
         <div v-if="currentStep === 0" class="install-step">
           <div class="empty-state">
             <div class="empty-state-content">
               <div class="app-header">
                 <div class="app-icon">
                   <i class="icon icon-gear"></i>
                 </div>
                  <div class="app-info">
                     <h2>SUSE AI Universal Proxy</h2>
                  </div>
               </div>

                 <div class="empty-message">
                   <h3 v-if="checkingService">Checking for existing service...</h3>
                   <h3 v-else-if="serviceFound">Found 1 SUSE AI Universal Proxy at: {{ serviceUrl }}</h3>
                   <h3 v-else-if="!installed">No instances found</h3>
                   <h3 v-else>1 instance of SUSE AI Universal Proxy found</h3>
                   <p v-if="checkingService">Please wait while we check for existing services.</p>
                   <p v-else-if="serviceFound">An existing SUSE AI Universal Proxy service was detected. You can use this instance or install a new one.</p>
                   <p v-else-if="!installed">This application has not been installed yet.</p>
                   <p v-else>Your SUSE AI Universal Proxy is ready to use.</p>
                 </div>

                 <!-- Service selection when existing service is found -->
                 <div v-if="serviceFound && !checkingService" class="service-selection">
                   <div class="service-cards">
                     <!-- Existing Service Card -->
                     <div
                       class="service-card"
                       :class="{ selected: useExistingService }"
                       @click="selectExistingService"
                     >
                       <div class="card-header">
                         <div class="service-icon">
                           <i class="icon icon-server"></i>
                         </div>
                         <div class="service-info">
                           <h4>Use Existing Service</h4>
                           <p>Connect to the discovered SUSE AI Universal Proxy</p>
                         </div>
                         <div class="selection-indicator">
                           <i v-if="useExistingService" class="icon icon-checkmark"></i>
                         </div>
                       </div>
                       <div class="card-details">
                         <div class="service-url">{{ serviceUrl }}</div>
                         <div class="service-status">
                           <span class="status-dot status-active"></span>
                           Service Available
                         </div>
                       </div>
                     </div>
                   </div>

                   <!-- Install New Button -->
                   <div class="install-new-section">
                     <button
                       class="btn btn-secondary install-new-button"
                       @click="selectInstallNew"
                     >
                       <i class="icon icon-plus"></i>
                       Install New Universal Proxy
                     </button>
                   </div>
                 </div>


             </div>
           </div>
         </div>

         <!-- Step 2: Select Services -->
         <div v-else-if="currentStep === 1" class="select-services-step">
           <div class="services-info">
             <h3>Select Additional Services</h3>
              <p>Choose the additional services you want to enable with your SUSE AI Universal Proxy. You can select multiple services.</p>
           </div>

           <div class="services-grid">
             <div
               v-for="service in services"
               :key="service.id"
               class="service-card"
               :class="{ selected: selectedServices.includes(service.id) }"
               @click="toggleService(service.id)"
             >
               <div class="card-header">
                 <div class="service-icon">
                   <i :class="service.iconClass"></i>
                 </div>
                 <div class="service-info">
                   <h4>{{ service.name }}</h4>
                   <p>{{ service.description }}</p>
                 </div>
               </div>
                <div class="card-footer">
                  <div class="service-selection">
                    <label class="checkbox-label">
                      <input
                        type="checkbox"
                        :checked="selectedServices.includes(service.id)"
                        @change="toggleService(service.id)"
                      />
                      <span class="checkbox-text">Select</span>
                    </label>
                  </div>
                </div>
             </div>
           </div>

           <div class="selection-summary" v-if="selectedServices.length > 0">
             <h4>Selected Services:</h4>
             <ul>
               <li v-for="serviceId in selectedServices" :key="serviceId">
                 {{ getServiceName(serviceId) }}
               </li>
             </ul>
           </div>
         </div>

         <!-- Step 3: Review -->
         <div v-else-if="currentStep === 2" class="review-step">
           <h3>Review Configuration</h3>
           <div class="review-content">
             <div class="review-item">
                <h4>Universal Proxy</h4>
               <p>✓ Ready to install</p>
             </div>
             <div class="review-item" v-if="selectedServices.length > 0">
               <h4>Selected Services</h4>
               <ul>
                 <li v-for="serviceId in selectedServices" :key="serviceId">
                   {{ getServiceName(serviceId) }}
                 </li>
               </ul>
             </div>
             <div class="review-item" v-else>
               <h4>Selected Services</h4>
               <p>No additional services selected</p>
             </div>
           </div>
         </div>
       </div>
     </div>

     <!-- Bottom Navigation -->
     <div class="wizard-buttons-fixed">
       <button
         v-if="currentStep > 0"
         class="btn role-secondary"
         @click="previousStep"
       >
         Previous
       </button>

       <div class="flex-spacer" />

       <button
         class="btn role-secondary mr-10"
         @click="onWizardCancel"
       >
         Cancel
       </button>

       <button
         v-if="currentStep < wizardSteps.length - 1"
         class="btn role-primary"
         :disabled="!wizardSteps[currentStep].ready"
         @click="nextStep"
       >
         Next
       </button>

       <button
         v-else-if="currentStep === wizardSteps.length - 1"
         class="btn role-primary"
         @click="onWizardFinish"
       >
         Finish
       </button>
     </div>
  </div>

  <div v-else-if="proxyInstalled && !hasSelectedServices" class="installed-section">
    <div class="empty-state">
      <div class="empty-state-content">
        <div class="app-header">
          <div class="app-icon">
            <i class="icon icon-gear"></i>
          </div>
          <div class="app-info">
             <h2>SUSE AI Universal Proxy</h2>
             <span class="app-badge">Universal Proxy</span>
          </div>
        </div>

        <div class="empty-message">
           <h3>1 SUSE AI Universal Proxy instance installed</h3>
           <p>Your Universal Proxy is ready. Configure additional services to get started.</p>
        </div>

        <div class="install-action">
          <button class="btn btn-primary install-button" @click="startServiceConfiguration">
            Configure Services
          </button>
        </div>
      </div>
    </div>
  </div>

  <div v-else class="mcp-gateway-content">
     <h1>MCP Gateway</h1>
     <p>Monitor and manage your Model Context Protocol endpoints</p>

      <div class="metrics-grid">
        <div class="metric-card">
          <h3>Discovered MCP</h3>
          <span class="metric-value" v-if="!loading">{{ discoveredCount }}</span>
          <span class="metric-value" v-else>...</span>
        </div>
        <div class="metric-card">
          <h3>Registered MCP</h3>
          <span class="metric-value" v-if="!loading">{{ registeredCount }}</span>
          <span class="metric-value" v-else>...</span>
        </div>
        <div class="metric-card">
          <h3>Available Registered MCP</h3>
          <span class="metric-value" v-if="!loading">{{ availableCount }}</span>
          <span class="metric-value" v-else>...</span>
        </div>
        <div class="metric-card">
          <h3>error calls rate</h3>
          <span class="metric-value" v-if="!loading">{{ errorRate }}</span>
          <span class="metric-value" v-else>...</span>
        </div>
      </div>

      <div class="action-buttons">
        <button
          class="btn role-primary"
          @click="handleManualScan"
          :disabled="scanning"
        >
          <i v-if="scanning" class="icon icon-spinner icon-spin mr-5"></i>
          {{ scanning ? 'Scanning...' : 'Manual MCP scan' }}
        </button>
        <button class="btn role-secondary" @click="handleScheduleScan">
          Schedule MCP Scan
        </button>
        <button class="btn role-secondary" @click="handleCreateAdapter">
          Create Adapter
        </button>
        <button class="btn role-secondary" @click="handleSecurityCheck">
          MCP Security Check
        </button>
      </div>

      <div class="endpoints-section">
       <h2>Endpoint Status</h2>
       <table class="endpoints-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th>Requests/min</th>
              <th>Errors</th>
              <th>Last Activity</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="6" class="loading-row">Loading adapters...</td>
            </tr>
            <tr v-else-if="error">
              <td colspan="6" class="error-row">{{ error }}</td>
            </tr>
            <tr v-else-if="adapters.length === 0">
              <td colspan="6" class="empty-row">No adapters found</td>
            </tr>
            <tr v-else v-for="adapter in adapters" :key="adapter.id">
              <td>{{ adapter.name }}</td>
              <td>
                <span :class="adapter.replicaCount && adapter.replicaCount > 0 ? 'status-active' : 'status-inactive'">
                  {{ adapter.replicaCount && adapter.replicaCount > 0 ? 'Active' : 'Inactive' }}
                </span>
              </td>
              <td>-</td>
              <td>0</td>
              <td>{{ adapter.lastUpdatedAt ? new Date(adapter.lastUpdatedAt).toLocaleString() : 'Unknown' }}</td>
              <td>
                <div class="action-buttons">
                  <button class="btn btn-sm role-secondary" @click="viewAdapterDetails(adapter)" title="View Details">
                    <i class="icon icon-info"></i>
                  </button>
                  <button class="btn btn-sm role-secondary" @click="viewAdapterLogs(adapter)" title="View Logs">
                    <i class="icon icon-file"></i>
                  </button>
                  <button class="btn btn-sm role-secondary" @click="editAdapter(adapter)" title="Edit">
                    <i class="icon icon-edit"></i>
                  </button>
                  <button class="btn btn-sm role-secondary" @click="deleteAdapter(adapter)" title="Delete">
                    <i class="icon icon-trash"></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="discovered-servers-section">
        <h2>Discovered MCP Servers</h2>
        <table class="discovered-servers-table">
          <thead>
            <tr>
              <th>Address</th>
              <th>Protocol</th>
              <th>Connection</th>
              <th>Status</th>
              <th>Last Seen</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="6" class="loading-row">Loading discovered servers...</td>
            </tr>
            <tr v-else-if="discoveredServers.length === 0">
              <td colspan="6" class="empty-row">No servers discovered yet. Run a scan to find MCP servers.</td>
            </tr>
            <tr v-else v-for="server in discoveredServers" :key="server.id">
              <td>{{ server.address }}</td>
              <td>{{ server.protocol || 'MCP' }}</td>
              <td>{{ server.connection || 'StreamableHttp' }}</td>
              <td>
                <span :class="server.status === 'healthy' ? 'status-active' : 'status-inactive'">
                  {{ server.status || 'unknown' }}
                </span>
              </td>
              <td>{{ server.lastSeen ? new Date(server.lastSeen).toLocaleString() : 'Never' }}</td>
              <td>
                <button
                  class="btn btn-sm role-primary"
                  @click="registerServer(server)"
                  :disabled="server.status !== 'healthy'"
                >
                  Register
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Schedule Scan Modal -->
      <ScheduleScanModal ref="scheduleScanModal" :manual-mode="isManualScanMode" @scan-started="onScanStarted" />

      <!-- Create Adapter Modal -->
      <CreateAdapterModal ref="createAdapterModal" />
    </div>
  </template>

<script lang="ts">
import { defineComponent, computed, ref, getCurrentInstance, onMounted, onUnmounted } from 'vue';
import { useStore } from 'vuex';
import { logger } from '../utils/logger';
import { MCPService } from '../services/mcp-service';
import type { AdapterResource, DiscoveredServer } from '../services/mcp-service';
import ScheduleScanModal from '../components/shared/ScheduleScanModal.vue';
import CreateAdapterModal from '../components/shared/CreateAdapterModal.vue';

interface Service {
  id: string;
  name: string;
  description: string;
  iconClass: string;
}

export default defineComponent({
  setup() {
    const vm = getCurrentInstance()!.proxy as any;
    const store = useStore();
    const router = vm.$router;
    const route = vm.$route;

    const proxyInstalled = computed(() => store.state.suseai.settings.proxyInstalled);

    // Wizard state
    const currentStep = ref(0);
    const installing = ref(false);
    const installed = ref(false);
    const selectedServices = ref<string[]>([]);

    // Service discovery
    const serviceFound = ref(false);
    const serviceUrl = ref('');
    const checkingService = ref(false);
    const useExistingService = ref<boolean | null>(null);

    // Configuration mode
    const showConfigurationWizard = ref(false);

    // MCP Gateway state
    const discoveredServers = ref<DiscoveredServer[]>([]);
    const adapters = ref<AdapterResource[]>([]);
    const loading = ref(false);
    const error = ref<string | null>(null);
    const scanning = ref(false);

    // Polling
    let pollInterval: number | null = null;

    // Modal refs
    const scheduleScanModal = ref<any>(null);
    const createAdapterModal = ref<any>(null);

    // Modal state
    const isManualScanMode = ref(false);

    // Services data
    const services: Service[] = [
      {
        id: 'mcp-registry',
        name: 'MCP Registry',
        description: 'Registry for managing MCP connections and installations.',
        iconClass: 'icon icon-list'
      },
      {
        id: 'virtual-mcp',
        name: 'Virtual MCP',
        description: 'Virtual Model Context Protocol servers for enhanced AI interactions.',
        iconClass: 'icon icon-server'
      },
      {
        id: 'smart-agents',
        name: 'SmartAgents',
        description: 'Intelligent agents for automated tasks and workflows.',
        iconClass: 'icon icon-user'
      }
    ];

    // Wizard steps configuration
    const wizardSteps = computed(() => [
      {
        name: 'install',
        label: 'Install Adapter',
        ready: canProceed.value,
        weight: 1
      },
      {
        name: 'services',
        label: 'Select Services',
        ready: installed.value,
        weight: 2
      },
      {
        name: 'review',
        label: 'Review',
        ready: installed.value,
        weight: 3
      }
    ]);

    // Installation handler
    const handleInstall = () => {
      installing.value = true;
      setTimeout(() => {
        installing.value = false;
        installed.value = true;
      }, 5000);
    };

    // Service selection
    const toggleService = (serviceId: string) => {
      const index = selectedServices.value.indexOf(serviceId);
      if (index > -1) {
        selectedServices.value.splice(index, 1);
      } else {
        selectedServices.value.push(serviceId);
      }
    };

    const getServiceName = (serviceId: string) => {
      const service = services.find(s => s.id === serviceId);
      return service ? service.name : serviceId;
    };

    // Wizard navigation
    const nextStep = () => {
      if (currentStep.value === 0) {
        // First step - handle service selection
        if (useExistingService.value) {
          // Use existing service
          installed.value = true;
          store.dispatch('suseai/setProxyInstalled', true);
          currentStep.value = 1; // Go to services selection
          logger.info('Using existing SUSE AI Universal Proxy service');
        } else {
          // Install new service
          handleInstall();
        }
      } else if (currentStep.value < wizardSteps.value.length - 1 && wizardSteps.value[currentStep.value + 1].ready) {
        currentStep.value++;
      }
    };

    const previousStep = () => {
      if (currentStep.value > 0) {
        currentStep.value--;
      }
    };

    const onWizardCancel = () => {
      if (showConfigurationWizard.value) {
        // Just hide the configuration wizard
        showConfigurationWizard.value = false;
        currentStep.value = 0;
        selectedServices.value = [];
      } else {
        // Reset wizard state
        currentStep.value = 0;
        installing.value = false;
        installed.value = false;
        selectedServices.value = [];
        // Navigate back or to home
        router?.push({
          name: `c-cluster-suseai-home-root`,
          params: { cluster: route?.params?.cluster }
        });
      }
    };

    const onWizardFinish = () => {
      // Save selected services to store
      store.dispatch('suseai/setSelectedServices', selectedServices.value);
      // Set proxy as installed (if not already)
      store.dispatch('suseai/setProxyInstalled', true);

      if (showConfigurationWizard.value) {
        // Just hide the configuration wizard
        showConfigurationWizard.value = false;
        currentStep.value = 0;
      }
      // Enable selected services (logic for enabling pages)
      // This would enable navigation to the respective pages
    };

    // Computed property to check if any services are selected
    const hasSelectedServices = computed(() => {
      const storedServices = store.state.suseai.settings.selectedServices || [];
      return storedServices.length > 0;
    });

    // Method to start service configuration (go back to wizard)
    const startServiceConfiguration = () => {
      showConfigurationWizard.value = true;
      currentStep.value = 1; // Go to service selection step
      selectedServices.value = store.state.suseai.settings.selectedServices || [];
    };

    // Check for existing service
    const checkForExistingService = async () => {
      checkingService.value = true;
      try {
        await MCPService.getAdapters();
        serviceFound.value = true;
        serviceUrl.value = 'http://localhost:8911';
        logger.info('Existing SUSE AI Universal Proxy service found');
      } catch (err) {
        serviceFound.value = false;
        serviceUrl.value = '';
        logger.debug('No existing SUSE AI Universal Proxy service found');
      } finally {
        checkingService.value = false;
      }
    };

    // Service selection methods
    const selectExistingService = () => {
      useExistingService.value = true;
    };

    const selectInstallNew = () => {
      useExistingService.value = false;
    };

    // Handle next button
    const handleNext = () => {
      if (useExistingService.value) {
        // Use existing service - mark as installed and proceed to services
        installed.value = true;
        store.dispatch('suseai/setProxyInstalled', true);
        currentStep.value = 1; // Go to services selection
        logger.info('Using existing SUSE AI Universal Proxy service');
      } else {
        // Install new service
        handleInstall();
      }
    };

    // Computed property for next button state
    const canProceed = computed(() => {
      if (checkingService.value) return false;
      if (!serviceFound.value) return !installed.value; // Can proceed if no service found and not installed
      return useExistingService.value !== null; // Must select an option when service is found
    });

    // MCP Gateway methods
    const fetchDiscoveredServers = async () => {
      try {
        discoveredServers.value = await MCPService.getDiscoveredServers();
      } catch (err) {
        logger.error('Failed to fetch discovered servers', err);
        // Continue - this is not critical
      }
    };

    const fetchAdapters = async () => {
      try {
        adapters.value = await MCPService.getAdapters();
      } catch (err) {
        logger.error('Failed to fetch adapters', err);
        error.value = 'Failed to load MCP adapters';
      }
    };

    const loadData = async () => {
      loading.value = true;
      error.value = null;
      try {
        await Promise.all([
          fetchDiscoveredServers(),
          fetchAdapters()
        ]);
      } catch (err) {
        logger.error('Failed to load MCP data', err);
      } finally {
        loading.value = false;
      }
    };

    const handleManualScan = () => {
      isManualScanMode.value = true;
      scheduleScanModal.value?.openModal();
    };

    const handleScheduleScan = () => {
      isManualScanMode.value = false;
      scheduleScanModal.value?.openModal();
    };

    const handleCreateAdapter = () => {
      createAdapterModal.value?.openModal();
    };

    const onScanStarted = async () => {
      // Refresh discovered servers after a manual scan
      await fetchDiscoveredServers();
    };

    const handleSecurityCheck = async () => {
      try {
        // Perform basic security checks on adapters
        const securityIssues: string[] = [];

        for (const adapter of adapters.value) {
          // Check for insecure configurations
          if (!adapter.useWorkloadIdentity) {
            securityIssues.push(`${adapter.name}: Not using workload identity`);
          }

          if (adapter.connectionType === 'StreamableHttp') {
            // Additional checks for HTTP connections
            securityIssues.push(`${adapter.name}: Using HTTP connection (consider SSE for better security)`);
          }

          // Check replica count
          if (!adapter.replicaCount || adapter.replicaCount < 1) {
            securityIssues.push(`${adapter.name}: No replicas configured`);
          }
        }

        if (securityIssues.length === 0) {
          alert('Security check passed: No issues found');
        } else {
          alert(`Security check found ${securityIssues.length} issue(s):\n\n${securityIssues.join('\n')}`);
        }

        logger.info('Security check completed', { data: { issues: securityIssues.length } });

      } catch (err) {
        logger.error('Failed to perform security check', err);
        error.value = 'Failed to perform security check';
      }
    };

    const registerServer = async (server: DiscoveredServer) => {
      try {
        // Create adapter data from discovered server
        const adapterData = {
          name: `adapter-${server.id}`,
          imageName: 'mcp-server', // Default image
          imageVersion: 'latest',
          connectionType: server.connection,
          protocol: server.protocol,
          description: `Adapter for discovered server ${server.address}`,
          replicaCount: 1,
          useWorkloadIdentity: false
        };

        await MCPService.createAdapter(adapterData);

        // Refresh adapters list
        await fetchAdapters();

        logger.info('Server registered successfully', { data: { serverId: server.id, adapterName: adapterData.name } });

      } catch (err) {
        logger.error('Failed to register server', err);
        error.value = 'Failed to register server';
      }
    };

    const viewAdapterDetails = (adapter: AdapterResource) => {
      // For now, just show an alert with adapter details
      // TODO: Create a proper modal for adapter details
      const details = `
Name: ${adapter.name}
Image: ${adapter.imageName}:${adapter.imageVersion}
Status: ${adapter.replicaCount && adapter.replicaCount > 0 ? 'Active' : 'Inactive'}
Replicas: ${adapter.replicaCount || 0}
Connection: ${adapter.connectionType || 'N/A'}
Protocol: ${adapter.protocol || 'MCP'}
Description: ${adapter.description || 'N/A'}
Created: ${adapter.createdAt ? new Date(adapter.createdAt).toLocaleString() : 'Unknown'}
Updated: ${adapter.lastUpdatedAt ? new Date(adapter.lastUpdatedAt).toLocaleString() : 'Unknown'}
      `.trim();

      alert(`Adapter Details:\n\n${details}`);
    };

    const viewAdapterLogs = async (adapter: AdapterResource) => {
      try {
        const logsResponse = await MCPService.getAdapterLogs(adapter.name);
        alert(`Logs for ${adapter.name}:\n\n${logsResponse.logs}`);
      } catch (err) {
        logger.error('Failed to fetch adapter logs', err);
        alert('Failed to fetch adapter logs');
      }
    };

    const editAdapter = (adapter: AdapterResource) => {
      // TODO: Implement edit functionality with a modal
      alert('Edit functionality not yet implemented');
    };

    const deleteAdapter = async (adapter: AdapterResource) => {
      if (confirm(`Are you sure you want to delete adapter "${adapter.name}"?`)) {
        try {
          await MCPService.deleteAdapter(adapter.name);
          await fetchAdapters();
          logger.info('Adapter deleted successfully', { data: { adapterName: adapter.name } });
        } catch (err) {
          logger.error('Failed to delete adapter', err);
          alert('Failed to delete adapter');
        }
      }
    };

    // Computed metrics
    const discoveredCount = computed(() => discoveredServers.value.length);
    const registeredCount = computed(() => adapters.value.length);
    const availableCount = computed(() => {
      // For now, assume all adapters are available
      // TODO: Check actual status from adapter status endpoint
      return adapters.value.length;
    });
    const errorRate = computed(() => {
      // TODO: Calculate actual error rate from adapter metrics
      return '0.1%';
    });

    // Lifecycle
    onMounted(async () => {
      // Check for existing service first
      await checkForExistingService();

      if (hasSelectedServices.value) {
        loadData();
        // Start polling for updates every 30 seconds
        pollInterval = window.setInterval(() => {
          if (!loading.value && !scanning.value) {
            fetchDiscoveredServers();
            fetchAdapters();
          }
        }, 30000);
      }
    });

    onUnmounted(() => {
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
    });

    return {
      proxyInstalled,
      currentStep,
      wizardSteps,
      installing,
      installed,
      selectedServices,
      services,
      handleInstall,
      toggleService,
      getServiceName,
      nextStep,
      previousStep,
      onWizardCancel,
      onWizardFinish,
      hasSelectedServices,
      startServiceConfiguration,
      // MCP Gateway data
      discoveredServers,
      adapters,
      loading,
      error,
      scanning,
      discoveredCount,
      registeredCount,
      availableCount,
      errorRate,
      // MCP Gateway methods
      loadData,
      handleManualScan,
      handleScheduleScan,
      handleCreateAdapter,
      handleSecurityCheck,
      registerServer,
      viewAdapterDetails,
      viewAdapterLogs,
      editAdapter,
      deleteAdapter,
      selectExistingService,
      selectInstallNew,
      handleNext,
      canProceed,
      checkForExistingService,
      onScanStarted,
      // Modal refs
      scheduleScanModal,
      createAdapterModal,
      // Modal state
      isManualScanMode,
      // Service discovery
      serviceFound,
      serviceUrl,
      checkingService,
      useExistingService,
      // Configuration mode
      showConfigurationWizard
    };
  }
});
</script>

<style scoped>
/* Wizard Container */
.wizard-container {
  background: var(--body-bg, #ffffff);
  max-width: 100%;
  width: 100%;
  height: calc(100vh - 140px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Wizard Header */
.wizard-header {
  flex-shrink: 0;
  padding: 20px 24px 16px 24px;
  background: var(--body-bg, #ffffff);
}

.wizard-header h1 {
  margin: 0 0 4px 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--body-text, #111827);
  line-height: 1.2;
}

.wizard-header p {
  margin: 0;
  font-size: 14px;
  color: var(--muted, #6b7280);
  font-weight: 400;
}

/* Step Navigation */
.wizard-nav {
  flex-shrink: 0;
  width: 100%;
  padding: 20px 24px;
  background: var(--body-bg, #ffffff);
}

.steps-container {
  display: flex;
  justify-content: space-between;
  position: relative;
  max-width: 100%;
  align-items: center;
}

.steps-container::before {
  content: '';
  position: absolute;
  top: 20px;
  left: 50px;
  right: 50px;
  height: 1px;
  background: var(--border, #f3f4f6);
  z-index: 0;
}

.step-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  flex: 1;
  max-width: 200px;
  position: relative;
  z-index: 1;
  transition: all 0.2s ease;
}

.step-item.disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.step-number {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--body-bg, #ffffff);
  border: 1px solid var(--border, #f3f4f6);
  color: var(--muted, #9ca3af);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
  font-size: 14px;
  margin-bottom: 8px;
  transition: all 0.2s ease;
}

.step-item.active .step-number {
  background: var(--primary, #2563eb);
  border-color: var(--primary, #2563eb);
  color: white;
}

.step-item.completed .step-number {
  background: var(--success, #16a34a);
  border-color: var(--success, #16a34a);
  color: white;
}

.step-label {
  font-size: 13px;
  text-align: center;
  color: var(--muted, #6b7280);
  font-weight: 400;
  line-height: 1.3;
}

.step-item.active .step-label {
  color: var(--primary, #2563eb);
  font-weight: 500;
}

.step-item.completed .step-label {
  color: var(--body-text, #111827);
}

/* Content Area */
.wizard-content-wrapper {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  background: var(--body-bg, #ffffff);
}

.wizard-content {
  padding: 24px;
  background: var(--body-bg, #ffffff);
  margin: 0;
  min-height: 100%;
}

/* Install Step */
.install-step .empty-state {
  text-align: center;
  max-width: 500px;
  margin: 0 auto;
}

.install-step .empty-state-content {
  padding: 40px 20px;
}

.install-step .app-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 32px;
}

.install-step .app-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  background: var(--accent-btn);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border);
}

.install-step .app-icon i {
  font-size: 24px;
  color: var(--primary);
}

.install-step .app-info h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--body-text);
}

.install-step .app-badge {
  background: #d4edda;
  color: #155724;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.install-step .empty-message {
  margin-bottom: 32px;
}

.install-step .empty-message h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--body-text);
}

.install-step .empty-message p {
  margin: 0;
  color: var(--muted);
  font-size: 14px;
}

.install-step .install-action {
  display: flex;
  justify-content: center;
}

.install-step .install-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 500;
}

.service-selection {
  margin: 24px 0;
}

.service-cards {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 20px;
}

.service-card {
  border: 2px solid var(--border, #e5e7eb);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: var(--body-bg, #ffffff);
  overflow: hidden;
}

.service-card:hover {
  border-color: var(--primary, #2563eb);
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.1);
}

.service-card.selected {
  border-color: var(--primary, #2563eb);
  background: rgba(37, 99, 235, 0.05);
  box-shadow: 0 2px 12px rgba(37, 99, 235, 0.15);
}

.card-header {
  display: flex;
  align-items: center;
  padding: 16px;
  gap: 12px;
}

.service-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: var(--accent-btn, #f3f4f6);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.service-icon i {
  font-size: 20px;
  color: var(--primary, #2563eb);
}

.service-info {
  flex: 1;
}

.service-info h4 {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--body-text, #111827);
}

.service-info p {
  margin: 0;
  font-size: 14px;
  color: var(--muted, #6b7280);
}

.selection-indicator {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid var(--border, #e5e7eb);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.service-card.selected .selection-indicator {
  background: var(--primary, #2563eb);
  border-color: var(--primary, #2563eb);
}

.selection-indicator i {
  color: white;
  font-size: 14px;
  font-weight: bold;
}

.card-details {
  padding: 0 16px 16px 16px;
  border-top: 1px solid var(--border, #e5e7eb);
  background: var(--accent-bg, #f9fafb);
}

.service-url {
  font-family: monospace;
  font-size: 13px;
  color: var(--primary, #2563eb);
  margin-bottom: 8px;
  font-weight: 500;
}

.service-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--muted, #6b7280);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-active {
  background: var(--success, #16a34a);
}

.install-new-section {
  display: flex;
  justify-content: center;
}

.install-new-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  font-size: 14px;
  font-weight: 500;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.install-new-button:hover {
  background: var(--accent-bg, #f9fafb);
  border-color: var(--border-hover, #9ca3af);
}

.install-new-button i {
  font-size: 16px;
}

/* Select Services Step */
.select-services-step {
  max-width: 800px;
}

.select-services-step .services-info {
  margin-bottom: 24px;
}

.select-services-step .services-info h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--body-text);
}

.select-services-step .services-info p {
  margin: 0;
  color: var(--muted);
  line-height: 1.5;
}

.select-services-step .services-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.select-services-step .service-card {
  border: 1px solid var(--border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  background: var(--body-bg);
}

.select-services-step .service-card:hover {
  border-color: var(--primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.select-services-step .service-card.selected {
  border-color: var(--primary);
  background: rgba(var(--primary-rgb), 0.05);
}

.select-services-step .card-header {
  padding: 20px;
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.select-services-step .service-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  background: var(--accent-btn);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.select-services-step .service-icon i {
  font-size: 24px;
  color: var(--primary);
}

.select-services-step .service-info h4 {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--body-text);
}

.select-services-step .service-info p {
  margin: 0;
  color: var(--muted);
  line-height: 1.4;
  font-size: 14px;
}

.select-services-step .card-footer {
  padding: 12px 20px;
  border-top: 1px solid var(--border);
  background: var(--card-footer-bg);
}

.select-services-step .service-selection {
  display: flex;
  align-items: center;
}

.select-services-step .checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  margin: 0;
  font-size: 14px;
  font-weight: 500;
}

.select-services-step .checkbox-label input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: var(--primary);
  cursor: pointer;
}

.select-services-step .checkbox-text {
  color: var(--body-text);
  user-select: none;
}

.select-services-step .service-status .status {
  font-size: 12px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 4px;
}

.select-services-step .status.selected {
  color: var(--primary);
}

.select-services-step .status.available {
  color: var(--muted);
}

.select-services-step .selection-summary {
  padding: 16px;
  background: var(--accent-bg);
  border: 1px solid var(--border);
  border-radius: 4px;
}

.select-services-step .selection-summary h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--body-text);
}

.select-services-step .selection-summary ul {
  margin: 0;
  padding-left: 20px;
  color: var(--muted);
}

.select-services-step .selection-summary li {
  margin-bottom: 4px;
}

/* Review Step */
.review-step {
  max-width: 600px;
}

.review-step h3 {
  margin: 0 0 24px 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--body-text);
}

.review-step .review-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.review-step .review-item {
  padding: 16px;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
}

.review-step .review-item h4 {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--body-text);
}

.review-step .review-item p {
  margin: 0;
  color: var(--muted);
}

.review-step .review-item ul {
  margin: 0;
  padding-left: 20px;
  color: var(--muted);
}

.review-step .review-item li {
  margin-bottom: 4px;
}

/* Bottom Navigation */
.wizard-buttons-fixed {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  width: 100%;
  padding: 16px 24px;
  background: var(--body-bg, #ffffff);
}

.wizard-buttons-fixed .btn {
  height: 36px;
  padding: 0 16px;
  font-size: 14px;
  font-weight: 500;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.wizard-buttons-fixed .btn.role-secondary {
  background: var(--body-bg, #ffffff);
  border: 1px solid var(--border, #d1d5db);
  color: var(--body-text, #111827);
}

.wizard-buttons-fixed .btn.role-secondary:hover {
  background: var(--accent-bg, #f9fafb);
  border-color: var(--border-hover, #9ca3af);
}

.wizard-buttons-fixed .btn.role-primary {
  background: var(--primary, #2563eb);
  border: 1px solid var(--primary, #2563eb);
  color: white;
}

.wizard-buttons-fixed .btn.role-primary:hover:not(:disabled) {
  background: var(--primary-hover, #1d4ed8);
  border-color: var(--primary-hover, #1d4ed8);
}

.wizard-buttons-fixed .btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.flex-spacer {
  flex: 1;
}

.mr-5 {
  margin-right: 5px;
}

.mr-10 {
  margin-right: 10px;
}

/* Installed Section */
.installed-section {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
  width: 100%;
}

.installed-section .empty-state {
  text-align: center;
  max-width: 500px;
  width: 100%;
}

.installed-section .empty-state-content {
  padding: 40px 20px;
}

.installed-section .app-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 32px;
}

.installed-section .app-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  background: var(--accent-btn);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border);
}

.installed-section .app-icon i {
  font-size: 24px;
  color: var(--primary);
}

.installed-section .app-info h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--body-text);
}

.installed-section .app-badge {
  background: #d4edda;
  color: #155724;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.installed-section .empty-message {
  margin-bottom: 32px;
}

.installed-section .empty-message h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--body-text);
}

.installed-section .empty-message p {
  margin: 0;
  color: var(--muted);
  font-size: 14px;
}

.installed-section .install-action {
  display: flex;
  justify-content: center;
}

.installed-section .install-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 500;
}

/* MCP Gateway Content */
.mcp-gateway-content {
  padding: 24px;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin: 20px 0;
}

.metric-card {
  background: var(--card-bg, #ffffff);
  border: 1px solid var(--border, #e5e7eb);
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.metric-card h3 {
  margin: 0 0 10px 0;
  font-size: 14px;
  color: var(--muted, #6b7280);
  font-weight: 500;
}

.metric-value {
  font-size: 28px;
  font-weight: bold;
  color: var(--body-text, #111827);
}

.action-buttons {
  display: flex;
  gap: 12px;
  margin: 24px 0;
  flex-wrap: wrap;
}

.action-buttons .btn {
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 500;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.endpoints-section {
  margin-top: 40px;
}

.endpoints-section h2 {
  margin-bottom: 20px;
  color: var(--body-text, #111827);
}

.endpoints-table {
  width: 100%;
  border-collapse: collapse;
  background: var(--card-bg, #ffffff);
  border: 1px solid var(--border, #e5e7eb);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.endpoints-table th,
.endpoints-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid var(--border, #e5e7eb);
}

.endpoints-table th {
  background: var(--accent-bg, #f9fafb);
  font-weight: 600;
  color: var(--body-text, #111827);
}

.endpoints-table tbody tr:hover {
  background: var(--accent-bg, #f9fafb);
}

.status-active {
  color: var(--success, #16a34a);
  font-weight: 500;
}

.status-inactive {
  color: var(--muted, #6b7280);
  font-weight: 500;
}

.endpoints-table .loading-row,
.endpoints-table .error-row,
.endpoints-table .empty-row {
  text-align: center;
  color: var(--muted, #6b7280);
  font-style: italic;
  padding: 20px;
}

.endpoints-table .error-row {
  color: var(--error, #dc2626);
}

.discovered-servers-section {
  margin-top: 40px;
}

.discovered-servers-section h2 {
  margin-bottom: 20px;
  color: var(--body-text, #111827);
}

.discovered-servers-table {
  width: 100%;
  border-collapse: collapse;
  background: var(--card-bg, #ffffff);
  border: 1px solid var(--border, #e5e7eb);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.discovered-servers-table th,
.discovered-servers-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid var(--border, #e5e7eb);
}

.discovered-servers-table th {
  background: var(--accent-bg, #f9fafb);
  font-weight: 600;
  color: var(--body-text, #111827);
}

.discovered-servers-table tbody tr:hover {
  background: var(--accent-bg, #f9fafb);
}

.discovered-servers-table .loading-row,
.discovered-servers-table .empty-row {
  text-align: center;
  color: var(--muted, #6b7280);
  font-style: italic;
  padding: 20px;
}

.btn-sm {
  padding: 4px 8px;
  font-size: 12px;
  border-radius: 4px;
}

.endpoints-table .action-buttons {
  display: flex;
  gap: 4px;
}

.endpoints-table .action-buttons .btn {
  padding: 4px 6px;
  min-width: 28px;
}
</style>