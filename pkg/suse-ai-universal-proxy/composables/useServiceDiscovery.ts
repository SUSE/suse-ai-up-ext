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
      name?: string;
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
  url?: string;
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
       * Query SUSE AI pods across all namespaces (or specified namespaces)
       */
      const querySUSEAIPods = async (store: any, clusterId: string, allowedNamespaces?: string[]): Promise<KubernetesPod[]> => {
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
           throw apiError;
         }

        // Handle different response structures
        const allPods = response?.data?.items || response?.data || response?.items || [];
        console.log(`📊 [ServiceDiscovery] Extracted ${allPods.length} pods from response`);

        // Filter for SUSE AI UP pods (any container with port 8911 exposed)
        const suseAIPods = allPods.filter((pod: any) => {
          const podNamespace = pod.metadata?.namespace || '';
          const hasPort8911 = pod.spec?.containers?.some((container: any) =>
            container.ports?.some((port: any) => port.containerPort === 8911)
          );

          // Check namespace filtering if specified
          const isNamespaceAllowed = allowedNamespaces ? allowedNamespaces.includes(podNamespace) : true;
          return hasPort8911 && isNamespaceAllowed;
        });

        console.log(`🎯 [ServiceDiscovery] Found ${suseAIPods.length} SUSE AI UP pods out of ${allPods.length} total pods`);
        return suseAIPods;
      } catch (err: any) {
        logger.error('Failed to query Kubernetes pods:', err);
        throw new Error(`Unable to query cluster pods: ${err?.message || 'Unknown error'}`);
      }
    };

    /**
     * Query SUSE AI UP service across all namespaces (or specified namespaces)
     */
    const querySUSEAIService = async (store: any, clusterId: string, allowedNamespaces?: string[]): Promise<any> => {
     try {
       console.log(`🚀 [ServiceDiscovery] Querying SUSE AI UP services across all namespaces in cluster: ${clusterId}`);
       console.log(`📡 [ServiceDiscovery] API URL: /k8s/clusters/${clusterId}/api/v1/services`);

       let response;
       try {
         response = await store.dispatch('rancher/request', {
           url: `/k8s/clusters/${clusterId}/api/v1/services`,
           method: 'GET'
         });
         console.log(`✅ [ServiceDiscovery] Services list API call succeeded for cluster ${clusterId}`);
       } catch (apiError: any) {
         console.error(`❌ [ServiceDiscovery] Services list API call failed for cluster ${clusterId}:`, apiError);
         return null;
       }

        const services = response?.items || response?.data?.items || [];
        console.log(`📊 [ServiceDiscovery] Found ${services.length} total services, searching for uniproxy service`);

        // Find services with port 8911 (optionally filtered by namespaces)
        const suseAIServices = services.filter((service: any) => {
          const serviceNamespace = service.metadata?.namespace;
          const hasPort8911 = service.spec?.ports?.some((p: any) => p.port === 8911 || p.targetPort === 8911);
          const isNamespaceAllowed = allowedNamespaces ? allowedNamespaces.includes(serviceNamespace) : true;
          return hasPort8911 && isNamespaceAllowed;
        });

        console.log(`🎯 [ServiceDiscovery] Found ${suseAIServices.length} SUSE AI UP services`);

          // Return the first healthy service
          for (const service of suseAIServices) {
            const serviceName = service.metadata?.name;
            const serviceNamespace = service.metadata?.namespace;
            console.log(`🔍 [ServiceDiscovery] Checking service: ${serviceNamespace}/${serviceName}`);

            // Extract loadbalancer/external IP for health check
            const loadBalancerIP = service.status?.loadBalancer?.ingress?.[0]?.ip;
            const externalIPs = service.spec?.externalIPs || [];
            const clusterIP = service.spec?.clusterIP;

            // Try loadbalancer IP first, then external IPs, then cluster IP
            const checkIP = loadBalancerIP || externalIPs[0] || clusterIP;

            if (!checkIP || checkIP === 'None') {
              console.warn(`⚠️ [ServiceDiscovery] Service ${serviceNamespace}/${serviceName} found but no accessible IP available`);
              continue;
            }

            // Perform health check
            let isHealthy = false;
            try {
               const healthResponse = await fetch(`http://${checkIP}:8911/health`, {
                method: 'GET',
                mode: 'cors',
                headers: { 'Content-Type': 'application/json' }
              });
              isHealthy = healthResponse.ok;
              console.log(`🏥 [ServiceDiscovery] Service health check for ${serviceNamespace}/${serviceName} (${checkIP}): ${isHealthy ? 'PASS' : 'FAIL'}`);
            } catch (error) {
              console.warn(`⚠️ [ServiceDiscovery] Service health check failed for ${serviceNamespace}/${serviceName} (${checkIP}):`, error);
            }

            if (isHealthy) {
              console.log(`✅ [ServiceDiscovery] Found healthy SUSE AI UP service: ${serviceNamespace}/${serviceName} at ${checkIP}`);
              return service;
            }
          }

         console.log(`ℹ️ [ServiceDiscovery] No healthy SUSE AI UP services found`);
         return null;
     } catch (err: any) {
       logger.error('Failed to query Kubernetes services:', err);
       throw new Error(`Unable to query cluster services: ${err?.message || 'Unknown error'}`);
     }
    };

  /**
      * Validate if a service URL is healthy
      */
    const validateServiceUrl = async (url: string): Promise<boolean> => {
      try {
        const healthUrl = url.endsWith('/') ? `${url}health` : `${url}/health`
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 3000)

        const response = await fetch(healthUrl, {
          method: 'GET',
          signal: controller.signal
        })

        clearTimeout(timeoutId)
        return response.ok
      } catch {
        return false
      }
    }

   /**
      * Construct accessible URL from pod and cluster data
      * Uses Rancher Proxy URL to access the pod through the Rancher API
      */
    const constructPodUrl = (pod: KubernetesPod, clusterInfo: any, clusterId: string): string | undefined => {
      const configuredUrls = store?.state?.suseai?.settings?.serviceUrls;
      if (configuredUrls && configuredUrls.length > 0) {
        const cachedUrl = configuredUrls[0]
        if (cachedUrl.startsWith('http://') || cachedUrl.startsWith('https://')) {
          validateServiceUrl(cachedUrl).then(isHealthy => {
            if (!isHealthy) {
              console.warn('⚠️ Cached service URL is not healthy, clearing cache')
              store.dispatch('suseai/setServiceUrls', [])
            }
          })
        }
        return cachedUrl;
      }

      // Construct Rancher Proxy URL for the pod
      // Format: /k8s/clusters/<clusterId>/api/v1/namespaces/<namespace>/pods/<podName>:<port>/proxy
      if (clusterId && pod.metadata?.name && pod.metadata?.namespace) {
        const podName = pod.metadata.name;
        const namespace = pod.metadata.namespace;
        const proxyUrl = `/k8s/clusters/${clusterId}/api/v1/namespaces/${namespace}/pods/${podName}:8911/proxy`;
        
        console.log(`🔗 [ServiceDiscovery] Constructed Rancher Proxy URL: ${proxyUrl}`);
        return proxyUrl;
      }

      return undefined;
    };


  /**
    * Discover SUSE AI pods with port 8911
    */
    const discoverPods = async (store: any, clusterId: string, clusterInfo?: any): Promise<DetectedService[]> => {
     isLoading.value = true;
     error.value = null;

     try {
       logger.info(`Starting service discovery for cluster: ${clusterId}`);

       // Validate clusterId
       if (!clusterId) {
         throw new Error('No cluster ID provided for service discovery');
       }

        console.log(`🔍 [ServiceDiscovery] Starting pod discovery for cluster: ${clusterId}`);
        const pods = await querySUSEAIPods(store, clusterId);

        // Ensure pods is an array
        if (!Array.isArray(pods)) {
          throw new Error('Invalid response format from Kubernetes API');
        }

        const suseAIPods = pods.filter(pod => {
          const hasCorrectContainer = pod.spec?.containers?.some(container =>
            container.name === 'suse-ai-up' && container.ports?.some((port: any) => port.containerPort === 8911)
          );
          const podNamespace = pod.metadata?.namespace || '';
          const isInCorrectNamespace = podNamespace === 'suse-ai-up';
          return hasCorrectContainer && isInCorrectNamespace;
        });

        const detected: DetectedService[] = [];

         for (const pod of suseAIPods) {
           try {
             const podName = pod.metadata?.name || 'unknown';
             const podNamespace = pod.metadata?.namespace || 'unknown';
             const url = constructPodUrl(pod, clusterInfo, clusterId);

             // Check pod health if we have a URL
             let isHealthy = false;
             if (url) {
               isHealthy = await checkServiceHealth(url);
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
           }
         }

       detectedServices.value = detected;
       return detected;
    } catch (err: any) {
      error.value = err?.message || 'Unknown error occurred';
      return [];
    } finally {
      isLoading.value = false;
    }
  };

  /**
      * Discover SUSE AI pods with port 8911 (returns pod objects for UI)
      * Uses hybrid approach: tries service discovery first, then falls back to pod discovery
      */
  const discoverPodObjects = async (store: any, clusterId: string, allowedNamespaces?: string[]): Promise<DetectedPod[]> => {
    isLoading.value = true;
    error.value = null;

    try {
      if (!clusterId) {
        throw new Error('No cluster ID provided for pod discovery');
      }

      console.log(`🔍 [ServiceDiscovery] Starting hybrid discovery for cluster: ${clusterId}`);

      // First, try service discovery
      let detectedPods: DetectedPod[] = [];
      try {
        const service = await querySUSEAIService(store, clusterId, allowedNamespaces);
        if (service) {
          const loadBalancerIP = service.status?.loadBalancer?.ingress?.[0]?.ip;
          const clusterIP = service.spec?.clusterIP;
          const externalIPs = service.spec?.externalIPs || [];
          
          let primaryIP: string | undefined;
          const publicEndpointsAnnotation = service.metadata?.annotations?.['field.cattle.io/publicEndpoints'];
          if (publicEndpointsAnnotation) {
            try {
              const endpoints = JSON.parse(publicEndpointsAnnotation);
              if (Array.isArray(endpoints) && endpoints.length > 0) {
                primaryIP = endpoints[0]?.addresses?.[0] || '';
              }
            } catch (e) {
              console.warn(`⚠️ [ServiceDiscovery] Failed to parse service public endpoints annotation`);
            }
          }
          
          primaryIP = primaryIP || loadBalancerIP || clusterIP || externalIPs[0];
          
          // Explicitly block the invalid fallback IP
          if (primaryIP === '10.42.0.45') {
            console.log('📍 [ServiceDiscovery] Blocking invalid fallback IP 10.42.0.45');
            primaryIP = undefined;
          }

          const serviceName = service.metadata?.name;
          const serviceNamespace = service.metadata?.namespace;
          const serviceProxyUrl = `/k8s/clusters/${clusterId}/api/v1/namespaces/${serviceNamespace}/services/http:${serviceName}:8911/proxy`;

          let isHealthy = false;
          let finalUrl = '';

          if (serviceProxyUrl) {
            try {
              const healthResponse = await fetch(`${serviceProxyUrl}/health`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
              });
              if (healthResponse.ok) {
                isHealthy = true;
                finalUrl = serviceProxyUrl;
              }
            } catch (error) {
              console.warn(`⚠️ [ServiceDiscovery] Service Proxy URL check failed`);
            }
          }

          if (isHealthy) {
            const syntheticPod: DetectedPod = {
              metadata: {
                name: service.metadata?.name || 'uniproxy',
                namespace: service.metadata?.namespace || 'suse-ai-up',
                annotations: service.metadata?.annotations
              },
              spec: {
                containers: [{
                  ports: [{ containerPort: 8911, protocol: 'TCP' }]
                }]
              },
              status: {
                podIP: clusterIP,
                phase: 'Running'
              },
              primaryIP,
              clusterIP,
              externalIPs: externalIPs.length > 0 ? externalIPs : (primaryIP ? [primaryIP] : undefined),
              url: finalUrl || undefined
            };
            
            detectedPods.push(syntheticPod);
          }
        }
      } catch (serviceError: any) {
        console.warn(`⚠️ [ServiceDiscovery] Service discovery failed, falling back to pod discovery`);
      }

      // If service discovery didn't find anything, try pod discovery
      if (detectedPods.length === 0) {
        const pods = await querySUSEAIPods(store, clusterId, allowedNamespaces);

        for (const pod of pods) {
          try {
            let primaryIP: string | undefined;
            let clusterIP: string | undefined;
            let externalIPs: string[] | undefined;

            const annotations = pod.metadata?.annotations || {};
            const publicEndpointsAnnotation = annotations['field.cattle.io/publicEndpoints'];

            if (publicEndpointsAnnotation) {
              try {
                const endpoints = JSON.parse(publicEndpointsAnnotation);
                if (Array.isArray(endpoints) && endpoints.length > 0) {
                  primaryIP = endpoints[0].addresses?.[0] || endpoints[0].address;
                }
              } catch (parseError) {
                console.warn(`⚠️ [ServiceDiscovery] Failed to parse publicEndpoints annotation`);
              }
            }

            // Explicitly block the invalid fallback IP
            if (primaryIP === '10.42.0.45') {
              console.log('📍 [ServiceDiscovery] Blocking invalid fallback IP 10.42.0.45');
              primaryIP = undefined;
            }

            const url = constructPodUrl(pod, {}, clusterId);
            clusterIP = pod.status?.podIP;
            if (pod.status?.hostIP) {
              externalIPs = [pod.status.hostIP];
            }

            const detectedPod: DetectedPod = {
              ...pod,
              primaryIP,
              clusterIP,
              externalIPs,
              url
            };

            detectedPods.push(detectedPod);
          } catch (podError) {
            console.error(`❌ [ServiceDiscovery] Error processing pod`);
          }
        }
      }

      return detectedPods;
    } catch (err: any) {
      error.value = err?.message || 'Unknown error occurred';
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
         const controller = new AbortController();
         const timeoutId = setTimeout(() => controller.abort(), 5000); 

         const response = await fetch(healthUrl, {
           method: 'GET',
           mode: 'cors',
           headers: { 'Content-Type': 'application/json' },
           signal: controller.signal
         });

         clearTimeout(timeoutId);
         return response.ok;
       } catch (error) {
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
       getPrimaryService,
       checkServiceHealth
     };
}
