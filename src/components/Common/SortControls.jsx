import React, { useState } from 'react';
import './SortControls.css';

const SortControls = ({ onSortChange, currentSort = 'frequency' }) => {
  const [isOpen, setIsOpen] = useState(false);

  const sortOptions = [
    { value: 'frequency', label: '智能排序', icon: '🧠', description: '基于访问频率和规律性' },
    { value: 'recent', label: '最近访问', icon: '🕒', description: '按最后访问时间' },
    { value: 'clicks', label: '点击次数', icon: '👆', description: '按总点击次数' },
    { value: 'alphabetical', label: '字母顺序', icon: '🔤', description: '按标题字母排序' },
    { value: 'creation', label: '创建时间', icon: '📅', description: '按创建时间排序' }
  ];

  const currentOption = sortOptions.find(option => option.value === currentSort);

  const handleSortSelect = (sortType) => {
    onSortChange(sortType);
    setIsOpen(false);
  };

  return (
    <div className="sort-controls">
      <button 
        className="sort-trigger"
        onClick={() => setIsOpen(!isOpen)}
        title="选择排序方式"
      >
        <span className="sort-icon">{currentOption?.icon}</span>
        <span className="sort-label">{currentOption?.label}</span>
        <span className={`sort-arrow ${isOpen ? 'open' : ''}`}>▼</span>
      </button>

      {isOpen && (
        <>
          <div className="sort-overlay" onClick={() => setIsOpen(false)} />
          <div className="sort-dropdown">
            <div className="sort-header">
              <h3>排序方式</h3>
            </div>
            
            <div className="sort-options">
              {sortOptions.map(option => (
                <button
                  key={option.value}
                  className={`sort-option ${currentSort === option.value ? 'active' : ''}`}
                  onClick={() => handleSortSelect(option.value)}
                >
                  <div className="sort-option-main">
                    <span className="sort-option-icon">{option.icon}</span>
                    <div className="sort-option-text">
                      <span className="sort-option-label">{option.label}</span>
                      <span className="sort-option-description">{option.description}</span>
                    </div>
                  </div>
                  {currentSort === option.value && (
                    <span className="sort-check">✓</span>
                  )}
                </button>
              ))}
            </div>

            <div className="sort-footer">
              <p className="sort-note">
                💡 智能排序会根据您的使用习惯自动调整书签顺序
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SortControls; 