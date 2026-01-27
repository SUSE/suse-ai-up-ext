A Rancher UI Extension for managing SUSE AI applications across Kubernetes clusters. This extension provides a unified interface for installing, managing, and monitoring AI workloads in Rancher-managed clusters.

## Features

### Virtual MCP (Model Context Protocol)

Transform various data sources into MCP servers that can be consumed by AI assistants:

- **OpenAPI/Swagger**: Convert REST API specifications into MCP servers
- **GraphQL Schema**: Transform GraphQL schemas into MCP servers
- **Database Schema**: Generate MCP servers from database connections
- **Combine Servers**: Merge multiple MCP servers into unified interfaces

### Key Capabilities

- **Real-time Monitoring**: Live server status updates with 5-second polling
- **Wizard-based Creation**: Step-by-step server creation with validation
- **File Upload Support**: Direct file upload for OpenAPI specifications
- **Multi-source Transformation**: Support for URLs and file-based inputs
- **Comprehensive Error Handling**: User-friendly error messages and validation

## Architecture Overview

This extension follows established domain-model-driven architecture patterns that provide:

- **Domain Models**: Rich resource models with computed properties and actions
- **Centralized Store Management**: Vuex-style state management following standard patterns
- **Standard UI Components**: Consistent integration with Rancher's design system
- **Feature Flag System**: Version-aware feature management
- **Utility-First Architecture**: Reusable utility modules and services

## How to use it

Use this extension is very simple.

1. Open Rancher UI
2. Choose the local cluster, this will be where we'll install the extension
3.  Click Apps and Repositories
4. Add a new repository with this informations
 ```SHELL
 Name: suse-ai-universal-proxy-ui
 Select GIT
 Url: https://github.com/SUSE/suse-ai-up-ext
 Git Branch: v0.1.0
 ```
 5. Click Create
 
 Wait for the repository to be refreshed and show the "Active" status.
 Move to the Extension icon on the sidebar you should be able to see the new extension named "SUSE AI Universal Proxy"


