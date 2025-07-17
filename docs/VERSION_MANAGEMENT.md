# 版本管理系统

FavouriteEdge 现在使用统一的版本管理系统，只需要修改一个地方就可以更新所有相关文件的版本号。

## 📁 文件结构

```
src/config/version.js          # 🎯 主版本配置文件（仅需修改此文件）
scripts/update-version.js      # 自动更新脚本
scripts/copy-release.js        # 发布文件复制脚本
package.json                   # 自动同步
public/manifest.json           # 自动同步
src/popup/popup.jsx           # 自动引用版本号
src/components/Sidebar/Sidebar.jsx  # 自动引用版本号
```

## 🚀 如何更新版本号

### 1. 修改版本号
只需要编辑 `src/config/version.js` 文件：

```javascript
export const VERSION = '1.4.0';  // 👈 只需修改这里
```

### 2. 运行更新脚本
```bash
npm run update-version
```

这个命令会自动更新：
- ✅ `package.json` 的 version 字段
- ✅ `public/manifest.json` 的 version 字段  
- ✅ 已存在的发布版本的 `manifest.json`

### 3. 构建项目
```bash
npm run build          # 普通构建（自动更新版本号）
npm run build:prod     # 生产构建（包含发布文件复制）
```

## 📋 可用的脚本命令

| 命令 | 功能 |
|------|------|
| `npm run update-version` | 仅更新版本号 |
| `npm run build` | 更新版本号 + 构建 |
| `npm run build:prod` | 更新版本号 + 构建 + 准备发布文件 |
| `npm run copy-release` | 复制构建文件到发布目录 |

## 🎯 版本号显示位置

版本号会自动显示在以下位置：
- 扩展弹出窗口（popup）
- 侧边栏底部
- package.json
- manifest.json

## 🔧 自动化特性

- **单点修改**：只需修改 `src/config/version.js`
- **自动同步**：脚本自动更新所有相关文件
- **构建集成**：构建时自动运行版本更新
- **发布准备**：自动复制文件到 releases 目录

## 📝 示例工作流程

1. 开发新功能
2. 修改 `src/config/version.js` 中的版本号
3. 运行 `npm run build:prod`
4. 检查 `releases/FavouriteEdge-vX.X.X/` 目录
5. 发布新版本

## ⚠️ 注意事项

- 版本号格式：使用语义化版本号（如 `1.2.3`）
- 不要手动修改 `package.json` 和 `manifest.json` 中的版本号
- 构建前会自动运行版本更新，确保一致性 