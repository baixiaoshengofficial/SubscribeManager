<template>
  <div class="dashboard" data-testid="dashboard">
    <div class="page-header">
      <div class="page-title-block">
        <p class="eyebrow">{{ t('admin.eyebrow') }}</p>
        <div class="page-title-row">
          <h1 class="page-title">{{ t('admin.title') }}</h1>
          <div class="page-actions">
            <el-button type="primary" data-testid="add-subscription" @click="openAddSubscription">
              <el-icon><Plus /></el-icon>
              <span>{{ t('actions.add_subscription') }}</span>
            </el-button>
            <el-button @click="loadSubscriptions">
              <el-icon><Refresh /></el-icon>
              <span>{{ t('actions.refresh') }}</span>
            </el-button>
          </div>
        </div>
        <p class="page-subtitle">{{ t('admin.subtitle') }}</p>
        <p v-if="version" class="page-version">v{{ version }}</p>
      </div>
    </div>

    <div v-loading="loadingSubs" class="subscription-list">
      <el-empty v-if="!subscriptions.length && !loadingSubs" :description="t('subscription.none')" />

      <el-card
        v-for="sub in subscriptions"
        :key="sub.path"
        class="subscription-card"
        :data-testid="`subscription-card-${sub.path}`"
        shadow="never"
      >
        <div class="sub-header">
          <div class="sub-title-row">
            <div class="sub-title-group">
              <h3 class="sub-title">
                <span class="sub-name">{{ sub.name }}</span>
                <span class="sub-node-count">{{ sub.nodeCount || 0 }} {{ t('nodes.count_label') }}</span>
              </h3>
            </div>
            <div class="sub-header-tools">
              <el-button class="icon-btn" text size="small" @click="openEditSubscription(sub)" :title="t('subscription.edit_info')">
                <el-icon><Edit /></el-icon>
              </el-button>
              <el-button class="icon-btn" text size="small" @click="openSubconverter(sub)" :title="t('subconverter.title')">
                <el-icon><Setting /></el-icon>
              </el-button>
            </div>
          </div>
        </div>

        <div class="sub-body">
        <div class="client-types-section">
          <p class="client-types-label">{{ t('subscription.client_links') }}</p>
          <div class="client-types">
          <div
            v-for="c in clientLinks(sub.path)"
            :key="c.key"
            class="client-link-btn"
          >
            <div class="client-link-main" @click="openClientPage(c.url)">
              <el-icon class="client-icon"><component :is="c.icon" /></el-icon>
              <span class="client-label">{{ t(c.label) }}</span>
            </div>
            <div class="client-link-actions">
              <el-button text size="small" @click="copyLink(c.url)" :title="t('common.copy')">
                <el-icon><CopyDocument /></el-icon>
              </el-button>
              <el-button text size="small" @click="openImport(sub.path, c.importType)" :title="t('common.import')">
                <el-icon><Upload /></el-icon>
              </el-button>
            </div>
          </div>
        </div>
        </div>

        <div class="sub-actions">
          <el-button type="success" plain :data-testid="`add-node-${sub.path}`" @click="openAddNode(sub.path)">
            <el-icon><Plus /></el-icon>
            <span>{{ t('actions.add_node') }}</span>
          </el-button>
          <el-button
            :type="expandedPaths.includes(sub.path) ? 'primary' : 'default'"
            :data-testid="`toggle-nodes-${sub.path}`"
            @click="toggleExpand(sub.path)"
          >
            <el-icon><List /></el-icon>
            <span>{{ t('actions.node_list') }}</span>
          </el-button>
        </div>

        <!-- 节点列表 -->
        <el-collapse-transition>
          <div v-show="expandedPaths.includes(sub.path)" class="node-list-area">
            <div class="node-list-toolbar">
              <div class="node-list-title">
                <el-icon><Connection /></el-icon>
                <span>{{ t('actions.node_list') }}</span>
              </div>
              <div class="node-list-tools">
                <el-radio-group v-model="viewModes[sub.path]" size="small" @change="persistViewMode(sub.path)">
                  <el-radio-button value="table" :title="t('nodes.view_table')">
                    <el-icon><List /></el-icon>
                  </el-radio-button>
                  <el-radio-button value="card" :title="t('nodes.view_card')">
                    <el-icon><Grid /></el-icon>
                  </el-radio-button>
                </el-radio-group>

                <template v-if="!batchMode[sub.path]">
                  <el-button size="small" @click="enterBatch(sub.path)">
                    <el-icon><Operation /></el-icon>
                    <span>{{ t('actions.batch') }}</span>
                  </el-button>
                </template>
                <template v-else>
                  <el-button size="small" type="success" @click="batchToggle(sub.path, true)">
                    <el-icon><Open /></el-icon><span>{{ t('actions.enable') }}</span>
                  </el-button>
                  <el-button size="small" type="warning" @click="batchToggle(sub.path, false)">
                    <el-icon><TurnOff /></el-icon><span>{{ t('actions.disable') }}</span>
                  </el-button>
                  <el-button size="small" type="danger" @click="batchDelete(sub.path)">
                    <el-icon><Delete /></el-icon><span>{{ t('actions.remove') }}</span>
                  </el-button>
                  <el-button size="small" @click="toggleSelectAll(sub.path)">
                    <el-icon><Select /></el-icon>
                    <span>{{ allSelected(sub.path) ? t('actions.unselect') : t('actions.select_all') }}</span>
                  </el-button>
                  <el-button size="small" @click="exitBatch(sub.path)">
                    <el-icon><Close /></el-icon><span>{{ t('actions.cancel') }}</span>
                  </el-button>
                </template>
              </div>
            </div>

            <div v-loading="loadingNodes[sub.path]">
              <el-empty v-if="!nodesMap[sub.path] || !nodesMap[sub.path].length" :description="t('nodes.none')" />

              <!-- 表格视图 -->
              <div v-else-if="viewModes[sub.path] === 'table'" class="node-table-wrap">
              <el-table
                :data="nodesMap[sub.path]"
                row-key="id"
                :ref="(el) => setTableRef(sub.path, el)"
                @row-click="onRowClick"
                border
                stripe
              >
                <el-table-column v-if="!batchMode[sub.path]" width="44" align="center" class-name="drag-col">
                  <template #default>
                    <span class="drag-handle" :title="t('nodes.drag_sort')">
                      <el-icon><Rank /></el-icon>
                    </span>
                  </template>
                </el-table-column>
                <el-table-column v-if="batchMode[sub.path]" width="50" align="center">
                  <template #header>
                    <el-checkbox
                      :model-value="allSelected(sub.path)"
                      @change="onSelectAllChange(sub.path, $event)"
                    />
                  </template>
                  <template #default="{ row }">
                    <el-checkbox
                      :model-value="selectedMap[sub.path]?.includes(row.id)"
                      @change="onRowSelect(sub.path, row.id, $event)"
                      @click.stop
                    />
                  </template>
                </el-table-column>
                <el-table-column :label="t('nodes.name')" class-name="node-name-col" show-overflow-tooltip>
                  <template #default="{ row }">
                    <div class="node-name-cell">
                      <el-tag size="small" effect="plain" class="node-type-tag" :type="row.enabled ? 'success' : 'info'">{{ displayNodeType(row) }}</el-tag>
                      <span class="node-name-text" :class="{ disabled: !row.enabled }">{{ row.name }}</span>
                    </div>
                  </template>
                </el-table-column>
                <el-table-column :label="t('nodes.link')" class-name="node-link-col" show-overflow-tooltip>
                  <template #default="{ row }">
                    <code class="node-link-code" :class="{ disabled: !row.enabled }">{{ row.original_link }}</code>
                  </template>
                </el-table-column>
                <el-table-column
                  :label="t('actions.operate')"
                  width="200"
                  align="center"
                  class-name="node-actions-col"
                >
                  <template #default="{ row }">
                    <div class="node-row-actions">
                      <el-button text size="small" @click.stop="openEditNode(sub.path, row)" :title="t('actions.edit')">
                        <el-icon><Edit /></el-icon>
                      </el-button>
                      <el-button text size="small" @click.stop="copyText(row.original_link)" :title="t('common.copy')">
                        <el-icon><CopyDocument /></el-icon>
                      </el-button>
                      <el-button text size="small" @click.stop="toggleNode(sub.path, row)" :title="row.enabled ? t('common.disable') : t('common.enable')">
                        <el-icon><Open v-if="!row.enabled" /><TurnOff v-else /></el-icon>
                      </el-button>
                      <el-button text size="small" type="danger" @click.stop="deleteNode(sub.path, row)" :title="t('common.delete')">
                        <el-icon><Delete /></el-icon>
                      </el-button>
                    </div>
                  </template>
                </el-table-column>
              </el-table>
              </div>

              <!-- 卡片视图 -->
              <div v-else class="node-card-grid" :ref="(el) => setCardGridRef(sub.path, el)">
                <div
                  v-for="node in nodesMap[sub.path]"
                  :key="node.id"
                  class="node-card"
                  :class="{ 'node-card-disabled': !node.enabled }"
                >
                  <div class="node-card-header">
                    <div class="node-card-title">
                      <span v-if="!batchMode[sub.path]" class="node-card-drag drag-handle" :title="t('nodes.drag_sort')">
                        <el-icon><Rank /></el-icon>
                      </span>
                      <el-checkbox
                        v-if="batchMode[sub.path]"
                        :model-value="selectedMap[sub.path]?.includes(node.id)"
                        @change="onRowSelect(sub.path, node.id, $event)"
                      />
                      <el-tag size="small" effect="plain" class="node-type-tag" :type="node.enabled ? 'success' : 'info'">{{ displayNodeType(node) }}</el-tag>
                      <span :class="{ disabled: !node.enabled }">{{ node.name }}</span>
                    </div>
                  </div>
                  <div class="node-card-link" :title="node.original_link" :class="{ disabled: !node.enabled }">{{ node.original_link }}</div>
                  <div class="node-card-actions">
                    <el-button text size="small" @click="moveNode(sub.path, node, -1)" :title="t('nodes.move_up')">
                      <el-icon><Top /></el-icon>
                    </el-button>
                    <el-button text size="small" @click="moveNode(sub.path, node, 1)" :title="t('nodes.move_down')">
                      <el-icon><Bottom /></el-icon>
                    </el-button>
                    <el-button text size="small" @click="openEditNode(sub.path, node)">
                      <el-icon><Edit /></el-icon>
                    </el-button>
                    <el-button text size="small" @click="copyText(node.original_link)">
                      <el-icon><CopyDocument /></el-icon>
                    </el-button>
                    <el-button text size="small" @click="toggleNode(sub.path, node)">
                      <el-icon><Open v-if="!node.enabled" /><TurnOff v-else /></el-icon>
                    </el-button>
                    <el-button text size="small" type="danger" @click="deleteNode(sub.path, node)">
                      <el-icon><Delete /></el-icon>
                    </el-button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </el-collapse-transition>
        </div>
      </el-card>
    </div>

    <!-- 添加订阅 -->
    <el-dialog v-model="addSubVisible" :title="t('subscription.add_title')" width="460px">
      <el-form ref="addSubFormRef" :model="addSubForm" :rules="subRules" label-position="top">
        <el-form-item :label="t('subscription.name_label')" prop="name">
          <el-input v-model="addSubForm.name" data-testid="subscription-name" :placeholder="t('subscription.name_label')" />
        </el-form-item>
        <el-form-item :label="t('subscription.path_label')" prop="path">
          <el-input v-model="addSubForm.path" data-testid="subscription-path" :placeholder="t('subscription.path_label')" />
          <div class="form-help">{{ t('subscription.path_help') }}</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addSubVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" data-testid="create-subscription" :loading="submitting" @click="createSubscription">{{ t('common.create') }}</el-button>
      </template>
    </el-dialog>

    <!-- 编辑订阅 -->
    <el-dialog v-model="editSubVisible" :title="t('modal.edit_sub_title')" width="460px">
      <el-form ref="editSubFormRef" :model="editSubForm" :rules="subRules" label-position="top">
        <el-form-item :label="t('subscription.name_label')" prop="name">
          <el-input v-model="editSubForm.name" />
        </el-form-item>
        <el-form-item :label="t('subscription.path_label')" prop="path">
          <el-input v-model="editSubForm.path" />
          <div class="form-help">{{ t('subscription.path_help') }}</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer-between">
          <el-button type="danger" @click="confirmDeleteSubscription">{{ t('common.delete') }}</el-button>
          <div>
            <el-button @click="editSubVisible = false">{{ t('common.cancel') }}</el-button>
            <el-button type="primary" :loading="submitting" @click="updateSubscription">{{ t('common.save') }}</el-button>
          </div>
        </div>
      </template>
    </el-dialog>

    <!-- 添加节点 -->
    <el-dialog v-model="addNodeVisible" :title="t('modal.add_node_title')" width="640px">
      <el-form label-position="top">
        <el-form-item :label="t('nodes.name')">
          <el-input v-model="addNodeForm.name" data-testid="node-name" :placeholder="t('nodes.name')" />
        </el-form-item>
        <el-form-item :label="t('nodes.content_label')">
          <el-input
            v-model="addNodeForm.content"
            data-testid="node-content"
            type="textarea"
            :rows="6"
            :placeholder="t('nodes.placeholder')"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addNodeVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" data-testid="create-node" :loading="submitting" @click="createNode">{{ t('actions.add_node') }}</el-button>
      </template>
    </el-dialog>

    <!-- 编辑节点 -->
    <el-dialog v-model="editNodeVisible" :title="t('modal.edit_node_title')" width="640px">
      <el-form label-position="top">
        <el-form-item :label="t('nodes.content_label')">
          <el-input
            v-model="editNodeForm.content"
            type="textarea"
            :rows="6"
            :placeholder="t('nodes.placeholder')"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editNodeVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" :loading="submitting" @click="updateNode">{{ t('common.save') }}</el-button>
      </template>
    </el-dialog>

    <!-- Subconverter 配置 -->
    <el-dialog
      v-model="subconverterVisible"
      class="mobile-dialog"
      :title="t('subconverter.title')"
      width="520px"
    >
      <el-form label-position="top">
        <el-form-item :label="t('subconverter.subconvert_url')">
          <el-input v-model="subconverterForm.subconvert_url" placeholder="https://subconverter.example.com" @input="onSubconverterInput" />
          <div class="form-help">{{ t('subconverter.subconvert_url_hint') }}</div>
        </el-form-item>
        <el-form-item :label="t('subconverter.custom_template')">
          <el-input v-model="subconverterForm.custom_template" placeholder="https://example.com/template.ini" @input="onSubconverterInput" />
          <div class="form-help">{{ t('subconverter.custom_template_hint') }}</div>
        </el-form-item>
        <el-form-item v-if="!subconverterForm.subconvert_url && !subconverterForm.custom_template">
          <el-switch v-model="subconverterForm.use_default_template" />
          <span class="switch-label">{{ t('subconverter.use_default_template') }}</span>
          <div class="form-help">{{ t('subconverter.use_default_template_hint') }}</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer-stack">
          <el-button @click="subconverterVisible = false">{{ t('common.cancel') }}</el-button>
          <el-button type="primary" :loading="submitting" @click="saveSubconverter">{{ t('common.save') }}</el-button>
          <el-button :loading="previewing" @click="previewClash">{{ t('subconverter.preview') }}</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- Clash 预览 -->
    <el-dialog
      v-model="clashPreviewVisible"
      class="mobile-dialog clash-preview-dialog"
      :title="t('subconverter.preview_title')"
      width="960px"
      top="4vh"
    >
      <p v-if="clashPreview" class="clash-preview-meta">{{ formatPreviewSize(clashPreview.length) }}</p>
      <pre class="clash-preview">{{ clashPreview }}</pre>
      <template #footer>
        <el-button type="primary" @click="copyText(clashPreview)">{{ t('common.copy') }}</el-button>
        <el-button v-if="clashPreview" @click="downloadClashPreview">{{ t('subconverter.download') }}</el-button>
        <el-button @click="clashPreviewVisible = false">{{ t('common.close') }}</el-button>
      </template>
    </el-dialog>

    <!-- 导入节点 -->
    <el-dialog v-model="importVisible" :title="t('import.title')" width="520px">
      <el-form label-position="top">
        <el-form-item :label="t('import.source_type')">
          <el-select v-model="importForm.importType" style="width: 100%">
            <el-option :label="t('import.type_universal')" value="universal" />
            <el-option :label="t('import.type_v2ray')" value="v2ray" />
            <el-option :label="t('import.type_surge')" value="surge" />
            <el-option :label="t('import.type_clash')" value="clash" />
            <el-option :label="t('import.type_ss')" value="ss" />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('import.url')">
          <el-input v-model="importForm.importUrl" placeholder="https://example.com/subscribe" />
          <div class="form-help">{{ t('import.url_hint') }}</div>
        </el-form-item>
        <el-alert
          v-if="importResult"
          :title="importResultTitle"
          type="success"
          :closable="false"
          show-icon
        >
          <div>{{ importResultDetail }}</div>
        </el-alert>
      </el-form>
      <template #footer>
        <el-button @click="importVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" :loading="importing" @click="importNodes">{{ t('import.button') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  Plus, Refresh, Edit, Setting, Link, List, Grid, Connection, Operation,
  Open, TurnOff, Delete, Select, Close, Top, Bottom, CopyDocument, Upload,
  Box, Lightning, Lock, Aim, Rank
} from '@element-plus/icons-vue';
import { api } from '../api/client';
import { parseNodeContent, getNodeType } from '../utils/nodeParser';
import { getSubscriptionUrl } from '../utils/subscriptionUrl';
import { useNodeSortable } from '../composables/useNodeSortable';

const { t } = useI18n();

const subscriptions = ref([]);
const loadingSubs = ref(false);
const version = ref('');
const expandedPaths = ref([]);
const nodesMap = reactive({});
const loadingNodes = reactive({});
const viewModes = reactive({});
const selectedMap = reactive({});
const batchMode = reactive({});
const tableRefs = {};
const cardGridRefs = {};

async function handleNodeReorder(path, oldIndex, newIndex) {
  if (oldIndex === newIndex || oldIndex == null || newIndex == null) return;
  const list = [...nodesMap[path]];
  const [item] = list.splice(oldIndex, 1);
  list.splice(newIndex, 0, item);
  nodesMap[path] = list;
  try {
    await api.reorderNodes(path, list.map((n, order) => ({ id: n.id, order })));
    toast('success', t('nodes.sort_updated'));
  } catch (error) {
    toast('error', error.message || t('nodes.sort_failed'));
    await loadNodes(path);
  }
}

const { refresh: refreshSortable, destroy: destroySortable } = useNodeSortable({
  getExpanded: (path) => expandedPaths.value.includes(path),
  getViewMode: (path) => viewModes[path] || 'card',
  getBatchMode: (path) => Boolean(batchMode[path]),
  getTableRef: (path) => tableRefs[path],
  getCardGridRef: (path) => cardGridRefs[path],
  onReorder: handleNodeReorder
});

const submitting = ref(false);
const previewing = ref(false);
const importing = ref(false);

// ---- subscriptions dialogs ----
const addSubVisible = ref(false);
const editSubVisible = ref(false);
const addSubFormRef = ref();
const editSubFormRef = ref();
const addSubForm = reactive({ name: '', path: '' });
const editSubForm = reactive({ name: '', path: '', originalPath: '' });

const subRules = {
  name: [{ required: true, message: () => t('subscription.name_required'), trigger: 'blur' }],
  path: [
    { required: true, message: () => t('subscription.path_invalid'), trigger: 'blur' },
    { pattern: /^[a-z0-9-]{5,50}$/, message: () => t('subscription.path_invalid'), trigger: 'blur' }
  ]
};

// ---- node dialogs ----
const addNodeVisible = ref(false);
const editNodeVisible = ref(false);
const addNodeForm = reactive({ path: '', name: '', content: '' });
const editNodeForm = reactive({ path: '', id: null, content: '' });

// ---- subconverter dialog ----
const subconverterVisible = ref(false);
const subconverterForm = reactive({ path: '', subconvert_url: '', custom_template: '', use_default_template: false });
const clashPreviewVisible = ref(false);
const clashPreview = ref('');

// ---- import dialog ----
const importVisible = ref(false);
const importForm = reactive({ path: '', importType: 'universal', importUrl: '' });
const importResult = ref(null);

const importResultTitle = computed(() => {
  if (!importResult.value) return '';
  const d = importResult.value;
  return `${t('import.imported')}: ${d.importedCount || 0} · ${t('import.updated')}: ${d.updatedCount || 0} · ${t('import.failed')}: ${d.failedCount || 0}`;
});
const importResultDetail = computed(() => {
  if (!importResult.value) return '';
  return `${t('import.total_after')}: ${importResult.value.totalAfterImport || 0}`;
});

function toast(type, message) {
  ElMessage({ type, message });
}

function clientLinks(path) {
  return [
    { key: 'universal', label: 'clients.universal', icon: Link, url: `/${path}`, importType: 'universal' },
    { key: 'v2ray', label: 'clients.v2ray', icon: Aim, url: `/${path}/v2ray`, importType: 'v2ray' },
    { key: 'surge', label: 'clients.surge', icon: Lightning, url: `/${path}/surge`, importType: 'surge' },
    { key: 'clash', label: 'clients.clash', icon: Box, url: `/${path}/clash`, importType: 'clash' },
    { key: 'shadowsocks', label: 'clients.shadowsocks', icon: Lock, url: `/${path}/shadowsocks`, importType: 'ss' }
  ];
}

function openClientPage(url) {
  window.open(getSubscriptionUrl(url), '_blank');
}

async function copyLink(url) {
  await copyText(getSubscriptionUrl(url));
}

function displayNodeType(node) {
  const stored = String(node?.type || '').trim().toLowerCase();
  if (stored && stored !== 'unknown') return stored;
  return getNodeType(node?.original_link) || t('nodes.type_unknown');
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast('success', t('common.copied'));
  } catch {
    toast('error', t('common.copy_failed'));
  }
}

