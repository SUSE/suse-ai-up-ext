// SUSE AI Store

interface SUSEAIState {
  settings: {
    proxyInstalled: boolean;
    selectedServices: string[];
  };
  apps: {
    items: any[];
    loading: boolean;
    error: string | null;
  };
}

export default {
  namespaced: true,

  state(): SUSEAIState {
    return {
      settings: {
        proxyInstalled: false,
        selectedServices: []
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
    },

    SET_SELECTED_SERVICES(state: SUSEAIState, services: string[]) {
      state.settings.selectedServices = services;
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
    apps: (state: SUSEAIState) => state.apps.items,
    appsLoading: (state: SUSEAIState) => state.apps.loading,
    appsError: (state: SUSEAIState) => state.apps.error
  }
};