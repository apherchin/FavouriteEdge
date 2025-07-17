#!/usr/bin/env node

/**
 * 自动更新版本号脚本
 * 从 src/config/version.js 读取版本号并更新相关文件
 */

const fs = require('fs');
const path = require('path');

// 读取版本号配置
const versionPath = path.join(__dirname, '../src/config/version.js');
const versionContent = fs.readFileSync(versionPath, 'utf8');
// 匹配新的版本格式: export const VERSION_DISPLAY = '1.6.18';
const versionMatch = versionContent.match(/export const VERSION_DISPLAY = '([^']+)'/);

if (!versionMatch) {
  console.error('无法从 version.js 中读取版本号');
  console.log('version.js 内容:', versionContent);
  process.exit(1);
}

const version = versionMatch[1];
console.log(`检测到版本号: ${version}`);

// 更新 package.json
const packagePath = path.join(__dirname, '../package.json');
const packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
packageContent.version = version;
fs.writeFileSync(packagePath, JSON.stringify(packageContent, null, 2) + '\n');
console.log('✅ 已更新 package.json');

// 更新 public/manifest.json
const manifestPath = path.join(__dirname, '../public/manifest.json');
const manifestContent = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
manifestContent.version = version;
fs.writeFileSync(manifestPath, JSON.stringify(manifestContent, null, 2) + '\n');
console.log('✅ 已更新 public/manifest.json');

// 更新发布版本的 manifest.json（如果存在）
const releaseManifestPath = path.join(__dirname, `../releases/FavouriteEdge-v${version}/manifest.json`);
if (fs.existsSync(releaseManifestPath)) {
  const releaseManifestContent = JSON.parse(fs.readFileSync(releaseManifestPath, 'utf8'));
  releaseManifestContent.version = version;
  fs.writeFileSync(releaseManifestPath, JSON.stringify(releaseManifestContent, null, 2) + '\n');
  console.log('✅ 已更新发布版本的 manifest.json');
}

console.log(`🎉 版本号更新完成: ${version}`); 