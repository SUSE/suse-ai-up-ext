<template>
  <div class="discovered-servers-section">
    <h2>Discovered MCP Servers</h2>
     <table class="discovered-servers-table">
        <thead>
          <tr>
            <th>Risk Status</th>
            <th>Security Status</th>
            <th>Name</th>
            <th>Address</th>
            <th>Port</th>
            <th>Connection</th>
            <th>Authentication Type</th>
            <th>Discovered At</th>
            <th>Actions</th>
          </tr>
        </thead>
      <tbody>
         <tr v-if="loading">
           <td colspan="9" class="loading-row">Loading discovered servers...</td>
         </tr>
         <tr v-else-if="discoveredServers.length === 0">
           <td colspan="9" class="empty-row">No servers discovered yet.</td>
         </tr>
          <tr v-else v-for="server in discoveredServers" :key="server.id">
            <td>
              <span
                v-if="server.vulnerability_score"
                :class="getRiskBadgeClass(server.vulnerability_score)"
              >
                {{ getRiskLabel(server.vulnerability_score) }}
              </span>
              <span v-else class="badge badge-secondary">Unknown</span>
            </td>
            <td>
              <span :class="getSecurityStatusClass(server)">
                {{ getSecurityStatusLabel(server) }}
              </span>
            </td>
            <td>{{ server.name || '-' }}</td>
            <td>{{ getAddressWithoutPort(server.address) }}</td>
            <td>{{ getPortFromAddress(server.address) || server.port || '8911' }}</td>
            <td>{{ server.connection || 'HTTP' }}</td>
            <td>{{ getAuthTypeLabel(server.metadata?.auth_type) }}</td>
            <td>{{ server.discoveredAt ? new Date(server.discoveredAt).toLocaleString() : (server.lastSeen ? new Date(server.lastSeen).toLocaleString() : 'Unknown') }}</td>
            <td>
              <div class="action-buttons">
                <button
                  class="btn btn-sm role-secondary"
                  @click="handleViewServerDetails(server)"
                  title="View Server Details"
                >
                  <i class="icon icon-info"></i>
                  View
                </button>
                <button
                  class="btn btn-sm role-primary"
                  @click="handleRegisterServer(server)"
                  :disabled="server.status === 'error' || server.status === 'failed'"
                >
                  Register
                </button>
              </div>
            </td>
          </tr>
      </tbody>
     </table>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import type { DiscoveredServer } from '../../services/mcp-service';

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
    }
  },
  emits: ['view-server-details', 'register-server'],
  setup(props, { emit }) {
    const getRiskBadgeClass = (score: string) => {
      switch (score) {
        case 'high':
          return 'badge badge-danger';
        case 'medium':
          return 'badge badge-warning';
        case 'low':
          return 'badge badge-success';
        default:
          return 'badge badge-secondary';
      }
    };

    const getRiskLabel = (score: string) => {
      switch (score) {
        case 'high':
          return 'High Risk';
        case 'medium':
          return 'Medium Risk';
        case 'low':
          return 'Low Risk';
        default:
          return 'Unknown';
      }
    };

    const getAddressWithoutPort = (address: string) => {
      if (!address) return '';
      const colonIndex = address.lastIndexOf(':');
      if (colonIndex > 0) {
        return address.substring(0, colonIndex);
      }
      return address;
    };

    const getPortFromAddress = (address: string) => {
      if (!address) return null;
      const colonIndex = address.lastIndexOf(':');
      if (colonIndex > 0) {
        const port = address.substring(colonIndex + 1);
        return port;
      }
      return null;
    };

    const getAuthTypeLabel = (authType?: string) => {
      if (!authType) return 'None';
      return authType.charAt(0).toUpperCase() + authType.slice(1).toLowerCase();
    };

    const getSecurityStatusClass = (server: DiscoveredServer) => {
      if (!server.security_findings || server.security_findings.length === 0) {
        return 'badge badge-success';
      }

      const hasHigh = server.security_findings.some(f => f.severity === 'high');
      const hasMedium = server.security_findings.some(f => f.severity === 'medium');

      if (hasHigh) return 'badge badge-danger';
      if (hasMedium) return 'badge badge-warning';
      return 'badge badge-info';
    };

    const getSecurityStatusLabel = (server: DiscoveredServer) => {
      if (!server.security_findings || server.security_findings.length === 0) {
        return 'Secure';
      }

      const highCount = server.security_findings.filter(f => f.severity === 'high').length;
      const mediumCount = server.security_findings.filter(f => f.severity === 'medium').length;
      const lowCount = server.security_findings.filter(f => f.severity === 'low').length;

      if (highCount > 0) return `${highCount} Critical`;
      if (mediumCount > 0) return `${mediumCount} Warnings`;
      if (lowCount > 0) return `${lowCount} Info`;
      return 'Secure';
    };

    const handleViewServerDetails = (server: DiscoveredServer) => {
      emit('view-server-details', server);
    };

    const handleRegisterServer = (server: DiscoveredServer) => {
      emit('register-server', server);
    };

    return {
      getRiskBadgeClass,
      getRiskLabel,
      getAddressWithoutPort,
      getPortFromAddress,
      getAuthTypeLabel,
      getSecurityStatusClass,
      getSecurityStatusLabel,
      handleViewServerDetails,
      handleRegisterServer
    };
  }
});
</script>

<style scoped>
.discovered-servers-section {
  margin-top: 40px;
}

.discovered-servers-section h2 {
  margin-bottom: 20px;
  color: var(--body-text, #111827);
}

.discovered-servers-table {
  width: 100%;
  border-collapse: collapse;
  background: var(--card-bg, #ffffff);
  border: 1px solid var(--border, #e5e7eb);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.discovered-servers-table th,
.discovered-servers-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid var(--border, #e5e7eb);
}

.discovered-servers-table th {
  background: var(--accent-bg, #f9fafb);
  font-weight: 600;
  color: var(--body-text, #111827);
}

.discovered-servers-table tbody tr:hover {
  background: var(--accent-bg, #f9fafb);
}

.discovered-servers-table .loading-row,
.discovered-servers-table .empty-row {
  text-align: center;
  color: var(--muted, #6b7280);
  font-style: italic;
  padding: 20px;
}

/* Badges (matching VirtualMCP styles) */
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
  animation: pulse 1s infinite;
}

.badge-secondary {
  background: #6c757d;
  color: white;
}

.badge-info {
  background: #17a2b8;
  color: white;
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}

.action-buttons {
  display: flex;
  gap: 12px;
  margin: 24px 0;
  flex-wrap: wrap;
}
</style>