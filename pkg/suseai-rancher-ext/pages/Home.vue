<template>
  <div class="home-container">
    <!-- Experimental Banner -->
    <div class="experimental-banner">
      <span class="banner-icon">!</span>
      <strong>Experimental Feature</strong>
      <p>This SUSE AI Universal Proxy feature is experimental and may not be fully compatible with all providers. <a href="https://github.com/SUSE/suse-ai-up/issues" target="_blank">Report Issue</a> or <a href="https://github.com/SUSE/suse-ai-up/pulls" target="_blank">Submit PR</a> to help improve compatibility.</p>
    </div>

    <!-- Configuration Completed Message -->
    <div v-if="configurationCompleted" class="completion-message">
      <div class="completion-banner">
        <i class="icon icon-checkmark"></i>
        <span>Configuration completed, you may now use the services</span>
      </div>
    </div>

    <!-- Step 1: Cluster Discovery -->
    <div v-if="!selectedCluster" class="step cluster-discovery">
      <div class="step-header">
        <h2>Discover SUSE AI Universal Proxy</h2>
        <p>Select a cluster where SUSE AI Universal Proxy is running.</p>
      </div>

      <div class="step-content">
        <div v-if="clustersLoading" class="loading-section">
          <Loading />
          <p>Discovering clusters with SUSE AI Universal Proxy...</p>
        </div>

        <div v-else-if="clustersError" class="error-section">
          <Banner color="error">
            <strong>Discovery Failed</strong>
            <p>{{ clustersError }}</p>
            <button class="btn btn-sm bg-primary mt-10" @click="retryClusterDiscovery">Retry Discovery</button>
          </Banner>
        </div>

        <div v-else-if="availableClusters.length === 0" class="no-clusters-section">
          <Banner color="warning">
            <strong>No SUSE AI Universal Proxy Found</strong>
            <p>No SUSE AI Universal Proxy pods were found in any cluster. Please ensure the proxy is installed and running.</p>
          </Banner>
        </div>

        <div v-else class="clusters-grid">
           <div
             v-for="cluster in availableClusters"
             :key="`cluster-${cluster.id}`"
             class="cluster-card clickable-tile"
             :class="{ selected: selectedCluster === cluster.id }"
             @click="onClusterSelected(cluster.id)"
           >
            <div class="tile-header">
              <div class="tile-logo-container">
                <div class="tile-icon">
                  <i class="icon icon-cluster" aria-hidden="true" />
                </div>
              </div>
              <div class="tile-info">
                <h3 class="tile-title">{{ cluster.name }}</h3>
                <p class="tile-description">Instance of Universal Proxy found</p>
                <div class="tile-meta">
                  <span class="badge badge-info">{{ cluster.podsCount }} pod{{ cluster.podsCount !== 1 ? 's' : '' }}</span>
                </div>
              </div>
            </div>
            <div class="tile-footer">
              <div class="tile-actions">
                <input
                  type="radio"
                  :id="`cluster-${cluster.id}`"
                  :value="cluster.id"
                  v-model="selectedCluster"
                  class="radio-input"
                />
                <label :for="`cluster-${cluster.id}`" class="radio-label">
                  <span class="radio-checkmark"></span>
                  Select
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Step 2: Pod Info & Service Selection -->
    <div v-else-if="selectedCluster && !configurationCompleted" class="step pod-info">
      <div class="step-header">
        <h2>{{ podSaved ? 'Select Services' : 'Configure SUSE AI Universal Proxy' }}</h2>
        <p>{{ podSaved ? 'Choose which SUSE AI services to enable:' : 'Review the pod information and configure services.' }}</p>
        <button class="btn-secondary back-btn" @click="resetClusterSelection">← Change Cluster</button>
      </div>

      <div class="step-content">
        <!-- Pod Discovery Error -->
        <div v-if="podsError" class="error-section">
          <Banner color="error">
            <strong>Pod Discovery Failed</strong>
            <p>{{ podsError }}</p>
            <button class="btn btn-sm bg-primary mt-10" @click="retryPodDiscovery">Retry Pod Discovery</button>
          </Banner>
        </div>

        <!-- Pod Info Card - Collapsed when services are being configured -->
        <div v-else-if="!podSaved && selectedPod" class="pod-info-section">
          <PodInfoCard :pod="selectedPod" @save="onPodSave" />
        </div>

        <!-- Service Selection - Expanded when pod is saved -->
        <div v-if="podSaved" class="service-selection">
          <div class="service-selection-header">
            <h3>Select Services</h3>
            <p>Choose which SUSE AI services to enable:</p>
          </div>

          <ServiceSelector
            v-model="selectedServices"
            :services="availableServices"
          />

          <div class="actions">
            <button
              class="btn-primary"
              :disabled="selectedServices.length === 0"
              @click="onCompleteSetup"
            >
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Configuration Review -->
    <div v-else-if="configurationCompleted" class="step configuration-review">
      <div class="step-header">
        <h2>Configuration Summary</h2>
        <p>Review your SUSE AI Universal Proxy configuration.</p>
      </div>

      <div class="step-content">
        <div class="review-section">
          <h3>Selected Cluster</h3>
          <div class="review-item">
            <div class="review-icon">
              <i class="icon icon-cluster"></i>
            </div>
            <div class="review-info">
              <strong>{{ getSelectedClusterName() }}</strong>
              <p>SUSE AI Universal Proxy instance found</p>
            </div>
          </div>
        </div>

        <div class="review-section">
          <h3>Enabled Services</h3>
          <div class="services-summary">
            <div
              v-for="serviceId in selectedServices"
              :key="serviceId"
              class="service-summary-item"
            >
              <div class="service-icon">
                <i :class="getServiceIconClass(serviceId)"></i>
              </div>
              <div class="service-info">
                <strong>{{ getServiceName(serviceId) }}</strong>
              </div>
            </div>
          </div>
        </div>

        <div class="actions">
          <button class="btn-secondary" @click="editConfiguration">
            Edit Configuration
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from 'vue'
import { useServiceDiscovery } from '../composables/useServiceDiscovery'
import { useStore } from 'vuex'
import PodCard from './components/PodCard.vue'
import PodInfoCard from './components/PodInfoCard.vue'
import ServiceSelector from './components/ServiceSelector.vue'
import { Banner } from '@rancher/shell/rancher-components/Banner'
import Loading from '@shell/components/Loading'
import { getClusters } from '../services/rancher-apps'

