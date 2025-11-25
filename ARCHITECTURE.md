# SUSE AI Extension Architecture Guide

This document outlines the architectural patterns, conventions, and best practices used in the SUSE AI Rancher Extension.

## Table of Contents

1. [Architectural Principles](#architectural-principles)
2. [Domain Model Pattern](#domain-model-pattern)
3. [Store Management](#store-management)
4. [Component Architecture](#component-architecture)
5. [Service Layer](#service-layer)
6. [Virtual MCP Implementation](#virtual-mcp-implementation)
7. [TypeScript Conventions](#typescript-conventions)
8. [Feature Flag System](#feature-flag-system)
9. [Error Handling](#error-handling)
10. [Testing Patterns](#testing-patterns)
11. [Development Workflow](#development-workflow)

## Architectural Principles

### Domain Model Architecture Adoption

This extension follows established domain model architecture patterns, which emphasize:

- **Domain-driven design**: Rich models with business logic
- **Separation of concerns**: Clear boundaries between data, business logic, and presentation
- **Consistent state management**: Centralized store following Vuex patterns
- **Standard UI components**: Consistent integration with Rancher's design system

## Domain Model Pattern

### Base Resource Architecture

All domain models extend from `SuseaiResource` which provides common functionality:

```typescript
// models/base/suseai-resource.ts
export default class SuseaiResource {
  protected $store: any;
  protected data: any;

  constructor(data: any, store?: any) {
    this.data = data;
    this.$store = store;
  }

  // Common computed properties
  get id(): string {
    return this.data.id || this.data.slug;
  }

  get name(): string {
    return this.data.name || this.data.displayName;
  }

  // Common actions
  async save(): Promise<void> {
    // Implementation
  }

  async remove(): Promise<void> {
    // Implementation
  }
}
```

### Rich Domain Models

Domain models encapsulate both data and behavior:

```typescript
// models/app/app-resource.ts
export default class AppResource extends SuseaiResource {
  // Computed state properties
  get isInstalled(): boolean {
    return this.installations?.length > 0;
  }

  get stateDisplay(): string {
    if (this.isInstalling) return 'Installing';
    if (this.isUpgrading) return 'Upgrading';
    if (this.hasError) return 'Error';
    if (this.isInstalled) return 'Installed';
    return 'Available';
  }

  get availableActions(): Action[] {
    const actions: Action[] = [];
    if (this.canInstall) actions.push(INSTALL_ACTION);
    if (this.isInstalled) actions.push(MANAGE_ACTION, UPGRADE_ACTION);
    if (this.canUninstall) actions.push(UNINSTALL_ACTION);
    return actions;
  }

  // Business logic methods
  async install(options: InstallOptions): Promise<void> {
    return this.$dispatch('suseai/install', { app: this, ...options });
  }

  async upgrade(options: UpgradeOptions): Promise<void> {
    return this.$dispatch('suseai/upgrade', { app: this, ...options });
  }
}
```

### Model Conventions

1. **Computed Properties**: Use getters for derived state
2. **Action Methods**: Prefix async actions with verbs (install, upgrade, delete)
3. **State Queries**: Use boolean getters with "is/can/has" prefixes
4. **Store Integration**: Use `$dispatch` for actions, `$getters` for store queries

## Store Management

### Store Architecture

Following resource-centric architecture patterns with centralized state management:

```typescript
// store/suseai-common.ts
export const suseaiFactory = () => ({
  state() {
    return {
      installations: {},
      repositories: [],
      discoveryProgress: {},
      config: {},
      errors: {}
    };
  },

  getters: {
    installationInfo: (state) => (slug: string) => state.installations[slug],
    installedApps: (state) => Object.values(state.installations)
      .filter((install: any) => install.status === 'deployed'),
    appsForCluster: (state) => (clusterId: string) =>
      Object.values(state.installations)
        .filter((install: any) => install.clusterId === clusterId),
  },

  mutations: {
    setInstallationInfo(state, { slug, info }) {
      Vue.set(state.installations, slug, info);
    },
    setDiscoveryProgress(state, { slug, progress }) {
      Vue.set(state.discoveryProgress, slug, progress);
    }
  },

  actions: {
    async discoverInstallations({ commit, dispatch, getters }) {
      // Implementation with progress tracking
    }
  }
});
```

### Store Conventions

1. **State Structure**: Flat state with logical groupings
2. **Getters**: Pure functions that derive computed state
3. **Mutations**: Synchronous state changes only
4. **Actions**: Async operations, API calls, complex business logic
5. **Progress Tracking**: Use progress states for long-running operations

## Component Architecture

### Standard Component Structure

All components follow standard UI patterns:

```vue
<template>
  <div>
    <Header>
      <template #title>{{ t('suseai.apps.title') }}</template>
      <template #actions>
        <LoadingButton
          :loading="loading"
          @click="performAction"
        >
          {{ t('suseai.apps.action') }}
        </LoadingButton>
      </template>
    </Header>

    <ResourceTable
      :schema="schema"
      :rows="items"
      :headers="headers"
      :table-actions="tableActions"
      :row-actions="rowActions"
      :loading="loading"
    >
      <template #cell:status="{ row }">
        <AppStatusBadge :app="row" />
      </template>
    </ResourceTable>
  </div>
</template>

<script>
export default {
  async fetch() {
    // Data fetching
  },

  computed: {
    items() {
      return this.$store.getters['suseai/all'];
    }
  },

  methods: {
    async performAction() {
      // Action implementation
    }
  }
}
</script>
```

### Component Conventions

1. **Use Standard Components**: Prefer Rancher UI components over custom ones
2. **Composition over Inheritance**: Use mixins and composables
3. **Props Interface**: Always define prop types and defaults
4. **Event Naming**: Use kebab-case for custom events
5. **Slot Usage**: Provide meaningful slot content

### Component Hierarchy

```
components/
├── app/                    # Domain-specific components
├── forms/                  # Reusable form components
└── shared/                 # Cross-domain shared components
```

## Service Layer

### Service Architecture

Services handle business logic and API interactions:

```typescript
// services/app-lifecycle-service.ts
export class AppLifecycleService {
  constructor(private store: any, private api: any) {}

  async installApp(app: AppResource, options: InstallOptions): Promise<void> {
    try {
      this.store.commit('suseai/setInstallationProgress', {
        slug: app.slug,
        progress: 'installing'
      });

      const result = await this.api.install(app.slug, options);

      this.store.commit('suseai/setInstallationInfo', {
        slug: app.slug,
        info: result
      });

      this.store.commit('suseai/setInstallationProgress', {
        slug: app.slug,
        progress: 'complete'
      });
    } catch (error) {
      this.handleError('Installation failed', error);
      throw error;
    }
  }

  private handleError(message: string, error: any): void {
    // Standardized error handling
  }
}
```

### Service Conventions

1. **Dependency Injection**: Constructor injection for dependencies
2. **Error Handling**: Consistent error handling patterns
3. **Progress Tracking**: Update store with operation progress
4. **Single Responsibility**: Each service handles one domain
5. **Interface Contracts**: Well-defined service interfaces

## Virtual MCP Implementation

### Overview

The Virtual MCP (Model Context Protocol) feature enables transformation of various data sources into MCP servers that can be consumed by AI assistants. This implementation follows the established architectural patterns while introducing new patterns for transformation workflows.

### Architecture Components

#### Service Layer (`services/virtual-mcp-service.ts`)

The VirtualMCPService handles all API interactions with the Virtual MCP backend:

```typescript
export class VirtualMCPService {
  // Server Management: CRUD operations for MCP servers
  static async getMCPServers(limit, offset, token)
  static async createMCPServer(server, token)
  static async updateMCPServer(id, updates, token)
  static async deleteMCPServer(id, token)

  // Transformation Methods: Convert sources to MCP specs
  static async transformOpenAPI(request, token)
  static async transformGraphQL(request, token)
  static async transformDatabase(request, token)
  static async combineServers(request, token)

  // Health Check: Service availability monitoring
  static async ping()
}
```

#### State Management (`composables/useVirtualMCP.ts`)

The useVirtualMCP composable provides reactive state management with polling:

```typescript
export const useVirtualMCP = () => {
  // Reactive State
  const servers = ref<MCPServer[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const metrics = ref<ServerMetrics>({ ... })

  // CRUD Operations
  const createServer = async (form) => { ... }
  const updateServer = async (id, updates) => { ... }
  const deleteServer = async (id) => { ... }

  // Real-time Updates
  const startPolling = () => { ... } // 5-second intervals
  const stopPolling = () => { ... }

  return { servers, loading, error, createServer, ... }
}
```

#### Component Hierarchy

```
components/VirtualMCP/
├── MetricsGrid.vue          # Server statistics dashboard
├── MCPServersTable.vue      # Server listing with actions
└── CreateServerWizard.vue   # 5-step creation workflow
```

### Transformation Workflow

The Virtual MCP implementation supports four transformation types:

1. **OpenAPI/Swagger**: REST API specifications → MCP servers
2. **GraphQL Schema**: GraphQL schemas → MCP servers
3. **Database Schema**: Database connections → MCP servers
4. **Combine Servers**: Multiple MCP servers → Unified server

### Key Patterns

#### Wizard-Based Creation

Multi-step wizard pattern for complex server creation:

```vue
<CreateServerWizard
  :show="showWizard"
  :available-servers="servers"
  @transform="handleTransform"
  @create="handleCreateServer"
  @close="closeWizard"
/>
```

#### Real-time Monitoring

Automatic polling with lifecycle management:

```typescript
onMounted(() => startPolling())
onUnmounted(() => stopPolling())
```

#### Proxy Configuration

CORS-free API access via Vue CLI proxy:

```javascript
// vue.config.js
devServer: {
  proxy: {
    '/api/virtual-mcp': {
      target: 'http://localhost:8912',
      changeOrigin: true,
      pathRewrite: { '^/api/virtual-mcp': '/api/v1' }
    }
  }
}
```

### Error Handling Patterns

- **Network Errors**: User-friendly messages for API failures
- **Validation Errors**: Form validation prevents invalid submissions
- **Transformation Errors**: Clear feedback during spec generation
- **File Upload Errors**: Graceful handling of file reading failures

### Type Safety

Comprehensive TypeScript interfaces ensure type safety:

```typescript
interface MCPServer {
  id?: string
  name: string
  description?: string
  status?: 'active' | 'inactive'
  tools?: MCPTool[]
  // ... additional properties
}

interface TransformRequest {
  name: string
  source: string
  source_type?: 'url' | 'file'
  auth?: AuthConfig
  overrides?: Record<string, any>
}
```

## TypeScript Conventions

### Type Definitions

```typescript
// types/app-types.ts
export interface AppData {
  slug: string;
  name: string;
  version: string;
  status: AppStatus;
  installations?: InstallationData[];
}

export interface InstallOptions {
  clusterId: string;
  namespace?: string;
  values?: Record<string, any>;
  dryRun?: boolean;
}

export type AppStatus = 'available' | 'installing' | 'installed' | 'failed';
```

### Type Safety Rules

1. **No `any` Types**: Use proper interfaces and union types
2. **Strict Mode**: Enable strict TypeScript compilation
3. **Generic Constraints**: Use proper generic constraints
4. **Runtime Validation**: Validate data at boundaries
5. **Type Guards**: Use type guards for type narrowing

## Feature Flag System

### Implementation Pattern

```typescript
// utils/feature-flags.ts
export function featureEnabled(featureName: string, clusterVersion?: string): boolean {
  const version = getClusterVersion(clusterVersion);
  const compatibleVersion = getLatestCompatibleVersion(version);

  return RELEASE_FEATURES[compatibleVersion]?.[featureName] ?? false;
}

const RELEASE_FEATURES = {
  '1.0.0': {
    multiClusterInstall: false,
    advancedValuesEditor: false
  },
  '1.1.0': {
    multiClusterInstall: true,
    advancedValuesEditor: true,
    batchOperations: false
  }
};
```

### Usage in Components

```vue
<template>
  <div>
    <FeatureFlag feature="multiClusterInstall">
      <ClusterSelector v-model="selectedClusters" multiple />
    </FeatureFlag>
  </div>
</template>
```

## Error Handling

### Standardized Error Handling

```typescript
// utils/error-handling.ts
export class ErrorHandler {
  static handle(error: Error, context: string, store: any): void {
    if (isDevelopmentMode()) {
      console.warn(`[SUSEAI] ${context}:`, error);
    }

    store.dispatch('growl/error', {
      title: 'Operation Failed',
      message: this.getUserFriendlyMessage(error)
    });
  }

  private static getUserFriendlyMessage(error: Error): string {
    // Convert technical errors to user-friendly messages
  }
}
```

### Error Conventions

1. **User-Friendly Messages**: Always show meaningful messages to users
2. **Development Logging**: Console logging only in development mode
3. **Error Boundaries**: Use error boundaries in Vue components
4. **Graceful Degradation**: Handle errors without breaking the interface

## Testing Patterns

### Unit Testing

```typescript
// tests/models/app-resource.spec.ts
describe('AppResource', () => {
  let app: AppResource;
  let mockStore: any;

  beforeEach(() => {
    mockStore = createMockStore();
    app = new AppResource(mockAppData, mockStore);
  });

  describe('isInstalled', () => {
    it('returns true when app has installations', () => {
      app.data.installations = [{ status: 'deployed' }];
      expect(app.isInstalled).toBe(true);
    });
  });
});
```

### Component Testing

```typescript
// tests/components/Apps.spec.ts
describe('Apps.vue', () => {
  it('displays apps in ResourceTable', async () => {
    const wrapper = mount(Apps, {
      store: mockStore,
      mocks: { $t: (key) => key }
    });

    await wrapper.vm.$nextTick();

    expect(wrapper.find('ResourceTable').exists()).toBe(true);
  });
});
```

## Development Workflow

### Code Review Checklist

1. **Architecture Compliance**: Follows established patterns
2. **Type Safety**: No `any` types, proper interfaces
3. **Error Handling**: Consistent error handling
4. **Performance**: No unnecessary re-renders or API calls
5. **Accessibility**: Proper ARIA labels and keyboard navigation
6. **Testing**: Adequate test coverage

### Debugging Guidelines

1. **Use Vue DevTools**: Inspect component state and store
2. **Development Mode**: Enable detailed logging
3. **Network Tab**: Monitor API calls and responses
4. **Store Inspector**: Track state changes

### Performance Considerations

1. **Lazy Loading**: Load components and data as needed
2. **Computed Properties**: Use computed properties for derived state
3. **Event Cleanup**: Remove event listeners on component destroy
4. **Memory Leaks**: Avoid circular references
