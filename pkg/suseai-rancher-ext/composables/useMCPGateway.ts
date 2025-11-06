import { computed, ref, getCurrentInstance, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { useStore } from 'vuex';
import { logger } from '../utils/logger';
import { MCPService } from '../services/mcp-service';
import type { AdapterResource, DiscoveredServer, AdapterData } from '../services/mcp-service';

interface Service {
  id: string;
  name: string;
  description: string;
  iconClass: string;
}

export function useMCPGateway() {
  const vm = getCurrentInstance()!.proxy as any;
  const store = useStore();
  const router = vm.$router;
  const route = vm.$route;

  // Store getters
  const proxyInstalled = computed(() => store.state.suseai.settings.proxyInstalled);

  // Wizard state
  const currentStep = ref(0);
  const installing = ref(false);
  const installed = ref(false);
  const selectedServices = ref<string[]>([]);

  // Service discovery
  const serviceFound = ref(false);
  const serviceUrl = ref('');
  const checkingService = ref(false);
  const useExistingService = ref<boolean | null>(null);

  // Configuration mode
  const showConfigurationWizard = ref(false);
  const showInstallButton = ref(true);

  // Fake installation state
  const fakeInstalling = ref(false);

  // MCP Gateway state
  const discoveredServers = ref<DiscoveredServer[]>([]);
  const adapters = ref<AdapterResource[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const scanning = ref(false);
  const securityScanning = ref(false);
  const scanProgress = ref(0);
  const scanStatus = ref('');
  const currentScanId = ref<string | null>(null);

  // Modal refs and data
  const selectedServerFindings = ref<any[]>([]);
  const selectedServerName = ref('');

  // Polling
  let pollInterval: number | null = null;

  // Services data
  const services: Service[] = [
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

  // Wizard steps configuration
  const wizardSteps = computed(() => [
    {
      name: 'install',
      label: 'Install Adapter',
      ready: canProceed.value,
      weight: 1
    },
    {
      name: 'services',
      label: 'Select Services',
      ready: true, // Always allow access to services step
      weight: 2
    },
    {
      name: 'review',
      label: 'Review',
      ready: installed.value,
      weight: 3
    }
  ]);

  // Installation handler
  const handleInstall = () => {
    installing.value = true;
    setTimeout(() => {
      installing.value = false;
      installed.value = true;
    }, 5000);
  };

  // Fake installation for demo purposes
  const fakeInstall = () => {
    fakeInstalling.value = true;
    setTimeout(() => {
      fakeInstalling.value = false;
      serviceFound.value = true;
      serviceUrl.value = 'http://localhost:8911';
      useExistingService.value = true; // Auto-select the found service
      logger.info('Fake installation completed - service discovered at localhost:8911');
    }, 10000); // 10 seconds
  };

  // Service selection
  const toggleService = (serviceId: string) => {
    const index = selectedServices.value.indexOf(serviceId);
    if (index > -1) {
      selectedServices.value.splice(index, 1);
    } else {
      selectedServices.value.push(serviceId);
    }
  };

  const getServiceName = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    return service ? service.name : serviceId;
  };

  // Wizard navigation
  const nextStep = () => {
    if (currentStep.value === 0) {
      // First step - handle service selection or installation
      if (serviceFound.value && useExistingService.value) {
        // Use existing service - proceed to services selection
        installed.value = true;
        store.dispatch('suseai/setProxyInstalled', true);
        currentStep.value = 1;
        logger.info('Using existing SUSE AI Universal Proxy service');
      } else if (!serviceFound.value && !fakeInstalling.value) {
        // No service found - start fake installation
        fakeInstall();
      } else if (serviceFound.value) {
        // Service now found after installation - proceed to services
        installed.value = true;
        store.dispatch('suseai/setProxyInstalled', true);
        currentStep.value = 1;
        logger.info('Proceeding with discovered service');
      }
    } else if (currentStep.value < wizardSteps.value.length - 1 && wizardSteps.value[currentStep.value + 1].ready) {
      currentStep.value++;
    }
  };

  const previousStep = () => {
    if (currentStep.value > 0) {
      currentStep.value--;
    }
  };

  const onWizardCancel = () => {
    // Reset all wizard state
    currentStep.value = 0;
    installing.value = false;
    installed.value = false;
    selectedServices.value = [];
    showConfigurationWizard.value = false;
    // Always navigate back to service configuration home
    router?.push({
      name: `c-cluster-suseai-home-root`,
      params: { cluster: route?.params?.cluster }
    });
  };

  const onWizardFinish = () => {
    // Save selected services to store
    store.dispatch('suseai/setSelectedServices', selectedServices.value);
    // Set proxy as installed (if not already)
    store.dispatch('suseai/setProxyInstalled', true);

    if (showConfigurationWizard.value) {
      // Just hide the configuration wizard
      showConfigurationWizard.value = false;
      currentStep.value = 0;
    }
    // Enable selected services (logic for enabling pages)
    // This would enable navigation to the respective pages
  };

  // Computed property to check if any services are selected
  const hasSelectedServices = computed(() => {
    const storedServices = store.state.suseai.settings.selectedServices || [];
    return storedServices.length > 0;
  });

  // Method to start service configuration (go back to wizard)
  const startServiceConfiguration = () => {
    showConfigurationWizard.value = true;
    currentStep.value = 1; // Go to service selection step
    selectedServices.value = store.state.suseai.settings.selectedServices || [];
  };

  // Check for existing service
  let serviceCheckInterval: number | null = null;

  const checkForExistingService = async () => {
    if (serviceFound.value) return; // Already found, stop checking

    checkingService.value = true;
    try {
      const isResponding = await MCPService.ping();
      if (isResponding) {
        serviceFound.value = true;
        serviceUrl.value = 'http://localhost:8911';
        stopServiceChecking();
        logger.info('Existing SUSE AI Universal Proxy service found');
      } else {
        logger.info('No existing SUSE AI Universal Proxy service found, will continue checking...');
      }
    } catch (err) {
      serviceFound.value = false;
      serviceUrl.value = '';
      logger.info('Error checking for service, will continue checking...');
    } finally {
      checkingService.value = false;
    }
  };

  const startServiceChecking = () => {
    if (serviceCheckInterval) return; // Already checking
    serviceCheckInterval = window.setInterval(checkForExistingService, 2000); // Check every 2 seconds
    // Initial check
    checkForExistingService();
  };

  const stopServiceChecking = () => {
    if (serviceCheckInterval) {
      clearInterval(serviceCheckInterval);
      serviceCheckInterval = null;
    }
    checkingService.value = false;
  };

  // Service selection methods
  const selectExistingService = () => {
    useExistingService.value = true;
    stopServiceChecking();
  };

  const selectInstallNew = () => {
    useExistingService.value = false;
    stopServiceChecking();
  };

  const startInstallProcess = async () => {
    showInstallButton.value = false;
    showConfigurationWizard.value = true;
    currentStep.value = 0; // Ensure we start at step 0
    startServiceChecking();
  };

  // Handle next button
  const handleNext = () => {
    stopServiceChecking();
    if (useExistingService.value) {
      // Use existing service - mark as installed and proceed to services
      installed.value = true;
      store.dispatch('suseai/setProxyInstalled', true);
      currentStep.value = 1; // Go to services selection
      logger.info('Using existing SUSE AI Universal Proxy service');
    } else {
      // Install new service
      handleInstall();
    }
  };

  // Computed property for next button state
  const canProceed = computed(() => {
    if (checkingService.value || fakeInstalling.value) return false;
    if (!serviceFound.value) return !installed.value; // Can proceed if no service found and not installed
    return useExistingService.value !== null; // Must select an option when service is found
  });

  // MCP Gateway methods
  const fetchDiscoveredServers = async () => {
    try {
      // If we have a current scan, get its results
      if (currentScanId.value) {
        const scanResult = await MCPService.getScanResults(currentScanId.value);
        if (scanResult.discovered_servers) {
          discoveredServers.value = scanResult.discovered_servers.sort((a, b) => {
            const nameA = a.name || a.address;
            const nameB = b.name || b.address;
            return nameA.localeCompare(nameB);
          });
        }
      } else {
        // Fallback to direct server fetch (for backward compatibility)
        const servers = await MCPService.getDiscoveredServers();
        discoveredServers.value = servers.sort((a, b) => {
          const nameA = a.name || a.address;
          const nameB = b.name || b.address;
          return nameA.localeCompare(nameB);
        });
      }
    } catch (err) {
      logger.error('Failed to fetch discovered servers', err);
      // Continue - this is not critical
    }
  };

  const fetchAdapters = async () => {
    try {
      const adaptersData = await MCPService.getAdapters();
      adapters.value = adaptersData;
    } catch (err) {
      logger.error('Failed to fetch adapters', err);
      error.value = 'Failed to load MCP adapters';
    }
  };

  const loadData = async () => {
    logger.info('Loading MCP data...');
    loading.value = true;
    error.value = null;
    try {
      await Promise.all([
        fetchDiscoveredServers(),
        fetchAdapters()
      ]);
      logger.info('MCP data loaded successfully');
    } catch (err) {
      logger.error('Failed to load MCP data', err);
    } finally {
      loading.value = false;
    }
  };

  const generateAdapterName = (server: DiscoveredServer): string => {
    // For /register endpoint, use server name as alias/display name
    // This is the human-readable name like "MCP Server (Authenticated)"
    return server.name || server.address;
  };

  const registerServer = async (server: DiscoveredServer) => {
    try {
      // Register discovered server by ID - the /register endpoint handles the rest
      const result = await MCPService.registerDiscoveredServer(server.id);

      // Refresh adapters list
      await fetchAdapters();

      logger.info('Server registered successfully', {
        data: {
          serverId: server.id,
          adapterId: result.adapter?.id,
          adapterName: result.adapter?.name
        }
      });

    } catch (err) {
      logger.error('Failed to register server', err);
      error.value = 'Failed to register server';
    }
  };

  const viewAdapterDetails = (adapter: AdapterResource) => {
    // For now, just show an alert with adapter details
    // TODO: Create a proper modal for adapter details
    const details = `
Name: ${adapter.name}
Image: ${adapter.imageName}:${adapter.imageVersion}
Status: ${adapter.replicaCount && adapter.replicaCount > 0 ? 'Active' : 'Inactive'}
Replicas: ${adapter.replicaCount || 0}
Connection: ${adapter.connectionType || 'N/A'}
Protocol: ${adapter.protocol || 'MCP'}
Description: ${adapter.description || 'N/A'}
Created: ${adapter.createdAt ? new Date(adapter.createdAt).toLocaleString() : 'Unknown'}
Updated: ${adapter.lastUpdatedAt ? new Date(adapter.lastUpdatedAt).toLocaleString() : 'Unknown'}
    `.trim();

    alert(`Adapter Details:\n\n${details}`);
  };

  const viewAdapterLogs = async (adapter: AdapterResource) => {
    try {
      const logsResponse = await MCPService.getAdapterLogs(adapter.name);
      alert(`Logs for ${adapter.name}:\n\n${logsResponse}`);
    } catch (err) {
      logger.error('Failed to fetch adapter logs', err);
      alert('Failed to fetch adapter logs');
    }
  };

  const editAdapter = (adapter: AdapterResource) => {
    // TODO: Implement edit functionality with a modal
    alert('Edit functionality not yet implemented');
  };

  const deleteAdapter = async (adapter: AdapterResource) => {
    if (confirm(`Are you sure you want to delete adapter "${adapter.name}"?`)) {
      try {
        await MCPService.deleteAdapter(adapter.name);
        await fetchAdapters();
        logger.info('Adapter deleted successfully', { data: { adapterName: adapter.name } });
      } catch (err) {
        logger.error('Failed to delete adapter', err);
        alert('Failed to delete adapter');
      }
    }
  };

  const getRiskBadgeClass = (score: string) => {
    switch (score) {
      case 'high':
        return 'badge badge-danger';
      case 'medium':
        return 'badge badge-warning';
      case 'low':
        return 'badge badge-success';
      default:
        return 'badge badge-secondary';
    }
  };

  const getRiskLabel = (score: string) => {
    switch (score) {
      case 'high':
        return 'High Risk';
      case 'medium':
        return 'Medium Risk';
      case 'low':
        return 'Low Risk';
      default:
        return 'Unknown';
    }
  };

  const getAddressWithoutPort = (address: string) => {
    if (!address) return '';
    const colonIndex = address.lastIndexOf(':');
    if (colonIndex > 0) {
      return address.substring(0, colonIndex);
    }
    return address;
  };

  const getPortFromAddress = (address: string) => {
    if (!address) return null;
    const colonIndex = address.lastIndexOf(':');
    if (colonIndex > 0) {
      const port = address.substring(colonIndex + 1);
      return port;
    }
    return null;
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'active':
        return 'badge-success';
      case 'error':
      case 'failed':
        return 'badge-danger';
      case 'warning':
        return 'badge-warning';
      default:
        return 'badge-secondary';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'active':
        return 'Available';
      case 'error':
      case 'failed':
        return 'Not Available';
      case 'warning':
        return 'Warning';
      default:
        return 'Unknown';
    }
  };

  const getAuthTypeLabel = (authType?: string) => {
    if (!authType) return 'None';
    return authType.charAt(0).toUpperCase() + authType.slice(1).toLowerCase();
  };

  const getSecurityStatusClass = (server: DiscoveredServer) => {
    if (!server.security_findings || server.security_findings.length === 0) {
      return 'badge badge-success';
    }

    const hasHigh = server.security_findings.some(f => f.severity === 'high');
    const hasMedium = server.security_findings.some(f => f.severity === 'medium');

    if (hasHigh) return 'badge badge-danger';
    if (hasMedium) return 'badge badge-warning';
    return 'badge badge-info';
  };

  const getSecurityStatusLabel = (server: DiscoveredServer) => {
    if (!server.security_findings || server.security_findings.length === 0) {
      return 'Secure';
    }

    const highCount = server.security_findings.filter(f => f.severity === 'high').length;
    const mediumCount = server.security_findings.filter(f => f.severity === 'medium').length;
    const lowCount = server.security_findings.filter(f => f.severity === 'low').length;

    if (highCount > 0) return `${highCount} Critical`;
    if (mediumCount > 0) return `${mediumCount} Warnings`;
    if (lowCount > 0) return `${lowCount} Info`;
    return 'Secure';
  };

  const viewServerDetails = (server: DiscoveredServer) => {
    selectedServerName.value = server.name || server.address;
    selectedServerFindings.value = server.security_findings || [];
  };

  const openScanModal = () => {
    // This will be handled by the parent component
  };

  const onScanStarted = (scanResult: any) => {
    scanning.value = true;
    currentScanId.value = scanResult.scan_id;

    // Start polling for scan completion
    pollScanStatus();
  };

  const pollScanStatus = async () => {
    if (!currentScanId.value) return;

    try {
      const status = await MCPService.getScanStatus(currentScanId.value);

      if (status.status === 'completed') {
        // Scan completed, fetch results
        await fetchDiscoveredServers();
        scanning.value = false;
        currentScanId.value = null;
      } else if (status.status === 'failed') {
        // Scan failed
        logger.error('Scan failed', status.error);
        scanning.value = false;
        currentScanId.value = null;
        error.value = status.error || 'Scan failed';
      } else {
        // Still running, continue polling
        setTimeout(pollScanStatus, 2000);
      }
    } catch (err) {
      logger.error('Failed to poll scan status', err);
      scanning.value = false;
      currentScanId.value = null;
    }
  };

  const openRuleManagement = () => {
    // This will be handled by the parent component
  };

  const onRulesLoaded = () => {
    // Refresh server data to apply new rules
    fetchDiscoveredServers();
  };

  // Computed metrics
  const discoveredCount = computed(() => discoveredServers.value.length);
  const registeredCount = computed(() => adapters.value.length);
  const availableCount = computed(() => {
    return adapters.value.filter(adapter => adapter.status === 'active' || adapter.status === 'healthy').length;
  });
  const errorRate = computed(() => {
    const totalErrors = adapters.value.reduce((sum, adapter) => sum + (adapter.errorCount || 0), 0);
    const totalRequests = adapters.value.reduce((sum, adapter) => sum + (adapter.requestCount || 0), 0);
    if (totalRequests === 0) return '0%';
    const rate = (totalErrors / totalRequests) * 100;
    return rate.toFixed(2) + '%';
  });

  // Lifecycle
  onMounted(async () => {
    // Always try to load MCP data on initial mount
    await loadData();

    // Start polling for real-time updates every 5 seconds
    pollInterval = window.setInterval(() => {
      if (!loading.value) {
        fetchDiscoveredServers();
        fetchAdapters();
      }
    }, 5000);
  });

  // Watch for service selection changes to trigger data loading
  watch(hasSelectedServices, (newValue) => {
    if (newValue && discoveredServers.value.length === 0) {
      logger.info('Services selected, loading MCP data');
      loadData();
    }
  });

  onUnmounted(() => {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
    stopServiceChecking();
  });

  // Helper function for server deduplication
  const generateServerKey = (server: DiscoveredServer): string => {
    const extractedPort = getPortFromAddress(server.address);
    const effectivePort = extractedPort || server.port || 8911;
    const name = server.name || 'unknown';
    const authType = server.metadata?.auth_type || 'none';
    return `${server.address}:${effectivePort}:${name}:${authType}`;
  };

  return {
    // Store getters
    proxyInstalled,

    // Wizard state
    currentStep,
    wizardSteps,
    installing,
    installed,
    selectedServices,
    services,
    handleInstall,
    toggleService,
    getServiceName,
    nextStep,
    previousStep,
    onWizardCancel,
    onWizardFinish,
    hasSelectedServices,
    startServiceConfiguration,

    // Modal data
    selectedServerFindings,
    selectedServerName,

    // MCP Gateway data
    discoveredServers,
    adapters,
    loading,
    error,
    scanning,
    securityScanning,
    scanProgress,
    scanStatus,
    currentScanId,
    discoveredCount,
    registeredCount,
    availableCount,
    errorRate,

    // MCP Gateway methods
    loadData,
    registerServer,
    viewAdapterDetails,
    viewAdapterLogs,
    editAdapter,
    deleteAdapter,
    getRiskBadgeClass,
    getRiskLabel,
    getAddressWithoutPort,
    getPortFromAddress,
    getStatusBadgeClass,
    getStatusLabel,
    getAuthTypeLabel,
    viewServerDetails,
    openScanModal,
    onScanStarted,
    openRuleManagement,
    onRulesLoaded,

    // Service checking state
    checkingService,
    serviceFound,
    serviceUrl,
    useExistingService,
    fakeInstalling,

    // Configuration mode
    showConfigurationWizard,
    showInstallButton,
    startInstallProcess,
    selectExistingService,
    handleNext,
    canProceed,
    checkForExistingService,
    startServiceChecking,
    stopServiceChecking
  };
}