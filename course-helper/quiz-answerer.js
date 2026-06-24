/**
 * @file 自动答题模块
 * 包含题目提取、AI 问答、答案填入、分批答题、提交。
 * 依赖：CHAOXING_SELECTORS（selectors.js）、humanClick（anti-detection.js）、
 *       checkRateLimit（anti-detection.js）、setState（state.js）、addLog（stats.js）
 */

/**
 * 带指数退避重试的消息发送
 * @param {Object} msg - 消息对象
 * @param {number} retries - 重试次数
 * @returns {Promise<Object>}
 */
function sendMessageRetry(msg, retries) {
  return new Promise(function(resolve, reject) {
    function trySend(n) {
      chrome.runtime.sendMessage(msg, function(response) {
        var err = chrome.runtime.lastError;
        if (err) {
          if (n > 0) {
            setTimeout(function() { trySend(n - 1); }, Math.pow(2, retries - n) * 1000 + Math.random() * 500);
          } else {
            reject(new Error(err.message));
          }
        } else { resolve(response); }
      });
    }
    trySend(retries);
  });
}

/** @returns {boolean} 是否已提交 */
function isQuizSubmitted() {
  for (const el of document.querySelectorAll(CHAOXING_SELECTORS.taskCompletedTextTags)) {
    var t = (el.textContent || '').trim();
    if (CHAOXING_SELECTORS.submitDoneTexts.indexOf(t) >= 0) return true;
  }
  for (const el of document.querySelectorAll(CHAOXING_SELECTORS.questionSubmitDisabled)) {
    if (el.type === 'submit' || el.type === 'button') return true;
  }
  return false;
}

/**
 * 自动答题主入口（带分批逻辑）
 * 超过 5 道题时自动分组，批间休息 2~5 分钟 + 模拟浏览
 */
