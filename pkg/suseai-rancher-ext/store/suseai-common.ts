// SUSE AI Store
import { persistLoad, persistSave } from '../services/ui-persist';
import { SUSEAIProxyConfig } from '../config/suseai';

interface SUSEAIState {
  settings: {
    proxyInstalled: boolean;
    selectedServices: string[];
    availableClusters: any[];
    serviceUrls: string[];
    selectedCluster: string;
    selectedPod: any;
  };
  proxyConfig: SUSEAIProxyConfig;
}

const SETTINGS_KEY = 'suseai-settings';
const PROXY_CONFIG_KEY = 'suseai-proxy-config';

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

    // Load persisted proxy config
    const persistedProxyConfig = persistLoad(PROXY_CONFIG_KEY, {});

    return {
      settings: {
        ...persistedSettings,
        selectedCluster: persistedSettings.selectedCluster || '',
        selectedPod: persistedSettings.selectedPod || null
      },
      proxyConfig: persistedProxyConfig
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

      SET_PROXY_CONFIG(state: SUSEAIState, config: SUSEAIProxyConfig) {
        state.proxyConfig = config;
        persistSave(PROXY_CONFIG_KEY, config);
      },


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

      setProxyConfig({ commit }: any, config: SUSEAIProxyConfig) {
        commit('SET_PROXY_CONFIG', config);
      },


   },

  getters: {
    proxyInstalled: (state: SUSEAIState) => state.settings.proxyInstalled,
    selectedServices: (state: SUSEAIState) => state.settings.selectedServices,
    availableClusters: (state: SUSEAIState) => state.settings.availableClusters,
    serviceUrls: (state: SUSEAIState) => state.settings.serviceUrls,
    proxyConfig: (state: SUSEAIState) => state.proxyConfig,

  }
};