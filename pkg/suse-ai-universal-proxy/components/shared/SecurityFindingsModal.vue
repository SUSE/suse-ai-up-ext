<template>
  <div v-if="isVisible" class="modal-overlay" @click="closeModal">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
         <h3>Security Findings {{ serverName }}</h3>
        <button class="btn btn-sm btn-secondary" @click="closeModal">&times;</button>
      </div>
      <div class="modal-body">
        <div class="findings-summary">
          <div class="summary-stats">
            <div class="stat-item">
              <span class="stat-number critical">{{ realCriticalCount }}</span>
              <span class="stat-label">Critical</span>
            </div>
            <div class="stat-item">
              <span class="stat-number medium">{{ realWarningCount }}</span>
              <span class="stat-label">Warnings</span>
            </div>
            <div class="stat-item">
              <span class="stat-number low">{{ realInfoCount }}</span>
              <span class="stat-label">Info</span>
            </div>
          </div>
          <div class="export-actions">
            <button class="btn btn-sm btn-secondary" @click="exportFindings">
              <i class="icon icon-download"></i>
              Export
            </button>
          </div>
        </div>

        <div class="findings-filters">
          <label>
            <input type="checkbox" v-model="showCritical" />
            Critical Issues
          </label>
          <label>
            <input type="checkbox" v-model="showHigh" />
            High Issues
          </label>
          <label>
            <input type="checkbox" v-model="showMedium" />
            Warnings
          </label>
          <label>
            <input type="checkbox" v-model="showLow" />
            Info
          </label>
        </div>

        <div class="findings-list">
          <div
            v-for="finding in filteredFindings"
            :key="finding.ruleId || finding.rule_id || Math.random()"
            class="finding-item"
            :class="finding.severity"
          >
            <div class="finding-header">
              <div class="finding-type">
                <span class="severity-badge" :class="finding.severity">
                  {{ finding.severity.toUpperCase() }}
                </span>
                {{ (finding.vulnerability_type || finding.category || '').replace('_', ' ').toUpperCase() }}
              </div>
              <div class="finding-actions">
                <button class="btn btn-sm btn-link" @click="toggleFindingDetail(finding)">
                  {{ expandedFindings.has(finding) ? 'Hide' : 'Show' }} Details
                </button>
              </div>
            </div>

            <div class="finding-description">
              {{ finding.description }}
            </div>

            <div v-if="expandedFindings.has(finding)" class="finding-details">
              <div class="detail-section">
                <strong>Evidence:</strong>
                <pre>{{ finding.evidence || 'No evidence available' }}</pre>
              </div>
              <div class="detail-section">
                <strong>Recommendation:</strong>
                <p>{{ finding.recommendation }}</p>
              </div>
              <div v-if="finding.ruleId || finding.rule_id" class="detail-section">
                <strong>Rule ID:</strong>
                <code>{{ finding.ruleId || finding.rule_id }}</code>
              </div>
            </div>
          </div>

          <div v-if="filteredFindings.length === 0" class="no-findings">
            No findings match the selected filters.
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
import { ref, computed, watch } from 'vue';
import type { SecurityFinding } from '../../services/security-engine';

// Emits
const emit = defineEmits<{
  close: [];
}>();

// Props
interface Props {
  findings: SecurityFinding[];
  serverName: string;
  server?: any; // DiscoveredServer object for real metrics calculation
}

const props = defineProps<Props>();

// Real metrics based on Risk Status and Security Status badges
const realCriticalCount = computed(() => {
  console.log('Calculating realCriticalCount, server:', props.server);
  if (!props.server) {
    console.log('No server prop, returning 0');
    return 0;
  }
  let count = 0;
  if (props.server.vulnerability_score === 'high') count++; // Risk Status High
  if (props.server.metadata?.auth_type === 'none') count++; // Security Status Critical (missing auth)
  console.log('realCriticalCount result:', count);
  return count;
});

const realWarningCount = computed(() => {
  // Security Status Medium: has auth but has other issues
  // For now, we'll consider this as 0 since we don't have other issue detection
  // This could be expanded later to check for other security issues beyond auth and risk
  return 0;
});

const realInfoCount = computed(() => {
  console.log('Calculating realInfoCount, server:', props.server);
  if (!props.server) {
    console.log('No server prop, returning 0');
    return 0;
  }
  const hasAuth = props.server.metadata?.auth_type !== 'none';
  const isLowRisk = props.server.vulnerability_score !== 'high';
  const result = (hasAuth && isLowRisk) ? 1 : 0;
  console.log('realInfoCount result:', result, 'hasAuth:', hasAuth, 'isLowRisk:', isLowRisk);
  return result;
});

// Reactive state
const isVisible = ref(false);
const showCritical = ref(true);
const showHigh = ref(true);
const showMedium = ref(true);
const showLow = ref(true);
const expandedFindings = ref(new Set<SecurityFinding>());

