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
        'Switch between English and Turkish with the EN/TR button.',
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
        'EN/TR butonuyla Türkçe ve İngilizce arasında geçiş yap.',
        'Dil tercihin bu cihazda hatırlanır.',
        'Klavyede 1–9 ile bir oyunu aç, Esc ile geri dön. Üstteki ~/yol kısmının bir parçasına tıklayarak oraya git.'
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
    }
  }
}

export const rulesLabels = {
  EN: { goal: 'Goal', howToPlay: 'How to play', tips: 'Tips', gotIt: 'Got it', close: 'Close rules' },
  TR: { goal: 'Amaç', howToPlay: 'Nasıl oynanır', tips: 'İpuçları', gotIt: 'Anladım', close: 'Kuralları kapat' }
}
