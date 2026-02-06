<template>
  <div v-if="showInstallButton && !proxyInstalled" class="install-instance-container">
   <div class="empty-state">
     <div class="empty-state-content">
       <div class="app-header">
         <div class="app-icon">
           <i class="icon icon-gear"></i>
         </div>
         <div class="app-info">
           <h2>SUSE AI Universal Proxy</h2>
         </div>
       </div>

       <div class="empty-message">
         <h3>Install SUSE AI Universal Proxy</h3>
         <p>Get started by installing the SUSE AI Universal Proxy to manage your MCP endpoints.</p>
       </div>

       <div class="install-action">
         <button class="btn btn-primary install-button" @click="startInstallProcess">
           <i class="icon icon-plus"></i>
           Start
         </button>
       </div>
     </div>
   </div>
 </div>

 <div v-else-if="!proxyInstalled || showConfigurationWizard" class="wizard-container">
  <!-- Wizard Header -->
  <div class="wizard-header">
     <h1>Install Universal Proxy</h1>
     <p>Configure your SUSE AI Universal Proxy installation</p>
  </div>

  <!-- Step Navigation -->
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
      >
        <div class="step-number">
          <i v-if="index < currentStep" class="icon icon-checkmark" />
          <span v-else>{{ index + 1 }}</span>
        </div>
        <div class="step-label">{{ step.label }}</div>
      </div>
    </div>
  </div>

  <!-- Step Content -->
  <div class="wizard-content-wrapper">
    <div class="wizard-content">
       <!-- Step 1: Install Universal Proxy -->
      <div v-if="currentStep === 0" class="install-step">
        <div class="empty-state">
          <div class="empty-state-content">
            <div class="app-header">
              <div class="app-icon">
                <i class="icon icon-gear"></i>
              </div>
               <div class="app-info">
                  <h2>SUSE AI Universal Proxy</h2>
               </div>
            </div>

               <div class="empty-message">
                 <h3 v-if="checkingService">Checking for existing service...</h3>
                 <h3 v-else-if="!serviceFound && !installed">No instances found</h3>
                 <h3 v-else-if="!serviceFound && installed">An instance of SUSE AI Universal Proxy has been found</h3>
                 <p v-if="checkingService">Please wait while we check for existing services.</p>
                 <p v-else-if="!serviceFound && !installed">This application has not been installed yet.</p>
                 <p v-else-if="!serviceFound && installed">Your SUSE AI Universal Proxy is ready to use.</p>
               </div>

               <!-- Service card when existing service is found -->
               <div v-if="serviceFound && !checkingService" class="service-selection">
                 <div class="service-cards">
                   <!-- Existing Service Card -->
                   <div
                     class="service-card"
                     :class="{ selected: useExistingService }"
                     @click="selectExistingService"
                   >
                     <div class="card-header">
                       <div class="service-icon">
                         <i class="icon icon-server"></i>
                       </div>
                       <div class="service-info">
                         <h4>SUSE AI Universal Proxy found at</h4>
                         <p>{{ serviceUrl }}</p>
                       </div>
                       <div class="selection-indicator">
                         <i v-if="useExistingService" class="icon icon-checkmark"></i>
                       </div>
                     </div>
                     <div class="card-details">
                       <div class="service-status">
                         <span class="status-dot status-active"></span>
                         Service Available
                       </div>
                     </div>
                   </div>
                 </div>
               </div>


          </div>
        </div>
      </div>

      <!-- Step 2: Select Services -->
      <div v-else-if="currentStep === 1" class="select-services-step">
        <div class="services-info">
          <h3>Select Additional Services</h3>
           <p>Choose the additional services you want to enable with your SUSE AI Universal Proxy. You can select multiple services.</p>
        </div>

        <div class="services-grid">
          <div
            v-for="service in services"
            :key="service.id"
            class="service-card"
            :class="{ selected: selectedServices.includes(service.id) }"
            @click="toggleService(service.id)"
          >
            <div class="card-header">
              <div class="service-icon">
                <i :class="service.iconClass"></i>
              </div>
              <div class="service-info">
                <h4>{{ service.name }}</h4>
                <p>{{ service.description }}</p>
              </div>
            </div>
             <div class="card-footer">
               <div class="service-selection">
                 <label class="checkbox-label">
                   <input
                     type="checkbox"
                     :checked="selectedServices.includes(service.id)"
                     @change="toggleService(service.id)"
                   />
                   <span class="checkbox-text">Select</span>
                 </label>
               </div>
             </div>
          </div>
        </div>

        <div class="selection-summary" v-if="selectedServices.length > 0">
          <h4>Selected Services:</h4>
          <ul>
            <li v-for="serviceId in selectedServices" :key="serviceId">
              {{ getServiceName(serviceId) }}
            </li>
          </ul>
        </div>
      </div>

      <!-- Step 3: Review -->
      <div v-else-if="currentStep === 2" class="review-step">
        <h3>Review Configuration</h3>
        <div class="review-content">
          <div class="review-item">
             <h4>Universal Proxy</h4>
            <p>✓ Ready to install</p>
          </div>
          <div class="review-item" v-if="selectedServices.length > 0">
            <h4>Selected Services</h4>
            <ul>
              <li v-for="serviceId in selectedServices" :key="serviceId">
                {{ getServiceName(serviceId) }}
              </li>
            </ul>
          </div>
          <div class="review-item" v-else>
            <h4>Selected Services</h4>
            <p>No additional services selected</p>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Bottom Navigation -->
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
      v-if="currentStep < wizardSteps.length - 1"
      class="btn role-primary"
      :class="{ 'btn-installing': fakeInstalling }"
      :disabled="!wizardSteps[currentStep].ready || fakeInstalling"
      @click="nextStep"
    >
      <i v-if="fakeInstalling" class="icon icon-spinner icon-spin mr-5"></i>
      {{ fakeInstalling ? 'Installing...' : (currentStep === 0 && !serviceFound && !checkingService ? 'Install' : 'Next') }}
    </button>

    <button
      v-else-if="currentStep === wizardSteps.length - 1"
      class="btn role-primary"
      @click="onWizardFinish"
    >
      Finish
    </button>
  </div>
