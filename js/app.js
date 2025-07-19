/* ==== COACH MAX APP.JS – STEP 1: GRUNDGERÜST ==== */

// Entwicklungsmodus aktivieren/deaktivieren
const DEV_MODE = true;              // true = DEV, false = PROD
let DEV_START_SESSION = 0;          // Session, die im DEV-Modus zuerst geladen wird (z.B. 0 = Intro)

function getDayParam() {
  const params = new URLSearchParams(window.location.search);
  return parseInt(params.get("day")) || 1;
}
let currentDay = getDayParam();
const jsonURL = `days/day${currentDay}.json`;

// Globale Variablen für Sessions & Ablauf
let sessions = [];
let currentSession = 0; 
let lastSessionIdx = 0;

// Zeitsteuerung für animierte Texte etc.
let textTimeouts = [];

// Für Musik & Video
let currentMusic = null;
let videoElement = null;

// Audio-Pool (für universelle Sounds)
window.allSessionAudio = [];

// Sticker/Puzzle-Status im LocalStorage (freigeschaltete Sticker etc.)
const stickerImages = [
  "images/stickers/star.png",
  "images/stickers/party.png",
  "images/stickers/butterfly.png",
  "images/stickers/trophy.png",
  "images/stickers/medal.png"
];

// Fortschritts-Frosch
let frogSound = null;

// Helper für Capitalize
function capitalize(word) {
  if (!word) return "";
  return word.charAt(0).toUpperCase() + word.slice(1);
}

// Timeout-Reset
function clearTimeouts() {
  textTimeouts.forEach(t => clearTimeout(t));
  textTimeouts = [];
}

// Musik & Sounds stoppen (z.B. bei Sessionwechsel oder Tab-Wechsel)
function stopAllSounds() {
  if (currentMusic) {
    try { currentMusic.pause(); currentMusic.currentTime = 0; } catch(e) {}
    currentMusic = null;
  }
  if (window.allSessionAudio && Array.isArray(window.allSessionAudio)) {
    window.allSessionAudio.forEach(a => { try { a.pause(); a.currentTime = 0; } catch(e){} });
    window.allSessionAudio = [];
  }
}
/* ==== COACH MAX APP.JS – STEP 2: SESSIONS LADEN & INITIALISIERUNG ==== */

// Tag ermitteln & JSON laden (siehe Schritt 1)


// Globale Session-Variablen (aus Schritt 1)



// Fortschrittsbalken (Frosch)
function renderFrogProgress(lastIdx, currentIdx, totalSessions = null) {
  // Froschbalken-Container
  const track = document.querySelector(".frog-bar-track");
  if (!track) return;
  track.innerHTML = "";

  // Spots/Kreise
  const numSpots = totalSessions || sessions.length;
  for (let i = 0; i < numSpots; i++) {
    const spot = document.createElement("div");
    spot.className = "frog-bar-spot";
    if (i < currentIdx) spot.classList.add("frog-bar-done");
    if (i === currentIdx) spot.classList.add("active");
    track.appendChild(spot);
  }

  // Frosch-Icon
  let frog = document.getElementById("jumpingFrog");
  if (!frog) {
    frog = document.createElement("img");
    frog.src = "images/frog.png";
    frog.id = "jumpingFrog";
    frog.style.position = "absolute";
    frog.style.bottom = "22px";
    frog.style.left = "0";
    frog.style.width = "44px";
    frog.style.height = "44px";
    frog.style.objectFit = "contain";
    frog.style.zIndex = "2";
    frog.style.transition = "left 0.5s cubic-bezier(.39,1.35,.51,1.01)";
    frog.style.animation = "frogHop 0.45s";
    track.appendChild(frog);
  }

  // Frosch springen lassen zu aktuellem Spot
  const spots = track.querySelectorAll(".frog-bar-spot");
  const active = spots[currentIdx];
  if (active) {
    frog.style.left = active.offsetLeft + "px";
    frog.style.animation = "frogHop 0.45s";
    playSound("frog-hop.mp3");
  }
}

