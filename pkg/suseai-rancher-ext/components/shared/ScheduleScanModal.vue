<template>
  <div v-if="isVisible" class="modal-overlay" @click="closeModal">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>MCP Discovery Scan</h3>
        <button class="btn btn-sm btn-secondary" @click="closeModal">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>Discovery Scan Configuration:</label>
          <p class="form-description">Configure the parameters for discovering MCP servers on your network.</p>
        </div>

        <div class="form-group">
          <label>Scan Configuration:</label>
          <div class="scan-config">
            <div class="config-item">
              <label for="maxConcurrent">Max Concurrent:</label>
              <input
                type="number"
                id="maxConcurrent"
                v-model.number="scanConfig.maxConcurrent"
                class="form-control"
                min="1"
                max="50"
              />
            </div>
            <div class="config-item">
              <label for="timeout">Timeout:</label>
              <input
                type="text"
                id="timeout"
                v-model="scanConfig.timeout"
                class="form-control"
                placeholder="30s"
              />
            </div>
          </div>
        </div>

        <div class="form-group">
          <label>Scan Ranges:</label>
          <div class="scan-ranges">
            <div v-for="(range, index) in scanConfig.scanRanges || []" :key="index" class="range-item">
              <input
                type="text"
                v-model="scanConfig.scanRanges![index]"
                class="form-control"
                placeholder="192.168.1.0/24"
              />
              <button
                type="button"
                class="btn btn-sm btn-secondary"
                @click="removeRange(index)"
                :disabled="(scanConfig.scanRanges || []).length <= 1"
              >
                &times;
              </button>
            </div>
            <button type="button" class="btn btn-sm btn-secondary" @click="addRange">
              Add Range
            </button>
          </div>
        </div>

         <div class="form-group">
           <label>Ports to Scan:</label>
           <div class="form-help">
             Enter single ports (e.g., "8000") or port ranges (e.g., "8000-8010")
           </div>
           <div class="scan-ports">
             <div v-for="(port, index) in scanConfig.ports || []" :key="index" class="port-item">
               <input
                 type="text"
                 v-model="scanConfig.ports![index]"
                 class="form-control"
                 :class="{ 'is-invalid': !isValidPort(port) }"
                 placeholder="8000 or 8000-8010"
               />
               <button
                 type="button"
                 class="btn btn-sm btn-secondary"
                 @click="removePort(index)"
                 :disabled="(scanConfig.ports || []).length <= 1"
               >
                 &times;
               </button>
             </div>
             <button type="button" class="btn btn-sm btn-secondary" @click="addPort">
               Add Port/Range
             </button>
           </div>
           <div v-if="hasInvalidPorts" class="error-message">
             Invalid port format. Use single ports (1-65535) or ranges (e.g., "8000-8010").
           </div>
         </div>

         <!-- Advanced Options -->
         <div class="form-group">
           <label class="checkbox-label">
             <input
               type="checkbox"
               v-model="scanConfig.excludeProxy"
               class="form-checkbox"
             />
             <span class="checkbox-text">Exclude Proxy Address</span>
           </label>
           <div class="form-help">
             Skip scanning the proxy's own address to avoid self-discovery.
           </div>
         </div>

         <div class="form-group">
           <label>Exclude Addresses (Optional):</label>
           <div class="form-help">
             Additional addresses to skip during scanning (one per line)
           </div>
           <textarea
             v-model="excludeAddressesText"
             class="form-control"
             rows="3"
             placeholder="192.168.1.100&#10;10.0.0.50"
           ></textarea>
         </div>

        <div v-if="error" class="error-message">
          {{ error }}
        </div>
      </div>
        <!-- Progress section when scanning -->
        <div v-if="scanInProgress" class="scan-progress">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: (props.scanProgress || 0) + '%' }"></div>
          </div>
          <p class="progress-text">{{ Math.round(props.scanProgress || 0) }}% complete - Scanning network...</p>
        </div>

        <div class="modal-footer">
          <button v-if="!scanInProgress" class="btn btn-secondary" @click="closeModal">Cancel</button>
          <button v-if="scanInProgress" class="btn btn-secondary" disabled>
            <i class="icon icon-spinner icon-spin"></i>
            Scanning...
          </button>
          <button
            v-if="(props.scanProgress || 0) >= 100"
            class="btn btn-primary"
            @click="closeModal"
          >
            Close
          </button>
          <button
            v-else-if="!scanInProgress"
            class="btn btn-primary"
            @click="scheduleScan()"
            :disabled="!isValid"
          >
            Start Scan
          </button>
        </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { discoveryAPI, type ScanConfig } from '../../services/discovery-api';
import type { DiscoveryScanConfig } from '../../types/mcp-types';
import { logger } from '../../utils/logger';
import yaml from 'js-yaml';

// Emits
const emit = defineEmits<{
  scanStarted: [result: any];
  close: [];
}>();

