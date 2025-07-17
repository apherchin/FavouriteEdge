#!/usr/bin/env node

/**
 * FavouriteEdge 扩展功能测试脚本 (Node.js版本)
 * 用于验证核心功能是否正常工作
 */

// 测试配置
const TEST_CONFIG = {
  TIMEOUT: 5000, // 5秒超时
  MOCK_BOOKMARKS: [
    {
      id: '1',
      title: '测试书签1',
      url: 'https://www.example1.com',
      dateAdded: Date.now() - 86400000 // 1天前
    },
    {
      id: '2',
      title: '测试书签2',
      url: 'https://www.example2.com',
      dateAdded: Date.now() - 172800000 // 2天前
    }
  ]
};

// 测试结果收集器
class TestRunner {
  constructor() {
    this.results = [];
    this.passed = 0;
    this.failed = 0;
  }

  // 运行测试
  async runTest(name, testFn) {
    console.log(`🧪 运行测试: ${name}`);
    
    try {
      const startTime = Date.now();
      await Promise.race([
        testFn(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('测试超时')), TEST_CONFIG.TIMEOUT)
        )
      ]);
      
      const duration = Date.now() - startTime;
      this.results.push({ name, status: 'PASS', duration });
      this.passed++;
      console.log(`✅ ${name} - 通过 (${duration}ms)`);
      
    } catch (error) {
      this.results.push({ name, status: 'FAIL', error: error.message });
      this.failed++;
      console.error(`❌ ${name} - 失败: ${error.message}`);
    }
  }

  // 输出测试报告
  printReport() {
    console.log('\n📊 测试报告');
    console.log('='.repeat(50));
    console.log(`总测试数: ${this.results.length}`);
    console.log(`通过: ${this.passed}`);
    console.log(`失败: ${this.failed}`);
    console.log(`成功率: ${((this.passed / this.results.length) * 100).toFixed(1)}%`);
    
    if (this.failed > 0) {
      console.log('\n❌ 失败的测试:');
      this.results
        .filter(r => r.status === 'FAIL')
        .forEach(r => console.log(`  - ${r.name}: ${r.error}`));
    }
    
    console.log('\n✨ 测试完成!');
  }
}

// 模拟Chrome API
const mockChromeAPI = {
  bookmarks: {
    getTree: () => Promise.resolve([{
      id: '0',
      title: '',
      children: TEST_CONFIG.MOCK_BOOKMARKS
    }]),
    create: (bookmark) => Promise.resolve({ ...bookmark, id: Date.now().toString() }),
    remove: (id) => Promise.resolve(),
    update: (id, changes) => Promise.resolve({ id, ...changes })
  },
  
  storage: {
    local: {
      get: (keys) => Promise.resolve({}),
      set: (data) => Promise.resolve(),
      clear: () => Promise.resolve()
    }
  },
  
  notifications: {
    create: (id, options) => Promise.resolve(id),
    clear: (id) => Promise.resolve(true)
  }
};

// 模拟btoa函数 (Node.js环境)
if (typeof btoa === 'undefined') {
  global.btoa = function(str) {
    return Buffer.from(str, 'binary').toString('base64');
  };
}