// Welcome-Screen
function showWelcome(onFinish) {
  const welcomeArea = document.getElementById('welcomeArea');
  welcomeArea.innerHTML = '';

  // Hinweis: Tap to Start
  const tapHint = document.createElement('div');
  tapHint.className = "welcome-tap-hint";
  tapHint.innerText = "Tap anywhere to start!";
  welcomeArea.appendChild(tapHint);

  welcomeArea.onclick = function() {
    tapHint.style.opacity = 0;
    setTimeout(() => {
      welcomeArea.removeChild(tapHint);
      startWelcomeAnimation();
    }, 350);
    welcomeArea.onclick = null;
  };

  // Welcome Animation mit mehreren Zeilen
  function startWelcomeAnimation() {
    const lines = [
      `🎉 Welcome to Coach Max – Day ${currentDay}!`,
      "Ready for a day full of fun and learning?",
      "Every tap brings you closer to today’s secret sticker!",
      "Let’s jump right in!"
    ];
    const linesDiv = document.createElement('div');
    linesDiv.className = "welcome-lines";
    welcomeArea.appendChild(linesDiv);

    let idx = 0;
    function showNextLine() {
      if (idx < lines.length) {
        const line = document.createElement('div');
        line.className = "welcome-anim-line";
        line.innerHTML = lines[idx];
        linesDiv.appendChild(line);
        setTimeout(() => line.classList.add("animated"), 80);
        idx++;
        setTimeout(showNextLine, 950);
      }
    }
    showNextLine();

    setTimeout(() => {
      welcomeArea.style.opacity = 0;
      setTimeout(() => {
        welcomeArea.style.display = "none";
        document.getElementById("mainContent").style.display = "";
        if (typeof onFinish === "function") onFinish();
      }, 900);
    }, 5200);
  }
}

// Musik/Sound abspielen
function playSound(soundFile) {
  const audio = new Audio("audio/" + soundFile);
  audio.volume = 0.7;
  audio.play();
  if (!window.allSessionAudio) window.allSessionAudio = [];
  window.allSessionAudio.push(audio);
}

// ==== Initialisierung beim Laden der Seite ====
window.onload = async function() {
  document.getElementById('mainContent').style.display = '';
  try {
    const res = await fetch(jsonURL);
    if (!res.ok) throw new Error("Fehler beim Laden des JSON: " + res.statusText);
    const data = await res.json();
    sessions = data.sessions;
    currentDay = data.day || 1;

    document.title = `Coach Max – Day ${currentDay}`;
    currentSession = DEV_MODE ? DEV_START_SESSION : 0;

    if (DEV_MODE) {
      document.getElementById("welcomeArea").style.display = "none";
      document.getElementById("mainContent").style.display = "";
      renderSession(currentSession);
    } else {
      showWelcome(() => {
        renderSession(currentSession);
      });
    }
  } catch (e) {
    console.error("Fehler beim Initialisieren:", e);
    document.body.innerHTML = `<div style="color:red;font-size:1.4em;">Fehler beim Initialisieren:<br>${e.message}</div>`;
  }
};
/* ==== COACH MAX APP.JS – STEP 3: Überschrift, Video-/Avatar-Container, Progressbar ==== */

// --- Überschrift für jede Session (zentriert oben im Contentbereich) ---
function renderSessionHeader(title) {
  // Passe den Selektor ggf. an, falls du eine andere ID verwendest!
  let header = document.getElementById("mainTitle");
  if (!header) {
    header = document.createElement("h2");
    header.id = "mainTitle";
    header.className = "session-heading";
    // Füge die Überschrift ganz oben in den Content-Bereich ein
    const content = document.getElementById("sessionTextArea") || document.body;
    content.insertAdjacentElement("afterbegin", header);
  }
  header.innerText = title || "";
  header.style.textAlign = "center";
  header.style.width = "100%";
  header.style.display = "block";
}


