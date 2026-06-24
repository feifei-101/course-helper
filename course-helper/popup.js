(function() {
  "use strict";
  var dot = document.getElementById("popupDot");
  var sd = document.getElementById("popupStatusDot");
  var st = document.getElementById("popupStatusText");
  var tm = document.getElementById("popupTime");
  var tog = document.getElementById("popupToggle");
  var sgrp = document.getElementById("popupSpeedGroup");
  var prog = document.getElementById("popupProgress");
  var apiRow = document.getElementById("popupApiRow");
  var apiStat = document.getElementById("popupApiStatus");
  var apiDraw = document.getElementById("popupApiDrawer");
  var apiInp = document.getElementById("popupApiInput");
  var apiSave = document.getElementById("popupApiSave");
  var apiTest = document.getElementById("popupApiTest");
  var apiDel = document.getElementById("popupApiDel");

  var dCol = { idle:"#aaa", video_playing:"#22c55e", video_ended:"#f59e0b", answering_quiz:"#8b5cf6", advancing:"#3b82f6", error:"#ef4444", quiz_done:"#f59e0b" };
  var dLbl = { idle:"\u5C31\u7EEA", video_playing:"\u64AD\u653E\u89C6\u9891\u4E2D", video_ended:"\u7B49\u5F85\u4EFB\u52A1\u5B8C\u6210", answering_quiz:"\u81EA\u52A8\u7B54\u9898\u4E2D", advancing:"\u8DF3\u8F6C\u4E0B\u4E00\u8282", error:"\u51FA\u9519", quiz_done:"\u7B54\u9898\u5B8C\u6210" };

  function getTab(cb) { chrome.tabs.query({ active: true, currentWindow: true }, function(t) { cb(t[0]); }); }

  function refresh() {
    getTab(function(tab) {
      if (!tab) { st.textContent = "\u65E0\u9875\u9762"; return; }
      chrome.tabs.sendMessage(tab.id, { action: "get-status" }, function(r) {
        if (r) { st.textContent = r.message || dLbl[r.state] || "\u5C31\u7EEA"; var c = dCol[r.state] || "#aaa"; sd.style.background = c; dot.style.background = c; tog.checked = r.autoPlay !== false; }
        else { st.textContent = "\u9875\u9762\u672A\u52A0\u8F7D"; sd.style.background = "#aaa"; }
      });
    });
    tm.textContent = new Date().toLocaleTimeString("zh-CN", { hour:"2-digit", minute:"2-digit" });
  }

  // Speed
  chrome.storage.local.get("_hpSpeed", function(d) {
    var spd = d._hpSpeed || 1;
    var btns = sgrp.querySelectorAll(".speed-btn");
    for (var i = 0; i < btns.length; i++) btns[i].classList.toggle("active", parseFloat(btns[i].dataset.speed) === spd);
  });
  sgrp.addEventListener("click", function(e) {
    var btn = e.target.closest(".speed-btn"); if (!btn) return;
    var spd = parseFloat(btn.dataset.speed);
    var btns = sgrp.querySelectorAll(".speed-btn");
    for (var i = 0; i < btns.length; i++) btns[i].classList.remove("active");
    btn.classList.add("active");
    chrome.storage.local.set({ _hpSpeed: spd });
    getTab(function(tab) { if (tab && tab.id) chrome.tabs.sendMessage(tab.id, { action: "set-speed", speed: spd }).catch(function(){}); });
  });

  // Toggle
  chrome.storage.sync.get("autoPlayEnabled", function(d) { tog.checked = d.autoPlayEnabled !== false; });
  tog.addEventListener("change", function() {
    chrome.storage.sync.set({ autoPlayEnabled: tog.checked });
    getTab(function(tab) { if (tab && tab.id) chrome.tabs.sendMessage(tab.id, { action: "toggle-auto", enabled: tog.checked }).catch(function(){}); });
  });

  // Stats
  function refreshStats() {
    getTab(function(tab) {
      if (!tab || !tab.id) return;
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: function() {
          try { var d = new Date().toISOString().slice(0,10); return JSON.parse(localStorage.getItem("_hpStats_"+d)||"null")||{videos:0,quizzes:0,completed:0}; } catch(e){return null;}
        }
      }).then(function(r) { if (r&&r[0]&&r[0].result) { var s=r[0].result; prog.textContent="\u89C6\u9891 "+s.videos+" \u00B7 \u7B54\u9898 "+s.quizzes+" \u00B7 \u5B8C\u6210 "+s.completed; } }).catch(function(){});
    });
  }

  // API Key
  var drawerOpen = false;
  apiRow.addEventListener("click", function(e) {
    if (e.target.tagName === "INPUT" || e.target.tagName === "BUTTON") return;
    drawerOpen = !drawerOpen;
    apiDraw.style.display = drawerOpen ? "block" : "none";
    if (drawerOpen) setTimeout(function() { apiInp.focus(); }, 100);
  });
  function refreshApiStat() {
    chrome.runtime.sendMessage({ action: "check-api-key" }, function(r) {
      if (r && r.hasKey) { apiStat.textContent = "\u2705 \u5DF2\u8BBE\u7F6E"; apiStat.style.color = "#22c55e"; }
      else { apiStat.textContent = "\u26A0\uFE0F \u672A\u8BBE\u7F6E"; apiStat.style.color = "#f87171"; }
    });
  }
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
    chrome.runtime.sendMessage({ action: "test-api-key" }, function(r) {
      apiTest.disabled = false; apiTest.textContent = "\uD83D\uDCE1 \u6D4B\u8BD5";
      if (r && r.success) { apiStat.textContent = "\u2705 \u8FDE\u63A5\u6210\u529F"; apiStat.style.color = "#22c55e"; }
      else { apiStat.textContent = "\u274C " + (r && r.error || "\u5931\u8D25"); apiStat.style.color = "#ef4444"; }
      setTimeout(refreshApiStat, 3000);
    });
  });
  apiDel.addEventListener("click", function() {
    if (!confirm("\u786E\u5B9A\u5220\u9664\u5417\uFF1F")) return;
    chrome.runtime.sendMessage({ action: "delete-api-key" }, function() { refreshApiStat(); apiDraw.style.display = "none"; drawerOpen = false; });
  });
  apiInp.addEventListener("keydown", function(e) { if (e.key === "Enter") apiSave.click(); });

  refresh(); refreshStats(); refreshApiStat();
  setInterval(refresh, 2000);
})();
