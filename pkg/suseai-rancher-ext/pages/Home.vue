<template>
  <div class="home-container">
    <!-- Experimental Banner -->
    <div class="experimental-banner">
      <span class="banner-icon">!</span>
      <strong>Experimental Feature</strong>
      <p>This SUSE AI Universal Proxy feature is experimental and may not be fully compatible with all providers. <a href="https://github.com/SUSE/suse-ai-up/issues" target="_blank">Report Issue</a> or <a href="https://github.com/SUSE/suse-ai-up/pulls" target="_blank">Submit PR</a> to help improve compatibility.</p>
    </div>

    <!-- Step 1: Cluster Selection -->
    <div v-if="!selectedCluster" class="step cluster-selection">
      <div class="step-header">
        <h2>Select Cluster</h2>
        <p>Choose the Kubernetes cluster where SUSE AI Universal Proxy is running.</p>
      </div>
      <div class="step-content">
        <ClusterSelect v-model="selectedCluster" @update:modelValue="onClusterSelected" />
      </div>
    </div>

    <!-- Step 2: Pod Selection -->
    <div v-else-if="!selectedPod" class="step pod-selection">
      <div class="step-header">
        <h2>Select SUSE AI Proxy Pod</h2>
        <p>Select the running SUSE AI Universal Proxy pod from cluster <strong>{{ selectedCluster }}</strong>.</p>
        <button class="btn-secondary back-btn" @click="resetClusterSelection">← Change Cluster</button>
      </div>

      <div class="step-content">
        <div v-if="podsLoading" class="loading-section">
          <Loading />
          <p>Discovering SUSE AI proxy pods...</p>
        </div>

        <div v-else-if="podsError" class="error-section">
          <Banner color="error">
            <strong>Pod Discovery Failed</strong>
            <p>{{ podsError }}</p>
            <button class="btn btn-sm bg-primary mt-10" @click="retryPodDiscovery">Retry Discovery</button>
          </Banner>
        </div>

        <div v-else-if="discoveredPods.length === 0" class="no-pods-section">
          <Banner color="warning">
            <strong>No SUSE AI Proxy Pods Found</strong>
            <p>No SUSE AI Universal Proxy pods were found in the selected cluster. Please ensure the proxy is installed and running.</p>
          </Banner>
        </div>

        <div v-else class="pods-grid">
          <PodCard
            v-for="pod in discoveredPods"
            :key="pod.metadata.name"
            :pod="pod"
            @select="onPodSelected"
          />
        </div>
      </div>
    </div>

    <!-- Step 3: Pod Info & Service Selection -->
    <div v-else class="step pod-info">
      <div class="step-header">
        <h2>Configure SUSE AI Proxy</h2>
        <p>Review the selected pod information and configure services.</p>
        <button class="btn-secondary back-btn" @click="resetPodSelection">← Change Pod</button>
      </div>

      <div class="step-content">
        <PodInfoCard v-if="selectedPod" :pod="selectedPod" @save="onPodSave" />

        <div v-if="podSaved" class="service-selection">
          <div class="service-selection-header">
            <h3>Configure Services</h3>
            <p>Select which SUSE AI services to enable for this proxy instance:</p>
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
              Complete Setup
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from 'vue'
import { useServiceDiscovery } from '../composables/useServiceDiscovery'
import { useStore } from 'vuex'
import ClusterSelect from './components/ClusterSelect.vue'
import PodCard from './components/PodCard.vue'
import PodInfoCard from './components/PodInfoCard.vue'
import ServiceSelector from './components/ServiceSelector.vue'
import { Banner } from '@rancher/shell/rancher-components/Banner'
import Loading from '@shell/components/Loading'

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
    ClusterSelect,
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

    // Event handlers
    const onClusterSelected = async (clusterId: string) => {
      if (!clusterId) return

      selectedCluster.value = clusterId
      podsLoading.value = true
      podsError.value = ''

      try {
        console.log(`Discovering pods in cluster: ${clusterId}`)
        const pods = await discoverPodObjects(store, clusterId)
        discoveredPods.value = pods || []
        console.log(`Found ${discoveredPods.value.length} pods`)
      } catch (error: any) {
        console.error('Pod discovery failed:', error)
        podsError.value = error.message || 'Failed to discover pods'
        discoveredPods.value = []
      } finally {
        podsLoading.value = false
      }
    }

    const onPodSelected = (pod: DetectedPod) => {
      selectedPod.value = pod
      console.log('Selected pod:', pod)
    }

    const onPodSave = () => {
      podSaved.value = true
      // Initialize selected services from store or empty array
      selectedServices.value = [...storedSelectedServices.value]
      console.log('Pod saved, showing service selection')
    }

    const onCompleteSetup = () => {
      if (selectedServices.value.length === 0) {
        console.warn('No services selected')
        return
      }

      // Store configuration in Vuex
      store.dispatch('suseai/setSelectedServices', selectedServices.value)
      store.dispatch('suseai/setSelectedCluster', selectedCluster.value)
      store.dispatch('suseai/setSelectedPod', selectedPod.value)
      store.dispatch('suseai/setProxyInstalled', true)

      // Generate service URL from pod info
      const serviceUrl = `http://${selectedPod.value!.primaryIP || selectedPod.value!.clusterIP}:8911`
      store.dispatch('suseai/setServiceUrls', [serviceUrl])

      console.log('Setup completed:', {
        cluster: selectedCluster.value,
        pod: selectedPod.value,
        services: selectedServices.value,
        serviceUrl
      })

      // TODO: Navigate to main application or show success message
    }

    const resetClusterSelection = () => {
      selectedCluster.value = ''
      selectedPod.value = null
      discoveredPods.value = []
      podsError.value = ''
      podSaved.value = false
      selectedServices.value = []
    }

    const resetPodSelection = () => {
      selectedPod.value = null
      podSaved.value = false
      selectedServices.value = []
    }

    const retryPodDiscovery = () => {
      onClusterSelected(selectedCluster.value)
    }

    return {
      selectedCluster,
      selectedPod,
      discoveredPods,
      podsLoading,
      podsError,
      podSaved,
      selectedServices,
      availableServices,
      onClusterSelected,
      onPodSelected,
      onPodSave,
      onCompleteSetup,
      resetClusterSelection,
      resetPodSelection,
      retryPodDiscovery
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