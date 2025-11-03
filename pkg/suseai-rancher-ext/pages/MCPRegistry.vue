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
                    :aria-describedby="searchQuery ? 'search-results-count' : undefined"
                  />
                </div>

                <button
                  class="btn role-primary"
                  @click="showAddModal = true"
                  :title="'Add MCP Server'"
                  :aria-label="'Add MCP Server'"
                  type="button"
                >
                  <i class="icon icon-plus" aria-hidden="true" />
                  Add MCP
                </button>

                <button
                  class="btn role-secondary"
                  @click="showImportModal = true"
                  :title="'Import MCP Server'"
                  :aria-label="'Import MCP Server'"
                  type="button"
                >
                  <i class="icon icon-upload" aria-hidden="true" />
                  Import
                </button>
              </div>
            </header>

            <!-- Main content area -->
             <div class="main-content">
               <!-- Results/Loading summary -->
               <div class="results-summary" aria-live="polite">
                 <div v-if="isLoading" class="inline-loading">
                   <i class="icon icon-spinner icon-spin" aria-hidden="true" />
                   <span>Loading MCP servers...</span>
                 </div>
                 <div v-else-if="filteredServers.length" class="results-text">
                   Showing {{ filteredServers.length }} of {{ filteredServers.length }} MCP servers
                 </div>
                 <div v-else-if="!isLoading" class="results-text">
                   No MCP servers found
                 </div>
               </div>

               <!-- Server Cards Grid -->
               <div v-if="!isLoading && filteredServers.length" class="tiles-grid">
                 <div
                   v-for="server in filteredServers"
                   :key="server.id"
                   class="clickable-tile"
                   @click="onTileClick(server)"
                   role="button"
                   tabindex="0"
                   :aria-label="`View details for ${server.name}`"
                   @keydown.enter="onTileClick(server)"
                   @keydown.space.prevent="onTileClick(server)"
                 >
                   <div class="tile-header">
                     <div class="tile-logo-container">
                       <img
                         v-if="getServerLogo(server.name, server.iconClass)"
                         :src="getServerLogo(server.name, server.iconClass)"
                         :alt="`${server.name} logo`"
                         class="tile-logo"
                         @error="handleImageError"
                       />
                       <div v-else class="tile-icon">
                         <i :class="server.iconClass" aria-hidden="true" />
                       </div>
                     </div>
                     <div class="tile-info">
                       <div class="tile-meta">
                         <span :class="['badge-state badge', getBadgeClass(server.status)]">{{ formatStatus(server.status) }}</span>
                         <span class="tile-author">{{ server.author }}</span>
                       </div>
                       <h3 class="tile-title">{{ server.name }}</h3>
                       <p class="tile-description">{{ server.description }}</p>
                     </div>
                   </div>
                   <div class="tile-footer">
                     <div class="tile-actions">
                       <button
                         v-if="server.status === 'not-installed'"
                         class="btn btn-sm btn-primary"
                         @click.stop="handleInstallServer(server.id)"
                         :aria-label="`Install ${server.name}`"
                       >
                         Install
                       </button>
                       <button
                         v-else-if="server.status === 'installed'"
                         class="btn btn-sm btn-secondary"
                         @click.stop="handleRemoveServer(server.id)"
                         :aria-label="`Remove ${server.name}`"
                       >
                         Remove
                       </button>
                       <button
                         v-else-if="server.status === 'installing'"
                         class="btn btn-sm btn-secondary"
                         disabled
                         aria-label="Installing"
                       >
                         <i class="icon icon-spinner icon-spin" aria-hidden="true" />
                         Installing...
                       </button>
                     </div>
                   </div>
                 </div>
               </div>
             </div>
          </div>
        </div>
      </main>
    </div>
  </template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, getCurrentInstance } from 'vue';
import { useStore } from 'vuex';