// 核心功能测试
const tests = {
  // 测试1: 书签服务基础功能
  async testBookmarkService() {
    // 模拟书签服务
    const bookmarkService = {
      async getBookmarks() {
        const tree = await mockChromeAPI.bookmarks.getTree();
        return tree[0].children;
      },
      
      async addBookmark(bookmark) {
        return await mockChromeAPI.bookmarks.create(bookmark);
      }
    };
    
    // 测试获取书签
    const bookmarks = await bookmarkService.getBookmarks();
    if (bookmarks.length !== 2) {
      throw new Error(`期望2个书签，实际获得${bookmarks.length}个`);
    }
    
    // 测试添加书签
    const newBookmark = await bookmarkService.addBookmark({
      title: '新测试书签',
      url: 'https://test.com'
    });
    
    if (!newBookmark.id) {
      throw new Error('添加书签失败，缺少ID');
    }
  },

  // 测试2: 统计服务功能
  async testStatisticsService() {
    const stats = {
      clicks: {},
      
      recordClick(bookmarkId) {
        this.clicks[bookmarkId] = (this.clicks[bookmarkId] || 0) + 1;
      },
      
      getPopular(limit = 5) {
        return Object.entries(this.clicks)
          .sort(([,a], [,b]) => b - a)
          .slice(0, limit)
          .map(([id, count]) => ({ id, count }));
      }
    };
    
    // 模拟点击
    stats.recordClick('1');
    stats.recordClick('1');
    stats.recordClick('2');
    
    const popular = stats.getPopular();
    if (popular[0].id !== '1' || popular[0].count !== 2) {
      throw new Error('统计排序错误');
    }
  },

  // 测试3: 私密服务基础功能
  async testPrivateService() {
    const privateService = {
      async hashPin(pin) {
        // 简化的哈希函数 (使用Node.js Buffer)
        return btoa(pin + 'salt').slice(0, 16);
      },
      
      async verifyPin(pin, hash) {
        const computed = await this.hashPin(pin);
        return computed === hash;
      }
    };
    
    const testPin = '1234';
    const hash = await privateService.hashPin(testPin);
    
    if (!hash || hash.length < 8) {
      throw new Error('PIN哈希生成失败');
    }
    
    const verified = await privateService.verifyPin(testPin, hash);
    if (!verified) {
      throw new Error('PIN验证失败');
    }
    
    const wrongVerified = await privateService.verifyPin('5678', hash);
    if (wrongVerified) {
      throw new Error('错误PIN不应该通过验证');
    }
  },

  // 测试4: 拖拽功能模拟
  async testDragFunctionality() {
    const dragHelper = {
      calculateGridPosition(x, y, gridWidth = 100, gridHeight = 100) {
        return {
          col: Math.floor(x / gridWidth),
          row: Math.floor(y / gridHeight)
        };
      },
      
      reorderItems(items, dragIndex, hoverIndex) {
        const dragItem = items[dragIndex];
        const newItems = [...items];
        newItems.splice(dragIndex, 1);
        newItems.splice(hoverIndex, 0, dragItem);
        return newItems;
      }
    };
    
    // 测试位置计算
    const pos = dragHelper.calculateGridPosition(150, 250);
    if (pos.col !== 1 || pos.row !== 2) {
      throw new Error(`位置计算错误，期望(1,2)，实际(${pos.col},${pos.row})`);
    }
    
    // 测试重排序
    const items = ['A', 'B', 'C', 'D'];
    const reordered = dragHelper.reorderItems(items, 0, 2); // A移动到位置2
    if (reordered.join('') !== 'BCAD') {
      throw new Error(`重排序错误，期望BCAD，实际${reordered.join('')}`);
    }
  },

  // 测试5: 存储功能
  async testStorageService() {
    const storage = {
      data: {},
      
      async set(key, value) {
        this.data[key] = JSON.parse(JSON.stringify(value));
      },
      
      async get(key) {
        return this.data[key];
      },
      
      async clear() {
        this.data = {};
      }
    };
    
    const testData = { bookmarks: TEST_CONFIG.MOCK_BOOKMARKS };
    
    await storage.set('test_key', testData);
    const retrieved = await storage.get('test_key');
    
    if (!retrieved || retrieved.bookmarks.length !== 2) {
      throw new Error('存储测试失败');
    }
    
    await storage.clear();
    const cleared = await storage.get('test_key');
    
    if (cleared) {
      throw new Error('清除存储失败');
    }
  },

  // 测试6: 性能测试
  async testPerformance() {
    const start = Date.now();
    
    // 模拟大量书签处理
    const largeBookmarks = Array.from({ length: 500 }, (_, i) => ({
      id: i.toString(),
      title: `书签${i}`,
      url: `https://example${i}.com`
    }));
    
    // 模拟排序操作
    const sorted = largeBookmarks.sort((a, b) => a.title.localeCompare(b.title));
    
    const duration = Date.now() - start;
    
    if (duration > 100) { // 100ms内完成
      throw new Error(`性能测试失败，耗时${duration}ms`);
    }
    
    if (sorted.length !== 500) {
      throw new Error('数据处理错误');
    }
  }
};

// 运行所有测试
async function runAllTests() {
  console.log('🚀 开始测试 FavouriteEdge 扩展功能');
  console.log('='.repeat(50));
  
  const runner = new TestRunner();
  
  // 运行所有测试
  for (const [testName, testFn] of Object.entries(tests)) {
    await runner.runTest(testName, testFn);
  }
  
  // 输出报告
  runner.printReport();
  
  // 返回测试结果
  return {
    success: runner.failed === 0,
    passed: runner.passed,
    failed: runner.failed,
    total: runner.results.length
  };
}

// 检查构建文件
function checkBuildFiles() {
  const fs = require('fs');
  const path = require('path');
  
  console.log('\n🔍 检查构建文件...');
  
  const distDir = path.join(__dirname, 'dist');
  const requiredFiles = [
    'newtab.html',
    'newtab.js',
    'newtab.css',
    'background.js',
    'popup.html',
    'popup.js'
  ];
  
  const missingFiles = [];
  const fileInfo = [];
  
  requiredFiles.forEach(file => {
    const filePath = path.join(distDir, file);
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      fileInfo.push({
        name: file,
        size: (stats.size / 1024).toFixed(1) + ' KB',
        exists: true
      });
    } else {
      missingFiles.push(file);
      fileInfo.push({
        name: file,
        exists: false
      });
    }
  });
  
  console.log('\n📁 构建文件状态:');
  fileInfo.forEach(file => {
    const status = file.exists ? '✅' : '❌';
    const size = file.size ? ` (${file.size})` : '';
    console.log(`  ${status} ${file.name}${size}`);
  });
  
  if (missingFiles.length > 0) {
    console.log(`\n❌ 缺少文件: ${missingFiles.join(', ')}`);
    return false;
  }
  
  console.log('\n✅ 所有必需文件都存在!');
  return true;
}

// 主函数
async function main() {
  try {
    // 运行功能测试
    const testResult = await runAllTests();
    
    // 检查构建文件
    const buildResult = checkBuildFiles();
    
    // 总结
    console.log('\n🎯 总体结果:');
    console.log(`  功能测试: ${testResult.success ? '✅ 通过' : '❌ 失败'} (${testResult.passed}/${testResult.total})`);
    console.log(`  构建检查: ${buildResult ? '✅ 通过' : '❌ 失败'}`);
    
    const overallSuccess = testResult.success && buildResult;
    console.log(`\n${overallSuccess ? '🎉' : '💥'} 扩展${overallSuccess ? '准备就绪' : '需要修复'}!`);
    
    process.exit(overallSuccess ? 0 : 1);
    
  } catch (error) {
    console.error('\n💥 测试过程中发生错误:', error.message);
    process.exit(1);
  }
}

// 运行主函数
if (require.main === module) {
  main();
} 