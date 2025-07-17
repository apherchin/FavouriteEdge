/**
 * 图标管理服务
 * 提供高效的书签图标获取、缓存和管理功能
 */

import { StorageAPI } from '../utils/chromeApi.js';

class IconService {
  constructor() {
    this.STORAGE_KEY = 'FavouriteEdge_IconCache';
    this.cache = new Map();
    this.loadingPromises = new Map();
    this.batchQueue = [];
    this.batchTimeout = null;
    this.BATCH_DELAY = 100; // 100ms批量延迟
    this.CACHE_EXPIRY = 14 * 24 * 60 * 60 * 1000; // 14天缓存过期
    this.CACHE_EXTEND = 7 * 24 * 60 * 60 * 1000; // 失败时延长7天缓存
    this.MAX_CACHE_SIZE = 2000; // 最大缓存数量
    
    // 初始化缓存
    this.initializeCache();
  }

  /**
   * 获取默认图标
   */
  getDefaultIcon() {
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iNCIgZmlsbD0iIzY2NzNlYSIvPgo8cGF0aCBkPSJNMTYgOEMxMiA4IDEwIDEwIDEwIDE0VjE4QzEwIDIyIDE0IDI0IDE2IDI0QzE4IDI0IDIyIDIyIDIyIDE4VjE0QzIyIDEwIDIwIDggMTYgOFoiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo=';
  }

  /**
   * 提取顶级域名
   * 例如: "sub.example.com" -> "example.com"
   * "https://www.bilibili.com/video/123" -> "bilibili.com"
   */
  extractTopLevelDomain(hostname) {
    if (!hostname) return hostname;
    
    // 简单的顶级域名提取逻辑
    const parts = hostname.split('.');
    
    // 如果只有一个部分，直接返回
    if (parts.length <= 1) return hostname;
    
    // 处理常见的顶级域名模式
    if (parts.length >= 2) {
      // 获取最后两个部分作为顶级域名
      const topLevel = parts.slice(-2).join('.');
      
      // 处理特殊情况，如 .co.uk, .com.cn 等
      const specialTlds = ['co.uk', 'com.cn', 'net.cn', 'org.cn', 'com.au', 'co.jp'];
      const lastThree = parts.slice(-3).join('.');
      
      for (const tld of specialTlds) {
        if (lastThree.endsWith(tld)) {
          return parts.slice(-3).join('.');
        }
      }
      
      return topLevel;
    }
    
    return hostname;
  }

  /**
   * 获取网站图标URL策略列表 - 按优先级排序
   */
  getIconURLStrategies(url) {
    if (!url) return [];
    
    try {
      const urlObj = new URL(url);
      const fullDomain = urlObj.hostname;
      const topLevelDomain = this.extractTopLevelDomain(fullDomain);
      
      // 构建不同的基础URL尝试
      const httpsBase = `https://${fullDomain}`;
      const httpBase = `http://${fullDomain}`;
      const topLevelHttpsBase = `https://${topLevelDomain}`;
      
      console.debug(`原始域名: ${fullDomain}, 顶级域名: ${topLevelDomain}`);
      
      return [
        // 策略1: 优先尝试站内favicon.ico (HTTPS)
        `${httpsBase}/favicon.ico`,
        // 策略2: 尝试顶级域名的favicon.ico (HTTPS)
        `${topLevelHttpsBase}/favicon.ico`,
        // 策略3: 使用 DuckDuckGo API (顶级域名)
        `https://icons.duckduckgo.com/ip3/${topLevelDomain}.ico`,
        // 策略4: 尝试站内favicon.ico (HTTP，作为备选)
        `${httpBase}/favicon.ico`,
        // 策略5: 使用 DuckDuckGo API (完整域名)
        `https://icons.duckduckgo.com/ip3/${fullDomain}.ico`
      ];
    } catch (error) {
      console.debug('构建图标URL失败:', error.message);
      return [];
    }
  }

  /**
   * 检查给定的图标URL是否为默认图标
   */
  isDefaultIcon(iconUrl) {
    return iconUrl && iconUrl.startsWith('data:image/svg+xml;base64,');
  }

  /**
   * 获取书签图标 - 主要入口方法
   */
  async getBookmarkIcon(url) {
    if (!url) return this.getDefaultIcon();

    // 检查内存缓存
    const cached = this.cache.get(url);
    if (cached && !this.isCacheExpired(cached)) {
      // 如果缓存的是默认图标，并且缓存时间不超过1小时，尝试重新获取
      if (this.isDefaultIcon(cached.icon)) {
        const cacheAge = Date.now() - cached.timestamp;
        const oneHour = 60 * 60 * 1000;
        
        if (cacheAge < oneHour) {
          console.debug(`缓存中的默认图标较新，跳过重试: ${url}`);
          cached.accessed = Date.now();
          return cached.icon;
        } else {
          console.debug(`缓存中的默认图标较旧，尝试重新获取: ${url}`);
          // 继续下面的加载流程
        }
      } else {
        // 不是默认图标，直接使用缓存
        cached.accessed = Date.now();
        return cached.icon;
      }
    }

    // 检查是否已在加载中
    if (this.loadingPromises.has(url)) {
      return await this.loadingPromises.get(url);
    }

    // 创建加载Promise
    const loadingPromise = this.loadIcon(url);
    this.loadingPromises.set(url, loadingPromise);

    try {
      const icon = await loadingPromise;
      return icon;
    } finally {
      this.loadingPromises.delete(url);
    }
  }

