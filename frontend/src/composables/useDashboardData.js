import { onMounted, reactive, ref } from 'vue';
import { List, Link, Aim, Lightning, Box, Lock } from '@element-plus/icons-vue';
import { api } from '../api/client';
import { getNodeType } from '../utils/nodeParser';
import { getSubscriptionUrl } from '../utils/subscriptionUrl';
import {
  buildNodeCardItems,
  getNodeSourceLabel,
  getSourceRowspan,
  groupNodesBySource
} from '../utils/nodeGrouping';
import { useNodeSortable } from './useNodeSortable';

export function useDashboardData({ t, toast, batchMode }) {
  const subscriptions = ref([]);
  const loadingSubs = ref(false);
  const version = ref('');
  const expandedPaths = ref([]);
  const nodesMap = reactive({});
  const loadingNodes = reactive({});
  const viewModes = reactive({});
  const groupingModes = reactive({});
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
    getGrouped: (path) => groupingModes[path] !== 'flat',
    getBatchMode: (path) => Boolean(batchMode[path]),
    getTableRef: (path) => tableRefs[path],
    getCardGridRef: (path) => cardGridRefs[path],
    onReorder: handleNodeReorder
  });

  function clientLinks(path) {
    return [
      { key: 'universal', label: 'clients.universal', icon: Link, url: `/${path}` },
      { key: 'v2ray', label: 'clients.v2ray', icon: Aim, url: `/${path}/v2ray` },
      { key: 'surge', label: 'clients.surge', icon: Lightning, url: `/${path}/surge` },
      { key: 'clash', label: 'clients.clash', icon: Box, url: `/${path}/clash` },
      { key: 'shadowsocks', label: 'clients.shadowsocks', icon: Lock, url: `/${path}/shadowsocks` }
    ];
  }

  function openClientPage(url) {
    window.open(getSubscriptionUrl(url), '_blank');
  }

  async function loadSubscriptions() {
    loadingSubs.value = true;
    try {
      const result = await api.subscriptions();
      subscriptions.value = result.data || [];
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
      ensureGroupingMode(path);
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
  }

  function persistViewMode(path) {
    localStorage.setItem(`nodeViewMode:${path}`, viewModes[path]);
    refreshSortable(path);
  }

  function persistGroupingMode(path) {
    localStorage.setItem(`nodeGroupingMode:${path}`, groupingModes[path]);
    refreshSortable(path);
  }

  function ensureViewMode(path) {
    if (viewModes[path]) return;
    const saved = localStorage.getItem(`nodeViewMode:${path}`);
    viewModes[path] = saved === 'table' || saved === 'card'
      ? saved
      : (window.innerWidth <= 768 ? 'card' : 'table');
  }

  function ensureGroupingMode(path) {
    if (groupingModes[path]) return;
    groupingModes[path] = localStorage.getItem(`nodeGroupingMode:${path}`) === 'flat'
      ? 'flat'
      : 'grouped';
  }

  function sourceLabel(node) {
    return getNodeSourceLabel(node, t('nodes.source_ungrouped'));
  }

  function nodeGroups(path) {
    return groupNodesBySource(nodesMap[path], t('nodes.source_ungrouped'));
  }

  function displayedNodes(path) {
    if (groupingModes[path] === 'flat') return nodesMap[path] || [];
    return nodeGroups(path).flatMap((group) => group.nodes);
  }

  function nodeCardItems(path) {
    return buildNodeCardItems(
      nodesMap[path],
      groupingModes[path] !== 'flat',
      t('nodes.source_ungrouped')
    );
  }

  function tableSpanMethod(path, { column, rowIndex }) {
    if (groupingModes[path] === 'flat' || column.columnKey !== 'source') return [1, 1];
    const nodes = displayedNodes(path);
    const rowspan = getSourceRowspan(nodes, rowIndex, t('nodes.source_ungrouped'));
    return rowspan ? [rowspan, 1] : [0, 0];
  }

  function displayNodeType(node) {
    const stored = String(node?.type || '').trim().toLowerCase();
    if (stored && stored !== 'unknown') return stored;
    const detected = getNodeType(node?.original_link);
    return detected && detected !== 'unknown' ? detected : t('nodes.type_unknown');
  }

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

  return {
    subscriptions,
    loadingSubs,
    version,
    expandedPaths,
    nodesMap,
    loadingNodes,
    viewModes,
    groupingModes,
    clientLinks,
    openClientPage,
    loadSubscriptions,
    loadNodes,
    toggleExpand,
    setTableRef,
    setCardGridRef,
    onRowClick,
    persistViewMode,
    persistGroupingMode,
    sourceLabel,
    displayedNodes,
    nodeCardItems,
    tableSpanMethod,
    displayNodeType,
    refreshSortable,
    destroySortable
  };
}
