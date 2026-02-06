<template>
  <div class="values-editor">
    <div class="editor-header">
      <div class="editor-title">
        <h3>{{ title }}</h3>
        <p v-if="description" class="editor-description">{{ description }}</p>
      </div>
      
      <div class="editor-actions">
        <button 
          class="btn btn-sm role-secondary"
          @click="toggleMode"
          :title="`Switch to ${mode === 'form' ? 'YAML' : 'Form'} mode`"
        >
          <i :class="`icon ${mode === 'form' ? 'icon-file-text' : 'icon-edit'}`"></i>
          {{ mode === 'form' ? 'YAML' : 'Form' }}
        </button>
        
        <button 
          v-if="mode === 'yaml'"
          class="btn btn-sm role-secondary"
          @click="validateYaml"
          :disabled="!hasChanges"
        >
          <i class="icon icon-checkmark"></i>
          Validate
        </button>
        
        <button 
          class="btn btn-sm role-secondary"
          @click="resetToDefaults"
          :disabled="!hasChanges"
        >
          <i class="icon icon-refresh"></i>
          Reset
        </button>
      </div>
    </div>
    
    <div class="editor-content">
      <!-- Form Mode -->
      <div v-if="mode === 'form'" class="form-editor">
        <div v-if="loading" class="loading-state">
          <i class="icon icon-spinner icon-spin"></i>
          Loading configuration...
        </div>
        
        <div v-else-if="formError" class="error-state">
          <i class="icon icon-warning"></i>
          <span>{{ formError }}</span>
        </div>
        
        <div v-else class="form-fields">
          <div v-for="field in formFields" :key="field.path" class="form-field">
            <label :for="field.path" class="field-label">
              {{ field.label }}
              <span v-if="field.required" class="required">*</span>
            </label>
            
            <div class="field-input">
              <!-- String Input -->
              <input
                v-if="field.type === 'string'"
                :id="field.path"
                v-model="formValues[field.path]"
                type="text"
                :placeholder="field.placeholder"
                :required="field.required"
                class="form-control"
              />
              
              <!-- Number Input -->
              <input
                v-else-if="field.type === 'number'"
                :id="field.path"
                v-model.number="formValues[field.path]"
                type="number"
                :min="field.min"
                :max="field.max"
                :step="field.step"
                :placeholder="field.placeholder"
                :required="field.required"
                class="form-control"
              />
              
              <!-- Boolean Input -->
              <label v-else-if="field.type === 'boolean'" class="checkbox-wrapper">
                <input
                  :id="field.path"
                  v-model="formValues[field.path]"
                  type="checkbox"
                  class="checkbox"
                />
                <span class="checkbox-label">{{ field.checkboxLabel || 'Enable' }}</span>
              </label>
              
              <!-- Select Input -->
              <select
                v-else-if="field.type === 'select'"
                :id="field.path"
                v-model="formValues[field.path]"
                :required="field.required"
                class="form-control"
              >
                <option v-if="field.placeholder" value="" disabled>{{ field.placeholder }}</option>
                <option v-for="option in field.options" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
              
              <!-- Textarea Input -->
              <textarea
                v-else-if="field.type === 'textarea'"
                :id="field.path"
                v-model="formValues[field.path]"
                :placeholder="field.placeholder"
                :required="field.required"
                :rows="field.rows || 3"
                class="form-control"
              ></textarea>
            </div>
            
            <p v-if="field.help" class="field-help">{{ field.help }}</p>
          </div>
        </div>
      </div>
      
      <!-- YAML Mode -->
      <div v-else class="yaml-editor">
        <div class="yaml-controls">
          <div v-if="yamlError" class="yaml-error">
            <i class="icon icon-warning"></i>
            <span>{{ yamlError }}</span>
          </div>
          
          <div v-if="yamlValid" class="yaml-success">
            <i class="icon icon-checkmark"></i>
            <span>YAML is valid</span>
          </div>
        </div>
        
        <textarea
          v-model="yamlContent"
          class="yaml-textarea"
          placeholder="# Enter your YAML configuration here..."
          spellcheck="false"
          @input="onYamlChange"
        ></textarea>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, watch } from 'vue';
