/**
 * 拖拽辅助工具
 * 提供拖拽操作相关的工具函数
 */

// 拖拽项目类型
export const DragTypes = {
  BOOKMARK: 'bookmark',
  FOLDER: 'folder',
  PRIVATE_BOOKMARK: 'private_bookmark'
};

// 放置目标类型
export const DropTargetTypes = {
  FOLDER: 'folder',
  GRID: 'grid',
  SIDEBAR_FOLDER: 'sidebar_folder'
};

// 拖拽状态
export const DragState = {
  IDLE: 'idle',
  DRAGGING: 'dragging',
  HOVERING: 'hovering'
};

/**
 * 计算拖拽目标位置
 */
export const calculateDropPosition = (monitor, targetRef, threshold = 0.5) => {
  if (!monitor.isOver() || !targetRef.current) {
    return null;
  }

  const dragIndex = monitor.getItem().index;
  const hoverIndex = targetRef.current.dataset.index;

  if (dragIndex === hoverIndex) {
    return null;
  }

  const hoverBoundingRect = targetRef.current.getBoundingClientRect();
  const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
  const clientOffset = monitor.getClientOffset();
  const hoverClientY = clientOffset.y - hoverBoundingRect.top;

  // 确定拖拽方向
  if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY * threshold) {
    return null;
  }

  if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY * (2 - threshold)) {
    return null;
  }

  return {
    dragIndex: parseInt(dragIndex),
    hoverIndex: parseInt(hoverIndex),
    position: hoverClientY < hoverMiddleY ? 'before' : 'after'
  };
};

/**
 * 获取拖拽预览样式
 */
export const getDragPreviewStyle = (isDragging, isOver) => {
  return {
    opacity: isDragging ? 0.5 : 1,
    transform: isDragging ? 'rotate(5deg) scale(1.05)' : 'none',
    border: isOver ? '2px dashed #0078d4' : 'none',
    transition: 'all 0.2s ease'
  };
};

/**
 * 获取拖拽目标指示器样式
 */
export const getDropIndicatorStyle = (position, isActive) => {
  if (!isActive) return { display: 'none' };

  const baseStyle = {
    position: 'absolute',
    width: '100%',
    height: '2px',
    background: '#0078d4',
    borderRadius: '1px',
    zIndex: 1000,
    transition: 'all 0.2s ease'
  };

  if (position === 'before') {
    return { ...baseStyle, top: '-1px' };
  } else {
    return { ...baseStyle, bottom: '-1px' };
  }
};

/**
 * 验证拖拽操作是否有效
 */
export const isValidDrop = (dragItem, targetItem, dropPosition) => {
  // 不能拖拽到自己
  if (dragItem.id === targetItem.id) {
    return false;
  }

  // 文件夹不能拖拽到自己的子项中
  if (dragItem.type === 'folder' && targetItem.parentId === dragItem.id) {
    return false;
  }

  // 私密书签只能在私密区域内移动
  if (dragItem.type === DragTypes.PRIVATE_BOOKMARK && 
      targetItem.type !== DragTypes.PRIVATE_BOOKMARK) {
    return false;
  }

  // 普通书签不能拖拽到私密区域
  if (dragItem.type === DragTypes.BOOKMARK && 
      targetItem.type === DragTypes.PRIVATE_BOOKMARK) {
    return false;
  }

  return true;
};

/**
 * 验证是否可以拖拽到文件夹
 */
export const canDropToFolder = (dragItem, folderId) => {
  // 私密书签可以拖拽到任何地方
  if (dragItem.type === DragTypes.PRIVATE_BOOKMARK) {
    return true; // 允许拖拽到普通文件夹（将转换为普通书签）或私密区域
  }

  // 普通书签可以拖拽到普通文件夹或转换为私密书签
  if (dragItem.type === DragTypes.BOOKMARK) {
    // 不能拖拽到自己所在的文件夹
    if (dragItem.parentId === folderId) {
      return false;
    }
    return true; // 允许拖拽到任何文件夹，包括私密区域
  }

  return false;
};

/**
 * 计算文件夹放置区域
 */
export const calculateFolderDropZone = (monitor, targetRef) => {
  if (!monitor.isOver() || !targetRef.current) {
    return null;
  }

  const hoverBoundingRect = targetRef.current.getBoundingClientRect();
  const clientOffset = monitor.getClientOffset();
  
  // 检查是否在文件夹区域内
  const isInFolder = clientOffset.x >= hoverBoundingRect.left &&
                    clientOffset.x <= hoverBoundingRect.right &&
                    clientOffset.y >= hoverBoundingRect.top &&
                    clientOffset.y <= hoverBoundingRect.bottom;

  return isInFolder ? { targetId: targetRef.current.dataset.folderId } : null;
};

/**
 * 计算新的排序索引
 */
export const calculateNewIndex = (items, dragIndex, hoverIndex, position) => {
  let newIndex;

  if (position === 'before') {
    newIndex = hoverIndex;
  } else {
    newIndex = hoverIndex + 1;
  }

  // 如果从前面拖到后面，需要减1
  if (dragIndex < newIndex) {
    newIndex -= 1;
  }

  return Math.max(0, Math.min(newIndex, items.length - 1));
};

/**
 * 重新排序数组
 */
export const reorderArray = (array, fromIndex, toIndex) => {
  const result = Array.from(array);
  const [removed] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, removed);
  return result;
};

/**
 * 创建拖拽数据
 */
export const createDragItem = (bookmark, index, type = DragTypes.BOOKMARK) => {
  return {
    id: bookmark.id,
    index,
    type,
    title: bookmark.title,
    url: bookmark.url,
    parentId: bookmark.parentId,
    originalData: bookmark
  };
};

/**
 * 获取拖拽收集器函数
 */
export const createDragCollect = (monitor) => ({
  isDragging: monitor.isDragging(),
  dragItem: monitor.getItem(),
  dragType: monitor.getItemType()
});

/**
 * 获取放置收集器函数
 */
export const createDropCollect = (monitor) => ({
  isOver: monitor.isOver(),
  isOverCurrent: monitor.isOver({ shallow: true }),
  canDrop: monitor.canDrop(),
  dragItem: monitor.getItem(),
  dragType: monitor.getItemType()
});

/**
 * 处理拖拽开始事件
 */
export const handleDragStart = (item, monitor) => {
  // 可以在这里添加拖拽开始的副作用
  console.log('开始拖拽:', item);
};

/**
 * 处理拖拽结束事件
 */
export const handleDragEnd = (item, monitor) => {
  const dropResult = monitor.getDropResult();
  
  if (dropResult) {
    console.log('拖拽完成:', item, dropResult);
  } else {
    console.log('拖拽取消:', item);
  }
};

/**
 * 生成拖拽唯一ID
 */
export const generateDragId = () => {
  return `drag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * 拖拽性能优化：节流函数
 */
export const throttle = (func, delay) => {
  let timeoutId;
  let lastExecTime = 0;
  
  return function (...args) {
    const currentTime = Date.now();
    
    if (currentTime - lastExecTime > delay) {
      func.apply(this, args);
      lastExecTime = currentTime;
    } else {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        func.apply(this, args);
        lastExecTime = Date.now();
      }, delay - (currentTime - lastExecTime));
    }
  };
}; 