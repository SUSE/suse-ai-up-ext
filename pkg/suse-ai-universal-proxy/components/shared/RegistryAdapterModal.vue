<template>
  <div v-if="show" class="modal-overlay" @click="closeModal">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>Create MCP Adapter</h3>
        <button class="btn btn-sm btn-secondary" @click="closeModal">&times;</button>
      </div>
      <div class="modal-body">
        <!-- Selected Registry Server Info -->
        <div v-if="registryServer" class="server-info">
          <h4>From Registry Server</h4>
          <div class="server-details">
            <div class="server-name">{{ registryServer.name }}</div>
            <div class="server-description">{{ registryServer.description }}</div>
          </div>
        </div>

        <!-- Adapter Configuration -->
        <div class="form-group">
          <label for="adapterName">Adapter Name:</label>
          <input
            type="text"
            id="adapterName"
            v-model="adapterData.name"
            class="form-control"
            placeholder="my-mcp-adapter"
            required
          />
        </div>

        <div class="form-group">
          <label for="description">Description:</label>
          <textarea
            id="description"
            v-model="adapterData.description"
            class="form-control"
            placeholder="Description of this MCP adapter"
            rows="3"
          ></textarea>
        </div>

        <!-- Environment Variables -->
        <div class="form-group">
          <label>Environment Variables:</label>
          <div class="env-vars-section">
            <div v-for="(envVar, index) in adapterData.environmentVariables" :key="index" class="env-var-row">
              <input
                type="text"
                v-model="envVar.name"
                placeholder="Variable name"
                class="form-control env-name"
              />
              <input
                type="text"
                v-model="envVar.value"
                placeholder="Variable value"
                class="form-control env-value"
              />
              <button
                type="button"
                class="btn btn-sm btn-danger"
                @click="removeEnvVar(index)"
              >
                <i class="icon icon-minus"></i>
              </button>
            </div>
            <button
              type="button"
              class="btn btn-sm btn-secondary add-env-btn"
              @click="addEnvVar"
            >
              <i class="icon icon-plus"></i>
              Add Environment Variable
            </button>
          </div>
        </div>

        <!-- Authentication -->
        <div class="form-group">
          <label for="authType">Authentication Type:</label>
          <select id="authType" v-model="adapterData.authentication.type" class="form-control">
            <option value="none">None</option>
            <option value="bearer">Bearer Token</option>
            <option value="basic">Basic Auth</option>
            <option value="apikey">API Key</option>
          </select>
        </div>

        <!-- Authentication Details -->
        <div v-if="adapterData.authentication.type === 'bearer'" class="auth-details">
          <div class="form-group">
            <label for="bearerToken">Bearer Token:</label>
            <input
              type="password"
              id="bearerToken"
              v-model="adapterData.authentication.bearerToken!.token"
              class="form-control"
              placeholder="Enter bearer token"
            />
          </div>
        </div>

        <div v-if="adapterData.authentication.type === 'basic'" class="auth-details">
          <div class="form-group">
            <label for="username">Username:</label>
            <input
              type="text"
              id="username"
              v-model="adapterData.authentication.basic!.username"
              class="form-control"
            />
          </div>
          <div class="form-group">
            <label for="password">Password:</label>
            <input
              type="password"
              id="password"
              v-model="adapterData.authentication.basic!.password"
              class="form-control"
            />
          </div>
        </div>

        <div v-if="adapterData.authentication.type === 'apikey'" class="auth-details">
          <div class="form-group">
            <label for="apiKey">API Key:</label>
            <input
              type="password"
              id="apiKey"
              v-model="adapterData.authentication.apiKey!.key"
              class="form-control"
            />
          </div>
          <div class="form-group">
            <label for="apiKeyName">Header Name:</label>
            <input
              type="text"
              id="apiKeyName"
              v-model="adapterData.authentication.apiKey!.name"
              class="form-control"
              placeholder="X-API-Key"
            />
          </div>
        </div>
      </div>

      <!-- Status Display -->
      <div v-if="creating" class="status-section">
        <div class="status-header">
          <h4>Creating Adapter</h4>
          <div class="status-message">
            <p>{{ statusMessage }}</p>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button
          type="button"
          class="btn btn-secondary"
          @click="closeModal"
          :disabled="creating"
        >
          Cancel
        </button>
        <button
          type="button"
          class="btn btn-primary"
          @click="createAdapter"
          :disabled="!isValid || creating"
        >
          {{ creating ? 'Creating...' : 'Create Adapter' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, watch } from 'vue'
import { adapterAPI } from '../../services/adapter-api'
import { logger } from '../../utils/logger'
import type { MCPServer } from '../../services/registry-api'

interface EnvironmentVariable {
  name: string
  value: string
}

interface AdapterAuthConfig {
  type: 'bearer' | 'oauth' | 'basic' | 'apikey' | 'none'
  required: boolean
  bearerToken?: {
    dynamic: boolean
    token?: string
    expiresAt?: string
  }
  oauth?: {
    clientId: string
    clientSecret: string
    authUrl: string
    tokenUrl: string
    redirectUri: string
    scopes: string[]
  }
  basic?: {
    username: string
    password: string
  }
  apiKey?: {
    key: string
    location: 'header' | 'query' | 'cookie'
    name: string
  }
}

interface AdapterData {
  name: string
  description: string
  environmentVariables: EnvironmentVariable[]
  authentication: AdapterAuthConfig
}

export default defineComponent({
  name: 'RegistryAdapterModal',
  props: {
    show: {
      type: Boolean,
      required: true
    },
    registryServer: {
      type: Object as () => MCPServer,
      default: null
    }
  },
  emits: ['close', 'adapter-created'],
  setup(props, { emit }) {
    const creating = ref(false)
    const statusMessage = ref('')

    const adapterData = ref<AdapterData>({
      name: '',
      description: '',
      environmentVariables: [],
      authentication: {
        type: 'none',
        required: false
      }
    })

    // Watch for registry server changes to auto-populate name
    watch(() => props.registryServer, (newServer) => {
      if (newServer && adapterData.value.name === '') {
        adapterData.value.name = `${newServer.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-adapter`
        adapterData.value.description = `Adapter for ${newServer.name}`
      }
    }, { immediate: true })

    // Watch for auth type changes to initialize nested objects
    watch(() => adapterData.value.authentication.type, (newType) => {
      if (newType === 'bearer' && !adapterData.value.authentication.bearerToken) {
        adapterData.value.authentication.bearerToken = { dynamic: false, token: '' }
      } else if (newType === 'basic' && !adapterData.value.authentication.basic) {
        adapterData.value.authentication.basic = { username: '', password: '' }
      } else if (newType === 'apikey' && !adapterData.value.authentication.apiKey) {
        adapterData.value.authentication.apiKey = { key: '', location: 'header', name: 'X-API-Key' }
      }
    })

    const isValid = computed(() => {
      return adapterData.value.name.trim() !== '' &&
             adapterData.value.environmentVariables.every(env => env.name.trim() !== '')
    })

    const addEnvVar = () => {
      adapterData.value.environmentVariables.push({ name: '', value: '' })
    }

    const removeEnvVar = (index: number) => {
      adapterData.value.environmentVariables.splice(index, 1)
    }

    const createAdapter = async () => {
      if (!isValid.value || !props.registryServer) return

      creating.value = true
      statusMessage.value = 'Creating adapter...'

      try {
        // Convert environment variables to object
        const envVars: Record<string, string> = {}
        adapterData.value.environmentVariables.forEach(env => {
          if (env.name.trim()) {
            envVars[env.name.trim()] = env.value
          }
        })

        const request = {
          mcpServerId: props.registryServer.id,
          name: adapterData.value.name.trim(),
          description: adapterData.value.description.trim() || undefined,
          environmentVariables: envVars,
          authentication: adapterData.value.authentication
        }

        statusMessage.value = 'Sending request to API...'
        const result = await adapterAPI.create(request)

        statusMessage.value = 'Adapter created successfully!'

        // Emit success event
        emit('adapter-created', {
          adapter: result,
          registryServer: props.registryServer
        })

        // Close modal after a brief delay
        setTimeout(() => {
          closeModal()
        }, 1500)

      } catch (error: any) {
        statusMessage.value = `Error: ${error.message || 'Failed to create adapter'}`
        logger.error('Failed to create adapter', error)
      } finally {
        // Reset creating state after a delay to show success message
        setTimeout(() => {
          creating.value = false
        }, 2000)
      }
    }

    const closeModal = () => {
      if (!creating.value) {
        // Reset form
        adapterData.value = {
          name: '',
          description: '',
          environmentVariables: [],
          authentication: {
            type: 'none',
            required: false
          }
        }
        emit('close')
      }
    }

    return {
      creating,
      statusMessage,
      adapterData,
      isValid,
      addEnvVar,
      removeEnvVar,
      createAdapter,
      closeModal
    }
  }
})
</script>

<style scoped>
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
  max-width: 600px;
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

.server-info {
  background: var(--accent-bg, #f8f9fa);
  border: 1px solid var(--border, #e0e0e0);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
}

.server-info h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--body-text);
}

.server-name {
  font-weight: 600;
  color: var(--body-text);
  margin-bottom: 4px;
}

.server-description {
  font-size: 14px;
  color: var(--muted, #666);
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 600;
  color: var(--body-text);
}

.form-control {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--input-bg);
  color: var(--input-text);
}

.form-control:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

textarea.form-control {
  resize: vertical;
  min-height: 80px;
}

.env-vars-section {
  border: 1px solid var(--border, #e0e0e0);
  border-radius: 4px;
  padding: 12px;
  background: var(--accent-bg, #f8f9fa);
}

.env-var-row {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
}

.env-name {
  flex: 1;
}

.env-value {
  flex: 2;
}

.add-env-btn {
  width: 100%;
  margin-top: 8px;
}

.auth-details {
  margin-left: 20px;
  padding-left: 20px;
  border-left: 2px solid var(--primary);
}

.status-section {
  padding: 16px 24px;
  background: var(--warning-bg, #fff3cd);
  border-top: 1px solid var(--border, #e0e0e0);
}

.status-header h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: var(--body-text);
}

.status-message p {
  margin: 0;
  color: var(--muted, #666);
}

.modal-footer {
  padding: 20px 24px;
  border-top: 1px solid var(--border, #e0e0e0);
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.btn {
  padding: 8px 16px;
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

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--primary, #007bff);
  color: white;
  border-color: var(--primary, #007bff);
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-dark, #0056b3);
  border-color: var(--primary-dark, #0056b3);
}

.btn-secondary {
  background: var(--secondary, #6c757d);
  color: white;
  border-color: var(--secondary, #6c757d);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--secondary-dark, #545b62);
  border-color: var(--secondary-dark, #545b62);
}

.btn-sm {
  padding: 6px 12px;
  font-size: 12px;
}

.btn-danger {
  background: var(--error, #dc3545);
  color: white;
  border-color: var(--error, #dc3545);
}

.btn-danger:hover:not(:disabled) {
  background: var(--error-dark, #c82333);
  border-color: var(--error-dark, #c82333);
}

/* Responsive enhancements */
@media (max-width: 768px) {
  .modal-content {
    width: 95vw;
    margin: 16px;
    max-height: 90vh;
  }

  .modal-header,
  .modal-body,
  .modal-footer {
    padding: 16px;
  }

  .env-var-row {
    flex-direction: column;
    align-items: stretch;
  }

  .env-name,
  .env-value {
    flex: none;
  }
}
</style>