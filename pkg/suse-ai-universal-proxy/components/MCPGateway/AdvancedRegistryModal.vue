<template>
  <div v-if="show" class="modal-overlay" @click="$emit('close')">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>Advanced Registry Options</h3>
        <button @click="$emit('close')" class="btn btn-sm">×</button>
      </div>
      <div class="modal-body">
        <div class="advanced-options">
          <p class="warning-text">
            <i class="icon icon-warning" aria-hidden="true"></i>
            These operations may affect your registry data. Use with caution.
          </p>
          <div class="option-buttons">
            <button
              class="btn btn-danger"
              @click="$emit('clearAll')"
              :title="'Clear all registry entries and reset data'"
            >
              <i class="icon icon-trash" aria-hidden="true"></i>
              Clean All Entries
            </button>
            <button
              class="btn btn-secondary"
              @click="$emit('checkAvailability')"
              :title="'Check which servers are currently available'"
            >
              <i class="icon icon-check" aria-hidden="true"></i>
              Check Availability
            </button>
            <button
              class="btn btn-secondary"
              @click="$emit('checkSecurity')"
              :title="'Run security checks on registry servers'"
            >
              <i class="icon icon-shield" aria-hidden="true"></i>
              Check Security
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'AdvancedRegistryModal',
  
  props: {
    show: {
      type: Boolean,
      required: true
    }
  },

  emits: [
    'close',
    'clearAll',
    'checkAvailability',
    'checkSecurity'
  ]
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

/* Advanced Modal Styles */
.advanced-options {
  padding: 16px 0;
}

.warning-text {
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 4px;
  padding: 12px 16px;
  margin-bottom: 20px;
  color: #856404;
  display: flex;
  align-items: center;
  gap: 8px;
}

.warning-text .icon {
  color: #856404;
  font-size: 16px;
}

.option-buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.option-buttons .btn {
  justify-content: flex-start;
  padding: 12px 16px;
}

.option-buttons .btn .icon {
  margin-right: 8px;
}

.option-buttons .btn-danger {
  background-color: #dc3545;
  border-color: #dc3545;
  color: white;
}

.option-buttons .btn-danger:hover {
  background-color: #c82333;
  border-color: #bd2130;
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