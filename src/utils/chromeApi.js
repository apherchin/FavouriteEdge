/**
 * Chrome API 封装工具
 * 提供统一的浏览器 API 接口
 */

// 检查Chrome API是否可用的辅助函数
const checkChromeAPI = (apiPath) => {
  try {
    const pathParts = apiPath.split('.');
    let current = chrome;
    for (const part of pathParts) {
      if (!current || !current[part]) {
        return false;
      }
      current = current[part];
    }
    return true;
  } catch (error) {
    return false;
  }
};

// 书签 API 封装
export const BookmarkAPI = {
  /**
   * 获取所有书签
   */
  async getAll() {
    try {
      if (!checkChromeAPI('bookmarks.getTree')) {
        throw new Error('Chrome Bookmarks API 不可用');
      }
      const bookmarks = await chrome.bookmarks.getTree();
      return bookmarks;
    } catch (error) {
      console.debug('获取书签失败:', error.message);
      throw new Error('BOOKMARK_FETCH_ERROR');
    }
  },

  /**
   * 创建书签
   */
  async create(bookmark) {
    try {
      if (!checkChromeAPI('bookmarks.create')) {
        throw new Error('Chrome Bookmarks API 不可用');
      }
      const newBookmark = await chrome.bookmarks.create(bookmark);
      return newBookmark;
    } catch (error) {
      console.debug('创建书签失败:', error.message);
      throw new Error('BOOKMARK_CREATE_ERROR');
    }
  },

  /**
   * 更新书签
   */
  async update(id, changes) {
    try {
      if (!checkChromeAPI('bookmarks.update')) {
        throw new Error('Chrome Bookmarks API 不可用');
      }
      const updatedBookmark = await chrome.bookmarks.update(id, changes);
      return updatedBookmark;
    } catch (error) {
      console.debug('更新书签失败:', error.message);
      throw new Error('BOOKMARK_UPDATE_ERROR');
    }
  },

  /**
   * 删除书签
   */
  async remove(id) {
    try {
      if (!checkChromeAPI('bookmarks.remove')) {
        throw new Error('Chrome Bookmarks API 不可用');
      }
      await chrome.bookmarks.remove(id);
      return true;
    } catch (error) {
      console.debug('删除书签失败:', error.message);
      throw new Error('BOOKMARK_DELETE_ERROR');
    }
  },

  /**
   * 移动书签
   */
  async move(id, destination) {
    try {
      if (!checkChromeAPI('bookmarks.move')) {
        throw new Error('Chrome Bookmarks API 不可用');
      }
      const movedBookmark = await chrome.bookmarks.move(id, destination);
      return movedBookmark;
    } catch (error) {
      console.debug('移动书签失败:', error.message);
      throw new Error('BOOKMARK_MOVE_ERROR');
    }
  },

  /**
   * 搜索书签
   */
  async search(query) {
    try {
      if (!checkChromeAPI('bookmarks.search')) {
        throw new Error('Chrome Bookmarks API 不可用');
      }
      const results = await chrome.bookmarks.search(query);
      return results;
    } catch (error) {
      console.debug('搜索书签失败:', error.message);
      throw new Error('BOOKMARK_SEARCH_ERROR');
    }
  },

  /**
   * 获取单个书签
   */
  async get(id) {
    try {
      if (!checkChromeAPI('bookmarks.get')) {
        throw new Error('Chrome Bookmarks API 不可用');
      }
      const bookmarks = await chrome.bookmarks.get(id);
      return bookmarks[0]; // chrome.bookmarks.get 返回数组
    } catch (error) {
      console.debug('获取书签失败:', error.message);
      throw new Error('BOOKMARK_GET_ERROR');
    }
  }
};

// 存储 API 封装
export const StorageAPI = {
  /**
   * 获取存储数据
   */
  async get(keys) {
    try {
      if (!checkChromeAPI('storage.local.get')) {
        throw new Error('Chrome Storage API 不可用');
      }
      const result = await chrome.storage.local.get(keys);
      return result;
    } catch (error) {
      console.debug('获取存储数据失败:', error.message);
      throw new Error('STORAGE_GET_ERROR');
    }
  },

  /**
   * 设置存储数据
   */
  async set(data) {
    try {
      if (!checkChromeAPI('storage.local.set')) {
        throw new Error('Chrome Storage API 不可用');
      }
      await chrome.storage.local.set(data);
      return true;
    } catch (error) {
      console.debug('设置存储数据失败:', error.message);
      throw new Error('STORAGE_SET_ERROR');
    }
  },

  /**
   * 删除存储数据
   */
  async remove(keys) {
    try {
      if (!checkChromeAPI('storage.local.remove')) {
        throw new Error('Chrome Storage API 不可用');
      }
      await chrome.storage.local.remove(keys);
      return true;
    } catch (error) {
      console.debug('删除存储数据失败:', error.message);
      throw new Error('STORAGE_REMOVE_ERROR');
    }
  },

  /**
   * 清空存储数据
   */
  async clear() {
    try {
      if (!checkChromeAPI('storage.local.clear')) {
        throw new Error('Chrome Storage API 不可用');
      }
      await chrome.storage.local.clear();
      return true;
    } catch (error) {
      console.debug('清空存储数据失败:', error.message);
      throw new Error('STORAGE_CLEAR_ERROR');
    }
  }
};

