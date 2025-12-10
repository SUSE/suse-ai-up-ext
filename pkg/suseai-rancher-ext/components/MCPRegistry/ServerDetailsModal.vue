<template>
  <div v-if="show" class="modal-overlay" @click="$emit('close')">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>Server Details</h3>
        <button @click="$emit('close')" class="btn btn-sm">×</button>
      </div>
      <div class="modal-body">
        <div v-if="loading" class="loading-state">
          <i class="icon icon-spinner icon-spin"></i>
          <p>Loading server details...</p>
        </div>
        <div v-else-if="error" class="error-state">
          <i class="icon icon-error"></i>
          <p>{{ error }}</p>
        </div>
        <div v-else-if="serverData" class="server-details">
          <!-- Server Header -->
          <div class="server-header">
            <h3 class="server-title">{{ serverData.name }}</h3>
            <div class="server-meta">
              <span class="version-badge">v{{ serverData.version }}</span>
              <span v-if="serverData._meta?.hosted" class="hosted-badge">Hosted</span>
              <span v-else class="self-hosted-badge">Self-hosted</span>
            </div>
          </div>

          <!-- Description -->
          <div class="detail-section">
            <h4>Description</h4>
            <p class="server-description">{{ serverData.description }}</p>
          </div>

          <!-- Environment Variables -->
          <div v-if="getAllEnvironmentVariables().length > 0" class="detail-section">
            <h4>Environment Variables</h4>
            <div class="env-vars-list">
              <div v-for="env in getAllEnvironmentVariables()" :key="env.name" class="env-var-item">
                <div class="env-var-header">
                  <code class="env-var-name">{{ env.name }}</code>
                  <div class="env-var-flags">
                    <span v-if="env.isSecret" class="flag secret">Secret</span>
                    <span v-if="env.required" class="flag required">Required</span>
                  </div>
                </div>
                <p v-if="env.description" class="env-var-description">{{ env.description }}</p>
              </div>
            </div>
          </div>

          <!-- Setup Instructions -->
          <div v-if="serverData._meta?.setupInstructions" class="detail-section">
            <h4>Setup Instructions</h4>
            <p class="setup-instructions">{{ serverData._meta.setupInstructions }}</p>
          </div>

          <!-- Documentation -->
          <div v-if="serverData._meta?.documentation" class="detail-section">
            <h4>Documentation</h4>
            <a :href="serverData._meta.documentation" target="_blank" class="doc-link">
              {{ serverData._meta.documentation }}
              <i class="icon icon-external-link"></i>
            </a>
          </div>

          <!-- Additional Metadata -->
          <div v-if="serverData._meta" class="detail-section">
            <h4>Additional Information</h4>
            <div class="meta-grid">
              <div v-if="serverData._meta.category" class="meta-item">
                <div class="meta-label">Category</div>
                <div class="meta-value">{{ serverData._meta.category }}</div>
              </div>
              <div v-if="serverData._meta.authType" class="meta-item">
                <div class="meta-label">Authentication</div>
                <div class="meta-value">{{ serverData._meta.authType }}</div>
              </div>
              <div v-if="serverData._meta.transportType" class="meta-item">
                <div class="meta-label">Transport</div>
                <div class="meta-value">{{ serverData._meta.transportType }}</div>
              </div>
              <div v-if="serverData.discovered_at" class="meta-item">
                <div class="meta-label">Discovered</div>
                <div class="meta-value">{{ formatDate(serverData.discovered_at) }}</div>
              </div>
            </div>
          </div>

          <!-- Tags -->
          <div v-if="serverData._meta?.tags?.length" class="detail-section">
            <h4>Tags</h4>
            <div class="tags-list">
              <span v-for="tag in serverData._meta.tags" :key="tag" class="tag">{{ tag }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, watch, onMounted } from 'vue'
import { registryAPI } from '../../services/registry-api'

