// 浮动面板（完整版——与 popup UI 一致）
(function() {
  "use strict";
  if (window.top !== window.self || document.getElementById("_helperPanel")) return;

  // ─── 注入 CSS ───
  var link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = chrome.runtime.getURL("panel.css");
  document.head.appendChild(link);

  var POS_KEY = "_helperPanelPos", MIN_KEY = "_helperPanelMin";
  var isMin = localStorage.getItem(MIN_KEY) === "true";
  function loadPos() { try { return JSON.parse(localStorage.getItem(POS_KEY)); } catch(e) { return null; } }
  function savePos(x, y) { localStorage.setItem(POS_KEY, JSON.stringify({ x: Math.round(x), y: Math.round(y) })); }

  var pos = loadPos();
  var posStyle = pos ? "left:" + pos.x + "px;top:" + pos.y + "px;" : "right:16px;bottom:60px;";

  var p = document.createElement("div");
  p.id = "_helperPanel";
  p.className = isMin ? "minimized" : "";
  p.style.cssText = posStyle;

  // ═══ Header ═══
  var h = document.createElement("div");
  h.className = "_hpHeader";
  h.innerHTML = '<span style="display:flex;align-items:center;gap:5px;font-weight:600;font-size:13px"><span class="_hpDot" id="_hpPanelDot"></span> \u72D2\u72D2\u52A9\u624B</span>' +
    '<span style="display:flex;gap:6px;align-items:center">' +
    '<span id="_hpMinBtn" style="cursor:pointer;opacity:.8;font-size:16px;line-height:1;padding:0 2px">' + (isMin ? "+" : "\u2013") + '</span>' +
    '<span id="_hpCloseBtn" style="cursor:pointer;opacity:.7;font-size:14px;line-height:1;padding:0 2px">\u2715</span></span>';
  p.appendChild(h);

  // ═══ Body ═══
  var b = document.createElement("div");
  b.className = "_hpBody" + (isMin ? " hidden" : "");

  // Card 1: 状态 + 开关
  b.innerHTML =
    '<div class="_hpCard">' +
      '<div class="_hpRow">' +
        '<span class="stat" style="display:flex;align-items:center;gap:6px;font-size:12px;color:#555">' +
          '<span class="_hpDot" id="_hpStatusDot" style="background:#aaa"></span>' +
          '<span id="_hpStatusText">\u5C31\u7EEA</span>' +
        '</span>' +
        '<label class="_hpSwitch"><input id="_hpToggle" type="checkbox"><span class="_hpTrack"></span><span class="_hpThumb"></span></label>' +
      '</div>' +
    '</div>' +
    // Card 2: 倍速 + 统计
    '<div class="_hpCard">' +
      '<div class="_hpRow"><span style="font-size:12px">\u23E9 \u500D\u901F</span><div class="_hpSpeedGroup" id="_hpSpeedGroup">' +
        '<button class="_hpSpeedBtn active" data-speed="1">1x</button>' +
        '<button class="_hpSpeedBtn" data-speed="1.5">1.5x</button>' +
        '<button class="_hpSpeedBtn" data-speed="2">2x</button>' +
      '</div></div>' +
      '<div class="_hpRow"><span style="font-size:11px;color:#888">\uD83D\uDCCA \u4ECA\u65E5\u8FDB\u5EA6</span><span id="_hpProgress" style="font-size:11px;color:#888">\u52A0\u8F7D\u4E2D...</span></div>' +
    '</div>' +
    // Card 3: API Key
    '<div class="_hpCard">' +
      '<div class="_hpApiRow" id="_hpApiRow"><span>\uD83D\uDD11</span><span id="_hpApiStatus">\u68C0\u6D4B\u4E2D...</span><span style="flex:1"></span><span style="font-size:10px;color:#999">\u25BC</span></div>' +
      '<div class="_hpApiDrawer" id="_hpApiDrawer">' +
        '<input class="_hpApiInput" id="_hpApiInput" type="password" placeholder="\u8F93\u5165 DeepSeek API Key (sk-...)" autocomplete="off">' +
        '<div class="_hpApiActions">' +
          '<button class="_hpApiBtn save" id="_hpApiSave">\uD83D\uDCBE \u4FDD\u5B58</button>' +
          '<button class="_hpApiBtn test" id="_hpApiTest">\uD83D\uDCE1 \u6D4B\u8BD5</button>' +
          '<button class="_hpApiBtn del" id="_hpApiDel">\uD83D\uDDD1 \u5220\u9664</button>' +
        '</div>' +
      '</div>' +
    '</div>';

  p.appendChild(b);
  document.body.appendChild(p);

  // ═══ Drag ═══
  var dragging = false, offX = 0, offY = 0;
  h.addEventListener("mousedown", function(e) {
    if (e.target.id === "_hpMinBtn" || e.target.id === "_hpCloseBtn") return;
    dragging = true;
    var r = p.getBoundingClientRect();
    offX = e.clientX - r.left;
    offY = e.clientY - r.top;
    p.style.right = "auto";
    p.style.cursor = "grabbing";
    e.preventDefault();
  });
  document.addEventListener("mousemove", function(e) {
    if (!dragging) return;
    p.style.left = Math.max(0, Math.min(window.innerWidth - 40, e.clientX - offX)) + "px";
    p.style.top = Math.max(0, Math.min(window.innerHeight - 40, e.clientY - offY)) + "px";
  });
  document.addEventListener("mouseup", function() {
    if (!dragging) return;
    dragging = false; p.style.cursor = "";
    var r = p.getBoundingClientRect();
    savePos(r.left, r.top);
  });

  // ═══ Minimize / Close ═══
  document.getElementById("_hpMinBtn").onclick = function() {
    isMin = !isMin;
    b.classList.toggle("hidden", isMin);
    p.classList.toggle("minimized", isMin);
    this.textContent = isMin ? "+" : "\u2013";
    localStorage.setItem(MIN_KEY, isMin);
  };
  document.getElementById("_hpCloseBtn").onclick = function() { p.style.display = "none"; };

  // ═══ DOM refs ═══
  var sd = document.getElementById("_hpStatusDot");
  var st = document.getElementById("_hpStatusText");
  var tog = document.getElementById("_hpToggle");
  var sgrp = document.getElementById("_hpSpeedGroup");
  var prog = document.getElementById("_hpProgress");
  var apiRow = document.getElementById("_hpApiRow");
  var apiStat = document.getElementById("_hpApiStatus");
  var apiDraw = document.getElementById("_hpApiDrawer");
  var apiInp = document.getElementById("_hpApiInput");
  var apiSave = document.getElementById("_hpApiSave");
  var apiTest = document.getElementById("_hpApiTest");
  var apiDel = document.getElementById("_hpApiDel");

  var dCol = { idle:"#aaa", video_playing:"#22c55e", video_ended:"#f59e0b", answering_quiz:"#8b5cf6", advancing:"#3b82f6", error:"#ef4444", quiz_done:"#f59e0b" };
  var dLbl = { idle:"\u5C31\u7EEA", video_playing:"\u64AD\u653E\u89C6\u9891\u4E2D", video_ended:"\u7B49\u5F85\u4EFB\u52A1\u5B8C\u6210", answering_quiz:"\u81EA\u52A8\u7B54\u9898\u4E2D", advancing:"\u8DF3\u8F6C\u4E0B\u4E00\u8282", error:"\u51FA\u9519", quiz_done:"\u7B54\u9898\u5B8C\u6210" };

  // ═══ Status hook ═══
  var _orig = setState;
  setState = function(state, msg) {
    var c = dCol[state] || "#aaa";
    sd.style.background = c;
    document.getElementById("_hpPanelDot").style.background = c;
    st.textContent = msg || dLbl[state] || "\u5C31\u7EEA";
    _orig(state, msg);
  };
  setState(currentState, stateMessage);

  // ═══ Toggle ═══
  chrome.storage.sync.get("autoPlayEnabled", function(d) { tog.checked = d.autoPlayEnabled !== false; });
  tog.addEventListener("change", function() {
    chrome.storage.sync.set({ autoPlayEnabled: tog.checked });
    chrome.runtime.sendMessage({ action: "toggle-auto", enabled: tog.checked }).catch(function(){});
  });

  // ═══ Speed ═══
  chrome.storage.local.get("_hpSpeed", function(d) {
    var spd = d._hpSpeed || 1;
    var btns = sgrp.querySelectorAll("._hpSpeedBtn");
    for (var i = 0; i < btns.length; i++) btns[i].classList.toggle("active", parseFloat(btns[i].dataset.speed) === spd);
  });
  sgrp.addEventListener("click", function(e) {
    var btn = e.target.closest("._hpSpeedBtn");
    if (!btn) return;
    var spd = parseFloat(btn.dataset.speed);
    var btns = sgrp.querySelectorAll("._hpSpeedBtn");
    for (var i = 0; i < btns.length; i++) btns[i].classList.remove("active");
    btn.classList.add("active");
    chrome.storage.local.set({ _hpSpeed: spd });
    chrome.runtime.sendMessage({ action: "set-speed", speed: spd }).catch(function(){});
    var vids = document.querySelectorAll("video");
    for (var vi = 0; vi < vids.length; vi++) vids[vi].playbackRate = spd;
  });

  // ═══ Stats refresh ═══
  function refreshStats() {
    try {
      var today = new Date().toISOString().slice(0, 10);
      var s = JSON.parse(localStorage.getItem("_hpStats_" + today) || "null") || { videos: 0, quizzes: 0, completed: 0 };
      prog.textContent = "\u89C6\u9891 " + s.videos + " \u00B7 \u7B54\u9898 " + s.quizzes + " \u00B7 \u5B8C\u6210 " + s.completed;
    } catch(e) {}
  }
  refreshStats();
  setInterval(refreshStats, 5000);

  // ═══ API Key ═══
  var drawerOpen = false;
  apiRow.addEventListener("click", function(e) {
    if (e.target.tagName === "INPUT" || e.target.tagName === "BUTTON") return;
    drawerOpen = !drawerOpen;
    apiDraw.style.display = drawerOpen ? "block" : "none";
    if (drawerOpen) setTimeout(function() { apiInp.focus(); }, 100);
  });
  function refreshApiStat() {
    chrome.runtime.sendMessage({ action: "check-api-key" }, function(resp) {
      if (resp && resp.hasKey) { apiStat.textContent = "\u2705 \u5DF2\u8BBE\u7F6E"; apiStat.style.color = "#22c55e"; }
      else { apiStat.textContent = "\u26A0\uFE0F \u672A\u8BBE\u7F6E"; apiStat.style.color = "#f87171"; }
    });
  }
  refreshApiStat();
  apiSave.addEventListener("click", function() {
    var key = apiInp.value.trim();
    if (!key || !key.startsWith("sk-")) return;
    apiSave.disabled = true; apiSave.textContent = "\u23F3...";
    chrome.runtime.sendMessage({ action: "set-api-key", key: key }, function() {
      apiSave.disabled = false; apiSave.textContent = "\uD83D\uDCBE \u4FDD\u5B58";
      refreshApiStat(); apiDraw.style.display = "none"; drawerOpen = false; apiInp.value = "";
    });
  });
  apiTest.addEventListener("click", function() {
    apiTest.disabled = true; apiTest.textContent = "\u23F3...";
    chrome.runtime.sendMessage({ action: "test-api-key" }, function(resp) {
      apiTest.disabled = false; apiTest.textContent = "\uD83D\uDCE1 \u6D4B\u8BD5";
      if (resp && resp.success) { apiStat.textContent = "\u2705 \u8FDE\u63A5\u6210\u529F"; apiStat.style.color = "#22c55e"; }
      else { apiStat.textContent = "\u274C " + (resp && resp.error || "\u5931\u8D25"); apiStat.style.color = "#ef4444"; }
      setTimeout(refreshApiStat, 3000);
    });
  });
  apiDel.addEventListener("click", function() {
    if (!confirm("\u786E\u5B9A\u5220\u9664\u5417\uFF1F")) return;
    chrome.runtime.sendMessage({ action: "delete-api-key" }, function() { refreshApiStat(); apiDraw.style.display = "none"; drawerOpen = false; });
  });
  apiInp.addEventListener("keydown", function(e) { if (e.key === "Enter") apiSave.click(); });
})();
