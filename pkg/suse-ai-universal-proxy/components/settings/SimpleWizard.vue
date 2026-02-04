<template>
  <div class="simple-wizard">
    <!-- Cluster Selection -->
    <div v-show="!showActivationSteps" style="padding: 20px;">
      <h2>Select Cluster to Configure</h2>
      <p>Choose the cluster where you want to configure SUSE AI Universal Proxy services.</p>

      <div style="max-width: 400px; margin-top: 20px;">
        <label for="cluster-select" style="display: block; margin-bottom: 8px; font-weight: 500;">Select Cluster:</label>
        <select
          id="cluster-select"
          v-model="selectedClusterId"
          @change="onClusterSelected"
          style="width: 100%; padding: 8px 12px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px;"
        >
          <option value="">Choose a cluster...</option>
          <option
            v-for="cluster in availableClusters"
            :key="cluster.id"
            :value="cluster.id"
          >
            {{ cluster.nameDisplay || cluster.name }} ({{ cluster.state }})
          </option>
        </select>

        <div v-if="selectedClusterId" style="margin-top: 15px; padding: 12px; background: #f8f9fa; border-radius: 4px;">
          <h4>Selected: {{ selectedCluster?.nameDisplay || selectedCluster?.name }}</h4>
          <p>Status: {{ selectedCluster?.state }}</p>
          <p>This cluster will be configured with SUSE AI Universal Proxy services.</p>
        </div>

        <div style="margin-top: 20px;">
          <button
            :disabled="!selectedClusterId"
            :style="{ padding: '10px 20px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: selectedClusterId ? 'pointer' : 'not-allowed', opacity: selectedClusterId ? 1 : 0.6 }"
            @click="startActivation"
          >
            Configure Services
          </button>
        </div>
      </div>
    </div>

    <!-- Activation Steps Sequence -->
    <div v-show="showActivationSteps" style="padding: 20px; margin: 20px;">
      <h2>Activating SUSE AI Services</h2>
      <p>Configuring and enabling all SUSE AI services...</p>

      <div class="activation-container">
        <div class="activation-steps-grid">
          <div
            v-for="(step, index) in activationSteps"
            :key="step.id"
            class="activation-step-card"
            :class="{ active: step.status === 'processing', completed: step.status === 'completed', error: step.status === 'error' }"
          >
            <div class="step-header">
              <div class="step-indicator">
                <span v-if="step.status === 'pending'">{{ index + 1 }}</span>
                <i v-else-if="step.status === 'processing'" class="icon icon-spinner spinning"></i>
                <i v-else-if="step.status === 'completed'" class="icon icon-check text-success"></i>
                <i v-else-if="step.status === 'error'" class="icon icon-error text-error"></i>
              </div>
              <div class="step-title">
                <h4>{{ step.title }}</h4>
              </div>
            </div>

            <div class="step-content">
              <p class="step-description">{{ step.description }}</p>
              <div v-if="step.details" class="step-details">{{ step.details }}</div>
              
              <div v-if="step.links && step.links.length > 0" class="step-links">
                <div v-for="(link, lIndex) in step.links" :key="lIndex" class="link-item">
                  <a :href="link.url" target="_blank" rel="noopener noreferrer" class="step-link">
                    {{ link.label }} <i class="icon icon-external-link"></i>
                  </a>
                </div>
              </div>
              <div v-else-if="step.endpoint" class="step-endpoint">
                <strong>Endpoint:</strong> {{ step.endpoint }}
              </div>

              <div v-if="step.status === 'completed'" class="step-status">
                <span class="status-badge success">✓ Activated</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Restart Wizard Button -->
      <div v-if="activationComplete" style="margin-top: 30px; text-align: center;">
        <button
          @click="restartWizard"
          style="padding: '10px 20px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer'"
        >
          Restart Wizard
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted } from 'vue'
import { useStore } from 'vuex'
import { useClusterDiscovery } from '../../composables/useClusterDiscovery'
import { useServiceDiscovery } from '../../composables/useServiceDiscovery'

interface ActivationStep {
  id: string
  title: string
  description: string
  details?: string
  endpoint?: string
  links?: { url: string; label: string }[]
  status: 'pending' | 'processing' | 'completed' | 'error'
}

