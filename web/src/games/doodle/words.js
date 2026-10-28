// Words for Doodle Race, and how guesses are checked against them.
//
// Every word comes in each site language, so the players in one room each see the word, and
// its hint, in their own. The host accepts a guess in any of them. After the shown spelling, a
// '|' lists other spellings that also count.
import { mulberry32, shuffle } from '../ascii/random'

export const LANGS = ['EN', 'TR', 'RU', 'KK']

const EASY = [
  { EN: 'sun', TR: 'güneş', RU: 'солнце', KK: 'күн' },
  { EN: 'moon', TR: 'ay', RU: 'луна|месяц', KK: 'ай' },
  { EN: 'star', TR: 'yıldız', RU: 'звезда', KK: 'жұлдыз' },
  { EN: 'tree', TR: 'ağaç', RU: 'дерево', KK: 'ағаш' },
  { EN: 'house', TR: 'ev', RU: 'дом|домик', KK: 'үй' },
  { EN: 'cat', TR: 'kedi', RU: 'кошка|кот', KK: 'мысық' },
  { EN: 'dog', TR: 'köpek', RU: 'собака|пёс', KK: 'ит' },
  { EN: 'fish', TR: 'balık', RU: 'рыба|рыбка', KK: 'балық' },
  { EN: 'apple', TR: 'elma', RU: 'яблоко', KK: 'алма' },
  { EN: 'ball', TR: 'top', RU: 'мяч', KK: 'доп' },
  { EN: 'car', TR: 'araba', RU: 'машина|автомобиль', KK: 'көлік|машина' },
  { EN: 'flower', TR: 'çiçek', RU: 'цветок', KK: 'гүл' },
  { EN: 'heart', TR: 'kalp', RU: 'сердце', KK: 'жүрек' },
  { EN: 'eye', TR: 'göz', RU: 'глаз', KK: 'көз' },
  { EN: 'hat', TR: 'şapka', RU: 'шляпа|шапка', KK: 'қалпақ|шляпа' },
  { EN: 'cup|mug', TR: 'fincan|bardak|kupa', RU: 'чашка|кружка', KK: 'кесе|шыныаяқ' },
  { EN: 'key', TR: 'anahtar', RU: 'ключ', KK: 'кілт' },
  { EN: 'book', TR: 'kitap', RU: 'книга', KK: 'кітап' },
  { EN: 'bird', TR: 'kuş', RU: 'птица|птичка', KK: 'құс' },
  { EN: 'snake', TR: 'yılan', RU: 'змея', KK: 'жылан' },
  { EN: 'egg', TR: 'yumurta', RU: 'яйцо', KK: 'жұмыртқа' },
  { EN: 'cloud', TR: 'bulut', RU: 'облако|туча', KK: 'бұлт' },
  { EN: 'rain', TR: 'yağmur', RU: 'дождь', KK: 'жаңбыр' },
  { EN: 'door', TR: 'kapı', RU: 'дверь', KK: 'есік' },
  { EN: 'chair', TR: 'sandalye', RU: 'стул', KK: 'орындық' },
  { EN: 'table', TR: 'masa', RU: 'стол', KK: 'үстел' },
  { EN: 'clock', TR: 'saat', RU: 'часы', KK: 'сағат' },
  { EN: 'phone', TR: 'telefon', RU: 'телефон', KK: 'телефон' },
  { EN: 'banana', TR: 'muz', RU: 'банан', KK: 'банан' },
  { EN: 'pizza', TR: 'pizza', RU: 'пицца', KK: 'пицца' },
  { EN: 'ice cream', TR: 'dondurma', RU: 'мороженое', KK: 'балмұздақ' },
  { EN: 'umbrella', TR: 'şemsiye', RU: 'зонт|зонтик', KK: 'қолшатыр' },
  { EN: 'glasses', TR: 'gözlük', RU: 'очки', KK: 'көзілдірік' },
  { EN: 'boat', TR: 'tekne|kayık', RU: 'лодка', KK: 'қайық' },
  { EN: 'bed', TR: 'yatak', RU: 'кровать', KK: 'кереует|төсек' },
  { EN: 'candle', TR: 'mum', RU: 'свеча|свечка', KK: 'балауыз шам|шам|шырақ' },
  { EN: 'mountain', TR: 'dağ', RU: 'гора', KK: 'тау' },
  { EN: 'bread', TR: 'ekmek', RU: 'хлеб', KK: 'нан' },
  { EN: 'spoon', TR: 'kaşık', RU: 'ложка', KK: 'қасық' },
  { EN: 'ring', TR: 'yüzük', RU: 'кольцо', KK: 'жүзік' },
  { EN: 'kite', TR: 'uçurtma', RU: 'воздушный змей', KK: 'батпырауық' },
  { EN: 'pencil', TR: 'kurşun kalem|kalem', RU: 'карандаш', KK: 'қарындаш' },
  { EN: 'balloon', TR: 'balon', RU: 'воздушный шар|шарик', KK: 'әуе шары|шар' },
  { EN: 'butterfly', TR: 'kelebek', RU: 'бабочка', KK: 'көбелек' },
  { EN: 'snowman', TR: 'kardan adam', RU: 'снеговик', KK: 'аққала' },
  { EN: 'tooth', TR: 'diş', RU: 'зуб', KK: 'тіс' },
  { EN: 'hand', TR: 'el', RU: 'рука|ладонь', KK: 'қол' },
  { EN: 'rainbow', TR: 'gökkuşağı', RU: 'радуга', KK: 'кемпірқосақ' },
  { EN: 'carrot', TR: 'havuç', RU: 'морковь|морковка', KK: 'сәбіз' },
  { EN: 'duck', TR: 'ördek', RU: 'утка', KK: 'үйрек' },
  { EN: 'horse', TR: 'at', RU: 'лошадь|конь', KK: 'жылқы|ат' },
  { EN: 'teapot|kettle', TR: 'çaydanlık', RU: 'чайник', KK: 'шәйнек' }
]

