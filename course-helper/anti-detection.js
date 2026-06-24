console.log('>>>ANTI-DETECTION-MODULE<<<');
/**
 * @file 反检测工具模块
 * 包含正态分布延迟、贝塞尔曲线鼠标点击、模拟浏览行为、答题频率限制、自适应轮询。
 * 无外部依赖，仅依赖 window / document / chrome API。
 */

// ─── Box-Muller 正态分布 ───
/**
 * 生成正态分布随机数
 * @param {number} mean - 均值
 * @param {number} std - 标准差
 * @returns {number} 正态分布随机值
 */
function randn(mean, std) {
  var u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return mean + std * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// ─── 人类行为延迟模型 ───
/**
 * @typedef {Object} DelayConfig
 * @property {number} mean
 * @property {number} std
 * @property {number} min
 * @property {number} max
 */

/**
 * 按行为类型生成拟人延迟（Promise 风格）
 * @param {string} type - 行为类型
 * @returns {Promise<void>}
 */
function humanDelay(type) {
  /** @type {Object<string, DelayConfig>} */
  var delays = {
    readQuestion:  { mean: 8000, std: 3000, min: 3000, max: 15000 },
    clickOption:  { mean: 1200, std: 400,  min: 400,  max: 3000  },
    beforeSubmit: { mean: 2000, std: 1000, min: 1000, max: 5000  },
    nextSection:  { mean: 4000, std: 2000, min: 2000, max: 10000 },
    moveToNext:   { mean: 800,  std: 300,  min: 300,  max: 2000  },
    typeAnswer:   { mean: 1500, std: 500,  min: 500,  max: 4000  },
  };
  var cfg = delays[type] || delays.clickOption;
  var ms = Math.max(cfg.min, Math.min(cfg.max, randn(cfg.mean, cfg.std)));
  return new Promise(function(resolve) { setTimeout(resolve, ms); });
}

// ─── 贝塞尔曲线鼠标点击 ───
/**
 * 模拟人类鼠标移动轨迹并点击目标元素
 * 使用二次贝塞尔曲线 + 随机抖动
 * @param {HTMLElement} element - 要点击的元素
 * @returns {Promise<void>}
 */
function humanClick(element) {
  return new Promise(function(resolve) {
    if (!element || !element.getBoundingClientRect) { resolve(); return; }
    var rect = element.getBoundingClientRect();
    var targetX = rect.left + rect.width * (0.15 + Math.random() * 0.7);
    var targetY = rect.top + rect.height * (0.15 + Math.random() * 0.7);
    var startX = targetX + (Math.random() - 0.5) * 260;
    var startY = targetY + (Math.random() - 0.5) * 200;
    var controlX = (startX + targetX) / 2 + (Math.random() - 0.5) * 120;
    var controlY = (startY + targetY) / 2 + (Math.random() - 0.5) * 100;
    var steps = 8 + Math.floor(Math.random() * 10);
    var stepIdx = 0;
    function doStep() {
      if (stepIdx > steps) {
        element.dispatchEvent(new MouseEvent('mousedown', { clientX: targetX, clientY: targetY, bubbles: true, cancelable: true }));
        element.dispatchEvent(new MouseEvent('mouseup',   { clientX: targetX, clientY: targetY, bubbles: true, cancelable: true }));
        element.dispatchEvent(new MouseEvent('click',     { clientX: targetX, clientY: targetY, bubbles: true, cancelable: true }));
        resolve(); return;
      }
      var t = stepIdx / steps;
      var x = (1-t)*(1-t)*startX + 2*(1-t)*t*controlX + t*t*targetX;
      var y = (1-t)*(1-t)*startY + 2*(1-t)*t*controlY + t*t*targetY;
      element.dispatchEvent(new MouseEvent('mousemove', { clientX: x, clientY: y, bubbles: true, cancelable: true }));
      stepIdx++;
      setTimeout(doStep, 15 + Math.floor(Math.random() * 35));
    }
    setTimeout(doStep, 50 + Math.floor(Math.random() * 150));
  });
}

// ─── 模拟浏览行为 ───
/**
 * 在指定时长内模拟用户浏览行为（随机滚动、跳转内容区）
 * @param {number} durationMs - 模拟时长（毫秒）
 * @returns {Promise<void>}
 */
function simulateBrowsing(durationMs) {
  return new Promise(function(resolve) {
    var endTime = Date.now() + durationMs;
    function doScroll() {
      if (Date.now() > endTime) { resolve(); return; }
      window.scrollBy(0, (Math.random() - 0.5) * 300);
      if (Math.random() < 0.2) {
        try { var p = document.querySelector('p, div, span, h2, h3'); if (p && p.offsetParent !== null) p.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch(e) {}
      }
      var nextDelay = 2000 + Math.floor(Math.random() * 6000);
      setTimeout(doScroll, Math.min(nextDelay, Math.max(1000, endTime - Date.now())));
    }
    doScroll();
  });
}

// ─── 答题频率限制 ───
/**
 * 检查当前是否超出每日/每小时答题上限。
 * 每日上限 80 题，每小时上限 20 题。
 * @returns {boolean} true=允许答题, false=已达上限
 */
function checkRateLimit() {
  var today = new Date().toISOString().slice(0, 10);
  var hour = new Date().getHours();
  var dailyKey = '_hpLimit_' + today;
  var daily = parseInt(localStorage.getItem(dailyKey) || '0');
  if (daily >= 80) { setState('idle', '\u4ECA\u65E5\u7B54\u9898\u91CF\u5DF2\u8FBE\u4E0A\u9650'); return false; }
  var hourlyKey = '_hpHourly_' + today + '_' + hour;
  var hourly = parseInt(localStorage.getItem(hourlyKey) || '0');
  if (hourly >= 20) { setState('idle', '\u5F53\u524D\u65F6\u6BB5\u5DF2\u8FBE\u4E0A\u9650'); return false; }
  localStorage.setItem(dailyKey, String(daily + 1));
  localStorage.setItem(hourlyKey, String(hourly + 1));
  return true;
}

// ─── 自适应轮询间隔 ───
/** @type {number} 当前轮询间隔（毫秒） */
var scanInterval_ = 500;

/**
 * 重置并启动一次视频扫描（带随机初始延迟）
 */
function retryScan() {
  retryCount = 0;
  scanInterval_ = 500 + Math.floor(Math.random() * 300);
  setTimeout(scanLoop, scanInterval_ + Math.floor(Math.random() * 200));
}

/**
 * 循环扫描视频，间隔逐次递增（500ms → 2000ms + 30% 抖动）
 */
function scanLoop() {

  if (findAndPlayVideo()) { retryCount = 0; scanInterval_ = 500; return; }
  if (retryCount < 120) {
    retryCount++;
    scanInterval_ = Math.min(500 + retryCount * 15, 2000);
    setTimeout(scanLoop, scanInterval_ + Math.floor(Math.random() * scanInterval_ * 0.3));
  }
}

// 全局初始触发（所有 frame 都会执行）
setTimeout(scanLoop, rand(1000, 3000));

