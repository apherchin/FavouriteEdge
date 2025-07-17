/**
 * 书签管理服务
 * 处理书签的 CRUD 操作和与 Edge 收藏夹的同步
 */

import { BookmarkAPI, StorageAPI, Utils } from '../utils/chromeApi.js';
import iconService from './iconService.js';

class BookmarkService {
  constructor() {
    this.STORAGE_KEY = 'FavouriteEdge_data';
  }

  /**
   * 获取所有书签数据
   */
  async getAllBookmarks() {
    try {
      // 获取 Chrome 书签
      const chromeBookmarks = await BookmarkAPI.getAll();
      
      // 获取扩展自定义数据
      const data = await StorageAPI.get([this.STORAGE_KEY]);
      const appData = data[this.STORAGE_KEY] || {};

      // 转换书签数据格式
      const transformedData = this.transformBookmarkTree(chromeBookmarks);

      // 预加载图标（异步，不阻塞主流程）
      this.preloadBookmarkIcons(transformedData.bookmarks);
      this.preloadBookmarkIcons(transformedData.folders.flatMap(f => f.children));

      return {
        bookmarks: transformedData.bookmarks,
        folders: transformedData.folders,
        privateBookmarks: appData.privateBookmarks || [],
        recycleBin: appData.recycleBin || [],
        statistics: appData.statistics || {},
        lastSync: appData.lastSync || new Date().toISOString()
      };
    } catch (error) {
      console.error('获取书签数据失败:', error);
      throw error;
    }
  }

  /**
   * 转换书签树结构为扁平化数组
   * 按照要求：将二级目录扁平化为一级目录，只管理目录下的书签
   */
  transformBookmarkTree(bookmarkTree, parentId = null) {
    const bookmarks = [];
    const folders = [];

    if (!bookmarkTree || !Array.isArray(bookmarkTree)) {
      console.warn('书签树数据无效');
      return { bookmarks, folders };
    }

    // 遍历根节点
    bookmarkTree.forEach(rootNode => {
      if (rootNode.children) {
        rootNode.children.forEach(node => {
          if (node.children) {
            // 这是一个文件夹，递归处理
            this.processFolderRecursively(node, folders, bookmarks);
          } else if (node.url) {
            // 这是一个顶级书签，直接添加
            const bookmark = {
              id: node.id,
              title: node.title,
              url: node.url,
              favicon: null, // 图标会由iconService异步加载
              parentId: rootNode.id,
              dateAdded: node.dateAdded,
              index: node.index,
              type: 'bookmark'
            };
            bookmarks.push(bookmark);
          }
        });
      }
    });

    return { bookmarks, folders };
  }

  /**
   * 递归处理文件夹，将所有层级的文件夹扁平化
   */
  processFolderRecursively(folderNode, folders, allBookmarks) {
    // 收集当前文件夹中的直接书签
    const directBookmarks = [];
    const subFolders = [];
    
    if (folderNode.children && Array.isArray(folderNode.children)) {
      folderNode.children.forEach(child => {
        if (child.url) {
          // 这是书签，添加到当前文件夹
          const bookmark = {
            id: child.id,
            title: child.title,
            url: child.url,
            favicon: null, // 图标会由iconService异步加载
            parentId: folderNode.id,
            dateAdded: child.dateAdded,
            index: child.index,
            type: 'bookmark'
          };
          directBookmarks.push(bookmark);
          allBookmarks.push(bookmark);
        } else if (child.children) {
          // 这是子文件夹，递归处理
          subFolders.push(child);
        }
      });
    }

    // 创建当前文件夹对象
    const folder = {
      id: folderNode.id,
      title: folderNode.title,
      parentId: folderNode.parentId,
      dateAdded: folderNode.dateAdded,
      children: directBookmarks,
      type: 'folder'
    };

    folders.push(folder);

    // 递归处理所有子文件夹
    subFolders.forEach(subFolder => {
      this.processFolderRecursively(subFolder, folders, allBookmarks);
    });
  }

