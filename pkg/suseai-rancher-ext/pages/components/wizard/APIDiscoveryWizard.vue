<template>
  <div class="api-discovery-wizard">
    <Wizard
      ref="wizard"
      :steps="wizardSteps"
      :title="wizardTitle"
      :finish-mode="finishMode"
      :init-step-index="0"
      :edit-first-step="true"
      :next-button-text="'Next'"
      :finish-button-text="'Finish'"
      :cancel-button-text="'Cancel'"
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

           <div v-if="clusterLoadingError" class="cluster-error">
             <Banner color="error">
               <strong>Cluster Access Error</strong>
               <p>{{ clusterLoadingError }}</p>
             </Banner>
           </div>

           <div v-if="isAuthenticated && hasAdminPrivileges && !clusterLoadingError" class="next-steps">
             <p>Ready to scan {{ accessibleClusters.length }} accessible clusters for SUSE AI Universal Proxy services.</p>
           </div>
         </div>
       </template>

      <!-- Cluster Selection Step -->
      <template #cluster-selection>
          <div class="cluster-selection-step">
            <div class="step-header">
              <h3>Select Clusters to Scan</h3>
               <p>Choose which clusters you want to scan for SUSE AI Universal Proxy services. IP addresses will be automatically discovered from service endpoints.</p>
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
             >
               <div class="cluster-header" @click="toggleClusterSelection(cluster)">
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

                <!-- IP Configuration (shown when selected) -->
                <div v-if="isClusterSelected(cluster)" class="cluster-ip-config">
                  <div class="ip-note">
                    <small>IP addresses will be automatically discovered from the SUSE AI Universal Proxy service endpoints during the service discovery step.</small>
                  </div>
                </div>
             </div>
            </div>

            <div v-if="selectedClusters.length > 0" class="selection-summary">
              <p>{{ selectedClusters.length }} of {{ accessibleClusters.length }} clusters selected</p>
            </div>
          </div>
        </template>

      <!-- Service Discovery Step -->
      <template #health-check>
        <div class="service-discovery-step">
          <div class="step-header">
            <h3>Service Discovery</h3>
            <p>Discovering SUSE AI Universal Proxy services in selected clusters.</p>
          </div>

          <div v-if="isHealthChecking" class="discovery-loading">
            <Loading />
            <p>Scanning clusters for SUSE AI services...</p>
          </div>

          <div v-if="discoveredServices.length > 0" class="discovered-services">
            <h4>Discovered Services</h4>
            <div class="services-grid">
              <div
                v-for="service in discoveredServices"
                :key="service.clusterId"
                class="service-card"
              >
                <div class="card-header">
                  <div class="service-icon">
                    <i class="icon icon-server"></i>
                  </div>
                  <div class="service-info">
                    <h4>SUSE AI Universal Proxy</h4>
                    <p>Cluster: {{ service.clusterName }}</p>
                  </div>
                  <div class="status-indicator">
                    <span class="status-badge status-success">✓ Found</span>
                  </div>
                </div>

                <div class="card-details">
                  <div class="detail-row">
                    <strong>Service Name:</strong> {{ service.serviceName }}
                  </div>
                  <div class="detail-row">
                    <strong>Namespace:</strong> {{ service.namespace }}
                  </div>
                  <div class="detail-row">
                    <strong>Type:</strong> {{ service.service?.spec?.type || 'ClusterIP' }}
                  </div>
                    <div v-if="service.clusterIP" class="detail-row">
                      <strong>Cluster IP:</strong> {{ service.clusterIP }}
                    </div>
                    <div v-if="service.publicIP" class="detail-row">
                      <strong>Public IP:</strong> {{ service.publicIP }}
                    </div>
                    <div v-if="service.externalIPs && service.externalIPs.length > 0" class="detail-row">
                      <strong>External IPs:</strong> {{ service.externalIPs.join(', ') }}
                    </div>
                  <div class="detail-row">
                    <strong>Ports:</strong> {{ service.ports }}
                  </div>
                  <div class="detail-row">
                    <strong>Selector:</strong> {{ Object.entries(service.service?.spec?.selector || {}).map(([k,v]) => `${k}=${v}`).join(', ') || 'N/A' }}
                  </div>
                  <div class="detail-row">
                    <strong>Health Status:</strong>
                    <span :class="service.healthStatus === 'healthy' ? 'status-success' : 'status-error'">
                      {{ service.healthStatus === 'healthy' ? '✓ Healthy' : service.healthStatus === 'unreachable' ? '⚠ Unreachable' : '✗ Unhealthy' }}
                    </span>
                  </div>
                  <div v-if="service.primaryIP" class="detail-row">
                    <strong>Endpoint:</strong> http://{{ service.actualIP || service.primaryIP }}:8911
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-if="!isHealthChecking && discoveredServices.length === 0 && !discoveryError" class="no-services-found">
            <Banner color="warning">
              <strong>No Services Found</strong>
              <p>No SUSE AI Universal Proxy services were found in the selected clusters. Please ensure the proxy is installed and running.</p>
            </Banner>
          </div>

          <div v-if="discoveryError" class="discovery-error">
            <Banner color="error">
              <strong>Discovery Error</strong>
              <p>{{ discoveryError }}</p>
              <button
                class="btn btn-sm bg-primary mt-10"
                @click="retryDiscovery"
              >
                Retry Discovery
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
              <p>Select which SUSE AI services you want to enable for the available proxy clusters.</p>
            </div>

            <div v-if="serviceSelectionError" class="error-message">
              <Banner color="error">
                <strong>Validation Error</strong>
                <p>{{ serviceSelectionError }}</p>
              </Banner>
            </div>

            <div class="service-selection-content">

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
              <h3>Review Proxy Configuration</h3>
              <p>Please review the proxy and cluster information before proceeding to service selection.</p>
            </div>

             <div class="review-content">
               <!-- Discovered Services Review -->
               <div class="review-section">
                 <h4>Discovered Services</h4>
                 <div class="review-card">
                   <div v-if="discoveredServices.length === 0" class="no-services">
                     <p>No SUSE AI Universal Proxy services were discovered. Please go back and try different clusters.</p>
                   </div>
                   <div v-else class="discovered-services-list">
                     <div
                       v-for="service in discoveredServices"
                       :key="service.clusterId"
                       class="service-item"
                     >
                       <div class="service-info">
                         <strong>{{ service.clusterName }}</strong>
                         <div class="service-details">
                           <span>Primary IP: {{ service.primaryIP || 'N/A' }}</span>
                           <span>Status: <span :class="service.healthStatus === 'healthy' ? 'status-success' : 'status-error'">
                             {{ service.healthStatus === 'healthy' ? '✓ Healthy' : service.healthStatus === 'unreachable' ? '⚠ Unreachable' : '✗ Unhealthy' }}
                           </span></span>
                         </div>
                       </div>
                     </div>
                   </div>
                 </div>
               </div>

               <!-- Proxy Information -->
               <div class="review-section">
                 <h4>Proxy Information</h4>
                 <div class="review-card">
                   <div class="proxy-details">
                     <div class="detail-row">
                       <strong>Service Port:</strong> 8911
                     </div>
                     <div class="detail-row">
                       <strong>Health Endpoint:</strong> /health
                     </div>
                     <div class="detail-row">
                       <strong>Clusters Scanned:</strong> {{ selectedClusters.length }}
                     </div>
                     <div class="detail-row">
                       <strong>Services Found:</strong> {{ discoveredServices.length }}
                     </div>
                   </div>
                 </div>
               </div>

                <!-- Summary -->
                <div class="review-section">
                  <h4>Summary</h4>
                  <div class="review-card summary-card">
                    <p>SUSE AI Universal Proxy services were discovered on <strong>{{ discoveredServices.length }}</strong> cluster(s).</p>
                    <p>Click "Next" to proceed to service selection and enable the services you want to use.</p>
                  </div>
                </div>
              </div>
            </div>
          </template>

      <!-- Login Step -->
      <template #login>
        <div class="login-step">
          <LoginStep
            :proxy-url="selectedServiceUrl"
            @login-success="$emit('login-success')"
          />
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

