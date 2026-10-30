// Passwords for Password Hack: everyday words of 4 to 7 letters in each site language, with the
// letters each language types and an on-screen keyboard laid out like that language's own.
//
// The pools start from Doodle Race's word bank (its shown spelling in each language) and add
// the words below. Anything that isn't a single word in the language's own letters is left out.
import { WORDS } from '../doodle/words'

export const LANGS = ['EN', 'TR', 'RU', 'KK']
export const LENGTHS = [4, 5, 6, 7]

// toLocaleUpperCase / toLocaleLowerCase need the language: Turkish i ↔ İ, ı ↔ I
export const LOCALES = { EN: 'en', TR: 'tr', RU: 'ru', KK: 'kk' }

const ALPHABETS = {
  EN: 'abcdefghijklmnopqrstuvwxyz',
  TR: 'abcçdefgğhıijklmnoöprsştuüvyz',
  // ё plays as е, as Russian word games usually have it
  RU: 'абвгдежзийклмнопрстуфхцчшщъыьэюя',
  KK: 'аәбвгғдежзийкқлмнңоөпрстуұүфхһцчшщъыіьэюя'
}

// Keyboard rows, as each language's own layout has them; Turkish drops the q, w and x it
// doesn't use, and Kazakh puts its own letters on the top row the way its layout does
export const KEYBOARDS = {
  EN: ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'],
  TR: ['ertyuıopğü', 'asdfghjklşi', 'zcvbnmöç'],
  RU: ['йцукенгшщзхъ', 'фывапролджэ', 'ячсмитьбю'],
  KK: ['әіңғүұқөһ', 'йцукенгшщзхъ', 'фывапролджэ', 'ячсмитьбю']
}

/** Lower case in the language's own rules, with ё as е. */
export const normalize = (lang, text) => String(text).toLocaleLowerCase(LOCALES[lang]).replace(/ё/g, 'е')

export const upper = (lang, text) => String(text).toLocaleUpperCase(LOCALES[lang])

/** Whether a typed character is a letter of this language (after normalize). */
export const isLetter = (lang, ch) => ch.length === 1 && ALPHABETS[lang].includes(ch)

