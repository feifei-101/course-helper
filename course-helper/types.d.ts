/**
 * @file 狒狒助手类型定义
 * JSDoc 类型声明，使 VS Code / tsc 能提供类型检查。
 * 迁移到真正的 .ts 文件时，这些类型可以直接复用。
 */

/**
 * 扩展内部消息 Action 枚举
 * @typedef {('toggle-auto'|'ask-ai'|'answer-quiz'|'set-speed'|'get-status'|'keepalive'|'show-ai-search'|'ping')} ActionType
 */

/**
 * 扩展消息格式
 * @typedef {Object} ExtensionMessage
 * @property {ActionType} action - 消息类型
 * @property {string} [text] - 文本内容
 * @property {boolean} [enabled] - 开关状态
 * @property {number} [speed] - 播放速度
 */

/**
 * DeepSeek API 响应格式
 * @typedef {Object} DeepSeekResponse
 * @property {Array<{message: {content: string}}>} choices
 */

/**
 * 学习日统计
 * @typedef {Object} DailyStats
 * @property {number} videos - 已看视频数
 * @property {number} quizzes - 已答题数
 * @property {number} completed - 已完成节数
 */

/**
 * 运行时状态
 * @typedef {('idle'|'video_playing'|'video_ended'|'answering_quiz'|'advancing'|'error'|'quiz_done')} RuntimeState
 */

/**
 * 答题频率限制键
 * @typedef {Object} RateLimitKeys
 * @property {string} dailyKey
 * @property {string} hourlyKey
 */
