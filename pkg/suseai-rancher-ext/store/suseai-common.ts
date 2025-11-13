// SUSE AI Store
import { persistLoad, persistSave } from '../services/ui-persist';

interface SUSEAIState {
  settings: {
    proxyInstalled: boolean;
    selectedServices: string[];
    selectedInstance: any; // ServiceInstance
    serviceUrl: string;
  };
  apps: {
    items: any[];
    loading: boolean;
    error: string | null;
  };
}

const SETTINGS_KEY = 'suseai-settings';

export default {
  namespaced: true,

  state(): SUSEAIState {
    // Load persisted settings
    const persistedSettings = persistLoad(SETTINGS_KEY, {
      proxyInstalled: false,
      selectedServices: [],
      selectedInstance: null,
      serviceUrl: ''
    });

    return {
      settings: persistedSettings,
      apps: {
        items: [],
        loading: false,
        error: null
      }
    };
  },

  mutations: {
    SET_PROXY_INSTALLED(state: SUSEAIState, value: boolean) {
      state.settings.proxyInstalled = value;
      persistSave(SETTINGS_KEY, state.settings);
    },

    SET_SELECTED_SERVICES(state: SUSEAIState, services: string[]) {
      state.settings.selectedServices = services;
      persistSave(SETTINGS_KEY, state.settings);
    },

    SET_SELECTED_INSTANCE(state: SUSEAIState, instance: any) {
      state.settings.selectedInstance = instance;
      persistSave(SETTINGS_KEY, state.settings);
    },

    SET_SERVICE_URL(state: SUSEAIState, url: string) {
      state.settings.serviceUrl = url;
      persistSave(SETTINGS_KEY, state.settings);
    },

    SET_APPS_LOADING(state: SUSEAIState, loading: boolean) {
      state.apps.loading = loading;
    },

    SET_APPS_ERROR(state: SUSEAIState, error: string | null) {
      state.apps.error = error;
    },

    SET_APPS_ITEMS(state: SUSEAIState, items: any[]) {
      state.apps.items = items;
    }
  },

  actions: {
    setProxyInstalled({ commit }: any, value: boolean) {
      commit('SET_PROXY_INSTALLED', value);
    },

    setSelectedServices({ commit }: any, services: string[]) {
      commit('SET_SELECTED_SERVICES', services);
    },

    setSelectedInstance({ commit }: any, instance: any) {
      commit('SET_SELECTED_INSTANCE', instance);
    },

    setServiceUrl({ commit }: any, url: string) {
      commit('SET_SERVICE_URL', url);
    },

    async fetchAllApps({ commit }: any, { clusterId }: { clusterId: string }) {
      try {
        commit('SET_APPS_LOADING', true);
        commit('SET_APPS_ERROR', null);

        // TODO: Implement actual API call
        const apps: any[] = [];

        commit('SET_APPS_ITEMS', apps);
      } catch (error: any) {
        commit('SET_APPS_ERROR', error instanceof Error ? error.message : 'Failed to fetch apps');
      } finally {
        commit('SET_APPS_LOADING', false);
      }
    },

    async discoverInstallations({ commit }: any) {
      // TODO: Implement installation discovery
      console.log('Discovering installations...');
    }
  },

  getters: {
    proxyInstalled: (state: SUSEAIState) => state.settings.proxyInstalled,
    selectedServices: (state: SUSEAIState) => state.settings.selectedServices,
    selectedInstance: (state: SUSEAIState) => state.settings.selectedInstance,
    serviceUrl: (state: SUSEAIState) => state.settings.serviceUrl,
    apps: (state: SUSEAIState) => state.apps.items,
    appsLoading: (state: SUSEAIState) => state.apps.loading,
    appsError: (state: SUSEAIState) => state.apps.error
  }
};