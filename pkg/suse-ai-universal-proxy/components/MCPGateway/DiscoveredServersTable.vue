<template>
   <div class="discovered-servers-section">
     <table class="servers-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Address</th>
          <th>Port</th>
          <th>Protocol</th>
          <th>Status</th>
          <th>Risk</th>
          <th>Last Seen</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="loading">
          <td colspan="8" class="loading-row">
            <i class="icon icon-spinner icon-spin"></i>
            Loading discovered servers...
          </td>
        </tr>
        <tr v-else-if="discoveredServers.length === 0">
          <td colspan="8" class="empty-row">
            <i class="icon icon-info"></i>
            No servers discovered yet.
          </td>
        </tr>
        <tr v-else v-for="server in discoveredServers" :key="server.id">
          <td>{{ server.name || 'Unknown Server' }}</td>
          <td>{{ server.address }}</td>
          <td>{{ server.port }}</td>
          <td>{{ server.protocol }}</td>
          <td>
            <span :class="getStatusClass(server.status)" class="status-badge">
              {{ getStatusLabel(server.status) }}
            </span>
          </td>
          <td>
            <span v-if="server.vulnerability_score" :class="getRiskClass(server.vulnerability_score)">
              {{ server.vulnerability_score.toUpperCase() }}
            </span>
            <span v-else class="risk-unknown">UNKNOWN</span>
          </td>
          <td>{{ formatDate(server.lastSeen) }}</td>
          <td>
            <div class="action-buttons">
              <button
                class="btn btn-sm role-secondary"
                @click="handleViewServerDetails(server)"
                title="View Details"
              >
                <i class="icon icon-info"></i>
              </button>
              <button
                class="btn btn-sm role-primary"
                @click="handleRegisterServer(server)"
                :disabled="!canRegister(server)"
                title="Register Server"
              >
                <i class="icon icon-plus"></i>
              </button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script lang="ts">
import { defineComponent, watch } from 'vue';
import type { DiscoveredServer } from '../../services/discovery-api';

export default defineComponent({
  name: 'DiscoveredServersTable',
  props: {
    discoveredServers: {
      type: Array as () => DiscoveredServer[],
      default: () => []
    },
    loading: {
      type: Boolean,
      default: false
    },
    registeredServerIds: {
      type: Object as () => Set<string>,
      default: () => new Set<string>()
    }
  },
  emits: ['view-server-details', 'register-server'],
  setup(props, { emit }) {

    const getStatusClass = (status?: string): string => {
      switch (status) {
        case 'discovered':
        case 'ready':
          return 'status-healthy';
        case 'error':
        case 'failed':
          return 'status-unhealthy';
        default:
          return 'status-unknown';
      }
    };

    const getStatusLabel = (status?: string): string => {
      switch (status) {
        case 'discovered':
          return 'Discovered';
        case 'ready':
          return 'Ready';
        case 'error':
          return 'Error';
        case 'failed':
          return 'Failed';
        default:
          return 'Unknown';
      }
    };

    const getRiskClass = (score?: string): string => {
      switch (score) {
        case 'high':
          return 'risk-high';
        case 'medium':
          return 'risk-medium';
        case 'low':
          return 'risk-low';
        default:
          return 'risk-unknown';
      }
    };

    const formatDate = (dateString?: string): string => {
      if (!dateString) return 'Unknown';
      try {
        return new Date(dateString).toLocaleString();
      } catch {
        return 'Invalid Date';
      }
    };

    const canRegister = (server: DiscoveredServer): boolean => {
      return server.status === 'discovered' || server.status === 'ready';
    };

    const handleViewServerDetails = (server: DiscoveredServer) => {
      emit('view-server-details', server);
    };

    const handleRegisterServer = (server: DiscoveredServer) => {
      emit('register-server', server);
    };

    return {
      getStatusClass,
      getStatusLabel,
      getRiskClass,
      formatDate,
      canRegister,
      handleViewServerDetails,
      handleRegisterServer
    };
  }
});
</script>

<style scoped>
.discovered-servers-section {
  margin-top: 20px;
}

.discovered-servers-section h2 {
  margin-bottom: 15px;
  color: var(--body-text, #111827);
}

.servers-table {
  width: 100%;
  border-collapse: collapse;
  background: var(--card-bg, #ffffff);
  border: 1px solid var(--border, #e5e7eb);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.servers-table th {
  background: var(--accent-bg, #f9fafb);
  padding: 12px 16px;
  text-align: left;
  font-weight: 600;
  color: var(--body-text, #111827);
  border-bottom: 1px solid var(--border, #e5e7eb);
}

.servers-table td {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border, #e5e7eb);
  vertical-align: middle;
}

.loading-row,
.empty-row {
  text-align: center;
  color: var(--muted, #6b7280);
  font-style: italic;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
}

.status-healthy {
  background: #d4edda;
  color: #155724;
}

.status-unhealthy {
  background: #f8d7da;
  color: #721c24;
}

.status-unknown {
  background: #fff3cd;
  color: #856404;
}

.risk-high {
  color: #dc3545;
  font-weight: 500;
}

.risk-medium {
  color: #fd7e14;
  font-weight: 500;
}

.risk-low {
  color: #28a745;
  font-weight: 500;
}

.risk-unknown {
  color: var(--muted, #6b7280);
}

.action-buttons {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.btn {
  padding: 6px 10px;
  border: 1px solid transparent;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  transition: all 0.2s ease;
  min-width: 32px;
  height: 32px;
}

.role-secondary {
  background: #6c757d;
  color: white;
  border-color: #6c757d;
}

.role-secondary:hover:not(:disabled) {
  background: #5a6268;
  border-color: #5a6268;
}

.role-primary {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

.role-primary:hover:not(:disabled) {
  background: #0056b3;
  border-color: #0056b3;
}

.role-primary:disabled {
  background: #6c757d;
  border-color: #6c757d;
  cursor: not-allowed;
  opacity: 0.6;
}
</style>