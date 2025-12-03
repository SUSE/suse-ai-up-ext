<template>
  <div class="real-time-metrics">
    <div class="header">
      <h2>Real-Time Metrics</h2>
      <div class="header-controls">
        <div class="toggle-container">
          <label class="toggle">
            <input 
              v-model="realTimeEnabled" 
              type="checkbox"
              @change="toggleRealTimeUpdates"
            />
            <span class="toggle-slider"></span>
            Real-time Updates
          </label>
        </div>
        <div class="refresh-controls">
          <button 
            class="btn btn-sm role-primary" 
            @click="refreshMetrics"
            :disabled="loadingSystemMetrics || loadingAdapterMetrics"
          >
            <i class="icon icon-refresh" :class="{ 'icon-spin': loadingSystemMetrics || loadingAdapterMetrics }"></i>
            Refresh
          </button>
          <div class="auto-refresh">
            <label class="checkbox">
              <input 
                v-model="autoRefresh" 
                type="checkbox"
                @change="toggleAutoRefresh"
              />
              Auto Refresh
            </label>
            <select 
              v-model="refreshInterval" 
              class="input-sm"
              @change="updateRefreshInterval"
              :disabled="!autoRefresh"
            >
              <option :value="5000">5s</option>
              <option :value="10000">10s</option>
              <option :value="30000">30s</option>
              <option :value="60000">1m</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- System Overview -->
    <div class="metrics-section">
      <h3>System Overview</h3>
      <div v-if="loadingSystemMetrics" class="loading">
        <i class="icon icon-spin icon-spinner"></i>
        Loading system metrics...
      </div>
      <div v-else-if="!systemMetrics" class="empty-state">
        No system metrics available
      </div>
      <div v-else class="system-metrics-grid">
        <div class="metric-card system">
          <div class="metric-header">
            <i class="icon icon-globe"></i>
            <span class="metric-title">System Status</span>
          </div>
          <div class="metric-value">
            <span class="status-indicator" :class="getSystemStatusClass()"></span>
            {{ getSystemStatusText() }}
          </div>
        </div>
        
        <div class="metric-card">
          <div class="metric-header">
            <i class="icon icon-layers"></i>
            <span class="metric-title">Total Adapters</span>
          </div>
          <div class="metric-value">{{ systemMetrics.adapters.total }}</div>
          <div class="metric-breakdown">
            <span class="breakdown-item running">
              {{ systemMetrics.adapters.running }} running
            </span>
            <span class="breakdown-item stopped">
              {{ systemMetrics.adapters.stopped }} stopped
            </span>
            <span class="breakdown-item error">
              {{ systemMetrics.adapters.error }} error
            </span>
          </div>
        </div>
        
        <div class="metric-card">
          <div class="metric-header">
            <i class="icon icon-connection"></i>
            <span class="metric-title">Active Sessions</span>
          </div>
          <div class="metric-value">{{ systemMetrics.sessions.active }}</div>
          <div class="metric-breakdown">
            <span class="breakdown-item">
              {{ systemMetrics.sessions.total }} total
            </span>
          </div>
        </div>
        
        <div class="metric-card">
          <div class="metric-header">
            <i class="icon icon-cpu"></i>
            <span class="metric-title">System CPU</span>
          </div>
          <div class="metric-value">{{ systemMetrics.system.cpuUsage.toFixed(1) }}%</div>
          <div class="metric-progress">
            <div 
              class="progress-bar" 
              :class="getCpuClass(systemMetrics.system.cpuUsage)"
              :style="{ width: `${Math.min(systemMetrics.system.cpuUsage, 100)}%` }"
            ></div>
          </div>
        </div>
        
        <div class="metric-card">
          <div class="metric-header">
            <i class="icon icon-memory"></i>
            <span class="metric-title">System Memory</span>
          </div>
          <div class="metric-value">{{ formatBytes(systemMetrics.system.memoryUsage) }}</div>
          <div class="metric-progress">
            <div 
              class="progress-bar" 
              :class="getMemoryClass(systemMetrics.system.memoryUsage)"
              :style="{ width: `${Math.min((systemMetrics.system.memoryUsage / (1024 * 1024 * 1024 * 8)) * 100, 100)}%` }"
            ></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Adapter Metrics -->
    <div class="metrics-section">
      <h3>Adapter Performance</h3>
      <div v-if="loadingAdapterMetrics" class="loading">
        <i class="icon icon-spin icon-spinner"></i>
        Loading adapter metrics...
      </div>
      <div v-else-if="Object.keys(adapterMetrics).length === 0" class="empty-state">
        No adapter metrics available
      </div>
      <div v-else class="adapters-grid">
        <div 
          v-for="(metrics, adapterName) in adapterMetrics" 
          :key="adapterName"
          class="adapter-metrics-card"
        >
          <div class="adapter-header">
            <h4>{{ adapterName }}</h4>
            <span 
              class="adapter-status" 
              :class="getAdapterStatusClass(adapterName)"
            >
              {{ getAdapterStatus(adapterName) }}
            </span>
          </div>
          
          <div class="adapter-metrics-grid">
            <div class="mini-metric">
              <span class="mini-label">Uptime</span>
              <span class="mini-value">{{ formatDuration(metrics.uptime) }}</span>
            </div>
            <div class="mini-metric">
              <span class="mini-label">Sessions</span>
              <span class="mini-value">{{ metrics.sessions.active }}/{{ metrics.sessions.total }}</span>
            </div>
            <div class="mini-metric">
              <span class="mini-label">Req/s</span>
              <span class="mini-value">{{ metrics.performance.requestsPerSecond.toFixed(1) }}</span>
            </div>
            <div class="mini-metric">
              <span class="mini-label">Avg Time</span>
              <span class="mini-value">{{ metrics.performance.averageResponseTime }}ms</span>
            </div>
            <div class="mini-metric">
              <span class="mini-label">Error Rate</span>
              <span class="mini-value">{{ (metrics.performance.errorRate * 100).toFixed(1) }}%</span>
            </div>
            <div class="mini-metric">
              <span class="mini-label">CPU</span>
              <span class="mini-value">{{ metrics.resources.cpuUsage.toFixed(1) }}%</span>
            </div>
            <div class="mini-metric">
              <span class="mini-label">Memory</span>
              <span class="mini-value">{{ formatBytes(metrics.resources.memoryUsage) }}</span>
            </div>
          </div>
          
          <div class="adapter-charts">
            <div class="chart-container">
              <h5>Response Time Trend</h5>
              <div class="mini-chart">
                <div 
                  v-for="(value, index) in getResponseTimeTrend(metrics)" 
                  :key="index"
                  class="chart-bar"
                  :style="{ height: `${value}%` }"
                ></div>
              </div>
            </div>
            <div class="chart-container">
              <h5>Request Rate</h5>
              <div class="mini-chart">
                <div 
                  v-for="(value, index) in getRequestRateTrend(metrics)" 
                  :key="index"
                  class="chart-bar"
                  :style="{ height: `${value}%` }"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Performance Alerts -->
    <div class="metrics-section">
      <h3>Performance Alerts</h3>
      <div class="alerts-container">
        <div v-if="alerts.length === 0" class="no-alerts">
          <i class="icon icon-checkmark"></i>
          <p>No performance alerts</p>
        </div>
        <div v-else class="alerts-list">
          <div 
            v-for="alert in alerts" 
            :key="alert.id"
            class="alert-item"
            :class="alert.severity"
          >
            <div class="alert-icon">
              <i :class="getAlertIcon(alert.severity)"></i>
            </div>
            <div class="alert-content">
              <div class="alert-title">{{ alert.title }}</div>
              <div class="alert-message">{{ alert.message }}</div>
              <div class="alert-time">{{ formatDate(alert.timestamp) }}</div>
            </div>
            <div class="alert-actions">
              <button 
                class="btn btn-xs role-secondary" 
                @click="dismissAlert(alert.id)"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Event Log -->
    <div class="metrics-section">
      <h3>Recent Events</h3>
      <div class="events-container">
        <div v-if="events.length === 0" class="no-events">
          <i class="icon icon-history"></i>
          <p>No recent events</p>
        </div>
        <div v-else class="events-list">
          <div 
            v-for="event in events" 
            :key="event.id"
            class="event-item"
            :class="event.severity"
          >
            <div class="event-time">{{ formatDate(event.timestamp) }}</div>
            <div class="event-type">{{ event.type }}</div>
            <div class="event-message">{{ event.message }}</div>
            <div v-if="event.source" class="event-source">{{ event.source }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, onUnmounted, watch } from 'vue';
