<template>
  <div class="service-selector">
    <div class="services-grid">
      <div
        v-for="service in services"
        :key="service.id"
        class="service-card"
        :class="{ selected: isSelected(service.id) }"
        @click="toggleService(service.id)"
      >
        <div class="card-header">
          <div class="service-icon">
            <i :class="service.iconClass"></i>
          </div>
          <div class="service-info">
            <h4>{{ service.name }}</h4>
            <p>{{ service.description }}</p>
          </div>
          <div class="selection-indicator">
            <div v-if="isSelected(service.id)" class="checkmark">
              <i class="icon icon-checkmark"></i>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="selectedServices.length > 0" class="selection-summary">
      <h4>Selected Services ({{ selectedServices.length }})</h4>
      <ul>
        <li v-for="serviceId in selectedServices" :key="serviceId">
          {{ getServiceName(serviceId) }}
        </li>
      </ul>
    </div>

    <div v-if="selectedServices.length === 0" class="no-selection">
      <p>Please select at least one service to continue.</p>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue'

interface Service {
  id: string
  name: string
  description: string
  iconClass: string
}

export default defineComponent({
  name: 'ServiceSelector',
  props: {
    modelValue: {
      type: Array as PropType<string[]>,
      default: () => []
    },
    services: {
      type: Array as PropType<Service[]>,
      default: () => []
    }
  },
  emits: ['update:modelValue'],
  computed: {
    selectedServices: {
      get(): string[] {
        return this.modelValue
      },
      set(value: string[]) {
        this.$emit('update:modelValue', value)
      }
    }
  },
  methods: {
    isSelected(serviceId: string): boolean {
      return this.selectedServices.includes(serviceId)
    },

    toggleService(serviceId: string) {
      const index = this.selectedServices.indexOf(serviceId)
      if (index > -1) {
        // Remove from selection
        this.selectedServices = this.selectedServices.filter(id => id !== serviceId)
      } else {
        // Add to selection
        this.selectedServices = [...this.selectedServices, serviceId]
      }
    },

    getServiceName(serviceId: string): string {
      const service = this.services.find(s => s.id === serviceId)
      return service ? service.name : serviceId
    }
  }
})
</script>

<style scoped>
.service-selector {
  width: 100%;
}

.services-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.service-card {
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--card-bg);
  cursor: pointer;
  transition: all 0.2s ease;
  overflow: hidden;
}

.service-card:hover {
  border-color: var(--primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.service-card.selected {
  border-color: var(--primary);
  background: var(--primary-light, rgba(0, 123, 255, 0.05));
}

.card-header {
  display: flex;
  align-items: flex-start;
  padding: 16px;
  gap: 12px;
}

.service-icon {
  font-size: 24px;
  color: var(--primary);
  min-width: 24px;
  margin-top: 2px;
}

.service-info {
  flex: 1;
}

.service-info h4 {
  margin: 0 0 6px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--body-text);
}

.service-info p {
  margin: 0;
  font-size: 14px;
  color: var(--muted);
  line-height: 1.4;
}

.selection-indicator {
  margin-left: auto;
  margin-top: 2px;
}

.checkmark {
  width: 24px;
  height: 24px;
  background: var(--primary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 14px;
}

.selection-summary {
  background: var(--card-bg, var(--body-bg));
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 20px;
  margin-top: 20px;
}

.selection-summary h4 {
  font-size: 18px;
  font-weight: 600;
  color: var(--body-text);
  margin: 0 0 12px 0;
}

.selection-summary ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.selection-summary li {
  padding: 6px 0;
  border-bottom: 1px solid var(--border-light, rgba(0,0,0,0.1));
  color: var(--body-text);
  font-size: 14px;
}

.selection-summary li:last-child {
  border-bottom: none;
}

.no-selection {
  text-align: center;
  padding: 20px;
  color: var(--muted);
  font-style: italic;
}

/* Responsive */
@media (max-width: 768px) {
  .services-grid {
    grid-template-columns: 1fr;
  }

  .card-header {
    flex-direction: column;
    gap: 8px;
  }

  .selection-indicator {
    margin-left: 0;
    align-self: flex-end;
  }
}
</style>