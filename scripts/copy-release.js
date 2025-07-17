#!/usr/bin/env node

/**
 * 自动复制发布文件脚本
 * 从 dist 目录复制文件到 releases 目录
 */

const fs = require('fs');
const path = require('path');

// 读取版本号
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
const releaseDir = path.join(__dirname, `../releases/FavouriteEdge-v${version}`);

// 创建发布目录
if (!fs.existsSync(releaseDir)) {
  fs.mkdirSync(releaseDir, { recursive: true });
  console.log(`📁 创建发布目录: ${releaseDir}`);
}

// 复制函数
function copyFile(src, dest) {
  try {
    fs.copyFileSync(src, dest);
    console.log(`✅ 复制: ${path.basename(src)}`);
  } catch (error) {
    console.error(`❌ 复制失败 ${src}:`, error.message);
  }
}

function copyDir(srcDir, destDir) {
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  
  const files = fs.readdirSync(srcDir);
  files.forEach(file => {
    const srcPath = path.join(srcDir, file);
    const destPath = path.join(destDir, file);
    
    if (fs.statSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      copyFile(srcPath, destPath);
    }
  });
}

// 复制 dist 目录下的所有文件
const distDir = path.join(__dirname, '../dist');
if (fs.existsSync(distDir)) {
  const distFiles = fs.readdirSync(distDir);
  distFiles.forEach(file => {
    const srcPath = path.join(distDir, file);
    const destPath = path.join(releaseDir, file);
    
    if (fs.statSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      copyFile(srcPath, destPath);
    }
  });
} else {
  console.error('❌ dist 目录不存在，请先运行构建命令');
  process.exit(1);
}

// 复制 manifest.json
const manifestSrc = path.join(__dirname, '../public/manifest.json');
const manifestDest = path.join(releaseDir, 'manifest.json');
copyFile(manifestSrc, manifestDest);

// 复制图标文件夹（如果存在）
const iconsSrc = path.join(__dirname, '../releases/FavouriteEdge-v1.6.0/images');
const iconsDest = path.join(releaseDir, 'images');
if (fs.existsSync(iconsSrc)) {
  copyDir(iconsSrc, iconsDest);
  console.log('✅ 复制图标文件夹');
} else {
  console.log('⚠️  图标文件夹不存在，跳过复制');
}

// 创建更新日志（如果不存在）
const changelogPath = path.join(releaseDir, 'CHANGELOG.md');
if (!fs.existsSync(changelogPath)) {
  const changelogContent = `# FavouriteEdge v${version} 更新日志

## 🎉 新功能和改进

请在此处添加更新内容...

---

**FavouriteEdge v${version}** - 更智能的书签管理体验 🚀
`;
  fs.writeFileSync(changelogPath, changelogContent);
  console.log('✅ 创建 CHANGELOG.md');
}

console.log(`🎉 发布文件准备完成: FavouriteEdge-v${version}`); 