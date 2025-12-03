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

           <div class="detail-section">
             <h4>Spawning Options</h4>
             <div class="spawning-options">
               <p>This server can be automatically spawned as a running MCP adapter.</p>
               <div class="spawn-config">
                 <h5>Environment Variables</h5>
                 <p>Configure the following environment variables when spawning:</p>
                 <div v-if="server.packages?.length" class="env-config-list">
                   <div v-for="pkg in server.packages" :key="pkg.identifier" class="env-config-item">
                     <h6>{{ pkg.registryType }}: {{ pkg.identifier }}</h6>
                     <div v-if="pkg.environmentVariables?.length" class="env-vars-list">
                       <div v-for="env in pkg.environmentVariables" :key="env.name" class="env-var-item">
                         <label>{{ env.name }}</label>
                         <input
                           type="text"
                           :placeholder="env.description"
                           v-model="spawnEnvVars[env.name]"
                           class="env-input"
                         />
                         <span class="env-type">{{ env.isSecret ? 'Secret' : 'Public' }}</span>
                       </div>
                     </div>
                     <div v-else class="no-env-vars">
                       No environment variables required
                     </div>
                   </div>
                 </div>
                 <div v-else class="no-packages">
                   No package configuration available
                 </div>
               </div>

               <div class="spawn-actions">
                 <div class="action-buttons">
                   <button
                     class="btn btn-primary"
                     @click="spawnServer"
                     :disabled="!canSpawn"
                   >
                     Spawn Server
                   </button>
                   <button
                     v-if="server.config_template"
                     class="btn btn-secondary"
                     @click="showDeploymentModal = true"
                   >
                     Deploy to K8s
                   </button>
                 </div>
                 <p class="spawn-note">
                   Spawn creates a running MCP adapter with automatic process management.<br>
                   Deploy creates a Kubernetes deployment for production use.
                 </p>
               </div>
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

  <DeploymentModal
    :show="showDeploymentModal"
    :server="server"
    @close="showDeploymentModal = false"
    @deployed="handleDeployment"
  />
</template>

<script lang="ts">
import { defineComponent, type PropType, computed, ref, reactive } from 'vue';
import { useStore } from 'vuex';
import type { RegistryServer } from '../../services/mcp-service';
import { MCPService } from '../../services/mcp-service';
import { logger } from '../../utils/logger';
import DeploymentModal from './DeploymentModal.vue';

export default defineComponent({
  name: 'ServerDetailsModal',
  components: {
    DeploymentModal
  },

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

  emits: ['close', 'serverSpawned'],

   setup(props, { emit }) {
     const spawnEnvVars = reactive<Record<string, string>>({});
     const spawning = ref(false);
     const showDeploymentModal = ref(false);

     const canSpawn = computed(() => {
       if (!props.server) return false;

       // Check if all required environment variables are provided
       const requiredEnvVars = props.server.packages?.flatMap(pkg =>
         pkg.environmentVariables?.filter(env => !env.default) || []
       ) || [];

       return requiredEnvVars.every(env => spawnEnvVars[env.name]?.trim());
     });

    const spawnServer = async () => {
      if (!props.server || !canSpawn.value) return;

      spawning.value = true;
      try {
        const config = {
          replicaCount: 1,
          environmentVariables: { ...spawnEnvVars }
        };

        const result = await MCPService.createAdapterFromRegistry(props.server.id, config);
        logger.info('Server spawned successfully', { serverId: props.server.id });

        // Emit event with spawn result
        emit('serverSpawned', result);

        // Close modal
        emit('close');
      } catch (error) {
        logger.error('Failed to spawn server', error);
        alert('Failed to spawn server. Please check the configuration and try again.');
      } finally {
        spawning.value = false;
      }
    };

    const handleDeployment = (result: any) => {
      console.log('Server deployed successfully:', result);
      alert(`Server deployed to Kubernetes successfully! Deployment ID: ${result.deployment_id}`);
    };

     return {
       spawnEnvVars,
       spawning,
       showDeploymentModal,
       canSpawn,
       spawnServer,
       handleDeployment
     };
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

.spawning-options {
  text-align: left;
}

.spawn-config h5 {
  margin: 16px 0 8px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--body-text);
}

.env-config-list {
  margin: 12px 0;
}

.env-config-item {
  border: 1px solid var(--border-light, rgba(0,0,0,0.1));
  border-radius: 4px;
  padding: 12px;
  margin-bottom: 8px;
  background: var(--accent-bg, #f9fafb);
}

.env-config-item h6 {
  margin: 0 0 8px 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--body-text);
}

.env-vars-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.env-var-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: white;
  border: 1px solid var(--border);
  border-radius: 4px;
}

.env-var-item label {
  font-weight: 500;
  color: var(--body-text);
  min-width: 120px;
}

.env-input {
  flex: 1;
  padding: 4px 8px;
  border: 1px solid var(--border);
  border-radius: 3px;
  font-size: 13px;
}

.env-type {
  font-size: 11px;
  color: var(--muted);
  background: var(--accent-bg);
  padding: 2px 6px;
  border-radius: 3px;
  text-transform: uppercase;
}

.no-env-vars,
.no-packages {
  color: var(--muted);
  font-style: italic;
  padding: 8px;
  background: var(--accent-bg);
  border-radius: 4px;
}

.spawn-actions {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.action-buttons {
  display: flex;
  gap: 12px;
  margin-bottom: 8px;
}

.spawn-note {
  margin: 8px 0 0 0;
  font-size: 12px;
  color: var(--muted);
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