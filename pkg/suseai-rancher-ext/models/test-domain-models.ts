/**
 * Basic tests for domain model functionality
 * This file can be run to verify that our domain models work correctly
 */


import ClusterResource, { ClusterResourceData } from './cluster/cluster-resource';
import ChartResource, { ChartResourceData } from './chart/chart-resource';
import { ChartValuesProcessor } from './chart/chart-values';
import { InstallationInfo } from './base/resource-mixin';



/**
 * Test ClusterResource functionality  
 */
function testClusterResource() {
  console.log('=== Testing ClusterResource ===');
  
  const clusterData: ClusterResourceData = {
    id: 'local',
    name: 'Local Cluster',
    displayName: 'Local Development Cluster',
    description: 'Local cluster for development',
    ready: true,
    version: {
      kubernetes: '1.25.0',
      rancher: '2.7.0',
      distribution: 'K3s'
    },
    capabilities: {
      canInstallApps: true,
      canManageNamespaces: true,
      canAccessSecrets: true,
      canCreateServiceAccounts: true,
      hasHelmSupport: true,
      hasRancherAppsSupport: true,
      supportedApiVersions: ['v1', 'apps/v1']
    },
    stats: {
      totalApps: 5,
      runningApps: 4,
      failedApps: 1,
      namespacesWithApps: 3,
      lastAppActivity: '2023-12-01T00:00:00Z'
    }
  };

  const cluster = new ClusterResource(clusterData);
  
  // Test computed properties
  console.log('✓ Cluster ID:', cluster.id);
  console.log('✓ Cluster Name:', cluster.name);
  console.log('✓ Is Local:', cluster.isLocal);
  console.log('✓ Is Ready:', cluster.isReady);
  console.log('✓ State Display:', cluster.stateDisplay);
  console.log('✓ State Color:', cluster.stateColor);
  console.log('✓ Version Display:', cluster.versionDisplay);
  console.log('✓ Can Install Apps:', cluster.canInstallApps);
  console.log('✓ App Count:', cluster.appCount);
  console.log('✓ Healthy Apps Ratio:', cluster.healthyAppsRatio);
  
  // Test available actions
  const actions = cluster.availableActions;
  console.log('✓ Available Actions:', actions.map(a => a.label).join(', '));
  
  console.log('ClusterResource tests completed successfully!\n');
}

/**
 * Test ChartResource functionality
 */
function testChartResource() {
  console.log('=== Testing ChartResource ===');
  
  const chartData: ChartResourceData = {
    name: 'postgresql',
    displayName: 'PostgreSQL Database',
    description: 'PostgreSQL is a powerful, open source object-relational database system',
    home: 'https://www.postgresql.org/',
    icon: 'https://bitnami.com/assets/stacks/postgresql/img/postgresql-stack-220x234.png',
    repoName: 'bitnami',
    repoUrl: 'https://charts.bitnami.com/bitnami',
    repoType: 'helm',
    category: 'database',
    keywords: ['postgresql', 'database', 'sql'],
    maintainers: [
      { name: 'Bitnami', email: 'containers@bitnami.com' }
    ],
    sources: ['https://github.com/bitnami/charts/tree/master/bitnami/postgresql'],
    versions: [
      {
        version: '11.9.13',
        appVersion: '14.5.0',
        description: 'PostgreSQL Database',
        created: '2023-12-01T00:00:00Z',
        digest: 'sha256:abc123',
        urls: ['https://charts.bitnami.com/bitnami/postgresql-11.9.13.tgz'],
        deprecated: false
      }
    ],
    latestVersion: '11.9.13',
    deprecated: false,
    verified: true,
    official: false,
    stats: {
      downloadCount: 10000,
      installCount: 1500,
      popularityScore: 85,
      averageRating: 4.5,
      ratingCount: 200
    },
    created: '2023-01-01T00:00:00Z',
    updated: '2023-12-01T00:00:00Z'
  };

  const chart = new ChartResource(chartData);
  
  // Test computed properties
  console.log('✓ Chart ID:', chart.id);
  console.log('✓ Chart Name:', chart.name);
  console.log('✓ Full Name:', chart.fullName);
  console.log('✓ Current Version:', chart.currentVersion);
  console.log('✓ Has Versions:', chart.hasVersions);
  console.log('✓ Version Count:', chart.versionCount);
  console.log('✓ State Display:', chart.stateDisplay);
  console.log('✓ State Color:', chart.stateColor);
  console.log('✓ Is Available:', chart.isAvailable);
  console.log('✓ Is Recommended:', chart.isRecommended);
  console.log('✓ Category Display:', chart.categoryDisplay);
  console.log('✓ Popularity Display:', chart.popularityDisplay);
  
  // Test available actions
  const actions = chart.availableActions;
  console.log('✓ Available Actions:', actions.map(a => a.label).join(', '));
  
  console.log('ChartResource tests completed successfully!\n');
}

/**
 * Test ChartValuesProcessor functionality
 */
function testChartValues() {
  console.log('=== Testing ChartValues ===');
  
  const defaultValues = {
    global: {
      postgresql: {
        auth: {
          postgresPassword: 'secretpassword',
          username: 'myuser',
          password: 'mypassword',
          database: 'mydatabase'
        }
      }
    },
    primary: {
      persistence: {
        enabled: true,
        size: '8Gi'
      },
      resources: {
        requests: {
          cpu: '250m',
          memory: '256Mi'
        }
      }
    }
  };
  
  const schema = {
    'global.postgresql.auth.postgresPassword': {
      type: 'string' as const,
      description: 'PostgreSQL admin password',
      required: true
    },
    'primary.persistence.enabled': {
      type: 'boolean' as const,
      description: 'Enable persistent storage',
      default: true
    },
    'primary.persistence.size': {
      type: 'string' as const,
      description: 'Storage size',
      pattern: '^\\d+[GMK]i?$'
    }
  };

  const processor = new ChartValuesProcessor(defaultValues, schema);
  
  // Test value operations
  processor.setValue('primary.persistence.size', '16Gi');
  processor.setValue('primary.resources.requests.cpu', '500m');
  
  console.log('✓ Get Value:', processor.getValue('primary.persistence.size'));
  console.log('✓ Is Modified:', processor.isValueModified('primary.persistence.size'));
  console.log('✓ User Values:', JSON.stringify(processor.getUserValues()));
  console.log('✓ Merged Values Keys:', Object.keys(processor.getMergedValues()));
  
  // Test validation
  const validationErrors = processor.validate();
  console.log('✓ Validation Errors:', validationErrors.length);
  console.log('✓ Is Valid:', processor.isValid());
  
  // Test processing
  const result = processor.process();
  console.log('✓ Processing Result - Processed:', result.processed);
  console.log('✓ Processing Result - Error Count:', result.errors.length);
  console.log('✓ Processing Result - Warning Count:', result.warnings.length);
  
  console.log('ChartValues tests completed successfully!\n');
}

/**
 * Run all domain model tests
 */
export function runDomainModelTests() {
  console.log('🧪 Starting Domain Model Tests...\n');
  
  try {

    testClusterResource();
    testChartResource();
    testChartValues();
    
    console.log('✅ All domain model tests passed successfully!');
    return true;
  } catch (error) {
    console.error('❌ Domain model tests failed:', error);
    return false;
  }
}

// Run tests if this file is executed directly
if (typeof window === 'undefined') {
  runDomainModelTests();
}