// --- Universeller Video-/Avatar-Container unten rechts (fixiert & rund) ---
// (Du kannst diese Funktion überall dort verwenden, wo du ein Video/Avatar brauchst)
function renderFloatingVideo(sessionObj, onVideoEndedCallback) {
  // Entferne vorherige Videoboxen
  document.querySelectorAll(".floating-video").forEach(el => el.remove());

  // Kein Video? Dann direkt Callback (z.B. für reine Avatar-Sessions)
  if (!sessionObj.video) {
    if (typeof onVideoEndedCallback === "function") onVideoEndedCallback();
    return;
  }

  // Container erstellen (CSS sorgt für rund & fixiert)
  const videoBox = document.createElement("div");
  videoBox.className = "floating-video";

  // Videoelement erstellen
  const videoElement = document.createElement("video");
  videoElement.src = "videos/" + sessionObj.video;
  videoElement.setAttribute("controls", "true");
  videoElement.setAttribute("controlsList", "nodownload");
  videoElement.autoplay = false;
  videoElement.muted = false;
  videoElement.playsInline = true;
  videoElement.poster = "images/video-placeholder.png";
  videoElement.style.width = "100%";
  videoElement.style.height = "100%";
  videoElement.style.objectFit = "cover";
  videoElement.style.display = "block";
  videoBox.appendChild(videoElement);

  // Play-Overlay-Button (wie bei dir)
  const playBtn = document.createElement('button');
  playBtn.className = "custom-play-btn";
  playBtn.title = "Play";
  playBtn.innerHTML = `
    <svg viewBox="0 0 60 60">
      <circle cx="30" cy="30" r="28" fill="none"/>
      <polygon points="22,16 46,30 22,44" fill="#383838"/>
    </svg>
  `;
  playBtn.onclick = function() {
    videoElement.play();
    playBtn.style.display = "none";
    videoElement.style.pointerEvents = "auto";
  };
  videoElement.addEventListener('play', () => {
    playBtn.style.display = "none";
    videoElement.style.pointerEvents = "auto";
  });
  videoElement.addEventListener('pause', () => {
    playBtn.style.display = "";
    videoElement.style.pointerEvents = "none";
  });
  videoElement.addEventListener('ended', () => {
    // Avatar anstelle des Videos einfügen (Box bleibt!)
    videoBox.innerHTML = `
      <img class="avatar" src="images/${sessionObj.avatar || 'luna'}.png" style="width:100%;height:100%;border-radius:50%;object-fit:contain;">
    `;
    if (typeof onVideoEndedCallback === "function") {
      setTimeout(() => { onVideoEndedCallback(); }, 400);
    }
  });

  videoBox.appendChild(playBtn);
  document.body.appendChild(videoBox); // immer unten rechts & fixiert (dank CSS)
}
// --- Fortschrittsbalken bleibt wie in Schritt 2 (renderFrogProgress), brauchst du hier nicht duplizieren ---
// Wird immer über die Funktion renderFrogProgress(...) aktualisiert (siehe oben)

/* ==== COACH MAX APP.JS – STEP 4: UNIVERSALER SESSION-TEMPLATE-LOADER ==== */

/**
 * Steuert, welche Session (Intro, Memory, Drawing, Quiz, etc.) wie gerendert wird.
 * Alles wird über Typen im JSON gesteuert.
 */
function renderSession(idx) {
  const s = sessions[idx];
  lastSessionIdx = idx;
  clearTimeouts();
  stopAllSounds();
  // Entferne alle Floating-Video, Next-Buttons, Reward-Container usw.
  document.querySelectorAll(".floating-video, .centered-next-btn, .animals-reward-container").forEach(el => el.remove());
  const textArea = document.getElementById("sessionTextArea");
  if (textArea) textArea.innerHTML = "";

  // Fortschrittsbalken (Frosch) immer aktualisieren
  renderFrogProgress(idx, idx, sessions.length);

  // Überschrift setzen (oben im Content-Bereich)
  renderSessionHeader(s.title || "");

  // Universal: Video-/Avatar-Box anzeigen (unten rechts) und nach Video-Ende Spielfeld aufbauen
  renderFloatingVideo(s, () => {
    // ---- NACH Video-Ende: Das Spielfeld/Session-UI anzeigen (je nach Typ) ----
    // Die folgende Struktur bleibt für alle Module gleich!
    if      (s.type === "intro")       renderIntroSession(s, idx);
    else if (s.type === "breathing")   renderBreathingSession(s, idx);
    else if (s.type === "counting")    renderCountingSession(s, idx);
    else if (s.type === "memory")      renderMemorySession(s, idx);
    else if (s.type === "drawing")     renderDrawingSession(s, idx);
    else if (s.type === "animals")     renderAnimalsSession(s, idx);
    else if (s.type === "rhyme")       renderRhymeSession(s, idx);
    else if (s.type === "chatgpt-quiz")renderChatGPTQuizSession(s, idx);
    else if (s.type === "sequence")    renderSequenceSession(s, idx);
    else if (s.type === "shadow")      renderShadowSession(s, idx);
    else if (s.type === "story")       renderStorySession(s, idx);
    else                              renderUnknownSession(s, idx);
  });
}