function autoAnswerQuiz() {
  if (isQuizSubmitted()) { console.log('[助手] \u5DF2\u63D0\u4EA4, \u901A\u77E5\u8DF3\u8F6C'); setState('advancing', '\u5DF2\u63D0\u4EA4, \u8DF3\u8F6C\u4E2D'); try { chrome.storage.local.set({ _helperQuizDone: Date.now() }); } catch(e) {} return; }
  if (!checkRateLimit()) return;
  var questionItems = document.querySelectorAll(CHAOXING_SELECTORS.questionItem);
  if (!questionItems || questionItems.length === 0) return;

  /** @type {Array} */
  var questions = [];
  questionItems.forEach(function(item, idx) {
    var titleEl = item.querySelector(CHAOXING_SELECTORS.questionTitle);
    var title = titleEl ? titleEl.textContent.trim() : ('\u9898\u76EE' + (idx + 1));
    var radios = item.querySelectorAll(CHAOXING_SELECTORS.radioInputs);
    var checks = item.querySelectorAll(CHAOXING_SELECTORS.checkboxInputs);
    var texts = item.querySelectorAll(CHAOXING_SELECTORS.textInputs);
    var areas = item.querySelectorAll(CHAOXING_SELECTORS.textareas);
    var type = 'unknown';
    if (texts.length > 0) type = 'fill';
    else if (areas.length > 0) type = 'essay';
    else if (checks.length > 0) type = 'multiple';
    else if (radios.length > 0) {
      var labels = item.querySelectorAll('label');
      var labelTexts = Array.from(labels).map(function(l) { return l.textContent.trim(); });
      type = labelTexts.some(function(t) { return t === '\u6B63\u786E' || t === '\u9519\u8BEF' || t === '\u5BF9' || t === '\u9519'; }) ? 'judge' : 'single';
    }
    var options = [];
    item.querySelectorAll(CHAOXING_SELECTORS.questionOptions).forEach(function(li) {
      var optText = li.textContent.trim().replace(/^[A-Z]\.?\s*/, '');
      var inp = li.querySelector('input') || li.querySelector('textarea');
      options.push({ text: optText, el: inp });
    });
    questions.push({ index: idx + 1, title: title, type: type, options: options });
  });

  var allAnswered = questions.every(function(q) {
    if (q.type === 'fill') return Array.from(document.querySelectorAll('" + CHAOXING_SELECTORS.questionItem + " input[type=text]"')).some(function(i) { return i.value.trim() !== ''; });
    if (q.type === 'essay') return Array.from(document.querySelectorAll('.TiMu textarea')).some(function(a) { return a.value.trim() !== ''; });
    if (q.type === 'single' || q.type === 'judge') return document.querySelector('" + CHAOXING_SELECTORS.questionItem + " input[type=radio]:checked"') !== null;
    if (q.type === 'multiple') return document.querySelector('" + CHAOXING_SELECTORS.questionItem + " input[type=checkbox]:checked"') !== null;
    return false;
  });
  if (allAnswered) { console.log('[助手] \u6240\u6709\u9898\u76EE\u5DF2\u4F5C\u7B54'); return; }

  var total = questions.length;
  var BATCH_SIZE = Math.min(5, total);
  var batches = [];
  for (var bi = 0; bi < total; bi += BATCH_SIZE) { batches.push(questions.slice(bi, bi + BATCH_SIZE)); }
  addLog('\u9898\u76EE\u5171 ' + total + ' \u9053, \u5206 ' + batches.length + ' \u6279\u7B54\u9898');

  /** 递归处理每一批 */
  function processBatch(batchIdx) {
    if (batchIdx >= batches.length) { setState('answering_quiz', '\u5168\u90E8\u6279\u6B21\u7B54\u9898\u5B8C\u6210'); return; }
    var batch = batches[batchIdx];
    var prompt = batch.map(function(q) {
      var line = '\u9898\u76EE' + q.index + ': ' + q.title;
      if (q.options.length > 0) {
        var letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        line += '\n' + q.options.map(function(o, i) { return letters[i] + '. ' + o.text; }).join('\n');
      }
      if (q.type === 'single') line += '\n(\u5355\u9009\u9898)';
      if (q.type === 'multiple') line += '\n(\u591A\u9009\u9898)';
      if (q.type === 'judge') line += '\n(\u5224\u65AD\u9898)';
      if (q.type === 'fill') line += '\n(\u586B\u7A7A\u9898)';
      if (q.type === 'essay') line += '\n(\u7B80\u7B54\u9898)';
      return line;
    }).join('\n\n');

    setState('answering_quiz', '\u7B2C ' + (batchIdx + 1) + '/' + batches.length + ' \u6279\u6B21\u63D0\u95EE AI');
    sendMessageRetry({ action: 'answer-quiz', questions: prompt, count: batch.length }, 3)
      .then(function(response) {
        if (response && response.success) {
          addLog('AI\u7B2C' + (batchIdx + 1) + '\u6279\u83B7\u53D6\u7B54\u6848');
          setState('answering_quiz', 'AI \u8FD4\u56DE\u7B54\u6848, \u586B\u5165\u4E2D');
          fillAnswers(batch, response.answers, function() {
            if (batchIdx < batches.length - 1) {
              var restMs = 120000 + Math.floor(Math.random() * 180000);
              setState('idle', '\u7B54\u9898\u4F11\u606F\u4E2D ' + Math.round(restMs/60000) + ' \u5206\u949F');
              addLog('\u6279\u6B21\u4F11\u606F ' + Math.round(restMs/60000) + ' \u5206\u949F');
              simulateBrowsing(restMs).then(function() { processBatch(batchIdx + 1); });
            } else { setState('answering_quiz', '\u7B54\u9898\u5B8C\u6210, \u51C6\u5907\u63D0\u4EA4'); }
          });
        } else { setState('error', 'AI \u7B54\u9898\u5931\u8D25'); }
      })
      .catch(function(err) { setState('error', 'AI \u8BF7\u6C42\u5931\u8D25: ' + err.message); });
  }

  // 少量题目用单次流程，大量题目用分批
  if (batches.length === 1) {
    var promptAll = questions.map(function(q) {
      var line = '\u9898\u76EE' + q.index + ': ' + q.title;
      if (q.options.length > 0) {
        var letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        line += '\n' + q.options.map(function(o, i) { return letters[i] + '. ' + o.text; }).join('\n');
      }
      if (q.type === 'single') line += '\n(\u5355\u9009\u9898)';
      if (q.type === 'multiple') line += '\n(\u591A\u9009\u9898)';
      if (q.type === 'judge') line += '\n(\u5224\u65AD\u9898)';
      if (q.type === 'fill') line += '\n(\u586B\u7A7A\u9898)';
      if (q.type === 'essay') line += '\n(\u7B80\u7B54\u9898)';
      return line;
    }).join('\n\n');

    sendMessageRetry({ action: 'answer-quiz', questions: promptAll, count: questions.length }, 3)
      .then(function(response) {
        if (response && response.success) {
          addLog('AI\u83B7\u53D6\u7B54\u6848');
          setState('answering_quiz', 'AI \u8FD4\u56DE\u7B54\u6848, \u586B\u5165\u4E2D');
          fillAnswers(questions, response.answers, function() {});
        } else { setState('error', 'AI \u7B54\u9898\u5931\u8D25'); }
      })
      .catch(function(err) { setState('error', 'AI \u8BF7\u6C42\u5931\u8D25: ' + err.message); });
  } else { processBatch(0); }
}

/**
 * 逐题填入 AI 返回的答案（带逐题延迟和模拟点击）
 * @param {Array} questions - 题目列表
 * @param {string} answerText - AI 返回的答案文本
 * @param {Function} onComplete - 填写完毕回调
 */
