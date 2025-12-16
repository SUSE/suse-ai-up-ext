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
                            <!-- Certified badge if tags include 'suse' -->
                            <span v-if="isCertifiedServer(server)" class="badge badge-success">CERTIFIED</span>

                            <!-- Other badges -->
                            <span v-if="requiresAuth(server)" class="badge badge-warning">
                              Auth Required
                            </span>
                            <span v-if="server._meta?.hosted" class="badge badge-success">
                              Hosted
                            </span>
                          </div>
                        <div v-if="server.tags && server.tags.length" class="tile-tags">
                          <span v-for="tag in server.tags.slice(0, 2)" :key="tag" class="tag">
                            {{ tag }}
                          </span>
                          <span v-if="server.tags.length > 2" class="tag more-tags">
                            +{{ server.tags.length - 2 }} more
                          </span>
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
                      @click.stop="handleCreateAdapter(server)"
                      :aria-label="`Create adapter for ${server.id}`"
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
        :show="showServerDetailsModal"
        :server-id="selectedServerId"
        @close="closeServerDetailsModal"
      />
   </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted } from 'vue'
import { useStore } from 'vuex'
import { useRegistry } from '../composables/useRegistry'
import type { MCPServer } from '../services/registry-api'
import ServerDetailsModal from '../components/MCPRegistry/ServerDetailsModal.vue'

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
    ServerDetailsModal
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
    const showServerDetailsModal = ref(false)
    const selectedServerId = ref<string>('')
    const expandedCards = ref<Set<string>>(new Set())

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
          (server.name?.toLowerCase() || '').includes(query) ||
          (server.description?.toLowerCase() || '').includes(query)
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
      // Use icon from about section if available
      if (server.about?.icon_url) {
        return `<img src="${server.about.icon_url}" alt="${server.about.title || server.name}" style="width: 100%; height: 100%; border-radius: 4px; object-fit: cover;" />`
      }

       // Check if this is a SUSE server
       const isSUSEServer = (server.name?.toLowerCase() || '').includes('suse') ||
                           (server.description?.toLowerCase() || '').includes('suse') ||
                           (typeof server._meta?.source === 'string' ? server._meta.source.toLowerCase() : '').includes('suse') ||
                           server._meta?.tags?.some(tag => (tag?.toLowerCase() || '').includes('suse'))

      if (isSUSEServer) {
        // Use SUSE icon for SUSE servers
        return `<img src="https://avatars.githubusercontent.com/u/1067733" alt="SUSE" style="width: 100%; height: 100%; border-radius: 4px; object-fit: cover;" />`
      }

      // Use official server icon if available
      if (server.icon) {
        // Check if icon is a URL (starts with http/https)
        if (server.icon.startsWith('http://') || server.icon.startsWith('https://')) {
          return `<img src="${server.icon}" alt="${server.name}" style="width: 100%; height: 100%; border-radius: 4px; object-fit: cover;" />`
        }
        // Otherwise assume it's SVG content
        return server.icon
      }

      // Use generic MCP icon as fallback
      return genericMCPIcon
    }

    // Event handlers
    const handleSearch = async () => {
      await browseServers({ q: searchQuery.value, category: categoryFilter.value })
    }

    const handleReloadRegistry = async () => {
      await reloadRegistry()
    }

    const handleViewServer = async (server: MCPServer) => {
      console.log('handleViewServer called with server:', server.name, 'id:', server.id)
      console.log('Full server object:', JSON.stringify(server, null, 2))
      selectedServerId.value = server.id
      showServerDetailsModal.value = true
      console.log('selectedServerId set to:', selectedServerId.value)
    }

    const handleCreateAdapter = (server: MCPServer) => {
      // TODO: Implement adapter creation flow
      console.log('Create adapter for server:', server.name)
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
      filteredServers,
      availableCategories,
      isEnabled,

       // Methods
       handleSearch,
       handleReloadRegistry,
       handleViewServer,
       handleCreateAdapter,
       closeServerDetailsModal,
       getServerIcon,
       toggleCardExpansion,
       isSuseServer,
       isCertifiedServer,
      isCardExpanded,

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
  background: var(--warning-bg, #fff3cd);
  color: var(--warning-text, #856404);
}

.badge-info {
  background: var(--info-bg, #d1ecf1);
  color: var(--info-text, #0c5460);
}

.badge-secondary {
  background: var(--secondary-bg, #e9ecef);
  color: var(--secondary-text, #495057);
}

.badge-light {
  background: var(--light-bg, #f8f9fa);
  color: var(--light-text, #6c757d);
}

.badge-success {
  background: var(--success-bg, #d4edda);
  color: var(--success-text, #155724);
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