import { PRODUCT, PAGE_TYPES } from './config/suseai';
import type { RouteLocationNormalized, NavigationGuardNext } from 'vue-router';

export default [


  {
    name:     `c-cluster-${PRODUCT}-home-root`,
    path:     `/c/:cluster/${PRODUCT}`,
    redirect: { name: `c-cluster-${PRODUCT}-universal-adapter`, params: { product: PRODUCT } },
    meta:     { product: PRODUCT }
  },

  // Universal Proxy page
  {
    name:      `c-cluster-${PRODUCT}-universal-adapter`,
    path:      `/c/:cluster/${PRODUCT}/universal-adapter`,
    component: () => import('./pages/Home.vue'),
    meta:      { product: PRODUCT, category: 'universal-adapter' }
  },
  // MCP Gateway page
  {
    name:      `c-cluster-${PRODUCT}-mcp-gateway`,
    path:      `/c/:cluster/${PRODUCT}/mcp-gateway`,
    component: () => import('./pages/MCPGateway.vue'),
    meta:      { product: PRODUCT, category: 'mcp-gateway' }
  },
  // MCP Registry page
  {
    name:      `c-cluster-${PRODUCT}-mcp-registry`,
    path:      `/c/:cluster/${PRODUCT}/mcp-registry`,
    component: () => import('./pages/MCPRegistry.vue'),
    meta:      { product: PRODUCT, category: 'mcp-registry' }
  },

   // Virtual MCP page
   {
     name:      `c-cluster-${PRODUCT}-virtual-mcp`,
     path:      `/c/:cluster/${PRODUCT}/virtual-mcp`,
     component: () => import('./pages/VirtualMCP.vue'),
     meta:      { product: PRODUCT, category: 'virtual-mcp' },
     beforeEnter: (to: any, from: any, next: any) => {
       // Add a timestamp query param to force route change detection
       to.query.t = Date.now().toString();
       next();
     }
   },

  // SmartAgents page
  {
    name:      `c-cluster-${PRODUCT}-smart-agents`,
    path:      `/c/:cluster/${PRODUCT}/smart-agents`,
    component: () => import('./pages/SmartAgents.vue'),
    meta:      { product: PRODUCT, category: 'smart-agents' }
  },

    // Settings page
   {
     name:      `c-cluster-${PRODUCT}-settings`,
     path:      `/c/:cluster/${PRODUCT}/settings`,
     component: () => import('./pages/Settings.vue'),
     meta:      { product: PRODUCT, category: 'settings' }
   },

  // Test wizard route
  {
    name:      `c-cluster-${PRODUCT}-test-wizard`,
    path:      `/c/:cluster/${PRODUCT}/test-wizard`,
    component: () => import('./pages/components/TestWizard.vue'),
    meta:      { product: PRODUCT, category: 'test' }
  },





   // Settings management
   {
     name:      `c-cluster-${PRODUCT}-${PAGE_TYPES.SETTINGS}`,
     path:      `/c/:cluster/${PRODUCT}/${PAGE_TYPES.SETTINGS}`,
     component: () => import('./pages/Settings.vue'),
     meta:      { product: PRODUCT, category: 'settings' }
   },


];