const MEDIUM = [
  { EN: 'bicycle|bike', TR: 'bisiklet', RU: 'велосипед', KK: 'велосипед' },
  { EN: 'airplane|plane|aeroplane', TR: 'uçak', RU: 'самолёт', KK: 'ұшақ' },
  { EN: 'guitar', TR: 'gitar', RU: 'гитара', KK: 'гитара' },
  { EN: 'elephant', TR: 'fil', RU: 'слон', KK: 'піл' },
  { EN: 'giraffe', TR: 'zürafa', RU: 'жираф', KK: 'керік' },
  { EN: 'penguin', TR: 'penguen', RU: 'пингвин', KK: 'пингвин' },
  { EN: 'rocket', TR: 'roket', RU: 'ракета', KK: 'зымыран|ракета' },
  { EN: 'castle', TR: 'kale|şato', RU: 'замок', KK: 'қамал' },
  { EN: 'lighthouse', TR: 'deniz feneri|fener', RU: 'маяк', KK: 'маяк|шамшырақ' },
  { EN: 'camera', TR: 'fotoğraf makinesi|kamera', RU: 'фотоаппарат|камера', KK: 'фотоаппарат|камера' },
  { EN: 'scissors', TR: 'makas', RU: 'ножницы', KK: 'қайшы' },
  { EN: 'ladder', TR: 'merdiven', RU: 'лестница|стремянка', KK: 'баспалдақ' },
  { EN: 'bridge', TR: 'köprü', RU: 'мост', KK: 'көпір' },
  { EN: 'spider', TR: 'örümcek', RU: 'паук', KK: 'өрмекші' },
  { EN: 'octopus', TR: 'ahtapot', RU: 'осьминог', KK: 'сегізаяқ' },
  { EN: 'turtle|tortoise', TR: 'kaplumbağa', RU: 'черепаха', KK: 'тасбақа' },
  { EN: 'volcano', TR: 'yanardağ|volkan', RU: 'вулкан', KK: 'жанартау|вулкан' },
  { EN: 'tent', TR: 'çadır', RU: 'палатка', KK: 'шатыр|палатка' },
  { EN: 'anchor', TR: 'çapa', RU: 'якорь', KK: 'зәкір' },
  { EN: 'crown', TR: 'taç', RU: 'корона', KK: 'тәж' },
  { EN: 'robot', TR: 'robot', RU: 'робот', KK: 'робот' },
  { EN: 'pyramid', TR: 'piramit', RU: 'пирамида', KK: 'пирамида' },
  { EN: 'windmill', TR: 'yel değirmeni|değirmen', RU: 'мельница|ветряная мельница', KK: 'жел диірмені|диірмен' },
  { EN: 'hamburger|burger', TR: 'hamburger', RU: 'гамбургер|бургер', KK: 'гамбургер|бургер' },
  { EN: 'watermelon', TR: 'karpuz', RU: 'арбуз', KK: 'қарбыз' },
  { EN: 'snail', TR: 'salyangoz', RU: 'улитка', KK: 'ұлу' },
  { EN: 'cactus', TR: 'kaktüs', RU: 'кактус', KK: 'кактус' },
  { EN: 'helicopter', TR: 'helikopter', RU: 'вертолёт', KK: 'тікұшақ|вертолет' },
  { EN: 'train', TR: 'tren', RU: 'поезд', KK: 'пойыз|поезд' },
  { EN: 'headphones|headset', TR: 'kulaklık', RU: 'наушники', KK: 'құлаққап' },
  { EN: 'toothbrush', TR: 'diş fırçası', RU: 'зубная щётка', KK: 'тіс щеткасы' },
  { EN: 'backpack', TR: 'sırt çantası|çanta', RU: 'рюкзак', KK: 'арқа сөмке|рюкзак' },
  { EN: 'mermaid', TR: 'deniz kızı', RU: 'русалка', KK: 'су перісі' },
  { EN: 'dragon', TR: 'ejderha', RU: 'дракон', KK: 'айдаһар' },
  { EN: 'ghost', TR: 'hayalet', RU: 'привидение|призрак', KK: 'елес' },
  { EN: 'pirate', TR: 'korsan', RU: 'пират', KK: 'теңіз қарақшысы|қарақшы' },
  { EN: 'island', TR: 'ada', RU: 'остров', KK: 'арал' },
  { EN: 'tornado', TR: 'hortum|kasırga', RU: 'торнадо|смерч', KK: 'құйын|торнадо' },
  { EN: 'kangaroo', TR: 'kanguru', RU: 'кенгуру', KK: 'кенгуру' },
  { EN: 'owl', TR: 'baykuş', RU: 'сова', KK: 'үкі' },
  { EN: 'waterfall', TR: 'şelale', RU: 'водопад', KK: 'сарқырама' },
  { EN: 'camel', TR: 'deve', RU: 'верблюд', KK: 'түйе' },
  { EN: 'eagle', TR: 'kartal', RU: 'орёл', KK: 'бүркіт|қыран' },
  { EN: 'yurt', TR: 'otağ|yurt', RU: 'юрта', KK: 'киіз үй' },
  { EN: 'mushroom', TR: 'mantar', RU: 'гриб', KK: 'саңырауқұлақ' },
  { EN: 'crab', TR: 'yengeç', RU: 'краб', KK: 'шаян|краб' },
  { EN: 'tractor', TR: 'traktör', RU: 'трактор', KK: 'трактор' },
  { EN: 'cake', TR: 'pasta|kek', RU: 'торт', KK: 'торт' },
  { EN: 'drum', TR: 'davul', RU: 'барабан', KK: 'барабан|дабыл' }
]

