/**
 * @file 运行时状态管理
 * 定义 currentState、stateMessage、setState，供所有模块使用。
 * 必须在 anti-detection.js 之前加载。
 */

/** @type {string} 当前运行状态 */
var currentState = 'idle';
/** @type {string} 当前状态描述文本 */
var stateMessage = '\u5C31\u7EEA';

/** @type {Function} 状态更新函数 */
/**
 * 生成 [min, max] 范围内的随机整数
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
var setState = function(state, msg) {
  currentState = state;
  stateMessage = msg;
  chrome.storage.local.set({ _helperState: state, _helperStateMsg: msg });
  if (window.top === window.self) console.log('[助手] \u72B6\u6001:', state, '-', msg);
};

