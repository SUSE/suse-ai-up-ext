<template>
  <div v-if="show" class="modal-overlay" @click="handleOverlayClick">
    <div class="deploy-modal" @click.stop>
      <!-- Modal spinner overlay -->
      <div v-if="deploying || waitingForAdapter" class="spinner-overlay">
        <div class="spinner-content">
          <i class="icon icon-spinner icon-spin"></i>
          <h3>{{ deploying ? 'Deploying...' : 'Waiting for adapter...' }}</h3>
          <p>{{ deploying ? 'Creating your MCP adapter' : 'Adapter is being deployed to the sidecar container' }}</p>
        </div>
      </div>
      <div class="modal-header">
        <h2>Deploy MCP Server</h2>
        <button class="close-btn" @click="handleCancel" aria-label="Close modal">
          <i class="icon icon-close"></i>
        </button>
      </div>

      <div class="modal-body">
        <!-- Server Info Section -->
        <div class="server-info">
          <div class="server-icon">
            <img v-if="serverIcon" :src="serverIcon" :alt="server?.name" />
            <div v-else class="icon-placeholder">
              <i class="icon icon-package"></i>
            </div>
          </div>
          <div class="server-details">
            <h3>{{ server?.name }}</h3>
            <p v-if="server?.description">{{ server.description }}</p>
            <div class="server-meta">
              <span class="server-id">ID: {{ server?.id }}</span>
            </div>
          </div>
        </div>

        <!-- Secrets Configuration Section -->
        <div class="secrets-section">
          <h4>Configure Secrets</h4>
          <p class="section-description">
            Select which secrets you want to configure and provide their values.
            Required secrets must be configured before deployment.
          </p>

          <div v-if="secrets.length === 0" class="no-secrets">
            <p>This server doesn't require any secret configuration.</p>
          </div>

          <div v-else class="secrets-list">
            <div
              v-for="(secret, index) in secrets"
              :key="secret.name"
              class="secret-item"
              :class="{ 'required': secret.required }"
            >
              <div class="secret-header">
                <label class="secret-checkbox">
                  <input
                    type="checkbox"
                    :checked="secret.selected"
                    @change="toggleSecret(index, $event)"
                    :aria-label="`Configure ${secret.name}`"
                  />
                  <span class="checkmark"></span>
                </label>
                <div class="secret-info">
                  <span class="secret-name">{{ secret.name }}</span>
                  <span v-if="secret.required" class="required-badge">Required</span>
                </div>
              </div>

              <div v-if="secret.description" class="secret-description">
                {{ secret.description }}
              </div>

               <div v-if="secret.selected" class="secret-input">
                 <label :for="`secret-${index}`" class="input-label">
                   Value for {{ secret.env || secret.name }}:
                 </label>

                 <!-- Boolean type - checkbox -->
                 <div v-if="secret.type === 'bool'" class="boolean-input">
                   <label class="checkbox-container">
                     <input
                       :id="`secret-${index}`"
                       type="checkbox"
                        :checked="secret.value === 'true'"
                       @change="updateSecretBooleanValue(index, $event)"
                       :aria-label="`Value for ${secret.name}`"
                     />
                     <span class="checkmark"></span>
                     <span class="checkbox-label">{{ secret.description || 'Enable' }}</span>
                   </label>
                 </div>

                 <!-- Text type - regular text input -->
                 <div v-else-if="secret.type === 'text'">
                   <input
                     :id="`secret-${index}`"
                     type="text"
                     :value="secret.value"
                     @input="updateSecretValue(index, $event)"
                     :placeholder="secret.example || 'Enter value...'"
                     class="secret-value-input"
                     :aria-label="`Value for ${secret.name}`"
                   />
                   <div v-if="secret.example" class="example-hint">
                     Example: {{ secret.example }}
                   </div>
                 </div>

                 <!-- Secret type (default) - password input -->
                 <div v-else>
                   <input
                     :id="`secret-${index}`"
                     type="password"
                     :value="secret.value"
                     @input="updateSecretValue(index, $event)"
                     :placeholder="secret.example || 'Enter value...'"
                     class="secret-value-input"
                     :aria-label="`Value for ${secret.name}`"
                   />
                    <div v-if="secret.example" class="example-hint">
                      Example: {{ secret.example }}
                    </div>
                  </div>

           <!-- Waiting for adapter message -->
           <div v-if="waitingForAdapter" class="waiting-message">
             <h4>Deployment in Progress</h4>
             <p>The adapter has been created successfully. The sidecar container is being deployed and will be ready shortly.</p>
             <div class="progress-indicator">
               <i class="icon icon-spinner icon-spin"></i>
               <span>This usually takes about 10 seconds.</span>
             </div>
           </div>
         </div>
       </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <div class="validation-errors" v-if="validationErrors.length > 0">
          <div v-for="error in validationErrors" :key="error" class="error-message">
            <i class="icon icon-error"></i>
            {{ error }}
          </div>
        </div>

        <div class="footer-actions">
           <button
             class="btn btn-secondary"
             @click="handleCancel"
             :disabled="deploying || waitingForAdapter"
           >
             Cancel
           </button>
            <button
              class="btn btn-primary"
              @click="handleDeploy"
              :disabled="!canDeploy || deploying || waitingForAdapter"
            >
              Deploy
            </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, watch } from 'vue'