import type { AdapterResource, AdapterMetrics, SystemMetrics } from '../../types/mcp-types';

interface Alert {
  id: string;
  severity: 'info' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
  adapterName?: string;
}

interface Event {
  id: string;
  type: string;
  severity: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  source?: string;
  timestamp: string;
}

export default defineComponent({
  name: 'RealTimeMetrics',

  props: {
    adapters: {
      type: Array as () => AdapterResource[],
      required: true
    }
  },

  setup(props) {
    const realTimeEnabled = ref(false);
    const autoRefresh = ref(true);
    const refreshInterval = ref(10000);
    
    const loadingSystemMetrics = ref(false);
    const loadingAdapterMetrics = ref(false);
    
    const systemMetrics = ref<SystemMetrics | null>(null);
    const adapterMetrics = ref<Record<string, AdapterMetrics>>({});
    
    const alerts = ref<Alert[]>([]);
    const events = ref<Event[]>([]);
    
    let refreshTimer: ReturnType<typeof setInterval> | null = null;

    const { useMCPGateway } = require('../../composables/useMCPGateway');
    const {
      systemMetrics: composableSystemMetrics,
      adapterMetrics: composableAdapterMetrics,
      realTimeUpdates,
      fetchSystemMetrics,
      fetchAdapterMetrics,
      startRealTimeUpdates,
      stopRealTimeUpdates,
      startMetricsPolling,
      stopMetricsPolling
    } = useMCPGateway();

    const refreshMetrics = async () => {
      try {
        loadingSystemMetrics.value = true;
        loadingAdapterMetrics.value = true;
        
        await Promise.all([
          fetchSystemMetrics(),
          ...props.adapters.map(adapter => fetchAdapterMetrics(adapter.name))
        ]);
      } catch (error) {
        console.error('Failed to refresh metrics:', error);
      } finally {
        loadingSystemMetrics.value = false;
        loadingAdapterMetrics.value = false;
      }
    };

    const toggleRealTimeUpdates = () => {
      if (realTimeEnabled.value) {
        startRealTimeUpdates();
      } else {
        stopRealTimeUpdates();
      }
    };

    const toggleAutoRefresh = () => {
      if (autoRefresh.value) {
        startAutoRefresh();
      } else {
        stopAutoRefresh();
      }
    };

    const updateRefreshInterval = () => {
      if (autoRefresh.value) {
        stopAutoRefresh();
        startAutoRefresh();
      }
    };

    const startAutoRefresh = () => {
      stopAutoRefresh();
      refreshTimer = setInterval(refreshMetrics, refreshInterval.value);
    };

    const stopAutoRefresh = () => {
      if (refreshTimer) {
        clearInterval(refreshTimer);
        refreshTimer = null;
      }
    };

    const getSystemStatusClass = () => {
      if (!systemMetrics.value) return 'status-unknown';
      
      const { adapters } = systemMetrics.value;
      if (adapters.error > 0) return 'status-error';
      if (adapters.running === adapters.total) return 'status-good';
      return 'status-warning';
    };

    const getSystemStatusText = () => {
      if (!systemMetrics.value) return 'Unknown';
      
      const { adapters } = systemMetrics.value;
      if (adapters.error > 0) return 'Issues Detected';
      if (adapters.running === adapters.total) return 'All Systems Operational';
      return 'Partial Degradation';
    };

    const getAdapterStatus = (adapterName: string) => {
      const adapter = props.adapters.find(a => a.name === adapterName);
      return adapter?.status || 'unknown';
    };

    const getAdapterStatusClass = (adapterName: string) => {
      const status = getAdapterStatus(adapterName);
      switch (status) {
        case 'running': return 'status-running';
        case 'stopped': return 'status-stopped';
        case 'error': return 'status-error';
        default: return 'status-unknown';
      }
    };

    const getCpuClass = (usage: number) => {
      if (usage > 80) return 'progress-danger';
      if (usage > 60) return 'progress-warning';
      return 'progress-success';
    };

    const getMemoryClass = (usage: number) => {
      const gb = usage / (1024 * 1024 * 1024);
      if (gb > 6) return 'progress-danger';
      if (gb > 4) return 'progress-warning';
      return 'progress-success';
    };

    const formatDuration = (seconds: number) => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = Math.floor(seconds % 60);
      
      if (hours > 0) {
        return `${hours}h ${minutes}m`;
      } else if (minutes > 0) {
        return `${minutes}m ${secs}s`;
      } else {
        return `${secs}s`;
      }
    };

    const formatBytes = (bytes: number) => {
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      if (bytes === 0) return '0 Bytes';
      const i = Math.floor(Math.log(bytes) / Math.log(1024));
      return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    };

    const getResponseTimeTrend = (metrics: AdapterMetrics) => {
      // Generate mock trend data - in real implementation, this would come from historical data
      return Array.from({ length: 10 }, () => Math.random() * 100);
    };

    const getRequestRateTrend = (metrics: AdapterMetrics) => {
      // Generate mock trend data
      return Array.from({ length: 10 }, () => Math.random() * 100);
    };

    const getAlertIcon = (severity: string) => {
      switch (severity) {
        case 'error': return 'icon-error';
        case 'warning': return 'icon-warning';
        default: return 'icon-info';
      }
    };

    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleString();
    };

    const dismissAlert = (alertId: string) => {
      alerts.value = alerts.value.filter(alert => alert.id !== alertId);
    };

    const generateAlerts = () => {
      const newAlerts: Alert[] = [];
      
      if (systemMetrics.value) {
        // Check for high CPU usage
        if (systemMetrics.value.system.cpuUsage > 80) {
          newAlerts.push({
            id: `cpu-${Date.now()}`,
            severity: 'warning',
            title: 'High CPU Usage',
            message: `System CPU usage is ${systemMetrics.value.system.cpuUsage.toFixed(1)}%`,
            timestamp: new Date().toISOString()
          });
        }
        
        // Check for adapter errors
        if (systemMetrics.value.adapters.error > 0) {
          newAlerts.push({
            id: `adapter-error-${Date.now()}`,
            severity: 'error',
            title: 'Adapter Errors',
            message: `${systemMetrics.value.adapters.error} adapter(s) in error state`,
            timestamp: new Date().toISOString()
          });
        }
      }
      
      // Check adapter-specific issues
      Object.entries(adapterMetrics.value).forEach(([adapterName, metrics]) => {
        if (metrics.performance.errorRate > 0.1) { // 10% error rate
          newAlerts.push({
            id: `error-rate-${adapterName}-${Date.now()}`,
            severity: 'warning',
            title: 'High Error Rate',
            message: `${adapterName} has ${(metrics.performance.errorRate * 100).toFixed(1)}% error rate`,
            timestamp: new Date().toISOString(),
            adapterName
          });
        }
      });
      
      alerts.value = [...newAlerts, ...alerts.value].slice(0, 50); // Keep only latest 50 alerts
    };

    const generateEvents = () => {
      const newEvents: Event[] = [];
      
      // Add system events
      if (systemMetrics.value) {
        newEvents.push({
          id: `system-update-${Date.now()}`,
          type: 'metrics_update',
          severity: 'info',
          message: 'System metrics updated',
          source: 'system',
          timestamp: new Date().toISOString()
        });
      }
      
      // Add adapter events
      Object.entries(adapterMetrics.value).forEach(([adapterName, metrics]) => {
        newEvents.push({
          id: `adapter-update-${adapterName}-${Date.now()}`,
          type: 'metrics_update',
          severity: 'info',
          message: `${adapterName} metrics updated`,
          source: adapterName,
          timestamp: new Date().toISOString()
        });
      });
      
      events.value = [...newEvents, ...events.value].slice(0, 100); // Keep only latest 100 events
    };

    // Watch for metrics updates
    watch(composableSystemMetrics, (newMetrics) => {
      systemMetrics.value = newMetrics;
      generateAlerts();
      generateEvents();
    }, { deep: true });

    watch(composableAdapterMetrics, (newMetrics) => {
      adapterMetrics.value = newMetrics;
      generateAlerts();
      generateEvents();
    }, { deep: true });

    onMounted(() => {
      refreshMetrics();
      if (autoRefresh.value) {
        startAutoRefresh();
      }
    });

    onUnmounted(() => {
      stopAutoRefresh();
      stopRealTimeUpdates();
      stopMetricsPolling();
    });

    return {
      realTimeEnabled,
      autoRefresh,
      refreshInterval,
      loadingSystemMetrics,
      loadingAdapterMetrics,
      systemMetrics,
      adapterMetrics,
      alerts,
      events,
      refreshMetrics,
      toggleRealTimeUpdates,
      toggleAutoRefresh,
      updateRefreshInterval,
      getSystemStatusClass,
      getSystemStatusText,
      getAdapterStatus,
      getAdapterStatusClass,
      getCpuClass,
      getMemoryClass,
      formatDuration,
      formatBytes,
      getResponseTimeTrend,
      getRequestRateTrend,
      getAlertIcon,
      formatDate,
      dismissAlert
    };
  }
});
</script>

