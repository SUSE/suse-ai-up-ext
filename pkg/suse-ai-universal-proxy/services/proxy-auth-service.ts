// Auth service for SUSE AI Universal Proxy authentication
// Handles login, password changes, and OAuth flows

import { BaseAPI, AuthMode, AuthToken } from './base-api'

export interface LoginRequest {
  user_id: string
  password: string
}

export interface LoginResponse {
  token: AuthToken
  user: {
    id: string
    name: string
    email: string
    groups: string[]
  }
}

export interface PasswordChangeRequest {
  current_password: string
  new_password: string
}

export interface OAuthLoginRequest {
  provider: 'github' | 'rancher'
}

export interface OAuthLoginResponse {
  auth_url: string
}

export interface OAuthCallbackRequest {
  code: string
  state?: string
}

export class ProxyAuthService extends BaseAPI {
  // Override to skip auth headers for unauthenticated endpoints
  protected getAuthHeaders(): any {
    return null // No auth headers for auth endpoints
  }

  // Local authentication
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await this.post<LoginResponse>('/api/v1/auth/login', credentials)
    this.setAuthToken(response.token) // Store token in BaseAPI
    return response
  }

  // Change password (requires existing auth)
  async changePassword(change: PasswordChangeRequest): Promise<void> {
    const stored = localStorage.getItem('suseai-auth-token')
    if (!stored) throw new Error('No authentication token found')

    const token: AuthToken = JSON.parse(stored)
    if (new Date(token.expiresAt) <= new Date()) throw new Error('Authentication token expired')

    await this.put('/api/v1/auth/password', change, {
      headers: {
        'Authorization': `Bearer ${token.token}`
      }
    })
  }

  // Initiate OAuth flow
  async initiateOAuth(request: OAuthLoginRequest): Promise<OAuthLoginResponse> {
    return this.post<OAuthLoginResponse>('/api/v1/auth/oauth/login', request)
  }

  // Handle OAuth callback
  async handleOAuthCallback(request: OAuthCallbackRequest): Promise<LoginResponse> {
    const response = await this.post<LoginResponse>('/api/v1/auth/oauth/callback', request)
    this.setAuthToken(response.token)
    return response
  }

  // Logout
  logout(): void {
    this.clearAuthToken()
  }

  // Check if authenticated
  isAuthenticated(): boolean {
    const stored = localStorage.getItem('suseai-auth-token')
    if (stored) {
      try {
        const token: AuthToken = JSON.parse(stored)
        return new Date(token.expiresAt) > new Date()
      } catch (error) {
        return false
      }
    }
    return false
  }

  // Get current user
  getCurrentUser() {
    const stored = localStorage.getItem('suseai-auth-token')
    if (stored) {
      try {
        const token: AuthToken = JSON.parse(stored)
        if (new Date(token.expiresAt) > new Date()) {
          return {
            id: token.userId,
            token: token
          }
        }
      } catch (error) {
        return null
      }
    }
    return null
  }
}