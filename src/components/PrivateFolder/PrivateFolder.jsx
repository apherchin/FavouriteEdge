import React, { useState, useEffect } from 'react';
import privateService from '../../services/privateService.js';
import './PrivateFolder.css';

const PrivateFolder = ({ onClose, onAccess }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [defaultPIN, setDefaultPIN] = useState('');
  const [showChangePIN, setShowChangePIN] = useState(false);
  const [currentPIN, setCurrentPIN] = useState('');
  const [newPIN, setNewPIN] = useState('');

  // 检查是否首次使用
  useEffect(() => {
    const checkFirstTime = async () => {
      const isPinSet = await privateService.isPINSet();
      setIsFirstTime(!isPinSet);
      
      if (!isPinSet) {
        // 首次使用，设置默认PIN
        try {
          const defaultPin = await privateService.setDefaultPIN();
          setDefaultPIN(defaultPin);
        } catch (error) {
          setError('初始化失败，请重试');
        }
      }
    };
    checkFirstTime();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!pin.trim()) {
      setError('请输入PIN码');
      return;
    }

    if (pin.length < 4) {
      setError('PIN码长度至少为4位');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // 创建私密会话
      const session = await privateService.createSession(pin);
      
      if (session) {
        onAccess(true);
      } else {
        setError('PIN码错误');
        setPin('');
      }
    } catch (error) {
      setError(error.message || 'PIN验证失败');
      setPin('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePIN = async (e) => {
    e.preventDefault();
    
    if (!currentPIN.trim() || !newPIN.trim()) {
      setError('请填写所有字段');
      return;
    }

    if (newPIN.length < 4) {
      setError('新PIN码长度至少为4位');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await privateService.changePIN(currentPIN, newPIN);
      setShowChangePIN(false);
      setCurrentPIN('');
      setNewPIN('');
      setError('');
      alert('PIN码修改成功！');
    } catch (error) {
      setError(error.message || 'PIN码修改失败');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content private-folder-modal">
        <div className="modal-header">
          <h2>🔒 私密书签</h2>
          <button onClick={onClose} className="btn-icon">
            ✕
          </button>
        </div>
        
        <div className="modal-body">
          {!showChangePIN ? (
            <>
              <p className="private-description">
                {isFirstTime ? 
                  `系统已为您生成默认PIN码：${defaultPIN}` : 
                  '请输入PIN码以访问您的私密书签'
                }
              </p>
              
              {isFirstTime && defaultPIN && (
                <div className="default-pin-notice">
                  <p>🔑 <strong>默认PIN码：{defaultPIN}</strong></p>
                  <p className="text-sm">请记住此PIN码，建议首次登录后立即修改</p>
                </div>
              )}
              
              <form onSubmit={handleSubmit} className="pin-form">
                <input
                  type="password"
                  placeholder="输入PIN码"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="pin-input"
                  maxLength="8"
                  autoFocus
                />
                
                {error && (
                  <div className="error-message">
                    {error}
                  </div>
                )}
                
                <div className="pin-actions">
                  <button 
                    type="button" 
                    onClick={onClose}
                    className="btn-secondary"
                  >
                    取消
                  </button>
                  <button 
                    type="submit" 
                    className="btn-primary"
                    disabled={isLoading || !pin.trim() || pin.length < 4}
                  >
                    {isLoading ? '验证中...' : '确认'}
                  </button>
                </div>
              </form>

              {!isFirstTime && (
                <div className="pin-change-section">
                  <button 
                    type="button"
                    onClick={() => setShowChangePIN(true)}
                    className="btn-link"
                  >
                    修改PIN码
                  </button>
                </div>
              )}
              
              <div className="pin-hint">
                <p className="text-sm text-muted">
                  {isFirstTime ? 
                    '💡 首次使用系统自动生成PIN码，建议登录后立即修改' : 
                    '🔒 PIN码验证失败3次将暂时锁定访问'
                  }
                </p>
              </div>
            </>
          ) : (
            <>
              <p className="private-description">修改PIN码</p>
              
              <form onSubmit={handleChangePIN} className="pin-form">
                <input
                  type="password"
                  placeholder="当前PIN码"
                  value={currentPIN}
                  onChange={(e) => setCurrentPIN(e.target.value)}
                  className="pin-input"
                  maxLength="8"
                  autoFocus
                />
                
                <input
                  type="password"
                  placeholder="新PIN码（至少4位）"
                  value={newPIN}
                  onChange={(e) => setNewPIN(e.target.value)}
                  className="pin-input"
                  maxLength="8"
                />
                
                {error && (
                  <div className="error-message">
                    {error}
                  </div>
                )}
                
                <div className="pin-actions">
                  <button 
                    type="button" 
                    onClick={() => {
                      setShowChangePIN(false);
                      setCurrentPIN('');
                      setNewPIN('');
                      setError('');
                    }}
                    className="btn-secondary"
                  >
                    取消
                  </button>
                  <button 
                    type="submit" 
                    className="btn-primary"
                    disabled={isLoading || !currentPIN.trim() || !newPIN.trim() || newPIN.length < 4}
                  >
                    {isLoading ? '修改中...' : '确认修改'}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PrivateFolder; 