<style scoped>
.real-time-metrics {
  padding: 20px;
  max-width: 1600px;
  margin: 0 auto;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border);
}

.header h2 {
  margin: 0;
  color: var(--body-text);
}

.header-controls {
  display: flex;
  align-items: center;
  gap: 24px;
}

.toggle-container {
  display: flex;
  align-items: center;
}

.toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-weight: 600;
  color: var(--input-label);
}

.refresh-controls {
  display: flex;
  align-items: center;
  gap: 16px;
}

.auto-refresh {
  display: flex;
  align-items: center;
  gap: 8px;
}

.checkbox {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: 14px;
}

.input-sm {
  padding: 4px 8px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--input-bg);
  color: var(--input-text);
  font-size: 12px;
}

.metrics-section {
  margin-bottom: 32px;
}

.metrics-section h3 {
  margin: 0 0 16px 0;
  color: var(--body-text);
  font-size: 18px;
  font-weight: 600;
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: var(--text-muted);
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: var(--text-muted);
  font-style: italic;
}

.system-metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
}

.metric-card {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 20px;
  text-align: center;
}

.metric-card.system {
  grid-column: span 2;
}

.metric-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 12px;
}

.metric-header i {
  font-size: 20px;
  color: var(--primary);
}

.metric-title {
  font-weight: 600;
  color: var(--body-text);
}

