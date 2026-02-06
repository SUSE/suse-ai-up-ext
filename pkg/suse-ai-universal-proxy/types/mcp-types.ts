/**
 * MCP Gateway and Registry Types
 * Enhanced type definitions for the new API structure
 */

// Base Adapter Types
export interface Adapter {
  name: string
  type: 'mcp' | 'sse' | 'websocket'
  status: 'running' | 'stopped' | 'error' | 'starting' | 'stopping'
  endpoint: string
  config: AdapterConfig
  metadata?: Record<string, any>
  createdAt: string
  updatedAt: string
  lastSeen?: string
  version?: string
  health?: AdapterHealth
  originalServer?: DiscoveredServer
  errorCount?: number
  requestCount?: number
}

export interface AdapterConfig {
  timeout?: number
  retries?: number
  authentication?: {
    type: 'none' | 'token' | 'basic' | 'oauth'
    config: Record<string, any>
  }
  logging?: {
    level: 'debug' | 'info' | 'warn' | 'error'
    format: 'json' | 'text'
  }
  mcp?: {
    protocol: 'stdio' | 'websocket' | 'sse'
    command?: string
    args?: string[]
    env?: Record<string, string>
  }
}

export interface AdapterHealth {
  status: 'healthy' | 'unhealthy' | 'degraded' | 'unknown'
  lastCheck: string
  responseTime?: number
  uptime?: number
  errorRate?: number
  message?: string
}

// Session Management
export interface Session {
  id: string
  adapterName: string
  status: 'active' | 'inactive' | 'error' | 'terminated'
  createdAt: string
  lastActivity: string
  clientInfo?: {
    userAgent?: string
    ip?: string
    sessionId?: string
  }
  metrics?: SessionMetrics
  metadata?: Record<string, any>
}

export interface SessionInfo {
  sessionId: string
  adapterName: string
  targetAddress: string
  connectionType: string
  createdAt: string
  lastActivity: string
  status: 'active' | 'inactive' | 'error'
  metadata?: {
    protocolVersion?: string
    clientInfo?: {
      name: string
      version: string
    }
  }
}

export interface SessionMetrics {
  messagesCount: number
  bytesTransferred: number
  averageResponseTime: number
  errorCount: number
  duration: number
}

// Token Management
export interface AdapterToken {
  token: string
  expiresAt: string
  permissions: string[]
  metadata?: Record<string, any>
  type: 'bearer' | 'client' | 'service'
}

export interface TokenValidationResult {
  valid: boolean
  expiresAt?: string
  permissions?: string[]
  error?: string
  warnings?: string[]
}

export interface ClientTokenRequest {
  clientId: string
  permissions?: string[]
  expiresIn?: number
  metadata?: Record<string, any>
}

// Discovery Types
export interface DiscoveredServer {
  id: string
  name: string
  host: string
  port: number
  address: string
  protocol: 'http' | 'https' | 'tcp'
  status: 'online' | 'offline' | 'unknown'
  lastSeen: string
  metadata?: {
    version?: string
    capabilities?: string[]
    description?: string
    tags?: string[]
    auth_type?: string
  }
  scanId?: string
  registered?: boolean
  adapterName?: string
  security_findings?: any[]
  vulnerability_score?: string
}

export interface DiscoveryScan {
  id: string
  status: 'running' | 'completed' | 'failed' | 'cancelled' | 'pending'
  startTime?: string
  endTime?: string
  config: {
    scanRanges?: string[]
    ports?: string[]
    timeout?: string
    maxConcurrent?: number
    excludeProxy?: boolean
  }
  progress?: number
  message?: string
}

export interface DiscoveryScanConfig {
  networks: string[]
  ports: string[]
  protocols: ('http' | 'https' | 'tcp')[]
  timeout: string
  maxConcurrent: number
  filters?: {
    excludeHosts?: string[]
    includeOnlyHosts?: string[]
    requireTags?: string[]
  }
}

export interface RegisterServerRequest {
  serverId: string
  adapterName?: string
  config?: AdapterConfig
  autoRegister?: boolean
  metadata?: Record<string, any>
}

// Registry Types
export interface RegistryPackage {
  identifier: string
  registryType: string
  transport: {
    type: string
  }
  environmentVariables?: RegistryEnvironmentVariable[]
}

export interface RegistryEnvironmentVariable {
  name: string
  description: string
  default: string
  format: string
  isSecret: boolean
}

export interface RegistryServer {
  id: string
  name: string
  description?: string
  version: string
  author?: string
  tags: string[]
  category: string
  repository?: {
    url: string
    branch?: string
    commit?: string
  }
  packages?: RegistryPackage[]
  metadata?: Record<string, any>
  validation_status?: string
  createdAt: string
  updatedAt: string
  isOfficial?: boolean
  isPublic?: boolean
  downloadCount?: number
  rating?: number
  ratingCount?: number
  deployments?: number
  size?: number
  checksum?: string
  license?: string
  homepage?: string
   documentation?: string
   changelog?: string
   config_template?: {
     command: string
     args?: string[]
     env?: Record<string, string>
     transport: string
     image: string
     resource_limits?: {
       cpu?: string
       memory?: string
     }
   }
 }