// Fallback, falls ein Session-Typ nicht erkannt wird:
function renderUnknownSession(s, idx) {
  const textArea = document.getElementById("sessionTextArea");
  if (textArea) {
    textArea.innerHTML = `<div style="color:red;font-weight:bold;font-size:1.3em;padding:2em;">
      Sorry, this session type (<b>${s.type}</b>) is not implemented yet!
    </div>`;
  }
}

/* ==== COACH MAX APP.JS – STEP 5: REWARD-SYSTEM, NEXT-BUTTON, STICKER, PUZZLE ==== */

// Universeller Reward-Container
function showUniversalReward(imgSrcOrText, correctTextStr = "", nextAction = null, stickerIdx = 0, rewardType = "star") {
  // Alle Sounds stoppen
  stopAllSounds();
  // Alte Reward-Container entfernen
  document.querySelectorAll(".animals-reward-container, .centered-next-btn").forEach(e => e.remove());

  // Popup bauen
  const reward = document.createElement("div");
  reward.className = "animals-reward-container";
  reward.style.position = "fixed";
  reward.style.left = "50%";
  reward.style.transform = "translateX(-50%)";
  reward.style.top = "15vh";
  reward.style.zIndex = "500";
  reward.style.background = "#fffbe6";
  reward.style.padding = "26px 30px 30px 30px";
  reward.style.borderRadius = "30px";
  reward.style.boxShadow = "0 10px 40px #b2ebf2, 0 4px 24px #ffd54f99";
  reward.style.display = "flex";
  reward.style.flexDirection = "column";
  reward.style.alignItems = "center";
  reward.style.minWidth = "260px";
  reward.style.maxWidth = "92vw";

  // Bild oder Text (z. B. Stern, Puzzle, Emoji)
  let rewardImg;
  if (rewardType === "star") {
    rewardImg = document.createElement("img");
    rewardImg.src = "images/stickers/star.png";
    rewardImg.style.width = "82px";
    rewardImg.style.height = "82px";
    rewardImg.style.borderRadius = "22px";
    rewardImg.style.margin = "0 0 14px 0";
    rewardImg.className = "reward-animated";
    reward.appendChild(rewardImg);
  } else if (rewardType === "puzzle") {
    rewardImg = document.createElement("img");
    rewardImg.src = typeof imgSrcOrText === "string" ? imgSrcOrText : "images/puzzles/piece.png";
    rewardImg.style.width = "94px";
    rewardImg.style.height = "94px";
    rewardImg.style.borderRadius = "18px";
    rewardImg.style.margin = "0 0 10px 0";
    rewardImg.className = "reward-animated";
    reward.appendChild(rewardImg);
    // Glitzer/Glanz (optional)
    const rewardAnim = document.createElement("div");
    rewardAnim.className = "reward-sparkle";
    rewardAnim.innerText = "✨";
    rewardAnim.style.fontSize = "2.7rem";
    reward.appendChild(rewardAnim);
  } else if (rewardType === "trophy") {
    rewardImg = document.createElement("img");
    rewardImg.src = "images/trophy.png";
    rewardImg.style.width = "100px";
    rewardImg.style.height = "90px";
    rewardImg.style.margin = "0 0 14px 0";
    rewardImg.className = "reward-animated";
    reward.appendChild(rewardImg);
  }
  // Text, Emoji oder andere Typen können leicht ergänzt werden…

  // Feedback-Text
  if (typeof correctTextStr === "string" && correctTextStr.length > 0) {
    const correctText = document.createElement("div");
    correctText.className = "animals-correct-text";
    correctText.innerText = correctTextStr;
    correctText.style.marginBottom = "11px";
    correctText.style.fontSize = "1.18rem";
    correctText.style.color = "#444";
    correctText.style.textAlign = "center";
    reward.appendChild(correctText);
  }

  // Yay & Reward-Text
  const yay = document.createElement("div");
  yay.textContent = {
    "star": "🎉 Yay! You unlocked a Star!",
    "puzzle": "🧩 You got a Puzzle Piece!",
    "trophy": "🏆 You won a Trophy!",
  }[rewardType] || "🎉 Reward!";
  yay.style.fontWeight = "bold";
  yay.style.fontSize = "1.37rem";
  yay.style.color = "#ffa000";
  yay.style.textShadow = "0 1px 6px #fff9c4";
  yay.style.marginBottom = "11px";
  reward.appendChild(yay);

  document.body.appendChild(reward);

  // ==== Speicherlogik/Unlocks ====
  if (rewardType === "puzzle" && typeof unlockPuzzlePiece === "function") {
    if (typeof sessions === "object" && sessions[currentSession]) {
      const s = sessions[currentSession];
      const puzzleId = s.puzzleId || 1;
      const pieces = Array.isArray(s.successPuzzle) ? s.successPuzzle : [s.successPuzzle];
      pieces.forEach(pieceIdx => unlockPuzzlePiece(puzzleId, pieceIdx));
    }
  } else if (rewardType === "star" && typeof unlockSticker === "function") {
    unlockSticker(stickerIdx);
  } else if (rewardType === "trophy") {
    localStorage.setItem(`trophyDay${currentDay}`, "1");
  }

  // Soundeffekt
  let audioSrc = "audio/yay.mp3";
  if (rewardType === "trophy") audioSrc = "audio/fanfare.mp3";
  try {
    const rewardAudio = new Audio(audioSrc);
    rewardAudio.play();
    if (!window.allSessionAudio) window.allSessionAudio = [];
    window.allSessionAudio.push(rewardAudio);
  } catch(e){}

  // Next-Button (Next oder Finish)
  setTimeout(() => {
    const btn = document.createElement("button");
    btn.innerText = (typeof currentSession !== "undefined" && sessions && currentSession < sessions.length - 1) ? "Next" : "Finish";
    btn.className = "centered-next-btn";
    btn.onclick = () => {
      document.querySelectorAll(".animals-reward-container, .centered-next-btn").forEach(e => e.remove());
      if (typeof nextAction === "function") {
        nextAction();
      } else {
        currentSession++;
        if (currentSession < sessions.length) {
          renderSession(currentSession);
        } else {
          // Alles fertig – zurück zur Auswahlseite
          window.location.href = "choose.html";
        }
      }
    };
    reward.insertAdjacentElement('afterend', btn);
  }, 800);
}

