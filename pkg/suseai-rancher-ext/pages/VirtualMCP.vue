<template>
  <div v-if="!isEnabled" class="blank-page">
    <p>Please enable the service through the SUSE AI Universal Proxy installation wizard.</p>
  </div>
  <div v-else>
    <div class="experimental-banner">
      <span class="banner-icon">⚠️</span>
      <strong>Virtual MCP Service</strong>
      <p>Transform various data sources into MCP (Model Context Protocol) servers. Connect APIs, databases, and GraphQL schemas to AI assistants.</p>
    </div>

    <div class="virtual-mcp-page">
      <!-- Header Section -->
      <div class="header-section">
        <div class="title-section">
          <h1 class="main-title">Virtual MCP</h1>
          <p class="subtitle">Transform data sources into MCP servers for AI assistants</p>
        </div>
        <div class="action-buttons">
          <button class="btn btn-primary" @click="openCreateWizard">
            <i class="icon icon-plus"></i>
            Create Server
          </button>
        </div>
      </div>

      <!-- Metrics Section -->
      <MetricsGrid :metrics="metrics" :loading="loading" />

       <!-- Servers Table -->
       <MCPServersTable
         :servers="servers"
         :loading="loading"
         :error="error"
         :pagination="pagination"
         @createServer="openCreateWizard"
         @viewServer="viewServer"
         @editServer="editServer"
         @deleteServer="confirmDeleteServer"
         @changePage="changePage"
       />

       <!-- Create Server Wizard -->
       <CreateServerWizard
         :show="showCreateWizard"
         :available-servers="servers"
         :creating="creating"
         @close="closeCreateWizard"
         @transform="handleTransformServer"
         @create="handleCreateServer"
       />

       <!-- Edit Server Modal -->
       <EditServerModal
         :show="showEditWizard"
         :server="editingServer"
         :updating="updating"
         @close="closeEditWizard"
         @update="handleUpdateServer"
       />

      <!-- Server Details Modal (placeholder for now) -->
      <div v-if="selectedServer" class="modal-overlay" @click="closeServerDetails">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <h3>Server Details: {{ selectedServer.name }}</h3>
            <button @click="closeServerDetails">&times;</button>
          </div>
          <div class="modal-body">
            <div class="server-details">
              <div class="detail-section">
                <h4>Basic Information</h4>
                <dl class="info-list">
                  <dt>Name:</dt>
                  <dd>{{ selectedServer.name }}</dd>
                  <dt>Description:</dt>
                  <dd>{{ selectedServer.description || 'No description' }}</dd>
                  <dt>Status:</dt>
                  <dd>{{ selectedServer.status || 'Unknown' }}</dd>
                  <dt>Created:</dt>
                  <dd>{{ selectedServer.created_at ? new Date(selectedServer.created_at).toLocaleString() : 'Unknown' }}</dd>
                </dl>
              </div>

               <div class="detail-section">
                 <h4>Capabilities</h4>
                 <div class="capabilities">
                   <div class="capability">
                     <strong>Tools:</strong> {{ selectedServer.tools?.length || 0 }}
                   </div>
                   <div class="capability">
                     <strong>Resources:</strong> {{ selectedServer.resources?.length || 0 }}
                   </div>
                   <div class="capability">
                     <strong>Prompts:</strong> {{ selectedServer.prompts?.length || 0 }}
                   </div>
                 </div>
               </div>

               <!-- Tools Section -->
               <div v-if="selectedServer.tools && selectedServer.tools.length > 0" class="detail-section">
                 <h4>Tools</h4>
                 <div class="tools-list">
                   <div v-for="(tool, index) in selectedServer.tools" :key="index" class="tool-item">
                     <div class="tool-header">
                       <h5>{{ tool.title || tool.name }}</h5>
                       <code class="tool-name">{{ tool.name }}</code>
                     </div>
                     <div class="tool-details">
                       <p v-if="tool.description" class="tool-description">{{ tool.description }}</p>
                       <div v-if="tool.inputSchema" class="tool-schema">
                         <strong>Input Schema:</strong>
                         <pre>{{ JSON.stringify(tool.inputSchema, null, 2) }}</pre>
                       </div>
                       <div v-if="tool.annotations && Object.keys(tool.annotations).length > 0" class="tool-annotations">
                         <strong>Annotations:</strong>
                         <pre>{{ JSON.stringify(tool.annotations, null, 2) }}</pre>
                       </div>
                     </div>
                   </div>
                 </div>
               </div>
            </div>
          </div>
          <div class="modal-footer">
            <button @click="closeServerDetails" class="btn btn-secondary">Close</button>
          </div>
        </div>
      </div>

      <!-- Delete Confirmation Modal -->
      <div v-if="serverToDelete" class="modal-overlay" @click="cancelDelete">
        <div class="modal-content small-modal" @click.stop>
          <div class="modal-header">
            <h3>Delete Server</h3>
            <button @click="cancelDelete">&times;</button>
          </div>
          <div class="modal-body">
            <p>Are you sure you want to delete the server <strong>{{ serverToDelete.name }}</strong>?</p>
            <p class="warning-text">This action cannot be undone.</p>
          </div>
          <div class="modal-footer">
            <button @click="cancelDelete" class="btn btn-secondary">Cancel</button>
            <button @click="proceedDelete" class="btn btn-danger">Delete</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onActivated } from 'vue';