import type { MCPServer } from '../../services/registry-api'

export interface SecretConfig {
  name: string
  env?: string
  description?: string
  example?: string
  required?: boolean
  selected: boolean
  value: string
  type?: 'text' | 'secret' | 'bool'
}

export default defineComponent({
  name: 'DeployModal',
  props: {
    show: {
      type: Boolean,
      default: false
    },
    server: {
      type: Object as () => MCPServer,
      default: null
    },
    secrets: {
      type: Array as () => SecretConfig[],
      default: () => []
    },
    waitingForAdapter: {
      type: Boolean,
      default: false
    },
    deploying: {
      type: Boolean,
      default: false
    }
  },
  emits: ['close', 'deploy'],
  setup(props, { emit }) {
    const secrets = ref<SecretConfig[]>([])
    const validationErrors = ref<string[]>([])

    // Sync props to local state
    watch(() => props.secrets, (newSecrets) => {
      secrets.value = newSecrets ? [...newSecrets] : []
    }, { immediate: true })

    // Get server icon
    const serverIcon = computed(() => {
      if (!props.server) return null

      // Try different icon sources
      if (props.server.about?.icon_url) return props.server.about.icon_url
      if (props.server.icon) return props.server.icon
      return null
    })

    // Check if deployment is valid
    const canDeploy = computed(() => {
      if (!props.server) return false

      // Check required secrets are configured
      const requiredSecrets = secrets.value.filter(s => s.required)
      const configuredRequired = requiredSecrets.filter(s => {
        if (!s.selected) return false
        // For boolean types, value is always valid (true/false)
        if (s.type === 'bool') return true
        // For text/secret types, check if value is not empty
        return s.value.trim()
      })

      return configuredRequired.length === requiredSecrets.length
    })

    // Validate secrets configuration
    const validateSecrets = (): string[] => {
      const errors: string[] = []

      secrets.value.forEach(secret => {
        if (secret.required && secret.selected) {
          // Boolean values are always valid
          if (secret.type === 'bool') return
          // Text and secret values must not be empty
          if (!secret.value.trim()) {
            errors.push(`Required secret "${secret.name}" cannot be empty`)
          }
        }
      })

      return errors
    }

    // Toggle secret selection
    const toggleSecret = (index: number, event: Event) => {
      const target = event.target as HTMLInputElement
      secrets.value[index].selected = target.checked

      // Clear validation errors when user makes changes
      if (validationErrors.value.length > 0) {
        validationErrors.value = []
      }
    }

    // Update secret value
    const updateSecretValue = (index: number, event: Event) => {
      const target = event.target as HTMLInputElement
      secrets.value[index].value = target.value

      // Clear validation errors when user makes changes
      if (validationErrors.value.length > 0) {
        validationErrors.value = []
      }
    }

    // Update secret boolean value
    const updateSecretBooleanValue = (index: number, event: Event) => {
      const target = event.target as HTMLInputElement
      secrets.value[index].value = target.checked ? 'true' : 'false'

      // Clear validation errors when user makes changes
      if (validationErrors.value.length > 0) {
        validationErrors.value = []
      }
    }

    // Handle overlay click (close modal)
    const handleOverlayClick = () => {
      if (!props.deploying) {
        handleCancel()
      }
    }

    // Handle cancel
    const handleCancel = () => {
      if (!props.deploying) {
        emit('close')
      }
    }

    // Handle deploy
    const handleDeploy = async () => {
      validationErrors.value = validateSecrets()

      if (validationErrors.value.length > 0) {
        return
      }

      try {
        // Emit deploy event with configured secrets
        emit('deploy', {
          server: props.server,
          secrets: secrets.value
        })
        // Note: deploying prop is controlled by parent component
      } catch (error) {
        console.error('Deploy error:', error)
        validationErrors.value = ['Deployment failed. Please try again.']
      }
    }

    return {
      secrets,
      validationErrors,
      serverIcon,
      canDeploy,
      toggleSecret,
      updateSecretValue,
      updateSecretBooleanValue,
      handleOverlayClick,
      handleCancel,
      handleDeploy
    }
  }
})
</script>

