/**
 * FavouriteEdge 后台脚本
 * 处理书签监听、通知等后台功能
 */

import { BookmarkAPI, StorageAPI, NotificationAPI, TabAPI } from '../utils/chromeApi.js';

// 后台脚本主类
class BackgroundService {
  constructor() {
    this.STORAGE_KEY = 'FavouriteEdge_data';
    this.init();
  }

  // 初始化后台服务
  init() {
    this.setupBookmarkListeners();
    this.setupStorageListeners();
    this.setupTabListeners();
    this.setupNotificationListeners();
    this.setupActionListeners(); // 添加action监听器
    console.log('FavouriteEdge 后台脚本已启动');
  }

  // 设置action监听器
  setupActionListeners() {
    try {
      // 扩展图标点击监听
      if (chrome.action && chrome.action.onClicked && typeof chrome.action.onClicked.addListener === 'function') {
        chrome.action.onClicked.addListener((tab) => {
          this.handleActionClicked(tab);
        });
        console.debug('Action监听器设置成功');
      } else {
        console.debug('Chrome Action API不可用，跳过监听器设置');
      }
    } catch (error) {
      console.debug('设置Action监听器失败:', error.message);
    }
  }

  // 处理扩展图标点击
  async handleActionClicked(tab) {
    try {
      // 打开新标签页
      await TabAPI.create({ url: 'chrome://newtab/' });
    } catch (error) {
      console.debug('处理扩展图标点击失败:', error.message);
    }
  }

  // 设置书签监听器
  setupBookmarkListeners() {
    try {
      // 书签创建监听
      if (chrome.bookmarks && chrome.bookmarks.onCreated) {
        chrome.bookmarks.onCreated.addListener((id, bookmark) => {
          this.handleBookmarkCreated(bookmark);
        });
      }

      // 书签删除监听
      if (chrome.bookmarks && chrome.bookmarks.onRemoved) {
        chrome.bookmarks.onRemoved.addListener((id, removeInfo) => {
          this.handleBookmarkRemoved(id, removeInfo);
        });
      }

      // 书签更新监听
      if (chrome.bookmarks && chrome.bookmarks.onChanged) {
        chrome.bookmarks.onChanged.addListener((id, changeInfo) => {
          this.handleBookmarkChanged(id, changeInfo);
        });
      }

      // 书签移动监听
      if (chrome.bookmarks && chrome.bookmarks.onMoved) {
        chrome.bookmarks.onMoved.addListener((id, moveInfo) => {
          this.handleBookmarkMoved(id, moveInfo);
        });
      }
      
      console.debug('书签监听器设置完成');
    } catch (error) {
      console.debug('设置书签监听器失败:', error.message);
    }
  }

  // 设置存储监听器
  setupStorageListeners() {
    try {
      if (chrome.storage && chrome.storage.onChanged) {
        chrome.storage.onChanged.addListener((changes, namespace) => {
          if (namespace === 'local' && changes[this.STORAGE_KEY]) {
            this.handleStorageChanged(changes[this.STORAGE_KEY]);
          }
        });
        console.debug('存储监听器设置完成');
      }
    } catch (error) {
      console.debug('设置存储监听器失败:', error.message);
    }
  }

  // 设置标签页监听器
  setupTabListeners() {
    try {
      // 新标签页创建监听
      if (chrome.tabs && chrome.tabs.onCreated) {
        chrome.tabs.onCreated.addListener((tab) => {
          if (tab.url === 'chrome://newtab/' || tab.pendingUrl === 'chrome://newtab/') {
            this.handleNewTabCreated(tab);
          }
        });
        console.debug('标签页监听器设置完成');
      }
    } catch (error) {
      console.debug('设置标签页监听器失败:', error.message);
    }
  }

  // 设置通知监听器
  setupNotificationListeners() {
    try {
      // 通知点击监听
      if (chrome.notifications && chrome.notifications.onClicked) {
        chrome.notifications.onClicked.addListener((notificationId) => {
          this.handleNotificationClicked(notificationId);
        });
      }

      // 通知按钮点击监听
      if (chrome.notifications && chrome.notifications.onButtonClicked) {
        chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
          this.handleNotificationButtonClicked(notificationId, buttonIndex);
        });
      }
      
