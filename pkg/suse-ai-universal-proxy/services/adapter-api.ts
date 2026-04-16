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
  connectionType?: 'StreamableHttp' | 'Remote' | 'Virtual'
  sourceAdapters?: string[]
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
  mcpServerId?: string
  name: string
  description?: string
  connectionType?: 'StreamableHttp' | 'Remote' | 'Virtual'
  sourceAdapters?: string[]
  environmentVariables?: Record<string, string>
  authentication?: AdapterAuthConfig
  routeAssignments?: Array<{
    group?: string
    user?: string
    permissions: string[]
  }>
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

        const adapter = await this.post<Adapter>('/api/v1/adapters', data, { headers: { 'X-User-ID': 'system' } })
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

        const response = await this.get<any>('/api/v1/adapters', { headers: { 'X-User-ID': 'system' } })

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

        const adapter = await this.get<Adapter>(`/api/v1/adapters/${id}`, { headers: { 'X-User-ID': 'system' } })
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

        const adapter = await this.put<Adapter>(`/api/v1/adapters/${id}`, data, { headers: { 'X-User-ID': 'system' } })
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

        await this.delete<void>(`/api/v1/adapters/${id}`, { headers: { 'X-User-ID': 'system' } })
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

        const capabilities = await this.post<AdapterCapabilities>(`/api/v1/adapters/${id}/sync`, {}, { headers: { 'X-User-ID': 'system' } })
        logger.info('Adapter capabilities synced', { id })

        return capabilities
     } catch (error) {
       logger.error('Failed to sync adapter capabilities', { id, error })
       throw error
     }
   }

   /**
    * Assign group to adapter
    */
    async assignGroup(adapterId: string, groupId: string, permission: string = 'read'): Promise<void> {
      try {
        logger.info('Assigning group to adapter', { adapterId, groupId, permission })
        await this.post<void>(`/api/v1/adapters/${adapterId}/groups`, {
          groupId,
          permission
        }, { headers: { 'X-User-ID': 'system' } })
        logger.info('Group assigned to adapter', { adapterId, groupId })
      } catch (error: any) {
       // Check for 409 Conflict (Group already assigned)
       // Check multiple properties as the error structure might vary (Axios vs custom API wrapper)
       const isConflict = 
         (error.response && error.response.status === 409) || 
         error.status === 409 || 
         error.code === 'HTTP_409';

       if (isConflict) {
         logger.info('Group already assigned to adapter (idempotent)', { adapterId, groupId })
         return
       }
       logger.error('Failed to assign group to adapter', { adapterId, groupId, error })
       throw error
     }
   }

   /**
    * Remove group from adapter
    */
    async unassignGroup(adapterId: string, groupId: string): Promise<void> {
      try {
        logger.info('Removing group from adapter', { adapterId, groupId })
        await this.delete<void>(`/api/v1/adapters/${adapterId}/groups/${groupId}`, { headers: { 'X-User-ID': 'system' } })
        logger.info('Group removed from adapter', { adapterId, groupId })
      } catch (error) {
       logger.error('Failed to remove group from adapter', { adapterId, groupId, error })
       throw error
     }
   }

   /**
    * Get user-specific configuration for all adapters
    */
    async getUserConfig(userId: string = 'admin'): Promise<any> {
      try {
        logger.info('Getting user config', { userId })
        const config = await this.get<any>('/api/v1/user/config', { headers: { 'X-User-ID': userId } })
        logger.info('User config retrieved')
        return config
      } catch (error) {
        logger.error('Failed to get user config', error)
        throw error
      }
    }

   /**
    * Get adapter groups
    */
    async getAdapterGroups(adapterId: string): Promise<any[]> {
      try {
        logger.info('Getting adapter groups', { adapterId })
        const response = await this.get<any>(`/api/v1/adapters/${adapterId}/groups`, { headers: { 'X-User-ID': 'system' } })
        
        // Handle response format variations
       let groups: any[] = []
       if (Array.isArray(response)) {
         groups = response
       } else if (response && Array.isArray((response as any).groups)) {
         groups = (response as any).groups
       }

       logger.info('Adapter groups retrieved', { adapterId, count: groups.length })
       return groups
     } catch (error) {
       logger.error('Failed to get adapter groups', { adapterId, error })
       // Return empty array instead of throwing to avoid breaking UI
       return []
     }
   }
}

// Singleton instance - will update baseURL dynamically
export const adapterAPI = new AdapterAPI({
  baseURL: API_BASE_URLS.MCP_GATEWAY,
  timeout: 30000,
  retries: 3,
  dynamicBaseURL: () => API_BASE_URLS.MCP_GATEWAY
})