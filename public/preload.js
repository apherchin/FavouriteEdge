// 预加载背景设置
(async function() {
    try {
        let savedBackground = null;
        let savedType = 'gradient';
        let storageAvailable = false;

        // 检查Chrome API是否可用的辅助函数
        const checkChromeAPI = (apiPath) => {
            try {
                if (typeof chrome === 'undefined') return false;
                
                const pathParts = apiPath.split('.');
                let current = chrome;
                for (const part of pathParts) {
                    if (!current || !current[part]) {
                        return false;
                    }
                    current = current[part];
                }
                return true;
            } catch (error) {
                return false;
            }
        };

        // 尝试从chrome.storage获取
        if (checkChromeAPI('storage.local.get')) {
            try {
                const result = await chrome.storage.local.get(['background-image', 'background-type']);
                savedBackground = result['background-image'];
                savedType = result['background-type'] || 'gradient';
                storageAvailable = true;
                console.debug('Chrome storage 加载背景:', savedType, savedBackground ? '有图片' : '无图片');
            } catch (error) {
                console.debug('Chrome storage不可用，使用localStorage:', error.message);
            }
        }

        // 降级到localStorage
        if (!storageAvailable || !savedBackground) {
            try {
                savedBackground = localStorage.getItem('background-image');
                savedType = localStorage.getItem('background-type') || 'gradient';
                console.debug('LocalStorage 加载背景:', savedType, savedBackground ? '有图片' : '无图片');
            } catch (error) {
                console.debug('LocalStorage不可用:', error.message);
            }
        }
        
        if (savedBackground) {
            const applyBackground = (background, type) => {
                try {
                    const body = document.body;
                    const html = document.documentElement;
                    
                    // 清除之前的背景样式
                    [body, html].forEach(element => {
                        if (element) {
                            element.style.removeProperty('background');
                            element.style.removeProperty('background-image');
                            element.style.removeProperty('background-color');
                            element.classList.remove('background-loaded');
                        }
                    });
                    
                    if (type === 'image') {
                        const backgroundProps = {
                            'background-image': `url(${background})`,
                            'background-size': 'cover',
                            'background-position': 'center center',
                            'background-repeat': 'no-repeat',
                            'background-attachment': 'fixed'
                        };
                        
                        [body, html].forEach(element => {
                            if (element) {
                                Object.entries(backgroundProps).forEach(([prop, value]) => {
                                    element.style.setProperty(prop, value, 'important');
                                });
                                element.classList.add('background-loaded');
                            }
                        });
                    } else {
                        [body, html].forEach(element => {
                            if (element) {
                                element.style.setProperty('background', background, 'important');
                                element.classList.add('background-loaded');
                            }
                        });
                    }
                    
                    // 触发重绘
                    body.offsetHeight;
                } catch (error) {
                    console.debug('应用背景失败:', error.message);
                }
            };
            
            // 立即应用背景
            applyBackground(savedBackground, savedType);
            
            // 等待DOM加载完成后确保.app元素有正确的背景设置
            const applyToApp = () => {
                try {
                    const app = document.querySelector('.app');
                    if (app) {
                        // 设置app容器为透明，让背景通过body显示
                        app.style.setProperty('background', 'transparent', 'important');
                        app.classList.add('background-loaded');
                        console.debug('背景已应用到.app元素');
                    }
                } catch (error) {
                    console.debug('应用背景到app元素失败:', error.message);
                }
            };
            
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', applyToApp);
            } else {
                applyToApp();
            }
            
            // 额外的保险措施：延迟再次应用
            setTimeout(applyToApp, 100);
            setTimeout(applyToApp, 500);
        } else {
            console.debug('没有保存的背景，使用默认背景');
        }
    } catch (error) {
        console.debug('预加载背景失败:', error.message);
    }
})(); 