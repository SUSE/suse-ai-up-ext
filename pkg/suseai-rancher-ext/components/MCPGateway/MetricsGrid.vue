<template>
  <div class="metrics-grid">
    <div class="metric-card">
      <h3>Discovered MCP</h3>
      <span class="metric-value" v-if="!loading">{{ discoveredCount }}</span>
      <span class="metric-value" v-else>...</span>
    </div>
    <div class="metric-card">
      <h3>Registered MCP</h3>
      <span class="metric-value" v-if="!loading">{{ registeredCount }}</span>
      <span class="metric-value" v-else>...</span>
    </div>
    <div class="metric-card">
      <h3>Available Registered MCP</h3>
      <span class="metric-value" v-if="!loading">{{ availableCount }}</span>
      <span class="metric-value" v-else>...</span>
    </div>
    <div class="metric-card">
      <h3>error calls rate</h3>
      <span class="metric-value" v-if="!loading">{{ errorRate }}</span>
      <span class="metric-value" v-else>...</span>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

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
    availableCount: {
      type: Number,
      required: true
    },
    errorRate: {
      type: String,
      required: true
    },
    loading: {
      type: Boolean,
      default: false
    }
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
</style>