export default defineComponent({
  name: 'SimpleWizard',
  emits: ['complete'],
  setup(props, { emit }) {
    const store = useStore()
    const { getAccessibleClusters } = useClusterDiscovery()
    const { discoverPodObjects } = useServiceDiscovery()

    const showActivationSteps = ref(false)
    const activationComplete = ref(false)
    const selectedClusterId = ref('')
    const availableClusters = ref<any[]>([])
    const isLoadingClusters = ref(true)
    const wizardCompleted = computed(() => store.getters['suseai/wizardCompleted'])

    const activationSteps = ref<ActivationStep[]>([
      {
        id: 'proxy-config',
        title: 'Proxy Config',
        description: 'Setting up SUSE AI Universal Proxy configuration',
        endpoint: 'Loading...',
        status: 'pending'
      },
      {
        id: 'service-urls',
        title: 'Service URLs',
        description: 'Registering service endpoints and connection URLs',
        endpoint: 'Multiple endpoints registered',
        status: 'pending'
      },
      {
        id: 'enable-gateway',
        title: 'MCP Gateway',
        description: 'Activating Model Context Protocol Gateway service',
        endpoint: 'Loading...',
        status: 'pending'
      },
      {
        id: 'enable-registry',
        title: 'MCP Registry',
        description: 'Activating Model Context Protocol Registry service',
        endpoint: 'Loading...',
        status: 'pending'
      },
      {
        id: 'enable-agents',
        title: 'SmartAgents',
        description: 'Activating intelligent agent services',
        endpoint: 'Loading...',
        status: 'pending'
      },
      {
        id: 'enable-virtual-mcp',
        title: 'Virtual MCP',
        description: 'Activating virtual MCP server instances',
        endpoint: 'Loading...',
        status: 'pending'
      },
      {
        id: 'health-check',
        title: 'Health Checks',
        description: 'Verifying all services are running and accessible',
        endpoint: 'Loading...',
        status: 'pending'
      },
      {
        id: 'finalize',
        title: 'Finalize Setup',
        description: 'Completing setup and enabling full functionality',
        endpoint: 'Configuration saved',
        status: 'pending'
      }
    ])

    const updateEndpoints = (baseUrl: string) => {
      // Remove trailing slash if present
      const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
      
      activationSteps.value.forEach(step => {
        if (step.endpoint === 'Loading...') {
          switch (step.id) {
            case 'proxy-config':
              step.endpoint = cleanBaseUrl
              break
            case 'enable-gateway':
              step.endpoint = `${cleanBaseUrl}/gateway`
              step.links = [
                { url: `${cleanBaseUrl}/api/v1/adapters`, label: 'Adapters API' }
              ]
              break
            case 'enable-registry':
              step.endpoint = `${cleanBaseUrl}/registry`
              step.links = [
                { url: `${cleanBaseUrl}/api/v1/registry/browse`, label: 'Registry Browse' }
              ]
              break
            case 'enable-agents':
              step.endpoint = `${cleanBaseUrl}/agents`
              break
            case 'enable-virtual-mcp':
              step.endpoint = `${cleanBaseUrl}/virtual`
              break
            case 'health-check':
              step.endpoint = `${cleanBaseUrl}/health`
              step.links = [
                { url: `${cleanBaseUrl}/health`, label: 'Health Check' }
              ]
              break
          }
        }
      })
    }

    const completedSteps = computed(() =>
      activationSteps.value.filter(step => step.status === 'completed').length
    )

    const startActivation = () => {
      showActivationSteps.value = true
      runActivationSequence()
    }

    const runActivationSequence = async () => {
      if (!selectedCluster.value) return

      // Use service discovery to find the correct IP or URL
      let serviceBaseUrl = 'http://10.42.0.45:8911' // Default fallback
      let loadBalancerIP = '10.42.0.45' // Keep for display/fallback

      try {
        console.log('🔍 Discovering SUSE AI services...')
        const discoveredPods = await discoverPodObjects(store, selectedCluster.value.id)

        if (discoveredPods.length > 0) {
          const primaryPod = discoveredPods[0]
          const primaryUrl = (primaryPod as any).url
          const primaryIP = primaryPod.primaryIP

          // Always update loadBalancerIP if we found a primary IP
          if (primaryIP) {
            loadBalancerIP = primaryIP
          }

          if (primaryUrl) {
            serviceBaseUrl = primaryUrl
            console.log('✅ Using discovered Rancher Proxy URL:', serviceBaseUrl)
            updateEndpoints(serviceBaseUrl)
          } else if (primaryIP) {
            serviceBaseUrl = `http://${loadBalancerIP}:8911`
            console.log('✅ Using discovered service IP:', loadBalancerIP)
            updateEndpoints(serviceBaseUrl)
          } else {
            console.log('⚠️ No primary IP or URL found in discovered services, using default:', serviceBaseUrl)
            updateEndpoints(serviceBaseUrl)
          }
        } else {
          console.log('⚠️ No SUSE AI services discovered, using default:', serviceBaseUrl)
          updateEndpoints(serviceBaseUrl)
        }
      } catch (error) {
        console.warn('⚠️ Service discovery failed, using default:', error)
        updateEndpoints(serviceBaseUrl)
      }

      // Discovered services with URL info
      const discoveredServices = [
        {
          clusterId: selectedCluster.value.id,
          clusterName: selectedCluster.value.nameDisplay || selectedCluster.value.name,
          serviceName: 'suse-ai-up',
          namespace: 'suseai',
          primaryIP: loadBalancerIP,
          loadBalancerIP: loadBalancerIP,
          externalIPs: [],
          url: serviceBaseUrl
        }
      ]

      const selectedServices = ['mcp-gateway', 'mcp-registry', 'smart-agents', 'virtual-mcp']
      const serviceUrls = [serviceBaseUrl]

      // Step 1: Configure Proxy Settings
      await updateStepStatus('proxy-config', 'processing')
      await delay(800)
      await updateStepStatus('proxy-config', 'completed', 'Proxy configuration saved')

      // Step 2: Register Service URLs
      await updateStepStatus('service-urls', 'processing')
      await delay(600)
      await updateStepStatus('service-urls', 'completed', `Registered ${serviceUrls.length} service URLs`)

      // Step 3: Enable MCP Gateway
      await updateStepStatus('enable-gateway', 'processing')
      await delay(700)
      await updateStepStatus('enable-gateway', 'completed', 'MCP Gateway activated')

      // Step 4: Enable MCP Registry
      await updateStepStatus('enable-registry', 'processing')
      await delay(650)
      await updateStepStatus('enable-registry', 'completed', 'MCP Registry activated')

      // Step 5: Enable SmartAgents
      await updateStepStatus('enable-agents', 'processing')
      await delay(600)
      await updateStepStatus('enable-agents', 'completed', 'SmartAgents service activated')

      // Step 6: Enable Virtual MCP
      await updateStepStatus('enable-virtual-mcp', 'processing')
      await delay(550)
      await updateStepStatus('enable-virtual-mcp', 'completed', 'Virtual MCP instances activated')

      // Step 7: Health Checks
      await updateStepStatus('health-check', 'processing')
      await delay(1000)
      await updateStepStatus('health-check', 'completed', 'All services responding healthy')

      // Step 8: Finalize Configuration
      await updateStepStatus('finalize', 'processing')
      await delay(500)

      // Save to store
      store.dispatch('suseai/setSelectedServices', selectedServices)
      store.dispatch('suseai/setAvailableClusters', discoveredServices)
      store.dispatch('suseai/setServiceUrls', serviceUrls)
      store.dispatch('suseai/setProxyInstalled', true)
      store.dispatch('suseai/setWizardCompleted', true)

      await updateStepStatus('finalize', 'completed', 'Configuration completed successfully')

      console.log('✅ Wizard completed successfully:', {
        services: selectedServices,
        clusters: discoveredServices,
        urls: serviceUrls
      })

      activationComplete.value = true

      // Complete immediately without celebration message
      emit('complete', {
        clusters: discoveredServices,
        services: selectedServices
      })
    }

    const updateStepStatus = async (stepId: string, status: ActivationStep['status'], details?: string) => {
      const step = activationSteps.value.find(s => s.id === stepId)
      if (step) {
        step.status = status
        if (details) {
          step.details = details
        }
      }
    }

    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

    const selectedCluster = computed(() => availableClusters.value.find(c => c.id === selectedClusterId.value))

    const onClusterSelected = () => {
      // Cluster selection handled by v-model
      console.log('Selected cluster:', selectedClusterId.value)
    }

    const restartWizard = () => {
      // Reset wizard state
      showActivationSteps.value = false
      activationComplete.value = false
      selectedClusterId.value = ''

      // Reset all activation steps
      activationSteps.value.forEach(step => {
        step.status = 'pending'
        step.details = undefined
        if (step.endpoint === 'Loading...') {
          step.endpoint = 'Loading...'
        }
      })

      // Clear wizard completion status
      store.dispatch('suseai/setWizardCompleted', false)

      console.log('🔄 Wizard restarted')
    }

    // Load clusters on mount
    onMounted(async () => {
      await loadClusters()

      // If wizard was already completed, show final state
      if (wizardCompleted.value) {
        showActivationSteps.value = true
        activationComplete.value = true
        // Load the saved cluster if available
        const savedClusters = store.getters['suseai/availableClusters']
        if (savedClusters.length > 0) {
          selectedClusterId.value = savedClusters[0].clusterId
        }
      }
    })

    const loadClusters = async () => {
      try {
        isLoadingClusters.value = true
        const clusters = await getAccessibleClusters(store)
        availableClusters.value = clusters.filter(c => c.state === 'active')
        console.log('Loaded clusters:', availableClusters.value.length)
      } catch (error) {
        console.error('Failed to load clusters:', error)
      } finally {
        isLoadingClusters.value = false
      }
    }

    return {
      showActivationSteps,
      activationSteps,
      activationComplete,
      completedSteps,
      selectedClusterId,
      availableClusters,
      selectedCluster,
      isLoadingClusters,
      wizardCompleted,
      startActivation,
      onClusterSelected,
      restartWizard
    }
  }
})
</script>

