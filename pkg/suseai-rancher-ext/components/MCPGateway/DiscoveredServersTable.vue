<template>
  <div class="discovered-servers-section">
    <h2>Discovered MCP Servers</h2>

    <div v-if="loading" class="loading-state">
      <i class="icon icon-spinner icon-spin"></i>
      Loading discovered servers...
    </div>

    <div v-else-if="discoveredServers.length === 0" class="empty-state">
      <i class="icon icon-info"></i>
      No servers discovered yet.
    </div>

    <div v-else class="servers-list">
      <div
        v-for="server in discoveredServers"
        :key="server.id"
        class="server-card"
      >
        <div class="server-header">
          <h3>{{ server.name || 'Unknown Server' }}</h3>
          <span :class="getStatusClass(server.status)" class="status-badge">
            {{ getStatusLabel(server.status) }}
          </span>
        </div>

        <div class="server-details">
          <div class="detail-row">
            <span class="label">Address:</span>
            <span class="value">{{ server.address }}</span>
          </div>

          <div class="detail-row">
            <span class="label">Port:</span>
            <span class="value">{{ server.port }}</span>
          </div>

          <div class="detail-row">
            <span class="label">Protocol:</span>
            <span class="value">{{ server.protocol }}</span>
          </div>

          <div class="detail-row">
            <span class="label">Connection:</span>
            <span class="value">{{ server.connection }}</span>
          </div>

          <div class="detail-row" v-if="server.lastSeen">
            <span class="label">Last Seen:</span>
            <span class="value">{{ formatDate(server.lastSeen) }}</span>
          </div>

          <div class="detail-row" v-if="server.vulnerability_score">
            <span class="label">Risk:</span>
            <span :class="getRiskClass(server.vulnerability_score)" class="value">
              {{ server.vulnerability_score.toUpperCase() }}
            </span>
          </div>
        </div>

        <div class="server-actions">
          <button
            class="btn btn-sm btn-secondary"
            @click="handleViewServerDetails(server)"
          >
            <i class="icon icon-info"></i>
            Details
          </button>

          <button
            class="btn btn-sm btn-primary"
            @click="handleRegisterServer(server)"
            :disabled="!canRegister(server)"
          >
            Register
          </button>
        </div>
      </div>
    </div>
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

.loading-state,
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 40px;
  color: var(--muted, #6b7280);
  font-style: italic;
}

.servers-list {
  display: grid;
  gap: 16px;
}

.server-card {
  background: var(--card-bg, #ffffff);
  border: 1px solid var(--border, #e5e7eb);
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.server-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.server-header h3 {
  margin: 0;
  color: var(--body-text, #111827);
  font-size: 18px;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
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

.server-details {
  margin-bottom: 15px;
}

.detail-row {
  display: flex;
  margin-bottom: 8px;
}

.detail-row .label {
  font-weight: 500;
  color: var(--muted, #6b7280);
  min-width: 100px;
  margin-right: 10px;
}

.detail-row .value {
  color: var(--body-text, #111827);
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

.server-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.btn {
  padding: 8px 16px;
  border: 1px solid transparent;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 12px;
}

.btn-secondary {
  background: #6c757d;
  color: white;
  border-color: #6c757d;
}

.btn-secondary:hover:not(:disabled) {
  background: #5a6268;
  border-color: #5a6268;
}

.btn-primary {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

.btn-primary:hover:not(:disabled) {
  background: #0056b3;
  border-color: #0056b3;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>