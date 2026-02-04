<template>
   <div class="announced-mcps-section">
     <table class="mcps-table">
       <thead>
         <tr>
           <th>Name</th>
           <th>Endpoint</th>
           <th>Availability</th>
           <th>Last Seen</th>
           <th>Tools</th>
           <th>Actions</th>
         </tr>
       </thead>
       <tbody>
         <tr v-if="loading">
           <td colspan="6" class="loading-row">
             <i class="icon icon-spinner icon-spin"></i>
             Loading announced MCPs...
           </td>
         </tr>
         <tr v-else-if="items.length === 0">
           <td colspan="6" class="empty-row">
             <i class="icon icon-info"></i>
             No announced MCPs found.
           </td>
         </tr>
         <tr v-else v-for="mcp in items" :key="mcp.id">
           <td>
             <div class="mcp-name">{{ mcp.name }}</div>
           </td>
           <td class="mcp-endpoint">{{ mcp.ip }}:{{ mcp.port }}</td>
           <td>
             <span :class="['status-badge', getAvailabilityClass(mcp.availability)]">
               {{ mcp.availability }}
             </span>
           </td>
           <td>{{ formatDate(mcp.lastSeen) }}</td>
           <td>
             <span class="tools-count">{{ mcp.toolsCount }} tools</span>
           </td>
           <td>
             <button
               class="btn btn-sm role-primary"
               @click="$emit('register', mcp)"
               :disabled="isConnectDisabled(mcp.availability)"
               :title="isConnectDisabled(mcp.availability) ? 'Cannot connect when ' + mcp.availability.toLowerCase() : 'Create Adapter'"
             >
               <i class="icon icon-plus"></i>
               Create Adapter
             </button>
           </td>
         </tr>
       </tbody>
     </table>
   </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'AnnouncedMCPsTable',
  props: {
    items: {
      type: Array,
      default: () => []
    },
    loading: {
      type: Boolean,
      default: false
    }
  },
  emits: ['register'],
  setup() {
    const getAvailabilityClass = (status: string) => {
      switch (status?.toLowerCase()) {
        case 'available':
        case 'online':
          return 'status-available';
        case 'busy':
          return 'status-busy';
        case 'offline':
          return 'status-offline';
        default:
          return 'status-unknown';
      }
    };

    const isConnectDisabled = (status: string) => {
      const s = status?.toLowerCase();
      return s === 'offline' || s === 'busy';
    };

    const formatDate = (dateString?: string) => {
      if (!dateString) return 'N/A';
      try {
        return new Date(dateString).toLocaleString();
      } catch {
        return dateString;
      }
    };

    return {
      getAvailabilityClass,
      isConnectDisabled,
      formatDate
    };
  }
});
</script>

<style scoped>
.announced-mcps-section {
  margin-top: 20px;
}

.mcps-table {
  width: 100%;
  border-collapse: collapse;
  background: var(--card-bg, #ffffff);
  border: 1px solid var(--border, #e5e7eb);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.mcps-table th {
  background: var(--accent-bg, #f9fafb);
  padding: 12px 16px;
  text-align: left;
  font-weight: 600;
  color: var(--body-text, #111827);
  border-bottom: 1px solid var(--border, #e5e7eb);
}

.mcps-table td {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border, #e5e7eb);
  vertical-align: middle;
}

.mcp-name {
  font-weight: 500;
  color: var(--primary, #007bff);
}

.mcp-endpoint {
  font-family: monospace;
  color: var(--body-text, #111827);
}

.status-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
}

.status-available {
  background: #d4edda;
  color: #155724;
}

.status-busy {
  background: #fff3cd;
  color: #856404;
}

.status-offline {
  background: #f8d7da;
  color: #721c24;
}

.status-unknown {
  background: #e2e6ea;
  color: #383d41;
}

.tools-count {
  font-size: 12px;
  color: var(--muted, #6b7280);
  background: var(--accent-bg, #f3f4f6);
  padding: 2px 8px;
  border-radius: 10px;
}

.loading-row,
.empty-row {
  text-align: center;
  color: var(--muted, #6b7280);
  font-style: italic;
  padding: 24px;
}

.btn {
  padding: 6px 12px;
  border: 1px solid transparent;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;
}

.role-primary {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

.role-primary:hover {
  background: #0056b3;
}

.icon {
  font-size: 14px;
}
</style>