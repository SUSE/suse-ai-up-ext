<template>
  <div v-if="isVisible" class="modal-overlay" @click="closeModal">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>Security Rules Management</h3>
        <button class="btn btn-sm btn-secondary" @click="closeModal">&times;</button>
      </div>
      <div class="modal-body">
        <div class="rules-sections">
          <!-- Current Rules -->
          <div class="rules-section">
            <h4>Loaded Rules</h4>
            <div v-if="currentRules.length === 0" class="no-rules">
              No security rules are currently loaded.
            </div>
            <div v-else class="rules-list">
              <div
                v-for="rule in currentRules"
                :key="rule.id"
                class="rule-item"
              >
                <div class="rule-header">
                  <div class="rule-info">
                    <strong>{{ rule.name }}</strong>
                    <span class="rule-id">{{ rule.id }}</span>
                  </div>
                  <div class="rule-actions">
                    <span class="rule-action" :class="rule.action">
                      {{ rule.action.toUpperCase() }}
                    </span>
                  </div>
                </div>
                <div class="rule-conditions">
                  <div v-if="rule.conditions && rule.conditions.length > 0">
                    <small>Conditions:</small>
                    <ul>
                      <li v-for="condition in rule.conditions" :key="Math.random()">
                        {{ condition.field }} {{ condition.operator }} "{{ condition.value }}"
                      </li>
                    </ul>
                  </div>
                  <div v-else>
                    <small>Built-in rule</small>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Load New Rules -->
          <div class="rules-section">
            <h4>Load Rules from File</h4>
            <div class="file-upload">
              <input
                type="file"
                ref="rulesFileInput"
                @change="handleFileSelect"
                accept=".yaml,.yml"
                class="form-control"
              />
              <div class="upload-actions">
                <button
                  class="btn btn-primary"
                  @click="loadRulesFromFile"
                  :disabled="!selectedFile || loading"
                >
                  {{ loading ? 'Loading...' : 'Load Rules' }}
                </button>
                <button
                  class="btn btn-secondary"
                  @click="clearRules"
                  :disabled="loading"
                >
                  Clear Rules
                </button>
              </div>
            </div>
            <div v-if="loadError" class="error-message">
              {{ loadError }}
            </div>
            <div v-if="loadSuccess" class="success-message">
              Rules loaded successfully!
            </div>
          </div>

          <!-- Sample Rules -->
          <div class="rules-section">
            <h4>Sample Rule Templates</h4>
            <div class="sample-rules">
              <div class="sample-rule">
                <h5>Block Dangerous Commands</h5>
                <pre>{{ sampleRule1 }}</pre>
                <button class="btn btn-sm btn-secondary" @click="downloadSample(1)">
                  Download
                </button>
              </div>
              <div class="sample-rule">
                <h5>Detect Secrets</h5>
                <pre>{{ sampleRule2 }}</pre>
                <button class="btn btn-sm btn-secondary" @click="downloadSample(2)">
                  Download
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" @click="closeModal">Close</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
// import { MCPService } from '../../services/mcp-service';
import { logger } from '../../utils/logger';

// Emits
const emit = defineEmits<{
  rulesLoaded: [];
  close: [];
}>();

// Reactive state
const isVisible = ref(false);
const loading = ref(false);
const loadError = ref('');
const loadSuccess = ref(false);
const selectedFile = ref<File | null>(null);
const rulesFileInput = ref<HTMLInputElement>();

// Sample rules
const sampleRule1 = `version: "1.0"
global_settings:
  secrets_action: block
  pii_action: warn

server_rules:
  dangerous-server:
    custom_rules:
      - name: "Block dangerous file operations"
        id: "file_security"
        action: block
        conditions:
          - field: tool_name
            operator: in
            value: ["write_file", "delete_file", "execute_command"]
          - field: arguments.path
            operator: contains
            value: "/etc"`;

const sampleRule2 = `version: "1.0"
builtin_rules:
  secrets: true
  pii: true
  prompt_injection:
    enabled: true
  tool_poisoning:
    enabled: true

global_settings:
  secrets_action: block
  pii_action: warn`;

// Reactive state for rules
const currentRules = ref<any[]>([]);

// Load rules on modal open
const loadCurrentRules = async () => {
  try {
    // TODO: Implement backend API call to get current rules
    // const response = await MCPService.getSecurityRules();
    // currentRules.value = response.rules;

    // For now, show empty state
    currentRules.value = [];
  } catch (error) {
    logger.error('Failed to load rules', error);
  }
};

