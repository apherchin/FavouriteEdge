/**
 * 统计服务
 * 处理书签点击统计、访问频率计算和智能排序
 */

import { StorageAPI, Utils } from '../utils/chromeApi.js';

class StatisticsService {
  constructor() {
    this.STORAGE_KEY = 'FavouriteEdge_data';
    this.STATISTICS_KEY = 'statistics';
    this.EVENTS_KEY = 'statisticsEvents';
    this.MAX_EVENTS = 1000; // 最大事件数量
  }

  /**
   * 记录书签点击事件
   */
  async recordBookmarkClick(bookmarkId, bookmarkData = {}) {
    try {
      const timestamp = Date.now();
      const event = {
        id: Utils.generateId(),
        type: 'click',
        bookmarkId,
        timestamp,
        url: bookmarkData.url,
        title: bookmarkData.title,
        isPrivate: bookmarkData.isPrivate || false
      };

      await this.addEvent(event);
      await this.updateBookmarkStatistics(bookmarkId, 'click');

      return event;
    } catch (error) {
      console.error('记录点击事件失败:', error);
      throw error;
    }
  }

  /**
   * 记录书签创建事件
   */
  async recordBookmarkCreated(bookmarkId, bookmarkData = {}) {
    try {
      const event = {
        id: Utils.generateId(),
        type: 'created',
        bookmarkId,
        timestamp: Date.now(),
        url: bookmarkData.url,
        title: bookmarkData.title,
        isPrivate: bookmarkData.isPrivate || false
      };

      await this.addEvent(event);
      await this.updateBookmarkStatistics(bookmarkId, 'created');

      return event;
    } catch (error) {
      console.error('记录创建事件失败:', error);
      throw error;
    }
  }

  /**
   * 记录书签删除事件
   */
  async recordBookmarkDeleted(bookmarkId, bookmarkData = {}) {
    try {
      const event = {
        id: Utils.generateId(),
        type: 'deleted',
        bookmarkId,
        timestamp: Date.now(),
        url: bookmarkData.url,
        title: bookmarkData.title,
        isPrivate: bookmarkData.isPrivate || false
      };

      await this.addEvent(event);

      return event;
    } catch (error) {
      console.error('记录删除事件失败:', error);
      throw error;
    }
  }

  /**
   * 添加统计事件
   */
  async addEvent(event) {
    try {
      const data = await StorageAPI.get([this.STORAGE_KEY]);
      const appData = data[this.STORAGE_KEY] || {};

      if (!appData[this.EVENTS_KEY]) {
        appData[this.EVENTS_KEY] = [];
      }

      appData[this.EVENTS_KEY].push(event);

      // 保持事件数量在限制范围内
      if (appData[this.EVENTS_KEY].length > this.MAX_EVENTS) {
        appData[this.EVENTS_KEY] = appData[this.EVENTS_KEY].slice(-this.MAX_EVENTS);
      }

      await StorageAPI.set({ [this.STORAGE_KEY]: appData });
    } catch (error) {
      console.error('添加事件失败:', error);
      throw error;
    }
  }

  /**
   * 更新书签统计信息
   */
  async updateBookmarkStatistics(bookmarkId, eventType) {
    try {
      const data = await StorageAPI.get([this.STORAGE_KEY]);
      const appData = data[this.STORAGE_KEY] || {};

      if (!appData[this.STATISTICS_KEY]) {
        appData[this.STATISTICS_KEY] = {};
      }

      if (!appData[this.STATISTICS_KEY][bookmarkId]) {
        appData[this.STATISTICS_KEY][bookmarkId] = {
          clicks: 0,
          lastClicked: null,
          created: null,
          totalTime: 0,
          clickHistory: []
        };
      }

      const stats = appData[this.STATISTICS_KEY][bookmarkId];
      const now = Date.now();

      switch (eventType) {
        case 'click':
          stats.clicks += 1;
          stats.lastClicked = now;
          stats.clickHistory.push(now);
          
          // 保持点击历史在合理范围内
          if (stats.clickHistory.length > 50) {
            stats.clickHistory = stats.clickHistory.slice(-50);
          }
          break;

        case 'created':
          stats.created = now;
          break;
      }

      await StorageAPI.set({ [this.STORAGE_KEY]: appData });
    } catch (error) {
      console.error('更新统计信息失败:', error);
      throw error;
    }
  }

