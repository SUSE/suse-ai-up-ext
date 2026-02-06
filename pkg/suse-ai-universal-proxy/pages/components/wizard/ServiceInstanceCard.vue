<template>
  <div class="service-instance-card">
    <div class="card-header">
      <h4>{{ instance.name }}</h4>
      <span class="cluster-badge">{{ instance.clusterName }}</span>
    </div>

    <div class="card-details">
      <div class="detail-row">
        <strong>Namespace:</strong> {{ instance.namespace }}
      </div>
      <div class="detail-row">
        <strong>Port:</strong> {{ instance.port }}
      </div>
      <div class="detail-row">
        <strong>Type:</strong> {{ instance.type }}
      </div>
      <div v-if="instance.clusterIP" class="detail-row">
        <strong>Cluster IP:</strong> {{ instance.clusterIP }}
      </div>
       <div v-if="allExternalIPs.length > 0" class="detail-row">
         <strong>External IPs:</strong> {{ allExternalIPs.join(', ') }}
       </div>
      <div v-if="instance.url" class="detail-row">
        <strong>URL:</strong>
        <a :href="instance.url" target="_blank" rel="noopener">{{ instance.url }}</a>
      </div>
      <div class="detail-row">
        <strong>Status:</strong>
        <span :class="statusClass">
          {{ statusLabel }}
        </span>
      </div>
      <div class="detail-row">
        <strong>Last Checked:</strong> {{ formatLastChecked(instance.lastChecked) }}
      </div>
      <div v-if="instance.responseTime" class="detail-row">
        <strong>Response Time:</strong> {{ instance.responseTime }}ms
      </div>
      <div v-if="instance.errorMessage" class="detail-row">
        <strong>Error:</strong>
        <span class="error-message">{{ instance.errorMessage }}</span>
      </div>
    </div>

    <div class="card-actions">
      <button
        class="btn btn-primary"
        @click="handleConnect"
        :disabled="!isAvailable"
      >
        {{ isAvailable ? 'Connect' : 'Unavailable' }}
      </button>
      <button
        class="btn btn-secondary"
        @click="handleConfigure"
      >
        Configure
      </button>
      <button
        v-if="showHealthCheck"
        class="btn btn-outline"
        @click="handleHealthCheck"
        :disabled="healthCheckLoading"
      >
        {{ healthCheckLoading ? 'Checking...' : 'Health Check' }}
      </button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue';
import type { ServiceInstance } from '../../../types/service-discovery';

interface Props {
  instance: ServiceInstance;
  showHealthCheck?: boolean;
}

interface Emits {
  (e: 'connect', instance: ServiceInstance): void;
  (e: 'configure', instance: ServiceInstance): void;
  (e: 'health-check', instance: ServiceInstance): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// Local state
const healthCheckLoading = ref(false);

// Computed properties
const isAvailable = computed(() => props.instance.status === 'available');

const allExternalIPs = computed(() => {
  const ips: string[] = [];
  if (props.instance.externalIPs) {
    ips.push(...props.instance.externalIPs);
  }
  if (props.instance.loadBalancerIPs) {
    ips.push(...props.instance.loadBalancerIPs);
  }
  return ips;
});

const statusClass = computed(() => {
  switch (props.instance.status) {
    case 'available': return 'status-available';
    case 'unreachable': return 'status-unreachable';
    case 'error': return 'status-error';
    default: return 'status-unknown';
  }
});

const statusLabel = computed(() => {
  switch (props.instance.status) {
    case 'available': return 'Available';
    case 'unreachable': return 'Unreachable';
    case 'error': return 'Error';
    default: return 'Unknown';
  }
});

// Methods
const formatLastChecked = (timestamp: string): string => {
  try {
    const date = new Date(timestamp);
    return date.toLocaleString();
  } catch {
    return timestamp;
  }
};

const handleConnect = () => {
  if (isAvailable.value) {
    emit('connect', props.instance);
  }
};

const handleConfigure = () => {
  emit('configure', props.instance);
};

const handleHealthCheck = async () => {
  if (healthCheckLoading.value) return;

  healthCheckLoading.value = true;
  try {
    emit('health-check', props.instance);
  } finally {
    // Reset loading after a short delay to show feedback
    setTimeout(() => {
      healthCheckLoading.value = false;
    }, 1000);
  }
};
</script>

<style scoped>
.service-instance-card {
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 20px;
  background: var(--card-bg);
  transition: box-shadow 0.2s ease;
}

.service-instance-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.card-header h4 {
  margin: 0;
  color: var(--primary);
  font-size: 18px;
  font-weight: 600;
}

.cluster-badge {
  background: var(--primary);
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.card-details {
  margin-bottom: 15px;
}

.detail-row {
  margin-bottom: 8px;
  font-size: 14px;
  line-height: 1.4;
}

.detail-row strong {
  color: var(--body-text);
  font-weight: 600;
  margin-right: 8px;
  min-width: 100px;
  display: inline-block;
}

.detail-row a {
  color: var(--primary);
  text-decoration: none;
  word-break: break-all;
}

.detail-row a:hover {
  text-decoration: underline;
}

.error-message {
  color: var(--error);
  font-style: italic;
}

.status-available {
  color: var(--success);
  font-weight: 600;
}

.status-unreachable {
  color: var(--warning);
  font-weight: 600;
}

.status-error {
  color: var(--error);
  font-weight: 600;
}

.status-unknown {
  color: var(--muted);
  font-weight: 600;
}

.card-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.btn {
  padding: 8px 16px;
  border: 1px solid transparent;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  display: inline-block;
  text-align: center;
  transition: all 0.2s ease;
  min-width: 80px;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-hover, darken(var(--primary), 10%));
  border-color: var(--primary-hover, darken(var(--primary), 10%));
}

.btn-secondary {
  background: var(--secondary);
  color: var(--body-text);
  border-color: var(--secondary);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--secondary-hover, darken(var(--secondary), 10%));
  border-color: var(--secondary-hover, darken(var(--secondary), 10%));
}

.btn-outline {
  background: transparent;
  color: var(--primary);
  border-color: var(--primary);
}

.btn-outline:hover:not(:disabled) {
  background: var(--primary);
  color: white;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .service-instance-card {
    padding: 15px;
  }

  .card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .card-actions {
    flex-direction: column;
  }

  .btn {
    width: 100%;
  }

  .detail-row strong {
    min-width: auto;
    display: block;
    margin-bottom: 4px;
  }
}
</style>