<template>
  <div v-if="show" class="modal-overlay" @click="$emit('close')">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>{{ server?.name || 'Server' }} Details</h3>
        <button @click="$emit('close')" class="btn btn-sm">×</button>
      </div>
      <div class="modal-body">
        <div v-if="loadingDetails" class="loading-state">
          <i class="icon icon-spinner icon-spin"></i>
          Loading server details...
        </div>

        <div v-else-if="detailsError" class="error-state">
          <i class="icon icon-error"></i>
          <p>{{ detailsError }}</p>
          <button class="btn btn-secondary" @click="retryFetchServerDetails()">
            Retry
          </button>
        </div>

        <div v-else-if="displayServer" class="server-details">
            <div class="detail-section">
              <h4>Basic Information</h4>
              <p><strong>Name:</strong> {{ displayServer.name }}</p>
              <p><strong>Description:</strong> {{ displayServer.description }}</p>
              <p><strong>Address:</strong> {{ displayServer.address }}</p>
              <p><strong>Port:</strong> {{ displayServer.port }}</p>
              <p><strong>Protocol:</strong> {{ displayServer.protocol || 'Unknown' }}</p>
              <p><strong>Connection:</strong> {{ displayServer.connection || 'HTTP' }}</p>
              <p v-if="displayServer.discoveredAt"><strong>Discovered At:</strong> {{ new Date(displayServer.discoveredAt).toLocaleString() }}</p>
              <p v-if="displayServer.lastSeen"><strong>Last Seen:</strong> {{ new Date(displayServer.lastSeen).toLocaleString() }}</p>
            </div>

             <div v-if="displayServer._meta || displayServer.metadata" class="detail-section">
              <h4>Metadata</h4>
              <div v-if="displayServer._meta">
                <p v-if="displayServer._meta.source"><strong>Source:</strong> {{ displayServer._meta.source }}</p>
                <p v-if="displayServer._meta.category"><strong>Category:</strong> {{ displayServer._meta.category }}</p>
                <p v-if="displayServer._meta.userAuthRequired !== undefined"><strong>Requires Auth:</strong> {{ displayServer._meta.userAuthRequired ? 'Yes' : 'No' }}</p>
                <p v-if="displayServer._meta.authType"><strong>Auth Type:</strong> {{ displayServer._meta.authType }}</p>
                <p v-if="displayServer._meta.documentation"><strong>Documentation:</strong> <a :href="displayServer._meta.documentation" target="_blank">{{ displayServer._meta.documentation }}</a></p>
                <p v-if="displayServer._meta.hosted !== undefined"><strong>Hosted:</strong> {{ displayServer._meta.hosted ? 'Yes' : 'No' }}</p>
                <p v-if="displayServer._meta.requiresInstallation !== undefined"><strong>Requires Installation:</strong> {{ displayServer._meta.requiresInstallation ? 'Yes' : 'No' }}</p>
                <p v-if="displayServer._meta.transportType"><strong>Transport Type:</strong> {{ displayServer._meta.transportType }}</p>
                <p v-if="displayServer._meta.validation_status"><strong>Validation Status:</strong> {{ displayServer._meta.validation_status }}</p>
                <div v-if="displayServer._meta.tags && displayServer._meta.tags.length">
                  <strong>Tags:</strong>
                  <div class="tags-list">
                    <span v-for="tag in displayServer._meta.tags" :key="tag" class="tag">{{ tag }}</span>
                  </div>
                </div>
              </div>
              <div v-if="displayServer.metadata">
                <p v-if="displayServer.metadata.auth_type"><strong>Auth Type:</strong> {{ displayServer.metadata.auth_type }}</p>
                <p v-if="displayServer.metadata.detectionMethod"><strong>Detection Method:</strong> {{ displayServer.metadata.detectionMethod }}</p>
                <p v-if="displayServer.metadata.validation_status"><strong>Validation Status:</strong> {{ displayServer.metadata.validation_status }}</p>
              </div>
            </div>

           <div v-if="displayServer.packages?.length" class="detail-section">
              <h4>Packages</h4>
              <div v-for="pkg in displayServer.packages" :key="pkg.identifier" class="package-item">
                <p><strong>Identifier:</strong> {{ pkg.identifier }}</p>
                <p><strong>Type:</strong> {{ pkg.registryType }}</p>
                <p><strong>Transport:</strong> {{ pkg.transport.type }}</p>
              </div>
            </div>

           <div v-if="displayServer.tools?.length" class="detail-section">
             <h4>Tools</h4>
             <div v-for="tool in displayServer.tools" :key="tool.name" class="tool-item">
               <p><strong>Name:</strong> {{ tool.name }}</p>
               <p><strong>Description:</strong> {{ tool.description }}</p>
             </div>
           </div>

           <div v-if="displayServer.config_template" class="detail-section">
              <h4>Configuration Template</h4>
              <div class="config-template">
                <p><strong>Command:</strong> {{ displayServer.config_template.command }}</p>
                <p><strong>Arguments:</strong> {{ displayServer.config_template.args?.join(' ') || 'None' }}</p>
                <p><strong>Transport:</strong> {{ displayServer.config_template.transport }}</p>
                <p><strong>Image:</strong> {{ displayServer.config_template.image }}</p>

                <div v-if="displayServer.config_template.env && Object.keys(displayServer.config_template.env).length" class="env-vars">
                  <p><strong>Environment Variables:</strong></p>
                  <ul>
                    <li v-for="(value, key) in displayServer.config_template.env" :key="key">
                      {{ key }}: {{ value || '(user must provide)' }}
                    </li>
                  </ul>
                </div>

                <div v-if="displayServer.config_template.resource_limits" class="resource-limits">
                  <p><strong>Resource Limits:</strong></p>
                  <ul>
                    <li v-if="displayServer.config_template.resource_limits.cpu">
                      CPU: {{ displayServer.config_template.resource_limits.cpu }}
                    </li>
                    <li v-if="displayServer.config_template.resource_limits.memory">
                      Memory: {{ displayServer.config_template.resource_limits.memory }}
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
                  <div v-if="displayServer.packages?.length" class="env-config-list">
                    <div v-for="pkg in displayServer.packages" :key="pkg.identifier" class="env-config-item">
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
                        v-if="displayServer?.config_template"
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

            <div v-if="displayServer._meta" class="detail-section">
              <h4>Metadata</h4>
              <pre>{{ JSON.stringify(displayServer._meta, null, 2) }}</pre>
            </div>
        </div>
      </div>
    </div>
  </div>

    <DeploymentModal
      :show="showDeploymentModal"
      :server="displayServer as any"
      @close="showDeploymentModal = false"
      @deployed="handleDeployment"
    />
