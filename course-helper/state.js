var currentState = 'idle';

var stateMessage = '\u5C31\u7EEA';

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
var setState = function(state, msg) {
  currentState = state;
  stateMessage = msg;
  chrome.storage.local.set({ _helperState: state, _helperStateMsg: msg });
  if (window.top === window.self) console.log('[助手] \u72B6\u6001:', state, '-', msg);
};

