<template>
  <div v-if="isVisible" class="modal-overlay" @click="closeModal">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>Configure GitHub API MCP</h3>
        <button class="btn btn-sm btn-secondary" @click="closeModal">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label for="githubToken">Enter your GitHub Personal Token:</label>
          <input
            type="password"
            id="githubToken"
            v-model="githubToken"
            class="form-control"
            placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
            required
          />
          <small class="form-help">
            Create a token at <a href="https://github.com/settings/tokens" target="_blank">GitHub Settings</a>
            with <code>repo</code>, <code>issues</code>, and <code>pull_requests</code> scopes.
          </small>
        </div>

        <div v-if="error" class="error-message">
          {{ error }}
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" @click="closeModal">Cancel</button>
        <button class="btn btn-primary" @click="createAdapter" :disabled="!isValid || creating">
          {{ creating ? 'Creating...' : 'Create Adapter' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import axios from 'axios';
import { logger } from '../../utils/logger';
import { API_BASE_URLS } from '../../config/api-config';

// Props
const props = defineProps<{
  show: boolean;
}>();

// Emits
const emit = defineEmits<{
  adapterCreated: [];
  close: [];
}>();

const isVisible = ref(false);
const creating = ref(false);
const error = ref<string>('');
const githubToken = ref('');

// Watch show prop to update visibility
watch(() => props.show, (newShow) => {
  isVisible.value = newShow;
  if (newShow) {
    reset();
  }
});

// Computed properties
const isValid = computed(() => {
  return githubToken.value.trim().length > 0;
});

// Methods
const openModal = () => {
  isVisible.value = true;
  reset();
};

const closeModal = () => {
  emit('close');
};

const reset = () => {
  creating.value = false;
  error.value = '';
  githubToken.value = '';
};

const createAdapter = async () => {
  if (!isValid.value) return;

  creating.value = true;
  error.value = '';

  try {
    // Create adapter with user-provided token in env
    const adapterData = {
      name: 'github-api',
      connectionType: 'LocalStdio',
      protocol: 'MCP',
      mcpClientConfig: {
        mcpServers: {
          'github-api': {
            command: 'npx',
            args: [
              '-y',
              '@modelcontextprotocol/server-github'
            ],
            env: {
              GITHUB_PERSONAL_ACCESS_TOKEN: githubToken.value.trim()
            }
          }
        }
      },
      authentication: {
        required: true,
        type: 'bearer',
        bearerToken: {
          token: githubToken.value.trim(),
          dynamic: false
        }
      },
      description: 'Authenticated GitHub API MCP server'
    };

    // Make direct API call to match curl example
    await axios.post(`${API_BASE_URLS.MCP_GATEWAY}/adapters`, adapterData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    logger.info('GitHub MCP adapter created successfully', { data: { adapterName: adapterData.name } });
    emit('adapterCreated');
    closeModal();
  } catch (err) {
    logger.error('Failed to create GitHub MCP adapter', err);
    error.value = 'Failed to create adapter. Please check your token and try again.';
  } finally {
    creating.value = false;
  }
};

// Expose methods to parent component
defineExpose({
  openModal,
  closeModal
});
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: var(--body-bg, #ffffff);
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border, #e5e7eb);
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--body-text, #111827);
}

.modal-body {
  padding: 20px 24px;
  max-height: 60vh;
  overflow-y: auto;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid var(--border, #e5e7eb);
  background: var(--accent-bg, #f9fafb);
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 4px;
  font-weight: 500;
  color: var(--body-text, #111827);
}

.form-control {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border, #d1d5db);
  border-radius: 4px;
  font-size: 14px;
}

.form-control:focus {
  outline: none;
  border-color: var(--primary, #2563eb);
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
}

.form-help {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--muted, #6b7280);
}

.form-help code {
  background: var(--accent-bg, #f3f4f6);
  padding: 2px 4px;
  border-radius: 3px;
  font-family: monospace;
}

.form-help a {
  color: var(--primary, #2563eb);
  text-decoration: underline;
}

.error-message {
  color: var(--error, #dc2626);
  font-size: 14px;
  margin-top: 8px;
  padding: 8px 12px;
  background: rgba(220, 38, 38, 0.1);
  border-radius: 4px;
  border: 1px solid rgba(220, 38, 38, 0.2);
}

.btn {
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--primary, #2563eb);
  border: 1px solid var(--primary, #2563eb);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-hover, #1d4ed8);
  border-color: var(--primary-hover, #1d4ed8);
}

.btn-secondary {
  background: var(--body-bg, #ffffff);
  border: 1px solid var(--border, #d1d5db);
  color: var(--body-text, #111827);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--accent-bg, #f9fafb);
  border-color: var(--border-hover, #9ca3af);
}

.btn-sm {
  padding: 4px 8px;
  font-size: 12px;
}
</style>