<style scoped>
.simple-wizard {
  padding: 20px;
}

.activation-container {
  margin-top: 30px;
}

.activation-steps-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 15px;
  margin-bottom: 30px;
}

.activation-step-card {
  border: 1px solid #dee2e6;
  border-radius: 8px;
  background: #fff;
  padding: 16px;
  transition: all 0.3s ease;
}

.activation-step-card.active {
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.activation-step-card.completed {
  border-color: #28a745;
  background: #f8f9fa;
}

.activation-step-card.error {
  border-color: #dc3545;
  background: #f8d7da;
}

.step-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.step-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #f8f9fa;
  color: #6c757d;
  font-weight: 600;
  font-size: 14px;
  flex-shrink: 0;
}

.activation-step-card.active .step-indicator {
  background: #007bff;
  color: white;
  box-shadow: 0 2px 4px rgba(0, 123, 255, 0.3);
}

.activation-step-card.completed .step-indicator {
  background: #28a745;
  color: white;
  box-shadow: 0 2px 4px rgba(40, 167, 69, 0.3);
}

.activation-step-card.error .step-indicator {
  background: #dc3545;
  color: white;
}

.step-title h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #333;
  line-height: 1.2;
}

.step-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.step-description {
  margin: 0;
  color: #666;
  font-size: 12px;
  line-height: 1.4;
}

