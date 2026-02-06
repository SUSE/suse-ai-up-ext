// Cluster Discovery Composable
// Orchestrates scanning multiple clusters for SUSE AI Universal Proxy services

import { ref, readonly, computed } from 'vue';
import { useServiceDiscovery } from './useServiceDiscovery';
import type { ServiceInstance, ClusterScanResult, DiscoveryProgress, RancherCluster } from '../types/service-discovery';

export function useClusterDiscovery() {
  const isScanning = ref(false);
  const scanResults = ref<ClusterScanResult[]>([]);
  const discoveredInstances = ref<ServiceInstance[]>([]);
  const progress = ref<DiscoveryProgress>({
    totalClusters: 0,
    scannedClusters: 0,
    remainingClusters: 0,
    foundInstances: 0,
    currentCluster: undefined,
    estimatedTimeRemaining: undefined
  });
  const error = ref<string | null>(null);
  const failedClusters = ref<RancherCluster[]>([]);
  const successfulClusters = ref<RancherCluster[]>([]);

  /**
   * Discover services across multiple clusters
   */
  const discoverClusters = async (store: any, clusterNames: string[]): Promise<void> => {
    if (isScanning.value) return;

    isScanning.value = true;
    error.value = null;
    scanResults.value = [];
    discoveredInstances.value = [];
    failedClusters.value = [];
    successfulClusters.value = [];

    progress.value = {
      totalClusters: clusterNames.length,
      scannedClusters: 0,
      remainingClusters: clusterNames.length,
      foundInstances: 0,
      currentCluster: undefined,
      estimatedTimeRemaining: undefined
    };

    const startTime = Date.now();

    try {
      for (let i = 0; i < clusterNames.length; i++) {
        const clusterName = clusterNames[i];
        progress.value.currentCluster = clusterName;
        progress.value.scannedClusters = i;
        progress.value.remainingClusters = clusterNames.length - i;

        // Estimate time remaining (rough estimate: 2-5 seconds per cluster)
        const elapsed = Date.now() - startTime;
        const avgTimePerCluster = elapsed / (i + 1);
        progress.value.estimatedTimeRemaining = Math.ceil((clusterNames.length - i - 1) * avgTimePerCluster / 1000);

        try {
          console.log(`🔍 [ClusterDiscovery] Scanning cluster: ${clusterName}`);

          // Get cluster info for metadata using name query
          const clusterInfo = await getClusterInfo(store, clusterName);
          if (!clusterInfo) {
            console.warn(`⚠️ [ClusterDiscovery] Could not get info for cluster: ${clusterName}`);
            failedClusters.value.push({ id: clusterName, name: clusterName } as RancherCluster);
            continue;
          }

          // Use pod discovery for this cluster with the resolved cluster ID
          const { discoverPods } = useServiceDiscovery();
          const detectedServices = await discoverPods(store, clusterInfo.id, clusterInfo);

          console.log(`✅ [ClusterDiscovery] Found ${detectedServices.length} services in cluster ${clusterName}`);

          // Convert detected services to service instances
          const instances: ServiceInstance[] = detectedServices.map(service => ({
            clusterId: clusterInfo.id,
            clusterName: clusterInfo.nameDisplay || clusterInfo.name || clusterName,
            name: service.name,
            namespace: service.namespace,
            port: service.port,
            type: service.type,
            clusterIP: service.clusterIP,
            externalIPs: service.externalIPs,
            loadBalancerIPs: service.loadBalancerIPs,
            url: service.url,
            status: 'available' as const,
            lastChecked: new Date().toISOString()
          }));

          // Add to results
          const scanResult: ClusterScanResult = {
            clusterId: clusterInfo.id,
            clusterName: clusterInfo.nameDisplay || clusterInfo.name || clusterName,
            instances,
            scanDuration: Date.now() - startTime,
            status: 'completed'
          };

          scanResults.value.push(scanResult);
          discoveredInstances.value.push(...instances);
          successfulClusters.value.push(clusterInfo);
          progress.value.foundInstances += instances.length;

          console.log(`✅ [ClusterDiscovery] Completed scanning cluster ${clusterName}: ${instances.length} instances found`);

        } catch (clusterError: any) {
          console.error(`❌ [ClusterDiscovery] Failed to scan cluster ${clusterName}:`, clusterError);

          const failedResult: ClusterScanResult = {
            clusterId: clusterName,
            clusterName: clusterName,
            instances: [],
            error: clusterError.message || 'Unknown error',
            scanDuration: Date.now() - startTime,
            status: 'failed'
          };

          scanResults.value.push(failedResult);
          failedClusters.value.push({ id: clusterName, name: clusterName } as RancherCluster);
        }
      }

      progress.value.scannedClusters = clusterNames.length;
      progress.value.remainingClusters = 0;
      progress.value.currentCluster = undefined;
      progress.value.estimatedTimeRemaining = undefined;

      console.log(`🎉 [ClusterDiscovery] Discovery completed: ${discoveredInstances.value.length} total instances found across ${successfulClusters.value.length} clusters`);

    } catch (err: any) {
      error.value = err.message || 'Failed to discover clusters';
      console.error('❌ [ClusterDiscovery] Discovery failed:', err);
    } finally {
      isScanning.value = false;
    }
  };

  /**
   * Get cluster information from Rancher using cluster name
   */
  const getClusterInfo = async (store: any, clusterName: string): Promise<RancherCluster | null> => {
    try {
      const response = await store.dispatch('rancher/request', {
        url: `/v3/clusters?name=${encodeURIComponent(clusterName)}`,
        method: 'GET'
      });

      // The response should contain an array with one cluster object
      const clusters = response?.data || [];
      if (Array.isArray(clusters) && clusters.length > 0) {
        return clusters[0];
      }

      console.warn(`No cluster found with name: ${clusterName}`);
      return null;
    } catch (err) {
      console.warn(`Failed to get cluster info for ${clusterName}:`, err);
      return null;
    }
  };

  /**
   * Retry failed cluster scans
   */
  const retryFailedScans = async (store: any): Promise<void> => {
    if (failedClusters.value.length === 0) return;

    const failedClusterIds = failedClusters.value.map(c => c.id);
    failedClusters.value = [];

    await discoverClusters(store, failedClusterIds);
  };

  /**
   * Check if any instances were discovered
   */
  const hasDiscoveredInstances = readonly(() => discoveredInstances.value.length > 0);

  /**
   * Get scan completion percentage
   */
  const scanCompletionPercentage = computed(() => {
    if (progress.value.totalClusters === 0) return 0;
    return Math.round((progress.value.scannedClusters / progress.value.totalClusters) * 100);
  });

  /**
   * Get accessible clusters from Rancher management API
   */
  const getAccessibleClusters = async (store?: any): Promise<RancherCluster[]> => {
    try {
      console.log('🔍 [ClusterDiscovery] Fetching accessible clusters...');

      // Use the store if provided, otherwise try to access it from Vue context
      const storeInstance = store || (window as any).__VUE__?.config?.globalProperties?.$store;

      if (!storeInstance) {
        console.warn('⚠️ [ClusterDiscovery] No store available for cluster discovery');
        return [];
      }

      // Fetch clusters from Rancher management API
      const response = await storeInstance.dispatch('rancher/request', {
        url: '/v3/clusters',
        method: 'GET'
      });

      const clusters = response?.data || [];
      console.log(`✅ [ClusterDiscovery] Found ${clusters.length} accessible clusters`);

      // Filter for clusters that are connected/active
      const accessibleClusters = clusters.filter((cluster: any) =>
        cluster.state === 'active' || cluster.status?.conditions?.some((c: any) => c.type === 'Ready' && c.status === 'True')
      );

      console.log(`✅ [ClusterDiscovery] Found ${accessibleClusters.length} active/connected clusters`);

      // Log cluster details for debugging
      accessibleClusters.forEach((cluster: any, index: number) => {
        console.log(`   Cluster ${index + 1}: ${cluster.nameDisplay || cluster.name} (${cluster.id}) - State: ${cluster.state}`);
      });

      return accessibleClusters;
    } catch (error) {
      console.error('❌ [ClusterDiscovery] Failed to fetch accessible clusters:', error);
      return [];
    }
  };

  return {
    isScanning: readonly(isScanning),
    scanResults: readonly(scanResults),
    discoveredInstances: readonly(discoveredInstances),
    progress: readonly(progress),
    error: readonly(error),
    failedClusters: readonly(failedClusters),
    successfulClusters: readonly(successfulClusters),
    discoverClusters,
    retryFailedScans,
    hasDiscoveredInstances,
    scanCompletionPercentage,
    getAccessibleClusters
  };
}