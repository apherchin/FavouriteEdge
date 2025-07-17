import React, { useState, useEffect } from 'react';
import backgroundService from '../../services/backgroundService.js';
import './BackgroundManager.css';

const BackgroundManager = ({ isOpen, onClose }) => {
  const [currentBackground, setCurrentBackground] = useState('');
  const [backgroundType, setBackgroundType] = useState('gradient'); // 'gradient' | 'image'
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  // 预设渐变背景
  const presetGradients = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
  ];

  useEffect(() => {
    // 从存储加载当前背景设置
    const loadBackground = async () => {
      try {
        const { background, type } = await backgroundService.getBackground();
        
        if (background) {
          setCurrentBackground(background);
          setBackgroundType(type);
        } else {
          // 默认渐变背景
          setCurrentBackground(presetGradients[0]);
          setBackgroundType('gradient');
        }
      } catch (error) {
        console.error('加载背景失败:', error);
        setCurrentBackground(presetGradients[0]);
        setBackgroundType('gradient');
      }
    };

    loadBackground();
  }, []);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // 重置错误状态
    setError('');

    // 检查文件类型
    if (!file.type.startsWith('image/')) {
      setError('请选择图片文件');
      return;
    }

    // 检查文件大小 (最大5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('图片文件大小不能超过5MB');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const imageUrl = e.target.result;
          
          // 验证图片大小
          if (!backgroundService.validateImageSize(imageUrl)) {
            throw new Error('图片过大，请选择更小的图片');
          }

          // 立即更新状态
          setCurrentBackground(imageUrl);
          setBackgroundType('image');
          
          // 立即保存到存储
          await backgroundService.saveBackground(imageUrl, 'image');
          
          // 立即应用背景
          applyBackground(imageUrl, 'image');
          
          // 确保背景已应用后再完成上传
          setTimeout(() => {
            setIsUploading(false);
            setUploadProgress(100);
          }, 200);
          
        } catch (error) {
          console.error('处理图片失败:', error);
          setError(error.message || '图片处理失败');
          setIsUploading(false);
        }
      };

      reader.onprogress = (e) => {
        if (e.lengthComputable) {
          const progress = (e.loaded / e.total) * 100;
          setUploadProgress(progress);
        }
      };

      reader.onerror = () => {
        setError('图片读取失败');
        setIsUploading(false);
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error('上传图片失败:', error);
      setError(error.message || '上传失败');
      setIsUploading(false);
    }
  };

  const handleGradientSelect = async (gradient) => {
    try {
      // 立即更新状态
      setCurrentBackground(gradient);
      setBackgroundType('gradient');
      
      // 立即保存到存储
      await backgroundService.saveBackground(gradient, 'gradient');
      
      // 立即应用背景
      applyBackground(gradient, 'gradient');
    } catch (error) {
      console.error('设置渐变背景失败:', error);
      setError('设置背景失败');
    }
  };

  const applyBackground = (background, type) => {
    const body = document.body;
    const app = document.querySelector('.app');
    
    // 强制清除之前的背景样式
    body.style.removeProperty('background');
    body.style.removeProperty('background-image');
    body.style.removeProperty('background-color');
    if (app) {
      app.style.removeProperty('background');
      app.style.removeProperty('background-image');
      app.style.removeProperty('background-color');
    }
    
    // 应用新背景
    if (type === 'image') {
      const backgroundStyle = `url(${background}) center center / cover no-repeat`;
      body.style.setProperty('background', backgroundStyle, 'important');
      body.style.setProperty('background-attachment', 'fixed', 'important');
      if (app) {
        app.style.setProperty('background', backgroundStyle, 'important');
        app.style.setProperty('background-attachment', 'fixed', 'important');
      }
    } else {
      body.style.setProperty('background', background, 'important');
      if (app) {
        app.style.setProperty('background', background, 'important');
      }
    }
    
    // 添加背景加载完成标识
    body.classList.add('background-loaded');
    if (app) {
      app.classList.add('background-loaded');
    }
    
    // 触发强制重绘
    body.offsetHeight;
    if (app) {
      app.offsetHeight;
    }
  };

  const handleReset = async () => {
    try {
      const defaultGradient = presetGradients[0];
      setCurrentBackground(defaultGradient);
      setBackgroundType('gradient');
      
      // 清除存储
      await backgroundService.clearBackground();
      
      // 应用默认背景
      applyBackground(defaultGradient, 'gradient');
    } catch (error) {
      console.error('重置背景失败:', error);
      setError('重置失败');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="background-manager-overlay" onClick={onClose}>
      <div className="background-manager" onClick={(e) => e.stopPropagation()}>
        <div className="background-manager-header">
          <h2>背景设置</h2>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>

        <div className="background-manager-content">
          {/* 错误提示 */}
          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              <span>{error}</span>
              <button 
                className="error-close" 
                onClick={() => setError('')}
                title="关闭"
              >
                ×
              </button>
            </div>
          )}

          {/* 背景类型选择 */}
          <div className="background-type-selector">
            <button 
              className={`type-btn ${backgroundType === 'gradient' ? 'active' : ''}`}
              onClick={() => setBackgroundType('gradient')}
            >
              <span className="type-icon">🎨</span>
              渐变背景
            </button>
            <button 
              className={`type-btn ${backgroundType === 'image' ? 'active' : ''}`}
              onClick={() => setBackgroundType('image')}
            >
              <span className="type-icon">🖼️</span>
              图片背景
            </button>
          </div>

          {/* 渐变背景选择 */}
          {backgroundType === 'gradient' && (
            <div className="gradient-section">
              <h3>选择渐变背景</h3>
              <div className="gradient-grid">
                {presetGradients.map((gradient, index) => (
                  <button
                    key={index}
                    className={`gradient-option ${currentBackground === gradient ? 'active' : ''}`}
                    style={{ background: gradient }}
                    onClick={() => handleGradientSelect(gradient)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 图片背景上传 */}
          {backgroundType === 'image' && (
            <div className="image-section">
              <h3>上传背景图片</h3>
              <div className="upload-area">
                <input
                  type="file"
                  id="background-upload"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="upload-input"
                />
                <label htmlFor="background-upload" className="upload-label">
                  <span className="upload-icon">📁</span>
                  <span>选择图片文件</span>
                  <span className="upload-hint">支持 JPG、PNG、GIF 格式，最大5MB</span>
                </label>
              </div>

              {isUploading && (
                <div className="upload-progress">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <span className="progress-text">{Math.round(uploadProgress)}%</span>
                </div>
              )}

              {currentBackground && backgroundType === 'image' && (
                <div className="current-background">
                  <h4>当前背景预览</h4>
                  <div 
                    className="background-preview"
                    style={{ backgroundImage: `url(${currentBackground})` }}
                  />
                </div>
              )}
            </div>
          )}

          {/* 操作按钮 */}
          <div className="background-actions">
            <button className="btn-reset" onClick={handleReset}>
              重置为默认
            </button>
            <button className="btn-apply" onClick={onClose}>
              应用设置
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BackgroundManager; 