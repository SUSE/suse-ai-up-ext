// External User API Service
// Handles user management operations with the external MCP Gateway API

import { BaseAPI, APIConfig } from './base-api'
import { logger } from '../utils/logger'
import { API_BASE_URLS } from '../config/api-config'
import type {
  ExternalUser,
  CreateUserRequest,
  UpdateUserRequest,
  CreateUserResponse
} from '../types/auth-types'

export class ExternalUserAPI extends BaseAPI {
  constructor(config: APIConfig) {
    super(config)
  }



  /**
   * List all users
   */
  async list(): Promise<ExternalUser[]> {
    try {
      logger.info('Listing external users')

      const users = await this.get<ExternalUser[]>('/api/v1/users')
      logger.info('External users listed', { count: users.length })

      return users
    } catch (error) {
      logger.error('Failed to list external users', error)
      throw error
    }
  }

  /**
    * Create a new user
    */
   async create(data: CreateUserRequest): Promise<CreateUserResponse> {
     try {
       logger.info('Creating external user', { id: data.id, name: data.name })
       console.log('About to POST /api/v1/users with data:', data)

       const response = await this.post<CreateUserResponse>('/api/v1/users', data)
       console.log('POST response:', response)
       logger.info('External user created', { id: response.user.id, name: response.user.name })

       return response
     } catch (error) {
       logger.error('Failed to create external user', error)
       throw error
     }
   }

  /**
   * Get user by ID
   */
  async getUser(id: string): Promise<ExternalUser> {
    try {
      logger.info('Getting external user', { id })

      const user = await this.get<ExternalUser>(`/api/v1/users/${id}`)
      logger.info('External user retrieved', { id, name: user.name })

      return user
    } catch (error) {
      logger.error('Failed to get external user', { id, error })
      throw error
    }
  }

  /**
   * Update user
   */
  async update(id: string, data: UpdateUserRequest): Promise<ExternalUser> {
    try {
      logger.info('Updating external user', { id })

      const user = await this.put<ExternalUser>(`/api/v1/users/${id}`, data)
      logger.info('External user updated', { id, name: user.name })

      return user
    } catch (error) {
      logger.error('Failed to update external user', { id, error })
      throw error
    }
  }

  /**
   * Delete user
   */
  async deleteUser(id: string): Promise<void> {
    try {
      logger.info('Deleting external user', { id })

      await this.delete<void>(`/api/v1/users/${id}`)
      logger.info('External user deleted', { id })

    } catch (error) {
      logger.error('Failed to delete external user', { id, error })
      throw error
    }
  }
}

// Singleton instance
export const externalUserAPI = new ExternalUserAPI({
  baseURL: API_BASE_URLS.MCP_GATEWAY,
  dynamicBaseURL: () => API_BASE_URLS.MCP_GATEWAY,
  timeout: 30000,
  retries: 3
})