const HARD = [
  { EN: 'astronaut|cosmonaut|spaceman', TR: 'astronot', RU: 'космонавт|астронавт', KK: 'ғарышкер' },
  { EN: 'microscope', TR: 'mikroskop', RU: 'микроскоп', KK: 'микроскоп' },
  { EN: 'compass', TR: 'pusula', RU: 'компас', KK: 'компас' },
  { EN: 'telescope', TR: 'teleskop', RU: 'телескоп', KK: 'телескоп' },
  { EN: 'dinosaur', TR: 'dinozor', RU: 'динозавр', KK: 'динозавр' },
  { EN: 'submarine', TR: 'denizaltı', RU: 'подводная лодка|подлодка|субмарина', KK: 'сүңгуір қайық|суасты қайығы' },
  { EN: 'vacuum cleaner|vacuum', TR: 'elektrik süpürgesi|süpürge', RU: 'пылесос', KK: 'шаңсорғыш' },
  { EN: 'traffic light|traffic lights', TR: 'trafik lambası', RU: 'светофор', KK: 'бағдаршам' },
  { EN: 'hourglass', TR: 'kum saati', RU: 'песочные часы', KK: 'құм сағат' },
  { EN: 'fire extinguisher|extinguisher', TR: 'yangın söndürücü', RU: 'огнетушитель', KK: 'өрт сөндіргіш' },
  { EN: 'jellyfish', TR: 'denizanası', RU: 'медуза', KK: 'медуза' },
  { EN: 'chameleon', TR: 'bukalemun', RU: 'хамелеон', KK: 'хамелеон' },
  { EN: 'hedgehog', TR: 'kirpi', RU: 'ёж|ёжик', KK: 'кірпі' },
  { EN: 'peacock', TR: 'tavus kuşu', RU: 'павлин', KK: 'тауыс' },
  { EN: 'flamingo', TR: 'flamingo', RU: 'фламинго', KK: 'қоқиқаз|фламинго' },
  { EN: 'skeleton', TR: 'iskelet', RU: 'скелет', KK: 'қаңқа' },
  { EN: 'magnet', TR: 'mıknatıs', RU: 'магнит', KK: 'магнит' },
  { EN: 'lightning', TR: 'şimşek|yıldırım', RU: 'молния', KK: 'найзағай' },
  { EN: 'earthquake', TR: 'deprem', RU: 'землетрясение', KK: 'жер сілкінісі' },
  { EN: 'sunflower', TR: 'ayçiçeği', RU: 'подсолнух', KK: 'күнбағыс' },
  { EN: 'diver|scuba diver', TR: 'dalgıç', RU: 'водолаз|дайвер', KK: 'сүңгуір' },
  { EN: 'trampoline', TR: 'trambolin', RU: 'батут', KK: 'батут' },
  { EN: 'sushi', TR: 'suşi', RU: 'суши', KK: 'суши' },
  { EN: 'hammock', TR: 'hamak', RU: 'гамак', KK: 'гамак' },
  { EN: 'juggler', TR: 'jonglör|hokkabaz', RU: 'жонглёр', KK: 'жонглёр' },
  { EN: 'eclipse|solar eclipse', TR: 'güneş tutulması|tutulma', RU: 'затмение|солнечное затмение', KK: 'күн тұтылуы|тұтылу' },
  { EN: 'ferris wheel', TR: 'dönme dolap', RU: 'колесо обозрения', KK: 'шолу дөңгелегі' },
  { EN: 'chandelier', TR: 'avize', RU: 'люстра', KK: 'аспашам|люстра' },
  { EN: 'pineapple', TR: 'ananas', RU: 'ананас', KK: 'ананас' },
  { EN: 'saxophone|sax', TR: 'saksafon', RU: 'саксофон', KK: 'саксофон' },
  { EN: 'accordion', TR: 'akordeon', RU: 'аккордеон|баян|гармонь', KK: 'аккордеон|сырнай' },
  { EN: 'harp', TR: 'arp', RU: 'арфа', KK: 'арфа' },
  { EN: 'excavator|digger', TR: 'ekskavatör|kepçe', RU: 'экскаватор', KK: 'экскаватор' },
  { EN: 'satellite', TR: 'uydu', RU: 'спутник', KK: 'жерсерік|серік|спутник' },
  { EN: 'parachute', TR: 'paraşüt', RU: 'парашют', KK: 'парашют' },
  { EN: 'fireworks', TR: 'havai fişek', RU: 'салют|фейерверк', KK: 'отшашу|салют' },
  { EN: 'treasure', TR: 'hazine', RU: 'сокровище|клад', KK: 'қазына' },
  { EN: 'vampire', TR: 'vampir', RU: 'вампир', KK: 'вампир' },
  { EN: 'igloo', TR: 'iglo', RU: 'иглу', KK: 'иглу' },
  { EN: 'stethoscope', TR: 'stetoskop', RU: 'стетоскоп', KK: 'стетоскоп' }
]

