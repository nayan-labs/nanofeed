<!--
  app/pages/auth/login.vue
  NanoFeed — Public Authentication Page
-->
<script setup lang="ts">
import UiButton from '../../components/ui/Button.vue'

definePageMeta({
  layout: 'blank',
  auth: {
    unauthenticatedOnly: true,
    navigateAuthenticatedTo: '/',
  }
})

const { loginWithGithub, isLoading } = useNanoAuth()
const route = useRoute()

useSeoMeta({
  title: 'Sign In',
})

// ── Context banners based on query params ─────────────────────
// ?deactivated=true  → user just deactivated
// ?deleted=pending   → user just scheduled deletion
// ?account=restored  → user logged back in after deactivation/deletion cancel
type BannerType = 'deactivated' | 'deleted' | 'restored' | null

const bannerType = computed<BannerType>(() => {
  if (route.query.deactivated === 'true') return 'deactivated'
  if (route.query.deleted === 'pending') return 'deleted'
  if (route.query.account === 'restored') return 'restored'
  return null
})
</script>

<template>
  <div class="page-login">
    <div class="login-container">
      <!-- Logo -->
      <div class="logo">
        <span class="logo-text">Nano<span>Feed</span></span>
      </div>

      <!-- Context banners -->
      <div v-if="bannerType === 'deactivated'" class="login-banner login-banner--info" role="alert">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>
        <div>
          <strong>Your account has been deactivated.</strong><br>
          Your profile and posts are hidden. Log in below to restore your account instantly — no extra steps needed.
        </div>
      </div>

      <div v-else-if="bannerType === 'deleted'" class="login-banner login-banner--warning" role="alert">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        <div>
          <strong>Your account is scheduled for deletion in 30 days.</strong><br>
          Changed your mind? Log in before 30 days and the deletion will be cancelled automatically — no extra steps needed.
        </div>
      </div>

      <div v-else-if="bannerType === 'restored'" class="login-banner login-banner--success" role="alert">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        <div>
          <strong>Welcome back!</strong><br>
          Your account has been fully restored.
        </div>
      </div>

      <div class="text-content">
        <h1>Welcome to NanoFeed</h1>
        <p>The minimal micro-social network for developers. Join the conversation today.</p>
      </div>

      <div class="actions">
        <UiButton 
          block 
          size="lg" 
          :loading="isLoading"
          @click="loginWithGithub"
          class="github-btn"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-github"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>
          Continue with GitHub
        </UiButton>
        <p class="disclaimer">
          By signing in, you agree to our 
          <NuxtLink to="/terms">Terms of Service</NuxtLink> 
          and 
          <NuxtLink to="/privacy">Privacy Policy</NuxtLink>.
        </p>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.page-login {
  @include flex-center;
  min-height: 100vh;
  padding: $space-4;
  background-color: $color-bg;
}

.login-container {
  width: 100%;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $space-8;
  text-align: center;
}

// ── Context banners ──────────────────────────────────────────────
.login-banner {
  width: 100%;
  display: flex;
  align-items: flex-start;
  gap: $space-3;
  padding: $space-4;
  border-radius: $radius-md;
  text-align: left;
  font-size: $font-size-sm;
  line-height: 1.6;

  svg { flex-shrink: 0; margin-top: 2px; }

  &--info {
    background: rgba(59, 130, 246, 0.12);
    border: 1px solid rgba(59, 130, 246, 0.3);
    color: #60a5fa;
  }

  &--warning {
    background: rgba($color-warning, 0.1);
    border: 1px solid rgba($color-warning, 0.3);
    color: $color-warning;
  }

  &--success {
    background: rgba($color-success, 0.1);
    border: 1px solid rgba($color-success, 0.3);
    color: $color-success;
  }
}

.logo {
  margin-bottom: $space-2;
  
  .logo-text {
    font-size: $font-size-3xl;
    font-weight: $font-weight-bold;
    letter-spacing: -0.02em;
    color: $color-text;
    
    span {
      color: $color-accent;
    }
  }
}

.text-content {
  display: flex;
  flex-direction: column;
  gap: $space-2;

  h1 {
    font-size: $font-size-3xl;
    font-weight: $font-weight-bold;
    margin: 0;
    line-height: 1.2;
  }

  p {
    font-size: $font-size-lg;
    color: $color-text-muted;
    margin: 0;
  }
}

.actions {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: $space-4;
}

.github-btn {
  @include flex-center;
  gap: $space-3;
  background-color: #24292e; // GitHub brand color
  color: white;
  border: 1px solid rgba(255,255,255,0.1);
  
  &:hover {
    background-color: #2f363d;
  }
}

.disclaimer {
  font-size: $font-size-xs;
  color: $color-text-muted;
  opacity: 0.9;
  line-height: 1.5;

  a {
    color: $color-accent;
    font-weight: $font-weight-semibold;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
}
</style>
