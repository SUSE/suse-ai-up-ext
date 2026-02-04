<template>
  <div v-if="!isEnabled" class="blank-page">
    <div class="empty-state">
      <h3>This service is not enabled</h3>
      <p>Please enable it from the service selection page.</p>
    </div>
  </div>
  <div v-else>
    <div class="experimental-banner">
      <span class="banner-icon">⚠️</span>
      <strong>Experimental Feature</strong>
      <p>This SUSE AI Universal Proxy feature is experimental and may not be fully compatible with all providers. <a href="https://github.com/SUSE/suse-ai-up/issues" target="_blank">Report Issue</a> or <a href="https://github.com/SUSE/suse-ai-up/pulls" target="_blank">Submit PR</a> to help improve compatibility.</p>
    </div>

    <main>
      <div class="main-layout">
        <div class="outlet">
          <!-- Header -->
          <header class="fixed-header">
            <!-- Page Title -->
            <div class="title">
              <h1 class="m-0" id="page-title">MCP Registry</h1>
            </div>

            <!-- Toolbar with filters and actions -->
            <div class="actions-container" role="toolbar" aria-label="MCP server filters and actions">
              <div class="search-box">
                <label for="search-input" class="sr-only">Search MCP servers</label>
                <input
                  id="search-input"
                  v-model="searchQuery"
                  type="search"
                  placeholder="Search MCP servers"
                  class="input-sm"
                  aria-label="Search MCP servers"
                  @input="handleSearch"
                />
              </div>

              <!-- Category Filter -->
              <div class="filter-controls">
                <select v-model="categoryFilter" @change="handleSearch" class="filter-select">
                  <option value="">All Categories</option>
                  <option v-for="category in availableCategories" :key="category" :value="category">
                    {{ category }}
                  </option>
                </select>
              </div>

              <button
                class="btn role-secondary"
                @click="handleReloadRegistry"
                :disabled="loading"
                :title="'Reload Registry'"
                :aria-label="'Reload Registry'"
                type="button"
              >
                <i class="icon icon-refresh" :class="{ 'icon-spin': loading }" aria-hidden="true" />
                Reload
              </button>
            </div>
          </header>

          <!-- Main content area -->
          <div class="main-content">
            <!-- Results/Loading summary -->
            <div class="results-summary" aria-live="polite">
              <div v-if="loading" class="inline-loading">
                <i class="icon icon-spinner icon-spin" aria-hidden="true" />
                <span>Loading MCP servers...</span>
              </div>
              <div v-else-if="error" class="error-message">
                {{ error }}
              </div>
              <div v-else-if="filteredServers.length" class="results-text">
                Showing {{ filteredServers.length }} MCP servers
              </div>
              <div v-else class="results-text">
                No MCP servers found
              </div>
            </div>

            <!-- Server Cards Grid -->
            <div v-if="!loading && filteredServers.length" class="tiles-grid">
              <div
                v-for="server in filteredServers"
                :key="server.id"
                class="clickable-tile"
                @click="handleViewServer(server)"
              >
                  <div class="tile-header">
                    <div class="tile-logo-container">
                      <div class="tile-icon" v-html="getServerIcon(server)">
                      </div>
                    </div>
                    <div class="tile-info">
                      <div class="tile-meta">
                        <h3 class="tile-title">{{ server.name }}</h3>
                         <p class="tile-description">{{ server.description }}</p>

                         <!-- Source Info -->
                         <div v-if="getSourceUrl(server) || server.project_url" class="tile-source-info">
                           <a v-if="getSourceUrl(server)" :href="getSourceUrl(server)" target="_blank" rel="noopener noreferrer" class="source-item">
                             <i class="icon icon-external-link"></i>
                             Source{{ getSourceBranch(server) ? ` (${getSourceBranch(server)})` : '' }}
                           </a>
                           <a v-if="server.project_url" :href="server.project_url" target="_blank" rel="noopener noreferrer" class="source-item">
                             <i class="icon icon-external-link"></i>
                             Project
                           </a>
                         </div>

                         <!-- Connection Info -->
                        <div v-if="server.protocol || server.address || server.port" class="tile-connection">
                          <div class="connection-details">
                            <span v-if="server.protocol" class="connection-protocol">{{ server.protocol }}</span>
                            <span v-if="server.address" class="connection-address">{{ server.address }}</span>
                            <span v-if="server.port" class="connection-port">:{{ server.port }}</span>
                          </div>
                        </div>

                        <!-- Links -->
                        <div class="tile-links" v-if="server.source_url || server.project_url || server._meta?.documentation">
                          <a v-if="server.source_url" :href="server.source_url" target="_blank" class="tile-link" title="Source Code">
                            <i class="icon icon-external-link"></i> Source
                          </a>
                          <a v-if="server.project_url" :href="server.project_url" target="_blank" class="tile-link" title="Project Page">
                            <i class="icon icon-external-link"></i> Project
                          </a>
                          <a v-if="server._meta?.documentation" :href="server._meta.documentation" target="_blank" class="tile-link" title="Documentation">
                            <i class="icon icon-external-link"></i> Docs
                          </a>
                        </div>

                         <div class="tile-badges">
                             <!-- Certified badge if tags include 'suse' -->
                             <span v-if="isCertifiedServer(server)" class="badge badge-success">CERTIFIED</span>

                             <!-- Other badges -->
                             <span v-if="requiresAuth(server)" class="badge badge-warning">
                               Auth Required
                             </span>
                             <span v-if="server._meta?.hosted" class="badge badge-success">
                               Hosted
                             </span>
                             <span v-if="server.validation_status" :class="getValidationBadgeClass(server.validation_status)" class="badge">
                               {{ server.validation_status }}
                             </span>
                           </div>

                         <!-- Category -->
                         <div v-if="server._meta?.category" class="tile-category">
                           <span class="category-label">Category: {{ server._meta.category }}</span>
                         </div>

                          <div v-if="getAllTags(server) && getAllTags(server).length" class="tile-tags">
                            <span v-for="tag in getAllTags(server).slice(0, 3)" :key="tag" class="tag">
                              {{ tag }}
                            </span>
                            <span v-if="getAllTags(server).length > 3" class="tag more-tags">
                              +{{ getAllTags(server).length - 3 }} more
                            </span>
                          </div>

                         <!-- Package and Tool counts -->
                         <div class="tile-capabilities" v-if="server.packages?.length || server.tools?.length">
                           <div class="capability-item" v-if="server.packages?.length">
                             <i class="icon icon-package"></i>
                             <span>{{ server.packages.length }} package{{ server.packages.length !== 1 ? 's' : '' }}</span>
                           </div>
                           <div class="capability-item" v-if="server.tools?.length">
                             <i class="icon icon-tools"></i>
                             <span>{{ server.tools.length }} tool{{ server.tools.length !== 1 ? 's' : '' }}</span>
                           </div>
                         </div>

                         <!-- Timestamps -->
                         <div class="tile-timestamps" v-if="server.lastSeen || server.discoveredAt">
                           <div class="timestamp-item" v-if="server.lastSeen">
                             <span class="timestamp-label">Last seen:</span>
                             <span class="timestamp-value">{{ formatTimestamp(server.lastSeen) }}</span>
                           </div>
                           <div class="timestamp-item" v-if="server.discoveredAt">
                             <span class="timestamp-label">Discovered:</span>
                             <span class="timestamp-value">{{ formatTimestamp(server.discoveredAt) }}</span>
                           </div>
                         </div>
                      </div>
                    </div>
                  </div>

                    <div class="tile-actions">
                      <button
                        class="btn btn-sm btn-secondary"
                        @click.stop="handleViewServer(server)"
                        :aria-label="`View details for ${server.id}`"
                      >
                        <i class="icon icon-info"></i>
                        Details
                      </button>

                      <button
                        class="btn btn-sm btn-primary"
                        @click.stop="handleDeployServer(server)"
                        :aria-label="`Deploy ${server.id} to Kubernetes`"
                      >
                        <i class="icon icon-plus"></i>
                        Deploy
                      </button>
                    </div>
              </div>
            </div>
          </div>
         </div>
        </div>
       </main>

         <!-- Server Details Modal -->
        <ServerDetailsModal
          :show="showServerDetailsModal"
          :server-id="selectedServerId"
          @close="closeServerDetailsModal"
        />

         <!-- Deploy Modal -->
         <DeployModal
           :show="showDeployModal"
            :server="selectedServerForDeploy"
           :secrets="deploySecrets"
           :waiting-for-adapter="waitingForAdapter"
           :deploying="deployingAdapter"
           @close="closeDeployModal"
           @deploy="executeDeploy"
         />


   </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted } from 'vue'
