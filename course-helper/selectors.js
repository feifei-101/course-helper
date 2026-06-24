/**
 * @file 超星平台 DOM 选择器配置
 * 所有与 Chaoxing 页面结构相关的 CSS 选择器集中在此文件。
 * 超星改版时，只需修改此文件，无需改动业务逻辑。
 * @typedef {Object} ChaoxingSelectors
 */

/** @type {ChaoxingSelectors} */
var CHAOXING_SELECTORS = {
  // ─── 视频相关 ───
  videoEl: '#video_html5_api, video, .video-js video, .prism-player video',
  playButton: '.vjs-big-play-button, .prism-big-play-btn, [class*=play-btn], [class*=play-button]',

  // ─── 任务完成检测 ───
  taskCompletedTextTags: 'span, div, p, label, i, em',
  taskCompletedTexts: ['已完成', '完成', '任务完成'],
  completedClassSelectors: '[class*=complete], .finished, .taskComplete, .jobComplete',

  // ─── 答题相关 ───
  questionItem: '.TiMu',
  questionTitle: '.Zy_TItle_p',
  questionOptions: '.Cy_ulBg li, ul li, .answerOption',
  questionSubmitDisabled: '[class*=submit][class*=disabled], .disabled, [disabled]',
  submitDoneTexts: ['已完成', '已提交', '任务完成', '提交成功'],
  radioInputs: 'input[type=radio], .radio, [type=radio], .answerRadio input',
  checkboxInputs: 'input[type=checkbox], .checkbox, [type=checkbox], .answerCheckbox input',
  textInputs: 'input[type=text], input:not([type]), input.iptLex, .blankInput input',
  textareas: 'textarea',

  // ─── 提交按钮 ───
  submitButtons: '#submitBtn, .submitBtn, .btnSubmit, button[class*=submit], a[class*=submit], .saveLi input, [value=保存], [value=提交]',

  // ─── 下一节按钮 ───
  nextButtons: '#prevNextFocusNext, #nextFocus, #nextBtn, .nextBtn, .next_btn, a[class*=next], button[class*=next], span[class*=next], i[class*=next], [data-btn*=next], [data-name*=next], [class*=nextFocus], a.next, button.next',
  nextTextMatch: ['下一', 'next'],

  // ─── 课程页面检测 ───
  coursePage: '.ans-attach-online, .ans-insertvideo-online, iframe[src*=video], iframe[src*=play], #prevNextFocusNext',
  quizFrame: 'selectWorkQuestionYiPiYue',

  // ─── IFrame 视频检测 ───
  courseFrameIframe: 'iframe[src*=video], iframe[src*=course]',
};

// ─── 类型定义（JSDoc，构建 TS 时转成 .d.ts）───
/**
 * @typedef {Object} ChaoxingSelectors
 * @property {string} videoEl - 视频元素选择器
 * @property {string} playButton - 播放按钮选择器
 * @property {string} taskCompletedTextTags - 含完成文本的标签
 * @property {string[]} taskCompletedTexts - 完成状态文字
 * @property {string} completedClassSelectors - 完成状态类名
 * @property {string} questionItem - 题目容器
 * @property {string} questionTitle - 题目标题
 * @property {string} questionOptions - 选项列表
 * @property {string} submitButtons - 提交按钮
 * @property {string} nextButtons - 下一节按钮
 * @property {string} coursePage - 课程页面特征
 * @property {string} quizFrame - 答题 iframe URL 特征
 */
