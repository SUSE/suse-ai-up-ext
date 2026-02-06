<template>
  <div class="metrics-grid">
    <div class="metric-card">
      <h3>Total Servers</h3>
      <span class="metric-value" v-if="!loading">{{ metrics.totalServers }}</span>
      <span class="metric-value" v-else>...</span>
    </div>
    <div class="metric-card">
      <h3>Active Servers</h3>
      <span class="metric-value" v-if="!loading">{{ metrics.activeServers }}</span>
      <span class="metric-value" v-else>...</span>
    </div>
    <div class="metric-card">
      <h3>Inactive Servers</h3>
      <span class="metric-value" v-if="!loading">{{ metrics.inactiveServers }}</span>
      <span class="metric-value" v-else>...</span>
    </div>
    <div class="metric-card">
      <h3>Total Tools</h3>
      <span class="metric-value" v-if="!loading">{{ metrics.totalTools }}</span>
      <span class="metric-value" v-else>...</span>
    </div>
    <div class="metric-card">
      <h3>Total Resources</h3>
      <span class="metric-value" v-if="!loading">{{ metrics.totalResources }}</span>
      <span class="metric-value" v-else>...</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ServerMetrics } from '../../types/virtual-mcp-types';

interface Props {
  metrics: ServerMetrics;
  loading?: boolean;
}

defineProps<Props>();
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
</style>