interface DetectedPod {
  metadata: {
    name: string;
    namespace: string;
    annotations?: Record<string, string>;
  };
  spec: {
    containers: Array<{
      ports?: Array<{
        containerPort: number;
        protocol: string;
      }>;
    }>;
  };
  status: {
    podIP?: string;
    hostIP?: string;
    phase: string;
    startTime?: string;
  };
  primaryIP?: string;
  clusterIP?: string;
  externalIPs?: string[];
}

export default defineComponent({
  name: 'Home',
  components: {
    PodCard,
    PodInfoCard,
    ServiceSelector,
    Banner,
    Loading
  },

  setup() {
    const { discoverPodObjects } = useServiceDiscovery()
    const store = useStore()

    // State management
    const selectedCluster = ref('')
    const selectedPod = ref<DetectedPod | null>(null)
    const discoveredPods = ref<DetectedPod[]>([])
    const podsLoading = ref(false)
    const podsError = ref('')
    const podSaved = ref(false)
    const selectedServices = ref<string[]>([])
    const configurationCompleted = ref(false)

    // Cluster discovery state
    const clustersLoading = ref(true)
    const clustersError = ref('')
    const availableClusters = ref<any[]>([])
    const allClusters = ref<any[]>([])
    const clustersCache = ref<any[]>([])
    const cacheExpiry = ref(0)
    const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

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
    ]

    // Get selected services from store
    const storedSelectedServices = computed(() => store.getters.selectedServices)

    // Discover clusters with SUSE AI pods
    const discoverClustersWithPods = async () => {
      clustersLoading.value = true
      clustersError.value = ''

      try {
        // Check cache first
        const now = Date.now()
        if (clustersCache.value.length > 0 && now < cacheExpiry.value) {
          console.log('Using cached cluster data')
          allClusters.value = clustersCache.value
        } else {
          console.log('Discovering all clusters...')
          const clusters = await getClusters(store)
          allClusters.value = clusters || []
          clustersCache.value = allClusters.value
          cacheExpiry.value = now + CACHE_DURATION
        }

        console.log(`Found ${allClusters.value.length} clusters, checking for SUSE AI pods...`)

        // Check clusters with concurrency limit for better performance and API stability
        const CONCURRENT_LIMIT = 3
        const clustersWithPods: any[] = []

        for (let i = 0; i < allClusters.value.length; i += CONCURRENT_LIMIT) {
          const batch = allClusters.value.slice(i, i + CONCURRENT_LIMIT)
          const batchPromises = batch.map(async (cluster) => {
            try {
              console.log(`Checking cluster: ${cluster.name || cluster.id}`)
              const pods = await discoverPodObjects(store, cluster.id)

              if (pods.length > 0) {
                console.log(`✅ Found ${pods.length} pods in cluster ${cluster.name || cluster.id}`)
                return {
                  ...cluster,
                  pods,
                  podsCount: pods.length
                }
              } else {
                console.log(`⚠️ No SUSE AI pods found in cluster ${cluster.name || cluster.id}`)
                return null
              }
            } catch (error: any) {
              console.warn(`Failed to check cluster ${cluster.name || cluster.id}:`, error)
              // If this is the currently selected cluster, set an error
              if (selectedCluster.value === cluster.id) {
                podsError.value = `Failed to discover pods in cluster ${cluster.name || cluster.id}: ${error?.message || 'Unknown error'}`
              }
              return null
            }
          })

          const batchResults = await Promise.allSettled(batchPromises)
          batchResults.forEach((result) => {
            if (result.status === 'fulfilled' && result.value) {
              clustersWithPods.push(result.value)
            } else if (result.status === 'rejected') {
              console.error('Cluster check failed:', result.reason)
            }
          })
        }

        availableClusters.value = clustersWithPods
        console.log(`✅ Discovery complete: ${availableClusters.value.length} clusters with SUSE AI pods`)

      } catch (error: any) {
        console.error('Cluster discovery failed:', error)
        clustersError.value = error.message || 'Failed to discover clusters'
        availableClusters.value = []
      } finally {
        clustersLoading.value = false
      }
    }

    // Event handlers
    const onClusterSelected = (clusterId: string) => {
      if (!clusterId) return

      const cluster = availableClusters.value.find(c => c.id === clusterId)
      if (!cluster) {
        podsError.value = 'Selected cluster not found'
        return
      }

      if (!cluster.pods || cluster.pods.length === 0) {
        podsError.value = 'No SUSE AI Universal Proxy pods found in the selected cluster'
        return
      }

      selectedCluster.value = clusterId
      discoveredPods.value = cluster.pods
      podsError.value = '' // Clear any previous errors
      // Auto-select the first (and only) pod
      selectedPod.value = cluster.pods[0]
      console.log(`Selected cluster ${clusterId} and auto-selected pod`)
    }

    const onPodSelected = (pod: DetectedPod) => {
      selectedPod.value = pod
      console.log('Selected pod:', pod)
    }

    const retryClusterDiscovery = async () => {
      try {
        await discoverClustersWithPods()
      } catch (error: any) {
        console.error('Retry cluster discovery failed:', error)
        // Error is already handled in discoverClustersWithPods
      }
    }

    const onPodSave = () => {
      podSaved.value = true
      // Initialize selected services from store or empty array
      selectedServices.value = [...storedSelectedServices.value]
      console.log('Pod saved, showing service selection')
    }

    const onCompleteSetup = async () => {
      if (selectedServices.value.length === 0) {
        console.warn('No services selected')
        return
      }

      try {
        // Store configuration in Vuex
        await store.dispatch('suseai/setSelectedServices', selectedServices.value)
        await store.dispatch('suseai/setSelectedCluster', selectedCluster.value)
        await store.dispatch('suseai/setSelectedPod', selectedPod.value)
        await store.dispatch('suseai/setProxyInstalled', true)

        // Generate service URL from pod info (always use external IP if available)
        const externalIP = selectedPod.value!.externalIPs?.[0]
        const primaryIP = selectedPod.value!.primaryIP || selectedPod.value!.clusterIP
        const ip = externalIP || primaryIP
        const serviceUrl = `http://${ip}:8911`
        await store.dispatch('suseai/setServiceUrls', [serviceUrl])

        console.log('Configuration saved:', {
          cluster: selectedCluster.value,
          pod: selectedPod.value,
          services: selectedServices.value,
          serviceUrl
        })

        // Show completion page
        configurationCompleted.value = true
      } catch (error: any) {
        console.error('Failed to save configuration:', error)
        // Show error state - could add an error banner here
        // For now, we'll just log the error since the UI doesn't have a specific error state for this
      }
    }

    const editConfiguration = () => {
      // Reset all state to restart the wizard
      configurationCompleted.value = false
      selectedCluster.value = ''
      selectedPod.value = null
      discoveredPods.value = []
      podsError.value = ''
      podSaved.value = false
      selectedServices.value = []
    }

    const getSelectedClusterName = (): string => {
      const cluster = availableClusters.value.find(c => c.id === selectedCluster.value)
      return cluster ? cluster.name : selectedCluster.value
    }

    const getServiceName = (serviceId: string): string => {
      const service = availableServices.find(s => s.id === serviceId)
      return service ? service.name : serviceId
    }

    const getServiceIconClass = (serviceId: string): string => {
      const service = availableServices.find(s => s.id === serviceId)
      return service ? service.iconClass : 'icon icon-server'
    }

    const resetClusterSelection = () => {
      selectedCluster.value = ''
      selectedPod.value = null
      discoveredPods.value = []
      podsError.value = ''
      podSaved.value = false
      selectedServices.value = []
      configurationCompleted.value = false
    }

    const resetPodSelection = () => {
      selectedPod.value = null
      podSaved.value = false
      selectedServices.value = []
    }

    const retryPodDiscovery = async () => {
      try {
        podsError.value = ''
        const cluster = availableClusters.value.find(c => c.id === selectedCluster.value)
        if (cluster) {
          const pods = await discoverPodObjects(store, selectedCluster.value)
          if (pods.length > 0) {
            cluster.pods = pods
            cluster.podsCount = pods.length
            discoveredPods.value = pods
            selectedPod.value = pods[0]
            podsError.value = ''
          } else {
            podsError.value = 'No SUSE AI Universal Proxy pods found in the selected cluster'
          }
        } else {
          podsError.value = 'Selected cluster not found'
        }
      } catch (error: any) {
        console.error('Pod discovery retry failed:', error)
        podsError.value = `Failed to discover pods: ${error?.message || 'Unknown error'}`
      }
    }

    // Initialize discovery on mount
    discoverClustersWithPods()

    return {
      selectedCluster,
      selectedPod,
      discoveredPods,
      podsLoading,
      podsError,
      podSaved,
      selectedServices,
      availableServices,
      configurationCompleted,
      clustersLoading,
      clustersError,
      availableClusters,
      onClusterSelected,
      onPodSelected,
      onPodSave,
      onCompleteSetup,
      resetClusterSelection,
      resetPodSelection,
      retryClusterDiscovery,
      editConfiguration,
      getSelectedClusterName,
      getServiceName,
      getServiceIconClass
    }
  }
})
</script>