export default defineComponent({
  name: 'ServerDetailsModal',
  props: {
    show: {
      type: Boolean,
      required: true
    },
    serverId: {
      type: String,
      required: true
    }
  },
  emits: ['close'],
  setup(props) {
    const serverData = ref<any>(null)
    const loading = ref(false)
    const error = ref<string | null>(null)

    const getAllEnvironmentVariables = () => {
      if (!serverData.value?.packages) return []
      const allVars: any[] = []
      serverData.value.packages.forEach((pkg: any) => {
        if (pkg.environmentVariables) {
          allVars.push(...pkg.environmentVariables)
        }
      })
      return allVars
    }

    const formatDate = (dateString: string) => {
      try {
        return new Date(dateString).toLocaleDateString()
      } catch {
        return dateString
      }
    }

    const fetchServerDetails = async () => {
      if (!props.serverId) return
      loading.value = true
      error.value = null
      try {
        const data = await registryAPI.getServer(props.serverId)
        serverData.value = data
      } catch (err: any) {
        error.value = `Failed to load server details: ${err.message || 'Unknown error'}`
      } finally {
        loading.value = false
      }
    }

    watch(() => props.show, (newShow) => {
      if (newShow && props.serverId) {
        fetchServerDetails()
      }
    })

    watch(() => props.serverId, (newId) => {
      if (props.show && newId) {
        fetchServerDetails()
      }
    })

    onMounted(() => {
      if (props.show && props.serverId) {
        fetchServerDetails()
      }
    })

    return {
      serverData,
      loading,
      error,
      getAllEnvironmentVariables,
      formatDate
    }
  }
})
</script>

<style scoped>
/* Modal styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(2px);
}

.modal-content {
  background: var(--body-bg, white);
  border-radius: var(--border-radius, 8px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  max-width: 90vw;
  width: 800px;
  max-height: 80vh;
  overflow-y: auto;
  border: 1px solid var(--border, #e0e0e0);
}

.modal-header {
  padding: 20px 24px;
  border-bottom: 1px solid var(--border, #e0e0e0);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.modal-body {
  padding: 24px;
}

.server-details {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Server Header */
.server-header {
  text-align: center;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border);
}

.server-title {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 600;
  color: var(--body-text);
}

.server-meta {
  display: flex;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
}

.version-badge,
.hosted-badge,
.self-hosted-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.version-badge {
  background: var(--primary, #007bff);
  color: white;
}

.hosted-badge {
  background: var(--success, #28a745);
  color: white;
}

.self-hosted-badge {
  background: var(--warning, #ffc107);
  color: #212529;
}

/* Detail Sections */
.detail-section {
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 16px;
  background: var(--card-bg, white);
}

.detail-section h4 {
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--body-text);
}

.server-description {
  margin: 0;
  line-height: 1.5;
  color: var(--body-text);
}

/* Environment Variables */
.env-vars-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.env-var-item {
  padding: 12px;
  border: 1px solid var(--border-light, #e9ecef);
  border-radius: 6px;
  background: var(--accent-bg, #f8f9fa);
}

.env-var-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.env-var-name {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 14px;
  background: var(--code-bg, #f6f8fa);
  padding: 2px 6px;
  border-radius: 3px;
  color: var(--body-text);
}

.env-var-flags {
  display: flex;
  gap: 6px;
}

.flag {
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
}

.flag.secret {
  background: var(--error, #dc3545);
  color: white;
}

.flag.required {
  background: var(--warning, #ffc107);
  color: #212529;
}

.env-var-description {
  margin: 0;
  font-size: 14px;
  color: var(--muted, #666);
}

/* Setup Instructions */
.setup-instructions {
  margin: 0;
  line-height: 1.5;
  color: var(--body-text);
}

/* Documentation */
.doc-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--primary, #007bff);
  text-decoration: none;
  font-weight: 500;
}

.doc-link:hover {
  text-decoration: underline;
}

/* Metadata Grid */
.meta-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.meta-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--muted, #666);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.meta-value {
  font-size: 14px;
  color: var(--body-text);
}

/* Tags */
.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag {
  padding: 4px 8px;
  background: var(--accent-bg, #f0f0f0);
  color: var(--body-text);
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
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

.btn-sm {
  padding: 4px 8px;
  font-size: 12px;
}

.loading-state,
.error-state {
  text-align: center;
  padding: 40px 20px;
}

.loading-state {
  color: var(--body-text);
}

.error-state {
  color: var(--error, #dc2626);
}

.loading-state i,
.error-state i {
  font-size: 48px;
  margin-bottom: 16px;
  display: block;
}

/* Responsive enhancements */
@media (max-width: 768px) {
  .modal-content {
    width: 95vw;
    margin: 16px;
    max-height: 90vh;
  }

  .modal-header,
  .modal-body {
    padding: 16px;
  }
}
</style>