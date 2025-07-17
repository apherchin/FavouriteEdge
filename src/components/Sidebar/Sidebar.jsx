import React, { useState, useEffect, useRef } from 'react';
import { useDrop, useDrag } from 'react-dnd';
import useBookmarkStore from '../../store/bookmarkStore.js';
import { DragTypes, canDropToFolder } from '../../utils/dragHelper.js';
import { VERSION_DISPLAY } from '../../config/version.js';
import SearchBar from '../SearchBar/SearchBar.jsx';
import BackgroundManager from '../BackgroundManager/BackgroundManager.jsx';
import './Sidebar.css';

const Sidebar = ({ currentView, onViewChange, stats }) => {
  const { folders, addFolder, deleteFolder, renameFolder, moveBookmarkToFolder, convertBookmarkToPrivate, convertPrivateToBookmark, reorderFolders } = useBookmarkStore();
  const [showFolderMenu, setShowFolderMenu] = useState(null);
  const [editingFolder, setEditingFolder] = useState(null);
  const [folderName, setFolderName] = useState('');
  const [dragOverFolder, setDragOverFolder] = useState(null);
  const [showBackgroundManager, setShowBackgroundManager] = useState(false);
  const dragOverTimeoutRef = useRef(null);

  const menuItems = [
    {
      id: 'bookmarks',
      label: '我的书签',
      icon: '📚',
      count: stats.chrome || 0
    },
    {
      id: 'private',
      label: '私密书签',
      icon: '🔒',
      count: stats.private || 0
    },
    {
      id: 'recycle',
      label: '回收站',
      icon: '🗑️',
      count: stats.deleted || 0
    }
  ];

  const handleAddFolder = async () => {
    const name = prompt('请输入文件夹名称:');
    if (name && name.trim()) {
      try {
        await addFolder(name.trim());
      } catch (error) {
        alert('创建文件夹失败: ' + error.message);
      }
    }
  };

  const handleDeleteFolder = async (folderId) => {
    if (confirm('确定删除此文件夹吗？文件夹中的书签将移动到主列表。')) {
      try {
        await deleteFolder(folderId);
        setShowFolderMenu(null);
      } catch (error) {
        alert('删除文件夹失败: ' + error.message);
      }
    }
  };

  const handleRenameFolder = async (folderId) => {
    const folder = folders.find(f => f.id === folderId);
    const newName = prompt('请输入新的文件夹名称:', folder?.title);
    if (newName && newName.trim() && newName !== folder?.title) {
      try {
        await renameFolder(folderId, newName.trim());
        setShowFolderMenu(null);
      } catch (error) {
        alert('重命名文件夹失败: ' + error.message);
      }
    }
  };

  const handleFolderRightClick = (e, folderId) => {
    e.preventDefault();
    setShowFolderMenu(folderId);
  };

  // 处理拖拽到文件夹
  const handleDropToFolder = async (folderId, dragItem) => {
    try {
      if (folderId === 'private') {
        // 拖拽到私密区域
        if (dragItem.type === DragTypes.BOOKMARK) {
          // 普通书签转换为私密书签
          await convertBookmarkToPrivate(dragItem.id);
        }
        // 私密书签拖拽到私密区域不需要特殊处理
      } else {
        // 拖拽到普通文件夹
        if (dragItem.type === DragTypes.PRIVATE_BOOKMARK) {
          // 私密书签转换为普通书签并移动到指定文件夹
          await convertPrivateToBookmark(dragItem.id, folderId);
        } else if (dragItem.type === DragTypes.BOOKMARK) {
          // 检查是否是相同的文件夹
          if (dragItem.parentId === folderId) {
            console.log('书签已经在目标文件夹中，无需移动');
            setDragOverFolder(null);
            return;
          }
          
          // 普通书签移动到普通文件夹
          await moveBookmarkToFolder(dragItem.id, folderId);
        }
      }
      setDragOverFolder(null);
    } catch (error) {
      console.error('移动书签失败:', error);
      setDragOverFolder(null);
    }
  };

  // 可拖拽文件夹组件
  const DraggableFolderItem = ({ folder, index }) => {
    const ref = useRef(null);

    // 拖拽配置
    const [{ isDragging }, dragRef] = useDrag({
      type: 'FOLDER',
      item: { type: 'FOLDER', id: folder.id, index },
      collect: (monitor) => ({
        isDragging: monitor.isDragging()
      })
    });

    // 放置配置
    const [{ isOver }, dropRef] = useDrop({
      accept: ['FOLDER', DragTypes.BOOKMARK],
      drop: (item, monitor) => {
        if (item.type === 'FOLDER' && item.id !== folder.id) {
          // 文件夹重排序
          const dragIndex = item.index;
          const hoverIndex = index;
          if (dragIndex !== hoverIndex && reorderFolders) {
            reorderFolders(dragIndex, hoverIndex);
          }
        } else if (item.type === DragTypes.BOOKMARK || item.type === DragTypes.PRIVATE_BOOKMARK) {
          // 书签拖拽到文件夹
          if (dragOverTimeoutRef.current) {
            clearTimeout(dragOverTimeoutRef.current);
          }
          setDragOverFolder(null);
          handleDropToFolder(folder.id, item);
          return { folderId: folder.id };
        }
      },
      canDrop: (item) => {
        if (item.type === 'FOLDER') {
          return item.id !== folder.id;
        }
        return canDropToFolder(item, folder.id);
      },
      hover: (item, monitor) => {
        if (item.type !== 'FOLDER' && monitor.canDrop() && monitor.isOver()) {
          // 书签拖拽hover效果
          if (dragOverTimeoutRef.current) {
            clearTimeout(dragOverTimeoutRef.current);
          }
          setDragOverFolder(folder.id);
        }
      },
      collect: (monitor) => ({
        isOver: monitor.isOver()
      })
    });

    // 连接拖拽和放置引用
    dragRef(dropRef(ref));

    return (
      <div 
        ref={ref}
        className={`folder-item-container ${isDragging ? 'dragging' : ''} ${isOver ? 'drag-over' : ''}`}
        onMouseLeave={() => {
          if (dragOverTimeoutRef.current) {
            clearTimeout(dragOverTimeoutRef.current);
          }
          dragOverTimeoutRef.current = setTimeout(() => {
            setDragOverFolder(null);
          }, 100);
        }}
      >
        <button
          className={`sidebar-item folder-item ${currentView === `folder:${folder.id}` ? 'active' : ''} ${dragOverFolder === folder.id ? 'drag-highlight' : ''}`}
          onClick={() => onViewChange(`folder:${folder.id}`)}
          onContextMenu={(e) => handleFolderRightClick(e, folder.id)}
        >
          <span className="sidebar-icon">📁</span>
          <span className="sidebar-label">{folder.title}</span>
          {folder.children && folder.children.length > 0 && (
            <span className="sidebar-count">{folder.children.length}</span>
          )}
        </button>

        {/* 右键菜单 */}
        {showFolderMenu === folder.id && (
          <div className="folder-context-menu" onClick={(e) => e.stopPropagation()}>
            <button 
              className="context-menu-item"
              onClick={() => handleRenameFolder(folder.id)}
            >
              ✏️ 重命名
            </button>
            <button 
              className="context-menu-item delete"
              onClick={() => handleDeleteFolder(folder.id)}
            >
              🗑️ 删除
            </button>
          </div>
        )}
      </div>
    );
  };

  // 文件夹拖拽组件 (为私密书签等保留)
  const FolderDropTarget = ({ folder, children }) => {
    const ref = useRef(null);

    const [{ isOver, canDrop }, drop] = useDrop({
      accept: DragTypes.BOOKMARK,
      drop: (item) => {
        // 清除hover状态
        if (dragOverTimeoutRef.current) {
          clearTimeout(dragOverTimeoutRef.current);
        }
        setDragOverFolder(null);
        
        handleDropToFolder(folder.id, item);
        return { folderId: folder.id };
      },
      canDrop: (item) => canDropToFolder(item, folder.id),
      collect: (monitor) => ({
        isOver: monitor.isOver(),
        canDrop: monitor.canDrop()
      }),
      hover: (item, monitor) => {
        if (monitor.canDrop() && monitor.isOver()) {
          // 使用防抖处理hover状态
          if (dragOverTimeoutRef.current) {
            clearTimeout(dragOverTimeoutRef.current);
          }
          setDragOverFolder(folder.id);
        }
      }
    });

    drop(ref);

    return (
      <div 
        ref={ref}
        className={`folder-drop-target ${isOver && canDrop ? 'drag-over' : ''}`}
        data-folder-id={folder.id}
        onMouseLeave={() => {
          // 鼠标离开时延迟清除高亮状态
          if (dragOverTimeoutRef.current) {
            clearTimeout(dragOverTimeoutRef.current);
          }
          dragOverTimeoutRef.current = setTimeout(() => {
            setDragOverFolder(null);
          }, 100);
        }}
      >
        {children}
      </div>
    );
  };

  // 点击其他地方关闭菜单
  useEffect(() => {
    const handleClickOutside = () => {
      setShowFolderMenu(null);
    };
    
    if (showFolderMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showFolderMenu]);

  // 清除拖拽状态
  useEffect(() => {
    return () => {
      if (dragOverTimeoutRef.current) {
        clearTimeout(dragOverTimeoutRef.current);
      }
    };
  }, []);

  return (
    <aside className="sidebar">
      {/* 搜索栏 */}
      <div className="sidebar-search">
        <SearchBar onViewChange={onViewChange} />
      </div>

      <nav className="sidebar-nav">
        {/* 文件夹标题和添加按钮 */}
        <div className="folders-header">
          <span className="folders-title">文件夹</span>
          <button 
            className="btn-add-folder" 
            onClick={handleAddFolder}
            title="新建文件夹"
          >
            ➕
          </button>
        </div>

        {/* 文件夹列表 - 可滚动 */}
        <div className="folders-container">
          {folders.map((folder, index) => (
            <DraggableFolderItem 
              key={folder.id} 
              folder={folder} 
              index={index}
            />
          ))}
        </div>

        {/* 系统菜单项 */}
        <div className="system-menu-items">
          {menuItems.map(item => {
            // 私密书签项目需要支持拖拽
            if (item.id === 'private') {
              return (
                <FolderDropTarget key={item.id} folder={{id: 'private', title: item.label}}>
                  <button
                    className={`sidebar-item ${currentView === item.id ? 'active' : ''} ${dragOverFolder === 'private' ? 'drag-highlight' : ''}`}
                    onClick={() => onViewChange(item.id)}
                  >
                    <span className="sidebar-icon">{item.icon}</span>
                    <span className="sidebar-label">{item.label}</span>
                    {item.count > 0 && (
                      <span className="sidebar-count">{item.count}</span>
                    )}
                  </button>
                </FolderDropTarget>
              );
            }
            
            // 其他菜单项保持原样
            return (
              <button
                key={item.id}
                className={`sidebar-item ${currentView === item.id ? 'active' : ''}`}
                onClick={() => onViewChange(item.id)}
              >
                <span className="sidebar-icon">{item.icon}</span>
                <span className="sidebar-label">{item.label}</span>
                {item.count > 0 && (
                  <span className="sidebar-count">{item.count}</span>
                )}
              </button>
            );
          })}
        </div>
      </nav>
      
      <div className="sidebar-footer">
        {/* 统计数据 */}
        <div className="sidebar-stats">
          <div className="stat-item">
            <span className="stat-label">总数</span>
            <span className="stat-value">{stats.total}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">文件夹</span>
            <span className="stat-value">{stats.folders}</span>
          </div>
          {stats.deleted > 0 && (
            <div className="stat-item">
              <span className="stat-label">回收站</span>
              <span className="stat-value">{stats.deleted}</span>
            </div>
          )}
        </div>
        
        <div className="sidebar-info">
          <p className="text-sm text-muted">FavouriteEdge {VERSION_DISPLAY}</p>
        </div>
      </div>
      
      {/* 背景管理器 */}
      <BackgroundManager 
        isOpen={showBackgroundManager}
        onClose={() => setShowBackgroundManager(false)}
      />
    </aside>
  );
};

export default Sidebar; 