  /**
   * 预加载书签图标
   */
  preloadBookmarkIcons(bookmarks) {
    if (!bookmarks || !Array.isArray(bookmarks)) return;
    
    const urls = bookmarks.map(bookmark => bookmark.url).filter(Boolean);
    if (urls.length > 0) {
      iconService.preloadIcons(urls);
    }
  }

  /**
   * 创建书签
   */
  async createBookmark(bookmarkData) {
    try {
      const newBookmark = await BookmarkAPI.create(bookmarkData);
      
      // 记录创建事件
      await this.recordBookmarkEvent('create', newBookmark.id);
      
      return newBookmark;
    } catch (error) {
      console.error('创建书签失败:', error);
      throw error;
    }
  }

  /**
   * 创建私密书签
   */
  async createPrivateBookmark(bookmarkData) {
    try {
      const data = await StorageAPI.get([this.STORAGE_KEY]);
      const appData = data[this.STORAGE_KEY] || {};

      // 生成新的私密书签
      const newPrivateBookmark = {
        id: Utils.generateId(),
        title: bookmarkData.title,
        url: bookmarkData.url,
        favicon: null, // 图标会异步加载
        dateAdded: Date.now(),
        index: (appData.privateBookmarks || []).length,
        type: 'private_bookmark'
      };

      // 异步加载图标（不阻塞流程）
      iconService.getBookmarkIcon(bookmarkData.url).then(icon => {
        // 图标加载完成后更新存储（静默更新）
        this.updatePrivateBookmarkIcon(newPrivateBookmark.id, icon);
      }).catch(error => {
        console.debug('获取私密书签图标失败:', error);
      });

      if (!appData.privateBookmarks) {
        appData.privateBookmarks = [];
      }

      appData.privateBookmarks.push(newPrivateBookmark);
      await StorageAPI.set({ [this.STORAGE_KEY]: appData });

      return newPrivateBookmark;
    } catch (error) {
      console.error('创建私密书签失败:', error);
      throw error;
    }
  }

  /**
   * 更新私密书签图标（静默更新）
   */
  async updatePrivateBookmarkIcon(bookmarkId, iconUrl) {
    try {
      const data = await StorageAPI.get([this.STORAGE_KEY]);
      const appData = data[this.STORAGE_KEY] || {};
      
      if (appData.privateBookmarks) {
        const bookmark = appData.privateBookmarks.find(b => b.id === bookmarkId);
        if (bookmark) {
          bookmark.favicon = iconUrl;
          await StorageAPI.set({ [this.STORAGE_KEY]: appData });
        }
      }
    } catch (error) {
      console.debug('更新私密书签图标失败:', error);
    }
  }

  /**
   * 更新书签
   */
  async updateBookmark(id, changes) {
    try {
      // 检查是否是私密书签
      const data = await StorageAPI.get([this.STORAGE_KEY]);
      const appData = data[this.STORAGE_KEY] || {};
      
      const privateBookmark = appData.privateBookmarks?.find(b => b.id === id);
      
      if (privateBookmark) {
        // 更新私密书签
        return await this.updatePrivateBookmark(id, changes);
      } else {
        // 更新普通书签
        const updatedBookmark = await BookmarkAPI.update(id, changes);
        
        // 记录更新事件
        await this.recordBookmarkEvent('update', id);
        
        return updatedBookmark;
      }
    } catch (error) {
      console.error('更新书签失败:', error);
      throw error;
    }
  }

  /**
   * 删除书签
   */
  async deleteBookmark(id) {
    try {
      // 先检查是否是私密书签
      const data = await StorageAPI.get([this.STORAGE_KEY]);
      const appData = data[this.STORAGE_KEY] || {};
      
      const privateBookmark = appData.privateBookmarks?.find(b => b.id === id);
      
      if (privateBookmark) {
        // 删除私密书签
        return await this.deletePrivateBookmark(id);
      } else {
        // 删除普通书签到回收站
        const bookmark = await BookmarkAPI.get(id);
        if (bookmark) {
          // 移动到回收站而不是直接删除
          await this.moveToRecycleBin(bookmark);
          await BookmarkAPI.remove(id);
          
          // 记录删除事件
          await this.recordBookmarkEvent('delete', id);
          
          // 返回带有isPrivate属性的删除书签对象
          return {
            ...bookmark,
            deletedAt: Date.now(),
            originalParentId: bookmark.parentId,
            isPrivate: false
          };
        }
      }
    } catch (error) {
      console.error('删除书签失败:', error);
      throw error;
    }
  }

