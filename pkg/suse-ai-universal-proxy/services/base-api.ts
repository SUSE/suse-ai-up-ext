// Base API class for SUSE AI Universal Proxy
// Provides consistent error handling, authentication, and request patterns

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import { logger } from '../utils/logger'

export interface APIConfig {
  baseURL: string
  timeout: number
  retries: number
  dynamicBaseURL?: () => string
}

export interface AuthHeaders {
  'X-API-Key'?: string
  'X-User-ID'?: string
  'Authorization'?: string
}

export interface AuthMode {
  mode: 'local' | 'github' | 'rancher' | 'dev'
  github?: {
    clientId: string
    redirectUri: string
  }
  rancher?: {
    issuerUrl: string
    clientId: string
    redirectUri: string
  }
}

export interface AuthToken {
  token: string
  tokenType: string
  expiresAt: string
  userId: string
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
      baseURL: config.baseURL || undefined, // Allow empty baseURL to be set dynamically
      timeout: config.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    })
    this.setupInterceptors()
  }

  // Get current baseURL
  getBaseURL(): string | undefined {
    return this.api.defaults.baseURL
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
    // Always check for stored token
    const stored = localStorage.getItem('suseai-auth-token')
    if (stored) {
      try {
        const token: AuthToken = JSON.parse(stored)
        // Check if token is expired
        if (new Date(token.expiresAt) > new Date()) {
          return {
            'Authorization': `Bearer ${token.token}`
          }
        } else {
          localStorage.removeItem('suseai-auth-token')
        }
      } catch (error) {
        localStorage.removeItem('suseai-auth-token')
      }
    }
    // No fallback headers when authentication is disabled
    return null
  }

  // Token management
  protected setAuthToken(token: AuthToken): void {
    try {
      localStorage.setItem('suseai-auth-token', JSON.stringify(token))
    } catch (error) {
      logger.warn('Failed to store auth token:', error)
    }
  }

  protected clearAuthToken(): void {
    try {
      localStorage.removeItem('suseai-auth-token')
    } catch (error) {
      logger.warn('Failed to clear auth token:', error)
    }
  }

  // Get authentication mode (unauthenticated)
  public async getAuthMode(): Promise<AuthMode> {
    // Use a direct axios call without auth headers
    const response = await axios.get(`${this.getBaseURL()}/auth/mode`, {
      timeout: this.config.timeout
    })
    return response.data
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
      // Merge config with dynamic baseURL if needed
      const requestConfig = {
        method,
        url,
        data,
        ...config
      }

      // Use dynamic baseURL if available and no baseURL set
      if (!requestConfig.baseURL && this.config.dynamicBaseURL) {
        requestConfig.baseURL = this.config.dynamicBaseURL()
      }

      const response: AxiosResponse<T> = await this.api.request(requestConfig)
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