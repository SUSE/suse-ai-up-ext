  <template>
    <div v-if="!isEnabled" class="blank-page">
      <p>Please enable the service through the SUSE AI Universal Proxy installation wizard.</p>
    </div>
    <div v-else>
      <div class="experimental-banner">
        <span class="banner-icon">⚠️</span>
        <strong>Experimental Feature</strong>
        <p>This Virtual MCP feature is experimental and may not be fully compatible with all providers. <a href="https://github.com/sst/opencode/issues" target="_blank">Report Issue</a> or <a href="https://github.com/sst/opencode/pulls" target="_blank">Submit PR</a> to help improve compatibility.</p>
      </div>
      <div class="virtual-mcp-page">
    <!-- Header Section -->
    <div class="header-section">
      <div class="title-section">
        <h1 class="main-title">Virtual MCP</h1>
        <p class="subtitle">Manage your Model Context Protocol servers and connections</p>
      </div>
      <div class="action-buttons">
        <button class="btn btn-primary" @click="showCreateModal = true">Create Virtual MCP</button>
        <button class="btn btn-secondary">Configure Connection</button>
      </div>
    </div>

    <!-- Filter Section -->
    <div class="filter-section">
      <div class="search-box">
        <input type="text" placeholder="Filter MCP servers..." class="form-control" />
      </div>
    </div>

     <!-- Loading State -->
     <div v-if="isLoading" class="loading-section">
       <div class="loading-spinner">
         <i class="icon icon-spinner icon-spin"></i>
         <p>Loading Virtual MCP servers...</p>
       </div>
     </div>

      <!-- Content Sections -->
      <div v-else>
        <!-- MCP Servers Table -->
        <div class="mcp-table-section">
          <div class="table-header">
            <div class="table-title">
              <h2>MCP Servers</h2>
            </div>
          </div>
          <div class="table-container">
            <table class="table table-striped">
              <thead>
                <tr>
                  <th>State</th>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                 <tr v-for="server in mcpServers" :key="server.id">
                   <td>
                     <span :class="['state-badge badge', getBadgeClass(server.state)]">{{ server.state }}</span>
                   </td>
                   <td>{{ server.name }}</td>
                   <td>{{ server.type || 'Installed MCP server' }}</td>
                   <td>
                     <button class="btn btn-sm btn-primary">Edit</button>
                     <button
                       :class="['btn btn-sm action-btn-spacing', server.state === 'Connected' ? 'btn-warning' : 'btn-success']"
                       @click="handleToggleConnection(server.id, 'mcp')"
                     >
                       {{ server.state === 'Connected' ? 'Disconnect' : 'Connect' }}
                     </button>
                     <button class="btn btn-sm btn-secondary action-btn-spacing" @click="handleRemoveServer(server.id)">Remove</button>
                   </td>
                 </tr>
              </tbody>
            </table>
          </div>
         </div>

         <!-- Spacer -->
         <div class="section-spacer"></div>

         <!-- Virtual MCP Servers Table -->
         <div class="mcp-table-section">
          <div class="table-header">
            <div class="table-title">
              <h2>Virtual MCP Servers</h2>
            </div>
          </div>
          <div class="table-container">
            <table class="table table-striped">
              <thead>
                <tr>
                  <th>State</th>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="server in allVirtualMcpServers" :key="server.id">
                  <td>
                    <span :class="['state-badge badge', getBadgeClass(server.state)]">{{ server.state }}</span>
                  </td>
                  <td>{{ server.name }}</td>
                  <td>{{ server.description || 'Virtual MCP server instance' }}</td>
                  <td>
                    <button class="btn btn-sm btn-primary">Edit</button>
                     <button
                       :class="['btn btn-sm action-btn-spacing', server.state === 'Connected' ? 'btn-warning' : 'btn-success']"
                       @click="handleToggleConnection(server.id, 'virtual')"
                     >
                       {{ server.state === 'Connected' ? 'Disconnect' : 'Connect' }}
                     </button>
                    <button class="btn btn-sm btn-secondary action-btn-spacing">Remove</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

     <!-- Create Virtual MCP Modal -->
     <div v-if="showCreateModal" class="modal-overlay" @click="showCreateModal = false">
       <div class="modal-content" @click.stop>
         <div class="modal-header">
           <h3>Create Virtual MCP Server</h3>
           <button @click="showCreateModal = false">&times;</button>
         </div>
         <div class="modal-body">
           <p><strong>Coming Soon!</strong></p>
           <p>The Create Virtual MCP Server form will include:</p>
           <ul>
             <li>Server configuration options</li>
             <li>Connection settings</li>
             <li>Model selection</li>
             <li>Performance tuning</li>
           </ul>
         </div>
          <div class="modal-footer">
            <button @click="showCreateModal = false" class="btn btn-secondary">Close</button>
          </div>
        </div>
    </div>
  </div>
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
    "title": "SUSE Multi Linux Manager MCP Server",
    "description": "Model Context Protocol Server for Uyuni Server management and automation,to be used and configured as a tool for AI. Instead of interacting with the Trento server solely through the web UI, you can now interact with it directly from an AI, a chat interface, or an agent.",
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
    "description": "Model Context Protocol Server for Rancher management and automation,to be used and configured as a tool for AI. Instead of interacting with the Trento server solely through the web UI, you can now interact with it directly from an AI, a chat interface, or an agent.",
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
  name: 'VirtualMCP',

  metaInfo() {
    return {
      title: 'Virtual MCP'
    };
  },

  setup() {
    const store = useStore()

    // Service enablement check
    const proxyInstalled = computed(() => store.state.suseai.settings.proxyInstalled)
    const selectedServices = computed(() => store.state.suseai.settings.selectedServices)
    const isEnabled = computed(() => proxyInstalled.value && selectedServices.value.includes('virtual-mcp'))

    // Modal state for create MCP server
    const showCreateModal = ref(false);

    // Loading state
    const isLoading = ref(true);

    // Mock data for MCP Servers (only SUSE servers, always connected)
    const mcpServers = ref([
      {
        id: 1,
        name: 'SUSE Multi-Linux Manager MCP Server',
        type: 'Installed MCP server',
        state: 'Connected'
      },
      {
        id: 2,
        name: 'Rancher MCP server',
        type: 'Installed MCP server',
        state: 'Connected'
      }
    ]);

    // Mock data for Virtual MCP Servers with renamed titles
    const allVirtualMcpServers = ref([
      {
        id: 4,
        name: 'ITOps',
        description: 'Provides current weather information and forecasts',
        state: 'Connected'
      },
      {
        id: 5,
        name: 'L3 Support Datacenter',
        description: 'A comprehensive tool that can answer questions about anything',
        state: 'Disconnected'
      },
      {
        id: 6,
        name: 'Customer Success Story',
        description: 'Provides current time and date information',
        state: 'Connected'
      }
    ]);

    // Methods
    const handleToggleConnection = (serverId: number, type: string) => {
      if (type === 'mcp') {
        const server = mcpServers.value.find((s: any) => s.id === serverId);
        if (server) {
          if (serverId === 2) { // Rancher
            if (server.state === 'Connected') {
              server.state = 'Disconnected';
              // Set ITOps to Warning after 3 seconds
              setTimeout(() => {
                const itops = allVirtualMcpServers.value.find((s: any) => s.id === 4);
                if (itops) itops.state = 'Warning';
              }, 3000);
              // Set L3 Support to Warning after 4 seconds
              setTimeout(() => {
                const l3 = allVirtualMcpServers.value.find((s: any) => s.id === 5);
                if (l3) l3.state = 'Warning';
              }, 4000);
            } else {
              server.state = 'Connected';
              // Set ITOps to Connected after 3 seconds
              setTimeout(() => {
                const itops = allVirtualMcpServers.value.find((s: any) => s.id === 4);
                if (itops) itops.state = 'Connected';
              }, 3000);
              // Set L3 Support to Disconnected after 3 seconds
              setTimeout(() => {
                const l3 = allVirtualMcpServers.value.find((s: any) => s.id === 5);
                if (l3) l3.state = 'Disconnected';
              }, 3000);
            }
          } else {
            server.state = server.state === 'Connected' ? 'Disconnected' : 'Connected';
          }
        }
      } else if (type === 'virtual') {
        const server = allVirtualMcpServers.value.find((s: any) => s.id === serverId);
        if (server) {
          if (serverId === 4 || serverId === 5) { // ITOps or L3 Support
            server.state = server.state === 'Connected' ? 'Warning' : 'Connected';
          } else {
            server.state = server.state === 'Connected' ? 'Disconnected' : 'Connected';
          }
        }
      }
    };

    const handleRemoveServer = (serverId: number) => {
      // For mock, just log
      console.log('Remove server:', serverId);
    };

    // Helper method for badge classes
    const getBadgeClass = (state: string) => {
      switch (state) {
        case 'Connected': return 'badge-success';
        case 'Disconnected': return 'badge-danger';
        case 'Error': return 'badge-warning';
        case 'Online': return 'badge-success';
        case 'Warning': return 'badge-warning';
        case 'Offline': return 'badge-danger';
        default: return 'badge-secondary';
      }
    };

    // Load data on mount
    onMounted(() => {
      isLoading.value = true;
      // Mock data is already available
      isLoading.value = false;
    });

    return {
      isEnabled,
      showCreateModal,
      mcpServers,
      allVirtualMcpServers,
      handleToggleConnection,
      handleRemoveServer,
      getBadgeClass,
      isLoading
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

 .virtual-mcp-page {
  padding: 20px;
  background: #f8f9fa;
  min-height: 100vh;
}

/* Header Section */
.header-section {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 30px;
  background: white;
  padding: 24px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.title-section .main-title {
  font-size: 2rem;
  font-weight: 600;
  color: #3d98d3;
  margin: 0 0 8px 0;
}

.title-section .subtitle {
  color: #6c757d;
  font-size: 1.1rem;
  margin: 0;
}

.action-buttons {
  display: flex;
  gap: 12px;
}

/* Filter Section */
.filter-section {
  margin-bottom: 20px;
  display: flex;
  justify-content: flex-end;
}

.search-box .form-control {
  width: 300px;
  padding: 8px 12px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 14px;
}

/* Metrics Section */
.metrics-section {
  margin-bottom: 30px;
}

.metrics-card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  padding: 24px;
  display: flex;
  justify-content: space-around;
  gap: 40px;
}

.metric-item {
  text-align: center;
  flex: 1;
}

.metric-value {
  font-size: 2.5rem;
  font-weight: 700;
  color: #3d98d3;
  margin-bottom: 8px;
}

.metric-label {
  color: #6c757d;
  font-size: 0.9rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Table Section */
.mcp-table-section {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.section-spacer {
  height: 40px;
}

.table-header {
  padding: 20px 24px;
  border-bottom: 1px solid #e9ecef;
}

.table-title h2 {
  font-size: 1.5rem;
  font-weight: 600;
  color: #495057;
  margin: 0;
}

.table-container {
  overflow-x: auto;
}

.table th:nth-child(1), .table td:nth-child(1) {
  width: 15%;
}

.table th:nth-child(2), .table td:nth-child(2) {
  width: 25%;
}

.table th:nth-child(3), .table td:nth-child(3) {
  width: 40%;
}

.table th:nth-child(4), .table td:nth-child(4) {
  width: 20%;
}

.table {
  width: 100%;
  margin: 0;
  background: white;
}

.table th {
  background: #f8f9fa;
  border-bottom: 2px solid #dee2e6;
  padding: 12px 16px;
  font-weight: 600;
  color: #495057;
  text-align: left;
  position: sticky;
  top: 0;
}

.table td {
  padding: 12px 16px;
  border-bottom: 1px solid #dee2e6;
  vertical-align: middle;
}

.table tbody tr:hover {
  background: #f8f9fa;
}

/* Table cell content spacing */
.state-badge {
  margin-left: 12px;
}

.action-btn-spacing {
  margin-left: 8px;
}

/* Buttons */
.btn {
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  display: inline-block;
  text-align: center;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.btn-primary {
  background: #3d98d3;
  color: white;
}

.btn-primary:hover {
  background: #2c7da0;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #5a6268;
}

.btn-success {
  background: #28a745;
  color: white;
}

.btn-success:hover {
  background: #218838;
}

.btn-warning {
  background: #ffc107;
  color: #212529;
}

.btn-warning:hover {
  background: #e0a800;
}

.btn-sm {
  padding: 4px 8px;
  font-size: 12px;
}

/* Badges */
.badge {
  display: inline-block;
  padding: 4px 8px;
  font-size: 12px;
  font-weight: 500;
  border-radius: 4px;
  text-align: center;
}

.badge-success {
  background: #28a745;
  color: white;
}

.badge-warning {
  background: #ffc107;
  color: #212529;
  animation: pulse 1s infinite;
}

.badge-danger {
  background: #dc3545;
  color: white;
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}

/* Loading State */
.loading-section {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin: 20px 0;
}

.loading-spinner {
  text-align: center;
  color: #6c757d;
}

.loading-spinner i {
  font-size: 2rem;
  margin-bottom: 12px;
  color: #3d98d3;
}

.loading-spinner p {
  margin: 0;
  font-size: 1.1rem;
}

/* Responsive */
@media (max-width: 768px) {
  .header-section {
    flex-direction: column;
    gap: 16px;
  }

  .action-buttons {
    width: 100%;
    justify-content: flex-end;
  }

  .search-box .form-control {
    width: 100%;
  }

  .metrics-card {
    flex-direction: column;
    gap: 20px;
    text-align: center;
  }

  .metric-value {
    font-size: 2rem;
  }
}

/* Modal styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  max-width: 500px;
  width: 90%;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e9ecef;
}

.modal-header h3 {
  margin: 0;
  color: #3d98d3;
}

.modal-body {
  padding: 20px;
}

.modal-body ul {
  margin: 16px 0;
  padding-left: 20px;
}

.modal-body li {
  margin-bottom: 8px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px;
  border-top: 1px solid #e9ecef;
}
</style>