import { useStore } from 'vuex';
import { useVirtualMCP } from '../composables/useVirtualMCP';
import MetricsGrid from '../components/VirtualMCP/MetricsGrid.vue';
import MCPServersTable from '../components/VirtualMCP/MCPServersTable.vue';
import CreateServerWizard from '../components/VirtualMCP/CreateServerWizard.vue';
import EditServerModal from '../components/VirtualMCP/EditServerModal.vue';
import type { MCPServer, CreateServerForm } from '../types/virtual-mcp-types';

// Store access
const store = useStore();

// Service enablement check
const proxyInstalled = computed(() => store.state.suseai.settings.proxyInstalled);
const selectedServices = computed(() => store.state.suseai.settings.selectedServices);
const isEnabled = computed(() => proxyInstalled.value && selectedServices.value.includes('virtual-mcp'));

// Virtual MCP composable
const {
  servers,
  loading,
  error,
  pagination,
  metrics,
  showCreateModal,
  creating,
  createServer,
  updateServer,
  deleteServer,
  resetCreateForm,
  fetchData
} = useVirtualMCP();

// Data loading is handled manually when the page is activated
onActivated(() => {
  fetchData();
});

// Local state
const showCreateWizard = ref(false);
const showEditWizard = ref(false);
const selectedServer = ref<MCPServer | null>(null);
const editingServer = ref<MCPServer | null>(null);
const serverToDelete = ref<MCPServer | null>(null);
const updating = ref(false);

// Methods
const openCreateWizard = () => {
  resetCreateForm();
  showCreateWizard.value = true;
};

const closeCreateWizard = () => {
  showCreateWizard.value = false;
};

const handleTransformServer = async (form: CreateServerForm) => {
  // This will be called when the user clicks Next from the source step
  // For now, we'll just proceed to the next step
  // In the future, this could trigger the actual transformation API call
  console.log('Transforming server with data:', form);
};

const handleCreateServer = async (form: CreateServerForm) => {
  const result = await createServer(form);
  if (result) {
    showCreateWizard.value = false;
  }
};

const viewServer = (server: MCPServer) => {
  selectedServer.value = server;
};

const closeServerDetails = () => {
  selectedServer.value = null;
};

const editServer = (server: MCPServer) => {
  editingServer.value = server;
  showEditWizard.value = true;
};

const closeEditWizard = () => {
  showEditWizard.value = false;
  editingServer.value = null;
};

const handleUpdateServer = async (updatedServer: MCPServer) => {
  if (!editingServer.value?.id) return;

  updating.value = true;
  try {
    const result = await updateServer(editingServer.value.id, updatedServer);
    if (result) {
      showEditWizard.value = false;
      editingServer.value = null;
    }
  } catch (err) {
    console.error('Failed to update server:', err);
  } finally {
    updating.value = false;
  }
};