<style scoped>
.home-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

/* Experimental Banner */
.experimental-banner {
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 4px;
  padding: 12px 16px;
  margin-bottom: 24px;
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

/* Step Styles */
.step {
  background: var(--card-bg, #fff);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 24px;
  margin-bottom: 24px;
}

.step-header {
  margin-bottom: 24px;
}

.step-header h2 {
  font-size: 24px;
  font-weight: 600;
  color: var(--body-text);
  margin: 0 0 8px 0;
}

.step-header p {
  font-size: 16px;
  color: var(--muted);
  line-height: 1.5;
  margin: 0 0 16px 0;
}

.back-btn {
  font-size: 14px;
  padding: 6px 12px;
  margin-top: 8px;
}

.step-content {
  max-width: 800px;
}

/* Loading Section */
.loading-section {
  text-align: center;
  padding: 40px 20px;
}

/* Error Section */
.error-section {
  margin-bottom: 20px;
}

/* No Pods Section */
.no-pods-section {
  margin-bottom: 20px;
}

/* Clusters Grid */
.clusters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.cluster-card {
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--card-bg);
  cursor: pointer;
  transition: all 0.2s ease;
  overflow: hidden;
}

.cluster-card:hover {
  border-color: var(--primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.cluster-card.selected {
  border-color: var(--primary);
  background: var(--primary-light, rgba(0, 123, 255, 0.05));
}

.tile-header {
  display: flex;
  align-items: flex-start;
  padding: 16px;
  gap: 12px;
}

.tile-logo-container {
  min-width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tile-icon {
  font-size: 24px;
  color: var(--primary);
}

.tile-info {
  flex: 1;
}

.tile-title {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--body-text);
}

.tile-description {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: var(--muted);
  line-height: 1.4;
}

.tile-meta {
  display: flex;
  gap: 8px;
  align-items: center;
}

.badge {
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
}

.badge-info {
  background: var(--info-light, #d1ecf1);
  color: var(--info, #0c5460);
}

.tile-footer {
  padding: 16px;
  border-top: 1px solid var(--border-light, rgba(0,0,0,0.1));
  background: var(--accent-bg, rgba(0, 123, 255, 0.02));
}

.tile-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.radio-input {
  position: absolute;
  opacity: 0;
  cursor: pointer;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: var(--body-text);
}

.radio-checkmark {
  width: 16px;
  height: 16px;
  border: 2px solid var(--border);
  border-radius: 50%;
  position: relative;
  transition: all 0.2s ease;
}

.radio-input:checked + .radio-label .radio-checkmark {
  border-color: var(--primary);
  background: var(--primary);
}

.radio-input:checked + .radio-label .radio-checkmark::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: white;
}

/* Completion Message */
.completion-message {
  margin-bottom: 24px;
}

.completion-banner {
  background: var(--success-light, #d4edda);
  border: 1px solid var(--success, #28a745);
  border-radius: 8px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--success, #155724);
}

.completion-banner i {
  font-size: 20px;
  color: var(--success, #28a745);
}

/* Configuration Review */
.review-section {
  margin-bottom: 32px;
}

.review-section h3 {
  font-size: 18px;
  font-weight: 600;
  color: var(--body-text);
  margin: 0 0 16px 0;
  border-bottom: 1px solid var(--border-light, rgba(0,0,0,0.1));
  padding-bottom: 8px;
}

.review-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
}

.review-icon {
  font-size: 24px;
  color: var(--primary);
  min-width: 24px;
}

.review-info strong {
  display: block;
  font-size: 16px;
  color: var(--body-text);
  margin-bottom: 4px;
}

.review-info p {
  margin: 0;
  font-size: 14px;
  color: var(--muted);
}

.services-summary {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 12px;
}

.service-summary-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
}

.service-summary-item .service-icon {
  font-size: 20px;
  color: var(--primary);
  min-width: 20px;
}

.service-summary-item .service-info strong {
  font-size: 14px;
  color: var(--body-text);
}

/* Pod Info Section */
.pod-info-section {
  margin-bottom: 24px;
}

/* Pods Grid */
.pods-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

/* Service Selection */
.service-selection {
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid var(--border-light, rgba(0,0,0,0.1));
}

.service-selection-header {
  margin-bottom: 20px;
}

.service-selection-header h3 {
  font-size: 20px;
  font-weight: 600;
  color: var(--body-text);
  margin: 0 0 8px 0;
}

.service-selection-header p {
  font-size: 14px;
  color: var(--muted);
  margin: 0;
}

/* Actions */
.actions {
  margin-top: 24px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* Button Styles */
.btn-primary {
  background: var(--primary);
  color: white;
  border: 1px solid var(--primary);
  border-radius: 4px;
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-hover, darken(var(--primary), 10%));
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--secondary-bg, #f8f9fa);
  color: var(--secondary-text, #495057);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary:hover {
  background: var(--secondary-hover, #e9ecef);
}

/* Responsive */
@media (max-width: 768px) {
  .home-container {
    padding: 16px;
  }

  .step {
    padding: 16px;
  }

  .pods-grid {
    grid-template-columns: 1fr;
  }

  .actions {
    flex-direction: column;
  }

  .btn-primary,
  .btn-secondary {
    width: 100%;
  }
}
</style>