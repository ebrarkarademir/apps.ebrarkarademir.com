// Chat safety: a small profanity filter for the site's four languages, and a rate limit.
//
// Words are compared after lower-casing, dropping accents (ö → o, ё → е) and undoing common
// look-alikes (4 → a, 0 → o, $ → s). Turkish ı is kept as it is, so "sıkıntı" never looks
// like a swear word. Plain entries match the start of a word ("fuck" catches "fucking"),
// '=' entries only the whole word, '*' entries anywhere inside one.
const WORDS = [
  // English
  '*fuck', 'shit', 'bitch', 'cunt', 'asshole', '=ass', '=dick', 'dickhead', 'bastard', 'whore',
  'slut', '*nigg', '=fag', 'faggot', 'retard', 'wank', 'twat', '=prick', 'pussy', '=cock',
  // Turkish
  '=amk', '=aq', 'amına', 'amina', 'amcık', 'orospu', '=sik', 'sikerim', 'sikeyim', 'siktir',
  'sikim', 'yarrak', 'yarak', 'ibne', 'pezevenk', 'kahpe', 'yavşak', 'gavat', 'kaltak',
  'dalyarak',
  // Russian
  '*хуй', '*хуе', '*хуя', '*пизд', 'ебат', 'ебан', 'ебал', 'ебу', 'бля', 'сука', 'суки',
  'мудак', 'пидор', 'гандон', 'шлюх', 'залуп', 'долбоеб',
  // Kazakh
  'қотақ', 'котак', '=сік', '=сик', 'сігейін', 'сигеиин', 'шешеңді', 'шешенди'
]

const LOOKALIKE = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', '@': 'a', $: 's' }

const normalize = (word) => word.toLowerCase()
  .replace(/[013457@$]/g, ch => LOOKALIKE[ch])
  .normalize('NFD').replace(/\p{M}/gu, '')

const RULES = WORDS.map(entry => {
  const how = '=*'.includes(entry[0]) ? entry[0] : '^'
  return { how, stem: normalize(how === '^' ? entry : entry.slice(1)) }
})

const isBad = (word) => {
  const w = normalize(word)
  return RULES.some(({ how, stem }) => (how === '=' ? w === stem : how === '*' ? w.includes(stem) : w.startsWith(stem)))
}

const WORD = /[\p{L}\p{N}@$]+/gu

/** Tidies a chat line (no control characters, single spaces, at most `max` long) and stars out swear words. */
export function cleanText (raw, max = 120) {
  const text = String(raw ?? '')
    .replace(/[\u0000-\u001f\u007f​-‏‪-‮⁦-⁩]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
  return text.replace(WORD, word => (isBad(word) ? '*'.repeat([...word].length) : word))
}

export const isClean = (text) => !(String(text).match(WORD) || []).some(isBad)

/** A token bucket: `size` actions at once, then one more every `refillMs`. */
export function createBucket (size, refillMs) {
  let tokens = size
  let at = Date.now()
  return {
    take () {
      const now = Date.now()
      tokens = Math.min(size, tokens + (now - at) / refillMs)
      at = now
      if (tokens < 1) return false
      tokens -= 1
      return true
    }
  }
}
