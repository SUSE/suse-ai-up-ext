// Cluster Resources service

export class ClusterResourcesService {
  // Stub
}

export function getAllClusterResourceMetrics(store: any): Promise<ClusterResourceSummary[]> { return Promise.resolve([]); }
export function checkAppCompatibility(appSlug: string, cluster: ClusterResourceSummary, appName: string): Promise<boolean> { return Promise.resolve(true); }
export function getAppResourceRequirements(appSlug: string): { requirements: any } | null { return null; }
export function getDefaultAppResourceRequirements(appSlug: string, appName: string): { requirements: any } { return { requirements: {} }; }

export interface ClusterResourceSummary {
  clusterId: string;
  name: string;
  status: string;
  statusMessage?: string;
  nodeCount: number;
  compatible?: boolean;
  resources: {
    cpu: { used: number; total: number; };
    memory: { used: number; total: number; };
    gpu?: { used: number; total: number; };
  };
}