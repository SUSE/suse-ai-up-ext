<script lang="ts" setup>
import { ref, computed, onMounted, watch, getCurrentInstance } from 'vue';
import yaml from 'js-yaml';
import { Banner } from '@rancher/shell/rancher-components/Banner';
import Loading from '@shell/components/Loading';
import AsyncButton from '@shell/components/AsyncButton';
import BasicInfoStep from './wizard/BasicInfoStep.vue';
import TargetStep from './wizard/TargetStep.vue';
import ValuesStep from './wizard/ValuesStep.vue';
import ReviewStep from './wizard/ReviewStep.vue';
import {
  findChartInRepo,
  ensureNamespace,
  createOrUpgradeApp,
  listChartVersions,
  fetchChartDefaultValues,
  ensureRegistrySecretSimple,
  ensureServiceAccountPullSecret,
  ensurePullSecretOnAllSAs,
  waitForSecretReady,
  waitForAppInstall,
  getClusters,
  appExists,
  discoverExistingInstall,
  getInstalledAppDetails,
  getInstalledHelmDetails,
  inferClusterRepoForChart,
  deleteApp
} from '../../services/rancher-apps';
import { getRepoAuthForClusterRepo } from '../../services/repo-auth';
import { persistLoad, persistSave, persistClear } from '../../services/ui-persist';

const REPO_CLUSTER = 'local' as const;

type WizardMode = 'install' | 'manage';

type WizardForm = {
  release: string;
  namespace: string;
  cluster: string; // single cluster for install mode
  clusters: string[]; // multiple clusters for manage mode
  initial: string[]; // for manage mode - original clusters
  chartRepo: string;
  chartName: string;
  chartVersion: string;
  values: Record<string, any>;
};

interface Props {
  slug: string;
  mode?: WizardMode;
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'install'
});

const vm = getCurrentInstance()!.proxy as any;
const store = vm.$store;
const router = vm.$router;
const route = vm.$route;

// Note: step tracking is now handled by the Wizard component
const loading = ref(true);
const submitting = ref(false);
const error = ref<string | null>(null);

const versions = ref<string[]>([]);
const loadingVersions = ref(false);
const loadingValues = ref(false);

const lastDefaultsKey = ref<string>('');
const userEdited = ref(false);
const versionDirty = ref(false);

const PKEY = `${props.mode}.${props.slug}`;
const TTL = 1000 * 60 * 60; // 1h

const form = ref<WizardForm>({
  release: props.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
  namespace: `${props.slug}-system`,
  cluster: '',
  clusters: [],
  initial: [],
  chartRepo: '',
  chartName: props.slug,
  chartVersion: '',
  values: {}
});

// Mode and version computed properties - must be declared before wizardSteps
const isInstallMode = computed(() => props.mode === 'install');
const isManageMode = computed(() => props.mode === 'manage');

const versionOptions = computed(() =>
  (versions.value || []).map(v => ({ label: v, value: v }))
);

// Wizard step configuration for Rancher Wizard component
const wizardSteps = computed(() => [
  {
    name: 'basic-info',
    label: 'Basic Information',
    ready: true, // Always allow navigation to this step
    weight: 1,
    previousButton: { disable: false }
  },
  {
    name: 'target',
    label: 'Target Clusters',
    ready: !!form.value.release && !!form.value.namespace && !!form.value.chartRepo && !!form.value.chartName && !!form.value.chartVersion && !loadingVersions.value,
    weight: 2,
    previousButton: { disable: false }
  },
  {
    name: 'values',
    label: 'Configuration',
    ready: (isInstallMode.value ? !!form.value.cluster : !!form.value.clusters.length) && !loadingValues.value,
    weight: 3,
    previousButton: { disable: false }
  },
  {
    name: 'review',
    label: 'Review',
    ready: (isInstallMode.value ? !!form.value.cluster : !!form.value.clusters.length) && !loadingValues.value,
    weight: 4,
    previousButton: { disable: false }
  }
]);

const currentStep = ref(0);

const defaultsKey = computed(() => `${form.value.chartRepo}//${form.value.chartName}@${form.value.chartVersion}`);

// Restore persisted state
const saved = persistLoad<{ step?: number; form?: Partial<WizardForm> }>(PKEY, {}, TTL);
if (saved.form) Object.assign(form.value, saved.form);
if (typeof saved.step === 'number') currentStep.value = Math.min(saved.step, wizardSteps.value.length - 1);
watch([form, currentStep], () => persistSave(PKEY, { step: currentStep.value, form: form.value }), { deep: true });

