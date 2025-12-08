<template>
  <div v-if="!isEnabled" class="blank-page">
    This service is not enabled. Please enable it from the service selection page.
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
                role="button"
                tabindex="0"
                :aria-label="`View details for ${server.name}`"
                @keydown.enter="handleViewServer(server)"
                @keydown.space.prevent="handleViewServer(server)"
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
                       <div class="tile-badges">
                         <span v-if="requiresAuth(server)" class="badge badge-warning">
                           Auth Required
                         </span>
                         <span class="badge badge-info">
                           {{ getAuthType(server) }}
                         </span>
                         <span v-if="server._meta?.category" class="badge badge-secondary">
                           {{ server._meta.category }}
                         </span>
                         <span v-if="server._meta?.source" class="badge badge-light">
                           {{ server._meta.source }}
                         </span>
                       </div>
                       <div v-if="server._meta?.tags && server._meta.tags.length" class="tile-tags">
                         <span v-for="tag in server._meta.tags.slice(0, 3)" :key="tag" class="tag">
                           {{ tag }}
                         </span>
                         <span v-if="server._meta.tags.length > 3" class="tag more-tags">
                           +{{ server._meta.tags.length - 3 }} more
                         </span>
                       </div>
                     </div>
                   </div>
                 </div>
                 <div v-if="server.packages && server.packages.length" class="tile-packages">
                   <h4 class="packages-title">Available Packages:</h4>
                   <div class="packages-list">
                     <div v-for="pkg in server.packages.slice(0, 2)" :key="pkg.identifier" class="package-item">
                       <div class="package-name">{{ pkg.identifier }}</div>
                       <div class="package-details">
                         <span class="package-type">{{ pkg.registryType }}</span>
                         <span class="package-transport">via {{ pkg.transport.type }}</span>
                       </div>
                       <div v-if="pkg.environmentVariables && pkg.environmentVariables.length" class="package-env">
                         Requires {{ pkg.environmentVariables.filter(v => v.required).length }} env vars
                       </div>
                     </div>
                     <div v-if="server.packages.length > 2" class="package-item more-packages">
                       +{{ server.packages.length - 2 }} more packages
                     </div>
                   </div>
                 </div>
                <div class="tile-actions">
                  <button
                    class="btn btn-sm btn-primary"
                    @click.stop="handleCreateAdapter(server)"
                    :aria-label="`Create adapter for ${server.name}`"
                  >
                    Create Adapter
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
      :show="showViewModal"
      :server="selectedServer"
      @close="showViewModal = false"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted } from 'vue'
import { useStore } from 'vuex'
import { useRegistry } from '../composables/useRegistry'
import type { MCPServer } from '../services/registry-api'

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
    ServerDetailsModal: () => import('../components/MCPGateway/ServerDetailsModal.vue')
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

    // Local state for UI
    const searchQuery = ref('')
    const categoryFilter = ref('')
    const showViewModal = ref(false)
    const selectedServer = ref<any>(null)

    // Load initial data
    onMounted(async () => {
      await browseServers()
    })

    // Computed properties
    const filteredServers = computed(() => {
      let filtered = servers.value

      // Apply search filter
      if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase()
        filtered = filtered.filter(server =>
          server.name.toLowerCase().includes(query) ||
          server.description.toLowerCase().includes(query)
        )
      }

      // Apply category filter
      if (categoryFilter.value) {
        filtered = filtered.filter(server => server._meta?.category === categoryFilter.value)
      }

      return filtered
    })

    const availableCategories = computed(() => getCategories())

    // Get appropriate icon for server
    const getServerIcon = (server: MCPServer): string => {
      // Use official server icon if available, otherwise use generic MCP icon
      return server.icon || genericMCPIcon
    }

    // Event handlers
    const handleSearch = async () => {
      await browseServers({ q: searchQuery.value, category: categoryFilter.value })
    }

    const handleReloadRegistry = async () => {
      await reloadRegistry()
    }

    const handleViewServer = async (server: MCPServer) => {
      selectedServer.value = await getServerDetails(server.id) as any
      showViewModal.value = true
    }

    const handleCreateAdapter = (server: MCPServer) => {
      // TODO: Implement adapter creation flow
      console.log('Create adapter for server:', server.name)
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
      showViewModal,
      selectedServer,
      filteredServers,
      availableCategories,
      isEnabled,

      // Methods
      handleSearch,
      handleReloadRegistry,
      handleViewServer,
      handleCreateAdapter,
      getServerIcon,

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
  color: #666;
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

.experimental-banner a {
  color: #d63384;
  text-decoration: underline;
}

.experimental-banner a:hover {
  color: #b02a5b;
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
  background: white;
  border-bottom: 1px solid #e1e5e9;
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
  color: #1a1a1a;
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
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 14px;
}

.filter-controls {
  display: flex;
  gap: 8px;
}

.filter-select {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 14px;
  background: white;
}

/* Main content */
.main-content {
  flex: 1;
  padding: 24px;
}

.results-summary {
  margin-bottom: 24px;
  font-size: 14px;
  color: #666;
}

.inline-loading {
  display: flex;
  align-items: center;
  gap: 8px;
}

.error-message {
  color: #dc3545;
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
  padding: 12px;
}

.results-text {
  color: #666;
}

/* Server tiles */
.tiles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.clickable-tile {
  background: white;
  border: 1px solid #e1e5e9;
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
}

.clickable-tile:hover {
  border-color: #007bff;
  box-shadow: 0 2px 8px rgba(0, 123, 255, 0.1);
}

.clickable-tile:focus {
  outline: 2px solid #007bff;
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
  background: #f8f9fa;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6c757d;
  font-size: 18px;
}

.tile-icon svg {
  width: 24px;
  height: 24px;
  fill: currentColor;
  stroke: currentColor;
}

.tile-info {
  flex: 1;
  min-width: 0;
}

.tile-meta h3 {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tile-description {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #666;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.4;
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
  background: #fff3cd;
  color: #856404;
}

.badge-info {
  background: #d1ecf1;
  color: #0c5460;
}

.badge-secondary {
  background: #e9ecef;
  color: #495057;
}

.badge-light {
  background: #f8f9fa;
  color: #6c757d;
}

.tile-tags {
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.tag {
  padding: 2px 6px;
  background: #e3f2fd;
  color: #1976d2;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
}

.more-tags {
  background: #f5f5f5;
  color: #666;
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
  color: #1a1a1a;
}

.packages-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.package-item {
  padding: 8px;
  background: #f8f9fa;
  border-radius: 4px;
  border: 1px solid #e9ecef;
}

.package-name {
  font-weight: 600;
  font-size: 13px;
  color: #1a1a1a;
  margin-bottom: 4px;
}

.package-details {
  display: flex;
  gap: 8px;
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}

.package-type {
  background: #e9ecef;
  padding: 1px 4px;
  border-radius: 2px;
}

.package-transport {
  font-style: italic;
}

.package-env {
  font-size: 11px;
  color: #856404;
  background: #fff3cd;
  padding: 2px 4px;
  border-radius: 2px;
  display: inline-block;
}

.more-packages {
  text-align: center;
  font-style: italic;
  color: #666;
  background: transparent;
  border: 1px dashed #ddd;
}

.tile-actions {
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid #f8f9fa;
}

.btn {
  padding: 6px 12px;
  border: 1px solid transparent;
  border-radius: 4px;
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
  background: #007bff;
  color: white;
  border-color: #007bff;
}

.btn-primary:hover {
  background: #0056b3;
  border-color: #0056b3;
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