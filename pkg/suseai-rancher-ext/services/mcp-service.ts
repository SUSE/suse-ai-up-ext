// MCP Service

import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:8911',
  timeout: 10000,
});

export interface AdapterData {
  name: string;
  imageName: string;
  imageVersion: string;
  description: string;
  connectionType: string;
  protocol: string;
  replicaCount: number;
  useWorkloadIdentity: boolean;
  environmentVariables?: Record<string, string>;
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


}