.metric-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--body-text);
  margin-bottom: 8px;
}

.metric-breakdown {
  display: flex;
  justify-content: center;
  gap: 12px;
  font-size: 12px;
}

.breakdown-item {
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--input-bg);
}

.breakdown-item.running {
  background: var(--success-bg);
  color: var(--success-text);
}

.breakdown-item.stopped {
  background: var(--muted-bg);
  color: var(--muted-text);
}

.breakdown-item.error {
  background: var(--error-bg);
  color: var(--error-text);
}

.metric-progress {
  height: 4px;
  background: var(--input-bg);
  border-radius: 2px;
  overflow: hidden;
  margin-top: 8px;
}

.progress-bar {
  height: 100%;
  transition: width 0.3s ease;
}

.progress-success {
  background: var(--success);
}

.progress-warning {
  background: var(--warning);
}

.progress-danger {
  background: var(--error);
}

.adapters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
  gap: 20px;
}

.adapter-metrics-card {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 20px;
}

.adapter-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
}

.adapter-header h4 {
  margin: 0;
  color: var(--body-text);
  font-size: 16px;
}

.adapter-status {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.status-running {
  background: var(--success-bg);
  color: var(--success-text);
}

.status-stopped {
  background: var(--muted-bg);
  color: var(--muted-text);
}

.status-error {
  background: var(--error-bg);
  color: var(--error-text);
}

.status-unknown {
  background: var(--warning-bg);
  color: var(--warning-text);
}

.status-good {
  color: var(--success);
}

.status-warning {
  color: var(--warning);
}

.status-error {
  color: var(--error);
}

.adapter-metrics-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.mini-metric {
  text-align: center;
  padding: 12px 8px;
  background: var(--input-bg);
  border-radius: 4px;
}

.mini-label {
  display: block;
  font-size: 11px;
  color: var(--text-muted);
  margin-bottom: 4px;
  text-transform: uppercase;
}

.mini-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--body-text);
}