import type { PropType } from 'vue';

type FormFieldType = 'string' | 'number' | 'boolean' | 'select' | 'textarea';

type FormField = {
  path: string;
  label: string;
  type: FormFieldType;
  required?: boolean;
  placeholder?: string;
  help?: string;
  checkboxLabel?: string;
  options?: Array<{ label: string; value: any }>;
  min?: number;
  max?: number;
  step?: number;
  rows?: number;
};

export default defineComponent({
  name: 'ValuesEditor',
  
  props: {
    title: {
      type: String,
      default: 'Configuration'
    },
    
    description: {
      type: String,
      default: null
    },
    
    defaultValues: {
      type: Object,
      default: () => ({})
    },
    
    schema: {
      type: Array as PropType<FormField[]>,
      default: () => []
    },
    
    loading: {
      type: Boolean,
      default: false
    },
    
    readonly: {
      type: Boolean,
      default: false
    }
  },
  
  emits: ['update:values', 'validate', 'error'],
  
  setup(props, { emit }) {
    const mode = ref<'form' | 'yaml'>('form');
    const formValues = ref<Record<string, any>>({ ...props.defaultValues });
    const yamlContent = ref('');
    const yamlError = ref<string | null>(null);
    const yamlValid = ref(false);
    const formError = ref<string | null>(null);
    
    const formFields = computed(() => props.schema);
    
    const hasChanges = computed(() => {
      return JSON.stringify(formValues.value) !== JSON.stringify(props.defaultValues);
    });
    
    // Convert form values to YAML
    const formToYaml = () => {
      try {
        yamlContent.value = convertToYaml(formValues.value);
        yamlError.value = null;
      } catch (error) {
        yamlError.value = `Failed to convert to YAML: ${(error as Error).message}`;
      }
    };
    
    // Convert YAML to form values
    const yamlToForm = () => {
      try {
        const parsed = parseYaml(yamlContent.value);
        formValues.value = { ...props.defaultValues, ...parsed };
        yamlError.value = null;
        formError.value = null;
      } catch (error) {
        yamlError.value = `Invalid YAML: ${(error as Error).message}`;
      }
    };
    
    const toggleMode = () => {
      if (mode.value === 'form') {
        formToYaml();
        mode.value = 'yaml';
      } else {
        yamlToForm();
        mode.value = 'form';
      }
    };
    
    const validateYaml = () => {
      try {
        parseYaml(yamlContent.value);
        yamlValid.value = true;
        yamlError.value = null;
        emit('validate', true);
      } catch (error) {
        yamlValid.value = false;
        yamlError.value = `Invalid YAML: ${(error as Error).message}`;
        emit('validate', false);
        emit('error', error);
      }
    };
    
    const onYamlChange = () => {
      yamlValid.value = false;
      yamlError.value = null;
    };
    
    const resetToDefaults = () => {
      formValues.value = { ...props.defaultValues };
      formToYaml();
      yamlError.value = null;
      yamlValid.value = false;
      formError.value = null;
    };
    
    // Simple YAML converter (basic implementation)
    const convertToYaml = (obj: any, indent = 0): string => {
      const spaces = '  '.repeat(indent);
      let yaml = '';
      
      for (const [key, value] of Object.entries(obj)) {
        if (value === null || value === undefined) {
          yaml += `${spaces}${key}: null\n`;
        } else if (typeof value === 'object' && !Array.isArray(value)) {
          yaml += `${spaces}${key}:\n${convertToYaml(value, indent + 1)}`;
        } else if (Array.isArray(value)) {
          yaml += `${spaces}${key}:\n`;
          value.forEach(item => {
            if (typeof item === 'object') {
              yaml += `${spaces}  -\n${convertToYaml(item, indent + 2)}`;
            } else {
              yaml += `${spaces}  - ${item}\n`;
            }
          });
        } else if (typeof value === 'string') {
          yaml += `${spaces}${key}: "${value}"\n`;
        } else {
          yaml += `${spaces}${key}: ${value}\n`;
        }
      }
      
      return yaml;
    };
    
    // Simple YAML parser (basic implementation)
    const parseYaml = (yamlStr: string): any => {
      // This is a very basic YAML parser
      // In production, you would use a proper YAML library like js-yaml
      try {
        // Remove comments and empty lines
        const lines = yamlStr.split('\n')
          .filter(line => line.trim() && !line.trim().startsWith('#'));
        
        const result: any = {};
        
        for (const line of lines) {
          const match = line.match(/^(\s*)([^:]+):\s*(.*)$/);
          if (match) {
            const [, , key, value] = match;
            const cleanKey = key.trim();
            const cleanValue = value.trim();
            
            if (cleanValue === 'null' || cleanValue === '') {
              result[cleanKey] = null;
            } else if (cleanValue === 'true') {
              result[cleanKey] = true;
            } else if (cleanValue === 'false') {
              result[cleanKey] = false;
            } else if (cleanValue.match(/^-?\d+$/)) {
              result[cleanKey] = parseInt(cleanValue);
            } else if (cleanValue.match(/^-?\d*\.\d+$/)) {
              result[cleanKey] = parseFloat(cleanValue);
            } else {
              result[cleanKey] = cleanValue.replace(/^["']|["']$/g, '');
            }
          }
        }
        
        return result;
      } catch (error) {
        throw new Error('Invalid YAML format');
      }
    };
    
    // Watch for changes and emit
    watch(
      () => formValues.value,
      (newValues) => {
        emit('update:values', newValues);
      },
      { deep: true }
    );
    
    watch(
      () => yamlContent.value,
      () => {
        if (mode.value === 'yaml') {
          try {
            const parsed = parseYaml(yamlContent.value);
            emit('update:values', parsed);
          } catch {
            // Don't emit invalid values
          }
        }
      }
    );
    
    // Initialize YAML content
    formToYaml();
    
    return {
      mode,
      formValues,
      yamlContent,
      yamlError,
      yamlValid,
      formError,
      formFields,
      hasChanges,
      toggleMode,
      validateYaml,
      onYamlChange,
      resetToDefaults
    };
  }
});
</script>

<style scoped>
.values-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--input-bg);
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
  background: var(--nav-bg);
}

