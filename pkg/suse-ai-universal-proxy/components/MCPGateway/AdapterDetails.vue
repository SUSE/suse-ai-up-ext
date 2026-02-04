<template>
  <div class="adapter-details">
    <div class="header">
      <h2>{{ adapter.name }}</h2>
       <div class="status-badge" :class="getStatusClass(adapter.status || 'unknown')">
         {{ getStatusLabel(adapter.status || 'unknown') }}
      </div>
    </div>

    <div class="details-grid">
      <!-- Basic Information -->
      <div class="section">
        <h3>Basic Information</h3>
        <div class="detail-row">
          <span class="label">Name:</span>
          <span class="value">{{ adapter.name }}</span>
        </div>
         <div class="detail-row">
           <span class="label">Status:</span>
           <span class="value">{{ getStatusLabel(adapter.status || 'unknown') }}</span>
         </div>
         <div class="detail-row">
           <span class="label">Protocol:</span>
           <span class="value">{{ adapter.protocol || 'Unknown' }}</span>
         </div>
        <div class="detail-row">
          <span class="label">Connection Type:</span>
          <span class="value">{{ adapter.connectionType }}</span>
        </div>
        <div class="detail-row">
          <span class="label">Created:</span>
          <span class="value">{{ formatDate(adapter.createdAt) }}</span>
        </div>
        <div class="detail-row">
          <span class="label">Last Activity:</span>
          <span class="value">{{ formatDate(adapter.lastActivity) }}</span>
        </div>
      </div>

      <!-- Configuration -->
      <div class="section">
        <h3>Configuration</h3>
        <div class="detail-row">
          <span class="label">Replicas:</span>
          <span class="value">{{ adapter.replicaCount }}</span>
        </div>
        <div class="detail-row">
          <span class="label">Workload Identity:</span>
          <span class="value">{{ adapter.useWorkloadIdentity ? 'Enabled' : 'Disabled' }}</span>
        </div>
        <div v-if="adapter.imageName" class="detail-row">
          <span class="label">Image:</span>
          <span class="value">{{ adapter.imageName }}:{{ adapter.imageVersion }}</span>
        </div>
        <div v-if="adapter.command" class="detail-row">
          <span class="label">Command:</span>
          <span class="value">{{ adapter.command }}</span>
        </div>
        <div v-if="adapter.args && adapter.args.length" class="detail-row">
          <span class="label">Arguments:</span>
          <span class="value">{{ adapter.args?.join(', ') }}</span>
        </div>
      </div>

      <!-- Authentication -->
      <div class="section">
        <h3>Authentication</h3>
        <div v-if="adapter.authentication" class="detail-row">
          <span class="label">Required:</span>
          <span class="value">{{ adapter.authentication.required ? 'Yes' : 'No' }}</span>
        </div>
        <div v-if="adapter.authentication" class="detail-row">
          <span class="label">Type:</span>
          <span class="value">{{ adapter.authentication.type }}</span>
        </div>
          <div v-if="adapter.authentication?.bearerToken?.token" class="detail-row">
            <span class="label">Token:</span>
            <span class="value">Present</span>
          </div>
      </div>

      <!-- Environment Variables -->
      <div v-if="adapter.environmentVariables" class="section">
        <h3>Environment Variables</h3>
        <div class="env-vars">
          <div 
            v-for="(value, key) in adapter.environmentVariables" 
            :key="key"
            class="env-var"
          >
            <span class="env-key">{{ key }}</span>
            <span class="env-value">{{ maskSecretValue(key, value) }}</span>
          </div>
        </div>
      </div>

      <!-- Sessions -->
      <div class="section">
        <div class="section-header">
          <h3>Active Sessions</h3>
          <button 
            class="btn btn-sm role-primary" 
            @click="refreshSessions"
            :disabled="loadingSessions"
          >
            <i class="icon icon-refresh" :class="{ 'icon-spin': loadingSessions }"></i>
            Refresh
          </button>
        </div>
        
        <div v-if="loadingSessions" class="loading">
          <i class="icon icon-spin icon-spinner"></i>
          Loading sessions...
        </div>
        
        <div v-else-if="sessions.length === 0" class="empty-state">
          No active sessions
        </div>
        
        <div v-else class="sessions-list">
          <div 
            v-for="session in sessions" 
            :key="session.sessionId"
            class="session-item"
          >
            <div class="session-info">
              <span class="session-id">{{ session.sessionId }}</span>
              <span class="session-status" :class="getSessionStatusClass(session.status)">
                {{ session.status }}
              </span>
            </div>
            <div class="session-details">
              <span class="session-time">
                Created: {{ formatDate(session.createdAt) }}
              </span>
              <span class="session-time">
                Last Activity: {{ formatDate(session.lastActivity) }}
              </span>
            </div>
            <div class="session-actions">
              <button 
                class="btn btn-sm role-secondary" 
                @click="viewSessionDetails(session)"
              >
                Details
              </button>
              <button 
                class="btn btn-sm role-remove" 
                @click="terminateSession(session.sessionId)"
              >
                Terminate
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Metrics -->
      <div class="section">
        <div class="section-header">
          <h3>Performance Metrics</h3>
          <button 
            class="btn btn-sm role-primary" 
            @click="refreshMetrics"
            :disabled="loadingMetrics"
          >
            <i class="icon icon-refresh" :class="{ 'icon-spin': loadingMetrics }"></i>
            Refresh
          </button>
        </div>
        
        <div v-if="loadingMetrics" class="loading">
          <i class="icon icon-spin icon-spinner"></i>
          Loading metrics...
        </div>
        
        <div v-else-if="!metrics" class="empty-state">
          No metrics available
        </div>
        
        <div v-else class="metrics-grid">
          <div class="metric-card">
            <div class="metric-label">Uptime</div>
            <div class="metric-value">{{ formatDuration(metrics.uptime) }}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Active Sessions</div>
            <div class="metric-value">{{ metrics.sessions.active }}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Total Sessions</div>
            <div class="metric-value">{{ metrics.sessions.total }}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Requests/sec</div>
            <div class="metric-value">{{ metrics.performance.requestsPerSecond.toFixed(2) }}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Avg Response Time</div>
            <div class="metric-value">{{ metrics.performance.averageResponseTime.toFixed(2) }}ms</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Error Rate</div>
            <div class="metric-value">{{ (metrics.performance.errorRate * 100).toFixed(2) }}%</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">CPU Usage</div>
            <div class="metric-value">{{ metrics.resources.cpuUsage.toFixed(1) }}%</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Memory Usage</div>
            <div class="metric-value">{{ formatBytes(metrics.resources.memoryUsage) }}</div>
          </div>
        </div>
      </div>

      <!-- Token Management -->
      <div class="section">
        <div class="section-header">
          <h3>Token Management</h3>
          <button 
            class="btn btn-sm role-primary" 
            @click="refreshToken"
            :disabled="loadingToken"
          >
            <i class="icon icon-refresh" :class="{ 'icon-spin': loadingToken }"></i>
            Refresh
          </button>
        </div>
        
        <div v-if="loadingToken" class="loading">
          <i class="icon icon-spin icon-spinner"></i>
          Loading token...
        </div>
        
        <div v-else-if="!token" class="empty-state">
          No token available
        </div>
        
        <div v-else class="token-info">
          <div class="detail-row">
            <span class="label">Type:</span>
            <span class="value">{{ token.type }}</span>
          </div>
          <div class="detail-row">
            <span class="label">Expires:</span>
            <span class="value">{{ formatDate(token.expiresAt) }}</span>
          </div>
          <div class="detail-row">
            <span class="label">Permissions:</span>
            <span class="value">{{ token.permissions?.join(', ') || 'No permissions' }}</span>
          </div>
          <div class="token-actions">
            <button 
              class="btn btn-sm role-secondary" 
              @click="copyToken"
            >
              Copy Token
            </button>
            <button 
              class="btn btn-sm role-primary" 
              @click="refreshToken"
            >
              Refresh Token
            </button>
            <button 
              class="btn btn-sm role-secondary" 
              @click="validateToken"
            >
              Validate
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div class="actions">
      <button class="btn role-secondary" @click="$emit('close')">
        Close
      </button>
      <button class="btn role-primary" @click="editAdapter">
        Edit Adapter
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, computed } from 'vue';
import type { AdapterResource, AdapterMetrics, AdapterToken } from '../../types/mcp-types';
import type { SessionInfo } from '../../types/mcp-types';