const mockServerData = [
  {
    "$schema": "https://static.modelcontextprotocol.io/schemas/2025-10-17/server.schema.json",
    "name": "io.suse.trento/mcp-server",
    "title": "SUSE Trento MCP Server",
    "description": "The Trento MCP Server project introduces a Model Context Protocol (MCP) server implementation, enabling Trento to be used and configured as a tool for AI. Instead of interacting with the Trento server solely through the web UI, you can now interact with it directly from an AI, a chat interface, or an agent.",
    "version": "1.0.0",
    "packages": [
      {
        "registryType": "npm",
        "identifier": "@suse/trento-mcp-server",
        "version": "1.0.0",
        "transport": {
          "type": "stdio"
        }
      }
    ]
  },
  {
    "$schema": "https://static.modelcontextprotocol.io/schemas/2025-10-17/server.schema.json",
    "name": "io.suse.uyuni/mcp-server",
    "title": "SUSE Multi-Linux Manager MCP Server",
    "description": "Any Linux, Anywhere, Any Scale. Simplify management of your complex IT infrastructure. SUSE Multi-Linux Manager provides automated patching, content lifecycle management, and realtime monitoring to keep your mixed Linux environment secure and compliant at any scale – from 10 to over 100,000 clients – from a single console.",
    "version": "1.0.0",
    "packages": [
      {
        "registryType": "npm",
        "identifier": "@suse/uyuni-mcp-server",
        "version": "1.0.0",
        "transport": {
          "type": "stdio"
        }
      }
    ]
  },
      {
      "$schema": "https://static.modelcontextprotocol.io/schemas/2025-10-17/server.schema.json",
      "name": "io.suse.rancher/mcp-server",
      "title": "Rancher MCP server",
      "description": "Secure deploy, run‌ and manage modern workloads anywhere in your Hybrid IT platform. Delivering centralized authentication, access control, observability, and built-in security.",
      "version": "1.0.0",
      "packages": [
        {
          "registryType": "npm",
          "identifier": "@suse/rancher-mcp-server",
          "version": "1.0.0",
          "transport": {
            "type": "sse"
          }
        }
      ]
    },
  {
    "$schema": "https://static.modelcontextprotocol.io/schemas/2025-10-17/server.schema.json",
    "name": "weather-mcp",
    "title": "Weather",
    "description": "Provides current weather information and forecasts",
    "version": "1.0.0",
    "packages": [
      {
        "registryType": "npm",
        "identifier": "weather-mcp",
        "version": "1.0.0",
        "transport": {
          "type": "stdio"
        }
      }
    ]
  },
  {
    "$schema": "https://static.modelcontextprotocol.io/schemas/2025-10-17/server.schema.json",
    "name": "everything-mcp",
    "title": "Everything",
    "description": "A comprehensive tool that can answer questions about anything",
    "version": "1.0.0",
    "packages": [
      {
        "registryType": "npm",
        "identifier": "everything-mcp",
        "version": "1.0.0",
        "transport": {
          "type": "stdio"
        }
      }
    ]
  },
  {
    "$schema": "https://static.modelcontextprotocol.io/schemas/2025-10-17/server.schema.json",
    "name": "time-mcp",
    "title": "Time",
    "description": "Provides current time and date information",
    "version": "1.0.0",
    "packages": [
      {
        "registryType": "npm",
        "identifier": "time-mcp",
        "version": "1.0.0",
        "transport": {
          "type": "stdio"
        }
      }
    ]
  }
];

