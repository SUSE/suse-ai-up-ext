<template>
  <div v-if="show" class="modal-overlay" @click="$emit('close')">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>Add Custom Registry</h3>
        <button @click="$emit('close')" class="btn btn-sm">×</button>
      </div>
      <div class="modal-body">
        <form @submit.prevent="handleSubmit" class="registry-form">
          <div class="form-group">
            <label for="registry-name">Registry Name *</label>
            <input
              id="registry-name"
              v-model="formData.name"
              type="text"
              placeholder="e.g., My Custom Registry"
              required
              class="form-control"
            >
          </div>

          <div class="form-group">
            <label for="registry-source">Source Name *</label>
            <input
              id="registry-source"
              v-model="formData.source"
              type="text"
              placeholder="e.g., my-custom"
              required
              class="form-control"
            >
            <small class="form-help">This will be used as API source parameter: /public/registry?source={source}</small>
          </div>

          <div class="form-group">
            <label for="registry-url">Registry URL</label>
            <input
              id="registry-url"
              v-model="formData.url"
              type="url"
              placeholder="https://example.com"
              class="form-control"
            >
            <small class="form-help">Optional display URL for registry</small>
          </div>

          <div class="form-group">
            <label class="checkbox-label">
              <input
                type="checkbox"
                v-model="formData.enabled"
              >
              <span class="checkbox-text">Enable registry</span>
            </label>
          </div>

          <div class="form-actions">
            <button type="button" class="btn btn-secondary" @click="$emit('close')">
              Cancel
            </button>
            <button type="submit" class="btn btn-primary">
              Add Registry
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, reactive, type PropType } from 'vue';

interface RegistryFormData {
  name: string;
  source: string;
  url: string;
  enabled: boolean;
}

export default defineComponent({
  name: 'AddRegistryModal',
  
  props: {
    show: {
      type: Boolean,
      required: true
    }
  },

  emits: ['close', 'submit'],

  setup(props, { emit }) {
    const formData = reactive<RegistryFormData>({
      name: '',
      source: '',
      url: '',
      enabled: true
    });

    const handleSubmit = () => {
      if (!formData.name.trim() || !formData.source.trim()) {
        return; // Basic validation
      }
      
      emit('submit', { ...formData });
      
      // Reset form
      formData.name = '';
      formData.source = '';
      formData.url = '';
      formData.enabled = true;
    };

    return {
      formData,
      handleSubmit
    };
  }
});
</script>

<style scoped>
/* Modal styles */
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

/* Custom Registry Modal Styles */
.registry-form {
  max-width: 500px;
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

.form-help {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--muted-text);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  margin: 0;
}

.checkbox-text {
  font-weight: normal;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid var(--border);
}

/* Responsive enhancements */
@media (max-width: 768px) {
  .modal-content {
    width: 95vw;
    margin: 16px;
    max-height: 90vh;
  }

  .modal-header,
  .modal-body {
    padding: 16px;
  }
}
</style>