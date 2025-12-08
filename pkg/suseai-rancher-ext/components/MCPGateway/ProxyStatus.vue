<template>
  <div class="proxy-status-section">
    <h2>Proxy Status</h2>

    <!-- Health Status -->
    <div class="health-section">
      <h3>Health Check</h3>
      <div v-if="loading" class="loading">
        <i class="icon icon-spinner icon-spin"></i>
        Checking health...
      </div>
      <div v-else-if="error" class="error">
        <i class="icon icon-error"></i>
        {{ error }}
      </div>
      <div v-else-if="health" class="health-status" :class="health.status">
        <i class="icon" :class="healthIcon"></i>
        <div class="health-info">
          <strong>{{ health.status.toUpperCase() }}</strong>
          <p>Version: {{ health.version }}</p>
          <p>Last checked: {{ new Date(health.timestamp).toLocaleString() }}</p>
        </div>
      </div>
      <button @click="checkHealth" :disabled="loading" class="btn btn-sm btn-secondary">
        Refresh Health
      </button>
    </div>

    <!-- Tools Section -->
    <div class="tools-section">
      <h3>Available Tools</h3>
      <div v-if="loading" class="loading">
        <i class="icon icon-spinner icon-spin"></i>
        Loading tools...
      </div>
      <div v-else-if="toolsError" class="error">
        {{ toolsError }}
      </div>
      <div v-else-if="tools.length === 0" class="empty">
        No tools available
      </div>
      <div v-else class="tools-list">
        <div v-for="tool in tools" :key="tool.name" class="tool-item">
          <h4>{{ tool.name }}</h4>
          <p>{{ tool.description }}</p>
          <details v-if="tool.inputSchema">
            <summary>Input Schema</summary>
            <pre>{{ JSON.stringify(tool.inputSchema, null, 2) }}</pre>
          </details>
        </div>
      </div>
      <button @click="loadTools" :disabled="loading" class="btn btn-sm btn-secondary">
        Refresh Tools
      </button>
    </div>

    <!-- Resources Section -->
    <div class="resources-section">
      <h3>Available Resources</h3>
      <div v-if="loading" class="loading">
        <i class="icon icon-spinner icon-spin"></i>
        Loading resources...
      </div>
      <div v-else-if="resourcesError" class="error">
        {{ resourcesError }}
      </div>
      <div v-else-if="resources.length === 0" class="empty">
        No resources available
      </div>
      <div v-else class="resources-list">
        <div v-for="resource in resources" :key="resource.uri" class="resource-item">
          <h4>{{ resource.name }}</h4>
          <p><strong>URI:</strong> {{ resource.uri }}</p>
          <p>{{ resource.description }}</p>
          <p><strong>MIME Type:</strong> {{ resource.mimeType }}</p>
        </div>
      </div>
      <button @click="loadResources" :disabled="loading" class="btn btn-sm btn-secondary">
        Refresh Resources
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, ref, computed } from 'vue'
import { useProxy } from '../../composables/useProxy'

export default defineComponent({
  name: 'ProxyStatus',
  setup() {
    const {
      health,
      tools,
      resources,
      loading,
      error,
      checkHealth,
      loadTools,
      loadResources,
      isHealthy
    } = useProxy()

    // Local error states for individual sections
    const toolsError = ref<string | null>(null)
    const resourcesError = ref<string | null>(null)

    onMounted(async () => {
      await Promise.all([
        checkHealth(),
        loadToolsWithError(),
        loadResourcesWithError()
      ])
    })

    const loadToolsWithError = async () => {
      try {
        toolsError.value = null
        await loadTools()
      } catch (err: any) {
        toolsError.value = err.message || 'Failed to load tools'
      }
    }

    const loadResourcesWithError = async () => {
      try {
        resourcesError.value = null
        await loadResources()
      } catch (err: any) {
        resourcesError.value = err.message || 'Failed to load resources'
      }
    }

    const healthIcon = computed(() => {
      if (!health.value) return 'icon-question'
      return health.value.status === 'healthy' ? 'icon-check' : 'icon-error'
    })

    return {
      health,
      tools,
      resources,
      loading,
      error,
      toolsError,
      resourcesError,
      checkHealth,
      loadTools: loadToolsWithError,
      loadResources: loadResourcesWithError,
      healthIcon
    }
  }
})
</script>

<style scoped>
.proxy-status-section {
  margin-top: 40px;
}

.proxy-status-section h2 {
  margin-bottom: 20px;
  color: var(--body-text, #111827);
}

.health-section,
.tools-section,
.resources-section {
  margin-bottom: 30px;
  padding: 20px;
  border: 1px solid var(--border, #e5e7eb);
  border-radius: 8px;
  background: var(--card-bg, #ffffff);
}

.health-section h3,
.tools-section h3,
.resources-section h3 {
  margin-top: 0;
  margin-bottom: 15px;
  color: var(--body-text, #111827);
}

.loading {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-muted, #6b7280);
}

.error {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #dc3545;
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
  padding: 12px;
}

.health-status {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  border-radius: 6px;
  margin-bottom: 12px;
}

.health-status.healthy {
  background: #d4edda;
  border: 1px solid #c3e6cb;
  color: #155724;
}

.health-status.unhealthy {
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  color: #721c24;
}

.health-info strong {
  display: block;
  font-size: 18px;
  margin-bottom: 4px;
}

.health-info p {
  margin: 2px 0;
  font-size: 14px;
  opacity: 0.8;
}

.empty {
  color: var(--text-muted, #6b7280);
  font-style: italic;
  padding: 20px;
  text-align: center;
}

.tools-list,
.resources-list {
  display: grid;
  gap: 16px;
}

.tool-item,
.resource-item {
  padding: 16px;
  border: 1px solid var(--border, #e5e7eb);
  border-radius: 6px;
  background: var(--accent-bg, #f9fafb);
}

.tool-item h4,
.resource-item h4 {
  margin: 0 0 8px 0;
  color: var(--body-text, #111827);
}

.tool-item p,
.resource-item p {
  margin: 4px 0;
  color: var(--text-muted, #6b7280);
  font-size: 14px;
}

.tool-item details {
  margin-top: 12px;
}

.tool-item summary {
  cursor: pointer;
  font-weight: 500;
  color: var(--body-text, #111827);
}

.tool-item pre {
  background: #f6f8fa;
  padding: 12px;
  border-radius: 4px;
  font-size: 12px;
  overflow-x: auto;
  margin-top: 8px;
}

.btn {
  padding: 6px 12px;
  border: 1px solid transparent;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;
}

.btn-secondary {
  background: #6c757d;
  color: white;
  border-color: #6c757d;
}

.btn-secondary:hover:not(:disabled) {
  background: #5a6268;
  border-color: #5a6268;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-sm {
  padding: 4px 8px;
  font-size: 12px;
}
</style>