// The Wizard component handles step navigation based on step.ready property
const isLastStep = computed(() => currentStep.value === wizardSteps.value.length - 1);

const finalButtonLabel = computed(() => isInstallMode.value ? 'Install' : 'Save');
const finalButtonMode = computed(() => isInstallMode.value ? 'install' : 'save');
const wizardTitle = computed(() => isInstallMode.value ? 'Install' : 'Manage');

// Basic info form computed
const basicInfoForm = computed({
  get: () => ({
    release: form.value.release,
    namespace: form.value.namespace,
    chartRepo: form.value.chartRepo,
    chartName: form.value.chartName,
    chartVersion: form.value.chartVersion
  }),
  set: (value) => {
    form.value.release = value.release;
    form.value.namespace = value.namespace;
    form.value.chartRepo = value.chartRepo;
    form.value.chartName = value.chartName;
    form.value.chartVersion = value.chartVersion;
  }
});

onMounted(async () => {
  try {
    console.log(`[SUSE-AI DEBUG] AppWizard mounted for ${props.slug}, mode: ${props.mode}`);
    if (isInstallMode.value) {
      await initializeInstallMode();
    } else {
      await initializeManageMode();
    }
    await refreshVersions();
    console.log(`[SUSE-AI DEBUG] AppWizard initialization complete for ${props.slug}`);
  } catch (e: any) {
    console.error(`[SUSE-AI ERROR] Failed to initialize AppWizard for ${props.slug}:`, e);
    error.value = `Failed to initialize: ${e?.message || 'Unknown error'}`;
  } finally {
    loading.value = false;
  }
});

async function initializeInstallMode() {
  if (store && (!form.value.chartRepo || !form.value.chartVersion)) {
    console.log(`[SUSE-AI DEBUG] Initializing install mode for ${props.slug}`);

    // First, try to find the correct repository for this chart
    const correctRepo = await inferClusterRepoForChart(store, props.slug);
    console.log(`[SUSE-AI DEBUG] Inferred repo for ${props.slug}:`, correctRepo);

    if (correctRepo) {
      form.value.chartRepo = correctRepo;

      // Now look for the chart in the correct repository
      const guess = await findChartInRepo(store, REPO_CLUSTER, correctRepo, props.slug);
      console.log(`[SUSE-AI DEBUG] Chart found in ${correctRepo}:`, guess);
      if (guess) {
        form.value.chartName = guess.chartName;
        form.value.chartVersion = form.value.chartVersion || guess.version;
      }
    } else {
      console.log(`[SUSE-AI DEBUG] No specific repo found, trying all repositories for ${props.slug}`);
      // Fallback: try all repositories
      const repos = await store.dispatch('rancher/request', {
        url: '/k8s/clusters/local/apis/catalog.cattle.io/v1/clusterrepos?limit=1000'
      });
      const items = repos?.data?.items || repos?.data || repos?.items || [];
      console.log(`[SUSE-AI DEBUG] Found ${items.length} repositories to search`);

      // Try each repository until we find the chart
      for (const repo of items) {
        const repoName = repo?.metadata?.name;
        if (!repoName) continue;

        console.log(`[SUSE-AI DEBUG] Searching ${repoName} for ${props.slug}`);
        const guess = await findChartInRepo(store, REPO_CLUSTER, repoName, props.slug);
        if (guess) {
          console.log(`[SUSE-AI DEBUG] Found ${props.slug} in ${repoName}:`, guess);
          form.value.chartRepo = repoName;
          form.value.chartName = guess.chartName;
          form.value.chartVersion = form.value.chartVersion || guess.version;
          break;
        }
      }
    }

    console.log(`[SUSE-AI DEBUG] Final form state after init:`, {
      chartRepo: form.value.chartRepo,
      chartName: form.value.chartName,
      chartVersion: form.value.chartVersion
    });
  }

  // Load default values immediately for install mode
  if (form.value.chartRepo && form.value.chartName && form.value.chartVersion) {
    try {
      await loadDefaultsFromChart();
    } catch (e) {
      console.warn('Failed to load default values during install mode initialization:', e);
    }
  }
}

