<template>
  <div class="pod-info-card">
    <div class="card-header">
      <div class="pod-icon">
        <i class="icon icon-server"></i>
      </div>
      <div class="pod-info">
        <h3>{{ pod.metadata.name }}</h3>
        <p>Namespace: {{ pod.metadata.namespace }}</p>
      </div>
      <div class="pod-status">
        <span :class="getStatusClass(pod.status)">
          {{ getStatusText(pod.status) }}
        </span>
      </div>
    </div>

    <div class="card-content">
      <div class="info-section">
        <h4>Pod Information</h4>
        <div class="info-grid">
          <div class="info-item">
            <strong>Phase:</strong> {{ pod.status?.phase || 'Unknown' }}
          </div>
          <div class="info-item">
            <strong>Pod IP:</strong> {{ pod.status?.podIP || 'N/A' }}
          </div>
          <div class="info-item">
            <strong>Host IP:</strong> {{ pod.status?.hostIP || 'N/A' }}
          </div>
          <div class="info-item">
            <strong>Start Time:</strong> {{ formatStartTime(pod.status?.startTime) }}
          </div>
        </div>
      </div>

      <div class="info-section">
        <h4>Containers</h4>
        <div v-if="pod.spec?.containers?.length" class="containers-list">
          <div
            v-for="container in pod.spec.containers"
            :key="container.name"
            class="container-item"
          >
            <div class="container-header">
              <strong>{{ container.name }}</strong>
              <span class="container-image">{{ container.image }}</span>
            </div>
            <div v-if="container.ports?.length" class="container-ports">
              <small>Ports: {{ formatPorts(container.ports) }}</small>
            </div>
          </div>
        </div>
        <div v-else class="no-containers">
          No containers found
        </div>
      </div>

      <div class="info-section">
        <h4>Service Endpoints</h4>
        <div class="endpoints-info">
          <div class="endpoint-item">
            <strong>Primary Endpoint:</strong>
            <span>{{ pod.primaryIP ? `http://${pod.primaryIP}:8911` : 'N/A' }}</span>
          </div>
          <div class="endpoint-item">
            <strong>Health Check:</strong>
            <span>{{ pod.primaryIP ? `http://${pod.primaryIP}:8911/health` : 'N/A' }}</span>
          </div>
          <div class="endpoint-item">
            <strong>Cluster IP:</strong>
            <span>{{ pod.clusterIP || 'N/A' }}</span>
          </div>
          <div v-if="pod.externalIPs?.length" class="endpoint-item">
            <strong>External IPs:</strong>
            <span>{{ pod.externalIPs.join(', ') }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="card-actions">
      <button class="btn-primary" @click="onSave">
        Save & Configure Services
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue'

interface Pod {
  metadata: {
    name: string
    namespace: string
  }
  status?: {
    phase?: string
    podIP?: string
    hostIP?: string
    startTime?: string
  }
  spec?: {
    containers?: any[]
  }
  primaryIP?: string
  clusterIP?: string
  externalIPs?: string[]
}

export default defineComponent({
  name: 'PodInfoCard',
  props: {
    pod: {
      type: Object as PropType<Pod>,
      required: true
    }
  },
  emits: ['save'],
  methods: {
    onSave() {
      this.$emit('save')
    },

    getStatusClass(status: any): string {
      const phase = status?.phase?.toLowerCase()
      switch (phase) {
        case 'running':
          return 'status-success'
        case 'pending':
          return 'status-warning'
        case 'failed':
        case 'error':
          return 'status-error'
        default:
          return 'status-unknown'
      }
    },

    getStatusText(status: any): string {
      const phase = status?.phase
      return phase || 'Unknown'
    },

    formatStartTime(startTime: string | undefined): string {
      if (!startTime) return 'N/A'
      try {
        return new Date(startTime).toLocaleString()
      } catch {
        return startTime
      }
    },

    formatPorts(ports: any[]): string {
      if (!ports || ports.length === 0) return 'None'
      return ports.map(port => `${port.containerPort}/${port.protocol || 'TCP'}`).join(', ')
    }
  }
})
</script>

<style scoped>
.pod-info-card {
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--card-bg);
  overflow: hidden;
}

.card-header {
  display: flex;
  align-items: center;
  padding: 20px;
  background: var(--accent-bg, rgba(0, 123, 255, 0.05));
  border-bottom: 1px solid var(--border-light, rgba(0,0,0,0.1));
}

.pod-icon {
  font-size: 32px;
  color: var(--primary);
  margin-right: 16px;
  min-width: 32px;
}

.pod-info h3 {
  margin: 0 0 4px 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--body-text);
}

.pod-info p {
  margin: 0;
  font-size: 14px;
  color: var(--muted);
}

.pod-status {
  margin-left: auto;
}

.pod-status span {
  padding: 6px 12px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
}

.status-success {
  background: var(--success-light, #d4edda);
  color: var(--success, #28a745);
}

.status-warning {
  background: var(--warning-light, #fff3cd);
  color: var(--warning, #856404);
}

.status-error {
  background: var(--error-light, #f8d7da);
  color: var(--error, #dc3545);
}

.status-unknown {
  background: var(--muted-bg, #f8f9fa);
  color: var(--muted, #6c757d);
}

.card-content {
  padding: 20px;
}

.info-section {
  margin-bottom: 24px;
}

.info-section h4 {
  font-size: 16px;
  font-weight: 600;
  color: var(--body-text);
  margin: 0 0 12px 0;
  border-bottom: 1px solid var(--border-light, rgba(0,0,0,0.1));
  padding-bottom: 8px;
}

.info-section:last-child {
  margin-bottom: 0;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.info-item {
  font-size: 14px;
  color: var(--body-text);
}

.info-item strong {
  color: var(--muted);
  font-weight: 500;
}

.containers-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.container-item {
  padding: 12px;
  background: var(--body-bg, #f8f9fa);
  border: 1px solid var(--border-light, rgba(0,0,0,0.1));
  border-radius: 4px;
}

.container-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 4px;
}

.container-header strong {
  font-size: 14px;
  color: var(--body-text);
}

.container-image {
  font-size: 12px;
  color: var(--muted);
  font-weight: normal;
}

.container-ports {
  color: var(--muted);
}

.endpoints-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.endpoint-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
}

.endpoint-item strong {
  color: var(--muted);
  font-weight: 500;
}

.endpoint-item span {
  color: var(--body-text);
  font-family: monospace;
  background: var(--body-bg, #f8f9fa);
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 13px;
}

.no-containers {
  color: var(--muted);
  font-style: italic;
}

.card-actions {
  padding: 20px;
  border-top: 1px solid var(--border-light, rgba(0,0,0,0.1));
  text-align: center;
  background: var(--accent-bg, rgba(0, 123, 255, 0.02));
}

.btn-primary {
  background: var(--primary);
  color: white;
  border: 1px solid var(--primary);
  border-radius: 4px;
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary:hover {
  background: var(--primary-hover, darken(var(--primary), 10%));
}

/* Responsive */
@media (max-width: 768px) {
  .card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .pod-status {
    margin-left: 0;
    align-self: flex-end;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }

  .endpoint-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }

  .container-header {
    flex-direction: column;
    gap: 4px;
  }
}
</style>