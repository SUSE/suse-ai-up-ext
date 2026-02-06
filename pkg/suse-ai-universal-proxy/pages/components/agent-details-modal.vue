<template>
  <div v-if="isVisible" class="modal-overlay" @click="closeModal">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>Agent Details: {{ currentAgent?.name }}</h3>
        <button class="btn btn-sm btn-secondary" @click="closeModal">&times;</button>
      </div>
      <div class="modal-body">
        <div v-if="currentAgent" class="agent-details">
          <div class="detail-section">
            <h4>General Info</h4>
            <p><strong>Name:</strong> {{ currentAgent.name }}</p>
            <p><strong>Status:</strong> {{ currentAgent.status }}</p>
            <p><strong>State:</strong> {{ currentAgent.state }}</p>
          </div>
          <div class="detail-section">
            <h4>Metrics</h4>
            <p><strong>Total Tokens:</strong> {{ currentAgent.totalTokens?.toLocaleString() || 0 }}</p>
            <p><strong>Total Requests:</strong> {{ currentAgent.totalRequests?.toLocaleString() || 0 }}</p>
            <p><strong>Total Cost:</strong> ${{ currentAgent.totalCost?.toFixed(2) || '0.00' }}</p>
          </div>
          <div class="detail-section">
            <h4>Supervisor</h4>
            <p><strong>Provider:</strong> {{ currentAgent.supervisor?.provider || 'N/A' }}</p>
            <p><strong>Model:</strong> {{ currentAgent.supervisor?.model || 'N/A' }}</p>
            <p><strong>API:</strong> {{ currentAgent.supervisor?.api || 'N/A' }}</p>
          </div>
          <div class="detail-section">
            <h4>Worker</h4>
            <p><strong>Provider:</strong> {{ currentAgent.worker?.provider || 'N/A' }}</p>
            <p><strong>Model:</strong> {{ currentAgent.worker?.model || 'N/A' }}</p>
            <p><strong>API:</strong> {{ currentAgent.worker?.api || 'N/A' }}</p>
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
import { ref } from 'vue';

const isVisible = ref(false);
const currentAgent = ref<any>(null);

const openModal = (agent: any) => {
  currentAgent.value = agent;
  isVisible.value = true;
};

const closeModal = () => {
  isVisible.value = false;
  currentAgent.value = null;
};

defineExpose({
  openModal,
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
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  max-width: 600px;
  width: 90%;
  max-height: 80%;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e9ecef;
}

.modal-body {
  padding: 20px;
}

.detail-section {
  margin-bottom: 20px;
}

.detail-section h4 {
  margin-bottom: 10px;
  color: #3d98d3;
}

.detail-section p {
  margin: 5px 0;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px;
  border-top: 1px solid #e9ecef;
}

.btn {
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  display: inline-block;
  text-align: center;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #5a6268;
}

.btn-sm {
  padding: 4px 8px;
  font-size: 12px;
}
</style>