async function initializeManageMode() {
  console.log('[SUSE-AI DEBUG] === INITIALIZE MANAGE MODE START ===');
  console.log('[SUSE-AI DEBUG] Form state before init:', JSON.stringify({
    release: form.value.release,
    namespace: form.value.namespace,
    chartName: form.value.chartName,
    chartVersion: form.value.chartVersion,
    chartRepo: form.value.chartRepo,
    valuesKeys: Object.keys(form.value.values),
    valuesLength: Object.keys(form.value.values).length
  }, null, 2));

  if (!store) throw new Error('Store not available');
  const currentCluster = (route?.params?.cluster as string) || '';

  // First try exact match (release/ns) across clusters
  const clusters = await getClusters(store);
  const hits: string[] = [];
  for (const c of clusters) {
    const exists = await appExists(store, c.id, form.value.namespace, form.value.release);
    if (exists) hits.push(c.id);
  }
  form.value.initial = hits.slice();
  if (!form.value.clusters?.length) form.value.clusters = hits.slice();

  console.log('[SUSE-AI DEBUG] Found app in clusters:', hits);

  // Discover existing install if not found
  if (!form.value.initial.length) {
    const ex = await discoverExistingInstall(store, props.slug, form.value.chartName, currentCluster);
    if (ex) {
      form.value.release = ex.release;
      form.value.namespace = ex.namespace;
      form.value.chartName = ex.chartName || form.value.chartName;
      form.value.chartVersion = ex.version || form.value.chartVersion;
      form.value.initial = ex.clusters.slice();
      form.value.clusters = ex.clusters.slice();
    }
  }

  // Get details from preferred cluster
  const preferred = form.value.initial.includes(currentCluster) && currentCluster
    ? currentCluster
    : (form.value.initial[0] || currentCluster || 'local');

  let gotAnyValues = false;
  if (preferred) {
    console.log('[SUSE-AI DEBUG] Trying to load values from preferred cluster:', preferred);
    try {
      console.log('[SUSE-AI DEBUG] Loading installed app details from', { cluster: preferred, namespace: form.value.namespace, release: form.value.release });
      const det = await getInstalledAppDetails(store, preferred, form.value.namespace, form.value.release);
      console.log('[SUSE-AI DEBUG] Got app details:', det);
      console.log('[SUSE-AI DEBUG] App details values keys:', Object.keys(det.values || {}));
      console.log('[SUSE-AI DEBUG] App details values:', det.values);

      if (det.repoName) form.value.chartRepo = det.repoName;
      if (det.chartName) form.value.chartName = det.chartName;
      if (det.chartVersion) form.value.chartVersion = det.chartVersion;
      if (det.values && Object.keys(det.values).length) {
        console.log('[SUSE-AI DEBUG] BEFORE assigning values - form.values keys:', Object.keys(form.value.values));
        form.value.values = det.values;
        gotAnyValues = true;
        console.log('[SUSE-AI DEBUG] AFTER assigning values - form.values keys:', Object.keys(form.value.values));
        console.log('[SUSE-AI DEBUG] AFTER assigning values - form.values:', form.value.values);
        console.log('[SUSE-AI DEBUG] Loaded values from Rancher App successfully!');
      } else {
        console.log('[SUSE-AI] No values found in Rancher App, trying Helm fallback');
        // Try Helm fallback when Rancher App has no values
        try {
          const hel = await getInstalledHelmDetails(store, preferred, form.value.namespace, form.value.release);
          console.log('[SUSE-AI DEBUG] Got Helm details:', hel);
          console.log('[SUSE-AI DEBUG] Helm values keys:', Object.keys(hel.values || {}));
          console.log('[SUSE-AI DEBUG] Helm values SAMPLE (first 500 chars):', JSON.stringify(hel.values, null, 2).substring(0, 500));

          if (hel.chartName) form.value.chartName = hel.chartName;
          if (hel.chartVersion) form.value.chartVersion = hel.chartVersion || form.value.chartVersion;
          if (hel.values && Object.keys(hel.values).length) {
            form.value.values = hel.values;
            gotAnyValues = true;
            console.log('[SUSE-AI DEBUG] CRITICAL: Loaded values from Helm (fallback):', Object.keys(hel.values));
            console.log('[SUSE-AI DEBUG] CRITICAL: Are these the installed values or default values?');

            // Let's check a specific value that should be different from defaults
            if (hel.values.image && typeof hel.values.image === 'object' && 'tag' in hel.values.image) {
              console.log('[SUSE-AI DEBUG] Image tag from Helm:', (hel.values.image as any).tag);
            }
            if (hel.values.replicaCount) {
              console.log('[SUSE-AI DEBUG] Replica count from Helm:', hel.values.replicaCount);
            }
          } else {
            console.log('[SUSE-AI DEBUG] No values found in Helm either');
          }
        } catch (helmError: any) {
          console.log('[SUSE-AI] Helm details also failed:', helmError?.message);
        }
      }
    } catch (e: any) {
      console.log('[SUSE-AI] Rancher App not found, trying Helm:', e?.message);
      // Try Helm if Rancher App not found
      try {
        const hel = await getInstalledHelmDetails(store, preferred, form.value.namespace, form.value.release);
        console.log('[SUSE-AI] Got Helm details:', hel);
        
        if (hel.chartName) form.value.chartName = hel.chartName;
        if (hel.chartVersion) form.value.chartVersion = hel.chartVersion || form.value.chartVersion;
        if (hel.values && Object.keys(hel.values).length) {
          form.value.values = hel.values;
          gotAnyValues = true;
          console.log('[SUSE-AI] Loaded values from Helm:', Object.keys(hel.values));
        } else {
          console.log('[SUSE-AI] No values found in Helm');
        }
      } catch (helmError: any) {
        console.log('[SUSE-AI] Helm details also failed:', helmError?.message);
      }
    }
  }

  // Infer repo if unknown
  if (!form.value.chartRepo && form.value.chartName) {
    try {
      const repo = await inferClusterRepoForChart(store, form.value.chartName, form.value.chartVersion);
      if (repo) form.value.chartRepo = repo;
    } catch { /* ignore */ }
  }

  // Set the defaults key to prevent auto-loading default values over installed values
  console.log('[SUSE-AI DEBUG] About to set userEdited flag. gotAnyValues:', gotAnyValues);
  console.log('[SUSE-AI DEBUG] Current form.values keys before setting flags:', Object.keys(form.value.values));
  console.log('[SUSE-AI DEBUG] Current form.values:', form.value.values);

  if (gotAnyValues) {
    lastDefaultsKey.value = defaultsKey.value;
    userEdited.value = true; // Prevent auto-loading defaults over actual installed values
    console.log('[SUSE-AI DEBUG] Set userEdited = true, lastDefaultsKey =', lastDefaultsKey.value);
  } else {
    lastDefaultsKey.value = '';
    console.log('[SUSE-AI DEBUG] No values found, userEdited remains false');
  }
  versionDirty.value = false;

  console.log('[SUSE-AI DEBUG] === INITIALIZE MANAGE MODE END ===');
  console.log('[SUSE-AI DEBUG] Final state:', {
    userEdited: userEdited.value,
    lastDefaultsKey: lastDefaultsKey.value,
    formValuesKeys: Object.keys(form.value.values),
    formValuesLength: Object.keys(form.value.values).length,
    gotAnyValues
  });
}

