import { reactive, ref } from 'vue';
import { ElMessageBox } from 'element-plus';
import { api } from '../api/client';
import { parseNodeContent } from '../utils/nodeParser';

export function useNodeActions({ t, toast, submitting, nodesMap, loadNodes, loadSubscriptions }) {
  const addNodeVisible = ref(false);
  const editNodeVisible = ref(false);
  const addNodeForm = reactive({ path: '', content: '' });
  const editNodeForm = reactive({ path: '', id: null, content: '', name: '', nameTouched: false });

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
    addNodeForm.content = '';
    addNodeVisible.value = true;
  }

  async function createNode() {
    if (!addNodeForm.content.trim()) {
      toast('warning', t('nodes.content_required'));
      return;
    }
    const parsed = parseNodeContent(addNodeForm.content);
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
    editNodeForm.name = node.name || '';
    editNodeForm.nameTouched = false;
    editNodeVisible.value = true;
  }

  async function updateNode() {
    if (!editNodeForm.content.trim()) {
      toast('warning', t('nodes.content_required'));
      return;
    }
    submitting.value = true;
    try {
      const data = { content: editNodeForm.content.trim() };
      if (editNodeForm.nameTouched) {
        data.name = editNodeForm.name;
      }
      await api.updateNode(editNodeForm.path, editNodeForm.id, data);
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

  return {
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
  };
}
