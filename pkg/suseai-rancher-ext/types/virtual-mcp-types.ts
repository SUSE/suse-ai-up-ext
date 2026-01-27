// Virtual MCP Types
// TypeScript interfaces for Virtual MCP service API

export interface AuthConfig {
  type: 'transparent' | 'oauth_github';
  config?: string;
}

export interface MCPPromptArgument {
  name: string;
  description?: string;
  required?: boolean;
}

export interface MCPPrompt {
  name: string;
  description?: string;
  arguments?: MCPPromptArgument[];
  annotations?: Record<string, any>;
}

export interface MCPResource {
  name: string;
  uri: string;
  description?: string;
  mimeType?: string;
  annotations?: Record<string, any>;
}

export interface MCPSampling {
  method?: string;
  temperature?: number;
  maxTokens?: number;
  annotations?: Record<string, any>;
}

export interface MCPTool {
  name: string;
  title?: string;
  description?: string;
  inputSchema?: Record<string, any>;
  annotations?: Record<string, any>;
}

export interface MCPServer {
  id?: string;
  name: string;
  description?: string;
  version?: string;
  status?: 'active' | 'inactive';
  tools?: MCPTool[];
  resources?: MCPResource[];
  prompts?: MCPPrompt[];
  sampling?: MCPSampling[];
  auth?: AuthConfig;
  overrides?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface MCPListResponse {
  mcps: MCPServer[];
  total: number;
  limit: number;
  offset: number;
}

export interface TransformRequest {
  name: string;
  description?: string;
  source: string;
  source_type?: 'url' | 'file';
  auth?: AuthConfig;
  overrides?: Record<string, any>;
}

export interface CombineRequest {
  name: string;
  description?: string;
  sources: string[]; // Array of MCP server IDs or URLs
  auth?: AuthConfig;
  overrides?: Record<string, any>;
}

// UI-specific types
export type TransformationType = 'openapi' | 'graphql' | 'database' | 'combine';

export interface CreateServerForm {
  type: TransformationType;
  name: string;
  description?: string;
  source?: string;
  sourceType?: 'url' | 'file';
   sources?: string[]; // For combine operation
   auth: AuthConfig;
   overrides?: Record<string, any>;
}

export interface ServerMetrics {
  totalServers: number;
  activeServers: number;
  inactiveServers: number;
  totalTools: number;
  totalResources: number;
}