  /**
   * 加载单个图标 - 使用多种策略，失败时延长缓存
   */
  async loadIcon(url) {
    const strategies = this.getIconURLStrategies(url);
    
    if (strategies.length === 0) {
      const defaultIcon = this.getDefaultIcon();
      this.setCacheEntry(url, defaultIcon);
      return defaultIcon;
    }

    // 检查是否有过期但仍可用的缓存
    const cachedEntry = this.cache.get(url);
    const hasExpiredCache = cachedEntry && this.isCacheExpired(cachedEntry);
    
    // 按优先级尝试每种策略
    for (let i = 0; i < strategies.length; i++) {
      const iconURL = strategies[i];
      
      try {
        console.debug(`尝试策略 ${i + 1}/${strategies.length}: ${iconURL}`);
        
        // 测试图标是否可用
        const isValid = await this.testIcon(iconURL);
        
        if (isValid) {
          console.debug(`策略 ${i + 1} 成功: ${iconURL}`);
          // 缓存结果
          this.setCacheEntry(url, iconURL);
          return iconURL;
        } else {
          console.debug(`策略 ${i + 1} 失败: ${iconURL}`);
        }
      } catch (error) {
        console.debug(`策略 ${i + 1} 异常:`, iconURL, error.message);
        continue;
      }
    }
    
    // 所有策略都失败
    if (hasExpiredCache && cachedEntry.icon) {
      // 如果有过期的缓存图标，延长其有效期并返回
      console.debug('所有策略失败，延长现有缓存有效期:', url);
      this.extendCacheEntry(url, cachedEntry.icon);
      return cachedEntry.icon;
    } else {
      // 没有可用缓存，使用默认图标
      console.debug('所有图标获取策略都失败，使用默认图标:', url);
      const defaultIcon = this.getDefaultIcon();
      this.setCacheEntry(url, defaultIcon);
      return defaultIcon;
    }
  }

  /**
   * 批量获取图标 - 优化性能
   */
  async getBatchIcons(urls) {
    const results = new Map();
    const toLoad = [];

    // 先从缓存获取
    for (const url of urls) {
      if (!url) {
        results.set(url, this.getDefaultIcon());
        continue;
      }

      const cached = this.cache.get(url);
      if (cached && !this.isCacheExpired(cached)) {
        results.set(url, cached.icon);
      } else {
        toLoad.push(url);
      }
    }

    // 批量加载未缓存的图标
    if (toLoad.length > 0) {
      const loadPromises = toLoad.map(url => 
        this.getBookmarkIcon(url).then(icon => ({ url, icon }))
      );
      
      const loadResults = await Promise.allSettled(loadPromises);
      
      loadResults.forEach(result => {
        if (result.status === 'fulfilled') {
          results.set(result.value.url, result.value.icon);
        } else {
          // 如果加载失败，使用默认图标
          const url = toLoad[loadResults.indexOf(result)];
          results.set(url, this.getDefaultIcon());
        }
      });
    }

    return results;
  }

  /**
   * 预加载图标 - 不阻塞主流程
   */
  preloadIcons(urls) {
    // 异步预加载，不影响主流程
    setTimeout(() => {
      this.getBatchIcons(urls).catch(error => {
        console.debug('预加载图标失败:', error.message);
      });
    }, 0);
  }

  /**
   * 测试图标是否有效
   */
  async testIcon(iconURL) {
    return new Promise((resolve) => {
      if (!iconURL || iconURL.startsWith('data:')) {
        resolve(true);
        return;
      }

      const img = new Image();
      const timeout = setTimeout(() => {
        console.debug(`图标加载超时: ${iconURL}`);
        resolve(false);
      }, 3000); // 增加到3秒，因为站内favicon可能需要更多时间

      img.onload = () => {
        clearTimeout(timeout);
        // 检查图像是否真的加载成功且有内容
        if (img.naturalWidth > 0 && img.naturalHeight > 0) {
          console.debug(`图标加载成功: ${iconURL} (${img.naturalWidth}x${img.naturalHeight})`);
          resolve(true);
        } else {
          console.debug(`图标尺寸无效: ${iconURL}`);
          resolve(false);
        }
      };

      img.onerror = (e) => {
        clearTimeout(timeout);
        console.debug(`图标加载失败: ${iconURL}`, e.type);
        resolve(false);
      };

      try {
        // 对于DuckDuckGo API，不需要设置crossOrigin
        if (iconURL.includes('duckduckgo.com')) {
          img.src = iconURL;
        } else {
          // 对于站内favicon，尝试不同的跨域策略
          try {
            // 首先尝试不设置crossOrigin
            img.src = iconURL;
          } catch (error) {
            // 如果失败，尝试设置crossOrigin
            try {
              img.crossOrigin = 'anonymous';
              img.src = iconURL;
            } catch (secondError) {
              console.debug(`图标加载异常: ${iconURL}`, secondError.message);
              resolve(false);
            }
          }
        }
      } catch (error) {
        clearTimeout(timeout);
        console.debug(`图标加载异常: ${iconURL}`, error.message);
        resolve(false);
      }
    });
  }

