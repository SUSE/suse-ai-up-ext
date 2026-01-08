// External Group API Service
// Handles group management operations with the external MCP Gateway API

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios'
import { logger } from '../utils/logger'
import { API_BASE_URLS } from '../config/api-config'
import type {
  ExternalGroup,
  CreateGroupRequest,
  UpdateGroupRequest,
  AddUserToGroupRequest
} from '../types/auth-types'

export class ExternalGroupAPI {
  private api: AxiosInstance

  constructor(baseURL: string, timeout: number = 30000) {
    this.api = axios.create({
      baseURL,
      timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Setup basic error handling (no auth headers for CORS compatibility)
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response) {
          const { status, data } = error.response
          const apiError = {
            code: data?.code || `HTTP_${status}`,
            message: data?.error || data?.message || `HTTP ${status} error`,
            details: data?.details,
            status
          }
          return Promise.reject(apiError)
        } else if (error.request) {
          return Promise.reject({
            code: 'NETWORK_ERROR',
            message: 'Network error - please check your connection',
            details: { originalError: error.message }
          })
        } else {
          return Promise.reject({
            code: 'UNKNOWN_ERROR',
            message: error.message || 'An unexpected error occurred',
            details: { originalError: error }
          })
        }
      }
    )
  }

  // HTTP methods
  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    try {
      const response = await this.api.request({
        method,
        url,
        data,
        ...config
      })
      return response.data
    } catch (error) {
      // Error already handled by interceptor
      throw error
    }
  }

  protected async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>('GET', url, undefined, config)
  }

  protected async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>('POST', url, data, config)
  }

  protected async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>('PUT', url, data, config)
  }

  protected async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>('DELETE', url, undefined, config)
  }

  /**
   * List all groups
   */
  async list(): Promise<ExternalGroup[]> {
    try {
      logger.info('Listing external groups')

      const groups = await this.get<ExternalGroup[]>('/api/v1/groups')
      logger.info('External groups listed', { count: groups.length })

      return groups
    } catch (error) {
      logger.error('Failed to list external groups', error)
      throw error
    }
  }

  /**
   * Create a new group
   */
  async create(data: CreateGroupRequest): Promise<ExternalGroup> {
    try {
      logger.info('Creating external group', { id: data.id, name: data.name })

      const group = await this.post<ExternalGroup>('/api/v1/groups', data)
      logger.info('External group created', { id: group.id, name: group.name })

      return group
    } catch (error) {
      logger.error('Failed to create external group', error)
      throw error
    }
  }

  /**
   * Get group by ID
   */
  async getGroup(id: string): Promise<ExternalGroup> {
    try {
      logger.info('Getting external group', { id })

      const group = await this.get<ExternalGroup>(`/api/v1/groups/${id}`)
      logger.info('External group retrieved', { id, name: group.name })

      return group
    } catch (error) {
      logger.error('Failed to get external group', { id, error })
      throw error
    }
  }

  /**
   * Update group
   */
  async update(id: string, data: UpdateGroupRequest): Promise<ExternalGroup> {
    try {
      logger.info('Updating external group', { id })

      const group = await this.put<ExternalGroup>(`/api/v1/groups/${id}`, data)
      logger.info('External group updated', { id, name: group.name })

      return group
    } catch (error) {
      logger.error('Failed to update external group', { id, error })
      throw error
    }
  }

  /**
   * Delete group
   */
  async deleteGroup(id: string): Promise<void> {
    try {
      logger.info('Deleting external group', { id })

      await this.delete<void>(`/api/v1/groups/${id}`)
      logger.info('External group deleted', { id })

    } catch (error) {
      logger.error('Failed to delete external group', { id, error })
      throw error
    }
  }

  /**
   * Add user to group
   */
  async addUserToGroup(groupId: string, userId: string): Promise<void> {
    try {
      logger.info('Adding user to external group', { groupId, userId })

      await this.post<void>(`/api/v1/groups/${groupId}/members`, { userId })
      logger.info('User added to external group', { groupId, userId })

    } catch (error) {
      logger.error('Failed to add user to external group', { groupId, userId, error })
      throw error
    }
  }

  /**
   * Remove user from group
   */
  async removeUserFromGroup(groupId: string, userId: string): Promise<void> {
    try {
      logger.info('Removing user from external group', { groupId, userId })

      await this.delete<void>(`/api/v1/groups/${groupId}/members/${userId}`)
      logger.info('User removed from external group', { groupId, userId })

    } catch (error) {
      logger.error('Failed to remove user from external group', { groupId, userId, error })
      throw error
    }
  }
}

// Singleton instance
export const externalGroupAPI = new ExternalGroupAPI(
  API_BASE_URLS.MCP_GATEWAY,
  30000
)