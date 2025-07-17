import React from 'react';
import { createRoot } from 'react-dom/client';
import useBookmarkStore from '../store/bookmarkStore.js';
import { VERSION_DISPLAY } from '../config/version.js';

const Popup = () => {
  const openNewTab = () => {
    chrome.tabs.create({ url: 'chrome://newtab/' });
    window.close();
  };

  return (
    <div style={{ padding: '20px', minWidth: '280px' }}>
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: '0 0 10px 0', color: '#0078d4' }}>
          FavouriteEdge
        </h2>
        <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>
          智能书签管理器
        </p>
      </div>
      
      <button
        onClick={openNewTab}
        style={{
          width: '100%',
          padding: '12px',
          background: '#0078d4',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: '500'
        }}
      >
        打开书签管理器
      </button>
      
              <div style={{ marginTop: '15px', fontSize: '12px', color: '#999', textAlign: 'center' }}>
          版本 {VERSION_DISPLAY}
        </div>
    </div>
  );
};

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('popup-root');
  if (container) {
    const root = createRoot(container);
    root.render(<Popup />);
  }
}); 