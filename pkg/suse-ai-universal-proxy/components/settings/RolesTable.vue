<template>
  <div class="roles-table-container">
    <div class="table-header">
      <h3>Roles</h3>
      <div class="table-actions">
        <select v-model="typeFilter" class="filter-select">
          <option value="">All Types</option>
          <option value="global">Global</option>
          <option value="cluster">Cluster</option>
          <option value="project">Project</option>
          <option value="namespaced">Namespaced</option>
        </select>
        <input
          v-model="searchQuery"
          type="search"
          placeholder="Search roles..."
          class="search-input"
        />
        <button
          v-if="canManageRoles"
          class="btn btn-primary"
          @click="$emit('add-role')"
        >
          Add Role
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <p>Loading roles...</p>
    </div>

    <div v-else-if="error" class="error-state">
      <p class="error-message">{{ error }}</p>
      <button class="btn btn-secondary" @click="$emit('retry')">Retry</button>
    </div>

    <div v-else-if="filteredRoles.length === 0" class="empty-state">
      <p>{{ searchQuery || typeFilter ? 'No roles found matching your filters.' : 'No roles available.' }}</p>
    </div>

    <div v-else class="table-wrapper">
      <table class="roles-table">
        <thead>
          <tr>
            <th @click="sortBy('name')" class="sortable">
              Name
              <span v-if="sortField === 'name'" class="sort-indicator">
                {{ sortDirection === 'asc' ? '↑' : '↓' }}
              </span>
            </th>
            <th @click="sortBy('displayName')" class="sortable">
              Display Name
              <span v-if="sortField === 'displayName'" class="sort-indicator">
                {{ sortDirection === 'asc' ? '↑' : '↓' }}
              </span>
            </th>
            <th @click="sortBy('type')" class="sortable">
              Type
              <span v-if="sortField === 'type'" class="sort-indicator">
                {{ sortDirection === 'asc' ? '↑' : '↓' }}
              </span>
            </th>
            <th>Rules</th>
            <th @click="sortBy('created')" class="sortable">
              Created
              <span v-if="sortField === 'created'" class="sort-indicator">
                {{ sortDirection === 'asc' ? '↑' : '↓' }}
              </span>
            </th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="role in paginatedRoles"
            :key="role.id"
            class="role-row"
            @click="handleRowClick(role)"
          >
            <td>{{ role.name }}</td>
            <td>{{ role.displayName || role.name }}</td>
            <td>
              <span class="type-badge" :class="`type-${role.type}`">
                {{ formatRoleType(role.type) }}
              </span>
            </td>
            <td>{{ getRulesSummary(role.rules) }}</td>
            <td>{{ formatCreatedDate(role.created) }}</td>
            <td class="actions-cell">
              <button
                class="btn btn-sm btn-outline"
                @click.stop="$emit('view-role', role.id)"
                title="View Details"
              >
                View
              </button>
              <button
                v-if="canManageRoles"
                class="btn btn-sm btn-outline"
                @click.stop="$emit('edit-role', role.id)"
                title="Edit Role"
              >
                Edit
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="pagination">
        <button
          class="btn btn-sm"
          :disabled="currentPage === 1"
          @click="currentPage--"
        >
          Previous
        </button>
        <span class="page-info">
          Page {{ currentPage }} of {{ totalPages }}
        </span>
        <button
          class="btn btn-sm"
          :disabled="currentPage === totalPages"
          @click="currentPage++"
        >
          Next
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, watch } from 'vue';
import type { RancherRole, RoleRule } from '../../types/auth-types';