async function refreshVersions() {
  if (!store || !form.value.chartRepo || !form.value.chartName) return;
  loadingVersions.value = true;
  try {
    const vs = await listChartVersions(store, REPO_CLUSTER, form.value.chartRepo, form.value.chartName);
    const uniq = Array.from(new Set(vs));
    
    // For manage mode, ensure installed version is selectable
    if (isManageMode.value && form.value.chartVersion && !uniq.includes(form.value.chartVersion)) {
      uniq.unshift(form.value.chartVersion);
    }
    
    versions.value = uniq as string[];
    if (vs.length && (!form.value.chartVersion || !vs.includes(form.value.chartVersion))) {
      form.value.chartVersion = vs[0];
    }
  } finally {
    loadingVersions.value = false;
  }
}

async function loadDefaultsFromChart() {
  console.log('[SUSE-AI DEBUG] === LOAD DEFAULTS FROM CHART START ===');
  console.log('[SUSE-AI DEBUG] Current form.values before loading defaults:', Object.keys(form.value.values));
  console.log('[SUSE-AI DEBUG] userEdited before loading:', userEdited.value);
  console.log('[SUSE-AI DEBUG] Mode:', props.mode);

  if (!store || !form.value.chartRepo || !form.value.chartName || !form.value.chartVersion) {
    console.log('[SUSE-AI DEBUG] Missing required params, returning early');
    return;
  }

  loadingValues.value = true;
  error.value = null;
  try {
    const txt = await fetchChartDefaultValues(store, REPO_CLUSTER, form.value.chartRepo, form.value.chartName, form.value.chartVersion);
    if (txt && txt.trim()) {
      console.log('[SUSE-AI DEBUG] Got default values text, about to overwrite form.values!');
      console.log('[SUSE-AI DEBUG] Current form.values keys before overwrite:', Object.keys(form.value.values));

      form.value.values = (yaml.load(txt) as any) || {};
      lastDefaultsKey.value = defaultsKey.value;
      userEdited.value = false;
      versionDirty.value = false;

      console.log('[SUSE-AI DEBUG] OVERWROTE form.values with defaults!');
      console.log('[SUSE-AI DEBUG] New form.values keys:', Object.keys(form.value.values));
      console.log('[SUSE-AI DEBUG] Set userEdited = false');
    } else {
      error.value = 'No default values found for the selected version.';
      console.log('[SUSE-AI DEBUG] No default values found');
    }
  } catch (e: any) {
    error.value = e?.message || 'Failed to fetch default values.';
    console.log('[SUSE-AI DEBUG] Error loading defaults:', e?.message);
  } finally {
    loadingValues.value = false;
    console.log('[SUSE-AI DEBUG] === LOAD DEFAULTS FROM CHART END ===');
  }
}

