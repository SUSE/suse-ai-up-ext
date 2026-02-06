// App types

export interface AppInstallationSummary {
  clusterId: string;
  namespace: string;
  releaseName: string;
  status: string;
  version?: string;
  lastDeployed?: string;
  error?: string;
}

export interface InstanceData extends AppInstallationSummary {
  instanceName?: string;
  description?: string;
  clusterName?: string;
  chartVersion?: string;
  appVersion?: string;
  ready?: boolean;
}