export default defineComponent({
  name: 'MCPRegistry',

  metaInfo() {
    return {
      title: 'MCP Registry'
    };
  },

  setup() {
    const store = useStore()

    const searchQuery = ref('');
    const showAddModal = ref(false);
    const showImportModal = ref(false);
    const isLoading = ref(true);
    const registryServers = ref<any[]>([]);

    const newMcpServer = ref({
      name: '',
      title: '',
      description: '',
      version: '',
      isRemote: false,
      type: '',
      url: '',
      packageName: ''
    });

    const filteredServers = computed(() => {
      if (!registryServers.value || registryServers.value.length === 0) {
        return [];
      }
      const query = searchQuery.value.toLowerCase();
      return registryServers.value.filter((server: any) =>
        server.name.toLowerCase().includes(query) ||
        server.description.toLowerCase().includes(query) ||
        server.author.toLowerCase().includes(query)
      );
    });

    const processServerData = (serverData: any) => {
      if (Array.isArray(serverData)) {
        return serverData.map((server: any, index: number) => {
          const name = server.title || server.name || `Server ${index + 1}`;
          const isAlwaysInstalled = name === 'SUSE Multi Linux Manager MCP Server' || name === 'Rancher MCP server';
          return {
            id: index + 1,
            name,
            description: server.description || 'No description available',
            author: server.name?.toLowerCase().includes('suse') ? 'SUSE' : 'Unknown',
            stars: Math.floor(Math.random() * 10000) + 1000,
            iconClass: server.name?.toLowerCase().includes('suse') ? 'suse-logo' : 'icon icon-server',
            status: isAlwaysInstalled ? 'installed' : 'not-installed',
            version: server.version || '1.0.0'
          };
        });
      }
      const name = serverData.title || serverData.name || 'Custom Server';
      const isAlwaysInstalled = name === 'SUSE Multi Linux Manager MCP Server' || name === 'Rancher MCP server';
      return [{
        id: 1,
        name,
        description: serverData.description || 'No description available',
        author: serverData.name?.toLowerCase().includes('suse') ? 'SUSE' : 'Unknown',
        stars: Math.floor(Math.random() * 10000) + 1000,
        iconClass: serverData.name?.toLowerCase().includes('suse') ? 'suse-logo' : 'icon icon-server',
        status: isAlwaysInstalled ? 'installed' : 'not-installed',
        version: serverData.version || '1.0.0'
      }];
    };



    const loadRegistryServers = () => {
      console.log('Loading registry servers from mock data...');
      const servers = processServerData(mockServerData);
      registryServers.value = servers;
      console.log(`Loaded ${servers.length} servers from mock data`);
    };

    const handleInstallServer = (serverId: number) => {
      const server = registryServers.value.find(s => s.id === serverId);
      if (server) {
        server.status = 'installing';
        setTimeout(() => {
          server.status = 'installed';
        }, 1000); // Simulate installation delay
      }
    };

    const handleRemoveServer = (serverId: number) => {
      const server = registryServers.value.find(s => s.id === serverId);
      if (server) {
        if (server.status === 'installed') {
          server.status = 'not-installed';
        } else {
          registryServers.value = registryServers.value.filter(s => s.id !== serverId);
        }
      }
    };

    const onTileClick = (server: any) => {
      console.log('Tile clicked:', server.name);
      // In a real implementation, this would navigate to server details
    };

    const getBadgeClass = (status: string) => {
      switch (status) {
        case 'installed': return 'bg-success';
        case 'installing': return 'bg-warning';
        case 'not-installed': return 'bg-secondary';
        default: return 'bg-secondary';
      }
    };

    const formatStatus = (status: string) => {
      switch (status) {
        case 'installed': return 'Installed';
        case 'installing': return 'Installing';
        case 'not-installed': return 'Available';
        default: return status;
      }
    };

    const resetRemoteFields = () => {
      if (!newMcpServer.value.isRemote) {
        newMcpServer.value.type = '';
        newMcpServer.value.url = '';
      } else {
        newMcpServer.value.packageName = '';
      }
    };

    const handleAddMcpServer = () => {
      const serverJson = generateServerJson(newMcpServer.value);
      const newServer = processServerData([serverJson])[0];
      registryServers.value.push(newServer);
      resetForm();
      showAddModal.value = false;
      console.log('Server added successfully');
    };

    const generateServerJson = (data: any) => {
      const baseSchema = {
        "$schema": "https://static.modelcontextprotocol.io/schemas/2025-10-17/server.schema.json",
        "name": data.name,
        "title": data.title,
        "description": data.description,
        "version": data.version
      };

      if (data.isRemote) {
        return {
          ...baseSchema,
          "remotes": [{
            "type": data.type,
            "url": data.url
          }]
        };
      } else {
        return {
          ...baseSchema,
          "packages": [{
            "registryType": "npm",
            "identifier": data.packageName,
            "version": data.version,
            "transport": {
              "type": "stdio"
            }
          }]
        };
      }
    };

    const resetForm = () => {
      newMcpServer.value = {
        name: '',
        title: '',
        description: '',
        version: '',
        isRemote: false,
        type: '',
        url: '',
        packageName: ''
      };
    };

    const getServerLogo = (serverName: string, iconClass: string) => {
      if (iconClass === 'suse-logo' || serverName.toLowerCase().includes('suse')) {
        return '/SUSE_Logo-vert.jpg'; // Absolute path from public folder root
      }
      // For other servers, return empty to show placeholder
      return '';
    };

    const getLogoLetter = (iconClass: string) => {
      if (iconClass === 'trento-logo') return 'T';
      if (iconClass === 'uyuni-logo') return 'U';
      if (iconClass === 'suse-logo') return 'S';
      return '?';
    };

    const handleImageError = (event: Event) => {
      const img = event.target as HTMLImageElement;
      const serverName = img.alt.replace(' logo', '');
      console.warn(`Failed to load logo for ${serverName}, falling back to placeholder`);
      // Hide the broken image and show placeholder
      img.style.display = 'none';
    };

    onMounted(() => {
      loadRegistryServers();
      isLoading.value = false;
    });

    // Service enablement check
    const proxyInstalled = computed(() => store.state.suseai.settings.proxyInstalled);
    const selectedServices = computed(() => store.state.suseai.settings.selectedServices);
    const isEnabled = computed(() => proxyInstalled.value && selectedServices.value.includes('mcp-registry'));

    return {
      isEnabled,
      searchQuery,
      showAddModal,
      showImportModal,
      filteredServers,
      handleInstallServer,
      handleRemoveServer,
      isLoading,
      newMcpServer,
      handleAddMcpServer,
      resetRemoteFields,
      onTileClick,
      getBadgeClass,
      formatStatus,
      getServerLogo,
      getLogoLetter,
      handleImageError
    };
  }
});
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

 /* Main layout container */
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