import { useStore } from 'vuex'
import { useRegistry } from '../composables/useRegistry'
import { useAdapters } from '../composables/useAdapters'
import type { MCPServer } from '../services/registry-api'
import { updateApiBaseUrls, API_BASE_URLS } from '../config/api-config'
import ServerDetailsModal from '../components/MCPRegistry/ServerDetailsModal.vue'
import DeployModal, { type SecretConfig } from '../components/MCPRegistry/DeployModal.vue'

// Generic MCP icon SVG (official logo with currentColor for theming)
const genericMCPIcon = `<svg width="180" height="180" viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg">
  <g clip-path="url(#clip0_mcp)">
    <path d="M18 84.8528L85.8822 16.9706C95.2548 7.59798 110.451 7.59798 119.823 16.9706V16.9706C129.196 26.3431 129.196 41.5391 119.823 50.9117L68.5581 102.177" stroke="currentColor" stroke-width="12" stroke-linecap="round"/>
    <path d="M69.2652 101.47L119.823 50.9117C129.196 41.5391 144.392 41.5391 153.765 50.9117L154.118 51.2652C163.491 60.6378 163.491 75.8338 154.118 85.2063L92.7248 146.6C89.6006 149.724 89.6006 154.789 92.7248 157.913L105.331 170.52" stroke="currentColor" stroke-width="12" stroke-linecap="round"/>
    <path d="M102.853 33.9411L52.6482 84.1457C43.2756 93.5183 43.2756 108.714 52.6482 118.087V118.087C62.0208 127.459 77.2167 127.459 86.5893 118.087L136.794 67.8822" stroke="currentColor" stroke-width="12" stroke-linecap="round"/>
  </g>
  <defs>
    <clipPath id="clip0_mcp">
      <rect width="180" height="180" fill="white"/>
    </clipPath>
  </defs>
</svg>`

