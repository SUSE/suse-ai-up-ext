import { computed, ref, getCurrentInstance, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { useStore } from 'vuex';
import { logger } from '../utils/logger';
import { MCPService, apiClient, updateApiBaseUrl, type ServiceDiscoveredServer, type DiscoveredServer } from '../services/mcp-service';
import { API_BASE_URLS } from '../config/api-config';
import type { SecurityFinding } from '../services/security-engine';
import { tokenService } from '../services/token-service';
import type {
  Adapter,
  AdapterResource,
  AdapterData
} from '../types/mcp-types';
import type {
  SessionInfo
} from '../types/mcp-types';
import type {
  SessionListResponse
} from '../services/mcp-service';
import type {
  Adapter as EnhancedAdapter,
  Session as EnhancedSession,
  AdapterHealth,
  AdapterMetrics,
  SystemMetrics,
  AdapterToken,
  TokenValidationResult,
  SessionMetrics
} from '../types/mcp-types';

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
  const adapters = ref<Adapter[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const scanning = ref(false);
  const securityScanning = ref(false);
  const scanProgress = ref(0);
  const scanStatus = ref('');
  const currentScanId = ref<string | null>(null);
  const scanCompleted = ref(false);
  const scanError = ref<string | null>(null);

  // Modal refs and data
  const selectedServerFindings = ref<any[]>([]);
  const selectedServerName = ref('');
  const selectedServer = ref<DiscoveredServer | null>(null);

  // Scan completion callbacks
  const scanCompletedCallbacks = ref<(() => void)[]>([]);
  const scanFailedCallbacks = ref<((error: string) => void)[]>([]);



  // Token Management
  const adapterTokens = ref<Record<string, any>>({});
  const loadingTokens = ref(false);
  const tokenValidation = ref<Record<string, TokenValidationResult>>({});



  // MCP Server Ping Status
  const adapterPingResults = ref<Record<string, boolean>>({});
  const loadingPing = ref(false);

  // Registered Server Tracking (for risk badge correlation)
  const registeredServerIds = ref<Set<string>>(new Set());

  // Real-time updates
  const realTimeUpdates = ref(false);
  const eventSource = ref<EventSource | null>(null);

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
      // Try localhost first (common case for local development/testing)
      try {
        const localhostResponse = await fetch('http://localhost:8911/health', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(3000)
        });
        if (localhostResponse.ok) {
          serviceFound.value = true;
          serviceUrl.value = 'http://localhost:8911';
          updateApiBaseUrl('http://localhost:8911');
          stopServiceChecking();
          logger.info('Existing SUSE AI Universal Proxy service found at localhost:8911');
          checkingService.value = false;
          return;
        }
      } catch (localhostError) {
        logger.info('Localhost check failed, trying configured URLs');
      }

      // Try configured service URLs from API_BASE_URLS
      try {
        const currentUrl = new URL(API_BASE_URLS.MCP_GATEWAY);
        if (currentUrl.hostname !== 'localhost' && currentUrl.hostname !== '127.0.0.1') {
          const configuredResponse = await fetch(`${API_BASE_URLS.MCP_GATEWAY}/health`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(3000)
          });
          if (configuredResponse.ok) {
            serviceFound.value = true;
            serviceUrl.value = API_BASE_URLS.MCP_GATEWAY;
            stopServiceChecking();
            logger.info(`Existing SUSE AI Universal Proxy service found at ${API_BASE_URLS.MCP_GATEWAY}`);
            checkingService.value = false;
            return;
          }
        }
      } catch (configuredError) {
        logger.info('Configured URL check failed');
      }

      // As last resort, try MCPService.ping() with current configuration
      const isResponding = await MCPService.ping();
      if (isResponding) {
        serviceFound.value = true;
        serviceUrl.value = API_BASE_URLS.MCP_GATEWAY;
        stopServiceChecking();
        logger.info(`Existing SUSE AI Universal Proxy service found at ${API_BASE_URLS.MCP_GATEWAY}`);
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
      // Fetch from discovery servers API to get current results
      const servers = await MCPService.getDiscoveryServers();
      if (Array.isArray(servers) && typeof servers.sort === 'function' && servers.length > 0) {
        try {
          // Apply security analysis to each server
          const serversWithFindings = servers.map((server: DiscoveredServer) => {
            if (!server.security_findings) {
              server.security_findings = generateSecurityFindings(server);
            }
            return server;
          });

          discoveredServers.value = serversWithFindings.sort((a: any, b: any) => {
            const nameA = (a && (a.name || a.address)) || '';
            const nameB = (b && (b.name || b.address)) || '';
            return nameA.localeCompare(nameB);
          });
        } catch (sortError) {
          logger.error('Failed to sort discovered servers:', sortError);
          discoveredServers.value = servers as DiscoveredServer[];
        }
      } else {
        logger.warn('getDiscoveryServers returned invalid data:', servers);
        discoveredServers.value = [];
      }
    } catch (err) {
      logger.error('Failed to fetch discovered servers', err);
      // If the /discovery/servers endpoint fails, servers will only be updated from scan results
      // This is acceptable as the primary way to get servers is through scanning
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

  const pingAllAdapters = async () => {
    if (adapters.value.length === 0) return;

    loadingPing.value = true;
    try {
      const pingPromises = adapters.value.map(async (adapter) => {
        const serverUrl = adapter.originalServer?.host;
        if (!serverUrl) {
          adapterPingResults.value[adapter.name] = false;
          return;
        }

        // Get authentication token if available
        let authToken: string | undefined;
        try {
          const tokenData = await tokenService.getAdapterToken(adapter.name);
          authToken = tokenData?.token;
        } catch (err) {
          // Token might not be available, try without authentication
          logger.info(`No token available for adapter ${adapter.name}, pinging without auth`);
        }

        const isAvailable = await MCPService.pingMCPServer(serverUrl, authToken);
        adapterPingResults.value[adapter.name] = isAvailable;
      });

      await Promise.all(pingPromises);
      logger.info('Completed pinging all adapters');
    } catch (err) {
      logger.error('Failed to ping adapters', err);
    } finally {
      loadingPing.value = false;
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
      // Ping all adapters to check availability
      await pingAllAdapters();
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

  // Helper function to sanitize adapter names
  const sanitizeAdapterName = (name: string): string => {
    return name
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/[(){}[\]*\\]/g, '') // Remove special characters (){}[]*\
      .toLowerCase(); // Convert to lowercase for consistency
  };

  const registerServer = async (server: DiscoveredServer) => {
    try {
      // First register the discovered server using the discovery register endpoint
      const registrationResult = await MCPService.registerDiscoveredServer(server.id);

      // The registration should return an adapter, but if not, we might need to create one separately
      if (registrationResult && registrationResult.name) {
        // Refresh adapters list
        await fetchAdapters();

        // Fetch token for the new adapter
        await fetchAdapterToken(registrationResult.name);

        // Ping to check availability
        await pingAllAdapters();

        // Mark server as registered
        registeredServerIds.value.add(server.id);

        logger.info('Server registered successfully', {
          serverId: server.id,
          adapterName: registrationResult.name
        });
      } else {
        logger.warn('Registration did not return adapter, falling back to direct creation');

        // Fallback: create adapter directly if registration didn't work
        const adapterName = server.name ? sanitizeAdapterName(server.name) : `adapter-${server.id}`;
        const adapterData: any = {
          name: adapterName,
          mcpServerId: server.id,
          description: `Adapter for ${server.name || server.address}`,
          authentication: {
            required: true,
            type: 'bearer'
          }
        };

        const result = await MCPService.createAdapter(adapterData);
        await fetchAdapters();
        if (result && result.name) {
          await fetchAdapterToken(result.name);
          await pingAllAdapters();
          registeredServerIds.value.add(server.id);
        }
      }

    } catch (err) {
      logger.error('Failed to register server', err);
      error.value = 'Failed to register server';
    }
  };

  const viewAdapterDetails = (adapter: AdapterResource) => {
    // This is now handled by the AdapterDetailsModal component
    // Keeping this function for backward compatibility
    logger.info('View adapter details', { adapterName: adapter.name });
  };

  const viewAdapterLogs = async (adapter: AdapterResource) => {
    try {
      // TODO: Implement logs endpoint when available
      // const logsResponse = await MCPService.getAdapterLogs(adapter.name);
      alert(`Logs functionality not yet implemented for ${adapter.name}`);
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
        // Remove server from registered tracking if it exists
        if (adapter.originalServer?.id) {
          registeredServerIds.value.delete(adapter.originalServer.id);
        }
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

  const generateSecurityFindings = (server: DiscoveredServer): SecurityFinding[] => {
    const findings: any[] = [];

    // Check for high vulnerability score (Risk Status)
    if (server.vulnerability_score === 'high') {
      findings.push({
        id: `high-risk-${server.id}`,
        title: 'High Risk Vulnerability',
        description: 'Server has been identified with high-risk vulnerabilities',
        severity: 'critical',
        category: 'VULNERABILITY',
        ruleId: 'MCP-RISK-001',
        vulnerability_type: 'high_risk_vulnerability',
        evidence: `Server ${server.name} has vulnerability_score: ${server.vulnerability_score}`,
        status: 'open',
        discoveredAt: new Date().toISOString(),
        adapterName: server.name || 'Unknown',
        recommendation: 'Immediate security assessment and remediation required. Review server configuration, update dependencies, and apply security patches.',
        references: ['MCP Security Assessment'],
        metadata: {
          vulnerability_score: server.vulnerability_score,
          vulnerability_type: 'high_risk_vulnerability'
        }
      });
    }

    // Check for missing authentication (Security Status)
    if (server.metadata?.auth_type === 'none') {
      findings.push({
        id: `missing-auth-${server.id}`,
        title: 'Missing Authentication',
        description: 'MCP server does not implement authentication',
        severity: 'critical',
        category: 'AUTHENTICATION',
        ruleId: 'MCP-AUTH-001',
        vulnerability_type: 'authentication_bypass',
        evidence: `Server ${server.name} has auth_type: ${server.metadata.auth_type}`,
        status: 'open',
        discoveredAt: new Date().toISOString(),
        adapterName: server.name || 'Unknown',
        recommendation: `Missing Authentication: To prevent session hijacking and event injection attacks, the following mitigations should be implemented:
MCP servers that implement authorization MUST verify all inbound requests. MCP Servers MUST NOT use sessions for authentication.
MCP servers MUST use secure, non-deterministic session IDs. Generated session IDs (e.g., UUIDs) SHOULD use secure random number generators. Avoid predictable or sequential session identifiers that could be guessed by an attacker. Rotating or expiring session IDs can also reduce the risk.
MCP servers SHOULD bind session IDs to user-specific information. When storing or transmitting session-related data (e.g., in a queue), combine the session ID with information unique to the authorized user, such as their internal user ID. Use a key format like <user_id>:<session_id>. This ensures that even if an attacker guesses a session ID, they cannot impersonate another user as the user ID is derived from the user token and not provided by the client.`,
        references: ['MCP Security Specification'],
        metadata: {
          auth_type: server.metadata.auth_type,
          vulnerability_type: 'authentication_bypass'
        }
      });
    }

    return findings;
  };

  const viewServerDetails = (server: DiscoveredServer) => {
    selectedServerName.value = server.name || server.address;
    selectedServer.value = server;

    // Generate security findings based on server characteristics
    const findings = generateSecurityFindings(server);
    selectedServerFindings.value = findings;
  };

  const openScanModal = () => {
    // This will be handled by the parent component
  };

  const onScanStarted = (scanResult: any) => {
    scanning.value = true;
    currentScanId.value = scanResult.jobId || scanResult.id || scanResult.scan_id;

    // Start polling for scan completion
    pollScanStatus();
  };

  const pollScanStatus = async () => {
    if (!currentScanId.value) return;

    try {
      const status = await MCPService.getScanStatus(currentScanId.value);

      if (status.status === 'completed') {
        // Scan completed, poll /api/v1/discovery/servers to get results
        logger.info('Scan completed, polling discovered servers from /api/v1/discovery/servers');
        await fetchDiscoveredServers();

        // Reset scan state
        scanning.value = false;
        currentScanId.value = null;

        logger.info('Scan completed successfully, servers table updated');
      } else if (status.status === 'failed') {
        // Scan failed
        logger.error('Scan failed', status.message || 'Unknown error');
        scanning.value = false;
        currentScanId.value = null;
        error.value = status.message || 'Scan failed';
      } else {
        // Still running or pending, continue polling
        setTimeout(pollScanStatus, 2000);
      }
    } catch (err) {
      logger.error('Failed to poll scan status', err);
      scanning.value = false;
      currentScanId.value = null;
      error.value = 'Failed to check scan status';
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
    return adapters.value.filter(adapter => adapterPingResults.value[adapter.name] === true).length;
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
    // Only load MCP data if proxy is installed
    if (proxyInstalled.value) {
      await loadData();

      // Start polling for real-time updates every 5 seconds
      pollInterval = window.setInterval(async () => {
        if (!loading.value && proxyInstalled.value) {
          await Promise.all([
            fetchDiscoveredServers(),
            fetchAdapters()
          ]);
          // Ping all adapters to update availability status
          await pingAllAdapters();
        }
      }, 5000);
    }
  });

   // Watch for service selection changes to trigger data loading
   watch(hasSelectedServices, (newValue) => {
     if (newValue) {
       logger.info('Services selected, loading MCP data');
       loadData();
     }
   });

   // Watch for service URL changes to update API base URL
   watch(() => store.state.suseai.settings.serviceUrls, (newServiceUrls) => {
     if (newServiceUrls && newServiceUrls.length > 0) {
       const proxyUrl = newServiceUrls[0]; // Use the first service URL as the proxy URL
       logger.info('Updating API base URL to discovered proxy:', proxyUrl);
       updateApiBaseUrl(proxyUrl);
     }
   }, { deep: true });

  onUnmounted(() => {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
    stopServiceChecking();
  });



  // Token Management Functions
  const fetchAdapterToken = async (adapterName: string) => {
    try {
      loadingTokens.value = true;
      const token = await tokenService.getAdapterToken(adapterName);
      adapterTokens.value[adapterName] = token;
      return token;
    } catch (err) {
      logger.error('Failed to fetch adapter token', err);
      throw err;
    } finally {
      loadingTokens.value = false;
    }
  };

  const refreshAdapterToken = async (adapterName: string) => {
    try {
      loadingTokens.value = true;
      const token = await tokenService.refreshAdapterToken(adapterName);
      adapterTokens.value[adapterName] = token;
      return token;
    } catch (err) {
      logger.error('Failed to refresh adapter token', err);
      throw err;
    } finally {
      loadingTokens.value = false;
    }
  };

  const validateAdapterToken = async (adapterName: string, token: string) => {
    try {
      const validation = await tokenService.validateAdapterToken(adapterName, token);
      tokenValidation.value[adapterName] = validation;
      return validation;
    } catch (err) {
      logger.error('Failed to validate adapter token', err);
      throw err;
    }
  };

  const generateClientToken = async (adapterName: string, request: { clientId: string; permissions?: string[]; expiresIn?: number }) => {
    try {
      const token = await tokenService.generateClientToken(adapterName, request);
      return token;
    } catch (err) {
      logger.error('Failed to generate client token', err);
      throw err;
    }
  };

  // Adapter Health Check
  const checkAdapterHealth = async (adapterName: string, userId?: string) => {
    try {
      const result = await MCPService.checkAdapterHealth(adapterName, userId);
      return result;
    } catch (err) {
      logger.error('Failed to check adapter health', err);
      throw err;
    }
  };

  // Real-time Updates
  const startRealTimeUpdates = () => {
    if (eventSource.value) {
      eventSource.value.close();
    }

    try {
      const baseUrl = apiClient.defaults.baseURL?.replace('/api/v1', '') || 'http://localhost:8911';
      eventSource.value = new EventSource(`${baseUrl}/events`);
      
      eventSource.value.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleRealTimeEvent(data);
        } catch (err) {
          logger.error('Failed to parse real-time event', err);
        }
      };

      eventSource.value.onerror = (err) => {
        logger.error('EventSource error', err);
        realTimeUpdates.value = false;
      };

      realTimeUpdates.value = true;
    } catch (err) {
      logger.error('Failed to start real-time updates', err);
      realTimeUpdates.value = false;
    }
  };

  const stopRealTimeUpdates = () => {
    if (eventSource.value) {
      eventSource.value.close();
      eventSource.value = null;
    }
    realTimeUpdates.value = false;
  };

  const handleRealTimeEvent = (event: any) => {
    switch (event.type) {
      case 'adapter_status':
        // Update adapter status
        const adapterIndex = adapters.value.findIndex(a => a.name === event.data.adapterName);
        if (adapterIndex >= 0) {
          adapters.value[adapterIndex] = { ...adapters.value[adapterIndex], ...event.data };
        }
        break;
      
      case 'session_created':
      case 'session_ended':
        // Note: Session management removed as endpoints don't exist
        break;
      
      case 'metrics':
        // Note: Metrics handling removed as endpoints don't exist
        break;
      
      case 'error':
        logger.error('Real-time error event', event.data);
        break;
    }
  };

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
    selectedServer,

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

    // MCP Ping Status
    adapterPingResults,
    loadingPing,

    // Registered Server Tracking
    registeredServerIds,

    // MCP Gateway methods
    loadData,
    registerServer,
    viewAdapterLogs,
    editAdapter,
    deleteAdapter,
    pingAllAdapters,
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
    stopServiceChecking,

    // Token Management
    adapterTokens,
    loadingTokens,
    tokenValidation,
    fetchAdapterToken,
    refreshAdapterToken,
    validateAdapterToken,
    generateClientToken,

    // Adapter Health
    checkAdapterHealth,

    // Real-time Updates
    realTimeUpdates,
    startRealTimeUpdates,
    stopRealTimeUpdates
  };
}