import React, { useCallback, useState, useEffect } from 'react';
import useBookmarkStore from '../../store/bookmarkStore.js';
import BookmarkItem from './BookmarkItem.jsx';
import SortControls from '../Common/SortControls.jsx';
import BackgroundManager from '../BackgroundManager/BackgroundManager.jsx';
import SearchEngine from '../SearchEngine/SearchEngine.jsx';
import useTheme from '../../hooks/useTheme.js';
import statisticsService from '../../services/statisticsService.js';
import { reorderArray } from '../../utils/dragHelper.js';
import './BookmarkGrid.css';

const BookmarkGrid = ({ isPrivate = false, showFolders = false, folderId = null, title }) => {
  const { 
    getFilteredBookmarks, 
    getFilteredPrivateBookmarks,
    getFolderBookmarks,
    loading,
    reorderBookmarks,
    moveBookmarkToFolder,

  } = useBookmarkStore();

  const [sortType, setSortType] = useState('frequency');
  const [sortedBookmarks, setSortedBookmarks] = useState([]);

  const [showBackgroundManager, setShowBackgroundManager] = useState(false);
  const [showSearchEngineConfig, setShowSearchEngineConfig] = useState(false);
  const { isDarkMode, toggleTheme } = useTheme();

  const rawBookmarks = (() => {
    if (isPrivate) {
      return getFilteredPrivateBookmarks();
    } else if (folderId) {
      return getFolderBookmarks(folderId);
    } else {
      return getFilteredBookmarks();
    }
  })();

  // 应用智能排序
  useEffect(() => {
    const applySorting = async () => {
      if (rawBookmarks.length === 0) {
        setSortedBookmarks([]);
        return;
      }

      try {
        if (sortType === 'manual') {
          // 手动排序，保持原有顺序
          setSortedBookmarks(rawBookmarks);
        } else {
          // 应用智能排序
          const sorted = await statisticsService.sortBookmarksIntelligently(rawBookmarks, sortType);
          setSortedBookmarks(sorted);
        }
      } catch (error) {
        console.error('排序失败:', error);
        setSortedBookmarks(rawBookmarks);
      }
    };

    applySorting();
  }, [rawBookmarks, sortType]);

  // 处理书签拖拽排序
  const handleBookmarkMove = useCallback((fromIndex, toIndex, position) => {
    const newIndex = position === 'before' ? toIndex : toIndex + 1;
    const adjustedIndex = fromIndex < newIndex ? newIndex - 1 : newIndex;
    
    if (fromIndex !== adjustedIndex) {
      reorderBookmarks(fromIndex, adjustedIndex, isPrivate);
      // 拖拽后切换到手动排序模式
      setSortType('manual');
    }
  }, [reorderBookmarks, isPrivate]);

  // 处理排序方式改变
  const handleSortChange = useCallback((newSortType) => {
    setSortType(newSortType);
  }, []);



  if (loading) {
    return (
      <div className="bookmark-grid-loading">
        <div className="loading-spinner">加载中...</div>
      </div>
    );
  }

  if (sortedBookmarks.length === 0) {
    return (
      <div className="bookmark-grid-container">
        {title && (
          <div className="bookmark-grid-header">
            <h2 className="bookmark-grid-title">{title}</h2>
            <div className="bookmark-grid-controls">
              <button 
                className="search-engine-settings-btn"
                onClick={() => setShowSearchEngineConfig(true)}
                title="搜索引擎设置"
              >
                ⚙️
              </button>
              <button 
                className="background-settings-btn"
                onClick={() => setShowBackgroundManager(true)}
                title="背景设置"
              >
                🎨
              </button>
              <button 
                className="theme-toggle-btn"
                onClick={toggleTheme}
                title={isDarkMode ? "切换到浅色主题" : "切换到深色主题"}
              >
                {isDarkMode ? '☀️' : '🌙'}
              </button>
              <SortControls onSortChange={handleSortChange} currentSort={sortType} />
            </div>
          </div>
        )}
        
        <div className="empty-state">
          <div className="empty-state-icon">📚</div>
          <h3 className="empty-state-title">
            {isPrivate ? '还没有私密书签' : '还没有书签'}
          </h3>
          <p className="empty-state-description">
            {isPrivate 
              ? '创建您的第一个私密书签，让它们受到PIN保护'
              : '开始添加您的书签，它们会在这里显示'
            }
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bookmark-grid-container">
      {title && (
                  <div className="bookmark-grid-header">
            <h2 className="bookmark-grid-title">{title}</h2>
            <div className="bookmark-grid-controls">
              <button 
                className="search-engine-settings-btn"
                onClick={() => setShowSearchEngineConfig(true)}
                title="搜索引擎设置"
              >
                ⚙️
              </button>
              <button 
                className="background-settings-btn"
                onClick={() => setShowBackgroundManager(true)}
                title="背景设置"
              >
                🎨
              </button>
              <button 
                className="theme-toggle-btn"
                onClick={toggleTheme}
                title={isDarkMode ? "切换到浅色主题" : "切换到深色主题"}
              >
                {isDarkMode ? '☀️' : '🌙'}
              </button>
              <SortControls onSortChange={handleSortChange} currentSort={sortType} />
            </div>
          </div>
      )}
      
      <div className="bookmark-grid">
        {sortedBookmarks.map((bookmark, index) => (
          <BookmarkItem
            key={bookmark.id}
            bookmark={bookmark}
            index={index}
            isPrivate={isPrivate}
            onMove={handleBookmarkMove}
          />
        ))}
      </div>
      
      {/* 背景管理器 */}
      <BackgroundManager 
        isOpen={showBackgroundManager}
        onClose={() => setShowBackgroundManager(false)}
      />
      
      {/* 搜索引擎配置模态框 */}
      {showSearchEngineConfig && (
        <SearchEngine 
          isConfigMode={true}
          onClose={() => setShowSearchEngineConfig(false)}
        />
      )}
    </div>
  );
};

export default BookmarkGrid; 