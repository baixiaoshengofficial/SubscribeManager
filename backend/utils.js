// ===== 统一入口文件 =====
// 拆分后的 utils.js 作为统一入口，导出所有必要的模块

// 导入重构后的模块 - 避免循环依赖
const databaseOps = require('./utils/database/operations');
const converters = require('./utils/converters/subscriptionConverter');
const validators = require('./utils/validators/nodeParser');
const helpers = require('./utils/helpers');
const constants = require('./utils/constants');

// 过滤掉snell节点的函数
function filterSnellNodes(content) {
  if (!content?.trim()) return '';

  const keptLines = [];
  let removedAny = false;
  const hasSnellUri = content.toLowerCase().includes('snell://');

  const linesWithEndings = content.match(/[^\n]*\n|[^\n]+$/g) || [];

  linesWithEndings.forEach((lineWithEnding, index) => {
    const newlineMatch = lineWithEnding.match(/\r?\n$/);
    const newline = newlineMatch ? newlineMatch[0] : '';
    const lineContent = lineWithEnding.replace(/\r?\n$/, '');
    const trimmedLine = lineContent.trim();

    if (!trimmedLine) {
      removedAny = true;
      return;
    }

    const lowerLine = trimmedLine.toLowerCase();
    const isSnell = lowerLine.includes('snell://') || (lowerLine.includes('snell,') && lowerLine.includes('='));
    const hasFollowingLegacySnell = linesWithEndings
      .slice(index + 1)
      .some(nextLine => nextLine.toLowerCase().includes('=snell,'));
    const shouldDropLegacyAdjacentVless = !hasSnellUri
      && lowerLine.startsWith('vless://')
      && hasFollowingLegacySnell;

    if (!isSnell && !shouldDropLegacyAdjacentVless) {
      keptLines.push({ content: trimmedLine, newline });
    } else {
      removedAny = true;
    }
  });

  if (!removedAny) {
    return content;
  }

  return keptLines.map((line, index) => {
    const isLast = index === keptLines.length - 1;
    return line.content + (isLast ? '' : (line.newline || '\n'));
  }).join('');
}

// ===== 模块导出 =====

module.exports = {
  // 数据库操作
  ...databaseOps,
  
  // 工具函数
  ...helpers,
  
  // 节点验证和解析
  ...validators,
  
  // 节点过滤
  filterSnellNodes,
  
  // 统一转换接口
  ...converters,
  
  // 常量
  ...constants
};