.cluster-header {
  cursor: pointer;
}

.cluster-ip-config {
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid var(--border-light, rgba(0,0,0,0.1));
}

.ip-input-group {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.ip-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--body-text);
  min-width: 140px;
}

.ip-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 4px;
  font-size: 14px;
}

.ip-input:focus {
  outline: none;
  border-color: var(--primary);
}

.ip-note {
  margin-top: 8px;
  color: var(--muted);
}

/* Service Discovery Step Styles */
.service-discovery-step {
  max-width: 800px;
}

.discovery-loading {
  text-align: center;
  padding: 40px 20px;
}

.discovered-services {
  margin-top: 20px;
}

.discovered-services h4 {
  margin: 0 0 15px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--body-text);
}

.services-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 20px;
}

.service-card {
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--card-bg);
  overflow: hidden;
}

.card-header {
  display: flex;
  align-items: center;
  padding: 15px;
  background: var(--accent-bg, rgba(0, 123, 255, 0.05));
  border-bottom: 1px solid var(--border-light, rgba(0,0,0,0.1));
}

.service-icon {
  font-size: 24px;
  color: var(--primary);
  margin-right: 12px;
  min-width: 24px;
}

.service-info h4 {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--body-text);
}

.service-info p {
  margin: 0;
  font-size: 14px;
  color: var(--muted);
}

