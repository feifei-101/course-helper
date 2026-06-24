/**
 * @file 视频处理模块
 * 负责视频查找、播放、结束检测、倒带信号。
 * 依赖：CHAOXING_SELECTORS（selectors.js）、setState（state.js）
 */

/** @type {number} 视频轮询重试计数 */
var retryCount = 0;
/** @type {number} 上次通知时间戳 */
var lastNotified = 0;

/**
 * 在页面中查找可播放的视频
 * @returns {boolean} 是否找到并触发了播放
 */
var _hpVideoFound = false;
function findAndPlayVideo() {
  var v = document.querySelector(CHAOXING_SELECTORS.videoEl);
  if (v && v.readyState >= 1) { tryPlay(v); return true; }
  return false;
}

/**
 * 尝试播放视频
 * @param {HTMLVideoElement} v - 视频元素
 */
function tryPlay(v) {
  if (!v) return;
  if (!v.paused && !v.ended) { setState('video_playing', '\u64AD\u653E\u89C6\u9891\u4E2D'); bindVideoEnd(v); return; }
  v.muted = true;
  chrome.storage.local.set({ _helperRewindCount: 0 });
  v.play().then(function() {
    v.muted = false;
    setState('video_playing', '\u64AD\u653E\u89C6\u9891\u4E2D');
    bindVideoEnd(v);
  }).catch(function() {
    var btns = (v.ownerDocument || document).querySelectorAll(CHAOXING_SELECTORS.playButton);
    for (var bi = 0; bi < btns.length; bi++) {
      if (btns[bi].offsetParent !== null) { btns[bi].click(); bindVideoEnd(v); return; }
    }
    v.click();
    bindVideoEnd(v);
  });
}

/**
 * 绑定视频播放结束事件
 * @param {HTMLVideoElement} v - 视频元素
 */
function bindVideoEnd(v) {
  if (v.dataset.helperBound === 'true') return;
  v.dataset.helperBound = 'true';
  v.addEventListener('ended', function() { notifyVideoEnded(); }, { once: true });
  setTimeout(function poll() {
    if (v.ended) {
      if (v.dataset.helperNotified !== 'true') { v.dataset.helperNotified = 'true'; notifyVideoEnded(); }
    } else if (!v.dataset.helperNotified) {
      setTimeout(poll, 1000);
    }
  }, 2000);
}

/** 通知视频已结束（去重防抖） */
function notifyVideoEnded() {
  var now = Date.now();
  if (now - lastNotified < 5000) return;
  lastNotified = now;
  chrome.storage.local.set({ _helperVideoEnded: now });
}

/** 检查倒带信号并执行快进 */
function checkRewindSignal() {
  chrome.storage.local.get(['_helperRewind'], function(data) {
    if (data._helperRewind && Date.now() - data._helperRewind < 4000) {
      chrome.storage.local.remove('_helperRewind');
      var vids = document.querySelectorAll('video');
      for (var ri = 0; ri < vids.length; ri++) {
        var v = vids[ri];
        if (v.readyState >= 2 && v.duration > 0 && !isNaN(v.duration)) {
          v.currentTime = v.duration * 0.85;
          v.muted = true;
          v.play().catch(function(){});
          if (v.dataset.helperBound === 'true') { v.dataset.helperBound = 'false'; bindVideoEnd(v); }
        }
      }
    }
  });
}

// 全局轮询倒带信号
setInterval(checkRewindSignal, 2000);


