<template>
  <div class="metrics-grid">
    <div class="metric-card">
      <h3>Discovered MCP</h3>
      <span class="metric-value" v-if="!loading">{{ discoveredCount }}</span>
      <span class="metric-value" v-else>...</span>
    </div>
    <div class="metric-card">
      <h3>Registered Adapters</h3>
      <span class="metric-value" v-if="!loading">{{ registeredCount }}</span>
      <span class="metric-value" v-else>...</span>
    </div>
    <div class="metric-card">
       <h3>Announced Adapters</h3>
      <span class="metric-value" v-if="!loading">{{ adaptersInErrorCount }}</span>
      <span class="metric-value" v-else>...</span>
    </div>
    <div class="metric-card">
      <h3>Proxy Health</h3>
      <div class="health-badge" :class="proxyHealth?.status?.status || 'unknown'">
        <i class="icon" :class="getHealthIcon(proxyHealth?.status?.status)"></i>
        <span class="health-text">{{ getHealthText(proxyHealth?.status?.status) }}</span>
      </div>
      <div class="last-checked" v-if="proxyHealth?.status?.timestamp">
        {{ formatTimestamp(proxyHealth.status.timestamp) }}
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import type { ServiceHealth } from '../../composables/useHealthMonitoring';

export default defineComponent({
  name: 'MetricsGrid',
  props: {
    discoveredCount: {
      type: Number,
      required: true
    },
    registeredCount: {
      type: Number,
      required: true
    },
    adaptersInErrorCount: {
      type: Number,
      required: true
    },
    proxyHealth: {
      type: Object as () => ServiceHealth,
      default: null
    },
    loading: {
      type: Boolean,
      default: false
    }
  },
  setup() {
    const getHealthIcon = (status: string | undefined) => {
      switch (status) {
        case 'healthy':
          return 'icon-check';
        case 'unhealthy':
          return 'icon-error';
        default:
          return 'icon-question';
      }
    };

    const getHealthText = (status: string | undefined) => {
      switch (status) {
        case 'healthy':
          return 'Healthy';
        case 'unhealthy':
          return 'Unhealthy';
        default:
          return 'Checking...';
      }
    };

    const formatTimestamp = (timestamp: string) => {
      if (!timestamp) return '';
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      return date.toLocaleTimeString();
    };

    return {
      getHealthIcon,
      getHealthText,
      formatTimestamp
    };
  }
});
</script>

<style scoped>
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin: 20px 0;
}

.metric-card {
  background: var(--card-bg, #ffffff);
  border: 1px solid var(--border, #e5e7eb);
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.metric-card h3 {
  margin: 0 0 10px 0;
  font-size: 14px;
  color: var(--muted, #6b7280);
  font-weight: 500;
}

.metric-value {
  font-size: 28px;
  font-weight: bold;
  color: var(--body-text, #111827);
}

.health-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 14px;
  font-weight: 500;
  text-transform: uppercase;
  margin-bottom: 8px;
}

.health-badge.healthy {
  background-color: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.health-badge.healthy .icon {
  color: #28a745;
}

.health-badge.unhealthy {
  background-color: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
  animation: blink 1s infinite;
}

.health-badge.unhealthy .icon {
  color: #dc3545;
}

.health-badge.unknown {
  background-color: #fff3cd;
  color: #856404;
  border: 1px solid #ffeaa7;
}

.health-badge.unknown .icon {
  color: #856404;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0.3; }
}

.last-checked {
  font-size: 12px;
  color: var(--muted, #6b7280);
  margin-top: 4px;
}
</style>