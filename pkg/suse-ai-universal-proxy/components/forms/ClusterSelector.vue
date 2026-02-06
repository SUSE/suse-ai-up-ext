<template>
  <div class="cluster-selector">
    <div class="selector-header">
      <label class="selector-label">
        {{ label }}
        <span v-if="required" class="required">*</span>
      </label>
      <p v-if="description" class="selector-description">{{ description }}</p>
    </div>
    
    <div class="selector-content">
      <!-- Loading State -->
      <div v-if="loading" class="loading-state">
        <i class="icon icon-spinner icon-spin"></i>
        <span>Loading clusters...</span>
      </div>
      
      <!-- Error State -->
      <div v-else-if="error" class="error-state">
        <i class="icon icon-warning"></i>
        <span>{{ error }}</span>
        <button class="btn btn-sm role-secondary" @click="$emit('retry')">
          <i class="icon icon-refresh"></i>
          Retry
        </button>
      </div>
      
      <!-- Cluster Selection -->
      <div v-else class="cluster-options">
        <!-- Single Selection -->
        <div v-if="!multiple" class="single-selection">
          <select 
            :value="singleValue" 
            @change="onSingleChange"
            :required="required"
            :disabled="disabled"
            class="form-control"
          >
            <option value="" disabled>{{ placeholder }}</option>
            <option 
              v-for="cluster in availableClusters" 
              :key="cluster.id" 
              :value="cluster.id"
            >
              {{ cluster.name }} ({{ cluster.id }})
            </option>
          </select>
        </div>
        
        <!-- Multiple Selection -->
        <div v-else class="multiple-selection">
          <div class="cluster-list">
            <div 
              v-for="cluster in availableClusters" 
              :key="cluster.id"
              class="cluster-option"
            >
              <label class="cluster-checkbox">
                <input 
                  type="checkbox"
                  :value="cluster.id"
                  :checked="isSelected(cluster.id)"
                  @change="onMultipleChange(cluster.id, $event)"
                  :disabled="disabled"
                  class="checkbox"
                />
                <div class="cluster-info">
                  <div class="cluster-name">{{ cluster.name }}</div>
                  <div class="cluster-details">
                    <span class="cluster-id">{{ cluster.id }}</span>
                    <span v-if="cluster.version" class="cluster-version">v{{ cluster.version }}</span>
                    <span :class="`cluster-status status-${cluster.status?.toLowerCase()}`">
                      {{ cluster.status || 'Unknown' }}
                    </span>
                  </div>
                </div>
              </label>
            </div>
          </div>
          
          <!-- Selected Summary -->
          <div v-if="selectedClusters.length" class="selection-summary">
            <div class="summary-header">
              <span class="summary-count">{{ selectedClusters.length }} cluster(s) selected</span>
              <button 
                class="btn btn-sm role-tertiary" 
                @click="clearSelection"
                :disabled="disabled"
              >
                Clear All
              </button>
            </div>
            <div class="selected-chips">
              <span 
                v-for="clusterId in selectedClusters" 
                :key="clusterId"
                class="cluster-chip"
              >
                {{ getClusterName(clusterId) }}
                <button 
                  class="chip-remove"
                  @click="removeCluster(clusterId)"
                  :disabled="disabled"
                  title="Remove cluster"
                >
                  <i class="icon icon-close"></i>
                </button>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Validation Message -->
    <div v-if="validationMessage" class="validation-message">
      <i :class="`icon ${validationIcon}`"></i>
      <span>{{ validationMessage }}</span>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, ref } from 'vue';
import type { PropType } from 'vue';

type ClusterInfo = {
  id: string;
  name: string;
  version?: string;
  status?: string;
  ready?: boolean;
};

