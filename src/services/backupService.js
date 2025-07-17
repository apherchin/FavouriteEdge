/**
 * 私密书签备份和恢复服务
 * 提供导出和导入私密书签的功能，确保用户数据不会因卸载扩展而丢失
 */

import { StorageAPI } from '../utils/chromeApi.js';

class BackupService {
  constructor() {
    this.STORAGE_KEY = 'FavouriteEdge_data';
  }

  /**
   * 导出私密书签数据
   */
  async exportPrivateBookmarks() {
    try {
      const data = await StorageAPI.get([this.STORAGE_KEY]);
      const appData = data[this.STORAGE_KEY] || {};

      const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        privateBookmarks: appData.privateBookmarks || [],
        recycleBin: appData.recycleBin || [],
        metadata: {
          totalPrivateBookmarks: (appData.privateBookmarks || []).length,
          totalRecycleBin: (appData.recycleBin || []).length
        }
      };

      // 创建下载文件
      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      // 创建下载链接
      const a = document.createElement('a');
      a.href = url;
      a.download = `FavouriteEdge_备份_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      return exportData;
    } catch (error) {
      console.error('导出私密书签失败:', error);
      throw new Error('导出失败: ' + error.message);
    }
  }

  /**
   * 导入私密书签数据
   */
  async importPrivateBookmarks(file) {
    try {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = async (e) => {
          try {
            const importData = JSON.parse(e.target.result);
            
            // 验证数据格式
            if (!this.validateImportData(importData)) {
              throw new Error('无效的备份文件格式');
            }

            // 获取当前数据
            const data = await StorageAPI.get([this.STORAGE_KEY]);
            const appData = data[this.STORAGE_KEY] || {};

            // 合并私密书签（避免重复）
            const existingPrivateBookmarks = appData.privateBookmarks || [];
            const newPrivateBookmarks = importData.privateBookmarks || [];
            
            const mergedPrivateBookmarks = this.mergeBookmarks(
              existingPrivateBookmarks, 
              newPrivateBookmarks
            );

            // 合并回收站
            const existingRecycleBin = appData.recycleBin || [];
            const newRecycleBin = importData.recycleBin || [];
            
            const mergedRecycleBin = this.mergeBookmarks(
              existingRecycleBin, 
              newRecycleBin
            );

            // 保存合并后的数据
            appData.privateBookmarks = mergedPrivateBookmarks;
            appData.recycleBin = mergedRecycleBin;
            appData.lastImportDate = new Date().toISOString();

            await StorageAPI.set({ [this.STORAGE_KEY]: appData });

            resolve({
              imported: {
                privateBookmarks: newPrivateBookmarks.length,
                recycleBin: newRecycleBin.length
              },
              merged: {
                totalPrivateBookmarks: mergedPrivateBookmarks.length,
                totalRecycleBin: mergedRecycleBin.length
              }
            });
          } catch (error) {
            reject(new Error('导入失败: ' + error.message));
          }
        };

        reader.onerror = () => {
          reject(new Error('文件读取失败'));
        };

        reader.readAsText(file);
      });
    } catch (error) {
      console.error('导入私密书签失败:', error);
      throw error;
    }
  }

  /**
   * 验证导入数据格式
   */
  validateImportData(data) {
    if (!data || typeof data !== 'object') {
      return false;
    }

    // 检查必要字段
    if (!data.version || !data.exportDate) {
      return false;
    }

    // 检查数据数组
    if (data.privateBookmarks && !Array.isArray(data.privateBookmarks)) {
      return false;
    }

    if (data.recycleBin && !Array.isArray(data.recycleBin)) {
      return false;
    }

    return true;
  }

  /**
   * 合并书签数组，避免重复
   */
  mergeBookmarks(existing, newBookmarks) {
    const merged = [...existing];
    
    newBookmarks.forEach(newBookmark => {
      // 检查是否已存在（基于URL和标题）
      const isDuplicate = existing.some(existing => 
        existing.url === newBookmark.url && existing.title === newBookmark.title
      );
      
      if (!isDuplicate) {
        merged.push(newBookmark);
      }
    });

    return merged;
  }

  /**
   * 创建定期备份提醒
   */
  async scheduleBackupReminder() {
    try {
      const data = await StorageAPI.get([this.STORAGE_KEY]);
      const appData = data[this.STORAGE_KEY] || {};

      const lastBackupDate = appData.lastBackupDate;
      const now = new Date();
      const daysSinceLastBackup = lastBackupDate 
        ? Math.floor((now - new Date(lastBackupDate)) / (1000 * 60 * 60 * 24))
        : 999;

      // 如果超过30天没有备份，显示提醒
      if (daysSinceLastBackup > 30) {
        return {
          shouldShowReminder: true,
          daysSinceLastBackup
        };
      }

      return {
        shouldShowReminder: false,
        daysSinceLastBackup
      };
    } catch (error) {
      console.error('检查备份提醒失败:', error);
      return { shouldShowReminder: false };
    }
  }

  /**
   * 记录备份时间
   */
  async recordBackupDate() {
    try {
      const data = await StorageAPI.get([this.STORAGE_KEY]);
      const appData = data[this.STORAGE_KEY] || {};
      
      appData.lastBackupDate = new Date().toISOString();
      await StorageAPI.set({ [this.STORAGE_KEY]: appData });
    } catch (error) {
      console.error('记录备份时间失败:', error);
    }
  }

  /**
   * 获取备份统计信息
   */
  async getBackupStats() {
    try {
      const data = await StorageAPI.get([this.STORAGE_KEY]);
      const appData = data[this.STORAGE_KEY] || {};

      return {
        privateBookmarksCount: (appData.privateBookmarks || []).length,
        recycleBinCount: (appData.recycleBin || []).length,
        lastBackupDate: appData.lastBackupDate,
        lastImportDate: appData.lastImportDate
      };
    } catch (error) {
      console.error('获取备份统计失败:', error);
      return {
        privateBookmarksCount: 0,
        recycleBinCount: 0,
        lastBackupDate: null,
        lastImportDate: null
      };
    }
  }
}

// 创建单例实例
const backupService = new BackupService();

export default backupService; 