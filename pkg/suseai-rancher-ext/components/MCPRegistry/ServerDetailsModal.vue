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
             <div class="server-icon-container" v-if="serverData.about?.icon_url || serverData.icon">
               <img :src="serverData.about?.icon_url || serverData.icon" :alt="serverData.about?.title || serverData.name" class="server-icon" />
             </div>
             <div class="server-title-section">
               <h3 class="server-title">{{ serverData.about?.title || serverData.name }}</h3>
               <div class="server-meta">
                 <span class="version-badge">v{{ serverData.version }}</span>
                 <span v-if="serverData._meta?.hosted" class="hosted-badge">Hosted</span>
                 <span v-else class="self-hosted-badge">Self-hosted</span>
               </div>
             </div>
           </div>

           <!-- Description -->
           <div class="detail-section">
             <h4>Description</h4>
             <p class="server-description">{{ serverData.about?.description || serverData.description }}</p>
           </div>

           <!-- Connection Details -->
           <div v-if="serverData.address || serverData.port || serverData.protocol || serverData.connection" class="detail-section">
             <h4>Connection Details</h4>
             <div class="connection-details">
               <div class="connection-grid">
                 <div v-if="serverData.protocol" class="connection-item">
                   <div class="connection-label">Protocol</div>
                   <div class="connection-value">{{ serverData.protocol }}</div>
                 </div>
                 <div v-if="serverData.address" class="connection-item">
                   <div class="connection-label">Address</div>
                   <div class="connection-value">{{ serverData.address }}</div>
                 </div>
                 <div v-if="serverData.port" class="connection-item">
                   <div class="connection-label">Port</div>
                   <div class="connection-value">{{ serverData.port }}</div>
                 </div>
                 <div v-if="serverData.connection" class="connection-item">
                   <div class="connection-label">Connection Type</div>
                   <div class="connection-value">{{ serverData.connection }}</div>
                 </div>
               </div>
             </div>
           </div>

           <!-- Server Configuration -->
           <div v-if="serverData._meta?.config" class="detail-section">
             <h4>Server Configuration</h4>
             <div class="server-config">
               <p v-if="serverData._meta.config.description" class="config-description">{{ serverData._meta.config.description }}</p>

               <!-- Parameters -->
               <div v-if="serverData._meta.config.parameters?.properties" class="config-section">
                 <h5>Parameters</h5>
                 <div class="parameters-list">
                   <div v-for="(param, paramKey) in serverData._meta.config.parameters.properties" :key="paramKey" class="parameter-item">
                     <div class="parameter-header">
                       <code class="parameter-name">{{ paramKey }}</code>
                       <span v-if="serverData._meta.config.parameters.required?.includes(paramKey)" class="parameter-required">Required</span>
                     </div>
                     <p v-if="param.description" class="parameter-description">{{ param.description }}</p>
                     <div class="parameter-details">
                       <span class="parameter-type">Type: {{ param.type }}</span>
                       <span v-if="param.default !== undefined" class="parameter-default">Default: {{ param.default }}</span>
                       <span v-if="param.example" class="parameter-example">Example: {{ param.example }}</span>
                     </div>
                   </div>
                 </div>
               </div>

               <!-- Environment Variables -->
               <div v-if="serverData._meta.config.env?.length" class="config-section">
                 <h5>Environment Variables</h5>
                 <div class="env-vars-list">
                   <div v-for="env in serverData._meta.config.env" :key="env.name" class="env-var-item">
                     <div class="env-var-header">
                       <code class="env-var-name">{{ env.name }}</code>
                     </div>
                     <p v-if="env.description" class="env-var-description">{{ env.description }}</p>
                     <div class="env-var-details">
                       <span v-if="env.value" class="env-var-value">Value: {{ env.value }}</span>
                       <span v-if="env.example" class="env-var-example">Example: {{ env.example }}</span>
                     </div>
                   </div>
                 </div>
               </div>

               <!-- Secrets -->
               <div v-if="serverData._meta.config.secrets?.length" class="config-section">
                 <h5>Secrets</h5>
                 <div class="secrets-list">
                   <div v-for="secret in serverData._meta.config.secrets" :key="secret.name" class="secret-item">
                     <div class="secret-header">
                       <code class="secret-name">{{ secret.name }}</code>
                       <span v-if="secret.required" class="secret-required">Required</span>
                     </div>
                     <p v-if="secret.description" class="secret-description">{{ secret.description }}</p>
                     <div class="secret-details">
                       <span class="secret-env">Env: {{ secret.env }}</span>
                       <span v-if="secret.example" class="secret-example">Example: {{ secret.example }}</span>
                     </div>
                   </div>
                 </div>
               </div>
             </div>
           </div>

           <!-- Configuration Template -->
           <div v-if="serverData.config_template" class="detail-section">
             <h4>Configuration Template</h4>
             <div class="config-template">
               <pre class="config-code">{{ formatConfigTemplate(serverData.config_template) }}</pre>
             </div>
           </div>

           <!-- Tools -->
           <div v-if="serverData.tools && serverData.tools.length > 0" class="detail-section">
             <h4>Available Tools ({{ serverData.tools.length }})</h4>
             <div class="tools-list">
               <div v-for="tool in serverData.tools" :key="tool.name || tool" class="tool-item">
                 <div class="tool-name">{{ tool.name || tool }}</div>
                 <div v-if="tool.description" class="tool-description">{{ tool.description }}</div>
               </div>
             </div>
           </div>

           <!-- Packages -->
           <div v-if="serverData.packages && serverData.packages.length > 0" class="detail-section">
             <h4>Packages ({{ serverData.packages.length }})</h4>
             <div class="packages-list">
               <div v-for="pkg in serverData.packages" :key="pkg.identifier || pkg.name" class="package-item">
                 <div class="package-header">
                   <div class="package-name">{{ pkg.identifier || pkg.name }}</div>
                   <div class="package-type">{{ pkg.registryType || pkg.type }}</div>
                 </div>
                 <div class="package-transport">
                   Transport: {{ pkg.transport?.type || 'Unknown' }}
                 </div>
                 <div v-if="pkg.environmentVariables && pkg.environmentVariables.length > 0" class="package-envs">
                   <div class="env-count">{{ pkg.environmentVariables.length }} environment variable{{ pkg.environmentVariables.length !== 1 ? 's' : '' }}</div>
                   <div class="env-vars-preview">
                     <div v-for="env in pkg.environmentVariables.slice(0, 3)" :key="env.name" class="env-preview">
                       <code class="env-name">{{ env.name }}</code>
                       <span v-if="env.required" class="env-required">*</span>
                     </div>
                     <div v-if="pkg.environmentVariables.length > 3" class="env-more">
                       +{{ pkg.environmentVariables.length - 3 }} more
                     </div>
                   </div>
                 </div>
               </div>
             </div>
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
                 <div v-if="env.default" class="env-var-default">
                   <strong>Default:</strong> <code>{{ env.default }}</code>
                 </div>
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
           <div v-if="serverData.tags?.length || serverData._meta?.tags?.length" class="detail-section">
             <h4>Tags</h4>
             <div class="tags-list">
               <span v-for="tag in (serverData.tags || serverData._meta?.tags || [])" :key="tag" class="tag">{{ tag }}</span>
             </div>
           </div>

 

            <!-- Source Information -->
             <div v-if="getSourceUrl(serverData) || (serverData as any).repository || serverData.source_url || serverData.project_url" class="detail-section">
               <h4>Source Information</h4>
               <div class="source-details">
                 <!-- Source/Project URL (highest priority) -->
                 <div v-if="getSourceUrl(serverData)" class="source-item">
                   <div class="source-label">Source:</div>
                   <a :href="getSourceUrl(serverData)" target="_blank" rel="noopener noreferrer" class="source-link">
                     {{ getSourceUrl(serverData) }}
                     <i class="icon icon-external-link"></i>
                   </a>
                 </div>
                 <!-- Repository -->
                 <div v-if="(serverData as any).repository?.url && !(serverData as any).source?.project" class="source-item">
                   <div class="source-label">Repository:</div>
                   <a :href="(serverData as any).repository.url" target="_blank" rel="noopener noreferrer" class="source-link">
                     {{ (serverData as any).repository.url }}
                     <i class="icon icon-external-link"></i>
                   </a>
                 </div>
                 <!-- Branch -->
                 <div v-if="(serverData as any).repository?.branch" class="source-item">
                   <div class="source-label">Branch:</div>
                   <div class="source-value">{{ (serverData as any).repository.branch }}</div>
                 </div>
                 <!-- Commit -->
                 <div v-if="(serverData as any).repository?.commit" class="source-item">
                   <div class="source-label">Commit:</div>
                   <div class="source-value">{{ (serverData as any).repository.commit }}</div>
                 </div>
                 <!-- Source from meta (fallback) -->
                 <div v-if="serverData._meta?.source && !getSourceUrl(serverData) && !(serverData as any).repository?.url" class="source-item">
                   <div class="source-label">Source:</div>
                   <a :href="serverData._meta.source" target="_blank" rel="noopener noreferrer" class="source-link">
                     {{ serverData._meta.source }}
                     <i class="icon icon-external-link"></i>
                   </a>
                 </div>
                 <!-- Source URL fallback -->
                 <div v-if="serverData.source_url && !getSourceUrl(serverData) && !serverData._meta?.source && !(serverData as any).repository?.url" class="source-item">
                   <div class="source-label">Source Code:</div>
                   <a :href="serverData.source_url" target="_blank" rel="noopener noreferrer" class="source-link">
                     View Source
                     <i class="icon icon-external-link"></i>
                   </a>
                 </div>
                 <!-- Project URL (fallback) -->
                 <div v-if="serverData.project_url && !getSourceUrl(serverData)" class="source-item">
                   <div class="source-label">Project:</div>
                   <a :href="serverData.project_url" target="_blank" rel="noopener noreferrer" class="source-link">
                     View Project
                     <i class="icon icon-external-link"></i>
                   </a>
                 </div>
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
  setup(props, { emit }) {
    const serverData = ref<any>(null)
    const loading = ref(false)
    const error = ref<string | null>(null)

    const getAllEnvironmentVariables = () => {
      const allVars: any[] = []

      // Add secrets from the new API structure
      if (serverData.value?.secrets) {
        allVars.push(...serverData.value.secrets.map((secret: any) => ({
          name: secret.name,
          description: secret.description,
          default: secret.value,
          isSecret: true, // Mark as secret since they come from secrets array
          required: false // Assume not required unless specified
        })))
      }

      // Add environment variables from packages (legacy support)
      if (serverData.value?.packages) {
        serverData.value.packages.forEach((pkg: any) => {
          if (pkg.environmentVariables) {
            allVars.push(...pkg.environmentVariables)
          }
        })
      }

      return allVars
    }

    const formatDate = (dateString: string) => {
      try {
        return new Date(dateString).toLocaleDateString()
      } catch {
        return dateString
      }
    }

    const formatConfigTemplate = (config: any) => {
      if (typeof config === 'string') {
        return config
      }
      if (typeof config === 'object') {
        return JSON.stringify(config, null, 2)
      }
      return String(config)
    }

    const getSourceUrl = (server: any): string => {
      // Check for source.project from YAML (highest priority)
      if (server.source?.project) {
        return server.source.project
      }
      // Check for source.url as alternative
      if (server.source?.url) {
        return server.source.url
      }
      // Prefer repository URL if available
      if (server.repository?.url) {
        return server.repository.url
      }
      // Fall back to _meta.source
      if (server._meta?.source) {
        return server._meta.source
      }
      // Last resort: source_url
      return server.source_url || ''
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
      formatDate,
      formatConfigTemplate,
      getSourceUrl
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
  display: flex;
  align-items: center;
  gap: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border);
}