async function maybeAutoLoad() {
  console.log('[SUSE-AI DEBUG] === MAYBE AUTO LOAD START ===');
  const key = defaultsKey.value;

  console.log('[SUSE-AI DEBUG] maybeAutoLoad check:', {
    key,
    hasKey: !!key,
    chartRepo: form.value.chartRepo,
    chartName: form.value.chartName,
    chartVersion: form.value.chartVersion,
    lastDefaultsKey: lastDefaultsKey.value,
    userEdited: userEdited.value,
    mode: props.mode
  });

  if (!key || !form.value.chartRepo || !form.value.chartName || !form.value.chartVersion) {
    console.log('[SUSE-AI DEBUG] Missing requirements, returning early');
    return;
  }

  const needLoad = (lastDefaultsKey.value !== key) && !userEdited.value;
  console.log('[SUSE-AI DEBUG] needLoad calculation:', {
    lastDefaultsKeyDifferent: lastDefaultsKey.value !== key,
    userEditedFalse: !userEdited.value,
    needLoad
  });

  if (needLoad) {
    console.log('[SUSE-AI DEBUG] CALLING loadDefaultsFromChart (this will overwrite installed values!)');
    await loadDefaultsFromChart();
  } else {
    console.log('[SUSE-AI DEBUG] NOT calling loadDefaultsFromChart - values preserved');
  }
  console.log('[SUSE-AI DEBUG] === MAYBE AUTO LOAD END ===');
}

watch(() => [form.value.chartRepo, form.value.chartName], () => {
  console.log('[SUSE-AI DEBUG] WATCHER: chartRepo/chartName changed, refreshing versions');
  refreshVersions();
});

watch(() => [form.value.chartRepo, form.value.chartName, form.value.chartVersion], async () => {
  console.log('[SUSE-AI DEBUG] WATCHER: chartRepo/chartName/chartVersion changed');
  console.log('[SUSE-AI DEBUG] WATCHER: currentStep =', currentStep.value);

  if (currentStep.value !== 2) {
    console.log('[SUSE-AI DEBUG] WATCHER: Not on step 2, returning');
    return;
  }

  console.log('[SUSE-AI DEBUG] WATCHER: On step 2, checking userEdited =', userEdited.value);
  if (userEdited.value) {
    versionDirty.value = lastDefaultsKey.value !== defaultsKey.value;
    console.log('[SUSE-AI DEBUG] WATCHER: userEdited=true, setting versionDirty =', versionDirty.value);
  } else {
    console.log('[SUSE-AI DEBUG] WATCHER: userEdited=false, calling maybeAutoLoad');
    await maybeAutoLoad();
  }
});

watch(currentStep, async (s) => {
  if (s === 2) {
    await maybeAutoLoad();
  }
});

function onValuesEdited() { userEdited.value = true; }

// Wizard event handlers
function onWizardNext({ step }: { step: number }) {
  currentStep.value = step;
}

async function onWizardFinish() {
  await submit();
}

function onWizardCancel() {
  persistClear(PKEY);
  // Redirect to AppInstances page instead of Apps page
  router?.push({
    name: `c-cluster-suseai-app-instances`,
    params: {
      cluster: route?.params?.cluster,
      slug: props.slug
    }
  });
}

