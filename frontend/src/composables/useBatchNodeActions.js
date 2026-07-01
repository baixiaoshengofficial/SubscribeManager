import { ElMessageBox } from 'element-plus';
import { api } from '../api/client';

export function useBatchNodeActions({
  t,
  toast,
  nodesMap,
  selectedMap,
  batchMode,
  refreshSortable,
  destroySortable,
  loadNodes,
  loadSubscriptions
}) {
  function initBatchState(path) {
    if (!selectedMap[path]) selectedMap[path] = [];
    if (batchMode[path] === undefined) batchMode[path] = false;
  }

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
    selectedMap[path] = allSelected(path)
      ? []
      : (nodesMap[path] || []).map((n) => n.id);
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

  return {
    enterBatch,
    exitBatch,
    onRowSelect,
    onSelectAllChange,
    allSelected,
    toggleSelectAll,
    batchDelete,
    batchToggle
  };
}
