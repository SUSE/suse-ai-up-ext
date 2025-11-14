<template>
  <div class="pod-card" @click="onSelect">
    <div class="card-header">
      <div class="pod-icon">
        <i class="icon icon-server"></i>
      </div>
      <div class="pod-info">
        <h4>SUSE AI Universal Proxy</h4>
        <p>{{ pod.metadata.namespace }}</p>
      </div>
      <div class="pod-status">
        <span :class="getStatusClass(pod.status)">
          {{ getStatusText(pod.status) }}
        </span>
      </div>
    </div>

    <div class="card-details">
      <div class="detail-row">
        <strong>Phase:</strong> {{ pod.status?.phase || 'Unknown' }}
      </div>
      <div class="detail-row">
        <strong>IP:</strong> {{ pod.status?.podIP || 'N/A' }}
      </div>
      <div class="detail-row">
        <strong>Containers:</strong> {{ pod.spec?.containers?.length || 0 }}
      </div>
      <div class="detail-row">
        <strong>Ports:</strong>
        <span v-if="pod.spec?.containers">
          {{ getContainerPorts(pod.spec.containers) }}
        </span>
        <span v-else>N/A</span>
      </div>
    </div>

    <div class="card-actions">
      <button class="btn-primary">Select This Pod</button>
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
  }
  spec?: {
    containers?: any[]
  }
}

export default defineComponent({
  name: 'PodCard',
  props: {
    pod: {
      type: Object as PropType<Pod>,
      required: true
    }
  },
  emits: ['select'],
  methods: {
    onSelect() {
      this.$emit('select', this.pod)
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

    getContainerPorts(containers: any[]): string {
      const ports = new Set()
      containers.forEach(container => {
        if (container.ports) {
          container.ports.forEach((port: any) => {
            if (port.containerPort) {
              ports.add(port.containerPort)
            }
          })
        }
      })
      return Array.from(ports).join(', ') || 'None'
    }
  }
})
</script>

<style scoped>
.pod-card {
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--card-bg);
  cursor: pointer;
  transition: all 0.2s ease;
  overflow: hidden;
}

.pod-card:hover {
  border-color: var(--primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  align-items: center;
  padding: 16px;
  background: var(--accent-bg, rgba(0, 123, 255, 0.05));
  border-bottom: 1px solid var(--border-light, rgba(0,0,0,0.1));
}

.pod-icon {
  font-size: 24px;
  color: var(--primary);
  margin-right: 12px;
  min-width: 24px;
}

.pod-info h4 {
  margin: 0 0 4px 0;
  font-size: 16px;
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
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
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

.card-details {
  padding: 16px;
}

.detail-row {
  margin-bottom: 8px;
  font-size: 14px;
  display: flex;
  justify-content: space-between;
}

.detail-row strong {
  color: var(--body-text);
  font-weight: 500;
}

.detail-row:last-child {
  margin-bottom: 0;
}

.card-actions {
  padding: 16px;
  border-top: 1px solid var(--border-light, rgba(0,0,0,0.1));
  text-align: center;
}

.btn-primary {
  background: var(--primary);
  color: white;
  border: 1px solid var(--primary);
  border-radius: 4px;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
}

.btn-primary:hover {
  background: var(--primary-hover, darken(var(--primary), 10%));
}
</style>