// Props
const props = defineProps<{
  startScan?: (config: ScanConfig) => Promise<any>;
  scanning?: boolean;
  scanProgress?: number;
}>();

// No need to watch for completion - scanInProgress stays true until modal closes


const isVisible = ref(false);
const error = ref<string>('');
const scanInProgress = ref(false);

// Exclude addresses handling
const excludeAddressesText = ref<string>('');



// Scan configuration
const scanConfig = ref<ScanConfig>({
  maxConcurrent: 10,
  ports: ['8000', '8002', '3000', '5000'],
  scanRanges: ['192.168.1.0/24'],
  timeout: '30s',
  excludeProxy: true
} as ScanConfig);

// Computed properties
const isValid = computed(() => {
  // Validate scan configuration
  return (scanConfig.value.scanRanges?.length || 0) > 0 &&
         (scanConfig.value.ports?.length || 0) > 0 &&
         Number(scanConfig.value.maxConcurrent) > 0 &&
         !hasInvalidPorts.value;
});

const hasInvalidPorts = computed(() => {
  return (scanConfig.value.ports || []).some(port => !isValidPort(port));
});



// Port validation function
const isValidPort = (port: string | number): boolean => {
  if (typeof port === 'number') {
    return port >= 1 && port <= 65535;
  }
  
  if (typeof port === 'string') {
    const trimmedPort = port.trim();
    
    // Single port
    if (/^\d{1,5}$/.test(trimmedPort)) {
      const num = parseInt(trimmedPort, 10);
      return num >= 1 && num <= 65535;
    }
    
    // Port range
    const rangeMatch = /^(\d{1,5})-(\d{1,5})$/.exec(trimmedPort);
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1], 10);
      const end = parseInt(rangeMatch[2], 10);
      return start >= 1 && start <= 65535 && end >= 1 && end <= 65535 && start <= end;
    }
  }
  
  return false;
};

// Function to expand port ranges into individual ports
const expandPorts = (ports: string[]): number[] => {
  const expandedPorts: number[] = [];

  for (const port of ports) {
    const trimmedPort = port.trim();

    // Single port
    if (/^\d{1,5}$/.test(trimmedPort)) {
      expandedPorts.push(parseInt(trimmedPort, 10));
    }
    // Port range
    else if (/^(\d{1,5})-(\d{1,5})$/.test(trimmedPort)) {
      const rangeMatch = /^(\d{1,5})-(\d{1,5})$/.exec(trimmedPort);
      if (rangeMatch) {
        const start = parseInt(rangeMatch[1], 10);
        const end = parseInt(rangeMatch[2], 10);
        for (let p = start; p <= end; p++) {
          expandedPorts.push(p);
        }
      }
    }
  }

  return expandedPorts;
};

// Methods
const openModal = () => {
  isVisible.value = true;
  reset();
};

const closeModal = () => {
  isVisible.value = false;
  reset();
  emit('close');
};

const reset = () => {
  error.value = '';
  scanInProgress.value = false;
  scanConfig.value = {
    maxConcurrent: 10,
    ports: ['8000', '3000-3010'],
    scanRanges: ['192.168.1.0/24'],
    timeout: '30s',
    excludeProxy: true
  };
  excludeAddressesText.value = '';
};

const addRange = () => {
  if (!scanConfig.value.scanRanges) {
    scanConfig.value.scanRanges = [];
  }
  scanConfig.value.scanRanges.push('');
};

const removeRange = (index: number) => {
  if (scanConfig.value.scanRanges && scanConfig.value.scanRanges.length > 1) {
    scanConfig.value.scanRanges.splice(index, 1);
  }
};

const addPort = () => {
  if (!scanConfig.value.ports) {
    scanConfig.value.ports = [];
  }
  scanConfig.value.ports.push('8080');
};

const removePort = (index: number) => {
  if (scanConfig.value.ports && scanConfig.value.ports.length > 1) {
    scanConfig.value.ports.splice(index, 1);
  }
};



     const scheduleScan = async () => {
       scanInProgress.value = true;
       try {
         error.value = '';

         // Prepare scan config for backend API using DiscoveryScanConfig format
         const excludeHosts = [];
         if (excludeAddressesText.value) {
           excludeHosts.push(...excludeAddressesText.value.split('\n').map(addr => addr.trim()).filter(addr => addr));
         }
         if (scanConfig.value.excludeProxy) {
           // Add localhost/127.0.0.1 to exclude hosts when excludeProxy is enabled
           excludeHosts.push('localhost', '127.0.0.1', '::1');
         }

         const backendConfig = {
           scanRanges: scanConfig.value.scanRanges || [],
           ports: expandPorts(scanConfig.value.ports || []).map(p => p.toString()),
           timeout: (parseInt(scanConfig.value.timeout?.replace('s', '') || '30', 10)).toString(),
           maxConcurrent: scanConfig.value.maxConcurrent || 10,
           excludeProxy: scanConfig.value.excludeProxy,
           excludeAddresses: excludeHosts.length > 0 ? excludeHosts : undefined
         };

         // Use composable method if provided, otherwise fallback to direct API call
         const scanResult = props.startScan
           ? await props.startScan(backendConfig)
           : await discoveryAPI.startScan(backendConfig);

         logger.info('Discovery scan started', { scanId: scanResult.scan_id, config: backendConfig });
         emit('scanStarted', scanResult);

         // Modal stays open during scan - progress will be shown via props
       } catch (err) {
         logger.error('Failed to start scan', err);
         error.value = 'Failed to start scan. Please try again.';
         scanInProgress.value = false; // Reset on error
       }
     };

