// Base API class for SUSE AI Universal Proxy
// Provides consistent error handling, authentication, and request patterns

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import { logger } from '../utils/logger'

export interface APIConfig {
  baseURL: string
  timeout: number
  retries: number
}

export interface AuthHeaders {
  'X-API-Key': string
  'X-User-ID'?: string
  'Authorization'?: string
}

export interface APIError {
  code: string
  message: string
  details?: Record<string, any>
  status?: number
}

export class BaseAPI {
  protected api: AxiosInstance
  protected config: APIConfig

  constructor(config: APIConfig) {
    this.config = config
    this.api = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.setupInterceptors()
  }

  private setupInterceptors() {
    // Request interceptor for authentication
    this.api.interceptors.request.use(
      (config) => {
        const authHeaders = this.getAuthHeaders()
        if (authHeaders) {
          Object.assign(config.headers, authHeaders)
        }
        return config
      },
      (error) => {
        logger.error('Request interceptor error:', error)
        return Promise.reject(error)
      }
    )

    // Response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        const apiError = this.handleError(error)
        return Promise.reject(apiError)
      }
    )
  }

  protected getAuthHeaders(): AuthHeaders | null {
    // Get authentication headers from Rancher or stored tokens
    // This should be implemented based on the authentication system
    try {
      // For now, return basic headers - this will be updated with proper auth
      return {
        'X-API-Key': 'rancher-managed-key',
        'X-User-ID': 'admin'
      }
    } catch (error) {
      logger.warn('Failed to get auth headers:', error)
      return null
    }
  }

  protected handleError(error: any): APIError {
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response
      return {
        code: data?.code || `HTTP_${status}`,
        message: data?.error || data?.message || `HTTP ${status} error`,
        details: data?.details,
        status
      }
    } else if (error.request) {
      // Request was made but no response received
      return {
        code: 'NETWORK_ERROR',
        message: 'Network error - please check your connection',
        details: { originalError: error.message }
      }
    } else {
      // Something else happened
      return {
        code: 'UNKNOWN_ERROR',
        message: error.message || 'An unexpected error occurred',
        details: { originalError: error }
      }
    }
  }

  protected async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.api.request({
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

  // Convenience methods
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
}