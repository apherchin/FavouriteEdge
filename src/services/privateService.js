/**
 * 私密存储服务
 * 处理 PIN 验证、数据加密和私密书签管理
 */

import { StorageAPI, Utils } from '../utils/chromeApi.js';

class PrivateService {
  constructor() {
    this.STORAGE_KEY = 'FavouriteEdge_data';
    this.PRIVATE_KEY = 'privateData';
    this.PIN_KEY = 'pinHash';
    this.SALT_KEY = 'pinSalt';
    this.SESSION_KEY = 'privateSession';
    this.SESSION_TIMEOUT = 30 * 60 * 1000; // 30分钟会话超时
    
    // 当前会话状态
    this.currentSession = null;
  }

  /**
   * 生成随机盐值
   */
  generateSalt() {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * 使用 SHA-256 和盐值哈希 PIN
   */
  async hashPIN(pin, salt) {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin + salt);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * 设置或更改 PIN
   */
  async setPIN(newPIN) {
    try {
      if (!newPIN || newPIN.length < 4) {
        throw new Error('PIN 长度至少为 4 位');
      }

      const salt = this.generateSalt();
      const pinHash = await this.hashPIN(newPIN, salt);

      const data = await StorageAPI.get([this.STORAGE_KEY]);
      const appData = data[this.STORAGE_KEY] || {};

      appData[this.PIN_KEY] = pinHash;
      appData[this.SALT_KEY] = salt;

      await StorageAPI.set({ [this.STORAGE_KEY]: appData });
      
      return true;
    } catch (error) {
      console.error('设置 PIN 失败:', error);
      throw error;
    }
  }

  /**
   * 验证 PIN
   */
  async verifyPIN(pin) {
    try {
      const data = await StorageAPI.get([this.STORAGE_KEY]);
      const appData = data[this.STORAGE_KEY] || {};

      const storedHash = appData[this.PIN_KEY];
      const salt = appData[this.SALT_KEY];

      if (!storedHash || !salt) {
        // 第一次使用，需要设置PIN码
        return false;
      }

      const inputHash = await this.hashPIN(pin, salt);
      return inputHash === storedHash;
    } catch (error) {
      console.error('验证 PIN 失败:', error);
      return false;
    }
  }

  /**
   * 设置默认PIN码 (首次使用)
   */
  async setDefaultPIN() {
    try {
      const defaultPIN = '123456';
      await this.setPIN(defaultPIN);
      return defaultPIN;
    } catch (error) {
      console.error('设置默认PIN失败:', error);
      throw error;
    }
  }

  /**
   * 修改PIN码
   */
  async changePIN(currentPIN, newPIN) {
    try {
      // 验证当前PIN
      const isCurrentValid = await this.verifyPIN(currentPIN);
      if (!isCurrentValid) {
        throw new Error('当前PIN码错误');
      }

      // 设置新PIN
      await this.setPIN(newPIN);
      return true;
    } catch (error) {
      console.error('修改PIN失败:', error);
      throw error;
    }
  }

  /**
   * 创建会话
   */
  async createSession(pin) {
    try {
      const isValid = await this.verifyPIN(pin);
      
      if (!isValid) {
        throw new Error('PIN 码错误');
      }

      const session = {
        id: Utils.generateId(),
        createdAt: Date.now(),
        expiresAt: Date.now() + this.SESSION_TIMEOUT,
        isValid: true
      };

      this.currentSession = session;

      // 保存会话到内存和存储
      const data = await StorageAPI.get([this.STORAGE_KEY]);
      const appData = data[this.STORAGE_KEY] || {};
      appData[this.SESSION_KEY] = session;
      await StorageAPI.set({ [this.STORAGE_KEY]: appData });

      return session;
    } catch (error) {
      console.error('创建会话失败:', error);
      throw error;
    }
  }

  /**
   * 验证会话
   */
  async validateSession() {
    try {
      // 先检查内存中的会话
      if (this.currentSession && this.currentSession.expiresAt > Date.now()) {
        return true;
      }

      // 检查存储中的会话
      const data = await StorageAPI.get([this.STORAGE_KEY]);
      const appData = data[this.STORAGE_KEY] || {};
      const session = appData[this.SESSION_KEY];

      if (session && session.expiresAt > Date.now()) {
        this.currentSession = session;
        return true;
      }

      // 会话过期或不存在
      this.currentSession = null;
      return false;
    } catch (error) {
      console.error('验证会话失败:', error);
      return false;
    }
  }

  /**
   * 销毁会话
   */
  async destroySession() {
    try {
      this.currentSession = null;

      const data = await StorageAPI.get([this.STORAGE_KEY]);
      const appData = data[this.STORAGE_KEY] || {};
      delete appData[this.SESSION_KEY];
      await StorageAPI.set({ [this.STORAGE_KEY]: appData });

      return true;
    } catch (error) {
      console.error('销毁会话失败:', error);
      return false;
    }
  }

  /**
   * 延长会话时间
   */
  async extendSession() {
    try {
      if (!this.currentSession) {
        return false;
      }

      this.currentSession.expiresAt = Date.now() + this.SESSION_TIMEOUT;

      const data = await StorageAPI.get([this.STORAGE_KEY]);
      const appData = data[this.STORAGE_KEY] || {};
      appData[this.SESSION_KEY] = this.currentSession;
      await StorageAPI.set({ [this.STORAGE_KEY]: appData });

      return true;
    } catch (error) {
      console.error('延长会话失败:', error);
      return false;
    }
  }

  /**
   * 简单的数据加密（仅用于演示，实际项目应使用更强的加密）
   */
  async encryptData(data, key) {
    try {
      const encoder = new TextEncoder();
      const dataBytes = encoder.encode(JSON.stringify(data));
      const keyBytes = encoder.encode(key);
      
      // 简单的 XOR 加密
      const encrypted = new Uint8Array(dataBytes.length);
      for (let i = 0; i < dataBytes.length; i++) {
        encrypted[i] = dataBytes[i] ^ keyBytes[i % keyBytes.length];
      }
      
      return Array.from(encrypted).map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
      console.error('加密数据失败:', error);
      throw error;
    }
  }

  /**
   * 解密数据
   */
  async decryptData(encryptedData, key) {
    try {
      const encrypted = new Uint8Array(
        encryptedData.match(/.{1,2}/g).map(byte => parseInt(byte, 16))
      );
      
      const encoder = new TextEncoder();
      const keyBytes = encoder.encode(key);
      
      // XOR 解密
      const decrypted = new Uint8Array(encrypted.length);
      for (let i = 0; i < encrypted.length; i++) {
        decrypted[i] = encrypted[i] ^ keyBytes[i % keyBytes.length];
      }
      
      const decoder = new TextDecoder();
      const dataString = decoder.decode(decrypted);
      return JSON.parse(dataString);
    } catch (error) {
      console.error('解密数据失败:', error);
      throw error;
    }
  }

  /**
   * 获取私密数据
   */
  async getPrivateData() {
    try {
      const isValid = await this.validateSession();
      if (!isValid) {
        throw new Error('会话无效，请重新验证 PIN');
      }

      const data = await StorageAPI.get([this.STORAGE_KEY]);
      const appData = data[this.STORAGE_KEY] || {};
      
      if (!appData[this.PRIVATE_KEY]) {
        return {
          privateBookmarks: [],
          settings: {},
          lastAccessed: Date.now()
        };
      }

      // 如果数据是加密的，尝试解密
      if (typeof appData[this.PRIVATE_KEY] === 'string') {
        const decryptionKey = this.currentSession.id;
        return await this.decryptData(appData[this.PRIVATE_KEY], decryptionKey);
      }

      return appData[this.PRIVATE_KEY];
    } catch (error) {
      console.error('获取私密数据失败:', error);
      throw error;
    }
  }

  /**
   * 保存私密数据
   */
  async savePrivateData(privateData) {
    try {
      const isValid = await this.validateSession();
      if (!isValid) {
        throw new Error('会话无效，请重新验证 PIN');
      }

      const data = await StorageAPI.get([this.STORAGE_KEY]);
      const appData = data[this.STORAGE_KEY] || {};

      const dataToSave = {
        ...privateData,
        lastModified: Date.now()
      };

      // 可选择是否加密存储
      const shouldEncrypt = true; // 可以从设置中读取
      
      if (shouldEncrypt && this.currentSession) {
        const encryptionKey = this.currentSession.id;
        appData[this.PRIVATE_KEY] = await this.encryptData(dataToSave, encryptionKey);
      } else {
        appData[this.PRIVATE_KEY] = dataToSave;
      }

      await StorageAPI.set({ [this.STORAGE_KEY]: appData });
      
      // 延长会话时间
      await this.extendSession();

      return true;
    } catch (error) {
      console.error('保存私密数据失败:', error);
      throw error;
    }
  }

  /**
   * 添加私密书签
   */
  async addPrivateBookmark(bookmarkData) {
    try {
      const privateData = await this.getPrivateData();
      
      const newBookmark = {
        id: Utils.generateId(),
        title: bookmarkData.title,
        url: bookmarkData.url,
        description: bookmarkData.description || '',
        tags: bookmarkData.tags || [],
        favicon: Utils.getFaviconURL(bookmarkData.url),
        dateAdded: Date.now(),
        lastAccessed: null,
        accessCount: 0
      };

      privateData.privateBookmarks.push(newBookmark);
      await this.savePrivateData(privateData);

      return newBookmark;
    } catch (error) {
      console.error('添加私密书签失败:', error);
      throw error;
    }
  }

  /**
   * 更新私密书签
   */
  async updatePrivateBookmark(bookmarkId, changes) {
    try {
      const privateData = await this.getPrivateData();
      const bookmarkIndex = privateData.privateBookmarks.findIndex(b => b.id === bookmarkId);
      
      if (bookmarkIndex === -1) {
        throw new Error('私密书签不存在');
      }

      privateData.privateBookmarks[bookmarkIndex] = {
        ...privateData.privateBookmarks[bookmarkIndex],
        ...changes,
        lastModified: Date.now()
      };

      await this.savePrivateData(privateData);
      
      return privateData.privateBookmarks[bookmarkIndex];
    } catch (error) {
      console.error('更新私密书签失败:', error);
      throw error;
    }
  }

  /**
   * 删除私密书签
   */
  async deletePrivateBookmark(bookmarkId) {
    try {
      const privateData = await this.getPrivateData();
      const bookmarkIndex = privateData.privateBookmarks.findIndex(b => b.id === bookmarkId);
      
      if (bookmarkIndex === -1) {
        throw new Error('私密书签不存在');
      }

      const deletedBookmark = privateData.privateBookmarks.splice(bookmarkIndex, 1)[0];
      await this.savePrivateData(privateData);

      return deletedBookmark;
    } catch (error) {
      console.error('删除私密书签失败:', error);
      throw error;
    }
  }

  /**
   * 记录私密书签访问
   */
  async recordPrivateBookmarkAccess(bookmarkId) {
    try {
      const privateData = await this.getPrivateData();
      const bookmark = privateData.privateBookmarks.find(b => b.id === bookmarkId);
      
      if (bookmark) {
        bookmark.lastAccessed = Date.now();
        bookmark.accessCount = (bookmark.accessCount || 0) + 1;
        await this.savePrivateData(privateData);
      }

      return bookmark;
    } catch (error) {
      console.error('记录私密书签访问失败:', error);
      throw error;
    }
  }

  /**
   * 获取私密书签使用统计
   */
  async getPrivateBookmarkStats() {
    try {
      const privateData = await this.getPrivateData();
      const bookmarks = privateData.privateBookmarks || [];

      const totalBookmarks = bookmarks.length;
      const totalAccesses = bookmarks.reduce((sum, b) => sum + (b.accessCount || 0), 0);
      const mostAccessed = bookmarks.sort((a, b) => (b.accessCount || 0) - (a.accessCount || 0))[0];
      const recentlyAdded = bookmarks
        .sort((a, b) => b.dateAdded - a.dateAdded)
        .slice(0, 5);

      return {
        totalBookmarks,
        totalAccesses,
        mostAccessed: mostAccessed || null,
        recentlyAdded,
        lastAccessed: privateData.lastAccessed
      };
    } catch (error) {
      console.error('获取私密书签统计失败:', error);
      return null;
    }
  }

  /**
   * 检查 PIN 是否已设置
   */
  async isPINSet() {
    try {
      const data = await StorageAPI.get([this.STORAGE_KEY]);
      const appData = data[this.STORAGE_KEY] || {};
      return !!(appData[this.PIN_KEY] && appData[this.SALT_KEY]);
    } catch (error) {
      console.error('检查 PIN 状态失败:', error);
      return false;
    }
  }

  /**
   * 导出私密数据（需要 PIN 验证）
   */
  async exportPrivateData(pin) {
    try {
      const isValid = await this.verifyPIN(pin);
      if (!isValid) {
        throw new Error('PIN 验证失败');
      }

      const privateData = await this.getPrivateData();
      return {
        exportedAt: Date.now(),
        version: '1.0',
        data: privateData
      };
    } catch (error) {
      console.error('导出私密数据失败:', error);
      throw error;
    }
  }

  /**
   * 导入私密数据（需要 PIN 验证）
   */
  async importPrivateData(exportedData, pin) {
    try {
      const isValid = await this.verifyPIN(pin);
      if (!isValid) {
        throw new Error('PIN 验证失败');
      }

      if (!exportedData.data) {
        throw new Error('无效的导入数据格式');
      }

      await this.savePrivateData(exportedData.data);
      return true;
    } catch (error) {
      console.error('导入私密数据失败:', error);
      throw error;
    }
  }
}

// 创建单例实例
const privateService = new PrivateService();

export default privateService; 