function fillAnswers(questions, answerText, onComplete) {
  var rawLines = answerText.split('\n').map(function(l) { return l.trim(); }).filter(function(l) { return l; });
  var itemList = document.querySelectorAll(CHAOXING_SELECTORS.questionItem);
  var letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  var currentIdx = 0;

  function fillNext() {
    if (currentIdx >= itemList.length) {
      var submitDelay = 1500 + Math.floor(Math.random() * 3000);
      setState('answering_quiz', '\u7B54\u6848\u586B\u5165\u5B8C\u6210, \u7B49\u5F85\u63D0\u4EA4');
      setTimeout(function() { if (typeof onComplete === 'function') onComplete(); submitQuiz(); }, submitDelay);
      return;
    }

    var item = itemList[currentIdx];
    var answer = rawLines[currentIdx] || '';
    currentIdx++;

    if (!answer) { setTimeout(fillNext, 300 + Math.floor(Math.random() * 600)); return; }

    var lookDelay = 400 + Math.floor(Math.random() * 800);
    setTimeout(function() {
      // 判断题
      if (answer === '\u5BF9' || answer === '\u6B63\u786E' || answer === 'T') {
        var radio = item.querySelector('input[type=radio][value=1], input[type=radio][value=true]');
        if (radio) { humanClick(radio).then(function() { radio.checked = true; triggerEvent(radio, 'change'); setTimeout(fillNext, 200 + Math.floor(Math.random() * 300)); }); return; }
      }
      if (answer === '\u9519' || answer === '\u9519\u8BEF' || answer === 'F') {
        var radio = item.querySelector('input[type=radio][value=0], input[type=radio][value=false]');
        if (radio) { humanClick(radio).then(function() { radio.checked = true; triggerEvent(radio, 'change'); setTimeout(fillNext, 200 + Math.floor(Math.random() * 300)); }); return; }
      }

      var options = item.querySelectorAll(CHAOXING_SELECTORS.questionOptions);
      var answers = answer.includes(',') ? answer.split(/[,，]/).map(function(a) { return a.trim(); }) : [answer];
      var clickPromises = [];

      for (var ai = 0; ai < answers.length; ai++) {
        (function(ans) {
          var found = false;
          var letterIdx = letters.indexOf(ans.toUpperCase());
          if (letterIdx >= 0 && options[letterIdx]) {
            var input = options[letterIdx].querySelector('input');
            if (input) { clickPromises.push(humanClick(options[letterIdx]).then(function() { input.checked = true; triggerEvent(input, 'change'); })); found = true; }
          }
          if (!found) {
            for (var oi = 0; oi < options.length; oi++) {
              var optText = options[oi].textContent.trim().replace(/^[A-Z]\.?\s*/, '');
              if (optText.includes(ans)) {
                var inp = options[oi].querySelector('input');
                if (inp) { clickPromises.push(humanClick(options[oi]).then(function() { inp.checked = true; triggerEvent(inp, 'change'); })); }
                break;
              }
            }
          }
        })(answers[ai]);
      }

      Promise.all(clickPromises).then(function() {
        var textInputs = item.querySelectorAll(CHAOXING_SELECTORS.textInputs);
        if (textInputs.length > 0) {
          textInputs.forEach(function(inp, i) { inp.value = answers[i] || answer; triggerEvent(inp, 'input'); triggerEvent(inp, 'change'); });
        }
        var textareas = item.querySelectorAll(CHAOXING_SELECTORS.textareas);
        if (textareas.length > 0) {
          textareas.forEach(function(ta) {
            var chars = answer.split('');
            var ci = 0;
            function typeChar() { if (ci >= chars.length) { triggerEvent(ta, 'change'); setTimeout(fillNext, 150 + Math.floor(Math.random() * 250)); return; } ta.value += chars[ci]; triggerEvent(ta, 'input'); ci++; setTimeout(typeChar, 30 + Math.floor(Math.random() * 70)); }
            ta.value = '';
            typeChar();
          });
          return;
        }
        setTimeout(fillNext, 200 + Math.floor(Math.random() * 400));
      });
    }, lookDelay);
  }
  fillNext();
}

/**
 * 触发 DOM 事件
 * @param {HTMLElement} el - 目标元素
 * @param {string} type - 事件类型
 */
function triggerEvent(el, type) {
  el.dispatchEvent(new Event(type, { bubbles: true }));
}

/**
 * 提交答案（带拟人延迟和贝塞尔点击）
 */
function submitQuiz() {
  var checkDelay = 3000 + Math.floor(Math.random() * 5000);
  setState('answering_quiz', '\u68C0\u67E5\u7B54\u6848\u4E2D ' + Math.round(checkDelay/1000) + 's');
  setTimeout(function() {
    var btns = document.querySelectorAll(CHAOXING_SELECTORS.submitButtons);
    for (var bi = 0; bi < btns.length; bi++) {
      if (btns[bi].offsetParent !== null) {
        humanClick(btns[bi]).then(function() { btns[bi].click(); chrome.storage.local.set({ _helperQuizDone: Date.now() }); setState('answering_quiz', '\u5DF2\u63D0\u4EA4\u7B54\u6848'); });
        return;
      }
    }
    for (const el of document.querySelectorAll('a, button, input, span')) {
      var t = (el.value || el.textContent || '').trim();
      if ((t === '\u4FDD\u5B58' || t === '\u63D0\u4EA4' || t === '\u4EA4\u5377') && el.offsetParent !== null) {
        humanClick(el).then(function() { el.click(); chrome.storage.local.set({ _helperQuizDone: Date.now() }); setState('answering_quiz', '\u5DF2\u63D0\u4EA4\u7B54\u6848'); });
        return;
      }
    }
  }, checkDelay);
}


