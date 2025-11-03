  <template>
    <div v-if="!isEnabled" class="blank-page">
      <p>Please enable the service through the SUSE AI Universal Proxy installation wizard.</p>
    </div>
      <div v-else class="smart-agents-page">
        <div class="experimental-banner">
          <span class="banner-icon">⚠️</span>
          <strong>Experimental Feature</strong>
          <p>This SUSE AI Universal Proxy feature is experimental and may not be fully compatible with all providers. <a href="https://github.com/SUSE/suse-ai-up/issues" target="_blank">Report Issue</a> or <a href="https://github.com/SUSE/suse-ai-up/pulls" target="_blank">Submit PR</a> to help improve compatibility.</p>
        </div>
      <!-- Header Section -->
     <div class="header-section">
       <div class="title-section">
         <h1 class="main-title">Smart Agents</h1>
         <p class="subtitle">Manage and monitor your intelligent smart agents</p>
       </div>
        <div class="action-buttons">
          <button class="btn btn-primary" @click="openCreateModal">Create Smart Agent</button>
          <button class="btn btn-secondary" @click="openImportModal">Import Agent</button>
          <button class="btn btn-outline-primary" @click="fetchAgents">Refresh</button>
       </div>
     </div>

     <!-- Metrics Section -->
     <div class="metrics-section">
       <div class="metrics-card">
         <div class="metric-item">
           <div class="metric-value">{{ agentsRunning }}</div>
           <div class="metric-label">Running</div>
         </div>
         <div class="metric-item">
           <div class="metric-value">{{ agentsIdle }}</div>
           <div class="metric-label">Idle</div>
         </div>
         <div class="metric-item">
           <div class="metric-value">{{ totalTokens }}</div>
           <div class="metric-label">Total Tokens</div>
         </div>
         <div class="metric-item">
           <div class="metric-value">{{ totalRequests }}</div>
           <div class="metric-label">Total Requests</div>
         </div>
         <div class="metric-item">
           <div class="metric-value">${{ totalCost }}</div>
           <div class="metric-label">Total Cost</div>
         </div>
       </div>
     </div>

     <!-- Agents Table Section -->
     <div class="agents-table-section">
       <div class="table-header">
         <div class="table-title">
           <h2>Smart Agents</h2>
         </div>
       </div>
       <div class="table-container">
         <table class="table table-striped">
           <thead>
             <tr>
               <th>Name</th>
               <th>Type</th>
               <th>Status</th>
               <th>State</th>
               <th>Supervisor</th>
               <th>Worker</th>
               <th>Tokens</th>
               <th>Requests</th>
               <th>Cost</th>
               <th>Actions</th>
             </tr>
           </thead>
           <tbody>
             <tr v-for="agent in smartAgents" :key="agent.id">
               <td>{{ agent.name }}</td>
               <td>{{ agent.type }}</td>
               <td>
                 <span :class="['badge', getBadgeClass(agent.status)]">{{ agent.status }}</span>
               </td>
               <td>{{ agent.state }}</td>
               <td>{{ getSupervisorInfo(agent) }}</td>
               <td>{{ getWorkerInfo(agent) }}</td>
               <td>{{ agent.totalTokens || 0 }}</td>
               <td>{{ agent.totalRequests || 0 }}</td>
               <td>${{ agent.totalCost || 0 }}</td>
               <td>
                 <button class="btn btn-sm btn-primary action-btn-spacing" @click="viewAgent(agent.id)">View</button>
                 <button class="btn btn-sm btn-secondary action-btn-spacing" @click="editAgentAction(agent.id)">Edit</button>
                 <button class="btn btn-sm btn-danger action-btn-spacing" @click="deleteAgent(agent.id)">Delete</button>
               </td>
             </tr>
           </tbody>
         </table>
       </div>
     </div>

     <!-- Modals -->
     <CreateSmartAgent ref="createAgentRef" @agent-created="onAgentCreated" @agent-updated="onAgentUpdated" />
     <ImportAgentModal ref="importAgentRef" @agent-imported="onAgentImported" />
     <AgentDetailsModal ref="detailsAgentRef" />
   </div>
</template>

<script setup lang="ts">
  import { ref, computed, onMounted, onUnmounted } from 'vue';
  import { useStore } from 'vuex';
import CreateSmartAgent from './components/create-smart-agent.vue';
import ImportAgentModal from './components/import-agent-modal.vue';
import AgentDetailsModal from './components/agent-details-modal.vue';

const store = useStore();

// Service enablement check
const proxyInstalled = computed(() => store.state.suseai.settings.proxyInstalled);
const selectedServices = computed(() => store.state.suseai.settings.selectedServices);
const isEnabled = computed(() => proxyInstalled.value && selectedServices.value.includes('smart-agents'));

// Modal state for create agent
const createAgentRef = ref<any>(null);

// Modal state for import agent
const importAgentRef = ref<any>(null);

