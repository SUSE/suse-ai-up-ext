<template>
  <div class="service-selection-modal">
    <div class="modal-header">
      <h2>Configure SUSE AI Services</h2>
      <p>Select services to enable for the discovered proxy instance</p>
    </div>

    <div class="modal-content">
      <div v-if="selectedInstance" class="instance-info">
        <div class="info-banner">
          <strong>Connected to:</strong> {{ selectedInstance.name }} ({{ selectedInstance.clusterName }})
        </div>
      </div>

      <div class="services-section">
        <h3>Select Services to Enable</h3>
        <div class="services-grid">
          <div
            v-for="service in availableServices"
            :key="service.id"
            class="service-card"
            :class="{ selected: selectedServices.includes(service.id) }"
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
                <i v-if="selectedServices.includes(service.id)" class="icon icon-checkmark"></i>
              </div>
            </div>
            <div class="card-footer">
              <label class="checkbox-label">
                <input
                  type="checkbox"
                  :checked="selectedServices.includes(service.id)"
                  @change="toggleService(service.id)"
                />
                <span class="checkbox-text">Enable</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <div class="summary-section">
        <h4>Configuration Summary</h4>
        <div class="summary-details">
          <div class="detail-row">
            <strong>Services Selected:</strong> {{ selectedServices.length }}
          </div>
          <div v-if="selectedServices.length > 0" class="selected-list">
            <ul>
              <li v-for="serviceId in selectedServices" :key="serviceId">
                {{ getServiceName(serviceId) }}
              </li>
            </ul>
          </div>
          <div v-else class="no-selection">
            <p>No services selected. You can enable services later from the management interface.</p>
          </div>
        </div>
      </div>
    </div>

    <div class="modal-footer">
      <button class="btn btn-secondary" @click="handleCancel">
        Cancel
      </button>
      <button class="btn btn-primary" @click="handleFinish">
        Finish
      </button>
    </div>
  </div>
</template>

<style scoped>
.service-selection-modal {
  max-width: 800px;
  margin: 0 auto;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
}

.modal-header {
  padding: 24px 24px 16px 24px;
  border-bottom: 1px solid var(--border);
  background: var(--body-bg);
}

.modal-header h2 {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 600;
  color: var(--body-text);
}

.modal-header p {
  margin: 0;
  font-size: 16px;
  color: var(--muted);
}

.modal-content {
  padding: 24px;
}

.instance-info {
  margin-bottom: 24px;
}

.services-section h3 {
  margin: 0 0 16px 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--body-text);
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
  padding: 20px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: var(--card-bg);
}

.service-card:hover {
  border-color: var(--primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.service-card.selected {
  border-color: var(--primary);
  background: var(--primary-light, rgba(0, 123, 255, 0.1));
}

.card-header {
  display: flex;
  align-items: flex-start;
  gap: 15px;
  margin-bottom: 15px;
}

.service-icon {
  font-size: 24px;
  color: var(--primary);
  min-width: 24px;
}

.service-info h4 {
  margin: 0 0 5px 0;
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
  color: var(--primary);
  font-size: 20px;
}

.card-footer {
  border-top: 1px solid var(--border);
  padding-top: 15px;
  text-align: right;
}

.checkbox-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-weight: 500;
}

.checkbox-text {
  font-size: 14px;
  color: var(--body-text);
}

.summary-section {
  margin-top: 24px;
  padding: 20px;
  background: var(--accent-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
}

.summary-section h4 {
  margin: 0 0 16px 0;
  color: var(--primary);
  font-size: 16px;
  font-weight: 600;
}

.summary-details {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail-row {
  display: flex;
  gap: 10px;
  font-size: 14px;
}

.detail-row strong {
  min-width: 140px;
  color: var(--body-text);
  font-weight: 600;
}

.selected-list ul {
  margin: 8px 0 0 0;
  padding-left: 20px;
}

.selected-list li {
  margin-bottom: 4px;
  color: var(--body-text);
}

.no-selection {
  text-align: center;
  padding: 16px;
  color: var(--muted);
  font-style: italic;
}

.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid var(--border);
  background: var(--body-bg);
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.btn {
  padding: 8px 16px;
  border: 1px solid transparent;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  display: inline-block;
  text-align: center;
  transition: all 0.2s ease;
}

.btn-secondary {
  background: var(--secondary);
  color: var(--body-text);
  border-color: var(--secondary);
}

.btn-secondary:hover {
  background: var(--secondary-hover, darken(var(--secondary), 10%));
  border-color: var(--secondary-hover, darken(var(--secondary), 10%));
}

.btn-primary {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

.btn-primary:hover {
  background: var(--primary-hover, darken(var(--primary), 10%));
  border-color: var(--primary-hover, darken(var(--primary), 10%));
}

.info-banner {
  padding: 12px 16px;
  background: var(--info-bg, #e3f2fd);
  border: 1px solid var(--info-border, #2196f3);
  border-radius: 4px;
  color: var(--info-text, #0d47a1);
  font-size: 14px;
}

.info-banner strong {
  font-weight: 600;
}
</style>

<script lang="ts" setup>
import { ref } from 'vue';
import type { ServiceInstance } from '../../../types/service-discovery';

interface Service {
  id: string;
  name: string;
  description: string;
  iconClass: string;
}

interface Props {
  selectedInstance: ServiceInstance | null;
  onComplete?: (services: string[]) => void;
  onCancel?: () => void;
}

interface Emits {
  (e: 'complete', services: string[]): void;
  (e: 'cancel'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// Local state
const selectedServices = ref<string[]>([]);

// Available services
const availableServices: Service[] = [
  {
    id: 'mcp-gateway',
    name: 'MCP Gateway',
    description: 'Model Context Protocol gateway for AI interactions and server management.',
    iconClass: 'icon icon-server'
  },
  {
    id: 'mcp-registry',
    name: 'MCP Registry',
    description: 'Registry for managing MCP connections and installations.',
    iconClass: 'icon icon-list'
  },
  {
    id: 'virtual-mcp',
    name: 'Virtual MCP',
    description: 'Virtual Model Context Protocol servers for enhanced AI interactions.',
    iconClass: 'icon icon-server'
  },
  {
    id: 'smart-agents',
    name: 'SmartAgents',
    description: 'Intelligent agents for automated tasks and workflows.',
    iconClass: 'icon icon-user'
  }
];

// Methods
const toggleService = (serviceId: string): void => {
  const index = selectedServices.value.indexOf(serviceId);
  if (index > -1) {
    selectedServices.value.splice(index, 1);
  } else {
    selectedServices.value.push(serviceId);
  }
};

const getServiceName = (serviceId: string): string => {
  const service = availableServices.find(s => s.id === serviceId);
  return service ? service.name : serviceId;
};

const handleFinish = () => {
  emit('complete', selectedServices.value);
};

const handleCancel = () => {
  emit('cancel');
};
</script>