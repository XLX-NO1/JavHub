// 全局显示语言配置：'ja' = 日文优先 | 'en' = 英文优先
// 模块级响应式，所有引用者共享同一个实例
import { ref, watch } from 'vue'

const DISPLAY_LANG_KEY = 'javhub_display_lang'

function createDisplayLang() {
  const stored = localStorage.getItem(DISPLAY_LANG_KEY)
  const lang = ref(stored === 'en' ? 'en' : 'ja') // 默认日文

  watch(lang, (val) => {
    localStorage.setItem(DISPLAY_LANG_KEY, val)
  })

  return lang
}

export const displayLang = createDisplayLang()

/**
 * 根据全局语言设置，返回合适的名字字段
 * @param {object} item - 含有 name_ja/name_en 或 name_kanji/name_romaji 的对象
 * @param {string} jaField - 日文字段名，如 'name_ja' 或 'name_kanji'
 * @param {string} enField - 英文字段名，如 'name_en' 或 'name_romaji'
 */
export function displayName(item, jaField = 'name_ja', enField = 'name_en') {
  if (!item) return ''
  const ja = item[jaField]
  const en = item[enField]
  return displayLang.value === 'en' ? (en || ja || '') : (ja || en || '')
}