  /**
   * 获取书签统计信息
   */
  async getBookmarkStatistics(bookmarkId) {
    try {
      const data = await StorageAPI.get([this.STORAGE_KEY]);
      const appData = data[this.STORAGE_KEY] || {};
      const statistics = appData[this.STATISTICS_KEY] || {};

      return statistics[bookmarkId] || {
        clicks: 0,
        lastClicked: null,
        created: null,
        totalTime: 0,
        clickHistory: []
      };
    } catch (error) {
      console.error('获取统计信息失败:', error);
      return null;
    }
  }

  /**
   * 获取所有统计数据
   */
  async getAllStatistics() {
    try {
      const data = await StorageAPI.get([this.STORAGE_KEY]);
      const appData = data[this.STORAGE_KEY] || {};

      return {
        statistics: appData[this.STATISTICS_KEY] || {},
        events: appData[this.EVENTS_KEY] || []
      };
    } catch (error) {
      console.error('获取全部统计数据失败:', error);
      return { statistics: {}, events: [] };
    }
  }

  /**
   * 计算书签访问频率分数
   */
  calculateFrequencyScore(stats, timeWindow = 30 * 24 * 60 * 60 * 1000) { // 默认30天
    if (!stats || !stats.clickHistory || stats.clickHistory.length === 0) {
      return 0;
    }

    const now = Date.now();
    const cutoffTime = now - timeWindow;
    
    // 获取时间窗口内的点击
    const recentClicks = stats.clickHistory.filter(time => time > cutoffTime);
    
    if (recentClicks.length === 0) {
      return 0;
    }

    // 基础频率分数
    let score = recentClicks.length;

    // 时间衰减因子（越近期的点击权重越高）
    const timeDecayFactor = recentClicks.reduce((acc, clickTime) => {
      const age = now - clickTime;
      const decay = Math.exp(-age / (timeWindow * 0.5)); // 半衰期为窗口期的一半
      return acc + decay;
    }, 0);

    score = score * timeDecayFactor / recentClicks.length;

    // 规律性加成（定期访问的书签获得更高分数）
    const regularity = this.calculateRegularityBonus(recentClicks, timeWindow);
    score = score * (1 + regularity);

    return Math.round(score * 100) / 100;
  }

  /**
   * 计算访问规律性加成
   */
  calculateRegularityBonus(clickTimes, timeWindow) {
    if (clickTimes.length < 3) {
      return 0;
    }

    // 计算访问间隔的标准差
    const intervals = [];
    for (let i = 1; i < clickTimes.length; i++) {
      intervals.push(clickTimes[i] - clickTimes[i - 1]);
    }

    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((acc, interval) => {
      return acc + Math.pow(interval - avgInterval, 2);
    }, 0) / intervals.length;

    const stdDev = Math.sqrt(variance);
    const coefficient = stdDev / avgInterval; // 变异系数

    // 变异系数越小，规律性越强，加成越大
    return Math.max(0, (1 - coefficient) * 0.5);
  }

  /**
   * 对书签进行智能排序
   */
  async sortBookmarksIntelligently(bookmarks, sortType = 'frequency') {
    try {
      const allStats = await this.getAllStatistics();
      const statistics = allStats.statistics;

      const bookmarksWithScores = bookmarks.map(bookmark => {
        const stats = statistics[bookmark.id];
        let score = 0;

        switch (sortType) {
          case 'frequency':
            score = this.calculateFrequencyScore(stats);
            break;

          case 'recent':
            score = stats?.lastClicked || 0;
            break;

          case 'clicks':
            score = stats?.clicks || 0;
            break;

          case 'alphabetical':
            score = bookmark.title.toLowerCase().charCodeAt(0);
            break;

          case 'creation':
            score = stats?.created || bookmark.dateAdded || 0;
            break;

          default:
            score = this.calculateFrequencyScore(stats);
        }

        return {
          ...bookmark,
          score,
          stats
        };
      });

      // 排序（频率和点击数为降序，字母和创建时间根据情况）
      bookmarksWithScores.sort((a, b) => {
        if (sortType === 'alphabetical') {
          return a.title.toLowerCase().localeCompare(b.title.toLowerCase());
        } else if (sortType === 'creation') {
          return a.score - b.score; // 创建时间升序
        } else {
          return b.score - a.score; // 其他情况降序
        }
      });

      return bookmarksWithScores;
    } catch (error) {
      console.error('智能排序失败:', error);
      return bookmarks;
    }
  }

