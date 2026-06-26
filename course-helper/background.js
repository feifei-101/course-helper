

function encryptKey(key) {
  var k = "fFHelper2024"; var r = "";
  for (var i = 0; i < key.length; i++) r += String.fromCharCode(key.charCodeAt(i) ^ k.charCodeAt(i % k.length));
  return btoa(unescape(encodeURIComponent(r)));
}
function decryptKey(encoded) {
  try {
    var k = "fFHelper2024";
    var r = decodeURIComponent(escape(atob(encoded)));
    var d = "";
    for (var i = 0; i < r.length; i++) d += String.fromCharCode(r.charCodeAt(i) ^ k.charCodeAt(i % k.length));
    return d;
  } catch(e) { return ""; }
}
async function getApiKey() {
  return new Promise((resolve) => {
    chrome.storage.local.get("_hpEncKey", (data) => {
      resolve(data._hpEncKey ? decryptKey(data._hpEncKey) : "");
    });
  });
}


chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: "ai-search", title: "AI搜题", contexts: ["selection"] });
});
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "ai-search" && info.selectionText) {
    chrome.tabs.sendMessage(tab.id, { action: "show-ai-search", text: info.selectionText.trim() });
  }
});


async function askDeepSeek(questionText) {
  const apiKey = await getApiKey();
  if (!apiKey) throw new Error("未设置 DeepSeek API Key");
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + apiKey },
      body: JSON.stringify({ model: "deepseek-chat", messages: [{ role: "system", content: "你是学习助手。请用中文给出答案，用\"答案：\"标出最终结果。" }, { role: "user", content: questionText }], temperature: 0.7, max_tokens: 800 }),
      signal: controller.signal
    });
    if (!response.ok) throw new Error("API 请求失败 (" + response.status + ")");
    const data = await response.json();
    return data.choices[0].message.content;
  } finally { clearTimeout(timeoutId); }
}
async function answerQuiz(questionsText, questionCount) {
  const apiKey = await getApiKey();
  if (!apiKey) throw new Error("请先在插件中设置 DeepSeek API Key");
  const prompt = "你是课程答题助手。请回答以下全部题目。\n\n" + questionsText + "\n\n只输出答案，每行一个，按题目顺序，不要序号和标点。\n示例：\nA\nB,C\n对\n巴黎";
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);
  try {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + apiKey },
      body: JSON.stringify({ model: "deepseek-chat", messages: [{ role: "system", content: "你是一个课程答题助手。只输出答案，不要解释、不要序号。每行一个答案，按题目顺序。" }, { role: "user", content: prompt }], temperature: 0.3, max_tokens: 2000 }),
      signal: controller.signal
    });
    if (!response.ok) throw new Error("API 请求失败 (" + response.status + ")");
    const data = await response.json();
    return data.choices[0].message.content;
  } finally { clearTimeout(timeoutId); }
}


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "ask-ai") {
    askDeepSeek(message.text).then(answer => { sendResponse({ success: true, answer }); }).catch(err => { sendResponse({ success: false, error: err.message }); });
    return true;
  }
  if (message.action === "toggle-auto") {
    chrome.storage.sync.set({ autoPlayEnabled: message.enabled });
    chrome.tabs.query({}, (tabs) => { for (const tab of tabs) { chrome.tabs.sendMessage(tab.id, { action: "toggle-auto", enabled: message.enabled }).catch(() => {}); } });
    sendResponse({ success: true });
    return true;
  }
  if (message.action === "answer-quiz") {
    answerQuiz(message.questions, message.count).then(answers => { sendResponse({ success: true, answers }); }).catch(err => { sendResponse({ success: false, error: err.message }); });
    return true;
  }
  if (message.action === "keepalive") { sendResponse({ alive: true }); return true; }
  
  if (message.action === "check-api-key") {
    getApiKey().then(key => { sendResponse({ hasKey: !!key }); });
    return true;
  }
  if (message.action === "set-api-key") {
    try {
      var encrypted = encryptKey(message.key);
      chrome.storage.local.set({ _hpEncKey: encrypted }, function() { sendResponse({ success: true }); });
      return true;
    } catch(e) { sendResponse({ success: false, error: e.message }); return true; }
  }
  if (message.action === "delete-api-key") {
    chrome.storage.local.remove("_hpEncKey", function() { sendResponse({ success: true }); });
    return true;
  }
  if (message.action === "test-api-key") {
    getApiKey().then(apiKey => {
      if (!apiKey) { sendResponse({ success: false, error: "未设置 API Key" }); return; }
      fetch("https://api.deepseek.com/models", {
        headers: { "Authorization": "Bearer " + apiKey }
      }).then(r => { if (r.ok) return r.json(); throw new Error("HTTP " + r.status); })
        .then(() => { sendResponse({ success: true, model: "deepseek-chat" }); })
        .catch(err => { sendResponse({ success: false, error: err.message }); });
    });
    return true;
  }
});