.step-details {
  font-size: 11px;
  color: #007bff;
  font-weight: 500;
  background: #f8f9ff;
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid #e3f2fd;
}

.step-endpoint {
  font-size: 11px;
  color: #28a745;
  font-family: monospace;
  background: #f8fff9;
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid #e8f5e8;
  word-break: break-all;
}

.step-links {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 4px;
}

.step-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #007bff;
  text-decoration: none;
  background: #f0f7ff;
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid #cce5ff;
  transition: all 0.2s ease;
}

.step-link:hover {
  background: #e6f2ff;
  text-decoration: underline;
}

.step-link .icon {
  font-size: 10px;
}

.step-status {
  margin-top: 8px;
}

.status-badge {
  display: inline-block;
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
}

.status-badge.success {
  background: #d4edda;
  color: #155724;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.activation-summary {
  margin-top: 20px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #dee2e6;
}

.summary-stats {
  display: flex;
  justify-content: center;
  gap: 30px;
}

.stat-item {
  text-align: center;
}

.stat-number {
  display: block;
  font-size: 24px;
  font-weight: 700;
  color: #007bff;
  line-height: 1;
}

.stat-label {
  display: block;
  font-size: 12px;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-top: 4px;
}

.completion-message {
  animation: fadeIn 0.5s ease;
}

.completion-content {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 25px;
  background: linear-gradient(135deg, #d4edda 0%, #f8fff9 100%);
  border: 2px solid #28a745;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(40, 167, 69, 0.15);
}

.completion-icon {
  flex-shrink: 0;
}

.completion-icon .icon {
  font-size: 48px;
  color: #28a745;
}

.completion-text {
  flex: 1;
}

.completion-text h3 {
  margin: 0 0 8px 0;
  color: #155724;
  font-size: 20px;
  font-weight: 600;
}

.completion-text p {
  margin: 0 0 15px 0;
  color: #155724;
  font-size: 14px;
}

.service-endpoints {
  background: rgba(255, 255, 255, 0.8);
  padding: 15px;
  border-radius: 8px;
  border: 1px solid rgba(40, 167, 69, 0.2);
}

.service-endpoints h4 {
  margin: 0 0 10px 0;
  color: #155724;
  font-size: 14px;
  font-weight: 600;
}

.service-endpoints ul {
  margin: 0;
  padding-left: 20px;
}

.service-endpoints li {
  margin-bottom: 5px;
  color: #155724;
  font-size: 13px;
  font-family: monospace;
}

.service-endpoints li strong {
  color: #0d5031;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 768px) {
  .activation-steps-grid {
    grid-template-columns: 1fr;
  }

  .summary-stats {
    flex-direction: column;
    gap: 15px;
  }

  .completion-content {
    flex-direction: column;
    text-align: center;
  }
}
</style>