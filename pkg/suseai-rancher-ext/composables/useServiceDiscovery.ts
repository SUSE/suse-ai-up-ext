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
  externalIPs?: string[];
  loadBalancerIPs?: string[];
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
      const response = await store.dispatch('cluster/request', {
        url: `/k8s/clusters/${clusterId}/api/v1/services`,
        method: 'GET'
      });

      return response.data.items || [];
    } catch (err) {
      logger.error('Failed to query Kubernetes services:', err);
      throw new Error('Unable to query cluster services');
    }
  };

  /**
   * Query ingresses that point to a specific service
   */
  const queryIngressesForService = async (store: any, clusterId: string, serviceName: string, namespace: string): Promise<any[]> => {
    try {
      const response = await store.dispatch('cluster/request', {
        url: `/k8s/clusters/${clusterId}/apis/networking.k8s.io/v1/ingresses`,
        method: 'GET'
      });

      const ingresses = response.data.items || [];
      return ingresses.filter((ingress: any) => {
        const rules = ingress.spec?.rules || [];
        return rules.some((rule: any) => {
          const paths = rule.http?.paths || [];
          return paths.some((path: any) => {
            return path.backend?.service?.name === serviceName &&
                   ingress.metadata.namespace === namespace;
          });
        });
      });
    } catch (err) {
      logger.warn('Failed to query ingresses:', err);
      return [];
    }
  };

  /**
   * Construct accessible URL from service and ingress data
   */
  const constructServiceUrl = (service: KubernetesService, ingresses: any[]): string | undefined => {
    // Check for LoadBalancer external IPs
    if (service.spec.type === 'LoadBalancer' && service.spec.loadBalancer?.ingress) {
      const ingress = service.spec.loadBalancer.ingress[0];
      if (ingress.hostname) {
        return `http://${ingress.hostname}:${service.spec.ports[0].port}`;
      }
      if (ingress.ip) {
        return `http://${ingress.ip}:${service.spec.ports[0].port}`;
      }
    }

    // Check for external IPs
    if (service.spec.externalIPs && service.spec.externalIPs.length > 0) {
      return `http://${service.spec.externalIPs[0]}:${service.spec.ports[0].port}`;
    }

    // Check for ingress hosts
    if (ingresses.length > 0) {
      const ingress = ingresses[0];
      const host = ingress.spec?.rules?.[0]?.host;
      if (host) {
        // Assume HTTPS if TLS is configured
        const protocol = ingress.spec?.tls ? 'https' : 'http';
        return `${protocol}://${host}`;
      }
    }

    // Fallback to cluster IP (won't work from browser, but for detection)
    if (service.spec.clusterIP && service.spec.clusterIP !== 'None') {
      return `http://${service.spec.clusterIP}:${service.spec.ports[0].port}`;
    }

    return undefined;
  };

  /**
   * Discover services with port 8911
   */
  const discoverServices = async (store: any, clusterId: string): Promise<DetectedService[]> => {
    isLoading.value = true;
    error.value = null;

    try {
      const services = await queryKubernetesServices(store, clusterId);

      const proxyServices = services.filter(service =>
        service.spec.ports?.some(port => port.port === 8911)
      );

      const detected: DetectedService[] = [];

      for (const service of proxyServices) {
        const ingresses = await queryIngressesForService(store, clusterId, service.metadata.name, service.metadata.namespace);
        const url = constructServiceUrl(service, ingresses);

        detected.push({
          name: service.metadata.name,
          namespace: service.metadata.namespace,
          port: 8911,
          type: service.spec.type,
          clusterIP: service.spec.clusterIP,
          externalIPs: service.spec.externalIPs,
          loadBalancerIPs: service.spec.loadBalancer?.ingress?.map(i => i.ip || i.hostname).filter((ip): ip is string => Boolean(ip)),
          url
        });
      }

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
   * Get the first detected service (prioritize LoadBalancer, then with URL)
   */
  const getPrimaryService = computed((): DetectedService | null => {
    if (!hasDetectedServices.value) return null;

    // Prefer LoadBalancer services
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