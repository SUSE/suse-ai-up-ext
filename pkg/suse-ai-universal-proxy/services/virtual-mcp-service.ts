// Virtual MCP Service
// Handles communication with the Virtual MCP service

import axios from 'axios';
import { API_BASE_URLS, getApiConfig } from '../config/api-config';
import type {
  MCPServer,
  MCPListResponse,
  TransformRequest,
  CombineRequest
} from '../types/virtual-mcp-types';

// Direct connection to Virtual MCP service
const apiClient = axios.create({
  baseURL: API_BASE_URLS.VIRTUAL_MCP,
  timeout: getApiConfig().timeout,
  headers: {
    'Content-Type': 'application/json',
  },
});

export class VirtualMCPService {
  // Update baseURL dynamically
  static updateBaseURL() {
    apiClient.defaults.baseURL = API_BASE_URLS.VIRTUAL_MCP
  }

  // MCP Server Management
  static async getMCPServers(limit = 10, offset = 0): Promise<MCPListResponse> {
    try {
       const response = await apiClient.get('/mcps', {
        params: { limit, offset }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch MCP servers:', error);
      throw error;
    }
  }

  static async getMCPServer(id: string): Promise<MCPServer> {
    try {
       const response = await apiClient.get(`/mcps/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch MCP server ${id}:`, error);
      throw error;
    }
  }

  static async createMCPServer(server: MCPServer): Promise<MCPServer> {
    try {
       const response = await apiClient.post('/mcps', server);
      return response.data;
    } catch (error) {
      console.error('Failed to create MCP server:', error);
      throw error;
    }
  }

  static async updateMCPServer(id: string, server: Partial<MCPServer>): Promise<MCPServer> {
    try {
       const response = await apiClient.put(`/mcps/${id}`, server);
      return response.data;
    } catch (error) {
      console.error(`Failed to update MCP server ${id}:`, error);
      throw error;
    }
  }

  static async deleteMCPServer(id: string): Promise<void> {
    try {
       await apiClient.delete(`/mcps/${id}`);
    } catch (error) {
      console.error(`Failed to delete MCP server ${id}:`, error);
      throw error;
    }
  }

  // Transformation Methods
  static async transformOpenAPI(request: TransformRequest): Promise<MCPServer> {
    try {
       const response = await apiClient.post('/transform/openapi', request);
      return response.data;
    } catch (error) {
      console.error('Failed to transform OpenAPI to MCP:', error);
      throw error;
    }
  }

  static async transformGraphQL(request: TransformRequest): Promise<MCPServer> {
    try {
       const response = await apiClient.post('/transform/graphql', request);
      return response.data;
    } catch (error) {
      console.error('Failed to transform GraphQL to MCP:', error);
      throw error;
    }
  }

  static async transformDatabase(request: TransformRequest): Promise<MCPServer> {
    try {
       const response = await apiClient.post('/transform/database', request);
      return response.data;
    } catch (error) {
      console.error('Failed to transform database to MCP:', error);
      throw error;
    }
  }

  static async combineServers(request: CombineRequest): Promise<MCPServer> {
    try {
       const response = await apiClient.post('/combine', request);
      return response.data;
    } catch (error) {
      console.error('Failed to combine MCP servers:', error);
      throw error;
    }
  }

  // Health check
  static async ping(): Promise<boolean> {
    try {
       const response = await axios.get(`${API_BASE_URLS.VIRTUAL_MCP}/health`, { timeout: 5000 });
      return response.status === 200;
    } catch (error) {
      console.error('Failed to ping Virtual MCP service:', error);
      return false;
    }
  }
}