/* Fixed header */
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

.actions-container {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.search-box {
  position: relative;
  min-width: 300px;
}

.input-sm {
  width: 100%;
  padding: 8px 12px 8px 36px;
  border: 1px solid var(--border);
  border-radius: var(--border-radius);
  font-size: 14px;
  background: var(--body-bg);
  color: var(--body-text);
}

.input-sm:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 2px rgba(var(--primary-rgb), 0.2);
}

.search-box .icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--muted);
  font-size: 16px;
}

/* Main content area */
.main-content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
  background: var(--body-bg);
}

.results-summary {
  margin-bottom: 20px;
  font-size: 14px;
  color: var(--muted);
}

.inline-loading {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--muted);
}

.results-text {
  color: var(--body-text);
}

.loading-text {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: 8px;
  font-size: 13px;
}

/* Tiles grid */
.tiles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.clickable-tile {
  background: var(--body-bg);
  border: 1px solid var(--border);
  border-radius: var(--border-radius);
  transition: all 0.2s ease;
  overflow: hidden;
  position: relative;
  cursor: pointer;
}

.clickable-tile:hover {
  border-color: var(--primary);
  box-shadow: 0 2px 8px var(--shadow);
  transform: translateY(-2px);
}

.clickable-tile:focus {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

.clickable-tile:active {
  transform: translateY(0);
}

.tile-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 20px 20px 16px;
  border-bottom: 1px solid var(--border);
}

.tile-logo-container {
  width: 48px;
  height: 48px;
  border-radius: var(--border-radius);
  background: var(--accent-btn);
  border: 1px solid var(--border);
  flex-shrink: 0;
  padding: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden; /* Hide broken images gracefully */
}

.tile-logo {
  width: 36px;
  height: 36px;
  object-fit: contain;
  border-radius: calc(var(--border-radius) - 2px);
}

.tile-icon {
  font-size: 24px;
  color: var(--primary);
}

.tile-info {
  flex: 1;
  min-width: 0;
}

.tile-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--body-text);
  margin: 0 0 8px 0;
  line-height: 1.3;
}

.tile-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.badge-state {
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 12px;
  font-weight: 500;
}

.tile-author {
  font-size: 13px;
  color: var(--muted);
}

.tile-description {
  font-size: 14px;
  line-height: 1.5;
  color: var(--muted);
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 84px;
  max-height: 84px;
}

.tile-footer {
  padding: 16px 20px;
  background: var(--card-footer-bg);
  border-top: 1px solid var(--border);
}

.tile-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
}

.installing-state {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--muted);
  font-size: 14px;
}

.installed-state {
  display: flex;
  align-items: center;
  gap: 12px;
}

.installed-state .badge {
  font-size: 12px;
  padding: 6px 12px;
}

/* Logo placeholders */
.logo-placeholder {
  width: 36px;
  height: 36px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: bold;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.trento-logo {
  background: linear-gradient(135deg, #4CAF50, #45a049);
}

.uyuni-logo {
  background: linear-gradient(135deg, #2196F3, #1976D2);
}

.suse-logo {
  background: #90ebcd;
}

/* Responsive design */
@media (max-width: 768px) {
  .fixed-header {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }

  .actions-container {
    flex-direction: column;
    align-items: stretch;
  }

  .search-box {
    min-width: unset;
  }

  .tiles-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .tile-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }

  .tile-actions {
    justify-content: center;
  }
}

/* Accessibility */
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

/* Modal styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(2px);
}

.modal-content {
  background: var(--body-bg, white);
  border-radius: var(--border-radius, 8px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  max-width: 600px;
  width: 90vw;
  max-height: 80vh;
  overflow-y: auto;
  border: 1px solid var(--border, #e0e0e0);
}

.modal-header {
  padding: 20px 24px;
  border-bottom: 1px solid var(--border, #e0e0e0);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-body {
  padding: 24px;
}

.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid var(--border, #e0e0e0);
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}



/* Form styling */
.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  color: var(--body-text, #333);
}

.form-control {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border, #ddd);
  border-radius: var(--border-radius, 4px);
  font-size: 14px;
  background: var(--body-bg, white);
  color: var(--body-text, #333);
}

.form-control:focus {
  border-color: var(--primary, #007bff);
  box-shadow: 0 0 0 2px rgba(var(--primary-rgb, 0, 123, 255), 0.2);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  margin: 0;
}

/* Responsive enhancements */
@media (max-width: 768px) {
  .modal-content {
    width: 95vw;
    margin: 16px;
    max-height: 90vh;
  }

  .modal-header,
  .modal-body,
  .modal-footer {
    padding: 16px;
  }


}
</style>