#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const version = process.argv[2];

if (!version) {
  console.error('❌ 错误: 请提供版本号');
  console.error('   用法: node extract-changelog.js <version>');
  process.exit(1);
}

// 读取 CHANGELOG.md
const changelogPath = './CHANGELOG.md';
let content = fs.readFileSync(changelogPath, 'utf8');

// 构建正则表达式，匹配指定版本的日志
const regex = new RegExp(`## \\[${version.replace(/\./g, '\\.')}\\][^\\n]*([\\s\\S]*?)(?=## |$$)`, 's');
const match = content.match(regex);

if (match && match[0]) {
  console.log(match[0].trim());
} else {
  console.log(`### 🎉 版本 v${version} 发布\n\n详细更新日志请查看 [CHANGELOG.md](https://github.com/jokerknight/SubscribeManager/blob/main/CHANGELOG.md)`);
}

