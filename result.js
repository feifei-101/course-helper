const params = new URLSearchParams(location.search);
const text = params.get("text") || "无内容";
document.getElementById("result").textContent = text;