// Sticker speichern
function unlockSticker(idx) {
  let unlocked = JSON.parse(localStorage.getItem('unlockedStickers') || "[]");
  if (!unlocked.includes(idx)) {
    unlocked.push(idx);
    localStorage.setItem('unlockedStickers', JSON.stringify(unlocked));
  }
}

// Puzzle-Teile speichern
function unlockPuzzlePiece(puzzleId, pieceIdx) {
  const key = `puzzle${puzzleId}Pieces`;
  let unlocked = JSON.parse(localStorage.getItem(key) || "[]");
  if (!unlocked.includes(pieceIdx)) {
    unlocked.push(pieceIdx);
    localStorage.setItem(key, JSON.stringify(unlocked));
  }
}

/* ==== COACH MAX APP.JS – STEP 6.1: INTRO-SESSION MIT VIDEO & ANIMIERTEM TEXT ==== */

function renderIntroSession(s, idx) {
  clearTimeouts();
  stopAllSounds();

  const textArea = document.getElementById('sessionTextArea');
  textArea.innerHTML = "";

  // Avatare-Row unter der Überschrift (Momo & Benny)
  const avatarRow = document.createElement('div');
  avatarRow.style.display = "flex";
  avatarRow.style.justifyContent = "center";
  avatarRow.style.alignItems = "center";
  avatarRow.style.gap = "22px";
  avatarRow.style.marginBottom = "12px";

  const momoImg = document.createElement('img');
  momoImg.src = "images/momo.png";
  momoImg.alt = "Momo";
  momoImg.className = "intro-avatar-small";

  const bennyImg = document.createElement('img');
  bennyImg.src = "images/benny.png";
  bennyImg.alt = "Benny";
  bennyImg.className = "intro-avatar-small";

  avatarRow.appendChild(momoImg);
  avatarRow.appendChild(bennyImg);
  textArea.appendChild(avatarRow);

  // Emojis als untere Box (optional)
  const emojiBox = document.createElement('div');
  emojiBox.className = "intro-emojis";
  emojiBox.innerHTML = "🤩&nbsp;🎉&nbsp;⭐&nbsp;👏";
  textArea.appendChild(emojiBox);

  // Container für animierte Textzeilen
  const linesBox = document.createElement('div');
  linesBox.className = "animated-lines";
  textArea.appendChild(linesBox);

  // Musik-Objekt initialisieren (damit wir stoppen können)
  let introMusic = null;

  // Holt das Video-Element aus dem .floating-video-Container
  const floatingBox = document.querySelector('.floating-video');
  const video = floatingBox ? floatingBox.querySelector('video') : null;

  let started = false, videoDone = false, textDone = false;

  // Text-Animation (wie gehabt)
  function showAnimatedTextsSync(onComplete) {
    let idx = 0;
    function showNextLine() {
      if (idx < s.text.length) {
        const t = s.text[idx];
        const p = document.createElement('div');
        p.className = "animated-text";
        p.innerText = t.line;
        linesBox.appendChild(p);
        textTimeouts.push(setTimeout(() => {
          if (linesBox.childNodes.length > 4) linesBox.removeChild(linesBox.firstChild);
          idx++;
          showNextLine();
        }, (t.duration || 2) * 1000));
      } else if (typeof onComplete === "function") {
        onComplete();
      }
    }
    showNextLine();
  }

  function tryShowNextBtn() {
    if (videoDone && textDone) {
      const btn = document.createElement('button');
      btn.innerText = idx < sessions.length - 1 ? "Next" : "Finish";
      btn.className = "centered-next-btn";
      btn.onclick = () => {
        if (introMusic) { try { introMusic.pause(); } catch(e){} }
        currentSession++;
        renderSession(currentSession);
      };
      document.body.appendChild(btn);
    }
  }

  // **Hier ist die entscheidende Logik:**  
  // Musik & Text laufen LOS, sobald das Video startet (durch Play/Autoplay)
  if (video) {
    video.addEventListener('play', () => {
      if (!started) {
        started = true;
        // Musik abspielen, falls im JSON
        if (s.music) {
          try {
            introMusic = new Audio("audio/" + s.music);
            introMusic.loop = false;
            introMusic.volume = 0.18;
            introMusic.play();
            window.currentMusic = introMusic;
          } catch (e) {}
        }
        // Text-Animation sofort starten
        showAnimatedTextsSync(() => {
          textDone = true;
          tryShowNextBtn();
        });
      }
    });
    video.addEventListener('ended', () => {
      videoDone = true;
      tryShowNextBtn();
    });

    // Falls das Video schon läuft (Autoplay/DEV), direkt starten!
    if (!video.paused && !started) {
      started = true;
      if (s.music) {
        try {
          introMusic = new Audio("audio/" + s.music);
          introMusic.loop = false;
          introMusic.volume = 0.18;
          introMusic.play();
          window.currentMusic = introMusic;
        } catch (e) {}
      }
      showAnimatedTextsSync(() => {
        textDone = true;
        tryShowNextBtn();
      });
    }
  } else {
    // Kein Video: Musik & Text sofort
    if (s.music) {
      try {
        introMusic = new Audio("audio/" + s.music);
        introMusic.loop = false;
        introMusic.volume = 0.18;
        introMusic.play();
        window.currentMusic = introMusic;
      } catch (e) {}
    }
    showAnimatedTextsSync(() => {
      textDone = true;
      videoDone = true;
      tryShowNextBtn();
    });
  }
}

