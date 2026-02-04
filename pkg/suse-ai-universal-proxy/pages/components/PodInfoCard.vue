<template>
  <div class="pod-info-card" :class="{ selected: isSelected }" @click="onCardClick">
    <div class="card-header">
      <div class="pod-icon">
        <i class="icon icon-server"></i>
      </div>
      <div class="pod-info">
        <h3>{{ pod.metadata.name }}</h3>
        <p>Namespace: {{ pod.metadata.namespace }}</p>
      </div>
      <div class="card-actions-top">
        <div class="pod-status">
          <span :class="getStatusClass(pod.status)">
            {{ getStatusText(pod.status) }}
          </span>
        </div>
        <div class="selection-indicator">
          <input
            type="radio"
            :id="`pod-${pod.metadata.name}`"
            :checked="isSelected"
            class="radio-input"
            readonly
          />
          <label :for="`pod-${pod.metadata.name}`" class="radio-label">
            <span class="radio-checkmark"></span>
          </label>
        </div>
      </div>
    </div>

    <div class="card-content">
      <div class="info-section">
        <h4>Service Endpoints</h4>
        <div class="endpoints-info">
          <div class="endpoint-item">
            <strong>Primary Endpoint:</strong>
            <span>{{ getPrimaryEndpoint() }}</span>
          </div>
          <div class="endpoint-item">
            <strong>Health Check:</strong>
            <span>{{ getHealthCheckEndpoint() }}</span>
          </div>
          <div class="endpoint-item">
            <strong>API Documentation:</strong>
            <a :href="getApiDocsUrl()" target="_blank" class="endpoint-link">{{ getApiDocsDisplay() }}</a>
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
  data() {
    return {
      isSelected: false
    }
  },
  methods: {
    onCardClick() {
      if (!this.isSelected) {
        this.isSelected = true
        this.$emit('save')
      }
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

    getPrimaryEndpoint(): string {
      const externalIP = this.pod.externalIPs?.[0]
      const primaryIP = this.pod.primaryIP || this.pod.clusterIP
      const ip = externalIP || primaryIP
      return ip ? `http://${ip}:8911` : 'N/A'
    },

    getHealthCheckEndpoint(): string {
      const externalIP = this.pod.externalIPs?.[0]
      const primaryIP = this.pod.primaryIP || this.pod.clusterIP
      const ip = externalIP || primaryIP
      return ip ? `http://${ip}:8911/health` : 'N/A'
    },

    getApiDocsUrl(): string {
      const externalIP = this.pod.externalIPs?.[0]
      const primaryIP = this.pod.primaryIP || this.pod.clusterIP
      const ip = externalIP || primaryIP
      return ip ? `http://${ip}:8911/docs/index.html` : '#'
    },

    getApiDocsDisplay(): string {
      const externalIP = this.pod.externalIPs?.[0]
      const primaryIP = this.pod.primaryIP || this.pod.clusterIP
      const ip = externalIP || primaryIP
      return ip ? `http://${ip}:8911/docs` : 'N/A'
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
  cursor: pointer;
  transition: all 0.2s ease;
}

.pod-info-card:hover {
  border-color: var(--primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.pod-info-card.selected {
  border-color: var(--primary);
  background: var(--primary-light, rgba(0, 123, 255, 0.05));
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

.pod-info {
  flex: 1;
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
  margin-right: 12px;
}

.card-actions-top {
  display: flex;
  align-items: center;
  gap: 8px;
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

.selection-indicator {
  /* No positioning needed - part of flex layout */
}

.radio-input {
  position: absolute;
  opacity: 0;
  cursor: pointer;
}

.radio-label {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.radio-checkmark {
  width: 16px;
  height: 16px;
  border: 2px solid var(--border);
  border-radius: 50%;
  position: relative;
  transition: all 0.2s ease;
}

.radio-input:checked + .radio-label .radio-checkmark {
  border-color: var(--primary);
  background: var(--primary);
}

.radio-input:checked + .radio-label .radio-checkmark::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: white;
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

.endpoint-link {
  color: var(--primary, #007bff);
  text-decoration: none;
  font-family: monospace;
  background: var(--body-bg, #f8f9fa);
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 13px;
  transition: all 0.2s ease;
}

.endpoint-link:hover {
  color: var(--primary-hover, #0056b3);
  text-decoration: underline;
  background: var(--accent-bg, rgba(0, 123, 255, 0.1));
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