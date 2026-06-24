import os
path = "C:/Users/Lenovo/Desktop/course-helper/content.js"

# Helper: build status labels with unicode escapes
S = {}
S["idle"] = "\u5c31\u7eea"
S["video_playing"] = "\u64ad\u653e\u89c6\u9891\u4e2d"
S["video_ended"] = "\u7b49\u5f85\u5b8c\u6210\u4efb\u52a1"
S["answering_quiz"] = "\u81ea\u52a8\u7b54\u9898\u4e2d"
S["advancing"] = "\u8df3\u8f6c\u4e0b\u4e00\u8282"
S["error"] = "\u51fa\u9519"

def ss(s):
    """Replace Chinese placeholders with actual unicode"""
    result = s
    result = result.replace("【状态-就绪】", S["idle"])
    result = result.replace("【状态-播放中】", S["video_playing"])
    result = result.replace("【状态-等待任务】", S["video_ended"])
    result = result.replace("【状态-答题中】", S["answering_quiz"])
    result = result.replace("【状态-跳转】", S["advancing"])
    result = result.replace("【状态-出错】", S["error"])
    return result

code = open(path, "r", encoding="utf-8").read()
code = ss(code)
open(path, "w", encoding="utf-8").write(code)
print("Fixed", code.count("\u5c31\u7eea"), "occurrences of 就绪")