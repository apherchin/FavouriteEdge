import React from 'react';
import useBookmarkStore from '../../store/bookmarkStore.js';
import './RecycleBin.css';

const RecycleBin = () => {
  const { recycleBin, restoreBookmark, deleteBookmark } = useBookmarkStore();

  const handleRestore = async (id) => {
    try {
      await restoreBookmark(id);
    } catch (error) {
      console.error('恢复失败:', error);
    }
  };

  const handlePermanentDelete = async (id) => {
    if (confirm('确定要永久删除这个项目吗？此操作无法撤销。')) {
      try {
        await deleteBookmark(id, true);
      } catch (error) {
        console.error('永久删除失败:', error);
      }
    }
  };

  if (recycleBin.length === 0) {
    return (
      <div className="recycle-bin-container">
        <h2 className="recycle-bin-title">🗑️ 回收站</h2>
        <div className="empty-state">
          <div className="empty-state-icon">🗑️</div>
          <h3 className="empty-state-title">回收站是空的</h3>
          <p className="empty-state-description">
            删除的书签会暂时保存在这里，您可以随时恢复它们
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="recycle-bin-container">
      <h2 className="recycle-bin-title">🗑️ 回收站</h2>
      
      <div className="recycle-bin-items">
        {recycleBin.map(item => (
          <div key={item.id} className="recycle-item">
            <div className="recycle-item-info">
              <div className="recycle-item-favicon">
                {item.favicon ? (
                  <img src={item.favicon} alt="" className="favicon-img" />
                ) : (
                  <span className="favicon-placeholder">🔗</span>
                )}
              </div>
              
              <div className="recycle-item-details">
                <h3 className="recycle-item-title">{item.title}</h3>
                {item.url && (
                  <p className="recycle-item-url">
                    {new URL(item.url).hostname}
                  </p>
                )}
                <p className="recycle-item-date">
                  删除时间: {new Date(item.deletedAt).toLocaleString()}
                </p>
              </div>
            </div>
            
            <div className="recycle-item-actions">
              <button
                onClick={() => handleRestore(item.id)}
                className="btn-secondary"
                title="恢复"
              >
                📥 恢复
              </button>
              <button
                onClick={() => handlePermanentDelete(item.id)}
                className="btn-danger"
                title="永久删除"
              >
                🗑️ 永久删除
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecycleBin; 