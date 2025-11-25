<template>
  <div class="servers-section">
    <div class="table-header">
      <div class="table-title">
        <h2>Virtual MCP Servers</h2>
      </div>
      <div class="table-actions">
        <button class="btn btn-primary" @click="$emit('createServer')">
          <i class="icon icon-plus"></i>
          Create Server
        </button>
      </div>
    </div>

    <div class="table-container">
      <table class="table table-striped">
        <thead>
          <tr>
            <th>Status</th>
            <th>Name</th>
            <th>Description</th>
            <th>Source Type</th>
            <th>Tools</th>
            <th>Resources</th>
            <th>Prompts</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="9" class="loading-row">Loading Virtual MCP servers...</td>
          </tr>
          <tr v-else-if="error">
            <td colspan="9" class="error-row">{{ error }}</td>
          </tr>
          <tr v-else-if="servers.length === 0">
            <td colspan="9" class="empty-row">
              No Virtual MCP servers created yet.
              <button class="btn btn-link" @click="$emit('createServer')">Create your first server</button>
            </td>
          </tr>
          <tr v-else v-for="server in servers" :key="server.id">
            <td>
              <span :class="['status-badge badge', getStatusBadgeClass(server.status)]">
                {{ getStatusLabel(server.status) }}
              </span>
            </td>
             <td>{{ formatServerName(server.name) }}</td>
            <td>{{ server.description || '-' }}</td>
            <td>{{ getSourceTypeLabel(server) }}</td>
            <td>{{ server.tools?.length || 0 }}</td>
            <td>{{ server.resources?.length || 0 }}</td>
            <td>{{ server.prompts?.length || 0 }}</td>
            <td>{{ server.created_at ? new Date(server.created_at).toLocaleDateString() : 'Unknown' }}</td>
            <td>
              <div class="action-buttons">
                 <button
                   class="btn btn-sm btn-secondary"
                   @click="$emit('viewServer', server)"
                   title="View Details"
                 >
                  <i class="icon icon-info"></i>
                </button>
                 <button
                   class="btn btn-sm btn-secondary"
                   @click="$emit('editServer', server)"
                   title="Edit"
                 >
                  <i class="icon icon-edit"></i>
                </button>
                 <button
                   class="btn btn-sm btn-danger"
                   @click="$emit('deleteServer', server)"
                   title="Delete"
                 >
                  <i class="icon icon-trash"></i>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div v-if="servers.length > 0 && pagination.total > pagination.limit" class="pagination-section">
      <button
        class="btn btn-secondary"
        :disabled="pagination.offset === 0"
        @click="$emit('changePage', pagination.offset - pagination.limit)"
      >
        Previous
      </button>
      <span class="pagination-info">
        {{ Math.floor(pagination.offset / pagination.limit) + 1 }} of {{ Math.ceil(pagination.total / pagination.limit) }}
      </span>
      <button
        class="btn btn-secondary"
        :disabled="pagination.offset + pagination.limit >= pagination.total"
        @click="$emit('changePage', pagination.offset + pagination.limit)"
      >
        Next
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { MCPServer } from '../../types/virtual-mcp-types';

interface Props {
  servers: MCPServer[];
  loading?: boolean;
  error?: string | null;
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
}

const props = defineProps<Props>();

defineEmits<{
  createServer: [];
  viewServer: [server: MCPServer];
  editServer: [server: MCPServer];
  deleteServer: [server: MCPServer];
  changePage: [offset: number];
}>();

const getStatusBadgeClass = (status?: string) => {
  switch (status) {
    case 'active':
      return 'badge-success';
    case 'inactive':
      return 'badge-secondary';
    default:
      return 'badge-warning';
  }
};

const getStatusLabel = (status?: string) => {
  switch (status) {
    case 'active':
      return 'Active';
    case 'inactive':
      return 'Inactive';
    default:
      return status || 'Unknown';
  }
};

const getSourceTypeLabel = (server: MCPServer) => {
  // Try to determine source type from server properties
  // This is a heuristic since the API doesn't explicitly store source type
  if (server.tools?.some(tool => tool.name?.includes('query') || tool.name?.includes('mutation'))) {
    return 'GraphQL';
  }
  if (server.tools?.some(tool => tool.name?.includes('get') || tool.name?.includes('post'))) {
    return 'OpenAPI';
  }
  if (server.tools?.some(tool => tool.name?.includes('select') || tool.name?.includes('insert'))) {
    return 'Database';
  }
  if (server.tools && server.tools.length > 10) {
    return 'Combined';
  }
  return 'Custom';
};

const formatServerName = (name: string) => {
  if (!name) return name;

  // Split by hyphens and capitalize each word
  return name
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};
</script>

<style scoped>
.servers-section {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border, #e9ecef);
}

.table-title h2 {
  font-size: 1.5rem;
  font-weight: 600;
  color: #495057;
  margin: 0;
}

.table-actions {
  display: flex;
  gap: 12px;
}

.table-container {
  overflow-x: auto;
}

.table {
  width: 100%;
  margin: 0;
  background: white;
}

.table th {
  background: #f8f9fa;
  border-bottom: 2px solid #dee2e6;
  padding: 12px 16px;
  font-weight: 600;
  color: #495057;
  text-align: left;
  position: sticky;
  top: 0;
}

.table td {
  padding: 12px 16px;
  border-bottom: 1px solid #dee2e6;
  vertical-align: middle;
}

.table tbody tr:hover {
  background: #f8f9fa;
}

.status-badge {
  margin-left: 12px;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.loading-row,
.error-row,
.empty-row {
  text-align: center;
  color: var(--muted, #6b7280);
  font-style: italic;
  padding: 40px;
}

.error-row {
  color: var(--error, #dc2626);
}

.empty-row {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.btn-link {
  color: var(--primary, #2563eb);
  text-decoration: underline;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
}

.btn-link:hover {
  color: var(--primary-hover, #1d4ed8);
}

.pagination-section {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  padding: 20px;
  border-top: 1px solid var(--border, #e9ecef);
}

.pagination-info {
  color: var(--muted, #6b7280);
  font-size: 14px;
}

/* Badge styles */
.badge {
  display: inline-block;
  padding: 4px 8px;
  font-size: 12px;
  font-weight: 500;
  border-radius: 4px;
  text-align: center;
}

.badge-success {
  background: #28a745;
  color: white;
}

.badge-secondary {
  background: #6c757d;
  color: white;
}

.badge-warning {
  background: #ffc107;
  color: #212529;
}

.badge-danger {
  background: #dc3545;
  color: white;
}

/* Button styles */
.btn {
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

  .btn-primary {
    background: #16a34a;
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background: #15803d;
  }

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background: #5a6268;
}

.btn-danger {
  background: #dc3545;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #c82333;
}

.btn-sm {
  padding: 4px 8px;
  font-size: 12px;
}
</style>