const confirmDeleteServer = (server: MCPServer) => {
  serverToDelete.value = server;
};

const cancelDelete = () => {
  serverToDelete.value = null;
};

const proceedDelete = async () => {
  if (serverToDelete.value?.id) {
    const success = await deleteServer(serverToDelete.value.id);
    if (success) {
      serverToDelete.value = null;
    }
  }
};

const changePage = (offset: number) => {
  // TODO: Implement pagination
  console.log('Change page to offset:', offset);
};
</script>

 <style scoped>
.blank-page {
  text-align: center;
  padding: 50px;
  font-size: 18px;
  color: #666;
}
  /* Service Banner */
  .experimental-banner {
    background: #e3f2fd;
    border: 1px solid #bbdefb;
    border-radius: 8px;
    padding: 16px 20px;
    margin: 16px 24px 0;
    display: flex;
    align-items: flex-start;
    gap: 12px;
    color: #e0a800;
  }

  .banner-icon {
    font-size: 20px;
    flex-shrink: 0;
  }

  .experimental-banner strong {
    font-weight: 600;
    color: #ffc107;
  }

  .experimental-banner p {
    margin: 0;
    font-size: 14px;
    line-height: 1.5;
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
    color: #16a34a;
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
    background: #16a34a;
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background: #15803d;
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
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 100% !important;
    height: 100% !important;
    background: rgba(0, 0, 0, 0.5) !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    z-index: 1000 !important;
  }

  .modal-content {
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    max-width: 600px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
  }

  .small-modal {
    max-width: 400px;
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
    color: #16a34a;
  }

  .modal-body {
    padding: 20px;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding: 20px;
    border-top: 1px solid #e9ecef;
  }

  .server-details {
    max-width: none;
  }

  .detail-section {
    margin-bottom: 24px;
    padding: 16px;
    background: #f8f9fa;
    border-radius: 6px;
  }

  .detail-section h4 {
    margin: 0 0 12px 0;
    color: #495057;
    font-size: 16px;
  }

  .info-list {
    display: grid;
    grid-template-columns: 120px 1fr;
    gap: 8px 16px;
    margin: 0;
  }

  .info-list dt {
    font-weight: 500;
    color: #6c757d;
  }

  .info-list dd {
    margin: 0;
    color: #495057;
  }

  .capabilities {
    display: flex;
    gap: 20px;
  }

  .capability {
    text-align: center;
  }

  .capability strong {
    display: block;
    color: #495057;
    margin-bottom: 4px;
  }

  .warning-text {
    color: #dc3545;
    font-weight: 500;
    margin: 8px 0 0 0;
  }

  /* Tools Section */
  .tools-list {
    max-height: 400px;
    overflow-y: auto;
  }

  .tool-item {
    border: 1px solid #e9ecef;
    border-radius: 6px;
    padding: 12px;
    margin-bottom: 12px;
    background: #f8f9fa;
  }

  .tool-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 8px;
  }

  .tool-header h5 {
    margin: 0;
    color: #16a34a;
    font-size: 16px;
  }

  .tool-name {
    background: #e9ecef;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 12px;
    color: #6c757d;
  }

  .tool-details {
    margin-top: 8px;
  }

  .tool-description {
    margin: 0 0 8px 0;
    color: #495057;
    font-style: italic;
  }

  .tool-schema, .tool-annotations {
    margin-top: 8px;
  }

  .tool-schema strong, .tool-annotations strong {
    color: #495057;
    font-weight: 600;
  }

  .tool-schema pre, .tool-annotations pre {
    background: white;
    border: 1px solid #dee2e6;
    border-radius: 4px;
    padding: 8px;
    margin: 4px 0 0 0;
    font-size: 12px;
    overflow-x: auto;
    max-height: 150px;
    overflow-y: auto;
  }
</style>