export interface RegistryBrowseOptions {
  category?: string
  tags?: string[]
  search?: string
  official?: boolean
  public?: boolean
  limit?: number
  offset?: number
  sortBy?: 'name' | 'created' | 'updated' | 'downloads' | 'rating'
  sortOrder?: 'asc' | 'desc'
  author?: string
  license?: string
}

export interface RegistryBrowseResult {
  servers: RegistryServer[]
  total: number
  hasMore: boolean
  categories?: string[]
  tags?: Array<{ tag: string; count: number }>
}

// Deployment Types
export interface DeploymentConfig {
  serverId: string
  kubernetes?: KubernetesDeploymentConfig
  config?: {
    adapter?: AdapterConfig
    environment?: Record<string, string>
    secrets?: Record<string, string>
  }
}

export interface KubernetesDeploymentConfig {
  namespace: string
  deployment: {
    replicas: number
    image: string
    resources?: {
      requests?: ResourceRequirements
      limits?: ResourceRequirements
    }
    env?: Array<{
      name: string
      value?: string
      valueFrom?: {
        secretKeyRef?: {
          name: string
          key: string
        }
        configMapKeyRef?: {
          name: string
          key: string
        }
      }
    }>
    volumes?: Array<{
      name: string
      type: 'configMap' | 'secret' | 'persistentVolume' | 'emptyDir'
      source: string
      mountPath: string
      readOnly?: boolean
    }>
    securityContext?: {
      runAsNonRoot?: boolean
      runAsUser?: number
      fsGroup?: number
    }
  }
  service?: {
    type: 'ClusterIP' | 'NodePort' | 'LoadBalancer'
    ports: Array<{
      name: string
      port: number
      targetPort?: number
      protocol?: 'TCP' | 'UDP'
    }>
  }
  ingress?: {
    enabled: boolean
    host?: string
    tls?: boolean
    annotations?: Record<string, string>
  }
  rbac?: {
    serviceAccount?: string
    roles?: Array<{
      name: string
      rules: Array<{
        apiGroups?: string[]
        resources?: string[]
        verbs?: string[]
      }>
    }>
  }
}

export interface ResourceRequirements {
  cpu?: string
  memory?: string
}

export interface DeploymentRequest {
  serverId: string
  config: DeploymentConfig
  targetCluster?: string
  targetNamespace?: string
  dryRun?: boolean
}

export interface DeploymentResult {
  deploymentId: string
  status: 'pending' | 'running' | 'failed' | 'completed' | 'rolling_back'
  message?: string
  resources?: {
    deployment?: string
    service?: string
    ingress?: string
    configMap?: string
    secret?: string
    serviceAccount?: string
    role?: string
    roleBinding?: string
  }
  url?: string
  logs?: string[]
}

// Metrics and Monitoring
export interface AdapterMetrics {
  adapterName: string
  timestamp: string
  uptime: number
  sessions: {
    active: number
    total: number
    averageDuration: number
  }
  performance: {
    requestsPerSecond: number
    averageResponseTime: number
    errorRate: number
    throughput: number
  }
  resources: {
    cpuUsage: number
    memoryUsage: number
    networkIO: {
      bytesIn: number
      bytesOut: number
    }
  }
  errors: Array<{
    timestamp: string
    type: string
    message: string
    count: number
  }>
}

export interface SystemMetrics {
  timestamp: string
  adapters: {
    total: number
    running: number
    stopped: number
    error: number
  }
  sessions: {
    active: number
    total: number
  }
  system: {
    cpuUsage: number
    memoryUsage: number
    diskUsage: number
    networkIO: {
      bytesIn: number
      bytesOut: number
    }
  }
}

// Plugin Services
export interface PluginService {
  id: string
  name: string
  type: string
  status: 'running' | 'stopped' | 'error' | 'starting'
  endpoint: string
  version: string
  metadata?: Record<string, any>
  health?: {
    status: 'healthy' | 'unhealthy' | 'degraded'
    lastCheck: string
    responseTime?: number
  }
  capabilities?: string[]
}

// Upload and Bulk Operations
export interface UploadRequest {
  name: string
  version: string
  description?: string
  category: string
  tags: string[]
  files: Array<{
    name: string
    content: string
    type: 'manifest' | 'config' | 'script' | 'documentation'
    size?: number
    checksum?: string
  }>
  metadata?: Record<string, any>
  repository?: {
    url: string
    branch?: string
    commit?: string
  }
  license?: string
  homepage?: string
}

// Error Types
export interface McpError {
  code: string
  message: string
  details?: Record<string, any>
  timestamp: string
  requestId?: string
  adapterName?: string
  sessionId?: string
}

// Event Types
export interface McpEvent {
  type: 'adapter_status' | 'session_created' | 'session_ended' | 'error' | 'metrics'
  timestamp: string
  data: Record<string, any>
  source?: string
  severity?: 'info' | 'warn' | 'error' | 'debug'
}

