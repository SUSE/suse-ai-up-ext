// Constants for SUSE AI Extension

export const MCP_CONSTANTS = {
  // Authentication & Authorization
  ADMIN_GROUP_ID: 'mcp-admins',
  DEFAULT_ADMIN_DESCRIPTION: 'Administrators with full access to all MCP adapters',
  
  // Adapter Defaults
  DEFAULT_ADAPTER_PERMISSION: 'read',
  
  // Connection Types
  CONNECTION_TYPES: {
    STREAMABLE_HTTP: 'StreamableHttp',
    SSE: 'SSE',
    REMOTE_HTTP: 'RemoteHttp',
    LOCAL_STDIO: 'LocalStdio',
    VIRTUAL_MCP: 'VirtualMCP'
  }
};