      console.debug('通知监听器设置完成');
    } catch (error) {
      console.debug('设置通知监听器失败:', error.message);
    }
  }

  // 处理书签创建
  async handleBookmarkCreated(bookmark) {
    try {
      // 记录事件
      await this.recordEvent('bookmark_created', {
        bookmarkId: bookmark.id,
        title: bookmark.title,
        url: bookmark.url
      });

      // 发送通知
      if (bookmark.url) { // 只对实际书签发送通知，不对文件夹
        await NotificationAPI.create('bookmark_created', {
          title: '新书签已添加',
          message: `"${bookmark.title}" 已添加到书签`,
          iconUrl: 'images/icon-48.png'
        });
      }
    } catch (error) {
      console.debug('处理书签创建失败:', error.message);
    }
  }

  // 处理书签删除
  async handleBookmarkRemoved(id, removeInfo) {
    try {
      await this.recordEvent('bookmark_removed', {
        bookmarkId: id,
        parentId: removeInfo.parentId,
        index: removeInfo.index
      });
    } catch (error) {
      console.debug('处理书签删除失败:', error.message);
    }
  }

  // 处理书签更新
  async handleBookmarkChanged(id, changeInfo) {
    try {
      await this.recordEvent('bookmark_changed', {
        bookmarkId: id,
        changes: changeInfo
      });
    } catch (error) {
      console.debug('处理书签更新失败:', error.message);
    }
  }

  // 处理书签移动
  async handleBookmarkMoved(id, moveInfo) {
    try {
      await this.recordEvent('bookmark_moved', {
        bookmarkId: id,
        oldParentId: moveInfo.oldParentId,
        oldIndex: moveInfo.oldIndex,
        parentId: moveInfo.parentId,
        index: moveInfo.index
      });
    } catch (error) {
      console.debug('处理书签移动失败:', error.message);
    }
  }

  // 处理存储变化
  handleStorageChanged(change) {
    console.log('存储数据已更新:', change);
  }

  // 处理新标签页创建
  async handleNewTabCreated(tab) {
    try {
      // 记录新标签页打开事件
      await this.recordEvent('newtab_opened', {
        tabId: tab.id,
        timestamp: Date.now()
      });
    } catch (error) {
      console.debug('处理新标签页创建失败:', error.message);
    }
  }

  // 处理通知点击
  async handleNotificationClicked(notificationId) {
    try {
      // 清除通知
      await NotificationAPI.clear(notificationId);

      // 根据通知类型执行相应操作
      if (notificationId === 'bookmark_created') {
        // 打开新标签页
        await TabAPI.create({ url: 'chrome://newtab/' });
      }
    } catch (error) {
      console.debug('处理通知点击失败:', error.message);
    }
  }

  // 处理通知按钮点击
  async handleNotificationButtonClicked(notificationId, buttonIndex) {
    try {
      await NotificationAPI.clear(notificationId);
      
      // 根据按钮索引执行操作
      // 这里可以根据需要扩展
    } catch (error) {
      console.debug('处理通知按钮点击失败:', error.message);
    }
  }

  // 记录事件到存储
  async recordEvent(eventType, data) {
    try {
      const storage = await StorageAPI.get([this.STORAGE_KEY]);
      const appData = storage[this.STORAGE_KEY] || {};

      if (!appData.backgroundEvents) {
        appData.backgroundEvents = [];
      }

      const event = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2),
        type: eventType,
        timestamp: Date.now(),
        data
      };

      appData.backgroundEvents.push(event);

      // 保留最近500条事件
      if (appData.backgroundEvents.length > 500) {
        appData.backgroundEvents = appData.backgroundEvents.slice(-500);
      }

      await StorageAPI.set({ [this.STORAGE_KEY]: appData });
    } catch (error) {
      console.debug('记录事件失败:', error.message);
    }
  }

  // 获取应用统计信息
  async getAppStats() {
    try {
      const storage = await StorageAPI.get([this.STORAGE_KEY]);
      const appData = storage[this.STORAGE_KEY] || {};
      const events = appData.backgroundEvents || [];

      // 计算统计信息
      const stats = {
        totalEvents: events.length,
        bookmarkCreated: events.filter(e => e.type === 'bookmark_created').length,
        bookmarkRemoved: events.filter(e => e.type === 'bookmark_removed').length,
        newtabOpened: events.filter(e => e.type === 'newtab_opened').length,
        lastActivity: events.length > 0 ? events[events.length - 1].timestamp : null
      };

      return stats;
    } catch (error) {
      console.debug('获取统计信息失败:', error.message);
      return {};
    }
  }
}

// 消息监听器
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const handleMessage = async () => {
    try {
      switch (request.action) {
        case 'getStats':
          const stats = await backgroundService.getAppStats();
          sendResponse({ success: true, data: stats });
          break;

        case 'clearEvents':
          await StorageAPI.set({ 
            [backgroundService.STORAGE_KEY]: { backgroundEvents: [] } 
          });
          sendResponse({ success: true });
          break;

        case 'notify':
          await NotificationAPI.create(
            request.data.id || 'app_notification',
            request.data.options
          );
          sendResponse({ success: true });
          break;

        default:
          sendResponse({ success: false, error: '未知操作' });
      }
    } catch (error) {
      console.debug('处理消息失败:', error.message);
      sendResponse({ success: false, error: error.message });
    }
  };

  handleMessage();
  return true; // 异步响应
});

// 扩展安装/更新处理
chrome.runtime.onInstalled.addListener((details) => {
  console.log('FavouriteEdge 扩展已安装/更新:', details);

  if (details.reason === 'install') {
    // 首次安装
    try {
      TabAPI.create({ url: 'chrome://newtab/' });
    } catch (error) {
      console.debug('创建新标签页失败:', error.message);
    }
  } else if (details.reason === 'update') {
    // 扩展更新
    console.log('扩展已从版本', details.previousVersion, '更新到当前版本');
  }
});

// 创建后台服务实例
const backgroundService = new BackgroundService(); 