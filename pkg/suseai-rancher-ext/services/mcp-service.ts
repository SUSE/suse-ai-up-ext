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

  static async startScan(config: ScanConfig) {
    try {
      const response = await apiClient.post('/scan', config);
      return response.data;
    } catch (error) {
      console.error('Failed to start scan:', error);
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