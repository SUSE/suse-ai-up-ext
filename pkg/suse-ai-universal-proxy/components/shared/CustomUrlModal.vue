<template>
  <div v-if="show" class="modal-overlay" @click="$emit('close')">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>Configure Service URL</h3>
        <button @click="$emit('close')" class="btn btn-sm">×</button>
      </div>
      <div class="modal-body">
        <p class="modal-description">
          No SUSE AI Universal Proxy service was detected on port 8911 in the cluster.
          Please provide the custom URL to access the service.
        </p>
        <form @submit.prevent="handleSubmit" class="url-form">
          <div class="form-group">
            <label for="service-url">Service URL *</label>
            <input
              id="service-url"
              v-model="url"
              type="url"
              placeholder="https://example.com:8911"
              required
              class="form-control"
              :class="{ 'is-invalid': !!error || !!validationError }"
              :disabled="isValidating"
            >
            <small class="form-help">Full URL including protocol and port</small>
            <div v-if="error" class="invalid-feedback">{{ error }}</div>
            <div v-if="validationError" class="invalid-feedback">{{ validationError }}</div>
          </div>
        </form>
      </div>
      <div class="modal-footer">
        <button @click="$emit('close')" class="btn btn-secondary">Cancel</button>
        <button @click="handleSubmit" class="btn btn-primary" :disabled="!url.trim() || !!error || isValidating">
          <span v-if="isValidating" class="spinner"></span>
          {{ isValidating ? 'Validating...' : 'Validate and Save' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, watch } from 'vue';
import axios from 'axios';

export default defineComponent({
  name: 'CustomUrlModal',
  props: {
    show: {
      type: Boolean,
      default: false
    },
    initialUrl: {
      type: String,
      default: ''
    }
  },
  emits: ['close', 'save'],
  setup(props, { emit }) {
    const url = ref(props.initialUrl);
    const error = ref('');
    const isValidating = ref(false);
    const validationError = ref('');

    // Reset form when modal opens
    watch(() => props.show, (newVal) => {
      if (newVal) {
        url.value = props.initialUrl;
        error.value = '';
        validationError.value = '';
        isValidating.value = false;
      }
    });

    // Clear validation error when URL changes
    watch(url, () => {
      validationError.value = '';
    });

    const validateUrl = (value: string): boolean => {
      if (!value.trim()) {
        error.value = 'URL is required';
        return false;
      }
      try {
        new URL(value);
        error.value = '';
        return true;
      } catch {
        error.value = 'Please enter a valid URL';
        return false;
      }
    };

    const validateServiceUrl = async (serviceUrl: string): Promise<boolean> => {
      const baseUrl = serviceUrl.replace(/\/$/, '');
      const endpoints = ['/health', '/api/v1/health', '/'];

      for (const endpoint of endpoints) {
        try {
          const testUrl = `${baseUrl}${endpoint}`;
          console.log('Validating service URL:', testUrl);
          const response = await axios.get(testUrl, {
            timeout: 10000, // 10 second timeout
            headers: {
              'Accept': 'application/json'
            }
          });
          if (response.status >= 200 && response.status < 300) {
            console.log('Service validation successful with endpoint:', endpoint);
            return true;
          }
        } catch (err) {
          console.log('Endpoint', endpoint, 'failed:', err);
          // Continue to next endpoint
        }
      }

      // All endpoints failed
      validationError.value = 'Unable to validate service. Please check the URL and ensure the service is running and accessible.';
      return false;
    };

    const handleSubmit = async () => {
      if (!validateUrl(url.value)) {
        return;
      }

      isValidating.value = true;
      validationError.value = '';

      const isValid = await validateServiceUrl(url.value);

      isValidating.value = false;

      if (isValid) {
        emit('save', url.value);
        emit('close');
      }
      // If not valid, validationError is already set
    };

    return {
      url,
      error,
      isValidating,
      validationError,
      handleSubmit
    };
  }
});
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e1e5e9;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
}

.modal-header .btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #6c757d;
}

.modal-body {
  padding: 1.5rem;
}

.modal-description {
  margin-bottom: 1rem;
  color: #6c757d;
  line-height: 1.5;
}

.url-form {
  margin-top: 1rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #374151;
}

.form-control {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.875rem;
  transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
}

.form-control:focus {
  outline: 0;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-control.is-invalid {
  border-color: #ef4444;
}

.form-control.is-invalid:focus {
  border-color: #ef4444;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}

.form-help {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.75rem;
  color: #6c757d;
}

.invalid-feedback {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.75rem;
  color: #ef4444;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid #e1e5e9;
}

.btn {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease-in-out;
  border: 1px solid transparent;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spinner {
  display: inline-block;
  width: 1rem;
  height: 1rem;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: #fff;
  animation: spin 1s ease-in-out infinite;
  margin-right: 0.5rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.btn-secondary {
  background-color: #6c757d;
  color: white;
  border-color: #6c757d;
}

.btn-secondary:hover:not(:disabled) {
  background-color: #5a6268;
  border-color: #5a6268;
}

.btn-primary {
  background-color: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

.btn-primary:hover:not(:disabled) {
  background-color: #2563eb;
  border-color: #2563eb;
}
</style>