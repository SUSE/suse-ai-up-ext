import { importTypes } from '@rancher/auto-import';
import type { IPlugin } from '@shell/core/types';
import routes from './routing';
import * as productModule from './product';

export default function(plugin: IPlugin): void {
  importTypes(plugin);
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  plugin.metadata = require('./package.json');

  // Register the icon
  plugin.register('import', 'suseai', () => import('./assets/logo-icon.svg'));

  // Pass the MODULE so Rancher finds `init`
  plugin.addProduct(productModule as any);

  // Add routes explicitly
  plugin.addRoutes(routes);
}