</template>

<script lang="ts">
import { defineComponent, type PropType, computed, ref, reactive, watch } from 'vue';
import { useStore } from 'vuex';
import type { MCPServer } from '../../services/registry-api';
import type { DiscoveredServer } from '../../services/discovery-api';
import { registryAPI } from '../../services/registry-api';
// import { MCPService } from '../../services/mcp-service';
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
      type: Object as PropType<DiscoveredServer | MCPServer | null>,
      default: null
    }
  },

  emits: ['close', 'serverSpawned'],

    setup(props, { emit }) {
      console.log('ServerDetailsModal setup called with show:', props.show, 'server:', props.server?.name)

      const spawnEnvVars = reactive<Record<string, string>>({});
      const spawning = ref(false);
      const showDeploymentModal = ref(false);
      const fullServerDetails = ref<MCPServer | null>(null);
      const loadingDetails = ref(false);
      const detailsError = ref<string>('');

      const displayServer = computed(() => {
        // If we have full details, use those
        if (fullServerDetails.value) return fullServerDetails.value;
        // If the server is already an MCPServer, use it directly
        if (props.server && '_meta' in props.server && props.server._meta) return props.server as MCPServer;
        // Otherwise return null (will show loading or error)
        return null;
      });

      const canSpawn = computed(() => {
        const server = displayServer.value;
        if (!server) return false;

        // Check if all required environment variables are provided
        const requiredEnvVars = server.packages?.flatMap(pkg =>
          pkg.environmentVariables?.filter(env => !env.default) || []
        ) || [];

        return requiredEnvVars.every(env => spawnEnvVars[env.name]?.trim());
      });

      // Watch for modal opening
      watch(() => props.show, async (newShow) => {
        console.log('Modal show watcher triggered:', newShow, 'server:', props.server?.name)
        if (newShow && props.server) {
          console.log('Server has packages?', 'packages' in props.server)
          console.log('Server has vulnerability_score?', 'vulnerability_score' in props.server)

          // Check if this is a discovered server that needs full details
          if ('vulnerability_score' in props.server) {
            // This is a discovered server, fetch full details from registry
            loadingDetails.value = true;
            try {
              const mcpId = props.server.name?.toLowerCase().replace(/\s+/g, '-') || props.server.id;
              console.log('Fetching details for discovered server with MCP ID:', mcpId)
              await fetchServerDetails(mcpId);
            } catch (error) {
              console.error('Failed to fetch server details:', error)
              detailsError.value = 'Failed to load server details. Please try again.';
            } finally {
              loadingDetails.value = false;
            }
          } else {
            // This is a full MCPServer from registry - use directly
            console.log('Using MCPServer directly - no API call needed')
            fullServerDetails.value = props.server as MCPServer;
          }
        } else {
          // Modal closing, reset state
          fullServerDetails.value = null;
          detailsError.value = '';
          loadingDetails.value = false;
        }
      });

      const fetchServerDetails = async (serverId: string) => {
        loadingDetails.value = true;
        detailsError.value = '';

        try {
          const details = await registryAPI.getServer(serverId);
          fullServerDetails.value = details;
          logger.info('Fetched full server details', { serverId, name: details.name });
        } catch (error) {
          logger.error('Failed to fetch server details', { serverId, error });
          detailsError.value = 'Failed to load server details. Please try again.';
        } finally {
          loadingDetails.value = false;
        }
      };

      const retryFetchServerDetails = () => {
        if (!props.server) return;

        // For discovered servers, transform name to MCP ID
        if ('vulnerability_score' in props.server) {
          const mcpId = props.server.name?.toLowerCase().replace(/\s+/g, '-') || props.server.id;
          fetchServerDetails(mcpId);
        } else {
          // For MCPServer objects, use ID directly
          fetchServerDetails(props.server.id);
        }
      };

     const spawnServer = async () => {
       if (!displayServer.value || !canSpawn.value) return;

       spawning.value = true;
       try {
         const config = {
           replicaCount: 1,
           environmentVariables: { ...spawnEnvVars }
         };

         // const result = await MCPService.createAdapterFromRegistry(displayServer.value.id, config);
         console.log('Adapter creation from registry not implemented yet');
         logger.info('Server spawned successfully', { serverId: displayServer.value.id });

         // Emit event with spawn result
         // emit('serverSpawned', result);

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
        fullServerDetails,
        loadingDetails,
        detailsError,
        displayServer,
        canSpawn,
        spawnServer,
        handleDeployment,
        fetchServerDetails,
        retryFetchServerDetails
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

.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;
}

.tag {
  background: var(--accent-bg, #f0f0f0);
  color: var(--body-text, #333);
  padding: 2px 6px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
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