/**
 * FavouriteEdge 主应用组件
 * 新标签页的主界面
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import useBookmarkStore from '../store/bookmarkStore.js';
import backgroundService from '../services/backgroundService.js';
import BookmarkGrid from '../components/BookmarkGrid/BookmarkGrid.jsx';
import SearchBox from '../components/SearchBox/SearchBox.jsx';
import Sidebar from '../components/Sidebar/Sidebar.jsx';
import PrivateFolder from '../components/PrivateFolder/PrivateFolder.jsx';
import RecycleBin from '../components/RecycleBin/RecycleBin.jsx';
import BackupManager from '../components/BackupManager/BackupManager.jsx';
import ErrorBoundary from '../components/Common/ErrorBoundary.jsx';
import LoadingSpinner from '../components/Common/LoadingSpinner.jsx';
import './App.css';

const App = () => {
  const {
    loading,
    error,
    fetchBookmarks,
    clearError,
    getBookmarkStats,
    getFolderBookmarks,
    folders
  } = useBookmarkStore();

  const [currentView, setCurrentView] = useState('bookmarks'); // bookmarks, private, recycle, folder:id
  const [showPrivateModal, setShowPrivateModal] = useState(false);
  const [showBackupManager, setShowBackupManager] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [backgroundApplied, setBackgroundApplied] = useState(false);
  const backgroundRetryCount = useRef(0);
  const maxBackgroundRetries = 3;

  // 应用背景的函数（增强版）
  const applyBackground = useCallback((background, type, isRetry = false) => {
    console.log(`🎨 applyBackground 被调用 - 类型: ${type}, 重试: ${isRetry}`);
    
    try {
      const body = document.body;
      const app = document.querySelector('.app');
      const html = document.documentElement;
      
      // 强制清除之前的背景样式
      [body, app, html].forEach(element => {
        if (element) {
          element.style.removeProperty('background');
          element.style.removeProperty('background-image');
          element.style.removeProperty('background-color');
          element.classList.remove('background-loaded');
        }
      });
      
      // 强制触发重绘
      body.offsetHeight;
      
      // 应用新背景
      if (type === 'image') {
        const backgroundStyle = `url(${background})`;
        const backgroundProps = {
          'background-image': backgroundStyle,
          'background-size': 'cover',
          'background-position': 'center center',
          'background-repeat': 'no-repeat',
          'background-attachment': 'fixed'
        };
        
        [body, html].forEach(element => {
          if (element) {
            Object.entries(backgroundProps).forEach(([prop, value]) => {
              element.style.setProperty(prop, value, 'important');
            });
          }
        });
        
        // 为app容器设置透明背景
        if (app) {
          app.style.setProperty('background', 'transparent', 'important');
        }
      } else {
        // 渐变背景
        [body, html].forEach(element => {
          if (element) {
            element.style.setProperty('background', background, 'important');
          }
        });
        
        if (app) {
          app.style.setProperty('background', 'transparent', 'important');
        }
      }
      
      // 添加背景加载完成标识
      [body, app, html].forEach(element => {
        if (element) {
          element.classList.add('background-loaded');
        }
      });
      
      // 触发强制重绘
      body.offsetHeight;
      
      setBackgroundApplied(true);
      backgroundRetryCount.current = 0;
      console.log('✅ 背景应用成功');
      
      return true;
    } catch (error) {
      console.error('❌ 应用背景时出错:', error);
      
      if (!isRetry && backgroundRetryCount.current < maxBackgroundRetries) {
        backgroundRetryCount.current++;
        console.log(`🔄 尝试重新应用背景 (${backgroundRetryCount.current}/${maxBackgroundRetries})`);
        setTimeout(() => {
          applyBackground(background, type, true);
        }, 1000);
      }
      
      return false;
    }
  }, []);

  // 加载并应用背景的函数
  const loadAndApplyBackground = useCallback(async () => {
    try {
      console.log('🎨 开始加载背景设置');
      const { background, type } = await backgroundService.getBackground();
      
      console.log('🎨 backgroundService.getBackground 返回结果:', {
        hasBackground: !!background,
        backgroundType: type,
        backgroundLength: background ? background.length : 0,
        backgroundPreview: background ? background.substring(0, 100) + '...' : 'null'
      });
      
      if (background) {
        console.log('✅ 找到保存的背景，正在应用...');
        const success = applyBackground(background, type);
        if (success) {
          console.log('✅ 背景应用完成');
        } else {
          console.log('❌ 背景应用失败，使用默认背景');
          throw new Error('背景应用失败');
        }
      } else {
        throw new Error('没有保存的背景');
      }
    } catch (backgroundError) {
      console.log('🎨 加载背景失败，使用默认背景:', backgroundError.message);
      // 应用默认渐变背景
      const defaultGradient = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
      console.log('🎨 应用默认背景:', defaultGradient);
      applyBackground(defaultGradient, 'gradient');
    }
  }, [applyBackground]);

  // 监听存储变化以实时更新背景
  useEffect(() => {
    const handleStorageChange = (changes, namespace) => {
      if (namespace === 'local' && (changes['background-image'] || changes['background-type'])) {
        console.log('🔄 检测到背景设置变化，重新加载背景');
        loadAndApplyBackground();
      }
    };

    if (chrome && chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener(handleStorageChange);
      return () => {
        chrome.storage.onChanged.removeListener(handleStorageChange);
      };
    }
  }, [loadAndApplyBackground]);

  // 初始化应用
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // 隐藏加载屏幕
        const loadingElement = document.getElementById('loading');
        if (loadingElement) {
          loadingElement.style.display = 'none';
        }

        // 测试chrome.storage是否可用
        console.log('🔍 测试chrome.storage可用性:');
        console.log('- chrome对象存在:', !!chrome);
        console.log('- chrome.storage存在:', !!chrome?.storage);
        console.log('- chrome.storage.local存在:', !!chrome?.storage?.local);
        
        // 测试chrome.storage的基本功能
        if (chrome?.storage?.local) {
          try {
            console.log('🧪 测试chrome.storage.local基本功能');
            await chrome.storage.local.set({ 'test-key': 'test-value' });
            const testResult = await chrome.storage.local.get(['test-key']);
            console.log('✅ chrome.storage.local测试成功:', testResult);
            await chrome.storage.local.remove(['test-key']);
          } catch (storageTestError) {
            console.error('❌ chrome.storage.local测试失败:', storageTestError);
          }
        }

        // 等待DOM完全准备好
        await new Promise(resolve => {
          if (document.readyState === 'complete') {
            resolve();
          } else {
            window.addEventListener('load', resolve, { once: true });
          }
        });

        // 初始化背景
        await loadAndApplyBackground();

        // 获取书签数据
        console.log('📚 开始获取书签数据');
        await fetchBookmarks();
        console.log('📚 书签数据获取完成');
        
        setIsInitialized(true);
        console.log('✅ 应用初始化完成');
      } catch (error) {
        console.error('❌ 初始化应用失败:', error);
        setIsInitialized(true); // 即使失败也要设置为已初始化
      }
    };

    initializeApp();
  }, [fetchBookmarks, loadAndApplyBackground]);

  // 定期检查背景是否仍然存在（防止被其他样式覆盖）
  useEffect(() => {
    if (!backgroundApplied) return;

    const checkBackground = () => {
      const body = document.body;
      const hasBackground = body.style.background || body.style.backgroundImage;
      
      if (!hasBackground) {
        console.log('🔄 检测到背景丢失，重新应用背景');
        loadAndApplyBackground();
      }
    };

    const interval = setInterval(checkBackground, 5000); // 每5秒检查一次
    return () => clearInterval(interval);
  }, [backgroundApplied, loadAndApplyBackground]);

  // 处理视图切换
  const handleViewChange = (view) => {
    if (view === 'private') {
      setShowPrivateModal(true);
    } else {
      setCurrentView(view);
    }
  };

  // 处理私密文件夹访问
  const handlePrivateAccess = (granted) => {
    setShowPrivateModal(false);
    if (granted) {
      setCurrentView('private');
    }
  };

  // 获取统计信息
  const stats = getBookmarkStats();

  if (!isInitialized) {
    return <LoadingSpinner />;
  }

  return (
    <ErrorBoundary>
      <DndProvider backend={HTML5Backend}>
        <div className="app">
          {/* 顶部banner */}
          <header className="app-header">
            <div className="header-content">
              <div className="logo-section">
                <h1 className="app-title">FavouriteEdge</h1>
                <span className="app-subtitle">智能书签管理器</span>
              </div>
              
              <div className="header-center">
                <SearchBox />
              </div>
              
              <div className="header-spacer"></div>
            </div>
          </header>

          <div className="app-body">
            {/* 侧边栏 */}
            <Sidebar
              currentView={currentView}
              onViewChange={handleViewChange}
              stats={stats}
            />

            {/* 主内容区域 */}
            <main className="main-content">
              {error && (
                <div className="error-banner">
                  <span>{error}</span>
                  <button onClick={clearError} className="error-close">
                    ✕
                  </button>
                </div>
              )}

              {loading && <LoadingSpinner />}

              {!loading && (
                <>
                  {currentView === 'bookmarks' && (
                    <BookmarkGrid 
                      showFolders={true}
                      title="我的书签"
                    />
                  )}

                  {currentView === 'private' && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingLeft: '24px', paddingRight: '24px' }}>
                        <h2 style={{ color: 'white', margin: 0, fontSize: '2rem', fontWeight: 600, textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)' }}>私密书签</h2>
                        <button 
                          onClick={() => setShowBackupManager(true)}
                          style={{
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            color: 'rgba(255, 255, 255, 0.9)',
                            padding: '8px 16px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 500,
                            transition: 'all 0.2s ease',
                            backdropFilter: 'blur(10px)'
                          }}
                          onMouseOver={(e) => {
                            e.target.style.background = 'rgba(255, 255, 255, 0.2)';
                            e.target.style.transform = 'translateY(-1px)';
                          }}
                          onMouseOut={(e) => {
                            e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                            e.target.style.transform = 'translateY(0)';
                          }}
                        >
                          💾 备份管理
                        </button>
                      </div>
                      <BookmarkGrid 
                        isPrivate={true}
                        title=""
                      />
                    </div>
                  )}

                  {currentView === 'recycle' && (
                    <RecycleBin />
                  )}

                  {currentView.startsWith('folder:') && (() => {
                    const folderId = currentView.split(':')[1];
                    const folder = folders.find(f => f.id === folderId);
                    return (
                      <BookmarkGrid 
                        folderId={folderId}
                        title={`📁 ${folder?.title || '未知文件夹'}`}
                      />
                    );
                  })()}
                </>
              )}
            </main>
          </div>

          {/* 私密文件夹模态框 */}
          {showPrivateModal && (
            <PrivateFolder
              onClose={() => setShowPrivateModal(false)}
              onAccess={handlePrivateAccess}
            />
          )}

          {/* 备份管理模态框 */}
          {showBackupManager && (
            <BackupManager
              onClose={() => setShowBackupManager(false)}
            />
          )}
        </div>
      </DndProvider>
    </ErrorBoundary>
  );
};

export default App; 