  /**
   * 获取热门书签
   */
  async getPopularBookmarks(limit = 10, timeWindow = 7 * 24 * 60 * 60 * 1000) {
    try {
      const allStats = await this.getAllStatistics();
      const statistics = allStats.statistics;

      const popularBookmarks = Object.entries(statistics)
        .map(([bookmarkId, stats]) => ({
          bookmarkId,
          score: this.calculateFrequencyScore(stats, timeWindow),
          clicks: stats.clicks,
          lastClicked: stats.lastClicked
        }))
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      return popularBookmarks;
    } catch (error) {
      console.error('获取热门书签失败:', error);
      return [];
    }
  }

  /**
   * 获取使用报告
   */
  async getUsageReport(timeWindow = 30 * 24 * 60 * 60 * 1000) {
    try {
      const allStats = await this.getAllStatistics();
      const { statistics, events } = allStats;

      const now = Date.now();
      const cutoffTime = now - timeWindow;

      // 过滤时间窗口内的事件
      const recentEvents = events.filter(event => event.timestamp > cutoffTime);

      // 分析统计数据
      const totalBookmarks = Object.keys(statistics).length;
      const activeBookmarks = Object.values(statistics).filter(stats => 
        stats.lastClicked && stats.lastClicked > cutoffTime
      ).length;

      const totalClicks = recentEvents.filter(event => event.type === 'click').length;
      const averageClicksPerDay = totalClicks / (timeWindow / (24 * 60 * 60 * 1000));

      // 最活跃的时段分析
      const hourlyActivity = new Array(24).fill(0);
      recentEvents.forEach(event => {
        const hour = new Date(event.timestamp).getHours();
        hourlyActivity[hour]++;
      });

      const mostActiveHour = hourlyActivity.indexOf(Math.max(...hourlyActivity));

      return {
        totalBookmarks,
        activeBookmarks,
        totalClicks,
        averageClicksPerDay: Math.round(averageClicksPerDay * 100) / 100,
        mostActiveHour,
        hourlyActivity,
        timeWindow: timeWindow / (24 * 60 * 60 * 1000) // 转换为天数
      };
    } catch (error) {
      console.error('生成使用报告失败:', error);
      return null;
    }
  }

  /**
   * 清理过期数据
   */
  async cleanupOldData(retentionDays = 90) {
    try {
      const retentionTime = retentionDays * 24 * 60 * 60 * 1000;
      const cutoffTime = Date.now() - retentionTime;

      const data = await StorageAPI.get([this.STORAGE_KEY]);
      const appData = data[this.STORAGE_KEY] || {};

      // 清理过期事件
      if (appData[this.EVENTS_KEY]) {
        appData[this.EVENTS_KEY] = appData[this.EVENTS_KEY].filter(
          event => event.timestamp > cutoffTime
        );
      }

      // 清理过期的点击历史
      if (appData[this.STATISTICS_KEY]) {
        Object.values(appData[this.STATISTICS_KEY]).forEach(stats => {
          if (stats.clickHistory) {
            stats.clickHistory = stats.clickHistory.filter(
              time => time > cutoffTime
            );
          }
        });
      }

      await StorageAPI.set({ [this.STORAGE_KEY]: appData });
      return true;
    } catch (error) {
      console.error('清理过期数据失败:', error);
      return false;
    }
  }
}

// 创建单例实例
const statisticsService = new StatisticsService();

export default statisticsService; 