  /**
   * 设置缓存条目
   */
  setCacheEntry(url, icon) {
    const entry = {
      icon,
      timestamp: Date.now(),
      accessed: Date.now()
    };

    this.cache.set(url, entry);
    
    // 限制缓存大小
    if (this.cache.size > this.MAX_CACHE_SIZE) {
      this.cleanupCache();
    }

    // 异步保存到存储
    this.saveToStorage();
  }

  /**
   * 延长缓存条目的有效期
   */
  extendCacheEntry(url, icon) {
    const entry = {
      icon,
      timestamp: Date.now(), // 重置时间戳，延长有效期
      accessed: Date.now()
    };

    this.cache.set(url, entry);
    
    // 异步保存到存储
    this.saveToStorage();
    
    console.debug(`延长缓存有效期: ${url}`);
  }

  /**
   * 检查缓存是否过期
   */
  isCacheExpired(entry) {
    return Date.now() - entry.timestamp > this.CACHE_EXPIRY;
  }

  /**
   * 清理缓存
   */
  cleanupCache() {
    const entries = Array.from(this.cache.entries());
    
    // 按访问时间排序，删除最旧的
    entries.sort((a, b) => a[1].accessed - b[1].accessed);
    
    const toDelete = entries.slice(0, Math.floor(this.MAX_CACHE_SIZE * 0.2)); // 删除20%
    
    for (const [url] of toDelete) {
      this.cache.delete(url);
    }
  }

  /**
   * 初始化缓存
   */
  async initializeCache() {
    try {
      const data = await StorageAPI.get([this.STORAGE_KEY]);
      const cacheData = data[this.STORAGE_KEY] || {};
      
      // 加载缓存数据到内存
      for (const [url, entry] of Object.entries(cacheData)) {
        if (!this.isCacheExpired(entry)) {
          this.cache.set(url, entry);
        }
      }
      
      console.debug(`图标缓存初始化完成，加载了 ${this.cache.size} 个缓存条目`);
    } catch (error) {
      console.debug('初始化图标缓存失败:', error.message);
    }
  }

  /**
   * 保存缓存到存储（防抖）
   */
  saveToStorage() {
    clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(async () => {
      try {
        const cacheObject = {};
        for (const [url, entry] of this.cache.entries()) {
          cacheObject[url] = entry;
        }
        
        await StorageAPI.set({ [this.STORAGE_KEY]: cacheObject });
        console.debug('图标缓存已保存');
      } catch (error) {
        console.debug('保存图标缓存失败:', error.message);
      }
    }, 1000); // 1秒防抖
  }

  /**
   * 刷新指定URL的图标（强制重新获取）
   */
  async refreshIcon(url) {
    if (!url) return this.getDefaultIcon();
    
    console.debug(`强制刷新图标: ${url}`);
    
    // 清除现有缓存
    this.cache.delete(url);
    
    // 如果正在加载中，等待完成
    if (this.loadingPromises.has(url)) {
      this.loadingPromises.delete(url);
    }
    
    // 重新获取图标
    return await this.getBookmarkIcon(url);
  }

  /**
   * 批量刷新图标
   */
  async refreshBatchIcons(urls) {
    if (!urls || urls.length === 0) return;
    
    console.debug(`批量刷新图标: ${urls.length} 个`);
    
    const refreshPromises = urls.map(url => 
      this.refreshIcon(url).catch(error => {
        console.debug(`刷新图标失败: ${url}`, error.message);
        return this.getDefaultIcon();
      })
    );
    
    return await Promise.allSettled(refreshPromises);
  }

  /**
   * 清空所有缓存
   */
  async clearCache() {
    this.cache.clear();
    this.loadingPromises.clear();
    
    try {
      await StorageAPI.remove([this.STORAGE_KEY]);
      console.debug('图标缓存已清空');
    } catch (error) {
      console.debug('清空图标缓存失败:', error.message);
    }
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats() {
    const now = Date.now();
    let valid = 0;
    let expired = 0;
    
    for (const entry of this.cache.values()) {
      if (this.isCacheExpired(entry)) {
        expired++;
      } else {
        valid++;
      }
    }
    
    return {
      total: this.cache.size,
      valid,
      expired,
      loading: this.loadingPromises.size
    };
  }
}

// 创建单例实例
const iconService = new IconService();
export default iconService; 