// Computed properties (keeping old ones for backward compatibility)
const criticalCount = computed(() => props.findings.filter(f => f.severity === 'critical').length);
const highCount = computed(() => props.findings.filter(f => f.severity === 'high').length);
const mediumCount = computed(() => props.findings.filter(f => f.severity === 'medium').length);
const lowCount = computed(() => props.findings.filter(f => f.severity === 'low' || f.severity === 'info').length);

const filteredFindings = computed(() => {
  return props.findings.filter(finding => {
    switch (finding.severity) {
      case 'critical': return showCritical.value;
      case 'high': return showHigh.value;
      case 'medium': return showMedium.value;
      case 'low':
      case 'info': return showLow.value;
      default: return true;
    }
  });
});

// Methods
const openModal = () => {
  isVisible.value = true;
  expandedFindings.value.clear();
};

const closeModal = () => {
  isVisible.value = false;
  emit('close');
};

const toggleFindingDetail = (finding: SecurityFinding) => {
  if (expandedFindings.value.has(finding)) {
    expandedFindings.value.delete(finding);
  } else {
    expandedFindings.value.add(finding);
  }
};

  const exportFindings = () => {
    const data = {
      server: props.serverName,
      timestamp: new Date().toISOString(),
      summary: {
        total: props.findings.length,
        critical: realCriticalCount.value,
        warnings: realWarningCount.value,
        info: realInfoCount.value
      },
      findings: props.findings
    };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `security-findings-${props.serverName.replace(/[^a-zA-Z0-9]/g, '-')}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Watch for findings changes to reset expanded state
watch(() => props.findings, () => {
  expandedFindings.value.clear();
});

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
  max-width: 800px;
  width: 90%;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
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
  overflow-y: auto;
  flex: 1;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid var(--border, #e5e7eb);
  background: var(--accent-bg, #f9fafb);
}

.findings-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 16px;
  background: var(--accent-bg, #f9fafb);
  border-radius: 8px;
}

.summary-stats {
  display: flex;
  gap: 24px;
}

.stat-item {
  text-align: center;
}

.stat-number {
  display: block;
  font-size: 24px;
  font-weight: bold;
}

.stat-number.critical,
.stat-number.high {
  color: var(--error, #dc2626);
}

.stat-number.medium {
  color: var(--warning, #d97706);
}

.stat-number.low {
  color: var(--info, #2563eb);
}

.stat-label {
  font-size: 12px;
  color: var(--muted, #6b7280);
  text-transform: uppercase;
  font-weight: 500;
}

.findings-filters {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
  padding: 12px;
  background: white;
  border: 1px solid var(--border, #e5e7eb);
  border-radius: 4px;
}

.findings-filters label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
  cursor: pointer;
}

.findings-list {
  max-height: 400px;
  overflow-y: auto;
}

.finding-item {
  border: 1px solid var(--border, #e5e7eb);
  border-radius: 8px;
  margin-bottom: 12px;
  overflow: hidden;
}

.finding-item.critical,
.finding-item.high {
  border-color: var(--error, #dc2626);
  background: rgba(220, 38, 38, 0.05);
}

.finding-item.medium {
  border-color: var(--warning, #d97706);
  background: rgba(217, 119, 6, 0.05);
}

.finding-item.low {
  border-color: var(--info, #2563eb);
  background: rgba(37, 99, 235, 0.05);
}

.finding-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--card-bg, #ffffff);
}

.finding-type {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.severity-badge {
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: bold;
  text-transform: uppercase;
}

.severity-badge.critical,
.severity-badge.high {
  background: var(--error, #dc2626);
  color: white;
}

.severity-badge.medium {
  background: var(--warning, #d97706);
  color: white;
}

.severity-badge.low {
  background: var(--info, #2563eb);
  color: white;
}

.finding-description {
  padding: 8px 16px;
  color: var(--body-text, #111827);
}

.finding-details {
  padding: 16px;
  background: var(--accent-bg, #f9fafb);
  border-top: 1px solid var(--border, #e5e7eb);
}

.detail-section {
  margin-bottom: 12px;
}

.detail-section strong {
  display: block;
  margin-bottom: 4px;
  color: var(--body-text, #111827);
}

.detail-section pre {
  background: white;
  padding: 8px;
  border-radius: 4px;
  border: 1px solid var(--border, #e5e7eb);
  font-family: monospace;
  font-size: 12px;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
}

.detail-section p {
  margin: 0;
  color: var(--muted, #6b7280);
}

.detail-section code {
  background: var(--accent-bg, #f9fafb);
  padding: 2px 4px;
  border-radius: 3px;
  font-family: monospace;
  font-size: 12px;
}

.no-findings {
  text-align: center;
  padding: 40px;
  color: var(--muted, #6b7280);
  font-style: italic;
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
</style>