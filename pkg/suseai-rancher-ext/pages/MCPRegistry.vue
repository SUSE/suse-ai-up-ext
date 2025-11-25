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

                <button
                  class="btn role-secondary"
                  @click="showRegistryModal = true"
                  :title="'Manage Public Registries'"
                  :aria-label="'Manage Public Registries'"
                  type="button"
                >
                  <i class="icon icon-sync" aria-hidden="true" />
                  Registries
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
                     Showing {{ certifiedCount }} certified + {{ registryCount }} synced MCP servers
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
                            v-if="getServerLogo(server.name, server.iconClass, server.iconurl, server)"
                            :src="getServerLogo(server.name, server.iconClass, server.iconurl, server)"
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
                           <span v-if="server.isCertified" class="badge-certified badge">Certified</span>
                           <span :class="['badge-state badge', getBadgeClass(server.status)]">{{ formatStatus(server.status) }}</span>
                           <span class="tile-author">{{ server.author }}</span>
                         </div>
                        <h3 class="tile-title">{{ server.name }}</h3>
                        <p class="tile-description">{{ server.description }}</p>
                      </div>
                      <!-- Delete button -->
                      <button
                        class="delete-btn"
                        @click.stop="handleDeleteServer(server.id)"
                        :aria-label="`Delete ${server.name}`"
                        title="Delete server"
                      >
                        <i class="icon icon-trash" aria-hidden="true" />
                      </button>
                    </div>
                    <div class="tile-footer">
                      <div class="tile-actions">
                        <button
                          class="btn btn-sm btn-primary"
                          @click.stop="handleViewServer(server)"
                          :aria-label="`View details for ${server.name}`"
                        >
                          View
                        </button>
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

      <!-- Modal Components -->
      <ServerDetailsModal
        :show="showViewModal"
        :server="selectedServer"
        @close="showViewModal = false"
      />

      <RegistryManagementModal
        :show="showRegistryModal"
        :registries="publicRegistries"
        :syncing-registry="syncingRegistry"
        :is-custom-registry="isCustomRegistry"
        @close="showRegistryModal = false"
        @toggle-registry="toggleRegistry"
        @sync-registry="syncRegistry"
        @sync-all="syncAllRegistries"
        @add-registry="showAddRegistryModal = true"
        @advanced="showAdvancedModal = true"
        @remove-registry="removeCustomRegistry"
      />

      <AdvancedRegistryModal
        :show="showAdvancedModal"
        @close="showAdvancedModal = false"
        @clear-all="clearAllEntries"
        @check-availability="checkAvailability"
        @check-security="checkSecurity"
      />

      <AddRegistryModal
        :show="showAddRegistryModal"
        @close="showAddRegistryModal = false"
        @submit="addCustomRegistry"
      />

      <GitHubEnvModal
        :show="showGitHubModal"
        @adapterCreated="onAdapterCreated"
        @close="showGitHubModal = false"
      />
      </div>
    </template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, onUnmounted, getCurrentInstance } from 'vue';
import { useStore } from 'vuex';
import { MCPService } from '../services/mcp-service';
import { persistLoad, persistSave, persistClear } from '../services/ui-persist';
import type { RegistryServer } from '../services/mcp-service';
import {
  ServerDetailsModal,
  RegistryManagementModal,
  AdvancedRegistryModal,
  AddRegistryModal
} from '../components/MCPGateway';
import GitHubEnvModal from '../components/shared/GitHubEnvModal.vue';

interface Registry {
  id: string;
  name: string;
  url: string;
  source: string;
  enabled: boolean;
  lastSync: string | null;
  serverCount: number;
}

