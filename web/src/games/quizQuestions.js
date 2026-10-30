// Trivia bank for the online quiz race, in every site language.
// In every entry the first answer is the correct one; the game shuffles the order.
// Devices only exchange question indexes, so each player sees their own language.
//
// Every question has a level, as on a quiz show's prize ladder: 1 is something nearly everyone
// knows, 2 and 3 take general knowledge, 4 takes real knowledge and 5 is for the top prize.
// Topics: geo, science, space, nature, history, art, music, literature, language, math, tech,
// sport and food. New questions go at the end, so the indexes of the others don't change.
export const quizQuestions = [
  {
    level: 2, topic: 'geo',
    EN: { q: 'What is the capital of Australia?', a: ['Canberra', 'Sydney', 'Melbourne', 'Perth'] },
    TR: { q: 'Avustralya’nın başkenti neresidir?', a: ['Canberra', 'Sidney', 'Melbourne', 'Perth'] },
    RU: { q: 'Какой город — столица Австралии?', a: ['Канберра', 'Сидней', 'Мельбурн', 'Перт'] },
    KK: { q: 'Австралияның астанасы қай қала?', a: ['Канберра', 'Сидней', 'Мельбурн', 'Перт'] }
  },
  {
    level: 1, topic: 'space',
    EN: { q: 'Which planet is known as the Red Planet?', a: ['Mars', 'Venus', 'Jupiter', 'Mercury'] },
    TR: { q: 'Hangi gezegen Kızıl Gezegen olarak bilinir?', a: ['Mars', 'Venüs', 'Jüpiter', 'Merkür'] },
    RU: { q: 'Какую планету называют Красной планетой?', a: ['Марс', 'Венера', 'Юпитер', 'Меркурий'] },
    KK: { q: 'Қай планетаны Қызыл планета деп атайды?', a: ['Марс', 'Шолпан', 'Юпитер', 'Меркурий'] }
  },
  {
    level: 1, topic: 'geo',
    EN: { q: 'How many continents are there?', a: ['7', '5', '6', '8'] },
    TR: { q: 'Dünyada kaç kıta vardır?', a: ['7', '5', '6', '8'] },
    // Russian and Kazakh schools count six continents, so there the right answer is 6
    RU: { q: 'Сколько на Земле материков?', a: ['6', '5', '7', '8'] },
    KK: { q: 'Жер бетінде неше құрлық бар?', a: ['6', '5', '7', '8'] }
  },
  {
    level: 1, topic: 'art',
    EN: { q: 'Who painted the Mona Lisa?', a: ['Leonardo da Vinci', 'Michelangelo', 'Raphael', 'Vincent van Gogh'] },
    TR: { q: 'Mona Lisa tablosunu kim yaptı?', a: ['Leonardo da Vinci', 'Michelangelo', 'Raffaello', 'Vincent van Gogh'] },
    RU: { q: 'Кто написал «Мону Лизу»?', a: ['Леонардо да Винчи', 'Микеланджело', 'Рафаэль', 'Винсент Ван Гог'] },
    KK: { q: '«Мона Лизаны» кім салған?', a: ['Леонардо да Винчи', 'Микеланджело', 'Рафаэль', 'Винсент Ван Гог'] }
  },
  {
    level: 1, topic: 'geo',
    EN: { q: 'What is the largest ocean on Earth?', a: ['Pacific Ocean', 'Atlantic Ocean', 'Indian Ocean', 'Arctic Ocean'] },
    TR: { q: 'Dünyanın en büyük okyanusu hangisidir?', a: ['Büyük Okyanus (Pasifik)', 'Atlas Okyanusu', 'Hint Okyanusu', 'Arktik Okyanusu'] },
    RU: { q: 'Какой океан самый большой на Земле?', a: ['Тихий океан', 'Атлантический океан', 'Индийский океан', 'Северный Ледовитый океан'] },
    KK: { q: 'Жердегі ең үлкен мұхит қайсы?', a: ['Тынық мұхит', 'Атлант мұхиты', 'Үнді мұхиты', 'Солтүстік Мұзды мұхит'] }
  },
  {
    level: 2, topic: 'science',
    EN: { q: 'What is the chemical symbol for gold?', a: ['Au', 'Ag', 'Go', 'Gd'] },
    TR: { q: 'Altının kimyasal sembolü nedir?', a: ['Au', 'Ag', 'Go', 'Gd'] },
    RU: { q: 'Какой химический символ у золота?', a: ['Au', 'Ag', 'Go', 'Gd'] },
    KK: { q: 'Алтынның химиялық таңбасы қандай?', a: ['Au', 'Ag', 'Go', 'Gd'] }
  },
  {
    level: 2, topic: 'history',
    EN: { q: 'In which year did the Ottomans conquer Istanbul (Constantinople)?', a: ['1453', '1071', '1299', '1517'] },
    TR: { q: 'İstanbul hangi yılda fethedildi?', a: ['1453', '1071', '1299', '1517'] },
    RU: { q: 'В каком году османы завоевали Стамбул (Константинополь)?', a: ['1453', '1071', '1299', '1517'] },
    KK: { q: 'Османдар Ыстамбұлды (Константинопольді) қай жылы жаулап алды?', a: ['1453', '1071', '1299', '1517'] }
  },
  {
    level: 2, topic: 'science',
    EN: { q: 'What is the hardest natural substance?', a: ['Diamond', 'Iron', 'Granite', 'Quartz'] },
    TR: { q: 'Doğadaki en sert madde hangisidir?', a: ['Elmas', 'Demir', 'Granit', 'Kuvars'] },
    RU: { q: 'Какое природное вещество самое твёрдое?', a: ['Алмаз', 'Железо', 'Гранит', 'Кварц'] },
    KK: { q: 'Табиғаттағы ең қатты зат қайсы?', a: ['Алмас', 'Темір', 'Гранит', 'Кварц'] }
  },
  {
    level: 1, topic: 'nature',
    EN: { q: 'How many legs does a spider have?', a: ['8', '6', '10', '12'] },
    TR: { q: 'Bir örümceğin kaç bacağı vardır?', a: ['8', '6', '10', '12'] },
    RU: { q: 'Сколько ног у паука?', a: ['8', '6', '10', '12'] },
    KK: { q: 'Өрмекшінің неше аяғы бар?', a: ['8', '6', '10', '12'] }
  },
  {
    level: 2, topic: 'geo',
    EN: { q: 'Which is the longest river in the world?', a: ['Nile', 'Amazon', 'Yangtze', 'Mississippi'] },
    TR: { q: 'Dünyanın en uzun nehri hangisidir?', a: ['Nil', 'Amazon', 'Yangtze', 'Mississippi'] },
    RU: { q: 'Какая река самая длинная в мире?', a: ['Нил', 'Амазонка', 'Янцзы', 'Миссисипи'] },
    KK: { q: 'Әлемдегі ең ұзын өзен қайсы?', a: ['Ніл', 'Амазонка', 'Янцзы', 'Миссисипи'] }
  },
  {
    level: 1, topic: 'science',
    EN: { q: 'What gas do plants absorb from the air?', a: ['Carbon dioxide', 'Oxygen', 'Nitrogen', 'Helium'] },
    TR: { q: 'Bitkiler havadan hangi gazı alır?', a: ['Karbondioksit', 'Oksijen', 'Azot', 'Helyum'] },
    RU: { q: 'Какой газ растения поглощают из воздуха?', a: ['Углекислый газ', 'Кислород', 'Азот', 'Гелий'] },
    KK: { q: 'Өсімдіктер ауадан қандай газды сіңіреді?', a: ['Көмірқышқыл газы', 'Оттегі', 'Азот', 'Гелий'] }
  },
  {
    level: 1, topic: 'literature',
    EN: { q: 'Who wrote "Romeo and Juliet"?', a: ['William Shakespeare', 'Charles Dickens', 'Jane Austen', 'Mark Twain'] },
    TR: { q: '"Romeo ve Juliet"i kim yazdı?', a: ['William Shakespeare', 'Charles Dickens', 'Jane Austen', 'Mark Twain'] },
    RU: { q: 'Кто написал «Ромео и Джульетту»?', a: ['Уильям Шекспир', 'Чарльз Диккенс', 'Джейн Остин', 'Марк Твен'] },
    KK: { q: '«Ромео мен Джульеттаны» кім жазған?', a: ['Уильям Шекспир', 'Чарльз Диккенс', 'Джейн Остин', 'Марк Твен'] }
  },
  {
    level: 3, topic: 'math',
    EN: { q: 'What is the smallest prime number?', a: ['2', '1', '3', '0'] },
    TR: { q: 'En küçük asal sayı kaçtır?', a: ['2', '1', '3', '0'] },
    RU: { q: 'Какое самое маленькое простое число?', a: ['2', '1', '3', '0'] },
    KK: { q: 'Ең кіші жай сан қандай?', a: ['2', '1', '3', '0'] }
  },
  {
    level: 1, topic: 'nature',
    EN: { q: 'Which country is home to the kangaroo?', a: ['Australia', 'South Africa', 'Brazil', 'India'] },
    TR: { q: 'Kanguru hangi ülkeye özgüdür?', a: ['Avustralya', 'Güney Afrika', 'Brezilya', 'Hindistan'] },
    RU: { q: 'В какой стране водятся кенгуру?', a: ['Австралия', 'ЮАР', 'Бразилия', 'Индия'] },
    KK: { q: 'Кенгуру қай елде мекендейді?', a: ['Австралия', 'Оңтүстік Африка', 'Бразилия', 'Үндістан'] }
  },
  {
    level: 2, topic: 'math',
    EN: { q: 'How many minutes are in a full day?', a: ['1440', '1200', '1600', '960'] },
    TR: { q: 'Bir günde kaç dakika vardır?', a: ['1440', '1200', '1600', '960'] },
    RU: { q: 'Сколько минут в сутках?', a: ['1440', '1200', '1600', '960'] },
    KK: { q: 'Бір тәулікте неше минут бар?', a: ['1440', '1200', '1600', '960'] }
  },
  {
    level: 1, topic: 'space',
    EN: { q: 'What is the largest planet in our solar system?', a: ['Jupiter', 'Saturn', 'Neptune', 'Earth'] },
    TR: { q: 'Güneş sistemimizin en büyük gezegeni hangisidir?', a: ['Jüpiter', 'Satürn', 'Neptün', 'Dünya'] },
    RU: { q: 'Какая планета самая большая в Солнечной системе?', a: ['Юпитер', 'Сатурн', 'Нептун', 'Земля'] },
    KK: { q: 'Күн жүйесіндегі ең үлкен планета қайсы?', a: ['Юпитер', 'Сатурн', 'Нептун', 'Жер'] }
  },
  {
    level: 3, topic: 'language',
    EN: { q: 'Which language has the most native speakers?', a: ['Mandarin Chinese', 'English', 'Spanish', 'Hindi'] },
    TR: { q: 'En çok anadil konuşanı olan dil hangisidir?', a: ['Mandarin Çincesi', 'İngilizce', 'İspanyolca', 'Hintçe'] },
    RU: { q: 'У какого языка больше всего носителей?', a: ['Китайский (мандаринский)', 'Английский', 'Испанский', 'Хинди'] },
    KK: { q: 'Қай тілді ана тілі деп санайтындар ең көп?', a: ['Қытай тілі (мандарин)', 'Ағылшын тілі', 'Испан тілі', 'Хинди'] }
  },
  {
    level: 1, topic: 'science',
    EN: { q: 'What is the boiling point of water at sea level?', a: ['100 °C', '90 °C', '80 °C', '120 °C'] },
    TR: { q: 'Deniz seviyesinde suyun kaynama noktası kaçtır?', a: ['100 °C', '90 °C', '80 °C', '120 °C'] },
    RU: { q: 'При какой температуре кипит вода на уровне моря?', a: ['100 °C', '90 °C', '80 °C', '120 °C'] },
    KK: { q: 'Теңіз деңгейінде су неше градуста қайнайды?', a: ['100 °C', '90 °C', '80 °C', '120 °C'] }
  },
  {
    level: 1, topic: 'history',
    EN: { q: 'Who was the founder of the Republic of Turkey?', a: ['Mustafa Kemal Atatürk', 'İsmet İnönü', 'Celal Bayar', 'Kazım Karabekir'] },
    TR: { q: 'Türkiye Cumhuriyeti’nin kurucusu kimdir?', a: ['Mustafa Kemal Atatürk', 'İsmet İnönü', 'Celal Bayar', 'Kazım Karabekir'] },
    RU: { q: 'Кто основал Турецкую Республику?', a: ['Мустафа Кемаль Ататюрк', 'Исмет Инёню', 'Джеляль Баяр', 'Кязым Карабекир'] },
    KK: { q: 'Түркия Республикасының негізін кім қалады?', a: ['Мұстафа Кемал Ататүрік', 'Исмет Инөню', 'Джелал Баяр', 'Кязым Карабекир'] }
  },
  {
    level: 1, topic: 'science',
    EN: { q: 'Which organ pumps blood through the body?', a: ['Heart', 'Lungs', 'Liver', 'Kidneys'] },
    TR: { q: 'Kanı vücuda pompalayan organ hangisidir?', a: ['Kalp', 'Akciğerler', 'Karaciğer', 'Böbrekler'] },
    RU: { q: 'Какой орган перекачивает кровь по телу?', a: ['Сердце', 'Лёгкие', 'Печень', 'Почки'] },
    KK: { q: 'Қанды бүкіл денеге қай мүше айдайды?', a: ['Жүрек', 'Өкпе', 'Бауыр', 'Бүйрек'] }
  },
  {
    level: 1, topic: 'geo',
    EN: { q: 'In which city is the Eiffel Tower?', a: ['Paris', 'London', 'Rome', 'Berlin'] },
    TR: { q: 'Eyfel Kulesi hangi şehirdedir?', a: ['Paris', 'Londra', 'Roma', 'Berlin'] },
    RU: { q: 'В каком городе находится Эйфелева башня?', a: ['Париж', 'Лондон', 'Рим', 'Берлин'] },
    KK: { q: 'Эйфель мұнарасы қай қалада орналасқан?', a: ['Париж', 'Лондон', 'Рим', 'Берлин'] }
  },
  {
    level: 1, topic: 'sport',
    EN: { q: 'How many players does a football (soccer) team have on the field?', a: ['11', '10', '9', '12'] },
    TR: { q: 'Bir futbol takımı sahada kaç oyuncuyla oynar?', a: ['11', '10', '9', '12'] },
    RU: { q: 'Сколько игроков одной футбольной команды находится на поле?', a: ['11', '10', '9', '12'] },
    KK: { q: 'Бір футбол командасының алаңда неше ойыншысы болады?', a: ['11', '10', '9', '12'] }
  },
  {
    level: 1, topic: 'nature',
    EN: { q: 'What is the fastest land animal?', a: ['Cheetah', 'Lion', 'Horse', 'Gazelle'] },
    TR: { q: 'Karadaki en hızlı hayvan hangisidir?', a: ['Çita', 'Aslan', 'At', 'Ceylan'] },
    RU: { q: 'Какое животное самое быстрое на суше?', a: ['Гепард', 'Лев', 'Лошадь', 'Газель'] },
    KK: { q: 'Құрлықтағы ең жылдам жануар қайсы?', a: ['Гепард', 'Арыстан', 'Жылқы', 'Жейрен'] }
  },
  {
    level: 1, topic: 'math',
    EN: { q: 'What is 12 × 12?', a: ['144', '124', '132', '154'] },
    TR: { q: '12 × 12 kaçtır?', a: ['144', '124', '132', '154'] },
    RU: { q: 'Сколько будет 12 × 12?', a: ['144', '124', '132', '154'] },
    KK: { q: '12 × 12 нешеге тең?', a: ['144', '124', '132', '154'] }
  },
  {
    level: 2, topic: 'geo',
    EN: { q: 'Which is the highest mountain in Turkey?', a: ['Mount Ararat (Ağrı)', 'Mount Erciyes', 'Uludağ', 'Mount Süphan'] },
    TR: { q: 'Türkiye’nin en yüksek dağı hangisidir?', a: ['Ağrı Dağı', 'Erciyes Dağı', 'Uludağ', 'Süphan Dağı'] },
    RU: { q: 'Какая гора самая высокая в Турции?', a: ['Арарат (Агры)', 'Эрджиес', 'Улудаг', 'Сюпхан'] },
    KK: { q: 'Түркиядағы ең биік тау қайсы?', a: ['Арарат (Ағры)', 'Эрджиес', 'Улудағ', 'Сүпхан'] }
  },
  {
    level: 1, topic: 'tech',
    EN: { q: 'Which company makes the iPhone?', a: ['Apple', 'Samsung', 'Google', 'Microsoft'] },
    TR: { q: 'iPhone’u hangi şirket üretir?', a: ['Apple', 'Samsung', 'Google', 'Microsoft'] },
    RU: { q: 'Какая компания выпускает iPhone?', a: ['Apple', 'Samsung', 'Google', 'Microsoft'] },
    KK: { q: 'iPhone-ды қай компания шығарады?', a: ['Apple', 'Samsung', 'Google', 'Microsoft'] }
  },
  {
    level: 4, topic: 'geo',
    EN: { q: 'What is the largest desert in the world (hot or cold)?', a: ['Antarctica', 'Sahara', 'Gobi', 'Arabian'] },
    TR: { q: 'Dünyanın en büyük çölü hangisidir (sıcak veya soğuk)?', a: ['Antarktika', 'Sahra', 'Gobi', 'Arabistan'] },
    RU: { q: 'Какая пустыня самая большая в мире (жаркая или холодная)?', a: ['Антарктическая', 'Сахара', 'Гоби', 'Аравийская'] },
    KK: { q: 'Әлемдегі ең үлкен шөл қайсы (ыстық не суық)?', a: ['Антарктида', 'Сахара', 'Гоби', 'Арабия'] }
  },
  {
    level: 1, topic: 'math',
    EN: { q: 'How many sides does a hexagon have?', a: ['6', '5', '7', '8'] },
    TR: { q: 'Bir altıgenin kaç kenarı vardır?', a: ['6', '5', '7', '8'] },
    RU: { q: 'Сколько сторон у шестиугольника?', a: ['6', '5', '7', '8'] },
    KK: { q: 'Алтыбұрыштың неше қабырғасы бар?', a: ['6', '5', '7', '8'] }
  },
  {
    level: 2, topic: 'science',
    EN: { q: 'Who developed the theory of relativity?', a: ['Albert Einstein', 'Isaac Newton', 'Nikola Tesla', 'Galileo Galilei'] },
    TR: { q: 'Görelilik kuramını kim geliştirdi?', a: ['Albert Einstein', 'Isaac Newton', 'Nikola Tesla', 'Galileo Galilei'] },
    RU: { q: 'Кто создал теорию относительности?', a: ['Альберт Эйнштейн', 'Исаак Ньютон', 'Никола Тесла', 'Галилео Галилей'] },
    KK: { q: 'Салыстырмалылық теориясын кім жасады?', a: ['Альберт Эйнштейн', 'Исаак Ньютон', 'Никола Тесла', 'Галилео Галилей'] }
  },
  {
    level: 1, topic: 'geo',
    EN: { q: 'Which sea lies to the north of Turkey?', a: ['Black Sea', 'Mediterranean Sea', 'Aegean Sea', 'Red Sea'] },
    TR: { q: 'Türkiye’nin kuzeyinde hangi deniz vardır?', a: ['Karadeniz', 'Akdeniz', 'Ege Denizi', 'Kızıldeniz'] },
    RU: { q: 'Какое море омывает Турцию с севера?', a: ['Чёрное море', 'Средиземное море', 'Эгейское море', 'Красное море'] },
    KK: { q: 'Түркияның солтүстігінде қай теңіз жатыр?', a: ['Қара теңіз', 'Жерорта теңізі', 'Эгей теңізі', 'Қызыл теңіз'] }
  },
  {
    level: 2, topic: 'food',
    EN: { q: 'What is the main ingredient of guacamole?', a: ['Avocado', 'Tomato', 'Pepper', 'Onion'] },
    TR: { q: 'Guacamole’nin ana malzemesi nedir?', a: ['Avokado', 'Domates', 'Biber', 'Soğan'] },
    RU: { q: 'Что главный ингредиент гуакамоле?', a: ['Авокадо', 'Помидор', 'Перец', 'Лук'] },
    KK: { q: 'Гуакамоленің негізгі құрамдас бөлігі не?', a: ['Авокадо', 'Қызанақ', 'Бұрыш', 'Пияз'] }
  },
  {
    level: 3, topic: 'science',
    EN: { q: 'How many bones are in the adult human body?', a: ['206', '186', '226', '256'] },
    TR: { q: 'Yetişkin bir insanın vücudunda kaç kemik vardır?', a: ['206', '186', '226', '256'] },
    RU: { q: 'Сколько костей в теле взрослого человека?', a: ['206', '186', '226', '256'] },
    KK: { q: 'Ересек адамның денесінде неше сүйек бар?', a: ['206', '186', '226', '256'] }
  },
  {
    level: 2, topic: 'music',
    EN: { q: 'Which instrument has 88 keys?', a: ['Piano', 'Guitar', 'Violin', 'Flute'] },
    TR: { q: 'Hangi çalgının 88 tuşu vardır?', a: ['Piyano', 'Gitar', 'Keman', 'Flüt'] },
    RU: { q: 'У какого инструмента 88 клавиш?', a: ['Фортепиано', 'Гитара', 'Скрипка', 'Флейта'] },
    KK: { q: 'Қай аспаптың 88 пернесі бар?', a: ['Фортепиано', 'Гитара', 'Скрипка', 'Флейта'] }
  },
  {
    level: 1, topic: 'geo',
    EN: { q: 'What is the currency of Japan?', a: ['Yen', 'Won', 'Yuan', 'Ringgit'] },
    TR: { q: 'Japonya’nın para birimi nedir?', a: ['Yen', 'Won', 'Yuan', 'Ringgit'] },
    RU: { q: 'Какая валюта в Японии?', a: ['Иена', 'Вона', 'Юань', 'Ринггит'] },
    KK: { q: 'Жапонияның валютасы қандай?', a: ['Иена', 'Вона', 'Юань', 'Ринггит'] }
  },
  {
    level: 3, topic: 'space',
    EN: { q: 'Which star is closest to Earth?', a: ['The Sun', 'Sirius', 'Proxima Centauri', 'Polaris'] },
    TR: { q: 'Dünya’ya en yakın yıldız hangisidir?', a: ['Güneş', 'Sirius', 'Proxima Centauri', 'Kutup Yıldızı'] },
    RU: { q: 'Какая звезда ближе всего к Земле?', a: ['Солнце', 'Сириус', 'Проксима Центавра', 'Полярная звезда'] },
    KK: { q: 'Жерге ең жақын жұлдыз қайсы?', a: ['Күн', 'Сириус', 'Проксима Центавр', 'Темірқазық'] }
  },
  {
    level: 1, topic: 'science',
    EN: { q: 'How many colors are in a rainbow?', a: ['7', '5', '6', '8'] },
    TR: { q: 'Gökkuşağında kaç renk vardır?', a: ['7', '5', '6', '8'] },
    RU: { q: 'Сколько цветов в радуге?', a: ['7', '5', '6', '8'] },
    KK: { q: 'Кемпірқосақта неше түс бар?', a: ['7', '5', '6', '8'] }
  },
  {
    level: 2, topic: 'sport',
    EN: { q: 'Which country hosted the 2016 Summer Olympics?', a: ['Brazil', 'China', 'United Kingdom', 'Japan'] },
    TR: { q: '2016 Yaz Olimpiyatları hangi ülkede yapıldı?', a: ['Brezilya', 'Çin', 'Birleşik Krallık', 'Japonya'] },
    RU: { q: 'Какая страна принимала летние Олимпийские игры 2016 года?', a: ['Бразилия', 'Китай', 'Великобритания', 'Япония'] },
    KK: { q: '2016 жылғы жазғы Олимпиада ойындары қай елде өтті?', a: ['Бразилия', 'Қытай', 'Ұлыбритания', 'Жапония'] }
  },
  {
    level: 2, topic: 'tech',
    EN: { q: 'What does "www" stand for in a website address?', a: ['World Wide Web', 'Wide World Web', 'Web World Wide', 'World Web Wire'] },
    TR: { q: 'İnternet adreslerindeki "www" neyin kısaltmasıdır?', a: ['World Wide Web', 'Wide World Web', 'Web World Wide', 'World Web Wire'] },
    RU: { q: 'Что означает «www» в адресе сайта?', a: ['World Wide Web', 'Wide World Web', 'Web World Wide', 'World Web Wire'] },
    KK: { q: 'Сайт мекенжайындағы «www» нені білдіреді?', a: ['World Wide Web', 'Wide World Web', 'Web World Wide', 'World Web Wire'] }
  },
  {
    level: 3, topic: 'science',
    EN: { q: 'What is the freezing point of water in Fahrenheit?', a: ['32 °F', '0 °F', '100 °F', '212 °F'] },
    TR: { q: 'Suyun donma noktası Fahrenheit cinsinden kaçtır?', a: ['32 °F', '0 °F', '100 °F', '212 °F'] },
    RU: { q: 'Какова температура замерзания воды по Фаренгейту?', a: ['32 °F', '0 °F', '100 °F', '212 °F'] },
    KK: { q: 'Фаренгейт бойынша судың қату температурасы қанша?', a: ['32 °F', '0 °F', '100 °F', '212 °F'] }
  },
  {
    level: 4, topic: 'history',
    EN: { q: 'Which city was the capital of the Ottoman Empire before Istanbul?', a: ['Edirne', 'Bursa', 'Konya', 'Ankara'] },
    TR: { q: 'İstanbul’dan hemen önce Osmanlı’nın başkenti hangi şehirdi?', a: ['Edirne', 'Bursa', 'Konya', 'Ankara'] },
    RU: { q: 'Какой город был столицей Османской империи до Стамбула?', a: ['Эдирне', 'Бурса', 'Конья', 'Анкара'] },
    KK: { q: 'Ыстамбұлға дейін Осман империясының астанасы қай қала болған?', a: ['Эдирне', 'Бурса', 'Конья', 'Анкара'] }
  },
  {
    level: 1, topic: 'math',
    EN: { q: 'How many days are in a leap year?', a: ['366', '365', '364', '367'] },
    TR: { q: 'Artık yılda kaç gün vardır?', a: ['366', '365', '364', '367'] },
    RU: { q: 'Сколько дней в високосном году?', a: ['366', '365', '364', '367'] },
    KK: { q: 'Кібісе жылда неше күн бар?', a: ['366', '365', '364', '367'] }
  },
  {
    level: 1, topic: 'nature',
    EN: { q: 'Which animal is known as the “King of Beasts”?', a: ['Lion', 'Tiger', 'Elephant', 'Gorilla'] },
    TR: { q: '“Hayvanların kralı” olarak bilinen hayvan hangisidir?', a: ['Aslan', 'Kaplan', 'Fil', 'Goril'] },
    RU: { q: 'Какого зверя называют «царём зверей»?', a: ['Лев', 'Тигр', 'Слон', 'Горилла'] },
    KK: { q: 'Қай аңды «аңдардың патшасы» деп атайды?', a: ['Арыстан', 'Жолбарыс', 'Піл', 'Горилла'] }
  },
  {
    level: 1, topic: 'art',
    EN: { q: 'Which color do you get by mixing blue and yellow?', a: ['Green', 'Purple', 'Orange', 'Brown'] },
    TR: { q: 'Mavi ile sarıyı karıştırınca hangi renk elde edilir?', a: ['Yeşil', 'Mor', 'Turuncu', 'Kahverengi'] },
    RU: { q: 'Какой цвет получится, если смешать синий и жёлтый?', a: ['Зелёный', 'Фиолетовый', 'Оранжевый', 'Коричневый'] },
    KK: { q: 'Көк пен сарыны араластырса, қандай түс шығады?', a: ['Жасыл', 'Күлгін', 'Қызғылт сары', 'Қоңыр'] }
  },
  {
    level: 1, topic: 'math',
    EN: { q: 'How many hours are in a day?', a: ['24', '12', '20', '48'] },
    TR: { q: 'Bir günde kaç saat vardır?', a: ['24', '12', '20', '48'] },
    RU: { q: 'Сколько часов в сутках?', a: ['24', '12', '20', '48'] },
    KK: { q: 'Бір тәулікте неше сағат бар?', a: ['24', '12', '20', '48'] }
  },
  {
    level: 1, topic: 'nature',
    EN: { q: 'Which is the largest mammal on Earth?', a: ['Blue whale', 'African elephant', 'Giraffe', 'Hippopotamus'] },
    TR: { q: 'Dünyadaki en büyük memeli hangisidir?', a: ['Mavi balina', 'Afrika fili', 'Zürafa', 'Su aygırı'] },
    RU: { q: 'Какое млекопитающее самое крупное на Земле?', a: ['Синий кит', 'Африканский слон', 'Жираф', 'Бегемот'] },
    KK: { q: 'Жердегі ең ірі сүтқоректі қайсы?', a: ['Көк кит', 'Африка пілі', 'Керік', 'Бегемот'] }
  },
  {
    level: 1, topic: 'nature',
    EN: { q: 'What do bees make?', a: ['Honey', 'Milk', 'Silk', 'Cheese'] },
    TR: { q: 'Arılar ne üretir?', a: ['Bal', 'Süt', 'İpek', 'Peynir'] },
    RU: { q: 'Что делают пчёлы?', a: ['Мёд', 'Молоко', 'Шёлк', 'Сыр'] },
    KK: { q: 'Аралар не жасайды?', a: ['Бал', 'Сүт', 'Жібек', 'Ірімшік'] }
  },
  {
    level: 1, topic: 'math',
    EN: { q: 'How many wheels does a bicycle have?', a: ['2', '3', '4', '1'] },
    TR: { q: 'Bir bisikletin kaç tekerleği vardır?', a: ['2', '3', '4', '1'] },
    RU: { q: 'Сколько колёс у велосипеда?', a: ['2', '3', '4', '1'] },
    KK: { q: 'Велосипедтің неше дөңгелегі бар?', a: ['2', '3', '4', '1'] }
  },
  {
    level: 1, topic: 'language',
    EN: { q: 'What is the opposite of “hot”?', a: ['Cold', 'Warm', 'Wet', 'Soft'] },
    TR: { q: '“Sıcak” kelimesinin zıt anlamlısı nedir?', a: ['Soğuk', 'Ilık', 'Islak', 'Yumuşak'] },
    RU: { q: 'Какое слово противоположно по смыслу слову «горячий»?', a: ['Холодный', 'Тёплый', 'Мокрый', 'Мягкий'] },
    KK: { q: '«Ыстық» сөзінің қарама-қарсы мағыналы сөзі қайсы?', a: ['Суық', 'Жылы', 'Дымқыл', 'Жұмсақ'] }
  },
  {
    level: 1, topic: 'nature',
    EN: { q: 'How many legs does an insect have?', a: ['6', '8', '4', '10'] },
    TR: { q: 'Bir böceğin kaç bacağı vardır?', a: ['6', '8', '4', '10'] },
    RU: { q: 'Сколько ног у насекомого?', a: ['6', '8', '4', '10'] },
    KK: { q: 'Жәндіктің неше аяғы бар?', a: ['6', '8', '4', '10'] }
  },
  {
    level: 1, topic: 'geo',
    EN: { q: 'What is the capital of Turkey?', a: ['Ankara', 'Istanbul', 'Izmir', 'Bursa'] },
    TR: { q: 'Türkiye’nin başkenti neresidir?', a: ['Ankara', 'İstanbul', 'İzmir', 'Bursa'] },
    RU: { q: 'Какой город — столица Турции?', a: ['Анкара', 'Стамбул', 'Измир', 'Бурса'] },
    KK: { q: 'Түркияның астанасы қай қала?', a: ['Анкара', 'Ыстамбұл', 'Измир', 'Бурса'] }
  },
  {
    level: 1, topic: 'geo',
    EN: { q: 'What is the capital of Kazakhstan?', a: ['Astana', 'Almaty', 'Shymkent', 'Karaganda'] },
    TR: { q: 'Kazakistan’ın başkenti neresidir?', a: ['Astana', 'Almatı', 'Çimkent', 'Karaganda'] },
    RU: { q: 'Какой город — столица Казахстана?', a: ['Астана', 'Алматы', 'Шымкент', 'Караганда'] },
    KK: { q: 'Қазақстанның астанасы қай қала?', a: ['Астана', 'Алматы', 'Шымкент', 'Қарағанды'] }
  },
  {
    level: 1, topic: 'geo',
    EN: { q: 'What is the capital of Russia?', a: ['Moscow', 'Saint Petersburg', 'Kazan', 'Novosibirsk'] },
    TR: { q: 'Rusya’nın başkenti neresidir?', a: ['Moskova', 'St. Petersburg', 'Kazan', 'Novosibirsk'] },
    RU: { q: 'Какой город — столица России?', a: ['Москва', 'Санкт-Петербург', 'Казань', 'Новосибирск'] },
    KK: { q: 'Ресейдің астанасы қай қала?', a: ['Мәскеу', 'Санкт-Петербург', 'Қазан', 'Новосибирск'] }
  },
  {
    level: 1, topic: 'nature',
    EN: { q: 'What do caterpillars turn into?', a: ['Butterflies', 'Spiders', 'Bees', 'Ants'] },
    TR: { q: 'Tırtıllar neye dönüşür?', a: ['Kelebeğe', 'Örümceğe', 'Arıya', 'Karıncaya'] },
    RU: { q: 'В кого превращаются гусеницы?', a: ['В бабочек', 'В пауков', 'В пчёл', 'В муравьёв'] },
    KK: { q: 'Құрттар неге айналады?', a: ['Көбелекке', 'Өрмекшіге', 'Араға', 'Құмырсқаға'] }
  },
  {
    level: 1, topic: 'science',
    EN: { q: 'What is frozen water called?', a: ['Ice', 'Steam', 'Dew', 'Fog'] },
    TR: { q: 'Donmuş suya ne denir?', a: ['Buz', 'Buhar', 'Çiy', 'Sis'] },
    RU: { q: 'Как называется замёрзшая вода?', a: ['Лёд', 'Пар', 'Роса', 'Туман'] },
    KK: { q: 'Қатқан су қалай аталады?', a: ['Мұз', 'Бу', 'Шық', 'Тұман'] }
  },
  {
    level: 1, topic: 'math',
    EN: { q: 'How many sides does a triangle have?', a: ['3', '4', '5', '6'] },
    TR: { q: 'Bir üçgenin kaç kenarı vardır?', a: ['3', '4', '5', '6'] },
    RU: { q: 'Сколько сторон у треугольника?', a: ['3', '4', '5', '6'] },
    KK: { q: 'Үшбұрыштың неше қабырғасы бар?', a: ['3', '4', '5', '6'] }
  },
  {
    level: 1, topic: 'geo',
    EN: { q: 'Which is the coldest continent?', a: ['Antarctica', 'Europe', 'Asia', 'North America'] },
    TR: { q: 'En soğuk kıta hangisidir?', a: ['Antarktika', 'Avrupa', 'Asya', 'Kuzey Amerika'] },
    RU: { q: 'Какой материк самый холодный?', a: ['Антарктида', 'Евразия', 'Африка', 'Северная Америка'] },
    KK: { q: 'Ең суық құрлық қайсы?', a: ['Антарктида', 'Еуразия', 'Африка', 'Солтүстік Америка'] }
  },
  {
    level: 1, topic: 'math',
    EN: { q: 'Which shape has no corners?', a: ['Circle', 'Square', 'Triangle', 'Rectangle'] },
    TR: { q: 'Hangi şeklin hiç köşesi yoktur?', a: ['Daire', 'Kare', 'Üçgen', 'Dikdörtgen'] },
    RU: { q: 'У какой фигуры нет углов?', a: ['Круг', 'Квадрат', 'Треугольник', 'Прямоугольник'] },
    KK: { q: 'Қай фигураның бұрышы жоқ?', a: ['Дөңгелек', 'Шаршы', 'Үшбұрыш', 'Тіктөртбұрыш'] }
  },
  {
    level: 1, topic: 'science',
    EN: { q: 'Which gas do people need to breathe to stay alive?', a: ['Oxygen', 'Carbon dioxide', 'Helium', 'Hydrogen'] },
    TR: { q: 'İnsanların yaşamak için soluması gereken gaz hangisidir?', a: ['Oksijen', 'Karbondioksit', 'Helyum', 'Hidrojen'] },
    RU: { q: 'Какой газ нужен человеку для дыхания, чтобы жить?', a: ['Кислород', 'Углекислый газ', 'Гелий', 'Водород'] },
    KK: { q: 'Адам тірі қалу үшін қай газбен тыныс алуы керек?', a: ['Оттегі', 'Көмірқышқыл газы', 'Гелий', 'Сутегі'] }
  },
  {
    level: 1, topic: 'sport',
    EN: { q: 'How many players from one team are on a basketball court?', a: ['5', '6', '7', '11'] },
    TR: { q: 'Basketbolda sahada bir takımdan kaç oyuncu bulunur?', a: ['5', '6', '7', '11'] },
    RU: { q: 'Сколько игроков одной команды на баскетбольной площадке?', a: ['5', '6', '7', '11'] },
    KK: { q: 'Баскетболда алаңда бір команданың неше ойыншысы болады?', a: ['5', '6', '7', '11'] }
  },
  {
    level: 1, topic: 'math',
    EN: { q: 'What is 7 × 8?', a: ['56', '54', '63', '48'] },
    TR: { q: '7 × 8 kaçtır?', a: ['56', '54', '63', '48'] },
    RU: { q: 'Сколько будет 7 × 8?', a: ['56', '54', '63', '48'] },
    KK: { q: '7 × 8 неше болады?', a: ['56', '54', '63', '48'] }
  },
  {
    level: 1, topic: 'nature',
    EN: { q: 'Which bird is a symbol of peace?', a: ['Dove', 'Eagle', 'Crow', 'Owl'] },
    TR: { q: 'Barışın simgesi olan kuş hangisidir?', a: ['Güvercin', 'Kartal', 'Karga', 'Baykuş'] },
    RU: { q: 'Какая птица — символ мира?', a: ['Голубь', 'Орёл', 'Ворона', 'Сова'] },
    KK: { q: 'Қай құс бейбітшіліктің нышаны?', a: ['Көгершін', 'Бүркіт', 'Қарға', 'Үкі'] }
  },
  {
    level: 1, topic: 'geo',
    EN: { q: 'In which city is the Statue of Liberty?', a: ['New York', 'Paris', 'London', 'Washington'] },
    TR: { q: 'Özgürlük Heykeli hangi şehirdedir?', a: ['New York', 'Paris', 'Londra', 'Washington'] },
    RU: { q: 'В каком городе стоит статуя Свободы?', a: ['Нью-Йорк', 'Париж', 'Лондон', 'Вашингтон'] },
    KK: { q: 'Бостандық мүсіні қай қалада тұр?', a: ['Нью-Йорк', 'Париж', 'Лондон', 'Вашингтон'] }
  },
  {
    level: 1, topic: 'geo',
    EN: { q: 'Which is the largest country by area?', a: ['Russia', 'Canada', 'China', 'USA'] },
    TR: { q: 'Yüz ölçümü en büyük ülke hangisidir?', a: ['Rusya', 'Kanada', 'Çin', 'ABD'] },
    RU: { q: 'Какая страна самая большая по площади?', a: ['Россия', 'Канада', 'Китай', 'США'] },
    KK: { q: 'Аумағы ең үлкен ел қайсы?', a: ['Ресей', 'Канада', 'Қытай', 'АҚШ'] }
  },
  {
    level: 1, topic: 'history',
    EN: { q: 'In which country are the pyramids of Giza?', a: ['Egypt', 'Mexico', 'Peru', 'Greece'] },
    TR: { q: 'Giza piramitleri hangi ülkededir?', a: ['Mısır', 'Meksika', 'Peru', 'Yunanistan'] },
    RU: { q: 'В какой стране находятся пирамиды Гизы?', a: ['Египет', 'Мексика', 'Перу', 'Греция'] },
    KK: { q: 'Гиза пирамидалары қай елде?', a: ['Мысыр', 'Мексика', 'Перу', 'Грекия'] }
  },
  {
    level: 1, topic: 'nature',
    EN: { q: 'Which animal gives us wool?', a: ['Sheep', 'Cow', 'Horse', 'Pig'] },
    TR: { q: 'Yün hangi hayvandan elde edilir?', a: ['Koyun', 'İnek', 'At', 'Domuz'] },
    RU: { q: 'Какое животное даёт нам шерсть?', a: ['Овца', 'Корова', 'Лошадь', 'Свинья'] },
    KK: { q: 'Жүнді бізге қай жануар береді?', a: ['Қой', 'Сиыр', 'Жылқы', 'Шошқа'] }
  },
  {
    level: 1, topic: 'nature',
    EN: { q: 'Which part of a plant usually grows underground?', a: ['The root', 'The leaf', 'The flower', 'The fruit'] },
    TR: { q: 'Bitkinin hangi kısmı genellikle toprağın altındadır?', a: ['Kök', 'Yaprak', 'Çiçek', 'Meyve'] },
    RU: { q: 'Какая часть растения обычно находится под землёй?', a: ['Корень', 'Лист', 'Цветок', 'Плод'] },
    KK: { q: 'Өсімдіктің қай бөлігі әдетте жер астында болады?', a: ['Тамыры', 'Жапырағы', 'Гүлі', 'Жемісі'] }
  },
  {
    level: 1, topic: 'space',
    EN: { q: 'Which planet is closest to the Sun?', a: ['Mercury', 'Venus', 'Earth', 'Mars'] },
    TR: { q: 'Güneş’e en yakın gezegen hangisidir?', a: ['Merkür', 'Venüs', 'Dünya', 'Mars'] },
    RU: { q: 'Какая планета ближе всех к Солнцу?', a: ['Меркурий', 'Венера', 'Земля', 'Марс'] },
    KK: { q: 'Күнге ең жақын планета қайсы?', a: ['Меркурий', 'Шолпан', 'Жер', 'Марс'] }
  },
  {
    level: 1, topic: 'science',
    EN: { q: 'What is H₂O better known as?', a: ['Water', 'Salt', 'Sugar', 'Oxygen'] },
    TR: { q: 'H₂O’nun bilinen adı nedir?', a: ['Su', 'Tuz', 'Şeker', 'Oksijen'] },
    RU: { q: 'Что обозначает формула H₂O?', a: ['Воду', 'Соль', 'Сахар', 'Кислород'] },
    KK: { q: 'H₂O формуласы нені білдіреді?', a: ['Су', 'Тұз', 'Қант', 'Оттегі'] }
  },
  {
    level: 1, topic: 'sport',
    EN: { q: 'Which sport is played with a racket and a shuttlecock?', a: ['Badminton', 'Tennis', 'Squash', 'Table tennis'] },
    TR: { q: 'Raket ve tüylü top ile oynanan spor hangisidir?', a: ['Badminton', 'Tenis', 'Squash', 'Masa tenisi'] },
    RU: { q: 'В какой игре нужны ракетка и волан?', a: ['Бадминтон', 'Теннис', 'Сквош', 'Настольный теннис'] },
    KK: { q: 'Ракетка мен воланмен қай спорт түрі ойналады?', a: ['Бадминтон', 'Теннис', 'Сквош', 'Үстел теннисі'] }
  },
  {
    level: 1, topic: 'sport',
    EN: { q: 'How many rings are on the Olympic flag?', a: ['5', '4', '6', '7'] },
    TR: { q: 'Olimpiyat bayrağında kaç halka vardır?', a: ['5', '4', '6', '7'] },
    RU: { q: 'Сколько колец на олимпийском флаге?', a: ['5', '4', '6', '7'] },
    KK: { q: 'Олимпиада туында неше сақина бар?', a: ['5', '4', '6', '7'] }
  },
  {
    level: 1, topic: 'sport',
    EN: { q: 'How long is a football (soccer) match, without extra time?', a: ['90 minutes', '60 minutes', '80 minutes', '100 minutes'] },
    TR: { q: 'Bir futbol maçı uzatmalar olmadan kaç dakika sürer?', a: ['90 dakika', '60 dakika', '80 dakika', '100 dakika'] },
    RU: { q: 'Сколько длится футбольный матч без дополнительного времени?', a: ['90 минут', '60 минут', '80 минут', '100 минут'] },
    KK: { q: 'Қосымша уақытсыз футбол матчы қанша уақытқа созылады?', a: ['90 минут', '60 минут', '80 минут', '100 минут'] }
  },
  {
    level: 1, topic: 'nature',
    EN: { q: 'What does a giant panda mostly eat?', a: ['Bamboo', 'Fish', 'Fruit', 'Insects'] },
    TR: { q: 'Dev panda çoğunlukla ne yer?', a: ['Bambu', 'Balık', 'Meyve', 'Böcek'] },
    RU: { q: 'Чем в основном питается большая панда?', a: ['Бамбуком', 'Рыбой', 'Фруктами', 'Насекомыми'] },
    KK: { q: 'Үлкен панда негізінен немен қоректенеді?', a: ['Бамбукпен', 'Балықпен', 'Жеміспен', 'Жәндіктермен'] }
  },
  {
    level: 1, topic: 'math',
    EN: { q: 'How many things are in a dozen?', a: ['12', '10', '20', '6'] },
    TR: { q: 'Bir düzine kaç tanedir?', a: ['12', '10', '20', '6'] },
    RU: { q: 'Сколько штук в дюжине?', a: ['12', '10', '20', '6'] },
    KK: { q: 'Бір дюжинада неше дана бар?', a: ['12', '10', '20', '6'] }
  },
  {
    level: 1, topic: 'language',
    EN: { q: 'In which language does “merci” mean “thank you”?', a: ['French', 'Italian', 'Spanish', 'Portuguese'] },
    TR: { q: '“Merci” hangi dilde “teşekkürler” demektir?', a: ['Fransızca', 'İtalyanca', 'İspanyolca', 'Portekizce'] },
    RU: { q: 'На каком языке «merci» значит «спасибо»?', a: ['На французском', 'На итальянском', 'На испанском', 'На португальском'] },
    KK: { q: '«Merci» қай тілде «рахмет» дегенді білдіреді?', a: ['Француз тілінде', 'Итальян тілінде', 'Испан тілінде', 'Португал тілінде'] }
  },
  {
    level: 1, topic: 'geo',
    EN: { q: 'Which of these countries lies in both Europe and Asia?', a: ['Turkey', 'Spain', 'Japan', 'Brazil'] },
    TR: { q: 'Bu ülkelerden hangisi hem Avrupa’da hem Asya’dadır?', a: ['Türkiye', 'İspanya', 'Japonya', 'Brezilya'] },
    RU: { q: 'Какая из этих стран находится и в Европе, и в Азии?', a: ['Турция', 'Испания', 'Япония', 'Бразилия'] },
    KK: { q: 'Бұл елдердің қайсысы әрі Еуропада, әрі Азияда орналасқан?', a: ['Түркия', 'Испания', 'Жапония', 'Бразилия'] }
  },
  {
    level: 1, topic: 'geo',
    EN: { q: 'What is the currency of Kazakhstan?', a: ['Tenge', 'Ruble', 'Som', 'Manat'] },
    TR: { q: 'Kazakistan’ın para birimi nedir?', a: ['Tenge', 'Ruble', 'Som', 'Manat'] },
    RU: { q: 'Какая валюта в Казахстане?', a: ['Тенге', 'Рубль', 'Сом', 'Манат'] },
    KK: { q: 'Қазақстанның ұлттық валютасы қандай?', a: ['Теңге', 'Рубль', 'Сом', 'Манат'] }
  },
  {
    level: 1, topic: 'history',
    EN: { q: 'How many points does the star on the Turkish flag have?', a: ['5', '6', '7', '8'] },
    TR: { q: 'Türk bayrağındaki yıldızın kaç köşesi vardır?', a: ['5', '6', '7', '8'] },
    RU: { q: 'Сколько лучей у звезды на флаге Турции?', a: ['5', '6', '7', '8'] },
    KK: { q: 'Түркия туындағы жұлдыздың неше сәулесі бар?', a: ['5', '6', '7', '8'] }
  },
  {
    level: 2, topic: 'math',
    EN: { q: 'How many months of the year have 28 days?', a: ['All 12', '1', '2', '6'] },
    TR: { q: 'Yılın kaç ayında 28 gün vardır?', a: ['Hepsinde (12)', '1', '2', '6'] },
    RU: { q: 'В скольких месяцах года есть 28 дней?', a: ['Во всех 12', 'В 1', 'В 2', 'В 6'] },
    KK: { q: 'Жылдың неше айында 28 күн бар?', a: ['Барлығында (12)', '1', '2', '6'] }
  },
  {
    level: 2, topic: 'geo',
    EN: { q: 'What is the capital of Canada?', a: ['Ottawa', 'Toronto', 'Vancouver', 'Montreal'] },
    TR: { q: 'Kanada’nın başkenti neresidir?', a: ['Ottava', 'Toronto', 'Vancouver', 'Montreal'] },
    RU: { q: 'Какой город — столица Канады?', a: ['Оттава', 'Торонто', 'Ванкувер', 'Монреаль'] },
    KK: { q: 'Канаданың астанасы қай қала?', a: ['Оттава', 'Торонто', 'Ванкувер', 'Монреаль'] }
  },
  {
    level: 2, topic: 'science',
    EN: { q: 'Which metal is liquid at room temperature?', a: ['Mercury', 'Iron', 'Aluminium', 'Lead'] },
    TR: { q: 'Oda sıcaklığında sıvı olan metal hangisidir?', a: ['Cıva', 'Demir', 'Alüminyum', 'Kurşun'] },
    RU: { q: 'Какой металл при комнатной температуре жидкий?', a: ['Ртуть', 'Железо', 'Алюминий', 'Свинец'] },
    KK: { q: 'Бөлме температурасында сұйық күйде болатын металл қайсы?', a: ['Сынап', 'Темір', 'Алюминий', 'Қорғасын'] }
  },
  {
    level: 2, topic: 'literature',
    EN: { q: 'Who wrote “War and Peace”?', a: ['Leo Tolstoy', 'Fyodor Dostoevsky', 'Anton Chekhov', 'Alexander Pushkin'] },
    TR: { q: '“Savaş ve Barış”ı kim yazdı?', a: ['Lev Tolstoy', 'Fyodor Dostoyevski', 'Anton Çehov', 'Aleksandr Puşkin'] },
    RU: { q: 'Кто написал «Войну и мир»?', a: ['Лев Толстой', 'Фёдор Достоевский', 'Антон Чехов', 'Александр Пушкин'] },
    KK: { q: '«Соғыс және бейбітшілікті» кім жазған?', a: ['Лев Толстой', 'Федор Достоевский', 'Антон Чехов', 'Александр Пушкин'] }
  },
  {
    level: 2, topic: 'geo',
    EN: { q: 'Which country is famous for tulips and windmills?', a: ['The Netherlands', 'Belgium', 'Denmark', 'Switzerland'] },
    TR: { q: 'Laleleri ve yel değirmenleriyle ünlü ülke hangisidir?', a: ['Hollanda', 'Belçika', 'Danimarka', 'İsviçre'] },
    RU: { q: 'Какая страна славится тюльпанами и ветряными мельницами?', a: ['Нидерланды', 'Бельгия', 'Дания', 'Швейцария'] },
    KK: { q: 'Қызғалдақтары мен жел диірмендерімен әйгілі ел қайсы?', a: ['Нидерланд', 'Бельгия', 'Дания', 'Швейцария'] }
  },
  {
    level: 2, topic: 'science',
    EN: { q: 'What is the largest organ of the human body?', a: ['The skin', 'The liver', 'The brain', 'The lungs'] },
    TR: { q: 'İnsan vücudunun en büyük organı hangisidir?', a: ['Deri', 'Karaciğer', 'Beyin', 'Akciğerler'] },
    RU: { q: 'Какой орган человека самый большой?', a: ['Кожа', 'Печень', 'Мозг', 'Лёгкие'] },
    KK: { q: 'Адам денесіндегі ең үлкен мүше қайсы?', a: ['Тері', 'Бауыр', 'Ми', 'Өкпе'] }
  },
  {
    level: 2, topic: 'space',
    EN: { q: 'Who was the first person to walk on the Moon?', a: ['Neil Armstrong', 'Yuri Gagarin', 'Buzz Aldrin', 'John Glenn'] },
    TR: { q: 'Ay’da yürüyen ilk insan kimdir?', a: ['Neil Armstrong', 'Yuri Gagarin', 'Buzz Aldrin', 'John Glenn'] },
    RU: { q: 'Кто первым прошёл по Луне?', a: ['Нил Армстронг', 'Юрий Гагарин', 'Базз Олдрин', 'Джон Гленн'] },
    KK: { q: 'Айдың бетімен бірінші жүрген адам кім?', a: ['Нил Армстронг', 'Юрий Гагарин', 'Базз Олдрин', 'Джон Гленн'] }
  },
  {
    level: 2, topic: 'space',
    EN: { q: 'Who was the first human in space?', a: ['Yuri Gagarin', 'Neil Armstrong', 'Valentina Tereshkova', 'Alan Shepard'] },
    TR: { q: 'Uzaya çıkan ilk insan kimdir?', a: ['Yuri Gagarin', 'Neil Armstrong', 'Valentina Tereşkova', 'Alan Shepard'] },
    RU: { q: 'Кто был первым человеком в космосе?', a: ['Юрий Гагарин', 'Нил Армстронг', 'Валентина Терешкова', 'Алан Шепард'] },
    KK: { q: 'Ғарышқа ұшқан алғашқы адам кім?', a: ['Юрий Гагарин', 'Нил Армстронг', 'Валентина Терешкова', 'Алан Шепард'] }
  },
  {
    level: 2, topic: 'geo',
    EN: { q: 'In which city is the Colosseum?', a: ['Rome', 'Athens', 'Istanbul', 'Paris'] },
    TR: { q: 'Kolezyum hangi şehirdedir?', a: ['Roma', 'Atina', 'İstanbul', 'Paris'] },
    RU: { q: 'В каком городе находится Колизей?', a: ['В Риме', 'В Афинах', 'В Стамбуле', 'В Париже'] },
    KK: { q: 'Колизей қай қалада орналасқан?', a: ['Рим', 'Афины', 'Ыстамбұл', 'Париж'] }
  },
  {
    level: 2, topic: 'sport',
    EN: { q: 'How many players from one team are on a volleyball court?', a: ['6', '5', '7', '9'] },
    TR: { q: 'Voleybolda sahada bir takımdan kaç oyuncu bulunur?', a: ['6', '5', '7', '9'] },
    RU: { q: 'Сколько игроков одной команды на волейбольной площадке?', a: ['6', '5', '7', '9'] },
    KK: { q: 'Волейболда алаңда бір команданың неше ойыншысы болады?', a: ['6', '5', '7', '9'] }
  },
  {
    level: 2, topic: 'math',
    EN: { q: 'What is the square root of 81?', a: ['9', '8', '7', '18'] },
    TR: { q: '81’in karekökü kaçtır?', a: ['9', '8', '7', '18'] },
    RU: { q: 'Чему равен квадратный корень из 81?', a: ['9', '8', '7', '18'] },
    KK: { q: '81-дің квадрат түбірі неге тең?', a: ['9', '8', '7', '18'] }
  },
  {
    level: 2, topic: 'science',
    EN: { q: 'Which vitamin does our skin make in sunlight?', a: ['Vitamin D', 'Vitamin A', 'Vitamin C', 'Vitamin B12'] },
    TR: { q: 'Derimiz güneş ışığında hangi vitamini üretir?', a: ['D vitamini', 'A vitamini', 'C vitamini', 'B12 vitamini'] },
    RU: { q: 'Какой витамин вырабатывается в коже под солнечным светом?', a: ['Витамин D', 'Витамин A', 'Витамин C', 'Витамин B12'] },
    KK: { q: 'Күн сәулесінің әсерінен теріде қай дәрумен түзіледі?', a: ['D дәрумені', 'A дәрумені', 'C дәрумені', 'B12 дәрумені'] }
  },
  {
    level: 2, topic: 'music',
    EN: { q: 'Who composed “Für Elise”?', a: ['Ludwig van Beethoven', 'Wolfgang Amadeus Mozart', 'Johann Sebastian Bach', 'Frédéric Chopin'] },
    TR: { q: '“Für Elise”i kim besteledi?', a: ['Ludwig van Beethoven', 'Wolfgang Amadeus Mozart', 'Johann Sebastian Bach', 'Frédéric Chopin'] },
    RU: { q: 'Кто написал пьесу «К Элизе»?', a: ['Людвиг ван Бетховен', 'Вольфганг Амадей Моцарт', 'Иоганн Себастьян Бах', 'Фредерик Шопен'] },
    KK: { q: '«Элизаға» пьесасын кім жазған?', a: ['Людвиг ван Бетховен', 'Вольфганг Амадей Моцарт', 'Иоганн Себастьян Бах', 'Фредерик Шопен'] }
  },
  {
    level: 2, topic: 'space',
    EN: { q: 'Which planet is best known for its rings?', a: ['Saturn', 'Jupiter', 'Uranus', 'Neptune'] },
    TR: { q: 'Halkalarıyla en çok bilinen gezegen hangisidir?', a: ['Satürn', 'Jüpiter', 'Uranüs', 'Neptün'] },
    RU: { q: 'Какая планета больше всего известна своими кольцами?', a: ['Сатурн', 'Юпитер', 'Уран', 'Нептун'] },
    KK: { q: 'Сақиналарымен ең танымал планета қайсы?', a: ['Сатурн', 'Юпитер', 'Уран', 'Нептун'] }
  },
  {
    level: 2, topic: 'history',
    EN: { q: 'In which year did World War II end?', a: ['1945', '1944', '1939', '1950'] },
    TR: { q: 'İkinci Dünya Savaşı hangi yıl sona erdi?', a: ['1945', '1944', '1939', '1950'] },
    RU: { q: 'В каком году закончилась Вторая мировая война?', a: ['1945', '1944', '1939', '1950'] },
    KK: { q: 'Екінші дүниежүзілік соғыс қай жылы аяқталды?', a: ['1945', '1944', '1939', '1950'] }
  },
  {
    level: 2, topic: 'geo',
    EN: { q: 'Which is the smallest country in the world?', a: ['Vatican City', 'Monaco', 'San Marino', 'Liechtenstein'] },
    TR: { q: 'Dünyanın en küçük ülkesi hangisidir?', a: ['Vatikan', 'Monako', 'San Marino', 'Lihtenştayn'] },
    RU: { q: 'Какая страна самая маленькая в мире?', a: ['Ватикан', 'Монако', 'Сан-Марино', 'Лихтенштейн'] },
    KK: { q: 'Әлемдегі ең кішкентай ел қайсы?', a: ['Ватикан', 'Монако', 'Сан-Марино', 'Лихтенштейн'] }
  },
  {
    level: 2, topic: 'language',
    EN: { q: 'What is the main language of Brazil?', a: ['Portuguese', 'Spanish', 'Brazilian', 'French'] },
    TR: { q: 'Brezilya’nın ana dili hangisidir?', a: ['Portekizce', 'İspanyolca', 'Brezilyaca', 'Fransızca'] },
    RU: { q: 'Какой основной язык Бразилии?', a: ['Португальский', 'Испанский', 'Бразильский', 'Французский'] },
    KK: { q: 'Бразилияның негізгі тілі қайсы?', a: ['Португал тілі', 'Испан тілі', 'Бразил тілі', 'Француз тілі'] }
  },
  {
    level: 2, topic: 'math',
    EN: { q: 'How many degrees are in a right angle?', a: ['90', '45', '180', '360'] },
    TR: { q: 'Dik açı kaç derecedir?', a: ['90', '45', '180', '360'] },
    RU: { q: 'Сколько градусов в прямом угле?', a: ['90', '45', '180', '360'] },
    KK: { q: 'Тік бұрыш неше градус?', a: ['90', '45', '180', '360'] }
  },
  {
    level: 2, topic: 'nature',
    EN: { q: 'Which is the tallest animal?', a: ['Giraffe', 'Elephant', 'Camel', 'Ostrich'] },
    TR: { q: 'En uzun boylu hayvan hangisidir?', a: ['Zürafa', 'Fil', 'Deve', 'Devekuşu'] },
    RU: { q: 'Какое животное самое высокое?', a: ['Жираф', 'Слон', 'Верблюд', 'Страус'] },
    KK: { q: 'Ең биік жануар қайсы?', a: ['Керік', 'Піл', 'Түйе', 'Түйеқұс'] }
  },
  {
    level: 2, topic: 'literature',
    EN: { q: 'Who wrote the Turkish National Anthem (İstiklal Marşı)?', a: ['Mehmet Akif Ersoy', 'Nazım Hikmet', 'Yunus Emre', 'Orhan Veli'] },
    TR: { q: 'İstiklal Marşı’nın şairi kimdir?', a: ['Mehmet Akif Ersoy', 'Nazım Hikmet', 'Yunus Emre', 'Orhan Veli'] },
    RU: { q: 'Кто автор слов гимна Турции «Марш независимости»?', a: ['Мехмет Акиф Эрсой', 'Назым Хикмет', 'Юнус Эмре', 'Орхан Вели'] },
    KK: { q: 'Түркия әнұраны «Тәуелсіздік маршының» сөзін кім жазған?', a: ['Мехмет Акиф Эрсой', 'Назым Хикмет', 'Юнус Эмре', 'Орхан Вели'] }
  },
  {
    level: 2, topic: 'literature',
    EN: { q: 'Who wrote “Crime and Punishment”?', a: ['Fyodor Dostoevsky', 'Leo Tolstoy', 'Nikolai Gogol', 'Ivan Turgenev'] },
    TR: { q: '“Suç ve Ceza”yı kim yazdı?', a: ['Fyodor Dostoyevski', 'Lev Tolstoy', 'Nikolay Gogol', 'İvan Turgenyev'] },
    RU: { q: 'Кто написал «Преступление и наказание»?', a: ['Фёдор Достоевский', 'Лев Толстой', 'Николай Гоголь', 'Иван Тургенев'] },
    KK: { q: '«Қылмыс пен жазаны» кім жазған?', a: ['Федор Достоевский', 'Лев Толстой', 'Николай Гоголь', 'Иван Тургенев'] }
  },
  {
    level: 2, topic: 'science',
    EN: { q: 'How many teeth does an adult usually have, wisdom teeth included?', a: ['32', '28', '30', '36'] },
    TR: { q: 'Yirmi yaş dişleri dahil, bir yetişkinin genellikle kaç dişi vardır?', a: ['32', '28', '30', '36'] },
    RU: { q: 'Сколько зубов обычно у взрослого человека вместе с зубами мудрости?', a: ['32', '28', '30', '36'] },
    KK: { q: 'Ақыл тістерін қоса есептегенде, ересек адамның әдетте неше тісі болады?', a: ['32', '28', '30', '36'] }
  },
  {
    level: 2, topic: 'science',
    EN: { q: 'Which chemical element has the symbol “Fe”?', a: ['Iron', 'Fluorine', 'Lead', 'Francium'] },
    TR: { q: 'Sembolü “Fe” olan element hangisidir?', a: ['Demir', 'Flor', 'Kurşun', 'Fransiyum'] },
    RU: { q: 'У какого элемента символ «Fe»?', a: ['Железо', 'Фтор', 'Свинец', 'Франций'] },
    KK: { q: 'Таңбасы «Fe» болатын элемент қайсы?', a: ['Темір', 'Фтор', 'Қорғасын', 'Франций'] }
  },
  {
    level: 2, topic: 'geo',
    EN: { q: 'What is the currency of the United Kingdom?', a: ['Pound sterling', 'Euro', 'Dollar', 'Franc'] },
    TR: { q: 'Birleşik Krallık’ın para birimi nedir?', a: ['İngiliz sterlini', 'Euro', 'Dolar', 'Frank'] },
    RU: { q: 'Какая валюта в Великобритании?', a: ['Фунт стерлингов', 'Евро', 'Доллар', 'Франк'] },
    KK: { q: 'Ұлыбританияның валютасы қандай?', a: ['Фунт стерлинг', 'Еуро', 'Доллар', 'Франк'] }
  },
  {
    level: 2, topic: 'art',
    EN: { q: 'Who painted “The Starry Night”?', a: ['Vincent van Gogh', 'Claude Monet', 'Pablo Picasso', 'Salvador Dalí'] },
    TR: { q: '“Yıldızlı Gece” tablosunu kim yaptı?', a: ['Vincent van Gogh', 'Claude Monet', 'Pablo Picasso', 'Salvador Dalí'] },
    RU: { q: 'Кто написал картину «Звёздная ночь»?', a: ['Винсент Ван Гог', 'Клод Моне', 'Пабло Пикассо', 'Сальвадор Дали'] },
    KK: { q: '«Жұлдызды түн» картинасын кім салған?', a: ['Винсент Ван Гог', 'Клод Моне', 'Пабло Пикассо', 'Сальвадор Дали'] }
  },
  {
    level: 2, topic: 'geo',
    EN: { q: 'Which city was the capital of Kazakhstan before Astana?', a: ['Almaty', 'Shymkent', 'Karaganda', 'Taraz'] },
    TR: { q: 'Astana’dan önce Kazakistan’ın başkenti hangi şehirdi?', a: ['Almatı', 'Çimkent', 'Karaganda', 'Taraz'] },
    RU: { q: 'Какой город был столицей Казахстана до Астаны?', a: ['Алматы', 'Шымкент', 'Караганда', 'Тараз'] },
    KK: { q: 'Астанаға дейін Қазақстанның астанасы қай қала болған?', a: ['Алматы', 'Шымкент', 'Қарағанды', 'Тараз'] }
  },
  {
    level: 2, topic: 'geo',
    EN: { q: 'Which mountains are usually taken as the border between Europe and Asia?', a: ['The Urals', 'The Caucasus', 'The Alps', 'The Altai'] },
    TR: { q: 'Avrupa ile Asya arasındaki sınır genellikle hangi dağlar kabul edilir?', a: ['Ural Dağları', 'Kafkas Dağları', 'Alpler', 'Altay Dağları'] },
    RU: { q: 'Какие горы обычно считают границей Европы и Азии?', a: ['Уральские горы', 'Кавказ', 'Альпы', 'Алтай'] },
    KK: { q: 'Әдетте Еуропа мен Азияның шекарасы қай таулар деп саналады?', a: ['Орал таулары', 'Кавказ', 'Альпі', 'Алтай'] }
  },
  {
    level: 2, topic: 'science',
    EN: { q: 'Which organs filter the blood and make urine?', a: ['The kidneys', 'The liver', 'The heart', 'The lungs'] },
    TR: { q: 'Kanı süzüp idrar oluşturan organlar hangileridir?', a: ['Böbrekler', 'Karaciğer', 'Kalp', 'Akciğerler'] },
    RU: { q: 'Какие органы фильтруют кровь и образуют мочу?', a: ['Почки', 'Печень', 'Сердце', 'Лёгкие'] },
    KK: { q: 'Қанды сүзіп, несеп түзетін мүшелер қайсы?', a: ['Бүйрек', 'Бауыр', 'Жүрек', 'Өкпе'] }
  },
  {
    level: 2, topic: 'sport',
    EN: { q: 'How many pieces does each player have at the start of a chess game?', a: ['16', '12', '18', '20'] },
    TR: { q: 'Satranç oyununun başında her oyuncunun kaç taşı vardır?', a: ['16', '12', '18', '20'] },
    RU: { q: 'Сколько фигур у каждого игрока в начале шахматной партии?', a: ['16', '12', '18', '20'] },
    KK: { q: 'Шахмат ойынының басында әр ойыншының неше фигурасы болады?', a: ['16', '12', '18', '20'] }
  },
  {
    level: 2, topic: 'sport',
    EN: { q: 'Which chess piece moves only diagonally?', a: ['The bishop', 'The rook', 'The knight', 'The king'] },
    TR: { q: 'Satrançta yalnızca çapraz giden taş hangisidir?', a: ['Fil', 'Kale', 'At', 'Şah'] },
    RU: { q: 'Какая шахматная фигура ходит только по диагонали?', a: ['Слон', 'Ладья', 'Конь', 'Король'] },
    KK: { q: 'Шахматта тек диагональ бойымен жүретін фигура қайсы?', a: ['Піл', 'Тура', 'Ат', 'Патша'] }
  },
  {
    level: 2, topic: 'geo',
    EN: { q: 'Which country is called the “Land of the Rising Sun”?', a: ['Japan', 'China', 'Korea', 'Thailand'] },
    TR: { q: '“Doğan Güneşin Ülkesi” olarak anılan ülke hangisidir?', a: ['Japonya', 'Çin', 'Kore', 'Tayland'] },
    RU: { q: 'Какую страну называют «Страной восходящего солнца»?', a: ['Японию', 'Китай', 'Корею', 'Таиланд'] },
    KK: { q: 'Қай елді «Күн шығыс елі» деп атайды?', a: ['Жапония', 'Қытай', 'Корея', 'Тайланд'] }
  },
  {
    level: 2, topic: 'science',
    EN: { q: 'Who created the periodic table of the elements?', a: ['Dmitri Mendeleev', 'Antoine Lavoisier', 'Niels Bohr', 'John Dalton'] },
    TR: { q: 'Elementlerin periyodik tablosunu kim oluşturdu?', a: ['Dmitriy Mendeleyev', 'Antoine Lavoisier', 'Niels Bohr', 'John Dalton'] },
    RU: { q: 'Кто создал периодическую таблицу химических элементов?', a: ['Дмитрий Менделеев', 'Антуан Лавуазье', 'Нильс Бор', 'Джон Дальтон'] },
    KK: { q: 'Химиялық элементтердің периодтық кестесін кім жасаған?', a: ['Дмитрий Менделеев', 'Антуан Лавуазье', 'Нильс Бор', 'Джон Дальтон'] }
  },
  {
    level: 2, topic: 'geo',
    EN: { q: 'Which body of water is so salty that people float in it easily?', a: ['The Dead Sea', 'The Black Sea', 'The Red Sea', 'The Baltic Sea'] },
    TR: { q: 'İnsanların kolayca yüzeyde kaldığı çok tuzlu su hangisidir?', a: ['Lut Gölü (Ölü Deniz)', 'Karadeniz', 'Kızıldeniz', 'Baltık Denizi'] },
    RU: { q: 'В каком водоёме вода настолько солёная, что человек легко держится на поверхности?', a: ['Мёртвое море', 'Чёрное море', 'Красное море', 'Балтийское море'] },
    KK: { q: 'Қай су айдыны соншалықты тұзды, онда адам оңай қалқып жүреді?', a: ['Өлі теңіз', 'Қара теңіз', 'Қызыл теңіз', 'Балтық теңізі'] }
  },
  {
    level: 2, topic: 'geo',
    EN: { q: 'Which leaf is on the flag of Canada?', a: ['Maple', 'Oak', 'Birch', 'Pine'] },
    TR: { q: 'Kanada bayrağında hangi ağacın yaprağı vardır?', a: ['Akçaağaç', 'Meşe', 'Huş', 'Çam'] },
    RU: { q: 'Лист какого дерева изображён на флаге Канады?', a: ['Клёна', 'Дуба', 'Берёзы', 'Сосны'] },
    KK: { q: 'Канада туында қай ағаштың жапырағы бейнеленген?', a: ['Үйеңкі', 'Емен', 'Қайың', 'Қарағай'] }
  },
  {
    level: 2, topic: 'geo',
    EN: { q: 'How many stars are on the flag of the USA?', a: ['50', '48', '51', '13'] },
    TR: { q: 'ABD bayrağında kaç yıldız vardır?', a: ['50', '48', '51', '13'] },
    RU: { q: 'Сколько звёзд на флаге США?', a: ['50', '48', '51', '13'] },
    KK: { q: 'АҚШ туында неше жұлдыз бар?', a: ['50', '48', '51', '13'] }
  },
  {
    level: 2, topic: 'history',
    EN: { q: 'What is shown in the middle of the flag of Kazakhstan?', a: ['A sun with a soaring eagle', 'A crescent', 'A star', 'A wolf'] },
    TR: { q: 'Kazakistan bayrağının ortasında ne vardır?', a: ['Güneş ve süzülen bir kartal', 'Hilal', 'Yıldız', 'Kurt'] },
    RU: { q: 'Что изображено в центре флага Казахстана?', a: ['Солнце и парящий беркут', 'Полумесяц', 'Звезда', 'Волк'] },
    KK: { q: 'Қазақстан туының ортасында не бейнеленген?', a: ['Күн және қалықтаған бүркіт', 'Жарты ай', 'Жұлдыз', 'Қасқыр'] }
  },
  {
    level: 2, topic: 'music',
    EN: { q: 'Which plucked, two-stringed lute is Kazakhstan’s national instrument?', a: ['Dombra', 'Kobyz', 'Sybyzgy', 'Zhetigen'] },
    TR: { q: 'Kazakistan’ın ulusal çalgısı olan, parmakla çalınan iki telli saz hangisidir?', a: ['Dombra', 'Kıl kobız', 'Sıbızgı', 'Jetigen'] },
    RU: { q: 'Какой щипковый двухструнный инструмент считается национальным в Казахстане?', a: ['Домбра', 'Кобыз', 'Сыбызгы', 'Жетиген'] },
    KK: { q: 'Қазақтың ұлттық аспабы болып саналатын шертіп ойналатын екі ішекті аспап қайсы?', a: ['Домбыра', 'Қобыз', 'Сыбызғы', 'Жетіген'] }
  },
  {
    level: 2, topic: 'music',
    EN: { q: 'Which Turkish instrument is also called “saz”?', a: ['Bağlama', 'Kanun', 'Ney', 'Darbuka'] },
    TR: { q: 'Halk arasında “saz” da denen Türk çalgısı hangisidir?', a: ['Bağlama', 'Kanun', 'Ney', 'Darbuka'] },
    RU: { q: 'Какой турецкий инструмент называют ещё «саз»?', a: ['Багляма', 'Канун', 'Ней', 'Дарбука'] },
    KK: { q: 'Түркияда «саз» деп те аталатын аспап қайсы?', a: ['Бағлама', 'Канун', 'Ней', 'Дарбука'] }
  },
  {
    level: 2, topic: 'music',
    EN: { q: 'Which composer wrote the ballet “Swan Lake”?', a: ['Pyotr Tchaikovsky', 'Sergei Rachmaninoff', 'Nikolai Rimsky-Korsakov', 'Modest Mussorgsky'] },
    TR: { q: '“Kuğu Gölü” balesini hangi besteci yazdı?', a: ['Pyotr Çaykovski', 'Sergey Rahmaninov', 'Nikolay Rimski-Korsakov', 'Modest Musorgski'] },
    RU: { q: 'Кто написал балет «Лебединое озеро»?', a: ['Пётр Чайковский', 'Сергей Рахманинов', 'Николай Римский-Корсаков', 'Модест Мусоргский'] },
    KK: { q: '«Аққу көлі» балетін кім жазған?', a: ['Петр Чайковский', 'Сергей Рахманинов', 'Николай Римский-Корсаков', 'Модест Мусоргский'] }
  },
  {
    level: 2, topic: 'history',
    EN: { q: 'Which empire did Genghis Khan found?', a: ['The Mongol Empire', 'The Ottoman Empire', 'The Persian Empire', 'The Roman Empire'] },
    TR: { q: 'Cengiz Han hangi imparatorluğu kurdu?', a: ['Moğol İmparatorluğu', 'Osmanlı İmparatorluğu', 'Pers İmparatorluğu', 'Roma İmparatorluğu'] },
    RU: { q: 'Какую империю основал Чингисхан?', a: ['Монгольскую империю', 'Османскую империю', 'Персидскую империю', 'Римскую империю'] },
    KK: { q: 'Шыңғыс хан қай империяның негізін қалады?', a: ['Моңғол империясы', 'Осман империясы', 'Парсы империясы', 'Рим империясы'] }
  },
  {
    level: 2, topic: 'history',
    EN: { q: 'What was the capital of the Byzantine Empire?', a: ['Constantinople', 'Rome', 'Athens', 'Antioch'] },
    TR: { q: 'Bizans İmparatorluğu’nun başkenti neresiydi?', a: ['Konstantinopolis', 'Roma', 'Atina', 'Antakya'] },
    RU: { q: 'Какой город был столицей Византийской империи?', a: ['Константинополь', 'Рим', 'Афины', 'Антиохия'] },
    KK: { q: 'Византия империясының астанасы қай қала болған?', a: ['Константинополь', 'Рим', 'Афины', 'Антиохия'] }
  },
  {
    level: 2, topic: 'history',
    EN: { q: 'Which city did Peter the Great found as Russia’s new capital?', a: ['Saint Petersburg', 'Moscow', 'Novgorod', 'Kazan'] },
    TR: { q: 'Büyük Petro hangi şehri Rusya’nın yeni başkenti olarak kurdu?', a: ['St. Petersburg', 'Moskova', 'Novgorod', 'Kazan'] },
    RU: { q: 'Какой город Пётр I основал как новую столицу России?', a: ['Санкт-Петербург', 'Москву', 'Новгород', 'Казань'] },
    KK: { q: 'І Петр Ресейдің жаңа астанасы ретінде қай қаланы салдырды?', a: ['Санкт-Петербург', 'Мәскеу', 'Новгород', 'Қазан'] }
  },
  {
    level: 2, topic: 'history',
    EN: { q: 'In which year did the Berlin Wall fall?', a: ['1989', '1991', '1985', '1961'] },
    TR: { q: 'Berlin Duvarı hangi yıl yıkıldı?', a: ['1989', '1991', '1985', '1961'] },
    RU: { q: 'В каком году пала Берлинская стена?', a: ['1989', '1991', '1985', '1961'] },
    KK: { q: 'Берлин қабырғасы қай жылы құлады?', a: ['1989', '1991', '1985', '1961'] }
  },
  {
    level: 2, topic: 'history',
    EN: { q: 'In which year was the Republic of Turkey proclaimed?', a: ['1923', '1920', '1919', '1938'] },
    TR: { q: 'Türkiye Cumhuriyeti hangi yıl ilan edildi?', a: ['1923', '1920', '1919', '1938'] },
    RU: { q: 'В каком году была провозглашена Турецкая Республика?', a: ['1923', '1920', '1919', '1938'] },
    KK: { q: 'Түркия Республикасы қай жылы жарияланды?', a: ['1923', '1920', '1919', '1938'] }
  },
  {
    level: 2, topic: 'history',
    EN: { q: 'In which year did Kazakhstan declare independence?', a: ['1991', '1990', '1992', '1993'] },
    TR: { q: 'Kazakistan hangi yıl bağımsızlığını ilan etti?', a: ['1991', '1990', '1992', '1993'] },
    RU: { q: 'В каком году Казахстан провозгласил независимость?', a: ['1991', '1990', '1992', '1993'] },
    KK: { q: 'Қазақстан тәуелсіздігін қай жылы жариялады?', a: ['1991', '1990', '1992', '1993'] }
  },
  {
    level: 2, topic: 'space',
    EN: { q: 'In which year did people first land on the Moon?', a: ['1969', '1965', '1972', '1959'] },
    TR: { q: 'İnsanlar Ay’a ilk kez hangi yıl indi?', a: ['1969', '1965', '1972', '1959'] },
    RU: { q: 'В каком году люди впервые высадились на Луну?', a: ['1969', '1965', '1972', '1959'] },
    KK: { q: 'Адамдар Айға алғаш рет қай жылы қонды?', a: ['1969', '1965', '1972', '1959'] }
  },
  {
    level: 2, topic: 'history',
    EN: { q: 'Who was the first President of Kazakhstan?', a: ['Nursultan Nazarbayev', 'Kassym-Jomart Tokayev', 'Dinmukhamed Kunayev', 'Askar Akayev'] },
    TR: { q: 'Kazakistan’ın ilk cumhurbaşkanı kimdir?', a: ['Nursultan Nazarbayev', 'Kasım Cömert Tokayev', 'Dinmuhammed Kunayev', 'Askar Akayev'] },
    RU: { q: 'Кто был первым президентом Казахстана?', a: ['Нурсултан Назарбаев', 'Касым-Жомарт Токаев', 'Динмухамед Кунаев', 'Аскар Акаев'] },
    KK: { q: 'Қазақстанның тұңғыш президенті кім?', a: ['Нұрсұлтан Назарбаев', 'Қасым-Жомарт Тоқаев', 'Дінмұхамед Қонаев', 'Асқар Ақаев'] }
  },
  {
    level: 2, topic: 'history',
    EN: { q: 'Which Ottoman sultan conquered Constantinople?', a: ['Mehmed II, the Conqueror', 'Suleiman the Magnificent', 'Selim I', 'Murad II'] },
    TR: { q: 'İstanbul’u fetheden Osmanlı padişahı kimdir?', a: ['Fatih Sultan Mehmed', 'Kanuni Sultan Süleyman', 'Yavuz Sultan Selim', 'II. Murad'] },
    RU: { q: 'Какой османский султан завоевал Константинополь?', a: ['Мехмед II Завоеватель', 'Сулейман Великолепный', 'Селим I', 'Мурад II'] },
    KK: { q: 'Константинопольді қай осман сұлтаны жаулап алды?', a: ['Мехмед II Фатих', 'Сүлеймен Кануни', 'Селим I', 'Мурад II'] }
  },
  {
    level: 2, topic: 'art',
    EN: { q: 'In which city is the Hermitage Museum?', a: ['Saint Petersburg', 'Moscow', 'Paris', 'Vienna'] },
    TR: { q: 'Ermitaj Müzesi hangi şehirdedir?', a: ['St. Petersburg', 'Moskova', 'Paris', 'Viyana'] },
    RU: { q: 'В каком городе находится Эрмитаж?', a: ['В Санкт-Петербурге', 'В Москве', 'В Париже', 'В Вене'] },
    KK: { q: 'Эрмитаж мұражайы қай қалада орналасқан?', a: ['Санкт-Петербург', 'Мәскеу', 'Париж', 'Вена'] }
  },
  {
    level: 2, topic: 'science',
    EN: { q: 'Which particle has a negative electric charge?', a: ['Electron', 'Proton', 'Neutron', 'Photon'] },
    TR: { q: 'Hangi parçacık negatif elektrik yüklüdür?', a: ['Elektron', 'Proton', 'Nötron', 'Foton'] },
    RU: { q: 'Какая частица имеет отрицательный заряд?', a: ['Электрон', 'Протон', 'Нейтрон', 'Фотон'] },
    KK: { q: 'Қай бөлшектің заряды теріс?', a: ['Электрон', 'Протон', 'Нейтрон', 'Фотон'] }
  },
  {
    level: 2, topic: 'science',
    EN: { q: 'Who formulated the law of universal gravitation?', a: ['Isaac Newton', 'Galileo Galilei', 'Johannes Kepler', 'Albert Einstein'] },
    TR: { q: 'Evrensel çekim yasasını kim ortaya koydu?', a: ['Isaac Newton', 'Galileo Galilei', 'Johannes Kepler', 'Albert Einstein'] },
    RU: { q: 'Кто сформулировал закон всемирного тяготения?', a: ['Исаак Ньютон', 'Галилео Галилей', 'Иоганн Кеплер', 'Альберт Эйнштейн'] },
    KK: { q: 'Бүкіләлемдік тартылыс заңын кім тұжырымдаған?', a: ['Исаак Ньютон', 'Галилео Галилей', 'Иоганн Кеплер', 'Альберт Эйнштейн'] }
  },
  {
    level: 2, topic: 'science',
    EN: { q: 'How many chambers does the human heart have?', a: ['4', '2', '3', '6'] },
    TR: { q: 'İnsan kalbinin kaç odacığı vardır?', a: ['4', '2', '3', '6'] },
    RU: { q: 'Сколько камер в сердце человека?', a: ['4', '2', '3', '6'] },
    KK: { q: 'Адам жүрегі неше бөліктен (қуыстан) тұрады?', a: ['4', '2', '3', '6'] }
  },
  {
    level: 2, topic: 'space',
    EN: { q: 'What is the name of our galaxy?', a: ['The Milky Way', 'Andromeda', 'Triangulum', 'Whirlpool'] },
    TR: { q: 'Galaksimizin adı nedir?', a: ['Samanyolu', 'Andromeda', 'Üçgen', 'Girdap'] },
    RU: { q: 'Как называется наша галактика?', a: ['Млечный Путь', 'Андромеда', 'Треугольник', 'Водоворот'] },
    KK: { q: 'Біздің галактикамыз қалай аталады?', a: ['Құс жолы', 'Андромеда', 'Үшбұрыш', 'Құйын'] }
  },
  {
    level: 2, topic: 'tech',
    EN: { q: 'What does “CPU” stand for?', a: ['Central Processing Unit', 'Computer Personal Unit', 'Central Program Utility', 'Control Power Unit'] },
    TR: { q: '“CPU” neyin kısaltmasıdır?', a: ['Central Processing Unit (merkezi işlem birimi)', 'Computer Personal Unit', 'Central Program Utility', 'Control Power Unit'] },
    RU: { q: 'Что означает сокращение «CPU»?', a: ['Central Processing Unit (центральный процессор)', 'Computer Personal Unit', 'Central Program Utility', 'Control Power Unit'] },
    KK: { q: '«CPU» қысқартуы нені білдіреді?', a: ['Central Processing Unit (орталық процессор)', 'Computer Personal Unit', 'Central Program Utility', 'Control Power Unit'] }
  },
  {
    level: 2, topic: 'tech',
    EN: { q: 'Who founded Microsoft together with Paul Allen?', a: ['Bill Gates', 'Steve Jobs', 'Mark Zuckerberg', 'Larry Page'] },
    TR: { q: 'Microsoft’u Paul Allen ile birlikte kim kurdu?', a: ['Bill Gates', 'Steve Jobs', 'Mark Zuckerberg', 'Larry Page'] },
    RU: { q: 'Кто основал Microsoft вместе с Полом Алленом?', a: ['Билл Гейтс', 'Стив Джобс', 'Марк Цукерберг', 'Ларри Пейдж'] },
    KK: { q: 'Microsoft компаниясын Пол Алленмен бірге кім құрды?', a: ['Билл Гейтс', 'Стив Джобс', 'Марк Цукерберг', 'Ларри Пейдж'] }
  },
  {
    level: 2, topic: 'tech',
    EN: { q: 'How many bits are in a byte?', a: ['8', '4', '16', '10'] },
    TR: { q: 'Bir baytta kaç bit vardır?', a: ['8', '4', '16', '10'] },
    RU: { q: 'Сколько бит в одном байте?', a: ['8', '4', '16', '10'] },
    KK: { q: 'Бір байтта неше бит бар?', a: ['8', '4', '16', '10'] }
  },
  {
    level: 2, topic: 'math',
    EN: { q: 'What is π rounded to two decimal places?', a: ['3.14', '3.41', '3.12', '3.16'] },
    TR: { q: 'π sayısının virgülden sonra iki basamağa yuvarlanmış değeri nedir?', a: ['3,14', '3,41', '3,12', '3,16'] },
    RU: { q: 'Чему равно число π, округлённое до сотых?', a: ['3,14', '3,41', '3,12', '3,16'] },
    KK: { q: 'Жүздік үлеске дейін дөңгелектенген π саны нешеге тең?', a: ['3,14', '3,41', '3,12', '3,16'] }
  },
  {
    level: 2, topic: 'math',
    EN: { q: 'What is 15% of 200?', a: ['30', '15', '20', '35'] },
    TR: { q: '200’ün %15’i kaçtır?', a: ['30', '15', '20', '35'] },
    RU: { q: 'Сколько составляет 15% от 200?', a: ['30', '15', '20', '35'] },
    KK: { q: '200-дің 15%-ы неше болады?', a: ['30', '15', '20', '35'] }
  },
  {
    level: 2, topic: 'sport',
    EN: { q: 'Which country has won the most FIFA World Cups?', a: ['Brazil', 'Germany', 'Italy', 'Argentina'] },
    TR: { q: 'En çok FIFA Dünya Kupası kazanan ülke hangisidir?', a: ['Brezilya', 'Almanya', 'İtalya', 'Arjantin'] },
    RU: { q: 'Какая страна чаще всех выигрывала чемпионат мира по футболу?', a: ['Бразилия', 'Германия', 'Италия', 'Аргентина'] },
    KK: { q: 'Футболдан әлем чемпионатын ең көп жеңген ел қайсы?', a: ['Бразилия', 'Германия', 'Италия', 'Аргентина'] }
  },
  {
    level: 2, topic: 'sport',
    EN: { q: 'The Tour de France is a race in which sport?', a: ['Cycling', 'Running', 'Motor racing', 'Rowing'] },
    TR: { q: 'Fransa Bisiklet Turu (Tour de France) hangi sporun yarışıdır?', a: ['Bisiklet', 'Koşu', 'Otomobil yarışı', 'Kürek'] },
    RU: { q: '«Тур де Франс» — это гонка в каком виде спорта?', a: ['Велоспорт', 'Бег', 'Автогонки', 'Гребля'] },
    KK: { q: '«Тур де Франс» — қай спорт түрінің жарысы?', a: ['Велоспорт', 'Жүгіру', 'Автожарыс', 'Ескек есу'] }
  },
  {
    level: 2, topic: 'nature',
    EN: { q: 'Which is the largest living bird?', a: ['Ostrich', 'Emu', 'Eagle', 'Albatross'] },
    TR: { q: 'Yaşayan en büyük kuş hangisidir?', a: ['Devekuşu', 'Emu', 'Kartal', 'Albatros'] },
    RU: { q: 'Какая птица самая крупная из ныне живущих?', a: ['Страус', 'Эму', 'Орёл', 'Альбатрос'] },
    KK: { q: 'Қазір тіршілік ететін ең ірі құс қайсы?', a: ['Түйеқұс', 'Эму', 'Бүркіт', 'Альбатрос'] }
  },
  {
    level: 2, topic: 'nature',
    EN: { q: 'Which mammal can truly fly?', a: ['The bat', 'The flying squirrel', 'The flying fish', 'The sugar glider'] },
    TR: { q: 'Gerçekten uçabilen memeli hangisidir?', a: ['Yarasa', 'Uçan sincap', 'Uçan balık', 'Şeker planörü'] },
    RU: { q: 'Какое млекопитающее умеет по-настоящему летать?', a: ['Летучая мышь', 'Белка-летяга', 'Летучая рыба', 'Сахарный летающий поссум'] },
    KK: { q: 'Шын мәнінде ұша алатын сүтқоректі қайсы?', a: ['Жарқанат', 'Ұшар тиін', 'Ұшқыш балық', 'Қант поссумы'] }
  },
  {
    level: 2, topic: 'food',
    EN: { q: 'What is the main ingredient of hummus?', a: ['Chickpeas', 'Lentils', 'Beans', 'Peas'] },
    TR: { q: 'Humusun ana malzemesi nedir?', a: ['Nohut', 'Mercimek', 'Fasulye', 'Bezelye'] },
    RU: { q: 'Что главный ингредиент хумуса?', a: ['Нут', 'Чечевица', 'Фасоль', 'Горох'] },
    KK: { q: 'Хумустың негізгі құрамы не?', a: ['Ноқат', 'Жасымық', 'Бұршақ', 'Асбұршақ'] }
  },
  {
    level: 2, topic: 'food',
    EN: { q: 'What does the name of the Kazakh dish “beshbarmak” mean?', a: ['Five fingers', 'Five meats', 'Big plate', 'Hot soup'] },
    TR: { q: 'Kazak yemeği “beşbarmak”ın adı ne demektir?', a: ['Beş parmak', 'Beş et', 'Büyük tabak', 'Sıcak çorba'] },
    RU: { q: 'Что означает название казахского блюда «бешбармак»?', a: ['Пять пальцев', 'Пять видов мяса', 'Большое блюдо', 'Горячий суп'] },
    KK: { q: '«Бешбармақ» (ет) атауы нені білдіреді?', a: ['Бес саусақ', 'Бес түрлі ет', 'Үлкен табақ', 'Ыстық сорпа'] }
  },
  {
    level: 2, topic: 'language',
    EN: { q: 'How many letters are in the Turkish alphabet?', a: ['29', '26', '28', '33'] },
    TR: { q: 'Türk alfabesinde kaç harf vardır?', a: ['29', '26', '28', '33'] },
    RU: { q: 'Сколько букв в турецком алфавите?', a: ['29', '26', '28', '33'] },
    KK: { q: 'Түрік әліпбиінде неше әріп бар?', a: ['29', '26', '28', '33'] }
  },
  {
    level: 2, topic: 'language',
    EN: { q: 'How many letters are in the Russian alphabet?', a: ['33', '30', '32', '36'] },
    TR: { q: 'Rus alfabesinde kaç harf vardır?', a: ['33', '30', '32', '36'] },
    RU: { q: 'Сколько букв в русском алфавите?', a: ['33', '30', '32', '36'] },
    KK: { q: 'Орыс әліпбиінде неше әріп бар?', a: ['33', '30', '32', '36'] }
  },
  {
    level: 2, topic: 'geo',
    EN: { q: 'Which river flows through Cairo?', a: ['The Nile', 'The Tigris', 'The Euphrates', 'The Congo'] },
    TR: { q: 'Kahire’den hangi nehir geçer?', a: ['Nil', 'Dicle', 'Fırat', 'Kongo'] },
    RU: { q: 'Какая река течёт через Каир?', a: ['Нил', 'Тигр', 'Евфрат', 'Конго'] },
    KK: { q: 'Каир арқылы қай өзен ағады?', a: ['Ніл', 'Тигр', 'Евфрат', 'Конго'] }
  },
  {
    level: 2, topic: 'geo',
    EN: { q: 'Which strait runs through Istanbul?', a: ['The Bosphorus', 'The Dardanelles', 'The Strait of Gibraltar', 'The Strait of Hormuz'] },
    TR: { q: 'İstanbul’un içinden hangi boğaz geçer?', a: ['İstanbul Boğazı', 'Çanakkale Boğazı', 'Cebelitarık Boğazı', 'Hürmüz Boğazı'] },
    RU: { q: 'Какой пролив проходит через Стамбул?', a: ['Босфор', 'Дарданеллы', 'Гибралтарский пролив', 'Ормузский пролив'] },
    KK: { q: 'Ыстамбұл арқылы қай бұғаз өтеді?', a: ['Босфор', 'Дарданелл', 'Гибралтар бұғазы', 'Ормуз бұғазы'] }
  },
  {
    level: 2, topic: 'geo',
    EN: { q: 'In which part of Russia is Lake Baikal?', a: ['Siberia', 'The Urals', 'The Caucasus', 'Kamchatka'] },
    TR: { q: 'Baykal Gölü Rusya’nın hangi bölgesindedir?', a: ['Sibirya', 'Ural', 'Kafkasya', 'Kamçatka'] },
    RU: { q: 'В какой части России находится озеро Байкал?', a: ['В Сибири', 'На Урале', 'На Кавказе', 'На Камчатке'] },
    KK: { q: 'Байкал көлі Ресейдің қай бөлігінде орналасқан?', a: ['Сібір', 'Орал', 'Кавказ', 'Камчатка'] }
  },
  {
    level: 2, topic: 'geo',
    EN: { q: 'What is the capital of Egypt?', a: ['Cairo', 'Alexandria', 'Giza', 'Luxor'] },
    TR: { q: 'Mısır’ın başkenti neresidir?', a: ['Kahire', 'İskenderiye', 'Giza', 'Luksor'] },
    RU: { q: 'Какой город — столица Египта?', a: ['Каир', 'Александрия', 'Гиза', 'Луксор'] },
    KK: { q: 'Мысырдың астанасы қай қала?', a: ['Каир', 'Александрия', 'Гиза', 'Луксор'] }
  },
  {
    level: 3, topic: 'space',
    EN: { q: 'From which cosmodrome did Yuri Gagarin launch?', a: ['Baikonur', 'Plesetsk', 'Cape Canaveral', 'Vostochny'] },
    TR: { q: 'Yuri Gagarin hangi uzay üssünden fırlatıldı?', a: ['Baykonur', 'Pleseçk', 'Cape Canaveral', 'Vostoçnıy'] },
    RU: { q: 'С какого космодрома стартовал Юрий Гагарин?', a: ['Байконур', 'Плесецк', 'Мыс Канаверал', 'Восточный'] },
    KK: { q: 'Юрий Гагарин қай ғарыш айлағынан ұшты?', a: ['Байқоңыр', 'Плесецк', 'Канаверал мүйісі', 'Восточный'] }
  },
  {
    level: 3, topic: 'music',
    EN: { q: 'How many strings does a standard violin have?', a: ['4', '5', '6', '3'] },
    TR: { q: 'Standart bir kemanın kaç teli vardır?', a: ['4', '5', '6', '3'] },
    RU: { q: 'Сколько струн у обычной скрипки?', a: ['4', '5', '6', '3'] },
    KK: { q: 'Кәдімгі скрипканың неше ішегі бар?', a: ['4', '5', '6', '3'] }
  },
  {
    level: 3, topic: 'geo',
    EN: { q: 'Which is the largest lake in the world by area?', a: ['The Caspian Sea', 'Lake Superior', 'Lake Victoria', 'Lake Baikal'] },
    TR: { q: 'Yüz ölçümüne göre dünyanın en büyük gölü hangisidir?', a: ['Hazar Denizi', 'Superior Gölü', 'Victoria Gölü', 'Baykal Gölü'] },
    RU: { q: 'Какое озеро самое большое в мире по площади?', a: ['Каспийское море', 'Верхнее озеро', 'Озеро Виктория', 'Байкал'] },
    KK: { q: 'Ауданы бойынша әлемдегі ең үлкен көл қайсы?', a: ['Каспий теңізі', 'Жоғарғы көл', 'Виктория көлі', 'Байкал'] }
  },
  {
    level: 3, topic: 'geo',
    EN: { q: 'Which is the deepest lake in the world?', a: ['Lake Baikal', 'The Caspian Sea', 'Lake Tanganyika', 'Lake Superior'] },
    TR: { q: 'Dünyanın en derin gölü hangisidir?', a: ['Baykal Gölü', 'Hazar Denizi', 'Tanganika Gölü', 'Superior Gölü'] },
    RU: { q: 'Какое озеро самое глубокое в мире?', a: ['Байкал', 'Каспийское море', 'Танганьика', 'Верхнее озеро'] },
    KK: { q: 'Әлемдегі ең терең көл қайсы?', a: ['Байкал', 'Каспий теңізі', 'Танганьика', 'Жоғарғы көл'] }
  },
  {
    level: 3, topic: 'nature',
    EN: { q: 'How many hearts does an octopus have?', a: ['3', '1', '2', '8'] },
    TR: { q: 'Bir ahtapotun kaç kalbi vardır?', a: ['3', '1', '2', '8'] },
    RU: { q: 'Сколько сердец у осьминога?', a: ['3', '1', '2', '8'] },
    KK: { q: 'Сегізаяқтың неше жүрегі бар?', a: ['3', '1', '2', '8'] }
  },
  {
    level: 3, topic: 'history',
    EN: { q: 'Which country gave the Statue of Liberty to the USA?', a: ['France', 'England', 'Spain', 'Italy'] },
    TR: { q: 'Özgürlük Heykeli’ni ABD’ye hangi ülke hediye etti?', a: ['Fransa', 'İngiltere', 'İspanya', 'İtalya'] },
    RU: { q: 'Какая страна подарила США статую Свободы?', a: ['Франция', 'Англия', 'Испания', 'Италия'] },
    KK: { q: 'Бостандық мүсінін АҚШ-қа қай ел сыйға тартты?', a: ['Франция', 'Англия', 'Испания', 'Италия'] }
  },
  {
    level: 3, topic: 'geo',
    EN: { q: 'Which is the longest river flowing through Kazakhstan?', a: ['The Irtysh', 'The Ili', 'The Syr Darya', 'The Ural'] },
    TR: { q: 'Kazakistan’dan geçen en uzun nehir hangisidir?', a: ['İrtiş', 'İli', 'Seyhun (Sirderya)', 'Ural'] },
    RU: { q: 'Какая самая длинная река, протекающая по Казахстану?', a: ['Иртыш', 'Или', 'Сырдарья', 'Урал'] },
    KK: { q: 'Қазақстан арқылы ағатын ең ұзын өзен қайсы?', a: ['Ертіс', 'Іле', 'Сырдария', 'Жайық'] }
  },
  {
    level: 3, topic: 'language',
    EN: { q: 'What is a word that reads the same backwards, like “level”, called?', a: ['A palindrome', 'An anagram', 'A synonym', 'An acronym'] },
    TR: { q: '“Kazak” gibi tersten de aynı okunan sözcüğe ne denir?', a: ['Palindrom', 'Anagram', 'Eş anlamlı', 'Kısaltma'] },
    RU: { q: 'Как называется слово, которое одинаково читается в обе стороны, например «шалаш»?', a: ['Палиндром', 'Анаграмма', 'Синоним', 'Аббревиатура'] },
    KK: { q: '«Қазақ» сияқты екі жағынан да бірдей оқылатын сөз қалай аталады?', a: ['Палиндром', 'Анаграмма', 'Синоним', 'Аббревиатура'] }
  },
  {
    level: 3, topic: 'literature',
    EN: { q: 'Who wrote the “Book of Words” (Qara sözder), a classic of Kazakh literature?', a: ['Abai Kunanbayev', 'Mukhtar Auezov', 'Shokan Valikhanov', 'Ybyrai Altynsarin'] },
    TR: { q: 'Kazak edebiyatının klasiği “Kara Sözler”i kim yazdı?', a: ['Abay Kunanbayev', 'Muhtar Avezov', 'Şokan Velihanov', 'İbray Altınsarin'] },
    RU: { q: 'Кто написал «Слова назидания» (Қара сөздер), классику казахской литературы?', a: ['Абай Кунанбаев', 'Мухтар Ауэзов', 'Чокан Валиханов', 'Ыбырай Алтынсарин'] },
    KK: { q: 'Қазақ әдебиетінің классикасы «Қара сөздерді» кім жазған?', a: ['Абай Құнанбайұлы', 'Мұхтар Әуезов', 'Шоқан Уәлиханов', 'Ыбырай Алтынсарин'] }
  },
  {
    level: 3, topic: 'science',
    EN: { q: 'Which gas makes up most of Earth’s atmosphere?', a: ['Nitrogen', 'Oxygen', 'Carbon dioxide', 'Argon'] },
    TR: { q: 'Dünya atmosferinin büyük kısmını hangi gaz oluşturur?', a: ['Azot', 'Oksijen', 'Karbondioksit', 'Argon'] },
    RU: { q: 'Какой газ составляет большую часть атмосферы Земли?', a: ['Азот', 'Кислород', 'Углекислый газ', 'Аргон'] },
    KK: { q: 'Жер атмосферасының басым бөлігін қай газ құрайды?', a: ['Азот', 'Оттегі', 'Көмірқышқыл газы', 'Аргон'] }
  },
  {
    level: 3, topic: 'science',
    EN: { q: 'Roughly how fast does light travel?', a: ['About 300,000 km/s', 'About 30,000 km/s', 'About 3,000,000 km/s', 'About 3,000 km/s'] },
    TR: { q: 'Işık yaklaşık olarak ne hızla yol alır?', a: ['Yaklaşık 300.000 km/sn', 'Yaklaşık 30.000 km/sn', 'Yaklaşık 3.000.000 km/sn', 'Yaklaşık 3.000 km/sn'] },
    RU: { q: 'Примерно с какой скоростью распространяется свет?', a: ['Около 300 000 км/с', 'Около 30 000 км/с', 'Около 3 000 000 км/с', 'Около 3 000 км/с'] },
    KK: { q: 'Жарық шамамен қандай жылдамдықпен таралады?', a: ['Шамамен 300 000 км/с', 'Шамамен 30 000 км/с', 'Шамамен 3 000 000 км/с', 'Шамамен 3 000 км/с'] }
  },
  {
    level: 3, topic: 'space',
    EN: { q: 'Which is the hottest planet in the solar system?', a: ['Venus', 'Mercury', 'Mars', 'Jupiter'] },
    TR: { q: 'Güneş sistemindeki en sıcak gezegen hangisidir?', a: ['Venüs', 'Merkür', 'Mars', 'Jüpiter'] },
    RU: { q: 'Какая планета Солнечной системы самая горячая?', a: ['Венера', 'Меркурий', 'Марс', 'Юпитер'] },
    KK: { q: 'Күн жүйесіндегі ең ыстық планета қайсы?', a: ['Шолпан (Венера)', 'Меркурий', 'Марс', 'Юпитер'] }
  },
  {
    level: 3, topic: 'science',
    EN: { q: 'Which is the largest internal organ of the human body?', a: ['The liver', 'The brain', 'The heart', 'The stomach'] },
    TR: { q: 'İnsan vücudunun en büyük iç organı hangisidir?', a: ['Karaciğer', 'Beyin', 'Kalp', 'Mide'] },
    RU: { q: 'Какой внутренний орган человека самый большой?', a: ['Печень', 'Мозг', 'Сердце', 'Желудок'] },
    KK: { q: 'Адамның ең үлкен ішкі мүшесі қайсы?', a: ['Бауыр', 'Ми', 'Жүрек', 'Асқазан'] }
  },
  {
    level: 3, topic: 'science',
    EN: { q: 'Which is the longest bone in the human body?', a: ['The femur (thigh bone)', 'The tibia (shin bone)', 'The humerus', 'The spine'] },
    TR: { q: 'İnsan vücudunun en uzun kemiği hangisidir?', a: ['Uyluk kemiği (femur)', 'Kaval kemiği', 'Pazı kemiği', 'Omurga'] },
    RU: { q: 'Какая кость в теле человека самая длинная?', a: ['Бедренная кость', 'Большеберцовая кость', 'Плечевая кость', 'Позвоночник'] },
    KK: { q: 'Адам денесіндегі ең ұзын сүйек қайсы?', a: ['Ортан жілік', 'Асықты жілік', 'Тоқпан жілік', 'Омыртқа'] }
  },
  {
    level: 3, topic: 'sport',
    EN: { q: 'In which country was chess born, according to most historians?', a: ['India', 'China', 'Persia', 'Greece'] },
    TR: { q: 'Tarihçilerin çoğuna göre satranç hangi ülkede doğdu?', a: ['Hindistan', 'Çin', 'İran', 'Yunanistan'] },
    RU: { q: 'В какой стране, по мнению большинства историков, родились шахматы?', a: ['В Индии', 'В Китае', 'В Персии', 'В Греции'] },
    KK: { q: 'Тарихшылардың көпшілігінің пікірінше, шахмат қай елде пайда болған?', a: ['Үндістан', 'Қытай', 'Парсы', 'Грекия'] }
  },
  {
    level: 3, topic: 'geo',
    EN: { q: 'What is the capital of Brazil?', a: ['Brasília', 'Rio de Janeiro', 'São Paulo', 'Salvador'] },
    TR: { q: 'Brezilya’nın başkenti neresidir?', a: ['Brasilia', 'Rio de Janeiro', 'São Paulo', 'Salvador'] },
    RU: { q: 'Какой город — столица Бразилии?', a: ['Бразилиа', 'Рио-де-Жанейро', 'Сан-Паулу', 'Салвадор'] },
    KK: { q: 'Бразилияның астанасы қай қала?', a: ['Бразилиа', 'Рио-де-Жанейро', 'Сан-Паулу', 'Салвадор'] }
  },
  {
    level: 3, topic: 'geo',
    EN: { q: 'Which Turkish city was once called Smyrna?', a: ['Izmir', 'Istanbul', 'Antalya', 'Trabzon'] },
    TR: { q: 'Eskiden Smyrna olarak anılan Türk şehri hangisidir?', a: ['İzmir', 'İstanbul', 'Antalya', 'Trabzon'] },
    RU: { q: 'Какой турецкий город раньше назывался Смирна?', a: ['Измир', 'Стамбул', 'Анталья', 'Трабзон'] },
    KK: { q: 'Бұрын Смирна деп аталған түрік қаласы қайсы?', a: ['Измир', 'Ыстамбұл', 'Анталия', 'Трабзон'] }
  },
  {
    level: 3, topic: 'geo',
    EN: { q: 'Which is the longest river in Europe?', a: ['The Volga', 'The Danube', 'The Rhine', 'The Dnieper'] },
    TR: { q: 'Avrupa’nın en uzun nehri hangisidir?', a: ['Volga (İdil)', 'Tuna', 'Ren', 'Dinyeper'] },
    RU: { q: 'Какая река самая длинная в Европе?', a: ['Волга', 'Дунай', 'Рейн', 'Днепр'] },
    KK: { q: 'Еуропадағы ең ұзын өзен қайсы?', a: ['Еділ (Волга)', 'Дунай', 'Рейн', 'Днепр'] }
  },
  {
    level: 3, topic: 'geo',
    EN: { q: 'Mount Everest lies on the border between Nepal and which country?', a: ['China', 'India', 'Bhutan', 'Pakistan'] },
    TR: { q: 'Everest Dağı Nepal ile hangi ülkenin sınırındadır?', a: ['Çin', 'Hindistan', 'Butan', 'Pakistan'] },
    RU: { q: 'Эверест находится на границе Непала и какой страны?', a: ['Китая', 'Индии', 'Бутана', 'Пакистана'] },
    KK: { q: 'Эверест Непал мен қай елдің шекарасында орналасқан?', a: ['Қытай', 'Үндістан', 'Бутан', 'Пәкістан'] }
  },
  {
    level: 3, topic: 'science',
    EN: { q: 'Who discovered penicillin?', a: ['Alexander Fleming', 'Louis Pasteur', 'Marie Curie', 'Robert Koch'] },
    TR: { q: 'Penisilini kim keşfetti?', a: ['Alexander Fleming', 'Louis Pasteur', 'Marie Curie', 'Robert Koch'] },
    RU: { q: 'Кто открыл пенициллин?', a: ['Александр Флеминг', 'Луи Пастер', 'Мария Кюри', 'Роберт Кох'] },
    KK: { q: 'Пенициллинді кім ашты?', a: ['Александр Флеминг', 'Луи Пастер', 'Мария Кюри', 'Роберт Кох'] }
  },
  {
    level: 3, topic: 'sport',
    EN: { q: 'Where were the first modern Olympic Games held, in 1896?', a: ['Athens', 'Paris', 'London', 'Rome'] },
    TR: { q: '1896’daki ilk modern Olimpiyat Oyunları nerede yapıldı?', a: ['Atina', 'Paris', 'Londra', 'Roma'] },
    RU: { q: 'Где прошли первые современные Олимпийские игры в 1896 году?', a: ['В Афинах', 'В Париже', 'В Лондоне', 'В Риме'] },
    KK: { q: '1896 жылғы алғашқы заманауи Олимпиада ойындары қай жерде өтті?', a: ['Афины', 'Париж', 'Лондон', 'Рим'] }
  },
  {
    level: 3, topic: 'sport',
    EN: { q: 'How long is a marathon?', a: ['42.195 km', '40 km', '45 km', '26 km'] },
    TR: { q: 'Maraton kaç kilometredir?', a: ['42,195 km', '40 km', '45 km', '26 km'] },
    RU: { q: 'Какова длина марафонской дистанции?', a: ['42,195 км', '40 км', '45 км', '26 км'] },
    KK: { q: 'Марафон қашықтығы қанша?', a: ['42,195 км', '40 км', '45 км', '26 км'] }
  },
  {
    level: 3, topic: 'space',
    EN: { q: 'Which planet has the Great Red Spot?', a: ['Jupiter', 'Mars', 'Saturn', 'Neptune'] },
    TR: { q: 'Büyük Kırmızı Leke hangi gezegendedir?', a: ['Jüpiter', 'Mars', 'Satürn', 'Neptün'] },
    RU: { q: 'На какой планете находится Большое красное пятно?', a: ['На Юпитере', 'На Марсе', 'На Сатурне', 'На Нептуне'] },
    KK: { q: 'Үлкен қызыл дақ қай планетада?', a: ['Юпитер', 'Марс', 'Сатурн', 'Нептун'] }
  },
  {
    level: 3, topic: 'geo',
    EN: { q: 'On which continent are there no native snakes at all?', a: ['Antarctica', 'Australia', 'Europe', 'Africa'] },
    TR: { q: 'Doğal olarak hiç yılan bulunmayan kıta hangisidir?', a: ['Antarktika', 'Avustralya', 'Avrupa', 'Afrika'] },
    RU: { q: 'На каком материке совсем нет змей?', a: ['В Антарктиде', 'В Австралии', 'В Евразии', 'В Африке'] },
    KK: { q: 'Қай құрлықта жылан мүлде жоқ?', a: ['Антарктида', 'Аустралия', 'Еуразия', 'Африка'] }
  },
  {
    level: 3, topic: 'nature',
    EN: { q: 'What do camels store in their humps?', a: ['Fat', 'Water', 'Milk', 'Air'] },
    TR: { q: 'Develer hörgüçlerinde ne depolar?', a: ['Yağ', 'Su', 'Süt', 'Hava'] },
    RU: { q: 'Что верблюд запасает в горбах?', a: ['Жир', 'Воду', 'Молоко', 'Воздух'] },
    KK: { q: 'Түйе өркешінде не жинайды?', a: ['Май', 'Су', 'Сүт', 'Ауа'] }
  },
  {
    level: 3, topic: 'food',
    EN: { q: 'Which is the most expensive spice by weight?', a: ['Saffron', 'Vanilla', 'Cardamom', 'Cinnamon'] },
    TR: { q: 'Ağırlığına göre en pahalı baharat hangisidir?', a: ['Safran', 'Vanilya', 'Kakule', 'Tarçın'] },
    RU: { q: 'Какая пряность самая дорогая по весу?', a: ['Шафран', 'Ваниль', 'Кардамон', 'Корица'] },
    KK: { q: 'Салмағы бойынша ең қымбат дәмдеуіш қайсы?', a: ['Запыран', 'Ваниль', 'Кардамон', 'Даршын'] }
  },
  {
    level: 3, topic: 'food',
    EN: { q: 'Which nut is marzipan made from?', a: ['Almond', 'Walnut', 'Hazelnut', 'Peanut'] },
    TR: { q: 'Badem ezmesi (marzipan) hangi kuruyemişten yapılır?', a: ['Badem', 'Ceviz', 'Fındık', 'Yer fıstığı'] },
    RU: { q: 'Из какого ореха делают марципан?', a: ['Из миндаля', 'Из грецкого ореха', 'Из фундука', 'Из арахиса'] },
    KK: { q: 'Марципан қай жаңғақтан жасалады?', a: ['Бадам', 'Грек жаңғағы', 'Орман жаңғағы', 'Жержаңғақ'] }
  },
  {
    level: 3, topic: 'food',
    EN: { q: 'Turkey grows most of the world’s supply of which crop?', a: ['Hazelnuts', 'Cocoa', 'Coffee', 'Rice'] },
    TR: { q: 'Dünyadaki üretimin büyük kısmını Türkiye’nin karşıladığı ürün hangisidir?', a: ['Fındık', 'Kakao', 'Kahve', 'Pirinç'] },
    RU: { q: 'Турция выращивает большую часть мирового урожая чего?', a: ['Фундука', 'Какао', 'Кофе', 'Риса'] },
    KK: { q: 'Әлемдік өнімнің басым бөлігін Түркия өсіретін дақыл қайсы?', a: ['Орман жаңғағы', 'Какао', 'Кофе', 'Күріш'] }
  },
  {
    level: 3, topic: 'language',
    EN: { q: 'How many letters are in the Kazakh Cyrillic alphabet?', a: ['42', '33', '38', '36'] },
    TR: { q: 'Kazak Kiril alfabesinde kaç harf vardır?', a: ['42', '33', '38', '36'] },
    RU: { q: 'Сколько букв в казахском алфавите на кириллице?', a: ['42', '33', '38', '36'] },
    KK: { q: 'Қазақ кирилл әліпбиінде неше әріп бар?', a: ['42', '33', '38', '36'] }
  },
  {
    level: 3, topic: 'language',
    EN: { q: 'Which of these languages is NOT a Turkic language?', a: ['Hungarian', 'Kazakh', 'Uzbek', 'Azerbaijani'] },
    TR: { q: 'Bu dillerden hangisi bir Türk dili DEĞİLDİR?', a: ['Macarca', 'Kazakça', 'Özbekçe', 'Azerbaycan Türkçesi'] },
    RU: { q: 'Какой из этих языков НЕ относится к тюркским?', a: ['Венгерский', 'Казахский', 'Узбекский', 'Азербайджанский'] },
    KK: { q: 'Бұл тілдердің қайсысы түркі тілі ЕМЕС?', a: ['Венгр тілі', 'Қазақ тілі', 'Өзбек тілі', 'Әзербайжан тілі'] }
  },
  {
    level: 3, topic: 'geo',
    EN: { q: 'Which is the world’s largest landlocked country?', a: ['Kazakhstan', 'Mongolia', 'Chad', 'Niger'] },
    TR: { q: 'Denize kıyısı olmayan en büyük ülke hangisidir?', a: ['Kazakistan', 'Moğolistan', 'Çad', 'Nijer'] },
    RU: { q: 'Какая страна самая большая среди не имеющих выхода к Мировому океану?', a: ['Казахстан', 'Монголия', 'Чад', 'Нигер'] },
    KK: { q: 'Әлемдік мұхитқа шығатын жолы жоқ ең үлкен ел қайсы?', a: ['Қазақстан', 'Моңғолия', 'Чад', 'Нигер'] }
  },
  {
    level: 3, topic: 'geo',
    EN: { q: 'Which is the largest island in the world?', a: ['Greenland', 'Borneo', 'Madagascar', 'New Guinea'] },
    TR: { q: 'Dünyanın en büyük adası hangisidir?', a: ['Grönland', 'Borneo', 'Madagaskar', 'Yeni Gine'] },
    RU: { q: 'Какой остров самый большой в мире?', a: ['Гренландия', 'Калимантан', 'Мадагаскар', 'Новая Гвинея'] },
    KK: { q: 'Әлемдегі ең үлкен арал қайсы?', a: ['Гренландия', 'Калимантан', 'Мадагаскар', 'Жаңа Гвинея'] }
  },
  {
    level: 3, topic: 'geo',
    EN: { q: 'Which is the longest river lying entirely within Turkey?', a: ['Kızılırmak', 'The Euphrates', 'The Tigris', 'The Sakarya'] },
    TR: { q: 'Tamamı Türkiye’de olan en uzun nehir hangisidir?', a: ['Kızılırmak', 'Fırat', 'Dicle', 'Sakarya'] },
    RU: { q: 'Какая самая длинная река, целиком протекающая по Турции?', a: ['Кызылырмак', 'Евфрат', 'Тигр', 'Сакарья'] },
    KK: { q: 'Толығымен Түркия аумағында ағатын ең ұзын өзен қайсы?', a: ['Қызылырмақ', 'Евфрат', 'Тигр', 'Сакарья'] }
  },
  {
    level: 3, topic: 'geo',
    EN: { q: 'Which is the largest lake in Turkey?', a: ['Lake Van', 'Lake Tuz', 'Lake Beyşehir', 'Lake Eğirdir'] },
    TR: { q: 'Türkiye’nin en büyük gölü hangisidir?', a: ['Van Gölü', 'Tuz Gölü', 'Beyşehir Gölü', 'Eğirdir Gölü'] },
    RU: { q: 'Какое озеро самое большое в Турции?', a: ['Ван', 'Туз', 'Бейшехир', 'Эгирдир'] },
    KK: { q: 'Түркиядағы ең үлкен көл қайсы?', a: ['Ван көлі', 'Туз көлі', 'Бейшехир көлі', 'Эгирдир көлі'] }
  },
  {
    level: 3, topic: 'geo',
    EN: { q: 'Which is the largest lake lying entirely within Kazakhstan?', a: ['Lake Balkhash', 'Lake Zaysan', 'Lake Alakol', 'The Caspian Sea'] },
    TR: { q: 'Tamamı Kazakistan’da olan en büyük göl hangisidir?', a: ['Balkaş Gölü', 'Zaysan Gölü', 'Alakol Gölü', 'Hazar Denizi'] },
    RU: { q: 'Какое самое большое озеро, целиком лежащее в Казахстане?', a: ['Балхаш', 'Зайсан', 'Алаколь', 'Каспийское море'] },
    KK: { q: 'Толығымен Қазақстан аумағындағы ең үлкен көл қайсы?', a: ['Балқаш', 'Зайсан', 'Алакөл', 'Каспий теңізі'] }
  },
  {
    level: 3, topic: 'geo',
    EN: { q: 'In which country is Mount Ararat?', a: ['Turkey', 'Armenia', 'Iran', 'Georgia'] },
    TR: { q: 'Ağrı Dağı (Ararat) hangi ülkededir?', a: ['Türkiye', 'Ermenistan', 'İran', 'Gürcistan'] },
    RU: { q: 'В какой стране находится гора Арарат?', a: ['В Турции', 'В Армении', 'В Иране', 'В Грузии'] },
    KK: { q: 'Арарат тауы қай елде орналасқан?', a: ['Түркия', 'Армения', 'Иран', 'Грузия'] }
  },
  {
    level: 3, topic: 'science',
    EN: { q: 'What is the unit of electrical resistance?', a: ['Ohm', 'Volt', 'Ampere', 'Watt'] },
    TR: { q: 'Elektrik direncinin birimi nedir?', a: ['Ohm', 'Volt', 'Amper', 'Watt'] },
    RU: { q: 'В чём измеряется электрическое сопротивление?', a: ['В омах', 'В вольтах', 'В амперах', 'В ваттах'] },
    KK: { q: 'Электр кедергісінің өлшем бірлігі қандай?', a: ['Ом', 'Вольт', 'Ампер', 'Ватт'] }
  },
  {
    level: 3, topic: 'space',
    EN: { q: 'About how long does sunlight take to reach Earth?', a: ['About 8 minutes', 'About 8 seconds', 'About an hour', 'About a day'] },
    TR: { q: 'Güneş ışığı Dünya’ya yaklaşık ne kadar sürede ulaşır?', a: ['Yaklaşık 8 dakikada', 'Yaklaşık 8 saniyede', 'Yaklaşık 1 saatte', 'Yaklaşık 1 günde'] },
    RU: { q: 'Примерно за сколько солнечный свет доходит до Земли?', a: ['Примерно за 8 минут', 'Примерно за 8 секунд', 'Примерно за час', 'Примерно за сутки'] },
    KK: { q: 'Күн сәулесі Жерге шамамен қанша уақытта жетеді?', a: ['Шамамен 8 минутта', 'Шамамен 8 секундта', 'Шамамен 1 сағатта', 'Шамамен 1 тәулікте'] }
  },
  {
    level: 3, topic: 'space',
    EN: { q: 'Who was the first woman in space?', a: ['Valentina Tereshkova', 'Sally Ride', 'Svetlana Savitskaya', 'Mae Jemison'] },
    TR: { q: 'Uzaya çıkan ilk kadın kimdir?', a: ['Valentina Tereşkova', 'Sally Ride', 'Svetlana Savitskaya', 'Mae Jemison'] },
    RU: { q: 'Кто была первой женщиной в космосе?', a: ['Валентина Терешкова', 'Салли Райд', 'Светлана Савицкая', 'Мэй Джемисон'] },
    KK: { q: 'Ғарышқа ұшқан алғашқы әйел кім?', a: ['Валентина Терешкова', 'Салли Райд', 'Светлана Савицкая', 'Мэй Джемисон'] }
  },
  {
    level: 3, topic: 'space',
    EN: { q: 'In which year did the Soviet Union launch Sputnik, the first satellite?', a: ['1957', '1961', '1949', '1969'] },
    TR: { q: 'Sovyetler Birliği ilk uydu Sputnik’i hangi yıl fırlattı?', a: ['1957', '1961', '1949', '1969'] },
    RU: { q: 'В каком году СССР запустил первый спутник?', a: ['1957', '1961', '1949', '1969'] },
    KK: { q: 'КСРО алғашқы жасанды серікті қай жылы ұшырды?', a: ['1957', '1961', '1949', '1969'] }
  },
  {
    level: 3, topic: 'history',
    EN: { q: 'How many republics made up the Soviet Union?', a: ['15', '12', '16', '11'] },
    TR: { q: 'Sovyetler Birliği kaç cumhuriyetten oluşuyordu?', a: ['15', '12', '16', '11'] },
    RU: { q: 'Сколько республик входило в СССР?', a: ['15', '12', '16', '11'] },
    KK: { q: 'КСРО құрамында неше республика болған?', a: ['15', '12', '16', '11'] }
  },
  {
    level: 3, topic: 'history',
    EN: { q: 'In which year did Mustafa Kemal Atatürk die?', a: ['1938', '1934', '1945', '1923'] },
    TR: { q: 'Mustafa Kemal Atatürk hangi yıl öldü?', a: ['1938', '1934', '1945', '1923'] },
    RU: { q: 'В каком году умер Мустафа Кемаль Ататюрк?', a: ['1938', '1934', '1945', '1923'] },
    KK: { q: 'Мұстафа Кемал Ататүрік қай жылы қайтыс болды?', a: ['1938', '1934', '1945', '1923'] }
  },
  {
    level: 3, topic: 'science',
    EN: { q: 'Which Turkish scientist won the 2015 Nobel Prize in Chemistry?', a: ['Aziz Sancar', 'Cahit Arf', 'Gazi Yaşargil', 'Oktay Sinanoğlu'] },
    TR: { q: '2015 Nobel Kimya Ödülü’nü kazanan Türk bilim insanı kimdir?', a: ['Aziz Sancar', 'Cahit Arf', 'Gazi Yaşargil', 'Oktay Sinanoğlu'] },
    RU: { q: 'Какой турецкий учёный получил Нобелевскую премию по химии в 2015 году?', a: ['Азиз Санджар', 'Джахит Арф', 'Гази Ясаргил', 'Октай Синаноглу'] },
    KK: { q: '2015 жылы химия бойынша Нобель сыйлығын алған түрік ғалымы кім?', a: ['Азиз Санджар', 'Джахит Арф', 'Гази Ясаргил', 'Октай Синаноглу'] }
  },
  {
    level: 3, topic: 'literature',
    EN: { q: 'In which field did Orhan Pamuk win the Nobel Prize?', a: ['Literature', 'Peace', 'Chemistry', 'Economics'] },
    TR: { q: 'Orhan Pamuk Nobel Ödülü’nü hangi alanda kazandı?', a: ['Edebiyat', 'Barış', 'Kimya', 'Ekonomi'] },
    RU: { q: 'В какой области Орхан Памук получил Нобелевскую премию?', a: ['Литература', 'Мир', 'Химия', 'Экономика'] },
    KK: { q: 'Орхан Памук Нобель сыйлығын қай салада алды?', a: ['Әдебиет', 'Бейбітшілік', 'Химия', 'Экономика'] }
  },
  {
    level: 3, topic: 'geo',
    EN: { q: 'Which city hosted the Expo 2017 world exhibition?', a: ['Astana', 'Almaty', 'Dubai', 'Milan'] },
    TR: { q: 'Expo 2017 dünya fuarına hangi şehir ev sahipliği yaptı?', a: ['Astana', 'Almatı', 'Dubai', 'Milano'] },
    RU: { q: 'Какой город принимал всемирную выставку «Экспо-2017»?', a: ['Астана', 'Алматы', 'Дубай', 'Милан'] },
    KK: { q: '«ЭКСПО-2017» дүниежүзілік көрмесі қай қалада өтті?', a: ['Астана', 'Алматы', 'Дубай', 'Милан'] }
  },
  {
    level: 3, topic: 'literature',
    EN: { q: 'Who wrote “Don Quixote”?', a: ['Miguel de Cervantes', 'Lope de Vega', 'Dante Alighieri', 'Victor Hugo'] },
    TR: { q: '“Don Kişot”u kim yazdı?', a: ['Miguel de Cervantes', 'Lope de Vega', 'Dante Alighieri', 'Victor Hugo'] },
    RU: { q: 'Кто написал «Дон Кихота»?', a: ['Мигель де Сервантес', 'Лопе де Вега', 'Данте Алигьери', 'Виктор Гюго'] },
    KK: { q: '«Дон Кихотты» кім жазған?', a: ['Мигель де Сервантес', 'Лопе де Вега', 'Данте Алигьери', 'Виктор Гюго'] }
  },
  {
    level: 3, topic: 'literature',
    EN: { q: 'Who wrote “Eugene Onegin”?', a: ['Alexander Pushkin', 'Mikhail Lermontov', 'Nikolai Gogol', 'Leo Tolstoy'] },
    TR: { q: '“Yevgeni Onegin”i kim yazdı?', a: ['Aleksandr Puşkin', 'Mihail Lermontov', 'Nikolay Gogol', 'Lev Tolstoy'] },
    RU: { q: 'Кто написал «Евгения Онегина»?', a: ['Александр Пушкин', 'Михаил Лермонтов', 'Николай Гоголь', 'Лев Толстой'] },
    KK: { q: '«Евгений Онегинді» кім жазған?', a: ['Александр Пушкин', 'Михаил Лермонтов', 'Николай Гоголь', 'Лев Толстой'] }
  },
  {
    level: 3, topic: 'art',
    EN: { q: 'Who painted “The Scream”?', a: ['Edvard Munch', 'Gustav Klimt', 'Vincent van Gogh', 'Pablo Picasso'] },
    TR: { q: '“Çığlık” tablosunu kim yaptı?', a: ['Edvard Munch', 'Gustav Klimt', 'Vincent van Gogh', 'Pablo Picasso'] },
    RU: { q: 'Кто написал картину «Крик»?', a: ['Эдвард Мунк', 'Густав Климт', 'Винсент Ван Гог', 'Пабло Пикассо'] },
    KK: { q: '«Айқай» картинасын кім салған?', a: ['Эдвард Мунк', 'Густав Климт', 'Винсент Ван Гог', 'Пабло Пикассо'] }
  },
  {
    level: 3, topic: 'art',
    EN: { q: 'Which painter is famous for his melting clocks?', a: ['Salvador Dalí', 'René Magritte', 'Pablo Picasso', 'Joan Miró'] },
    TR: { q: 'Eriyen saatleriyle ünlü ressam kimdir?', a: ['Salvador Dalí', 'René Magritte', 'Pablo Picasso', 'Joan Miró'] },
    RU: { q: 'Какой художник знаменит своими «растекающимися» часами?', a: ['Сальвадор Дали', 'Рене Магритт', 'Пабло Пикассо', 'Жоан Миро'] },
    KK: { q: 'Еріп бара жатқан сағаттарымен әйгілі суретші кім?', a: ['Сальвадор Дали', 'Рене Магритт', 'Пабло Пикассо', 'Жоан Миро'] }
  },
  {
    level: 3, topic: 'art',
    EN: { q: 'Who painted the ceiling of the Sistine Chapel?', a: ['Michelangelo', 'Raphael', 'Leonardo da Vinci', 'Sandro Botticelli'] },
    TR: { q: 'Sistina Şapeli’nin tavanını kim boyadı?', a: ['Michelangelo', 'Raffaello', 'Leonardo da Vinci', 'Sandro Botticelli'] },
    RU: { q: 'Кто расписал потолок Сикстинской капеллы?', a: ['Микеланджело', 'Рафаэль', 'Леонардо да Винчи', 'Сандро Боттичелли'] },
    KK: { q: 'Сикстин капелласының төбесін кім бояған?', a: ['Микеланджело', 'Рафаэль', 'Леонардо да Винчи', 'Сандро Боттичелли'] }
  },
  {
    level: 3, topic: 'art',
    EN: { q: 'Which architect designed the Süleymaniye Mosque in Istanbul?', a: ['Mimar Sinan', 'Sedefkâr Mehmed Ağa', 'Mimar Kemaleddin', 'Davud Ağa'] },
    TR: { q: 'İstanbul’daki Süleymaniye Camii’ni hangi mimar tasarladı?', a: ['Mimar Sinan', 'Sedefkâr Mehmed Ağa', 'Mimar Kemaleddin', 'Davud Ağa'] },
    RU: { q: 'Какой архитектор построил мечеть Сулеймание в Стамбуле?', a: ['Мимар Синан', 'Седефкяр Мехмед-ага', 'Мимар Кемаледдин', 'Давуд-ага'] },
    KK: { q: 'Ыстамбұлдағы Сүлеймания мешітін қай сәулетші салған?', a: ['Мимар Синан', 'Седефкяр Мехмед аға', 'Мимар Кемаледдин', 'Дауд аға'] }
  },
  {
    level: 3, topic: 'history',
    EN: { q: 'What was Hagia Sophia originally built as?', a: ['A church', 'A palace', 'A library', 'A fortress'] },
    TR: { q: 'Ayasofya ilk olarak ne olarak inşa edildi?', a: ['Kilise', 'Saray', 'Kütüphane', 'Kale'] },
    RU: { q: 'Чем изначально был построен собор Святой Софии в Стамбуле?', a: ['Христианским храмом', 'Дворцом', 'Библиотекой', 'Крепостью'] },
    KK: { q: 'Әулие София ғимараты алғашында не ретінде салынған?', a: ['Шіркеу', 'Сарай', 'Кітапхана', 'Қамал'] }
  },
  {
    level: 3, topic: 'history',
    EN: { q: 'Which civilisation built Machu Picchu?', a: ['The Inca', 'The Maya', 'The Aztecs', 'The Olmecs'] },
    TR: { q: 'Machu Picchu’yu hangi uygarlık inşa etti?', a: ['İnkalar', 'Mayalar', 'Aztekler', 'Olmekler'] },
    RU: { q: 'Какая цивилизация построила Мачу-Пикчу?', a: ['Инки', 'Майя', 'Ацтеки', 'Ольмеки'] },
    KK: { q: 'Мачу-Пикчуді қай өркениет салған?', a: ['Инктер', 'Майялар', 'Ацтектер', 'Ольмектер'] }
  },
  {
    level: 3, topic: 'geo',
    EN: { q: 'In which city is the Taj Mahal?', a: ['Agra', 'Delhi', 'Mumbai', 'Jaipur'] },
    TR: { q: 'Tac Mahal hangi şehirdedir?', a: ['Agra', 'Delhi', 'Mumbai', 'Jaipur'] },
    RU: { q: 'В каком городе находится Тадж-Махал?', a: ['В Агре', 'В Дели', 'В Мумбаи', 'В Джайпуре'] },
    KK: { q: 'Тәж-Махал қай қалада орналасқан?', a: ['Агра', 'Делі', 'Мумбаи', 'Джайпур'] }
  },
  {
    level: 3, topic: 'tech',
    EN: { q: 'What is the binary number 101 in decimal?', a: ['5', '3', '6', '101'] },
    TR: { q: 'İkilik sistemdeki 101 sayısı onluk sistemde kaçtır?', a: ['5', '3', '6', '101'] },
    RU: { q: 'Чему равно двоичное число 101 в десятичной системе?', a: ['5', '3', '6', '101'] },
    KK: { q: 'Екілік жүйедегі 101 саны ондық жүйеде нешеге тең?', a: ['5', '3', '6', '101'] }
  },
  {
    level: 3, topic: 'math',
    EN: { q: 'Which is the next prime number after 7?', a: ['11', '9', '13', '10'] },
    TR: { q: '7’den sonraki ilk asal sayı hangisidir?', a: ['11', '9', '13', '10'] },
    RU: { q: 'Какое простое число идёт следующим после 7?', a: ['11', '9', '13', '10'] },
    KK: { q: '7-ден кейінгі жай сан қайсы?', a: ['11', '9', '13', '10'] }
  },
  {
    level: 3, topic: 'math',
    EN: { q: 'Which Roman numeral stands for 50?', a: ['L', 'C', 'D', 'V'] },
    TR: { q: 'Roma rakamlarında 50 hangi harfle gösterilir?', a: ['L', 'C', 'D', 'V'] },
    RU: { q: 'Какая римская цифра обозначает 50?', a: ['L', 'C', 'D', 'V'] },
    KK: { q: 'Рим цифрларында 50 қай әріппен белгіленеді?', a: ['L', 'C', 'D', 'V'] }
  },
  {
    level: 3, topic: 'science',
    EN: { q: 'What is the pH of pure water?', a: ['7', '0', '1', '14'] },
    TR: { q: 'Saf suyun pH değeri kaçtır?', a: ['7', '0', '1', '14'] },
    RU: { q: 'Каков pH чистой воды?', a: ['7', '0', '1', '14'] },
    KK: { q: 'Таза судың pH мәні нешеге тең?', a: ['7', '0', '1', '14'] }
  },
  {
    level: 3, topic: 'science',
    EN: { q: 'What is the chemical symbol for sodium?', a: ['Na', 'So', 'Sd', 'S'] },
    TR: { q: 'Sodyumun kimyasal sembolü nedir?', a: ['Na', 'So', 'Sd', 'S'] },
    RU: { q: 'Какой химический символ у натрия?', a: ['Na', 'So', 'Sd', 'S'] },
    KK: { q: 'Натрийдің химиялық таңбасы қандай?', a: ['Na', 'So', 'Sd', 'S'] }
  },
  {
    level: 3, topic: 'space',
    EN: { q: 'Which gas makes up most of the Sun?', a: ['Hydrogen', 'Helium', 'Oxygen', 'Carbon'] },
    TR: { q: 'Güneş’in büyük kısmını hangi gaz oluşturur?', a: ['Hidrojen', 'Helyum', 'Oksijen', 'Karbon'] },
    RU: { q: 'Из какого газа в основном состоит Солнце?', a: ['Из водорода', 'Из гелия', 'Из кислорода', 'Из углерода'] },
    KK: { q: 'Күн негізінен қай газдан тұрады?', a: ['Сутегі', 'Гелий', 'Оттегі', 'Көміртегі'] }
  },
  {
    level: 3, topic: 'sport',
    EN: { q: 'How many holes are there in a standard round of golf?', a: ['18', '9', '12', '20'] },
    TR: { q: 'Standart bir golf turunda kaç delik vardır?', a: ['18', '9', '12', '20'] },
    RU: { q: 'Сколько лунок в стандартном раунде гольфа?', a: ['18', '9', '12', '20'] },
    KK: { q: 'Гольфтың стандартты раундында неше шұңқыр бар?', a: ['18', '9', '12', '20'] }
  },
  {
    level: 3, topic: 'sport',
    EN: { q: 'In Turkey’s Kırkpınar festival, what sport do men compete in?', a: ['Oil wrestling', 'Horse racing', 'Archery', 'Camel wrestling'] },
    TR: { q: 'Kırkpınar’da hangi spor yapılır?', a: ['Yağlı güreş', 'At yarışı', 'Okçuluk', 'Deve güreşi'] },
    RU: { q: 'Каким видом спорта знаменит турецкий фестиваль Кыркпынар?', a: ['Масляной борьбой', 'Скачками', 'Стрельбой из лука', 'Боями верблюдов'] },
    KK: { q: 'Түркиядағы Кыркпынар фестивалі қай спорт түрімен әйгілі?', a: ['Майлы күрес', 'Ат жарысы', 'Садақ ату', 'Түйе күресі'] }
  },
  {
    level: 3, topic: 'sport',
    EN: { q: 'In the Kazakh horseback game kokpar, what do the riders fight over?', a: ['A goat carcass', 'A ball', 'A stick', 'A flag'] },
    TR: { q: 'Kazakların atlı oyunu kökparda biniciler neyi kapmaya çalışır?', a: ['Bir keçi leşi (oğlak)', 'Bir top', 'Bir sopa', 'Bir bayrak'] },
    RU: { q: 'За что борются всадники в казахской игре кокпар?', a: ['За тушу козла', 'За мяч', 'За палку', 'За флаг'] },
    KK: { q: 'Көкпар ойынында шабандоздар не үшін таласады?', a: ['Серке (ешкінің өлексесі)', 'Доп', 'Таяқ', 'Ту'] }
  },
  {
    level: 3, topic: 'geo',
    EN: { q: 'How many time zones does Russia have?', a: ['11', '9', '12', '7'] },
    TR: { q: 'Rusya’da kaç saat dilimi vardır?', a: ['11', '9', '12', '7'] },
    RU: { q: 'Сколько часовых поясов в России?', a: ['11', '9', '12', '7'] },
    KK: { q: 'Ресейде неше сағат белдеуі бар?', a: ['11', '9', '12', '7'] }
  },
  {
    level: 4, topic: 'science',
    EN: { q: 'Which blood type is known as the universal donor?', a: ['O negative', 'AB positive', 'A positive', 'B negative'] },
    TR: { q: 'Genel verici olarak bilinen kan grubu hangisidir?', a: ['0 Rh negatif', 'AB Rh pozitif', 'A Rh pozitif', 'B Rh negatif'] },
    RU: { q: 'Какую группу крови называют универсальным донором?', a: ['Первую отрицательную (0−)', 'Четвёртую положительную (AB+)', 'Вторую положительную (A+)', 'Третью отрицательную (B−)'] },
    KK: { q: 'Қай қан тобын әмбебап донор деп атайды?', a: ['Бірінші теріс (0−)', 'Төртінші оң (AB+)', 'Екінші оң (A+)', 'Үшінші теріс (B−)'] }
  },
  {
    level: 4, topic: 'history',
    EN: { q: 'Which ancient wonder of the world stood in Alexandria?', a: ['The Lighthouse (Pharos)', 'The Colossus', 'The Hanging Gardens', 'The Temple of Artemis'] },
    TR: { q: 'Antik dünyanın yedi harikasından hangisi İskenderiye’deydi?', a: ['İskenderiye Feneri', 'Rodos Heykeli', 'Babil’in Asma Bahçeleri', 'Artemis Tapınağı'] },
    RU: { q: 'Какое из семи чудес света находилось в Александрии?', a: ['Александрийский маяк', 'Колосс Родосский', 'Висячие сады Семирамиды', 'Храм Артемиды'] },
    KK: { q: 'Әлемнің жеті кереметінің қайсысы Александрияда болған?', a: ['Александрия шамшырағы', 'Родос алыбы', 'Семирамиданың аспалы бақтары', 'Артемида ғибадатханасы'] }
  },
  {
    level: 4, topic: 'nature',
    EN: { q: 'How many bones does a shark have?', a: ['None', '206', 'About 300', 'About 50'] },
    TR: { q: 'Bir köpekbalığının kaç kemiği vardır?', a: ['Hiç yok', '206', 'Yaklaşık 300', 'Yaklaşık 50'] },
    RU: { q: 'Сколько костей у акулы?', a: ['Ни одной', '206', 'Около 300', 'Около 50'] },
    KK: { q: 'Акуланың неше сүйегі бар?', a: ['Мүлде жоқ', '206', 'Шамамен 300', 'Шамамен 50'] }
  },
  {
    level: 4, topic: 'space',
    EN: { q: 'On which planet is a day longer than its year?', a: ['Venus', 'Mercury', 'Mars', 'Neptune'] },
    TR: { q: 'Hangi gezegende bir gün, bir yıldan uzundur?', a: ['Venüs', 'Merkür', 'Mars', 'Neptün'] },
    RU: { q: 'На какой планете сутки длиннее года?', a: ['На Венере', 'На Меркурии', 'На Марсе', 'На Нептуне'] },
    KK: { q: 'Қай планетада бір тәулік бір жылдан ұзақ?', a: ['Шолпан (Венера)', 'Меркурий', 'Марс', 'Нептун'] }
  },
  {
    level: 4, topic: 'space',
    EN: { q: 'How many moons does Mars have?', a: ['2', '0', '1', '4'] },
    TR: { q: 'Mars’ın kaç uydusu vardır?', a: ['2', '0', '1', '4'] },
    RU: { q: 'Сколько спутников у Марса?', a: ['2', '0', '1', '4'] },
    KK: { q: 'Марстың неше серігі бар?', a: ['2', '0', '1', '4'] }
  },
  {
    level: 4, topic: 'nature',
    EN: { q: 'Which bird can fly backwards?', a: ['The hummingbird', 'The swallow', 'The eagle', 'The parrot'] },
    TR: { q: 'Hangi kuş geriye doğru uçabilir?', a: ['Sinek kuşu', 'Kırlangıç', 'Kartal', 'Papağan'] },
    RU: { q: 'Какая птица умеет летать задом наперёд?', a: ['Колибри', 'Ласточка', 'Орёл', 'Попугай'] },
    KK: { q: 'Қай құс кері қарай ұша алады?', a: ['Колибри', 'Қарлығаш', 'Бүркіт', 'Тотықұс'] }
  },
  {
    level: 4, topic: 'nature',
    EN: { q: 'Which is the fastest bird when diving?', a: ['Peregrine falcon', 'Golden eagle', 'Ostrich', 'Swallow'] },
    TR: { q: 'Pike dalışında en hızlı kuş hangisidir?', a: ['Gökdoğan (peregrin şahini)', 'Kaya kartalı', 'Devekuşu', 'Kırlangıç'] },
    RU: { q: 'Какая птица быстрее всех в пикирующем полёте?', a: ['Сапсан', 'Беркут', 'Страус', 'Ласточка'] },
    KK: { q: 'Құлдилап ұшқанда ең жылдам құс қайсы?', a: ['Лашын', 'Бүркіт', 'Түйеқұс', 'Қарлығаш'] }
  },
  {
    level: 4, topic: 'nature',
    EN: { q: 'How many legs does a crab have, claws included?', a: ['10', '8', '6', '12'] },
    TR: { q: 'Kıskaçları dahil bir yengecin kaç bacağı vardır?', a: ['10', '8', '6', '12'] },
    RU: { q: 'Сколько ног у краба вместе с клешнями?', a: ['10', '8', '6', '12'] },
    KK: { q: 'Қысқыштарын қоса есептегенде, шаянның неше аяғы бар?', a: ['10', '8', '6', '12'] }
  },
  {
    level: 4, topic: 'science',
    EN: { q: 'What does DNA stand for?', a: ['Deoxyribonucleic acid', 'Dinitrogen acid', 'Dextrose nucleic acid', 'Double nitrogen acid'] },
    TR: { q: 'DNA’nın açılımı nedir?', a: ['Deoksiribonükleik asit', 'Dinitrojen asit', 'Dekstroz nükleik asit', 'Çift azot asidi'] },
    RU: { q: 'Как расшифровывается ДНК?', a: ['Дезоксирибонуклеиновая кислота', 'Динитрогеновая кислота', 'Декстрозонуклеиновая кислота', 'Двойная азотная кислота'] },
    KK: { q: 'ДНҚ қалай толық аталады?', a: ['Дезоксирибонуклеин қышқылы', 'Динитроген қышқылы', 'Декстрозонуклеин қышқылы', 'Қос азот қышқылы'] }
  },
  {
    level: 4, topic: 'science',
    EN: { q: 'What is the smallest bone in the human body?', a: ['The stirrup (stapes), in the ear', 'A finger bone', 'A toe bone', 'The kneecap'] },
    TR: { q: 'İnsan vücudunun en küçük kemiği hangisidir?', a: ['Kulaktaki üzengi kemiği', 'Bir parmak kemiği', 'Bir ayak parmağı kemiği', 'Diz kapağı'] },
    RU: { q: 'Какая кость в теле человека самая маленькая?', a: ['Стремечко в ухе', 'Фаланга пальца руки', 'Фаланга пальца ноги', 'Надколенник'] },
    KK: { q: 'Адам денесіндегі ең кішкентай сүйек қайсы?', a: ['Құлақтағы үзеңгі сүйек', 'Қол саусағының сүйегі', 'Аяқ саусағының сүйегі', 'Тізе тобығы'] }
  },
  {
    level: 4, topic: 'science',
    EN: { q: 'What is absolute zero in degrees Celsius?', a: ['−273.15 °C', '−100 °C', '0 °C', '−459.67 °C'] },
    TR: { q: 'Mutlak sıfır kaç santigrat derecedir?', a: ['−273,15 °C', '−100 °C', '0 °C', '−459,67 °C'] },
    RU: { q: 'Чему равен абсолютный ноль в градусах Цельсия?', a: ['−273,15 °C', '−100 °C', '0 °C', '−459,67 °C'] },
    KK: { q: 'Абсолюттік нөл Цельсий бойынша нешеге тең?', a: ['−273,15 °C', '−100 °C', '0 °C', '−459,67 °C'] }
  },
  {
    level: 4, topic: 'space',
    EN: { q: 'Which planet spins on its side, tilted almost 98 degrees?', a: ['Uranus', 'Neptune', 'Saturn', 'Mars'] },
    TR: { q: 'Yaklaşık 98 derece eğik, yan yatmış dönen gezegen hangisidir?', a: ['Uranüs', 'Neptün', 'Satürn', 'Mars'] },
    RU: { q: 'Какая планета вращается «лёжа на боку» с наклоном почти 98 градусов?', a: ['Уран', 'Нептун', 'Сатурн', 'Марс'] },
    KK: { q: 'Шамамен 98 градусқа еңкейіп, «қырынан жатып» айналатын планета қайсы?', a: ['Уран', 'Нептун', 'Сатурн', 'Марс'] }
  },
  {
    level: 4, topic: 'space',
    EN: { q: 'About how often does Halley’s Comet return?', a: ['About every 76 years', 'About every 25 years', 'About every 150 years', 'About every 10 years'] },
    TR: { q: 'Halley Kuyruklu Yıldızı yaklaşık kaç yılda bir geri döner?', a: ['Yaklaşık 76 yılda bir', 'Yaklaşık 25 yılda bir', 'Yaklaşık 150 yılda bir', 'Yaklaşık 10 yılda bir'] },
    RU: { q: 'Примерно раз в сколько лет возвращается комета Галлея?', a: ['Раз в 76 лет', 'Раз в 25 лет', 'Раз в 150 лет', 'Раз в 10 лет'] },
    KK: { q: 'Галлей құйрықты жұлдызы шамамен неше жылда бір қайта оралады?', a: ['Шамамен 76 жылда', 'Шамамен 25 жылда', 'Шамамен 150 жылда', 'Шамамен 10 жылда'] }
  },
  {
    level: 4, topic: 'math',
    EN: { q: 'What is 2 to the power of 10?', a: ['1024', '1000', '2048', '512'] },
    TR: { q: '2’nin 10. kuvveti kaçtır?', a: ['1024', '1000', '2048', '512'] },
    RU: { q: 'Чему равно 2 в десятой степени?', a: ['1024', '1000', '2048', '512'] },
    KK: { q: '2-нің оныншы дәрежесі нешеге тең?', a: ['1024', '1000', '2048', '512'] }
  },
  {
    level: 4, topic: 'math',
    EN: { q: 'How many sides does a dodecagon have?', a: ['12', '10', '20', '14'] },
    TR: { q: 'Bir dodekagonun kaç kenarı vardır?', a: ['12', '10', '20', '14'] },
    RU: { q: 'Сколько сторон у додекагона?', a: ['12', '10', '20', '14'] },
    KK: { q: 'Додекагонның неше қабырғасы бар?', a: ['12', '10', '20', '14'] }
  },
  {
    level: 4, topic: 'sport',
    EN: { q: 'How many players does a rugby union team have on the field?', a: ['15', '11', '13', '12'] },
    TR: { q: 'Rugby union’da sahada bir takımdan kaç oyuncu bulunur?', a: ['15', '11', '13', '12'] },
    RU: { q: 'Сколько игроков одной команды на поле в регби-15 (регби-юнион)?', a: ['15', '11', '13', '12'] },
    KK: { q: 'Регби-15-те алаңда бір команданың неше ойыншысы болады?', a: ['15', '11', '13', '12'] }
  },
  {
    level: 4, topic: 'sport',
    EN: { q: 'How many players are in a water polo team in the pool?', a: ['7', '6', '5', '11'] },
    TR: { q: 'Sutopunda havuzda bir takımdan kaç oyuncu bulunur?', a: ['7', '6', '5', '11'] },
    RU: { q: 'Сколько игроков одной команды в бассейне в водном поло?', a: ['7', '6', '5', '11'] },
    KK: { q: 'Су добында бассейнде бір команданың неше ойыншысы болады?', a: ['7', '6', '5', '11'] }
  },
  {
    level: 4, topic: 'geo',
    EN: { q: 'Which is the largest country in Africa by area?', a: ['Algeria', 'DR Congo', 'Sudan', 'Libya'] },
    TR: { q: 'Yüz ölçümüne göre Afrika’nın en büyük ülkesi hangisidir?', a: ['Cezayir', 'Kongo DC', 'Sudan', 'Libya'] },
    RU: { q: 'Какая страна самая большая в Африке по площади?', a: ['Алжир', 'ДР Конго', 'Судан', 'Ливия'] },
    KK: { q: 'Ауданы бойынша Африкадағы ең үлкен ел қайсы?', a: ['Алжир', 'Конго ДР', 'Судан', 'Ливия'] }
  },
  {
    level: 4, topic: 'geo',
    EN: { q: 'Which is the highest mountain in Kazakhstan?', a: ['Khan Tengri', 'Belukha', 'Talgar', 'Elbrus'] },
    TR: { q: 'Kazakistan’ın en yüksek dağı hangisidir?', a: ['Han Tengri', 'Beluha', 'Talgar', 'Elbruz'] },
    RU: { q: 'Какая гора самая высокая в Казахстане?', a: ['Хан-Тенгри', 'Белуха', 'Талгар', 'Эльбрус'] },
    KK: { q: 'Қазақстандағы ең биік тау қайсы?', a: ['Хан Тәңірі', 'Мұзтау (Белуха)', 'Талғар', 'Эльбрус'] }
  },
  {
    level: 4, topic: 'geo',
    EN: { q: 'Which country has the longest coastline in the world?', a: ['Canada', 'Russia', 'Indonesia', 'Australia'] },
    TR: { q: 'Dünyanın en uzun kıyı şeridine sahip ülke hangisidir?', a: ['Kanada', 'Rusya', 'Endonezya', 'Avustralya'] },
    RU: { q: 'У какой страны самая длинная береговая линия в мире?', a: ['У Канады', 'У России', 'У Индонезии', 'У Австралии'] },
    KK: { q: 'Әлемдегі ең ұзын жағалау сызығы қай елде?', a: ['Канада', 'Ресей', 'Индонезия', 'Аустралия'] }
  },
  {
    level: 4, topic: 'geo',
    EN: { q: 'Whose flag shows a green cedar tree?', a: ['Lebanon', 'Cyprus', 'Canada', 'Israel'] },
    TR: { q: 'Bayrağında yeşil bir sedir ağacı bulunan ülke hangisidir?', a: ['Lübnan', 'Kıbrıs', 'Kanada', 'İsrail'] },
    RU: { q: 'На флаге какой страны изображён зелёный кедр?', a: ['Ливана', 'Кипра', 'Канады', 'Израиля'] },
    KK: { q: 'Қай елдің туында жасыл самырсын бейнеленген?', a: ['Ливан', 'Кипр', 'Канада', 'Израиль'] }
  },
  {
    level: 4, topic: 'geo',
    EN: { q: 'The wild ancestor of the apple grows in the mountains near which city?', a: ['Almaty', 'Ankara', 'Moscow', 'Tbilisi'] },
    TR: { q: 'Kültür elmasının yabani atası hangi şehrin yakınındaki dağlarda yetişir?', a: ['Almatı', 'Ankara', 'Moskova', 'Tiflis'] },
    RU: { q: 'Дикий предок культурной яблони растёт в горах возле какого города?', a: ['Алматы', 'Анкары', 'Москвы', 'Тбилиси'] },
    KK: { q: 'Мәдени алманың жабайы арғы тегі қай қаланың маңындағы тауларда өседі?', a: ['Алматы', 'Анкара', 'Мәскеу', 'Тбилиси'] }
  },
  {
    level: 4, topic: 'history',
    EN: { q: 'Which battle in 1071 opened Anatolia to the Turks?', a: ['Battle of Manzikert (Malazgirt)', 'Battle of Kosovo', 'Battle of Varna', 'Battle of Mohács'] },
    TR: { q: '1071’de Anadolu’nun kapılarını Türklere açan savaş hangisidir?', a: ['Malazgirt Meydan Muharebesi', 'Kosova Savaşı', 'Varna Savaşı', 'Mohaç Meydan Muharebesi'] },
    RU: { q: 'Какая битва в 1071 году открыла туркам путь в Анатолию?', a: ['Битва при Манцикерте', 'Битва на Косовом поле', 'Битва при Варне', 'Битва при Мохаче'] },
    KK: { q: '1071 жылы түріктерге Анадолыға жол ашқан шайқас қайсы?', a: ['Малазгирт шайқасы', 'Косово шайқасы', 'Варна шайқасы', 'Мохач шайқасы'] }
  },
  {
    level: 4, topic: 'history',
    EN: { q: 'In which century was the Kazakh Khanate founded?', a: ['The 15th century', 'The 13th century', 'The 17th century', 'The 11th century'] },
    TR: { q: 'Kazak Hanlığı hangi yüzyılda kuruldu?', a: ['15. yüzyıl', '13. yüzyıl', '17. yüzyıl', '11. yüzyıl'] },
    RU: { q: 'В каком веке было основано Казахское ханство?', a: ['В XV веке', 'В XIII веке', 'В XVII веке', 'В XI веке'] },
    KK: { q: 'Қазақ хандығы қай ғасырда құрылды?', a: ['XV ғасырда', 'XIII ғасырда', 'XVII ғасырда', 'XI ғасырда'] }
  },
  {
    level: 4, topic: 'history',
    EN: { q: 'Who founded the Kazakh Khanate?', a: ['Kerey and Janibek', 'Abylai Khan', 'Kenesary Khan', 'Tauke Khan'] },
    TR: { q: 'Kazak Hanlığı’nı kim kurdu?', a: ['Kerey ve Canıbek', 'Ablay Han', 'Kenesarı Han', 'Tevke Han'] },
    RU: { q: 'Кто основал Казахское ханство?', a: ['Керей и Жанибек', 'Абылай-хан', 'Кенесары-хан', 'Тауке-хан'] },
    KK: { q: 'Қазақ хандығының негізін кімдер қалады?', a: ['Керей мен Жәнібек', 'Абылай хан', 'Кенесары хан', 'Тәуке хан'] }
  },
  {
    level: 4, topic: 'history',
    EN: { q: 'Which treaty formally ended World War I with Germany?', a: ['The Treaty of Versailles', 'The Treaty of Sèvres', 'The Treaty of Lausanne', 'The Treaty of Brest-Litovsk'] },
    TR: { q: 'Birinci Dünya Savaşı’nı Almanya ile resmen bitiren antlaşma hangisidir?', a: ['Versay Antlaşması', 'Sevr Antlaşması', 'Lozan Antlaşması', 'Brest-Litovsk Antlaşması'] },
    RU: { q: 'Какой договор официально завершил Первую мировую войну с Германией?', a: ['Версальский договор', 'Севрский договор', 'Лозаннский договор', 'Брестский мир'] },
    KK: { q: 'Германиямен Бірінші дүниежүзілік соғысты ресми түрде аяқтаған шарт қайсы?', a: ['Версаль бітімі', 'Севр бітімі', 'Лозанна бітімі', 'Брест бітімі'] }
  },
  {
    level: 4, topic: 'history',
    EN: { q: 'In which year was the Treaty of Lausanne signed?', a: ['1923', '1920', '1918', '1938'] },
    TR: { q: 'Lozan Antlaşması hangi yıl imzalandı?', a: ['1923', '1920', '1918', '1938'] },
    RU: { q: 'В каком году был подписан Лозаннский мирный договор?', a: ['1923', '1920', '1918', '1938'] },
    KK: { q: 'Лозанна бітімі қай жылы қол қойылды?', a: ['1923', '1920', '1918', '1938'] }
  },
  {
    level: 4, topic: 'history',
    EN: { q: 'Which Ottoman sultan reigned the longest?', a: ['Suleiman the Magnificent', 'Mehmed II', 'Abdulhamid II', 'Selim I'] },
    TR: { q: 'En uzun süre tahtta kalan Osmanlı padişahı kimdir?', a: ['Kanuni Sultan Süleyman', 'Fatih Sultan Mehmed', 'II. Abdülhamid', 'Yavuz Sultan Selim'] },
    RU: { q: 'Какой османский султан правил дольше всех?', a: ['Сулейман Великолепный', 'Мехмед II', 'Абдул-Хамид II', 'Селим I'] },
    KK: { q: 'Қай осман сұлтаны ең ұзақ билеген?', a: ['Сүлеймен Кануни', 'Мехмед II', 'Әбдулхамид II', 'Селим I'] }
  },
  {
    level: 4, topic: 'history',
    EN: { q: 'In which city is the mausoleum of Khoja Ahmed Yasawi?', a: ['Turkistan', 'Taraz', 'Samarkand', 'Bukhara'] },
    TR: { q: 'Hoca Ahmed Yesevi Türbesi hangi şehirdedir?', a: ['Türkistan', 'Taraz', 'Semerkant', 'Buhara'] },
    RU: { q: 'В каком городе находится мавзолей Ходжи Ахмеда Ясави?', a: ['В Туркестане', 'В Таразе', 'В Самарканде', 'В Бухаре'] },
    KK: { q: 'Қожа Ахмет Ясауи кесенесі қай қалада орналасқан?', a: ['Түркістан', 'Тараз', 'Самарқанд', 'Бұхара'] }
  },
  {
    level: 4, topic: 'space',
    EN: { q: 'Who was the first Kazakh cosmonaut?', a: ['Tokhtar Aubakirov', 'Talgat Musabayev', 'Aidyn Aimbetov', 'Yuri Gagarin'] },
    TR: { q: 'İlk Kazak kozmonot kimdir?', a: ['Tohtar Aubakirov', 'Talgat Musabayev', 'Aydın Aimbetov', 'Yuri Gagarin'] },
    RU: { q: 'Кто был первым казахским космонавтом?', a: ['Тохтар Аубакиров', 'Талгат Мусабаев', 'Айдын Аимбетов', 'Юрий Гагарин'] },
    KK: { q: 'Тұңғыш қазақ ғарышкері кім?', a: ['Тоқтар Әубәкіров', 'Талғат Мұсабаев', 'Айдын Айымбетов', 'Юрий Гагарин'] }
  },
  {
    level: 4, topic: 'space',
    EN: { q: 'Who was the first citizen of Turkey to go to space?', a: ['Alper Gezeravcı', 'Tuva Cihangir Atasever', 'Aziz Sancar', 'Cahit Arf'] },
    TR: { q: 'Uzaya giden ilk Türk vatandaşı kimdir?', a: ['Alper Gezeravcı', 'Tuva Cihangir Atasever', 'Aziz Sancar', 'Cahit Arf'] },
    RU: { q: 'Кто стал первым гражданином Турции, побывавшим в космосе?', a: ['Альпер Гезераджи', 'Тува Джихангир Атасевер', 'Азиз Санджар', 'Джахит Арф'] },
    KK: { q: 'Ғарышқа ұшқан алғашқы Түркия азаматы кім?', a: ['Альпер Гезераджи', 'Тува Джихангир Атасевер', 'Азиз Санджар', 'Джахит Арф'] }
  },
  {
    level: 4, topic: 'music',
    EN: { q: 'How many symphonies did Beethoven complete?', a: ['9', '5', '7', '12'] },
    TR: { q: 'Beethoven kaç senfoni tamamladı?', a: ['9', '5', '7', '12'] },
    RU: { q: 'Сколько симфоний завершил Бетховен?', a: ['9', '5', '7', '12'] },
    KK: { q: 'Бетховен неше симфония жазып бітірді?', a: ['9', '5', '7', '12'] }
  },
  {
    level: 4, topic: 'music',
    EN: { q: 'Kurmangazy is famous for his kuys. On which instrument are they played?', a: ['Dombra', 'Kobyz', 'Piano', 'Sybyzgy'] },
    TR: { q: 'Kurmangazı küyleriyle ünlüdür. Bu küyler hangi çalgıyla çalınır?', a: ['Dombra', 'Kıl kobız', 'Piyano', 'Sıbızgı'] },
    RU: { q: 'Курмангазы прославился кюями. На каком инструменте их исполняют?', a: ['Домбра', 'Кобыз', 'Фортепиано', 'Сыбызгы'] },
    KK: { q: 'Құрманғазының күйлері қай аспапта орындалады?', a: ['Домбыра', 'Қобыз', 'Фортепиано', 'Сыбызғы'] }
  },
  {
    level: 4, topic: 'literature',
    EN: { q: 'Who wrote “The Master and Margarita”?', a: ['Mikhail Bulgakov', 'Boris Pasternak', 'Maxim Gorky', 'Anton Chekhov'] },
    TR: { q: '“Usta ile Margarita”yı kim yazdı?', a: ['Mihail Bulgakov', 'Boris Pasternak', 'Maksim Gorki', 'Anton Çehov'] },
    RU: { q: 'Кто написал роман «Мастер и Маргарита»?', a: ['Михаил Булгаков', 'Борис Пастернак', 'Максим Горький', 'Антон Чехов'] },
    KK: { q: '«Шебер мен Маргарита» романын кім жазған?', a: ['Михаил Булгаков', 'Борис Пастернак', 'Максим Горький', 'Антон Чехов'] }
  },
  {
    level: 4, topic: 'history',
    EN: { q: 'Which country first used paper money?', a: ['China', 'Persia', 'Egypt', 'Greece'] },
    TR: { q: 'Kâğıt parayı ilk kullanan ülke hangisidir?', a: ['Çin', 'İran', 'Mısır', 'Yunanistan'] },
    RU: { q: 'В какой стране впервые появились бумажные деньги?', a: ['В Китае', 'В Персии', 'В Египте', 'В Греции'] },
    KK: { q: 'Қағаз ақшаны алғаш қай ел қолданған?', a: ['Қытай', 'Парсы', 'Мысыр', 'Грекия'] }
  },
  {
    level: 4, topic: 'science',
    EN: { q: 'Who is the only person to win Nobel Prizes in two different sciences?', a: ['Marie Curie', 'Linus Pauling', 'Albert Einstein', 'Niels Bohr'] },
    TR: { q: 'İki farklı bilim dalında Nobel kazanan tek kişi kimdir?', a: ['Marie Curie', 'Linus Pauling', 'Albert Einstein', 'Niels Bohr'] },
    RU: { q: 'Кто единственный получил Нобелевские премии в двух разных науках?', a: ['Мария Кюри', 'Лайнус Полинг', 'Альберт Эйнштейн', 'Нильс Бор'] },
    KK: { q: 'Екі түрлі ғылым саласында Нобель сыйлығын алған жалғыз адам кім?', a: ['Мария Кюри', 'Лайнус Полинг', 'Альберт Эйнштейн', 'Нильс Бор'] }
  },
  {
    level: 4, topic: 'science',
    EN: { q: 'Roughly how fast does sound travel through air?', a: ['About 343 m/s', 'About 1,500 m/s', 'About 3,000 m/s', 'About 150 m/s'] },
    TR: { q: 'Ses havada yaklaşık ne hızla yayılır?', a: ['Yaklaşık 343 m/sn', 'Yaklaşık 1.500 m/sn', 'Yaklaşık 3.000 m/sn', 'Yaklaşık 150 m/sn'] },
    RU: { q: 'Примерно с какой скоростью звук распространяется в воздухе?', a: ['Около 343 м/с', 'Около 1 500 м/с', 'Около 3 000 м/с', 'Около 150 м/с'] },
    KK: { q: 'Дыбыс ауада шамамен қандай жылдамдықпен таралады?', a: ['Шамамен 343 м/с', 'Шамамен 1 500 м/с', 'Шамамен 3 000 м/с', 'Шамамен 150 м/с'] }
  },
  {
    level: 4, topic: 'space',
    EN: { q: 'Which planet would float in water, if there were a bath big enough?', a: ['Saturn', 'Jupiter', 'Neptune', 'Uranus'] },
    TR: { q: 'Yeterince büyük bir küvet olsa hangi gezegen suda yüzerdi?', a: ['Satürn', 'Jüpiter', 'Neptün', 'Uranüs'] },
    RU: { q: 'Какая планета не утонула бы в воде, найдись достаточно большая ванна?', a: ['Сатурн', 'Юпитер', 'Нептун', 'Уран'] },
    KK: { q: 'Жеткілікті үлкен ванна болса, қай планета суда қалқып жүрер еді?', a: ['Сатурн', 'Юпитер', 'Нептун', 'Уран'] }
  },
  {
    level: 5, topic: 'geo',
    EN: { q: 'Which country has the most time zones, overseas territories included?', a: ['France', 'Russia', 'USA', 'United Kingdom'] },
    TR: { q: 'Denizaşırı toprakları da sayılınca en çok saat dilimine sahip ülke hangisidir?', a: ['Fransa', 'Rusya', 'ABD', 'Birleşik Krallık'] },
    RU: { q: 'У какой страны больше всего часовых поясов с учётом заморских территорий?', a: ['У Франции', 'У России', 'У США', 'У Великобритании'] },
    KK: { q: 'Теңіз асты аумақтарын қоса есептегенде, ең көп сағат белдеуі қай елде?', a: ['Франция', 'Ресей', 'АҚШ', 'Ұлыбритания'] }
  },
  {
    level: 5, topic: 'geo',
    EN: { q: 'Which country has the most islands in the world?', a: ['Sweden', 'Indonesia', 'Philippines', 'Canada'] },
    TR: { q: 'Dünyada en çok adaya sahip ülke hangisidir?', a: ['İsveç', 'Endonezya', 'Filipinler', 'Kanada'] },
    RU: { q: 'В какой стране больше всего островов в мире?', a: ['В Швеции', 'В Индонезии', 'На Филиппинах', 'В Канаде'] },
    KK: { q: 'Әлемде ең көп арал қай елде?', a: ['Швеция', 'Индонезия', 'Филиппин', 'Канада'] }
  },
  {
    level: 5, topic: 'science',
    EN: { q: 'Which metal has the highest melting point?', a: ['Tungsten', 'Iron', 'Titanium', 'Platinum'] },
    TR: { q: 'Erime noktası en yüksek metal hangisidir?', a: ['Tungsten (volfram)', 'Demir', 'Titanyum', 'Platin'] },
    RU: { q: 'У какого металла самая высокая температура плавления?', a: ['У вольфрама', 'У железа', 'У титана', 'У платины'] },
    KK: { q: 'Қай металдың балқу температурасы ең жоғары?', a: ['Вольфрам', 'Темір', 'Титан', 'Платина'] }
  },
  {
    level: 5, topic: 'history',
    EN: { q: 'The Rosetta Stone helped scholars decipher what?', a: ['Egyptian hieroglyphs', 'Mayan glyphs', 'Cuneiform', 'Linear B'] },
    TR: { q: 'Rosetta Taşı bilim insanlarının neyi çözmesine yardım etti?', a: ['Mısır hiyerogliflerini', 'Maya yazısını', 'Çivi yazısını', 'Lineer B yazısını'] },
    RU: { q: 'Что помог расшифровать Розеттский камень?', a: ['Египетские иероглифы', 'Письменность майя', 'Клинопись', 'Линейное письмо Б'] },
    KK: { q: 'Розетта тасы ғалымдарға нені оқуға көмектесті?', a: ['Мысыр иероглифтерін', 'Майя жазуын', 'Сына жазуды', 'Б сызықтық жазуын'] }
  },
  {
    level: 5, topic: 'language',
    EN: { q: 'The Orkhon inscriptions are the oldest known texts in which language?', a: ['Old Turkic', 'Old Persian', 'Old Mongolian', 'Old Chinese'] },
    TR: { q: 'Orhun Yazıtları hangi dilin bilinen en eski metinleridir?', a: ['Eski Türkçe', 'Eski Farsça', 'Eski Moğolca', 'Eski Çince'] },
    RU: { q: 'Орхонские надписи — древнейшие известные тексты на каком языке?', a: ['На древнетюркском', 'На древнеперсидском', 'На старомонгольском', 'На древнекитайском'] },
    KK: { q: 'Орхон жазбалары қай тілдегі ең көне мәтіндер болып саналады?', a: ['Көне түркі тілі', 'Көне парсы тілі', 'Көне моңғол тілі', 'Көне қытай тілі'] }
  },
  {
    level: 5, topic: 'literature',
    EN: { q: 'Who wrote the 11th-century Turkic work “Kutadgu Bilig”?', a: ['Yusuf Balasaguni (Has Hajib)', 'Mahmud al-Kashgari', 'Khoja Ahmed Yasawi', 'Al-Farabi'] },
    TR: { q: '11. yüzyıl eseri “Kutadgu Bilig”i kim yazdı?', a: ['Yusuf Has Hacib', 'Kaşgarlı Mahmud', 'Hoca Ahmed Yesevi', 'Farabi'] },
    RU: { q: 'Кто написал тюркскую поэму XI века «Кутадгу билиг»?', a: ['Юсуф Баласагуни', 'Махмуд Кашгари', 'Ходжа Ахмед Ясави', 'Аль-Фараби'] },
    KK: { q: 'XI ғасырдағы «Құтадғу біліг» еңбегін кім жазған?', a: ['Жүсіп Баласағұн', 'Махмұд Қашқари', 'Қожа Ахмет Ясауи', 'Әл-Фараби'] }
  },
  {
    level: 5, topic: 'history',
    EN: { q: 'Al-Farabi was called the “Second Teacher”. Who was the first?', a: ['Aristotle', 'Plato', 'Socrates', 'Avicenna'] },
    TR: { q: 'Farabi’ye “İkinci Öğretmen” denir. Birinci öğretmen kimdir?', a: ['Aristoteles', 'Platon', 'Sokrates', 'İbn Sina'] },
    RU: { q: 'Аль-Фараби называли «Вторым учителем». Кто считался первым?', a: ['Аристотель', 'Платон', 'Сократ', 'Авиценна'] },
    KK: { q: 'Әл-Фарабиді «Екінші ұстаз» деп атаған. Бірінші ұстаз кім саналған?', a: ['Аристотель', 'Платон', 'Сократ', 'Ибн Сина'] }
  },
  {
    level: 5, topic: 'music',
    EN: { q: 'Which legendary figure is said to have invented the kobyz?', a: ['Korkyt Ata', 'Asan Kaigy', 'Abai', 'Kurmangazy'] },
    TR: { q: 'Rivayete göre kıl kobızı kim icat etti?', a: ['Dede Korkut (Korkut Ata)', 'Asan Kaygı', 'Abay', 'Kurmangazı'] },
    RU: { q: 'Какой легендарный персонаж, по преданию, создал кобыз?', a: ['Коркыт-ата', 'Асан Кайгы', 'Абай', 'Курмангазы'] },
    KK: { q: 'Аңыз бойынша қобызды кім ойлап тапқан?', a: ['Қорқыт ата', 'Асан қайғы', 'Абай', 'Құрманғазы'] }
  },
  {
    level: 5, topic: 'science',
    EN: { q: 'Which is the rarest blood type?', a: ['AB negative', 'O negative', 'B negative', 'A negative'] },
    TR: { q: 'En nadir kan grubu hangisidir?', a: ['AB Rh negatif', '0 Rh negatif', 'B Rh negatif', 'A Rh negatif'] },
    RU: { q: 'Какая группа крови самая редкая?', a: ['Четвёртая отрицательная (AB−)', 'Первая отрицательная (0−)', 'Третья отрицательная (B−)', 'Вторая отрицательная (A−)'] },
    KK: { q: 'Ең сирек қан тобы қайсы?', a: ['Төртінші теріс (AB−)', 'Бірінші теріс (0−)', 'Үшінші теріс (B−)', 'Екінші теріс (A−)'] }
  },
  {
    level: 5, topic: 'math',
    EN: { q: 'Which of these is a “perfect number”, equal to the sum of its other divisors?', a: ['28', '12', '20', '30'] },
    TR: { q: 'Bunlardan hangisi kendisi dışındaki bölenlerinin toplamına eşit olan bir “mükemmel sayı”dır?', a: ['28', '12', '20', '30'] },
    RU: { q: 'Какое из этих чисел «совершенное», то есть равно сумме своих делителей, кроме себя?', a: ['28', '12', '20', '30'] },
    KK: { q: 'Бұлардың қайсысы өзінен басқа бөлгіштерінің қосындысына тең «кемел сан» болып табылады?', a: ['28', '12', '20', '30'] }
  },
  {
    level: 5, topic: 'sport',
    EN: { q: 'What is the maximum break in snooker?', a: ['147', '155', '100', '180'] },
    TR: { q: 'Snookerda tek seferde alınabilecek en yüksek sayı (maksimum break) kaçtır?', a: ['147', '155', '100', '180'] },
    RU: { q: 'Каков максимальный брейк в снукере?', a: ['147', '155', '100', '180'] },
    KK: { q: 'Снукердегі ең жоғары брейк неше ұпай?', a: ['147', '155', '100', '180'] }
  },
  {
    level: 5, topic: 'science',
    EN: { q: 'Which element is the most abundant in the universe after hydrogen?', a: ['Helium', 'Oxygen', 'Carbon', 'Iron'] },
    TR: { q: 'Evrende hidrojenden sonra en bol bulunan element hangisidir?', a: ['Helyum', 'Oksijen', 'Karbon', 'Demir'] },
    RU: { q: 'Какой элемент во Вселенной самый распространённый после водорода?', a: ['Гелий', 'Кислород', 'Углерод', 'Железо'] },
    KK: { q: 'Ғаламда сутегіден кейінгі ең көп таралған элемент қайсы?', a: ['Гелий', 'Оттегі', 'Көміртегі', 'Темір'] }
  },
  {
    level: 5, topic: 'history',
    EN: { q: 'Which city was the capital of the Golden Horde?', a: ['Sarai', 'Karakorum', 'Samarkand', 'Kazan'] },
    TR: { q: 'Altın Orda Devleti’nin başkenti neresiydi?', a: ['Saray', 'Karakurum', 'Semerkant', 'Kazan'] },
    RU: { q: 'Какой город был столицей Золотой Орды?', a: ['Сарай', 'Каракорум', 'Самарканд', 'Казань'] },
    KK: { q: 'Алтын Орданың астанасы қай қала болған?', a: ['Сарай', 'Қарақорым', 'Самарқанд', 'Қазан'] }
  },
  {
    level: 5, topic: 'history',
    EN: { q: 'Which empire’s capital was Karakorum?', a: ['The Mongol Empire', 'The Göktürk Khaganate', 'The Golden Horde', 'The Timurid Empire'] },
    TR: { q: 'Karakurum hangi devletin başkentiydi?', a: ['Moğol İmparatorluğu', 'Göktürk Kağanlığı', 'Altın Orda', 'Timur İmparatorluğu'] },
    RU: { q: 'Столицей какого государства был Каракорум?', a: ['Монгольской империи', 'Тюркского каганата', 'Золотой Орды', 'Империи Тимуридов'] },
    KK: { q: 'Қарақорым қай мемлекеттің астанасы болған?', a: ['Моңғол империясы', 'Түрік қағанаты', 'Алтын Орда', 'Темір әулеті империясы'] }
  },
  {
    level: 5, topic: 'space',
    EN: { q: 'Which was the first animal to orbit the Earth?', a: ['Laika, a dog', 'Ham, a chimpanzee', 'Belka, a dog', 'Félicette, a cat'] },
    TR: { q: 'Dünya yörüngesine çıkan ilk hayvan hangisidir?', a: ['Köpek Layka', 'Şempanze Ham', 'Köpek Belka', 'Kedi Félicette'] },
    RU: { q: 'Какое животное первым вышло на орбиту Земли?', a: ['Собака Лайка', 'Шимпанзе Хэм', 'Собака Белка', 'Кошка Фелисетт'] },
    KK: { q: 'Жер орбитасына бірінші шыққан жануар қайсы?', a: ['Лайка есімді ит', 'Хэм есімді шимпанзе', 'Белка есімді ит', 'Фелисетт есімді мысық'] }
  },
  {
    level: 5, topic: 'art',
    EN: { q: 'In which museum is the Mona Lisa kept?', a: ['The Louvre', 'The Prado', 'The Uffizi', 'The British Museum'] },
    TR: { q: 'Mona Lisa hangi müzede sergilenir?', a: ['Louvre', 'Prado', 'Uffizi', 'British Museum'] },
    RU: { q: 'В каком музее хранится «Мона Лиза»?', a: ['В Лувре', 'В Прадо', 'В Уффици', 'В Британском музее'] },
    KK: { q: '«Мона Лиза» қай мұражайда сақтаулы?', a: ['Лувр', 'Прадо', 'Уффици', 'Британ мұражайы'] }
  },
  {
    level: 5, topic: 'literature',
    EN: { q: 'Which Kazakh writer wrote the epic novel “The Path of Abai”?', a: ['Mukhtar Auezov', 'Ilyas Yesenberlin', 'Sabit Mukanov', 'Gabit Musrepov'] },
    TR: { q: '“Abay Yolu” destansı romanını hangi Kazak yazar yazdı?', a: ['Muhtar Avezov', 'İlyas Esenberlin', 'Sabit Mukanov', 'Gabit Müsrepov'] },
    RU: { q: 'Какой казахский писатель написал роман-эпопею «Путь Абая»?', a: ['Мухтар Ауэзов', 'Ильяс Есенберлин', 'Сабит Муканов', 'Габит Мусрепов'] },
    KK: { q: '«Абай жолы» роман-эпопеясын қай қазақ жазушысы жазған?', a: ['Мұхтар Әуезов', 'Ілияс Есенберлин', 'Сәбит Мұқанов', 'Ғабит Мүсірепов'] }
  },
  {
    level: 5, topic: 'literature',
    EN: { q: 'Which Turkish poet wrote “Human Landscapes from My Country”?', a: ['Nazım Hikmet', 'Orhan Veli', 'Cemal Süreya', 'Attila İlhan'] },
    TR: { q: '“Memleketimden İnsan Manzaraları”nı hangi şair yazdı?', a: ['Nazım Hikmet', 'Orhan Veli', 'Cemal Süreya', 'Attila İlhan'] },
    RU: { q: 'Какой турецкий поэт написал «Человеческую панораму»?', a: ['Назым Хикмет', 'Орхан Вели', 'Джемаль Сюрейя', 'Аттила Ильхан'] },
    KK: { q: '«Адамзат панорамасы» («Memleketimden İnsan Manzaraları») шығармасын қай түрік ақыны жазған?', a: ['Назым Хикмет', 'Орхан Вели', 'Джемаль Сюрейя', 'Аттила Ильхан'] }
  },
  {
    level: 5, topic: 'geo',
    EN: { q: 'Which is the only sea in the world with no coastline?', a: ['The Sargasso Sea', 'The Aral Sea', 'The Coral Sea', 'The Tasman Sea'] },
    TR: { q: 'Dünyada hiç kıyısı olmayan tek deniz hangisidir?', a: ['Sargasso Denizi', 'Aral Gölü', 'Mercan Denizi', 'Tasman Denizi'] },
    RU: { q: 'Какое море — единственное в мире без берегов?', a: ['Саргассово море', 'Аральское море', 'Коралловое море', 'Тасманово море'] },
    KK: { q: 'Әлемде жағалауы мүлде жоқ жалғыз теңіз қайсы?', a: ['Саргасс теңізі', 'Арал теңізі', 'Маржан теңізі', 'Тасман теңізі'] }
  },
  {
    level: 5, topic: 'science',
    EN: { q: 'What is the most common element in the Earth’s crust?', a: ['Oxygen', 'Silicon', 'Iron', 'Aluminium'] },
    TR: { q: 'Yer kabuğunda en çok bulunan element hangisidir?', a: ['Oksijen', 'Silisyum', 'Demir', 'Alüminyum'] },
    RU: { q: 'Какой элемент самый распространённый в земной коре?', a: ['Кислород', 'Кремний', 'Железо', 'Алюминий'] },
    KK: { q: 'Жер қыртысында ең көп таралған элемент қайсы?', a: ['Оттегі', 'Кремний', 'Темір', 'Алюминий'] }
  },
  {
    level: 5, topic: 'history',
    EN: { q: 'In which year did the Ottoman Empire officially end, when the sultanate was abolished?', a: ['1922', '1918', '1923', '1908'] },
    TR: { q: 'Saltanatın kaldırılmasıyla Osmanlı İmparatorluğu resmen hangi yıl sona erdi?', a: ['1922', '1918', '1923', '1908'] },
    RU: { q: 'В каком году Османская империя официально прекратила существование с упразднением султаната?', a: ['1922', '1918', '1923', '1908'] },
    KK: { q: 'Сұлтандық жойылып, Осман империясы ресми түрде қай жылы тарады?', a: ['1922', '1918', '1923', '1908'] }
  },
  {
    level: 5, topic: 'nature',
    EN: { q: 'Which animal has the longest pregnancy?', a: ['The elephant', 'The blue whale', 'The giraffe', 'The rhinoceros'] },
    TR: { q: 'Gebelik süresi en uzun hayvan hangisidir?', a: ['Fil', 'Mavi balina', 'Zürafa', 'Gergedan'] },
    RU: { q: 'У какого животного самая долгая беременность?', a: ['У слона', 'У синего кита', 'У жирафа', 'У носорога'] },
    KK: { q: 'Қай жануардың буаздық мерзімі ең ұзақ?', a: ['Піл', 'Көк кит', 'Керік', 'Мүйізтұмсық'] }
  },
  {
    level: 5, topic: 'tech',
    EN: { q: 'Who is often called the first computer programmer?', a: ['Ada Lovelace', 'Alan Turing', 'Charles Babbage', 'Grace Hopper'] },
    TR: { q: 'Genellikle ilk bilgisayar programcısı olarak anılan kişi kimdir?', a: ['Ada Lovelace', 'Alan Turing', 'Charles Babbage', 'Grace Hopper'] },
    RU: { q: 'Кого часто называют первым программистом?', a: ['Аду Лавлейс', 'Алана Тьюринга', 'Чарльза Бэббиджа', 'Грейс Хоппер'] },
    KK: { q: 'Кімді жиі алғашқы бағдарламашы деп атайды?', a: ['Ада Лавлейс', 'Алан Тьюринг', 'Чарльз Бэббидж', 'Грейс Хоппер'] }
  },
  {
    level: 5, topic: 'math',
    EN: { q: 'Which mathematician proved that π is irrational for the first time?', a: ['Johann Heinrich Lambert', 'Leonhard Euler', 'Isaac Newton', 'Carl Friedrich Gauss'] },
    TR: { q: 'π’nin irrasyonel olduğunu ilk kez kanıtlayan matematikçi kimdir?', a: ['Johann Heinrich Lambert', 'Leonhard Euler', 'Isaac Newton', 'Carl Friedrich Gauss'] },
    RU: { q: 'Какой математик первым доказал иррациональность числа π?', a: ['Иоганн Генрих Ламберт', 'Леонард Эйлер', 'Исаак Ньютон', 'Карл Фридрих Гаусс'] },
    KK: { q: 'π санының иррационал екенін алғаш дәлелдеген математик кім?', a: ['Иоганн Генрих Ламберт', 'Леонард Эйлер', 'Исаак Ньютон', 'Карл Фридрих Гаусс'] }
  }
]