  /**
   * 移动书签到回收站
   */
  async moveToRecycleBin(bookmark) {
    try {
      const data = await StorageAPI.get([this.STORAGE_KEY]);
      const appData = data[this.STORAGE_KEY] || {};
      
      if (!appData.recycleBin) {
        appData.recycleBin = [];
      }
      
      // 添加删除时间戳和isPrivate属性
      const deletedBookmark = {
        ...bookmark,
        deletedAt: Date.now(),
        originalParentId: bookmark.parentId,
        isPrivate: false // 普通书签明确设置为false
      };
      
      appData.recycleBin.push(deletedBookmark);
      
      // 限制回收站大小（保留最近100个）
      if (appData.recycleBin.length > 100) {
        appData.recycleBin = appData.recycleBin
          .sort((a, b) => b.deletedAt - a.deletedAt)
          .slice(0, 100);
      }
      
      await StorageAPI.set({ [this.STORAGE_KEY]: appData });
    } catch (error) {
      console.error('移动到回收站失败:', error);
    }
  }

  /**
   * 更新私密书签
   */
  async updatePrivateBookmark(id, changes) {
    try {
      const data = await StorageAPI.get([this.STORAGE_KEY]);
      const appData = data[this.STORAGE_KEY] || {};
      
      if (!appData.privateBookmarks) {
        throw new Error('私密书签不存在');
      }
      
      const bookmarkIndex = appData.privateBookmarks.findIndex(b => b.id === id);
      if (bookmarkIndex === -1) {
        throw new Error('找不到指定的私密书签');
      }
      
      // 更新书签
      appData.privateBookmarks[bookmarkIndex] = {
        ...appData.privateBookmarks[bookmarkIndex],
        ...changes,
        lastModified: Date.now()
      };
      
      await StorageAPI.set({ [this.STORAGE_KEY]: appData });
      
      return appData.privateBookmarks[bookmarkIndex];
    } catch (error) {
      console.error('更新私密书签失败:', error);
      throw error;
    }
  }

  /**
   * 删除私密书签
   */
  async deletePrivateBookmark(id) {
    try {
      const data = await StorageAPI.get([this.STORAGE_KEY]);
      const appData = data[this.STORAGE_KEY] || {};
      
      if (!appData.privateBookmarks) {
        return false;
      }
      
      const bookmarkIndex = appData.privateBookmarks.findIndex(b => b.id === id);
      if (bookmarkIndex === -1) {
        return false;
      }
      
      const bookmark = appData.privateBookmarks[bookmarkIndex];
      
      // 初始化回收站
      if (!appData.recycleBin) {
        appData.recycleBin = [];
      }
      
      // 添加到回收站
      const deletedBookmark = {
        ...bookmark,
        deletedAt: Date.now(),
        isPrivate: true // 私密书签明确设置为true
      };
      
      appData.recycleBin.push(deletedBookmark);
      
      // 限制回收站大小（保留最近100个）
      if (appData.recycleBin.length > 100) {
        appData.recycleBin = appData.recycleBin
          .sort((a, b) => b.deletedAt - a.deletedAt)
          .slice(0, 100);
      }
      
      // 从私密书签列表中移除
      appData.privateBookmarks.splice(bookmarkIndex, 1);
      
      await StorageAPI.set({ [this.STORAGE_KEY]: appData });
      
      return deletedBookmark;
    } catch (error) {
      console.error('删除私密书签失败:', error);
      throw error;
    }
  }