export default defineComponent({
  name: 'RolesTable',
  props: {
    roles: {
      type: Array as () => readonly RancherRole[],
      default: () => []
    },
    loading: {
      type: Boolean,
      default: false
    },
    error: {
      type: String,
      default: null
    },
    canManageRoles: {
      type: Boolean,
      default: false
    }
  },
  emits: ['view-role', 'edit-role', 'add-role', 'retry'],
  setup(props, { emit }) {
    const searchQuery = ref('');
    const typeFilter = ref('');
    const sortField = ref<'name' | 'displayName' | 'type' | 'created'>('name');
    const sortDirection = ref<'asc' | 'desc'>('asc');
    const currentPage = ref(1);
    const pageSize = ref(10);

    // Filtered and sorted roles
    const filteredRoles = computed(() => {
      let filtered = [...props.roles];

      // Apply type filter
      if (typeFilter.value) {
        filtered = filtered.filter(role => role.type === typeFilter.value);
      }

      // Apply search filter
      if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase();
        filtered = filtered.filter(role =>
          role.name.toLowerCase().includes(query) ||
          (role.displayName && role.displayName.toLowerCase().includes(query))
        );
      }

      // Apply sorting
      filtered.sort((a: RancherRole, b: RancherRole) => {
        let aValue: any = a[sortField.value];
        let bValue: any = b[sortField.value];

        // Handle special cases
        if (sortField.value === 'created') {
          aValue = aValue ? new Date(aValue).getTime() : 0;
          bValue = bValue ? new Date(bValue).getTime() : 0;
        } else if (sortField.value === 'displayName') {
          aValue = aValue || a.name;
          bValue = bValue || b.name;
        }

        if (aValue < bValue) return sortDirection.value === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection.value === 'asc' ? 1 : -1;
        return 0;
      });

      return filtered;
    });

    // Paginated roles
    const paginatedRoles = computed(() => {
      const start = (currentPage.value - 1) * pageSize.value;
      const end = start + pageSize.value;
      return filteredRoles.value.slice(start, end);
    });

    // Total pages
    const totalPages = computed(() => {
      return Math.ceil(filteredRoles.value.length / pageSize.value);
    });

    // Reset pagination when filters change
    watch([searchQuery, typeFilter, sortField, sortDirection], () => {
      currentPage.value = 1;
    });

    // Methods
    const sortBy = (field: typeof sortField.value) => {
      if (sortField.value === field) {
        sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
      } else {
        sortField.value = field;
        sortDirection.value = 'asc';
      }
    };

    const formatRoleType = (type: string): string => {
      return type.charAt(0).toUpperCase() + type.slice(1);
    };

    const getRulesSummary = (rules: readonly RoleRule[]): string => {
      if (!rules || rules.length === 0) return 'No rules';

      const totalRules = rules.length;
      const verbs = new Set<string>();
      const resources = new Set<string>();

      rules.forEach(rule => {
        if (rule.verbs) {
          rule.verbs.forEach((verb: string) => verbs.add(verb));
        }
        if (rule.resources) {
          rule.resources.forEach((resource: string) => resources.add(resource));
        }
      });

      return `${totalRules} rule${totalRules > 1 ? 's' : ''} (${verbs.size} verbs, ${resources.size} resources)`;
    };

    const formatCreatedDate = (created?: string): string => {
      if (!created) return 'Unknown';

      const date = new Date(created);
      return date.toLocaleDateString();
    };

    const handleRowClick = (role: RancherRole) => {
      emit('view-role', role.id);
    };

    return {
      searchQuery,
      typeFilter,
      sortField,
      sortDirection,
      currentPage,
      pageSize,
      filteredRoles,
      paginatedRoles,
      totalPages,
      sortBy,
      formatRoleType,
      getRulesSummary,
      formatCreatedDate,
      handleRowClick
    };
  }
});
</script>

<style scoped>
.roles-table-container {
  width: 100%;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.table-header h3 {
  margin: 0;
  color: var(--text);
}

.table-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.filter-select,
.search-input {
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--input-bg);
  color: var(--text);
}

.filter-select {
  min-width: 120px;
}

.search-input {
  min-width: 200px;
}

.filter-select:focus,
.search-input:focus {
  outline: none;
  border-color: var(--primary);
}

.loading-state,
.error-state,
.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-muted);
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--border);
  border-top: 2px solid var(--primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 10px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-message {
  color: var(--error);
  margin-bottom: 10px;
}

.table-wrapper {
  background: var(--card-bg);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: var(--card-shadow);
}

.roles-table {
  width: 100%;
  border-collapse: collapse;
}

.roles-table th,
.roles-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid var(--border);
}

.roles-table th {
  background: var(--sortable-table-header-bg);
  font-weight: 600;
  color: var(--text);
  position: sticky;
  top: 0;
}

.roles-table th.sortable {
  cursor: pointer;
  user-select: none;
}

.roles-table th.sortable:hover {
  background: var(--hover-bg);
}

.sort-indicator {
  margin-left: 5px;
  font-size: 12px;
}

.role-row {
  cursor: pointer;
  transition: background-color 0.2s;
}

.role-row:hover {
  background: var(--sortable-table-accent-bg);
}

.type-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.type-global {
  background: var(--primary-bg);
  color: var(--primary);
}

.type-cluster {
  background: var(--warning-bg);
  color: var(--warning);
}

.type-project {
  background: var(--success-bg);
  color: var(--success);
}

.type-namespaced {
  background: var(--info-bg);
  color: var(--info);
}

.actions-cell {
  white-space: nowrap;
}

.actions-cell .btn {
  margin-right: 5px;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  padding: 16px;
  background: var(--card-bg);
  border-top: 1px solid var(--border);
}

.page-info {
  color: var(--text-muted);
  font-size: 14px;
}

.btn {
  padding: 6px 12px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--button-bg);
  color: var(--button-text);
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.btn:hover:not(:disabled) {
  background: var(--button-hover-bg);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

.btn-outline {
  background: transparent;
  border-color: var(--border);
}

.btn-outline:hover {
  background: var(--hover-bg);
}

.btn-sm {
  padding: 4px 8px;
  font-size: 12px;
}

.btn-secondary {
  background: var(--secondary);
  color: var(--secondary-text);
}
</style>