<style scoped>
/* Full-screen Spinner Overlay */
.spinner-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  border-radius: var(--border-radius, 8px);
}

.spinner-content {
  text-align: center;
  color: var(--body-text, #1a1a1a);
}

.spinner-content .icon {
  font-size: 48px;
  color: var(--primary, #007bff);
  margin-bottom: 16px;
}

.spinner-content h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
}

.spinner-content p {
  margin: 0;
  font-size: 14px;
  color: var(--muted, #666);
  opacity: 0.8;
}

/* Modal Overlay */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

/* Modal Container */
.deploy-modal {
  position: relative;
  background: var(--card-bg, #ffffff);
  border-radius: var(--border-radius, 8px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Modal Header */
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border, #e1e5e9);
}

.modal-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--body-text, #1a1a1a);
}

.close-btn {
  background: none;
  border: none;
  font-size: 18px;
  color: var(--muted, #666);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: var(--accent-bg, #f8f9fa);
  color: var(--body-text, #1a1a1a);
}

/* Modal Body */
.modal-body {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

/* Server Info Section */
.server-info {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  padding: 16px;
  background: var(--accent-bg, #f8f9fa);
  border-radius: var(--border-radius, 6px);
}

.server-icon {
  flex-shrink: 0;
}

.server-icon img,
.icon-placeholder {
  width: 48px;
  height: 48px;
  border-radius: var(--border-radius, 6px);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--card-bg, #ffffff);
  border: 1px solid var(--border, #e1e5e9);
}

.server-icon img {
  object-fit: cover;
}

.icon-placeholder {
  color: var(--muted, #666);
}

.icon-placeholder .icon {
  font-size: 24px;
}

.server-details {
  flex: 1;
  min-width: 0;
}

.server-details h3 {
  margin: 0 0 4px 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--body-text, #1a1a1a);
}

.server-details p {
  margin: 0 0 8px 0;
  color: var(--muted, #666);
  font-size: 14px;
  line-height: 1.4;
}

.server-meta {
  font-size: 12px;
  color: var(--muted, #666);
}

/* Secrets Section */
.secrets-section h4 {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--body-text, #1a1a1a);
}

.section-description {
  margin: 0 0 20px 0;
  font-size: 14px;
  color: var(--muted, #666);
  line-height: 1.4;
}

.no-secrets {
  text-align: center;
  padding: 40px 20px;
  color: var(--muted, #666);
}

.no-secrets p {
  margin: 0;
  font-style: italic;
}

/* Secrets List */
.secrets-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.secret-item {
  border: 1px solid var(--border, #e1e5e9);
  border-radius: var(--border-radius, 6px);
  padding: 16px;
  background: var(--card-bg, #ffffff);
  transition: border-color 0.2s ease;
}

.secret-item.required {
  border-color: var(--warning-border, #ffeaa7);
  background: var(--warning-bg, #fff3cd);
}

.secret-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

/* Custom Checkbox */
.secret-checkbox {
  position: relative;
  cursor: pointer;
  flex-shrink: 0;
}

.secret-checkbox input {
  position: absolute;
  opacity: 0;
  cursor: pointer;
}

.checkmark {
  height: 20px;
  width: 20px;
  background-color: var(--body-bg, #ffffff);
  border: 2px solid var(--border, #d1d5db);
  border-radius: 3px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.secret-checkbox input:checked ~ .checkmark {
  background-color: var(--primary, #007bff);
  border-color: var(--primary, #007bff);
}

.checkmark:after {
  content: "";
  display: none;
  width: 6px;
  height: 10px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.secret-checkbox input:checked ~ .checkmark:after {
  display: block;
}

/* Boolean Input - Checkbox for boolean secrets */
.boolean-input {
  margin-top: 8px;
}

.checkbox-container {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 8px;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.checkbox-container:hover {
  background-color: var(--accent-bg, #f8f9fa);
}

.checkbox-container input[type="checkbox"] {
  width: 16px;
  height: 16px;
  margin: 0;
  cursor: pointer;
}

.checkbox-label {
  font-size: 14px;
  color: var(--body-text, #1a1a1a);
  user-select: none;
}

.secret-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.secret-name {
  font-weight: 600;
  color: var(--body-text, #1a1a1a);
}

.required-badge {
  background: var(--error, #dc3545);
  color: white;
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
}

.secret-description {
  font-size: 14px;
  color: var(--muted, #666);
  margin-bottom: 12px;
  line-height: 1.4;
}

/* Secret Input */
.secret-input {
  margin-top: 12px;
}

.input-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--body-text, #1a1a1a);
  margin-bottom: 6px;
}

.secret-value-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border, #d1d5db);
  border-radius: var(--border-radius, 4px);
  font-size: 14px;
  background: var(--body-bg, #ffffff);
  color: var(--body-text, #1a1a1a);
  transition: border-color 0.2s ease;
}

.secret-value-input:focus {
  outline: none;
  border-color: var(--primary, #007bff);
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.example-hint {
  margin-top: 4px;
  font-size: 12px;
  color: var(--muted, #666);
  font-style: italic;
}

/* Modal Footer */
.modal-footer {
  padding: 20px 24px;
  border-top: 1px solid var(--border, #e1e5e9);
  background: var(--accent-bg, #f8f9fa);
}

.validation-errors {
  margin-bottom: 16px;
}

.error-message {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--error, #dc3545);
  font-size: 14px;
  margin-bottom: 8px;
}

.error-message .icon {
  font-size: 16px;
  flex-shrink: 0;
}

.footer-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* Button Styles */
.btn {
  padding: 8px 16px;
  border: 1px solid transparent;
  border-radius: var(--border-radius, 4px);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--body-bg, #ffffff);
  color: var(--body-text, #1a1a1a);
  border-color: var(--border, #d1d5db);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--accent-bg, #f8f9fa);
}

.btn-primary {
  background: var(--primary, #007bff);
  color: white;
  border-color: var(--primary, #007bff);
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-hover, #0056b3);
  border-color: var(--primary-hover, #0056b3);
}

/* Waiting for adapter message */
.waiting-message {
  margin-top: 24px;
  padding: 20px;
  background: var(--accent-bg, #f8f9fa);
  border-radius: var(--border-radius, 6px);
  border: 1px solid var(--border, #e1e5e9);
  text-align: center;
}

.waiting-message h4 {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--body-text, #1a1a1a);
}

.waiting-message p {
  margin: 0 0 12px 0;
  color: var(--muted, #666);
  line-height: 1.4;
}

.progress-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 14px;
  color: var(--primary, #007bff);
}

.progress-indicator .icon {
  font-size: 16px;
}

/* Responsive */
@media (max-width: 640px) {
  .modal-overlay {
    padding: 10px;
  }

  .deploy-modal {
    max-height: 95vh;
  }

  .modal-header,
  .modal-body,
  .modal-footer {
    padding-left: 16px;
    padding-right: 16px;
  }

  .server-info {
    flex-direction: column;
    text-align: center;
    gap: 12px;
  }

  .footer-actions {
    flex-direction: column;
  }

  .footer-actions .btn {
    width: 100%;
    justify-content: center;
  }
}
</style>