  /**
   * 搜索书签
   */
  async searchBookmarks(query) {
    try {
      if (!query?.trim()) {
        return [];
      }

      // 搜索 Chrome 书签
      const chromeResults = await BookmarkAPI.search(query);
      
      // 获取私密书签
      const data = await StorageAPI.get([this.STORAGE_KEY]);
      const appData = data[this.STORAGE_KEY] || {};
      const privateBookmarks = appData.privateBookmarks || [];
      
      // 搜索私密书签
      const privateResults = privateBookmarks.filter(bookmark => 
        bookmark.title.toLowerCase().includes(query.toLowerCase()) ||
        bookmark.url.toLowerCase().includes(query.toLowerCase())
      );

      // 合并结果
      const allResults = [
        ...chromeResults.map(b => ({ ...b, isPrivate: false })),
        ...privateResults.map(b => ({ ...b, isPrivate: true }))
      ];

      return allResults;
    } catch (error) {
      console.error('搜索书签失败:', error);
      return [];
    }
  }

  /**
   * 记录书签事件
   */
  async recordBookmarkEvent(eventType, bookmarkId, additionalData = {}) {
    try {
      const data = await StorageAPI.get([this.STORAGE_KEY]);
      const appData = data[this.STORAGE_KEY] || {};
      
      if (!appData.statistics) {
        appData.statistics = {};
      }
      
      if (!appData.statistics.events) {
        appData.statistics.events = [];
      }
      
      const event = {
        id: Utils.generateId(),
        type: eventType,
        bookmarkId,
        timestamp: Date.now(),
        ...additionalData
      };
      
      appData.statistics.events.push(event);
      
      // 限制事件历史（保留最近1000条）
      if (appData.statistics.events.length > 1000) {
        appData.statistics.events = appData.statistics.events.slice(-1000);
      }
      
      await StorageAPI.set({ [this.STORAGE_KEY]: appData });
    } catch (error) {
      console.debug('记录书签事件失败:', error);
    }
  }

  /**
   * 刷新书签图标
   */
  async refreshBookmarkFavicons(bookmarkIds = null) {
    try {
      const data = await this.getAllBookmarks();
      let bookmarksToRefresh = [];

      if (bookmarkIds) {
        // 刷新指定书签的图标
        bookmarksToRefresh = data.bookmarks.filter(b => bookmarkIds.includes(b.id));
        const privateToRefresh = data.privateBookmarks.filter(b => bookmarkIds.includes(b.id));
        bookmarksToRefresh = bookmarksToRefresh.concat(privateToRefresh);
      } else {
        // 刷新所有书签的图标
        bookmarksToRefresh = data.bookmarks.concat(data.privateBookmarks);
      }

      // 使用新的图标服务刷新图标
      const refreshPromises = bookmarksToRefresh.map(async bookmark => {
        if (bookmark.url) {
          try {
            return await iconService.refreshIcon(bookmark.url);
          } catch (error) {
            console.debug(`刷新书签 ${bookmark.title} 的图标失败:`, error);
            return iconService.getDefaultIcon();
          }
        }
        return null;
      });

      await Promise.allSettled(refreshPromises);
      return true;
    } catch (error) {
      console.error('刷新图标失败:', error);
      throw error;
    }
  }

  /**
   * 创建文件夹
   */
  async createFolder(title) {
    try {
      const newFolder = await BookmarkAPI.create({
        title: title,
        parentId: '1' // 书签栏
      });
      
      await this.recordBookmarkEvent('create_folder', newFolder.id);
      return newFolder;
    } catch (error) {
      console.error('创建文件夹失败:', error);
      throw error;
    }
  }

  /**
   * 删除文件夹
   */
  async deleteFolder(folderId) {
    try {
      await BookmarkAPI.remove(folderId);
      await this.recordBookmarkEvent('delete_folder', folderId);
      return true;
    } catch (error) {
      console.error('删除文件夹失败:', error);
      throw error;
    }
  }

  /**
   * 移动书签到文件夹
   */
  async moveBookmarkToFolder(bookmarkId, folderId) {
    try {
      await BookmarkAPI.move(bookmarkId, { parentId: folderId });
      await this.recordBookmarkEvent('move', bookmarkId, { toFolderId: folderId });
      return true;
    } catch (error) {
      console.error('移动书签到文件夹失败:', error);
      throw error;
    }
  }

