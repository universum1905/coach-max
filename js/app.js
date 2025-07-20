/* ==== COACH MAX APP.JS – STEP 1: GRUNDGERÜST ==== */

// Entwicklungsmodus aktivieren/deaktivieren
const DEV_MODE = true;              // true = DEV, false = PROD
let DEV_START_SESSION = 2;          // Session, die im DEV-Modus zuerst geladen wird (z.B. 0 = Intro)

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
  document.querySelectorAll(".floating-video, .centered-next-btn, .animals-reward-container").forEach(el => el.remove());
  const textArea = document.getElementById("sessionTextArea");
  if (textArea) textArea.innerHTML = "";

  // Fortschrittsbalken (Frosch) immer aktualisieren
  renderFrogProgress(idx, idx, sessions.length);

  // Überschrift setzen (oben im Content-Bereich)
  renderSessionHeader(s.title || "");

  // Spezialfall: Intro & Story synchron!
if (s.type === "intro" || s.type === "story") {
  renderFloatingVideo(s); // Video sofort (ohne Callback)
  if (s.type === "intro")  renderIntroSession(s, idx);
  else                     renderStorySession(s, idx);
  return;
}

// Für ALLE anderen Sessions (auch Memory)  
renderFloatingVideo(s, () => {
  if      (s.type === "breathing")   renderBreathingSession(s, idx);
  else if (s.type === "counting")    renderCountingSession(s, idx);
  else if (s.type === "memory")      renderMemoryField(s, idx);  // ACHTUNG! Direkt das Feld!
  else if (s.type === "drawing")     renderDrawingSession(s, idx);
  else if (s.type === "animals")     renderAnimalsSession(s, idx);
  else if (s.type === "rhyme")       renderRhymeSession(s, idx);
  else if (s.type === "chatgpt-quiz")renderChatGPTQuizSession(s, idx);
  else if (s.type === "sequence")    renderSequenceSession(s, idx);
  else if (s.type === "shadow")      renderShadowSession(s, idx);
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
function showUniversalReward(sessionObj, nextAction = null) {
  // sessionObj = das aktuelle Sessions-JSON-Objekt
  stopAllSounds();
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

  // Bild/Emoji je nach Reward-Type
  let rewardImg;
  const rewardType = sessionObj.rewardType || 
      (typeof sessionObj.successPuzzle !== "undefined" ? "puzzle" : "star");

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
    rewardImg.src = typeof sessionObj.rewardImg === "string" ? sessionObj.rewardImg : "images/puzzles/piece.png";
    rewardImg.style.width = "94px";
    rewardImg.style.height = "94px";
    rewardImg.style.borderRadius = "18px";
    rewardImg.style.margin = "0 0 10px 0";
    rewardImg.className = "reward-animated";
    reward.appendChild(rewardImg);
    const rewardAnim = document.createElement("div");
    rewardAnim.className = "reward-sparkle";
    rewardAnim.innerText = "✨";
    rewardAnim.style.fontSize = "2.7rem";
    reward.appendChild(rewardAnim);
  }

  // === Überschrift / Feedback dynamisch ===
  // 1. OnFinish aus JSON, sonst feedbackCorrect, sonst fallback-Text
  let mainText = sessionObj.onFinish 
    || sessionObj.finalRewardText 
    || sessionObj.feedbackCorrect 
    || "Great job!";

  const feedbackDiv = document.createElement("div");
  feedbackDiv.className = "animals-correct-text";
  feedbackDiv.innerText = mainText;
  feedbackDiv.style.marginBottom = "11px";
  feedbackDiv.style.fontSize = "1.18rem";
  feedbackDiv.style.color = "#444";
  feedbackDiv.style.textAlign = "center";
  reward.appendChild(feedbackDiv);

  // (Optional) Zusatz-Animation/Emoji
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

  // === Speicherlogik wie gehabt ...
  if (rewardType === "puzzle" && typeof unlockPuzzlePiece === "function") {
    if (typeof sessions === "object" && sessions[currentSession]) {
      const s = sessions[currentSession];
      const puzzleId = s.puzzleId || 1;
      const pieces = Array.isArray(s.successPuzzle) ? s.successPuzzle : [s.successPuzzle];
      pieces.forEach(pieceIdx => unlockPuzzlePiece(puzzleId, pieceIdx));
    }
  } else if (rewardType === "star" && typeof unlockSticker === "function") {
    unlockSticker(sessionObj.successSticker || 0);
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

  // Finish-Button: Immer zu choose.html
  setTimeout(() => {
    const btn = document.createElement("button");
    btn.innerText = "Finish";
    btn.className = "centered-next-btn";
    btn.onclick = () => {
      document.querySelectorAll(".animals-reward-container, .centered-next-btn").forEach(e => e.remove());
      window.location.href = "choose.html";
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

  // Musik abspielen, falls im JSON vorhanden
  let countingMusic = null;
  if (s.music) {
    try {
      countingMusic = new Audio("audio/" + s.music);
      countingMusic.loop = false;
      countingMusic.volume = 0.2;
      countingMusic.play();
      window.currentMusic = countingMusic;
    } catch (e) {}
  }

  const questions = Array.isArray(s.questions) ? s.questions : [];
  let qIdx = 0;

  function showQuestion() {
    textArea.innerHTML = "";
    const q = questions[qIdx];

    // Fragetext
    const qDiv = document.createElement('div');
    qDiv.className = "quiz-question";
    qDiv.textContent = s.title || "How many animals do you see?";
    textArea.appendChild(qDiv);

    // Tierbilder nebeneinander anzeigen
    if (q.img && q.num > 0) {
      const animalBox = document.createElement('div');
      animalBox.style.display = "flex";
      animalBox.style.justifyContent = "center";
      animalBox.style.gap = "16px";
      animalBox.style.margin = "10px 0";
      for (let i = 0; i < q.num; i++) {
        const img = document.createElement('img');
        img.src = q.img;
        img.style.width = "72px";
        img.style.height = "72px";
        img.style.objectFit = "contain";
        img.style.margin = "8px 0";
        img.style.borderRadius = "14px";
        animalBox.appendChild(img);
      }
      textArea.appendChild(animalBox);
    }

    // Buttons
    const btnBox = document.createElement('div');
    btnBox.className = "quiz-buttons";
    let solved = false;

    q.choices.forEach((val, i) => {
      const btn = document.createElement('button');
      btn.textContent = val;
      btn.className = "quiz-choice-btn";
      btn.onclick = function () {
        if (solved || btn.disabled) return;

        // Falsche Antwort
        if (i !== q.correct) {
          btn.disabled = true;
          btn.classList.add("wrong");
          playSound(q.wrongSound || "fail.mp3");
          runAnimations(q.wrongAnimation || ["shake"]);
          if (s.avatar) playAvatarAnimation(s.avatar, "wiggle");

          // Feedback-Text
          const feedback = document.createElement("div");
          feedback.className = "quiz-feedback";
          feedback.innerText = q.feedbackWrong || "Try again!";
          feedback.style.color = "#c82121";
          feedback.style.marginTop = "12px";
          textArea.appendChild(feedback);
          setTimeout(() => {
            if (feedback.parentNode) feedback.parentNode.removeChild(feedback);
          }, 950);

          return;
        }

        // Richtige Antwort!
        solved = true;
        btn.disabled = true;
        btn.classList.add("correct");
        runAnimations(q.correctAnimation || ["confetti-glow"]);
        playSound(q.correctSound || "yay.mp3");
        if (s.avatar) playAvatarAnimation(s.avatar, "tada");
        btnBox.querySelectorAll("button").forEach(b => b.disabled = true);

        // Feedback
        const feedback = document.createElement("div");
        feedback.className = "quiz-feedback";
        feedback.innerText = q.feedbackCorrect || "Great job! 🎉";
        feedback.style.color = "#219821";
        feedback.style.marginTop = "12px";
        textArea.appendChild(feedback);

        setTimeout(() => {
          feedback.remove();
          qIdx++;
          if (qIdx < questions.length) {
            showQuestion();
          } else {
            if (countingMusic) { try { countingMusic.pause(); countingMusic.currentTime = 0; } catch (e) {} }
            showUniversalReward(
              "images/stickers/star.png",
              s.onFinish || "You counted like a pro!",
              () => { window.location.href = "choose.html"; },
              s.successSticker || 0
            );
          }
        }, 1100);
      };
      btnBox.appendChild(btn);
    });
    textArea.appendChild(btnBox);
  }

  showQuestion();
}


// HINWEIS: Diese Funktion ersetzt deinen bisherigen renderMemorySession!
function renderMemorySession(s, idx) {
  clearTimeouts();
  stopAllSounds();
  const textArea = document.getElementById('sessionTextArea');
  textArea.innerHTML = "";

  renderFrogProgress(idx, idx, sessions.length);

  // Überschrift aus JSON
  renderSessionHeader(s.title || "");

  // Video universal (mit Callback!)
  renderFloatingVideo(s, () => {
    // Nach Video-Ende: Kartenfeld anzeigen
    renderMemoryField(s, idx);
  });
}

// DAS ist die eigentliche Spielfeld-Logik (wie "showQuestion" bei Counting)
function renderMemoryField(s, idx) {
  // Step 1: Session-Bereich leeren
  const textArea = document.getElementById('sessionTextArea');
  textArea.innerHTML = "";

 // Erstelle und style den Memory-Hauptcontainer:
let memoryContainer = document.createElement("div");
memoryContainer.id = "memoryGameContainer";
memoryContainer.style.display = "flex";
memoryContainer.style.flexDirection = "column";
memoryContainer.style.alignItems = "center";
memoryContainer.style.justifyContent = "center";
memoryContainer.style.width = "100%";
memoryContainer.style.maxWidth = "370px";
memoryContainer.style.minHeight = "330px";
memoryContainer.style.margin = "0 auto";
memoryContainer.style.position = "relative";
memoryContainer.style.zIndex = "3";
memoryContainer.style.boxSizing = "border-box";
memoryContainer.style.background = "rgba(255,255,246,0.98)";
memoryContainer.style.borderRadius = "24px";
memoryContainer.style.boxShadow = "0 4px 22px #ffd54f44";
// responsive: auf kleinen Screens breiter

if (window.innerWidth < 600) {
  memoryContainer.style.maxWidth = "96vw";
  memoryContainer.style.minHeight = "44vw";
}
// Füge ihn in die zentrale Session-Area ein
textArea.appendChild(memoryContainer);

  // (Optional) Füge eine Überschrift ein
  if (s.title) {
    const heading = document.createElement('h2');
    heading.className = "session-heading";
    heading.innerText = s.title;
    heading.style.marginBottom = "18px";
    memoryContainer.appendChild(heading);
  }

  // (Optional) Musik abspielen
  let memoryMusic = null;
  if (s.music) {
    try {
      memoryMusic = new Audio("audio/" + s.music);
      memoryMusic.loop = false;
      memoryMusic.volume = 0.2;
      memoryMusic.play();
      window.currentMusic = memoryMusic;
    } catch (e) {}
  }

  // Step 3: Spielfeld erstellen
  const gridSize = (s.gridSize || "3x2").split("x");
  const rows = parseInt(gridSize[1]);
  const cols = parseInt(gridSize[0]);
  const totalCards = rows * cols;
  const cardBack = s.cardBack || "images/cards/cardBack-rounded.png";

  let pairs = s.memoryImages || [];
  if (pairs.length * 2 !== totalCards) {
    pairs = pairs.slice(0, totalCards / 2);
  }
  const cards = pairs.concat(pairs);

  // Karten mischen
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }

  // Memory-Grid
  const grid = document.createElement("div");
  grid.className = "memory-grid";
  grid.style.display = "grid";
  grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  grid.style.gap = "14px";
  grid.style.margin = "0 auto";
  grid.style.maxWidth = "340px";
  grid.style.width = "100%";
  grid.style.padding = "12px";
  grid.style.background = "rgba(255,255,246,0.97)";
  grid.style.borderRadius = "22px";
  grid.style.boxShadow = "0 4px 22px #ffd54f44";
  memoryContainer.appendChild(grid);

  let flipped = [];
  let matched = [];

  cards.forEach((imgPath, index) => {
    const wrapper = document.createElement("div");
    wrapper.className = "memory-card";
    wrapper.style.position = "relative";
    wrapper.style.aspectRatio = "1/1";
    wrapper.style.cursor = "pointer";
    wrapper.style.background = "#fffbe6";

    const front = document.createElement("img");
    front.src = imgPath;
    front.className = "front";

    const back = document.createElement("img");
    back.src = cardBack;
    back.className = "back";

    wrapper.appendChild(front);
    wrapper.appendChild(back);
    grid.appendChild(wrapper);

    wrapper.addEventListener("click", () => {
      if (
        flipped.length === 2 ||
        matched.includes(index) ||
        flipped.includes(index) ||
        wrapper.classList.contains("flipped")
      )
        return;

      wrapper.classList.add("flipped");
      flipped.push(index);

      if (flipped.length === 2) {
        const [i1, i2] = flipped;
        const same = cards[i1] === cards[i2];

        setTimeout(() => {
          if (same) {
            matched.push(i1, i2);
            runAnimations(["confetti-glow", "emoji-party"]);
            playSound("yay.mp3");
            if (s.avatar) playAvatarAnimation(s.avatar, "tada");
            if (matched.length === cards.length) {
              if (memoryMusic) {
                memoryMusic.pause();
                memoryMusic.currentTime = 0;
              }
              showUniversalReward(
                "images/stickers/star.png",
                s.onFinish || "Super gemacht!",
                () => {
                  currentSession++;
                  renderSession(currentSession);
                },
                s.successSticker || 0
              );
            }
          } else {
            grid.children[i1].classList.remove("flipped");
            grid.children[i2].classList.remove("flipped");
            runAnimations(["shake"]);
            playSound("fail.mp3");
            if (s.avatar) playAvatarAnimation(s.avatar, "wiggle");
          }
          flipped = [];
        }, 800);
      }
    });
  });
}







function runAnimations(anims) {
  anims.forEach(anim => {
    if (anim === "confetti-glow") runAnimation_confettiGlow();
    if (anim === "emoji-party") runAnimation_emojiParty();
    if (anim === "sparkle") runAnimation_sparkle();
    if (anim === "shake") runAnimation_shake();
    // Füge weitere Animationen hinzu, wie du sie brauchst
  });
}

function runAnimation_confettiGlow() {
  // Einfache Konfetti-Animation (Demo!)
  const confettiBox = document.createElement("div");
  confettiBox.className = "confetti-overlay";
  document.body.appendChild(confettiBox);

  for (let i = 0; i < 25; i++) {
    const piece = document.createElement("div");
    piece.className = "confetti-piece";
    piece.style.left = Math.random() * 100 + "vw";
    piece.style.animationDelay = (Math.random() * 0.8) + "s";
    confettiBox.appendChild(piece);
  }
  setTimeout(() => confettiBox.remove(), 1600);
}

function runAnimation_emojiParty() {
  const emojiList = ["🥳", "🎉", "⭐️", "👏", "🎈", "😻", "🐸", "🌈"];
  for (let i = 0; i < 14; i++) {
    const emoji = document.createElement("div");
    emoji.className = "party-emoji";
    emoji.innerText = emojiList[Math.floor(Math.random()*emojiList.length)];
    emoji.style.left = Math.random() * 90 + "vw";
    emoji.style.top = (60 + Math.random()*30) + "vh";
    emoji.style.fontSize = (1.9 + Math.random()*1.8) + "rem";
    emoji.style.animationDelay = (Math.random()*0.7) + "s";
    document.body.appendChild(emoji);
    setTimeout(() => emoji.remove(), 1800);
  }
}

function runAnimation_shake(selector = ".centered-next-btn, .animals-buttons button, .reward-animated") {
  document.querySelectorAll(selector).forEach(el => {
    el.classList.add("shake");
    setTimeout(() => el.classList.remove("shake"), 500);
  });
}

function runAnimation_sparkle() {
  const sparkle = document.createElement("div");
  sparkle.className = "sparkle-anim";
  sparkle.innerHTML = "✨✨✨";
  document.body.appendChild(sparkle);
  setTimeout(() => sparkle.remove(), 1300);
}

function playAvatarAnimation(avatarName, animType) {
  // Holt das Avatar-Bild aus dem Floating-Video-Container
  const img = document.querySelector(".floating-video img.avatar");
  if (!img) return;
  img.classList.remove("avatar-bounce", "avatar-wiggle", "avatar-tada");
  if (animType === "bounce") img.classList.add("avatar-bounce");
  if (animType === "wiggle") img.classList.add("avatar-wiggle");
  if (animType === "tada")   img.classList.add("avatar-tada");
  if (animType !== "bounce") {
    setTimeout(() => img.classList.remove("avatar-wiggle", "avatar-tada"), 1500);
  }
}