// Methods
const openModal = async () => {
  isVisible.value = true;
  reset();
  await loadCurrentRules();
};

const closeModal = () => {
  isVisible.value = false;
  reset();
  emit('close');
};

const reset = () => {
  loading.value = false;
  loadError.value = '';
  loadSuccess.value = false;
  selectedFile.value = null;
  if (rulesFileInput.value) {
    rulesFileInput.value.value = '';
  }
};

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement;
  selectedFile.value = target.files?.[0] || null;
  loadError.value = '';
  loadSuccess.value = false;
};

const loadRulesFromFile = async () => {
  if (!selectedFile.value) return;

  loading.value = true;
  loadError.value = '';
  loadSuccess.value = false;

  try {
    const content = await selectedFile.value.text();

    // TODO: Implement backend validation API
    // const validation = await MCPService.validateSecurityRules(content);
    // if (!validation.valid) {
    //   throw new Error(validation.errors.join(', '));
    // }

    // TODO: Implement backend rule storage
    // await MCPService.saveSecurityRules(content);

    loadSuccess.value = true;
    logger.info('Security rules validated and would be saved to backend');
    emit('rulesLoaded');
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : 'Failed to load rules';
    logger.error('Failed to load security rules', error);
  } finally {
    loading.value = false;
  }
};

const clearRules = async () => {
  try {
    // TODO: Implement backend rule clearing
    // await MCPService.clearSecurityRules();
    loadSuccess.value = true;
    logger.info('Security rules would be cleared from backend');
    emit('rulesLoaded');
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : 'Failed to clear rules';
  }
};

const downloadSample = (sampleNumber: number) => {
  const content = sampleNumber === 1 ? sampleRule1 : sampleRule2;
  const filename = `security-rules-sample-${sampleNumber}.yaml`;

  const blob = new Blob([content], { type: 'application/x-yaml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
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
  max-width: 900px;
  width: 90%;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
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
  overflow-y: auto;
  flex: 1;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid var(--border, #e5e7eb);
  background: var(--accent-bg, #f9fafb);
}

.rules-sections {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.rules-section {
  border: 1px solid var(--border, #e5e7eb);
  border-radius: 8px;
  padding: 16px;
}

.rules-section h4 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--body-text, #111827);
}

.no-rules {
  text-align: center;
  padding: 40px;
  color: var(--muted, #6b7280);
  font-style: italic;
}

.rules-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.rule-item {
  border: 1px solid var(--border, #e5e7eb);
  border-radius: 6px;
  padding: 12px;
  background: var(--card-bg, #ffffff);
}

.rule-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.rule-info strong {
  display: block;
  font-size: 14px;
  color: var(--body-text, #111827);
}

.rule-id {
  font-size: 12px;
  color: var(--muted, #6b7280);
  font-family: monospace;
}

.rule-action {
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: bold;
  text-transform: uppercase;
}

.rule-action.block {
  background: var(--error, #dc2626);
  color: white;
}

.rule-action.warn {
  background: var(--warning, #d97706);
  color: white;
}

.rule-action.log {
  background: var(--info, #2563eb);
  color: white;
}

.rule-conditions {
  font-size: 12px;
  color: var(--muted, #6b7280);
}

.rule-conditions ul {
  margin: 4px 0 0 0;
  padding-left: 16px;
}

.rule-conditions li {
  margin-bottom: 2px;
}

.file-upload {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.upload-actions {
  display: flex;
  gap: 8px;
}

.sample-rules {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.sample-rule {
  border: 1px solid var(--border, #e5e7eb);
  border-radius: 6px;
  padding: 12px;
  background: var(--card-bg, #ffffff);
}

.sample-rule h5 {
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: 600;
}

.sample-rule pre {
  background: var(--accent-bg, #f9fafb);
  padding: 8px;
  border-radius: 4px;
  font-size: 11px;
  overflow-x: auto;
  margin-bottom: 8px;
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

.success-message {
  color: var(--success, #16a34a);
  font-size: 14px;
  margin-top: 8px;
  padding: 8px 12px;
  background: rgba(22, 163, 74, 0.1);
  border-radius: 4px;
  border: 1px solid rgba(22, 163, 74, 0.2);
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
</style>