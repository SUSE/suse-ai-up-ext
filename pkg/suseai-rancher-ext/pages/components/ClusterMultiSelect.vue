<script lang="ts">
import { defineComponent, PropType } from 'vue';
import { getClusters } from '../../services/rancher-apps';

export default defineComponent({
  name: 'ClusterMultiSelect',
  // Vue 3 v-model support (+ legacy "value"/"input" for safety)
  props: {
    modelValue: { type: Array as PropType<string[]>, default: () => [] },
    value:      { type: Array as PropType<string[]>, default: undefined }
  },
  emits: ['update:modelValue', 'input'],
  data() {
    return {
      loading: true as boolean,
      error:   null as string | null,
      options: [] as { id: string; name: string }[]
    };
  },
  computed: {
    selected(): string[] {
      const mv = (this as any).modelValue as string[] | undefined;
      const legacy = (this as any).value as string[] | undefined;
      return (mv != null ? mv : (legacy || [])) as string[];
    }
  },
  async mounted() {
    const store: any = (this as any).$store;
    try {
      const rows = await getClusters(store);                 // ✅ robust helper with fallback
      (this as any).options = (rows || []).map((c: any) => ({ id: c.id, name: c.name || c.id }));
      (this as any).error = (this as any).options.length ? null : 'No clusters found';
    } catch (e: any) {
      (this as any).error = e?.message || 'Failed to list clusters';
      (this as any).options = [];
    } finally {
      (this as any).loading = false;
    }
  },
  methods: {
    toggle(id: string) {
      const cur = new Set(this.selected);
      if (cur.has(id)) cur.delete(id); else cur.add(id);
      const out = Array.from(cur);
      this.$emit('update:modelValue', out);  // Vue 3 v-model
      this.$emit('input', out);              // legacy support
    }
  }
});
</script>

<template>
  <div>
    <div v-if="loading" class="hint">Loading clusters…</div>
    <div v-else-if="error" class="hint">{{ error }}</div>
    <div v-else class="chips">
      <label v-for="o in options" :key="o.id" class="chip">
        <input type="checkbox" :checked="selected.includes(o.id)" @change="toggle(o.id)" />
        <span>{{ o.name }}</span>
      </label>
    </div>
  </div>
</template>

<style scoped>
.chips{ display:flex; flex-wrap:wrap; gap:8px }
.chip{ display:inline-flex; align-items:center; gap:8px; border:1px solid var(--suse-border); border-radius:999px; padding:6px 10px }
.hint{ font-size:12px; color:#64748b }
</style>
