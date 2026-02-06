// Proxy API Service
// Handles MCP protocol proxying and health checks

import { BaseAPI, APIConfig } from './base-api'
import { logger } from '../utils/logger'
import { API_BASE_URLS } from '../config/api-config'

export interface MCPTool {
  name: string
  description: string
  inputSchema: Record<string, any>
}

export interface MCPResource {
  uri: string
  name: string
  description: string
  mimeType: string
}

export interface HealthStatus {
  service: string
  status: 'healthy' | 'unhealthy'
  timestamp: string
  version: string
}

export interface MCPMessage {
  jsonrpc: string
  id?: number | string
  method?: string
  params?: Record<string, any>
  result?: any
  error?: any
}

export class ProxyAPI extends BaseAPI {
  constructor(config: APIConfig) {
    super(config)
  }

  /**
   * Get health status of the proxy service
   */
  async health(): Promise<HealthStatus> {
    try {
      logger.info('Checking proxy health')

      const health = await this.get<HealthStatus>('/health')
      logger.info('Proxy health checked', { status: health.status })

      return health
    } catch (error) {
      logger.error('Failed to check proxy health', error)
      throw error
    }
  }

  /**
   * List available MCP tools
   */
  async listTools(): Promise<{ tools: MCPTool[] }> {
    try {
      logger.info('Listing MCP tools')

       const result = await this.get<{ tools: MCPTool[] }>('/api/v1/mcp/tools')
      logger.info('MCP tools listed', { count: result.tools.length })

      return result
    } catch (error) {
      logger.error('Failed to list MCP tools', error)
      throw error
    }
  }

  /**
   * List available MCP resources
   */
  async listResources(): Promise<{ resources: MCPResource[] }> {
    try {
      logger.info('Listing MCP resources')

       const result = await this.get<{ resources: MCPResource[] }>('/api/v1/mcp/resources')
      logger.info('MCP resources listed', { count: result.resources.length })

      return result
    } catch (error) {
      logger.error('Failed to list MCP resources', error)
      throw error
    }
  }

  /**
   * Send MCP message (for direct protocol interaction)
   */
  async sendMCPMessage(message: MCPMessage): Promise<MCPMessage> {
    try {
      logger.info('Sending MCP message', { method: message.method, id: message.id })

       const response = await this.post<MCPMessage>('/api/v1/mcp', message)
      logger.info('MCP message sent', { id: message.id })

      return response
    } catch (error) {
      logger.error('Failed to send MCP message', error)
      throw error
    }
  }
}

// Singleton instance
export const proxyAPI = new ProxyAPI({
  baseURL: API_BASE_URLS.PROXY,
  timeout: 30000,
  retries: 3
})