async function submit() {
  try {
    submitting.value = true;
    error.value = null;

    if (!form.value.chartRepo || !form.value.chartName || !form.value.chartVersion) {
      error.value = 'Please set repository, chart and version.'; return;
    }
    
    if (isInstallMode.value && !form.value.cluster) {
      error.value = 'Please select a cluster.'; return;
    }
    
    if (isManageMode.value && !form.value.clusters.length) {
      error.value = 'Please select target clusters.'; return;
    }
    
    if (!store) { error.value = 'Store not available'; return; }

    const actionLabel = isInstallMode.value ? 'INSTALL' : 'UPGRADE';
    const targetClusters = isInstallMode.value ? [form.value.cluster] : form.value.clusters;
    
    console.log(`[SUSE-AI] ${actionLabel} start `, { 
      clusters: targetClusters, 
      ns: form.value.namespace, 
      release: form.value.release 
    });

    if (isInstallMode.value) {
      await performInstall();
    } else {
      await performUpgrade();
    }

    console.log(`[SUSE-AI] ${actionLabel} done `, { clusters: targetClusters });

    persistClear(PKEY);
    // Redirect to AppInstances page to show the newly installed/updated instance
    router?.push({
      name: `c-cluster-suseai-app-instances`,
      params: {
        cluster: route?.params?.cluster,
        slug: props.slug
      }
    });
  } catch (e: any) {
    error.value = e?.message || `${finalButtonLabel.value} failed`;
  } finally {
    submitting.value = false;
  }
}

async function performInstall() {
  // Resolve creds from SELECTED ClusterRepo
  const repoCtx = await getRepoAuthForClusterRepo(store, form.value.chartRepo);
  const desiredSecretBase = repoCtx.secretName || `repo-${form.value.chartRepo}`;

  const cid = form.value.cluster;
  await ensureNamespace(store, cid, form.value.namespace);

  let finalSecretName = '';
  try {
    finalSecretName = await ensureRegistrySecretSimple(
      store, cid, form.value.namespace,
      repoCtx.registryHost, desiredSecretBase,
      repoCtx.auth.username, repoCtx.auth.password
    );
  } catch (e: any) {
    console.error('[SUSE-AI] pull-secret creation skipped:', e?.message || e);
  }

  const v = JSON.parse(JSON.stringify(form.value.values || {}));
  const addSecret = (arr: any): any[] => {
    const list = Array.isArray(arr) ? arr.slice() : [];
    if (finalSecretName) {
      const hasStr = list.some((e: any) => e === finalSecretName);
      const hasObj = list.some((e: any) => e && typeof e === 'object' && e.name === finalSecretName);
      if (!hasStr && !hasObj) list.push({ name: finalSecretName });
    }
    return list;
  };
  v.global = v.global || {};
  v.global.imagePullSecrets = addSecret(v.global.imagePullSecrets);
  v.imagePullSecrets = addSecret(v.imagePullSecrets);

  if (finalSecretName) {
    const saCandidates = new Set<string>(['default']);
    const vs = (v as any).serviceAccount || {};
    if (typeof vs?.name === 'string' && vs.name.trim()) saCandidates.add(vs.name.trim());
    else if (vs.create === undefined || !!vs.create) saCandidates.add(form.value.release);
    for (const sa of saCandidates) {
      try { await ensureServiceAccountPullSecret(store, cid, form.value.namespace, sa, finalSecretName); }
      catch (e) { console.warn('[SUSE-AI] SA pull-secret attach (pre) failed', { sa, ns: form.value.namespace, e }); }
    }
  }

  console.log('[SUSE-AI] calling install ', { 
    cluster: cid, 
    repo: form.value.chartRepo, 
    chart: form.value.chartName, 
    version: form.value.chartVersion, 
    ns: form.value.namespace, 
    release: form.value.release, 
    values: v 
  });
  
  await createOrUpgradeApp(
    store, cid, form.value.namespace, form.value.release,
    { repoName: form.value.chartRepo, chartName: form.value.chartName, version: form.value.chartVersion },
    v,
    'install'
  );

  try {
    await waitForAppInstall(store, cid, form.value.namespace, form.value.release, 90_000);
  } catch (e: any) {
    console.error('[SUSE-AI] post-install app status (peek): ', { error: e?.message || e });
    throw new Error(`App resource did not appear in namespace ${form.value.namespace}. Check Rancher logs and ClusterRepo permissions.`);
  }

  if (finalSecretName) {
    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        await ensurePullSecretOnAllSAs(store, cid, form.value.namespace, finalSecretName);
        break;
      } catch (e) {
        if (attempt === 5) break;
        await new Promise(r => setTimeout(r, 2000));
      }
    }
  }
}

