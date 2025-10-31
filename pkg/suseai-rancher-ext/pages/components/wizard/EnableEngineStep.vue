<template>
  <div class="enable-engine-step">
    <div class="empty-state">
      <div class="empty-state-content">
        <div class="app-header">
          <div class="app-icon">
            <i class="icon icon-gear"></i>
          </div>
          <div class="app-info">
            <h2>SUSE AI Universal Proxy</h2>
            <span class="app-badge">HELM</span>
          </div>
        </div>

        <div class="empty-message">
          <h3>No instances found</h3>
          <p>This application has not been installed yet.</p>
        </div>

        <div class="install-action">
          <button
            class="btn btn-primary install-button"
            @click="startInstallation"
          >
            <i class="icon icon-plus"></i>
            Install First Instance
          </button>
        </div>
      </div>
    </div>

    <div v-if="installationStarted" class="installation-confirmation">
      <div class="confirmation-content">
        <div class="success-icon">
          <i class="icon icon-check"></i>
        </div>
        <h3>Installation Started</h3>
        <p>The SUSE AI Universal Proxy engine is being prepared. You can proceed to the next step to select additional services.</p>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';

interface Props {
  form: {
    engineEnabled: boolean;
    installationStarted: boolean;
  };
}

interface Emits {
  (e: 'update:form', form: { engineEnabled: boolean; installationStarted: boolean }): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const installationStarted = ref(props.form.installationStarted || false);

const startInstallation = () => {
  installationStarted.value = true;
  emit('update:form', {
    ...props.form,
    engineEnabled: true,
    installationStarted: true
  });
};
</script>

<style scoped>
.enable-engine-step {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
  width: 100%;
}

.empty-state {
  text-align: center;
  max-width: 500px;
  width: 100%;
}

.empty-state-content {
  padding: 40px 20px;
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 32px;
}

.app-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  background: var(--accent-btn);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border);
}

.app-icon i {
  font-size: 24px;
  color: var(--primary);
}

.app-info h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--body-text);
}

.app-badge {
  background: #d4edda;
  color: #155724;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.empty-message {
  margin-bottom: 32px;
}

.empty-message h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--body-text);
}

.empty-message p {
  margin: 0;
  color: var(--muted);
  font-size: 14px;
}

.install-action {
  display: flex;
  justify-content: center;
}

.install-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 500;
}

.installation-confirmation {
  text-align: center;
  padding: 40px 20px;
}

.confirmation-content {
  max-width: 400px;
  margin: 0 auto;
}

.success-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #d4edda;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
  border: 1px solid #c3e6cb;
}

.success-icon i {
  font-size: 32px;
  color: #155724;
}

.confirmation-content h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--body-text);
}

.confirmation-content p {
  margin: 0;
  color: var(--muted);
  font-size: 14px;
  line-height: 1.5;
}
</style>