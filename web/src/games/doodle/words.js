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
  { EN: 'teapot|kettle', TR: 'çaydanlık', RU: 'чайник', KK: 'шәйнек' },
  { EN: 'pig', TR: 'domuz', RU: 'свинья|поросёнок', KK: 'шошқа' },
  { EN: 'cow', TR: 'inek', RU: 'корова', KK: 'сиыр' },
  { EN: 'mouse', TR: 'fare', RU: 'мышь|мышка', KK: 'тышқан' },
  { EN: 'rabbit|bunny', TR: 'tavşan', RU: 'кролик|заяц', KK: 'қоян' },
  { EN: 'frog', TR: 'kurbağa', RU: 'лягушка', KK: 'бақа' },
  { EN: 'bee', TR: 'arı', RU: 'пчела', KK: 'ара' },
  { EN: 'sheep', TR: 'koyun', RU: 'овца|баран', KK: 'қой' },
  { EN: 'chicken|hen', TR: 'tavuk', RU: 'курица', KK: 'тауық' },
  { EN: 'bear', TR: 'ayı', RU: 'медведь', KK: 'аю' },
  { EN: 'lion', TR: 'aslan', RU: 'лев', KK: 'арыстан' },
  { EN: 'monkey', TR: 'maymun', RU: 'обезьяна', KK: 'маймыл' },
  { EN: 'whale', TR: 'balina', RU: 'кит', KK: 'кит' },
  { EN: 'worm', TR: 'solucan', RU: 'червяк', KK: 'құрт' },
  { EN: 'ant', TR: 'karınca', RU: 'муравей', KK: 'құмырсқа' },
  { EN: 'bone', TR: 'kemik', RU: 'кость|косточка', KK: 'сүйек' },
  { EN: 'leaf', TR: 'yaprak', RU: 'лист|листок', KK: 'жапырақ' },
  { EN: 'grass', TR: 'çimen|ot', RU: 'трава', KK: 'шөп' },
  { EN: 'fire', TR: 'ateş', RU: 'огонь|костёр', KK: 'от' },
  { EN: 'shoe', TR: 'ayakkabı', RU: 'ботинок|туфля', KK: 'аяқ киім|бәтеңке' },
  { EN: 'sock', TR: 'çorap', RU: 'носок', KK: 'шұлық' },
  { EN: 'shirt|t-shirt', TR: 'tişört|gömlek', RU: 'футболка|рубашка', KK: 'көйлек|футболка' },
  { EN: 'trousers|pants', TR: 'pantolon', RU: 'брюки|штаны', KK: 'шалбар' },
  { EN: 'glove', TR: 'eldiven', RU: 'перчатка|варежка', KK: 'қолғап' },
  { EN: 'scarf', TR: 'atkı', RU: 'шарф', KK: 'шарф|мойынорағыш' },
  { EN: 'ear', TR: 'kulak', RU: 'ухо', KK: 'құлақ' },
  { EN: 'nose', TR: 'burun', RU: 'нос', KK: 'мұрын' },
  { EN: 'mouth|lips', TR: 'ağız|dudak', RU: 'рот|губы', KK: 'ауыз|ерін' },
  { EN: 'foot', TR: 'ayak', RU: 'нога|ступня', KK: 'аяқ' },
  { EN: 'bottle', TR: 'şişe', RU: 'бутылка', KK: 'бөтелке' },
  { EN: 'fork', TR: 'çatal', RU: 'вилка', KK: 'шанышқы' },
  { EN: 'knife', TR: 'bıçak', RU: 'нож', KK: 'пышақ' },
  { EN: 'plate', TR: 'tabak', RU: 'тарелка', KK: 'тәрелке|табақ' },
  { EN: 'lamp', TR: 'lamba', RU: 'лампа', KK: 'шам|лампа' },
  { EN: 'bell', TR: 'zil|çan', RU: 'колокол|колокольчик', KK: 'қоңырау' },
  { EN: 'box', TR: 'kutu', RU: 'коробка|ящик', KK: 'қорап|жәшік' },
  { EN: 'gift|present', TR: 'hediye', RU: 'подарок', KK: 'сыйлық' },
  { EN: 'letter|envelope', TR: 'mektup|zarf', RU: 'письмо|конверт', KK: 'хат|конверт' },
  { EN: 'pillow', TR: 'yastık', RU: 'подушка', KK: 'жастық' },
  { EN: 'window', TR: 'pencere', RU: 'окно', KK: 'терезе' },
  { EN: 'bucket', TR: 'kova', RU: 'ведро', KK: 'шелек' },
  { EN: 'broom', TR: 'süpürge', RU: 'метла|веник', KK: 'сыпырғыш' },
  { EN: 'sword', TR: 'kılıç', RU: 'меч', KK: 'қылыш' },
  { EN: 'axe', TR: 'balta', RU: 'топор', KK: 'балта' },
  { EN: 'hammer', TR: 'çekiç', RU: 'молоток', KK: 'балға' },
  { EN: 'flag', TR: 'bayrak', RU: 'флаг', KK: 'ту|жалау' },
  { EN: 'bus', TR: 'otobüs', RU: 'автобус', KK: 'автобус' },
  { EN: 'truck|lorry', TR: 'kamyon', RU: 'грузовик', KK: 'жүк көлігі|жүк машинасы' },
  { EN: 'ship', TR: 'gemi', RU: 'корабль', KK: 'кеме' },
  { EN: 'pear', TR: 'armut', RU: 'груша', KK: 'алмұрт' },
  { EN: 'cherry', TR: 'kiraz', RU: 'вишня|черешня', KK: 'шие' },
  { EN: 'grapes', TR: 'üzüm', RU: 'виноград', KK: 'жүзім' },
  { EN: 'strawberry', TR: 'çilek', RU: 'клубника', KK: 'құлпынай' },
  { EN: 'lemon', TR: 'limon', RU: 'лимон', KK: 'лимон' },
  { EN: 'tomato', TR: 'domates', RU: 'помидор|томат', KK: 'қызанақ|помидор' },
  { EN: 'cheese', TR: 'peynir', RU: 'сыр', KK: 'ірімшік' },
  { EN: 'cookie|biscuit', TR: 'kurabiye|bisküvi', RU: 'печенье', KK: 'печенье' },
  { EN: 'lollipop|candy', TR: 'lolipop|şeker', RU: 'леденец|конфета', KK: 'кәмпит|леденец' }
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
  { EN: 'drum', TR: 'davul', RU: 'барабан', KK: 'барабан|дабыл' },
  { EN: 'zebra', TR: 'zebra', RU: 'зебра', KK: 'зебра' },
  { EN: 'tiger', TR: 'kaplan', RU: 'тигр', KK: 'жолбарыс' },
  { EN: 'shark', TR: 'köpekbalığı', RU: 'акула', KK: 'акула' },
  { EN: 'dolphin', TR: 'yunus', RU: 'дельфин', KK: 'дельфин' },
  { EN: 'crocodile|alligator', TR: 'timsah', RU: 'крокодил', KK: 'қолтырауын|крокодил' },
  { EN: 'squirrel', TR: 'sincap', RU: 'белка', KK: 'тиін' },
  { EN: 'fox', TR: 'tilki', RU: 'лиса|лисица', KK: 'түлкі' },
  { EN: 'wolf', TR: 'kurt', RU: 'волк', KK: 'қасқыр' },
  { EN: 'deer', TR: 'geyik', RU: 'олень', KK: 'бұғы' },
  { EN: 'parrot', TR: 'papağan', RU: 'попугай', KK: 'тотықұс' },
  { EN: 'swan', TR: 'kuğu', RU: 'лебедь', KK: 'аққу' },
  { EN: 'bat', TR: 'yarasa', RU: 'летучая мышь', KK: 'жарқанат' },
  { EN: 'starfish', TR: 'denizyıldızı', RU: 'морская звезда', KK: 'теңіз жұлдызы' },
  { EN: 'ladybug|ladybird', TR: 'uğur böceği', RU: 'божья коровка', KK: 'қызыл қоңыз' },
  { EN: 'piano', TR: 'piyano', RU: 'пианино|рояль', KK: 'фортепиано|пианино' },
  { EN: 'violin', TR: 'keman', RU: 'скрипка', KK: 'скрипка' },
  { EN: 'trumpet', TR: 'trompet', RU: 'труба', KK: 'керней|труба' },
  { EN: 'microphone|mic', TR: 'mikrofon', RU: 'микрофон', KK: 'микрофон' },
  { EN: 'television|tv', TR: 'televizyon|tv', RU: 'телевизор', KK: 'теледидар|телевизор' },
  { EN: 'computer|laptop', TR: 'bilgisayar|laptop', RU: 'компьютер|ноутбук', KK: 'компьютер|ноутбук' },
  { EN: 'keyboard', TR: 'klavye', RU: 'клавиатура', KK: 'пернетақта|клавиатура' },
  { EN: 'fridge|refrigerator', TR: 'buzdolabı', RU: 'холодильник', KK: 'тоңазытқыш' },
  { EN: 'sofa|couch', TR: 'kanepe', RU: 'диван', KK: 'диван' },
  { EN: 'bathtub|bath', TR: 'küvet', RU: 'ванна', KK: 'ванна' },
  { EN: 'toilet', TR: 'tuvalet', RU: 'унитаз|туалет', KK: 'унитаз|дәретхана' },
  { EN: 'mailbox|postbox', TR: 'posta kutusu', RU: 'почтовый ящик', KK: 'пошта жәшігі' },
  { EN: 'fence', TR: 'çit', RU: 'забор', KK: 'қоршау|шарбақ' },
  { EN: 'swing', TR: 'salıncak', RU: 'качели', KK: 'әткеншек' },
  { EN: 'slide', TR: 'kaydırak', RU: 'горка', KK: 'сырғанақ' },
  { EN: 'skateboard', TR: 'kaykay', RU: 'скейтборд|скейт', KK: 'скейтборд' },
  { EN: 'motorcycle|motorbike', TR: 'motosiklet|motor', RU: 'мотоцикл', KK: 'мотоцикл' },
  { EN: 'ambulance', TR: 'ambulans', RU: 'скорая помощь|скорая', KK: 'жедел жәрдем' },
  { EN: 'fire truck|fire engine', TR: 'itfaiye aracı|itfaiye', RU: 'пожарная машина', KK: 'өрт сөндіру көлігі|өрт сөндіру машинасы' },
  { EN: 'police car', TR: 'polis arabası', RU: 'полицейская машина', KK: 'полиция көлігі|полиция машинасы' },
  { EN: 'king', TR: 'kral', RU: 'король|царь', KK: 'патша|король' },
  { EN: 'queen', TR: 'kraliçe', RU: 'королева', KK: 'патшайым|королева' },
  { EN: 'princess', TR: 'prenses', RU: 'принцесса', KK: 'ханшайым|принцесса' },
  { EN: 'clown', TR: 'palyaço', RU: 'клоун', KK: 'клоун|сайқымазақ' },
  { EN: 'witch', TR: 'cadı', RU: 'ведьма', KK: 'мыстан' },
  { EN: 'ninja', TR: 'ninja', RU: 'ниндзя', KK: 'ниндзя' },
  { EN: 'unicorn', TR: 'tek boynuzlu at', RU: 'единорог', KK: 'жалғыз мүйіз|единорог' },
  { EN: 'snowflake', TR: 'kar tanesi', RU: 'снежинка', KK: 'қар ұшқыны' },
  { EN: 'sandcastle', TR: 'kumdan kale', RU: 'песочный замок|замок из песка', KK: 'құм қамал' },
  { EN: 'map', TR: 'harita', RU: 'карта', KK: 'карта' },
  { EN: 'globe', TR: 'küre|dünya küresi', RU: 'глобус', KK: 'глобус' },
  { EN: 'battery', TR: 'pil', RU: 'батарейка', KK: 'батарейка|батарея' },
  { EN: 'light bulb|bulb', TR: 'ampul', RU: 'лампочка', KK: 'лампочка|электр шамы' },
  { EN: 'basketball', TR: 'basketbol', RU: 'баскетбол', KK: 'баскетбол' },
  { EN: 'medal', TR: 'madalya', RU: 'медаль', KK: 'медаль' },
  { EN: 'pumpkin', TR: 'balkabağı|kabak', RU: 'тыква', KK: 'асқабақ' },
  { EN: 'corn', TR: 'mısır', RU: 'кукуруза', KK: 'жүгері' },
  { EN: 'broccoli', TR: 'brokoli', RU: 'брокколи', KK: 'брокколи' },
  { EN: 'donut|doughnut', TR: 'donut', RU: 'пончик', KK: 'пончик' },
  { EN: 'hot dog', TR: 'sosisli', RU: 'хот-дог', KK: 'хот-дог' },
  { EN: 'french fries|fries|chips', TR: 'patates kızartması', RU: 'картошка фри|картофель фри', KK: 'картоп фри|фри' }
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
  { EN: 'stethoscope', TR: 'stetoskop', RU: 'стетоскоп', KK: 'стетоскоп' },
  { EN: 'scorpion', TR: 'akrep', RU: 'скорпион', KK: 'бүйі' },
  { EN: 'mosquito', TR: 'sivrisinek', RU: 'комар', KK: 'маса' },
  { EN: 'spider web|cobweb|web', TR: 'örümcek ağı', RU: 'паутина', KK: 'өрмек|өрмекші торы' },
  { EN: 'beehive|hive', TR: 'arı kovanı|kovan', RU: 'улей', KK: 'ара ұясы|омарта' },
  { EN: 'nest', TR: 'kuş yuvası|yuva', RU: 'гнездо', KK: 'ұя' },
  { EN: 'porcupine', TR: 'oklu kirpi', RU: 'дикобраз', KK: 'жайра' },
  { EN: 'ostrich', TR: 'devekuşu', RU: 'страус', KK: 'түйеқұс' },
  { EN: 'rhinoceros|rhino', TR: 'gergedan', RU: 'носорог', KK: 'мүйізтұмсық' },
  { EN: 'hippopotamus|hippo', TR: 'su aygırı|hipopotam', RU: 'бегемот|гиппопотам', KK: 'бегемот|су айғыры' },
  { EN: 'woodpecker', TR: 'ağaçkakan', RU: 'дятел', KK: 'тоқылдақ' },
  { EN: 'lobster', TR: 'ıstakoz', RU: 'омар|лобстер', KK: 'омар|лобстер' },
  { EN: 'skyscraper', TR: 'gökdelen', RU: 'небоскрёб', KK: 'зәулім ғимарат' },
  { EN: 'escalator', TR: 'yürüyen merdiven', RU: 'эскалатор', KK: 'эскалатор' },
  { EN: 'carousel|merry-go-round', TR: 'atlıkarınca', RU: 'карусель', KK: 'карусель' },
  { EN: 'knight', TR: 'şövalye', RU: 'рыцарь', KK: 'рыцарь|сері' },
  { EN: 'mummy', TR: 'mumya', RU: 'мумия', KK: 'мумия' },
  { EN: 'zombie', TR: 'zombi', RU: 'зомби', KK: 'зомби' },
  { EN: 'alien', TR: 'uzaylı', RU: 'инопланетянин|пришелец', KK: 'келімсек|инопланетянин' },
  { EN: 'ufo|flying saucer', TR: 'ufo|uçan daire', RU: 'нло|летающая тарелка', KK: 'ұшатын тәрелке|нло' },
  { EN: 'black hole', TR: 'kara delik', RU: 'чёрная дыра', KK: 'қара құрдым' },
  { EN: 'comet', TR: 'kuyruklu yıldız', RU: 'комета', KK: 'құйрықты жұлдыз' },
  { EN: 'thermometer', TR: 'termometre', RU: 'термометр|градусник', KK: 'термометр' },
  { EN: 'calculator', TR: 'hesap makinesi', RU: 'калькулятор', KK: 'калькулятор' },
  { EN: 'barbecue|grill', TR: 'mangal|barbekü', RU: 'мангал|гриль', KK: 'мангал|гриль' },
  { EN: 'iceberg', TR: 'buzdağı', RU: 'айсберг', KK: 'айсберг|мұзтау' },
  { EN: 'oasis', TR: 'vaha', RU: 'оазис', KK: 'оазис' },
  { EN: 'tsunami', TR: 'tsunami', RU: 'цунами', KK: 'цунами' },
  { EN: 'avalanche', TR: 'çığ', RU: 'лавина', KK: 'көшкін|қар көшкіні' },
  { EN: 'bow and arrow|bow', TR: 'ok ve yay|yay', RU: 'лук и стрелы|лук', KK: 'садақ' },
  { EN: 'pirate ship', TR: 'korsan gemisi', RU: 'пиратский корабль', KK: 'қарақшы кемесі' },
  { EN: 'dentist', TR: 'diş hekimi|dişçi', RU: 'стоматолог|зубной врач', KK: 'тіс дәрігері' },
  { EN: 'firefighter|fireman', TR: 'itfaiyeci', RU: 'пожарный', KK: 'өрт сөндіруші' },
  { EN: 'chef|cook', TR: 'aşçı|şef', RU: 'повар', KK: 'аспаз' },
  { EN: 'painter|artist', TR: 'ressam', RU: 'художник', KK: 'суретші' },
  { EN: 'photographer', TR: 'fotoğrafçı', RU: 'фотограф', KK: 'фотограф' },
  { EN: 'superhero', TR: 'süper kahraman', RU: 'супергерой', KK: 'супербатыр|супергерой' },
  { EN: 'wind turbine', TR: 'rüzgar türbini', RU: 'ветряк|ветрогенератор', KK: 'жел турбинасы|жел генераторы' },
  { EN: 'solar panel', TR: 'güneş paneli', RU: 'солнечная панель|солнечная батарея', KK: 'күн панелі|күн батареясы' },
  { EN: 'snow globe', TR: 'kar küresi', RU: 'снежный шар', KK: 'қарлы шар' },
  { EN: 'xylophone', TR: 'ksilofon', RU: 'ксилофон', KK: 'ксилофон' },
  { EN: 'dombra', TR: 'dombra', RU: 'домбра', KK: 'домбыра' },
  { EN: 'samovar', TR: 'semaver', RU: 'самовар', KK: 'самауыр' }
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
