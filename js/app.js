/* ==== COACH MAX UNIVERSAL SESSION TEMPLATE ==== */

// ==== 1. Grundvariablen und Setup ====
let sessions = [], currentSession = 0, lastSessionIdx = 0;
let textTimeouts = [];
let currentDay = 1;
let currentMusic = null;

function getDayParam() {
  const params = new URLSearchParams(window.location.search);
  return parseInt(params.get("day")) || 1;
}
currentDay = getDayParam();
const jsonURL = `days/day${currentDay}.json`;

// ==== 2. Musik-/Sound-Handling ====
// Stoppt ALLE laufenden Sounds zentral
function stopAllSounds() {
  if (window.currentMusic) {
    try { window.currentMusic.pause(); window.currentMusic.currentTime = 0; } catch(e) {}
    window.currentMusic = null;
  }
  if (window.allSessionAudio && Array.isArray(window.allSessionAudio)) {
    window.allSessionAudio.forEach(a => { try { a.pause(); a.currentTime = 0; } catch(e){} });
    window.allSessionAudio = [];
  }
}
// Musik auch bei Tab-Wechsel pausieren
document.addEventListener("visibilitychange", function() {
  if (window.currentMusic) {
    if (document.hidden) window.currentMusic.pause();
    else window.currentMusic.play();
  }
});

// ==== 3. Überschrift zentriert OBEN, nur einmal! ====
function renderSessionHeader(title) {
  let header = document.getElementById("mainTitle");
  if (!header) {
    header = document.createElement("h2");
    header.id = "mainTitle";
    header.className = "session-heading";
    const content = document.getElementById("sessionTextArea") || document.body;
    content.insertAdjacentElement("afterbegin", header);
  }
  header.innerText = title || "";
}

// ==== 4. Floating Video universal ====
function renderFloatingVideo(sessionObj, onVideoEndedCallback) {
  document.querySelectorAll(".floating-video").forEach(el => el.remove());
  if (!sessionObj.video) {
    if (typeof onVideoEndedCallback === "function") onVideoEndedCallback();
    return;
  }
  const videoBox = document.createElement("div");
  videoBox.className = "floating-video";
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
  videoBox.appendChild(videoElement);

  // Play-Overlay
  const playBtn = document.createElement('button');
  playBtn.className = "custom-play-btn";
  playBtn.title = "Play";
  playBtn.innerHTML = `<svg viewBox="0 0 60 60"><circle cx="30" cy="30" r="28" fill="none"/><polygon points="22,16 46,30 22,44" fill="#383838"/></svg>`;
  playBtn.onclick = function() {
    videoElement.play();
    playBtn.style.display = "none";
    videoElement.style.pointerEvents = "auto";
  };
  videoElement.addEventListener('play', () => { playBtn.style.display = "none"; });
  videoElement.addEventListener('pause', () => { playBtn.style.display = ""; });
  videoElement.addEventListener('ended', () => {
    videoBox.innerHTML = `<img class="avatar" src="images/${sessionObj.avatar || 'luna'}.png" style="width:100%;height:100%;border-radius:50%;object-fit:contain;">`;
    if (typeof onVideoEndedCallback === "function") setTimeout(() => onVideoEndedCallback(), 400);
  });
  videoBox.appendChild(playBtn);
  document.body.appendChild(videoBox);
}

// ==== 5. Haupt-Session-Renderer ====
function renderSession(idx) {
  const s = sessions[idx];
  lastSessionIdx = idx;
  clearTimeouts();
  stopAllSounds();
  document.querySelectorAll(".floating-video, .centered-next-btn, .animals-reward-container").forEach(el => el.remove());

  // Nur das Spielfeld leeren, Überschrift bleibt!
  const textArea = document.getElementById("sessionTextArea");
  if (textArea) textArea.innerHTML = "";

  // Überschrift immer nur HIER!
  renderSessionHeader(s.title || "");

  // Zentraler Spielfeld-Container (Game/Quiz/Memory etc.)
  const gameContainer = document.createElement("div");
  gameContainer.id = "gameContainer";
  gameContainer.style.display = "flex";
  gameContainer.style.flexDirection = "column";
  gameContainer.style.alignItems = "center";
  gameContainer.style.justifyContent = "center";
  gameContainer.style.width = "100%";
  gameContainer.style.maxWidth = "370px";
  gameContainer.style.margin = "0 auto";
  gameContainer.style.position = "relative";
  gameContainer.style.zIndex = "3";
  textArea.appendChild(gameContainer);

  // Spezialfall: Intro & Story – synchron!
  if (s.type === "intro" || s.type === "story") {
    renderFloatingVideo(s); // Video sofort
    if (s.type === "intro") renderIntroSession(s, idx, gameContainer);
    else renderStorySession(s, idx, gameContainer);
    return;
  }
  // Alle anderen: Erst nach Video das Spielfeld
  renderFloatingVideo(s, () => {
    if      (s.type === "breathing")   renderBreathingSession(s, idx, gameContainer);
    else if (s.type === "counting")    renderCountingSession(s, idx, gameContainer);
    else if (s.type === "memory")      renderMemoryField(s, idx, gameContainer);
    else if (s.type === "drawing")     renderDrawingSession(s, idx, gameContainer);
    else if (s.type === "animals")     renderAnimalsSession(s, idx, gameContainer);
    else if (s.type === "rhyme")       renderRhymeSession(s, idx, gameContainer);
    else if (s.type === "chatgpt-quiz")renderChatGPTQuizSession(s, idx, gameContainer);
    else if (s.type === "sequence")    renderSequenceSession(s, idx, gameContainer);
    else if (s.type === "shadow")      renderShadowSession(s, idx, gameContainer);
    else                              renderUnknownSession(s, idx, gameContainer);
  });
}

