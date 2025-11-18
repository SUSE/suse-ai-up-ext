import type { IPlugin } from '@shell/core/types';
import suseaiStore from './store/suseai-common';
import {
  PRODUCT,
  BLANK_CLUSTER,
  SUSEAI_PRODUCT,
  VIRTUAL_TYPES,

  PAGE_TYPES
} from './config/suseai';
import type { RancherStore } from './types/rancher-types';

export { PRODUCT } from './config/suseai';

export function init($plugin: IPlugin, store: RancherStore) {
  const { product, virtualType, basicType, weightType } = $plugin.DSL(store, PRODUCT);

  // Register store modules following standard patterns
  store.registerModule?.(PRODUCT, suseaiStore);

  // Configure product following standard patterns


    product({
    category: SUSEAI_PRODUCT.category,
    name: PRODUCT,
    icon: SUSEAI_PRODUCT.icon,
    inStore: SUSEAI_PRODUCT.inStore,
    weight: SUSEAI_PRODUCT.weight,
    to: {
      name: `c-cluster-${PRODUCT}-universal-adapter`,
      params: { product: PRODUCT, cluster: BLANK_CLUSTER },
      meta: { product: PRODUCT }
    }
  });
  // Register virtual types following standard patterns
  VIRTUAL_TYPES.forEach(vType => {
    virtualType({
      name: vType.name,
      label: vType.label,
      route: vType.route
    });
  });


  // registering some of the defined pages as side-menu entries in a group
  basicType([PAGE_TYPES.SETTINGS, PAGE_TYPES.MCPGATEWAY, PAGE_TYPES.MCPREGISTRY, PAGE_TYPES.VIRTUALMCP, PAGE_TYPES.SMARTAGENTS], PAGE_TYPES.UP);

  // Assign weights to menu items (higher weight = higher position)
  // Leave SmartAgents without weight to test ordering behavior
  weightType(PAGE_TYPES.SETTINGS, 100, true);
  weightType(PAGE_TYPES.MCPGATEWAY, 90, true);
  weightType(PAGE_TYPES.MCPREGISTRY, 80, true);
  weightType(PAGE_TYPES.VIRTUALMCP, 70, true);
  // Note: SmartAgents has no weight assigned
}
