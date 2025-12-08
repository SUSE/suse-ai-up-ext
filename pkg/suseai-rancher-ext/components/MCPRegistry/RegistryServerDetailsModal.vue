<template>
  <div v-if="show" class="modal-overlay" @click="$emit('close')">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>{{ server?.name || 'Server' }} Details</h3>
        <button @click="$emit('close')" class="btn btn-sm">×</button>
      </div>
      <div class="modal-body">
        <div v-if="!server" class="error-state">
          <i class="icon icon-error"></i>
          <p>No server data available</p>
        </div>

        <div v-else class="server-details">
          <!-- Basic Information -->
          <div class="detail-section">
            <h4>Basic Information</h4>
            <p><strong>Name:</strong> {{ server.name }}</p>
            <p><strong>Description:</strong> {{ server.description }}</p>
            <p v-if="server.address"><strong>Address:</strong> {{ server.address }}</p>
            <p v-if="server.port"><strong>Port:</strong> {{ server.port }}</p>
            <p v-if="server.protocol"><strong>Protocol:</strong> {{ server.protocol || 'Unknown' }}</p>
            <p v-if="server.connection"><strong>Connection:</strong> {{ server.connection }}</p>
            <p v-if="server.discoveredAt"><strong>Discovered At:</strong> {{ new Date(server.discoveredAt).toLocaleString() }}</p>
            <p v-if="server.lastSeen"><strong>Last Seen:</strong> {{ new Date(server.lastSeen).toLocaleString() }}</p>
            <p v-if="server.validation_status"><strong>Validation Status:</strong> {{ server.validation_status }}</p>
          </div>

          <!-- Metadata -->
          <div v-if="server._meta" class="detail-section">
            <h4>Metadata</h4>
            <p v-if="server._meta.source"><strong>Source:</strong> {{ server._meta.source }}</p>
            <p v-if="server._meta.category"><strong>Category:</strong> {{ server._meta.category }}</p>
            <p v-if="server._meta.userAuthRequired !== undefined"><strong>Requires Auth:</strong> {{ server._meta.userAuthRequired ? 'Yes' : 'No' }}</p>
            <p v-if="server._meta.authType"><strong>Auth Type:</strong> {{ server._meta.authType }}</p>
            <p v-if="server._meta.documentation"><strong>Documentation:</strong> <a :href="server._meta.documentation" target="_blank">{{ server._meta.documentation }}</a></p>
            <p v-if="server._meta.hosted !== undefined"><strong>Hosted:</strong> {{ server._meta.hosted ? 'Yes' : 'No' }}</p>
            <p v-if="server._meta.requiresInstallation !== undefined"><strong>Requires Installation:</strong> {{ server._meta.requiresInstallation ? 'Yes' : 'No' }}</p>
            <p v-if="server._meta.transportType"><strong>Transport Type:</strong> {{ server._meta.transportType }}</p>
            <p v-if="server._meta.validation_status"><strong>Validation Status:</strong> {{ server._meta.validation_status }}</p>
            <div v-if="server._meta.tags && server._meta.tags.length">
              <strong>Tags:</strong>
              <div class="tags-list">
                <span v-for="tag in server._meta.tags" :key="tag" class="tag">{{ tag }}</span>
              </div>
            </div>
            <div v-if="server._meta.badges && server._meta.badges.length">
              <strong>Badges:</strong>
              <div class="badges-list">
                <span v-for="badge in server._meta.badges" :key="badge" class="badge">{{ badge }}</span>
              </div>
            </div>
          </div>

          <!-- Additional Metadata -->
          <div v-if="server.metadata" class="detail-section">
            <h4>Additional Metadata</h4>
            <p v-if="server.metadata.auth_type"><strong>Auth Type:</strong> {{ server.metadata.auth_type }}</p>
            <p v-if="server.metadata.detectionMethod"><strong>Detection Method:</strong> {{ server.metadata.detectionMethod }}</p>
            <p v-if="server.metadata.validation_status"><strong>Validation Status:</strong> {{ server.metadata.validation_status }}</p>
          </div>

          <!-- Packages -->
          <div v-if="server.packages?.length" class="detail-section">
            <h4>Packages</h4>
            <div v-for="pkg in server.packages" :key="pkg.identifier" class="package-item">
              <p><strong>Identifier:</strong> {{ pkg.identifier }}</p>
              <p><strong>Type:</strong> {{ pkg.registryType }}</p>
              <p><strong>Transport:</strong> {{ pkg.transport.type }}</p>
              <div v-if="pkg.environmentVariables?.length" class="env-vars">
                <p><strong>Environment Variables:</strong></p>
                <ul>
                  <li v-for="env in pkg.environmentVariables" :key="env.name">
                    {{ env.name }}: {{ env.description || 'No description' }}
                    <span v-if="env.required" class="required">(Required)</span>
                    <span v-if="env.isSecret" class="secret">(Secret)</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <!-- Tools -->
          <div v-if="server.tools?.length" class="detail-section">
            <h4>Tools</h4>
            <div v-for="tool in server.tools" :key="tool.name" class="tool-item">
              <p><strong>Name:</strong> {{ tool.name }}</p>
              <p><strong>Description:</strong> {{ tool.description }}</p>
            </div>
          </div>

          <!-- Configuration Template -->
          <div v-if="server.config_template" class="detail-section">
            <h4>Configuration Template</h4>
            <div class="config-template">
              <p><strong>Command:</strong> {{ server.config_template.command }}</p>
              <p><strong>Arguments:</strong> {{ server.config_template.args?.join(' ') || 'None' }}</p>
              <p><strong>Transport:</strong> {{ server.config_template.transport }}</p>
              <p><strong>Image:</strong> {{ server.config_template.image }}</p>

              <div v-if="server.config_template.env && Object.keys(server.config_template.env).length" class="env-vars">
                <p><strong>Environment Variables:</strong></p>
                <ul>
                  <li v-for="(value, key) in server.config_template.env" :key="key">
                    {{ key }}: {{ value || '(user must provide)' }}
                  </li>
                </ul>
              </div>

              <div v-if="server.config_template.resource_limits" class="resource-limits">
                <p><strong>Resource Limits:</strong></p>
                <ul>
                  <li v-if="server.config_template.resource_limits.cpu">
                    CPU: {{ server.config_template.resource_limits.cpu }}
                  </li>
                  <li v-if="server.config_template.resource_limits.memory">
                    Memory: {{ server.config_template.resource_limits.memory }}
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <!-- Raw Metadata (for debugging) -->
          <div v-if="server._meta" class="detail-section">
            <h4>Raw Metadata</h4>
            <pre>{{ JSON.stringify(server._meta, null, 2) }}</pre>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'