// ==== 6. Beispiel-Module ====
function renderMemoryField(s, idx, container) {
  container.innerHTML = ""; // Nur das eigene Feld leeren!
  // ... Memory-Grid & Spiellogik NUR in container bauen ...
}

function renderCountingSession(s, idx, container) {
  container.innerHTML = ""; // Nur das eigene Feld leeren!
  // ... Counting-Logik NUR in container bauen ...
}
// Usw. für alle weiteren Module

// ==== 7. Universeller Reward ====
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



// ==== 8. Initialisierung ====
window.onload = async function() {
  document.getElementById('mainContent').style.display = '';
  try {
    const res = await fetch(jsonURL);
    if (!res.ok) throw new Error("Fehler beim Laden des JSON: " + res.statusText);
    const data = await res.json();
    sessions = data.sessions;
    currentDay = data.day || 1;
    document.title = `Coach Max – Day ${currentDay}`;
    currentSession = 0;
    renderSession(currentSession);
  } catch (e) {
    console.error("Fehler beim Initialisieren:", e);
    document.body.innerHTML = `<div style="color:red;font-size:1.4em;">Fehler beim Initialisieren:<br>${e.message}</div>`;
  }
};

// Immer ganz oben im Code behalten!
let textTimeouts = [];
function clearTimeouts() {
  if (Array.isArray(textTimeouts)) {
    textTimeouts.forEach(t => clearTimeout(t));
    textTimeouts = [];
  }
}


// ==== 9. Helper: Animationen, Sound usw. ====
// ... z.B. runAnimations, playAvatarAnimation wie gehabt ...

// ==== 10. Optional: renderIntroSession/renderMemoryField etc. ====
// Wichtig: Diese Funktionen arbeiten **ausschließlich** im gameContainer!










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

  
container.innerHTML = "";
// ...
container.appendChild(irgendwas);


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
  
  container.innerHTML = "";
// ...
container.appendChild(irgendwas);



  // Musik abspielen, falls im JSON vorhanden
  if (window.currentMusic) {
  try { window.currentMusic.pause(); window.currentMusic.currentTime = 0; } catch(e) {}
  window.currentMusic = null;
}
if (s.music) {
  try {
    window.currentMusic = new Audio("audio/" + s.music);
    window.currentMusic.loop = false;
    window.currentMusic.volume = 0.2;
    window.currentMusic.play();
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
function renderMemoryField(s, idx, container) {
  // Aufräumen
  container.innerHTML = "";
  clearTimeouts();
  stopAllSounds();

  // Musik abspielen (wenn im JSON)
  let memoryMusic = null;
  if (window.currentMusic) {
    try { window.currentMusic.pause(); window.currentMusic.currentTime = 0; } catch(e) {}
    window.currentMusic = null;
  }
  if (s.music) {
    try {
      memoryMusic = new Audio("audio/" + s.music);
      memoryMusic.loop = false;
      memoryMusic.volume = 0.2;
      memoryMusic.play();
      window.currentMusic = memoryMusic;
    } catch (e) {}
  }

  // Memory-Grid Setup
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

  // Karten mischen (Fisher-Yates)
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }

  // Grid-Container
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
  container.appendChild(grid);

  // Karten-Logik
  let flipped = [];
  let matched = [];

  cards.forEach((imgPath, index) => {
    const wrapper = document.createElement("div");
    wrapper.className = "memory-card";
    wrapper.style.position = "relative";
    wrapper.style.aspectRatio = "1/1";
    wrapper.style.cursor = "pointer";
    wrapper.style.background = "#fffbe6";
    wrapper.style.borderRadius = "18px";
    wrapper.style.transition = "box-shadow 0.18s";
    wrapper.style.boxShadow = "0 2px 12px #ffd54f44";

    // Vorder- und Rückseite
    const front = document.createElement("img");
    front.src = imgPath;
    front.className = "front";
    front.style.display = "none";
    front.style.width = "100%";
    front.style.height = "100%";
    front.style.borderRadius = "16px";

    const back = document.createElement("img");
    back.src = cardBack;
    back.className = "back";
    back.style.display = "block";
    back.style.width = "100%";
    back.style.height = "100%";
    back.style.borderRadius = "16px";
    back.style.boxShadow = "0 1px 7px #fbc02d55";

    wrapper.appendChild(front);
    wrapper.appendChild(back);
    grid.appendChild(wrapper);

    // Flip-Logik
    wrapper.addEventListener("click", () => {
      if (
        flipped.length === 2 ||
        matched.includes(index) ||
        flipped.includes(index) ||
        wrapper.classList.contains("flipped")
      ) return;

      wrapper.classList.add("flipped");
      front.style.display = "block";
      back.style.display = "none";
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
              setTimeout(() => {
                showUniversalReward(
                  s,
                  () => { window.location.href = "choose.html"; }
                );
              }, 600);
            }
          } else {
            // zurückdrehen
            [i1, i2].forEach(idx => {
              const card = grid.children[idx];
              card.classList.remove("flipped");
              card.querySelector('.front').style.display = "none";
              card.querySelector('.back').style.display = "block";
            });
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