// level 1 is easy, 2 medium, 3 hard; a word's points are multiplied by its level
export const WORDS = [EASY, MEDIUM, HARD].flatMap((list, i) => list.map(word => ({ ...word, level: i + 1 })))

const spellings = (word, lang) => (word[lang] || word.EN).split('|')

/** The spelling a player sees, in their language. */
export const shownWord = (id, lang) => spellings(WORDS[id], lang)[0]

// Letters a keyboard may not have fold to the plain ones: Turkish ı, Kazakh Ә Ғ Қ Ң Ө Ұ Ү Һ І.
// Accents (ö, ş, ё, й...) come off with the combining marks.
const FOLD = { ı: 'i', ә: 'а', ғ: 'г', қ: 'к', ң: 'н', ө: 'о', ұ: 'у', ү: 'у', һ: 'х', і: 'и' }

/** Lower case, no accents, folded letters, words split by single spaces. */
export const fold = (text) => String(text).toLowerCase()
  .normalize('NFD').replace(/\p{M}/gu, '')
  .replace(/[ıәғқңөұүһі]/g, ch => FOLD[ch])
  .replace(/[^\p{L}\p{N}]+/gu, ' ')
  .trim()

const words = (text) => fold(text).split(' ').filter(Boolean)

/**
 * Whether a guess names the word. The whole guess may be the word in any language, without
 * spaces too ("icecream"); in the guesser's own language the word may also come up inside a
 * longer message ("is it a cat?").
 */
