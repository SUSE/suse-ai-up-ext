// Service Discovery Composable
// Handles detection of SUSE AI Universal Proxy service in Kubernetes cluster

import { ref, computed, readonly } from 'vue';
import { logger } from '../utils/logger';

export interface KubernetesPod {
  metadata: {
    name: string;
    namespace: string;
    annotations?: Record<string, string>;
  };
  spec: {
    containers: Array<{
      ports?: Array<{
        containerPort: number;
        protocol: string;
      }>;
    }>;
  };
  status: {
    podIP?: string;
    hostIP?: string;
    phase: string;
    startTime?: string;
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

export interface DetectedPod extends KubernetesPod {
  primaryIP?: string;
  clusterIP?: string;
  externalIPs?: string[];
}

/**
 * Composable for discovering SUSE AI Universal Proxy service in Kubernetes
 */
export function useServiceDiscovery() {
  const isLoading = ref(false);
  const detectedServices = ref<DetectedService[]>([]);
  const error = ref<string | null>(null);

    /**
     * Query SUSE AI pods in the suse-ai-up namespace
     */
     const querySUSEAIPods = async (store: any, clusterId: string): Promise<KubernetesPod[]> => {
       try {
         console.log(`🚀 [ServiceDiscovery] Querying SUSE AI pods in cluster: ${clusterId}`);
         console.log(`📡 [ServiceDiscovery] API URL: /k8s/clusters/${clusterId}/api/v1/namespaces/suse-ai-up/pods`);

         let response;
         try {
           response = await store.dispatch('rancher/request', {
             url: `/k8s/clusters/${clusterId}/api/v1/namespaces/suse-ai-up/pods`,
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
        throw new Error(`Unable to query cluster pods: ${err?.message || 'Unknown error'}`);
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
     * Get cluster's load balancer public IP
     */
    const getClusterPublicIP = (clusterInfo: any): string | undefined => {
      // Try different possible fields for the public IP
      if (clusterInfo?.rancherKubernetesEngineConfig?.loadBalancerConfig?.publicAddress) {
        return clusterInfo.rancherKubernetesEngineConfig.loadBalancerConfig.publicAddress;
      }

      // For cloud provider clusters, the API endpoint might be the LB
      if (clusterInfo?.apiEndpoint) {
        try {
          const url = new URL(clusterInfo.apiEndpoint);
          return url.hostname;
        } catch (e) {
          // Invalid URL
        }
      }

      // Check for other possible fields
      if (clusterInfo?.status?.apiEndpoint) {
        try {
          const url = new URL(clusterInfo.status.apiEndpoint);
          return url.hostname;
        } catch (e) {
          // Invalid URL
        }
      }

      return undefined;
    };

  /**
     * Construct accessible URL from pod and cluster data
     */
    const constructPodUrl = (pod: KubernetesPod, clusterInfo: any): string | undefined => {
      // First, try to use the cluster's load balancer public IP
      const clusterPublicIP = getClusterPublicIP(clusterInfo);
      if (clusterPublicIP) {
        return `http://${clusterPublicIP}:8911`;
      }

      // Fallback: Use pod IP if available
      if (pod.status.podIP) {
        return `http://${pod.status.podIP}:8911`;
      }

      // Use host IP as fallback
      if (pod.status.hostIP) {
        return `http://${pod.status.hostIP}:8911`;
      }

      // Default fallback
      return 'http://localhost:8911';
    };

  /**
    * Discover SUSE AI pods with port 8911
    */
    const discoverPods = async (store: any, clusterId: string, clusterInfo?: any): Promise<DetectedService[]> => {
     isLoading.value = true;
     error.value = null;

     try {
       logger.info(`Starting service discovery for cluster: ${clusterId}`);

       // Validate cluster ID
       if (!clusterId) {
         throw new Error('No cluster ID provided for service discovery');
       }

             console.log(`🔍 [ServiceDiscovery] Starting pod discovery for cluster: ${clusterId}`);
        const pods = await querySUSEAIPods(store, clusterId);

        // Ensure pods is an array
        if (!Array.isArray(pods)) {
          console.error(`❌ [ServiceDiscovery] Expected pods to be an array, got:`, typeof pods, pods);
          logger.error(`Expected pods to be an array, got:`, typeof pods, pods);
          throw new Error('Invalid response format from Kubernetes API');
        }

        console.log(`✅ [ServiceDiscovery] Found ${pods.length} total pods in suse-ai-up namespace for cluster ${clusterId}`);
        logger.info(`Found ${pods.length} total pods in suse-ai-up namespace for cluster ${clusterId}`)
        const suseAIPods = pods.filter(pod => {
          const hasCorrectPort = pod.spec?.containers?.some(container =>
            container.ports?.some((port: any) => port.containerPort === 8911)
          );
          const podName = pod.metadata?.name || 'unknown';
          const podNamespace = pod.metadata?.namespace || 'unknown';

          console.log(`🔍 [ServiceDiscovery] Checking pod ${podName} in ${podNamespace}: port=${hasCorrectPort}`);

          return hasCorrectPort;
        });

       logger.info(`Found ${suseAIPods.length} SUSE AI UP pods in cluster ${clusterId}`)

        const detected: DetectedService[] = [];

         for (const pod of suseAIPods) {
           try {
             const podName = pod.metadata?.name || 'unknown';
             const podNamespace = pod.metadata?.namespace || 'unknown';
             console.log(`🔍 [ServiceDiscovery] Processing pod: ${podName} in ${podNamespace}`)

             const url = constructPodUrl(pod, clusterInfo);
             console.log(`✅ [ServiceDiscovery] Constructed URL for ${podName}: ${url || 'none'}`)

             // Check pod health if we have a URL
             let isHealthy = false;
             if (url) {
               isHealthy = await checkServiceHealth(url);
               console.log(`🏥 [ServiceDiscovery] Health check for ${podName}: ${isHealthy ? 'PASS' : 'FAIL'}`);
             }

             // Only include healthy pods
             if (isHealthy) {
               detected.push({
                 name: podName,
                 namespace: podNamespace,
                 port: 8911,
                 type: 'Pod',
                 clusterIP: pod.status?.podIP,
                 externalIPs: pod.status?.hostIP ? [pod.status.hostIP] : undefined,
                 loadBalancerIPs: undefined,
                 url
               });
             }
           } catch (podError) {
             console.error(`❌ [ServiceDiscovery] Error processing pod ${pod.metadata?.name}:`, podError);
             // Continue with other pods even if one fails
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
   * Discover SUSE AI pods with port 8911 (returns pod objects for UI)
   */
  const discoverPodObjects = async (store: any, clusterId: string): Promise<DetectedPod[]> => {
    isLoading.value = true;
    error.value = null;

    try {
      logger.info(`Starting pod object discovery for cluster: ${clusterId}`);

      // Validate cluster ID
      if (!clusterId) {
        throw new Error('No cluster ID provided for pod discovery');
      }

      console.log(`🔍 [ServiceDiscovery] Starting pod object discovery for cluster: ${clusterId}`);
      const pods = await querySUSEAIPods(store, clusterId);

      // Ensure pods is an array
      if (!Array.isArray(pods)) {
        console.error(`❌ [ServiceDiscovery] Expected pods to be an array, got:`, typeof pods, pods);
        logger.error(`Expected pods to be an array, got:`, typeof pods, pods);
        throw new Error('Invalid response format from Kubernetes API');
      }

      console.log(`✅ [ServiceDiscovery] Found ${pods.length} total pods in suse-ai-up namespace for cluster ${clusterId}`);
      logger.info(`Found ${pods.length} total pods in suse-ai-up namespace for cluster ${clusterId}`)

      const suseAIPods = pods.filter(pod => {
        const hasCorrectPort = pod.spec?.containers?.some(container =>
          container.ports?.some((port: any) => port.containerPort === 8911)
        );
        const podName = pod.metadata?.name || 'unknown';
        const podNamespace = pod.metadata?.namespace || 'unknown';

        console.log(`🔍 [ServiceDiscovery] Checking pod ${podName} in ${podNamespace}: port=${hasCorrectPort}`);

        return hasCorrectPort;
      });

      logger.info(`Found ${suseAIPods.length} SUSE AI UP pods in cluster ${clusterId}`)

      const detectedPods: DetectedPod[] = [];

      for (const pod of suseAIPods) {
        try {
          const podName = pod.metadata?.name || 'unknown';
          const podNamespace = pod.metadata?.namespace || 'unknown';
          console.log(`🔍 [ServiceDiscovery] Processing pod: ${podName} in ${podNamespace}`)

          // Extract primary IP from annotations (field.cattle.io/publicEndpoints)
          let primaryIP: string | undefined;
          let clusterIP: string | undefined;
          let externalIPs: string[] | undefined;

          // Check annotations for public endpoints
          const annotations = pod.metadata?.annotations || {};
          const publicEndpointsAnnotation = annotations['field.cattle.io/publicEndpoints'];

          if (publicEndpointsAnnotation) {
            try {
              const endpoints = JSON.parse(publicEndpointsAnnotation);
              if (Array.isArray(endpoints) && endpoints.length > 0) {
                // Use the first endpoint's address
                primaryIP = endpoints[0].addresses?.[0] || endpoints[0].address;
                console.log(`✅ [ServiceDiscovery] Extracted primary IP from annotations: ${primaryIP}`);
              }
            } catch (parseError) {
              console.warn(`⚠️ [ServiceDiscovery] Failed to parse publicEndpoints annotation:`, parseError);
            }
          }

          // Fallback to pod IP if no annotation
          if (!primaryIP) {
            primaryIP = pod.status?.podIP;
            console.log(`📍 [ServiceDiscovery] Using pod IP as primary IP: ${primaryIP}`);
          }

          clusterIP = pod.status?.podIP;
          if (pod.status?.hostIP) {
            externalIPs = [pod.status.hostIP];
          }

          const detectedPod: DetectedPod = {
            ...pod,
            primaryIP,
            clusterIP,
            externalIPs
          };

          detectedPods.push(detectedPod);
          console.log(`✅ [ServiceDiscovery] Added pod ${podName} with primaryIP: ${primaryIP}`);

        } catch (podError) {
          console.error(`❌ [ServiceDiscovery] Error processing pod ${pod.metadata?.name}:`, podError);
          // Continue with other pods even if one fails
        }
      }

      logger.info(`Successfully detected ${detectedPods.length} pod objects`);
      return detectedPods;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error occurred';
      logger.error('Pod object discovery failed:', err);
      return [];
    } finally {
      isLoading.value = false;
    }
  };

  /**
     * Check service health by trying to connect to /health endpoint
     */
  const checkServiceHealth = async (url: string): Promise<boolean> => {
    try {
      const healthUrl = url.endsWith('/') ? `${url}health` : `${url}/health`;
      console.log(`🔍 [ServiceDiscovery] Checking health at: ${healthUrl}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(healthUrl, {
        method: 'GET',
        mode: 'no-cors', // Allow cross-origin requests
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      console.log(`✅ [ServiceDiscovery] Health check response:`, response);
      return true; // If we get any response, consider it healthy
    } catch (error) {
      console.warn(`⚠️ [ServiceDiscovery] Health check failed for ${url}:`, error);
      return false;
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
      discoverPods,
      discoverPodObjects,
      hasDetectedServices,
      getPrimaryService
    };
}