async function performUpgrade() {
  for (const cid of form.value.clusters) {
    await ensureNamespace(store, cid, form.value.namespace);
    await createOrUpgradeApp(
      store, cid, form.value.namespace, form.value.release,
      { repoName: form.value.chartRepo, chartName: form.value.chartName, version: form.value.chartVersion },
      form.value.values,
      'upgrade'
    );
  }
}

// Custom wizard navigation methods
function goToStep(stepIndex: number) {
  // Only allow navigation if step is ready or going backwards
  if (stepIndex <= currentStep.value || wizardSteps.value[stepIndex].ready) {
    currentStep.value = stepIndex;
  }
}

function nextStep() {
  if (currentStep.value < wizardSteps.value.length - 1 && wizardSteps.value[currentStep.value + 1].ready) {
    currentStep.value++;
  }
}

function previousStep() {
  if (currentStep.value > 0) {
    currentStep.value--;
  }
}
</script>

<template>
  <div class="install-steps pt-20 outlet">
    <Loading v-if="loading" />
    
    <div v-else class="custom-wizard">
      <!-- Fixed Header -->
      <div class="wizard-header">
        <h1>{{ (route.query.n as string) || props.slug }}</h1>
        <p class="text-muted">{{ wizardTitle }}</p>
      </div>

      <!-- Fixed Step Navigation -->
      <div class="wizard-nav">
        <div class="steps-container">
          <div 
            v-for="(step, index) in wizardSteps" 
            :key="step.name"
            class="step-item"
            :class="{
              'active': index === currentStep,
              'completed': index < currentStep,
              'disabled': !step.ready && index > currentStep
            }"
            @click="goToStep(index)"
          >
            <div class="step-number">
              <i v-if="index < currentStep" class="icon icon-checkmark" />
              <span v-else>{{ index + 1 }}</span>
            </div>
            <div class="step-label">{{ step.label }}</div>
          </div>
        </div>
      </div>

      <!-- Scrollable Content Area -->
      <div class="wizard-content-wrapper">
        <!-- Error Banner -->
        <Banner v-if="error" color="error" class="mb-20">
          {{ error }}
        </Banner>

        <!-- Step Content -->
        <div class="wizard-content">
          <!-- Step: Basic Information -->
          <BasicInfoStep
            v-if="currentStep === 0"
            v-model:form="basicInfoForm"
            :version-options="versionOptions"
            :loading-versions="loadingVersions"
          />

          <!-- Step: Target Clusters -->
          <TargetStep
            v-else-if="currentStep === 1"
            :mode="props.mode"
            v-model:cluster="form.cluster"
            v-model:clusters="form.clusters"
            :app-slug="props.slug"
            :app-name="(route.query.n as string) || props.slug"
          />

          <!-- Step: Configuration -->
          <ValuesStep
            v-else-if="currentStep === 2"
            v-model:values="form.values"
            :chart-repo="form.chartRepo"
            :chart-name="form.chartName"
            :chart-version="form.chartVersion"
            :loading-values="loadingValues"
            :version-dirty="versionDirty"
            @load-defaults="loadDefaultsFromChart"
            @values-edited="onValuesEdited"
          />

          <!-- Step: Review -->
          <ReviewStep
            v-else-if="currentStep === 3"
            :mode="props.mode"
            :release="form.release"
            :namespace="form.namespace"
            :chart-repo="form.chartRepo"
            :chart-name="form.chartName"
            :chart-version="form.chartVersion"
            :cluster="form.cluster"
            :clusters="form.clusters"
            v-model:values="form.values"
            @values-edited="onValuesEdited"
          />
        </div>
      </div>

      <!-- Fixed Bottom Navigation Buttons -->
      <div class="wizard-buttons-fixed">
        <button
          v-if="currentStep > 0"
          class="btn role-secondary"
          @click="previousStep"
        >
          Previous
        </button>

        <div class="flex-spacer" />

        <button
          class="btn role-secondary mr-10"
          @click="onWizardCancel"
        >
          Cancel
        </button>

        <button
          v-if="currentStep === 0 || currentStep === 1 || currentStep === 2"
          class="btn role-primary"
          :disabled="!wizardSteps[currentStep].ready"
          @click="nextStep"
        >
          Next
        </button>

        <button
          v-else-if="currentStep === 3"
          class="btn role-primary"
          :disabled="!wizardSteps[currentStep].ready || submitting"
          @click="onWizardFinish"
        >
          <i v-if="submitting" class="icon icon-spinner icon-spin mr-5" />
          <span v-if="submitting">
            {{ mode === 'install' ? 'Installing...' : 'Saving...' }}
          </span>
          <span v-else>
            {{ mode === 'install' ? 'Install' : 'Save' }}
          </span>
        </button>
      </div>
    </div>
  </div>
