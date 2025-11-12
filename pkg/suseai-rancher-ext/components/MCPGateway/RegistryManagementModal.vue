<template>
  <div v-if="show" class="modal-overlay" @click="$emit('close')">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>Manage Public Registries</h3>
        <button @click="$emit('close')" class="btn btn-sm">×</button>
      </div>
      <div class="modal-body">
         <div class="registry-management">
           <div class="registry-actions">
             <button
               class="btn btn-primary"
               @click="$emit('syncAll')"
               :disabled="syncingRegistry !== null"
             >
               <i v-if="syncingRegistry !== null" class="icon icon-spinner icon-spin" aria-hidden="true"></i>
               {{ syncingRegistry !== null ? 'Syncing...' : 'Sync All Enabled' }}
             </button>

             <button
               class="btn btn-secondary"
               @click="$emit('showAddRegistry')"
               :title="'Add Custom Registry'"
               :aria-label="'Add Custom Registry'"
             >
               <i class="icon icon-plus" aria-hidden="true"></i>
               Add Registry
             </button>
             <button
               class="btn btn-secondary"
               @click="$emit('showAdvanced')"
               :title="'Advanced Registry Options'"
               :aria-label="'Advanced Registry Options'"
             >
               Advanced
             </button>
           </div>

          <div class="registries-list">
            <div
              v-for="registry in registries"
              :key="registry.id"
              class="registry-item"
            >
              <div class="registry-info">
                <div class="registry-header">
                  <h4>{{ registry.name }}</h4>
                  <label class="checkbox-label">
                    <input
                      type="checkbox"
                      :checked="registry.enabled"
                      @change="$emit('toggleRegistry', registry.id)"
                    />
                    <span class="checkbox-text">Enabled</span>
                  </label>
                </div>
                 <p class="registry-url">{{ registry.url }}</p>
                <div class="registry-stats">
                  <span v-if="registry.lastSync" class="registry-sync">
                    Last sync: {{ new Date(registry.lastSync).toLocaleString() }}
                  </span>
                  <span class="registry-count">
                    {{ registry.serverCount }} servers
                  </span>
                </div>
              </div>
             <div class="registry-actions">
                <button
                  class="btn btn-sm btn-secondary"
                  @click="$emit('syncRegistry', registry.id)"
                  :disabled="!registry.enabled || syncingRegistry === registry.id"
                >
                  <i v-if="syncingRegistry === registry.id" class="icon icon-spinner icon-spin" aria-hidden="true"></i>
                  {{ syncingRegistry === registry.id ? 'Syncing...' : 'Sync' }}
                </button>
                <button
                  v-if="isCustomRegistry(registry.id)"
                  class="btn btn-sm btn-danger"
                  @click="$emit('removeRegistry', registry.id)"
                  :title="'Remove this custom registry'"
                  :aria-label="'Remove custom registry'"
                >
                  <i class="icon icon-trash" aria-hidden="true"></i>
                  Remove
                </button>
              </div>
            </div>
          </div>
        </div>
       </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType, computed } from 'vue';
import { useStore } from 'vuex';

interface Registry {
  id: string;
  name: string;
  url: string;
  source: string;
  enabled: boolean;
  lastSync: string | null;
  serverCount: number;
}

export default defineComponent({
  name: 'RegistryManagementModal',


  
  props: {
    show: {
      type: Boolean,
      required: true
    },
    registries: {
      type: Array as PropType<Registry[]>,
      required: true
    },
    syncingRegistry: {
      type: String as PropType<string | null>,
      default: null
    },
    isCustomRegistry: {
      type: Function as PropType<(id: string) => boolean>,
      required: true
    }
  },

  emits: [
    'close',
    'syncAll',
    'showAddRegistry',
    'showAdvanced',
    'toggleRegistry',
    'syncRegistry',
    'removeRegistry'
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
  max-width: 800px;
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

/* Registry Management Styles */
.registry-management {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.registry-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border);
}

.registries-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.registry-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: var(--border-radius);
  background: var(--body-bg);
}

.registry-info {
  flex: 1;
}

.registry-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.registry-header h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--body-text);
}

.registry-url {
  margin: 4px 0;
  font-size: 14px;
  color: var(--muted);
  font-family: monospace;
}

.registry-stats {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: var(--muted);
  margin-top: 8px;
}

.registry-sync {
  color: var(--success);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
}

.checkbox-label input[type="checkbox"] {
  margin: 0;
  width: 16px;
  height: 16px;
}

.checkbox-text {
  user-select: none;
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

  .registry-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .registry-actions {
    align-self: stretch;
    display: flex;
    justify-content: center;
  }
}
</style>