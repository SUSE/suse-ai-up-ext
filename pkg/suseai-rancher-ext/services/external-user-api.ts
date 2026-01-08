// External User API Service
// Handles user management operations with the external MCP Gateway API

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios'
import { logger } from '../utils/logger'
import { API_BASE_URLS } from '../config/api-config'
import type {
  ExternalUser,
  CreateUserRequest,
  UpdateUserRequest,
  CreateUserResponse
} from '../types/auth-types'

export class ExternalUserAPI {
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

      const response = await this.post<CreateUserResponse>('/api/v1/users', data)
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
export const externalUserAPI = new ExternalUserAPI(
  API_BASE_URLS.MCP_GATEWAY,
  30000
)