</template>


<style scoped>
/* Button utilities */
.mr-5 {
  margin-right: 5px;
}

.icon-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Main wizard container - matches Rancher's main content areas */
.custom-wizard {
  background: var(--body-bg, #ffffff);
  max-width: 100%;
  width: 100%;
  height: calc(100vh - 140px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Header styling to match Rancher's page headers */
.wizard-header {
  flex-shrink: 0;
  padding: 20px 24px 16px 24px;
  background: var(--body-bg, #ffffff);
}

.wizard-header h1 {
  margin: 0 0 4px 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--body-text, #111827);
  line-height: 1.2;
}

.wizard-header p {
  margin: 0;
  font-size: 14px;
  color: var(--muted, #6b7280);
  font-weight: 400;
}

/* Step navigation - matches Rancher's wizard pattern */
.wizard-nav {
  flex-shrink: 0;
  width: 100%;
  padding: 20px 24px;
  background: var(--body-bg, #ffffff);
}

.steps-container {
  display: flex;
  justify-content: space-between;
  position: relative;
  max-width: 100%;
  align-items: center;
}

.steps-container::before {
  content: '';
  position: absolute;
  top: 20px;
  left: 50px;
  right: 50px;
  height: 1px;
  background: var(--border, #f3f4f6);
  z-index: 0;
}

.step-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  flex: 1;
  max-width: 200px;
  position: relative;
  z-index: 1;
  transition: all 0.2s ease;
}

.step-item.disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.step-item:hover:not(.disabled) .step-number {
  transform: scale(1.05);
}

.step-number {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--body-bg, #ffffff);
  border: 1px solid var(--border, #f3f4f6);
  color: var(--muted, #9ca3af);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
  font-size: 14px;
  margin-bottom: 8px;
  transition: all 0.2s ease;
}

.step-item.active .step-number {
  background: var(--primary, #2563eb);
  border-color: var(--primary, #2563eb);
  color: white;
}

.step-item.completed .step-number {
  background: var(--success, #16a34a);
  border-color: var(--success, #16a34a);
  color: white;
}

.step-label {
  font-size: 13px;
  text-align: center;
  color: var(--muted, #6b7280);
  font-weight: 400;
  line-height: 1.3;
}

.step-item.active .step-label {
  color: var(--primary, #2563eb);
  font-weight: 500;
}

.step-item.completed .step-label {
  color: var(--body-text, #111827);
}

/* Content area - matches Rancher's form containers */
.wizard-content-wrapper {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  background: var(--body-bg, #ffffff);
}

.wizard-content {
  padding: 24px;
  background: var(--body-bg, #ffffff);
  margin: 0;
  min-height: 100%;
}

/* Bottom button bar - matches Rancher's action bars */
.wizard-buttons-fixed {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  width: 100%;
  padding: 16px 24px;
  background: var(--body-bg, #ffffff);
}

.flex-spacer {
  flex: 1;
}

/* Button overrides to match Rancher's button styling */
.wizard-buttons-fixed .btn {
  height: 36px;
  padding: 0 16px;
  font-size: 14px;
  font-weight: 500;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.wizard-buttons-fixed .btn.role-secondary {
  background: var(--body-bg, #ffffff);
  border: 1px solid var(--border, #d1d5db);
  color: var(--body-text, #111827);
}

.wizard-buttons-fixed .btn.role-secondary:hover {
  background: var(--accent-bg, #f9fafb);
  border-color: var(--border-hover, #9ca3af);
}

.wizard-buttons-fixed .btn.role-primary {
  background: var(--primary, #2563eb);
  border: 1px solid var(--primary, #2563eb);
  color: white;
}

.wizard-buttons-fixed .btn.role-primary:hover:not(:disabled) {
  background: var(--primary-hover, #1d4ed8);
  border-color: var(--primary-hover, #1d4ed8);
}

.wizard-buttons-fixed .btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Utility classes */
.mb-20 {
  margin-bottom: 20px;
}
</style>