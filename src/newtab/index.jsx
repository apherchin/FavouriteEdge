/**
 * FavouriteEdge 新标签页入口文件
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import '../styles/global.css';

// 等待 DOM 加载完成
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('root');
  
  if (container) {
    const root = createRoot(container);
    root.render(<App />);
  } else {
    console.error('找不到根容器元素');
  }
}); 