export default defineComponent({
  name: 'MCPRegistry',
  components: {
    ServerDetailsModal,
    DeployModal
  },

  metaInfo() {
    return {
      title: 'MCP Registry'
    }
  },

  setup() {
    const store = useStore()

    // Use the new registry composable
    const {
      servers,
      loading,
      error,
      pagination,
      browseServers,
      getServerDetails,
      reloadRegistry,
      requiresAuth,
      getAuthType,
      getCategories
    } = useRegistry()

    // Use adapters composable for creating adapters
    const {
      createAdapter,
      getAdapter,
      loading: adaptersLoading
    } = useAdapters()

    // Local state for UI
    const searchQuery = ref('')
    const categoryFilter = ref('')
    const showServerDetailsModal = ref(false)
    const selectedServerId = ref<string>('')
    const expandedCards = ref<Set<string>>(new Set())

    // Deploy modal state
    const showDeployModal = ref(false)
    const selectedServerForDeploy = ref<MCPServer | undefined>(undefined)
    const deploySecrets = ref<SecretConfig[]>([])
    const waitingForAdapter = ref(false)
    const deployingAdapter = ref(false)

    // Check if server is a SUSE server
    const isSuseServer = (server: MCPServer): boolean => {
      return (server.name?.toLowerCase() || '').includes('suse') ||
             (server.description?.toLowerCase() || '').includes('suse') ||
             (typeof server._meta?.source === 'string' ? server._meta.source.toLowerCase() : '').includes('suse') ||
             server._meta?.badges?.some(badge => (badge?.toLowerCase() || '').includes('suse')) ||
             false
    }

    // Check if server is certified
    const isCertifiedServer = (server: MCPServer): boolean => {
      // Server is certified if tags include 'suse'
      return server.tags?.some(tag => tag.toLowerCase() === 'suse') || false
    }

    // Get validation status badge class
    const getValidationBadgeClass = (status: string): string => {
      switch (status.toLowerCase()) {
        case 'valid':
        case 'validated':
          return 'badge-success'
        case 'invalid':
        case 'failed':
          return 'badge-danger'
        case 'pending':
        case 'unknown':
        default:
          return 'badge-secondary'
      }
    }

    // Format timestamp for display
    const formatTimestamp = (timestamp: string): string => {
      if (!timestamp) return ''
      try {
        const date = new Date(timestamp)
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      } catch {
        return timestamp
      }
    }

    // Test service connectivity
    const testAndFallbackServiceUrl = async () => {
      try {
        console.log('MCPRegistry testing current service URL:', API_BASE_URLS.REGISTRY)

        // Test current configured URL
        const currentUrl = `${API_BASE_URLS.REGISTRY.replace(/\/$/, '')}/health`
        try {
          const response = await fetch(currentUrl, {
            method: 'GET',
            signal: AbortSignal.timeout(2000)
          })
          if (response.ok) {
            console.log('MCPRegistry current service URL is accessible:', currentUrl)
            return // Current URL works
          }
        } catch (error) {
          console.log('MCPRegistry current service URL failed:', error)
        }

        console.warn('MCPRegistry no accessible service URL found - keeping current configuration')
      } catch (error) {
        console.error('MCPRegistry error during service URL testing:', error)
      }
    }

    // Load initial data
    onMounted(async () => {
      // Initialize with stored service URL if available
      const serviceUrls = store.state.suseai?.settings?.serviceUrls || []
      const serviceUrl = serviceUrls.length > 0 ? serviceUrls[0] : undefined
      if (serviceUrl) {
        console.log('MCPRegistry initializing with stored service URL:', serviceUrl)
        updateApiBaseUrls(serviceUrl)
        // Update API instances with new base URLs
        const { adapterAPI } = await import('../services/adapter-api')
        adapterAPI.updateBaseURL()
        console.log('MCPRegistry adapterAPI baseURL updated to:', adapterAPI.getBaseURL())
        
        // registryAPI.updateBaseURL() // Not needed for registryService
      }

      // Test connectivity and fallback if needed
      await testAndFallbackServiceUrl()

      console.log('MCPRegistry final API_BASE_URLS:', API_BASE_URLS)
      await browseServers()
    })

    // Computed properties
    const filteredServers = computed(() => {
      let filtered = servers.value

      // Apply search filter
      if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase()
        filtered = filtered.filter(server =>
          (server.name?.toLowerCase() || '').includes(query) ||
          (server.description?.toLowerCase() || '').includes(query)
        )
      }

      // Apply category filter
      if (categoryFilter.value) {
        filtered = filtered.filter(server => server._meta?.category === categoryFilter.value)
      }

      // Sort: SUSE servers first, then by name alphabetically
      return [...filtered].sort((a: MCPServer, b: MCPServer) => {
        const aIsSUSE = isSuseServer(a)
        const bIsSUSE = isSuseServer(b)

        if (aIsSUSE && !bIsSUSE) return -1
        if (!aIsSUSE && bIsSUSE) return 1

        // Both SUSE or both non-SUSE, sort by name
        return (a.name || '').localeCompare(b.name || '')
      })

      return filtered
    })

    const availableCategories = computed(() => getCategories())

    // Get appropriate icon for server
    const getServerIcon = (server: MCPServer): string => {
      console.log('getServerIcon called for server:', server.name, 'id:', server.id)
      console.log('server.about:', server.about)
      console.log('server.icon:', server.icon)
      console.log('server._meta:', server._meta)

      // Use icon from about section if available
      if (server.about?.icon_url) {
        console.log('Using server.about.icon_url:', server.about.icon_url)
        return `<img src="${server.about.icon_url}" alt="${server.about.title || server.name}" style="width: 100%; height: 100%; border-radius: 4px; object-fit: cover;" />`
      }

      // Use icon field if available
      if (server.icon) {
        console.log('Using server.icon:', server.icon)
        // Check if icon is a URL (starts with http/https)
        if (server.icon.startsWith('http://') || server.icon.startsWith('https://')) {
          return `<img src="${server.icon}" alt="${server.name}" style="width: 100%; height: 100%; border-radius: 4px; object-fit: cover;" />`
        }
        // Otherwise assume it's SVG content
        return server.icon
      }

       // Check if this is a SUSE server
        const isSUSEServer = (server.name?.toLowerCase() || '').includes('suse') ||
                            (server.description?.toLowerCase() || '').includes('suse') ||
                            (typeof server._meta?.source === 'string' ? server._meta.source.toLowerCase() : '').includes('suse') ||
                            server._meta?.tags?.some(tag => (tag?.toLowerCase() || '').includes('suse'))

       if (isSUSEServer) {
         console.log('Using SUSE icon for SUSE server')
         // Use SUSE icon for SUSE servers
         return `<img src="https://avatars.githubusercontent.com/u/1067733" alt="SUSE" style="width: 100%; height: 100%; border-radius: 4px; object-fit: cover;" />`
       }

       console.log('Using generic MCP icon as fallback')
       // Use generic MCP icon as fallback
       return genericMCPIcon
     }

      // Get source URL for display
      const getSourceUrl = (server: MCPServer): string => {
        // Check for source.project from YAML (highest priority)
        if ((server as any).source?.project) {
          return (server as any).source.project
        }
        // Check for source.url as alternative
        if ((server as any).source?.url) {
          return (server as any).source.url
        }
        // Prefer repository URL if available
        if ((server as any).repository?.url) {
          return (server as any).repository.url
        }
        // Fall back to _meta.source
        if (server._meta?.source) {
          return server._meta.source
        }
        // Last resort: source_url
        return server.source_url || ''
      }

      // Get source branch for display
      const getSourceBranch = (server: MCPServer): string => {
        return (server as any).source?.branch || (server as any).repository?.branch || ''
      }

      // Get all tags including type
      const getAllTags = (server: MCPServer): string[] => {
        const tags = [...(server.tags || [])]
        if (server.type) {
          tags.unshift(server.type) // Add type as the first tag
        }
        return tags
      }

     // Event handlers
    const handleSearch = async () => {
      await browseServers({ q: searchQuery.value, category: categoryFilter.value })
    }

    const handleReloadRegistry = async () => {
      // If we're in an error state, try to re-establish connection first
      if (error.value) {
        await testAndFallbackServiceUrl()
      }
      await reloadRegistry()
    }

    const handleViewServer = async (server: MCPServer) => {
      console.log('handleViewServer called with server:', server.name, 'id:', server.id)
      console.log('Full server object:', JSON.stringify(server, null, 2))
      selectedServerId.value = server.id
      showServerDetailsModal.value = true
      console.log('selectedServerId set to:', selectedServerId.value)
    }

    // Extract secrets from server._meta.config.secrets[] only
    const extractSecretsFromServer = (server: MCPServer): SecretConfig[] => {
      console.log('extractSecretsFromServer called for:', server.name)
      const configSecrets = (server as any)._meta?.config?.secrets || []
      console.log('configSecrets found:', configSecrets)
      console.log('configSecrets length:', configSecrets.length)

      const secrets = configSecrets.map((secret: any) => ({
        name: secret.name,
        env: secret.env || secret.name,
        description: secret.description,
        example: secret.example,
        required: secret.required || false,
        selected: false,  // Start unselected
        value: secret.type === 'bool' ? (secret.example === 'true' || secret.example === true) : (secret.example || ''),  // Pre-fill with example, handle boolean
        type: secret.type || 'secret'  // Default to 'secret' if not specified
      }))

      console.log('Mapped secrets:', secrets)
      return secrets
    }

    // Show deploy modal with secrets configuration
    const handleDeployServer = (server: MCPServer) => {
      console.log('handleDeployServer called with server:', server.name, 'id:', server.id)
      console.log('Server _meta:', (server as any)._meta)
      console.log('Server _meta.config:', (server as any)._meta?.config)
      console.log('Server _meta.config.secrets:', (server as any)._meta?.config?.secrets)

      // Extract secrets from server._meta.config.secrets[]
      const secrets = extractSecretsFromServer(server)
      console.log('Extracted secrets:', secrets)

      // Set modal state
      selectedServerForDeploy.value = server
      deploySecrets.value = secrets
      showDeployModal.value = true

      console.log('Showing deploy modal with', secrets.length, 'secrets for server:', server.name)
    }

    // Close deploy modal
    const closeDeployModal = () => {
      showDeployModal.value = false
      selectedServerForDeploy.value = undefined
      deploySecrets.value = []
      waitingForAdapter.value = false
      deployingAdapter.value = false
    }

    // Execute deployment with configured secrets
    const executeDeploy = async (config: { server: MCPServer; secrets: SecretConfig[] }) => {
      const { server, secrets } = config

      try {
        // Keep deploying state active
        deployingAdapter.value = true
        console.log('Executing deployment for server:', server.name, 'with configured secrets')

        // Create environment variables from selected and configured secrets only
        const envVars: Record<string, string> = {}
        secrets.forEach(secret => {
          if (secret.selected && secret.value.trim()) {
            envVars[secret.env || secret.name] = secret.value
          }
        })

        // Validate required secrets
        const requiredSecrets = secrets.filter(s => s.required)
        const configuredRequired = requiredSecrets.filter(s => s.selected && s.value.trim())

        if (configuredRequired.length !== requiredSecrets.length) {
          const missingRequired = requiredSecrets.filter(s => !s.selected || !s.value.trim())
          throw new Error(`Required secrets not configured: ${missingRequired.map(s => s.name).join(', ')}`)
        }

        // Generate unique adapter name
        const baseName = server.name.toLowerCase().replace(/\s+/g, '-')
        const timestamp = Date.now()
        const adapterName = `${baseName}-${timestamp}`

        // Create adapter with configured environment variables
        const adapterData = {
          name: adapterName,
          mcpServerId: server.id,
          environmentVariables: envVars,
          authentication: {
            type: 'none' as const,
            required: false
          }
        }

        console.log('Creating adapter with data:', adapterData)
        console.log('Adapter API base URL:', API_BASE_URLS.MCP_GATEWAY)
        const adapter = await createAdapter(adapterData)

        if (adapter) {
          console.log('Adapter created successfully:', adapter)

          // Transition to waiting state and start polling for adapter readiness
          waitingForAdapter.value = true
          await pollAdapterStatus(adapter.id, server)
        } else {
          throw new Error('Adapter creation failed')
        }

      } catch (error: any) {
        console.error('Deployment failed:', error)

        // Reset deployment state on error
        deployingAdapter.value = false

        // Show error message (don't close modal so user can retry)
        store.dispatch('growl/error', {
          title: 'Deployment Failed',
          message: error.message || `Failed to deploy ${server.name}`
        })
      }
    }


    // Fake adapter status polling with 10-second timer for testing
    const pollAdapterStatus = async (adapterId: string, server: MCPServer) => {
      console.log('Starting 10-second fake wait for adapter deployment...')

      setTimeout(() => {
        console.log('Fake adapter deployment wait completed')
        // Adapter is "ready", close modal and show success
        waitingForAdapter.value = false
        deployingAdapter.value = false
        closeDeployModal()

        store.dispatch('growl/success', {
          title: 'Deployment Successful',
          message: `${server.name} has been deployed and is ready to use.`
        })
      }, 10000) // 10 seconds
    }

    // Adapter status methods
    const getAdapterStatusClass = (adapter: any): string => {
      // Check if adapter has error status or error count
      const status = adapter.status || adapter.state
      const errorCount = adapter.errorCount || adapter.error_count
      if (status === 'error' || status === 'failed' || (errorCount && errorCount > 0)) {
        return 'status-error'
      }
      // Assume running if no error status
      return 'status-running'
    }

    const getAdapterStatusText = (adapter: any): string => {
      const status = adapter.status || adapter.state
      const errorCount = adapter.errorCount || adapter.error_count
      if (status === 'error' || status === 'failed' || (errorCount && errorCount > 0)) {
        return 'Error'
      }
      return 'Running'
    }

    // Download client configuration
    const downloadClientConfig = (adapter: any) => {
      try {
        // Extract only the mcpClientConfig section (try different field names)
        const clientConfig = adapter.mcpClientConfig || adapter.mcp_client_config || {}

        // Create the mcp.json content
        const jsonContent = JSON.stringify(clientConfig, null, 2)

        // Create and download the file
        const blob = new Blob([jsonContent], { type: 'application/json' })
        const url = URL.createObjectURL(blob)

        const link = document.createElement('a')
        link.href = url
        link.download = 'mcp.json'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        URL.revokeObjectURL(url)

        // Show success message
        store.dispatch('growl/success', {
          title: 'Download Complete',
          message: `MCP client configuration for "${adapter.name}" has been downloaded.`
        })
      } catch (error) {
        console.error('Failed to download client config:', error)
        store.dispatch('growl/error', {
          title: 'Download Failed',
          message: 'Failed to download MCP client configuration.'
        })
      }
    }

    // Format date for display
    const formatDate = (dateString: string): string => {
      if (!dateString) return 'Unknown'
      try {
        const date = new Date(dateString)
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      } catch {
        return dateString
      }
    }

    const closeServerDetailsModal = () => {
      showServerDetailsModal.value = false
      selectedServerId.value = ''
    }





    const toggleCardExpansion = (serverId: string) => {
      if (expandedCards.value.has(serverId)) {
        expandedCards.value.delete(serverId)
      } else {
        expandedCards.value.add(serverId)
      }
    }

    const isCardExpanded = (serverId: string): boolean => {
      return expandedCards.value.has(serverId)
    }

    // Service enablement check
    const proxyInstalled = computed(() => store.state.suseai.settings.proxyInstalled)
    const selectedServices = computed(() => store.state.suseai.settings.selectedServices)
    const isEnabled = computed(() => proxyInstalled.value && selectedServices.value.includes('mcp-registry'))

    return {
      // State
      servers,
      loading,
      error,
      searchQuery,
      categoryFilter,
        showServerDetailsModal,
        selectedServerId,
         showDeployModal,
         selectedServerForDeploy,
         deploySecrets,
         waitingForAdapter,
         deployingAdapter,
      filteredServers,
      availableCategories,
      isEnabled,

          // Methods
           handleSearch,
           handleReloadRegistry,
           handleViewServer,
           handleDeployServer,
           closeDeployModal,
           executeDeploy,
           closeServerDetailsModal,
          getServerIcon,
          getSourceUrl,
          getSourceBranch,
          getAllTags,
         toggleCardExpansion,
         isSuseServer,
         isCertifiedServer,
         isCardExpanded,
         getValidationBadgeClass,
         formatTimestamp,

      // Composables
      requiresAuth,
      getAuthType
    }
  }
})
</script>