export default defineComponent({
  name: 'MCPRegistry',
  components: {
    ServerDetailsModal,
    RegistryManagementModal,
    AdvancedRegistryModal,
    AddRegistryModal,
    GitHubEnvModal
  },

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
    const showViewModal = ref(false);
    const showRegistryModal = ref(false);
    const showAdvancedModal = ref(false);
    const showAddRegistryModal = ref(false);
    const showGitHubModal = ref(false);
    const isLoading = ref(true);
    const registryServers = ref<any[]>([]);
    const selectedServer = ref<RegistryServer | null>(null);
    const hasPerformedInitialSync = ref(false);



    // Registry management - predefined registries
    const predefinedRegistries = ref<Registry[]>([
      {
        id: 'official-mcp',
        name: 'MCP Official Registry',
        url: 'https://registry.modelcontextprotocol.io',
        source: 'official',
        enabled: true,
        lastSync: null,
        serverCount: 0
      },
      {
        id: 'docker-mcp',
        name: 'Docker MCP Registry',
        url: 'https://hub.docker.com/r/mcp',
        source: 'docker',
        enabled: true,
        lastSync: null,
        serverCount: 0
      },
      {
        id: 'community-mcp',
        name: 'Community MCP Registry',
        url: 'https://community-mcp.example.com',
        source: 'community',
        enabled: true,
        lastSync: null,
        serverCount: 0
      },
      {
        id: 'virtual-mcp',
        name: 'Virtual MCP Registry',
        url: 'http://localhost:8912/api/v1',
        source: 'virtual-mcp',
        enabled: true,
        lastSync: null,
        serverCount: 0
      }
    ]);

    // Custom registries added by user
    const customRegistries = ref<Registry[]>([]);

    // Certified scenarios - always shown
    const certifiedScenarios = ref<any[]>([
      {
        id: 'certified-sequential-thinking',
        name: 'Sequential Thinking MCP',
        description: 'Secure sequential thinking server with Bearer token authentication',
        author: 'SUSE AI',
        stars: 1500,
        iconClass: 'icon icon-brain',
        status: 'not-installed',
        version: '1.0.0',
        protocol: 'stdio',
        url: '',
        validationStatus: 'certified',
        discoveredAt: new Date().toISOString(),
        packages: [],
        tools: ['sequential-thinking-tool'],
        repository: { source: 'certified', url: '' },
        availabilityStatus: 'available',
        securityScanStatus: 'certified',
        lastSecurityScanId: null,
        rawData: null,
        isCertified: true,
        adapterConfig: {
          connectionType: 'LocalStdio',
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-sequential-thinking'],
          env: {}
        }
      },
      {
        id: 'certified-filesystem',
        name: 'Filesystem MCP',
        description: 'Directory-restricted file operations with authentication',
        author: 'SUSE AI',
        stars: 1200,
        iconClass: 'icon icon-folder',
        status: 'not-installed',
        version: '1.0.0',
        protocol: 'stdio',
        url: '',
        validationStatus: 'certified',
        discoveredAt: new Date().toISOString(),
        packages: [],
        tools: ['list_directory', 'read_file', 'search_files'],
        repository: { source: 'certified', url: '' },
        availabilityStatus: 'available',
        securityScanStatus: 'certified',
        lastSecurityScanId: null,
        rawData: null,
        isCertified: true,
        adapterConfig: {
          connectionType: 'LocalStdio',
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-filesystem', '.'],
          env: {}
        }
      },
      {
        id: 'certified-sqlite',
        name: 'SQLite Database MCP',
        description: 'Secure database operations with parameterized queries',
        author: 'SUSE AI',
        stars: 1000,
        iconClass: 'icon icon-database',
        status: 'not-installed',
        version: '1.0.0',
        protocol: 'stdio',
        url: '',
        validationStatus: 'certified',
        discoveredAt: new Date().toISOString(),
        packages: [],
        tools: ['query', 'insert', 'update', 'delete'],
        repository: { source: 'certified', url: '' },
        availabilityStatus: 'available',
        securityScanStatus: 'certified',
        lastSecurityScanId: null,
        rawData: null,
        isCertified: true,
        adapterConfig: {
          connectionType: 'LocalStdio',
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-sqlite', '--db-path', '/tmp/test.db'],
          env: {}
        }
      },
      {
        id: 'certified-github',
        name: 'GitHub API MCP',
        description: 'GitHub repository and issue management with API access',
        author: 'SUSE AI',
        stars: 1800,
        iconClass: 'icon icon-github',
        status: 'not-installed',
        version: '1.0.0',
        protocol: 'stdio',
        url: '',
        validationStatus: 'certified',
        discoveredAt: new Date().toISOString(),
        packages: [],
        tools: ['search_repositories', 'get_repository', 'create_issue'],
        repository: { source: 'certified', url: '' },
        availabilityStatus: 'available',
        securityScanStatus: 'certified',
        lastSecurityScanId: null,
        rawData: null,
        isCertified: true,
        adapterConfig: {
          connectionType: 'LocalStdio',
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-github'],
          env: { GITHUB_PERSONAL_ACCESS_TOKEN: '' } // Will be filled by modal
        },
        requiresEnvVar: true,
        envVarName: 'GITHUB_PERSONAL_ACCESS_TOKEN',
        envVarDescription: 'GitHub Personal Access Token with repo, issues, and pull_requests scopes'
      }
    ]);

    // Combined registries for UI
    const publicRegistries = computed(() => [
      ...predefinedRegistries.value,
      ...customRegistries.value
    ]);

    // Function to refresh from browse API
    const refreshFromBrowse = async () => {
      try {
        console.log('Refreshing registry servers from browse API...');
        isLoading.value = true;
        const servers = await MCPService.browseRegistryServers();
        registryServers.value = processServerData(servers);
        persistRegistryData();
        console.log(`Refreshed ${servers.length} servers from registry browse API`);
      } catch (error) {
        console.error('Failed to refresh registry servers from browse API:', error);
      } finally {
        isLoading.value = false;
      }
    };
    const syncingRegistry = ref<string | null>(null);

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

    const newRegistry = ref({
      name: '',
      source: '',
      url: '',
      enabled: true
    });

    const filteredServers = computed(() => {
      const query = searchQuery.value.toLowerCase();

      // Always include certified scenarios (filtered by search)
      const filteredCertified = certifiedScenarios.value.filter((server: any) =>
        server.name != null &&
        (server.name.toLowerCase().includes(query) ||
         server.description.toLowerCase().includes(query) ||
         server.author.toLowerCase().includes(query))
      );

      // Filter registry servers if they exist
      const filteredRegistry = registryServers.value && registryServers.value.length > 0
        ? registryServers.value.filter((server: any) =>
            server.name != null &&
            (server.name.toLowerCase().includes(query) ||
             server.description.toLowerCase().includes(query) ||
             server.author.toLowerCase().includes(query))
          )
        : [];

      // Return certified scenarios first, then registry servers
      return [...filteredCertified, ...filteredRegistry];
    });

    // Computed for summary counts
    const certifiedCount = computed(() => {
      const query = searchQuery.value.toLowerCase();
      return certifiedScenarios.value.filter((server: any) =>
        server.name != null &&
        (server.name.toLowerCase().includes(query) ||
         server.description.toLowerCase().includes(query) ||
         server.author.toLowerCase().includes(query))
      ).length;
    });

    const registryCount = computed(() => {
      if (!registryServers.value || registryServers.value.length === 0) return 0;
      const query = searchQuery.value.toLowerCase();
      return registryServers.value.filter((server: any) =>
        server.name != null &&
        (server.name.toLowerCase().includes(query) ||
         server.description.toLowerCase().includes(query) ||
         server.author.toLowerCase().includes(query))
      ).length;
    });

    const processServerData = (serverData: RegistryServer[]) => {
      if (Array.isArray(serverData)) {
        return serverData.map((server: RegistryServer, index: number) => {
          const isAlwaysInstalled = server.name?.toLowerCase().includes('suse') ||
                                    server.name?.toLowerCase().includes('trento') ||
                                    server.name?.toLowerCase().includes('uyuni') ||
                                    server.name?.toLowerCase().includes('rancher');

          // Check if this is a Virtual MCP server
          const isVirtualMCP = server.repository?.source === 'virtual-mcp' ||
                              server.name?.toLowerCase().includes('virtual') ||
                              server.url?.includes('8912');

          return {
            id: server.id,
            name: server.name,
            description: server.description,
            author: isVirtualMCP ? 'SUSE Virtual MCP' : (server.repository?.source || 'Unknown'),
            stars: Math.floor(Math.random() * 10000) + 1000, // Could be removed or fetched from API
            iconClass: server.name?.toLowerCase().includes('suse') ? 'suse-logo' : (server.repository?.source === 'docker' ? 'docker-logo' : 'icon icon-server'),
            iconurl: server.iconurl, // Add iconurl from server data
            status: isAlwaysInstalled ? 'installed' : 'not-installed',
            version: server.version,
            protocol: server.protocol,
            url: server.url,
            validationStatus: server.validation_status,
            discoveredAt: server.discovered_at,
            packages: server.packages,
            tools: server.tools,
            repository: server.repository,
            availabilityStatus: 'unknown', // New: online, offline, unknown
            securityScanStatus: 'not-scanned', // New: not-scanned, running, completed, failed
            lastSecurityScanId: null, // New: scan ID for tracking
            rawData: server, // Keep original data for view modal
            isCertified: isVirtualMCP // Virtual MCP servers are always certified
          };
        });
      }
      return [];
    };



    const loadRegistryServers = async () => {
      console.log('Loading registry servers from browse API...');
      isLoading.value = true;
      try {
        const servers = await MCPService.browseRegistryServers();
        registryServers.value = processServerData(servers);
        console.log(`Loaded ${servers.length} servers from registry browse API`);
      } catch (error) {
        console.error('Failed to load registry servers:', error);
        // Fallback to empty array
        registryServers.value = [];
      } finally {
        isLoading.value = false;
      }
    };

    const handleInstallServer = async (serverId: string | number) => {
      // Check if it's a certified scenario by id
      if (serverId === 'certified-github') {
        showGitHubModal.value = true;
        return;
      }

      // Check if it's any other certified scenario
      const certifiedServer = certifiedScenarios.value.find(s => s.id === serverId);

      if (certifiedServer) {
        // Create adapter for certified scenarios using their configuration
        try {
          const adapterData = {
            name: `${certifiedServer.id.replace('certified-', '')}-mcp`,
            imageName: `mcp-${certifiedServer.id.replace('certified-', '')}-adapter`,
            imageVersion: '1.0.0',
            description: certifiedServer.description,
            connectionType: certifiedServer.adapterConfig.connectionType,
            protocol: 'MCP' as const,
            replicaCount: 1,
            useWorkloadIdentity: false,
            environmentVariables: certifiedServer.adapterConfig.env || {},
            mcpClientConfig: {
              mcpServers: {
                [certifiedServer.id.replace('certified-', '')]: {
                  command: certifiedServer.adapterConfig.command,
                  args: certifiedServer.adapterConfig.args,
                  env: certifiedServer.adapterConfig.env
                }
              }
            }
          };

          await MCPService.createAdapter(adapterData);
          certifiedServer.status = 'installed';
        } catch (error) {
          console.error('Failed to create adapter for certified scenario:', error);
        }
        return;
      }

      // Handle registry servers using their configuration
      const server = registryServers.value.find(s => s.id === serverId);
      if (server) {
        try {
          server.status = 'installing';

          // Use the server's configuration to create the adapter
          const adapterData = {
            name: `${server.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-mcp`,
            imageName: server.packages?.[0]?.identifier || `mcp-${server.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
            imageVersion: server.version || 'latest',
            description: server.description,
            connectionType: server.protocol === 'stdio' ? 'LocalStdio' : 'Http' as const,
            protocol: 'MCP' as const,
            replicaCount: 1,
            useWorkloadIdentity: false,
            environmentVariables: {},
            mcpClientConfig: server.protocol === 'stdio' ? {
              mcpServers: {
                [server.name.toLowerCase().replace(/[^a-z0-9]/g, '-')]: {
                  command: 'npx',
                  args: ['-y', server.packages?.[0]?.identifier || server.name],
                  env: {}
                }
              }
            } : {
              mcpServers: {
                [server.name.toLowerCase().replace(/[^a-z0-9]/g, '-')]: {
                  url: server.url
                }
              }
            }
          };

          await MCPService.createAdapter(adapterData);
          server.status = 'installed';
        } catch (error) {
          console.error('Failed to create adapter for registry server:', error);
          server.status = 'not-installed';
        }
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

    const handleDeleteServer = async (serverId: string | number) => {
      try {
        // Check if this is a Virtual MCP server
        const registryServer = registryServers.value.find(s => s.id === serverId);
        const certifiedServer = certifiedScenarios.value.find(s => s.id === serverId);

        const server = registryServer || certifiedServer;
        const isVirtualMCP = server && (
          server.repository?.source === 'virtual-mcp' ||
          server.name?.toLowerCase().includes('virtual') ||
          server.url?.includes('8912')
        );

        // If it's a Virtual MCP server, delete it from the backend first
        if (isVirtualMCP && server?.id) {
          try {
            await fetch(`http://localhost:8912/api/v1/mcps/${server.id}`, {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json',
              },
            });
            console.log(`Successfully deleted Virtual MCP server ${server.id} from backend`);
          } catch (error) {
            console.error(`Failed to delete Virtual MCP server ${server.id} from backend:`, error);
            // Continue with local deletion even if backend deletion fails
          }
        }

        // Remove from registry servers
        registryServers.value = registryServers.value.filter(s => s.id !== serverId);

        // Also remove from certified scenarios if it's one of them
        const certifiedIndex = certifiedScenarios.value.findIndex(s => s.id === serverId);
        if (certifiedIndex !== -1) {
          certifiedScenarios.value.splice(certifiedIndex, 1);
        }

        // Persist the changes
        persistRegistryData();

        console.log(`Successfully deleted server ${serverId} from registry`);
      } catch (error) {
        console.error(`Failed to delete server ${serverId}:`, error);
      }
    };

    const onAdapterCreated = () => {
      // Mark GitHub scenario as installed
      const githubServer = certifiedScenarios.value.find(s => s.id === 'certified-github');
      if (githubServer) {
        githubServer.status = 'installed';
      }
    };

    const handleViewServer = async (server: any) => {
      try {
        // If we have raw data, use it; otherwise fetch detailed server info
        if (server.rawData) {
          selectedServer.value = server.rawData;
        } else {
          const detailedServer = await MCPService.getRegistryServer(server.id);
          selectedServer.value = detailedServer || null;
        }
        showViewModal.value = true;
      } catch (error) {
        console.error('Failed to fetch server details:', error);
        // Still show modal with available data
        selectedServer.value = server.rawData || null;
        showViewModal.value = true;
      }
    };

    // Registry management functions
    const toggleRegistry = (registryId: string) => {
      const registry = publicRegistries.value.find(r => r.id === registryId);
      if (registry) {
        registry.enabled = !registry.enabled;
      }
    };

    const syncRegistry = async (registryId: string) => {
      const registry = publicRegistries.value.find(r => r.id === registryId);
      if (!registry || !registry.enabled) return;

      syncingRegistry.value = registryId;
      try {
        console.log(`Syncing from ${registry.name}...`);

        let servers: any[] = [];

        // Handle Virtual MCP registry specially
        if (registry.source === 'virtual-mcp') {
          // Fetch Virtual MCP servers directly from the API
          const response = await fetch('http://localhost:8912/api/v1/mcps');
          if (response.ok) {
            const data = await response.json();
            const virtualMcps = data.mcps || [];

            // Transform Virtual MCP data to RegistryServer format
            servers = virtualMcps.map((vmcp: any) => ({
              id: vmcp.id,
              name: vmcp.name,
              description: vmcp.description,
              version: vmcp.version,
              protocol: 'stdio', // Virtual MCP uses stdio
              url: '',
              validation_status: 'certified',
              discovered_at: vmcp.created_at,
              packages: [],
              tools: vmcp.tools || [],
              repository: {
                source: 'virtual-mcp',
                url: ''
              },
              rawData: vmcp
            }));

            console.log(`Fetched and transformed ${servers.length} Virtual MCP servers`);
          } else {
            throw new Error(`Failed to fetch Virtual MCP servers: ${response.status}`);
          }
        } else {
          // Call real API with source filtering using MCPService
          servers = await MCPService.getPublicRegistryServersBySource(registry.source);
        }

        // Process and add new servers to registry
        const processedServers = processServerData(servers);
        registryServers.value.push(...processedServers);

        // Update registry info
        registry.lastSync = new Date().toISOString();
        registry.serverCount = servers.length;

        // Mark that initial sync has been performed
        hasPerformedInitialSync.value = true;

        // Persist the updated data
        persistRegistryData();

        // Automatically refresh from browse API after sync (only for non-Virtual MCP)
        if (registry.source !== 'virtual-mcp') {
          await refreshFromBrowse();
        }

        console.log(`Successfully synced ${servers.length} servers from ${registry.name}`);
      } catch (error) {
        console.error(`Failed to sync from ${registry.name}:`, error);
        // Could show a user notification here
      } finally {
        syncingRegistry.value = null;
      }
    };

    const syncAllRegistries = async () => {
      const enabledRegistries = publicRegistries.value.filter(r => r.enabled);
      for (const registry of enabledRegistries) {
        await syncRegistry(registry.id);
      }
    };

    // Persistence helper
    const persistRegistryData = () => {
      const data = {
        servers: registryServers.value,
        predefinedRegistries: predefinedRegistries.value.map(r => ({
          id: r.id,
          lastSync: r.lastSync,
          serverCount: r.serverCount
        })),
        customRegistries: customRegistries.value,
        hasPerformedInitialSync: hasPerformedInitialSync.value
      };
      persistSave('mcp-registry-data', data);
    };



    // Advanced modal functions
    const clearAllEntries = () => {
      registryServers.value = [];
      predefinedRegistries.value.forEach(registry => {
        registry.lastSync = null;
        registry.serverCount = 0;
      });
      customRegistries.value.forEach(registry => {
        registry.lastSync = null;
        registry.serverCount = 0;
      });
      hasPerformedInitialSync.value = false;
      persistClear('mcp-registry-data');
      showAdvancedModal.value = false;
      console.log('All registry entries cleared');
    };

    const checkAvailability = async () => {
      console.log('Checking server availability...');

      // Check availability of all registry servers
      for (const server of registryServers.value) {
        try {
          // Try to ping the server URL with timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

          const response = await fetch(server.url, {
            method: 'HEAD',
            mode: 'no-cors', // Allow cross-origin requests
            signal: controller.signal
          });

          clearTimeout(timeoutId);
          server.availabilityStatus = 'online';
        } catch (error) {
          console.warn(`Server ${server.name} is not reachable:`, error);
          server.availabilityStatus = 'offline';
        }
      }

      // Persist the updated availability status
      persistRegistryData();

      console.log('Availability check completed');
      showAdvancedModal.value = false;
    };

    const checkSecurity = async () => {
      console.log('Running security checks...');

      // Run security scans on registry servers
      for (const server of registryServers.value) {
        try {
          // Extract host from URL for scanning
          const url = new URL(server.url);
          const host = url.hostname;

          // Start a security scan for this server
          const scanConfig = {
            maxConcurrent: 1,
            timeout: '30s',
            scanRanges: [host],
            ports: ['80', '443'], // Common web ports
            excludeProxy: true
          };

          const scanResult = await MCPService.startScan(scanConfig);
          console.log(`Security scan started for ${server.name}:`, scanResult.scanId || scanResult.scan_id);

          // Store scan ID for later status checking
          server.lastSecurityScanId = scanResult.scanId || scanResult.scan_id;
          server.securityScanStatus = 'running';

        } catch (error) {
          console.error(`Failed to start security scan for ${server.name}:`, error);
          server.securityScanStatus = 'failed';
        }
      }

      // Persist the updated security scan status
      persistRegistryData();

      console.log('Security scan initiation completed');
      showAdvancedModal.value = false;
    };

    // Custom registry management
    const addCustomRegistry = () => {
      if (!newRegistry.value.name.trim() || !newRegistry.value.source.trim()) {
        return; // Basic validation
      }

      // Check if source already exists
      const existingRegistry = publicRegistries.value.find(r => r.source === newRegistry.value.source);
      if (existingRegistry) {
        console.error('Registry with this source already exists');
        return;
      }

      const customRegistry: Registry = {
        id: `custom-${Date.now()}`, // Unique ID for custom registries
        name: newRegistry.value.name.trim(),
        url: newRegistry.value.url.trim() || `https://${newRegistry.value.source}.example.com`,
        source: newRegistry.value.source.trim(),
        enabled: newRegistry.value.enabled,
        lastSync: null,
        serverCount: 0
      };

      customRegistries.value.push(customRegistry);

      // Reset form
      newRegistry.value = {
        name: '',
        source: '',
        url: '',
        enabled: true
      };

      // Persist changes
      persistRegistryData();

      showAddRegistryModal.value = false;
    };

    const removeCustomRegistry = (registryId: string) => {
      const index = customRegistries.value.findIndex(r => r.id === registryId);
      if (index !== -1) {
        customRegistries.value.splice(index, 1);
        persistRegistryData();
      }
    };

    const isCustomRegistry = (registryId: string) => {
      return customRegistries.value.some(r => r.id === registryId);
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

    const generateServerJson = (data: any): RegistryServer => {
      const now = new Date().toISOString();

      if (data.isRemote) {
        return {
          id: `custom-${Date.now()}`,
          name: data.name,
          description: data.description,
          version: data.version,
          protocol: 'http',
          url: data.url,
          validation_status: 'unknown',
          discovered_at: now,
          packages: [],
          tools: [],
          repository: {
            source: 'custom',
            url: data.url
          }
        };
      } else {
        return {
          id: `custom-${Date.now()}`,
          name: data.name,
          description: data.description,
          version: data.version,
          protocol: 'stdio',
          url: '',
          validation_status: 'unknown',
          discovered_at: now,
          packages: [{
            identifier: data.packageName,
            registryType: 'npm',
            transport: {
              type: 'stdio'
            }
          }],
          tools: [],
          repository: {
            source: 'npm',
            url: `https://www.npmjs.com/package/${data.packageName}`
          }
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

    const getServerLogo = (serverName: string, iconClass: string, iconurl?: string, server?: any) => {
      // First check if iconurl is provided (e.g., from Docker registry)
      if (iconurl) {
        return iconurl;
      }
      // Fallback to existing logic
      if (iconClass === 'suse-logo' || serverName.toLowerCase().includes('suse')) {
        return '/SUSE_Logo-vert.jpg'; // Absolute path from public folder root
      }
      // For Docker servers, use local Docker icon
      if (server?.repository?.source === 'docker') {
        return '/docker-icon.svg';
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

    onMounted(async () => {
      // Load persisted registry servers and custom registries if available
      const persisted = persistLoad<{
        servers: any[];
        predefinedRegistries: { id: string; lastSync: string | null; serverCount: number }[];
        customRegistries: Registry[];
        hasPerformedInitialSync: boolean;
      }>('mcp-registry-data', {
        servers: [],
        predefinedRegistries: [],
        customRegistries: [],
        hasPerformedInitialSync: false
      }, 24 * 60 * 60 * 1000); // 24 hours TTL

      // Load custom registries
      if (persisted.customRegistries) {
        customRegistries.value = persisted.customRegistries;
      }

      // Update predefined registry states with persisted data
      if (persisted.predefinedRegistries) {
        persisted.predefinedRegistries.forEach((persistedRegistry: { id: string; lastSync: string | null; serverCount: number }) => {
          const registry = predefinedRegistries.value.find(r => r.id === persistedRegistry.id);
          if (registry) {
            registry.lastSync = persistedRegistry.lastSync;
            registry.serverCount = persistedRegistry.serverCount;
          }
        });
      }

      // Check if initial sync has been performed
      hasPerformedInitialSync.value = persisted.hasPerformedInitialSync || false;

      if (hasPerformedInitialSync.value && persisted.servers && persisted.servers.length > 0) {
        // Load from persisted data if initial sync was done
        registryServers.value = persisted.servers;
        console.log(`Loaded ${persisted.servers.length} servers from persisted data`);
      } else if (hasPerformedInitialSync.value) {
        // If initial sync was performed but no persisted data, try to load from /registry/browse
        try {
          console.log('Loading registry servers from browse API...');
          isLoading.value = true;
          const servers = await MCPService.browseRegistryServers();
          registryServers.value = processServerData(servers);
          console.log(`Loaded ${servers.length} servers from registry browse API`);
        } catch (error) {
          console.error('Failed to load registry servers from browse API:', error);
          registryServers.value = [];
        }
      }

      isLoading.value = false;
    });

    // No polling - manual sync only

    // Service enablement check
    const proxyInstalled = computed(() => store.state.suseai.settings.proxyInstalled);
    const selectedServices = computed(() => store.state.suseai.settings.selectedServices);
    const isEnabled = computed(() => proxyInstalled.value && selectedServices.value.includes('mcp-registry'));

    return {
      isEnabled,
      searchQuery,
       showAddModal,
       showImportModal,
       showViewModal,
        showRegistryModal,
        showAdvancedModal,
        showAddRegistryModal,
        showGitHubModal,
       selectedServer,
      registryServers,
      filteredServers,
      publicRegistries,
      syncingRegistry,
       handleInstallServer,
       handleRemoveServer,
       handleDeleteServer,
       handleViewServer,
       toggleRegistry,
       syncRegistry,
       syncAllRegistries,
       clearAllEntries,
       checkAvailability,
       checkSecurity,
       addCustomRegistry,
       removeCustomRegistry,
       isCustomRegistry,
        newRegistry,
        hasPerformedInitialSync,
        refreshFromBrowse,
        certifiedCount,
        registryCount,
        onAdapterCreated,
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
  position: relative;
}

.delete-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  background: transparent;
  border: none;
  color: var(--muted);
  cursor: pointer;
  padding: 4px;
  border-radius: var(--border-radius);
  transition: all 0.2s ease;
  opacity: 0.7;
}

.delete-btn:hover {
  background: rgba(220, 53, 69, 0.1);
  color: #dc3545;
  opacity: 1;
}

.delete-btn:focus {
  outline: 2px solid #dc3545;
  outline-offset: 2px;
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

.badge-certified {
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  font-size: 11px;
  padding: 3px 6px;
  border-radius: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-right: 6px;
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
  gap: 8px;
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

.docker-logo {
  background: linear-gradient(135deg, #2496ED, #1e87db);
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


</style>