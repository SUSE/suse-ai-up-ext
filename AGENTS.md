# SUSE AI Rancher Extension - Agent Guidelines

## Commands
- **Build**: `yarn build-pkg suseai-rancher-ext`
- **Dev**: `yarn dev`
- **Type check**: `yarn typecheck` (vue-tsc --noEmit)
- **Test**: No test runner - use `yarn typecheck` for validation
- **Clean**: `yarn clean`
- **Serve packages**: `yarn serve-pkgs`
- **Publish packages**: `yarn publish-pkgs`

## Code Style
- **Naming**: PascalCase types/interfaces, camelCase vars/functions, UPPER_SNAKE_CASE constants
- **Files**: kebab-case Vue components, camelCase TS files
- **Imports**: External libs → internal utils → type imports → local types
- **Vue**: Composition API with `defineComponent`, scoped styles, explicit emits
- **Formatting**: 2 spaces, no semicolons, single quotes, double quotes in JSX
- **Type Safety**: Strict mode, avoid `any`, use discriminated unions, type guards
- **Error Handling**: try/catch async ops, error boundaries, centralized logger

## Dependencies
- Vue CLI 5.x + TypeScript, Rancher Shell ^3.0.4, Axios ^1.7.2, Node.js >=20
- Path mappings: `~/*` `@/*` → project root, `@shell/*` → Rancher shell

## Workflow
- Run `yarn typecheck` before commits
- Run `yarn build-pkg` to verify builds
- Use feature flags for version-aware functionality