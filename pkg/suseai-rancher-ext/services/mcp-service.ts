// MCP Service

import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:8911',
  timeout: 10000,
});

export interface AdapterData {
  id: string;
  name: string;
  imageName: string;
  imageVersion: string;
  description: string;
  connectionType: string;
  protocol: string;
  replicaCount: number;
  useWorkloadIdentity: boolean;
  environmentVariables?: Record<string, string>;
  originalServer?: DiscoveredServer;
}

export interface ScanConfig {
  maxConcurrent: string | number;
  timeout: string | number;
  scanRanges: string[];
  ports: (string | number)[];
  security_test?: boolean;
  security_rules?: string; // Changed from security_rules_file to match backend API
}

export interface ScanResult {
  scan_id: string;
  status: 'running' | 'completed' | 'failed';
  discovered_servers?: DiscoveredServer[];
  security_summary?: {
    total_servers: number;
    servers_with_findings: number;
    critical_findings: number;
    warning_findings: number;
  };
  error?: string;
}

export interface AdapterResource {
  id: string;
  name: string;
  status: string;
  protocol: string;
  endpoint: string;
  createdAt: string;
  lastActive?: string;
  errorCount?: number;
  requestCount?: number;
  imageName?: string;
  imageVersion?: string;
  description?: string;
  connectionType?: string;
  replicaCount?: number;
  useWorkloadIdentity?: boolean;
  lastUpdatedAt?: string;
  originalServer?: DiscoveredServer;
}



export interface DiscoveredServer {
  id: string;
  address: string;
  protocol: string;
  connection: string;
  status: string;
  lastSeen: string;
  port?: number;
  discoveredAt?: string;
  vulnerability_score?: 'high' | 'medium' | 'low';
  scan_results?: any;
  name?: string;
  metadata?: {
    auth_type?: string;
  };
  security_findings?: any[]; // Will be defined by backend API
}

export interface RegistryServer {
  _meta?: Record<string, any>;
  id: string;
  name: string;
  description: string;
  version: string;
  protocol: string;
  url: string;
  validation_status: string;
  discovered_at: string;
  iconurl?: string;
  repository?: {
    source: string;
    url: string;
  };
  packages: RegistryPackage[];
  tools: RegistryTool[];
}

export interface RegistryPackage {
  identifier: string;
  registryType: string;
  transport: {
    type: string;
  };
  environmentVariables?: RegistryEnvironmentVariable[];
}

export interface RegistryEnvironmentVariable {
  name: string;
  description: string;
  default: string;
  format: string;
  isSecret: boolean;
}

export interface RegistryTool {
  name: string;
  description: string;
  input_schema: Record<string, any>;
}

export class MCPService {
  static async createAdapter(data: AdapterData) {
    try {
      const response = await apiClient.post('/adapters', data);
      return response.data;
    } catch (error) {
      console.error('Failed to create adapter:', error);
      throw error;
    }
  }

  static async registerDiscoveredServer(serverId: string) {
    try {
      const response = await apiClient.post('/register', { DiscoveredServerId: serverId });
      return response.data;
    } catch (error) {
      console.error('Failed to register discovered server:', error);
      throw error;
    }
  }

  static async startScan(config: ScanConfig): Promise<ScanResult> {
    try {
      const response = await apiClient.post('/scan', config);
      return response.data;
    } catch (error) {
      console.error('Failed to start scan:', error);
      throw error;
    }
  }

  static async getScanStatus(scanId: string): Promise<ScanResult> {
    try {
      const response = await apiClient.get(`/scan/${scanId}/status`);
      return response.data;
    } catch (error) {
      console.error('Failed to get scan status:', error);
      throw error;
    }
  }

  static async getScanResults(scanId: string): Promise<ScanResult> {
    try {
      const response = await apiClient.get(`/scan/${scanId}/results`);
      return response.data;
    } catch (error) {
      console.error('Failed to get scan results:', error);
      throw error;
    }
  }

  static async getAdapters(): Promise<AdapterResource[]> {
    try {
      const response = await apiClient.get('/adapters');
      return response.data || [];
    } catch (error) {
      console.error('Failed to fetch adapters:', error);
      return [];
    }
  }

  static async getDiscoveredServers(): Promise<DiscoveredServer[]> {
    try {
      const response = await apiClient.get('/servers');
      return response.data || [];
    } catch (error) {
      console.error('Failed to fetch discovered servers:', error);
      return [];
    }
  }

  static async getAdapterLogs(id: string): Promise<string> {
    try {
      const response = await apiClient.get(`/adapters/${id}/logs`);
      return response.data || '';
    } catch (error) {
      console.error('Failed to fetch adapter logs:', error);
      return '';
    }
  }

  static async deleteAdapter(id: string) {
    try {
      await apiClient.delete(`/adapters/${id}`);
    } catch (error) {
      console.error('Failed to delete adapter:', error);
      throw error;
    }
  }

  static async ping(): Promise<boolean> {
    try {
      await apiClient.get('/ping');
      return true;
    } catch (error) {
      return false;
    }
  }

  static async getMetrics() {
    try {
      const response = await apiClient.get('/metrics');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
      return null;
    }
  }

  static async getRegistryServers(): Promise<RegistryServer[]> {
    try {
      const response = await apiClient.get('/registry');
      return response.data || [];
    } catch (error) {
      console.error('Failed to fetch registry servers:', error);
      return [];
    }
  }

  static async getPublicRegistryServers(): Promise<RegistryServer[]> {
    try {
      const response = await apiClient.get('/public/registry');
      return response.data || [];
    } catch (error) {
      console.error('Failed to fetch public registry servers:', error);
      return [];
    }
  }

  static async getPublicRegistryServersBySource(source: string): Promise<RegistryServer[]> {
    try {
      const response = await apiClient.get(`/public/registry?source=${source}`);
      return response.data || [];
    } catch (error) {
      console.error(`Failed to fetch registry servers for source ${source}:`, error);
      return [];
    }
  }

  static async getRegistryServer(id: string): Promise<RegistryServer | null> {
    try {
      const response = await apiClient.get(`/registry/${id}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch registry server details:', error);
      return null;
    }
  }

  static async browseRegistryServers(): Promise<RegistryServer[]> {
    try {
      const response = await apiClient.get('/registry/browse');
      return response.data || [];
    } catch (error) {
      console.error('Failed to browse registry servers:', error);
      return [];
    }
  }

}