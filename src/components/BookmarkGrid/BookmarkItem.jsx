import React, { forwardRef, useState, useEffect } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import useBookmarkStore from '../../store/bookmarkStore.js';
import { DragTypes, createDragItem } from '../../utils/dragHelper.js';
import iconService from '../../services/iconService.js';
import RenameDialog from '../Common/RenameDialog.jsx';
import bookmarkService from '../../services/bookmarkService.js';
import './BookmarkItem.css';

const BookmarkItem = forwardRef(({ bookmark, index, isPrivate = false, onMove }, ref) => {
  const { deleteBookmark, deletePrivateBookmark, fetchBookmarks } = useBookmarkStore();
  const [isHovered, setIsHovered] = useState(false);
  const [faviconUrl, setFaviconUrl] = useState(iconService.getDefaultIcon());
  const [faviconLoading, setFaviconLoading] = useState(true);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [showRenameDialog, setShowRenameDialog] = useState(false);

  // 加载图标
  useEffect(() => {
    let isMounted = true;

    const loadFavicon = async () => {
      if (!bookmark.url) {
        setFaviconUrl(iconService.getDefaultIcon());
        setFaviconLoading(false);
        return;
      }

      try {
        // 先尝试从缓存获取
        const cachedIcon = await iconService.getBookmarkIcon(bookmark.url);
        if (isMounted) {
          setFaviconUrl(cachedIcon);
          setFaviconLoading(false);
        }
      } catch (error) {
        console.debug('加载图标失败:', error);
        if (isMounted) {
          setFaviconUrl(iconService.getDefaultIcon());
          setFaviconLoading(false);
        }
      }
    };

    loadFavicon();

    return () => {
      isMounted = false;
    };
  }, [bookmark.url]);

  // 刷新图标
  const handleRefreshIcon = async (e) => {
    e.stopPropagation();
    setFaviconLoading(true);
    
    try {
      const newIcon = await iconService.refreshIcon(bookmark.url);
      setFaviconUrl(newIcon);
    } catch (error) {
      console.debug('刷新图标失败:', error);
      setFaviconUrl(iconService.getDefaultIcon());
    } finally {
      setFaviconLoading(false);
    }
  };

  // 点击外部关闭右键菜单
  useEffect(() => {
    const handleClickOutside = () => {
      setShowContextMenu(false);
    };

    if (showContextMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showContextMenu]);

  // 拖拽逻辑
  const [{ isDragging }, dragRef] = useDrag({
    type: isPrivate ? DragTypes.PRIVATE_BOOKMARK : DragTypes.BOOKMARK,
    item: () => createDragItem(bookmark, index, isPrivate ? DragTypes.PRIVATE_BOOKMARK : DragTypes.BOOKMARK),
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [{ isOver, canDrop, dropPosition }, dropRef] = useDrop({
    accept: [DragTypes.BOOKMARK, DragTypes.PRIVATE_BOOKMARK],
    hover: (item, monitor) => {
      if (!ref.current) return;

      const dragIndex = item.index;
      const hoverIndex = index;
      
      if (dragIndex === hoverIndex) return;

      const hoverBoundingRect = ref.current.getBoundingClientRect();
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      const hoverClientY = clientOffset.y - hoverBoundingRect.top;

      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) return;
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) return;

      if (onMove) {
        onMove(dragIndex, hoverIndex);
        item.index = hoverIndex;
      }
    },
    drop: () => {
      // 拖拽完成时的处理
    },
    collect: (monitor) => {
      const item = monitor.getItem();
      let dropPosition = null;
      
      if (item && monitor.isOver() && ref.current) {
        try {
          const rect = ref.current.getBoundingClientRect();
          const clientOffset = monitor.getClientOffset();
          if (rect && clientOffset) {
            const hoverMiddleY = rect.top + rect.height / 2;
            dropPosition = clientOffset.y > hoverMiddleY ? 'bottom' : 'top';
          }
        } catch (error) {
          console.debug('计算拖拽位置失败:', error);
          dropPosition = null;
        }
      }
      
      return {
        isOver: monitor.isOver(),
        canDrop: monitor.canDrop(),
        dropPosition,
      };
    },
  });

  // 合并拖拽引用
  const dragDropRef = (element) => {
    try {
      dragRef(element);
      dropRef(element);
      if (typeof ref === 'function') {
        ref(element);
      } else if (ref && typeof ref === 'object') {
        ref.current = element;
      }
    } catch (error) {
      console.debug('设置拖拽引用失败:', error);
    }
  };

  const handleClick = () => {
    if (bookmark.url) {
      window.open(bookmark.url, '_blank');
    }
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (isPrivate) {
      deletePrivateBookmark(bookmark.id);
    } else {
      deleteBookmark(bookmark.id);
    }
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    setContextMenuPosition({
      x: e.clientX,
      y: e.clientY
    });
    setShowContextMenu(true);
  };

  const handleRename = () => {
    setShowContextMenu(false);
    setShowRenameDialog(true);
  };

  const handleRenameConfirm = async (newTitle) => {
    try {
      await bookmarkService.updateBookmark(bookmark.id, { title: newTitle });
      // 刷新书签数据以反映更改
      await fetchBookmarks();
    } catch (error) {
      console.error('重命名书签失败:', error);
      throw error;
    }
  };

  const dragStyle = {
    opacity: isDragging ? 0.5 : 1,
    transform: isDragging ? 'rotate(5deg)' : 'none',
  };

  const dropIndicatorStyle = {
    position: 'absolute',
    left: 0,
    right: 0,
    height: '2px',
    backgroundColor: '#3b82f6',
    borderRadius: '1px',
    zIndex: 1000,
    [dropPosition === 'top' ? 'top' : 'bottom']: '-1px',
  };

  return (
    <>
      <div 
        ref={dragDropRef}
        data-index={index}
        className={`bookmark-item ${isPrivate ? 'private' : ''} ${isDragging ? 'dragging' : ''} ${isOver && canDrop ? 'drop-target' : ''}`}
        style={dragStyle}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="bookmark-header">
          <div className="bookmark-favicon">
            {faviconUrl && (
              <img 
                src={faviconUrl} 
                alt="" 
                className={`favicon-img ${faviconLoading ? 'loading' : ''}`}
                onLoad={() => setFaviconLoading(false)}
                onError={(e) => {
                  console.debug('图标加载失败，使用默认图标');
                  setFaviconUrl(iconService.getDefaultIcon());
                  setFaviconLoading(false);
                }}
              />
            )}
            {faviconLoading && (
              <span className="favicon-loading">
                📊
              </span>
            )}
            {/* 刷新图标按钮 - 当图标是默认图标且鼠标悬停时显示 */}
            {isHovered && iconService.isDefaultIcon(faviconUrl) && !faviconLoading && (
              <button 
                className="favicon-refresh-btn"
                onClick={handleRefreshIcon}
                title="刷新图标"
              >
                🔄
              </button>
            )}
          </div>
          
          {bookmark.url && (
            <p className="bookmark-url" title={bookmark.url}>
              {new URL(bookmark.url).hostname}
            </p>
          )}
        </div>
        
        <div className="bookmark-info">
          <h3 className="bookmark-title" title={bookmark.title}>
            {bookmark.title}
          </h3>
        </div>

        {isHovered && (
          <div className="bookmark-actions">
            <button 
              onClick={handleDelete}
              className="btn-icon bookmark-delete"
              title="删除书签"
            >
              🗑️
            </button>
          </div>
        )}

        {isPrivate && (
          <div className="private-indicator">
            🔒
          </div>
        )}

        {/* 拖拽指示器 */}
        {dropPosition && (
          <div 
            className="drop-indicator"
            style={dropIndicatorStyle}
          />
        )}
      </div>

      {/* 右键菜单 */}
      {showContextMenu && (
        <div 
          className="bookmark-context-menu"
          style={{
            position: 'fixed',
            left: contextMenuPosition.x,
            top: contextMenuPosition.y,
            zIndex: 3000
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="context-menu-item"
            onClick={handleRename}
          >
            ✏️ 重命名
          </button>
        </div>
      )}

      {/* 重命名对话框 */}
      <RenameDialog
        isOpen={showRenameDialog}
        onClose={() => setShowRenameDialog(false)}
        onConfirm={handleRenameConfirm}
        initialValue={bookmark.title}
        title="重命名书签"
      />
    </>
  );
});

BookmarkItem.displayName = 'BookmarkItem';

export default BookmarkItem; 