</div>

<div v-else-if="proxyInstalled && !hasSelectedServices" class="installed-section">
 <div class="empty-state">
   <div class="empty-state-content">
     <div class="app-header">
       <div class="app-icon">
         <i class="icon icon-gear"></i>
       </div>
       <div class="app-info">
          <h2>SUSE AI Universal Proxy</h2>
          <span class="app-badge">Universal Proxy</span>
       </div>
     </div>

     <div class="empty-message">
        <h3>1 SUSE AI Universal Proxy instance installed</h3>
        <p>Your Universal Proxy is ready. Configure additional services to get started.</p>
     </div>

     <div class="install-action">
       <button class="btn btn-primary install-button" @click="startServiceConfiguration">
         Configure Services
       </button>
     </div>
   </div>
 </div>
</div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';
import { useMCPGateway } from '../../composables/useMCPGateway';

export default defineComponent({
  name: 'InstallWizard',
  setup() {
    const {
      // Store getters
      proxyInstalled,

      // Wizard state
      currentStep,
      wizardSteps,
      installing,
      installed,
      selectedServices,
      services,
      toggleService,
      getServiceName,
      nextStep,
      previousStep,
      onWizardCancel,
      onWizardFinish,
      hasSelectedServices,
      startServiceConfiguration,

       // Service checking state
       checkingService,
       serviceFound,
       serviceUrl,
       useExistingService,
       fakeInstalling,

       // Configuration mode
      showConfigurationWizard,
      showInstallButton,
      startInstallProcess,
      selectExistingService
    } = useMCPGateway();

    return {
      // Store getters
      proxyInstalled,

      // Wizard state
      currentStep,
      wizardSteps,
      installing,
      installed,
      selectedServices,
      services,
      toggleService,
      getServiceName,
      nextStep,
      previousStep,
      onWizardCancel,
      onWizardFinish,
      hasSelectedServices,
      startServiceConfiguration,

       // Service checking state
       checkingService,
       serviceFound,
       serviceUrl,
       useExistingService,
       fakeInstalling,

       // Configuration mode
       showConfigurationWizard,
       showInstallButton,
       startInstallProcess,
       selectExistingService
     };
  }
});
</script>