.editor-title h3 {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--body-text);
}

.editor-description {
  margin: 0;
  font-size: 14px;
  color: var(--muted);
}

.editor-actions {
  display: flex;
  gap: 8px;
}

.editor-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.form-editor {
  flex: 1;
  overflow: auto;
  padding: 20px;
}

.loading-state,
.error-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 40px;
  color: var(--muted);
}

.error-state {
  color: var(--error);
}

.form-fields {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--body-text);
}

.required {
  color: var(--error);
}

.field-input {
  display: flex;
  flex-direction: column;
}

.form-control {
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--input-bg);
  color: var(--body-text);
  font-size: 14px;
}

.form-control:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 2px rgba(var(--primary-rgb), 0.2);
}

.checkbox-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox {
  width: 16px;
  height: 16px;
}

.checkbox-label {
  font-size: 14px;
  color: var(--body-text);
}

.field-help {
  font-size: 12px;
  color: var(--muted);
  margin: 0;
}

.yaml-editor {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.yaml-controls {
  padding: 12px 20px;
  border-bottom: 1px solid var(--border);
  background: var(--nav-bg);
}

.yaml-error,
.yaml-success {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}

.yaml-error {
  color: var(--error);
}

.yaml-success {
  color: var(--success);
}

.yaml-textarea {
  flex: 1;
  padding: 20px;
  border: none;
  background: var(--input-bg);
  color: var(--body-text);
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
  line-height: 1.5;
  resize: none;
  outline: none;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid transparent;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.role-secondary {
  background: var(--accent-btn);
  border-color: var(--accent-btn);
  color: var(--accent-btn-text);
}

.role-secondary:hover:not(:disabled) {
  background: var(--accent-btn-hover);
  border-color: var(--accent-btn-hover);
}

.icon-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>