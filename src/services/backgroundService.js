/**
 * 背景存储服务
 * 使用chrome.storage API来存储背景数据，避免localStorage的大小限制
 */

class BackgroundService {
  constructor() {
    this.storageKeys = {
      backgroundImage: 'background-image',
      backgroundType: 'background-type'
    };
  }

  /**
   * 保存背景设置
   * @param {string} background - 背景数据（URL或渐变）
   * @param {string} type - 背景类型（'image' 或 'gradient'）
   */
  async saveBackground(background, type) {
    try {
      console.log('💾 backgroundService.saveBackground: 开始保存背景', {
        type: type,
        backgroundSize: background ? background.length : 0,
        backgroundPreview: background ? background.substring(0, 50) + '...' : 'null'
      });
      
      const data = {
        [this.storageKeys.backgroundImage]: background,
        [this.storageKeys.backgroundType]: type
      };

      // 使用chrome.storage.local存储大数据
      if (chrome.storage && chrome.storage.local) {
        console.log('📦 使用 chrome.storage.local 保存背景');
        await chrome.storage.local.set(data);
        console.log('✅ chrome.storage.local 保存成功');
      } else {
        console.log('💾 降级到 localStorage 保存背景');
        // 降级到localStorage（开发环境）
        localStorage.setItem(this.storageKeys.backgroundImage, background);
        localStorage.setItem(this.storageKeys.backgroundType, type);
        console.log('✅ localStorage 保存成功');
      }
    } catch (error) {
      console.error('❌ 保存背景失败:', error);
      
      // 如果是配额超限错误，尝试压缩图片
      if (error.name === 'QuotaExceededError' && type === 'image') {
        console.log('🗜️ 配额超限，尝试压缩图片');
        try {
          const compressedImage = await this.compressImage(background);
          const data = {
            [this.storageKeys.backgroundImage]: compressedImage,
            [this.storageKeys.backgroundType]: type
          };
          
          if (chrome.storage && chrome.storage.local) {
            await chrome.storage.local.set(data);
            console.log('✅ 压缩后的图片保存到 chrome.storage 成功');
          } else {
            localStorage.setItem(this.storageKeys.backgroundImage, compressedImage);
            localStorage.setItem(this.storageKeys.backgroundType, type);
            console.log('✅ 压缩后的图片保存到 localStorage 成功');
          }
        } catch (compressError) {
          console.error('❌ 压缩图片失败:', compressError);
          throw new Error('图片过大，无法保存。请选择更小的图片。');
        }
      } else {
        throw error;
      }
    }
  }

  /**
   * 获取背景设置
   * @returns {Promise<{background: string, type: string}>}
   */
  async getBackground() {
    try {
      console.log('🔍 backgroundService.getBackground: 开始获取背景设置');
      
      if (chrome.storage && chrome.storage.local) {
        console.log('📦 使用 chrome.storage.local 获取背景');
        const result = await chrome.storage.local.get([
          this.storageKeys.backgroundImage,
          this.storageKeys.backgroundType
        ]);
        
        console.log('📦 chrome.storage 结果:', {
          keys: Object.keys(result),
          backgroundImageExists: !!result[this.storageKeys.backgroundImage],
          backgroundType: result[this.storageKeys.backgroundType],
          backgroundSize: result[this.storageKeys.backgroundImage] ? result[this.storageKeys.backgroundImage].length : 0
        });
        
        return {
          background: result[this.storageKeys.backgroundImage] || null,
          type: result[this.storageKeys.backgroundType] || 'gradient'
        };
      } else {
        console.log('💾 降级到 localStorage');
        // 降级到localStorage（开发环境）
        const background = localStorage.getItem(this.storageKeys.backgroundImage);
        const type = localStorage.getItem(this.storageKeys.backgroundType) || 'gradient';
        
        console.log('💾 localStorage 结果:', {
          backgroundExists: !!background,
          backgroundType: type,
          backgroundSize: background ? background.length : 0
        });
        
        return {
          background: background,
          type: type
        };
      }
    } catch (error) {
      console.error('❌ 获取背景失败:', error);
      return { background: null, type: 'gradient' };
    }
  }

  /**
   * 清除背景设置
   */
  async clearBackground() {
    try {
      if (chrome.storage && chrome.storage.local) {
        await chrome.storage.local.remove([
          this.storageKeys.backgroundImage,
          this.storageKeys.backgroundType
        ]);
      } else {
        localStorage.removeItem(this.storageKeys.backgroundImage);
        localStorage.removeItem(this.storageKeys.backgroundType);
      }
    } catch (error) {
      console.error('清除背景失败:', error);
    }
  }

  /**
   * 压缩图片
   * @param {string} dataUrl - 原始图片数据URL
   * @param {number} quality - 压缩质量 (0-1)
   * @returns {Promise<string>} 压缩后的图片数据URL
   */
  async compressImage(dataUrl, quality = 0.7) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // 计算新尺寸（最大1920x1080）
        const maxWidth = 1920;
        const maxHeight = 1080;
        let { width, height } = img;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // 绘制并压缩
        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        
        resolve(compressedDataUrl);
      };
      
      img.onerror = () => reject(new Error('图片加载失败'));
      img.src = dataUrl;
    });
  }

  /**
   * 验证图片大小
   * @param {string} dataUrl - 图片数据URL
   * @returns {boolean} 是否在大小限制内
   */
  validateImageSize(dataUrl) {
    // 估算base64数据大小（约为原始大小的4/3）
    const sizeInBytes = (dataUrl.length * 3) / 4;
    const maxSize = 5 * 1024 * 1024; // 5MB
    
    return sizeInBytes <= maxSize;
  }
}

const backgroundService = new BackgroundService();
export default backgroundService; 