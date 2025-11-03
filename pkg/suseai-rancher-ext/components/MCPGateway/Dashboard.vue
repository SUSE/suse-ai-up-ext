<template>
  <div class="mcp-gateway-content">
    <h1>MCP Gateway</h1>
    <p>Monitor and manage your Model Context Protocol endpoints</p>

    <MetricsGrid
      :discovered-count="discoveredCount"
      :registered-count="registeredCount"
      :available-count="availableCount"
      :error-rate="errorRate"
      :loading="loading"
    />

    <ScanActions
      :scanning="scanning"
      :security-scanning="securityScanning"
      :scan-progress="scanProgress"
      :scan-status="scanStatus"
      @scan-start="handleScanStart"
      @rule-management-open="handleRuleManagement"
    />

    <AdaptersTable
      :adapters="adapters"
      :loading="loading"
      :error="error || undefined"
      @view-details="handleViewAdapterDetails"
      @view-logs="handleViewAdapterLogs"
      @edit-adapter="handleEditAdapter"
      @delete-adapter="handleDeleteAdapter"
    />

    <DiscoveredServersTable
      :discovered-servers="discoveredServers"
      :loading="loading"
      @view-server-details="handleViewServerDetails"
      @register-server="handleRegisterServer"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useMCPGateway } from '../../composables/useMCPGateway';
import MetricsGrid from './MetricsGrid.vue';
import ScanActions from './ScanActions.vue';
import AdaptersTable from './AdaptersTable.vue';
import DiscoveredServersTable from './DiscoveredServersTable.vue';

export default defineComponent({
  name: 'Dashboard',
  components: {
    MetricsGrid,
    ScanActions,
    AdaptersTable,
    DiscoveredServersTable
  },
  emits: ['scan-modal-open', 'security-modal-open', 'rule-modal-open'],
  setup(props, { emit }) {
    const {
      // Dashboard data
      discoveredServers,
      adapters,
      loading,
      error,
      scanning,
      securityScanning,
      scanProgress,
      scanStatus,
      discoveredCount,
      registeredCount,
      availableCount,
      errorRate,

      // Methods
      onScanStarted,
      openRuleManagement,
      viewAdapterDetails,
      viewAdapterLogs,
      editAdapter,
      deleteAdapter,
      viewServerDetails,
      registerServer
    } = useMCPGateway();

    const handleScanStart = () => {
      emit('scan-modal-open');
    };

    const handleRuleManagement = () => {
      emit('rule-modal-open');
    };

    const handleViewAdapterDetails = (adapter: any) => {
      viewAdapterDetails(adapter);
    };

    const handleViewAdapterLogs = (adapter: any) => {
      viewAdapterLogs(adapter);
    };

    const handleEditAdapter = (adapter: any) => {
      editAdapter(adapter);
    };

    const handleDeleteAdapter = (adapter: any) => {
      deleteAdapter(adapter);
    };

    const handleViewServerDetails = (server: any) => {
      viewServerDetails(server);
      emit('security-modal-open');
    };

    const handleRegisterServer = (server: any) => {
      registerServer(server);
    };

    return {
      // Data
      discoveredServers,
      adapters,
      loading,
      error,
      scanning,
      securityScanning,
      scanProgress,
      scanStatus,
      discoveredCount,
      registeredCount,
      availableCount,
      errorRate,

      // Handlers
      handleScanStart,
      handleRuleManagement,
      handleViewAdapterDetails,
      handleViewAdapterLogs,
      handleEditAdapter,
      handleDeleteAdapter,
      handleViewServerDetails,
      handleRegisterServer
    };
  }
});
</script>

<style scoped>
.mcp-gateway-content {
  padding: 24px;
}
</style>