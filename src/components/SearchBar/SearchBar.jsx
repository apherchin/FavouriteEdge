import React, { useState, useEffect } from 'react';
import useBookmarkStore from '../../store/bookmarkStore.js';
import './SearchBar.css';

const SearchBar = ({ onViewChange }) => {
  const { searchQuery, searchBookmarks, clearSearch } = useBookmarkStore();
  const [inputValue, setInputValue] = useState(searchQuery);

  useEffect(() => {
    setInputValue(searchQuery);
  }, [searchQuery]);

  const handleSearch = async (value) => {
    setInputValue(value);
    if (value.trim()) {
      await searchBookmarks(value);
      // 自动跳转到"我的书签"视图显示搜索结果
      if (onViewChange) {
        onViewChange('bookmarks');
      }
    } else {
      clearSearch();
    }
  };

  const handleClear = () => {
    setInputValue('');
    clearSearch();
  };

  return (
    <div className="search-bar">
      <div className="search-input-container">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          placeholder="搜索书签..."
          value={inputValue}
          onChange={(e) => handleSearch(e.target.value)}
          className="search-input"
        />
        {inputValue && (
          <button onClick={handleClear} className="search-clear">
            ✕
          </button>
        )}
      </div>
    </div>
  );
};

export default SearchBar; 