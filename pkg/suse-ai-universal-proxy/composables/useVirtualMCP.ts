// Virtual MCP Composable
// Provides state management and API integration for Virtual MCP functionality

import { ref, onUnmounted } from 'vue';
import { VirtualMCPService } from '../services/virtual-mcp-service';
import { logger } from '../utils/logger';
import type {
  MCPServer,
  MCPListResponse,
  TransformRequest,
  CombineRequest,
  CreateServerForm,
  ServerMetrics,
  TransformationType
} from '../types/virtual-mcp-types';

const STORAGE_KEY = 'virtual-mcp-servers';

export const useVirtualMCP = () => {
  const servers = ref<MCPServer[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const pagination = ref({
    limit: 10,
    offset: 0,
    total: 0
  });

  // Create/Edit state
  const showCreateModal = ref(false);
  const creating = ref(false);
   const createForm = ref<CreateServerForm>({
     name: '',
     description: '',
     type: 'openapi',
     source: '',
     sourceType: 'url',
     auth: { type: 'transparent' },
     overrides: {}
   });

   // Metrics
   const metrics = ref<ServerMetrics>({
     totalServers: 0,
     activeServers: 0,
     inactiveServers: 0,
     totalTools: 0,
     totalResources: 0
   });

   // Polling
   let pollInterval: NodeJS.Timeout | null = null;

  const loadFromStorage = () => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        servers.value = JSON.parse(stored);
        console.log('Loaded servers from storage:', servers.value.length);
      } catch (e) {
        console.error('Failed to parse stored servers', e);
      }
    }
  };

  const saveToStorage = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(servers.value));
  };

  const fetchServers = async () => {
    console.log('Fetching Virtual MCP servers from API...');
    loading.value = true;
    error.value = null;

    try {
      const response: MCPListResponse = await VirtualMCPService.getMCPServers(
        pagination.value.limit,
        pagination.value.offset
      );
      console.log('Fetched servers:', response.mcps);

      servers.value = response.mcps;
      pagination.value.total = response.total;

      // If API returns empty, clear cached data
      if (response.mcps.length === 0) {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        // Save to storage
        saveToStorage();
      }

      // Calculate metrics
      metrics.value = {
        totalServers: response.total,
        activeServers: response.mcps.filter(s => s.status === 'active').length,
        inactiveServers: response.mcps.filter(s => s.status === 'inactive').length,
        totalTools: response.mcps.reduce((sum, server) => sum + (server.tools?.length || 0), 0),
        totalResources: 0 // TODO: Add resource counting when available
      };

      logger.info('Fetched Virtual MCP servers', { count: response.mcps.length });
    } catch (err) {
      console.error('Failed to fetch servers:', err);
      error.value = `Failed to fetch Virtual MCP servers: ${err instanceof Error ? err.message : 'Unknown error'}`;
      logger.error('Failed to fetch Virtual MCP servers', err);
    } finally {
      loading.value = false;
    }
  };

  const getServer = async (id: string): Promise<MCPServer | null> => {
    try {
      return await VirtualMCPService.getMCPServer(id);
    } catch (err) {
      logger.error(`Failed to fetch Virtual MCP server ${id}`, err);
      return null;
    }
  };

  const createServer = async (form: CreateServerForm): Promise<MCPServer | null> => {
    creating.value = true;
    error.value = null;

    try {
      let server: MCPServer;

      // Call the appropriate transform API based on type
      switch (form.type) {
        case 'openapi':
          const openAPIRequest: TransformRequest = {
            name: form.name,
            description: form.description,
            source: form.source!,
            source_type: form.sourceType,
            auth: form.auth,
            overrides: form.overrides
          };
          server = await VirtualMCPService.transformOpenAPI(openAPIRequest);
          break;

        case 'graphql':
          const graphQLRequest: TransformRequest = {
            name: form.name,
            description: form.description,
            source: form.source!,
            source_type: form.sourceType,
            auth: form.auth,
            overrides: form.overrides
          };
          server = await VirtualMCPService.transformGraphQL(graphQLRequest);
          break;

        case 'database':
          const dbRequest: TransformRequest = {
            name: form.name,
            description: form.description,
            source: form.source!,
            source_type: form.sourceType,
            auth: form.auth,
            overrides: form.overrides
          };
          server = await VirtualMCPService.transformDatabase(dbRequest);
          break;

        case 'combine':
          const combineRequest: CombineRequest = {
            name: form.name,
            description: form.description,
            sources: form.sources!,
            auth: form.auth,
            overrides: form.overrides
          };
          server = await VirtualMCPService.combineServers(combineRequest);
          break;

        default:
          throw new Error(`Unsupported transformation type: ${form.type}`);
      }

      // Refresh the servers list
      await fetchServers();

      logger.info('Created Virtual MCP server via transform API', { name: server.name, type: form.type });
      return server;
    } catch (err) {
      error.value = `Failed to create Virtual MCP server: ${err instanceof Error ? err.message : 'Unknown error'}`;
      logger.error('Failed to create Virtual MCP server', err);
      return null;
    } finally {
      creating.value = false;
    }
  };

  const updateServer = async (id: string, updates: Partial<MCPServer>): Promise<MCPServer | null> => {
    try {
      const server = await VirtualMCPService.updateMCPServer(id, updates);

      // Update local state
      const index = servers.value.findIndex(s => s.id === id);
      if (index >= 0) {
        servers.value[index] = server;
      }

      logger.info('Updated Virtual MCP server', { id, name: server.name });
      return server;
    } catch (err) {
      logger.error(`Failed to update Virtual MCP server ${id}`, err);
      return null;
    }
  };

  const deleteServer = async (id: string): Promise<boolean> => {
    try {
      await VirtualMCPService.deleteMCPServer(id);

      // Remove from local state
      servers.value = servers.value.filter(s => s.id !== id);

      logger.info('Deleted Virtual MCP server', { id });
      return true;
    } catch (err) {
      logger.error(`Failed to delete Virtual MCP server ${id}`, err);
      return false;
    }
  };

  const resetCreateForm = () => {
    createForm.value = {
      name: '',
      description: '',
      type: 'openapi',
      source: '',
      sourceType: 'url',
    auth: { type: 'transparent' },
      overrides: {}
    };
  };

   const startPolling = () => {
     if (pollInterval) return;

     console.log('Starting polling every 20 seconds');
     pollInterval = setInterval(() => {
       console.log('Polling: fetching servers');
       fetchServers();
     }, 20000); // Poll every 20 seconds
   };

   const stopPolling = () => {
     if (pollInterval) {
       clearInterval(pollInterval);
       pollInterval = null;
     }
   };

   const fetchData = () => {
     fetchServers();
     startPolling();
   };

   // Cleanup
   onUnmounted(() => {
     stopPolling();
   });

  return {
    // State
    servers,
    loading,
    error,
    pagination,
    metrics,

    // Create/Edit state
    showCreateModal,
    creating,
    createForm,

    // Methods
    fetchServers,
    getServer,
    createServer,
    updateServer,
    deleteServer,
    resetCreateForm,
    fetchData,
    loadFromStorage,
    startPolling,
    stopPolling
  };
};