import type { MCPServer } from '../../services/registry-api'

export default defineComponent({
  name: 'RegistryServerDetailsModal',
  props: {
    show: {
      type: Boolean,
      required: true
    },
    server: {
      type: Object as PropType<MCPServer | null>,
      default: null
    }
  },

  emits: ['close']
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
  max-width: 800px;
  width: 90vw;
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

/* Server details modal content */
.server-details {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.detail-section {
  border: 1px solid var(--border);
  border-radius: var(--border-radius);
  padding: 16px;
  background: var(--card-bg, var(--body-bg));
}

.detail-section h4 {
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--body-text);
}

.detail-section p {
  margin: 8px 0;
  color: var(--body-text);
}

.detail-section strong {
  color: var(--body-text);
  font-weight: 600;
}

.detail-section a {
  color: var(--primary);
  text-decoration: none;
}

.detail-section a:hover {
  text-decoration: underline;
}

.package-item,
.tool-item {
  border: 1px solid var(--border-light, rgba(0,0,0,0.1));
  border-radius: 4px;
  padding: 12px;
  margin-bottom: 8px;
  background: var(--accent-bg, #f9fafb);
}

.env-vars {
  margin-top: 8px;
}

.env-vars ul {
  margin: 4px 0 0 0;
  padding-left: 20px;
}

.env-vars li {
  margin-bottom: 4px;
  color: var(--muted);
}

.required {
  color: var(--error, #dc2626);
  font-weight: 600;
}

.secret {
  color: var(--warning, #d97706);
  font-weight: 600;
}

.detail-section pre {
  background: var(--code-bg, #f6f8fa);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 12px;
  overflow-x: auto;
  font-size: 12px;
  color: var(--body-text);
}

.config-template {
  background: var(--code-bg, #f6f8fa);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 12px;
  font-family: monospace;
  font-size: 13px;
}

.config-template p {
  margin: 4px 0;
}

.resource-limits ul,
.config-template ul {
  margin: 4px 0 0 0;
  padding-left: 20px;
}

.resource-limits li,
.config-template li {
  margin-bottom: 2px;
  color: var(--muted);
}

.tags-list,
.badges-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;
}

.tag,
.badge {
  background: var(--accent-bg, #f0f0f0);
  color: var(--body-text, #333);
  padding: 2px 6px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
}

.badge {
  background: var(--primary, #007bff);
  color: white;
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

.error-state {
  text-align: center;
  padding: 40px 20px;
  color: var(--error, #dc2626);
}

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