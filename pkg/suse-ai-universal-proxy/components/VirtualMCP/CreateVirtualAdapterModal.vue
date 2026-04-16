<template>
  <div v-if="show" class="modal-overlay" @click="$emit('close')">
    <div class="modal-content aggregator-modal" @click.stop>
      <div class="modal-header">
        <h3>Create Virtual MCP Aggregator</h3>
        <button class="close-btn" @click="$emit('close')">&times;</button>
      </div>

      <div class="modal-body">
        <div class="form-group">
          <label for="aggregator-name">Aggregator Name *</label>
          <input
            id="aggregator-name"
            v-model="name"
            type="text"
            class="form-control"
            placeholder="e.g., unified-mcp"
            required
          />
          <small class="form-help">This name will be used in the URL: /api/v1/mcp/{{ name || '{name}' }}</small>
        </div>

        <div class="form-group">
          <label>Select Adapters to Aggregate *</label>
          <div v-if="availableAdapters.length === 0" class="no-adapters">
            No ready adapters available to aggregate. Please create standard adapters first.
          </div>
          <div v-else class="adapter-selection-grid">
            <div
              v-for="adapter in availableAdapters"
              :key="adapter.id"
              :class="['adapter-option', { selected: selectedAdapters.includes(adapter.id) }]"
              @click="toggleAdapter(adapter.id)"
            >
              <div class="checkbox-container">
                <input type="checkbox" :checked="selectedAdapters.includes(adapter.id)" readonly />
              </div>
              <div class="adapter-info">
                <strong>{{ adapter.name }}</strong>
                <span class="adapter-type">{{ adapter.mcpServerId || 'Remote' }}</span>
                <span v-if="adapter.capabilities" class="tool-count">
                  {{ adapter.capabilities.tools?.length || 0 }} tools
                </span>
              </div>
            </div>
          </div>
        </div>

        <div v-if="creationError" class="error-banner mt-10">
          {{ creationError }}
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" @click="$emit('close')" :disabled="isCreating">Cancel</button>
        <button
          class="btn btn-primary"
          @click="handleCreate"
          :disabled="!isValid || isCreating"
        >
          <i v-if="isCreating" class="icon icon-spinner icon-spin mr-5"></i>
          Generate Aggregator
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { Adapter } from '../../services/adapter-api';

const props = defineProps<{
  show: boolean;
  availableAdapters: Adapter[];
  isCreating: boolean;
  creationError: string | null;
}>();

const emit = defineEmits<{
  close: [];
  create: [data: { name: string, sourceAdapters: string[] }];
}>();

const name = ref('');
const selectedAdapters = ref<string[]>([]);

const isValid = computed(() => {
  return name.value.trim().length > 0 && selectedAdapters.value.length > 0;
});

const toggleAdapter = (id: string) => {
  const index = selectedAdapters.value.indexOf(id);
  if (index > -1) {
    selectedAdapters.value.splice(index, 1);
  } else {
    selectedAdapters.value.push(id);
  }
};

const handleCreate = () => {
  if (isValid.value) {
    emit('create', {
      name: name.value.trim(),
      sourceAdapters: selectedAdapters.value
    });
  }
};
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

.aggregator-modal {
  background: var(--body-bg, white);
  border-radius: 8px;
  width: 90%;
  max-width: 600px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
}

.modal-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  color: var(--primary);
  font-size: 18px;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--muted);
}

.modal-body {
  padding: 20px;
  max-height: 60vh;
  overflow-y: auto;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: var(--body-text);
}

.form-control {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--body-bg);
  color: var(--body-text);
}

.form-help {
  display: block;
  margin-top: 4px;
  color: var(--muted);
  font-size: 12px;
}

.adapter-selection-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
  max-height: 250px;
  overflow-y: auto;
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 8px;
}

.adapter-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  border: 1px solid var(--border);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.adapter-option:hover {
  border-color: var(--primary);
  background: var(--primary-light, rgba(0, 123, 255, 0.05));
}

.adapter-option.selected {
  border-color: var(--primary);
  background: var(--primary-light, rgba(0, 123, 255, 0.1));
}

.adapter-info {
  display: flex;
  flex-direction: column;
}

.adapter-type {
  font-size: 12px;
  color: var(--muted);
}

.tool-count {
  font-size: 11px;
  color: var(--primary);
  font-weight: 600;
}

.no-adapters {
  padding: 20px;
  text-align: center;
  background: var(--accent-bg);
  color: var(--muted);
  border-radius: 4px;
}

.error-banner {
  padding: 10px;
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
  font-size: 14px;
}

.modal-footer {
  padding: 16px 20px;
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.btn {
  padding: 8px 16px;
  border-radius: 4px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
}

.btn-primary {
  background: var(--primary);
  color: white;
}

.btn-secondary {
  background: var(--secondary-bg, #6c757d);
  color: white;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.icon-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
