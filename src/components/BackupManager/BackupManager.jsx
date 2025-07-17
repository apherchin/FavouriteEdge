import React, { useState, useRef } from 'react';
import useBookmarkStore from '../../store/bookmarkStore.js';
import './BackupManager.css';

const BackupManager = ({ onClose }) => {
  const { exportPrivateBookmarks, importPrivateBookmarks, getBackupStats } = useBookmarkStore();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [backupStats, setBackupStats] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

  React.useEffect(() => {
    loadBackupStats();
  }, []);

  const loadBackupStats = async () => {
    try {
      const stats = await getBackupStats();
      setBackupStats(stats);
    } catch (error) {
      console.error('加载备份统计失败:', error);
    }
  };

  const handleExport = async () => {
    if (isExporting) return;

    setIsExporting(true);
    try {
      await exportPrivateBookmarks();
      alert('✅ 私密书签导出成功！请保存好备份文件。');
      await loadBackupStats(); // 刷新统计信息
    } catch (error) {
      alert('❌ 导出失败: ' + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsImporting(true);
    setImportResult(null);

    try {
      const result = await importPrivateBookmarks(file);
      setImportResult(result);
      await loadBackupStats(); // 刷新统计信息
    } catch (error) {
      alert('❌ 导入失败: ' + error.message);
    } finally {
      setIsImporting(false);
      // 清空文件输入
      event.target.value = '';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '从未';
    return new Date(dateString).toLocaleString('zh-CN');
  };

  return (
    <div className="backup-manager-overlay">
      <div className="backup-manager">
        <div className="backup-manager-header">
          <h2>备份管理</h2>
          <button onClick={onClose} className="btn-close">✕</button>
        </div>

        <div className="backup-content">
          <div className="backup-info">
            <div className="info-card">
              <h3>💡 备份说明</h3>
              <p>私密书签备份可以确保您的数据不会因卸载扩展而丢失。备份文件包含：</p>
              <ul>
                <li>所有私密书签</li>
                <li>回收站内容</li>
                <li>元数据信息</li>
              </ul>
            </div>

            {backupStats && (
              <div className="stats-card">
                <h3>📊 当前统计</h3>
                <div className="stats-grid">
                  <div className="stat-item">
                    <span className="stat-label">私密书签：</span>
                    <span className="stat-value">{backupStats.privateBookmarksCount}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">回收站：</span>
                    <span className="stat-value">{backupStats.recycleBinCount}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">上次备份：</span>
                    <span className="stat-value">{formatDate(backupStats.lastBackupDate)}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">上次导入：</span>
                    <span className="stat-value">{formatDate(backupStats.lastImportDate)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="backup-actions">
            <div className="action-section">
              <h3>📤 导出备份</h3>
              <p>将私密书签导出为JSON文件，可以保存到本地或云端。</p>
              <button 
                onClick={handleExport}
                disabled={isExporting}
                className="btn-primary"
              >
                {isExporting ? '正在导出...' : '导出私密书签'}
              </button>
            </div>

            <div className="action-section">
              <h3>📥 导入备份</h3>
              <p>从备份文件恢复私密书签，会与现有数据合并（不会重复）。</p>
              <button 
                onClick={handleImportClick}
                disabled={isImporting}
                className="btn-secondary"
              >
                {isImporting ? '正在导入...' : '选择备份文件'}
              </button>
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </div>
          </div>

          {importResult && (
            <div className="import-result">
              <h3>✅ 导入完成</h3>
              <div className="result-details">
                <p>新导入: {importResult.imported.privateBookmarks} 个私密书签，{importResult.imported.recycleBin} 个回收站项目</p>
                <p>合并后总计: {importResult.merged.totalPrivateBookmarks} 个私密书签，{importResult.merged.totalRecycleBin} 个回收站项目</p>
              </div>
            </div>
          )}
        </div>

        <div className="backup-footer">
          <div className="backup-tips">
            <h4>💡 建议</h4>
            <ul>
              <li>定期导出备份（建议每月一次）</li>
              <li>将备份文件保存到云端存储</li>
              <li>在新设备上安装扩展后导入备份</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BackupManager; 