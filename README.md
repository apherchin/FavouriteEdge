# FavouriteEdge 书签管理器

一个功能丰富的 Microsoft Edge 浏览器扩展，用于替换默认新标签页并提供智能书签管理功能。

## 项目特性

✅ **已完成功能 (Phase 1-2)**:
- 🔧 完整的项目架构和构建配置
- 📚 书签数据同步和管理服务
- 🎨 现代化的用户界面设计
- 🔍 实时搜索功能
- 📱 响应式布局适配
- 🔒 私密书签基础功能
- 🗑️ 回收站机制
- 📊 书签统计显示

🚧 **开发中功能**:
- 🖱️ 拖拽排序功能
- 🔐 PIN 保护和加密
- 📈 点击统计和智能排序
- 🔔 通知系统

## 技术栈

- **前端**: React 18, JavaScript ES6+
- **构建**: Webpack 5, Babel
- **样式**: CSS3 with Custom Properties
- **状态管理**: Zustand
- **拖拽**: react-dnd
- **扩展 API**: Chrome Extension APIs

## 安装方法

### 开发版本安装

1. 克隆项目并安装依赖：
```bash
git clone <repository-url>
cd FavouriteEdge
npm install
```

2. 构建项目：
```bash
npm run build
```

3. 在 Edge 浏览器中安装：
   - 打开 Edge 浏览器
   - 输入 `edge://extensions/`
   - 开启"开发人员模式"
   - 点击"加载解压缩的扩展"
   - 选择项目的 `dist` 文件夹

4. 打开新标签页即可看到 FavouriteEdge 界面

### 开发模式

启动开发服务器：
```bash
npm run dev
```

## 项目结构

```
FavouriteEdge/
├── src/
│   ├── components/          # React 组件
│   │   ├── BookmarkGrid/    # 书签网格组件
│   │   ├── SearchBar/       # 搜索栏组件
│   │   ├── Sidebar/         # 侧边栏组件
│   │   ├── PrivateFolder/   # 私密文件夹组件
│   │   ├── RecycleBin/      # 回收站组件
│   │   └── Common/          # 通用组件
│   ├── services/            # 业务逻辑服务
│   ├── store/               # 状态管理
│   ├── utils/               # 工具函数
│   ├── styles/              # 样式文件
│   ├── background/          # 后台脚本
│   ├── newtab/              # 新标签页
│   └── popup/               # 弹窗页面
├── public/                  # 静态资源
├── dist/                    # 构建输出
└── docs/                    # 项目文档
```

## 使用说明

### 基础功能

1. **书签浏览**: 在新标签页查看和管理所有书签
2. **搜索**: 使用顶部搜索栏快速查找书签
3. **分类**: 通过侧边栏切换不同的书签视图

### 私密书签

1. 点击侧边栏的"私密书签"
2. 输入 PIN 码 (测试版默认: 1234)
3. 创建和管理受保护的书签

### 回收站

1. 删除的书签会暂时保存在回收站
2. 可以从回收站恢复或永久删除书签

## 开发计划

按照 90 小时的开发计划，项目分为 5 个阶段：

- ✅ **Phase 1** (20h): 项目基础搭建
- ✅ **Phase 2** (25h): 界面开发  
- 🚧 **Phase 3** (20h): 核心功能开发
- ⏳ **Phase 4** (15h): 通知与集成
- ⏳ **Phase 5** (10h): 测试与发布

## 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 许可证

本项目使用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 技术支持

如有问题或建议，请通过以下方式联系：

- 创建 Issue
- 发送邮件至技术支持

---

**FavouriteEdge** - 让书签管理更智能，更高效！ 🚀 