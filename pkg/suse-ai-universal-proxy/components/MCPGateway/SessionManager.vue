<template>
  <div class="session-manager">
    <div class="header">
      <h2>Session Management</h2>
      <div class="header-actions">
        <button 
          class="btn btn-sm role-primary" 
          @click="refreshSessions"
          :disabled="loading"
        >
          <i class="icon icon-refresh" :class="{ 'icon-spin': loading }"></i>
          Refresh
        </button>
        <button 
          class="btn btn-sm role-secondary" 
          @click="createNewSession"
          :disabled="!selectedAdapter"
        >
          <i class="icon icon-plus"></i>
          New Session
        </button>
      </div>
    </div>

    <!-- Adapter Selection -->
    <div class="adapter-selector">
      <label class="label">Select Adapter:</label>
      <select 
        v-model="selectedAdapterName" 
        class="input"
        @change="onAdapterChange"
      >
        <option value="">Choose an adapter...</option>
        <option 
          v-for="adapter in adapters" 
          :key="adapter.name"
          :value="adapter.name"
        >
          {{ adapter.name }} ({{ adapter.status }})
        </option>
      </select>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading">
      <i class="icon icon-spin icon-spinner"></i>
      Loading sessions...
    </div>

    <!-- No Adapter Selected -->
    <div v-else-if="!selectedAdapter" class="empty-state">
      <i class="icon icon-layers"></i>
      <p>Select an adapter to view and manage sessions</p>
    </div>

    <!-- No Sessions -->
    <div v-else-if="sessions.length === 0" class="empty-state">
      <i class="icon icon-connection"></i>
      <p>No active sessions for {{ selectedAdapter.name }}</p>
      <button class="btn role-primary" @click="createNewSession">
        Create First Session
      </button>
    </div>

    <!-- Sessions List -->
    <div v-else class="sessions-container">
      <div class="sessions-header">
        <h3>Active Sessions ({{ sessions.length }})</h3>
        <div class="bulk-actions">
          <button 
            class="btn btn-sm role-secondary" 
            @click="handleDeleteAllSessions"
            :disabled="sessions.length === 0"
          >
            <i class="icon icon-trash"></i>
            Terminate All
          </button>
        </div>
      </div>

      <div class="sessions-grid">
        <div 
          v-for="session in sessions" 
          :key="session.sessionId"
          class="session-card"
          :class="{ 'selected': selectedSession === session.sessionId }"
          @click="selectSession(session.sessionId)"
        >
          <div class="session-header">
            <div class="session-info">
              <span class="session-id">{{ session.sessionId }}</span>
              <span 
                class="session-status" 
                :class="getStatusClass(session.status)"
              >
                {{ session.status }}
              </span>
            </div>
            <div class="session-actions">
              <button 
                class="btn btn-xs role-secondary" 
                @click.stop="viewSessionDetails(session)"
                title="View Details"
              >
                <i class="icon icon-eye"></i>
              </button>
              <button 
                class="btn btn-xs role-remove" 
                @click.stop="handleDeleteSession(session.sessionId)"
                title="Terminate Session"
              >
                <i class="icon icon-x"></i>
              </button>
            </div>
          </div>

          <div class="session-details">
            <div class="detail-row">
              <span class="label">Target:</span>
              <span class="value">{{ session.targetAddress }}</span>
            </div>
            <div class="detail-row">
              <span class="label">Connection:</span>
              <span class="value">{{ session.connectionType }}</span>
            </div>
            <div class="detail-row">
              <span class="label">Created:</span>
              <span class="value">{{ formatDate(session.createdAt) }}</span>
            </div>
            <div class="detail-row">
              <span class="label">Last Activity:</span>
              <span class="value">{{ formatDate(session.lastActivity) }}</span>
            </div>
          </div>

          <div v-if="session.metadata" class="session-metadata">
            <div class="detail-row">
              <span class="label">Client:</span>
              <span class="value">
                {{ session.metadata.clientInfo?.name || 'Unknown' }}
                v{{ session.metadata.clientInfo?.version || '0.0.0' }}
              </span>
            </div>
            <div v-if="session.metadata.protocolVersion" class="detail-row">
              <span class="label">Protocol:</span>
              <span class="value">{{ session.metadata.protocolVersion }}</span>
            </div>
          </div>

          <div v-if="sessionMetrics[session.sessionId]" class="session-metrics">
            <div class="metrics-row">
              <div class="metric">
                <span class="metric-label">Messages</span>
                <span class="metric-value">{{ sessionMetrics[session.sessionId].messagesCount }}</span>
              </div>
              <div class="metric">
                <span class="metric-label">Duration</span>
                <span class="metric-value">{{ formatDuration(sessionMetrics[session.sessionId].duration) }}</span>
              </div>
              <div class="metric">
                <span class="metric-label">Avg Response</span>
                <span class="metric-value">{{ sessionMetrics[session.sessionId].averageResponseTime }}ms</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Session Details Modal -->
    <div v-if="showSessionDetails" class="modal-overlay" @click="closeSessionDetails">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>Session Details</h3>
          <button class="modal-close" @click="closeSessionDetails">
            <i class="icon icon-x"></i>
          </button>
        </div>
        
        <div v-if="selectedSessionData" class="session-details-modal">
          <div class="detail-section">
            <h4>Basic Information</h4>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="label">Session ID:</span>
                <span class="value">{{ selectedSessionData.sessionId }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Status:</span>
                <span 
                  class="value status-badge" 
                  :class="getStatusClass(selectedSessionData.status)"
                >
                  {{ selectedSessionData.status }}
                </span>
              </div>
              <div class="detail-item">
                <span class="label">Adapter:</span>
                <span class="value">{{ selectedSessionData.adapterName }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Target Address:</span>
                <span class="value">{{ selectedSessionData.targetAddress }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Connection Type:</span>
                <span class="value">{{ selectedSessionData.connectionType }}</span>
              </div>
            </div>
          </div>

          <div class="detail-section">
            <h4>Timing</h4>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="label">Created At:</span>
                <span class="value">{{ formatDate(selectedSessionData.createdAt) }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Last Activity:</span>
                <span class="value">{{ formatDate(selectedSessionData.lastActivity) }}</span>
              </div>
              <div v-if="sessionMetrics[selectedSessionData.sessionId]" class="detail-item">
                <span class="label">Duration:</span>
                <span class="value">{{ formatDuration(sessionMetrics[selectedSessionData.sessionId].duration) }}</span>
              </div>
            </div>
          </div>

          <div v-if="selectedSessionData.metadata" class="detail-section">
            <h4>Client Information</h4>
            <div class="detail-grid">
              <div v-if="selectedSessionData.metadata.clientInfo" class="detail-item">
                <span class="label">Client Name:</span>
                <span class="value">{{ selectedSessionData.metadata.clientInfo.name }}</span>
              </div>
              <div v-if="selectedSessionData.metadata.clientInfo" class="detail-item">
                <span class="label">Client Version:</span>
                <span class="value">{{ selectedSessionData.metadata.clientInfo.version }}</span>
              </div>
              <div v-if="selectedSessionData.metadata.protocolVersion" class="detail-item">
                <span class="label">Protocol Version:</span>
                <span class="value">{{ selectedSessionData.metadata.protocolVersion }}</span>
              </div>
            </div>
          </div>

          <div v-if="sessionMetrics[selectedSessionData.sessionId]" class="detail-section">
            <h4>Performance Metrics</h4>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="label">Messages Count:</span>
                <span class="value">{{ sessionMetrics[selectedSessionData.sessionId].messagesCount }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Bytes Transferred:</span>
                <span class="value">{{ formatBytes(sessionMetrics[selectedSessionData.sessionId].bytesTransferred) }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Average Response Time:</span>
                <span class="value">{{ sessionMetrics[selectedSessionData.sessionId].averageResponseTime }}ms</span>
              </div>
              <div class="detail-item">
                <span class="label">Error Count:</span>
                <span class="value">{{ sessionMetrics[selectedSessionData.sessionId].errorCount }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-actions">
          <button class="btn role-secondary" @click="closeSessionDetails">
            Close
          </button>
          <button 
            class="btn role-remove" 
            @click="selectedSessionData && terminateSessionFromDetails(selectedSessionData.sessionId)"
          >
            Terminate Session
          </button>
        </div>
      </div>
    </div>

    <!-- Create Session Modal -->
    <div v-if="showCreateSession" class="modal-overlay" @click="closeCreateSession">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>Create New Session</h3>
          <button class="modal-close" @click="closeCreateSession">
            <i class="icon icon-x"></i>
          </button>
        </div>
        
        <div class="form-section">
          <div class="form-group">
            <label class="label">Client Name:</label>
            <input 
              v-model="newSessionForm.clientName" 
              type="text" 
              class="input"
              placeholder="e.g., My MCP Client"
            />
          </div>
          
          <div class="form-group">
            <label class="label">Client Version:</label>
            <input 
              v-model="newSessionForm.clientVersion" 
              type="text" 
              class="input"
              placeholder="e.g., 1.0.0"
            />
          </div>
          
          <div class="form-group">
            <label class="checkbox">
              <input 
                v-model="newSessionForm.forceReinitialize" 
                type="checkbox"
              />
              Force Reinitialize
            </label>
            <small class="help-text">
              Force reinitialization of the MCP connection
            </small>
          </div>
        </div>

        <div class="modal-actions">
          <button class="btn role-secondary" @click="closeCreateSession">
            Cancel
          </button>
          <button 
            class="btn role-primary" 
            @click="handleCreateSession"
            :disabled="!newSessionForm.clientName || creatingSession"
          >
            <i v-if="creatingSession" class="icon icon-spin icon-spinner"></i>
            Create Session
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, watch } from 'vue';
import type { AdapterResource, SessionMetrics } from '../../types/mcp-types';
import type { SessionInfo } from '../../types/mcp-types';

export default defineComponent({
  name: 'SessionManager',

  props: {
    adapters: {
      type: Array as () => AdapterResource[],
      required: true
    }
  },

  setup(props) {
    const selectedAdapterName = ref('');
    const sessions = ref<SessionInfo[]>([]);
    const selectedSession = ref<string | null>(null);
    const sessionMetrics = ref<Record<string, SessionMetrics>>({});
    
    const loading = ref(false);
    const creatingSession = ref(false);
    
    const showSessionDetails = ref(false);
    const selectedSessionData = ref<SessionInfo | null>(null);
    
    const showCreateSession = ref(false);
    const newSessionForm = ref({
      clientName: '',
      clientVersion: '1.0.0',
      forceReinitialize: false
    });

    const selectedAdapter = computed(() => 
      props.adapters.find(a => a.name === selectedAdapterName.value)
    );

    const { useMCPGateway } = require('../../composables/useMCPGateway');
    const {
      fetchSessions,
      createSession: createSessionFromComposable,
      deleteSession: deleteSessionFromComposable,
      deleteAllSessions: deleteAllSessionsFromComposable,
      selectedAdapterSessions,
      loadingSessions,
      sessionMetrics: composableSessionMetrics
    } = useMCPGateway();

    const refreshSessions = async () => {
      if (!selectedAdapterName.value) return;
      
      try {
        loading.value = true;
        await fetchSessions(selectedAdapterName.value);
        sessions.value = selectedAdapterSessions.value;
      } catch (error) {
        console.error('Failed to refresh sessions:', error);
      } finally {
        loading.value = false;
      }
    };

    const onAdapterChange = () => {
      selectedSession.value = null;
      refreshSessions();
    };

    const selectSession = (sessionId: string) => {
      selectedSession.value = sessionId;
    };

    const viewSessionDetails = (session: SessionInfo) => {
      selectedSessionData.value = session;
      showSessionDetails.value = true;
    };

    const closeSessionDetails = () => {
      showSessionDetails.value = false;
      selectedSessionData.value = null;
    };

    const createNewSession = () => {
      if (!selectedAdapter.value) return;
      showCreateSession.value = true;
    };

    const closeCreateSession = () => {
      showCreateSession.value = false;
      newSessionForm.value = {
        clientName: '',
        clientVersion: '1.0.0',
        forceReinitialize: false
      };
    };

    const handleCreateSession = async () => {
      if (!selectedAdapterName.value || !newSessionForm.value.clientName) return;
      
      try {
        creatingSession.value = true;
        await createSessionFromComposable(selectedAdapterName.value, {
          clientInfo: {
            name: newSessionForm.value.clientName,
            version: newSessionForm.value.clientVersion
          },
          forceReinitialize: newSessionForm.value.forceReinitialize
        });
        
        closeCreateSession();
        await refreshSessions();
      } catch (error) {
        console.error('Failed to create session:', error);
      } finally {
        creatingSession.value = false;
      }
    };

    const handleDeleteSession = async (sessionId: string) => {
      if (!confirm('Are you sure you want to terminate this session?')) return;
      
      try {
        await deleteSessionFromComposable(selectedAdapterName.value, sessionId);
        await refreshSessions();
      } catch (error) {
        console.error('Failed to delete session:', error);
      }
    };

    const terminateSessionFromDetails = async (sessionId: string) => {
      closeSessionDetails();
      await handleDeleteSession(sessionId);
    };

    const handleDeleteAllSessions = async () => {
      if (!confirm('Are you sure you want to terminate all sessions?')) return;
      
      try {
        await deleteAllSessionsFromComposable(selectedAdapterName.value);
        await refreshSessions();
      } catch (error) {
        console.error('Failed to delete all sessions:', error);
      }
    };

    const getStatusClass = (status: string) => {
      switch (status) {
        case 'active': return 'status-active';
        case 'inactive': return 'status-inactive';
        case 'error': return 'status-error';
        default: return 'status-unknown';
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

    // Watch for session metrics updates
    watch(composableSessionMetrics, (newMetrics) => {
      sessionMetrics.value = newMetrics;
    }, { deep: true });

    onMounted(() => {
      // Auto-select first adapter if available
      if (props.adapters.length > 0) {
        selectedAdapterName.value = props.adapters[0].name;
        refreshSessions();
      }
    });

    return {
      selectedAdapterName,
      selectedAdapter,
      sessions,
      selectedSession,
      sessionMetrics,
      loading,
      creatingSession,
      showSessionDetails,
      selectedSessionData,
      showCreateSession,
      newSessionForm,
      refreshSessions,
      onAdapterChange,
      selectSession,
      viewSessionDetails,
      closeSessionDetails,
      createNewSession,
      closeCreateSession,
      handleCreateSession,
      handleDeleteSession,
      terminateSessionFromDetails,
      handleDeleteAllSessions,
      getStatusClass,
      formatDate,
      formatDuration,
      formatBytes
    };
  }
});
</script>

<style scoped>
.session-manager {
  padding: 20px;
  max-width: 1400px;
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

.header-actions {
  display: flex;
  gap: 8px;
}

.adapter-selector {
  margin-bottom: 24px;
}

.adapter-selector .label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: var(--input-label);
}

.adapter-selector .input {
  width: 100%;
  max-width: 400px;
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: var(--text-muted);
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: var(--text-muted);
}

.empty-state i {
  font-size: 48px;
  margin-bottom: 16px;
  display: block;
}

.empty-state p {
  margin: 0 0 16px 0;
  font-size: 16px;
}

.sessions-container {
  margin-top: 24px;
}

.sessions-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.sessions-header h3 {
  margin: 0;
  color: var(--body-text);
}

.bulk-actions {
  display: flex;
  gap: 8px;
}

.sessions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 20px;
}

.session-card {
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 20px;
  background: var(--card-bg);
  cursor: pointer;
  transition: all 0.2s ease;
}

.session-card:hover {
  border-color: var(--primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.session-card.selected {
  border-color: var(--primary);
  box-shadow: 0 0 0 2px rgba(var(--primary-rgb), 0.2);
}

.session-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.session-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.session-id {
  font-family: monospace;
  font-weight: 600;
  color: var(--body-text);
}

.session-status {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.session-actions {
  display: flex;
  gap: 4px;
}

.session-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
}

.detail-row .label {
  font-weight: 600;
  color: var(--input-label);
}

.detail-row .value {
  color: var(--body-text);
  text-align: right;
  max-width: 60%;
  word-break: break-word;
}

.session-metadata {
  margin-bottom: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.session-metrics {
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.metrics-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.metric {
  text-align: center;
  padding: 8px;
  background: var(--input-bg);
  border-radius: 4px;
}

.metric-label {
  display: block;
  font-size: 11px;
  color: var(--text-muted);
  margin-bottom: 4px;
  text-transform: uppercase;
}

.metric-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--body-text);
}

.status-active {
  background-color: var(--success-bg);
  color: var(--success-text);
}

.status-inactive {
  background-color: var(--muted-bg);
  color: var(--muted-text);
}

.status-error {
  background-color: var(--error-bg);
  color: var(--error-text);
}

.status-unknown {
  background-color: var(--warning-bg);
  color: var(--warning-text);
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: var(--card-bg);
  border-radius: 8px;
  padding: 24px;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
  width: 90%;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.modal-header h3 {
  margin: 0;
  color: var(--body-text);
}

.modal-close {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: var(--text-muted);
}

.modal-close:hover {
  color: var(--body-text);
}

.detail-section {
  margin-bottom: 24px;
}

.detail-section h4 {
  margin: 0 0 12px 0;
  color: var(--body-text);
  font-size: 14px;
  font-weight: 600;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-item .label {
  font-size: 12px;
  color: var(--input-label);
  font-weight: 600;
}

.detail-item .value {
  font-size: 14px;
  color: var(--body-text);
}

.status-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.form-section {
  margin-bottom: 24px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group .label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: var(--input-label);
}

.form-group .input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--input-bg);
  color: var(--input-text);
}

.form-group .checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.help-text {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-muted);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 20px;
  border-top: 1px solid var(--border);
}
</style>