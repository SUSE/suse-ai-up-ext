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
                    Showing {{ filteredServers.length }} of {{ registryServers.length }} MCP servers
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

      <!-- View Server Modal -->
      <div v-if="showViewModal" class="modal-overlay" @click="showViewModal = false">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <h3>{{ selectedServer?.name }} Details</h3>
            <button @click="showViewModal = false" class="btn btn-sm">×</button>
          </div>
          <div class="modal-body">
            <div v-if="selectedServer" class="server-details">
              <div class="detail-section">
                <h4>Basic Information</h4>
                <p><strong>Name:</strong> {{ selectedServer.name }}</p>
                <p><strong>Description:</strong> {{ selectedServer.description }}</p>
                <p><strong>Version:</strong> {{ selectedServer.version }}</p>
                <p><strong>Protocol:</strong> {{ selectedServer.protocol }}</p>
                <p><strong>URL:</strong> {{ selectedServer.url }}</p>
                <p><strong>Validation Status:</strong> {{ selectedServer.validation_status }}</p>
                <p><strong>Discovered At:</strong> {{ selectedServer.discovered_at }}</p>
              </div>

              <div v-if="selectedServer.repository" class="detail-section">
                <h4>Repository</h4>
                <p><strong>Source:</strong> {{ selectedServer.repository.source }}</p>
                <p><strong>URL:</strong> <a :href="selectedServer.repository.url" target="_blank">{{ selectedServer.repository.url }}</a></p>
              </div>

              <div v-if="selectedServer.packages?.length" class="detail-section">
                <h4>Packages</h4>
                <div v-for="pkg in selectedServer.packages" :key="pkg.identifier" class="package-item">
                  <p><strong>Identifier:</strong> {{ pkg.identifier }}</p>
                  <p><strong>Type:</strong> {{ pkg.registryType }}</p>
                  <p><strong>Transport:</strong> {{ pkg.transport.type }}</p>
                  <div v-if="pkg.environmentVariables?.length" class="env-vars">
                    <p><strong>Environment Variables:</strong></p>
                    <ul>
                      <li v-for="env in pkg.environmentVariables" :key="env.name">
                        {{ env.name }}: {{ env.description }} ({{ env.isSecret ? 'Secret' : 'Public' }})
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div v-if="selectedServer.tools?.length" class="detail-section">
                <h4>Tools</h4>
                <div v-for="tool in selectedServer.tools" :key="tool.name" class="tool-item">
                  <p><strong>Name:</strong> {{ tool.name }}</p>
                  <p><strong>Description:</strong> {{ tool.description }}</p>
                </div>
              </div>

              <div v-if="selectedServer._meta" class="detail-section">
                <h4>Metadata</h4>
                <pre>{{ JSON.stringify(selectedServer._meta, null, 2) }}</pre>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Registry Management Modal -->
      <div v-if="showRegistryModal" class="modal-overlay" @click="showRegistryModal = false">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <h3>Manage Public Registries</h3>
            <button @click="showRegistryModal = false" class="btn btn-sm">×</button>
          </div>
          <div class="modal-body">
            <div class="registry-management">
              <div class="registry-actions">
                <button
                  class="btn btn-primary"
                  @click="syncAllRegistries"
                  :disabled="syncingRegistry !== null"
                >
                  <i v-if="syncingRegistry !== null" class="icon icon-spinner icon-spin" aria-hidden="true"></i>
                  {{ syncingRegistry !== null ? 'Syncing...' : 'Sync All Enabled' }}
                </button>
              </div>

              <div class="registries-list">
                <div
                  v-for="registry in publicRegistries"
                  :key="registry.id"
                  class="registry-item"
                >
                  <div class="registry-info">
                    <div class="registry-header">
                      <h4>{{ registry.name }}</h4>
                      <label class="checkbox-label">
                        <input
                          type="checkbox"
                          :checked="registry.enabled"
                          @change="toggleRegistry(registry.id)"
                        />
                        <span class="checkbox-text">Enabled</span>
                      </label>
                    </div>
                    <p class="registry-url">{{ registry.url }}</p>
                    <div class="registry-stats">
                      <span v-if="registry.lastSync" class="registry-sync">
                        Last sync: {{ new Date(registry.lastSync).toLocaleString() }}
                      </span>
                      <span class="registry-count">
                        {{ registry.serverCount }} servers
                      </span>
                    </div>
                  </div>
                  <div class="registry-actions">
                    <button
                      class="btn btn-sm btn-secondary"
                      @click="syncRegistry(registry.id)"
                      :disabled="!registry.enabled || syncingRegistry === registry.id"
                    >
                      <i v-if="syncingRegistry === registry.id" class="icon icon-spinner icon-spin" aria-hidden="true"></i>
                      {{ syncingRegistry === registry.id ? 'Syncing...' : 'Sync' }}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, getCurrentInstance } from 'vue';
