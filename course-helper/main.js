console.log('>>>狒狒助手模块版V2.0<<< 如果你看到这行,新代码正在运行');


try { Object.defineProperty(navigator, 'webdriver', { get: function() { return false; }, configurable: false }); } catch(e) {}
try { Object.defineProperty(navigator, 'languages', { get: function() { return ['zh-CN', 'zh', 'en']; }, configurable: false }); } catch(e) {}

document.addEventListener('mousemove', function() {
  window._lastHumanMove = Date.now();
}, { passive: true });


document.addEventListener('keydown', function(e) {
  if (e.altKey && e.shiftKey) {
    if (e.key === 'A' || e.key === 'a') {
      e.preventDefault();
      chrome.storage.sync.get('autoPlayEnabled', function(d) {
        var en = d.autoPlayEnabled === false;
        chrome.storage.sync.set({ autoPlayEnabled: en });
        chrome.runtime.sendMessage({ action: 'toggle-auto', enabled: en }).catch(function(){});
        addLog('\u5FEB\u6377\u952E: ' + (en ? '\u5F00\u542F' : '\u5173\u95ED') + '\u81EA\u52A8\u8FDE\u64AD');
      });
    }
    if (e.key === 'P' || e.key === 'p') {
      e.preventDefault();
      var pnl = document.getElementById('_helperPanel');
      if (pnl) { pnl.style.display = pnl.style.display === 'none' ? '' : 'none'; addLog('\u5FEB\u6377\u952E: ' + (pnl.style.display === 'none' ? '\u9690\u85CF' : '\u663E\u793A') + '\u9762\u677F'); }
    }
  }
});


function showNotification(text, type) {
  var existing = document.getElementById('_hpNotify');
  if (existing) existing.remove();
  var n = document.createElement('div');
  n.id = '_hpNotify';
  n.textContent = text;
  n.style.background = type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : '#4a6cf7';
  document.body.appendChild(n);
  setTimeout(function() { n.style.opacity = '0'; setTimeout(function() { n.remove(); }, 500); }, 4000);
}


