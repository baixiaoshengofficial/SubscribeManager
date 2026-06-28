<template>
  <div class="app-root">
    <el-container class="app-container">
      <el-header class="app-header">
        <div class="header-inner">
          <div class="brand">
            <el-icon class="brand-icon"><Box /></el-icon>
            <span class="brand-text">{{ t('navbar.brand') }}</span>
          </div>

          <nav v-if="authed" class="header-nav" aria-label="Main">
            <el-button
              text
              class="nav-tab"
              :class="{ 'nav-active': currentView === 'dashboard' }"
              @click="currentView = 'dashboard'"
            >
              <el-icon><Monitor /></el-icon>
              <span>{{ t('navbar.console') }}</span>
            </el-button>
            <el-button
              text
              class="nav-tab"
              :class="{ 'nav-active': currentView === 'protocol' }"
              @click="currentView = 'protocol'"
            >
              <el-icon><InfoFilled /></el-icon>
              <span>{{ t('navbar.config_manager') }}</span>
            </el-button>
          </nav>

          <div class="header-utilities">
            <el-dropdown @command="onLangChange" trigger="click">
              <el-button text class="util-btn">
                <el-icon><ChatDotRound /></el-icon>
                <span class="util-label">{{ currentLangLabel }}</span>
                <el-icon class="caret"><ArrowDown /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item
                    v-for="item in availableLocales"
                    :key="item.value"
                    :command="item.value"
                    :disabled="item.value === locale"
                  >{{ item.label }}</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>

            <el-button text class="util-btn" @click="toggleTheme" :title="theme === 'dark' ? t('theme.to_light') : t('theme.to_dark')">
              <el-icon><Sunny v-if="theme === 'dark'" /><Moon v-else /></el-icon>
            </el-button>

            <el-button text class="util-btn" @click="openGithub" title="GitHub">
              <el-icon><Promotion /></el-icon>
            </el-button>

            <el-button v-if="authed" text class="util-btn util-btn-danger" type="danger" :title="t('navbar.logout')" @click="logout">
              <el-icon><SwitchButton /></el-icon>
              <span class="util-label">{{ t('navbar.logout') }}</span>
            </el-button>
          </div>
        </div>
      </el-header>

      <el-main class="app-main">
        <div v-if="checking" class="auth-loading" v-loading="true" :element-loading-text="t('common.loading')"></div>
        <template v-else-if="!authed">
          <LoginView @success="onLoggedIn" />
        </template>
        <template v-else>
          <ProtocolGuideView v-if="currentView === 'protocol'" />
          <DashboardView v-else />
        </template>
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';
import { api } from './api/client';
import { availableLocales, setLocale } from './i18n';
import { theme, toggleTheme } from './composables/useTheme';
import LoginView from './views/LoginView.vue';
import DashboardView from './views/DashboardView.vue';
import ProtocolGuideView from './views/ProtocolGuideView.vue';

const { t, locale } = useI18n();
const authed = ref(false);
const checking = ref(true);
const currentView = ref('dashboard');

const currentLangLabel = computed(() => availableLocales.find((l) => l.value === locale.value)?.label || '简体中文');

function onLangChange(value) {
  setLocale(value);
}

function openGithub() {
  window.open('https://github.com/baixiaoshengofficial/SubscribeManager', '_blank');
}

function onLoggedIn() {
  authed.value = true;
  currentView.value = 'dashboard';
}

async function logout() {
  try {
    await api.logout();
    ElMessage.success(t('logout_sucess'));
  } catch {
    ElMessage.warning(t('logout_failed'));
  } finally {
    authed.value = false;
    currentView.value = 'dashboard';
  }
}

onMounted(async () => {
  try {
    await api.me();
    authed.value = true;
  } catch {
    authed.value = false;
  } finally {
    checking.value = false;
  }
});
</script>
