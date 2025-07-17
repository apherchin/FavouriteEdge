import React, { useState, useEffect } from 'react';
import './SearchBox.css';

const SearchBox = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEngines, setSelectedEngines] = useState(['baidu']);
  const [isSearching, setIsSearching] = useState(false);

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

  // 从chrome.storage获取选中的搜索引擎
  const loadSelectedEngines = async () => {
    try {
      if (chrome && chrome.storage && chrome.storage.local) {
        const result = await chrome.storage.local.get(['selected-search-engines']);
        const saved = result['selected-search-engines'];
        if (saved && Array.isArray(saved)) {
          setSelectedEngines(saved);
        } else {
          setSelectedEngines(['baidu']);
        }
      } else {
        // 降级到localStorage
        const saved = localStorage.getItem('selected-search-engines');
        if (saved) {
          const parsed = JSON.parse(saved);
          setSelectedEngines(parsed);
        } else {
          setSelectedEngines(['baidu']);
        }
      }
    } catch (error) {
      console.error('加载搜索引擎配置失败:', error);
      setSelectedEngines(['baidu']);
    }
  };

  // 组件初始化时加载配置
  useEffect(() => {
    loadSelectedEngines();
    
    // 监听存储变化
    const handleStorageChange = (changes, namespace) => {
      if (namespace === 'local' && changes['selected-search-engines']) {
        const newValue = changes['selected-search-engines'].newValue;
        if (newValue && Array.isArray(newValue)) {
          setSelectedEngines(newValue);
          console.log('搜索引擎配置已更新:', newValue);
        }
      }
    };
    
    if (chrome && chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener(handleStorageChange);
      
      // 清理监听器
      return () => {
        chrome.storage.onChanged.removeListener(handleStorageChange);
      };
    }
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      console.log('搜索内容为空，跳过搜索');
      return;
    }

    if (isSearching) {
      console.log('搜索正在进行中，跳过重复搜索');
      return;
    }

    setIsSearching(true);
    
    const engines = searchEngines.filter(engine => selectedEngines.includes(engine.id));
    
    // 如果没有选中的引擎，使用百度作为默认
    if (engines.length === 0) {
      engines.push(searchEngines.find(engine => engine.id === 'baidu'));
      console.log('未选择搜索引擎，使用默认百度搜索');
    }

    console.log('=== 开始搜索 ===');
    console.log('搜索关键词:', searchQuery);
    console.log('选中的搜索引擎:', engines.map(e => e.name).join(', '));

    // 在选中的搜索引擎中搜索
    engines.forEach((engine, index) => {
      const searchUrl = engine.url + encodeURIComponent(searchQuery);
      console.log(`正在打开搜索页面 ${index + 1}/${engines.length}:`, engine.name, searchUrl);
      
      try {
        // 使用延迟打开多个窗口，避免浏览器阻止弹窗
        setTimeout(() => {
          window.open(searchUrl, '_blank');
        }, index * 100); // 每个窗口间隔100ms
      } catch (error) {
        console.error(`打开搜索页面失败 (${engine.name}):`, error);
      }
    });
    
    console.log('=== 搜索完成 ===');
    
    // 搜索完成后清空搜索框并重置状态
    setTimeout(() => {
      setSearchQuery('');
      setIsSearching(false);
    }, engines.length * 100 + 200); // 等待所有窗口打开后再清空
  };

  const handleInputChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch(e);
    }
  };

  return (
    <div className="search-box-container">
      <form className="search-box-form" onSubmit={handleSearch}>
        <div className="search-box-input-group">
          <input
            type="text"
            className="search-box-input"
            placeholder="搜索..."
            value={searchQuery}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
          />
          <button
            type="submit"
            className="search-box-submit-btn"
            disabled={!searchQuery.trim() || isSearching}
          >
            {isSearching ? '🔎' : '🔍'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SearchBox; 