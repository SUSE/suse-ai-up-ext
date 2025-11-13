<template>
  <div class="api-discovery-wizard">
    <Wizard
      ref="wizard"
      :steps="wizardSteps"
      :title="wizardTitle"
      :finish-mode="finishMode"
      @next="handleNext"
      @finish="handleFinish"
      @cancel="handleCancel"
    >
        <!-- Auth Check Step -->
       <template #auth-check>
        <div class="auth-check-step">
          <div class="step-header">
            <h3>Authentication Check</h3>
            <p>Verifying your access to Rancher and cluster permissions.</p>
          </div>

          <div v-if="authCheckLoading" class="loading-section">
            <Loading />
            <p>Checking authentication status...</p>
          </div>

          <div v-else-if="!isAuthenticated" class="auth-failed">
            <Banner color="error">
              <strong>Authentication Required</strong>
              <p>You must be logged in to Rancher to discover SUSE AI services.</p>
            </Banner>
          </div>

          <div v-else-if="!hasAdminPrivileges" class="auth-warning">
            <Banner color="warning">
              <strong>Limited Access</strong>
              <p>You have limited cluster access. Discovery may not find all available services.</p>
            </Banner>
          </div>

          <div v-else class="auth-success">
            <Banner color="success">
              <strong>Authentication Verified</strong>
              <p>You have the necessary permissions to scan clusters for SUSE AI services.</p>
            </Banner>
          </div>

          <div v-if="isAuthenticated && hasAdminPrivileges" class="next-steps">
            <p>Ready to scan {{ accessibleClusters.length }} accessible clusters for SUSE AI Universal Proxy services.</p>
          </div>
         </div>
       </template>

        <!-- Cluster Selection Step -->
        <template #cluster-selection>
         <div class="cluster-selection-step">
           <div class="step-header">
             <h3>Select Clusters to Scan</h3>
             <p>Choose which clusters you want to scan for SUSE AI Universal Proxy services.</p>
           </div>

           <div class="cluster-selection-controls">
             <button
               class="btn btn-sm bg-primary mr-10"
               @click="selectAllClusters"
             >
               Select All
             </button>
             <button
               class="btn btn-sm role-secondary"
               @click="deselectAllClusters"
             >
               Deselect All
             </button>
           </div>

           <div class="clusters-grid">
            <div
              v-for="cluster in accessibleClusters"
              :key="cluster.id"
              class="cluster-item"
              :class="{ 'selected': isClusterSelected(cluster) }"
              @click="toggleClusterSelection(cluster)"
            >
              <!-- Debug info (remove in production) -->
              <div style="display: none;">
                Cluster: {{ cluster.name }} ({{ cluster.id }})
                State: {{ cluster.state }}
                Transitioning: {{ cluster.transitioning }}
                Ready: {{ cluster.ready }}
                Status Class: {{ getClusterStatusClass(cluster) }}
                Status Text: {{ getClusterStatusText(cluster) }}
              </div>
               <div class="cluster-checkbox">
                 <input
                   type="checkbox"
                   :checked="isClusterSelected(cluster)"
                   @change="toggleClusterSelection(cluster)"
                 />
               </div>
               <div class="cluster-info">
                 <h4>{{ cluster.nameDisplay || cluster.name }}</h4>
                 <p>{{ cluster.description || 'Kubernetes cluster' }}</p>
                 <span class="cluster-status" :class="getClusterStatusClass(cluster)">
                   {{ getClusterStatusText(cluster) }}
                 </span>
               </div>
             </div>
           </div>

           <div v-if="selectedClusters.length > 0" class="selection-summary">
             <p>{{ selectedClusters.length }} of {{ accessibleClusters.length }} clusters selected</p>
           </div>
         </div>
       </template>

        <!-- Scanning Step -->
       <template #scanning>
        <div class="scanning-step">
          <div class="step-header">
            <h3>Scanning Clusters</h3>
            <p>Searching for SUSE AI Universal Proxy services across all accessible clusters.</p>
          </div>

          <div class="scan-progress">
            <div class="progress-header">
              <span>Progress: {{ scanCompletionPercentage }}%</span>
              <span>{{ progress.scannedClusters }} of {{ progress.totalClusters }} clusters scanned</span>
            </div>

            <div class="progress-bar">
              <div
                class="progress-fill"
                :style="{ width: `${scanCompletionPercentage}%` }"
              />
            </div>

            <div class="progress-details">
              <div class="detail-item">
                <strong>Current:</strong> {{ progress.currentCluster || 'Initializing...' }}
              </div>
              <div class="detail-item">
                <strong>Found:</strong> {{ progress.foundInstances }} instances
              </div>
              <div v-if="progress.estimatedTimeRemaining" class="detail-item">
                <strong>Estimated time remaining:</strong> {{ formatTime(progress.estimatedTimeRemaining) }}
              </div>
            </div>
          </div>

          <div v-if="isScanning" class="scanning-animation">
            <Loading />
            <p>Scanning clusters for SUSE AI services...</p>
          </div>

          <div v-if="scanError" class="scan-error">
            <Banner color="error">
              <strong>Scan Error</strong>
              <p>{{ scanError }}</p>
              <button
                class="btn btn-sm bg-primary mt-10"
                @click="retryScan"
              >
                Retry Scan
              </button>
            </Banner>
          </div>
        </div>
      </template>

         <!-- Results Step -->
        <template #results>
         <div class="results-step">
           <div class="step-header">
             <h3>Discovery Results</h3>
             <p>Found {{ discoveredInstances.length }} SUSE AI service instances across {{ successfulClusters.length }} clusters.</p>
           </div>

            <div v-if="discoveredInstances.length === 0" class="no-results">
              <Banner color="info">
                <strong>No Services Found</strong>
                <p>No SUSE AI Universal Proxy services were found in your accessible clusters.</p>
                <p>You can manually enter a proxy URL or proceed to install a new instance.</p>
              </Banner>

              <!-- Manual URL Input -->
              <div class="manual-url-section">
                <h4>Or enter proxy URL manually:</h4>
                <div class="url-input-group">
                  <input
                    v-model="manualProxyUrl"
                    type="url"
                    placeholder="https://proxy.example.com"
                    class="url-input"
                    @input="validateManualUrl"
                  />
                  <button
                    class="btn btn-sm bg-primary"
                    :disabled="!isValidManualUrl"
                    @click="testManualUrl"
                  >
                    Test Connection
                  </button>

                </div>
                <p v-if="manualUrlError" class="error-text">{{ manualUrlError }}</p>
                <p v-if="manualUrlSuccess" class="success-text">✅ Connection successful!</p>
              </div>
            </div>

            <div v-else class="results-grid">
              <ServiceInstanceCard
                v-for="instance in discoveredInstances"
                :key="`${instance.clusterId}-${instance.name}`"
                :instance="instance"
                :show-health-check="true"
                @connect="connectToInstance"
                @configure="configureInstance"
                @health-check="handleHealthCheck"
              />
            </div>

           <div v-if="failedClusters.length > 0" class="failed-clusters">
             <Banner color="warning">
               <strong>Some Clusters Failed</strong>
               <p>{{ failedClusters.length }} clusters could not be scanned. This may be due to network issues or permission problems.</p>
               <button
                 class="btn btn-sm bg-primary mt-10"
                 @click="retryFailedClusters"
               >
                 Retry Failed Clusters
               </button>
             </Banner>
           </div>
         </div>
       </template>

         <!-- Service Selection Step -->
        <template #service-selection>
         <div class="service-selection-step">
           <div class="step-header">
             <h3>Configure Services</h3>
             <p>Select which SUSE AI services you want to enable for <strong>{{ selectedInstance?.name }}</strong>.</p>
           </div>

            <div v-if="!selectedInstance" class="no-selection">
              <Banner color="warning">
                <strong>No Instance Selected</strong>
                <p>Please go back to the Results step and click "Connect" on a service instance.</p>
              </Banner>
            </div>

            <div v-if="serviceSelectionError" class="error-message">
              <Banner color="error">
                <strong>Validation Error</strong>
                <p>{{ serviceSelectionError }}</p>
              </Banner>
            </div>

           <div v-else class="service-selection-content">
             <!-- Selected Instance Info -->
             <div class="selected-instance-info">
               <h4>Selected Instance</h4>
                <div class="instance-summary">
                  <div class="summary-row">
                    <strong>Name:</strong> {{ selectedInstance?.name }}
                  </div>
                  <div class="summary-row">
                    <strong>Cluster:</strong> {{ selectedInstance?.clusterName }}
                  </div>
                  <div class="summary-row">
                    <strong>Namespace:</strong> {{ selectedInstance?.namespace }}
                  </div>
                  <div class="summary-row">
                    <strong>Port:</strong> {{ selectedInstance?.port }}
                  </div>
                  <div v-if="selectedInstance?.externalIPs?.length" class="summary-row">
                    <strong>External IPs:</strong> {{ selectedInstance?.externalIPs.join(', ') }}
                  </div>
                </div>
             </div>

             <!-- Service Selection -->
             <div class="services-selection-section">
               <h4>Available Services</h4>
               <p>Choose which services to enable for this instance:</p>

               <div class="services-grid">
                 <div
                   v-for="service in availableServices"
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
                     <div class="selection-indicator">
                       <i v-if="selectedServices.includes(service.id)" class="icon icon-checkmark"></i>
                     </div>
                   </div>
                   <div class="card-footer">
                     <label class="checkbox-label">
                       <input
                         type="checkbox"
                         :checked="selectedServices.includes(service.id)"
                         @change="toggleService(service.id)"
                       />
                       <span class="checkbox-text">Enable</span>
                     </label>
                   </div>
                 </div>
               </div>
             </div>
           </div>
         </div>
       </template>

         <!-- Review Step -->
        <template #review>
         <div class="review-step">
           <div class="step-header">
             <h3>Review Configuration</h3>
             <p>Please review your selections before completing the setup.</p>
           </div>

           <div class="review-content">
             <!-- Instance Review -->
             <div class="review-section">
               <h4>Selected Instance</h4>
               <div class="review-card">
                  <div class="review-row">
                    <strong>Name:</strong> {{ selectedInstance?.name || 'N/A' }}
                  </div>
                  <div class="review-row">
                    <strong>Cluster:</strong> {{ selectedInstance?.clusterName || 'N/A' }}
                  </div>
                  <div class="review-row">
                    <strong>Namespace:</strong> {{ selectedInstance?.namespace || 'N/A' }}
                  </div>
                  <div class="review-row">
                    <strong>Port:</strong> {{ selectedInstance?.port || 'N/A' }}
                  </div>
                  <div v-if="selectedInstance?.externalIPs?.length" class="review-row">
                    <strong>External IPs:</strong> {{ selectedInstance?.externalIPs.join(', ') }}
                  </div>
                  <div class="review-row">
                    <strong>Status:</strong>
                    <span class="status-badge" :class="selectedInstance?.status === 'available' ? 'status-success' : 'status-warning'">
                      {{ selectedInstance?.status === 'available' ? 'Available' : 'Unavailable' }}
                    </span>
                  </div>
               </div>
             </div>

              <!-- Services Review -->
              <div class="review-section">
                <h4>Selected Services</h4>
                <div class="review-card">
                  <div v-if="selectedServices.length === 0" class="no-services">
                    <p>No services selected. Please go back and select at least one service.</p>
                  </div>

                  <div v-if="reviewError" class="error-message">
                    <Banner color="error">
                      <strong>Validation Error</strong>
                      <p>{{ reviewError }}</p>
                    </Banner>
                  </div>
                 <div v-else class="selected-services-list">
                   <div
                     v-for="serviceId in selectedServices"
                     :key="serviceId"
                     class="service-item"
                   >
                     <i :class="getServiceIcon(serviceId)"></i>
                     <span>{{ getServiceName(serviceId) }}</span>
                   </div>
                 </div>
               </div>
             </div>

              <!-- Summary -->
              <div class="review-section">
                <h4>Summary</h4>
                <div class="review-card summary-card">
                  <p>You are about to configure <strong>{{ selectedServices.length }}</strong> service(s) for the SUSE AI Universal Proxy instance <strong>{{ selectedInstance?.name || 'Unknown' }}</strong>.</p>
                  <p>Once completed, these services will be available in the navigation menu.</p>
                </div>
              </div>

              <!-- Action Buttons -->
              <div class="review-actions">
                <div class="action-buttons">
                  <button
                    class="btn btn-secondary"
                    @click="restartWizard"
                  >
                    <i class="icon icon-refresh"></i>
                    Restart Wizard
                  </button>
                  <button
                    class="btn btn-secondary"
                    @click="closeWizard"
                  >
                    <i class="icon icon-close"></i>
                    Close Wizard
                  </button>
                  <button
                    class="btn btn-primary"
                    @click="enableServices"
                    :disabled="selectedServices.length === 0"
                  >
                    <i class="icon icon-checkmark"></i>
                    Enable Services
                  </button>
                </div>
              </div>
            </div>
          </div>
        </template>
    </Wizard>
  </div>