.adapter-charts {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.chart-container h5 {
  margin: 0 0 8px 0;
  font-size: 12px;
  color: var(--body-text);
  text-align: center;
}

.mini-chart {
  display: flex;
  align-items: end;
  height: 40px;
  gap: 2px;
  padding: 4px;
  background: var(--input-bg);
  border-radius: 4px;
}

.chart-bar {
  flex: 1;
  background: var(--primary);
  min-height: 2px;
  border-radius: 1px;
}

.alerts-container {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 20px;
}

.no-alerts {
  text-align: center;
  color: var(--text-muted);
}

.no-alerts i {
  font-size: 32px;
  color: var(--success);
  margin-bottom: 8px;
}

.alerts-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.alert-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  border-radius: 6px;
  border-left: 4px solid;
}

.alert-item.info {
  background: var(--info-bg);
  border-left-color: var(--info);
}

.alert-item.warning {
  background: var(--warning-bg);
  border-left-color: var(--warning);
}

.alert-item.error {
  background: var(--error-bg);
  border-left-color: var(--error);
}

.alert-icon {
  margin-top: 2px;
}

.alert-content {
  flex: 1;
}

.alert-title {
  font-weight: 600;
  color: var(--body-text);
  margin-bottom: 4px;
}

.alert-message {
  color: var(--text-muted);
  margin-bottom: 4px;
}

.alert-time {
  font-size: 12px;
  color: var(--text-muted);
}

.alert-actions {
  margin-top: 4px;
}

.events-container {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 20px;
}

.no-events {
  text-align: center;
  color: var(--text-muted);
}

.no-events i {
  font-size: 32px;
  color: var(--muted);
  margin-bottom: 8px;
}

.events-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 400px;
  overflow-y: auto;
}

.event-item {
  display: grid;
  grid-template-columns: 140px 80px 1fr 100px;
  gap: 12px;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 12px;
}

.event-item.info {
  background: var(--info-bg);
}

.event-item.warn {
  background: var(--warning-bg);
}

.event-item.error {
  background: var(--error-bg);
}

.event-item.debug {
  background: var(--muted-bg);
}

.event-time {
  color: var(--text-muted);
  font-family: monospace;
}

.event-type {
  font-weight: 600;
  color: var(--body-text);
}

.event-message {
  color: var(--text-muted);
}

.event-source {
  color: var(--text-muted);
  font-family: monospace;
}
</style>