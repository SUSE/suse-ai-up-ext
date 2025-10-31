import type { AppCollectionItem, AppRepository } from '../models/app/app-collection';
import AppResource, { AppResourceData } from '../models/app/app-resource';

// Re-export types
export type { AppCollectionItem, AppRepository };

// Mock data for SUSE AI apps - replace with actual API calls
const mockSuseAiAppsData: AppResourceData[] = [
  {
    name: 'SUSE AI Assistant',
    slug_name: 'suse-ai-assistant',
    description: 'AI-powered assistant for SUSE environments',
    packaging_format: 'HELM_CHART'
  }
];

// Fetch SUSE AI apps from the catalog
export async function fetchSuseAiApps(clusterIdOrStore?: string | any): Promise<AppCollectionItem[]> {
  // TODO: Implement actual API call to fetch SUSE AI apps
  // For now, return mock AppResource instances
  return mockSuseAiAppsData.map(data => new AppResource(data));
}

// Fetch cluster repositories
export async function fetchClusterRepositories(clusterId: string): Promise<AppRepository[]> {
  // TODO: Implement actual API call
  return [];
}

// Fetch all repository apps
export async function fetchAllRepositoryApps(store: any): Promise<{ [repoName: string]: AppCollectionItem[] }> {
  // TODO: Implement actual API call
  return {};
}

// Fetch apps from a specific repository
export async function fetchAppsFromRepository(store: any, repoName: string): Promise<AppCollectionItem[]> {
  // TODO: Implement actual API call
  return mockSuseAiAppsData.map(data => new AppResource(data));
}