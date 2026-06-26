





function getDailyStats() {
  var today = new Date().toISOString().slice(0, 10);
  try {
    return JSON.parse(localStorage.getItem('_hpStats_' + today) || 'null') || { videos: 0, quizzes: 0, completed: 0 };
  } catch(e) {
    return { videos: 0, quizzes: 0, completed: 0 };
  }
}

function saveDailyStats(stats) {
  localStorage.setItem('_hpStats_' + new Date().toISOString().slice(0, 10), JSON.stringify(stats));
}


var MAX_LOG_ENTRIES = 200;
var MAX_LOG_BYTES = 50 * 1024;

function addLog(entry) {
  try {
    var raw = localStorage.getItem('_hpLogs') || '[]';
    var logs = JSON.parse(raw);
    logs.unshift({ time: new Date().toLocaleString('zh-CN'), msg: entry });
    if (logs.length > MAX_LOG_ENTRIES) logs.length = MAX_LOG_ENTRIES;
    var size = new Blob([JSON.stringify(logs)]).size;
    while (size > MAX_LOG_BYTES && logs.length > 1) {
      logs.pop();
      size = new Blob([JSON.stringify(logs)]).size;
    }
    localStorage.setItem('_hpLogs', JSON.stringify(logs));
  } catch(e) {
    try { localStorage.removeItem('_hpLogs'); } catch(e2) {}
  }
}


function encryptKey(key) {
  var k = 'fFHelper2024';
  var r = '';
  for (var i = 0; i < key.length; i++) {
    r += String.fromCharCode(key.charCodeAt(i) ^ k.charCodeAt(i % k.length));
  }
  return btoa(unescape(encodeURIComponent(r)));
}

function decryptKey(encoded) {
  try {
    var r = decodeURIComponent(escape(atob(encoded)));
    var k = 'fFHelper2024';
    var d = '';
    for (var i = 0; i < r.length; i++) {
      d += String.fromCharCode(r.charCodeAt(i) ^ k.charCodeAt(i % k.length));
    }
    return d;
  } catch(e) {
    return '';
  }
}