import { useStore } from 'vuex';
import { MCPService } from '../services/mcp-service';
import type { RegistryServer } from '../services/mcp-service';

interface Registry {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  lastSync: string | null;
  serverCount: number;
}

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
    const showViewModal = ref(false);
    const showRegistryModal = ref(false);
    const isLoading = ref(true);
    const registryServers = ref<any[]>([]);
    const selectedServer = ref<RegistryServer | null>(null);

    // Registry management
    const publicRegistries = ref<Registry[]>([
      {
        id: 'mcp-official',
        name: 'MCP Official Registry',
        url: 'https://registry.modelcontextprotocol.io',
        enabled: true,
        lastSync: null,
        serverCount: 0
      },
      {
        id: 'docker-mcp',
        name: 'Docker MCP Registry',
        url: 'https://hub.docker.com/r/mcp',
        enabled: false,
        lastSync: null,
        serverCount: 0
      },
      {
        id: 'community-mcp',
        name: 'Community MCP Registry',
        url: 'https://community-mcp.example.com',
        enabled: true,
        lastSync: null,
        serverCount: 0
      }
    ]);
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

    const processServerData = (serverData: RegistryServer[]) => {
      if (Array.isArray(serverData)) {
        return serverData.map((server: RegistryServer, index: number) => {
          const isAlwaysInstalled = server.name?.toLowerCase().includes('suse') ||
                                   server.name?.toLowerCase().includes('trento') ||
                                   server.name?.toLowerCase().includes('uyuni') ||
                                   server.name?.toLowerCase().includes('rancher');

          return {
            id: server.id,
            name: server.name,
            description: server.description,
            author: server.repository?.source || 'Unknown',
            stars: Math.floor(Math.random() * 10000) + 1000, // Could be removed or fetched from API
            iconClass: server.name?.toLowerCase().includes('suse') ? 'suse-logo' : 'icon icon-server',
            status: isAlwaysInstalled ? 'installed' : 'not-installed',
            version: server.version,
            protocol: server.protocol,
            url: server.url,
            validationStatus: server.validation_status,
            discoveredAt: server.discovered_at,
            packages: server.packages,
            tools: server.tools,
            repository: server.repository,
            rawData: server // Keep original data for view modal
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
        // Simulate API call to sync from registry
        console.log(`Syncing from ${registry.name}...`);

        // Fake sync delay
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Fake server data based on registry
        let fakeServers: any[] = [];
        if (registryId === 'mcp-official') {
          fakeServers = [
            {
              id: 'official-weather-mcp',
              name: 'Weather MCP (Official)',
              description: 'Official weather information MCP server with current conditions and forecasts',
              version: '1.2.0',
              protocol: 'http',
              url: 'https://weather-mcp.example.com',
              validation_status: 'valid',
              discovered_at: new Date().toISOString(),
              packages: [{
                identifier: '@modelcontextprotocol/weather-mcp',
                registryType: 'npm',
                transport: { type: 'stdio' }
              }],
              tools: [
                { name: 'get_current_weather', description: 'Get current weather for a location' },
                { name: 'get_weather_forecast', description: 'Get weather forecast for upcoming days' }
              ],
              repository: { source: 'official', url: 'https://github.com/modelcontextprotocol/weather-mcp' }
            },
            {
              id: 'official-filesystem-mcp',
              name: 'Filesystem MCP (Official)',
              description: 'Secure file system operations MCP server',
              version: '2.0.1',
              protocol: 'http',
              url: 'https://filesystem-mcp.example.com',
              validation_status: 'valid',
              discovered_at: new Date().toISOString(),
              packages: [{
                identifier: '@modelcontextprotocol/filesystem-mcp',
                registryType: 'npm',
                transport: { type: 'stdio' }
              }],
              tools: [
                { name: 'read_file', description: 'Read contents of a file' },
                { name: 'write_file', description: 'Write content to a file' },
                { name: 'list_directory', description: 'List contents of a directory' }
              ],
              repository: { source: 'official', url: 'https://github.com/modelcontextprotocol/filesystem-mcp' }
            },
            {
              id: 'official-github-mcp',
              name: 'GitHub MCP (Official)',
              description: 'GitHub integration MCP server for repository management',
              version: '1.5.0',
              protocol: 'http',
              url: 'https://github-mcp.example.com',
              validation_status: 'valid',
              discovered_at: new Date().toISOString(),
              packages: [{
                identifier: '@modelcontextprotocol/github-mcp',
                registryType: 'npm',
                transport: { type: 'stdio' }
              }],
              tools: [
                { name: 'search_repositories', description: 'Search GitHub repositories' },
                { name: 'get_pull_request', description: 'Get details of a pull request' },
                { name: 'create_issue', description: 'Create a new GitHub issue' }
              ],
              repository: { source: 'official', url: 'https://github.com/modelcontextprotocol/github-mcp' }
            }
          ];
        } else if (registryId === 'docker-mcp') {
          fakeServers = [
            {
              id: 'docker-git-mcp',
              name: 'Git MCP (Docker)',
              description: 'Git operations MCP server via Docker container',
              version: '1.1.0',
              protocol: 'http',
              url: 'https://git-mcp.example.com',
              validation_status: 'valid',
              discovered_at: new Date().toISOString(),
              packages: [{
                identifier: 'mcp/git:latest',
                registryType: 'docker',
                transport: { type: 'stdio' }
              }],
              tools: [
                { name: 'git_status', description: 'Get git repository status' },
                { name: 'git_commit', description: 'Create a git commit' },
                { name: 'git_log', description: 'View git commit history' }
              ],
              repository: { source: 'docker', url: 'https://hub.docker.com/r/mcp/git' }
            },
            {
              id: 'docker-database-mcp',
              name: 'Database MCP (Docker)',
              description: 'Database operations MCP server for SQL databases',
              version: '2.1.0',
              protocol: 'http',
              url: 'https://database-mcp.example.com',
              validation_status: 'valid',
              discovered_at: new Date().toISOString(),
              packages: [{
                identifier: 'mcp/database:v2.1.0',
                registryType: 'docker',
                transport: { type: 'stdio' }
              }],
              tools: [
                { name: 'execute_query', description: 'Execute SQL query' },
                { name: 'list_tables', description: 'List database tables' },
                { name: 'get_schema', description: 'Get table schema information' }
              ],
              repository: { source: 'docker', url: 'https://hub.docker.com/r/mcp/database' }
            }
          ];
        } else if (registryId === 'community-mcp') {
          fakeServers = [
            {
              id: 'community-slack-mcp',
              name: 'Slack MCP (Community)',
              description: 'Community-built Slack integration MCP server',
              version: '0.8.0',
              protocol: 'http',
              url: 'https://slack-mcp.example.com',
              validation_status: 'valid',
              discovered_at: new Date().toISOString(),
              packages: [{
                identifier: 'community/slack-mcp',
                registryType: 'npm',
                transport: { type: 'stdio' }
              }],
              tools: [
                { name: 'send_message', description: 'Send message to Slack channel' },
                { name: 'list_channels', description: 'List available Slack channels' },
                { name: 'get_user_info', description: 'Get Slack user information' }
              ],
              repository: { source: 'community', url: 'https://github.com/community-mcp/slack-mcp' }
            },
            {
              id: 'community-calendar-mcp',
              name: 'Calendar MCP (Community)',
              description: 'Calendar and scheduling MCP server for Google Calendar integration',
              version: '1.0.0-beta',
              protocol: 'http',
              url: 'https://calendar-mcp.example.com',
              validation_status: 'valid',
              discovered_at: new Date().toISOString(),
              packages: [{
                identifier: 'community/calendar-mcp',
                registryType: 'npm',
                transport: { type: 'stdio' }
              }],
              tools: [
                { name: 'create_event', description: 'Create calendar event' },
                { name: 'list_events', description: 'List upcoming calendar events' },
                { name: 'update_event', description: 'Update existing calendar event' }
              ],
              repository: { source: 'community', url: 'https://github.com/community-mcp/calendar-mcp' }
            }
          ];
        }

        // Add new servers to registry
        const processedServers = processServerData(fakeServers);
        registryServers.value.push(...processedServers);

        // Update registry info
        registry.lastSync = new Date().toISOString();
        registry.serverCount = fakeServers.length;

        console.log(`Successfully synced ${fakeServers.length} servers from ${registry.name}`);
      } catch (error) {
        console.error(`Failed to sync from ${registry.name}:`, error);
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
      showViewModal,
      showRegistryModal,
      selectedServer,
      registryServers,
      filteredServers,
      publicRegistries,
      syncingRegistry,
      handleInstallServer,
      handleRemoveServer,
      handleViewServer,
      toggleRegistry,
      syncRegistry,
      syncAllRegistries,
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
  max-width: 800px;
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

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
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

/* Server details modal content */
.server-details {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.detail-section {
  border: 1px solid var(--border);
  border-radius: var(--border-radius);
  padding: 16px;
  background: var(--card-bg, var(--body-bg));
}

.detail-section h4 {
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--body-text);
}

.detail-section p {
  margin: 8px 0;
  color: var(--body-text);
}

.detail-section strong {
  color: var(--body-text);
  font-weight: 600;
}

.detail-section a {
  color: var(--primary);
  text-decoration: none;
}

.detail-section a:hover {
  text-decoration: underline;
}

.package-item,
.tool-item {
  border: 1px solid var(--border-light, rgba(0,0,0,0.1));
  border-radius: 4px;
  padding: 12px;
  margin-bottom: 8px;
  background: var(--accent-bg, #f9fafb);
}

.env-vars {
  margin-top: 8px;
}

.env-vars ul {
  margin: 4px 0 0 0;
  padding-left: 20px;
}

.env-vars li {
  margin-bottom: 4px;
  color: var(--muted);
}

.detail-section pre {
  background: var(--code-bg, #f6f8fa);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 12px;
  overflow-x: auto;
  font-size: 12px;
  color: var(--body-text);
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

/* Registry Management Styles */
.registry-management {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.registry-actions {
  display: flex;
  justify-content: flex-end;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border);
}

.registries-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.registry-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: var(--border-radius);
  background: var(--body-bg);
}

.registry-info {
  flex: 1;
}

.registry-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.registry-header h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--body-text);
}

.registry-url {
  margin: 4px 0;
  font-size: 14px;
  color: var(--muted);
  font-family: monospace;
}

.registry-stats {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: var(--muted);
  margin-top: 8px;
}

.registry-sync {
  color: var(--success);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
}

.checkbox-label input[type="checkbox"] {
  margin: 0;
  width: 16px;
  height: 16px;
}

.checkbox-text {
  user-select: none;
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

  .registry-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .registry-actions {
    align-self: stretch;
    display: flex;
    justify-content: center;
  }
}
</style>