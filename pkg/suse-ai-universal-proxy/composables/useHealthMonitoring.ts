import { ref, onMounted, onUnmounted } from 'vue';
import { logger } from '../utils/logger';
import { API_BASE_URLS } from '../config/api-config';

export interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  version?: string;
  service: string;
}

export interface ServiceHealth {
  status: HealthStatus | null;
  loading: boolean;
  error: string | null;
}

export function useHealthMonitoring() {
  // Reactive state for each service
  const proxyHealth = ref<ServiceHealth>({
    status: null,
    loading: false,
    error: null
  });

  const registryHealth = ref<ServiceHealth>({
    status: null,
    loading: false,
    error: null
  });

  const discoveryHealth = ref<ServiceHealth>({
    status: null,
    loading: false,
    error: null
  });

  // Polling interval
  let pollInterval: ReturnType<typeof setInterval> | null = null;

  // Helper function to check health using current API configuration
  const checkHealthWithFallback = async (serviceType: string): Promise<{ healthy: boolean; hostname: string; response?: any }> => {
    try {
      // Get the correct base URL for the service type
      let baseUrl = API_BASE_URLS.MCP_GATEWAY;
      if (serviceType === 'registry') {
        baseUrl = API_BASE_URLS.REGISTRY;
      } else if (serviceType === 'discovery') {
        baseUrl = API_BASE_URLS.DISCOVERY;
      }

      console.log(`🔍 [HealthMonitoring] Checking health for ${serviceType} at: ${baseUrl}/health`);
      
      // Ensure we don't have double slashes
      const healthUrl = `${baseUrl.replace(/\/$/, '')}/health`;
      
      const response = await fetch(healthUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000)
      });
      
      if (response.ok) {
        const data = await response.json();
        // Try to extract hostname for display, fallback to "proxy" for relative URLs
        let hostname = 'proxy';
        try {
          if (baseUrl.startsWith('http')) {
            hostname = new URL(baseUrl).hostname;
          }
        } catch (e) { /* ignore URL parse errors */ }
        
        return { healthy: true, hostname, response: data };
      }
    } catch (error) {
      console.log(`⚠️ [HealthMonitoring] Health check failed for ${serviceType}:`, error);
    }

    return { healthy: false, hostname: 'unknown' };
  };

  // Health check functions
  const checkProxyHealth = async (): Promise<void> => {
    proxyHealth.value.loading = true;
    proxyHealth.value.error = null;

    try {
      const result = await checkHealthWithFallback('proxy');

      if (result.healthy && result.response) {
        proxyHealth.value.status = {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          version: result.response.version,
          service: 'proxy'
        };
        logger.info('Proxy health check successful', { status: proxyHealth.value.status.status, host: result.hostname });
      } else {
        proxyHealth.value.status = {
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          service: 'proxy'
        };
        proxyHealth.value.error = 'Service not responding';
        logger.warn('Proxy health check failed - no healthy endpoints found');
      }
    } catch (error) {
      proxyHealth.value.status = {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        service: 'proxy'
      };
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      proxyHealth.value.error = errorMessage;
      logger.warn('Proxy health check failed', { error: errorMessage });
    } finally {
      proxyHealth.value.loading = false;
    }
  };

  const checkRegistryHealth = async (): Promise<void> => {
    registryHealth.value.loading = true;
    registryHealth.value.error = null;

    try {
      const result = await checkHealthWithFallback('registry');

      if (result.healthy && result.response) {
        registryHealth.value.status = {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          version: result.response.version,
          service: 'registry'
        };
        logger.info('Registry health check successful', { status: registryHealth.value.status.status, host: result.hostname });
      } else {
        registryHealth.value.status = {
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          service: 'registry'
        };
        registryHealth.value.error = 'Service not responding';
        logger.warn('Registry health check failed - no healthy endpoints found');
      }
    } catch (error) {
      registryHealth.value.status = {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        service: 'registry'
      };
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      registryHealth.value.error = errorMessage;
      logger.warn('Registry health check failed', { error: errorMessage });
    } finally {
      registryHealth.value.loading = false;
    }
  };

  const checkDiscoveryHealth = async (): Promise<void> => {
    discoveryHealth.value.loading = true;
    discoveryHealth.value.error = null;

    try {
      const result = await checkHealthWithFallback('discovery');

      if (result.healthy && result.response) {
        discoveryHealth.value.status = {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          version: result.response.version,
          service: 'discovery'
        };
        logger.info('Discovery health check successful', { status: discoveryHealth.value.status.status, host: result.hostname });
      } else {
        discoveryHealth.value.status = {
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          service: 'discovery'
        };
        discoveryHealth.value.error = 'Service not responding';
        logger.warn('Discovery health check failed - no healthy endpoints found');
      }
    } catch (error) {
      discoveryHealth.value.status = {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        service: 'discovery'
      };
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      discoveryHealth.value.error = errorMessage;
      logger.warn('Discovery health check failed', { error: errorMessage });
    } finally {
      discoveryHealth.value.loading = false;
    }
  };

  // Check all services
  const checkAllHealth = async (): Promise<void> => {
    await Promise.allSettled([
      checkProxyHealth(),
      checkRegistryHealth(),
      checkDiscoveryHealth()
    ]);
  };

  // Manual refresh functions
  const refreshProxyHealth = () => checkProxyHealth();
  const refreshRegistryHealth = () => checkRegistryHealth();
  const refreshDiscoveryHealth = () => checkDiscoveryHealth();
  const refreshAllHealth = () => checkAllHealth();

  // Start polling
  const startPolling = () => {
    if (pollInterval) {
      clearInterval(pollInterval);
    }
    pollInterval = setInterval(() => {
      checkAllHealth();
    }, 120000); // 2 minutes
  };

  // Stop polling
  const stopPolling = () => {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
  };

  // Initialize monitoring
  const initialize = async () => {
    await checkAllHealth();
    startPolling();
  };

  // Cleanup on unmount
  onUnmounted(() => {
    stopPolling();
  });

  return {
    // Health states
    proxyHealth,
    registryHealth,
    discoveryHealth,

    // Check functions
    checkProxyHealth,
    checkRegistryHealth,
    checkDiscoveryHealth,
    checkAllHealth,

    // Refresh functions
    refreshProxyHealth,
    refreshRegistryHealth,
    refreshDiscoveryHealth,
    refreshAllHealth,

    // Polling controls
    startPolling,
    stopPolling,
    initialize
  };
}