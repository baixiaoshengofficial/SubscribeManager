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
import { reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';
import {
  Plus, Refresh, Edit, Setting, List, Grid, Connection, Operation,
  Open, TurnOff, Delete, Select, Close, Top, Bottom, CopyDocument, Upload,
  Rank
} from '@element-plus/icons-vue';
import { getSubscriptionUrl } from '../utils/subscriptionUrl';
import { useDashboardData } from '../composables/useDashboardData';
import { useBatchNodeActions } from '../composables/useBatchNodeActions';
import { useNodeActions } from '../composables/useNodeActions';
import { useSubscriptionActions } from '../composables/useSubscriptionActions';
import { useSubconverterActions } from '../composables/useSubconverterActions';
import { useImportActions } from '../composables/useImportActions';

const { t } = useI18n();
const submitting = ref(false);
const selectedMap = reactive({});
const batchMode = reactive({});

function toast(type, message) {
  ElMessage({ type, message });
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast('success', t('common.copied'));
  } catch {
    toast('error', t('common.copy_failed'));
  }
}

async function copyLink(url) {
  await copyText(getSubscriptionUrl(url));
}

const {
  subscriptions,
  loadingSubs,
  version,
  expandedPaths,
  nodesMap,
  loadingNodes,
  viewModes,
  clientLinks,
  openClientPage,
  loadSubscriptions,
  loadNodes,
  toggleExpand,
  setTableRef,
  setCardGridRef,
  onRowClick,
  persistViewMode,
  displayNodeType,
  refreshSortable,
  destroySortable
} = useDashboardData({ t, toast, batchMode });

const {
  enterBatch,
  exitBatch,
  onRowSelect,
  onSelectAllChange,
  allSelected,
  toggleSelectAll,
  batchDelete,
  batchToggle
} = useBatchNodeActions({
  t,
  toast,
  nodesMap,
  selectedMap,
  batchMode,
  refreshSortable,
  destroySortable,
  loadNodes,
  loadSubscriptions
});

const {
  addNodeVisible,
  editNodeVisible,
  addNodeForm,
  editNodeForm,
  moveNode,
  toggleNode,
  deleteNode,
  openAddNode,
  createNode,
  openEditNode,
  updateNode
} = useNodeActions({ t, toast, submitting, nodesMap, loadNodes, loadSubscriptions });

const {
  addSubVisible,
  editSubVisible,
  addSubFormRef,
  editSubFormRef,
  addSubForm,
  editSubForm,
  subRules,
  openAddSubscription,
  createSubscription,
  openEditSubscription,
  updateSubscription,
  confirmDeleteSubscription
} = useSubscriptionActions({ t, toast, submitting, subscriptions, expandedPaths, loadSubscriptions });

const {
  previewing,
  subconverterVisible,
  subconverterForm,
  clashPreviewVisible,
  clashPreview,
  formatPreviewSize,
  downloadClashPreview,
  openSubconverter,
  onSubconverterInput,
  saveSubconverter,
  previewClash
} = useSubconverterActions({ t, toast, submitting, loadSubscriptions });

const {
  importing,
  importVisible,
  importForm,
  importResult,
  importResultTitle,
  importResultDetail,
  openImport,
  importNodes
} = useImportActions({ t, toast, loadNodes, loadSubscriptions });
</script>
