<template>
  <div class="select-services-step">
    <div class="services-info">
      <h3>Select Additional Services</h3>
      <p>Choose the additional services you want to enable with your SUSE AI Universal Proxy. You can select multiple services.</p>
    </div>

    <div class="services-grid">
      <div
        v-for="service in services"
        :key="service.id"
        class="service-card"
        :class="{ selected: form.selectedServices.includes(service.id) }"
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
        </div>
        <div class="card-footer">
          <div class="service-status">
            <span v-if="form.selectedServices.includes(service.id)" class="status selected">
              <i class="icon icon-check"></i>
              Selected
            </span>
            <span v-else class="status available">Available</span>
          </div>
        </div>
      </div>
    </div>

    <div class="selection-summary" v-if="form.selectedServices.length > 0">
      <h4>Selected Services:</h4>
      <ul>
        <li v-for="serviceId in form.selectedServices" :key="serviceId">
          {{ getServiceName(serviceId) }}
        </li>
      </ul>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';

interface Service {
  id: string;
  name: string;
  description: string;
  iconClass: string;
}

interface Props {
  form: {
    selectedServices: string[];
  };
}

interface Emits {
  (e: 'update:form', form: { selectedServices: string[] }): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const services: Service[] = [
  {
    id: 'smartagents',
    name: 'SmartAgents',
    description: 'Intelligent agents for automated tasks and workflows.',
    iconClass: 'icon icon-user'
  },
  {
    id: 'virtualmcp',
    name: 'VirtualMCP',
    description: 'Virtual Model Context Protocol servers for enhanced AI interactions.',
    iconClass: 'icon icon-server'
  },
  {
    id: 'mcpregistry',
    name: 'MCPRegistry',
    description: 'Registry for managing MCP connections and installations.',
    iconClass: 'icon icon-list'
  }
];

const selectedServices = computed({
  get: () => props.form.selectedServices,
  set: (value: string[]) => {
    emit('update:form', { ...props.form, selectedServices: value });
  }
});

const toggleService = (serviceId: string) => {
  const current = selectedServices.value;
  if (current.includes(serviceId)) {
    selectedServices.value = current.filter(id => id !== serviceId);
  } else {
    selectedServices.value = [...current, serviceId];
  }
};

const getServiceName = (serviceId: string) => {
  const service = services.find(s => s.id === serviceId);
  return service ? service.name : serviceId;
};
</script>

<style scoped>
.select-services-step {
  max-width: 800px;
}

.services-info {
  margin-bottom: 24px;
}

.services-info h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--body-text);
}

.services-info p {
  margin: 0;
  color: var(--muted);
  line-height: 1.5;
}

.services-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.service-card {
  border: 1px solid var(--border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  background: var(--body-bg);
}

.service-card:hover {
  border-color: var(--primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.service-card.selected {
  border-color: var(--primary);
  background: rgba(var(--primary-rgb), 0.05);
}

.card-header {
  padding: 20px;
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.service-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  background: var(--accent-btn);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.service-icon i {
  font-size: 24px;
  color: var(--primary);
}

.service-info h4 {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--body-text);
}

.service-info p {
  margin: 0;
  color: var(--muted);
  line-height: 1.4;
  font-size: 14px;
}

.card-footer {
  padding: 12px 20px;
  border-top: 1px solid var(--border);
  background: var(--card-footer-bg);
}

.service-status .status {
  font-size: 12px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 4px;
}

.status.selected {
  color: var(--primary);
}

.status.available {
  color: var(--muted);
}

.selection-summary {
  padding: 16px;
  background: var(--accent-bg);
  border: 1px solid var(--border);
  border-radius: 4px;
}

.selection-summary h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--body-text);
}

.selection-summary ul {
  margin: 0;
  padding-left: 20px;
  color: var(--muted);
}

.selection-summary li {
  margin-bottom: 4px;
}
</style>