<template>
  <div class="protocol-guide">
    <div class="page-header">
      <div class="page-title-block">
        <p class="eyebrow">{{ t('config.page_title') }}</p>
        <h1 class="page-title">{{ t('config.title') }}</h1>
        <p class="page-subtitle">{{ t('config.subtitle') }}</p>
      </div>
    </div>

    <el-card class="section-card" shadow="never">
      <template #header>
        <div class="card-header-title">
          <el-icon><PieChart /></el-icon>
          <span>{{ t('config.overview_title') }}</span>
        </div>
      </template>
      <p class="section-desc">{{ t('config.overview_desc') }}</p>
      <div class="client-cards">
        <div v-for="client in clients" :key="client.key" class="client-card">
          <div class="client-card-title">
            <el-icon class="client-icon"><component :is="client.icon" /></el-icon>
            <span>{{ t(`config.clients.${client.key}`) }}</span>
          </div>
          <p class="client-desc">{{ t(`config.clients.${client.key}_desc`) }}</p>
          <div class="client-meta">
            <span class="meta-label">{{ t('config.labels.supported_count') }}</span>
            <span class="meta-value">{{ supportedCount(client.key) }}{{ t('config.labels.count_unit') }}</span>
          </div>
          <div class="protocol-chips">
            <el-tag
              v-for="proto in CLIENT_PROTOCOL_SUPPORT[client.key]"
              :key="proto"
              size="small"
              type="success"
              effect="plain"
            >{{ protocolLabel(proto) }}</el-tag>
          </div>
        </div>
      </div>
    </el-card>

    <el-card class="section-card" shadow="never">
      <template #header>
        <div class="card-header-title">
          <el-icon><Grid /></el-icon>
          <span>{{ t('config.matrix_title') }}</span>
        </div>
      </template>
      <p class="section-desc">{{ t('config.matrix_desc') }}</p>
      <div class="protocol-table-wrap">
      <el-table :data="matrix" border stripe>
        <el-table-column :label="t('config.table.protocol')" prop="label" min-width="140" />
        <el-table-column
          v-for="client in clients"
          :key="client.key"
          :label="t(`config.clients.${client.key}`)"
          align="center"
          min-width="120"
        >
          <template #default="{ row }">
            <el-tag
              :type="row[client.key] ? 'success' : 'danger'"
              effect="plain"
              size="small"
            >{{ row[client.key] ? t('config.supported') : t('config.not_supported') }}</el-tag>
          </template>
        </el-table-column>
      </el-table>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { Box, Lightning, Lock, Link, PieChart, Grid } from '@element-plus/icons-vue';
import {
  CLIENT_PROTOCOL_SUPPORT,
  CLIENT_ORDER,
  PROTOCOL_LABELS,
  buildMatrix
} from '../utils/protocolMatrix';

const { t } = useI18n();

const clients = [
  { key: 'clash', icon: Box },
  { key: 'surge', icon: Lightning },
  { key: 'shadowsocks', icon: Lock },
  { key: 'universal', icon: Link }
];

const matrix = computed(() => buildMatrix());

function supportedCount(clientKey) {
  return CLIENT_PROTOCOL_SUPPORT[clientKey]?.length || 0;
}

function protocolLabel(proto) {
  return PROTOCOL_LABELS[proto] || proto;
}
</script>
