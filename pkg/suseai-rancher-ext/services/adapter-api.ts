// Adapter API Service
// Handles MCP adapter management (CRUD operations, sync, capabilities)

import { BaseAPI, APIConfig, AuthHeaders } from './base-api'
import { logger } from '../utils/logger'
import { API_BASE_URLS } from '../config/api-config'
import type { MCPClientConfig } from '../types/mcp-types'

export interface Adapter {
  id: string
  mcpServerId?: string
  name: string
  description?: string
  environmentVariables?: Record<string, string>
  authentication?: AdapterAuthConfig
  mcpClientConfig?: MCPClientConfig
  capabilities?: AdapterCapabilities
  status?: string
  createdAt?: string
  [key: string]: any
}

export interface AdapterAuthConfig {
  type: 'bearer' | 'oauth' | 'basic' | 'apikey' | 'none'
  required: boolean
  bearerToken?: {
    dynamic: boolean
    token?: string
    expiresAt?: string
  }
  oauth?: {
    clientId: string
    clientSecret: string
    authUrl: string
    tokenUrl: string
    redirectUri: string
    scopes: string[]
  }
  basic?: {
    username: string
    password: string
  }
  apiKey?: {
    key: string
    location: 'header' | 'query' | 'cookie'
    name: string
  }
}



export interface MCPServerConfig {
  url: string
  auth: {
    type: string
    token: string
  }
}

export interface AdapterCapabilities {
  tools: MCPTool[]
  resources: MCPResource[]
  prompts: MCPPrompt[]
  lastRefreshed: string
}

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

export interface MCPPrompt {
  name: string
  description: string
  arguments: Array<{
    name: string
    description?: string
    required?: boolean
  }>
}

export interface CreateAdapterRequest {
  mcpServerId: string
  name: string
  description?: string
  environmentVariables?: Record<string, string>
  authentication: AdapterAuthConfig
}

export interface UpdateAdapterRequest {
  name?: string
  description?: string
  environmentVariables?: Record<string, string>
  authentication?: AdapterAuthConfig
}

export class AdapterAPI extends BaseAPI {
  constructor(config: APIConfig) {
    super(config)
  }

  protected getAuthHeaders(): AuthHeaders | null {
    // Adapter operations don't require authentication headers to avoid CORS issues
    return null
  }

  // Update baseURL dynamically
  updateBaseURL() {
    this.api.defaults.baseURL = API_BASE_URLS.MCP_GATEWAY
  }

  // Get current baseURL
  getBaseURL() {
    return this.api.defaults.baseURL
  }

  /**
    * Create a new adapter
    */
  async create(data: CreateAdapterRequest): Promise<Adapter> {
    try {
      logger.info('Creating adapter', { name: data.name, serverId: data.mcpServerId })

        const adapter = await this.post<Adapter>('/api/v1/adapters', data)
      logger.info('Adapter created', { id: adapter.id, name: adapter.name })

      return adapter
    } catch (error) {
      logger.error('Failed to create adapter', error)
      throw error
    }
  }

   /**
    * List all adapters
    */
  async list(): Promise<Adapter[]> {
    try {
      logger.info('Listing adapters')

        const response = await this.get<any>('/api/v1/adapters')

      // Handle different response formats
      let adapters: Adapter[]
      if (Array.isArray(response)) {
        adapters = response as Adapter[]
      } else if (response && Array.isArray(response.adapters)) {
        adapters = response.adapters as Adapter[]
      } else if (response && typeof response === 'object') {
        // Try to find array in any property
        const arrayProp = Object.values(response).find(val => Array.isArray(val))
        adapters = arrayProp ? (arrayProp as Adapter[]) : []
      } else {
        adapters = []
      }

      logger.info('Adapters listed', { count: adapters.length })

      return adapters
    } catch (error) {
      logger.error('Failed to list adapters', error)
      console.error('Adapter list error:', error)
      throw error
    }
  }

   /**
    * Get adapter by ID
    */
   async getAdapter(id: string): Promise<Adapter> {
     try {
       logger.info('Getting adapter', { id })

        const adapter = await this.get<Adapter>(`/api/v1/adapters/${id}`)
       logger.info('Adapter retrieved', { id, name: adapter.name })

       return adapter
     } catch (error) {
       logger.error('Failed to get adapter', { id, error })
       throw error
     }
   }

   /**
    * Update adapter
    */
   async update(id: string, data: UpdateAdapterRequest): Promise<Adapter> {
     try {
       logger.info('Updating adapter', { id })

        const adapter = await this.put<Adapter>(`/api/v1/adapters/${id}`, data)
       logger.info('Adapter updated', { id, name: adapter.name })

       return adapter
     } catch (error) {
       logger.error('Failed to update adapter', { id, error })
       throw error
     }
   }

   /**
    * Delete adapter
    */
   async deleteAdapter(id: string): Promise<void> {
     try {
       logger.info('Deleting adapter', { id })

        await this.delete<void>(`/api/v1/adapters/${id}`)
       logger.info('Adapter deleted', { id })

     } catch (error) {
       logger.error('Failed to delete adapter', { id, error })
       throw error
     }
   }

   /**
    * Sync adapter capabilities
    */
   async sync(id: string): Promise<AdapterCapabilities> {
     try {
       logger.info('Syncing adapter capabilities', { id })

        const capabilities = await this.post<AdapterCapabilities>(`/api/v1/adapters/${id}/sync`)
       logger.info('Adapter capabilities synced', { id })

       return capabilities
     } catch (error) {
       logger.error('Failed to sync adapter capabilities', { id, error })
       throw error
     }
   }
}

// Singleton instance - will update baseURL dynamically
export const adapterAPI = new AdapterAPI({
  baseURL: API_BASE_URLS.MCP_GATEWAY,
  timeout: 30000,
  retries: 3
})