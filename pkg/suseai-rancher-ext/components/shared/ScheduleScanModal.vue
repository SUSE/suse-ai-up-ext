<template>
  <div v-if="isVisible" class="modal-overlay" @click="closeModal">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>MCP Discovery Scan</h3>
        <button class="btn btn-sm btn-secondary" @click="closeModal">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>Discovery Scan Configuration:</label>
          <p class="form-description">Configure the parameters for discovering MCP servers on your network.</p>
        </div>

        <div class="form-group">
          <label>Scan Configuration:</label>
          <div class="scan-config">
            <div class="config-item">
              <label for="maxConcurrent">Max Concurrent:</label>
              <input
                type="number"
                id="maxConcurrent"
                v-model.number="scanConfig.maxConcurrent"
                class="form-control"
                min="1"
                max="50"
              />
            </div>
            <div class="config-item">
              <label for="timeout">Timeout:</label>
              <input
                type="text"
                id="timeout"
                v-model="scanConfig.timeout"
                class="form-control"
                placeholder="30s"
              />
            </div>
          </div>
        </div>

        <div class="form-group">
          <label>Scan Ranges:</label>
          <div class="scan-ranges">
            <div v-for="(range, index) in scanConfig.scanRanges || []" :key="index" class="range-item">
              <input
                type="text"
                v-model="scanConfig.scanRanges![index]"
                class="form-control"
                placeholder="192.168.1.0/24"
              />
              <button
                type="button"
                class="btn btn-sm btn-secondary"
                @click="removeRange(index)"
                :disabled="(scanConfig.scanRanges || []).length <= 1"
              >
                &times;
              </button>
            </div>
            <button type="button" class="btn btn-sm btn-secondary" @click="addRange">
              Add Range
            </button>
          </div>
        </div>

        <div class="form-group">
          <label>Ports to Scan:</label>
          <div class="scan-ports">
            <div v-for="(port, index) in scanConfig.ports || []" :key="index" class="port-item">
              <input
                type="number"
                v-model.number="scanConfig.ports![index]"
                class="form-control"
                min="1"
                max="65535"
              />
              <button
                type="button"
                class="btn btn-sm btn-secondary"
                @click="removePort(index)"
                :disabled="(scanConfig.ports || []).length <= 1"
              >
                &times;
              </button>
            </div>
            <button type="button" class="btn btn-sm btn-secondary" @click="addPort">
              Add Port
            </button>
          </div>
        </div>

        <div v-if="error" class="error-message">
          {{ error }}
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" @click="closeModal">Cancel</button>
        <button class="btn btn-primary" @click="scheduleScan" :disabled="!isValid || scanning">
          {{ scanning ? 'Scanning...' : 'Start' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { MCPService, type ScanConfig } from '../../services/mcp-service';
import { logger } from '../../utils/logger';

// Emits
const emit = defineEmits<{
  scanStarted: [];
  close: [];
}>();


const isVisible = ref(false);
const scanning = ref(false);
const error = ref<string>('');



// Scan configuration
const scanConfig = ref<ScanConfig>({
  maxConcurrent: 10,
  ports: [8000, 3000, 5000],
  scanRanges: ['192.168.1.0/24'],
  timeout: '30s'
} as ScanConfig);

// Computed properties
const isValid = computed(() => {
  // Validate scan configuration
  return scanConfig.value.scanRanges.length > 0 &&
         scanConfig.value.ports.length > 0 &&
         scanConfig.value.maxConcurrent > 0;
});

// Methods
const openModal = () => {
  isVisible.value = true;
  reset();
};

const closeModal = () => {
  isVisible.value = false;
  reset();
  emit('close');
};

const reset = () => {
  error.value = '';
  scanConfig.value = {
    maxConcurrent: 10,
    ports: [8911],
    scanRanges: ['192.168.1.0/24'],
    timeout: '30s'
  };
};

const addRange = () => {
  if (!scanConfig.value.scanRanges) {
    scanConfig.value.scanRanges = [];
  }
  scanConfig.value.scanRanges.push('');
};

const removeRange = (index: number) => {
  if (scanConfig.value.scanRanges && scanConfig.value.scanRanges.length > 1) {
    scanConfig.value.scanRanges.splice(index, 1);
  }
};

const addPort = () => {
  if (!scanConfig.value.ports) {
    scanConfig.value.ports = [];
  }
  scanConfig.value.ports.push(8000);
};

const removePort = (index: number) => {
  if (scanConfig.value.ports && scanConfig.value.ports.length > 1) {
    scanConfig.value.ports.splice(index, 1);
  }
};

const scheduleScan = async () => {
  scanning.value = true;
  try {
    error.value = '';

    await MCPService.startScan(scanConfig.value);

    logger.info('Discovery scan started', { data: { config: scanConfig.value } });
    alert('Discovery scan started! Check discovered servers in a few moments.');
    emit('scanStarted');

    closeModal();
  } catch (err) {
    logger.error('Failed to start scan', err);
    error.value = 'Failed to start scan. Please try again.';
  } finally {
    scanning.value = false;
  }
};

// Expose methods to parent component
defineExpose({
  openModal
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
  max-width: 600px;
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

.scan-config {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.config-item {
  display: flex;
  flex-direction: column;
}

.scan-ranges,
.scan-ports {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.range-item,
.port-item {
  display: flex;
  gap: 8px;
  align-items: center;
}

.range-item .form-control,
.port-item .form-control {
  flex: 1;
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