// Help modal content per game, keyed by game id then language.
// `menu` is shown when no game is selected.
export const rules = {
  menu: {
    EN: {
      icon: '🎮',
      title: 'How it works',
      goal: 'Pick a game, play right in your browser, and come back to the menu anytime.',
      steps: [
        'Choose any card from the menu to open that game.',
        'Use the ← Back button inside a game to return to the menu.',
        'Tap ? anytime to see the rules for the game you are playing.'
      ],
      tips: [
        'Switch between English and Turkish with the flag button.',
        'Your language and theme choices are remembered on this device.'
      ]
    },
    TR: {
      icon: '🎮',
      title: 'Nasıl çalışır?',
      goal: 'Bir oyun seç, doğrudan tarayıcında oyna ve istediğin zaman menüye dön.',
      steps: [
        'Menüden bir karta dokunarak oyunu aç.',
        'Oyunun içindeki ← Geri butonuyla menüye dön.',
        'Oynadığın oyunun kurallarını görmek için istediğin zaman ? butonuna bas.'
      ],
      tips: [
        'Bayrak butonuyla Türkçe ve İngilizce arasında geçiş yap.',
        'Dil ve tema tercihlerin bu cihazda hatırlanır.'
      ]
    }
  },
  'number-guess': {
    EN: {
      icon: '🎲',
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
      icon: '🎲',
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
    }
  },
  wordle: {
    EN: {
      icon: '📝',
      title: 'Wordle',
      players: '1 player',
      duration: '2–5 min',
      goal: 'Guess the hidden word in 6 tries or fewer.',
      steps: [
        'Pick a language and a word length (5, 6 or 7 letters).',
        'Type a word of that length and press Enter.',
        'After each guess the tiles change color to give you hints.'
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
      icon: '📝',
      title: 'Kelime Oyunu',
      players: '1 oyuncu',
      duration: '2–5 dk',
      goal: 'Gizli kelimeyi en fazla 6 denemede tahmin et.',
      steps: [
        'Bir dil ve kelime uzunluğu seç (5, 6 veya 7 harf).',
        'Bu uzunlukta bir kelime yaz ve Enter’a bas.',
        'Her tahminden sonra kutuların rengi sana ipucu verir.'
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
    }
  },
  'bottle-spin': {
    EN: {
      icon: '🍾',
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
      icon: '🍾',
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
    }
  },
  'casus-kim': {
    EN: {
      icon: '🕵️',
      title: 'Who Is the Spy?',
      players: '3–12 players',
      duration: '5–10 min',
      goal: 'Everyone knows the secret word except the spy. Civilians must find the spy; the spy must blend in or guess the word.',
      steps: [
        'Add players, pick a theme (or Random), the discussion time and 1–2 spies.',
        'Pass the phone around — each player taps the card to see their role, then hides it before passing.',
        'Discuss: take turns asking each other questions about the word. The timer can be paused or extended.',
        'Everyone votes secretly for the player they suspect. A tie leads to one runoff vote.',
        'If the spy is caught, they get one last chance to guess the word and steal the win.'
      ],
      tips: [
        'Civilians: be specific enough to prove you know the word, but vague enough not to give it away.',
        'Spy: listen closely, keep answers short, and accuse someone else first.',
        'Scoring: civilians +1 on a group win, spy +2 on a spy win, +3 for guessing the word.'
      ]
    },
    TR: {
      icon: '🕵️',
      title: 'Casus Kim?',
      players: '3–12 oyuncu',
      duration: '5–10 dk',
      goal: 'Casus hariç herkes gizli kelimeyi bilir. Siviller casusu bulmalı; casus ise aralarına karışmalı ya da kelimeyi tahmin etmeli.',
      steps: [
        'Oyuncuları ekle; bir tema (veya Rastgele), tartışma süresi ve 1–2 casus seç.',
        'Telefonu dolaştırın — herkes rolünü görmek için karta dokunur, vermeden önce gizler.',
        'Tartışın: sırayla kelimeyle ilgili birbirinize sorular sorun. Süre duraklatılabilir veya uzatılabilir.',
        'Herkes şüphelendiği kişiye gizlice oy verir. Beraberlikte bir kez ikinci tur yapılır.',
        'Casus yakalanırsa kelimeyi tahmin edip kazanmak için son bir şansı olur.'
      ],
      tips: [
        'Siviller: kelimeyi bildiğinizi gösterecek kadar net, ama ele vermeyecek kadar belirsiz olun.',
        'Casus: dikkatle dinle, kısa cevap ver ve önce sen başkasını suçla.',
        'Puanlama: grup kazanırsa siviller +1, casus kazanırsa +2, kelimeyi bilirse +3.'
      ]
    }
  },
  tabu: {
    EN: {
      icon: '🎯',
      title: 'Tabu',
      players: '4+ players, 2 teams',
      duration: '60 s per turn',
      goal: 'Get your team to guess as many words as possible without saying the forbidden words.',
      steps: [
        'Split into two teams and enter the players.',
        'One player explains the word on the card; their team guesses.',
        'Press Correct for +1 point or Skip to move to the next card.',
        'After 60 seconds the turn passes to the other team.',
        'When the cards run out, the team with the most points wins.'
      ],
      tips: [
        'No saying the word itself, its parts, or the forbidden words — and no gestures.'
      ]
    },
    TR: {
      icon: '🎯',
      title: 'Tabu',
      players: '4+ oyuncu, 2 takım',
      duration: 'Tur başına 60 sn',
      goal: 'Yasaklı kelimeleri söylemeden takımına olabildiğince çok kelime bildir.',
      steps: [
        'İki takıma ayrılın ve oyuncuları girin.',
        'Bir oyuncu karttaki kelimeyi anlatır, takımı tahmin eder.',
        '+1 puan için Doğru’ya, sonraki karta geçmek için Pas’a bas.',
        '60 saniye sonunda sıra diğer takıma geçer.',
        'Kartlar bitince en çok puanı olan takım kazanır.'
      ],
      tips: [
        'Kelimenin kendisi, parçaları veya yasaklı kelimeler söylenmez — el hareketi de yok.'
      ]
    }
  },
  'insta-picker': {
    EN: {
      icon: '📷',
      title: 'Instagram Comment Picker',
      players: 'Giveaway tool',
      goal: 'Pick fair, random winners from an Instagram post’s comments.',
      steps: [
        'Optionally paste the post URL to preview it.',
        'Paste the comments or upload a .txt, .csv or .json file.',
        'Filter by keyword or regex, and keep one entry per user if you like.',
        'Choose 1–5 winners and draw them.'
      ],
      tips: [
        'CSV format: username,comment — one comment per line.'
      ]
    },
    TR: {
      icon: '📷',
      title: 'Instagram Yorum Çekilişi',
      players: 'Çekiliş aracı',
      goal: 'Bir Instagram gönderisinin yorumlarından adil ve rastgele kazananlar seç.',
      steps: [
        'İstersen önizleme için gönderi bağlantısını yapıştır.',
        'Yorumları yapıştır veya .txt, .csv ya da .json dosyası yükle.',
        'Anahtar kelime veya regex ile filtrele; istersen kullanıcı başına tek katılım bırak.',
        '1–5 kazanan seç ve çekilişi yap.'
      ],
      tips: [
        'CSV biçimi: kullanıcıadı,yorum — her satıra bir yorum.'
      ]
    }
  },
  'cv-analyzer': {
    EN: {
      icon: '📄',
      title: 'CV Analyzer',
      players: 'Career tool',
      goal: 'Get a quick check of how well your CV is structured.',
      steps: [
        'Upload your CV as a .txt file or paste its text.',
        'The analyzer checks sections, contact details, bullet points and dates.',
        'Review your score and the suggested improvements.'
      ],
      tips: [
        'This is a demo analysis — use it as a starting point, not a final verdict.'
      ]
    },
    TR: {
      icon: '📄',
      title: 'CV Analizörü',
      players: 'Kariyer aracı',
      goal: 'CV’nin ne kadar iyi yapılandırıldığını hızlıca kontrol et.',
      steps: [
        'CV’ni .txt dosyası olarak yükle veya metnini yapıştır.',
        'Analizör bölümleri, iletişim bilgilerini, madde işaretlerini ve tarihleri kontrol eder.',
        'Puanını ve önerilen iyileştirmeleri incele.'
      ],
      tips: [
        'Bu bir demo analizdir — kesin bir değerlendirme değil, başlangıç noktası olarak kullan.'
      ]
    }
  },
  'quiz-race': {
    EN: {
      icon: '⚡',
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
        'Got disconnected? Join again with the same name and your score comes back.',
        'Each device shows the questions in its own language.'
      ]
    },
    TR: {
      icon: '⚡',
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
        'Bağlantın mı koptu? Aynı adla tekrar katıl, puanın geri gelir.',
        'Her cihaz soruları kendi dil ayarında gösterir.'
      ]
    }
  }
}

export const rulesLabels = {
  EN: { goal: 'Goal', howToPlay: 'How to play', tips: 'Tips', gotIt: 'Got it', close: 'Close rules' },
  TR: { goal: 'Amaç', howToPlay: 'Nasıl oynanır', tips: 'İpuçları', gotIt: 'Anladım', close: 'Kuralları kapat' }
}