function formatPreviewSize(length) {
  if (length < 1024) return t('subconverter.preview_size_bytes', { size: length });
  if (length < 1024 * 1024) return t('subconverter.preview_size_kb', { size: (length / 1024).toFixed(1) });
  return t('subconverter.preview_size_mb', { size: (length / (1024 * 1024)).toFixed(2) });
}

function downloadClashPreview() {
  if (!clashPreview.value) return;
  const blob = new Blob([clashPreview.value], { type: 'text/yaml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${subconverterForm.path || 'clash'}.yaml`;
  anchor.click();
  URL.revokeObjectURL(url);
}

// ---- data loading ----
async function loadSubscriptions() {
  loadingSubs.value = true;
  try {
    const result = await api.subscriptions();
    subscriptions.value = result.data || [];
    // auto-expand previously expanded & load nodes
    for (const path of expandedPaths.value) {
      await loadNodes(path);
    }
  } catch (error) {
    toast('error', error.message);
  } finally {
    loadingSubs.value = false;
  }
}

async function loadNodes(path) {
  loadingNodes[path] = true;
  try {
    const result = await api.nodes(path);
    nodesMap[path] = result.data || [];
    await refreshSortable(path);
  } catch (error) {
    toast('error', error.message);
  } finally {
    loadingNodes[path] = false;
  }
}

async function toggleExpand(path) {
  const idx = expandedPaths.value.indexOf(path);
  if (idx >= 0) {
    expandedPaths.value.splice(idx, 1);
    destroySortable(path);
  } else {
    expandedPaths.value.push(path);
    ensureViewMode(path);
    if (!nodesMap[path]) {
      await loadNodes(path);
    } else {
      await refreshSortable(path);
    }
  }
}

function setTableRef(path, el) {
  if (el) tableRefs[path] = el;
}

function setCardGridRef(path, el) {
  if (el) cardGridRefs[path] = el;
}

function onRowClick() {
  // placeholder to avoid row-click swallowing when not in batch mode
}

function persistViewMode(path) {
  localStorage.setItem(`nodeViewMode:${path}`, viewModes[path]);
  refreshSortable(path);
}

function ensureViewMode(path) {
  if (viewModes[path]) return;
  const saved = localStorage.getItem(`nodeViewMode:${path}`);
  viewModes[path] = saved === 'table' || saved === 'card'
    ? saved
    : (window.innerWidth <= 768 ? 'card' : 'table');
}

function initBatchState(path) {
  if (!selectedMap[path]) selectedMap[path] = [];
  if (batchMode[path] === undefined) batchMode[path] = false;
}

// ---- batch ----
function enterBatch(path) {
  initBatchState(path);
  batchMode[path] = true;
  selectedMap[path] = [];
  destroySortable(path);
  toast('info', t('nodes.batch_select_tip'));
}

function exitBatch(path) {
  batchMode[path] = false;
  selectedMap[path] = [];
  refreshSortable(path);
}

function onRowSelect(path, id, checked) {
  initBatchState(path);
  const set = new Set(selectedMap[path]);
  if (checked) set.add(id); else set.delete(id);
  selectedMap[path] = Array.from(set);
}

function onSelectAllChange(path, checked) {
  initBatchState(path);
  selectedMap[path] = checked ? (nodesMap[path] || []).map((n) => n.id) : [];
}

function allSelected(path) {
  const nodes = nodesMap[path] || [];
  if (!nodes.length) return false;
  const sel = selectedMap[path] || [];
  return nodes.every((n) => sel.includes(n.id));
}

function toggleSelectAll(path) {
  if (allSelected(path)) {
    selectedMap[path] = [];
  } else {
    selectedMap[path] = (nodesMap[path] || []).map((n) => n.id);
  }
}

async function batchDelete(path) {
  const ids = selectedMap[path] || [];
  if (!ids.length) {
    toast('warning', t('nodes.batch_delete_none'));
    return;
  }
  try {
    await ElMessageBox.confirm(t('nodes.batch_delete_confirm', { count: ids.length }), t('common.confirm'), { type: 'warning' });
  } catch {
    return;
  }
  let success = 0;
  let fail = 0;
  toast('info', t('nodes.batch_deleting'));
  for (const id of ids) {
    try {
      await api.deleteNode(path, id);
      success++;
    } catch {
      fail++;
    }
  }
  exitBatch(path);
  await loadNodes(path);
  await loadSubscriptions();
  if (fail === 0) {
    toast('success', t('nodes.deleted'));
  } else {
    toast('warning', t('nodes.batch_delete_done', { success, failed: fail }));
  }
}

async function batchToggle(path, enabled) {
  const ids = selectedMap[path] || [];
  if (!ids.length) {
    toast('warning', t('nodes.batch_toggle_none'));
    return;
  }
  const action = enabled ? t('actions.enable') : t('actions.disable');
  try {
    await ElMessageBox.confirm(t('nodes.batch_toggle_confirm', { action, count: ids.length }), t('common.confirm'), { type: 'warning' });
  } catch {
    return;
  }
  let success = 0;
  let fail = 0;
  toast('info', t('nodes.batch_toggling', { action }));
  for (const id of ids) {
    try {
      await api.toggleNode(path, id, enabled);
      success++;
    } catch {
      fail++;
    }
  }
  exitBatch(path);
  await loadNodes(path);
  await loadSubscriptions();
  if (fail === 0) {
    toast('success', t('common.success'));
  } else {
    toast('warning', t('nodes.batch_toggle_done', { action, success, failed: fail }));
  }
}

// ---- node actions ----
async function moveNode(path, node, direction) {
  const list = nodesMap[path] || [];
  const index = list.findIndex((n) => n.id === node.id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= list.length) return;
  const reordered = [...list];
  [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
  try {
    await api.reorderNodes(path, reordered.map((n, order) => ({ id: n.id, order })));
    nodesMap[path] = reordered;
  } catch (error) {
    toast('error', t('nodes.sort_failed') + ': ' + error.message);
    await loadNodes(path);
  }
}

async function toggleNode(path, node) {
  try {
    await api.toggleNode(path, node.id, !node.enabled);
    toast('success', t(node.enabled ? 'nodes.disabled' : 'nodes.enabled'));
    await loadNodes(path);
  } catch (error) {
    toast('error', error.message);
  }
}

async function deleteNode(path, node) {
  try {
    await ElMessageBox.confirm(t('nodes.delete_confirm'), t('common.confirm'), { type: 'warning' });
  } catch {
    return;
  }
  try {
    await api.deleteNode(path, node.id);
    toast('success', t('nodes.deleted'));
    await loadNodes(path);
    await loadSubscriptions();
  } catch (error) {
    toast('error', error.message);
  }
}

function openAddNode(path) {
  addNodeForm.path = path;
  addNodeForm.name = '';
  addNodeForm.content = '';
  addNodeVisible.value = true;
}

async function createNode() {
  if (!addNodeForm.content.trim()) {
    toast('warning', t('nodes.content_required'));
    return;
  }
  const parsed = parseNodeContent(addNodeForm.content, addNodeForm.name.trim() || undefined);
  if (!parsed.length) {
    toast('warning', t('nodes.unsupported_format'));
    return;
  }
  submitting.value = true;
  let success = 0;
  let fail = 0;
  const baseOrder = Date.now();
  try {
    for (let i = 0; i < parsed.length; i++) {
      try {
        await api.createNode(addNodeForm.path, {
          name: parsed[i].name,
          content: parsed[i].content,
          order: baseOrder + i
        });
        success++;
      } catch {
        fail++;
      }
    }
    addNodeVisible.value = false;
    await loadNodes(addNodeForm.path);
    await loadSubscriptions();
    if (parsed.length === 1) {
      toast('success', t('nodes.added'));
    } else {
      toast(success > 0 ? 'success' : 'warning', t('nodes.add_result', { success, failed: fail }));
    }
  } finally {
    submitting.value = false;
  }
}

function openEditNode(path, node) {
  editNodeForm.path = path;
  editNodeForm.id = node.id;
  editNodeForm.content = node.original_link;
  editNodeVisible.value = true;
}

async function updateNode() {
  if (!editNodeForm.content.trim()) {
    toast('warning', t('nodes.content_required'));
    return;
  }
  submitting.value = true;
  try {
    await api.updateNode(editNodeForm.path, editNodeForm.id, { content: editNodeForm.content.trim() });
    toast('success', t('nodes.edited'));
    editNodeVisible.value = false;
    await loadNodes(editNodeForm.path);
    await loadSubscriptions();
  } catch (error) {
    toast('error', error.message);
  } finally {
    submitting.value = false;
  }
}

// ---- subscription actions ----
function openAddSubscription() {
  addSubForm.name = '';
  addSubForm.path = '';
  addSubVisible.value = true;
}

async function createSubscription() {
  try {
    await addSubFormRef.value?.validate();
  } catch {
    return;
  }
  submitting.value = true;
  try {
    await api.createSubscription({ name: addSubForm.name.trim(), path: addSubForm.path.trim() });
    toast('success', t('subscription.created'));
    addSubVisible.value = false;
    await loadSubscriptions();
  } catch (error) {
    toast('error', error.message);
  } finally {
    submitting.value = false;
  }
}

function openEditSubscription(sub) {
  editSubForm.originalPath = sub.path;
  editSubForm.name = sub.name;
  editSubForm.path = sub.path;
  editSubVisible.value = true;
}

async function updateSubscription() {
  try {
    await editSubFormRef.value?.validate();
  } catch {
    return;
  }
  submitting.value = true;
  try {
    const existing = subscriptions.value.find((s) => s.path === editSubForm.originalPath);
    await api.updateSubscription(editSubForm.originalPath, {
      name: editSubForm.name.trim(),
      path: editSubForm.path.trim(),
      subconvert_url: existing?.subconvert_url || null,
      custom_template: existing?.custom_template || null,
      use_default_template: Boolean(existing?.use_default_template)
    });
    toast('success', t('subscription.updated'));
    editSubVisible.value = false;
    // update expanded paths if renamed
    if (editSubForm.path.trim() !== editSubForm.originalPath) {
      expandedPaths.value = expandedPaths.value.map((p) => (p === editSubForm.originalPath ? editSubForm.path.trim() : p));
    }
    await loadSubscriptions();
  } catch (error) {
    toast('error', error.message);
  } finally {
    submitting.value = false;
  }
}

async function confirmDeleteSubscription() {
  try {
    await ElMessageBox.confirm(t('subscription.delete_confirm'), t('common.confirm'), { type: 'warning' });
  } catch {
    return;
  }
  submitting.value = true;
  try {
    await api.deleteSubscription(editSubForm.originalPath);
    toast('success', t('subscription.deleted'));
    editSubVisible.value = false;
    expandedPaths.value = expandedPaths.value.filter((p) => p !== editSubForm.originalPath);
    await loadSubscriptions();
  } catch (error) {
    toast('error', error.message);
  } finally {
    submitting.value = false;
  }
}

// ---- subconverter ----
function openSubconverter(sub) {
  subconverterForm.path = sub.path;
  subconverterForm.subconvert_url = sub.subconvert_url || '';
  subconverterForm.custom_template = sub.custom_template || '';
  subconverterForm.use_default_template = sub.use_default_template === 1 || sub.use_default_template === true;
  subconverterVisible.value = true;
}

function onSubconverterInput() {
  // use_default_template 仅在两者都为空时显示
}

async function saveSubconverter() {
  submitting.value = true;
  try {
    await api.saveSubconverter(subconverterForm.path, {
      subconvert_url: subconverterForm.subconvert_url.trim() || null,
      custom_template: subconverterForm.custom_template.trim() || null,
      use_default_template: subconverterForm.use_default_template
    });
    toast('success', t('subconverter.updated'));
    subconverterVisible.value = false;
    await loadSubscriptions();
  } catch (error) {
    toast('error', error.message);
  } finally {
    submitting.value = false;
  }
}

async function previewClash() {
  previewing.value = true;
  try {
    const result = await api.generateClash({
      subscriptionPath: subconverterForm.path,
      subconvertUrl: subconverterForm.subconvert_url.trim() || undefined,
      templateUrl: subconverterForm.custom_template.trim() || undefined
    });
    clashPreview.value = result.data?.config || '';
    clashPreviewVisible.value = true;
  } catch (error) {
    toast('error', error.message);
  } finally {
    previewing.value = false;
  }
}

// ---- import ----
function openImport(path, importType) {
  importForm.path = path;
  importForm.importType = importType || 'universal';
  importForm.importUrl = '';
  importResult.value = null;
  importVisible.value = true;
}

async function importNodes() {
  if (!importForm.importUrl.trim()) {
    toast('warning', t('import.url_required'));
    return;
  }
  try {
    new URL(importForm.importUrl.trim());
  } catch {
    toast('warning', t('import.invalid_url'));
    return;
  }
  importing.value = true;
  try {
    const result = await api.importNodes(importForm.path, importForm.importUrl.trim(), importForm.importType);
    importResult.value = result.data || {};
    toast('success', t('import.imported') + ': ' + (result.data?.importedCount || 0));
    await loadNodes(importForm.path);
    await loadSubscriptions();
  } catch (error) {
    toast('error', error.message);
  } finally {
    importing.value = false;
  }
}

// ---- version ----
async function loadVersion() {
  try {
    const result = await api.version();
    version.value = result.version;
  } catch {}
}

onMounted(async () => {
  await loadSubscriptions();
  loadVersion();
});
</script>