// 通知 API 封装
export const NotificationAPI = {
  /**
   * 创建通知
   */
  async create(id, options) {
    try {
      if (!checkChromeAPI('notifications.create')) {
        console.debug('Chrome Notifications API 不可用，跳过通知创建');
        return null;
      }
      const notificationId = await chrome.notifications.create(id, {
        type: 'basic',
        iconUrl: 'images/icon-48.png',
        title: 'FavouriteEdge',
        ...options
      });
      return notificationId;
    } catch (error) {
      console.debug('创建通知失败:', error.message);
      return null; // 通知失败不抛出错误
    }
  },

  /**
   * 清除通知
   */
  async clear(id) {
    try {
      if (!checkChromeAPI('notifications.clear')) {
        console.debug('Chrome Notifications API 不可用，跳过通知清除');
        return true;
      }
      await chrome.notifications.clear(id);
      return true;
    } catch (error) {
      console.debug('清除通知失败:', error.message);
      return true; // 通知失败不抛出错误
    }
  }
};

// 标签页 API 封装
export const TabAPI = {
  /**
   * 获取当前活动标签页
   */
  async getCurrent() {
    try {
      if (!checkChromeAPI('tabs.query')) {
        throw new Error('Chrome Tabs API 不可用');
      }
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      return tabs[0];
    } catch (error) {
      console.debug('获取当前标签页失败:', error.message);
      throw new Error('TAB_GET_CURRENT_ERROR');
    }
  },

  /**
   * 创建新标签页
   */
  async create(createProperties) {
    try {
      if (!checkChromeAPI('tabs.create')) {
        throw new Error('Chrome Tabs API 不可用');
      }
      const tab = await chrome.tabs.create(createProperties);
      return tab;
    } catch (error) {
      console.debug('创建标签页失败:', error.message);
      throw new Error('TAB_CREATE_ERROR');
    }
  },

  /**
   * 更新标签页
   */
  async update(tabId, updateProperties) {
    try {
      if (!checkChromeAPI('tabs.update')) {
        throw new Error('Chrome Tabs API 不可用');
      }
      const tab = await chrome.tabs.update(tabId, updateProperties);
      return tab;
    } catch (error) {
      console.debug('更新标签页失败:', error.message);
      throw new Error('TAB_UPDATE_ERROR');
    }
  }
};

// 工具函数
export const Utils = {
  /**
   * 检查 Chrome API 是否可用
   */
  isExtensionContext() {
    return checkChromeAPI('runtime.id');
  },

  /**
   * 获取扩展 URL
   */
  getExtensionURL(path) {
    try {
      if (!checkChromeAPI('runtime.getURL')) {
        return path;
      }
      return chrome.runtime.getURL(path);
    } catch (error) {
      console.debug('获取扩展URL失败:', error.message);
      return path;
    }
  },

  /**
   * 获取网站图标 URL - 简化版本
   */
  getFaviconURL(url) {
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname;
      
      // 直接返回Google favicon服务URL
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    } catch (error) {
      return this.getDefaultFavicon();
    }
  },

  /**
   * 获取默认图标
   */
  getDefaultFavicon() {
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iNCIgZmlsbD0iIzY2NzNlYSIvPgo8cGF0aCBkPSJNMTYgOEMxMiA4IDEwIDEwIDEwIDE0VjE4QzEwIDIyIDE0IDI0IDE2IDI0QzE4IDI0IDIyIDIyIDIyIDE4VjE0QzIyIDEwIDIwIDggMTYgOFoiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo=';
  },

  /**
   * 从URL获取域名
   */
  getDomainFromURL(url) {
    try {
      return new URL(url).hostname;
    } catch (error) {
      return 'unknown';
    }
  },

  /**
   * 从URL获取origin
   */
  getOriginFromURL(url) {
    try {
      return new URL(url).origin;
    } catch (error) {
      return 'https://unknown';
    }
  },

  /**
   * 格式化 URL
   */
  formatURL(url) {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `https://${url}`;
  },

  /**
   * 生成唯一ID
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}; 