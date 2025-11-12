<template>
  <div v-if="show" class="modal-overlay" @click="$emit('close')">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>{{ server?.name }} Details</h3>
        <button @click="$emit('close')" class="btn btn-sm">×</button>
      </div>
      <div class="modal-body">
        <div v-if="server" class="server-details">
          <div class="detail-section">
            <h4>Basic Information</h4>
            <p><strong>Name:</strong> {{ server.name }}</p>
            <p><strong>Description:</strong> {{ server.description }}</p>
            <p><strong>Version:</strong> {{ server.version }}</p>
            <p><strong>Protocol:</strong> {{ server.protocol }}</p>
             <p><strong>URL:</strong> {{ server.url }}</p>
            <p><strong>Validation Status:</strong> {{ server.validation_status }}</p>
            <p><strong>Discovered At:</strong> {{ server.discovered_at }}</p>
          </div>

          <div v-if="server.repository" class="detail-section">
            <h4>Repository</h4>
            <p><strong>Source:</strong> {{ server.repository.source }}</p>
            <p><strong>URL:</strong> <a :href="server.repository.url" target="_blank">{{ server.repository.url }}</a></p>
          </div>

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
                    {{ env.name }}: {{ env.description }} ({{ env.isSecret ? 'Secret' : 'Public' }})
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div v-if="server.tools?.length" class="detail-section">
            <h4>Tools</h4>
            <div v-for="tool in server.tools" :key="tool.name" class="tool-item">
              <p><strong>Name:</strong> {{ tool.name }}</p>
              <p><strong>Description:</strong> {{ tool.description }}</p>
            </div>
          </div>

          <div v-if="server._meta" class="detail-section">
            <h4>Metadata</h4>
            <pre>{{ JSON.stringify(server._meta, null, 2) }}</pre>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType, computed } from 'vue';
import { useStore } from 'vuex';
import type { RegistryServer } from '../../services/mcp-service';

export default defineComponent({
  name: 'ServerDetailsModal',

  props: {
    show: {
      type: Boolean,
      required: true
    },
    server: {
      type: Object as PropType<RegistryServer | null>,
      default: null
    }
  },

  emits: ['close'],

   setup() {
     return {};
   }
});
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

.detail-section pre {
  background: var(--code-bg, #f6f8fa);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 12px;
  overflow-x: auto;
  font-size: 12px;
  color: var(--body-text);
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