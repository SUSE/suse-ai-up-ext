// Service Discovery Composable
// Handles detection of SUSE AI Universal Proxy service in Kubernetes cluster

import { ref, computed, readonly } from 'vue';
import { logger } from '../utils/logger';
import { useStore } from 'vuex';

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
  const store = useStore();
  const isLoading = ref(false);
  const detectedServices = ref<DetectedService[]>([]);
  const error = ref<string | null>(null);

     /**
      * Query SUSE AI pods across all namespaces
      */
     const querySUSEAIPods = async (store: any, clusterId: string): Promise<KubernetesPod[]> => {
       try {
         console.log(`🚀 [ServiceDiscovery] Querying SUSE AI pods across all namespaces in cluster: ${clusterId}`);
         console.log(`📡 [ServiceDiscovery] API URL: /k8s/clusters/${clusterId}/api/v1/pods`);

         let response;
         try {
           response = await store.dispatch('rancher/request', {
             url: `/k8s/clusters/${clusterId}/api/v1/pods`,
             method: 'GET'
           });
           console.log(`✅ [ServiceDiscovery] Pods list API call succeeded for cluster ${clusterId}`);
         } catch (apiError: any) {
           console.error(`❌ [ServiceDiscovery] Pods list API call failed for cluster ${clusterId}:`, apiError);
           console.error(`❌ [ServiceDiscovery] Error details:`, {
             message: apiError?.message,
             status: apiError?.status,
             statusText: apiError?.statusText,
             response: apiError?.response
           });
           throw apiError;
         }

         console.log('🔍 [ServiceDiscovery] Kubernetes pods response structure:', {
           hasData: !!response?.data,
           dataType: typeof response?.data,
           hasItems: !!response?.items,
           responseKeys: response ? Object.keys(response) : [],
           dataKeys: response?.data ? Object.keys(response.data) : [],
           fullResponse: response
         });

        // Handle different response structures (following AppWizard.vue pattern)
        const allPods = response?.data?.items || response?.data || response?.items || [];
        console.log(`📊 [ServiceDiscovery] Extracted ${allPods.length} pods from response`);

        // Filter for SUSE AI UP pods (name starts with 'suse-ai-up' and has port 8913)
        const suseAIPods = allPods.filter((pod: any) => {
          const podName = pod.metadata?.name || '';
          const hasCorrectPort = pod.spec?.containers?.some((container: any) =>
            container.ports?.some((port: any) => port.containerPort === 8913)
          );
          const isSuseAIPod = podName.startsWith('suse-ai-up');
          
          if (isSuseAIPod) {
            console.log(`🔍 [ServiceDiscovery] Checking pod ${podName}: port=${hasCorrectPort}, name=${isSuseAIPod}`);
          }
          
          return hasCorrectPort && isSuseAIPod;
        });

        console.log(`🎯 [ServiceDiscovery] Found ${suseAIPods.length} SUSE AI UP pods out of ${allPods.length} total pods`);
        logger.info(`Found ${suseAIPods.length} SUSE AI UP pods in cluster ${clusterId}`);
        return suseAIPods;
      } catch (err: any) {
        logger.error('Failed to query Kubernetes pods:', err);
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
    * Query SUSE AI UP service across all namespaces
    */
   const querySUSEAIService = async (store: any, clusterId: string): Promise<any> => {
     try {
       console.log(`🚀 [ServiceDiscovery] Querying SUSE AI UP services across all namespaces in cluster: ${clusterId}`);
       console.log(`📡 [ServiceDiscovery] API URL: /k8s/clusters/${clusterId}/v1/services`);

       let response;
       try {
         response = await store.dispatch('rancher/request', {
           url: `/k8s/clusters/${clusterId}/v1/services`,
           method: 'GET'
         });
         console.log(`✅ [ServiceDiscovery] Services list API call succeeded for cluster ${clusterId}`);
       } catch (apiError: any) {
         console.error(`❌ [ServiceDiscovery] Services list API call failed for cluster ${clusterId}:`, apiError);
         console.error(`❌ [ServiceDiscovery] Full error details:`, {
           message: apiError?.message,
           status: apiError?.status,
           statusText: apiError?.statusText,
           response: apiError?.response,
           responseStatus: apiError?.response?.status,
           responseText: apiError?.response?.statusText,
           responseData: apiError?.response?.data
         });
         
         // For any errors, try pod discovery as fallback
         console.warn(`⚠️ [ServiceDiscovery] Service discovery failed, trying pod discovery as fallback`);
         return null;
       }

       const servicesData = response?.data;
       if (servicesData && servicesData.items) {
         const services = servicesData.items;
         console.log(`📊 [ServiceDiscovery] Found ${services.length} total services, searching for suse-ai-up`);

          // Find services named 'suse-ai-up' with port 8913
          const suseAIServices = services.filter((service: any) => {
            const serviceName = service.metadata?.name;
            const hasPort8913 = service.spec?.ports?.some((p: any) => p.port === 8913 || p.targetPort === 8913);
            return serviceName === 'suse-ai-up' && hasPort8913;
          });

         console.log(`🎯 [ServiceDiscovery] Found ${suseAIServices.length} SUSE AI UP services`);

         // Return the first healthy service
         for (const service of suseAIServices) {
           const serviceName = service.metadata?.name;
           const serviceNamespace = service.metadata?.namespace;
           console.log(`🔍 [ServiceDiscovery] Checking service: ${serviceNamespace}/${serviceName}`);

           // Get the service IP
           const serviceIP = service.spec?.clusterIP;
           if (!serviceIP || serviceIP === 'None') {
             console.warn(`⚠️ [ServiceDiscovery] Service ${serviceNamespace}/${serviceName} found but no cluster IP available`);
             continue;
           }

           // Perform health check
           let isHealthy = false;
           try {
              const healthResponse = await fetch(`http://${serviceIP}:8913/health`, {
               method: 'GET',
               mode: 'cors',
               headers: { 'Content-Type': 'application/json' }
             });
             isHealthy = healthResponse.ok;
             console.log(`🏥 [ServiceDiscovery] Service health check for ${serviceNamespace}/${serviceName} (${serviceIP}): ${isHealthy ? 'PASS' : 'FAIL'}`);
           } catch (error) {
             console.warn(`⚠️ [ServiceDiscovery] Service health check failed for ${serviceNamespace}/${serviceName} (${serviceIP}):`, error);
           }

           if (isHealthy) {
             console.log(`✅ [ServiceDiscovery] Found healthy SUSE AI UP service: ${serviceNamespace}/${serviceName}`);
             return service;
           }
         }

         console.log(`ℹ️ [ServiceDiscovery] No healthy SUSE AI UP services found`);
       }

       return null;
     } catch (err: any) {
       logger.error('Failed to query Kubernetes services:', err);
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
      // First, check if service URLs are configured
      const configuredUrls = store.state.suseai?.settings?.serviceUrls;
      if (configuredUrls && configuredUrls.length > 0) {
        return configuredUrls[0]; // Use the first configured service URL
      }

      // First, try to use the cluster's load balancer public IP
      const clusterPublicIP = getClusterPublicIP(clusterInfo);
      if (clusterPublicIP) {
        return `http://${clusterPublicIP}:8913`;
      }

      // Fallback: Use pod IP if available
      if (pod.status.podIP) {
        return `http://${pod.status.podIP}:8913`;
      }

      // Use host IP as fallback
      if (pod.status.hostIP) {
        return `http://${pod.status.hostIP}:8913`;
      }

      // Default fallback
      return 'http://localhost:8913';
    };

  /**
    * Discover SUSE AI pods with port 8913
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

         console.log(`✅ [ServiceDiscovery] Found ${pods.length} SUSE AI UP pods across all namespaces for cluster ${clusterId}`);
         logger.info(`Found ${pods.length} SUSE AI UP pods across all namespaces for cluster ${clusterId}`)
          const suseAIPods = pods.filter(pod => {
           const hasCorrectPort = pod.spec?.containers?.some(container =>
             container.ports?.some((port: any) => port.containerPort === 8913)
           );
          const podName = pod.metadata?.name || 'unknown';
          const podNamespace = pod.metadata?.namespace || 'unknown';
          const isSuseAIPod = podName.startsWith('suse-ai-up');

          console.log(`🔍 [ServiceDiscovery] Checking pod ${podName} in ${podNamespace}: port=${hasCorrectPort}, name=${isSuseAIPod}`);

          return hasCorrectPort && isSuseAIPod;
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
                  port: 8913,
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
    * Discover SUSE AI pods with port 8913 (returns pod objects for UI)
    * Uses hybrid approach: tries service discovery first, then falls back to pod discovery
    */
  const discoverPodObjects = async (store: any, clusterId: string): Promise<DetectedPod[]> => {
    isLoading.value = true;
    error.value = null;

    try {
      logger.info(`Starting hybrid service/pod discovery for cluster: ${clusterId}`);

      // Validate cluster ID
      if (!clusterId) {
        throw new Error('No cluster ID provided for pod discovery');
      }

      console.log(`🔍 [ServiceDiscovery] Starting hybrid discovery for cluster: ${clusterId}`);

      // First, try service discovery (like APIDiscoveryWizard)
      let detectedPods: DetectedPod[] = [];
      try {
        const service = await querySUSEAIService(store, clusterId);
        if (service) {
          console.log(`✅ [ServiceDiscovery] Service discovery successful, creating pod object from service`);
          
          // Extract service information like APIDiscoveryWizard
          const loadBalancerIP = service.status?.loadBalancer?.ingress?.[0]?.ip;
          const clusterIP = service.spec?.clusterIP;
          const externalIPs = service.spec?.externalIPs || [];
          
          // Extract public IP from Rancher annotations
          let primaryIP: string | undefined;
          const publicEndpointsAnnotation = service.metadata?.annotations?.['field.cattle.io/publicEndpoints'];
          if (publicEndpointsAnnotation) {
            try {
              const endpoints = JSON.parse(publicEndpointsAnnotation);
              if (Array.isArray(endpoints) && endpoints.length > 0) {
                primaryIP = endpoints[0]?.addresses?.[0] || '';
                console.log(`✅ [ServiceDiscovery] Extracted primary IP from service annotations: ${primaryIP}`);
              }
            } catch (e) {
              console.warn(`⚠️ [ServiceDiscovery] Failed to parse service public endpoints annotation:`, e);
            }
          }
          
          // Determine primary IP (prefer public IP from annotations, fallback to service IPs)
          primaryIP = primaryIP || loadBalancerIP || clusterIP || externalIPs[0];
          
          // Perform health check if we have an IP
          let isHealthy = false;
          if (primaryIP) {
            try {
              const healthResponse = await fetch(`http://${primaryIP}:8913/health`, {
                method: 'GET',
                mode: 'cors',
                headers: { 'Content-Type': 'application/json' }
              });
              isHealthy = healthResponse.ok;
              console.log(`🏥 [ServiceDiscovery] Service health check for ${primaryIP}: ${isHealthy ? 'PASS' : 'FAIL'}`);
            } catch (error) {
              console.warn(`⚠️ [ServiceDiscovery] Service health check failed for ${primaryIP}:`, error);
            }
          }
          
          if (isHealthy) {
            // Create a synthetic pod object from service
            const syntheticPod: DetectedPod = {
              metadata: {
                name: service.metadata?.name || 'suse-ai-up-service',
                namespace: service.metadata?.namespace || 'suse-ai-up',
                annotations: service.metadata?.annotations
              },
              spec: {
                containers: [{
                  ports: [{ containerPort: 8913, protocol: 'TCP' }]
                }]
              },
              status: {
                podIP: clusterIP,
                phase: 'Running'
              },
              primaryIP,
              clusterIP,
              externalIPs: externalIPs.length > 0 ? externalIPs : (primaryIP ? [primaryIP] : undefined)
            };
            
            detectedPods.push(syntheticPod);
            console.log(`✅ [ServiceDiscovery] Successfully created pod object from service`);
          }
        }
      } catch (serviceError: any) {
        console.warn(`⚠️ [ServiceDiscovery] Service discovery failed, falling back to pod discovery:`, serviceError?.message);
      }

      // If service discovery didn't find anything, try pod discovery
      if (detectedPods.length === 0) {
        console.log(`🔄 [ServiceDiscovery] Service discovery found nothing, trying pod discovery`);
        const pods = await querySUSEAIPods(store, clusterId);

        // Ensure pods is an array
        if (!Array.isArray(pods)) {
          console.error(`❌ [ServiceDiscovery] Expected pods to be an array, got:`, typeof pods, pods);
          logger.error(`Expected pods to be an array, got:`, typeof pods, pods);
          throw new Error('Invalid response format from Kubernetes API');
        }

         // Pods are already filtered by querySUSEAIPods to only include SUSE AI UP pods
         const suseAIPods = pods;
         logger.info(`Processing ${suseAIPods.length} SUSE AI UP pods in cluster ${clusterId}`)

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
                  // Use first endpoint's address
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