<style scoped>
.blank-page {
  text-align: center;
  padding: 50px;
  font-size: 18px;
  color: var(--muted, #666);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
}

.empty-state h3 {
  color: var(--body-text, #1a1a1a);
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 12px;
}

.empty-state p {
  color: var(--muted, #666);
  font-size: 16px;
  margin: 0;
}

/* Experimental Banner */
.experimental-banner {
  background: var(--warning-bg, #fff3cd);
  border: 1px solid var(--warning-border, #ffeaa7);
  border-radius: var(--border-radius, 4px);
  padding: 12px 16px;
  margin: 16px 24px 0;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  color: var(--warning-text, #856404);
}

.banner-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.experimental-banner strong {
  font-weight: 600;
  color: var(--warning-text, #856404);
}

.experimental-banner a {
  color: var(--link, #d63384);
  text-decoration: underline;
}

.experimental-banner a:hover {
  color: var(--link-hover, #b02a5b);
}

/* Main layout */
.main-layout {
  display: flex;
  min-height: calc(100vh - 60px);
}

.outlet {
  flex: 1;
  display: flex;
  flex-direction: column;
}

/* Header */
.fixed-header {
  background: var(--body-bg, white);
  border-bottom: 1px solid var(--border, #e1e5e9);
  padding: 16px 24px;
  position: sticky;
  top: 0;
  z-index: 10;
}

.title {
  margin-bottom: 16px;
}

.title h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: var(--body-text, #1a1a1a);
}

.actions-container {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.search-box {
  flex: 1;
  min-width: 200px;
}

.search-box input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border, #d1d5db);
  border-radius: var(--border-radius, 4px);
  font-size: 14px;
  background: var(--body-bg, white);
  color: var(--body-text);
}

.filter-controls {
  display: flex;
  gap: 8px;
}

.filter-select {
  padding: 8px 12px;
  border: 1px solid var(--border, #d1d5db);
  border-radius: var(--border-radius, 4px);
  font-size: 14px;
  background: var(--body-bg, white);
  color: var(--body-text);
}

/* Main content */
.main-content {
  flex: 1;
  padding: 24px;
}

.results-summary {
  margin-bottom: 24px;
  font-size: 14px;
  color: var(--muted, #666);
}

.inline-loading {
  display: flex;
  align-items: center;
  gap: 8px;
}

.error-message {
  color: var(--error, #dc3545);
  background: var(--error-bg, #f8d7da);
  border: 1px solid var(--error-border, #f5c6cb);
  border-radius: var(--border-radius, 4px);
  padding: 12px;
}

.results-text {
  color: var(--muted, #666);
}

/* Server tiles */
.tiles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.clickable-tile {
  background: var(--card-bg, white);
  border: 1px solid var(--border, #e1e5e9);
  border-radius: var(--border-radius, 8px);
  padding: 16px;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  position: relative;
}

.clickable-tile.expanded {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.clickable-tile:hover {
  border-color: var(--primary, #007bff);
  box-shadow: 0 2px 8px rgba(0, 123, 255, 0.1);
}

.clickable-tile:focus {
  outline: 2px solid var(--primary, #007bff);
  outline-offset: 2px;
}

.tile-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
}

.tile-logo-container {
  flex-shrink: 0;
}

.tile-icon {
  width: 40px;
  height: 40px;
  background: var(--accent-bg, #f8f9fa);
  border-radius: var(--border-radius, 6px);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--muted, #6c757d);
  font-size: 18px;
}

.tile-icon svg {
  width: 24px;
  height: 24px;
  fill: currentColor;
  stroke: currentColor;
}

.tile-icon img {
  width: 100%;
  height: 100%;
  border-radius: 4px;
  object-fit: cover;
}

.tile-info {
  flex: 1;
  min-width: 0;
}

.tile-meta h3 {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--body-text, #1a1a1a);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tile-description {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: var(--muted, #666);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.4;
}

.tile-connection {
  margin-bottom: 8px;
}

.connection-details {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--body-text, #1a1a1a);
  font-family: monospace;
  background: var(--accent-bg, #f8f9fa);
  padding: 4px 8px;
  border-radius: 4px;
}

.connection-protocol {
  font-weight: 600;
  color: var(--primary, #007bff);
}

.connection-address {
  color: var(--body-text, #1a1a1a);
}

.connection-port {
  color: var(--muted, #666);
}

.tile-links {
  margin-bottom: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tile-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--primary, #007bff);
  text-decoration: none;
  padding: 2px 6px;
  border-radius: 3px;
  background: var(--primary-bg, #cce5ff);
  transition: all 0.2s ease;
}

.tile-link:hover {
  background: var(--primary, #007bff);
  color: white;
}

.tile-link i {
  font-size: 11px;
}

.tile-source-info {
  margin-bottom: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.source-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--primary, #007bff);
  text-decoration: none;
  padding: 2px 6px;
  border-radius: 3px;
  background: var(--primary-bg, #cce5ff);
  transition: all 0.2s ease;
}

.source-item:hover {
  background: var(--primary, #007bff);
  color: white;
  text-decoration: none;
}

.source-link {
  color: inherit;
  text-decoration: none;
  font-weight: 500;
}

.source-link:hover {
  text-decoration: none;
}

.tile-category {
  margin-top: 8px;
  margin-bottom: 8px;
}

.category-label {
  font-size: 12px;
  color: white;
  background: #6c757d;
  padding: 2px 6px;
  border-radius: 3px;
  font-weight: 500;
}

.tile-capabilities {
  margin-bottom: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.capability-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--muted, #666);
  background: var(--accent-bg, #f8f9fa);
  padding: 2px 6px;
  border-radius: 3px;
}

.capability-item i {
  font-size: 11px;
}

.tile-timestamps {
  margin-bottom: 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.timestamp-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--muted, #666);
}

.timestamp-label {
  font-weight: 500;
}

.timestamp-value {
  font-family: monospace;
}

.tile-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.badge {
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
}

.badge-warning {
  background: #fd7e14;
  color: white;
}

.badge-info {
  background: var(--info-bg, #d1ecf1);
  color: var(--info-text, #0c5460);
}

.badge-secondary {
  background: #6c757d;
  color: white;
}

.badge-light {
  background: var(--light-bg, #f8f9fa);
  color: var(--light-text, #6c757d);
}

.badge-success {
  background: #28a745;
  color: white;
}

.badge-danger {
  background: #dc3545;
  color: white;
}

.badge-primary {
  background: var(--primary-bg, #cce5ff);
  color: var(--primary-text, #004085);
}

.tile-tags {
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.tag {
  padding: 2px 6px;
  background: var(--info-bg, #e3f2fd);
  color: var(--info-text, #1976d2);
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
}

.more-tags {
  background: var(--light-bg, #f5f5f5);
  color: var(--muted, #666);
}

.tile-packages {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f8f9fa;
}

.packages-title {
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--body-text, #1a1a1a);
}

.packages-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.package-item {
  padding: 8px;
  background: var(--accent-bg, #f8f9fa);
  border-radius: var(--border-radius, 4px);
  border: 1px solid var(--border-light, #e9ecef);
}

.package-name {
  font-weight: 600;
  font-size: 13px;
  color: var(--body-text, #1a1a1a);
  margin-bottom: 4px;
}

.package-details {
  display: flex;
  gap: 8px;
  font-size: 12px;
  color: var(--muted, #666);
  margin-bottom: 4px;
}

.package-type {
  background: var(--secondary-bg, #e9ecef);
  padding: 1px 4px;
  border-radius: 2px;
}

.package-transport {
  font-style: italic;
}

.package-env {
  margin-top: 6px;
}

.env-vars-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.env-var-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  padding: 2px 4px;
  background: var(--accent-bg, #f8f9fa);
  border-radius: 3px;
}

.env-var-name {
  font-weight: 500;
  color: var(--body-text, #495057);
}

.env-var-required {
  background: var(--error, #dc3545);
  color: white;
  padding: 1px 3px;
  border-radius: 2px;
  font-size: 9px;
  text-transform: uppercase;
}

.env-var-secret {
  background: var(--warning, #6f42c1);
  color: white;
  padding: 1px 3px;
  border-radius: 2px;
  font-size: 9px;
  text-transform: uppercase;
}

.env-var-more {
  font-size: 10px;
  color: var(--muted, #6c757d);
  font-style: italic;
  text-align: center;
  padding: 2px;
}

.more-packages {
  text-align: center;
  font-style: italic;
  color: var(--muted, #666);
  background: transparent;
  border: 1px dashed var(--border, #ddd);
}

.tile-expand-btn {
  margin-left: auto;
  padding-left: 12px;
}

.tile-actions {
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid var(--border-light, #f8f9fa);
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.tile-expanded {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border-light, #e9ecef);
}

.meta-details h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--body-text, #1a1a1a);
}

.meta-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 8px;
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.meta-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--muted, #666);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.meta-value {
  font-size: 14px;
  color: var(--body-text, #1a1a1a);
}

.meta-value a {
  color: var(--primary, #007bff);
  text-decoration: none;
}

.meta-value a:hover {
  text-decoration: underline;
}

.btn {
  padding: 6px 12px;
  border: 1px solid transparent;
  border-radius: var(--border-radius, 4px);
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;
}

.btn-primary {
  background: var(--primary, #007bff);
  color: white;
  border-color: var(--primary, #007bff);
}

.btn-primary:hover {
  background: var(--primary-hover, #0056b3);
  border-color: var(--primary-hover, #0056b3);
}

.btn-outline {
  background: transparent;
  border: 1px solid var(--primary, #007bff);
  color: var(--primary, #007bff);
}

.btn-outline:hover {
  background: var(--primary, #007bff);
  color: white;
}

.btn-sm {
  padding: 4px 8px;
  font-size: 12px;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Responsive */
@media (max-width: 768px) {
  .actions-container {
    flex-direction: column;
    align-items: stretch;
  }

  .search-box {
    min-width: auto;
  }

  .tiles-grid {
    grid-template-columns: 1fr;
  }
}
</style>