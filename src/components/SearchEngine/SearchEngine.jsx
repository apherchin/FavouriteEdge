import React, { useState, useEffect } from 'react';
import './SearchEngine.css';

const SearchEngine = ({ isConfigMode = false, onClose = null }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEngines, setSelectedEngines] = useState(['baidu']); // 默认选择百度
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(isConfigMode);

  const searchEngines = [
    {
      id: 'baidu',
      name: '百度',
      icon: '🔍',
      url: 'https://www.baidu.com/s?wd=',
      color: '#3385ff'
    },
    {
      id: 'bing',
      name: 'Bing',
      icon: '🔎',
      url: 'https://www.bing.com/search?q=',
      color: '#0078d4'
    },
    {
      id: 'nano',
      name: '纳米AI搜索',
      icon: '🔬',
      url: 'https://n.cn/search?q=',
      color: '#ff6b6b'
    },
    {
      id: 'google',
      name: 'Google',
      icon: '🌐',
      url: 'https://www.google.com/search?q=',
      color: '#4285f4'
    },
    {
      id: 'yandex',
      name: 'Yandex',
      icon: '🔴',
      url: 'https://yandex.com/search/?text=',
      color: '#ff0000'
    },
    {
      id: 'sogou',
      name: '搜狗',
      icon: '🐕',
      url: 'https://www.sogou.com/web?query=',
      color: '#ff7b00'
    }
  ];

  // 从存储中加载搜索引擎设置
  useEffect(() => {
    const loadSearchEngineSettings = async () => {
      try {
        let savedEngines = null;

        // 尝试从chrome.storage获取
        if (chrome && chrome.storage && chrome.storage.local) {
          try {
            const result = await chrome.storage.local.get(['selected-search-engines']);
            savedEngines = result['selected-search-engines'];
          } catch (error) {
            console.warn('Chrome storage不可用，使用localStorage:', error);
          }
        }

        // 降级到localStorage
        if (!savedEngines) {
          const stored = localStorage.getItem('selected-search-engines');
          if (stored) {
            savedEngines = JSON.parse(stored);
          }
        }

        if (savedEngines && Array.isArray(savedEngines) && savedEngines.length > 0) {
          setSelectedEngines(savedEngines);
        }
      } catch (error) {
        console.error('加载搜索引擎设置失败:', error);
      }
    };

    loadSearchEngineSettings();
  }, []);

  // 保存搜索引擎设置
  const saveSearchEngineSettings = async (engines) => {
    try {
      // 使用chrome.storage.local存储
      if (chrome && chrome.storage && chrome.storage.local) {
        await chrome.storage.local.set({ 'selected-search-engines': engines });
      } else {
        // 降级到localStorage
        localStorage.setItem('selected-search-engines', JSON.stringify(engines));
      }
    } catch (error) {
      console.error('保存搜索引擎设置失败:', error);
    }
  };

  // 监听配置模式变化
  useEffect(() => {
    setIsConfigModalOpen(isConfigMode);
  }, [isConfigMode]);

  const handleEngineToggle = async (engineId) => {
    const newEngines = selectedEngines.includes(engineId)
      ? selectedEngines.length === 1 
        ? selectedEngines // 至少保留一个搜索引擎
        : selectedEngines.filter(id => id !== engineId)
      : [...selectedEngines, engineId];
    
    setSelectedEngines(newEngines);
    // 立即保存设置
    await saveSearchEngineSettings(newEngines);
    
    // 通知其他组件配置已更新
    if (chrome && chrome.storage && chrome.storage.onChanged) {
      // 触发存储变化事件（自动触发）
      console.log('搜索引擎配置已更新:', newEngines);
    }
  };

  const handleConfigClose = () => {
    setIsConfigModalOpen(false);
    if (onClose) {
      onClose();
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    
    if (!searchQuery.trim()) {
      alert('请输入搜索内容');
      return;
    }

    if (selectedEngines.length === 0) {
      alert('请至少选择一个搜索引擎');
      return;
    }

    // 在新窗口中打开选中的搜索引擎
    selectedEngines.forEach(engineId => {
      const engine = searchEngines.find(e => e.id === engineId);
      if (engine) {
        const searchUrl = engine.url + encodeURIComponent(searchQuery);
        window.open(searchUrl, '_blank');
      }
    });

    // 清空搜索框
    setSearchQuery('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch(e);
    }
  };

  const getSelectedEngineIcons = () => {
    return selectedEngines.map(engineId => {
      const engine = searchEngines.find(e => e.id === engineId);
      return engine ? engine.icon : '';
    }).join('');
  };

  // 如果是配置模式，只显示配置窗口
  if (isConfigMode) {
    return (
      <div className="search-config-overlay" onClick={handleConfigClose}>
        <div className="search-config-modal" onClick={(e) => e.stopPropagation()}>
          <div className="search-config-header">
            <h2>搜索引擎配置</h2>
            <button 
              className="btn-close" 
              onClick={handleConfigClose}
            >
              ×
            </button>
          </div>

          <div className="search-config-content">
            <div className="config-description">
              <p>选择您常用的搜索引擎，可以同时选择多个进行并行搜索</p>
            </div>

            <div className="engine-list">
              {searchEngines.map(engine => (
                <div key={engine.id} className="engine-item">
                  <label className="engine-label">
                    <input
                      type="checkbox"
                      checked={selectedEngines.includes(engine.id)}
                      onChange={() => handleEngineToggle(engine.id)}
                      className="engine-checkbox"
                    />
                    <div className="engine-content">
                      <div className="engine-info">
                        <span className="engine-icon">{engine.icon}</span>
                        <span className="engine-name">{engine.name}</span>
                      </div>
                      <div 
                        className="engine-color-indicator"
                        style={{ backgroundColor: engine.color }}
                      />
                    </div>
                  </label>
                </div>
              ))}
            </div>

            <div className="config-footer">
              <div className="config-tip">
                💡 提示：选择多个搜索引擎可以同时在不同平台搜索，提高搜索效率
              </div>
              <div className="config-actions">
                <button 
                  className="btn-apply" 
                  onClick={handleConfigClose}
                >
                  确定
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="search-engine-container">
      <form onSubmit={handleSearch} className="search-engine-form">
        <div className="search-input-group">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="输入搜索内容..."
            className="search-engine-input"
          />
          
          <button
            type="button"
            onClick={() => setIsConfigModalOpen(true)}
            className="engine-selector-btn"
            title="配置搜索引擎"
          >
            <span className="selected-engines-icons">{getSelectedEngineIcons()}</span>
            <span className="engine-count">({selectedEngines.length})</span>
            <span className="settings-icon">⚙️</span>
          </button>
        </div>

        <button type="submit" className="search-submit-btn">
          搜索
        </button>
      </form>

      {/* 搜索引擎配置窗口 */}
      {isConfigModalOpen && !isConfigMode && (
        <div className="search-config-overlay" onClick={() => setIsConfigModalOpen(false)}>
          <div className="search-config-modal" onClick={(e) => e.stopPropagation()}>
            <div className="search-config-header">
              <h2>搜索引擎配置</h2>
              <button 
                className="btn-close" 
                onClick={() => setIsConfigModalOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="search-config-content">
              <div className="config-description">
                <p>选择您常用的搜索引擎，可以同时选择多个进行并行搜索</p>
              </div>

              <div className="engine-list">
                {searchEngines.map(engine => (
                  <div key={engine.id} className="engine-item">
                    <label className="engine-label">
                      <input
                        type="checkbox"
                        checked={selectedEngines.includes(engine.id)}
                        onChange={() => handleEngineToggle(engine.id)}
                        className="engine-checkbox"
                      />
                      <div className="engine-content">
                        <div className="engine-info">
                          <span className="engine-icon">{engine.icon}</span>
                          <span className="engine-name">{engine.name}</span>
                        </div>
                        <div 
                          className="engine-color-indicator"
                          style={{ backgroundColor: engine.color }}
                        />
                      </div>
                    </label>
                  </div>
                ))}
              </div>

              <div className="config-footer">
                <div className="config-tip">
                  💡 提示：选择多个搜索引擎可以同时在不同平台搜索，提高搜索效率
                </div>
                <div className="config-actions">
                  <button 
                    className="btn-apply" 
                    onClick={() => setIsConfigModalOpen(false)}
                  >
                    确定
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchEngine; 