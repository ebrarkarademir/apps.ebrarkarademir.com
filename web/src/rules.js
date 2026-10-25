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
      players: '2+ players, one device each',
      duration: 'Unlimited',
      goal: 'Spin the bottle and take on a truth or a dare.',
      steps: [
        'One player taps Create room; everyone else joins with the room code on their own phone or computer.',
        'The host starts the game and spins first — the bottle spins on every screen at once.',
        'Whoever the bottle picks chooses Truth or Dare on their device; the prompt appears for everyone.',
        'The picked player spins the bottle next.'
      ],
      tips: [
        'Agree on house rules before you start — anyone can pass on a prompt.',
        'If the next spinner drops out, the host can spin instead.'
      ]
    },
    TR: {
      icon: '🍾',
      title: 'Şişe Çevirmece',
      players: '2+ oyuncu, herkes kendi cihazından',
      duration: 'Sınırsız',
      goal: 'Şişeyi çevir; doğruluk mu cesaret mi, seçimi yap.',
      steps: [
        'Bir oyuncu Oda oluştur’a basar; diğerleri kendi telefon veya bilgisayarından oda koduyla katılır.',
        'Sunucu oyunu başlatır ve ilk çeviren olur — şişe herkesin ekranında aynı anda döner.',
        'Şişenin seçtiği kişi kendi cihazından Doğruluk veya Cesaret’i seçer; görev herkese görünür.',
        'Seçilen oyuncu şişeyi bir sonraki tur çevirir.'
      ],
      tips: [
        'Başlamadan önce kuralları konuşun — herkes bir görevi pas geçebilir.',
        'Sıradaki çeviren ayrılırsa şişeyi sunucu çevirebilir.'
      ]
    }
  },
  'casus-kim': {
    EN: {
      icon: '🕵️',
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
      icon: '🕵️',
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
    }
  },
  tabu: {
    EN: {
      icon: '🎯',
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
      icon: '🎯',
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
        'Got disconnected? Join again from the same browser tab and your score comes back.',
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
        'Bağlantın mı koptu? Aynı tarayıcı sekmesinden tekrar katıl, puanın geri gelir.',
        'Her cihaz soruları kendi dil ayarında gösterir.'
      ]
    }
  }
}

export const rulesLabels = {
  EN: { goal: 'Goal', howToPlay: 'How to play', tips: 'Tips', gotIt: 'Got it', close: 'Close rules' },
  TR: { goal: 'Amaç', howToPlay: 'Nasıl oynanır', tips: 'İpuçları', gotIt: 'Anladım', close: 'Kuralları kapat' }
}