export function isRightGuess (guess, id, lang) {
  const said = words(guess)
  if (!said.length) return false
  const joined = said.join('')
  for (const code of LANGS) {
    for (const spelling of spellings(WORDS[id], code)) {
      const answer = words(spelling)
      if (answer.join('') === joined) return true
      if (code !== lang) continue
      for (let i = 0; i + answer.length <= said.length; i++) {
        if (answer.every((part, j) => said[i + j] === part)) return true
      }
    }
  }
  return false
}

// Edit distance, giving up past `max`
function distance (a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1
  let previous = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const row = [i]
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(previous[j] + 1, row[j - 1] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
    if (Math.min(...row) > max) return max + 1
    previous = row
  }
  return previous[b.length]
}

/** A guess one letter off the word (two for long words), in any language. */
export function isCloseGuess (guess, id) {
  const said = words(guess).join('')
  if (said.length < 3) return false
  return LANGS.some(code => spellings(WORDS[id], code).some(spelling => {
    const answer = words(spelling).join('')
    if (answer.length < 4) return false
    const max = answer.length >= 9 ? 2 : 1
    const off = distance(said, answer, max)
    return off > 0 && off <= max
  }))
}

/**
 * The word as a guesser sees it: '_' for every letter still hidden, spaces and other marks
 * as they are. `revealed` letters show, at most half of them, picked by `seed` so they stay
 * the same all turn.
 */
export function hintFor (id, lang, revealed, seed) {
  const chars = [...shownWord(id, lang)]
  const letters = chars.flatMap((ch, i) => (/[\p{L}\p{N}]/u.test(ch) ? [i] : []))
  const count = Math.max(0, Math.min(revealed, Math.floor((letters.length - 1) / 2)))
  const open = new Set(shuffle([...letters], mulberry32(seed)).slice(0, count))
  return chars.map((ch, i) => (letters.includes(i) && !open.has(i) ? '_' : ch)).join('')
}

/** One word of each level for the drawer to pick from, avoiding words this game already had. */
export function pickChoices (used, random = Math.random) {
  return [1, 2, 3].map(level => {
    const pool = WORDS.flatMap((word, id) => (word.level === level ? [id] : []))
    const fresh = pool.filter(id => !used.includes(id))
    const from = fresh.length ? fresh : pool
    return from[Math.floor(random() * from.length)]
  })
}