.server-icon-container {
  flex-shrink: 0;
}

.server-icon {
  width: 64px;
  height: 64px;
  border-radius: 8px;
  object-fit: cover;
}

.server-title-section {
  flex: 1;
}

.server-title {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 600;
  color: var(--body-text);
}

.server-meta {
  display: flex;
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

/* Connection Details */
.connection-details {
  background: var(--accent-bg, #f8f9fa);
  border-radius: 6px;
  padding: 16px;
}

.connection-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.connection-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.connection-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--muted, #666);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.connection-value {
  font-size: 14px;
  color: var(--body-text);
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  background: var(--body-bg, white);
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid var(--border, #e0e0e0);
}

/* Configuration Template */
.config-template {
  background: var(--code-bg, #f6f8fa);
  border: 1px solid var(--border, #e0e0e0);
  border-radius: 6px;
  overflow-x: auto;
}

.config-code {
  margin: 0;
  padding: 16px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
  line-height: 1.4;
  color: var(--body-text);
  white-space: pre-wrap;
  word-break: break-all;
}

/* Tools */
.tools-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tool-item {
  padding: 12px;
  border: 1px solid var(--border-light, #e9ecef);
  border-radius: 6px;
  background: var(--accent-bg, #f8f9fa);
}

.tool-name {
  font-weight: 600;
  color: var(--body-text);
  margin-bottom: 4px;
}

.tool-description {
  font-size: 14px;
  color: var(--muted, #666);
  margin: 0;
}

/* Packages */
.packages-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.package-item {
  padding: 16px;
  border: 1px solid var(--border-light, #e9ecef);
  border-radius: 8px;
  background: var(--accent-bg, #f8f9fa);
}

.package-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.package-name {
  font-weight: 600;
  color: var(--body-text);
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

.package-type {
  padding: 2px 8px;
  background: var(--primary, #007bff);
  color: white;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
}

.package-transport {
  font-size: 14px;
  color: var(--muted, #666);
  margin-bottom: 8px;
}

.package-envs {
  border-top: 1px solid var(--border, #e0e0e0);
  padding-top: 8px;
}

.env-count {
  font-size: 12px;
  color: var(--muted, #666);
  margin-bottom: 6px;
  font-weight: 500;
}

.env-vars-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.env-preview {
  display: flex;
  align-items: center;
  gap: 4px;
}

.env-name {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 12px;
  background: var(--code-bg, #f6f8fa);
  padding: 2px 6px;
  border-radius: 3px;
  color: var(--body-text);
}

.env-required {
  color: var(--error, #dc3545);
  font-weight: bold;
}

.env-more {
  font-size: 12px;
  color: var(--muted, #666);
  font-style: italic;
}

/* Server Configuration */
.server-config {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.config-description {
  margin: 0 0 16px 0;
  font-size: 14px;
  color: var(--body-text);
  line-height: 1.5;
}

.config-section {
  border: 1px solid var(--border-light, #e9ecef);
  border-radius: 8px;
  padding: 16px;
  background: var(--accent-bg, #f8f9fa);
}

.config-section h5 {
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--body-text);
}

/* Parameters */
.parameters-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.parameter-item {
  padding: 12px;
  border: 1px solid var(--border, #e0e0e0);
  border-radius: 6px;
  background: var(--body-bg, white);
}

.parameter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.parameter-name {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 14px;
  background: var(--code-bg, #f6f8fa);
  padding: 2px 6px;
  border-radius: 3px;
  color: var(--body-text);
}

.parameter-required {
  background: var(--error, #dc3545);
  color: white;
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
}

.parameter-description {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: var(--muted, #666);
  line-height: 1.4;
}

.parameter-details {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 12px;
  color: var(--muted, #666);
}

.parameter-type,
.parameter-default,
.parameter-example {
  padding: 2px 0;
}

.parameter-default,
.parameter-example {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

/* Environment Variables */
.env-vars-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.env-var-item {
  padding: 12px;
  border: 1px solid var(--border, #e0e0e0);
  border-radius: 6px;
  background: var(--body-bg, white);
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
  margin: 0 0 8px 0;
  font-size: 14px;
  color: var(--muted, #666);
  line-height: 1.4;
}

.env-var-details {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 12px;
  color: var(--muted, #666);
}

.env-var-value,
.env-var-example {
  padding: 2px 0;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

.env-var-default {
  margin: 0;
  font-size: 13px;
  color: var(--body-text);
}

.env-var-default code {
  background: var(--code-bg, #f6f8fa);
  padding: 1px 4px;
  border-radius: 3px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 12px;
}

/* Secrets */
.secrets-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.secret-item {
  padding: 12px;
  border: 1px solid var(--border, #e0e0e0);
  border-radius: 6px;
  background: var(--body-bg, white);
}

.secret-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.secret-name {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 14px;
  background: var(--code-bg, #f6f8fa);
  padding: 2px 6px;
  border-radius: 3px;
  color: var(--body-text);
}

.secret-required {
  background: var(--error, #dc3545);
  color: white;
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
}

.secret-description {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: var(--muted, #666);
  line-height: 1.4;
}

.secret-details {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 12px;
  color: var(--muted, #666);
}

.secret-env,
.secret-example {
  padding: 2px 0;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
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

/* Links */
.links-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.link-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--primary, #007bff);
  text-decoration: none;
  font-weight: 500;
  padding: 8px 12px;
  border: 1px solid var(--border, #e0e0e0);
  border-radius: 6px;
  background: var(--accent-bg, #f8f9fa);
  transition: all 0.2s ease;
}

.link-item:hover {
  background: var(--primary, #007bff);
  color: white;
  text-decoration: none;
  border-color: var(--primary, #007bff);
}

.source-details {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.source-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid var(--border-light, #f0f0f0);
}

.source-item:last-child {
  border-bottom: none;
}

.source-label {
  font-weight: 600;
  color: var(--body-text, #333);
  min-width: 100px;
  flex-shrink: 0;
}

.source-value {
  color: var(--body-text, #333);
  font-family: monospace;
  background: var(--accent-bg, #f8f9fa);
  padding: 2px 6px;
  border-radius: 3px;
}

.source-link {
  color: var(--primary, #007bff);
  text-decoration: none;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.source-link:hover {
  text-decoration: underline;
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