export default defineComponent({
  name: 'AdapterDetails',

  props: {
    adapter: {
      type: Object as () => AdapterResource,
      required: true
    }
  },

  emits: ['close', 'edit'],

  setup(props, { emit }) {
    const sessions = ref<SessionInfo[]>([]);
    const metrics = ref<AdapterMetrics | null>(null);
    const token = ref<AdapterToken | null>(null);
    
    const loadingSessions = ref(false);
    const loadingMetrics = ref(false);
    const loadingToken = ref(false);

    const { useMCPGateway } = require('../../composables/useMCPGateway');
    const {
      fetchSessions,
      fetchAdapterMetrics,
      fetchAdapterToken,
      deleteSession: deleteSessionFromComposable,
      refreshAdapterToken,
      validateAdapterToken
    } = useMCPGateway();

    const refreshSessions = async () => {
      try {
        loadingSessions.value = true;
        await fetchSessions(props.adapter.name);
        // Update sessions from composable
        sessions.value = useMCPGateway().selectedAdapterSessions.value;
      } catch (error) {
        console.error('Failed to refresh sessions:', error);
      } finally {
        loadingSessions.value = false;
      }
    };

    const refreshMetrics = async () => {
      try {
        loadingMetrics.value = true;
        metrics.value = await fetchAdapterMetrics(props.adapter.name);
      } catch (error) {
        console.error('Failed to refresh metrics:', error);
      } finally {
        loadingMetrics.value = false;
      }
    };

    const refreshToken = async () => {
      try {
        loadingToken.value = true;
        token.value = await refreshAdapterToken(props.adapter.name);
      } catch (error) {
        console.error('Failed to refresh token:', error);
      } finally {
        loadingToken.value = false;
      }
    };

    const validateToken = async () => {
      if (!token.value) return;
      
      try {
        await validateAdapterToken(props.adapter.name, token.value.token);
        // Show success message
      } catch (error) {
        console.error('Token validation failed:', error);
        // Show error message
      }
    };

    const copyToken = async () => {
      if (!token.value) return;
      
      try {
        await navigator.clipboard.writeText(token.value.token);
        // Show success message
      } catch (error) {
        console.error('Failed to copy token:', error);
        // Show error message
      }
    };

    const terminateSession = async (sessionId: string) => {
      if (!confirm('Are you sure you want to terminate this session?')) return;
      
      try {
        await deleteSessionFromComposable(props.adapter.name, sessionId);
        await refreshSessions();
      } catch (error) {
        console.error('Failed to delete session:', error);
      }
    };

    const viewSessionDetails = (session: SessionInfo) => {
      // Show session details modal
      console.log('Session details:', session);
    };

    const editAdapter = () => {
      emit('edit', props.adapter);
    };

    const getStatusClass = (status: string) => {
      switch (status) {
        case 'running': return 'bg-success';
        case 'stopped': return 'bg-error';
        case 'error': return 'bg-error';
        case 'starting': return 'bg-warning';
        case 'stopping': return 'bg-warning';
        default: return 'bg-muted';
      }
    };

    const getStatusLabel = (status: string) => {
      switch (status) {
        case 'running': return 'Running';
        case 'stopped': return 'Stopped';
        case 'error': return 'Error';
        case 'starting': return 'Starting';
        case 'stopping': return 'Stopping';
        default: return 'Unknown';
      }
    };

    const getSessionStatusClass = (status: string) => {
      switch (status) {
        case 'active': return 'bg-success';
        case 'inactive': return 'bg-muted';
        case 'error': return 'bg-error';
        default: return 'bg-muted';
      }
    };

    const formatDate = (dateString?: string) => {
      if (!dateString) return 'Never';
      return new Date(dateString).toLocaleString();
    };

    const formatDuration = (seconds: number) => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = Math.floor(seconds % 60);
      
      if (hours > 0) {
        return `${hours}h ${minutes}m ${secs}s`;
      } else if (minutes > 0) {
        return `${minutes}m ${secs}s`;
      } else {
        return `${secs}s`;
      }
    };

    const formatBytes = (bytes: number) => {
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      if (bytes === 0) return '0 Bytes';
      const i = Math.floor(Math.log(bytes) / Math.log(1024));
      return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    };

    const maskSecretValue = (key: string, value: string) => {
      const secretKeys = ['password', 'token', 'secret', 'key', 'auth'];
      const isSecret = secretKeys.some(secret => key.toLowerCase().includes(secret));
      return isSecret ? '••••••••' : value;
    };

    onMounted(() => {
      refreshSessions();
      refreshMetrics();
      fetchAdapterToken(props.adapter.name).then((t: AdapterToken) => {
        token.value = t;
      });
    });

    return {
      sessions,
      metrics,
      token,
      loadingSessions,
      loadingMetrics,
      loadingToken,
      refreshSessions,
      refreshMetrics,
      refreshToken,
      validateToken,
      copyToken,
      terminateSession,
      viewSessionDetails,
      editAdapter,
      getStatusClass,
      getStatusLabel,
      getSessionStatusClass,
      formatDate,
      formatDuration,
      formatBytes,
      maskSecretValue
    };
  }
});
</script>

