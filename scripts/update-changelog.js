#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// 读取当前版本
const versionInfo = JSON.parse(fs.readFileSync('./version.json', 'utf8'));
const currentVersion = versionInfo.version;

// 读取 CHANGELOG.md
const changelogPath = './CHANGELOG.md';
let content = fs.readFileSync(changelogPath, 'utf8');

// 获取今天的日期（YYYY-MM-DD）
const today = new Date().toISOString().split('T')[0];

// 检查是否已经有当前版本的条目
if (content.includes(`[${currentVersion}]`)) {
  console.log(`✅ 版本 ${currentVersion} 已存在于 CHANGELOG.md 中`);
  console.log(`📅 更新日期为 ${today}`);

  // 更新现有版本的日期
  const versionRegex = new RegExp(`(## \\[${currentVersion}\\])\\s*-\\s*(\\d{4}-\\d{2}-\\d{2})`);
  content = content.replace(versionRegex, `$1 - ${today}`);
  fs.writeFileSync(changelogPath, content);
  console.log(`✅ 已更新版本 ${currentVersion} 的日期`);
} else {
  console.log(`⚠️  版本 ${currentVersion} 不存在于 CHANGELOG.md 中`);
  console.log(`📝 请手动添加版本 ${currentVersion} 的更新日志`);
  process.exit(1);
}