</template>

<style scoped>
.cluster-selection-step {
  max-width: 800px;
}

.cluster-selection-controls {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.clusters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 15px;
  margin-bottom: 20px;
}

.cluster-item {
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 15px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: var(--card-bg);
}

.cluster-item:hover {
  border-color: var(--primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.cluster-item.selected {
  border-color: var(--primary);
  background: var(--primary-light, rgba(0, 123, 255, 0.1));
}

.cluster-checkbox {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.cluster-checkbox input[type="checkbox"] {
  margin-right: 10px;
  transform: scale(1.2);
}

.cluster-info h4 {
  margin: 0 0 5px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--body-text);
}

.cluster-info p {
  margin: 0 0 10px 0;
  font-size: 14px;
  color: var(--muted);
}

.cluster-status {
  font-size: 12px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 12px;
  display: inline-block;
}

.status-ready {
  background: var(--success-light, #d4edda);
  color: var(--success, #28a745);
}

.status-unavailable {
  background: var(--error-light, #f8d7da);
  color: var(--error, #dc3545);
}

.selection-summary {
  padding: 15px;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  text-align: center;
}

.manual-url-section {
  margin-top: 20px;
  padding: 20px;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
}

.manual-url-section h4 {
  margin: 0 0 15px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--body-text);
}

.url-input-group {
  display: flex;
  gap: 10px;
  align-items: center;
}

.url-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 4px;
  font-size: 14px;
}

.url-input:focus {
  outline: none;
  border-color: var(--primary);
}

.error-text {
  color: var(--error, #dc3545);
  font-size: 14px;
  margin: 5px 0 0 0;
}

.success-text {
  color: var(--success, #28a745);
  font-size: 14px;
  margin: 5px 0 0 0;
  font-weight: 500;
}
</style>

<script lang="ts" setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { useStore } from 'vuex';
import Wizard from '@shell/components/Wizard';
import { Banner } from '@rancher/shell/rancher-components/Banner';
import Loading from '@shell/components/Loading';
import ServiceInstanceCard from './ServiceInstanceCard.vue';
import { useAuth } from '../../../composables/useAuth';
// import { useClusterDiscovery } from '../../../composables/useClusterDiscovery';
import type { ServiceInstance } from '../../../types/service-discovery';

interface Props {
  onComplete?: (config: { instance: ServiceInstance; services: string[] } | readonly ServiceInstance[]) => void;
  onInstallNew?: (manualUrl?: string) => void;
}

interface Emits {
  (e: 'complete', config: { instance: ServiceInstance; services: string[] } | readonly ServiceInstance[]): void;
  (e: 'install-new', manualUrl?: string): void;
  (e: 'connect', instance: ServiceInstance): void;
  (e: 'configure', instance: ServiceInstance): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

    // Composables
    const store = useStore();
    const {
      isAuthenticated,
      hasAdminPrivileges,
      loadClusterAccess,
      clusterAccess
    } = useAuth();

    // Mock data for development
    const isScanning = ref(false);
    const scanResults = ref([]);
    const discoveredInstances = ref<ServiceInstance[]>([]);
    const successfulClusters = ref<any[]>([]);
    const failedClusters = ref<any[]>([]);
    const progress = ref({
      totalClusters: 0,
      scannedClusters: 0,
      remainingClusters: 0,
      foundInstances: 0,
      currentCluster: undefined,
      estimatedTimeRemaining: undefined
    });
    const scanError = ref(null);
    const hasDiscoveredInstances = computed(() => discoveredInstances.value.length > 0);
    const scanCompletionPercentage = computed(() => {
      if (progress.value.totalClusters === 0) return 0;
      return Math.round((progress.value.scannedClusters / progress.value.totalClusters) * 100);
    });

// const {
//   isScanning,
//   scanResults,
//   discoveredInstances,
//   progress,
//   error: scanError,
//   discoverClusters,
//   retryFailedScans,
//   hasDiscoveredInstances,
//   failedClusters,
//   successfulClusters,
//   scanCompletionPercentage,
//   getAccessibleClusters
// } = useClusterDiscovery();

    // Local state
    const loading = ref(true);
    const authCheckLoading = ref(true);
    const accessibleClusters = ref<readonly any[]>([]);
    const selectedClusters = ref<any[]>([]);
    const wizard = ref();

    // Manual URL input state
    const manualProxyUrl = ref('');
    const manualUrlError = ref('');
    const manualUrlSuccess = ref(false);
    const isValidManualUrl = ref(false);

    // Service selection state
    const selectedInstance = ref<ServiceInstance | null>(null);
    const selectedServices = ref<string[]>([]);
    const serviceSelectionError = ref('');
    const reviewError = ref('');

    // Available services
    const availableServices = [
      {
        id: 'mcp-gateway',
        name: 'MCP Gateway',
        description: 'Model Context Protocol gateway for AI interactions and server management.',
        iconClass: 'icon icon-server'
      },
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

// Wizard configuration
const wizardSteps = computed(() => [
  {
    name: 'auth-check',
    label: 'Authentication',
    ready: true,
    weight: 1
  },
  {
    name: 'cluster-selection',
    label: 'Select Clusters',
    ready: true,
    weight: 2
  },
  {
    name: 'scanning',
    label: 'Scanning',
    ready: true,
    weight: 3
  },
  {
    name: 'results',
    label: 'Results',
    ready: true,
    weight: 4
  },
  {
    name: 'service-selection',
    label: 'Select Services',
    ready: !!selectedInstance.value,
    weight: 5
  },
  {
    name: 'review',
    label: 'Review',
    ready: selectedServices.value.length > 0,
    weight: 6
  }
]);

const wizardTitle = computed(() => 'Discover SUSE AI Services');
const finishMode = computed(() => {
  const currentStepName = wizardSteps.value[currentStep.value]?.name;
  return currentStepName === 'review' && selectedServices.value.length > 0 ? 'finish' : 'next';
});

// Computed properties
const currentStep = computed(() => wizard.value?.currentStep || 0);
const error = computed(() => scanError.value);

// Methods
const formatTime = (seconds: number): string => {
  if (seconds < 60) return `${Math.ceil(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.ceil(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
};

// Cluster selection methods
const isClusterSelected = (cluster: any): boolean => {
  return selectedClusters.value.some(selected => selected.id === cluster.id);
};

const toggleClusterSelection = (cluster: any): void => {
  const index = selectedClusters.value.findIndex(selected => selected.id === cluster.id);
  if (index > -1) {
    selectedClusters.value.splice(index, 1);
  } else {
    selectedClusters.value.push(cluster);
  }
};

const selectAllClusters = (): void => {
  selectedClusters.value = [...accessibleClusters.value];
};

const deselectAllClusters = (): void => {
  selectedClusters.value = [];
};

const getClusterStatusClass = (cluster: any): string => {
  // Always mark local cluster as ready (processed by getAccessibleClusters)
  if (cluster.id === 'local') {
    console.log(`🎯 [Wizard] Local cluster status check: always ready`);
    return 'status-ready';
  }

  // Handle /v3/clusters API response format
  const isTransitioning = cluster.transitioning === true || cluster.transitioning === 'yes';
  const isActive = cluster.state === 'active' && !isTransitioning;

  console.log(`🔍 [Wizard] Cluster ${cluster.name} status:`, {
    state: cluster.state,
    transitioning: cluster.transitioning,
    ready: cluster.ready,
    isActive,
    isTransitioning
  });

  if (isActive) {
    return 'status-ready';
  }
  if (cluster.ready && !isTransitioning) {
    return 'status-ready';
  }

  return 'status-unavailable';
};

const getClusterStatusText = (cluster: any): string => {
  // Local cluster is always shown as Active
  if (cluster.id === 'local') {
    return 'Active';
  }

  // Handle /v3/clusters API response format
  const isTransitioning = cluster.transitioning === true || cluster.transitioning === 'yes';

  if (isTransitioning) {
    return 'Transitioning';
  }
  if (cluster.state === 'active') {
    return 'Active';
  }
  if (cluster.ready) {
    return 'Ready';
  }

  return cluster.state || 'Unavailable';
};

// Manual URL methods
const validateManualUrl = (): void => {
  const url = manualProxyUrl.value.trim();
  const urlPattern = /^https?:\/\/.+/i;
  isValidManualUrl.value = urlPattern.test(url);
  manualUrlError.value = '';
  manualUrlSuccess.value = false;
};

const testManualUrl = async (): Promise<void> => {
  if (!isValidManualUrl.value) return;

  manualUrlError.value = '';
  manualUrlSuccess.value = false;

  try {
    // Simple connectivity test - you might want to enhance this
    const response = await fetch(manualProxyUrl.value, {
      method: 'HEAD',
      mode: 'no-cors'
    });
    manualUrlSuccess.value = true;
  } catch (error) {
    manualUrlError.value = 'Unable to connect to the specified URL. Please check the address and try again.';
  }
};

    const connectToInstance = (instance: ServiceInstance) => {
      selectedInstance.value = instance;
      selectedServices.value = []; // Reset selection
      serviceSelectionError.value = ''; // Clear any errors
      // Navigate to service selection step
      if (wizard.value) {
        wizard.value.goToStep(4); // service-selection step index
      }
    };

    const configureInstance = (instance: ServiceInstance) => {
      emit('configure', instance);
    };

    // Service selection methods
    const toggleService = (serviceId: string) => {
      const index = selectedServices.value.indexOf(serviceId);
      if (index > -1) {
        selectedServices.value.splice(index, 1);
      } else {
        selectedServices.value.push(serviceId);
      }
      // Clear any validation errors when user makes a selection
      reviewError.value = '';
    };

    const cancelServiceSelection = () => {
      selectedInstance.value = null;
      selectedServices.value = [];
    };

    const getServiceName = (serviceId: string) => {
      const service = availableServices.find(s => s.id === serviceId);
      return service ? service.name : serviceId;
    };

    const getServiceIcon = (serviceId: string) => {
      const service = availableServices.find(s => s.id === serviceId);
      return service ? service.iconClass : 'icon icon-cog';
    };

    const completeServiceSelection = () => {
      if (selectedInstance.value && selectedServices.value.length > 0) {
        // Navigate to review step
        if (wizard.value) {
          wizard.value.goToStep(5); // review step index
        }
      } else {
        console.warn('Cannot proceed to review: no instance or services selected');
      }
    };

 const handleHealthCheck = (instance: ServiceInstance) => {
   // TODO: Implement health check functionality
   console.log('Health check requested for instance:', instance);
 };

 const discoverClusters = async (clusterIds?: string[]) => {
   console.log('Starting cluster discovery for:', clusterIds);
   isScanning.value = true;
   scanError.value = null;

   try {
     // Mock discovery process
     progress.value.totalClusters = selectedClusters.value.length;
     progress.value.scannedClusters = 0;
     progress.value.foundInstances = 0;

     for (let i = 0; i < selectedClusters.value.length; i++) {
       const cluster = selectedClusters.value[i];
       progress.value.currentCluster = cluster.name;
       progress.value.scannedClusters = i + 1;

       // Simulate scanning delay
       await new Promise(resolve => setTimeout(resolve, 1000));

       // Mock successful scan
       successfulClusters.value.push(cluster);

       // Mock discovered instances for local cluster
       if (cluster.id === 'local') {
         discoveredInstances.value.push({
           clusterId: cluster.id,
           clusterName: cluster.name,
           name: 'suse-ai-proxy',
           namespace: 'suse-ai',
           port: 8911,
           type: 'LoadBalancer',
           externalIPs: ['192.168.1.100'],
           status: 'available',
           lastChecked: new Date().toISOString()
         });
         progress.value.foundInstances++;
       }
     }

     console.log('Discovery completed:', {
       successful: successfulClusters.value.length,
       failed: failedClusters.value.length,
       instances: discoveredInstances.value.length
     });

   } catch (error: any) {
     console.error('Discovery failed:', error);
     scanError.value = error.message || 'Failed to discover clusters';
   } finally {
     isScanning.value = false;
   }
 };

 const retryFailedScans = async () => {
   if (failedClusters.value.length > 0) {
     console.log('Retrying failed clusters:', failedClusters.value);
     await discoverClusters(failedClusters.value.map(c => c.id));
   }
 };

const retryScan = async () => {
  await discoverClusters();
};

const retryFailedClusters = async () => {
  await retryFailedScans();
};

const handleNext = async (data: any) => {
  console.log('Wizard next step:', data);

  const currentStepIndex = data?.currentStep || 0;
  const targetStepIndex = data?.targetStep || currentStepIndex + 1;

  // Validate step transitions
  if (targetStepIndex === 1) { // Moving to cluster-selection
    if (!isAuthenticated.value) {
      console.warn('Cannot proceed to cluster selection: not authenticated');
      return false; // Prevent navigation
    }
    if (!hasAdminPrivileges.value) {
      console.warn('Cannot proceed to cluster selection: no admin privileges');
      return false; // Prevent navigation
    }
  }

  if (targetStepIndex === 2) { // Moving to scanning
    if (selectedClusters.value.length === 0) {
      console.warn('Cannot proceed to scanning: no clusters selected');
      return false; // Prevent navigation
    }
    console.log('Starting cluster discovery for selected clusters...');
    const selectedClusterIds = selectedClusters.value.map(cluster => cluster.id);
    console.log('Selected cluster IDs:', selectedClusterIds);
    console.log('Selected clusters:', selectedClusters.value.map(c => ({ id: c.id, name: c.name })));
    await discoverClusters(selectedClusterIds);
  }

  if (targetStepIndex === 3) { // Moving to results
    if (isScanning.value) {
      console.warn('Cannot proceed to results: scanning still in progress');
      return false; // Prevent navigation
    }
  }

   if (targetStepIndex === 4) { // Moving to service-selection
     if (!selectedInstance.value) {
       serviceSelectionError.value = 'Please select a service instance from the Results step first.';
       console.warn('Cannot proceed to service selection: no instance selected');
       return false; // Prevent navigation
     }
     serviceSelectionError.value = '';
   }

   if (targetStepIndex === 5) { // Moving to review
     if (selectedServices.value.length === 0) {
       reviewError.value = 'Please select at least one service to enable.';
       console.warn('Cannot proceed to review: no services selected');
       return false; // Prevent navigation
     }
     reviewError.value = '';
   }

  return true; // Allow navigation
};

const handleFinish = () => {
  const currentStepName = wizardSteps.value[currentStep.value]?.name;

  if (currentStepName === 'review' && selectedInstance.value && selectedServices.value.length > 0) {
    // Complete configuration with selected instance and services
    emit('complete', {
      instance: selectedInstance.value,
      services: selectedServices.value
    });
  } else if (hasDiscoveredInstances.value) {
    emit('complete', discoveredInstances.value);
  } else if (manualUrlSuccess.value && manualProxyUrl.value) {
    // Emit install-new with manual URL
    emit('install-new', manualProxyUrl.value);
  } else {
    emit('install-new');
  }
};

 const handleCancel = () => {
   // Navigate back or close wizard
   window.history.back();
 };

 const restartWizard = () => {
   // Reset wizard state
   selectedInstance.value = null;
   selectedServices.value = [];
   selectedClusters.value = [...accessibleClusters.value]; // Reset to all selected
   serviceSelectionError.value = '';
   reviewError.value = '';

   // Go back to first step
   if (wizard.value) {
     wizard.value.goToStep(0);
   }
 };

 const closeWizard = () => {
   // Navigate back to previous page
   window.history.back();
 };

 const enableServices = () => {
   if (selectedInstance.value && selectedServices.value.length > 0) {
     // Complete configuration with selected instance and services
     emit('complete', {
       instance: selectedInstance.value,
       services: selectedServices.value
     });
   } else {
     reviewError.value = 'Please select at least one service to enable.';
   }
 };

// Watch for cluster selection changes and auto-start scanning
watch(selectedClusters, async (newSelected, oldSelected) => {
  // Only start scanning if clusters were added and we haven't scanned yet
  if (newSelected.length > 0 && !isScanning.value && scanResults.value.length === 0) {
    console.log('Clusters selected, starting automatic discovery...');
    const selectedClusterIds = newSelected.map(cluster => cluster.id);
    await discoverClusters(selectedClusterIds);
  }
}, { deep: true });

 // Initialization
 onMounted(async () => {
   try {
     authCheckLoading.value = true;

     // Check if wizard was already completed
     const proxyInstalled = store.state.suseai?.settings?.proxyInstalled;
     const storedServices = store.state.suseai?.settings?.selectedServices || [];
     const storedInstance = store.state.suseai?.settings?.selectedInstance;

     if (proxyInstalled && storedServices.length > 0 && storedInstance) {
       // Wizard was completed, restore state and go to review
       selectedInstance.value = storedInstance;
       selectedServices.value = storedServices;
       // Go to review step
       nextTick(() => {
         if (wizard.value) {
           wizard.value.goToStep(5); // review step
         }
       });
     } else {
       // Fresh wizard, load clusters
       // Load clusters from Rancher
       console.log('Loading clusters from Rancher...');
       try {
         const response = await store.dispatch('rancher/request', {
           url: '/v3/clusters',
           method: 'GET'
         });
         const clusters = response.data || [];
         accessibleClusters.value = clusters.map((cluster: any) => ({
           id: cluster.id,
           name: cluster.nameDisplay || cluster.name || cluster.id,
           state: cluster.state || 'unknown',
           transitioning: cluster.transitioning || false,
           provider: cluster.provider || 'unknown',
           ready: cluster.ready || false
         }));
       } catch (error) {
         console.error('Failed to load clusters, falling back to cluster access:', error);
         await loadClusterAccess();
         accessibleClusters.value = clusterAccess.value.map(access => ({
           id: access.clusterId,
           name: access.name || access.clusterId,
           state: 'active', // Assume active if accessible
           transitioning: false,
           provider: 'unknown',
           ready: true
         }));
       }

       // If no clusters loaded, fall back to mock data for development
       if (accessibleClusters.value.length === 0) {
         console.log('No clusters found, using mock clusters for development');
         accessibleClusters.value = [
           {
             id: 'local',
             name: 'local',
             state: 'active',
             transitioning: false,
             provider: 'k3s',
             ready: true
           },
           {
             id: 'c-m-abc123',
             name: 'production-cluster',
             state: 'active',
             transitioning: false,
             provider: 'rke2',
             ready: true
           }
         ];
       }

       // Auto-select all accessible clusters initially
       selectedClusters.value = [...accessibleClusters.value];

       console.log(`🚀 [Wizard] Initialized with ${accessibleClusters.value.length} clusters:`,
         accessibleClusters.value.map(c => ({
           id: c.id,
           name: c.name,
           state: c.state,
           status: getClusterStatusText(c)
         }))
       );
     }

     authCheckLoading.value = false;

     // Clusters are loaded, wizard will handle the rest
   } catch (err: any) {
     console.error('Failed to initialize discovery wizard:', err);
     // Fall back to mock clusters on error
     accessibleClusters.value = [
       {
         id: 'local',
         name: 'local',
         state: 'active',
         transitioning: false,
         provider: 'k3s',
         ready: true
       }
     ];
     selectedClusters.value = [...accessibleClusters.value];
   } finally {
     loading.value = false;
     authCheckLoading.value = false;
   }
 });
</script>

<style scoped>
.api-discovery-wizard {
  width: 100%;
}

.step-header {
  margin-bottom: 20px;
}

.step-header h3 {
  margin: 0 0 10px 0;
  color: var(--primary);
}

.step-header p {
  margin: 0;
  color: var(--muted);
}

.loading-section {
  text-align: center;
  padding: 40px 20px;
}

.auth-failed,
.auth-warning,
.auth-success {
  margin: 20px 0;
}

.next-steps {
  margin-top: 20px;
  padding: 15px;
  background: var(--accent-bg);
  border-radius: 4px;
}

.scan-progress {
  margin: 20px 0;
  padding: 20px;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 4px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  font-weight: 500;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: var(--muted-bg);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 15px;
}

.progress-fill {
  height: 100%;
  background: var(--primary);
  transition: width 0.3s ease;
}

.progress-details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 10px;
}

.detail-item {
  font-size: 14px;
}

.scanning-animation {
  text-align: center;
  padding: 40px 20px;
}

.scan-error {
  margin-top: 20px;
}

.results-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
  margin: 20px 0;
}

.service-card {
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 20px;
  background: var(--card-bg);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.card-header h4 {
  margin: 0;
  color: var(--primary);
}

.cluster-badge {
  background: var(--primary);
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.card-details {
  margin-bottom: 15px;
}

.detail-row {
  margin-bottom: 8px;
  font-size: 14px;
}

.detail-row strong {
  color: var(--body-text);
}

.detail-row a {
  color: var(--primary);
  text-decoration: none;
}

.detail-row a:hover {
  text-decoration: underline;
}

.status-available {
  color: var(--success);
  font-weight: 500;
}

.status-unreachable {
  color: var(--warning);
  font-weight: 500;
}

.status-error {
  color: var(--error);
  font-weight: 500;
}

.status-unknown {
  color: var(--muted);
  font-weight: 500;
}

.card-actions {
  display: flex;
  gap: 10px;
}

.no-results {
  margin: 20px 0;
}

.failed-clusters {
  margin-top: 20px;
}

.service-selection-section {
  margin-top: 30px;
  padding: 20px;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
}

.service-selection-section h3 {
  margin: 0 0 8px 0;
  color: var(--primary);
  font-size: 20px;
}

.service-selection-section > p {
  margin: 0 0 20px 0;
  color: var(--muted);
}

.services-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.service-card {
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: var(--card-bg);
}

.service-card:hover {
  border-color: var(--primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.service-card.selected {
  border-color: var(--primary);
  background: var(--primary-light, rgba(0, 123, 255, 0.1));
}

.service-icon {
  font-size: 24px;
  color: var(--primary);
  min-width: 24px;
}

.service-info h4 {
  margin: 0 0 5px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--body-text);
}

.service-info p {
  margin: 0;
  font-size: 14px;
  color: var(--muted);
  line-height: 1.4;
}

.selection-indicator {
  margin-left: auto;
  color: var(--primary);
  font-size: 20px;
}

.card-footer {
  margin-top: 15px;
  text-align: right;
}

.checkbox-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-weight: 500;
}

.checkbox-text {
  font-size: 14px;
  color: var(--body-text);
}

.service-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  display: inline-block;
  text-align: center;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 12px;
}

.bg-primary {
  background: var(--primary);
  color: white;
}

.bg-primary:hover {
  background: var(--primary-hover, darken(var(--primary), 10%));
}

.bg-secondary {
  background: var(--secondary);
  color: var(--body-text);
}

.bg-secondary:hover {
  background: var(--secondary-hover, darken(var(--secondary), 10%));
}

.ml-10 {
  margin-left: 10px;
}

.mt-10 {
  margin-top: 10px;
}

.review-actions {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid var(--border);
}

.action-buttons {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.btn {
  padding: 8px 16px;
  border: 1px solid var(--border);
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
}

.btn-secondary {
  background: var(--secondary-bg, #f8f9fa);
  color: var(--secondary-text, #495057);
}

.btn-secondary:hover {
  background: var(--secondary-hover, #e9ecef);
}

.btn-primary {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

.btn-primary:hover {
  background: var(--primary-hover, darken(var(--primary), 10%));
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>