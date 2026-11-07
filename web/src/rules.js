// Help modal content per game, keyed by game id then language.
// `menu` is shown when no game is selected.
export const rules = {
  menu: {
    EN: {
      icon: '>_',
      title: 'How it works',
      goal: 'Pick a game and play right in your browser.',
      steps: [
        'Tap a card to see its details, then press [ Run ].',
        'Press [<] Back to return to the menu.',
        'Press [?] anytime to see the rules.'
      ],
      tips: [
        'Change the language from the menu at the top right.',
        'Keyboard: 1–9 opens a game, Esc goes back.'
      ]
    },
    TR: {
      icon: '>_',
      title: 'Nasıl çalışır?',
      goal: 'Bir oyun seç ve doğrudan tarayıcında oyna.',
      steps: [
        'Ayrıntıları görmek için bir karta dokun, sonra [ Çalıştır ]’a bas.',
        'Menüye dönmek için [<] Geri’ye bas.',
        'Kuralları görmek için istediğin zaman [?] butonuna bas.'
      ],
      tips: [
        'Dili sağ üstteki menüden değiştir.',
        'Klavye: 1–9 bir oyunu açar, Esc geri döner.'
      ]
    },
    RU: {
      icon: '>_',
      title: 'Как это работает',
      goal: 'Выбери игру и играй прямо в браузере.',
      steps: [
        'Нажми на карточку, чтобы увидеть подробности, затем нажми [ Запуск ].',
        'Нажми [<] Назад, чтобы вернуться в меню.',
        'Нажми [?] в любой момент, чтобы увидеть правила.'
      ],
      tips: [
        'Язык меняется в меню справа вверху.',
        'Клавиатура: 1–9 открывает игру, Esc — назад.'
      ]
    },
    KK: {
      icon: '>_',
      title: 'Бұл қалай жұмыс істейді',
      goal: 'Ойын таңда да, тікелей браузерде ойна.',
      steps: [
        'Толығырақ көру үшін картаны түрт, сосын [ Іске қосу ] бас.',
        'Мәзірге оралу үшін [<] Артқа бас.',
        'Ережелерді көру үшін кез келген уақытта [?] бас.'
      ],
      tips: [
        'Тілді оң жақ жоғарғы мәзірден ауыстыр.',
        'Пернетақта: 1–9 ойынды ашады, Esc артқа қайтарады.'
      ]
    }
  },
  flappy: {
    EN: {
      icon: '[^]',
      title: 'Flappy',
      players: '1 player',
      duration: '1–5 min',
      goal: 'Fly the bird through the gaps between the pipes.',
      steps: [
        'Tap, click or press Space to flap. Stop and the bird falls.',
        'Each pipe you pass is a point. Hit a pipe or the ground and it’s over.',
        'It gets faster as you go, and later some gaps move up and down.'
      ],
      tips: [
        'Short, steady taps work best.',
        'P pauses, M turns the sound on or off.'
      ]
    },
    TR: {
      icon: '[^]',
      title: 'Flappy',
      players: 'Tek kişilik',
      duration: '1–5 dk',
      goal: 'Kuşu boruların arasındaki boşluklardan geçir.',
      steps: [
        'Kanat çırpmak için dokun, tıkla ya da Boşluk’a bas. Durursan kuş düşer.',
        'Geçtiğin her boru bir puan. Boruya ya da yere değersen oyun biter.',
        'İlerledikçe hızlanır, sonra bazı boşluklar aşağı yukarı kayar.'
      ],
      tips: [
        'Kısa ve düzenli dokunuşlar en iyisidir.',
        'P duraklatır, M sesi açıp kapatır.'
      ]
    },
    RU: {
      icon: '[^]',
      title: 'Flappy',
      players: '1 игрок',
      duration: '1–5 мин',
      goal: 'Проведи птицу через просветы между трубами.',
      steps: [
        'Коснись экрана, кликни или нажми пробел, чтобы взмахнуть крыльями. Перестанешь — птица упадёт.',
        'Каждая пройденная труба — очко. Задел трубу или землю — конец.',
        'Чем дальше, тем быстрее, а потом некоторые просветы начинают двигаться.'
      ],
      tips: [
        'Лучше всего работают короткие ровные нажатия.',
        'P — пауза, M включает и выключает звук.'
      ]
    },
    KK: {
      icon: '[^]',
      title: 'Flappy',
      players: '1 ойыншы',
      duration: '1–5 мин',
      goal: 'Құсты құбырлар арасындағы саңылаулардан өткіз.',
      steps: [
        'Қанат қағу үшін экранды түрт, шерт не Бос орынды бас. Тоқтасаң, құс құлайды.',
        'Өткен әр құбыр — бір ұпай. Құбырға не жерге тисең, ойын бітеді.',
        'Алға жылжыған сайын жылдамдайды, кейін кейбір саңылаулар жоғары-төмен жылжиды.'
      ],
      tips: [
        'Қысқа әрі бірқалыпты түрту ең жақсы.',
        'P кідіртеді, M дыбысты қосады не өшіреді.'
      ]
    }
  },
  tanks: {
    EN: {
      icon: '[T]',
      title: 'Tank',
      players: '1 player against bots, or 2–8 online',
      duration: '2½ min rounds',
      goal: 'Shoot the other tanks and be the last one standing.',
      steps: [
        'Play alone against bots, or online: one person creates a room and the others join with the code.',
        'Hold anywhere on the screen (or Space) to drive and fire. Let go to stop and turn.',
        'Every tank takes 4 hits. Shoot the gifts for shields, speed and stronger shots.',
        'The last tank wins. If time runs out, the least damaged tank wins.'
      ],
      tips: [
        'Shells bounce off walls once — the dotted line shows where.',
        'Short taps fire without moving far.'
      ]
    },
    TR: {
      icon: '[T]',
      title: 'Tank',
      players: '1 oyuncu botlara karşı ya da çevrim içi 2–8',
      duration: '2,5 dakikalık turlar',
      goal: 'Diğer tankları vur ve ayakta kalan son tank ol.',
      steps: [
        'Botlara karşı tek başına oyna ya da çevrim içi: bir kişi oda oluşturur, diğerleri kodla katılır.',
        'Gidip ateş etmek için ekranın herhangi bir yerine (ya da Boşluk’a) basılı tut. Bırakınca tank durur ve döner.',
        'Her tank 4 isabete dayanır. Kalkan, hız ve güçlü atış için hediyeleri vur.',
        'Son kalan tank kazanır. Süre dolarsa en az hasar alan kazanır.'
      ],
      tips: [
        'Mermiler duvardan bir kez seker — noktalı çizgi nereye gideceğini gösterir.',
        'Kısa dokunuşlar fazla ilerlemeden ateş eder.'
      ]
    },
    RU: {
      icon: '[T]',
      title: 'Tank',
      players: '1 игрок против ботов или 2–8 онлайн',
      duration: 'Раунды по 2½ мин',
      goal: 'Подбей другие танки и останься последним.',
      steps: [
        'Играй один против ботов или онлайн: один создаёт комнату, остальные входят по коду.',
        'Держи палец на экране (или пробел), чтобы ехать и стрелять. Отпусти — танк остановится и повернётся.',
        'Каждый танк выдерживает 4 попадания. Стреляй в подарки: щит, скорость и мощные выстрелы.',
        'Побеждает последний танк. Если время вышло — наименее повреждённый.'
      ],
      tips: [
        'Снаряд один раз отскакивает от стены — пунктир показывает куда.',
        'Короткие нажатия стреляют, почти не сдвигая танк.'
      ]
    },
    KK: {
      icon: '[T]',
      title: 'Tank',
      players: '1 ойыншы боттарға қарсы не онлайн 2–8',
      duration: '2½ минуттық раундтар',
      goal: 'Басқа танктерді атып, соңғы қалған танк бол.',
      steps: [
        'Боттарға қарсы жалғыз ойна не онлайн: бір адам бөлме ашады, қалғандары кодпен кіреді.',
        'Жүріп атуы үшін экранның кез келген жерін (не Бос орынды) басып тұр. Жіберсең, танк тоқтап бұрылады.',
        'Әр танк 4 тигенге шыдайды. Қалқан, жылдамдық және қуатты ату үшін сыйлықтарды ат.',
        'Соңғы қалған танк жеңеді. Уақыт бітсе, ең аз зақымдалған танк жеңеді.'
      ],
      tips: [
        'Снаряд қабырғадан бір рет серпіледі — нүктелі сызық қайда баратынын көрсетеді.',
        'Қысқа басу алысқа жүрмей атады.'
      ]
    }
  },
  futsal: {
    EN: {
      icon: '[o]',
      title: 'Futsal',
      players: '1 player against bots, or 2–10 online',
      duration: '2–5 min matches',
      goal: 'Score more goals than the other team before time runs out.',
      steps: [
        'Play alone with bots, or online: one person creates a room, the others join with the code and pick a team.',
        'Move with the arrow keys or WASD. On a phone, drag on the left half of the screen.',
        'Press Space (or tap the right half) to kick. Hold it as the ball comes to you.',
        'The ball bounces off the walls, so it never goes out. A draw at full time? The next goal wins.'
      ],
      tips: [
        'Your player has a v above it.',
        'M turns the sound on or off, P pauses a solo match.'
      ]
    },
    TR: {
      icon: '[o]',
      title: 'Futsal',
      players: 'Botlara karşı tek kişi ya da çevrim içi 2–10 kişi',
      duration: '2–5 dakikalık maçlar',
      goal: 'Süre bitmeden rakip takımdan daha çok gol at.',
      steps: [
        'Botlarla tek başına oyna ya da çevrim içi: bir kişi oda oluşturur, diğerleri kodla katılıp takım seçer.',
        'Ok tuşları ya da WASD ile hareket et. Telefonda ekranın sol yarısında parmağını sürükle.',
        'Vurmak için Boşluk’a (ya da ekranın sağ yarısına) bas. Top sana gelirken basılı tut.',
        'Top duvarlardan seker, hiç dışarı çıkmaz. Normal süre berabere mi bitti? Sonraki golü atan kazanır.'
      ],
      tips: [
        'Senin oyuncunun üstünde v işareti var.',
        'M sesi açıp kapatır, P tek kişilik maçı duraklatır.'
      ]
    },
    RU: {
      icon: '[o]',
      title: 'Футзал',
      players: '1 игрок против ботов или 2–10 онлайн',
      duration: 'Матчи по 2–5 мин',
      goal: 'Забей больше голов, чем соперники, пока не вышло время.',
      steps: [
        'Играй один с ботами или онлайн: один создаёт комнату, остальные входят по коду и выбирают команду.',
        'Бегай стрелками или WASD. На телефоне веди пальцем по левой половине экрана.',
        'Нажми пробел (или правую половину экрана), чтобы ударить. Держи, пока мяч идёт к тебе.',
        'Мяч отскакивает от бортов и никогда не уходит за поле. Ничья в основное время? Следующий гол побеждает.'
      ],
      tips: [
        'Над твоим игроком стоит v.',
        'M включает и выключает звук, P ставит соло-матч на паузу.'
      ]
    },
    KK: {
      icon: '[o]',
      title: 'Футзал',
      players: 'Боттарға қарсы 1 ойыншы немесе онлайн 2–10',
      duration: '2–5 минуттық матчтар',
      goal: 'Уақыт біткенше қарсылас командадан көп гол соқ.',
      steps: [
        'Боттармен жалғыз ойна не онлайн: бір адам бөлме ашады, қалғандары кодпен кіріп, команда таңдайды.',
        'Бағыт пернелерімен не WASD арқылы жүгір. Телефонда экранның сол жақ жартысында саусағыңды сүйре.',
        'Соғу үшін Бос орынды (не экранның оң жақ жартысын) бас. Доп саған келе жатқанда басып тұр.',
        'Доп қабырғалардан серпіледі, алаңнан ешқашан шықпайды. Негізгі уақыт тең бітті ме? Келесі гол жеңіс әкеледі.'
      ],
      tips: [
        'Сенің ойыншыңның үстінде v тұрады.',
        'M дыбысты қосады не өшіреді, P жеке матчты кідіртеді.'
      ]
    }
  },
  sudoku: {
    EN: {
      icon: '[9]',
      title: 'Sudoku',
      players: '1 player solo, or 2–4 racing online',
      duration: '5–30 min',
      goal: 'Fill the board so each row, column and 3×3 box has the digits 1 to 9 once.',
      steps: [
        'Pick a level, select a cell and tap a number (or type 1–9).',
        'A wrong digit is a mistake. 3 mistakes and the game is over.',
        'Turn on Notes to jot down possible digits. You also get 3 hints.',
        'Online race: everyone plays the same board. Be first with a right digit to get a point; a wrong one loses a point.'
      ],
      tips: [
        'Your game is saved — come back and pick Continue.'
      ]
    },
    TR: {
      icon: '[9]',
      title: 'Sudoku',
      players: 'Tek kişilik ya da çevrim içi 2–4 kişilik yarış',
      duration: '5–30 dk',
      goal: 'Tahtayı her satır, sütun ve 3×3 kutuda 1’den 9’a her rakam bir kez olacak şekilde doldur.',
      steps: [
        'Bir seviye seç, bir kare seç ve bir sayıya dokun (ya da 1–9 yaz).',
        'Yanlış rakam bir hatadır. 3 hatada oyun biter.',
        'Olası rakamları yazmak için Not’u aç. Ayrıca 3 ipucu hakkın var.',
        'Çevrim içi yarış: herkes aynı tahtada oynar. Doğru rakamı ilk koyan puanı alır; yanlış rakam bir puan götürür.'
      ],
      tips: [
        'Oyunun kaydedilir — geri gelip Devam et’i seç.'
      ]
    },
    RU: {
      icon: '[9]',
      title: 'Sudoku',
      players: 'Соло или онлайн-гонка на 2–4 игроков',
      duration: '5–30 мин',
      goal: 'Заполни поле так, чтобы в каждой строке, столбце и квадрате 3×3 цифры от 1 до 9 стояли по одному разу.',
      steps: [
        'Выбери уровень, затем клетку и нажми цифру (или введи 1–9).',
        'Неверная цифра — ошибка. После 3 ошибок игра окончена.',
        'Включи «Заметки», чтобы отмечать возможные цифры. Есть и 3 подсказки.',
        'Онлайн-гонка: все решают одно поле. Первым поставил верную цифру — очко; неверная отнимает очко.'
      ],
      tips: [
        'Игра сохраняется — возвращайся и выбирай «Продолжить».'
      ]
    },
    KK: {
      icon: '[9]',
      title: 'Sudoku',
      players: 'Жеке немесе 2–4 ойыншының онлайн жарысы',
      duration: '5–30 мин',
      goal: 'Тақтаны әр жолда, бағанда және 3×3 шаршыда 1-ден 9-ға дейінгі сандар бір реттен болатындай толтыр.',
      steps: [
        'Деңгей таңда, ұяшықты таңдап, санды бас (не 1–9 жаз).',
        'Қате сан — қате. 3 қатеден кейін ойын бітеді.',
        'Мүмкін сандарды белгілеу үшін «Белгілер» режимін қос. Сондай-ақ 3 кеңес бар.',
        'Онлайн жарыс: бәрі бір тақтада ойнайды. Дұрыс санды бірінші қойған ұпай алады; қате сан бір ұпайды кетіреді.'
      ],
      tips: [
        'Ойының сақталады — оралып, «Жалғастыру» бас.'
      ]
    }
  },
  chess: {
    EN: {
      icon: '[K]',
      title: 'Chess',
      players: '2 players online, others can watch',
      duration: '5–30 min',
      goal: 'Checkmate the other king.',
      steps: [
        'One person creates a room and picks the clock and colour; the opponent joins with the code. Others can watch.',
        'Tap a piece, then the square to move it to, or drag it. Dots show where it can go.',
        'All chess rules apply, including castling and promotion.',
        'The game ends in checkmate, a draw, a resignation or when a clock runs out.'
      ],
      tips: [
        'Use the button under the board to offer a draw.',
        'If your opponent leaves for 30 seconds, you can claim the win.'
      ]
    },
    TR: {
      icon: '[K]',
      title: 'Satranç',
      players: 'Çevrim içi 2 oyuncu, diğerleri izler',
      duration: '5–30 dk',
      goal: 'Rakip şahı mat et.',
      steps: [
        'Bir kişi oda oluşturup süreyi ve rengi seçer; rakibi kodla katılır. Diğerleri izleyebilir.',
        'Bir taşa dokun, sonra gideceği kareye; ya da sürükle. Noktalar gidebileceği yerleri gösterir.',
        'Rok ve terfi dahil satrancın tüm kuralları geçerli.',
        'Oyun mat, beraberlik, terk ya da süre bitince sona erer.'
      ],
      tips: [
        'Beraberlik teklif etmek için tahtanın altındaki düğmeyi kullan.',
        'Rakibin 30 saniye ayrılırsa galibiyeti alabilirsin.'
      ]
    },
    RU: {
      icon: '[K]',
      title: 'Шахматы',
      players: '2 игрока онлайн, остальные смотрят',
      duration: '5–30 мин',
      goal: 'Поставь мат королю соперника.',
      steps: [
        'Один создаёт комнату и выбирает часы и цвет; соперник входит по коду. Остальные могут смотреть.',
        'Нажми на фигуру, затем на клетку, куда она пойдёт, или перетащи её. Точки показывают, куда можно пойти.',
        'Действуют все правила шахмат, включая рокировку и превращение пешки.',
        'Партия заканчивается матом, ничьей, сдачей или когда кончилось время.'
      ],
      tips: [
        'Ничью можно предложить кнопкой под доской.',
        'Если соперник ушёл на 30 секунд, победу можно забрать.'
      ]
    },
    KK: {
      icon: '[K]',
      title: 'Шахмат',
      players: 'Онлайн 2 ойыншы, қалғандары көреді',
      duration: '5–30 мин',
      goal: 'Қарсыластың патшасына мат қой.',
      steps: [
        'Бір адам бөлме ашып, сағат пен түсті таңдайды; қарсыласы кодпен кіреді. Басқалар көре алады.',
        'Фигураны бас, сосын ол баратын шаршыны бас не сүйреп апар. Нүктелер бара алатын жерді көрсетеді.',
        'Рокировка мен пешканың айналуын қоса, шахматтың барлық ережесі қолданылады.',
        'Ойын матпен, тепе-теңдікпен, берілумен не уақыт біткенде аяқталады.'
      ],
      tips: [
        'Тепе-теңдік ұсыну үшін тақтаның астындағы түймені қолдан.',
        'Қарсылас 30 секундқа кетсе, жеңісті ала аласың.'
      ]
    }
  },
  crater: {
    EN: {
      icon: '[~]',
      title: 'Crater Duel',
      players: '1 player against bots, or 2–6 online; others can watch',
      duration: '3–8 min',
      goal: 'Knock out all enemy units before they get yours.',
      steps: [
        'Play alone against bots, or online: one person creates a room and the others join with the code.',
        'Each turn, pick a unit and a weapon, then drag back like a slingshot to aim. Press Fire.',
        'Everyone’s shots fly together. Watch the wind at the top.',
        'Blasts dig craters and throw units. Falling into the sea knocks them out. The last side standing wins the round.',
        'A match is 1, 3, 5 or 10 rounds; the next one starts by itself, and the most rounds won takes the match. Every player keeps one color the whole match.'
      ],
      tips: [
        'Blow up the ground under an enemy and let them fall.'
      ]
    },
    TR: {
      icon: '[~]',
      title: 'Krater Düellosu',
      players: '1 oyuncu botlara karşı ya da çevrim içi 2–6; diğerleri izler',
      duration: '3–8 dk',
      goal: 'Rakip birliklerin hepsini, onlar seninkileri devirmeden devir.',
      steps: [
        'Botlara karşı tek başına oyna ya da çevrim içi: bir kişi oda oluşturur, diğerleri kodla katılır.',
        'Her turda bir birlik ve silah seç, nişan almak için sapan gibi geri çek. Ateş’e bas.',
        'Herkesin atışı birlikte uçar. Üstteki rüzgâra dikkat et.',
        'Patlamalar krater açar ve birlikleri fırlatır. Denize düşen elenir. Ayakta kalan son taraf turu kazanır.',
        'Maç 1, 3, 5 ya da 10 turdur; sonraki tur kendiliğinden başlar, en çok tur kazanan maçı alır. Her oyuncunun rengi maç boyunca aynı kalır.'
      ],
      tips: [
        'Düşmanın altındaki toprağı patlat, düşsün.'
      ]
    },
    RU: {
      icon: '[~]',
      title: 'Дуэль кратеров',
      players: '1 игрок против ботов или 2–6 онлайн; остальные смотрят',
      duration: '3–8 мин',
      goal: 'Выбей всех бойцов противника раньше, чем он выбьет твоих.',
      steps: [
        'Играй один против ботов или онлайн: один создаёт комнату, остальные входят по коду.',
        'Каждый ход выбери бойца и оружие, затем оттяни назад, как рогатку, чтобы прицелиться. Нажми «Огонь».',
        'Выстрелы всех игроков летят одновременно. Следи за ветром сверху.',
        'Взрывы выбивают кратеры и отбрасывают бойцов. Упавший в море выбывает. Раунд выигрывает последняя сторона.',
        'Матч — 1, 3, 5 или 10 раундов; следующий начинается сам, матч берёт тот, кто выиграл больше раундов. Цвет игрока не меняется весь матч.'
      ],
      tips: [
        'Взорви землю под врагом — пусть упадёт.'
      ]
    },
    KK: {
      icon: '[~]',
      title: 'Кратер жекпе-жегі',
      players: '1 ойыншы боттарға қарсы не онлайн 2–6; қалғандары көреді',
      duration: '3–8 мин',
      goal: 'Қарсыластың барлық жауынгерін олар сенікін құлатқанша құлат.',
      steps: [
        'Боттарға қарсы жалғыз ойна не онлайн: бір адам бөлме ашады, қалғандары кодпен кіреді.',
        'Әр жүрісте жауынгер мен қару таңда, көздеу үшін салбырауық сияқты артқа тарт. «Ату» бас.',
        'Барлығының оғы бірге ұшады. Жоғарыдағы желге назар аудар.',
        'Жарылыстар кратер ашып, жауынгерлерді лақтырады. Теңізге түскен шығады. Соңғы қалған жақ раундты жеңеді.',
        'Матч 1, 3, 5 не 10 раунд; келесісі өзі басталады, көп раунд жеңген матчты алады. Әр ойыншының түсі матч бойы өзгермейді.'
      ],
      tips: [
        'Жаудың астындағы жерді жар — құлап кетсін.'
      ]
    }
  },
  dama: {
    EN: {
      icon: '[O]',
      title: 'Dama',
      players: '2 players online, others can watch',
      duration: '10–30 min',
      goal: 'Take all of the other player’s stones, or leave them with no move.',
      steps: [
        'One person creates a room and picks the clock and colour; the other joins with the code. Others can watch.',
        'Stones move one square forward or sideways, never back or diagonally.',
        'Take by jumping over an enemy stone. Taking is a must, and you must take the most stones you can.',
        'A stone that reaches the far row becomes a king and can move any distance.'
      ],
      tips: [
        'Keep your stones together — a lone stone is easy to take.'
      ]
    },
    TR: {
      icon: '[O]',
      title: 'Dama',
      players: 'Çevrim içi 2 oyuncu, diğerleri izler',
      duration: '10–30 dk',
      goal: 'Rakibin bütün taşlarını al ya da onu hamlesiz bırak.',
      steps: [
        'Bir kişi oda oluşturup süreyi ve rengi seçer; diğeri kodla katılır. Diğerleri izleyebilir.',
        'Taşlar bir kare ileri ya da yana gider; geri ve çapraz gidemez.',
        'Rakip taşın üzerinden atlayarak al. Almak zorunludur ve en çok taşı alan yolu seçmelisin.',
        'Karşı sıraya ulaşan taş dama olur ve istediği kadar uzağa gidebilir.'
      ],
      tips: [
        'Taşlarını bir arada tut — yalnız taş kolay alınır.'
      ]
    },
    RU: {
      icon: '[O]',
      title: 'Дама',
      players: '2 игрока онлайн, остальные смотрят',
      duration: '10–30 мин',
      goal: 'Возьми все шашки соперника или оставь его без ходов.',
      steps: [
        'Один создаёт комнату и выбирает часы и цвет; второй входит по коду. Остальные могут смотреть.',
        'Шашки ходят на одну клетку вперёд или вбок, никогда назад и по диагонали.',
        'Бей, перепрыгивая шашку соперника. Бить обязательно, причём так, чтобы взять больше всего шашек.',
        'Шашка, дошедшая до последней горизонтали, становится дамкой и ходит на любое расстояние.'
      ],
      tips: [
        'Держи шашки вместе — одиночную легко взять.'
      ]
    },
    KK: {
      icon: '[O]',
      title: 'Дама',
      players: 'Онлайн 2 ойыншы, қалғандары көреді',
      duration: '10–30 мин',
      goal: 'Қарсыластың барлық тасын ал немесе оны жүріссіз қалдыр.',
      steps: [
        'Бір адам бөлме ашып, сағат пен түсті таңдайды; екіншісі кодпен кіреді. Басқалар көре алады.',
        'Тас бір шаршы алға не жанына жүреді — артқа және диагональ бойымен жүрмейді.',
        'Қарсылас тасынан секіріп ал. Алу міндетті, әрі ең көп тас алатын жолды таңдау керек.',
        'Қарама-қарсы шетке жеткен тас дамка болады және кез келген қашықтыққа жүреді.'
      ],
      tips: [
        'Тастарыңды бірге ұста — жалғыз тасты алу оңай.'
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
  hack: {
    EN: {
      icon: '[%]',
      title: 'Password Hack',
      players: '1 player',
      duration: '3–15 min',
      goal: 'Crack as many passwords as you can before the trace reaches 100%.',
      steps: [
        'Type a word with as many letters as the password and press Enter.',
        'Each letter is marked to show if it’s right (see below).',
        'Every try raises the trace. Cracking a password lowers it.',
        'Scan shows you one letter, but raises the trace.'
      ],
      legend: [
        { color: 'green', text: 'Right letter, right place' },
        { color: 'yellow', text: 'In the password, somewhere else' },
        { color: 'gray', text: 'Not in the password' }
      ],
      tips: [
        'Practice has no trace, so take your time.'
      ]
    },
    TR: {
      icon: '[%]',
      title: 'Şifre Kırıcı',
      players: '1 oyuncu',
      duration: '3–15 dk',
      goal: 'İz %100’e ulaşmadan olabildiğince çok şifre kır.',
      steps: [
        'Şifre kaç harfliyse o kadar harfli bir kelime yaz ve Enter’a bas.',
        'Her harf doğru olup olmadığını gösteren bir işaret alır (aşağıya bak).',
        'Her deneme izi artırır. Şifreyi kırmak izi düşürür.',
        'Tara sana bir harf gösterir, ama izi artırır.'
      ],
      legend: [
        { color: 'green', text: 'Doğru harf, doğru yer' },
        { color: 'yellow', text: 'Şifrede var, başka yerde' },
        { color: 'gray', text: 'Şifrede yok' }
      ],
      tips: [
        'Alıştırmada iz yoktur, acele etme.'
      ]
    },
    RU: {
      icon: '[%]',
      title: 'Взлом пароля',
      players: '1 игрок',
      duration: '3–15 мин',
      goal: 'Взломай как можно больше паролей, пока след не дошёл до 100%.',
      steps: [
        'Набери слово из стольких же букв, сколько в пароле, и нажми Enter.',
        'Каждая буква получает отметку, верна ли она (см. ниже).',
        'Каждая попытка поднимает след. Взломанный пароль его снижает.',
        'Скан открывает одну букву, но поднимает след.'
      ],
      legend: [
        { color: 'green', text: 'Нужная буква на своём месте' },
        { color: 'yellow', text: 'Есть в пароле, но в другом месте' },
        { color: 'gray', text: 'Нет в пароле' }
      ],
      tips: [
        'В тренировке следа нет, так что не спеши.'
      ]
    },
    KK: {
      icon: '[%]',
      title: 'Құпиясөз бұзу',
      players: '1 ойыншы',
      duration: '3–15 мин',
      goal: 'Із 100%-ға жеткенше барынша көп құпиясөз бұз.',
      steps: [
        'Құпиясөзде қанша әріп болса, сонша әріпті сөз жазып, Enter бас.',
        'Әр әріп дұрыс-бұрысын көрсететін белгі алады (төменде қара).',
        'Әр әрекет ізді көтереді. Құпиясөзді бұзу ізді төмендетеді.',
        'Сканер бір әріпті ашады, бірақ ізді көтереді.'
      ],
      legend: [
        { color: 'green', text: 'Дұрыс әріп, өз орнында' },
        { color: 'yellow', text: 'Құпиясөзде бар, басқа орында' },
        { color: 'gray', text: 'Құпиясөзде жоқ' }
      ],
      tips: [
        'Жаттығуда із жоқ, сондықтан асықпа.'
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
      goal: 'Everyone knows the secret word except the spy. Find the spy!',
      steps: [
        'One player creates a room; the others join with the code.',
        'Tap your card to see your role in secret.',
        'Take turns asking questions about the word, then everyone votes.',
        'If the spy is caught, they get one chance to guess the word and win.'
      ],
      tips: [
        'Spy: listen closely and keep your answers short.'
      ]
    },
    TR: {
      icon: '[*]',
      title: 'Casus Kim?',
      players: '3–12 oyuncu, herkes kendi cihazından',
      duration: '5–10 dk',
      goal: 'Casus hariç herkes gizli kelimeyi bilir. Casusu bul!',
      steps: [
        'Bir oyuncu oda oluşturur; diğerleri kodla katılır.',
        'Rolünü gizlice görmek için kartına dokun.',
        'Sırayla kelimeyle ilgili sorular sorun, sonra herkes oy verir.',
        'Casus yakalanırsa kelimeyi tahmin edip kazanmak için bir şansı olur.'
      ],
      tips: [
        'Casus: dikkatle dinle ve kısa cevap ver.'
      ]
    },
    RU: {
      icon: '[*]',
      title: 'Кто шпион?',
      players: '3–12 игроков, у каждого своё устройство',
      duration: '5–10 мин',
      goal: 'Секретное слово знают все, кроме шпиона. Найди шпиона!',
      steps: [
        'Один игрок создаёт комнату; остальные входят по коду.',
        'Нажми на свою карточку, чтобы втайне увидеть роль.',
        'По очереди задавайте вопросы о слове, затем все голосуют.',
        'Если шпиона поймали, у него есть шанс угадать слово и победить.'
      ],
      tips: [
        'Шпиону: слушай внимательно и отвечай коротко.'
      ]
    },
    KK: {
      icon: '[*]',
      title: 'Тыңшы кім?',
      players: '3–12 ойыншы, әркімде өз құрылғысы',
      duration: '5–10 мин',
      goal: 'Тыңшыдан басқаның бәрі құпия сөзді біледі. Тыңшыны тап!',
      steps: [
        'Бір ойыншы бөлме ашады; қалғандары кодпен кіреді.',
        'Рөліңді жасырын көру үшін картаңды түрт.',
        'Кезекпен сөз туралы сұрақ қойыңдар, сосын бәрі дауыс береді.',
        'Тыңшы ұсталса, сөзді тауып жеңуге бір мүмкіндігі бар.'
      ],
      tips: [
        'Тыңшы: мұқият тыңда және қысқа жауап бер.'
      ]
    }
  },
  tabu: {
    EN: {
      icon: '[!]',
      title: 'Tabu',
      players: '2+ players, 2 teams, one device each',
      duration: '60 s per turn',
      goal: 'Get your team to guess words without saying the forbidden ones.',
      steps: [
        'One player creates a room; everyone joins with the code and picks a team.',
        'One player explains the card while their team guesses.',
        'Press Correct for a point or Skip for a new card. The other team presses Taboo! if a forbidden word is said.',
        'Turns last 60 seconds. The team with the most points wins.'
      ],
      tips: [
        'No gestures allowed.'
      ]
    },
    TR: {
      icon: '[!]',
      title: 'Tabu',
      players: '2+ oyuncu, 2 takım, herkes kendi cihazından',
      duration: 'Tur başına 60 sn',
      goal: 'Yasaklı kelimeleri söylemeden takımına kelimeleri bildir.',
      steps: [
        'Bir oyuncu oda oluşturur; herkes kodla katılır ve takım seçer.',
        'Bir oyuncu kartı anlatır, takımı tahmin eder.',
        'Puan için Doğru’ya, yeni kart için Pas’a bas. Yasaklı kelime söylenirse rakip takım Tabu!’ya basar.',
        'Turlar 60 saniye sürer. En çok puanı olan takım kazanır.'
      ],
      tips: [
        'El hareketi yapmak yasak.'
      ]
    },
    RU: {
      icon: '[!]',
      title: 'Табу',
      players: '2+ игроков, 2 команды, у каждого своё устройство',
      duration: '60 с на ход',
      goal: 'Помоги команде угадать слова, не произнося запретных.',
      steps: [
        'Один игрок создаёт комнату; все входят по коду и выбирают команду.',
        'Один игрок объясняет карточку, его команда угадывает.',
        'Нажми «Верно» за очко или «Пропустить» для новой карточки. Если прозвучало запретное слово, другая команда жмёт «Табу!».',
        'Ход длится 60 секунд. Побеждает команда с наибольшим числом очков.'
      ],
      tips: [
        'Жесты запрещены.'
      ]
    },
    KK: {
      icon: '[!]',
      title: 'Табу',
      players: '2+ ойыншы, 2 команда, әркімде өз құрылғысы',
      duration: 'Әр жүріске 60 с',
      goal: 'Тыйым салынған сөздерді айтпай, командаңа сөздерді таптыр.',
      steps: [
        'Бір ойыншы бөлме ашады; барлығы кодпен кіріп, команда таңдайды.',
        'Бір ойыншы картаны түсіндіреді, ал командасы табады.',
        'Ұпай үшін «Дұрыс», жаңа карта үшін «Өткізу» бас. Тыйым салынған сөз айтылса, қарсылас команда «Табу!» басады.',
        'Жүріс 60 секунд созылады. Ең көп ұпай жинаған команда жеңеді.'
      ],
      tips: [
        'Ым-ишараға болмайды.'
      ]
    }
  },
  'quiz-race': {
    EN: {
      icon: '[?]',
      title: 'Quiz Race',
      players: '1–10 players, any devices',
      duration: '5–10 min',
      goal: 'Answer quiz questions right, and faster than everyone else.',
      steps: [
        'One person taps Create room; the others join with the code or link.',
        'Each question has 20 seconds. Tap your answer.',
        'Right answers score points, with a bonus for speed. The highest score wins.'
      ],
      tips: [
        'If the host leaves, the room closes.',
        'Lost connection? Join again in the same tab to get your score back.'
      ]
    },
    TR: {
      icon: '[?]',
      title: 'Bilgi Yarışı',
      players: '1–10 oyuncu, her cihazdan',
      duration: '5–10 dk',
      goal: 'Soruları doğru ve herkesten hızlı cevapla.',
      steps: [
        'Bir kişi Oda oluştur’a basar; diğerleri kodla ya da bağlantıyla katılır.',
        'Her soru için 20 saniye var. Cevabına dokun.',
        'Doğru cevaplar puan getirir, hızlı olana ek puan. En yüksek puan kazanır.'
      ],
      tips: [
        'Sunucu çıkarsa oda kapanır.',
        'Bağlantın mı koptu? Aynı sekmeden tekrar katıl, puanın geri gelir.'
      ]
    },
    RU: {
      icon: '[?]',
      title: 'Викторина',
      players: '1–10 игроков, любые устройства',
      duration: '5–10 мин',
      goal: 'Отвечай на вопросы правильно и быстрее всех.',
      steps: [
        'Один нажимает «Создать комнату»; остальные входят по коду или ссылке.',
        'На каждый вопрос 20 секунд. Нажми на свой ответ.',
        'За правильный ответ — очки и бонус за скорость. Побеждает тот, у кого больше очков.'
      ],
      tips: [
        'Если ведущий уйдёт, комната закроется.',
        'Связь пропала? Войди снова из той же вкладки, и очки вернутся.'
      ]
    },
    KK: {
      icon: '[?]',
      title: 'Білім жарысы',
      players: '1–10 ойыншы, кез келген құрылғы',
      duration: '5–10 мин',
      goal: 'Сұрақтарға дұрыс және бәрінен жылдам жауап бер.',
      steps: [
        'Бір адам «Бөлме ашу» басады; қалғандары кодпен не сілтемемен кіреді.',
        'Әр сұраққа 20 секунд. Жауабыңды бас.',
        'Дұрыс жауап ұпай әкеледі, жылдамдыққа бонус бар. Ең көп ұпай жинаған жеңеді.'
      ],
      tips: [
        'Жүргізуші шықса, бөлме жабылады.',
        'Байланыс үзілді ме? Сол қойындыдан қайта кір, ұпайың қайтады.'
      ]
    }
  },
  doodle: {
    EN: {
      icon: '[/]',
      title: 'Doodle Race',
      players: '2–10 players, one device each',
      duration: '10–20 min',
      goal: 'Draw your word so others can guess it, and guess theirs.',
      steps: [
        'One person creates a room; the others join with the code.',
        'Take turns drawing. The drawer picks an easy, medium or hard word — harder words score more.',
        'Everyone else types guesses in the chat. Faster guesses score more.',
        'After every round is played, the most points wins.'
      ],
      tips: [
        'Everyone sees the word in their own language.'
      ]
    },
    TR: {
      icon: '[/]',
      title: 'Çizim Yarışı',
      players: '2–10 oyuncu, herkes kendi cihazından',
      duration: '10–20 dk',
      goal: 'Kelimeni diğerleri bilsin diye çiz, onlarınkini de bil.',
      steps: [
        'Bir kişi oda oluşturur; diğerleri kodla katılır.',
        'Sırayla çizin. Çizen kolay, orta ya da zor bir kelime seçer — zor kelimeler daha çok puan getirir.',
        'Diğerleri tahminlerini sohbete yazar. Hızlı tahmin daha çok puan getirir.',
        'Bütün turlar bitince en çok puanı olan kazanır.'
      ],
      tips: [
        'Herkes kelimeyi kendi dilinde görür.'
      ]
    },
    RU: {
      icon: '[/]',
      title: 'Рисуй и угадай',
      players: '2–10 игроков, у каждого своё устройство',
      duration: '10–20 мин',
      goal: 'Рисуй так, чтобы другие угадали твоё слово, и угадывай их слова.',
      steps: [
        'Один создаёт комнату; остальные входят по коду.',
        'Рисуйте по очереди. Рисующий выбирает лёгкое, среднее или сложное слово — сложные дают больше очков.',
        'Остальные пишут догадки в чат. Чем быстрее, тем больше очков.',
        'После всех раундов побеждает тот, у кого больше очков.'
      ],
      tips: [
        'Каждый видит слово на своём языке.'
      ]
    },
    KK: {
      icon: '[/]',
      title: 'Сал да тап',
      players: '2–10 ойыншы, әркімде өз құрылғысы',
      duration: '10–20 мин',
      goal: 'Басқалар табатындай сөзіңді сал, олардың сөзін де тап.',
      steps: [
        'Бір адам бөлме ашады; қалғандары кодпен кіреді.',
        'Кезекпен салыңдар. Суретші оңай, орташа не қиын сөз таңдайды — қиын сөз көбірек ұпай әкеледі.',
        'Қалғандары болжамдарын чатқа жазады. Тез болжам көбірек ұпай әкеледі.',
        'Барлық раунд біткенде ең көп ұпай жинаған жеңеді.'
      ],
      tips: [
        'Әркім сөзді өз тілінде көреді.'
      ]
    }
  },
  world: {
    EN: {
      icon: '3D',
      title: 'Sunny Square',
      players: 'Up to 30 per plaza, one device each',
      duration: 'As long as you like',
      goal: 'Hang out with others in a 3D town, earn coins and decorate your home.',
      steps: [
        'Create an account and design your avatar.',
        'Walk with WASD or the arrow keys, or click where you want to go. Drag to turn the camera.',
        'Press Enter to chat. Keys 1–4 wave, dance, sit and laugh.',
        'Earn coins as you play and spend them in the shop. Press Home to decorate your room.'
      ],
      tips: [
        'Click someone to add them as a friend and visit each other’s homes.'
      ]
    },
    TR: {
      icon: '3D',
      title: 'Güneşli Meydan',
      players: 'Meydan başına 30 kişiye kadar, herkes kendi cihazından',
      duration: 'İstediğin kadar',
      goal: '3B bir kasabada başkalarıyla takıl, jeton kazan ve evini döşe.',
      steps: [
        'Hesap aç ve avatarını tasarla.',
        'WASD ya da ok tuşlarıyla yürü veya gitmek istediğin yere tıkla. Kamerayı çevirmek için sürükle.',
        'Sohbet için Enter’a bas. 1–4 tuşlarıyla el salla, dans et, otur ve gül.',
        'Oynadıkça jeton kazan ve mağazada harca. Odanı döşemek için Ev’e bas.'
      ],
      tips: [
        'Arkadaş eklemek ve birbirinizin evini ziyaret etmek için birine tıkla.'
      ]
    },
    RU: {
      icon: '3D',
      title: 'Солнечная площадь',
      players: 'До 30 человек на площади, у каждого своё устройство',
      duration: 'Сколько захочешь',
      goal: 'Общайся с другими в 3D-городе, зарабатывай монеты и обставь свой дом.',
      steps: [
        'Заведи аккаунт и создай аватара.',
        'Ходи клавишами WASD или стрелками либо кликни, куда идти. Перетаскивай, чтобы повернуть камеру.',
        'Нажми Enter, чтобы писать в чат. Клавиши 1–4: помахать, танцевать, сесть и смеяться.',
        'Зарабатывай монеты в игре и трать их в магазине. Нажми «Дом», чтобы обставить комнату.'
      ],
      tips: [
        'Кликни по игроку, чтобы добавить его в друзья и ходить друг к другу в гости.'
      ]
    },
    KK: {
      icon: '3D',
      title: 'Шуақты алаң',
      players: 'Бір алаңда 30 адамға дейін, әркімде өз құрылғысы',
      duration: 'Қалағаныңша',
      goal: '3D қалада басқалармен уақыт өткіз, тиын тап және үйіңді жабдықта.',
      steps: [
        'Аккаунт ашып, аватарыңды жаса.',
        'WASD не көрсеткі пернелерімен жүр, не баратын жерді шерт. Камераны бұру үшін сүйре.',
        'Чатқа жазу үшін Enter бас. 1–4 пернелері: қол бұлғау, билеу, отыру және күлу.',
        'Ойнап тиын тап та, дүкенде жұмса. Бөлмеңді жабдықтау үшін «Үй» бас.'
      ],
      tips: [
        'Досыңа қосу және бір-біріңнің үйіңе бару үшін ойыншыны шерт.'
      ]
    }
  },
  blackjack: {
    EN: {
      icon: '[21]',
      title: 'Blackjack',
      players: '1 player against the dealer, or up to 5 at a table',
      duration: 'About a minute a hand',
      goal: 'Get closer to 21 than the dealer without going over.',
      steps: [
        'Play alone, or online at one table with up to 5 players. You start with $100,000 in chips.',
        'Place your bet and press Deal.',
        'Hit takes a card, Stand keeps your total, Double doubles your bet for one more card, and Split turns a pair into two hands.',
        'Over 21 loses. Beat the dealer to win your bet; a Blackjack pays 3 to 2.',
        'Side bets, if you like: Perfect Pairs pays up to 25 to 1 when your first two cards are a pair, and 21+3 up to 100 to 1 when they make a poker hand with the dealer’s up card.'
      ],
      tips: [
        'J, Q and K count as 10; an Ace counts as 1 or 11.',
        'Out of chips? Get $100,000 more from the lobby or the table.',
        'Send emotes, order drinks, smokes or food from the bar, or buy someone at the table (or the dealer) a gift. Tap a name to send them one.',
        'The table chat (T) shows who won what, and lets you talk to the others at the table.',
        '[FULL] gives the table the whole screen.'
      ]
    },
    TR: {
      icon: '[21]',
      title: 'Blackjack',
      players: 'Krupiyeye karşı 1 oyuncu ya da bir masada en fazla 5',
      duration: 'El başına yaklaşık bir dakika',
      goal: 'Krupiyeden 21’e daha yakın ol, ama 21’i geçme.',
      steps: [
        'Tek başına ya da çevrim içi, en fazla 5 kişilik bir masada oyna. 100.000 $’lık fişle başlarsın.',
        'Bahsini koy ve Dağıt’a bas.',
        'Kart bir kart alır, Dur toplamını korur, İkiye katla bahsi ikiye katlayıp bir kart daha verir, Böl bir çifti iki ele ayırır.',
        '21’i geçen kaybeder. Krupiyeyi geçersen bahsin kadar kazanırsın; Blackjack 3’e 2 öder.',
        'İstersen yan bahis de koy: ilk iki kartın çift olursa Mükemmel Çiftler 25’e 1’e kadar, krupiyenin açık kartıyla poker eli yaparsa 21+3 100’e 1’e kadar öder.'
      ],
      tips: [
        'J, Q ve K 10 sayılır; As 1 ya da 11 sayılır.',
        'Fişin mi bitti? Lobiden ya da masadan 100.000 $ daha al.',
        'İfade gönder, bardan içecek, sigara, nargile ya da yemek sipariş et; masadaki birine (ya da krupiyeye) hediye al. Birine göndermek için adına dokun.',
        'Masa sohbetinde (T) kimin ne kazandığı görünür, masadakilerle konuşabilirsin.',
        '[FULL] masayı tam ekran yapar.'
      ]
    },
    RU: {
      icon: '[21]',
      title: 'Блэкджек',
      players: '1 игрок против дилера или до 5 за столом',
      duration: 'Около минуты на раздачу',
      goal: 'Набери ближе к 21, чем дилер, но не больше 21.',
      steps: [
        'Играй один или онлайн за одним столом, до 5 игроков. На старте у тебя фишки на $100 000.',
        'Сделай ставку и нажми «Раздать».',
        '«Ещё» — взять карту, «Хватит» — остановиться, «Удвоить» — удвоить ставку и взять одну карту, «Разделить» — разбить пару на две руки.',
        'Больше 21 — проигрыш. Обыграл дилера — выиграл ставку; блэкджек платит 3 к 2.',
        'По желанию — доп. ставки: «Идеальные пары» платят до 25 к 1, если две первые карты — пара, а 21+3 — до 100 к 1, если они с открытой картой дилера дают покерную комбинацию.'
      ],
      tips: [
        'J, Q и K стоят по 10, туз — 1 или 11.',
        'Кончились фишки? Возьми ещё $100 000 в лобби или за столом.',
        'Отправляй эмоции, заказывай в баре напитки, сигареты, кальян или еду, дари подарки игрокам за столом или дилеру. Нажми на имя, чтобы сделать подарок.',
        'В чате стола (T) видно, кто сколько выиграл, и можно поговорить с соседями.',
        '[FULL] — стол на весь экран.'
      ]
    },
    KK: {
      icon: '[21]',
      title: 'Блэкджек',
      players: 'Дилерге қарсы 1 ойыншы не бір үстелде 5-ке дейін',
      duration: 'Бір үлестіруге шамамен бір минут',
      goal: 'Дилерден гөрі 21-ге жақынырақ жина, бірақ 21-ден асырма.',
      steps: [
        'Жалғыз не онлайн, 5 ойыншыға дейінгі бір үстелде ойна. 100 000 $ фишкамен бастайсың.',
        'Бәс тігіп, «Үлестіру» бас.',
        '«Тағы» карта алады, «Жетеді» тоқтайды, «Екі есе» бәсті екі есе арттырып бір карта береді, «Бөлу» жұпты екі қолға бөледі.',
        '21-ден асса, ұтыласың. Дилерді ұтсаң, бәсіңдей ұтасың; блэкджек 3-ке 2 төлейді.',
        'Қаласаң, қосымша бәс қой: алғашқы екі картаң жұп болса, «Мінсіз жұптар» 25-ке 1-ге дейін, дилердің ашық картасымен покер комбинациясы шықса, 21+3 100-ге 1-ге дейін төлейді.'
      ],
      tips: [
        'J, Q және K — 10, тұз — 1 не 11.',
        'Фишка таусылды ма? Лоббиден не үстелден тағы 100 000 $ ал.',
        'Эмоция жібер, бардан сусын, темекі, кальян не тағам тапсырыс бер, үстелдегілерге не дилерге сыйлық ал. Сыйлық жіберу үшін есімін бас.',
        'Үстел чатында (T) кімнің не ұтқаны көрінеді, үстелдегілермен сөйлесуге болады.',
        '[FULL] үстелді толық экранға шығарады.'
      ]
    }
  },
  race: {
    EN: {
      icon: '[>]',
      title: 'Neon Laps',
      players: '1 player against bots, or up to 6 online',
      duration: '2–5 min',
      goal: 'Be first over the line after the last lap.',
      steps: [
        'Race alone against bots, or online: one person creates a room and the others join with the code.',
        'The car drives itself: steer with left and right (or A and D). On a phone, hold the arrows on screen. Turning slows the car down.',
        'Turn hard at speed and the car drifts round the bend. Steer the other way to straighten up.',
        'Pickups turn up anywhere on the track: a boost (longer the further back you are), a shield, or a shell to fire with Space. A shell bounces off walls and spins out the car it hits.'
      ],
      tips: [
        'Every checkpoint counts, in order, so there are no shortcuts. The map in the corner shows everyone.',
        'Your best lap on each track is saved on this device.'
      ]
    },
    TR: {
      icon: '[>]',
      title: 'Neon Turlar',
      players: 'Botlara karşı 1 oyuncu ya da çevrim içi 6 kişiye kadar',
      duration: '2–5 dk',
      goal: 'Son turdan sonra çizgiyi ilk sen geç.',
      steps: [
        'Botlara karşı tek başına yarış ya da çevrim içi: bir kişi oda oluşturur, diğerleri kodla katılır.',
        'Araba kendi gider: sağ ve sol (ya da A ve D) ile yön ver. Telefonda ekrandaki oklara bas. Dönmek arabayı yavaşlatır.',
        'Hızlıyken sert dönersen araba virajda drift atar. Düzelmek için ters yöne çevir.',
        'Hediyeler pistin her yerinde çıkar: hız (ne kadar gerideysen o kadar uzun), kalkan ya da Boşluk ile atılan bir mermi. Mermi duvarlardan seker ve vurduğu arabayı döndürür.'
      ],
      tips: [
        'Her kontrol noktası sırayla sayılır, yani kestirme yok. Köşedeki harita herkesi gösterir.',
        'Her pistteki en iyi turun bu cihazda saklanır.'
      ]
    },
    RU: {
      icon: '[>]',
      title: 'Неоновые гонки',
      players: '1 игрок против ботов или до 6 онлайн',
      duration: '2–5 мин',
      goal: 'Первым пересеки черту после последнего круга.',
      steps: [
        'Гоняй один против ботов или онлайн: один создаёт комнату, остальные входят по коду.',
        'Машина едет сама: рули влево и вправо (или A и D). На телефоне жми стрелки на экране. В повороте машина замедляется.',
        'Резко поверни на скорости — и машина пойдёт в занос по повороту. Поверни руль обратно, чтобы выровняться.',
        'Бонусы появляются по всей трассе: ускорение (чем дальше позади, тем дольше), щит или снаряд, который выпускается пробелом. Снаряд отскакивает от стен и закручивает машину, в которую попадёт.'
      ],
      tips: [
        'Контрольные точки засчитываются только по порядку, так что срезать не выйдет. Карта в углу показывает всех.',
        'Твой лучший круг на каждой трассе сохраняется на этом устройстве.'
      ]
    },
    KK: {
      icon: '[>]',
      title: 'Неон жарыс',
      players: 'Боттарға қарсы 1 ойыншы не онлайн 6-ға дейін',
      duration: '2–5 мин',
      goal: 'Соңғы айналымнан кейін мәре сызығынан бірінші өт.',
      steps: [
        'Боттарға қарсы жалғыз жарыс не онлайн: бір адам бөлме ашады, қалғандары кодпен кіреді.',
        'Көлік өзі жүреді: солға және оңға (не A және D) бұр. Телефонда экрандағы көрсеткілерді бас. Бұрылыс көлікті баяулатады.',
        'Жылдам келе жатып қатты бұрылсаң, көлік бұрылыста дрифтке түседі. Түзелу үшін рульді кері бұр.',
        'Сыйлықтар трассаның кез келген жерінде шығады: үдеу (неғұрлым артта болсаң, соғұрлым ұзақ), қалқан не Бос орынмен атылатын снаряд. Снаряд қабырғадан серпіліп, тиген көлікті айналдырып жібереді.'
      ],
      tips: [
        'Әр бақылау нүктесі ретімен саналады, сондықтан төте жол жоқ. Бұрыштағы карта бәрін көрсетеді.',
        'Әр трассадағы ең жақсы айналымың осы құрылғыда сақталады.'
      ]
    }
  },
  users: {
    EN: {
      icon: 'who',
      title: 'Online users',
      goal: 'See who’s on the site right now, chat with them and play together.',
      steps: [
        'Everyone on the site is listed with their name and what they’re doing.',
        'Pick yourself to change your name, face and profile.',
        'Pick someone to see their profile and medals, and to chat.',
        'Press [+] Invite to a game to play together, or Join their lobby.'
      ],
      tips: [
        'Chats are private and disappear when either of you leaves.',
        'Medals are saved in this browser only.'
      ]
    },
    TR: {
      icon: 'who',
      title: 'Çevrim içi kullanıcılar',
      goal: 'Sitede şu an kimlerin olduğunu gör, sohbet et ve birlikte oyna.',
      steps: [
        'Sitedeki herkes adıyla ve ne yaptığıyla listelenir.',
        'Adını, yüzünü ve profilini değiştirmek için kendini seç.',
        'Profilini ve madalyalarını görmek, sohbet etmek için birini seç.',
        'Birlikte oynamak için [+] Oyuna davet et’e bas ya da lobisine katıl.'
      ],
      tips: [
        'Sohbetler özeldir ve biriniz ayrılınca silinir.',
        'Madalyalar yalnızca bu tarayıcıda saklanır.'
      ]
    },
    RU: {
      icon: 'who',
      title: 'Пользователи онлайн',
      goal: 'Смотри, кто сейчас на сайте, общайся и играйте вместе.',
      steps: [
        'Все, кто на сайте, видны в списке с именем и тем, чем заняты.',
        'Выбери себя, чтобы сменить имя, лицо и профиль.',
        'Выбери кого-нибудь, чтобы увидеть профиль и медали и написать ему.',
        'Нажми [+] Пригласить в игру, чтобы сыграть вместе, или войди в его лобби.'
      ],
      tips: [
        'Чаты приватные и удаляются, когда кто-то из вас уходит.',
        'Медали хранятся только в этом браузере.'
      ]
    },
    KK: {
      icon: 'who',
      title: 'Онлайн пайдаланушылар',
      goal: 'Сайтта қазір кім барын көр, чаттас және бірге ойна.',
      steps: [
        'Сайттағы әркім атымен және не істеп жатқанымен тізімде көрінеді.',
        'Атыңды, бетіңді және профиліңді өзгерту үшін өзіңді таңда.',
        'Профилі мен медальдарын көру және чаттасу үшін біреуді таңда.',
        'Бірге ойнау үшін [+] Ойынға шақыру бас немесе оның лоббиіне кір.'
      ],
      tips: [
        'Чаттар жеке және біреуің шыққанда өшеді.',
        'Медальдар тек осы браузерде сақталады.'
      ]
    }
  },
  lobby: {
    EN: {
      icon: '[#]',
      title: 'Lobbies',
      goal: 'Find a lobby to join, or open your own and play game after game together.',
      steps: [
        'All open lobbies are listed. Press one to see who’s inside, then Join.',
        'You can also join with a code or by scanning the QR code.',
        'The host can press Change game anytime — everyone stays in the lobby.',
        'The [~] button at the top takes you back to your lobby. Leave takes you out.'
      ],
      tips: [
        'A lobby lasts one hour, and closes if the host leaves.'
      ]
    },
    TR: {
      icon: '[#]',
      title: 'Lobiler',
      goal: 'Katılacak bir lobi bul ya da kendi lobini aç ve oyun oyun birlikte oynayın.',
      steps: [
        'Açık lobilerin hepsi listelenir. İçinde kimler olduğunu görmek için birine bas, sonra Katıl.',
        'Kodla ya da QR kodu okutarak da katılabilirsin.',
        'Sunucu istediği an Oyunu değiştir’e basabilir — herkes lobide kalır.',
        'Üstteki [~] butonu seni lobine geri götürür. Ayrıl seni lobiden çıkarır.'
      ],
      tips: [
        'Lobi bir saat sürer ve sunucu ayrılırsa kapanır.'
      ]
    },
    RU: {
      icon: '[#]',
      title: 'Лобби',
      goal: 'Найди лобби или открой своё и играйте вместе игру за игрой.',
      steps: [
        'Здесь видны все открытые лобби. Нажми на лобби, чтобы увидеть, кто внутри, и войди.',
        'Войти можно и по коду или по QR-коду.',
        'Ведущий может в любой момент нажать «Сменить игру» — все останутся в лобби.',
        'Кнопка [~] сверху вернёт тебя в лобби. «Выйти» выводит из него.'
      ],
      tips: [
        'Лобби живёт час и закрывается, если ведущий уходит.'
      ]
    },
    KK: {
      icon: '[#]',
      title: 'Лоббилер',
      goal: 'Кіретін лобби тап немесе өзіңдікін ашып, ойыннан ойынға бірге ойнаңдар.',
      steps: [
        'Барлық ашық лобби тізімде. Ішінде кім барын көру үшін біреуін бас, сосын Кіру.',
        'Кодпен не QR кодын оқытып та кіруге болады.',
        'Жүргізуші кез келген уақытта «Ойынды ауыстыру» баса алады — бәрі лоббиде қалады.',
        'Жоғарыдағы [~] түймесі лоббиіңе қайтарады. «Шығу» лоббиден шығарады.'
      ],
      tips: [
        'Лобби бір сағат тұрады, ал жүргізуші шықса, жабылады.'
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