/* ==== COACH MAX APP.JS – STEP 6.3: COUNTING-SESSION ==== */

function renderCountingSession(s, idx) {
  clearTimeouts();
  stopAllSounds();
  const textArea = document.getElementById('sessionTextArea');
  textArea.innerHTML = "";

  // 1) Überschrift bleibt automatisch gesetzt (durch renderSessionHeader)
  // 2) Die eigentliche Aufgabe: Zahl und Tier anzeigen, Buttons für Auswahl

  // Lade Aufgaben (numbers/animals), z.B. [{num:1,img:'images/dog.png', correct:true}, ...]
  const questions = Array.isArray(s.questions) ? s.questions : [
    { num: 1, img: "images/dog.png", choices: [1,2,3], correct: 0 },
    { num: 2, img: "images/cat.png", choices: [2,3,4], correct: 0 },
    { num: 3, img: "images/bird.png", choices: [2,3,4], correct: 1 }
  ];

  let qIdx = 0;
  let correctCount = 0;

  function showQuestion() {
    textArea.innerHTML = "";

    const q = questions[qIdx];
    // Zahl als große Ziffer
    const numDiv = document.createElement('div');
    numDiv.style.fontSize = "2.8rem";
    numDiv.style.fontWeight = "bold";
    numDiv.style.color = "#1976d2";
    numDiv.style.margin = "12px 0 18px 0";
    numDiv.textContent = q.num;
    textArea.appendChild(numDiv);

    // Tierbild (optional)
    if (q.img) {
      const animalImg = document.createElement('img');
      animalImg.src = q.img;
      animalImg.style.width = "88px";
      animalImg.style.height = "88px";
      animalImg.style.objectFit = "contain";
      animalImg.style.display = "block";
      animalImg.style.margin = "0 auto 18px auto";
      textArea.appendChild(animalImg);
    }

    // Auswahl-Buttons
    const btnBox = document.createElement('div');
    btnBox.className = "animals-buttons";
    q.choices.forEach((val, i) => {
      const btn = document.createElement('button');
      btn.textContent = val;
      btn.onclick = () => {
        btnBox.querySelectorAll("button").forEach(b => b.disabled = true);
        const isCorrect = (i === q.correct);
        playSound(isCorrect ? "yay.mp3" : "fail.mp3");
        btn.classList.add(isCorrect ? "btn-correct" : "btn-wrong");

        // Kurze visuelle Animation
        runAnimations([isCorrect ? "confetti-glow" : "shake"]);
        // Feedback-Text
        const feedback = document.createElement("div");
        feedback.className = "quiz-feedback";
        feedback.innerText = isCorrect ? "Great job! 🎉" : "Oops! Try again!";
        feedback.style.color = isCorrect ? "#219821" : "#c82121";
        feedback.style.fontWeight = "bold";
        feedback.style.fontSize = "1.16rem";
        feedback.style.margin = "13px 0 0 0";
        textArea.appendChild(feedback);

        if (isCorrect) correctCount++;

        setTimeout(() => {
          qIdx++;
          if (qIdx < questions.length) {
            showQuestion();
          } else {
            // Nach letzter Frage: Reward!
            showUniversalReward(
              "images/stickers/star.png",
              s.onFinish || "You counted like a pro!",
              () => {
                currentSession++;
                renderSession(currentSession);
              },
              s.successSticker || 0
            );
          }
        }, 1400);
      };
      btnBox.appendChild(btn);
    });
    textArea.appendChild(btnBox);
  }

  showQuestion();
}