<style scoped>
/* Wizard Container */
.wizard-container {
  background: var(--body-bg, #ffffff);
  max-width: 100%;
  width: 100%;
  height: calc(100vh - 140px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Wizard Header */
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

/* Step Navigation */
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

/* Content Area */
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

/* Install Step */
.install-step .empty-state {
  text-align: center;
  max-width: 500px;
  margin: 0 auto;
}

.install-step .empty-state-content {
  padding: 40px 20px;
}

.install-step .app-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 32px;
}

.install-step .app-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  background: var(--accent-btn);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border);
}

.install-step .app-icon i {
  font-size: 24px;
  color: var(--primary);
}

.install-step .app-info h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--body-text);
}

.install-step .app-badge {
  background: #d4edda;
  color: #155724;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.install-step .empty-message {
  margin-bottom: 32px;
}

.install-step .empty-message h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--body-text);
}

.install-step .empty-message p {
  margin: 0;
  color: var(--muted);
  font-size: 14px;
}

.install-step .install-action {
  display: flex;
  justify-content: center;
}

.install-step .install-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 500;
}

.service-selection {
  margin: 24px 0;
}

.service-cards {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 20px;
}

.service-card {
  border: 2px solid var(--border, #e5e7eb);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: var(--body-bg, #ffffff);
  overflow: hidden;
}

.service-card:hover {
  border-color: var(--primary, #2563eb);
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.1);
}

.service-card.selected {
  border-color: var(--primary, #2563eb);
  background: rgba(37, 99, 235, 0.05);
  box-shadow: 0 2px 12px rgba(37, 99, 235, 0.15);
}

.card-header {
  display: flex;
  align-items: center;
  padding: 16px;
  gap: 12px;
}

.service-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: var(--accent-btn, #f3f4f6);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.service-icon i {
  font-size: 20px;
  color: var(--primary, #2563eb);
}

.service-info {
  flex: 1;
}

.service-info h4 {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--body-text, #111827);
}

.service-info p {
  margin: 0;
  font-size: 14px;
  color: var(--muted, #6b7280);
}

.selection-indicator {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid var(--border, #e5e7eb);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.service-card.selected .selection-indicator {
  background: var(--primary, #2563eb);
  border-color: var(--primary, #2563eb);
}

.selection-indicator i {
  color: white;
  font-size: 14px;
  font-weight: bold;
}

.card-details {
  padding: 0 16px 16px 16px;
  border-top: 1px solid var(--border, #e5e7eb);
  background: var(--accent-bg, #f9fafb);
}

.service-url {
  font-family: monospace;
  font-size: 13px;
  color: var(--primary, #2563eb);
  margin-bottom: 8px;
  font-weight: 500;
}

.service-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--muted, #6b7280);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-active {
  background: var(--success, #16a34a);
}

.install-new-section {
  display: flex;
  justify-content: center;
}

.install-new-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  font-size: 14px;
  font-weight: 500;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.install-new-button:hover {
  background: var(--accent-bg, #f9fafb);
  border-color: var(--border-hover, #9ca3af);
}

.install-new-button i {
  font-size: 16px;
}

/* Select Services Step */
.select-services-step {
  max-width: 800px;
}

.select-services-step .services-info {
  margin-bottom: 24px;
}

.select-services-step .services-info h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--body-text);
}

.select-services-step .services-info p {
  margin: 0;
  color: var(--muted);
  line-height: 1.5;
}

.select-services-step .services-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.select-services-step .service-card {
  border: 1px solid var(--border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  background: var(--body-bg);
}

.select-services-step .service-card:hover {
  border-color: var(--primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.select-services-step .service-card.selected {
  border-color: var(--primary);
  background: rgba(var(--primary-rgb), 0.05);
}

.select-services-step .card-header {
  padding: 20px;
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.select-services-step .service-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  background: var(--accent-btn);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.select-services-step .service-icon i {
  font-size: 24px;
  color: var(--primary);
}

.select-services-step .service-info h4 {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--body-text);
}

.select-services-step .service-info p {
  margin: 0;
  color: var(--muted);
  line-height: 1.4;
  font-size: 14px;
}

.select-services-step .card-footer {
  padding: 12px 20px;
  border-top: 1px solid var(--border);
  background: var(--card-footer-bg);
}

.select-services-step .service-selection {
  display: flex;
  align-items: center;
}

.select-services-step .checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  margin: 0;
  font-size: 14px;
  font-weight: 500;
}

.select-services-step .checkbox-label input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: var(--primary);
  cursor: pointer;
}

.select-services-step .checkbox-text {
  color: var(--body-text);
  user-select: none;
}

.select-services-step .service-status .status {
  font-size: 12px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 4px;
}

.select-services-step .status.selected {
  color: var(--primary);
}

.select-services-step .status.available {
  color: var(--muted);
}

.select-services-step .selection-summary {
  padding: 16px;
  background: var(--accent-bg);
  border: 1px solid var(--border);
  border-radius: 4px;
}

.select-services-step .selection-summary h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--body-text);
}

.select-services-step .selection-summary ul {
  margin: 0;
  padding-left: 20px;
  color: var(--muted);
}

.select-services-step .selection-summary li {
  margin-bottom: 4px;
}

/* Review Step */
.review-step {
  max-width: 600px;
}

.review-step h3 {
  margin: 0 0 24px 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--body-text);
}

.review-step .review-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.review-step .review-item {
  padding: 16px;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
}

.review-step .review-item h4 {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--body-text);
}

.review-step .review-item p {
  margin: 0;
  color: var(--muted);
}

.review-step .review-item ul {
  margin: 0;
  padding-left: 20px;
  color: var(--muted);
}

.review-step .review-item li {
  margin-bottom: 4px;
}

/* Bottom Navigation */
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

.wizard-buttons-fixed .btn-installing {
  background: var(--warning, #f59e0b);
  border-color: var(--warning, #f59e0b);
  color: white;
}

.wizard-buttons-fixed .btn-installing:hover:not(:disabled) {
  background: var(--warning-hover, #d97706);
  border-color: var(--warning-hover, #d97706);
}

.flex-spacer {
  flex: 1;
}

.mr-5 {
  margin-right: 5px;
}

.mr-10 {
  margin-right: 10px;
}

/* Installed Section */
.installed-section {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
  width: 100%;
}

.installed-section .empty-state {
  text-align: center;
  max-width: 500px;
  width: 100%;
}

.installed-section .empty-state-content {
  padding: 40px 20px;
}

.installed-section .app-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 32px;
}

.installed-section .app-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  background: var(--accent-btn);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border);
}

.installed-section .app-icon i {
  font-size: 24px;
  color: var(--primary);
}

.installed-section .app-info h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--body-text);
}

.installed-section .app-badge {
  background: #d4edda;
  color: #155724;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.installed-section .empty-message {
  margin-bottom: 32px;
}

.installed-section .empty-message h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--body-text);
}

.installed-section .empty-message p {
  margin: 0;
  color: var(--muted);
  font-size: 14px;
}

.installed-section .install-action {
  display: flex;
  justify-content: center;
}

.installed-section .install-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 500;
}

/* Start Container */
.install-instance-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
  width: 100%;
}

.install-instance-container .empty-state {
  text-align: center;
  max-width: 500px;
  width: 100%;
}

.install-instance-container .empty-state-content {
  padding: 40px 20px;
}

.install-instance-container .app-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 32px;
}

.install-instance-container .app-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  background: var(--accent-btn);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border);
}

.install-instance-container .app-icon i {
  font-size: 24px;
  color: var(--primary);
}

.install-instance-container .app-info h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--body-text);
}

.install-instance-container .empty-message {
  margin-bottom: 32px;
}

.install-instance-container .empty-message h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--body-text);
}

.install-instance-container .empty-message p {
  margin: 0;
  color: var(--muted);
  font-size: 14px;
}

.install-instance-container .install-action {
  display: flex;
  justify-content: center;
}

.install-instance-container .install-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 500;
}
</style>