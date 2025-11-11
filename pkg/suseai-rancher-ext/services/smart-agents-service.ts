// Smart Agents Service

import axios from 'axios';
import { API_BASE_URLS, SMART_AGENTS_ENDPOINTS, getApiConfig } from '../config/api-config';

const apiClient = axios.create({
  baseURL: API_BASE_URLS.SMART_AGENTS,
  timeout: getApiConfig().timeout,
});

export interface SmartAgent {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'inactive' | 'error';
  supervisor?: {
    type: string;
    api?: string;
    model?: string;
    provider?: string;
  };
  worker?: {
    type: string;
    api?: string;
    model?: string;
    provider?: string;
  };
  createdAt?: string;
  updatedAt?: string;
  lastActivity?: string;
  config?: Record<string, any>;
  capabilities?: string[];
  metadata?: Record<string, any>;
  // Extended fields for UI compatibility
  type?: string;
  state?: string;
  totalTokens?: number;
  totalRequests?: number;
  totalCost?: number;
  task_description?: string;
  context?: string[];
  mcp_integration?: any;
  cost_balance?: number;
  mcp_tools?: any;
  max_rounds?: number;
  generation_config?: any;
  response_format?: any;
  stream?: boolean;
  tool_choice?: any;
  user?: string;
}

export interface CreateAgentRequest {
  name: string;
  task_description?: string;
  max_rounds?: number;
  messages?: Array<{role: string, content: string}>;
  generation_config?: {
    temperature: number;
    top_p: number;
    top_k: number;
    max_new_tokens: number;
    stop_sequences?: string[];
    presence_penalty: number;
    frequency_penalty: number;
    repetition_penalty: number;
    seed: number;
  };
  response_format?: { type: string };
  stream?: boolean;
  tools?: any[];
  tool_choice?: string;
  user?: string;
  supervisor: {
    provider: string;
    api?: string;
    model: string;
    system_prompt: string;
    developer_prompt: string;
    url: string;
  };
  worker: {
    provider: string;
    api?: string;
    model: string;
    system_prompt: string;
    developer_prompt: string;
    context?: string[];
    url: string;
  };
  mcp_integration?: boolean;
  mcp_tools?: any[];
  cost_balance?: number;
  user_roles?: Record<string, any>;
}

export interface UpdateAgentRequest {
  name?: string;
  description?: string;
  supervisor?: {
    type?: string;
    api?: string;
    model?: string;
    provider?: string;
  };
  worker?: {
    type?: string;
    api?: string;
    model?: string;
    provider?: string;
  };
  config?: Record<string, any>;
}

export class SmartAgentsService {
  static async getAgents(): Promise<SmartAgent[]> {
    try {
      const response = await apiClient.get(SMART_AGENTS_ENDPOINTS.AGENTS);
      return response.data || [];
    } catch (error) {
      console.error('Failed to fetch agents:', error);
      return [];
    }
  }

  static async getAgent(id: string): Promise<SmartAgent | null> {
    try {
      const response = await apiClient.get(SMART_AGENTS_ENDPOINTS.AGENT_DETAILS(id));
      return response.data;
    } catch (error) {
      console.error('Failed to fetch agent:', error);
      return null;
    }
  }

  static async createAgent(request: CreateAgentRequest): Promise<SmartAgent> {
    try {
      const response = await apiClient.post(SMART_AGENTS_ENDPOINTS.AGENT_CREATE, request);
      return response.data;
    } catch (error) {
      console.error('Failed to create agent:', error);
      throw error;
    }
  }

  static async updateAgent(id: string, request: UpdateAgentRequest): Promise<SmartAgent> {
    try {
      const response = await apiClient.put(SMART_AGENTS_ENDPOINTS.AGENT_UPDATE(id), request);
      return response.data;
    } catch (error) {
      console.error('Failed to update agent:', error);
      throw error;
    }
  }

  static async deleteAgent(id: string): Promise<void> {
    try {
      await apiClient.delete(SMART_AGENTS_ENDPOINTS.AGENT_DELETE(id));
    } catch (error) {
      console.error('Failed to delete agent:', error);
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

  static async getMetrics(): Promise<any> {
    try {
      const response = await apiClient.get('/metrics');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
      return null;
    }
  }

  static async getHealth(): Promise<{ status: string; timestamp: string }> {
    try {
      const response = await apiClient.get('/health');
      return response.data;
    } catch (error) {
      console.error('Failed to get health status:', error);
      throw error;
    }
  }

  // Agent-specific operations
  static async startAgent(id: string): Promise<void> {
    try {
      await apiClient.post(`${SMART_AGENTS_ENDPOINTS.AGENT_DETAILS(id)}/start`);
    } catch (error) {
      console.error('Failed to start agent:', error);
      throw error;
    }
  }

  static async stopAgent(id: string): Promise<void> {
    try {
      await apiClient.post(`${SMART_AGENTS_ENDPOINTS.AGENT_DETAILS(id)}/stop`);
    } catch (error) {
      console.error('Failed to stop agent:', error);
      throw error;
    }
  }

  static async restartAgent(id: string): Promise<void> {
    try {
      await apiClient.post(`${SMART_AGENTS_ENDPOINTS.AGENT_DETAILS(id)}/restart`);
    } catch (error) {
      console.error('Failed to restart agent:', error);
      throw error;
    }
  }

  static async getAgentLogs(id: string, tail?: number): Promise<string> {
    try {
      const params = tail ? { tail } : {};
      const response = await apiClient.get(`${SMART_AGENTS_ENDPOINTS.AGENT_DETAILS(id)}/logs`, { params });
      return response.data || '';
    } catch (error) {
      console.error('Failed to fetch agent logs:', error);
      return '';
    }
  }

  static async getAgentConfig(id: string): Promise<Record<string, any>> {
    try {
      const response = await apiClient.get(`${SMART_AGENTS_ENDPOINTS.AGENT_DETAILS(id)}/config`);
      return response.data || {};
    } catch (error) {
      console.error('Failed to fetch agent config:', error);
      return {};
    }
  }

  static async updateAgentConfig(id: string, config: Record<string, any>): Promise<void> {
    try {
      await apiClient.put(`${SMART_AGENTS_ENDPOINTS.AGENT_DETAILS(id)}/config`, config);
    } catch (error) {
      console.error('Failed to update agent config:', error);
      throw error;
    }
  }

  // Agent capabilities and models
  static async getAvailableModels(provider?: string): Promise<string[]> {
    try {
      const params = provider ? { provider } : {};
      const response = await apiClient.get('/models', { params });
      return response.data || [];
    } catch (error) {
      console.error('Failed to fetch available models:', error);
      return [];
    }
  }

  static async getProviders(): Promise<string[]> {
    try {
      const response = await apiClient.get('/providers');
      return response.data || [];
    } catch (error) {
      console.error('Failed to fetch providers:', error);
      return [];
    }
  }

  static async testConnection(config: { type: string; api: string; model?: string }): Promise<boolean> {
    try {
      const response = await apiClient.post('/test-connection', config);
      return response.data.success || false;
    } catch (error) {
      console.error('Failed to test connection:', error);
      return false;
    }
  }
}

export default SmartAgentsService;