// Filter and Search Types
export interface AdapterFilter {
  status?: Adapter['status'][]
  type?: Adapter['type'][]
  search?: string
  tags?: string[]
  health?: AdapterHealth['status'][]
}

export interface SessionFilter {
  status?: Session['status'][]
  adapterName?: string[]
  dateRange?: {
    start: string
    end: string
  }
  search?: string
}

// Adapter API Types (matching API spec)
export interface AdapterAuthConfig {
  apiKey?: APIKeyConfig
  basic?: BasicAuthConfig
  bearerToken?: BearerTokenConfig
  oauth?: OAuthConfig
  required: boolean
  type: 'bearer' | 'oauth' | 'basic' | 'apikey' | 'none'
}

export interface APIKeyConfig {
  key: string
  location: 'header' | 'query' | 'cookie'
  name: string
}

export interface BasicAuthConfig {
  password: string
  username: string
}

export interface BearerTokenConfig {
  dynamic: boolean
  expiresAt?: string
  token?: string
}

export interface OAuthConfig {
  authUrl: string
  clientId: string
  clientSecret: string
  redirectUri: string
  scopes: string[]
  tokenUrl: string
}

export interface ConnectionType {
  type: 'SSE' | 'StreamableHttp' | 'RemoteHttp' | 'LocalStdio'
}

export interface ServerProtocol {
  type: 'MCP'
}

export interface MCPClientConfig {
  gemini?: GeminiClientConfig
  vscode?: VSCodeClientConfig
  [key: string]: GeminiClientConfig | VSCodeClientConfig | undefined
}

export interface GeminiClientConfig {
  mcpServers: Record<string, GeminiServerConfig>
}

export interface GeminiServerConfig {
  headers?: Record<string, string>
  httpUrl?: string
}

export interface VSCodeClientConfig {
  inputs?: any[]
  servers: Record<string, VSCodeServerConfig>
}

export interface VSCodeServerConfig {
  headers?: Record<string, string>
  type?: string
  url?: string
}

export interface MCPServerConfig {
  args?: string[]
  command?: string
  env?: Record<string, string>
}

export interface MCPFunctionality {
  lastRefreshed?: string
  prompts?: MCPPrompt[]
  resources?: MCPResource[]
  serverInfo?: MCPServerInfo
  tools?: MCPTool[]
}

export interface MCPPrompt {
  arguments?: MCPArgument[]
  description?: string
  name: string
}

export interface MCPArgument {
  description?: string
  name: string
  required?: boolean
}

export interface MCPResource {
  description?: string
  mimeType?: string
  name: string
  uri: string
}

export interface MCPServerInfo {
  capabilities?: Record<string, any>
  name: string
  protocol: string
  version: string
}

export interface MCPTool {
  config?: Record<string, any>
  description?: string
  input_schema?: Record<string, any>
  name: string
  source_type?: string
}

// Configuration Templates
export interface ConfigTemplate {
  id: string
  name: string
  description?: string
  category: string
  config: AdapterConfig
  variables?: Array<{
    name: string
    type: 'string' | 'number' | 'boolean' | 'select'
    description?: string
    default?: any
    required?: boolean
    options?: string[]
  }>
  metadata?: Record<string, any>
}

// Registry Adapter Creation Types
export interface CreateAdapterFromRegistryRequest {
  environmentVariables?: Record<string, string>
  replicaCount?: number
}

export interface CreateAdapterFromRegistryResponse {
  adapter: AdapterResource
  mcp_endpoint: string
  message: string
  note?: string
  token_info: AuthTokenInfo
}

export interface AuthTokenInfo {
  expiresAt: string
  token: string
  tokenType: string
}

// Enhanced Adapter Data (matching API spec)
export interface AdapterData {
  name: string
  description?: string
  protocol: string
  connectionType: string
  command?: string
  args?: string[]
  remoteUrl?: string
  imageName?: string
  imageVersion?: string
  apiBaseUrl?: string
  authentication: AdapterAuthConfig
  environmentVariables?: Record<string, string>
  replicaCount?: number
  mcpClientConfig?: MCPClientConfig
  mcpFunctionality?: MCPFunctionality
  tools?: any[]
  useWorkloadIdentity?: boolean
  originalServer?: DiscoveredServer
}

export interface AdapterResource {
  name: string
  description?: string
  protocol: string
  connectionType: string
  command?: string
  args?: string[]
  remoteUrl?: string
  imageName?: string
  imageVersion?: string
  apiBaseUrl?: string
  authentication: AdapterAuthConfig
  environmentVariables?: Record<string, string>
  replicaCount?: number
  mcpClientConfig?: MCPClientConfig
  mcpFunctionality?: MCPFunctionality
  tools?: any[]
  useWorkloadIdentity?: boolean
  createdAt?: string
  createdBy?: string
  lastUpdatedAt?: string
  id?: string
  status?: string
  lastActivity?: string
  phase?: string
  message?: string
  lastCheck?: string
  originalServer?: DiscoveredServer
  endpoint?: string
  errorCount?: number
  requestCount?: number
  lastActive?: string
}