if (window.top === window.self) {
  console.log('[助手] content script (\u9876\u5C42) \u5DF2\u52A0\u8F7D');

  
  var wasFullscreen = false;
  document.addEventListener('fullscreenchange', function() {
    wasFullscreen = !!document.fullscreenElement;
    var pnl = document.getElementById('_helperPanel');
    if (pnl) pnl.style.display = wasFullscreen ? 'none' : '';
  });

  setState('idle', '\u5C31\u7EEA');
  var autoPlayEnabled = true;
  var pendingNext = false;
  var pendingNextTimer = null;

  
  chrome.storage.sync.get('autoPlayEnabled', function(d) {
    autoPlayEnabled = d.autoPlayEnabled !== false;
    if (autoPlayEnabled) setTimeout(retryScan, 2000);
  });

  chrome.storage.onChanged.addListener(function(c) {
    if (c.autoPlayEnabled) { autoPlayEnabled = c.autoPlayEnabled.newValue; if (autoPlayEnabled) retryScan(); }
  });

  
  chrome.runtime.onMessage.addListener(function(msg, s, sendResponse) {
    if (msg.action === 'toggle-auto') { autoPlayEnabled = msg.enabled; if (autoPlayEnabled) retryScan(); sendResponse({ enabled: autoPlayEnabled }); }
    if (msg.action === 'ping') { sendResponse({ alive: true, autoPlayEnabled: autoPlayEnabled }); }
    if (msg.action === 'set-speed') {
      var vids = document.querySelectorAll('video');
      for (var vi = 0; vi < vids.length; vi++) vids[vi].playbackRate = msg.speed;
      sendResponse({ success: true });
    }
    if (msg.action === 'get-status') {
      sendResponse({
        state: currentState, message: stateMessage, autoPlay: autoPlayEnabled,
        onCoursePage: !!document.querySelector(CHAOXING_SELECTORS.coursePage)
      });
    }
    if (msg.action === 'show-ai-search') {
      
      var resultUrl = chrome.runtime.getURL('result.html') + '?text=' + encodeURIComponent(msg.text);
      chrome.tabs.create({ url: resultUrl });
    }
  });

  
  


  function isTaskCompleted() {
    for (const el of document.querySelectorAll(CHAOXING_SELECTORS.taskCompletedTextTags)) {
      var t = (el.textContent || '').trim();
      if (CHAOXING_SELECTORS.taskCompletedTexts.indexOf(t) >= 0) return true;
    }
    for (const el of document.querySelectorAll(CHAOXING_SELECTORS.completedClassSelectors)) {
      if (el.offsetParent !== null) return true;
    }
    return false;
  }

  
  

  function scheduleNextCheck() {
    if (!autoPlayEnabled || !pendingNext) return;
    if (isTaskCompleted()) {
      setState("advancing", "任务完成, 跳转中");
      clearTimeout(pendingNextTimer);
      setTimeout(function() {
        clickNext();
        setTimeout(function() {
          var btn = document.querySelector(CHAOXING_SELECTORS.nextButtons);
          if (btn && btn.offsetParent !== null) {
            pendingNext = true;
            setState("advancing", "按钮未响应, 重试中");
          } else {
            pendingNext = false;
          }
        }, 3000);
      }, rand(800, 2500));
      return;
    }
    clearTimeout(pendingNextTimer);
    pendingNextTimer = setTimeout(function() {
      if (pendingNext) {
        setState("advancing", "等待超时, 强制跳转");
        pendingNext = false;
        setTimeout(function() { clickNext(); }, rand(500, 1500));
      }
    }, 60000);
  }
  setInterval(scheduleNextCheck, 1000);


  
  
  function pollVideoEnded() {
    chrome.storage.local.get("_helperVideoEnded", function(data) {
      if (data._helperVideoEnded && Date.now() - data._helperVideoEnded < 3000) {
        chrome.storage.local.remove("_helperVideoEnded");
        if (pendingNext) return;
        setState("video_ended", "等待完成任务");
        if (isTaskCompleted()) {
          pendingNext = true;
          scheduleNextCheck();
        } else {
          chrome.storage.local.get("_helperRewindCount", function(cnt) {
            var rewindCount = (cnt._helperRewindCount || 0) + 1;
            if (rewindCount > 12) {
              setState("advancing", "重播超限, 强制跳转");
              pendingNext = true;
              scheduleNextCheck();
              return;
            }
            chrome.storage.local.set({ _helperRewind: Date.now(), _helperRewindSeek: 0.85, _helperRewindCount: rewindCount });
            setState("video_ended", "重播中(" + rewindCount + "/12)");
          });
        }
      }
    });
  }
  setInterval(pollVideoEnded, 1000);

  function pollQuizDone() {
    chrome.storage.local.get('_helperQuizDone', function(data) {
      if (data._helperQuizDone && Date.now() - data._helperQuizDone < 5000) {
        chrome.storage.local.remove('_helperQuizDone');
        if (pendingNext) return;
        setState('quiz_done', '\u7B54\u9898\u5B8C\u6210, \u68C0\u6D4B\u4E2D');
        pendingNext = true;
        scheduleNextCheck();
      }
    });
  }
  setInterval(pollQuizDone, 1500);

  
  
  
  
  
  
  
  
  
  
  

  
  function clickNext() {
    if (!autoPlayEnabled) { setState('idle', '\u8FDE\u64AD\u5DF2\u5173\u95ED'); return; }

    
    var selList = CHAOXING_SELECTORS.nextButtons.split(', ');
    for (var si = 0; si < selList.length; si++) {
      var el = document.querySelector(selList[si]);
      if (el && el.offsetParent !== null) { 
        setState('advancing', '\u8DF3\u8F6C\u4E0B\u4E00\u8282'); 
        el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
        el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
        el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        return; 
      }
    }
    
    for (const el of document.querySelectorAll('a, button, span, i, div[onclick], [role=button]')) {
      var t = (el.textContent || '').trim();
      if (t.includes('\u4E0B\u4E00') && el.offsetParent !== null) { 
        setState('advancing', '\u8DF3\u8F6C\u4E0B\u4E00\u8282'); 
        el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
        el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
        el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        return; 
      }
    }
    for (const el of document.querySelectorAll('[class*=next], [id*=next]')) {
      if (el.offsetParent !== null) { 
        setState('advancing', '\u8DF3\u8F6C\u4E0B\u4E00\u8282'); 
        el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
        el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
        el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        return; 
      }
    }
    addLog('\u6240\u6709\u7AE0\u8282\u5DF2\u5B8C\u6210');
    showNotification('\u6240\u6709\u7AE0\u8282\u5DF2\u5B8C\u6210!', 'success');
    setState('idle', '\u5168\u90E8\u5B8C\u6210');
  }

  
  new MutationObserver(function() {
    if (autoPlayEnabled) {
      var v = document.querySelector(CHAOXING_SELECTORS.videoEl);
      if (v && v.readyState >= 1 && v.paused && !v.dataset.helperWatching) { v.dataset.helperWatching = 'true'; retryScan(); }
    }
    var f = document.querySelector(CHAOXING_SELECTORS.courseFrameIframe);
    if (f && !f.dataset.helperWatching) { f.dataset.helperWatching = 'true'; }
  }).observe(document.body || document.documentElement, { childList: true, subtree: true });
}


if (window.top !== window.self && (location.href).indexOf(CHAOXING_SELECTORS.quizFrame) >= 0) {
  setState('answering_quiz', '\u81EA\u52A8\u7B54\u9898\u4E2D');
  setTimeout(autoAnswerQuiz, 2000);
}


setInterval(function() {
  try { chrome.runtime.sendMessage({ action: 'keepalive' }); } catch(e) {}
}, 20000);


