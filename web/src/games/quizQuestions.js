// Trivia bank for the online quiz race.
// In every entry the first answer is the correct one; the game shuffles the order.
// Devices only exchange question indexes, so each player sees their own language.
export const quizQuestions = [
  {
    EN: { q: 'What is the capital of Australia?', a: ['Canberra', 'Sydney', 'Melbourne', 'Perth'] },
    TR: { q: 'Avustralya’nın başkenti neresidir?', a: ['Canberra', 'Sidney', 'Melbourne', 'Perth'] }
  },
  {
    EN: { q: 'Which planet is known as the Red Planet?', a: ['Mars', 'Venus', 'Jupiter', 'Mercury'] },
    TR: { q: 'Hangi gezegen Kızıl Gezegen olarak bilinir?', a: ['Mars', 'Venüs', 'Jüpiter', 'Merkür'] }
  },
  {
    EN: { q: 'How many continents are there?', a: ['7', '5', '6', '8'] },
    TR: { q: 'Dünyada kaç kıta vardır?', a: ['7', '5', '6', '8'] }
  },
  {
    EN: { q: 'Who painted the Mona Lisa?', a: ['Leonardo da Vinci', 'Michelangelo', 'Raphael', 'Vincent van Gogh'] },
    TR: { q: 'Mona Lisa tablosunu kim yaptı?', a: ['Leonardo da Vinci', 'Michelangelo', 'Raffaello', 'Vincent van Gogh'] }
  },
  {
    EN: { q: 'What is the largest ocean on Earth?', a: ['Pacific Ocean', 'Atlantic Ocean', 'Indian Ocean', 'Arctic Ocean'] },
    TR: { q: 'Dünyanın en büyük okyanusu hangisidir?', a: ['Büyük Okyanus (Pasifik)', 'Atlas Okyanusu', 'Hint Okyanusu', 'Arktik Okyanusu'] }
  },
  {
    EN: { q: 'What is the chemical symbol for gold?', a: ['Au', 'Ag', 'Go', 'Gd'] },
    TR: { q: 'Altının kimyasal sembolü nedir?', a: ['Au', 'Ag', 'Go', 'Gd'] }
  },
  {
    EN: { q: 'In which year did the Ottomans conquer Istanbul (Constantinople)?', a: ['1453', '1071', '1299', '1517'] },
    TR: { q: 'İstanbul hangi yılda fethedildi?', a: ['1453', '1071', '1299', '1517'] }
  },
  {
    EN: { q: 'What is the hardest natural substance?', a: ['Diamond', 'Iron', 'Granite', 'Quartz'] },
    TR: { q: 'Doğadaki en sert madde hangisidir?', a: ['Elmas', 'Demir', 'Granit', 'Kuvars'] }
  },
  {
    EN: { q: 'How many legs does a spider have?', a: ['8', '6', '10', '12'] },
    TR: { q: 'Bir örümceğin kaç bacağı vardır?', a: ['8', '6', '10', '12'] }
  },
  {
    EN: { q: 'Which is the longest river in the world?', a: ['Nile', 'Amazon', 'Yangtze', 'Mississippi'] },
    TR: { q: 'Dünyanın en uzun nehri hangisidir?', a: ['Nil', 'Amazon', 'Yangtze', 'Mississippi'] }
  },
  {
    EN: { q: 'What gas do plants absorb from the air?', a: ['Carbon dioxide', 'Oxygen', 'Nitrogen', 'Helium'] },
    TR: { q: 'Bitkiler havadan hangi gazı alır?', a: ['Karbondioksit', 'Oksijen', 'Azot', 'Helyum'] }
  },
  {
    EN: { q: 'Who wrote "Romeo and Juliet"?', a: ['William Shakespeare', 'Charles Dickens', 'Jane Austen', 'Mark Twain'] },
    TR: { q: '"Romeo ve Juliet"i kim yazdı?', a: ['William Shakespeare', 'Charles Dickens', 'Jane Austen', 'Mark Twain'] }
  },
  {
    EN: { q: 'What is the smallest prime number?', a: ['2', '1', '3', '0'] },
    TR: { q: 'En küçük asal sayı kaçtır?', a: ['2', '1', '3', '0'] }
  },
  {
    EN: { q: 'Which country is home to the kangaroo?', a: ['Australia', 'South Africa', 'Brazil', 'India'] },
    TR: { q: 'Kanguru hangi ülkeye özgüdür?', a: ['Avustralya', 'Güney Afrika', 'Brezilya', 'Hindistan'] }
  },
  {
    EN: { q: 'How many minutes are in a full day?', a: ['1440', '1200', '1600', '960'] },
    TR: { q: 'Bir günde kaç dakika vardır?', a: ['1440', '1200', '1600', '960'] }
  },
  {
    EN: { q: 'What is the largest planet in our solar system?', a: ['Jupiter', 'Saturn', 'Neptune', 'Earth'] },
    TR: { q: 'Güneş sistemimizin en büyük gezegeni hangisidir?', a: ['Jüpiter', 'Satürn', 'Neptün', 'Dünya'] }
  },
  {
    EN: { q: 'Which language has the most native speakers?', a: ['Mandarin Chinese', 'English', 'Spanish', 'Hindi'] },
    TR: { q: 'En çok anadil konuşanı olan dil hangisidir?', a: ['Mandarin Çincesi', 'İngilizce', 'İspanyolca', 'Hintçe'] }
  },
  {
    EN: { q: 'What is the boiling point of water at sea level?', a: ['100 °C', '90 °C', '80 °C', '120 °C'] },
    TR: { q: 'Deniz seviyesinde suyun kaynama noktası kaçtır?', a: ['100 °C', '90 °C', '80 °C', '120 °C'] }
  },
  {
    EN: { q: 'Who was the founder of the Republic of Turkey?', a: ['Mustafa Kemal Atatürk', 'İsmet İnönü', 'Celal Bayar', 'Kazım Karabekir'] },
    TR: { q: 'Türkiye Cumhuriyeti’nin kurucusu kimdir?', a: ['Mustafa Kemal Atatürk', 'İsmet İnönü', 'Celal Bayar', 'Kazım Karabekir'] }
  },
  {
    EN: { q: 'Which organ pumps blood through the body?', a: ['Heart', 'Lungs', 'Liver', 'Kidneys'] },
    TR: { q: 'Kanı vücuda pompalayan organ hangisidir?', a: ['Kalp', 'Akciğerler', 'Karaciğer', 'Böbrekler'] }
  },
  {
    EN: { q: 'In which city is the Eiffel Tower?', a: ['Paris', 'London', 'Rome', 'Berlin'] },
    TR: { q: 'Eyfel Kulesi hangi şehirdedir?', a: ['Paris', 'Londra', 'Roma', 'Berlin'] }
  },
  {
    EN: { q: 'How many players does a football (soccer) team have on the field?', a: ['11', '10', '9', '12'] },
    TR: { q: 'Bir futbol takımı sahada kaç oyuncuyla oynar?', a: ['11', '10', '9', '12'] }
  },
  {
    EN: { q: 'What is the fastest land animal?', a: ['Cheetah', 'Lion', 'Horse', 'Gazelle'] },
    TR: { q: 'Karadaki en hızlı hayvan hangisidir?', a: ['Çita', 'Aslan', 'At', 'Ceylan'] }
  },
  {
    EN: { q: 'What is 12 × 12?', a: ['144', '124', '132', '154'] },
    TR: { q: '12 × 12 kaçtır?', a: ['144', '124', '132', '154'] }
  },
  {
    EN: { q: 'Which is the highest mountain in Turkey?', a: ['Mount Ararat (Ağrı)', 'Mount Erciyes', 'Uludağ', 'Mount Süphan'] },
    TR: { q: 'Türkiye’nin en yüksek dağı hangisidir?', a: ['Ağrı Dağı', 'Erciyes Dağı', 'Uludağ', 'Süphan Dağı'] }
  },
  {
    EN: { q: 'Which company makes the iPhone?', a: ['Apple', 'Samsung', 'Google', 'Microsoft'] },
    TR: { q: 'iPhone’u hangi şirket üretir?', a: ['Apple', 'Samsung', 'Google', 'Microsoft'] }
  },
  {
    EN: { q: 'What is the largest desert in the world (hot or cold)?', a: ['Antarctica', 'Sahara', 'Gobi', 'Arabian'] },
    TR: { q: 'Dünyanın en büyük çölü hangisidir (sıcak veya soğuk)?', a: ['Antarktika', 'Sahra', 'Gobi', 'Arabistan'] }
  },
  {
    EN: { q: 'How many sides does a hexagon have?', a: ['6', '5', '7', '8'] },
    TR: { q: 'Bir altıgenin kaç kenarı vardır?', a: ['6', '5', '7', '8'] }
  },
  {
    EN: { q: 'Who developed the theory of relativity?', a: ['Albert Einstein', 'Isaac Newton', 'Nikola Tesla', 'Galileo Galilei'] },
    TR: { q: 'Görelilik kuramını kim geliştirdi?', a: ['Albert Einstein', 'Isaac Newton', 'Nikola Tesla', 'Galileo Galilei'] }
  },
  {
    EN: { q: 'Which sea lies to the north of Turkey?', a: ['Black Sea', 'Mediterranean Sea', 'Aegean Sea', 'Red Sea'] },
    TR: { q: 'Türkiye’nin kuzeyinde hangi deniz vardır?', a: ['Karadeniz', 'Akdeniz', 'Ege Denizi', 'Kızıldeniz'] }
  },
  {
    EN: { q: 'What is the main ingredient of guacamole?', a: ['Avocado', 'Tomato', 'Pepper', 'Onion'] },
    TR: { q: 'Guacamole’nin ana malzemesi nedir?', a: ['Avokado', 'Domates', 'Biber', 'Soğan'] }
  },
  {
    EN: { q: 'How many bones are in the adult human body?', a: ['206', '186', '226', '256'] },
    TR: { q: 'Yetişkin bir insanın vücudunda kaç kemik vardır?', a: ['206', '186', '226', '256'] }
  },
  {
    EN: { q: 'Which instrument has 88 keys?', a: ['Piano', 'Guitar', 'Violin', 'Flute'] },
    TR: { q: 'Hangi çalgının 88 tuşu vardır?', a: ['Piyano', 'Gitar', 'Keman', 'Flüt'] }
  },
  {
    EN: { q: 'What is the currency of Japan?', a: ['Yen', 'Won', 'Yuan', 'Ringgit'] },
    TR: { q: 'Japonya’nın para birimi nedir?', a: ['Yen', 'Won', 'Yuan', 'Ringgit'] }
  },
  {
    EN: { q: 'Which star is closest to Earth?', a: ['The Sun', 'Sirius', 'Proxima Centauri', 'Polaris'] },
    TR: { q: 'Dünya’ya en yakın yıldız hangisidir?', a: ['Güneş', 'Sirius', 'Proxima Centauri', 'Kutup Yıldızı'] }
  },
  {
    EN: { q: 'How many colors are in a rainbow?', a: ['7', '5', '6', '8'] },
    TR: { q: 'Gökkuşağında kaç renk vardır?', a: ['7', '5', '6', '8'] }
  },
  {
    EN: { q: 'Which country hosted the 2016 Summer Olympics?', a: ['Brazil', 'China', 'United Kingdom', 'Japan'] },
    TR: { q: '2016 Yaz Olimpiyatları hangi ülkede yapıldı?', a: ['Brezilya', 'Çin', 'Birleşik Krallık', 'Japonya'] }
  },
  {
    EN: { q: 'What does "www" stand for in a website address?', a: ['World Wide Web', 'Wide World Web', 'Web World Wide', 'World Web Wire'] },
    TR: { q: 'İnternet adreslerindeki "www" neyin kısaltmasıdır?', a: ['World Wide Web', 'Wide World Web', 'Web World Wide', 'World Web Wire'] }
  },
  {
    EN: { q: 'What is the freezing point of water in Fahrenheit?', a: ['32 °F', '0 °F', '100 °F', '212 °F'] },
    TR: { q: 'Suyun donma noktası Fahrenheit cinsinden kaçtır?', a: ['32 °F', '0 °F', '100 °F', '212 °F'] }
  },
  {
    EN: { q: 'Which city was the capital of the Ottoman Empire before Istanbul?', a: ['Edirne', 'Bursa', 'Konya', 'Ankara'] },
    TR: { q: 'İstanbul’dan hemen önce Osmanlı’nın başkenti hangi şehirdi?', a: ['Edirne', 'Bursa', 'Konya', 'Ankara'] }
  }
]
