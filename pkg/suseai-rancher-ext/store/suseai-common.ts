// SUSE AI Store
import { persistLoad, persistSave } from '../services/ui-persist';

interface SUSEAIState {
  settings: {
    proxyInstalled: boolean;
    selectedServices: string[];
    availableClusters: any[];
    serviceUrls: string[];
    selectedCluster: string;
    selectedPod: any;
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
      availableClusters: [],
      serviceUrls: [],
      selectedCluster: '',
      selectedPod: null
    });

    return {
      settings: {
        ...persistedSettings,
        selectedCluster: persistedSettings.selectedCluster || '',
        selectedPod: persistedSettings.selectedPod || null
      },
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

    SET_AVAILABLE_CLUSTERS(state: SUSEAIState, clusters: any[]) {
      state.settings.availableClusters = clusters;
      persistSave(SETTINGS_KEY, state.settings);
    },

     SET_SERVICE_URLS(state: SUSEAIState, urls: string[]) {
       state.settings.serviceUrls = urls;
       persistSave(SETTINGS_KEY, state.settings);
     },

     SET_SELECTED_CLUSTER(state: SUSEAIState, clusterId: string) {
       state.settings.selectedCluster = clusterId;
       persistSave(SETTINGS_KEY, state.settings);
     },

     SET_SELECTED_POD(state: SUSEAIState, pod: any) {
       state.settings.selectedPod = pod;
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

    setAvailableClusters({ commit }: any, clusters: any[]) {
      commit('SET_AVAILABLE_CLUSTERS', clusters);
    },

     setServiceUrls({ commit }: any, urls: string[]) {
       commit('SET_SERVICE_URLS', urls);
     },

     setSelectedCluster({ commit }: any, clusterId: string) {
       commit('SET_SELECTED_CLUSTER', clusterId);
     },

     setSelectedPod({ commit }: any, pod: any) {
       commit('SET_SELECTED_POD', pod);
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
    availableClusters: (state: SUSEAIState) => state.settings.availableClusters,
    serviceUrls: (state: SUSEAIState) => state.settings.serviceUrls,
    apps: (state: SUSEAIState) => state.apps.items,
    appsLoading: (state: SUSEAIState) => state.apps.loading,
    appsError: (state: SUSEAIState) => state.apps.error
  }
};