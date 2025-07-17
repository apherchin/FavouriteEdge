/**
 * 书签状态管理 Store
 * 使用 Zustand 管理书签相关的全局状态
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import bookmarkService from '../services/bookmarkService.js';
import backupService from '../services/backupService.js';
import { StorageAPI } from '../utils/chromeApi.js';

const useBookmarkStore = create(
  subscribeWithSelector((set, get) => ({
    // 状态
    bookmarks: [],
    folders: [],
    privateBookmarks: [],
    recycleBin: [],
    statistics: {},
    loading: false,
    error: null,
    searchQuery: '',
    searchResults: { chrome: [], private: [] },
    selectedBookmarks: [],
    draggedBookmark: null,
    lastSync: null,

    // 获取所有书签
    fetchBookmarks: async () => {
      set({ loading: true, error: null });
      
      try {
        const data = await bookmarkService.getAllBookmarks();
        
        set({
          bookmarks: data.bookmarks,
          folders: data.folders,
          privateBookmarks: data.privateBookmarks,
          recycleBin: data.recycleBin,
          statistics: data.statistics,
          lastSync: data.lastSync,
          loading: false
        });
      } catch (error) {
        set({ 
          error: error.message || '获取书签失败',
          loading: false 
        });
        console.error('获取书签失败:', error);
      }
    },

    // 创建书签
    createBookmark: async (bookmarkData) => {
      try {
        const newBookmark = await bookmarkService.createBookmark(bookmarkData);
        
        if (bookmarkData.isPrivate) {
          set(state => ({
            privateBookmarks: [...state.privateBookmarks, newBookmark]
          }));
        } else {
          // 重新获取书签以保持同步
          get().fetchBookmarks();
        }
        
        return newBookmark;
      } catch (error) {
        set({ error: error.message || '创建书签失败' });
        throw error;
      }
    },

    // 更新书签
    updateBookmark: async (id, changes) => {
      try {
        const updatedBookmark = await bookmarkService.updateBookmark(id, changes);
        
        set(state => {
          // 检查是否是私密书签
          const privateIndex = state.privateBookmarks.findIndex(b => b.id === id);
          if (privateIndex !== -1) {
            const newPrivateBookmarks = [...state.privateBookmarks];
            newPrivateBookmarks[privateIndex] = updatedBookmark;
            return { privateBookmarks: newPrivateBookmarks };
          } else {
            // 普通书签，重新获取以保持同步
            get().fetchBookmarks();
            return {};
          }
        });
        
        return updatedBookmark;
      } catch (error) {
        set({ error: error.message || '更新书签失败' });
        throw error;
      }
    },

    // 删除书签
    deleteBookmark: async (id, permanent = false) => {
      try {
        const deletedItem = await bookmarkService.deleteBookmark(id, permanent);
        
        if (permanent) {
          // 永久删除，从回收站移除
          set(state => ({
            recycleBin: state.recycleBin.filter(item => item.id !== id)
          }));
        } else {
          // 移动到回收站
          set(state => {
            const newState = {
              recycleBin: [...state.recycleBin, deletedItem]
            };
            
            // 从对应列表中移除
            if (deletedItem.isPrivate) {
              newState.privateBookmarks = state.privateBookmarks.filter(b => b.id !== id);
            } else {
              // 普通书签，重新获取以保持同步
              get().fetchBookmarks();
            }
            
            return newState;
          });
        }
        
        return deletedItem;
      } catch (error) {
        set({ error: error.message || '删除书签失败' });
        throw error;
      }
    },

    // 删除私密书签
    deletePrivateBookmark: async (id) => {
      try {
        const { privateBookmarks } = get();
        const bookmark = privateBookmarks.find(b => b.id === id);
        
        if (!bookmark) {
          throw new Error('找不到指定的私密书签');
        }

        // 删除私密书签
        await bookmarkService.deletePrivateBookmark(id);
        
        // 更新状态 - 从私密书签列表中移除
        set(state => ({
          privateBookmarks: state.privateBookmarks.filter(b => b.id !== id)
        }));
        
        return true;
      } catch (error) {
        set({ error: error.message || '删除私密书签失败' });
        throw error;
      }
    },

    // 从回收站恢复书签
    restoreBookmark: async (id) => {
      try {
        await bookmarkService.restoreFromRecycleBin(id);
        
        // 立即从回收站状态中移除该项目
        set(state => ({
          recycleBin: state.recycleBin.filter(item => item.id !== id)
        }));
        
        // 重新获取数据以保持同步
        await get().fetchBookmarks();
        
        return true;
      } catch (error) {
        set({ error: error.message || '恢复书签失败' });
        throw error;
      }
    },

    // 搜索书签
    searchBookmarks: async (query) => {
      set({ searchQuery: query });
      
      if (!query.trim()) {
        set({ searchResults: { chrome: [], private: [] } });
        return;
      }
      
      try {
        const results = await bookmarkService.searchBookmarks(query);
        
        // 将搜索结果分离为普通书签和私密书签
        const chromeResults = results.filter(r => !r.isPrivate);
        const privateResults = results.filter(r => r.isPrivate);
        
        set({ 
          searchResults: { 
            chrome: chromeResults, 
            private: privateResults 
          } 
        });
        
        return results;
      } catch (error) {
        set({ error: error.message || '搜索失败' });
        throw error;
      }
    },

    // 清空搜索
    clearSearch: () => {
      set({ searchQuery: '', searchResults: { chrome: [], private: [] } });
    },

    // 选择书签
    selectBookmark: (id) => {
      set(state => {
        const selectedBookmarks = state.selectedBookmarks.includes(id)
          ? state.selectedBookmarks.filter(bookmarkId => bookmarkId !== id)
          : [...state.selectedBookmarks, id];
        
        return { selectedBookmarks };
      });
    },

    // 清空选择
    clearSelection: () => {
      set({ selectedBookmarks: [] });
    },

    // 全选书签
    selectAllBookmarks: () => {
      set(state => {
        const allBookmarkIds = state.bookmarks
          .filter(b => b.type === 'bookmark')
          .map(b => b.id);
        
        return { selectedBookmarks: allBookmarkIds };
      });
    },

    // 设置拖拽中的书签
    setDraggedBookmark: (bookmark) => {
      set({ draggedBookmark: bookmark });
    },

    // 清空拖拽状态
    clearDraggedBookmark: () => {
      set({ draggedBookmark: null });
    },

    // 批量删除选中的书签
    deleteSelectedBookmarks: async (permanent = false) => {
      const { selectedBookmarks } = get();
      
      try {
        await Promise.all(
          selectedBookmarks.map(id => bookmarkService.deleteBookmark(id, permanent))
        );
        
        // 重新获取数据
        get().fetchBookmarks();
        get().clearSelection();
        
        return true;
      } catch (error) {
        set({ error: error.message || '批量删除失败' });
        throw error;
      }
    },

    // 清空错误状态
    clearError: () => {
      set({ error: null });
    },

    // 获取过滤后的书签
    getFilteredBookmarks: () => {
      const { bookmarks, searchQuery, searchResults } = get();
      
      if (searchQuery.trim()) {
        return searchResults.chrome || [];
      }
      
      return bookmarks.filter(b => b.type === 'bookmark');
    },

    // 获取过滤后的私密书签
    getFilteredPrivateBookmarks: () => {
      const { privateBookmarks, searchQuery, searchResults } = get();
      
      if (searchQuery.trim()) {
        return searchResults.private || [];
      }
      
      return privateBookmarks;
    },

    // 重新排序书签
    reorderBookmarks: async (fromIndex, toIndex, isPrivate = false) => {
      try {
        const state = get();
        
        if (isPrivate) {
          // 重新排序私密书签
          const newPrivateBookmarks = [...state.privateBookmarks];
          const [movedItem] = newPrivateBookmarks.splice(fromIndex, 1);
          newPrivateBookmarks.splice(toIndex, 0, movedItem);
          
          set({ privateBookmarks: newPrivateBookmarks });
          
          // 保存到存储
          const data = await StorageAPI.get(['FavouriteEdge_data']);
          const appData = data.FavouriteEdge_data || {};
          appData.privateBookmarks = newPrivateBookmarks;
          await StorageAPI.set({ FavouriteEdge_data: appData });
        } else {
          // 重新排序普通书签
          const newBookmarks = [...state.bookmarks];
          const [movedItem] = newBookmarks.splice(fromIndex, 1);
          newBookmarks.splice(toIndex, 0, movedItem);
          
          set({ bookmarks: newBookmarks });
          
          // 这里可以调用 Chrome API 来更新实际的书签顺序
          // 暂时只更新本地状态
        }
        
        return true;
      } catch (error) {
        set({ error: error.message || '排序失败' });
        throw error;
      }
    },

    // 文件夹管理
    addFolder: async (title) => {
      try {
        const folder = await bookmarkService.createFolder(title);
        set(state => ({
          folders: [...state.folders, folder]
        }));
        return folder;
      } catch (error) {
        set({ error: error.message || '创建文件夹失败' });
        throw error;
      }
    },

    deleteFolder: async (folderId) => {
      try {
        await bookmarkService.deleteFolder(folderId);
        set(state => ({
          folders: state.folders.filter(f => f.id !== folderId)
        }));
        // 重新获取书签以更新文件夹中的书签
        get().fetchBookmarks();
        return true;
      } catch (error) {
        set({ error: error.message || '删除文件夹失败' });
        throw error;
      }
    },

    renameFolder: async (folderId, newTitle) => {
      try {
        const updatedFolder = await bookmarkService.updateBookmark(folderId, { title: newTitle });
        set(state => ({
          folders: state.folders.map(f => 
            f.id === folderId ? { ...f, title: newTitle } : f
          )
        }));
        return updatedFolder;
      } catch (error) {
        set({ error: error.message || '重命名文件夹失败' });
        throw error;
      }
    },

    moveBookmarkToFolder: async (bookmarkId, folderId) => {
      try {
        await bookmarkService.moveBookmarkToFolder(bookmarkId, folderId);
        // 重新获取数据以保持同步
        get().fetchBookmarks();
        return true;
      } catch (error) {
        set({ error: error.message || '移动书签失败' });
        throw error;
      }
    },

    // 将普通书签转换为私密书签
    convertBookmarkToPrivate: async (bookmarkId) => {
      try {
        const result = await bookmarkService.convertBookmarkToPrivate(bookmarkId);
        // 重新获取数据以保持同步
        get().fetchBookmarks();
        return result;
      } catch (error) {
        set({ error: error.message || '转换书签失败' });
        throw error;
      }
    },

    // 将私密书签转换为普通书签
    convertPrivateToBookmark: async (privateBookmarkId, folderId = '1') => {
      try {
        const result = await bookmarkService.convertPrivateToBookmark(privateBookmarkId, folderId);
        // 重新获取数据以保持同步
        get().fetchBookmarks();
        return result;
      } catch (error) {
        set({ error: error.message || '转换私密书签失败' });
        throw error;
      }
    },

    // 获取指定文件夹的书签
    getFolderBookmarks: (folderId) => {
      const { folders } = get();
      const folder = folders.find(f => f.id === folderId);
      return folder?.children || [];
    },

    // 刷新书签图标
    refreshFavicons: async (bookmarkIds = null) => {
      try {
        set({ loading: true });
        await bookmarkService.refreshBookmarkFavicons(bookmarkIds);
        // 重新获取数据以更新界面
        get().fetchBookmarks();
        return true;
      } catch (error) {
        set({ error: error.message || '刷新图标失败' });
        throw error;
      } finally {
        set({ loading: false });
      }
    },

    // 重排序文件夹
    reorderFolders: (fromIndex, toIndex) => {
      set(state => {
        const newFolders = [...state.folders];
        const [movedFolder] = newFolders.splice(fromIndex, 1);
        newFolders.splice(toIndex, 0, movedFolder);
        return { folders: newFolders };
      });
    },

    // 获取书签统计信息
    getBookmarkStats: () => {
      const { bookmarks, folders, privateBookmarks, recycleBin } = get();
      
      const totalBookmarks = bookmarks.length;
      const totalPrivate = privateBookmarks.length;
      const totalDeleted = recycleBin.length;
      const totalFolders = folders.length;
      
      return {
        total: totalBookmarks + totalPrivate,
        chrome: totalBookmarks,
        private: totalPrivate,
        folders: totalFolders,
        deleted: totalDeleted
      };
    },

    // 备份和恢复功能
    exportPrivateBookmarks: async () => {
      try {
        const result = await backupService.exportPrivateBookmarks();
        await backupService.recordBackupDate();
        return result;
      } catch (error) {
        set({ error: error.message || '导出失败' });
        throw error;
      }
    },

    importPrivateBookmarks: async (file) => {
      try {
        const result = await backupService.importPrivateBookmarks(file);
        // 重新获取数据以更新界面
        get().fetchBookmarks();
        return result;
      } catch (error) {
        set({ error: error.message || '导入失败' });
        throw error;
      }
    },

    getBackupStats: async () => {
      try {
        return await backupService.getBackupStats();
      } catch (error) {
        console.error('获取备份统计失败:', error);
        return null;
      }
    },

    checkBackupReminder: async () => {
      try {
        return await backupService.scheduleBackupReminder();
      } catch (error) {
        console.error('检查备份提醒失败:', error);
        return { shouldShowReminder: false };
      }
    }
  }))
);

// 订阅状态变化，自动保存最后同步时间
useBookmarkStore.subscribe(
  (state) => state.bookmarks,
  () => {
    // 当书签数据更新时，记录同步时间
    useBookmarkStore.setState({ lastSync: new Date().toISOString() });
  }
);

export default useBookmarkStore; 