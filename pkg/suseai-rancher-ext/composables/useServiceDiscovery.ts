// Service Discovery Composable
// Handles detection of SUSE AI Universal Proxy service in Kubernetes cluster

import { ref, computed, readonly } from 'vue';
import { logger } from '../utils/logger';

export interface KubernetesService {
  metadata: {
    name: string;
    namespace: string;
  };
  spec: {
    type: string;
    ports: Array<{
      port: number;
      targetPort: number | string;
      protocol: string;
    }>;
    clusterIP?: string;
    externalIPs?: string[];
    loadBalancer?: {
      ingress?: Array<{
        ip?: string;
        hostname?: string;
      }>;
    };
  };
}

export interface DetectedService {
  name: string;
  namespace: string;
  port: number;
  type: string;
  clusterIP?: string;
  externalIPs?: readonly string[];
  loadBalancerIPs?: readonly string[];
  url?: string;
}

/**
 * Composable for discovering SUSE AI Universal Proxy service in Kubernetes
 */
export function useServiceDiscovery() {
  const isLoading = ref(false);
  const detectedServices = ref<DetectedService[]>([]);
  const error = ref<string | null>(null);

   /**
    * Query Kubernetes services in the current cluster
    */
    const queryKubernetesServices = async (store: any, clusterId: string): Promise<KubernetesService[]> => {
      try {
        console.log(`🚀 [ServiceDiscovery] Querying Kubernetes services for cluster: ${clusterId}`);
        console.log(`📡 [ServiceDiscovery] API URL: /k8s/clusters/${clusterId}/api/v1/services`);

        let response;
        try {
          response = await store.dispatch('rancher/request', {
            url: `/k8s/clusters/${clusterId}/api/v1/services`,
            method: 'GET'
          });
          console.log(`✅ [ServiceDiscovery] API call succeeded for cluster ${clusterId}`);
        } catch (apiError: any) {
          console.error(`❌ [ServiceDiscovery] API call failed for cluster ${clusterId}:`, apiError);
          console.error(`❌ [ServiceDiscovery] Error details:`, {
            message: apiError?.message,
            status: apiError?.status,
            statusText: apiError?.statusText,
            response: apiError?.response
          });
          throw apiError;
        }

        console.log('🔍 [ServiceDiscovery] Raw response received:', response);

        if (!response) {
          console.error('❌ [ServiceDiscovery] No response received from API call');
          throw new Error('No response from Kubernetes API');
        }

        console.log('🔍 [ServiceDiscovery] Kubernetes services response structure:', {
          hasData: !!response?.data,
          dataType: typeof response?.data,
          hasItems: !!response?.items,
          responseKeys: response ? Object.keys(response) : [],
          dataKeys: response?.data ? Object.keys(response.data) : [],
          fullResponse: response
        });

        // Handle different response structures (following AppWizard.vue pattern)
        const items = response?.data?.items || response?.data || response?.items || [];
        console.log(`📊 [ServiceDiscovery] Extracted ${items.length} items from response`);

        logger.info(`Found ${items.length} services in cluster ${clusterId}`);
        return items;
      } catch (err: any) {
        logger.error('Failed to query Kubernetes services:', err);
        logger.error('Error details:', {
          message: err?.message,
          status: err?.status,
          statusText: err?.statusText,
          response: err?.response
        });
        throw new Error(`Unable to query cluster services: ${err?.message || 'Unknown error'}`);
      }
    };

  /**
   * Query ingresses that point to a specific service
   */
   const queryIngressesForService = async (store: any, clusterId: string, serviceName: string, namespace: string): Promise<any[]> => {
     try {
       logger.info(`Querying ingresses for service ${serviceName} in namespace ${namespace}`);
       const response = await store.dispatch('rancher/request', {
         url: `/k8s/clusters/${clusterId}/apis/networking.k8s.io/v1/ingresses`,
         method: 'GET'
       });

        // Handle different response structures (following AppWizard.vue pattern)
        const ingresses = response?.data?.items || response?.data || response?.items || [];

       logger.info(`Found ${ingresses.length} ingresses in cluster ${clusterId}`);

       const filtered = ingresses.filter((ingress: any) => {
         const rules = ingress.spec?.rules || [];
         return rules.some((rule: any) => {
           const paths = rule.http?.paths || [];
           return paths.some((path: any) => {
             return path.backend?.service?.name === serviceName &&
                    ingress.metadata.namespace === namespace;
           });
         });
       });

       logger.info(`Found ${filtered.length} ingresses pointing to service ${serviceName}`);
       return filtered;
      } catch (err: any) {
        logger.warn('Failed to query ingresses:', err);
        logger.warn('Ingress query error details:', {
          message: err?.message,
          status: err?.status,
          statusText: err?.statusText
        });
        return [];
      }
   };

  /**
    * Construct accessible URL from service and ingress data
    */
   const constructServiceUrl = (service: KubernetesService, ingresses: any[], clusterId: string): string | undefined => {
     // For LoadBalancer services, use the external IP
     if (service.spec.type === 'LoadBalancer' && service.spec.loadBalancer?.ingress) {
       const ingress = service.spec.loadBalancer.ingress[0];
       if (ingress.hostname) {
         return `http://${ingress.hostname}:${service.spec.ports[0].port}`;
       }
       if (ingress.ip) {
         return `http://${ingress.ip}:${service.spec.ports[0].port}`;
       }
     }

     // For all other services, use localhost:8911 as default
     return 'http://localhost:8911';
   };

  /**
   * Discover services with port 8911
   */
   const discoverServices = async (store: any, clusterId: string): Promise<DetectedService[]> => {
     isLoading.value = true;
     error.value = null;

     try {
       logger.info(`Starting service discovery for cluster: ${clusterId}`);

       // Validate cluster ID
       if (!clusterId) {
         throw new Error('No cluster ID provided for service discovery');
       }

            console.log(`🔍 [ServiceDiscovery] Starting discovery for cluster: ${clusterId}`);
        const services = await queryKubernetesServices(store, clusterId);

        // Ensure services is an array
        if (!Array.isArray(services)) {
          console.error(`❌ [ServiceDiscovery] Expected services to be an array, got:`, typeof services, services);
          logger.error(`Expected services to be an array, got:`, typeof services, services);
          throw new Error('Invalid response format from Kubernetes API');
        }

        console.log(`✅ [ServiceDiscovery] Found ${services.length} total services in cluster ${clusterId}`);
        logger.info(`Found ${services.length} total services in cluster ${clusterId}`)
        const proxyServices = services.filter(service => {
          const hasCorrectPort = service.spec?.ports?.some(port => port.port === 8911);
          const serviceName = service.metadata?.name || 'unknown';
          const serviceNamespace = service.metadata?.namespace || 'unknown';

          console.log(`🔍 [ServiceDiscovery] Checking service ${serviceName} in ${serviceNamespace}: port=${hasCorrectPort}`);

          return hasCorrectPort;
        });

       logger.info(`Found ${proxyServices.length} SUSE AI UP services in cluster ${clusterId}`)

       const detected: DetectedService[] = [];

        for (const service of proxyServices) {
          try {
            const serviceName = service.metadata?.name || 'unknown';
            const serviceNamespace = service.metadata?.namespace || 'unknown';
            console.log(`🔍 [ServiceDiscovery] Processing service: ${serviceName} in ${serviceNamespace}`)

            const ingresses = await queryIngressesForService(store, clusterId, serviceName, serviceNamespace);
            const url = constructServiceUrl(service, ingresses, clusterId);
            console.log(`✅ [ServiceDiscovery] Constructed URL for ${serviceName}: ${url || 'none'}`)

            // Collect all external IPs from various sources
            const externalIPs = service.spec?.externalIPs || [];
            const loadBalancerIPs = service.spec?.loadBalancer?.ingress?.map(i => i.ip || i.hostname).filter((ip): ip is string => Boolean(ip)) || [];
            const allExternalIPs = [...externalIPs, ...loadBalancerIPs];

            detected.push({
              name: serviceName,
              namespace: serviceNamespace,
              port: 8911,
              type: service.spec?.type || 'ClusterIP',
              clusterIP: service.spec?.clusterIP,
              externalIPs: allExternalIPs.length > 0 ? allExternalIPs : undefined,
              loadBalancerIPs: loadBalancerIPs.length > 0 ? loadBalancerIPs : undefined,
              url
            });
          } catch (serviceError) {
            console.error(`❌ [ServiceDiscovery] Error processing service ${service.metadata?.name}:`, serviceError);
            // Continue with other services even if one fails
          }
        }

       logger.info(`Successfully detected ${detected.length} services`);
       detectedServices.value = detected;
      return detected;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error occurred';
      logger.error('Service discovery failed:', err);
      return [];
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Check if any services were detected
   */
  const hasDetectedServices = computed(() => detectedServices.value.length > 0);

  /**
    * Get the first detected service (prioritize localhost/clusterIP, then LoadBalancer)
    */
   const getPrimaryService = computed((): DetectedService | null => {
     if (!hasDetectedServices.value) return null;

     // Prefer services with clusterIP (localhost accessible)
     const clusterIPService = detectedServices.value.find(s => s.clusterIP && s.clusterIP !== 'None');
     if (clusterIPService) return clusterIPService;

     // Then LoadBalancer services
     const loadBalancer = detectedServices.value.find(s => s.type === 'LoadBalancer');
     if (loadBalancer) return loadBalancer;

     // Then services with constructed URLs
     const withUrl = detectedServices.value.find(s => s.url);
     if (withUrl) return withUrl;

     // Otherwise, first one
     return detectedServices.value[0];
   });

  return {
    isLoading: readonly(isLoading),
    detectedServices: readonly(detectedServices),
    error: readonly(error),
    discoverServices,
    hasDetectedServices,
    getPrimaryService
  };
}