.status-indicator {
  margin-left: auto;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-success {
  background: var(--success-light, #d4edda);
  color: var(--success, #28a745);
}

.status-error {
  background: var(--error-light, #f8d7da);
  color: var(--error, #dc3545);
}

.card-details {
  padding: 15px;
}

.detail-row {
  margin-bottom: 8px;
  font-size: 14px;
  display: flex;
  justify-content: space-between;
}

.detail-row strong {
  color: var(--body-text);
  font-weight: 500;
}

.detail-row:last-child {
  margin-bottom: 0;
}

.no-services-found,
.discovery-error {
  margin-top: 20px;
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
import LoginStep from '../LoginStep.vue';
import { useAuth } from '../../../composables/useAuth';
import { useClusterDiscovery } from '../../../composables/useClusterDiscovery';
import type { ServiceInstance } from '../../../types/service-discovery';
import { updateApiBaseUrls } from '../../../config/api-config';

interface Props {
  onComplete?: (config: { clusters: any[]; services: string[] }) => void;
}

interface Emits {
  (e: 'complete', config: { clusters: any[]; services: string[] }): void;
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

    // Cluster discovery composable
    const {
      isScanning,
      scanResults,
      discoveredInstances,
      progress,
      error: scanError,
      discoverClusters,
      retryFailedScans,
      hasDiscoveredInstances,
      failedClusters,
      successfulClusters,
      scanCompletionPercentage,
      getAccessibleClusters
    } = useClusterDiscovery();

    // Local state
    const loading = ref(true);
    const authCheckLoading = ref(true);
    const clusterLoadingError = ref('');
    const accessibleClusters = ref<readonly any[]>([]);
    const selectedClusters = ref<any[]>([]);
    const wizard = ref();

    // Service discovery state
    const isHealthChecking = ref(false); // Keep name for compatibility
    const discoveredServices = ref<any[]>([]);
    const discoveryError = ref('');

    // Service selection state
    const selectedServices = ref<string[]>([]);
    const serviceSelectionError = ref('');
    const reviewError = ref('');
    const selectedServiceUrl = ref('');

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
    ready: accessibleClusters.value.length > 0,
    weight: 2
  },
  {
    name: 'health-check',
    label: 'Service Discovery',
    ready: false,
    weight: 3
  },
  {
    name: 'review',
    label: 'Review',
    ready: false,
    weight: 4
  },
  {
    name: 'service-selection',
    label: 'Select Services',
    ready: false,
    weight: 5
  },
  {
    name: 'login',
    label: 'Authenticate',
    ready: false,
    weight: 6
  }
]);

const wizardTitle = computed(() => 'Discover SUSE AI Services');
const finishMode = computed(() => {
  const currentStepName = wizardSteps.value[currentStep.value]?.name;
  return (currentStepName === 'service-selection' && selectedServices.value.length > 0) ||
         (currentStepName === 'review' && discoveredServices.value.length > 0) ? 'finish' : 'next';
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

const updateClusterIP = (cluster: any, ipType: string, event: Event): void => {
  const target = event.target as HTMLInputElement;
  cluster[ipType] = target.value;
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
      if (selectedServices.value.length > 0) {
        // Navigate to review step
        if (wizard.value) {
          wizard.value.goToStep(3); // review step index (updated since we removed some steps)
        }
      } else {
        console.warn('Cannot proceed to review: no services selected');
      }
    };

  const performServiceDiscovery = async () => {
    if (selectedClusters.value.length === 0) return;

    isHealthChecking.value = true;
    discoveryError.value = '';
    discoveredServices.value = [];

    for (let i = 0; i < selectedClusters.value.length; i++) {
      const cluster = selectedClusters.value[i];

      try {
        console.log(`Discovering SUSE AI UP service in cluster: ${cluster.name} (${cluster.id})`);

        // Query all services and find SUSE AI UP service with port 8911
        const servicesResponse = await store.dispatch('rancher/request', {
          url: `/k8s/clusters/${cluster.id}/v1/services`,
          method: 'GET'
        });

        const services = servicesResponse.data?.items || [];
        const suseAiUpService = services.find((service: any) => {
          const hasPort8911 = service.spec?.ports?.some((p: any) => p.port === 8911 || p.targetPort === 8911);
          return hasPort8911;
        });

        if (!suseAiUpService) {
          console.log(`SUSE AI UP service not found in cluster ${cluster.name}`);
          continue;
        }

        // Extract service information
        const loadBalancerIP = suseAiUpService.status?.loadBalancer?.ingress?.[0]?.ip ||
                              suseAiUpService.status?.loadBalancer?.ingress?.[0]?.hostname;
        const clusterIP = suseAiUpService.spec?.clusterIP;
        const externalIPs = suseAiUpService.spec?.externalIPs || [];
        const ports = suseAiUpService.spec?.ports?.map((port: any) => `${port.port}/${port.protocol}`).join(', ') || '8911';

        // For LoadBalancer services, the external IP might be in different places
        let actualLoadBalancerIP = loadBalancerIP;
        if (!actualLoadBalancerIP && suseAiUpService.spec?.type === 'LoadBalancer') {
          // Check various places where external IP might be stored
          const externalIP = suseAiUpService.status?.loadBalancer?.ingress?.[0]?.ip ||
                            suseAiUpService.status?.loadBalancer?.ingress?.[0]?.hostname ||
                            externalIPs[0] ||
                            suseAiUpService.metadata?.annotations?.['external-ip'];

          // For LoadBalancer services, the external IP is often in the ingress field
          // But sometimes it's directly in the service status
          if (!externalIP && suseAiUpService.status?.loadBalancer?.ingress?.length > 0) {
            actualLoadBalancerIP = suseAiUpService.status.loadBalancer.ingress[0].ip ||
                                  suseAiUpService.status.loadBalancer.ingress[0].hostname;
          }

          // Try to parse publicEndpoints annotation if it exists (Rancher specific)
          if (!actualLoadBalancerIP && suseAiUpService.metadata?.annotations?.['field.cattle.io/publicEndpoints']) {
            try {
              const publicEndpoints = JSON.parse(suseAiUpService.metadata.annotations['field.cattle.io/publicEndpoints']);
              if (Array.isArray(publicEndpoints) && publicEndpoints.length > 0) {
                actualLoadBalancerIP = publicEndpoints[0].addresses?.[0] || publicEndpoints[0].address;
              }
            } catch (e) {
              console.warn('Failed to parse publicEndpoints annotation:', e);
            }
          }

          if (!actualLoadBalancerIP) {
            actualLoadBalancerIP = externalIP;
          }
        }

        console.log('🔍 [APIDiscoveryWizard] IP extraction:', {
          loadBalancerIP,
          externalIPs,
          actualLoadBalancerIP,
          serviceType: suseAiUpService.spec?.type
        });

        // Extract public IP from Rancher annotations
        let publicIP = '';
        const publicEndpointsAnnotation = suseAiUpService.metadata?.annotations?.['field.cattle.io/publicEndpoints'];
        if (publicEndpointsAnnotation) {
          try {
            const endpoints = JSON.parse(publicEndpointsAnnotation);
            if (Array.isArray(endpoints) && endpoints.length > 0) {
              publicIP = endpoints[0]?.addresses?.[0] || '';
            }
          } catch (e) {
            console.warn(`Failed to parse public endpoints annotation for cluster ${cluster.name}:`, e);
          }
        }

        // Determine primary IP for health check (prefer public IP from annotations, fallback to service IPs)
        const primaryIP = publicIP || actualLoadBalancerIP || clusterIP || externalIPs[0];

        // Perform health check with fallback to localhost
        let healthStatus = 'unknown';
        let actualIP = primaryIP;

        // First try primaryIP if available
        if (primaryIP) {
          try {
            console.log(`🔍 [APIDiscoveryWizard] Trying primary IP: ${primaryIP}:8911`);
            const healthResponse = await fetch(`http://${primaryIP}:8911/health`, {
              method: 'GET',
              mode: 'cors',
              headers: {
                'Content-Type': 'application/json'
              },
              signal: AbortSignal.timeout(5000)
            });
            if (healthResponse.ok) {
              healthStatus = 'healthy';
            } else {
              healthStatus = 'unhealthy';
            }
          } catch (error) {
            console.log(`⚠️ [APIDiscoveryWizard] Primary IP ${primaryIP} failed, trying localhost`);
            healthStatus = 'unreachable';
          }
        }

        // If primary IP failed or wasn't available, try localhost
        if (healthStatus === 'unknown' || healthStatus === 'unreachable') {
          try {
            console.log(`🔍 [APIDiscoveryWizard] Trying localhost:8911`);
            const localhostResponse = await fetch('http://localhost:8911/health', {
              method: 'GET',
              mode: 'cors',
              headers: {
                'Content-Type': 'application/json'
              },
              signal: AbortSignal.timeout(5000)
            });
            if (localhostResponse.ok) {
              healthStatus = 'healthy';
              actualIP = 'localhost';
            } else {
              healthStatus = 'unhealthy';
            }
          } catch (localhostError) {
            console.log(`❌ [APIDiscoveryWizard] Localhost also failed`);
            healthStatus = 'unreachable';
          }
        }

        const serviceInfo = {
          clusterId: cluster.id,
          clusterName: cluster.name,
          namespace: suseAiUpService.metadata?.namespace || 'default',
          serviceName: suseAiUpService.metadata?.name,
          loadBalancerIP: actualLoadBalancerIP,
          clusterIP,
          primaryIP,
          actualIP, // The IP that actually responded to health check
          healthStatus,
          serviceUrl: actualIP ? `http://${actualIP}:8911` : null
        };

        discoveredServices.value.push(serviceInfo);
        console.log(`Found SUSE AI UP service in cluster ${cluster.name}:`, serviceInfo);

      } catch (error: any) {
        console.error(`Error discovering SUSE AI UP service in cluster ${cluster.name}:`, error);
        // If the service doesn't exist (404), continue silently
        if (error.response?.status === 404) {
          console.log(`SUSE AI UP service not found in cluster ${cluster.name} (404)`);
        } else {
          discoveryError.value = `Failed to discover services in cluster ${cluster.name}: ${error.message}`;
        }
      }
    }

    isHealthChecking.value = false;

    // Update wizard step readiness
    const healthCheckStep = wizardSteps.value.find(step => step.name === 'health-check');
    if (healthCheckStep) {
      healthCheckStep.ready = discoveredServices.value.length > 0;
    }

    const reviewStep = wizardSteps.value.find(step => step.name === 'review');
    if (reviewStep) {
      reviewStep.ready = discoveredServices.value.length > 0;
    }
  };

  const retryDiscovery = async () => {
    await performServiceDiscovery();
  };



  const retryFailedClusters = async () => {
    await retryFailedScans(store);
  };

const retryScan = async () => {
    await discoverClusters(store, []);
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
      if (accessibleClusters.value.length === 0) {
        console.warn('Cannot proceed to cluster selection: no clusters available');
        return false; // Prevent navigation
      }
    }

    if (targetStepIndex === 2) { // Moving to service-discovery
      if (selectedClusters.value.length === 0) {
        console.warn('Cannot proceed to service discovery: no clusters selected');
        return false; // Prevent navigation
      }
      console.log('Starting service discovery for selected clusters...');
      await performServiceDiscovery();
    }

    if (targetStepIndex === 3) { // Moving to review
      if (isHealthChecking.value) {
        console.warn('Cannot proceed to review: service discovery still in progress');
        return false; // Prevent navigation
      }
      if (discoveredServices.value.length === 0) {
        console.warn('Cannot proceed to review: no services discovered');
        return false; // Prevent navigation
      }
    }

     if (targetStepIndex === 4) { // Moving to service-selection
       if (discoveredServices.value.length === 0) {
         serviceSelectionError.value = 'No services are available. Please go back and check service discovery.';
         console.warn('Cannot proceed to service selection: no services discovered');
         return false; // Prevent navigation
       }
       serviceSelectionError.value = '';
     }

   return true; // Allow navigation
 };

  const handleFinish = () => {
    const currentStepName = wizardSteps.value[currentStep.value]?.name;

    // Store discovered proxy service URLs
    if (discoveredServices.value.length > 0) {
      const proxyUrls = discoveredServices.value
        .map(service => service.actualIP ? `http://${service.actualIP}:8911` : null)
        .filter(url => url !== null) as string[];

      // Update API_BASE_URLS immediately with the discovered service URL
      if (proxyUrls.length > 0) {
        updateApiBaseUrls(proxyUrls[0]);
        console.log('Updated API_BASE_URLS with discovered service URL:', proxyUrls[0]);
      }

      store.dispatch('suseai/setServiceUrls', proxyUrls);
      console.log('Stored proxy service URLs:', proxyUrls);
    }

    if (currentStepName === 'service-selection' && selectedServices.value.length > 0) {
      // Complete configuration with discovered services and selected services
      emit('complete', {
        clusters: discoveredServices.value,
        services: selectedServices.value
      });
    } else if (currentStepName === 'review' && discoveredServices.value.length > 0) {
      // Complete with just proxy setup, no services selected yet
      emit('complete', {
        clusters: discoveredServices.value,
        services: []
      });
    } else {
      console.warn('Cannot finish: invalid state');
    }
  };

 const handleCancel = () => {
   // Navigate back or close wizard
   window.history.back();
 };

  const restartWizard = () => {
     // Reset wizard state
     selectedServices.value = [];
     selectedClusters.value = [...accessibleClusters.value]; // Reset to all selected
     serviceSelectionError.value = '';
     reviewError.value = '';
     discoveredServices.value = [];

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
    if (selectedServices.value.length > 0) {
      // Complete configuration with discovered services and selected services
      emit('complete', {
        clusters: discoveredServices.value,
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
      await discoverClusters(store, selectedClusterIds);
    }
  }, { deep: true });

  // Update wizard step readiness
  watch(discoveredServices, (newServices) => {
    const reviewStep = wizardSteps.value.find(step => step.name === 'review');
    if (reviewStep) {
      reviewStep.ready = newServices.length > 0;
    }

    const serviceSelectionStep = wizardSteps.value.find(step => step.name === 'service-selection');
    if (serviceSelectionStep) {
      serviceSelectionStep.ready = newServices.length > 0;
    }
  });

  watch(selectedServices, (newServices) => {
    // Service selection step is always ready once we have successful health checks
    // This watch can be used for other logic if needed
  });

 // Initialization
 onMounted(async () => {
   try {
     authCheckLoading.value = true;

      // Check if wizard was already completed
      const proxyInstalled = store.state.suseai?.settings?.proxyInstalled;
      const storedServices = store.state.suseai?.settings?.selectedServices || [];
      const storedClusters = store.state.suseai?.settings?.availableClusters || [];

       if (proxyInstalled && storedClusters.length > 0) {
         // Wizard was completed, restore state and go to service selection or review
         discoveredServices.value = storedClusters;
         selectedServices.value = storedServices;
         // Go to service selection step if services not selected, otherwise review
         nextTick(() => {
           if (wizard.value) {
             wizard.value.goToStep(storedServices.length > 0 ? 3 : 4); // review or service-selection step
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
          accessibleClusters.value = clusters.map((cluster: any) => {
            // Note: IP information will be extracted from service annotations during discovery
            // Cluster IPs are not pre-filled as they come from the SUSE AI UP service endpoints
            return {
              id: cluster.id,
              name: cluster.nameDisplay || cluster.name || cluster.id,
              state: cluster.state || 'unknown',
              transitioning: cluster.transitioning || false,
              provider: cluster.provider || 'unknown',
              ready: cluster.ready || false,
              internalIP: '', // Will be filled from service discovery
              publicIP: '' // Will be filled from service discovery
            };
          });
        } catch (error) {
          console.error('Failed to load clusters, falling back to cluster access:', error);
          await loadClusterAccess();
          accessibleClusters.value = clusterAccess.value.map(access => ({
            id: access.clusterId,
            name: access.name || access.clusterId,
            state: 'active', // Assume active if accessible
            transitioning: false,
            provider: 'unknown',
            ready: true,
            internalIP: '', // Will be filled during service discovery
            publicIP: '' // Will be filled during service discovery
          }));
       }

        // Check if clusters were loaded successfully
        if (accessibleClusters.value.length === 0) {
          clusterLoadingError.value = 'No clusters found or accessible. Please check your Rancher permissions and cluster access.';
          console.warn(clusterLoadingError.value);
        } else {
          clusterLoadingError.value = '';
        }

        // Auto-select all accessible clusters initially
        selectedClusters.value = [...accessibleClusters.value];

        // Automatically run service discovery to register loadbalancer IPs
        if (selectedClusters.value.length > 0) {
          console.log('APIDiscoveryWizard: Auto-running service discovery to register loadbalancer IPs');
          await performServiceDiscovery();
        }

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

