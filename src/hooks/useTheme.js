import { useState, useEffect } from 'react';

const useTheme = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  // 从存储中加载主题设置
  const loadTheme = async () => {
    try {
      if (chrome && chrome.storage && chrome.storage.local) {
        const result = await chrome.storage.local.get(['theme-mode']);
        const saved = result['theme-mode'];
        setIsDarkMode(saved === 'dark');
      } else {
        // 降级到localStorage
        const saved = localStorage.getItem('theme-mode');
        setIsDarkMode(saved === 'dark');
      }
    } catch (error) {
      console.error('加载主题设置失败:', error);
      setIsDarkMode(false);
    }
  };

  // 保存主题设置
  const saveTheme = async (darkMode) => {
    try {
      const themeMode = darkMode ? 'dark' : 'light';
      if (chrome && chrome.storage && chrome.storage.local) {
        await chrome.storage.local.set({ 'theme-mode': themeMode });
      } else {
        // 降级到localStorage
        localStorage.setItem('theme-mode', themeMode);
      }
    } catch (error) {
      console.error('保存主题设置失败:', error);
    }
  };

  // 应用主题样式
  const applyTheme = (darkMode) => {
    const root = document.documentElement;
    if (darkMode) {
      // 深色主题
      root.style.setProperty('--bg-primary', '#1a1a1a');
      root.style.setProperty('--bg-secondary', '#2d2d2d');
      root.style.setProperty('--bg-tertiary', '#3d3d3d');
      root.style.setProperty('--text-primary', '#ffffff');
      root.style.setProperty('--text-secondary', '#e0e0e0');
      root.style.setProperty('--text-muted', '#b0b0b0');
      root.style.setProperty('--border-color', '#404040');
      root.style.setProperty('--border-hover', '#505050');
      root.classList.add('dark-theme');
    } else {
      // 浅色主题
      root.style.setProperty('--bg-primary', '#ffffff');
      root.style.setProperty('--bg-secondary', '#f8f9fa');
      root.style.setProperty('--bg-tertiary', '#f3f2f1');
      root.style.setProperty('--text-primary', '#323130');
      root.style.setProperty('--text-secondary', '#605e5c');
      root.style.setProperty('--text-muted', '#8a8886');
      root.style.setProperty('--border-color', '#edebe9');
      root.style.setProperty('--border-hover', '#d1cfce');
      root.classList.remove('dark-theme');
    }
  };

  // 切换主题
  const toggleTheme = async () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    applyTheme(newDarkMode);
    await saveTheme(newDarkMode);
  };

  // 初始化主题
  useEffect(() => {
    loadTheme();
  }, []);

  // 应用主题变化
  useEffect(() => {
    applyTheme(isDarkMode);
  }, [isDarkMode]);

  return {
    isDarkMode,
    toggleTheme
  };
};

export default useTheme; 