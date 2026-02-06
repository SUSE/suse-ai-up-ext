// Service Discovery Types for cluster-wide API instance scanning

import type { DetectedService } from '../composables/useServiceDiscovery';

export interface ServiceInstance extends DetectedService {
  clusterId: string;
  clusterName: string;
  status: 'available' | 'unreachable' | 'error';
  lastChecked: string;
  responseTime?: number;
  errorMessage?: string;
}

export interface ClusterScanResult {
  clusterId: string;
  clusterName: string;
  instances: ServiceInstance[];
  error?: string;
  scanDuration: number;
  status: 'pending' | 'scanning' | 'completed' | 'failed';
}

export interface DiscoveryProgress {
  totalClusters: number;
  scannedClusters: number;
  remainingClusters: number;
  foundInstances: number;
  currentCluster?: string;
  estimatedTimeRemaining?: number;
}

export interface DiscoveryWizardState {
  currentStep: 'auth-check' | 'scanning' | 'results' | 'error';
  isAuthenticated: boolean;
  hasAdminPrivileges: boolean;
  scanResults: ClusterScanResult[];
  discoveredInstances: ServiceInstance[];
  progress: DiscoveryProgress;
  error?: string;
}

// API response types for cluster queries
export interface RancherCluster {
  id: string;
  name: string;
  nameDisplay?: string;
  state: string;
  transitioning: boolean;
  provider: string;
  ready?: boolean;
  version?: {
    gitVersion: string;
  };
}

export interface ClusterQueryResponse {
  data: RancherCluster[];
  pagination?: {
    limit: number;
    page: number;
    pages: number;
    total: number;
  };
}

// Service health check types
export interface ServiceHealthCheck {
  instance: ServiceInstance;
  isReachable: boolean;
  responseTime?: number;
  error?: string;
  lastChecked: string;
}

// Wizard action types
export type DiscoveryAction =
  | { type: 'START_SCAN' }
  | { type: 'SCAN_CLUSTER_START'; clusterId: string }
  | { type: 'SCAN_CLUSTER_SUCCESS'; clusterId: string; instances: ServiceInstance[] }
  | { type: 'SCAN_CLUSTER_ERROR'; clusterId: string; error: string }
  | { type: 'SCAN_COMPLETE' }
  | { type: 'CONNECT_TO_INSTANCE'; instance: ServiceInstance }
  | { type: 'CONFIGURE_INSTANCE'; instance: ServiceInstance }
  | { type: 'START_INSTALLATION' }
  | { type: 'RETRY_SCAN' };