const EXTRA = {
  EN: [
    'lake', 'road', 'city', 'farm', 'gold', 'salt', 'milk', 'rice', 'soup', 'rose', 'wind', 'snow',
    'rock', 'sand', 'coin', 'wall', 'desk', 'game', 'song', 'word', 'home', 'hill', 'nest', 'tent',
    'wave', 'wing', 'cave', 'corn', 'goat', 'harp', 'iron', 'kiwi', 'mask', 'nail', 'oven', 'park',
    'pool', 'seed', 'silk', 'tail', 'team', 'tile', 'vase', 'yard', 'belt', 'bike', 'boot', 'bowl',
    'bull', 'cart', 'clay', 'drum', 'frog', 'gate', 'king', 'moon', 'ship', 'star', 'tree', 'wolf',
    'apple', 'beach', 'cloud', 'dance', 'eagle', 'flame', 'grape', 'juice', 'lemon', 'melon',
    'night', 'ocean', 'piano', 'queen', 'river', 'smile', 'tiger', 'train', 'water', 'house',
    'table', 'chair', 'bread', 'plant', 'money', 'music', 'storm', 'sugar', 'torch', 'tower',
    'wheel', 'world', 'candy', 'crown', 'dream', 'earth', 'field', 'glass', 'honey', 'light',
    'magic', 'paint', 'pearl', 'shell', 'skirt', 'space', 'stone', 'watch',
    'planet', 'forest', 'garden', 'window', 'silver', 'island', 'school', 'rabbit', 'monkey',
    'turtle', 'spider', 'candle', 'camera', 'rocket', 'guitar', 'basket', 'button', 'cookie',
    'dinner', 'engine', 'finger', 'hammer', 'jacket', 'kettle', 'ladder', 'magnet', 'napkin',
    'orange', 'pencil', 'pillow', 'puzzle', 'shadow', 'summer', 'temple', 'ticket', 'tunnel',
    'violin', 'wallet', 'winter', 'wizard', 'zipper', 'anchor', 'bottle', 'branch', 'bucket',
    'carpet', 'circle', 'desert', 'dragon', 'falcon', 'flower', 'friend', 'harbor', 'helmet',
    'insect', 'jungle', 'kitten', 'lizard', 'meadow', 'mirror', 'museum', 'needle', 'parrot',
    'pepper', 'salmon', 'screen', 'shield', 'statue', 'sunset', 'throne', 'tomato', 'tongue',
    'valley', 'walnut',
    'balloon', 'bicycle', 'blanket', 'cabinet', 'captain', 'cartoon', 'chicken', 'compass',
    'concert', 'crystal', 'diamond', 'dolphin', 'emerald', 'factory', 'feather', 'gallery',
    'giraffe', 'glacier', 'harvest', 'kitchen', 'lantern', 'library', 'machine', 'mailbox',
    'monster', 'morning', 'octopus', 'orchard', 'padlock', 'painter', 'panther', 'penguin',
    'picture', 'pyramid', 'rainbow', 'sausage', 'scooter', 'seaweed', 'soldier', 'station',
    'thunder', 'tornado', 'tractor', 'trumpet', 'unicorn', 'vampire', 'volcano', 'weather',
    'whistle', 'printer', 'journey', 'kingdom', 'harmony'
  ],
  TR: [
    'kedi', 'elma', 'masa', 'kapı', 'ayna', 'oyun', 'okul', 'yazı', 'renk', 'deve', 'dere', 'kale',
    'kuzu', 'para', 'saat', 'baba', 'anne', 'abla', 'dede', 'kalp', 'kaya', 'ders', 'gece', 'hava',
    'peri', 'tren', 'uçak', 'gemi', 'kule', 'köşe', 'pide', 'tava', 'halı', 'sıra', 'bina', 'cami',
    'tepe', 'vadi', 'yaka', 'etek', 'şort', 'bere', 'atkı', 'küpe', 'kral', 'aşçı', 'inek', 'keçi',
    'eşek', 'kurt', 'boya', 'uydu',
    'kitap', 'kalem', 'deniz', 'güneş', 'çiçek', 'köpek', 'balık', 'bulut', 'ekmek', 'şeker',
    'sabah', 'çorba', 'simit', 'kağıt', 'bıçak', 'perde', 'yatak', 'lamba', 'tahta', 'köprü',
    'liman', 'nehir', 'orman', 'ceket', 'çizme', 'şapka', 'kemer', 'yüzük', 'kolye', 'prens',
    'asker', 'polis', 'pilot', 'fırın', 'pasta', 'tatlı', 'meyve', 'sebze', 'havuç', 'soğan',
    'biber', 'mısır', 'tavuk', 'koyun', 'domuz', 'tilki', 'aslan', 'zebra', 'yılan', 'yunus',
    'tabak', 'çatal', 'kaşık', 'dolap', 'bavul', 'çanta', 'radyo', 'gitar', 'davul', 'keman',
    'resim', 'fırça', 'silgi', 'kirpi', 'çekiç', 'bahçe', 'saray', 'çadır', 'banyo', 'salon',
    'sokak', 'cadde', 'roket', 'robot', 'havuz', 'kayık',
    'gözlük', 'doktor', 'kaplan', 'zürafa', 'maymun', 'kartal', 'baykuş', 'balina', 'yengeç',
    'salata', 'pirinç', 'peynir', 'yoğurt', 'bardak', 'sandık', 'koltuk', 'yastık', 'cüzdan',
    'kamera', 'piyano', 'defter', 'cetvel', 'yıldız', 'kuyruk', 'tavşan', 'sincap', 'yaprak',
    'toprak', 'kumsal', 'kulübe', 'balkon', 'mutfak', 'meydan', 'market', 'otobüs', 'kamyon',
    'hazine', 'korsan', 'büyücü', 'gömlek', 'tişört', 'yorgan', 'sinema', 'kaptan',
    'tencere', 'şemsiye', 'anahtar', 'telefon', 'okyanus', 'gökyüzü', 'gezegen', 'pencere',
    'şövalye', 'ejderha', 'canavar', 'hayalet', 'kraliçe', 'prenses', 'palyaço', 'patates',
    'domates', 'fasulye', 'makarna', 'yumurta', 'kurbağa', 'papağan', 'penguen', 'ahtapot',
    'karınca', 'kelebek', 'örümcek', 'eldiven', 'hemşire', 'kumanda', 'lokanta', 'hastane',
    'eczane', 'tiyatro', 'stadyum', 'denizci'
  ],
  RU: [
    'стол', 'стул', 'лист', 'мост', 'рыба', 'луна', 'река', 'гора', 'роза', 'соль', 'хлеб', 'вода',
    'лето', 'зима', 'снег', 'друг', 'игра', 'мама', 'папа', 'брат', 'сова', 'волк', 'лиса', 'слон',
    'кино', 'окно', 'нога', 'рука', 'лицо', 'глаз', 'парк', 'сила', 'ключ', 'небо', 'море', 'поле',
    'утро', 'ночь', 'день', 'звук', 'цвет', 'шарф', 'шуба', 'кофе', 'торт', 'бант', 'бусы', 'очки',
    'лыжи', 'кран', 'лифт', 'трон', 'пила', 'юбка', 'тигр', 'краб', 'енот', 'крот', 'жаба', 'утка',
    'гусь', 'конь', 'овца', 'коза', 'пони', 'лось', 'барс', 'орел', 'дыня',
    'кошка', 'книга', 'ручка', 'лампа', 'замок', 'ведро', 'вилка', 'кепка', 'шапка', 'майка',
    'халат', 'санки', 'сапог', 'обувь', 'вечер', 'трава', 'зебра', 'акула', 'пчела', 'ворон',
    'кукла', 'мышка', 'ложка', 'чашка', 'сумка', 'крыша', 'стена', 'башня', 'поезд', 'метро',
    'лодка', 'арбуз', 'груша', 'слива', 'вишня',
    'собака', 'молоко', 'огурец', 'страус', 'посуда', 'одеяло', 'рюкзак', 'ракета', 'облако',
    'радуга', 'молния', 'корова', 'лошадь', 'солнце', 'дерево', 'машина', 'бабушка',
    'самолет', 'корабль', 'телефон', 'учитель', 'медведь', 'попугай', 'бабочка', 'фонарик',
    'подарок', 'конфета', 'варенье', 'капуста', 'морковь', 'шоколад', 'пингвин', 'лягушка',
    'муравей', 'комната', 'кровать', 'зеркало', 'подушка', 'ботинок', 'автобус', 'трактор',
    'планета', 'дедушка'
  ],
  KK: [
    'алма', 'бала', 'өзен', 'түйе', 'сиыр', 'ешкі', 'есек', 'қоян', 'бақа', 'маса', 'ағаш', 'пияз',
    'қияр', 'қант', 'кесе', 'есік', 'еден', 'қала', 'ауыл', 'көше', 'ұшақ', 'кеме', 'ойын', 'бұлт',
    'ауыз', 'әнші', 'әтеш', 'тары', 'киіз', 'етік', 'алқа', 'айна', 'кілт', 'шеге', 'бояу', 'кино',
    'егін', 'дала', 'арал',
    'мысық', 'балық', 'жылқы', 'түлкі', 'жылан', 'шыбын', 'тамыр', 'жеміс', 'жидек', 'жүзім',
    'қауын', 'сәбіз', 'күріш', 'қасық', 'пышақ', 'табақ', 'үстел', 'шатыр', 'көпір', 'кітап',
    'қалам', 'сөмке', 'сағат', 'көлік', 'пойыз', 'қайық', 'түтін', 'құлақ', 'мұрын', 'жүрек',
    'аспаз', 'батыр', 'патша', 'қарға', 'үйрек', 'тауық', 'көкек', 'бидай', 'тоқаш', 'қымыз',
    'шұбат', 'қобыз', 'кілем', 'шапан', 'тымақ', 'шұлық', 'сырға', 'жүзік', 'тарақ', 'сабын',
    'көрпе', 'шырақ', 'құлып', 'қорап', 'шелек', 'балта', 'балға', 'желім', 'қағаз', 'сурет',
    'театр', 'бақша', 'теңіз', 'бұлақ', 'үңгір', 'орман',
    'қасқыр', 'маймыл', 'тышқан', 'алмұрт', 'қарбыз', 'картоп', 'шәйнек', 'терезе', 'мектеп',
    'дәптер', 'жұлдыз', 'жаңбыр', 'бүркіт', 'торғай', 'көйлек', 'шалбар', 'белбеу', 'қолғап',
    'орамал', 'жастық', 'сандық', 'сызғыш', 'саябақ', 'толқын', 'жартас',
    'арыстан', 'көбелек', 'жапырақ', 'қызанақ', 'орындық', 'кереует', 'қабырға', 'телефон',
    'ойыншық', 'қуыршақ', 'мұғалім', 'дәрігер', 'домбыра', 'білезік', 'жағажай'
  ]
}

// Every pool: language -> length -> words, no word twice
export const POOLS = Object.fromEntries(LANGS.map(lang => {
  const found = new Set()
  const take = (word) => {
    const clean = normalize(lang, word)
    const letters = [...clean]
    if (letters.length < 4 || letters.length > 7 || !letters.every(ch => isLetter(lang, ch))) return
    found.add(clean)
  }
  WORDS.forEach(word => take((word[lang] || '').split('|')[0]))
  EXTRA[lang].forEach(take)
  const byLength = Object.fromEntries(LENGTHS.map(n => [n, []]))
  for (const word of found) byLength[[...word].length].push(word)
  return [lang, byLength]
}))

/** A password of `length` letters in `lang`, one this run hasn't had yet if there's any left. */
export function pickPassword (lang, length, used = new Set(), random = Math.random) {
  const pool = POOLS[lang][length]
  const fresh = pool.filter(word => !used.has(word))
  const from = fresh.length ? fresh : pool
  return from[Math.floor(random() * from.length)]
}
