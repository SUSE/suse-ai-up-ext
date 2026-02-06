/**
 * Token Management Service
 * Handles adapter token lifecycle operations
 */

import axios, { AxiosInstance } from 'axios'
import { getMcpUrl, getApiConfig } from '../config/api-config'
import { logger } from '../utils/logger'

export interface AdapterToken {
  token: string
  expiresAt?: string
  type?: string
  message?: string
  permissions?: string[]
  metadata?: Record<string, any>
}

export interface TokenValidationResult {
  valid: boolean
  expiresAt?: string
  permissions?: string[]
  error?: string
}

export interface ClientTokenRequest {
  clientId: string
  permissions?: string[]
  expiresIn?: number
}

export class TokenService {
  private api: AxiosInstance

  constructor() {
    this.api = axios.create(getApiConfig())
    this.setupInterceptors()
  }

  private setupInterceptors() {
    this.api.interceptors.response.use(
      response => response,
      error => {
        logger.error('Token service error:', error)
        throw error
      }
    )
  }

  /**
   * Get adapter token
   */
  async getAdapterToken(adapterName: string): Promise<AdapterToken> {
    try {
      const response = await this.api.get(
        getMcpUrl(`/adapters/${adapterName}/token`)
      )
      return response.data
    } catch (error) {
      logger.error(`Failed to get token for adapter ${adapterName}:`, error)
      throw error
    }
  }

  /**
   * Refresh adapter token
   */
  async refreshAdapterToken(adapterName: string): Promise<AdapterToken> {
    try {
      const response = await this.api.post(
        getMcpUrl(`/adapters/${adapterName}/token/refresh`)
      )
      return response.data
    } catch (error) {
      logger.error(`Failed to refresh token for adapter ${adapterName}:`, error)
      throw error
    }
  }

  /**
   * Validate adapter token
   */
  async validateAdapterToken(adapterName: string, token: string): Promise<TokenValidationResult> {
    try {
      const response = await this.api.post(
        getMcpUrl(`/adapters/${adapterName}/token/validate`),
        { token }
      )
      return response.data
    } catch (error) {
      logger.error(`Failed to validate token for adapter ${adapterName}:`, error)
      throw error
    }
  }

  /**
   * Generate client token
   */
  async generateClientToken(
    adapterName: string, 
    request: ClientTokenRequest
  ): Promise<AdapterToken> {
    try {
      const response = await this.api.post(
        getMcpUrl(`/adapters/${adapterName}/client-token`),
        request
      )
      return response.data
    } catch (error) {
      logger.error(`Failed to generate client token for adapter ${adapterName}:`, error)
      throw error
    }
  }

  /**
   * Test adapter authentication
   */
  async testAdapterAuth(adapterName: string): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await this.api.post(
        getMcpUrl(`/adapters/${adapterName}/test-auth`)
      )
      return response.data
    } catch (error) {
      logger.error(`Failed to test auth for adapter ${adapterName}:`, error)
      throw error
    }
  }

  /**
   * Validate adapter authentication configuration
   */
  async validateAdapterAuth(
    adapterName: string, 
    authConfig: Record<string, any>
  ): Promise<{ valid: boolean; errors?: string[] }> {
    try {
      const response = await this.api.post(
        getMcpUrl(`/adapters/${adapterName}/validate-auth`),
        authConfig
      )
      return response.data
    } catch (error) {
      logger.error(`Failed to validate auth config for adapter ${adapterName}:`, error)
      throw error
    }
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(token: AdapterToken): boolean {
    if (!token.expiresAt) return false
    return new Date(token.expiresAt) <= new Date()
  }

  /**
   * Get token time to live in seconds
   */
  getTokenTTL(token: AdapterToken): number {
    if (!token.expiresAt) return Infinity
    const now = new Date()
    const expiry = new Date(token.expiresAt)
    return Math.floor((expiry.getTime() - now.getTime()) / 1000)
  }

  /**
   * Format token expiry for display
   */
  formatTokenExpiry(token: AdapterToken): string {
    if (!token.expiresAt) return 'Never'
    
    const ttl = this.getTokenTTL(token)
    if (ttl <= 0) return 'Expired'
    
    const hours = Math.floor(ttl / 3600)
    const minutes = Math.floor((ttl % 3600) / 60)
    
    if (hours > 24) {
      const days = Math.floor(hours / 24)
      return `${days} day${days !== 1 ? 's' : ''}`
    }
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    
    return `${minutes}m`
  }
}

// Singleton instance
export const tokenService = new TokenService()
export default tokenService