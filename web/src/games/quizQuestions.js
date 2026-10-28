// Trivia bank for the online quiz race.
// In every entry the first answer is the correct one; the game shuffles the order.
// Devices only exchange question indexes, so each player sees their own language.
export const quizQuestions = [
  {
    EN: { q: 'What is the capital of Australia?', a: ['Canberra', 'Sydney', 'Melbourne', 'Perth'] },
    TR: { q: 'Avustralya’nın başkenti neresidir?', a: ['Canberra', 'Sidney', 'Melbourne', 'Perth'] },
    RU: { q: 'Какой город — столица Австралии?', a: ['Канберра', 'Сидней', 'Мельбурн', 'Перт'] },
    KK: { q: 'Австралияның астанасы қай қала?', a: ['Канберра', 'Сидней', 'Мельбурн', 'Перт'] }
  },
  {
    EN: { q: 'Which planet is known as the Red Planet?', a: ['Mars', 'Venus', 'Jupiter', 'Mercury'] },
    TR: { q: 'Hangi gezegen Kızıl Gezegen olarak bilinir?', a: ['Mars', 'Venüs', 'Jüpiter', 'Merkür'] },
    RU: { q: 'Какую планету называют Красной планетой?', a: ['Марс', 'Венера', 'Юпитер', 'Меркурий'] },
    KK: { q: 'Қай планетаны Қызыл планета деп атайды?', a: ['Марс', 'Шолпан', 'Юпитер', 'Меркурий'] }
  },
  {
    EN: { q: 'How many continents are there?', a: ['7', '5', '6', '8'] },
    TR: { q: 'Dünyada kaç kıta vardır?', a: ['7', '5', '6', '8'] },
    // Russian and Kazakh schools count six continents, so there the right answer is 6
    RU: { q: 'Сколько на Земле материков?', a: ['6', '5', '7', '8'] },
    KK: { q: 'Жер бетінде неше құрлық бар?', a: ['6', '5', '7', '8'] }
  },
  {
    EN: { q: 'Who painted the Mona Lisa?', a: ['Leonardo da Vinci', 'Michelangelo', 'Raphael', 'Vincent van Gogh'] },
    TR: { q: 'Mona Lisa tablosunu kim yaptı?', a: ['Leonardo da Vinci', 'Michelangelo', 'Raffaello', 'Vincent van Gogh'] },
    RU: { q: 'Кто написал «Мону Лизу»?', a: ['Леонардо да Винчи', 'Микеланджело', 'Рафаэль', 'Винсент Ван Гог'] },
    KK: { q: '«Мона Лизаны» кім салған?', a: ['Леонардо да Винчи', 'Микеланджело', 'Рафаэль', 'Винсент Ван Гог'] }
  },
  {
    EN: { q: 'What is the largest ocean on Earth?', a: ['Pacific Ocean', 'Atlantic Ocean', 'Indian Ocean', 'Arctic Ocean'] },
    TR: { q: 'Dünyanın en büyük okyanusu hangisidir?', a: ['Büyük Okyanus (Pasifik)', 'Atlas Okyanusu', 'Hint Okyanusu', 'Arktik Okyanusu'] },
    RU: { q: 'Какой океан самый большой на Земле?', a: ['Тихий океан', 'Атлантический океан', 'Индийский океан', 'Северный Ледовитый океан'] },
    KK: { q: 'Жердегі ең үлкен мұхит қайсы?', a: ['Тынық мұхит', 'Атлант мұхиты', 'Үнді мұхиты', 'Солтүстік Мұзды мұхит'] }
  },
  {
    EN: { q: 'What is the chemical symbol for gold?', a: ['Au', 'Ag', 'Go', 'Gd'] },
    TR: { q: 'Altının kimyasal sembolü nedir?', a: ['Au', 'Ag', 'Go', 'Gd'] },
    RU: { q: 'Какой химический символ у золота?', a: ['Au', 'Ag', 'Go', 'Gd'] },
    KK: { q: 'Алтынның химиялық таңбасы қандай?', a: ['Au', 'Ag', 'Go', 'Gd'] }
  },
  {
    EN: { q: 'In which year did the Ottomans conquer Istanbul (Constantinople)?', a: ['1453', '1071', '1299', '1517'] },
    TR: { q: 'İstanbul hangi yılda fethedildi?', a: ['1453', '1071', '1299', '1517'] },
    RU: { q: 'В каком году османы завоевали Стамбул (Константинополь)?', a: ['1453', '1071', '1299', '1517'] },
    KK: { q: 'Османдар Ыстамбұлды (Константинопольді) қай жылы жаулап алды?', a: ['1453', '1071', '1299', '1517'] }
  },
  {
    EN: { q: 'What is the hardest natural substance?', a: ['Diamond', 'Iron', 'Granite', 'Quartz'] },
    TR: { q: 'Doğadaki en sert madde hangisidir?', a: ['Elmas', 'Demir', 'Granit', 'Kuvars'] },
    RU: { q: 'Какое природное вещество самое твёрдое?', a: ['Алмаз', 'Железо', 'Гранит', 'Кварц'] },
    KK: { q: 'Табиғаттағы ең қатты зат қайсы?', a: ['Алмас', 'Темір', 'Гранит', 'Кварц'] }
  },
  {
    EN: { q: 'How many legs does a spider have?', a: ['8', '6', '10', '12'] },
    TR: { q: 'Bir örümceğin kaç bacağı vardır?', a: ['8', '6', '10', '12'] },
    RU: { q: 'Сколько ног у паука?', a: ['8', '6', '10', '12'] },
    KK: { q: 'Өрмекшінің неше аяғы бар?', a: ['8', '6', '10', '12'] }
  },
  {
    EN: { q: 'Which is the longest river in the world?', a: ['Nile', 'Amazon', 'Yangtze', 'Mississippi'] },
    TR: { q: 'Dünyanın en uzun nehri hangisidir?', a: ['Nil', 'Amazon', 'Yangtze', 'Mississippi'] },
    RU: { q: 'Какая река самая длинная в мире?', a: ['Нил', 'Амазонка', 'Янцзы', 'Миссисипи'] },
    KK: { q: 'Әлемдегі ең ұзын өзен қайсы?', a: ['Ніл', 'Амазонка', 'Янцзы', 'Миссисипи'] }
  },
  {
    EN: { q: 'What gas do plants absorb from the air?', a: ['Carbon dioxide', 'Oxygen', 'Nitrogen', 'Helium'] },
    TR: { q: 'Bitkiler havadan hangi gazı alır?', a: ['Karbondioksit', 'Oksijen', 'Azot', 'Helyum'] },
    RU: { q: 'Какой газ растения поглощают из воздуха?', a: ['Углекислый газ', 'Кислород', 'Азот', 'Гелий'] },
    KK: { q: 'Өсімдіктер ауадан қандай газды сіңіреді?', a: ['Көмірқышқыл газы', 'Оттегі', 'Азот', 'Гелий'] }
  },
  {
    EN: { q: 'Who wrote "Romeo and Juliet"?', a: ['William Shakespeare', 'Charles Dickens', 'Jane Austen', 'Mark Twain'] },
    TR: { q: '"Romeo ve Juliet"i kim yazdı?', a: ['William Shakespeare', 'Charles Dickens', 'Jane Austen', 'Mark Twain'] },
    RU: { q: 'Кто написал «Ромео и Джульетту»?', a: ['Уильям Шекспир', 'Чарльз Диккенс', 'Джейн Остин', 'Марк Твен'] },
    KK: { q: '«Ромео мен Джульеттаны» кім жазған?', a: ['Уильям Шекспир', 'Чарльз Диккенс', 'Джейн Остин', 'Марк Твен'] }
  },
  {
    EN: { q: 'What is the smallest prime number?', a: ['2', '1', '3', '0'] },
    TR: { q: 'En küçük asal sayı kaçtır?', a: ['2', '1', '3', '0'] },
    RU: { q: 'Какое самое маленькое простое число?', a: ['2', '1', '3', '0'] },
    KK: { q: 'Ең кіші жай сан қандай?', a: ['2', '1', '3', '0'] }
  },
  {
    EN: { q: 'Which country is home to the kangaroo?', a: ['Australia', 'South Africa', 'Brazil', 'India'] },
    TR: { q: 'Kanguru hangi ülkeye özgüdür?', a: ['Avustralya', 'Güney Afrika', 'Brezilya', 'Hindistan'] },
    RU: { q: 'В какой стране водятся кенгуру?', a: ['Австралия', 'ЮАР', 'Бразилия', 'Индия'] },
    KK: { q: 'Кенгуру қай елде мекендейді?', a: ['Австралия', 'Оңтүстік Африка', 'Бразилия', 'Үндістан'] }
  },
  {
    EN: { q: 'How many minutes are in a full day?', a: ['1440', '1200', '1600', '960'] },
    TR: { q: 'Bir günde kaç dakika vardır?', a: ['1440', '1200', '1600', '960'] },
    RU: { q: 'Сколько минут в сутках?', a: ['1440', '1200', '1600', '960'] },
    KK: { q: 'Бір тәулікте неше минут бар?', a: ['1440', '1200', '1600', '960'] }
  },
  {
    EN: { q: 'What is the largest planet in our solar system?', a: ['Jupiter', 'Saturn', 'Neptune', 'Earth'] },
    TR: { q: 'Güneş sistemimizin en büyük gezegeni hangisidir?', a: ['Jüpiter', 'Satürn', 'Neptün', 'Dünya'] },
    RU: { q: 'Какая планета самая большая в Солнечной системе?', a: ['Юпитер', 'Сатурн', 'Нептун', 'Земля'] },
    KK: { q: 'Күн жүйесіндегі ең үлкен планета қайсы?', a: ['Юпитер', 'Сатурн', 'Нептун', 'Жер'] }
  },
  {
    EN: { q: 'Which language has the most native speakers?', a: ['Mandarin Chinese', 'English', 'Spanish', 'Hindi'] },
    TR: { q: 'En çok anadil konuşanı olan dil hangisidir?', a: ['Mandarin Çincesi', 'İngilizce', 'İspanyolca', 'Hintçe'] },
    RU: { q: 'У какого языка больше всего носителей?', a: ['Китайский (мандаринский)', 'Английский', 'Испанский', 'Хинди'] },
    KK: { q: 'Қай тілді ана тілі деп санайтындар ең көп?', a: ['Қытай тілі (мандарин)', 'Ағылшын тілі', 'Испан тілі', 'Хинди'] }
  },
  {
    EN: { q: 'What is the boiling point of water at sea level?', a: ['100 °C', '90 °C', '80 °C', '120 °C'] },
    TR: { q: 'Deniz seviyesinde suyun kaynama noktası kaçtır?', a: ['100 °C', '90 °C', '80 °C', '120 °C'] },
    RU: { q: 'При какой температуре кипит вода на уровне моря?', a: ['100 °C', '90 °C', '80 °C', '120 °C'] },
    KK: { q: 'Теңіз деңгейінде су неше градуста қайнайды?', a: ['100 °C', '90 °C', '80 °C', '120 °C'] }
  },
  {
    EN: { q: 'Who was the founder of the Republic of Turkey?', a: ['Mustafa Kemal Atatürk', 'İsmet İnönü', 'Celal Bayar', 'Kazım Karabekir'] },
    TR: { q: 'Türkiye Cumhuriyeti’nin kurucusu kimdir?', a: ['Mustafa Kemal Atatürk', 'İsmet İnönü', 'Celal Bayar', 'Kazım Karabekir'] },
    RU: { q: 'Кто основал Турецкую Республику?', a: ['Мустафа Кемаль Ататюрк', 'Исмет Инёню', 'Джеляль Баяр', 'Кязым Карабекир'] },
    KK: { q: 'Түркия Республикасының негізін кім қалады?', a: ['Мұстафа Кемал Ататүрік', 'Исмет Инөню', 'Джелал Баяр', 'Кязым Карабекир'] }
  },
  {
    EN: { q: 'Which organ pumps blood through the body?', a: ['Heart', 'Lungs', 'Liver', 'Kidneys'] },
    TR: { q: 'Kanı vücuda pompalayan organ hangisidir?', a: ['Kalp', 'Akciğerler', 'Karaciğer', 'Böbrekler'] },
    RU: { q: 'Какой орган перекачивает кровь по телу?', a: ['Сердце', 'Лёгкие', 'Печень', 'Почки'] },
    KK: { q: 'Қанды бүкіл денеге қай мүше айдайды?', a: ['Жүрек', 'Өкпе', 'Бауыр', 'Бүйрек'] }
  },
  {
    EN: { q: 'In which city is the Eiffel Tower?', a: ['Paris', 'London', 'Rome', 'Berlin'] },
    TR: { q: 'Eyfel Kulesi hangi şehirdedir?', a: ['Paris', 'Londra', 'Roma', 'Berlin'] },
    RU: { q: 'В каком городе находится Эйфелева башня?', a: ['Париж', 'Лондон', 'Рим', 'Берлин'] },
    KK: { q: 'Эйфель мұнарасы қай қалада орналасқан?', a: ['Париж', 'Лондон', 'Рим', 'Берлин'] }
  },
  {
    EN: { q: 'How many players does a football (soccer) team have on the field?', a: ['11', '10', '9', '12'] },
    TR: { q: 'Bir futbol takımı sahada kaç oyuncuyla oynar?', a: ['11', '10', '9', '12'] },
    RU: { q: 'Сколько игроков одной футбольной команды находится на поле?', a: ['11', '10', '9', '12'] },
    KK: { q: 'Бір футбол командасының алаңда неше ойыншысы болады?', a: ['11', '10', '9', '12'] }
  },
  {
    EN: { q: 'What is the fastest land animal?', a: ['Cheetah', 'Lion', 'Horse', 'Gazelle'] },
    TR: { q: 'Karadaki en hızlı hayvan hangisidir?', a: ['Çita', 'Aslan', 'At', 'Ceylan'] },
    RU: { q: 'Какое животное самое быстрое на суше?', a: ['Гепард', 'Лев', 'Лошадь', 'Газель'] },
    KK: { q: 'Құрлықтағы ең жылдам жануар қайсы?', a: ['Гепард', 'Арыстан', 'Жылқы', 'Жейрен'] }
  },
  {
    EN: { q: 'What is 12 × 12?', a: ['144', '124', '132', '154'] },
    TR: { q: '12 × 12 kaçtır?', a: ['144', '124', '132', '154'] },
    RU: { q: 'Сколько будет 12 × 12?', a: ['144', '124', '132', '154'] },
    KK: { q: '12 × 12 нешеге тең?', a: ['144', '124', '132', '154'] }
  },
  {
    EN: { q: 'Which is the highest mountain in Turkey?', a: ['Mount Ararat (Ağrı)', 'Mount Erciyes', 'Uludağ', 'Mount Süphan'] },
    TR: { q: 'Türkiye’nin en yüksek dağı hangisidir?', a: ['Ağrı Dağı', 'Erciyes Dağı', 'Uludağ', 'Süphan Dağı'] },
    RU: { q: 'Какая гора самая высокая в Турции?', a: ['Арарат (Агры)', 'Эрджиес', 'Улудаг', 'Сюпхан'] },
    KK: { q: 'Түркиядағы ең биік тау қайсы?', a: ['Арарат (Ағры)', 'Эрджиес', 'Улудағ', 'Сүпхан'] }
  },
  {
    EN: { q: 'Which company makes the iPhone?', a: ['Apple', 'Samsung', 'Google', 'Microsoft'] },
    TR: { q: 'iPhone’u hangi şirket üretir?', a: ['Apple', 'Samsung', 'Google', 'Microsoft'] },
    RU: { q: 'Какая компания выпускает iPhone?', a: ['Apple', 'Samsung', 'Google', 'Microsoft'] },
    KK: { q: 'iPhone-ды қай компания шығарады?', a: ['Apple', 'Samsung', 'Google', 'Microsoft'] }
  },
  {
    EN: { q: 'What is the largest desert in the world (hot or cold)?', a: ['Antarctica', 'Sahara', 'Gobi', 'Arabian'] },
    TR: { q: 'Dünyanın en büyük çölü hangisidir (sıcak veya soğuk)?', a: ['Antarktika', 'Sahra', 'Gobi', 'Arabistan'] },
    RU: { q: 'Какая пустыня самая большая в мире (жаркая или холодная)?', a: ['Антарктическая', 'Сахара', 'Гоби', 'Аравийская'] },
    KK: { q: 'Әлемдегі ең үлкен шөл қайсы (ыстық не суық)?', a: ['Антарктида', 'Сахара', 'Гоби', 'Арабия'] }
  },
  {
    EN: { q: 'How many sides does a hexagon have?', a: ['6', '5', '7', '8'] },
    TR: { q: 'Bir altıgenin kaç kenarı vardır?', a: ['6', '5', '7', '8'] },
    RU: { q: 'Сколько сторон у шестиугольника?', a: ['6', '5', '7', '8'] },
    KK: { q: 'Алтыбұрыштың неше қабырғасы бар?', a: ['6', '5', '7', '8'] }
  },
  {
    EN: { q: 'Who developed the theory of relativity?', a: ['Albert Einstein', 'Isaac Newton', 'Nikola Tesla', 'Galileo Galilei'] },
    TR: { q: 'Görelilik kuramını kim geliştirdi?', a: ['Albert Einstein', 'Isaac Newton', 'Nikola Tesla', 'Galileo Galilei'] },
    RU: { q: 'Кто создал теорию относительности?', a: ['Альберт Эйнштейн', 'Исаак Ньютон', 'Никола Тесла', 'Галилео Галилей'] },
    KK: { q: 'Салыстырмалылық теориясын кім жасады?', a: ['Альберт Эйнштейн', 'Исаак Ньютон', 'Никола Тесла', 'Галилео Галилей'] }
  },
  {
    EN: { q: 'Which sea lies to the north of Turkey?', a: ['Black Sea', 'Mediterranean Sea', 'Aegean Sea', 'Red Sea'] },
    TR: { q: 'Türkiye’nin kuzeyinde hangi deniz vardır?', a: ['Karadeniz', 'Akdeniz', 'Ege Denizi', 'Kızıldeniz'] },
    RU: { q: 'Какое море омывает Турцию с севера?', a: ['Чёрное море', 'Средиземное море', 'Эгейское море', 'Красное море'] },
    KK: { q: 'Түркияның солтүстігінде қай теңіз жатыр?', a: ['Қара теңіз', 'Жерорта теңізі', 'Эгей теңізі', 'Қызыл теңіз'] }
  },
  {
    EN: { q: 'What is the main ingredient of guacamole?', a: ['Avocado', 'Tomato', 'Pepper', 'Onion'] },
    TR: { q: 'Guacamole’nin ana malzemesi nedir?', a: ['Avokado', 'Domates', 'Biber', 'Soğan'] },
    RU: { q: 'Что главный ингредиент гуакамоле?', a: ['Авокадо', 'Помидор', 'Перец', 'Лук'] },
    KK: { q: 'Гуакамоленің негізгі құрамдас бөлігі не?', a: ['Авокадо', 'Қызанақ', 'Бұрыш', 'Пияз'] }
  },
  {
    EN: { q: 'How many bones are in the adult human body?', a: ['206', '186', '226', '256'] },
    TR: { q: 'Yetişkin bir insanın vücudunda kaç kemik vardır?', a: ['206', '186', '226', '256'] },
    RU: { q: 'Сколько костей в теле взрослого человека?', a: ['206', '186', '226', '256'] },
    KK: { q: 'Ересек адамның денесінде неше сүйек бар?', a: ['206', '186', '226', '256'] }
  },
  {
    EN: { q: 'Which instrument has 88 keys?', a: ['Piano', 'Guitar', 'Violin', 'Flute'] },
    TR: { q: 'Hangi çalgının 88 tuşu vardır?', a: ['Piyano', 'Gitar', 'Keman', 'Flüt'] },
    RU: { q: 'У какого инструмента 88 клавиш?', a: ['Фортепиано', 'Гитара', 'Скрипка', 'Флейта'] },
    KK: { q: 'Қай аспаптың 88 пернесі бар?', a: ['Фортепиано', 'Гитара', 'Скрипка', 'Флейта'] }
  },
  {
    EN: { q: 'What is the currency of Japan?', a: ['Yen', 'Won', 'Yuan', 'Ringgit'] },
    TR: { q: 'Japonya’nın para birimi nedir?', a: ['Yen', 'Won', 'Yuan', 'Ringgit'] },
    RU: { q: 'Какая валюта в Японии?', a: ['Иена', 'Вона', 'Юань', 'Ринггит'] },
    KK: { q: 'Жапонияның валютасы қандай?', a: ['Иена', 'Вона', 'Юань', 'Ринггит'] }
  },
  {
    EN: { q: 'Which star is closest to Earth?', a: ['The Sun', 'Sirius', 'Proxima Centauri', 'Polaris'] },
    TR: { q: 'Dünya’ya en yakın yıldız hangisidir?', a: ['Güneş', 'Sirius', 'Proxima Centauri', 'Kutup Yıldızı'] },
    RU: { q: 'Какая звезда ближе всего к Земле?', a: ['Солнце', 'Сириус', 'Проксима Центавра', 'Полярная звезда'] },
    KK: { q: 'Жерге ең жақын жұлдыз қайсы?', a: ['Күн', 'Сириус', 'Проксима Центавр', 'Темірқазық'] }
  },
  {
    EN: { q: 'How many colors are in a rainbow?', a: ['7', '5', '6', '8'] },
    TR: { q: 'Gökkuşağında kaç renk vardır?', a: ['7', '5', '6', '8'] },
    RU: { q: 'Сколько цветов в радуге?', a: ['7', '5', '6', '8'] },
    KK: { q: 'Кемпірқосақта неше түс бар?', a: ['7', '5', '6', '8'] }
  },
  {
    EN: { q: 'Which country hosted the 2016 Summer Olympics?', a: ['Brazil', 'China', 'United Kingdom', 'Japan'] },
    TR: { q: '2016 Yaz Olimpiyatları hangi ülkede yapıldı?', a: ['Brezilya', 'Çin', 'Birleşik Krallık', 'Japonya'] },
    RU: { q: 'Какая страна принимала летние Олимпийские игры 2016 года?', a: ['Бразилия', 'Китай', 'Великобритания', 'Япония'] },
    KK: { q: '2016 жылғы жазғы Олимпиада ойындары қай елде өтті?', a: ['Бразилия', 'Қытай', 'Ұлыбритания', 'Жапония'] }
  },
  {
    EN: { q: 'What does "www" stand for in a website address?', a: ['World Wide Web', 'Wide World Web', 'Web World Wide', 'World Web Wire'] },
    TR: { q: 'İnternet adreslerindeki "www" neyin kısaltmasıdır?', a: ['World Wide Web', 'Wide World Web', 'Web World Wide', 'World Web Wire'] },
    RU: { q: 'Что означает «www» в адресе сайта?', a: ['World Wide Web', 'Wide World Web', 'Web World Wide', 'World Web Wire'] },
    KK: { q: 'Сайт мекенжайындағы «www» нені білдіреді?', a: ['World Wide Web', 'Wide World Web', 'Web World Wide', 'World Web Wire'] }
  },
  {
    EN: { q: 'What is the freezing point of water in Fahrenheit?', a: ['32 °F', '0 °F', '100 °F', '212 °F'] },
    TR: { q: 'Suyun donma noktası Fahrenheit cinsinden kaçtır?', a: ['32 °F', '0 °F', '100 °F', '212 °F'] },
    RU: { q: 'Какова температура замерзания воды по Фаренгейту?', a: ['32 °F', '0 °F', '100 °F', '212 °F'] },
    KK: { q: 'Фаренгейт бойынша судың қату температурасы қанша?', a: ['32 °F', '0 °F', '100 °F', '212 °F'] }
  },
  {
    EN: { q: 'Which city was the capital of the Ottoman Empire before Istanbul?', a: ['Edirne', 'Bursa', 'Konya', 'Ankara'] },
    TR: { q: 'İstanbul’dan hemen önce Osmanlı’nın başkenti hangi şehirdi?', a: ['Edirne', 'Bursa', 'Konya', 'Ankara'] },
    RU: { q: 'Какой город был столицей Османской империи до Стамбула?', a: ['Эдирне', 'Бурса', 'Конья', 'Анкара'] },
    KK: { q: 'Ыстамбұлға дейін Осман империясының астанасы қай қала болған?', a: ['Эдирне', 'Бурса', 'Конья', 'Анкара'] }
  }
]
