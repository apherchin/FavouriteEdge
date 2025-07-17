import React, { useState, useEffect, useRef } from 'react';
import './RenameDialog.css';

const RenameDialog = ({ isOpen, onClose, onConfirm, initialValue = '', title = '重命名书签' }) => {
  const [value, setValue] = useState(initialValue);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      // 延迟一帧确保元素已渲染
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 0);
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!value.trim()) {
      return;
    }

    if (value.trim() === initialValue.trim()) {
      onClose();
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm(value.trim());
      onClose();
    } catch (error) {
      console.error('重命名失败:', error);
      alert('重命名失败: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setValue(initialValue);
    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="rename-dialog-overlay" onClick={handleCancel}>
      <div className="rename-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="rename-dialog-header">
          <h3 className="rename-dialog-title">{title}</h3>
          <button 
            className="rename-dialog-close"
            onClick={handleCancel}
            type="button"
          >
            ✕
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="rename-dialog-form">
          <div className="rename-dialog-body">
            <label htmlFor="rename-input" className="rename-dialog-label">
              新名称:
            </label>
            <input
              ref={inputRef}
              id="rename-input"
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="rename-dialog-input"
              placeholder="请输入新的书签名称"
              disabled={isSubmitting}
              maxLength={200}
            />
          </div>
          
          <div className="rename-dialog-footer">
            <button
              type="button"
              onClick={handleCancel}
              className="btn-secondary"
              disabled={isSubmitting}
            >
              取消
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting || !value.trim()}
            >
              {isSubmitting ? '保存中...' : '确定'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RenameDialog; 