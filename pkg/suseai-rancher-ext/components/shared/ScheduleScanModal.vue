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

         <!-- Security Testing Section -->
         <div class="form-group">
           <div class="security-section-header">
             <label class="checkbox-label">
               <input
                 type="checkbox"
                 v-model="scanConfig.security_test"
                 class="form-checkbox"
               />
               <span class="checkbox-text">Enable Security Testing</span>
             </label>
             <button
               type="button"
               class="btn btn-sm btn-link"
               @click="toggleSecuritySection"
             >
               {{ showSecuritySection ? 'Hide' : 'Show' }} Options
             </button>
           </div>

           <div v-if="showSecuritySection && scanConfig.security_test" class="security-options">
             <div class="form-group">
               <label>Security Rules File:</label>
               <input
                 type="file"
                 ref="rulesFileInput"
                 @change="handleRulesFileChange"
                 accept=".yaml,.yml"
                 class="form-control"
               />
               <div class="form-help">
                 Upload a YAML file with custom security rules. Leave empty to use built-in rules only.
               </div>
               <div v-if="rulesFileName" class="file-info">
                 Selected: {{ rulesFileName }}
                 <button type="button" class="btn btn-sm btn-link" @click="clearRulesFile">Clear</button>
               </div>
               <div v-if="rulesValidationError" class="error-message">
                 {{ rulesValidationError }}
               </div>
               <div v-if="rulesPreview && !rulesValidationError" class="rules-preview">
                 <strong>Rules Preview:</strong>
                 <div class="rules-summary">
                   <span>Built-in rules: {{ rulesPreview.builtin_count }}</span>
                   <span>Custom rules: {{ rulesPreview.custom_count }}</span>
                 </div>
               </div>
             </div>

             <div class="security-warnings">
               <div class="warning-message">
                 ⚠️ Security testing may increase scan time and resource usage.
               </div>
             </div>
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
import { ref, computed } from 'vue';
import { MCPService, type ScanConfig } from '../../services/mcp-service';
import { logger } from '../../utils/logger';
import yaml from 'js-yaml';

// Emits
const emit = defineEmits<{
  scanStarted: [result: any];
  close: [];
}>();


const isVisible = ref(false);
const scanning = ref(false);
const error = ref<string>('');

// Security testing state
const showSecuritySection = ref(false);
const rulesFileName = ref<string>('');
const rulesValidationError = ref<string>('');
const rulesPreview = ref<{builtin_count: number, custom_count: number} | null>(null);
const rulesFileInput = ref<HTMLInputElement>();



// Scan configuration
const scanConfig = ref<ScanConfig>({
  maxConcurrent: 10,
  ports: [8000, 3000, 5000],
  scanRanges: ['192.168.1.0/24'],
  timeout: '30s',
  security_test: false
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
    timeout: '30s',
    security_test: false
  };
  rulesFileName.value = '';
  rulesValidationError.value = '';
  rulesPreview.value = null;
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

const toggleSecuritySection = () => {
  showSecuritySection.value = !showSecuritySection.value;
};

const handleRulesFileChange = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];

  if (!file) {
    clearRulesFile();
    return;
  }

  rulesFileName.value = file.name;
  rulesValidationError.value = '';

  try {
    const content = await file.text();
    const parsed = yaml.load(content) as any;

    // Basic validation
    if (typeof parsed !== 'object' || parsed === null) {
      throw new Error('Invalid YAML structure');
    }

    // Count rules
    const builtinCount = parsed.global_settings ? 1 : 0;
    const customCount = parsed.server_rules ?
      Object.values(parsed.server_rules).reduce((count: number, serverRules: any) => {
        return count + (serverRules.custom_rules ? serverRules.custom_rules.length : 0);
      }, 0) : 0;

    rulesPreview.value = {
      builtin_count: builtinCount,
      custom_count: customCount
    };

    // Store file content for submission (in a real implementation, you'd upload or store it)
    scanConfig.value.security_rules_file = content;

  } catch (err) {
    rulesValidationError.value = `Invalid YAML file: ${err instanceof Error ? err.message : 'Unknown error'}`;
    rulesPreview.value = null;
    scanConfig.value.security_rules_file = undefined;
  }
};

const clearRulesFile = () => {
  rulesFileName.value = '';
  rulesValidationError.value = '';
  rulesPreview.value = null;
  scanConfig.value.security_rules_file = undefined;
  if (rulesFileInput.value) {
    rulesFileInput.value.value = '';
  }
};

    const scheduleScan = async () => {
      scanning.value = true;
      try {
        error.value = '';

        // Prepare scan config for backend API
        const backendConfig = {
          ...scanConfig.value,
          security_rules: scanConfig.value.security_rules_file // Rename for backend API
        };
        delete backendConfig.security_rules_file; // Remove old field

        const scanResult = await MCPService.startScan(backendConfig);

        logger.info('Discovery scan started', { scanId: scanResult.scan_id, config: backendConfig });
        emit('scanStarted', scanResult);

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

.btn-link {
  background: none;
  border: none;
  color: var(--primary, #2563eb);
  text-decoration: underline;
  cursor: pointer;
}

.btn-link:hover {
  color: var(--primary-hover, #1d4ed8);
}

/* Security Testing Styles */
.security-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-weight: 500;
}

.form-checkbox {
  width: 16px;
  height: 16px;
  accent-color: var(--primary, #2563eb);
  cursor: pointer;
}

.checkbox-text {
  user-select: none;
}

.security-options {
  margin-top: 16px;
  padding: 16px;
  background: var(--accent-bg, #f9fafb);
  border-radius: 4px;
  border: 1px solid var(--border, #e5e7eb);
}

.file-info {
  margin-top: 8px;
  font-size: 14px;
  color: var(--body-text, #111827);
  display: flex;
  align-items: center;
  gap: 8px;
}

.rules-preview {
  margin-top: 12px;
  padding: 12px;
  background: white;
  border-radius: 4px;
  border: 1px solid var(--border, #e5e7eb);
}

.rules-summary {
  display: flex;
  gap: 16px;
  margin-top: 8px;
  font-size: 14px;
  color: var(--muted, #6b7280);
}

.security-warnings {
  margin-top: 16px;
}

.warning-message {
  padding: 8px 12px;
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 4px;
  color: #856404;
  font-size: 14px;
}
</style>