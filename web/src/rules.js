// Help modal content per game, keyed by game id then language.
// `menu` is shown when no game is selected.
export const rules = {
  menu: {
    EN: {
      icon: '>_',
      title: 'How it works',
      goal: 'Pick a game, play right in your browser, and come back to the menu anytime.',
      steps: [
        'Tap a card to flip it and see the players, time and mode, then press [ Run ] to open the game.',
        'Use the [<] Back command inside a game to return to the menu.',
        'Tap [?] anytime to see the rules for the game you are playing.'
      ],
      tips: [
        'Switch between English, Turkish, Russian and Kazakh from the language menu at the top right.',
        'Your language choice is remembered on this device.',
        'On a keyboard, press 1–9 to open a game and Esc to go back. Click any part of the ~/path at the top to jump there.'
      ]
    },
    TR: {
      icon: '>_',
      title: 'Nasıl çalışır?',
      goal: 'Bir oyun seç, doğrudan tarayıcında oyna ve istediğin zaman menüye dön.',
      steps: [
        'Bir karta dokunup çevir; oyuncu sayısını, süreyi ve modu gör, sonra [ Çalıştır ] ile oyunu aç.',
        'Oyunun içindeki [<] Geri komutuyla menüye dön.',
        'Oynadığın oyunun kurallarını görmek için istediğin zaman [?] butonuna bas.'
      ],
      tips: [
        'Sağ üstteki dil menüsünden İngilizce, Türkçe, Rusça ve Kazakça arasında geçiş yap.',
        'Dil tercihin bu cihazda hatırlanır.',
        'Klavyede 1–9 ile bir oyunu aç, Esc ile geri dön. Üstteki ~/yol kısmının bir parçasına tıklayarak oraya git.'
      ]
    },
    RU: {
      icon: '>_',
      title: 'Как это работает',
      goal: 'Выбери игру, играй прямо в браузере и возвращайся в меню когда угодно.',
      steps: [
        'Нажми на карточку, чтобы перевернуть её и увидеть число игроков, время и режим, затем нажми [ Запуск ], чтобы открыть игру.',
        'Чтобы вернуться в меню, используй команду [<] Назад внутри игры.',
        'Нажми [?] в любой момент, чтобы увидеть правила текущей игры.'
      ],
      tips: [
        'Язык меняется в меню справа вверху: English, Türkçe, Русский или Қазақша.',
        'Выбранный язык запоминается на этом устройстве.',
        'На клавиатуре нажми 1–9, чтобы открыть игру, и Esc, чтобы вернуться. Нажми на любую часть пути ~/ вверху, чтобы перейти туда.'
      ]
    },
    KK: {
      icon: '>_',
      title: 'Бұл қалай жұмыс істейді',
      goal: 'Ойын таңда, тікелей браузерде ойна және кез келген уақытта мәзірге орал.',
      steps: [
        'Ойыншылар санын, уақытты және режимді көру үшін картаны түртіп аудар, сосын ойынды ашу үшін [ Іске қосу ] түймесін бас.',
        'Мәзірге оралу үшін ойын ішіндегі [<] Артқа командасын қолдан.',
        'Ойнап жатқан ойынның ережелерін көру үшін кез келген уақытта [?] түймесін бас.'
      ],
      tips: [
        'Тілді оң жақ жоғарғы бұрыштағы мәзірден ауыстыр: English, Türkçe, Русский немесе Қазақша.',
        'Таңдаған тілің осы құрылғыда сақталады.',
        'Пернетақтада ойынды ашу үшін 1–9, артқа оралу үшін Esc бас. Жоғарыдағы ~/жолдың кез келген бөлігін шертіп, сол жерге өт.'
      ]
    }
  },
  flappy: {
    EN: {
      icon: '[^]',
      title: 'Flappy ASCII',
      players: '1 player solo, or a race on any devices',
      duration: '1–5 min',
      goal: 'Keep the bird in the air and fly through as many gaps between the pipes as you can.',
      steps: [
        'Tap, click, or press Space, ↑ or W to flap. Stop flapping and the bird falls.',
        'Every pair of pipes you pass is a point. Touching a pipe or the ground ends your flight.',
        'Solo: beat your best score and earn a medal at 10, 20, 30 and 40 points.',
        'Online race: one person creates a room and the others join with the code. Everyone flies the same pipes at the same time.',
        'Other players show up as faint birds. Crash and you watch the rest — the last bird flying wins the round.'
      ],
      tips: [
        'Short, steady taps work better than big panicked ones.',
        'The gaps get a little narrower the further you fly.',
        'P or Esc pauses a solo game, and M turns the sound on or off.'
      ]
    },
    TR: {
      icon: '[^]',
      title: 'Flappy ASCII',
      players: 'Tek kişilik ya da her cihazdan yarış',
      duration: '1–5 dk',
      goal: 'Kuşu havada tut ve boruların arasındaki boşluklardan olabildiğince çok geç.',
      steps: [
        'Kanat çırpmak için dokun, tıkla ya da Boşluk, ↑ veya W tuşuna bas. Durursan kuş düşer.',
        'Geçtiğin her boru çifti bir puan. Boruya ya da yere değersen uçuşun biter.',
        'Tek kişilik: en iyi skorunu geç; 10, 20, 30 ve 40 puanda madalya kazan.',
        'Çevrim içi yarış: bir kişi oda oluşturur, diğerleri kodla katılır. Herkes aynı anda aynı borulardan geçer.',
        'Diğer oyuncular soluk kuşlar olarak görünür. Düşersen diğerlerini izlersin — son uçan kuş turu kazanır.'
      ],
      tips: [
        'Kısa ve düzenli dokunuşlar, panikle yapılan büyük dokunuşlardan daha iyi işler.',
        'İlerledikçe boşluklar biraz daralır.',
        'P veya Esc tek kişilik oyunu duraklatır, M sesi açıp kapatır.'
      ]
    },
    RU: {
      icon: '[^]',
      title: 'Flappy ASCII',
      players: 'Соло или гонка на любых устройствах',
      duration: '1–5 мин',
      goal: 'Держи птицу в воздухе и пролети через как можно больше просветов между трубами.',
      steps: [
        'Чтобы взмахнуть крыльями, коснись экрана, кликни или нажми пробел, ↑ или W. Перестанешь — и птица начнёт падать.',
        'Каждая пройденная пара труб — очко. Касание трубы или земли заканчивает полёт.',
        'Соло: побей свой рекорд и получи медаль за 10, 20, 30 и 40 очков.',
        'Онлайн-гонка: один создаёт комнату, остальные входят по коду. Все летят через одни и те же трубы одновременно.',
        'Других игроков видно как бледных птиц. Кто разобьётся, смотрит за остальными — раунд выигрывает последняя птица в воздухе.'
      ],
      tips: [
        'Короткие ровные нажатия работают лучше, чем частые панические.',
        'Чем дальше летишь, тем чуть уже становятся просветы.',
        'P или Esc ставит соло-игру на паузу, а M включает и выключает звук.'
      ]
    },
    KK: {
      icon: '[^]',
      title: 'Flappy ASCII',
      players: 'Жеке немесе кез келген құрылғыда жарыс',
      duration: '1–5 мин',
      goal: 'Құсты ауада ұстап, құбырлар арасындағы саңылаулардан барынша көп өт.',
      steps: [
        'Қанат қағу үшін экранды түрт, шерт немесе Бос орын, ↑ не W пернесін бас. Қағуды тоқтатсаң, құс құлайды.',
        'Өткен әр жұп құбыр — бір ұпай. Құбырға не жерге тисең, ұшу аяқталады.',
        'Жеке: рекордыңды жаңартып, 10, 20, 30 және 40 ұпай үшін медаль ал.',
        'Онлайн жарыс: бір адам бөлме ашады, қалғандары кодпен кіреді. Барлығы бір уақытта бірдей құбырлардың арасымен ұшады.',
        'Басқа ойыншылар бозғылт құс болып көрінеді. Құлаған ойыншы қалғандарды бақылайды — раундты соңғы ұшып жүрген құс жеңеді.'
      ],
      tips: [
        'Қысқа әрі бірқалыпты түрту абыржып жиі басқаннан жақсырақ.',
        'Неғұрлым алыс ұшсаң, саңылаулар соғұрлым тарыла түседі.',
        'P не Esc жеке ойынды кідіртеді, ал M дыбысты қосады не өшіреді.'
      ]
    }
  },
  tanks: {
    EN: {
      icon: '[T]',
      title: 'Tank ASCII',
      players: '2–8 players, one device each',
      duration: '2½ min rounds',
      goal: 'Hit the other tanks with your shells and be the last tank standing.',
      steps: [
        'One person creates a room and the others join with the code. Everyone plays on their own phone or computer.',
        'There is only one button: hold it anywhere on the screen (or Space) and your tank drives forward and fires.',
        'Let go and the tank stops and turns on the spot — the other way round after every press. Press again when the dotted line points where you want to go.',
        'Every tank has 3 hearts. A hit costs one heart, then the tank blinks and is safe for a moment.',
        'The last tank standing wins the round. If the clock runs out, the tank with the most hearts wins.'
      ],
      tips: [
        'Shells bounce off a wall once — the dotted line shows the bounce too.',
        'You can only have 3 shells in the air, so pick your shots.',
        'Short taps fire without driving far; long holds get you out of trouble.',
        'Turned past your target? A quick tap swings the barrel back the other way.'
      ]
    },
    TR: {
      icon: '[T]',
      title: 'Tank ASCII',
      players: '2–8 oyuncu, herkes kendi cihazından',
      duration: '2,5 dakikalık turlar',
      goal: 'Diğer tankları mermilerinle vur ve ayakta kalan son tank ol.',
      steps: [
        'Bir kişi oda oluşturur, diğerleri kodla katılır. Herkes kendi telefonundan ya da bilgisayarından oynar.',
        'Tek bir tuş var: ekranın herhangi bir yerine basılı tut (ya da Boşluk) — tankın ileri gider ve ateş eder.',
        'Bırakınca tank durur ve olduğu yerde döner — her basıştan sonra ters yöne. Noktalı çizgi istediğin yönü gösterdiğinde tekrar bas.',
        'Her tankın 3 canı var. Her isabet bir can götürür, sonra tank yanıp söner ve kısa bir süre güvende olur.',
        'Ayakta kalan son tank turu kazanır. Süre dolarsa en çok canı kalan tank kazanır.'
      ],
      tips: [
        'Mermiler duvardan bir kez seker — noktalı çizgi sekmeyi de gösterir.',
        'Havada aynı anda en fazla 3 merminin olabilir, atışlarını seç.',
        'Kısa dokunuşlar fazla ilerlemeden ateş eder; uzun basışlar seni tehlikeden kurtarır.',
        'Hedefi geçtin mi? Kısa bir dokunuş namluyu ters yöne çevirir.'
      ]
    },
    RU: {
      icon: '[T]',
      title: 'Tank ASCII',
      players: '2–8 игроков, у каждого своё устройство',
      duration: 'Раунды по 2½ мин',
      goal: 'Попадай снарядами в другие танки и останься последним уцелевшим.',
      steps: [
        'Один создаёт комнату, остальные входят по коду. Каждый играет со своего телефона или компьютера.',
        'Кнопка всего одна: держи нажатым любое место экрана (или пробел) — и танк едет вперёд и стреляет.',
        'Отпусти — и танк остановится и начнёт поворачиваться на месте, после каждого нажатия в другую сторону. Нажми снова, когда пунктир смотрит туда, куда нужно.',
        'У каждого танка 3 жизни. Попадание отнимает одну, после чего танк мигает и недолго неуязвим.',
        'Раунд выигрывает последний уцелевший танк. Если время вышло, побеждает танк, у которого больше всего жизней.'
      ],
      tips: [
        'Снаряды один раз отскакивают от стены — пунктир показывает и отскок.',
        'В воздухе может быть не больше 3 твоих снарядов, так что стреляй с умом.',
        'Короткие нажатия стреляют, почти не сдвигая танк; долгие помогают выбраться из передряги.',
        'Ствол ушёл дальше цели? Короткое нажатие повернёт его обратно.'
      ]
    },
    KK: {
      icon: '[T]',
      title: 'Tank ASCII',
      players: '2–8 ойыншы, әркімде өз құрылғысы',
      duration: '2½ минуттық раундтар',
      goal: 'Снарядтарыңмен басқа танктерге тигізіп, соңғы қалған танк бол.',
      steps: [
        'Бір адам бөлме ашады, қалғандары кодпен кіреді. Әркім өз телефонынан не компьютерінен ойнайды.',
        'Түйме біреу ғана: экранның кез келген жерін (немесе Бос орынды) басып тұрсаң, танкің алға жүріп, атады.',
        'Жіберсең, танк тоқтап, орнында бұрыла бастайды — әр басқан сайын қарама-қарсы жаққа. Нүктелі сызық керек жаққа қарағанда қайта бас.',
        'Әр танктің 3 жүрегі бар. Әр тигенде бір жүрек кетеді, сосын танк жыпылықтап, біраз уақыт қауіпсіз болады.',
        'Раундты соңғы қалған танк жеңеді. Уақыт бітсе, жүрегі ең көп танк жеңеді.'
      ],
      tips: [
        'Снарядтар қабырғадан бір рет серпіледі — нүктелі сызық серпілісті де көрсетеді.',
        'Ауада бір мезетте тек 3 снарядың бола алады, сондықтан мұқият ат.',
        'Қысқа басу алысқа жүрмей атады; ұзақ басып тұру қиын жағдайдан шығарады.',
        'Нысанадан асып кеттің бе? Қысқа басу ұңғыны кері бұрады.'
      ]
    }
  },
  futsal: {
    EN: {
      icon: '[o]',
      title: 'Futsal',
      players: '1 player against bots, or 2–10 online',
      duration: '2–5 min matches',
      goal: 'Score more goals than the other team before the clock runs out.',
      steps: [
        'Solo: you play for the home team, with bot teammates, against a team of bots. Online: one person creates a room, the others join with the code and pick a team. The host can add bots to fill the places.',
        'Run with the arrow keys or WASD. On a phone, drag on the left half of the screen to steer. Players have weight: they take a moment to get going and to stop.',
        'Press Space (or X, K, or the right half of the screen) to kick. The kick goes off the moment the ball is within reach, so hold it down as the ball comes to you. You run a little slower while holding it.',
        'A kick sends the ball straight away from the middle of your circle, so get behind it in the direction you want it to go. Running into the ball pushes it along.',
        'The ball never goes out: it bounces off the lines round the court, so there are no throw-ins or corners. Players can run on past the lines, and step into the goal mouth, but not through the nets.',
        'At a kick-off the other team stays out of the dotted ring until the ball is touched, and a kick-off not taken within 4 seconds goes to them. Level at full time? The next goal wins (golden goal).'
      ],
      tips: [
        'Everyone is a circle of the same size, and the ring is exactly where a player ends. Home players are filled (#), away players hollow ( ). Yours has a v over it, and a ring lights up while its player holds kick.',
        'A kick adds to the ball’s pace: a ball already rolling the way you kick flies off, one coming straight at you mostly stops.',
        'Play it off the lines: a ball banked off a touchline goes round a defender.',
        'If someone drops out, a bot plays for them until they’re back.',
        'M turns the sound on or off; P or Esc pauses a solo match.'
      ]
    },
    TR: {
      icon: '[o]',
      title: 'Futsal',
      players: 'Botlara karşı tek kişi ya da çevrim içi 2–10 kişi',
      duration: '2–5 dakikalık maçlar',
      goal: 'Süre bitmeden rakip takımdan daha çok gol at.',
      steps: [
        'Tek kişilik: ev sahibi takımda, bot takım arkadaşlarınla, botlardan oluşan bir takıma karşı oynarsın. Çevrim içi: bir kişi oda oluşturur, diğerleri kodla katılıp takım seçer. Sunucu boş yerlere bot ekleyebilir.',
        'Ok tuşları ya da WASD ile koş. Telefonda ekranın sol yarısında parmağını sürükleyerek yön ver. Oyuncuların ağırlığı var: hızlanmaları da durmaları da biraz zaman alır.',
        'Vurmak için Boşluk’a (ya da X, K veya ekranın sağ yarısına) bas. Vuruş, top menzile girdiği an gerçekleşir; top sana gelirken basılı tut. Basılı tutarken biraz daha yavaş koşarsın.',
        'Vuruş topu dairenin ortasından dümdüz uzağa gönderir; topun gitmesini istediğin yönün tam arkasına geç. Topa koşarak çarpmak onu önünde sürer.',
        'Top hiç dışarı çıkmaz: sahanın çevresindeki çizgilerden seker, yani taç ya da korner yok. Oyuncular çizgilerin dışına koşabilir, kale ağzına girebilir, ama fileden geçemez.',
        'Başlama vuruşunda rakip takım topa dokunulana kadar noktalı halkanın dışında kalır; 4 saniye içinde yapılmayan başlama vuruşu rakibe geçer. Normal süre berabere mi bitti? İlk golü atan kazanır (altın gol).'
      ],
      tips: [
        'Herkes aynı boyda bir daire ve halka oyuncunun tam sınırı. Ev sahibi oyuncular dolu (#), deplasman oyuncuları boş ( ). Seninkinin üstünde v işareti var; vuruş tuşunu basılı tutan oyuncunun halkası parlar.',
        'Vuruş topun hızına eklenir: vurduğun yöne zaten yuvarlanan top uçar, doğrudan sana gelen top ise neredeyse durur.',
        'Çizgileri kullan: yan çizgiden sektirilen top defansın etrafından dolaşır.',
        'Biri oyundan düşerse, o dönene kadar yerine bir bot oynar.',
        'M sesi açar ya da kapatır; P veya Esc tek kişilik maçı duraklatır.'
      ]
    },
    RU: {
      icon: '[o]',
      title: 'Футзал',
      players: '1 игрок против ботов или 2–10 онлайн',
      duration: 'Матчи по 2–5 мин',
      goal: 'Забей больше голов, чем соперники, пока не вышло время.',
      steps: [
        'Соло: ты играешь за хозяев вместе с ботами-напарниками против команды ботов. Онлайн: один создаёт комнату, остальные входят по коду и выбирают команду. Ведущий может добавить ботов на свободные места.',
        'Бегай стрелками или WASD. На телефоне веди пальцем по левой половине экрана. У игроков есть инерция: им нужно мгновение, чтобы разогнаться и остановиться.',
        'Нажми пробел (или X, K, или правую половину экрана), чтобы ударить. Удар происходит в тот момент, когда мяч оказывается в досягаемости, так что держи кнопку, пока мяч идёт к тебе. С зажатой кнопкой бежишь чуть медленнее.',
        'Удар отправляет мяч прямо от центра твоего круга, так что заходи за мяч с той стороны, откуда хочешь его послать. Если вбежать в мяч, он покатится вперёд.',
        'Мяч никогда не уходит за пределы поля: он отскакивает от линий вокруг площадки, поэтому аутов и угловых нет. Игроки могут забегать за линии и в створ ворот, но не сквозь сетку.',
        'При начальном ударе соперники не заходят в пунктирный круг, пока мяча не коснутся, а если удар не сделан за 4 секунды, мяч переходит к ним. Ничья в основное время? Следующий гол побеждает (золотой гол).'
      ],
      tips: [
        'Все игроки — круги одного размера, и кольцо точно показывает, где игрок заканчивается. Хозяева закрашены (#), гости пустые ( ). Над твоим игроком стоит v, а кольцо подсвечивается, пока игрок держит удар.',
        'Удар добавляет мячу скорости: мяч, который уже катится в сторону удара, улетает, а мяч, летящий прямо на тебя, почти останавливается.',
        'Играй от линий: мяч, отскочивший от боковой, обходит защитника.',
        'Если кто-то отключился, за него играет бот, пока игрок не вернётся.',
        'M включает и выключает звук; P или Esc ставит соло-матч на паузу.'
      ]
    },
    KK: {
      icon: '[o]',
      title: 'Футзал',
      players: 'Боттарға қарсы 1 ойыншы немесе онлайн 2–10',
      duration: '2–5 минуттық матчтар',
      goal: 'Уақыт біткенше қарсылас командадан көп гол соқ.',
      steps: [
        'Жеке: сен бот серіктеріңмен бірге үй иелері командасында боттардан құралған командаға қарсы ойнайсың. Онлайн: бір адам бөлме ашады, қалғандары кодпен кіріп, команда таңдайды. Жүргізуші бос орындарға бот қоса алады.',
        'Бағыт пернелерімен не WASD арқылы жүгір. Телефонда экранның сол жақ жартысында саусағыңды сүйреп, бағыт бер. Ойыншылардың салмағы бар: жүгіріп кетуге де, тоқтауға да сәл уақыт керек.',
        'Соғу үшін Бос орынды (не X, K, не экранның оң жақ жартысын) бас. Соққы доп жеткен сәтте жасалады, сондықтан доп саған келе жатқанда басып тұр. Басып тұрғанда сәл баяу жүгіресің.',
        'Соққы допты шеңберіңнің ортасынан тура алысқа жібереді, сондықтан допты жібергің келетін бағытқа қарсы жағынан кел. Допқа жүгіріп келіп тисең, ол алға қарай итеріледі.',
        'Доп ешқашан алаңнан шықпайды: алаң айналасындағы сызықтардан серпіледі, сондықтан аут та, бұрыштама да жоқ. Ойыншылар сызықтан әрі жүгіріп, қақпа аузына кіре алады, бірақ тор арқылы өте алмайды.',
        'Бастапқы соққыда қарсылас команда допқа тиілгенше нүктелі шеңберге кірмейді, ал 4 секунд ішінде жасалмаған бастапқы соққы соларға өтеді. Негізгі уақыт тең бітті ме? Келесі гол жеңіс әкеледі (алтын гол).'
      ],
      tips: [
        'Барлығы бірдей өлшемдегі шеңбер, ал сақина ойыншының дәл шекарасын көрсетеді. Үй иелері толтырылған (#), қонақтар қуыс ( ). Сенің ойыншыңның үстінде v тұрады, ал ойыншы соққыны басып тұрғанда сақина жанады.',
        'Соққы доптың жылдамдығына қосылады: соққы бағытында домалап бара жатқан доп ұшып кетеді, ал тура саған келе жатқан доп негізінен тоқтайды.',
        'Сызықтарды пайдалан: бүйір сызықтан серпілген доп қорғаушыны айналып өтеді.',
        'Біреу шығып кетсе, ол қайтып оралғанша оның орнына бот ойнайды.',
        'M дыбысты қосады не өшіреді; P не Esc жеке матчты кідіртеді.'
      ]
    }
  },
  sudoku: {
    EN: {
      icon: '[9]',
      title: 'Sudoku ASCII',
      players: '1 player solo, or 2–4 racing online',
      duration: '5–30 min',
      goal: 'Fill the board so every row, every column and every 3×3 box holds each digit from 1 to 9 exactly once.',
      steps: [
        'Pick a level. Every puzzle is new, has exactly one solution and can be solved by reasoning alone.',
        'Select a cell, then tap a number below the board or type 1–9.',
        'A wrong digit is struck by lightning and counts as a mistake. After 3 mistakes the game is over.',
        'Turn on Notes to pencil in the digits a cell could still hold. A right digit clears itself from the notes around it.',
        'You get 3 hints per puzzle: each one fills in the selected cell, or the easiest cell on the board.',
        'Online race: one person creates a room and picks the level, and the others join with the code. Everyone plays the same puzzle on one shared board.',
        'Get a right digit in first and the cell is yours: it’s a point. Your digits are bright, the others’ dim. A wrong digit costs a point. When the board is full, the most points wins.'
      ],
      tips: [
        'Start with the digits that are already on the board most often.',
        'Your game is saved as you play — come back later and pick Continue.',
        'An online race has no hints, no undo and no pause, and mistakes don’t end it.'
      ]
    },
    TR: {
      icon: '[9]',
      title: 'Sudoku ASCII',
      players: 'Tek kişilik ya da çevrim içi 2–4 kişilik yarış',
      duration: '5–30 dk',
      goal: 'Tahtayı her satırda, her sütunda ve her 3×3 kutuda 1’den 9’a kadar her rakam tam bir kez olacak şekilde doldur.',
      steps: [
        'Bir seviye seç. Her bulmaca yenidir, tek bir çözümü vardır ve yalnızca mantıkla çözülebilir.',
        'Bir kare seç, sonra tahtanın altındaki bir sayıya dokun ya da 1–9 yaz.',
        'Yanlış rakama yıldırım düşer ve bir hata sayılır. 3 hatadan sonra oyun biter.',
        'Bir karede olabilecek rakamları not almak için Not’u aç. Doğru rakam, çevresindeki notlardan kendini siler.',
        'Her bulmacada 3 ipucu hakkın var: her biri seçili kareyi ya da tahtadaki en kolay kareyi doldurur.',
        'Çevrim içi yarış: bir kişi oda oluşturup seviyeyi seçer, diğerleri kodla katılır. Herkes aynı bulmacayı tek bir ortak tahtada oynar.',
        'Doğru rakamı ilk sen koyarsan kare senindir: bir puan. Senin rakamların parlak, diğerlerininki soluk görünür. Yanlış rakam bir puan götürür. Tahta dolduğunda en çok puanı olan kazanır.'
      ],
      tips: [
        'Tahtada en çok bulunan rakamlarla başla.',
        'Oyunun sen oynadıkça kaydedilir — sonra geri gelip Devam et’i seç.',
        'Çevrim içi yarışta ipucu, geri alma ve duraklatma yoktur; hatalar oyunu bitirmez.'
      ]
    },
    RU: {
      icon: '[9]',
      title: 'Sudoku ASCII',
      players: 'Соло или онлайн-гонка на 2–4 игроков',
      duration: '5–30 мин',
      goal: 'Заполни поле так, чтобы в каждой строке, каждом столбце и каждом квадрате 3×3 каждая цифра от 1 до 9 встречалась ровно один раз.',
      steps: [
        'Выбери уровень. Каждая головоломка новая, имеет ровно одно решение и решается одной логикой.',
        'Выбери клетку, затем нажми цифру под полем или введи 1–9.',
        'В неверную цифру бьёт молния, и она считается ошибкой. После 3 ошибок игра окончена.',
        'Включи «Заметки», чтобы карандашом отметить цифры, которые ещё могут стоять в клетке. Верная цифра сама убирается из заметок вокруг.',
        'На каждую головоломку есть 3 подсказки: каждая заполняет выбранную клетку или самую простую клетку на поле.',
        'Онлайн-гонка: один создаёт комнату и выбирает уровень, остальные входят по коду. Все решают одну и ту же головоломку на общем поле.',
        'Успей поставить верную цифру раньше всех — и клетка твоя: это очко. Твои цифры яркие, чужие тусклые. Неверная цифра отнимает очко. Когда поле заполнено, побеждает тот, у кого больше всего очков.'
      ],
      tips: [
        'Начинай с цифр, которых на поле уже больше всего.',
        'Игра сохраняется по ходу — возвращайся позже и выбирай «Продолжить».',
        'В онлайн-гонке нет подсказок, отмены и паузы, а ошибки не заканчивают игру.'
      ]
    },
    KK: {
      icon: '[9]',
      title: 'Sudoku ASCII',
      players: 'Жеке немесе 2–4 ойыншының онлайн жарысы',
      duration: '5–30 мин',
      goal: 'Тақтаны әр жолда, әр бағанда және әр 3×3 шаршыда 1-ден 9-ға дейінгі әр сан дәл бір рет кездесетіндей етіп толтыр.',
      steps: [
        'Деңгей таңда. Әр жұмбақ жаңа, оның дәл бір шешімі бар және оны тек ойлау арқылы шешуге болады.',
        'Ұяшықты таңда, сосын тақтаның астындағы санды бас немесе 1–9 жаз.',
        'Қате санға найзағай түседі және ол қате болып саналады. 3 қатеден кейін ойын аяқталады.',
        'Ұяшыққа әлі сия алатын сандарды қарындашпен белгілеу үшін «Белгілер» режимін қос. Дұрыс сан айналасындағы белгілерден өзі өшеді.',
        'Әр жұмбаққа 3 кеңес беріледі: әрқайсысы таңдалған ұяшықты не тақтадағы ең оңай ұяшықты толтырады.',
        'Онлайн жарыс: бір адам бөлме ашып, деңгейді таңдайды, қалғандары кодпен кіреді. Барлығы бір жұмбақты бір ортақ тақтада шешеді.',
        'Дұрыс санды бірінші қойсаң, ұяшық сенікі: бұл бір ұпай. Сенің сандарың жарық, басқалардікі күңгірт. Қате сан бір ұпайды кетіреді. Тақта толғанда ең көп ұпай жинаған жеңеді.'
      ],
      tips: [
        'Тақтада ең жиі кездесетін сандардан баста.',
        'Ойының ойнаған сайын сақталады — кейін оралып, «Жалғастыру» түймесін бас.',
        'Онлайн жарыста кеңес, болдырмау және кідірту жоқ, ал қателер ойынды аяқтамайды.'
      ]
    }
  },
  chess: {
    EN: {
      icon: '[K]',
      title: 'Chess ASCII',
      players: '2 players online, others can watch',
      duration: '5–30 min',
      goal: 'Checkmate the other king: put it in check so that no move gets it out.',
      steps: [
        'One person creates a room and picks the clock and which side they play; their opponent joins with the code. Anyone else who joins watches.',
        'White’s pieces glow white and Black’s glow amber. Your side is at the bottom. In the list of moves the pieces are letters: K king, Q queen, R rook, B bishop, N knight, and none for a pawn.',
        'White moves first. Tap or click one of your pieces, then the square it goes to, or drag it there. A dot marks the squares it can move to, and brackets the pieces it can take.',
        'Every rule of chess counts: castling, en passant, and a pawn reaching the far side becomes a queen, rook, bishop or knight of your choice.',
        'With a clock, each player has that time for the whole game. Run out and you lose, unless the other side has too little left to mate.',
        'The game ends in checkmate, or when someone resigns or runs out of time. It’s a draw by stalemate, by agreement, when neither side can mate, after the same position three times, or after 50 moves each without a capture or a pawn move.'
      ],
      tips: [
        'Offer a draw from the button under the board; your opponent can accept, decline, or just play on. One offer per move.',
        'If your opponent leaves and isn’t back within 30 seconds, you can claim the win.',
        'A rematch in the same room swaps the sides, and the score between you two carries on.',
        'Keyboard: the arrow keys move a cursor over the board, Enter or Space picks up and puts down; Q, R, B or N picks a promotion. M turns the sound on or off.'
      ]
    },
    TR: {
      icon: '[K]',
      title: 'Satranç ASCII',
      players: 'Çevrim içi 2 oyuncu, diğerleri izler',
      duration: '5–30 dk',
      goal: 'Rakip şahı mat et: şah çek ve hiçbir hamle onu kurtaramasın.',
      steps: [
        'Bir kişi oda oluşturup süreyi ve hangi renkle oynayacağını seçer; rakibi kodla katılır. Sonradan katılan herkes izler.',
        'Beyazın taşları beyaz, siyahın taşları kehribar rengi parlar. Senin tarafın altta. Hamle listesinde taşlar İngilizce baş harfleriyle yazılır: K şah, Q vezir, R kale, B fil, N at; piyon için harf yazılmaz.',
        'İlk hamle beyazın. Taşlarından birine dokun ya da tıkla, sonra gideceği kareye; ya da oraya sürükle. Gidebileceği kareler noktayla, alabileceği taşlar köşeli parantezle gösterilir.',
        'Satrancın bütün kuralları geçerli: rok, geçerken alma ve karşı uca ulaşan piyonun seçtiğin vezir, kale, fil ya da ata terfisi.',
        'Süreli oyunda seçilen süre her oyuncunun bütün oyun için süresidir. Süren biterse kaybedersin; rakibinin mat edecek taşı kalmadıysa berabere biter.',
        'Oyun mat ile, biri terk edince ya da süresi bitince sona erer. Pat, anlaşma, iki tarafın da mat edemeyeceği durum, aynı konumun üç kez tekrarı ya da taş alınmadan ve piyon oynanmadan 50’şer hamle beraberliktir.'
      ],
      tips: [
        'Tahtanın altındaki düğmeyle beraberlik teklif edebilirsin; rakibin kabul edebilir, reddedebilir ya da oynamaya devam edebilir. Her hamlede bir teklif.',
        'Rakibin ayrılır ve 30 saniye içinde dönmezse galibiyeti alabilirsin.',
        'Aynı odada rövanşta renkler yer değiştirir ve ikiniz arasındaki skor devam eder.',
        'Klavye: ok tuşları tahtada bir imleci gezdirir, Enter ya da Boşluk taşı alır ve bırakır; terfide Q, R, B ya da N ile seçersin. M sesi açar ya da kapatır.'
      ]
    },
    RU: {
      icon: '[K]',
      title: 'Шахматы ASCII',
      players: '2 игрока онлайн, остальные смотрят',
      duration: '5–30 мин',
      goal: 'Поставь мат королю соперника: объяви шах, от которого не спасает ни один ход.',
      steps: [
        'Один создаёт комнату и выбирает часы и цвет своих фигур; соперник входит по коду. Все, кто войдёт после, смотрят.',
        'Белые фигуры светятся белым, чёрные — янтарным. Твоя сторона внизу. В списке ходов фигуры обозначены английскими буквами: K король, Q ферзь, R ладья, B слон, N конь, а у пешки буквы нет.',
        'Первыми ходят белые. Нажми на свою фигуру, затем на клетку, куда она пойдёт, или перетащи её. Точки показывают, куда фигура может пойти, а скобки — кого она может взять.',
        'Действуют все правила шахмат: рокировка, взятие на проходе, а пешка, дошедшая до последней горизонтали, превращается в ферзя, ладью, слона или коня на твой выбор.',
        'С часами у каждого игрока это время на всю партию. Если время кончилось, ты проигрываешь, — если только у соперника хватает фигур для мата.',
        'Партия заканчивается матом, сдачей или когда у кого-то кончается время. Ничья: пат, согласие обоих, когда ни у кого нет фигур для мата, трёхкратное повторение позиции или 50 ходов с каждой стороны без взятий и ходов пешкой.'
      ],
      tips: [
        'Предложи ничью кнопкой под доской; соперник может принять, отклонить или просто продолжать игру. Одно предложение за ход.',
        'Если соперник ушёл и не вернулся за 30 секунд, победу можно забрать.',
        'В реванше в той же комнате стороны меняются, а счёт между вами сохраняется.',
        'Клавиатура: стрелки двигают курсор по доске, Enter или пробел берут и ставят фигуру; Q, R, B или N выбирают превращение. M включает и выключает звук.'
      ]
    },
    KK: {
      icon: '[K]',
      title: 'Шахмат ASCII',
      players: 'Онлайн 2 ойыншы, қалғандары көреді',
      duration: '5–30 мин',
      goal: 'Қарсыластың патшасына мат қой: ешбір жүріс құтқара алмайтын шах бер.',
      steps: [
        'Бір адам бөлме ашып, сағатты және өз фигураларының түсін таңдайды; қарсыласы кодпен кіреді. Кейін кірген барлық адам көреді.',
        'Ақтардың фигуралары ақ түспен, қаралардікі кәріптас түсімен жарқырайды. Сенің жағың төменде. Жүрістер тізімінде фигуралар ағылшын әріптерімен жазылады: K патша, Q уәзір, R тура, B піл, N ат, ал пешкаға әріп жазылмайды.',
        'Алғашқы жүріс ақтардікі. Өз фигураңды бас, сосын ол баратын шаршыны бас немесе оны сүйреп апар. Нүктелер фигура бара алатын шаршыларды, жақшалар ол ала алатын фигураларды көрсетеді.',
        'Шахматтың барлық ережесі қолданылады: рокировка, өтіп бара жатып алу, ал соңғы қатарға жеткен пешка сен таңдаған уәзірге, тураға, пілге не атқа айналады.',
        'Сағатпен ойнағанда әр ойыншыға бүкіл ойынға сол уақыт беріледі. Уақытың бітсе, жеңілесің — тек қарсыласыңда мат қоюға фигура жетпесе, тепе-тең болады.',
        'Ойын матпен, біреу берілгенде не уақыты біткенде аяқталады. Тепе-тең: пат, екеуінің келісімі, ешкім мат қоя алмайтын жағдай, бір позицияның үш рет қайталануы немесе екі жақта да фигура алынбаған және пешка жүрмеген 50 жүріс.'
      ],
      tips: [
        'Тақтаның астындағы түймемен тепе-теңдік ұсына аласың; қарсылас қабылдай, бас тарта не ойынды жалғастыра алады. Әр жүрісте бір ұсыныс.',
        'Қарсылас кетіп, 30 секундта оралмаса, жеңісті ала аласың.',
        'Сол бөлмедегі реваншта жақтар ауысады, ал екеуңнің араңдағы есеп сақталады.',
        'Пернетақта: бағыт пернелері тақтадағы курсорды жылжытады, Enter не Бос орын фигураны алып, қояды; айналуда Q, R, B не N арқылы таңдайсың. M дыбысты қосады не өшіреді.'
      ]
    }
  },
  'number-guess': {
    EN: {
      icon: '[#]',
      title: 'Number Guessing',
      players: '1 player',
      duration: '1–3 min',
      goal: 'Find the secret number between 1 and 100 in as few guesses as possible.',
      steps: [
        'Type a number from 1 to 100 and submit your guess.',
        'The game tells you if the secret number is higher or lower.',
        'Keep narrowing it down until you hit the exact number.'
      ],
      tips: [
        'Start at 50 and halve the range each time — you can always win in 7 guesses or fewer.'
      ]
    },
    TR: {
      icon: '[#]',
      title: 'Sayı Tahmin',
      players: '1 oyuncu',
      duration: '1–3 dk',
      goal: '1 ile 100 arasındaki gizli sayıyı olabildiğince az denemede bul.',
      steps: [
        '1 ile 100 arasında bir sayı yaz ve tahminini gönder.',
        'Oyun, gizli sayının daha büyük mü yoksa daha küçük mü olduğunu söyler.',
        'Doğru sayıyı bulana kadar aralığı daralt.'
      ],
      tips: [
        '50 ile başla ve her seferinde aralığı ikiye böl — en fazla 7 denemede kazanabilirsin.'
      ]
    },
    RU: {
      icon: '[#]',
      title: 'Угадай число',
      players: '1 игрок',
      duration: '1–3 мин',
      goal: 'Найди загаданное число от 1 до 100 за как можно меньшее число попыток.',
      steps: [
        'Введи число от 1 до 100 и отправь ответ.',
        'Игра подскажет, больше загаданное число или меньше.',
        'Сужай диапазон, пока не попадёшь точно в число.'
      ],
      tips: [
        'Начни с 50 и каждый раз дели диапазон пополам — так всегда можно угадать не больше чем за 7 попыток.'
      ]
    },
    KK: {
      icon: '[#]',
      title: 'Санды тап',
      players: '1 ойыншы',
      duration: '1–3 мин',
      goal: '1 мен 100 арасындағы жасырын санды барынша аз талпыныспен тап.',
      steps: [
        '1-ден 100-ге дейінгі сан жазып, болжамыңды жібер.',
        'Ойын жасырын санның үлкен не кіші екенін айтады.',
        'Дәл санды тапқанша аралықты тарылта бер.'
      ],
      tips: [
        '50-ден бастап, аралықты әр жолы екіге бөл — сонда әрқашан 7 не одан аз талпыныста табасың.'
      ]
    }
  },
  wordle: {
    EN: {
      icon: '[W]',
      title: 'Wordle',
      players: '1 player',
      duration: '2–5 min',
      goal: 'Guess the hidden word in 6 tries or fewer.',
      steps: [
        'Pick a language and a word length (5, 6 or 7 letters).',
        'Type a word of that length and press Enter.',
        'After each guess the tiles change to give you hints.'
      ],
      legend: [
        { color: 'green', text: 'Right letter, right spot' },
        { color: 'yellow', text: 'In the word, wrong spot' },
        { color: 'gray', text: 'Not in the word' }
      ],
      tips: [
        'Open with a word that has many different vowels.',
        'Letters can appear more than once.'
      ]
    },
    TR: {
      icon: '[W]',
      title: 'Kelime Oyunu',
      players: '1 oyuncu',
      duration: '2–5 dk',
      goal: 'Gizli kelimeyi en fazla 6 denemede tahmin et.',
      steps: [
        'Bir dil ve kelime uzunluğu seç (5, 6 veya 7 harf).',
        'Bu uzunlukta bir kelime yaz ve Enter’a bas.',
        'Her tahminden sonra kutular değişerek sana ipucu verir.'
      ],
      legend: [
        { color: 'green', text: 'Doğru harf, doğru yer' },
        { color: 'yellow', text: 'Kelimede var, yeri yanlış' },
        { color: 'gray', text: 'Kelimede yok' }
      ],
      tips: [
        'Farklı ünlü harfler içeren bir kelimeyle başla.',
        'Bir harf kelimede birden fazla kez geçebilir.'
      ]
    },
    RU: {
      icon: '[W]',
      title: 'Wordle',
      players: '1 игрок',
      duration: '2–5 мин',
      goal: 'Угадай загаданное слово не больше чем за 6 попыток.',
      steps: [
        'Выбери язык и длину слова (5, 6 или 7 букв).',
        'Введи слово такой длины и нажми Enter.',
        'После каждой попытки плитки меняются и дают подсказки.'
      ],
      legend: [
        { color: 'green', text: 'Буква есть и стоит на своём месте' },
        { color: 'yellow', text: 'Буква есть в слове, но не на этом месте' },
        { color: 'gray', text: 'Буквы нет в слове' }
      ],
      tips: [
        'Начни со слова, в котором много разных гласных.',
        'Буквы могут повторяться.'
      ]
    },
    KK: {
      icon: '[W]',
      title: 'Wordle',
      players: '1 ойыншы',
      duration: '2–5 мин',
      goal: 'Жасырын сөзді 6 немесе одан аз талпыныста тап.',
      steps: [
        'Тіл мен сөз ұзындығын таңда (5, 6 немесе 7 әріп).',
        'Сол ұзындықтағы сөзді жазып, Enter бас.',
        'Әр болжамнан кейін тақташалар өзгеріп, кеңес береді.'
      ],
      legend: [
        { color: 'green', text: 'Әріп дұрыс, орны да дұрыс' },
        { color: 'yellow', text: 'Әріп сөзде бар, бірақ орны басқа' },
        { color: 'gray', text: 'Әріп сөзде жоқ' }
      ],
      tips: [
        'Әртүрлі дауысты дыбыстары көп сөзден баста.',
        'Әріптер қайталануы мүмкін.'
      ]
    }
  },
  'bottle-spin': {
    EN: {
      icon: '[@]',
      title: 'Bottle Spin',
      players: '2+ players',
      duration: 'Unlimited',
      goal: 'Spin the bottle and take on a truth or a dare.',
      steps: [
        'Choose how many people are playing and enter their names.',
        'Spin the bottle — it lands on a random player.',
        'That player picks Truth or Dare and completes the prompt.',
        'Spin again for the next round.'
      ],
      tips: [
        'Agree on house rules before you start — anyone can pass on a prompt.'
      ]
    },
    TR: {
      icon: '[@]',
      title: 'Şişe Çevirmece',
      players: '2+ oyuncu',
      duration: 'Sınırsız',
      goal: 'Şişeyi çevir; doğruluk mu cesaret mi, seçimi yap.',
      steps: [
        'Kaç kişi oynayacağını seç ve isimleri gir.',
        'Şişeyi çevir — rastgele bir oyuncuda durur.',
        'Bu oyuncu Doğruluk veya Cesaret’i seçer ve görevi yapar.',
        'Sonraki tur için şişeyi tekrar çevir.'
      ],
      tips: [
        'Başlamadan önce kuralları konuşun — herkes bir görevi pas geçebilir.'
      ]
    },
    RU: {
      icon: '[@]',
      title: 'Бутылочка',
      players: '2+ игроков',
      duration: 'Без ограничений',
      goal: 'Крути бутылочку и выбирай: правда или действие.',
      steps: [
        'Выбери, сколько человек играет, и введи их имена.',
        'Крути бутылочку — она остановится на случайном игроке.',
        'Этот игрок выбирает «Правда» или «Действие» и выполняет задание.',
        'Крути снова для следующего раунда.'
      ],
      tips: [
        'Договоритесь о правилах заранее — любой может пропустить задание.'
      ]
    },
    KK: {
      icon: '[@]',
      title: 'Бөтелке айналдыру',
      players: '2+ ойыншы',
      duration: 'Шексіз',
      goal: 'Бөтелкені айналдырып, шындықты айт немесе тапсырманы орында.',
      steps: [
        'Қанша адам ойнайтынын таңдап, олардың аттарын жаз.',
        'Бөтелкені айналдыр — ол кездейсоқ ойыншыға тоқтайды.',
        'Сол ойыншы «Шындық» не «Тапсырма» таңдап, оны орындайды.',
        'Келесі раунд үшін қайта айналдыр.'
      ],
      tips: [
        'Бастамас бұрын ережелерді келісіп алыңдар — кез келген адам тапсырмадан бас тарта алады.'
      ]
    }
  },
  'casus-kim': {
    EN: {
      icon: '[*]',
      title: 'Who Is the Spy?',
      players: '3–12 players, one device each',
      duration: '5–10 min',
      goal: 'Everyone knows the secret word except the spy. Civilians must find the spy; the spy must blend in or guess the word.',
      steps: [
        'One player creates a room and picks a theme (or Random), the discussion time and 1–2 spies; everyone else joins with the code.',
        'Each player taps their own card to see their role privately, then presses “I’ve seen my card”.',
        'Discuss: take turns asking each other questions about the word. The host can pause or extend the timer.',
        'Everyone votes secretly on their own device. A tie leads to one runoff vote.',
        'If the spy is caught, they get one last chance to guess the word on their device and steal the win.'
      ],
      tips: [
        'Civilians: be specific enough to prove you know the word, but vague enough not to give it away.',
        'Spy: listen closely, keep answers short, and accuse someone else first.',
        'Forgot your word? Tap “Show my card” during the discussion.',
        'Scoring: civilians +1 on a group win, spy +2 on a spy win, +3 for guessing the word.'
      ]
    },
    TR: {
      icon: '[*]',
      title: 'Casus Kim?',
      players: '3–12 oyuncu, herkes kendi cihazından',
      duration: '5–10 dk',
      goal: 'Casus hariç herkes gizli kelimeyi bilir. Siviller casusu bulmalı; casus ise aralarına karışmalı ya da kelimeyi tahmin etmeli.',
      steps: [
        'Bir oyuncu oda oluşturur; tema (veya Rastgele), tartışma süresi ve 1–2 casus seçer. Diğerleri kodla katılır.',
        'Herkes rolünü gizlice görmek için kendi kartına dokunur, sonra “Kartımı gördüm”e basar.',
        'Tartışın: sırayla kelimeyle ilgili birbirinize sorular sorun. Sunucu süreyi duraklatabilir veya uzatabilir.',
        'Herkes kendi cihazından gizlice oy verir. Beraberlikte bir kez ikinci tur yapılır.',
        'Casus yakalanırsa kendi cihazından kelimeyi tahmin edip kazanmak için son bir şansı olur.'
      ],
      tips: [
        'Siviller: kelimeyi bildiğinizi gösterecek kadar net, ama ele vermeyecek kadar belirsiz olun.',
        'Casus: dikkatle dinle, kısa cevap ver ve önce sen başkasını suçla.',
        'Kelimeyi mi unuttun? Tartışma sırasında “Kartımı göster”e dokun.',
        'Puanlama: grup kazanırsa siviller +1, casus kazanırsa +2, kelimeyi bilirse +3.'
      ]
    },
    RU: {
      icon: '[*]',
      title: 'Кто шпион?',
      players: '3–12 игроков, у каждого своё устройство',
      duration: '5–10 мин',
      goal: 'Секретное слово знают все, кроме шпиона. Мирные должны найти шпиона, а шпион — не выдать себя или угадать слово.',
      steps: [
        'Один игрок создаёт комнату и выбирает тему (или «Случайная»), время обсуждения и 1–2 шпионов; остальные входят по коду.',
        'Каждый нажимает на свою карточку, чтобы втайне увидеть свою роль, а затем нажимает «Карточка просмотрена».',
        'Обсуждение: по очереди задавайте друг другу вопросы о слове. Ведущий может поставить таймер на паузу или добавить время.',
        'Все голосуют тайно, каждый на своём устройстве. При ничьей проводится один повторный тур.',
        'Если шпиона поймали, у него есть последний шанс угадать слово на своём устройстве и забрать победу.'
      ],
      tips: [
        'Мирным: говорите достаточно конкретно, чтобы доказать, что знаете слово, но достаточно расплывчато, чтобы его не выдать.',
        'Шпиону: слушай внимательно, отвечай коротко и обвиняй кого-нибудь первым.',
        'Слово вылетело из головы? Нажми «Показать мою карточку» во время обсуждения.',
        'Очки: мирным +1 за победу группы, шпиону +2 за свою победу, +3 за угаданное слово.'
      ]
    },
    KK: {
      icon: '[*]',
      title: 'Тыңшы кім?',
      players: '3–12 ойыншы, әркімде өз құрылғысы',
      duration: '5–10 мин',
      goal: 'Тыңшыдан басқаның бәрі құпия сөзді біледі. Бейбіт тұрғындар тыңшыны табуы керек; тыңшы өзін сездірмеуі не сөзді табуы керек.',
      steps: [
        'Бір ойыншы бөлме ашып, тақырыпты (не «Кездейсоқ»), талқылау уақытын және 1–2 тыңшыны таңдайды; қалғандары кодпен кіреді.',
        'Әр ойыншы рөлін жасырын көру үшін өз картасын түртеді, сосын «Картамды көрдім» түймесін басады.',
        'Талқылау: кезекпен бір-біріңе сөз туралы сұрақ қойыңдар. Жүргізуші таймерді кідіртіп не ұзарта алады.',
        'Әркім өз құрылғысында жасырын дауыс береді. Дауыс тең түссе, бір рет екінші тур өтеді.',
        'Тыңшы ұсталса, оның өз құрылғысында сөзді тауып, жеңісті тартып алуға соңғы мүмкіндігі бар.'
      ],
      tips: [
        'Бейбіт тұрғындар: сөзді білетініңді дәлелдейтіндей нақты, бірақ оны ашып қоймайтындай бұлыңғыр сөйле.',
        'Тыңшы: мұқият тыңда, қысқа жауап бер және бірінші болып басқа біреуді айыпта.',
        'Сөзді ұмытып қалдың ба? Талқылау кезінде «Картамды көрсет» түймесін бас.',
        'Ұпай: топ жеңсе, бейбіт тұрғындарға +1, тыңшы жеңсе, оған +2, сөзді тапса, +3.'
      ]
    }
  },
  tabu: {
    EN: {
      icon: '[!]',
      title: 'Tabu',
      players: '2+ players, 2 teams, one device each',
      duration: '60 s per turn',
      goal: 'Get your team to guess as many words as possible without saying the forbidden words.',
      steps: [
        'One player creates a room; everyone joins with the code and picks a team on their own device.',
        'Each turn one player explains: only they and the other team see the card — their own team guesses.',
        'The explainer presses Correct for +1 point or Skip to move to the next card.',
        'The other team watches the forbidden words and presses Taboo! if one slips out — the card is discarded.',
        'After 60 seconds the turn passes to the other team. When the cards run out, the team with the most points wins.'
      ],
      tips: [
        'No saying the word itself, its parts, or the forbidden words — and no gestures.'
      ]
    },
    TR: {
      icon: '[!]',
      title: 'Tabu',
      players: '2+ oyuncu, 2 takım, herkes kendi cihazından',
      duration: 'Tur başına 60 sn',
      goal: 'Yasaklı kelimeleri söylemeden takımına olabildiğince çok kelime bildir.',
      steps: [
        'Bir oyuncu oda oluşturur; herkes kodla katılır ve kendi cihazından takımını seçer.',
        'Her turda bir oyuncu anlatır: kartı sadece o ve rakip takım görür — kendi takımı tahmin eder.',
        'Anlatıcı +1 puan için Doğru’ya, sonraki karta geçmek için Pas’a basar.',
        'Rakip takım yasaklı kelimeleri izler; biri söylenirse Tabu!’ya basar ve kart iptal olur.',
        '60 saniye sonunda sıra diğer takıma geçer. Kartlar bitince en çok puanı olan takım kazanır.'
      ],
      tips: [
        'Kelimenin kendisi, parçaları veya yasaklı kelimeler söylenmez — el hareketi de yok.'
      ]
    },
    RU: {
      icon: '[!]',
      title: 'Табу',
      players: '2+ игроков, 2 команды, у каждого своё устройство',
      duration: '60 с на ход',
      goal: 'Помоги своей команде угадать как можно больше слов, не произнося запретных.',
      steps: [
        'Один игрок создаёт комнату; все входят по коду и выбирают команду на своём устройстве.',
        'Каждый ход один игрок объясняет: карточку видят только он и другая команда, а его команда угадывает.',
        'Объясняющий нажимает «Верно», чтобы получить +1 очко, или «Пропустить», чтобы перейти к следующей карточке.',
        'Другая команда следит за запретными словами и жмёт «Табу!», если какое-то из них прозвучит, — карточка сгорает.',
        'Через 60 секунд ход переходит к другой команде. Когда карточки заканчиваются, побеждает команда, у которой больше всего очков.'
      ],
      tips: [
        'Нельзя называть само слово, его части или запретные слова — и никаких жестов.'
      ]
    },
    KK: {
      icon: '[!]',
      title: 'Табу',
      players: '2+ ойыншы, 2 команда, әркімде өз құрылғысы',
      duration: 'Әр жүріске 60 с',
      goal: 'Тыйым салынған сөздерді айтпай, командаңа барынша көп сөз таптыр.',
      steps: [
        'Бір ойыншы бөлме ашады; барлығы кодпен кіріп, өз құрылғысында команда таңдайды.',
        'Әр жүрісте бір ойыншы түсіндіреді: картаны тек ол және қарсылас команда көреді — өз командасы табады.',
        'Түсіндіруші +1 ұпай үшін «Дұрыс» түймесін, келесі картаға өту үшін «Өткізу» түймесін басады.',
        'Қарсылас команда тыйым салынған сөздерді бақылап, солардың бірі айтылса, «Табу!» түймесін басады — карта жойылады.',
        '60 секундтан кейін кезек басқа командаға өтеді. Карталар біткенде ең көп ұпай жинаған команда жеңеді.'
      ],
      tips: [
        'Сөздің өзін, оның бөліктерін және тыйым салынған сөздерді айтуға болмайды — ым-ишара да жоқ.'
      ]
    }
  },
  'quiz-race': {
    EN: {
      icon: '[?]',
      title: 'Quiz Race',
      players: '1–10 players, any devices',
      duration: '5–10 min',
      goal: 'Answer trivia questions correctly and faster than everyone else.',
      steps: [
        'One person taps Create room — their device becomes the host.',
        'Everyone else opens this site on their own phone or computer, picks Quiz Race and enters the room code (or opens the shared link).',
        'The host starts the game. Each question has 20 seconds — tap your answer.',
        'A correct answer is worth 500 points plus up to 500 more for speed.',
        'The host moves on to the next question; the highest score at the end wins.'
      ],
      tips: [
        'The host has to keep the page open — if the host leaves, the room closes.',
        'Got disconnected? Join again from the same browser tab and your score comes back.',
        'Each device shows the questions in its own language.'
      ]
    },
    TR: {
      icon: '[?]',
      title: 'Bilgi Yarışı',
      players: '1–10 oyuncu, her cihazdan',
      duration: '5–10 dk',
      goal: 'Bilgi sorularını herkesten doğru ve hızlı cevapla.',
      steps: [
        'Bir kişi Oda oluştur’a basar — onun cihazı sunucu olur.',
        'Diğerleri kendi telefon veya bilgisayarlarında bu siteyi açar, Bilgi Yarışı’nı seçer ve oda kodunu girer (ya da paylaşılan bağlantıyı açar).',
        'Sunucu oyunu başlatır. Her soru için 20 saniye var — cevabına dokun.',
        'Doğru cevap 500 puan, hızlı olursan 500 puana kadar ek puan kazandırır.',
        'Sunucu sonraki soruya geçer; sonunda en yüksek puanı alan kazanır.'
      ],
      tips: [
        'Sunucu sayfayı açık tutmalı — sunucu çıkarsa oda kapanır.',
        'Bağlantın mı koptu? Aynı tarayıcı sekmesinden tekrar katıl, puanın geri gelir.',
        'Her cihaz soruları kendi dil ayarında gösterir.'
      ]
    },
    RU: {
      icon: '[?]',
      title: 'Викторина',
      players: '1–10 игроков, любые устройства',
      duration: '5–10 мин',
      goal: 'Отвечай на вопросы правильно и быстрее всех.',
      steps: [
        'Один человек нажимает «Создать комнату» — его устройство становится ведущим.',
        'Остальные открывают этот сайт на своём телефоне или компьютере, выбирают «Викторину» и вводят код комнаты (или открывают присланную ссылку).',
        'Ведущий начинает игру. На каждый вопрос 20 секунд — нажми на свой ответ.',
        'Правильный ответ приносит 500 очков и ещё до 500 за скорость.',
        'Ведущий переходит к следующему вопросу; в конце побеждает тот, у кого больше всего очков.'
      ],
      tips: [
        'Ведущий должен держать страницу открытой — если он уйдёт, комната закроется.',
        'Связь пропала? Войди снова из той же вкладки браузера, и твои очки вернутся.',
        'Каждое устройство показывает вопросы на своём языке.'
      ]
    },
    KK: {
      icon: '[?]',
      title: 'Білім жарысы',
      players: '1–10 ойыншы, кез келген құрылғы',
      duration: '5–10 мин',
      goal: 'Сұрақтарға дұрыс және бәрінен жылдам жауап бер.',
      steps: [
        'Бір адам «Бөлме ашу» түймесін басады — оның құрылғысы жүргізуші болады.',
        'Қалғандары өз телефонында не компьютерінде осы сайтты ашып, «Білім жарысын» таңдайды да, бөлме кодын жазады (не жіберілген сілтемені ашады).',
        'Жүргізуші ойынды бастайды. Әр сұраққа 20 секунд беріледі — жауабыңды бас.',
        'Дұрыс жауапқа 500 ұпай және жылдамдық үшін тағы 500 ұпайға дейін беріледі.',
        'Жүргізуші келесі сұраққа өтеді; соңында ең көп ұпай жинаған жеңеді.'
      ],
      tips: [
        'Жүргізуші бетті ашық ұстауы керек — жүргізуші шығып кетсе, бөлме жабылады.',
        'Байланыс үзілді ме? Сол браузер қойындысынан қайта кірсең, ұпайың қайтады.',
        'Әр құрылғы сұрақтарды өз тілінде көрсетеді.'
      ]
    }
  },
  doodle: {
    EN: {
      icon: '[/]',
      title: 'Doodle Race',
      players: '2–10 players, one device each',
      duration: '10–20 min',
      goal: 'Draw so the others can guess your word, and guess theirs before the clock runs out.',
      steps: [
        'One person creates a room and picks the rounds, the drawing time and whether letter hints show; everyone else joins with the code.',
        'Players take turns to draw. The drawer picks one of three words: easy, medium (worth double) or hard (worth triple).',
        'Everyone else types guesses in the chat. Wrong guesses show for all; a right one doesn’t give the word away, it just scores.',
        'A guess scores 40 to 100 points times the word’s level, more the quicker it comes. The drawer earns the average of what the guessers scored.',
        'The turn ends when everyone has guessed or time runs out. Once every player has drawn in every round, the most points wins.'
      ],
      tips: [
        'Everyone sees the word in their own language, and a guess counts in any of the four, even typed without special letters like ş, ё or қ.',
        'With letter hints on, a letter shows at half time and another at three quarters.',
        'Once you’ve guessed it, your messages only reach the drawer and the others who got it.',
        'Drawing keys: P pen, F fill, E eraser, 1–3 brush size, Ctrl+Z undo. On a phone, draw with a finger.'
      ]
    },
    TR: {
      icon: '[/]',
      title: 'Çizim Yarışı',
      players: '2–10 oyuncu, herkes kendi cihazından',
      duration: '10–20 dk',
      goal: 'Kelimeni diğerleri bilebilsin diye çiz, onlarınkini de süre bitmeden bil.',
      steps: [
        'Bir kişi oda oluşturur; tur sayısını, çizim süresini ve harf ipuçlarını seçer. Diğerleri kodla katılır.',
        'Oyuncular sırayla çizer. Çizen üç kelimeden birini seçer: kolay, orta (iki kat) ya da zor (üç kat).',
        'Diğerleri tahminlerini sohbete yazar. Yanlış tahminleri herkes görür; doğru tahmin kelimeyi ele vermez, sadece puan kazandırır.',
        'Bir tahmin, kelimenin seviyesiyle çarpılan 40 ile 100 arası puan getirir; ne kadar hızlıysa o kadar çok. Çizen, bilenlerin aldığı puanların ortalamasını kazanır.',
        'Herkes bildiğinde ya da süre dolduğunda sıra biter. Her oyuncu her turda çizdikten sonra en çok puanı olan kazanır.'
      ],
      tips: [
        'Herkes kelimeyi kendi dilinde görür; tahmin dört dilin herhangi birinde, ş, ё ya da қ gibi özel harfler olmadan yazılsa bile sayılır.',
        'Harf ipuçları açıksa sürenin yarısında bir harf, dörtte üçünde bir harf daha görünür.',
        'Bildikten sonra yazdıklarını sadece çizen ve bilen diğer oyuncular görür.',
        'Çizim tuşları: P kalem, F boya, E silgi, 1–3 fırça boyutu, Ctrl+Z geri al. Telefonda parmağınla çiz.'
      ]
    },
    RU: {
      icon: '[/]',
      title: 'Рисуй и угадай',
      players: '2–10 игроков, у каждого своё устройство',
      duration: '10–20 мин',
      goal: 'Рисуй так, чтобы другие угадали твоё слово, и угадывай их слова, пока не вышло время.',
      steps: [
        'Один создаёт комнату и выбирает число раундов, время на рисунок и подсказки букв; остальные входят по коду.',
        'Игроки рисуют по очереди. Рисующий выбирает одно из трёх слов: лёгкое, среднее (вдвое дороже) или сложное (втрое дороже).',
        'Остальные пишут догадки в чат. Неверные видят все; верная догадка слово не выдаёт, а просто приносит очки.',
        'Догадка приносит от 40 до 100 очков, умноженных на уровень слова: чем быстрее, тем больше. Рисующий получает среднее от очков угадывающих.',
        'Ход заканчивается, когда все угадали или вышло время. Когда каждый игрок порисует в каждом раунде, побеждает тот, у кого больше всего очков.'
      ],
      tips: [
        'Каждый видит слово на своём языке, а догадка засчитывается на любом из четырёх, даже без особых букв вроде ş, ё или қ.',
        'Если подсказки букв включены, одна буква открывается на половине времени, ещё одна — на трёх четвертях.',
        'Когда угадаешь, твои сообщения видят только рисующий и другие угадавшие.',
        'Клавиши для рисования: P кисть, F заливка, E ластик, 1–3 размер кисти, Ctrl+Z отмена. На телефоне рисуй пальцем.'
      ]
    },
    KK: {
      icon: '[/]',
      title: 'Сал да тап',
      players: '2–10 ойыншы, әркімде өз құрылғысы',
      duration: '10–20 мин',
      goal: 'Басқалар сөзіңді табатындай етіп сал, ал олардың сөзін уақыт біткенше тап.',
      steps: [
        'Бір адам бөлме ашып, раунд санын, салу уақытын және әріп кеңестерін таңдайды; қалғандары кодпен кіреді.',
        'Ойыншылар кезекпен салады. Суретші үш сөздің бірін таңдайды: оңай, орташа (екі есе) немесе қиын (үш есе).',
        'Қалғандары болжамдарын чатқа жазады. Қате болжамдарды бәрі көреді; дұрыс болжам сөзді ашпайды, тек ұпай әкеледі.',
        'Болжам сөздің деңгейіне көбейтілген 40-тан 100-ге дейін ұпай әкеледі: неғұрлым тез болса, соғұрлым көп. Суретші тапқандардың ұпайының орташасын алады.',
        'Барлығы тапқанда не уақыт біткенде кезек аяқталады. Әр ойыншы әр раундта салып болған соң, ең көп ұпай жинаған жеңеді.'
      ],
      tips: [
        'Әркім сөзді өз тілінде көреді, ал болжам төрт тілдің кез келгенінде, тіпті ş, ё не қ сияқты ерекше әріптерсіз жазылса да есептеледі.',
        'Әріп кеңестері қосулы болса, уақыттың жартысында бір әріп, төрттен үшінде тағы бір әріп ашылады.',
        'Тапқаннан кейін хабарламаларыңды тек суретші мен тапқан басқа ойыншылар көреді.',
        'Салу пернелері: P қалам, F бояу, E өшіргіш, 1–3 қылқалам өлшемі, Ctrl+Z қайтару. Телефонда саусағыңмен сал.'
      ]
    }
  },
  world: {
    EN: {
      icon: '3D',
      title: 'Sunny Square',
      players: 'Up to 30 per plaza, one device each',
      duration: 'As long as you like',
      goal: 'Make an avatar, hang out with others in a 3D town square, earn coins and decorate a home of your own.',
      steps: [
        'Create an account with a name and password, then make your avatar: body, skin, face, eyes, brows, hair and clothes. You can change it any time.',
        'Walk with W A S D or the arrow keys, or click the ground to walk there. Drag to turn the camera; scroll or pinch to zoom.',
        'Press Enter or Chat to talk: your words float over your head for a few seconds. Emotes (keys 1–4) wave, dance, sit and laugh.',
        'You earn coins for every active minute and a bonus on your first visit each day. Spend them in the shop on clothes and furniture.',
        'Home takes you to your own room. Press Decorate to place, turn, move or put away furniture on the floor grid; it saves by itself.',
        'Click someone to see their card and add them as a friend. Friends can visit each other’s homes and invite each other over.'
      ],
      tips: [
        'Click a bench, sofa or chair to walk over and sit down.',
        'The shop fronts on the plaza open the shop too.',
        'Chat filters rude words and only lets a few messages through at a time.',
        'Signing in on another tab or device moves you there.'
      ]
    },
    TR: {
      icon: '3D',
      title: 'Güneşli Meydan',
      players: 'Meydan başına 30 kişiye kadar, herkes kendi cihazından',
      duration: 'İstediğin kadar',
      goal: 'Bir avatar yap, 3B bir şehir meydanında başkalarıyla takıl, jeton kazan ve kendi evini döşe.',
      steps: [
        'Bir ad ve şifreyle hesap aç, sonra avatarını yap: vücut, ten, yüz, gözler, kaşlar, saç ve kıyafetler. İstediğin zaman değiştirebilirsin.',
        'W A S D ya da ok tuşlarıyla yürü veya gitmek istediğin yere tıkla. Kamerayı çevirmek için sürükle; yakınlaştırmak için tekerleği çevir ya da iki parmakla sıkıştır.',
        'Konuşmak için Enter’a ya da Sohbet’e bas: yazdıkların birkaç saniye başının üstünde görünür. İfadelerle (1–4 tuşları) el salla, dans et, otur ve gül.',
        'Aktif geçirdiğin her dakika jeton kazanırsın, her günün ilk girişinde de bonus alırsın. Jetonları mağazada kıyafete ve mobilyaya harca.',
        'Ev seni kendi odana götürür. Mobilyaları zemin ızgarasına yerleştirmek, döndürmek, taşımak ya da kaldırmak için Dekore et’e bas; kendiliğinden kaydedilir.',
        'Birinin kartını görmek ve onu arkadaş eklemek için ona tıkla. Arkadaşlar birbirinin evini ziyaret edip birbirini davet edebilir.'
      ],
      tips: [
        'Bir banka, kanepeye ya da sandalyeye tıklarsan oraya yürüyüp oturursun.',
        'Meydandaki dükkân vitrinleri de mağazayı açar.',
        'Sohbet kaba sözleri filtreler ve art arda ancak birkaç mesaja izin verir.',
        'Başka bir sekmede ya da cihazda giriş yaparsan oyun oraya geçer.'
      ]
    },
    RU: {
      icon: '3D',
      title: 'Солнечная площадь',
      players: 'До 30 человек на площади, у каждого своё устройство',
      duration: 'Сколько захочешь',
      goal: 'Создай аватара, проводи время с другими на 3D-площади, зарабатывай монеты и обставь собственный дом.',
      steps: [
        'Заведи аккаунт с именем и паролем, затем создай аватара: тело, кожа, лицо, глаза, брови, причёска и одежда. Изменить его можно в любой момент.',
        'Ходи клавишами W A S D или стрелками либо кликни по земле, чтобы пойти туда. Перетаскивай, чтобы повернуть камеру; колесо мыши или щипок приближают.',
        'Нажми Enter или «Чат», чтобы говорить: твои слова несколько секунд видны над головой. Эмоции (клавиши 1–4): помахать, танцевать, сесть и смеяться.',
        'Монеты начисляются за каждую активную минуту, а за первый вход каждый день — бонус. Трать их в магазине на одежду и мебель.',
        '«Дом» ведёт в твою комнату. Нажми «Обустроить», чтобы ставить, поворачивать, переставлять или убирать мебель по сетке на полу; всё сохраняется само.',
        'Кликни по игроку, чтобы открыть его карточку и добавить в друзья. Друзья могут ходить друг к другу в гости и приглашать к себе.'
      ],
      tips: [
        'Кликни по скамейке, дивану или стулу — дойдёшь и сядешь.',
        'Витрины магазинов на площади тоже открывают магазин.',
        'Чат отсеивает грубые слова и пропускает лишь несколько сообщений подряд.',
        'Если войти в другой вкладке или на другом устройстве, игра переместится туда.'
      ]
    },
    KK: {
      icon: '3D',
      title: 'Шуақты алаң',
      players: 'Бір алаңда 30 адамға дейін, әркімде өз құрылғысы',
      duration: 'Қалағаныңша',
      goal: 'Аватар жасап, 3D алаңда басқалармен уақыт өткізіп, тиын тап және өз үйіңді жабдықта.',
      steps: [
        'Есім мен құпиясөзбен аккаунт аш, сосын аватарыңды жаса: дене, тері, бет, көз, қас, шаш және киім. Оны кез келген уақытта өзгертуге болады.',
        'W A S D немесе көрсеткі пернелерімен жүр, не барғың келген жерді шерт. Камераны бұру үшін сүйре; жақындату үшін тінтуір дөңгелегін айналдыр не екі саусақпен қыс.',
        'Сөйлеу үшін Enter не «Чат» түймесін бас: сөздерің бірнеше секунд басыңның үстінде тұрады. Эмоциялар (1–4 пернелері): қол бұлғау, билеу, отыру және күлу.',
        'Әр белсенді минутың үшін тиын түседі, ал күн сайынғы алғашқы кіруге бонус беріледі. Тиынды дүкенде киім мен жиһазға жұмса.',
        '«Үй» сені өз бөлмеңе апарады. Жиһазды еден торына қою, бұру, жылжыту не жинап алу үшін «Безендіру» түймесін бас; бәрі өзі сақталады.',
        'Ойыншының картасын ашып, оны досыңа қосу үшін оны шерт. Достар бір-бірінің үйіне қонаққа барып, бір-бірін шақыра алады.'
      ],
      tips: [
        'Орындыққа не диванға шертсең, барып отырасың.',
        'Алаңдағы дүкен витриналары да дүкенді ашады.',
        'Чат дөрекі сөздерді сүзеді және қатарынан бірнеше хабарламаға ғана рұқсат береді.',
        'Басқа қойындыда не құрылғыда кірсең, ойын сонда ауысады.'
      ]
    }
  },
  users: {
    EN: {
      icon: 'who',
      title: 'Online users',
      goal: 'See who else has the site open right now, what their IP address gives away, and chat with them.',
      steps: [
        'Everyone with the site open is on the list with their IP address and flag, you included.',
        'Pick someone to see what public lookup services know about their IP: country and flag, city, time zone, internet provider and more.',
        'Write in the chat box to message them. They get a pop-up wherever they are on the site.',
        'Press [+] Invite to a game and pick one: you open a room in it, and they get a Join button that takes them straight in.',
        'A chat only lasts while you’re both here: when either of you closes the site or loses connection, it’s deleted on both sides.'
      ],
      tips: [
        'Messages are end-to-end encrypted and never stored, not even by the relay that carries them.',
        'IP locations are approximate: usually the internet provider’s city, not a street address.',
        'Everyone here can see your IP address, so think twice before sharing anything private with strangers.'
      ]
    },
    TR: {
      icon: 'who',
      title: 'Çevrim içi kullanıcılar',
      goal: 'Siteyi şu an kimlerin açık tuttuğunu, IP adreslerinin neleri ele verdiğini gör ve onlarla sohbet et.',
      steps: [
        'Siteyi açık tutan herkes IP adresi ve bayrağıyla listede görünür, sen de dahil.',
        'Birini seçerek herkese açık sorgulama servislerinin o IP hakkında bildiklerini gör: ülke ve bayrak, şehir, saat dilimi, internet sağlayıcı ve daha fazlası.',
        'Mesaj göndermek için sohbet kutusuna yaz. Karşı taraf sitenin neresinde olursa olsun bildirim alır.',
        '[+] Oyuna davet et’e basıp bir oyun seç: o oyunda bir oda açarsın, karşı taraf da doğrudan katılması için bir Katıl butonu alır.',
        'Sohbet sadece ikiniz de buradayken sürer: biriniz siteyi kapatır ya da bağlantısı koparsa iki tarafta da silinir.'
      ],
      tips: [
        'Mesajlar uçtan uca şifrelidir ve hiçbir yerde saklanmaz, onları taşıyan aktarıcıda bile.',
        'IP konumları yaklaşıktır: genellikle sokak adresi değil, internet sağlayıcısının şehridir.',
        'Buradaki herkes IP adresini görebilir, yabancılarla özel bir şey paylaşmadan önce iki kez düşün.'
      ]
    },
    RU: {
      icon: 'who',
      title: 'Пользователи онлайн',
      goal: 'Смотри, у кого ещё сейчас открыт сайт, что выдаёт их IP-адрес, и общайся с ними в чате.',
      steps: [
        'Все, у кого открыт сайт, есть в списке со своим IP-адресом и флагом, включая тебя.',
        'Выбери кого-нибудь, чтобы увидеть, что публичные сервисы знают о его IP: страну и флаг, город, часовой пояс, интернет-провайдера и многое другое.',
        'Пиши в поле чата, чтобы отправить сообщение. Его покажут во всплывающем окне, где бы на сайте человек ни находился.',
        'Нажми [+] Пригласить в игру и выбери игру: ты откроешь в ней комнату, а собеседник получит кнопку «Войти», которая сразу приведёт его туда.',
        'Чат живёт, только пока вы оба здесь: как только кто-то из вас закроет сайт или потеряет связь, он удаляется у обоих.'
      ],
      tips: [
        'Сообщения защищены сквозным шифрованием и нигде не хранятся, даже на ретрансляторе, который их передаёт.',
        'Местоположение по IP приблизительное: обычно это город провайдера, а не точный адрес.',
        'Все здесь видят твой IP-адрес, так что подумай дважды, прежде чем делиться чем-то личным с незнакомцами.'
      ]
    },
    KK: {
      icon: 'who',
      title: 'Онлайн пайдаланушылар',
      goal: 'Сайтты қазір тағы кім ашып отырғанын, олардың IP мекенжайы нені ашып беретінін көр және олармен чаттас.',
      steps: [
        'Сайтты ашып отырған әркім тізімде IP мекенжайымен және туымен көрінеді, сен де.',
        'Жалпыға қолжетімді қызметтер оның IP мекенжайы туралы не білетінін көру үшін біреуді таңда: елі мен туы, қаласы, уақыт белдеуі, интернет провайдері және т.б.',
        'Хабарлама жіберу үшін чат өрісіне жаз. Ол сайттың қай жерінде болса да, қалқымалы хабарлама алады.',
        '[+] Ойынға шақыру түймесін басып, ойын таңда: сен онда бөлме ашасың, ал ол тікелей ойынға кіргізетін «Кіру» түймесін алады.',
        'Чат екеуің де осында болғанда ғана сақталады: біреуің сайтты жапсаң не байланыс үзілсе, ол екі жақта да жойылады.'
      ],
      tips: [
        'Хабарламалар ұштан-ұшқа шифрланған және ешқайда сақталмайды, тіпті оларды жеткізетін ретрансляторда да.',
        'IP бойынша орналасу шамамен ғана: әдетте бұл нақты мекенжай емес, провайдердің қаласы.',
        'Мұндағы әркім сенің IP мекенжайыңды көреді, сондықтан бейтаныс адамдармен жеке ақпарат бөліспес бұрын жақсылап ойлан.'
      ]
    }
  }
}

export const rulesLabels = {
  EN: { goal: 'Goal', howToPlay: 'How to play', tips: 'Tips', gotIt: 'Got it', close: 'Close rules' },
  TR: { goal: 'Amaç', howToPlay: 'Nasıl oynanır', tips: 'İpuçları', gotIt: 'Anladım', close: 'Kuralları kapat' },
  RU: { goal: 'Цель', howToPlay: 'Как играть', tips: 'Советы', gotIt: 'Понятно', close: 'Закрыть правила' },
  KK: { goal: 'Мақсат', howToPlay: 'Қалай ойнау керек', tips: 'Кеңестер', gotIt: 'Түсінікті', close: 'Ережелерді жабу' }
}
