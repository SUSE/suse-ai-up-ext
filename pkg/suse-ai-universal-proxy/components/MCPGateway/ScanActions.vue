<template>
  <div>
    <div class="scan-actions">
       <button class="btn btn-sm btn-success" @click="handleScanStart" :disabled="scanning">
        <i class="icon icon-search"></i>
         {{ scanning ? 'Scanning...' : 'Start Discovery' }}
      </button>
       <button v-if="false" class="btn btn-secondary" @click="handleRuleManagement">
         <i class="icon icon-cog"></i>
         Manage Security Rules
       </button>
    </div>

    <!-- Security Scan Progress -->
    <div v-if="securityScanning || scanning" class="scan-progress">
      <div class="progress-info">
        <span class="progress-text">{{ scanStatus || 'Processing...' }}</span>
        <span class="progress-percent">{{ Math.round(scanProgress) }}%</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: scanProgress + '%' }"></div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'ScanActions',
  props: {
    scanning: {
      type: Boolean,
      default: false
    },
    securityScanning: {
      type: Boolean,
      default: false
    },
    scanProgress: {
      type: Number,
      default: 0
    },
    scanStatus: {
      type: String,
      default: ''
    }
  },
  emits: ['scan-start', 'rule-management-open'],
  setup(props, { emit }) {
    const handleScanStart = () => {
      emit('scan-start');
    };

    const handleRuleManagement = () => {
      emit('rule-management-open');
    };

    return {
      handleScanStart,
      handleRuleManagement
    };
  }
});
</script>

<style scoped>
.scan-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin: 20px 0;
}

.scan-progress {
  margin: 20px auto;
  max-width: 400px;
  padding: 16px;
  background: var(--card-bg, #ffffff);
  border: 1px solid var(--border, #e5e7eb);
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.progress-text {
  font-size: 14px;
  color: var(--body-text, #111827);
  font-weight: 500;
}

.progress-percent {
  font-size: 14px;
  color: var(--primary, #2563eb);
  font-weight: 600;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: var(--accent-bg, #f9fafb);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--primary, #2563eb);
  border-radius: 4px;
  transition: width 0.3s ease;
}
</style>