export default defineComponent({
  name: 'ClusterSelector',
  
  props: {
    clusters: {
      type: Array as PropType<ClusterInfo[]>,
      default: () => []
    },
    
    modelValue: {
      type: [String, Array] as PropType<string | string[]>,
      default: null
    },
    
    multiple: {
      type: Boolean,
      default: false
    },
    
    required: {
      type: Boolean,
      default: false
    },
    
    disabled: {
      type: Boolean,
      default: false
    },
    
    loading: {
      type: Boolean,
      default: false
    },
    
    error: {
      type: String,
      default: null
    },
    
    label: {
      type: String,
      default: 'Select Cluster(s)'
    },
    
    description: {
      type: String,
      default: null
    },
    
    placeholder: {
      type: String,
      default: 'Choose a cluster...'
    },
    
    filter: {
      type: Function as PropType<(cluster: ClusterInfo) => boolean>,
      default: null
    },
    
    validation: {
      type: Object as PropType<{
        message: string;
        type: 'error' | 'warning' | 'success';
      }>,
      default: null
    }
  },
  
  emits: ['update:modelValue', 'retry', 'change'],
  
  setup(props, { emit }) {
    const availableClusters = computed(() => {
      let clusters = props.clusters || [];
      
      if (props.filter) {
        clusters = clusters.filter(props.filter);
      }
      
      return clusters.sort((a, b) => a.name.localeCompare(b.name));
    });
    
    const singleValue = computed(() => {
      return props.multiple ? '' : (props.modelValue as string) || '';
    });
    
    const selectedClusters = computed(() => {
      if (!props.multiple) return [];
      return Array.isArray(props.modelValue) ? props.modelValue : [];
    });
    
    const validationMessage = computed(() => {
      return props.validation?.message || null;
    });
    
    const validationIcon = computed(() => {
      if (!props.validation) return '';
      
      switch (props.validation.type) {
        case 'error': return 'icon-warning';
        case 'warning': return 'icon-info';
        case 'success': return 'icon-checkmark';
        default: return 'icon-info';
      }
    });
    
    const isSelected = (clusterId: string): boolean => {
      return selectedClusters.value.includes(clusterId);
    };
    
    const getClusterName = (clusterId: string): string => {
      const cluster = availableClusters.value.find(c => c.id === clusterId);
      return cluster?.name || clusterId;
    };
    
    const onSingleChange = (event: Event) => {
      const target = event.target as HTMLSelectElement;
      const value = target.value;
      emit('update:modelValue', value);
      emit('change', value);
    };
    
    const onMultipleChange = (clusterId: string, event: Event) => {
      const target = event.target as HTMLInputElement;
      const checked = target.checked;
      
      let newSelection = [...selectedClusters.value];
      
      if (checked) {
        if (!newSelection.includes(clusterId)) {
          newSelection.push(clusterId);
        }
      } else {
        newSelection = newSelection.filter(id => id !== clusterId);
      }
      
      emit('update:modelValue', newSelection);
      emit('change', newSelection);
    };
    
    const removeCluster = (clusterId: string) => {
      const newSelection = selectedClusters.value.filter(id => id !== clusterId);
      emit('update:modelValue', newSelection);
      emit('change', newSelection);
    };
    
    const clearSelection = () => {
      emit('update:modelValue', []);
      emit('change', []);
    };
    
    return {
      availableClusters,
      singleValue,
      selectedClusters,
      validationMessage,
      validationIcon,
      isSelected,
      getClusterName,
      onSingleChange,
      onMultipleChange,
      removeCluster,
      clearSelection
    };
  }
});
</script>

<style scoped>
.cluster-selector {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.selector-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.selector-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--body-text);
}

.required {
  color: var(--error);
}

.selector-description {
  margin: 0;
  font-size: 13px;
  color: var(--muted);
}

.selector-content {
  min-height: 40px;
}

.loading-state,
.error-state {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--input-bg);
}

.error-state {
  color: var(--error);
  border-color: var(--error-border);
  background: var(--error-banner-bg);
}

.form-control {
  width: 100%;
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

.form-control:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.multiple-selection {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.cluster-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--input-bg);
}

.cluster-option {
  border-bottom: 1px solid var(--border);
}

.cluster-option:last-child {
  border-bottom: none;
}

.cluster-checkbox {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.cluster-checkbox:hover {
  background: var(--accent-btn);
}

.checkbox {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.cluster-info {
  flex: 1;
  min-width: 0;
}

.cluster-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--body-text);
  margin-bottom: 4px;
}

.cluster-details {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.cluster-id {
  color: var(--muted);
  font-family: monospace;
}

.cluster-version {
  padding: 2px 6px;
  background: var(--accent-btn);
  border-radius: 10px;
  color: var(--accent-btn-text);
}

.cluster-status {
  padding: 2px 6px;
  border-radius: 10px;
  font-weight: 500;
  text-transform: uppercase;
}

.status-active,
.status-ready {
  background: var(--success);
  color: var(--success-text);
}

.status-inactive,
.status-notready {
  background: var(--error);
  color: var(--error-text);
}

.status-unknown {
  background: var(--warning);
  color: var(--warning-text);
}

.selection-summary {
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--nav-bg);
}

.summary-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.summary-count {
  font-size: 13px;
  font-weight: 500;
  color: var(--body-text);
}

.selected-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.cluster-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: var(--primary);
  color: var(--primary-text);
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.chip-remove {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 50%;
  color: inherit;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.chip-remove:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.3);
}

.chip-remove:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.validation-message {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 13px;
}

.validation-message .icon-warning {
  color: var(--error);
}

.validation-message .icon-info {
  color: var(--warning);
}

.validation-message .icon-checkmark {
  color: var(--success);
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

.role-tertiary {
  background: transparent;
  border-color: var(--border);
  color: var(--body-text);
}

.role-tertiary:hover:not(:disabled) {
  background: var(--input-bg);
  border-color: var(--primary);
  color: var(--primary);
}

.icon-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>