// Modal state for agent details
const detailsAgentRef = ref<any>(null);

  // Reactive data for agents (fetched from API)
  const agents = ref<any[]>([]);

  // Interval for regular updates
  const refreshInterval = ref<number | null>(null);

  // Fetch agents from API
  const fetchAgents = async () => {
    try {
      const response = await fetch('http://localhost:8910/agents');
      if (!response.ok) throw new Error('Failed to fetch agents');
      const apiAgents = await response.json();
      // Map API data to table format, using fake data for missing fields
      const checkAvailability = async (agentId: string) => {
        try {
          const response = await fetch(`http://localhost:8910/agents/${agentId}`);
          return response.ok ? 'available' : 'unavailable';
        } catch {
          return 'unavailable';
        }
      };

      agents.value = await Promise.all(apiAgents.map(async (agent: any) => {
        const state = await checkAvailability(agent.id);
        return {
          id: agent.id,
          name: agent.name || 'Unnamed Agent',
          type: 'smart agent', // Fake, since all are smart agents
          status: (agent.supervisor?.provider && agent.worker?.provider) ? 'Running' : 'Stopped',
          state: state,
          supervisor: agent.supervisor,
          worker: agent.worker,
          totalTokens: agent.totalTokens || 0,
          totalRequests: agent.totalRequests || 0,
          totalCost: agent.totalCost || 0
        };
      }));
    } catch (err) {
      console.error('Failed to fetch agents:', err);
      // Fallback to empty list
      agents.value = [];
    }
  };

   // On mount, fetch agents and start regular updates
   onMounted(() => {
     fetchAgents();
     refreshInterval.value = window.setInterval(fetchAgents, 5000); // Refresh every 5 seconds for real-time updates
   });

  // Cleanup interval on unmount
  onUnmounted(() => {
    if (refreshInterval.value) {
      clearInterval(refreshInterval.value);
    }
  });

// Methods for Smart Agents
const viewAgent = (agentId: string) => {
  const agent = agents.value.find(a => a.id === agentId);
  if (agent && detailsAgentRef.value) {
    detailsAgentRef.value.openModal(agent);
  }
};

const editAgent = (agentId: string) => {
  // This will be handled by the CreateSmartAgent component
  console.log('Edit agent:', agentId);
};

const deleteAgent = async (agentId: string) => {
  try {
    const response = await fetch(`http://localhost:8910/agents/${agentId}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete agent');
    fetchAgents(); // Refetch after delete
  } catch (err) {
    console.error('Delete failed:', err);
  }
};

const onAgentCreated = () => {
  fetchAgents(); // Refetch after creation
};

const onAgentUpdated = () => {
  fetchAgents(); // Refetch after update
};

const onAgentImported = () => {
  fetchAgents(); // Refetch after import
};

// Method to update agent tokens after chat API call
const updateAgentTokens = (agentId: string, tokens: number) => {
  const agent = agents.value.find(a => a.id === agentId);
  if (agent) {
    agent.totalTokens += tokens;
  }
};

// Computed data for Smart Agents
const smartAgents = computed(() => agents.value?.filter(agent => agent.type === 'smart agent') || []);
const agentsRunning = computed(() => smartAgents.value?.filter(agent => agent.state === 'available').length || 0);
const agentsIdle = computed(() => smartAgents.value?.filter(agent => agent.state === 'unavailable').length || 0);
const totalTokens = computed(() => smartAgents.value?.reduce((sum, agent) => sum + (agent.totalTokens || 0), 0) || 0);
const totalRequests = computed(() => smartAgents.value?.reduce((sum, agent) => sum + (agent.totalRequests || 0), 0) || 0);
const totalCost = computed(() => smartAgents.value?.reduce((sum, agent) => sum + (agent.totalCost || 0), 0) || 0);

const editAgentAction = (agentId: string) => {
  if (createAgentRef.value) {
    createAgentRef.value.openModal(agentId);
  }
};

// Helper methods
const getSupervisorInfo = (agent: any) => {
  const provider = agent.supervisor?.provider || 'N/A';
  const model = agent.supervisor?.model || 'N/A';
  return `${provider}/${model}`;
};

const getWorkerInfo = (agent: any) => {
  const provider = agent.worker?.provider || 'N/A';
  const model = agent.worker?.model || 'N/A';
  return `${provider}/${model}`;
};

// Helper method for badge classes
// const getBadgeClass = (state: string) => {
//   switch (state) {
//     case 'Active': return 'badge-success';
//     case 'Idle': return 'badge-warning';
//     case 'Error': return 'badge-danger';
//     case 'Online': return 'badge-success';
//     case 'Warning': return 'badge-warning';
//     case 'Offline': return 'badge-danger';
//     default: return 'badge-secondary';
//   }
// };

const openCreateModal = () => {
  if (createAgentRef.value) {
    createAgentRef.value.openModal();
  }
};

const openImportModal = () => {
  if (importAgentRef.value) {
    importAgentRef.value.openModal();
  }
};





// Helper method for badge classes
const getBadgeClass = (state: string) => {
  switch (state) {
    case 'available': return 'badge-success';
    case 'unavailable': return 'badge-danger';
    case 'Active': return 'badge-success';
    case 'Idle': return 'badge-warning';
    case 'Error': return 'badge-danger';
    case 'Online': return 'badge-success';
    case 'Warning': return 'badge-warning';
    case 'Offline': return 'badge-danger';
    default: return 'badge-secondary';
  }
};
</script>

<style scoped>
.blank-page {
  text-align: center;
  padding: 50px;
  font-size: 18px;
  color: #666;
}
.smart-agents-page {
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
.agents-table-section {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;
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

 .btn-outline-primary {
   background: transparent;
   color: #3d98d3;
   border: 1px solid #3d98d3;
 }

 .btn-outline-primary:hover {
   background: #3d98d3;
   color: white;
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

.btn-danger {
  background: #dc3545;
  color: white;
}

.btn-danger:hover {
  background: #c82333;
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
}

.badge-danger {
  background: #dc3545;
  color: white;
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

/* Table Section */
.agents-table-section {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;
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

/* Badges */
.badge {
  display: inline-block;
  padding: 4px 8px;
  font-size: 12px;
  font-weight: 500;
  border-radius: 12px;
  text-align: center;
}

.badge-success {
  background: #28a745;
  color: white;
}

.badge-warning {
  background: #ffc107;
  color: #212529;
}

.badge-danger {
  background: #dc3545;
  color: white;
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
</style>