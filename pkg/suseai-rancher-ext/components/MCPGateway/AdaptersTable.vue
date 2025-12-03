<template>
  <div class="endpoints-section">
     <h2>Registered MCP Adapters</h2>
    <table class="endpoints-table">
       <thead>
         <tr>
            <th>Name</th>
            <th>Status</th>
            <th>Protocol</th>
            <th>Original Endpoint</th>
            <th>Errors</th>
           <th>Last Active</th>
           <th>Actions</th>
         </tr>
       </thead>
       <tbody>
         <tr v-if="loading">
           <td colspan="7" class="loading-row">Loading adapters...</td>
         </tr>
         <tr v-else-if="error">
           <td colspan="7" class="error-row">{{ error }}</td>
         </tr>
         <tr v-else-if="adapters.length === 0">
           <td colspan="7" class="empty-row">No adapters registered</td>
         </tr>
         <tr v-else v-for="adapter in adapters" :key="adapter.id">
           <td>{{ adapter.name }}</td>
             <td>
               <span :class="getStatusClass(adapter)">
                 {{ getStatusText(adapter) }}
               </span>
             </td>
           <td>{{ adapter.protocol || 'MCP' }}</td>
             <td>{{ adapter.originalServer?.host || '-' }}</td>
           <td>{{ adapter.errorCount || 0 }}</td>
           <td>{{ adapter.lastActive ? new Date(adapter.lastActive).toLocaleString() : 'Never' }}</td>
           <td>
             <div class="action-buttons">
               <button class="btn btn-sm role-secondary" @click="handleViewDetails(adapter)" title="View Details">
                 <i class="icon icon-info"></i>
               </button>
               <button class="btn btn-sm role-secondary" @click="handleViewLogs(adapter)" title="View Logs">
                 <i class="icon icon-file"></i>
               </button>
               <button class="btn btn-sm role-secondary" @click="handleEditAdapter(adapter)" title="Edit">
                 <i class="icon icon-edit"></i>
               </button>
               <button class="btn btn-sm role-secondary" @click="handleDeleteAdapter(adapter)" title="Delete">
                 <i class="icon icon-trash"></i>
               </button>
             </div>
           </td>
         </tr>
       </tbody>
     </table>
    
     <!-- Adapter Details Modal -->
     <AdapterDetailsModal
       :show="showAdapterDetailsModal"
       :adapter-data="selectedAdapter"
       @close="closeAdapterDetailsModal"
     />
   </div>
</template>

 <script lang="ts">
import { defineComponent, ref } from 'vue';
import { MCPService } from '../../services/mcp-service';
import type { AdapterResource } from '../../types/mcp-types';
import AdapterDetailsModal from '../shared/AdapterDetailsModal.vue';

export default defineComponent({
  name: 'AdaptersTable',
  components: {
    AdapterDetailsModal
  },
  props: {
    adapters: {
      type: Array as () => AdapterResource[],
      default: () => []
    },
    loading: {
      type: Boolean,
      default: false
    },
    error: {
      type: String,
      default: null
    },
    pingResults: {
      type: Object as () => Record<string, boolean>,
      default: () => ({})
    }
  },
  emits: ['view-details', 'view-logs', 'edit-adapter', 'delete-adapter', 'refresh-adapters'],
  setup(props, { emit }) {
       const showAdapterDetailsModal = ref(false);
       const selectedAdapter = ref<AdapterResource | null>(null);

      const handleViewDetails = async (adapter: AdapterResource) => {
        try {
          // Fetch full adapter details including authentication token
          const adapterDetails = await MCPService.getAdapterDetails(adapter.name);
          selectedAdapter.value = adapterDetails || adapter;
          showAdapterDetailsModal.value = true;
        } catch (error) {
          console.error('Error fetching adapter details:', error);
          // Fallback to basic adapter info if details fetch fails
          selectedAdapter.value = adapter;
          showAdapterDetailsModal.value = true;
        }
      };

     const handleViewLogs = (adapter: AdapterResource) => {
       emit('view-logs', adapter);
     };

     const handleEditAdapter = (adapter: AdapterResource) => {
       emit('edit-adapter', adapter);
     };

      const handleDeleteAdapter = (adapter: AdapterResource) => {
        emit('delete-adapter', adapter);
      };

        const closeAdapterDetailsModal = () => {
          showAdapterDetailsModal.value = false;
          selectedAdapter.value = null;
        };

       const getStatusClass = (adapter: AdapterResource) => {
         const isAvailable = props.pingResults[adapter.name];
         return isAvailable ? 'status-active badge badge-success' : 'status-inactive badge badge-secondary';
       };

       const getStatusText = (adapter: AdapterResource) => {
         const isAvailable = props.pingResults[adapter.name];
         return isAvailable ? 'Available' : 'Checking...';
       };

       return {
         showAdapterDetailsModal,
         selectedAdapter,
         handleViewDetails,
         handleViewLogs,
         handleEditAdapter,
         handleDeleteAdapter,
         closeAdapterDetailsModal,
         getStatusClass,
         getStatusText
       };
   }
 });
</script>

<style scoped>
.endpoints-section {
  margin-top: 40px;
}

.endpoints-section h2 {
  margin-bottom: 20px;
  color: var(--body-text, #111827);
}

.endpoints-table {
  width: 100%;
  border-collapse: collapse;
  background: var(--card-bg, #ffffff);
  border: 1px solid var(--border, #e5e7eb);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.endpoints-table th,
.endpoints-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid var(--border, #e5e7eb);
}

.endpoints-table th {
  background: var(--accent-bg, #f9fafb);
  font-weight: 600;
  color: var(--body-text, #111827);
}

.endpoints-table tbody tr:hover {
  background: var(--accent-bg, #f9fafb);
}

.status-active {
  color: var(--success, #16a34a);
  font-weight: 500;
}

.status-inactive {
  color: var(--muted, #6b7280);
  font-weight: 500;
}

/* Badge styles for status */
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

.badge-secondary {
  background: #6c757d;
  color: white;
}

.endpoints-table .loading-row,
.endpoints-table .error-row,
.endpoints-table .empty-row {
  text-align: center;
  color: var(--muted, #6b7280);
  font-style: italic;
  padding: 20px;
}

.endpoints-table .error-row {
  color: var(--error, #dc2626);
}

.action-buttons {
  display: flex;
  gap: 12px;
  margin: 24px 0;
  flex-wrap: wrap;
}
</style>