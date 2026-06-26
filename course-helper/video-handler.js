





var retryCount = 0;

var lastNotified = 0;




var _hpVideoFound = false;
function findAndPlayVideo() {
  var v = document.querySelector(CHAOXING_SELECTORS.videoEl);
  if (v && v.readyState >= 1) { tryPlay(v); return true; }
  return false;
}




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


function notifyVideoEnded() {
  var now = Date.now();
  if (now - lastNotified < 5000) return;
  lastNotified = now;
  chrome.storage.local.set({ _helperVideoEnded: now });
}


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


setInterval(checkRewindSignal, 2000);