// Expose methods to parent component
defineExpose({
  openModal
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
  background: var(--body-bg, #ffffff);
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  max-width: 600px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border, #e5e7eb);
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--body-text, #111827);
}

.modal-body {
  padding: 20px 24px;
  max-height: 60vh;
  overflow-y: auto;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid var(--border, #e5e7eb);
  background: var(--accent-bg, #f9fafb);
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 4px;
  font-weight: 500;
  color: var(--body-text, #111827);
}

.form-control {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border, #d1d5db);
  border-radius: 4px;
  font-size: 14px;
}

.form-control:focus {
  outline: none;
  border-color: var(--primary, #2563eb);
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
}

.form-help {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--muted, #6b7280);
}

.scan-config {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.config-item {
  display: flex;
  flex-direction: column;
}

.scan-ranges,
.scan-ports {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.range-item,
.port-item {
  display: flex;
  gap: 8px;
  align-items: center;
}

.range-item .form-control,
.port-item .form-control {
  flex: 1;
}

.error-message {
  color: var(--error, #dc2626);
  font-size: 14px;
  margin-top: 8px;
  padding: 8px 12px;
  background: rgba(220, 38, 38, 0.1);
  border-radius: 4px;
  border: 1px solid rgba(220, 38, 38, 0.2);
}

.btn {
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--primary, #2563eb);
  border: 1px solid var(--primary, #2563eb);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-hover, #1d4ed8);
  border-color: var(--primary-hover, #1d4ed8);
}

.btn-secondary {
  background: var(--body-bg, #ffffff);
  border: 1px solid var(--border, #d1d5db);
  color: var(--body-text, #111827);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--accent-bg, #f9fafb);
  border-color: var(--border-hover, #9ca3af);
}

.btn-sm {
  padding: 4px 8px;
  font-size: 12px;
}

.btn-link {
  background: none;
  border: none;
  color: var(--primary, #2563eb);
  text-decoration: underline;
  cursor: pointer;
}

.btn-link:hover {
  color: var(--primary-hover, #1d4ed8);
}

/* Progress Section */
.scan-progress {
  padding: 20px;
  border-top: 1px solid var(--border, #e5e7eb);
  background: var(--accent-bg, #f9fafb);
  text-align: center;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: var(--border, #e5e7eb);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 10px;
}

.progress-fill {
  height: 100%;
  background: var(--primary, #007bff);
  transition: width 0.3s ease;
}

.progress-text {
  margin: 0;
  color: var(--body-text, #111827);
  font-size: 14px;
}

/* Spinner Animation */
.spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: #fff;
  animation: spin 1s ease-in-out infinite;
  margin-right: 8px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Port Input Styles */
.is-invalid {
  border-color: var(--error, #dc2626);
  box-shadow: 0 0 0 2px rgba(220, 38, 38, 0.1);
}

.is-invalid:focus {
  border-color: var(--error, #dc2626);
  box-shadow: 0 0 0 2px rgba(220, 38, 38, 0.2);
}

/* Security Testing Styles */
.security-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-weight: 500;
}

.form-checkbox {
  width: 16px;
  height: 16px;
  accent-color: var(--primary, #2563eb);
  cursor: pointer;
}

.checkbox-text {
  user-select: none;
}

.security-options {
  margin-top: 16px;
  padding: 16px;
  background: var(--accent-bg, #f9fafb);
  border-radius: 4px;
  border: 1px solid var(--border, #e5e7eb);
}

.file-info {
  margin-top: 8px;
  font-size: 14px;
  color: var(--body-text, #111827);
  display: flex;
  align-items: center;
  gap: 8px;
}

.rules-preview {
  margin-top: 12px;
  padding: 12px;
  background: white;
  border-radius: 4px;
  border: 1px solid var(--border, #e5e7eb);
}

.rules-summary {
  display: flex;
  gap: 16px;
  margin-top: 8px;
  font-size: 14px;
  color: var(--muted, #6b7280);
}

.security-warnings {
  margin-top: 16px;
}

.warning-message {
  padding: 8px 12px;
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 4px;
  color: #856404;
  font-size: 14px;
}
</style>