<style scoped>
.adapter-details {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border);
}

.header h2 {
  margin: 0;
  color: var(--body-text);
}

.status-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 24px;
  margin-bottom: 24px;
}

.section {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 20px;
}

.section h3 {
  margin: 0 0 16px 0;
  color: var(--body-text);
  font-size: 16px;
  font-weight: 600;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--border);
}

.detail-row:last-child {
  border-bottom: none;
}

.label {
  font-weight: 600;
  color: var(--input-label);
}

.value {
  color: var(--body-text);
  text-align: right;
  max-width: 60%;
  word-break: break-word;
}

.env-vars {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.env-var {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: var(--input-bg);
  border-radius: 4px;
}

.env-key {
  font-weight: 600;
  color: var(--input-label);
}

.env-value {
  color: var(--body-text);
  font-family: monospace;
}

.sessions-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.session-item {
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 16px;
  background: var(--card-bg);
}

.session-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.session-id {
  font-family: monospace;
  font-weight: 600;
  color: var(--body-text);
}

.session-status {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.session-details {
  display: flex;
  gap: 16px;
  margin-bottom: 12px;
  font-size: 12px;
  color: var(--text-muted);
}

.session-actions {
  display: flex;
  gap: 8px;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
}

.metric-card {
  background: var(--input-bg);
  border-radius: 6px;
  padding: 16px;
  text-align: center;
}

.metric-label {
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 4px;
  text-transform: uppercase;
}

.metric-value {
  font-size: 18px;
  font-weight: 600;
  color: var(--body-text);
}

.token-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.token-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  color: var(--text-muted);
}

.empty-state {
  text-align: center;
  padding: 20px;
  color: var(--text-muted);
  font-style: italic;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 24px;
  border-top: 1px solid var(--border);
}

.bg-success {
  background-color: var(--success-bg);
  color: var(--success-text);
}

.bg-error {
  background-color: var(--error-bg);
  color: var(--error-text);
}

.bg-warning {
  background-color: var(--warning-bg);
  color: var(--warning-text);
}

.bg-muted {
  background-color: var(--muted-bg);
  color: var(--muted-text);
}
</style>