  /**
   * 将普通书签转换为私密书签
   */
  async convertBookmarkToPrivate(bookmarkId) {
    try {
      // 获取原始书签
      const chromeBookmarks = await BookmarkAPI.getAll();
      let originalBookmark = null;
      
      // 递归查找书签
      const findBookmark = (nodes) => {
        for (const node of nodes) {
          if (node.id === bookmarkId) {
            return node;
          }
          if (node.children) {
            const found = findBookmark(node.children);
            if (found) return found;
          }
        }
        return null;
      };
      
      originalBookmark = findBookmark(chromeBookmarks);
      
      if (!originalBookmark || !originalBookmark.url) {
        throw new Error('找不到指定的书签或书签无效');
      }

      // 创建私密书签
      const privateBookmark = await this.createPrivateBookmark({
        title: originalBookmark.title,
        url: originalBookmark.url
      });

      // 删除原始书签
      await BookmarkAPI.remove(bookmarkId);
      
      await this.recordBookmarkEvent('convert_to_private', bookmarkId);
      
      return privateBookmark;
    } catch (error) {
      console.error('转换为私密书签失败:', error);
      throw error;
    }
  }

  /**
   * 将私密书签转换为普通书签
   */
  async convertPrivateToBookmark(privateBookmarkId, folderId = '1') {
    try {
      // 获取私密书签
      const data = await StorageAPI.get([this.STORAGE_KEY]);
      const appData = data[this.STORAGE_KEY] || {};
      
      if (!appData.privateBookmarks) {
        throw new Error('私密书签数据不存在');
      }
      
      const bookmarkIndex = appData.privateBookmarks.findIndex(b => b.id === privateBookmarkId);
      if (bookmarkIndex === -1) {
        throw new Error('找不到指定的私密书签');
      }
      
      const privateBookmark = appData.privateBookmarks[bookmarkIndex];

      // 创建普通书签
      const newBookmark = await BookmarkAPI.create({
        title: privateBookmark.title,
        url: privateBookmark.url,
        parentId: folderId
      });

      // 从私密书签列表中移除
      appData.privateBookmarks.splice(bookmarkIndex, 1);
      await StorageAPI.set({ [this.STORAGE_KEY]: appData });
      
      await this.recordBookmarkEvent('convert_to_normal', privateBookmarkId);
      
      return newBookmark;
    } catch (error) {
      console.error('转换为普通书签失败:', error);
      throw error;
    }
  }

  /**
   * 从回收站恢复书签
   */
  async restoreFromRecycleBin(bookmarkId) {
    try {
      const data = await StorageAPI.get([this.STORAGE_KEY]);
      const appData = data[this.STORAGE_KEY] || {};
      
      if (!appData.recycleBin) {
        throw new Error('回收站为空');
      }
      
      const bookmarkIndex = appData.recycleBin.findIndex(b => b.id === bookmarkId);
      if (bookmarkIndex === -1) {
        throw new Error('找不到指定的书签');
      }
      
      const bookmark = appData.recycleBin[bookmarkIndex];
      
      // 从回收站移除
      appData.recycleBin.splice(bookmarkIndex, 1);
      
      if (bookmark.isPrivate) {
        // 恢复私密书签
        if (!appData.privateBookmarks) {
          appData.privateBookmarks = [];
        }
        
        const restoredBookmark = {
          ...bookmark,
          dateRestored: Date.now()
        };
        delete restoredBookmark.deletedAt;
        delete restoredBookmark.originalParentId;
        
        appData.privateBookmarks.push(restoredBookmark);
      } else {
        // 恢复普通书签
        const restoredBookmark = await BookmarkAPI.create({
          title: bookmark.title,
          url: bookmark.url,
          parentId: bookmark.originalParentId || '1'
        });
        
        await this.recordBookmarkEvent('restore', restoredBookmark.id);
      }
      
      await StorageAPI.set({ [this.STORAGE_KEY]: appData });
      
      return true;
    } catch (error) {
      console.error('从回收站恢复失败:', error);
      throw error;
    }
  }
}

// 创建单例实例
const bookmarkService = new BookmarkService();
export default bookmarkService; 