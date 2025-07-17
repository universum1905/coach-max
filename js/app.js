/* jshint esversion: 6 */

const DEV_MODE = true;    // Auf true setzen für Entwicklung, auf false für Produktion
let DEV_START_SESSION = 3; // 0 = Intro, 1 = Breathing, 2 = Counting, usw.



function getDayParam() {
  const params = new URLSearchParams(window.location.search);
  return parseInt(params.get("day")) || 1;
}
let currentDay = getDayParam();
const jsonURL = `days/day${currentDay}.json`;



let sessions = [];
let currentSession = 0; let lastSessionIdx = 0;
let textTimeouts = [];
let videoElement = null;



// Breathing Musik vorbereiten
const breathingMusic = document.getElementById("breathingMusic") 
  || new Audio("audio/focus-loop.mp3");
if (breathingMusic) {
  breathingMusic.loop = true;
  breathingMusic.volume = 0.22;
}

function capitalize(word) {
  if (!word) return "";
  return word.charAt(0).toUpperCase() + word.slice(1);
}

// ==== UNIVERSALER REWARD-CONTAINER ====
function showUniversalReward(imgSrcOrText, correctTextStr = "", nextAction = null, stickerIdx = 0, rewardType = "star") {
  // Stoppe alle Musik & Sounds (universell)
  if (window.allSessionAudio && Array.isArray(window.allSessionAudio)) {
    window.allSessionAudio.forEach(a => { try { a.pause(); a.currentTime = 0; } catch(e){} });
  }
  // Entferne alte Reward-Container
  document.querySelectorAll(".animals-reward-container, .centered-next-btn").forEach(e => e.remove());

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

  // Animation & Bild/Text je nach rewardType
  let rewardImg, rewardAnim;
  if (rewardType === "star") {
    rewardImg = document.createElement("img");
    rewardImg.src = "images/stickers/star.png";
    rewardImg.style.width = "82px";
    rewardImg.style.height = "82px";
    rewardImg.style.borderRadius = "22px";
    rewardImg.style.margin = "0 0 14px 0";
    rewardImg.className = "reward-animated";
    reward.appendChild(rewardImg);
  }
  if (rewardType === "puzzle") {
    rewardImg = document.createElement("img");
    rewardImg.src = typeof imgSrcOrText === "string" ? imgSrcOrText : "images/puzzles/piece.png";
    rewardImg.style.width = "94px";
    rewardImg.style.height = "94px";
    rewardImg.style.borderRadius = "18px";
    rewardImg.style.margin = "0 0 10px 0";
    rewardImg.className = "reward-animated";
    reward.appendChild(rewardImg);
    // Optional: Glitzer/Glanz
    rewardAnim = document.createElement("div");
    rewardAnim.className = "reward-sparkle";
    rewardAnim.innerText = "✨";
    rewardAnim.style.fontSize = "2.7rem";
    reward.appendChild(rewardAnim);
  }
  if (rewardType === "trophy") {
    rewardImg = document.createElement("img");
    rewardImg.src = "images/trophy.png";
    rewardImg.style.width = "100px";
    rewardImg.style.height = "90px";
    rewardImg.style.margin = "0 0 14px 0";
    rewardImg.className = "reward-animated";
    reward.appendChild(rewardImg);
  }
  if (rewardType === "party") {
    rewardAnim = document.createElement("div");
    rewardAnim.innerHTML = "🎉<br>Star Party!<br>🎉";
    rewardAnim.style.fontSize = "2.3rem";
    rewardAnim.style.margin = "8px 0 8px 0";
    rewardAnim.className = "reward-sparkle";
    reward.appendChild(rewardAnim);
  }
  if (rewardType === "certificate") {
    rewardImg = document.createElement("img");
    rewardImg.src = "images/certificate.png";
    rewardImg.style.width = "170px";
    rewardImg.style.height = "120px";
    rewardImg.style.margin = "0 0 14px 0";
    rewardImg.className = "reward-animated";
    reward.appendChild(rewardImg);
  }
  // Default: Zeige imgSrcOrText als Bild oder Text
  if (!rewardImg && typeof imgSrcOrText === "string") {
    if (imgSrcOrText.startsWith("images/")) {
      rewardImg = document.createElement("img");
      rewardImg.src = imgSrcOrText;
      rewardImg.style.width = "90px";
      rewardImg.style.height = "90px";
      rewardImg.style.borderRadius = "18px";
      rewardImg.style.margin = "0 0 10px 0";
      reward.appendChild(rewardImg);
    } else {
      const word = document.createElement("div");
      word.textContent = imgSrcOrText;
      word.style.fontSize = "2.1rem";
      word.style.fontWeight = "bold";
      word.style.color = "#44a047";
      word.style.marginBottom = "16px";
      reward.appendChild(word);
    }
  }

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
    "certificate": "📜 New Certificate!",
    "party": "🎊 Party Time!",
  }[rewardType] || "🎉 Reward!";
  yay.style.fontWeight = "bold";
  yay.style.fontSize = "1.37rem";
  yay.style.color = "#ffa000";
  yay.style.textShadow = "0 1px 6px #fff9c4";
  yay.style.marginBottom = "11px";
  reward.appendChild(yay);

  document.body.appendChild(reward);

  // ==== Speicherlogik/Unlocks ====
  // STICKER ODER PUZZLE ODER TROPHY usw.
  // -- Puzzle: unlockPuzzlePiece(puzzleId, pieceIdx)
  // -- Sticker: unlockSticker(stickerIdx)
  // -- Trophy: localStorage.setItem("trophyDayX", "1")
  if (rewardType === "puzzle" && typeof unlockPuzzlePiece === "function") {
    // Beispiel: unlockPuzzlePiece(puzzleId, pieceIdx)
    // Aus sessions[currentSession] puzzleId & successPuzzle verwenden
    if (typeof sessions === "object" && sessions[currentSession]) {
      const s = sessions[currentSession];
      const puzzleId = s.puzzleId || 1;
      const pieces = Array.isArray(s.successPuzzle) ? s.successPuzzle : [s.successPuzzle];
      pieces.forEach(pieceIdx => unlockPuzzlePiece(puzzleId, pieceIdx));
    }
  } else if (rewardType === "star" && typeof unlockSticker === "function") {
    unlockSticker(stickerIdx);
  } else if (rewardType === "trophy") {
    localStorage.setItem(`trophyDay${localDay}`, "1");
  }
  // Weitere Typen hier möglich (certificate, party...)

  // Erfolgssound (individuell pro rewardType möglich)
  let audioSrc = "audio/yay.mp3";
  if (rewardType === "trophy") audioSrc = "audio/fanfare.mp3";
  if (rewardType === "certificate") audioSrc = "audio/applause.mp3";
  if (rewardType === "party") audioSrc = "audio/party.mp3";
  try {
    const rewardAudio = new Audio(audioSrc);
    rewardAudio.play();
    if (!window.allSessionAudio) window.allSessionAudio = [];
    window.allSessionAudio.push(rewardAudio);
  } catch(e){}

  // Next-Button
  setTimeout(() => {
  const btn = document.createElement("button");
  btn.innerText = (typeof currentSession !== "undefined" && sessions && currentSession < sessions.length - 1) ? "Next" : "Finish";
  btn.className = "centered-next-btn";
  btn.style.marginTop = "20px";
  btn.onclick = () => {
    document.querySelectorAll(".animals-reward-container, .centered-next-btn").forEach(e => e.remove());
    if (typeof nextAction === "function") {
      nextAction();
    } else {
      currentSession++;
      if (currentSession < sessions.length) {
        renderSession(currentSession); // nächste Session
      } else {
        // Alles fertig – zur Auswahlseite!
        window.location.href = "choose.html";
      }
    }
  };
  reward.insertAdjacentElement('afterend', btn);
}, 800);
}




function showLoadingOverlay(msg = "Loading…", duration = 1200, callback) {
  // Vorherige Overlays entfernen
  document.querySelectorAll(".universal-loading-overlay").forEach(e => e.remove());

  // Overlay bauen
  const overlay = document.createElement("div");
  overlay.className = "universal-loading-overlay";
  overlay.style.position = "fixed";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100vw";
  overlay.style.height = "100vh";
  overlay.style.background = "rgba(255,255,246,0.85)";
  overlay.style.zIndex = "10001";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";

  // Container für Spinner + Text
  const box = document.createElement("div");
  box.style.background = "#fffbe6";
  box.style.padding = "30px 44px";
  box.style.borderRadius = "22px";
  box.style.boxShadow = "0 4px 32px #ffd54faa";
  box.style.display = "flex";
  box.style.flexDirection = "column";
  box.style.alignItems = "center";
  box.style.gap = "18px";

  // Spinner (animiertes SVG)
  const spinner = document.createElement("div");
  spinner.innerHTML = `
    <svg width="42" height="42" viewBox="0 0 42 42">
      <circle cx="21" cy="21" r="18" stroke="#ffd54f" stroke-width="5" fill="none" opacity="0.6"/>
      <circle class="loading-spinner-path" cx="21" cy="21" r="18" stroke="#29b6f6" stroke-width="5" fill="none"
        stroke-dasharray="85 70" stroke-linecap="round"/>
    </svg>
  `;
  spinner.style.animation = "spin 1.1s linear infinite";
  box.appendChild(spinner);

  // Text
  const waitMsg = document.createElement("div");
  waitMsg.textContent = msg;
  waitMsg.style.fontSize = "1.22rem";
  waitMsg.style.fontWeight = "bold";
  waitMsg.style.color = "#1976d2";
  waitMsg.style.textAlign = "center";
  box.appendChild(waitMsg);

  overlay.appendChild(box);
  document.body.appendChild(overlay);

  // Spinner-Animation (nur 1x global hinzufügen)
  if (!document.getElementById("loading-spinner-style")) {
    const style = document.createElement("style");
    style.id = "loading-spinner-style";
    style.innerHTML = `
      @keyframes spin {
        0% { transform: rotate(0deg);}
        100% { transform: rotate(360deg);}
      }
      .loading-spinner-path {
        stroke-dasharray: 65 80;
        stroke-dashoffset: 0;
        animation: dashmove 1.2s ease-in-out infinite;
      }
      @keyframes dashmove {
        0% { stroke-dashoffset: 0;}
        50% { stroke-dashoffset: -36;}
        100% { stroke-dashoffset: 0;}
      }
      .universal-loading-overlay {
        user-select: none;
        -webkit-user-select: none;
        pointer-events: all;
      }
    `;
    document.head.appendChild(style);
  }

  setTimeout(() => {
    overlay.remove();
    if (typeof callback === "function") callback();
  }, duration);
}



function showCheckingAnimation(parent, callback, opts = {}) {
  // Default-Einstellungen
  const duration = opts.duration || 3000; // in ms
  const text = opts.text || "Let’s see...";

  // Container
  const overlay = document.createElement("div");
  overlay.style.display = "flex";
  overlay.style.flexDirection = "column";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.position = "absolute";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100%";
  overlay.style.height = "100%";
  overlay.style.background = "rgba(255,255,255,0.91)";
  overlay.style.zIndex = "50";

  // Bunte Kreise animiert
  const balls = document.createElement("div");
  balls.style.display = "flex";
  balls.style.justifyContent = "center";
  balls.style.gap = "18px";
  for (let i = 0; i < 3; i++) {
    const c = document.createElement("div");
    c.style.width = "38px";
    c.style.height = "38px";
    c.style.borderRadius = "50%";
    c.style.background = ["#ffb74d", "#4dd0e1", "#ffd54f"][i % 3];
    c.style.animation = `checkPulse${i} 1.3s ${i * 0.25}s infinite alternate`;
    balls.appendChild(c);
  }
  overlay.appendChild(balls);

  // Keyframes als <style>
  if (!document.getElementById("checkPulseStyle")) {
    const style = document.createElement("style");
    style.id = "checkPulseStyle";
    style.innerHTML = `
      @keyframes checkPulse0 {0%{transform:scale(1);}100%{transform:scale(1.35);}}
      @keyframes checkPulse1 {0%{transform:scale(1);}100%{transform:scale(1.25);}}
      @keyframes checkPulse2 {0%{transform:scale(1);}100%{transform:scale(1.2);}}
    `;
    document.head.appendChild(style);
  }

  // Text darunter
  const txt = document.createElement("div");
  txt.textContent = text;
  txt.style.marginTop = "15px";
  txt.style.fontSize = "1.18rem";
  txt.style.fontWeight = "bold";
  txt.style.color = "#444";
  overlay.appendChild(txt);

  parent.appendChild(overlay);

  setTimeout(() => {
    overlay.remove();
    if (typeof callback === "function") callback();
  }, duration);
}




function runAnimation_confettiGlow() {
  // Erzeuge ein Konfetti-Overlay
  const confettiBox = document.createElement("div");
  confettiBox.className = "confetti-overlay";
  document.body.appendChild(confettiBox);

  for (let i = 0; i < 35; i++) {
    const piece = document.createElement("div");
    piece.className = "confetti-piece";
    piece.style.left = Math.random() * 100 + "vw";
    piece.style.animationDelay = (Math.random() * 0.8) + "s";
    piece.style.background = ["#FFD700", "#FF69B4", "#00E676", "#2979FF", "#FF3D00", "#E040FB"][Math.floor(Math.random()*6)];
    confettiBox.appendChild(piece);
  }
  // Nach 2s alles entfernen
  setTimeout(() => confettiBox.remove(), 2000);

  // Optional: Glow um Rewards
  const reward = document.querySelector(".animals-reward-container, .reward-animated, .centered-next-btn");
  if (reward) {
    reward.classList.add("glow-effect");
    setTimeout(() => reward.classList.remove("glow-effect"), 1200);
  }
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

function runAnimation_bounce(selector = ".animals-reward-container, .reward-animated") {
  document.querySelectorAll(selector).forEach(el => {
    el.classList.add("bounce-anim");
    setTimeout(() => el.classList.remove("bounce-anim"), 700);
  });
}

function runAnimation_rainbowEmoji() {
  const rainbow = document.createElement("div");
  rainbow.className = "rainbow-emoji-anim";
  rainbow.innerText = "🌈";
  document.body.appendChild(rainbow);
  setTimeout(() => rainbow.remove(), 1200);
}






// Die Animationen-Funktion bleibt wie gehabt:
function playAvatarAnimation(avatar, animType) {
  // Standard: avatar ist der Dateiname, animType z.B. 'bounce'
  const img = document.querySelector(".floating-video img.avatar");
  if (!img) return;
  img.classList.remove("avatar-bounce", "avatar-wiggle", "avatar-tada");
  if (animType === "bounce")      img.classList.add("avatar-bounce");
  else if (animType === "wiggle") img.classList.add("avatar-wiggle");
  else if (animType === "tada")   img.classList.add("avatar-tada");
  if (animType !== "bounce") {
    setTimeout(() => img.classList.remove("avatar-wiggle", "avatar-tada"), 1600);
  }
}




// === UNIVERSAL SESSION ENGINE – COACH MAX ===

// --- Globale Pools für Animation & Sound ---
const animationPool = {
  correct: ["confetti-glow", "emoji-party", "sparkle", "bounce", "rainbow-emoji", "star-pulse"],
  wrong:   ["shake", "red-flash", "swirl-emoji", "wobble", "funny-face", "oops-cloud"]
};
const soundPool = {
  correct: ["yay.mp3", "correct.mp3", "sparkle-bell.mp3"],
  wrong:   ["fail.mp3", "wrong.mp3", "sad-trombone.mp3"]
};
const avatarAnimations = {
  "benny-wave": "animations/benny-wave.json",
  "benny-jump": "animations/benny-jump.json",
  "luna-wave": "animations/luna-wave.json",
  "momo-party": "animations/momo-party.json"
};



function clearQuestionUI() {
  const area = document.getElementById("sessionTextArea");
  if (area) area.innerHTML = '';
}





function getContrastTextColor(colorName) {
  // Simple Mapping, ggf. anpassen/erweitern!
  const darkColors = [
    "blue", "purple", "indigo", "navy", "green", "red", "teal", "brown", "black", "darkblue", "darkviolet"
  ];
  const lightColors = [
    "yellow", "white", "lightyellow", "lightgrey", "lightgray", "beige", "gold"
  ];
  if (lightColors.includes(colorName.toLowerCase())) return "#222";
  if (darkColors.includes(colorName.toLowerCase())) return "#fff";
  // Default: mittlerer Kontrast
  return "#fff";
}

function showUniversalRewardFromSession(sessionObj, nextAction) {
  if (!sessionObj) return;

  // Reward-Type bestimmen (Fallback: "star")
  let rewardType = sessionObj.rewardType 
    || (typeof sessionObj.successPuzzle !== "undefined" ? "puzzle"
    : (typeof sessionObj.specialReward !== "undefined" ? sessionObj.specialReward : "star"));

  // Reward-Bild festlegen (Mapping)
  const rewardImgMap = {
    "star":        "images/stickers/star.png",
    "trophy":      "images/trophy.png",
    "certificate": "images/certificate.png",
    "party-sticker":"images/party-sticker.png",
    "medal":       "images/medal.png"
  };

  let imgSrc = rewardImgMap[rewardType] || rewardImgMap["star"];

  // Eigener Bildpfad aus JSON überschreibt alles
  if (sessionObj.rewardImg) imgSrc = sessionObj.rewardImg;

  // Text für das Popup
  let rewardText = sessionObj.onCorrect
    || (rewardType === "star" ? "Great job!"
    : rewardType === "trophy" ? "Wow! You unlocked a trophy!"
    : rewardType === "party-sticker" ? "You got a party sticker!"
    : rewardType === "medal" ? "You earned a medal!"
    : rewardType === "puzzle" ? "A new puzzle piece!"
    : "Great job!");

  // Zeige das universelle Reward-Popup
  showUniversalReward(
    imgSrc,
    rewardText,
    nextAction || null,
    sessionObj.successSticker || 0,
    rewardType
  );
}


let currentMusic = null;

function stopAllSounds() {
  // Stoppt die Musik, falls sie läuft!
  if (currentMusic) {
    try { currentMusic.pause(); currentMusic.currentTime = 0; } catch(e) {}
    currentMusic = null;
  }
  // Alle Session-Sounds stoppen
  if (window.allSessionAudio && Array.isArray(window.allSessionAudio)) {
    window.allSessionAudio.forEach(a => { try { a.pause(); a.currentTime = 0; } catch(e){} });
    window.allSessionAudio = [];
  }
}



// --- Universal Renderer Entry ---
// UNIVERSAL SESSION RENDERER: Quiz + Sequence (Color/Order)
// === UNIVERSAL SESSION ENGINE – COACH MAX ===

async function renderUniversalSession(sessionJSON) {
  stopAllSounds();
  clearMainUI();
   renderFrogProgress(currentSession, currentSession, sessions.length);
  const questions = sessionJSON.questions || sessionJSON.tasks || [];
  renderSessionHeader(sessionJSON.title || "");

  renderUniversalVideoBox(sessionJSON, () => {
    if (questions.length > 0) showQuestion(0);
  });

  // Musik wie gehabt...
  let music = null;
if (sessionJSON.music) {
  if (window._currentSessionMusic) {
    try { window._currentSessionMusic.pause(); window._currentSessionMusic.currentTime = 0; } catch(e){}
  }
  music = new Audio("audio/" + sessionJSON.music);
  music.loop = true;
  music.volume = 0.22;
  music.play();
  window._currentSessionMusic = music;
  window.addEventListener("beforeunload", () => { music.pause(); });
  window.addEventListener("blur", () => { music.pause(); });
  window.addEventListener("focus", () => { if (music) music.play(); });
}

  // ---------------  
  // FRAGEN-LOGIK  
function showQuestion(qIdx) {
  // 1. Avatar-Animation immer zurücksetzen (wichtig!)
  const img = document.querySelector(".floating-video img.avatar");
  if (img) {
    img.classList.remove("avatar-bounce", "avatar-wiggle", "avatar-tada");
    void img.offsetWidth; // Reflow, damit die Animation wirklich neu startet
  }

  // 2. Alles vorbereiten für neue Frage
  clearQuestionUI();

  // 3. Buttons/Frage anzeigen und Antwort-Logik:
  renderUniversalAnswerButtons(questions[qIdx], (result) => {
    let isCorrect;
    if (Array.isArray(questions[qIdx].choices)) {
      isCorrect = result === questions[qIdx].correct;
    } else if (Array.isArray(questions[qIdx].colors)) {
      isCorrect = result; // true/false
    }

    lockAnswerButtons();

    // Sound, Animation, Avatar-Animation
    const sound = isCorrect
      ? questions[qIdx].correctSound || randomFrom(soundPool.correct)
      : questions[qIdx].wrongSound   || randomFrom(soundPool.wrong);
    playSound(sound);

    const anims = isCorrect
      ? (questions[qIdx].correctAnimation || [randomFrom(animationPool.correct)])
      : (questions[qIdx].wrongAnimation   || [randomFrom(animationPool.wrong)]);
    runAnimations(anims);

    // Avatar-Animation (separat für correct/wrong möglich)
    if (questions[qIdx].avatar) {
      if (isCorrect && questions[qIdx].avatarAnimationCorrect) {
        playAvatarAnimation(questions[qIdx].avatar, questions[qIdx].avatarAnimationCorrect);
      }
      if (!isCorrect && questions[qIdx].avatarAnimationWrong) {
        playAvatarAnimation(questions[qIdx].avatar, questions[qIdx].avatarAnimationWrong);
      }
    }

    renderFeedbackText(isCorrect, questions[qIdx]);
    showCheckingOverlay();

    setTimeout(() => {
  hideCheckingOverlay();
  if (isCorrect) {
    // Optional: Einzelner Frage-Reward, falls gewünscht
    // if (questions[qIdx].reward !== undefined) showRewardPopup(questions[qIdx].reward);

    setTimeout(() => {
      if (qIdx + 1 < questions.length) {
        showQuestion(qIdx + 1); // Nächste Frage
      } else {
        // Nach allen Fragen: Haupt-Reward
        clearQuestionUI();
        showUniversalRewardFromSession(sessionJSON, () => {
  currentSession++;
  if (currentSession < sessions.length) {
    renderSession(currentSession); // normale nächste Session
  } else {
    // ALLE Sessions vorbei → jetzt zur Auswahl/Abschluss
    window.location.href = "choose.html";
  }
});
      }
    }, 1100);
  } else {
    unlockAnswerButtons();
    // Avatar-Animation nach Falsch ggf. zurücksetzen
  }
}, 3000); // 3 Sekunden "Checking"
  });
}


}








// === Feedback-Text ===
function renderFeedbackText(isCorrect, q) {
  // Entferne alte Feedbacks
  document.querySelectorAll('.quiz-feedback').forEach(el => el.remove());
  const area = document.getElementById("sessionTextArea");
  const feedback = document.createElement("div");
  feedback.className = "quiz-feedback";
  feedback.innerText = isCorrect
  ? (q.feedbackCorrect || "Great job! 🎉")
  : (q.feedbackWrong || "Try again! 😅");
  feedback.style.marginTop = "15px";
  feedback.style.fontWeight = "bold";
  feedback.style.fontSize = "1.2em";
  feedback.style.color = isCorrect ? "#219821" : "#c82121";
  feedback.style.animation = "fadeInText 0.5s";
  area.appendChild(feedback);
}

// === Musik beim Tabwechsel pausieren ===
document.addEventListener("visibilitychange", () => {
  if (document.hidden && window.currentMusic) {
    window.currentMusic.pause();
  }
});



// Den Rest deiner bestehenden Animationen, Musik, Frosch, Reward usw. kannst du beibehalten!

// === Hilfsfunktionen ===
function renderSessionHeader(title) {
  document.getElementById("mainTitle").innerText = title || "";
}


// ... Deine bestehenden Reward, FrogBar, Musik, etc. bleiben!



// VIDEO unten rechts: universell für alle Sessions
function renderUniversalVideoBox(sessionJSON, onEndedCallback) {
  document.querySelectorAll(".floating-video").forEach(el => el.remove());
  if (!sessionJSON.video) {
    if (typeof onEndedCallback === "function") onEndedCallback();
    return;
  }
  const videoBox = document.createElement('div');
  videoBox.className = "floating-video";

  const videoElement = document.createElement('video');
  videoElement.src = "videos/" + sessionJSON.video;
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

  // Play-Overlay wie gehabt:
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
    // Avatar nach Video anzeigen:
    videoBox.innerHTML = `<img class="avatar" src="images/${sessionJSON.avatar || 'luna'}.png" style="width:100%;height:100%;border-radius:50%;">`;
    // GANZ WICHTIG: Callback aufrufen, damit die Fragen angezeigt werden!
    if (typeof onEndedCallback === "function") {
      setTimeout(() => { onEndedCallback(); }, 400); // Kurze Pause fürs Avatar-Bild
    }
  });
  videoBox.appendChild(playBtn);

  document.body.appendChild(videoBox);

  // Falls KEIN Video da ist, sofort Callback (damit es weitergeht)
  // if (!sessionJSON.video && typeof onEndedCallback === "function") onEndedCallback();
}

// UNIVERSAL BUTTONS für beide Fragetypen
function renderUniversalAnswerButtons(q, onSelect) {
  const area = document.getElementById("sessionTextArea");
  // Entferne alte Buttons/Fragen/Feedbacks
  document.querySelectorAll('.quiz-choice-btn, .sequence-choice-btn, .quiz-question, .quiz-feedback, .sequence-example-row, .sequence-answer-row').forEach(el => el.remove());

  // 1. Fragetext (immer oben)
  if (q.question) {
    const questionDiv = document.createElement("div");
    questionDiv.className = "quiz-question";
    questionDiv.innerText = q.question;
    area.appendChild(questionDiv);
  }

  // === 2. QUIZ / Multiple Choice ===
  if (Array.isArray(q.choices)) {
    const btnBox = document.createElement("div");
    btnBox.className = "quiz-buttons";
    let solved = false;
    const feedbackDiv = document.createElement("div");
    feedbackDiv.className = "quiz-feedback";
    area.appendChild(feedbackDiv);

    q.choices.forEach((choice, idx) => {
      const btn = document.createElement("button");
      btn.className = "quiz-choice-btn";
      btn.innerText = choice;
      btn.onclick = function () {
        if (solved) return;
        btnBox.querySelectorAll("button").forEach(b => b.disabled = true);

        showCheckingOverlay();
        setTimeout(() => {
          hideCheckingOverlay();

          if (idx === q.correct) {
            solved = true;
            btn.classList.add("selected", "btn-correct");
            playSound(q.correctSound || "yay.mp3");
            runAnimations(q.correctAnimation || ["confetti-glow"]);
            if (q.avatar && q.avatarAnimationCorrect) playAvatarAnimation(q.avatar, q.avatarAnimationCorrect);
            feedbackDiv.innerText = q.feedbackCorrect || "Great job!";
            feedbackDiv.style.color = "#218c21";
            // Alle Buttons sperren
            btnBox.querySelectorAll("button").forEach(b => b.disabled = true);
            setTimeout(() => { onSelect(idx); }, 1100);
          } else {
            btn.classList.add("selected", "btn-wrong");
            playSound(q.wrongSound || "fail.mp3");
            runAnimations(q.wrongAnimation || ["shake"]);
            if (q.avatar && q.avatarAnimationWrong) playAvatarAnimation(q.avatar, q.avatarAnimationWrong);
            feedbackDiv.innerText = q.feedbackWrong || "Oops! Try again!";
            feedbackDiv.style.color = "#c82121";
            // Nach Feedback, nur diesen Button deaktiviert lassen, andere wieder aktiv
            setTimeout(() => {
              feedbackDiv.innerText = "";
              btnBox.querySelectorAll("button").forEach(b => {
                if (!b.classList.contains("selected")) b.disabled = false;
              });
            }, 1200);
          }
        }, 3000); // 3 Sekunden Check-Overlay
      };
      btnBox.appendChild(btn);
    });
    area.appendChild(btnBox);
    return; // ***WICHTIG: beende Funktion!***
  }

  // === 3. SEQUENCE / Reihenfolge (Farben) ===
  if (Array.isArray(q.colors) && Array.isArray(q.solution)) {
    // Beispielreihe (z.B. "blue-red-yellow") – falls vorhanden
    if (Array.isArray(q.example)) {
      const exampleBox = document.createElement("div");
      exampleBox.className = "sequence-example-row";
      exampleBox.style.display = "flex";
      exampleBox.style.justifyContent = "center";
      exampleBox.style.gap = "12px";
      exampleBox.style.margin = "12px 0 18px 0";
      q.example.forEach(color => {
        const dot = document.createElement("div");
        dot.style.width = "28px";
        dot.style.height = "28px";
        dot.style.borderRadius = "50%";
        dot.style.background = color;
        dot.style.border = "2.5px solid #fffbe6";
        dot.style.boxShadow = "0 2px 8px #ddd";
        exampleBox.appendChild(dot);
      });
      area.appendChild(exampleBox);
    }

    // Antwortreihe (leere Kreise)
    const answerRow = document.createElement("div");
    answerRow.className = "sequence-answer-row";
    answerRow.style.display = "flex";
    answerRow.style.justifyContent = "center";
    answerRow.style.gap = "14px";
    answerRow.style.marginBottom = "20px";
    let userSequence = [];
    for (let i = 0; i < q.solution.length; i++) {
      const emptyDot = document.createElement("div");
      emptyDot.className = "sequence-answer-dot";
      emptyDot.style.width = "36px";
      emptyDot.style.height = "36px";
      emptyDot.style.borderRadius = "50%";
      emptyDot.style.background = "#e3f2fd";
      emptyDot.style.border = "2.5px dashed #ffd54f";
      emptyDot.style.boxShadow = "0 2px 8px #ffd54faa";
      answerRow.appendChild(emptyDot);
    }
    area.appendChild(answerRow);

    // Buttons für Farben
    const btnBox = document.createElement("div");
    btnBox.className = "sequence-buttons";
    let solved = false;
    const feedbackDiv = document.createElement("div");
    feedbackDiv.className = "quiz-feedback";
    area.appendChild(feedbackDiv);

    q.colors.forEach((color, idx) => {
      const btn = document.createElement("button");
      btn.className = "sequence-choice-btn";
      btn.innerText = color;
      btn.style.background = color;
      btn.style.color = getContrastTextColor(color);
      btn.onclick = function () {
        if (solved) return;
        btn.disabled = true;
        btn.classList.add("selected");
        userSequence.push(idx);

        // Kreise füllen
        const filledDot = answerRow.children[userSequence.length - 1];
        if (filledDot) filledDot.style.background = color;

        if (userSequence.length === q.solution.length) {
          btnBox.querySelectorAll("button").forEach(b => b.disabled = true);
          showCheckingOverlay();
          setTimeout(() => {
            hideCheckingOverlay();
            const isCorrect = userSequence.every((val, i) => val === q.solution[i]);
            if (isCorrect) {
              solved = true;
              playSound(q.correctSound || "yay.mp3");
              runAnimations(q.correctAnimation || ["confetti-glow"]);
              if (q.avatar && q.avatarAnimationCorrect) playAvatarAnimation(q.avatar, q.avatarAnimationCorrect);
              feedbackDiv.innerText = q.feedbackCorrect || "Great job!";
              feedbackDiv.style.color = "#218c21";
              setTimeout(() => { onSelect(true); }, 1100);
            } else {
              playSound(q.wrongSound || "fail.mp3");
              runAnimations(q.wrongAnimation || ["shake"]);
              if (q.avatar && q.avatarAnimationWrong) playAvatarAnimation(q.avatar, q.avatarAnimationWrong);
              feedbackDiv.innerText = q.feedbackWrong || "Oops! Try again!";
              feedbackDiv.style.color = "#c82121";
              setTimeout(() => {
                userSequence = [];
                feedbackDiv.innerText = "";
                for (let i = 0; i < answerRow.children.length; i++) {
                  answerRow.children[i].style.background = "#e3f2fd";
                }
                btnBox.querySelectorAll("button").forEach(b => {
                  b.disabled = false;
                  b.classList.remove("selected");
                });
              }, 1200);
            }
          }, 3000);
        }
      };
      btnBox.appendChild(btn);
    });
    area.appendChild(btnBox);
    return; // ***WICHTIG: beende Funktion!***
  }
}



function lockAnswerButtons() {
  // Sperrt alle Buttons temporär
}
function unlockAnswerButtons() {
  // Entsperrt Buttons wieder
}
function playSound(soundFile) {
  // Sound abspielen (z.B. yay.mp3, fail.mp3)
  const audio = new Audio("audio/" + soundFile);
  audio.volume = 0.7;
  audio.play();
}
function runAnimations(anims) {
  // Für jede Animation im Array passende Funktion triggern (Konfetti, Shake, etc.)
  anims.forEach(anim => {
    if (anim === "confetti-glow") runAnimation_confettiGlow();
    if (anim === "emoji-party") runAnimation_emojiParty();
    if (anim === "sparkle") runAnimation_sparkle();
    if (anim === "shake") runAnimation_shake();
    // usw.
  });
}



function showCheckingOverlay() {
  // Entferne evtl. vorhandene Overlay
  document.querySelectorAll('.checking-overlay').forEach(e => e.remove());

  // Overlay bauen
  const overlay = document.createElement('div');
  overlay.className = 'checking-overlay';
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100vw';
  overlay.style.height = '100vh';
  overlay.style.background = 'rgba(255,255,255,0.85)';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.zIndex = '9999';

  // Rotierende Sanduhr (SVG)
  const spinner = document.createElement('div');
  spinner.innerHTML = `
    <svg width="56" height="56" viewBox="0 0 24 24" style="animation:spin 1.1s linear infinite;">
      <path fill="#ffc107" d="M6 2v2h1v3.18c0 1.08-.28 2.13-.81 3.04l-.38.67A8.017 8.017 0 0 0 6 16.82V20H5v2h14v-2h-1v-3.18c0-1.08.28-2.13.81-3.04l.38-.67A8.017 8.017 0 0 0 18 7.18V4h1V2zm2 2h8v3.18c0 1.97-.79 3.89-2.19 5.36l-.38.67c-1.38 1.84-2.19 4.07-2.19 6.44V20h-2v-2.35c0-2.37-.81-4.6-2.19-6.44l-.38-.67C8.79 9.07 8 7.15 8 5.18zm2 2c0 1.51.62 2.98 1.76 4.12l.24.23c1.14 1.14 1.76 2.61 1.76 4.12V20h-2v-3.18c0-1.97-.79-3.89-2.19-5.36l-.38-.67C10.79 9.07 10 7.15 10 5.18z"/>
    </svg>
  `;
  spinner.style.marginBottom = "18px";
  overlay.appendChild(spinner);

  // Text
  const text = document.createElement('div');
  text.innerText = 'Checking...';
  text.style.fontSize = '1.23rem';
  text.style.fontWeight = 'bold';
  text.style.color = '#444';
  text.style.marginTop = '7px';
  overlay.appendChild(text);

  document.body.appendChild(overlay);

  // WICHTIG: Keyframes für das Drehen einbauen (falls noch nicht vorhanden)
  if (!document.getElementById('spin-keyframes')) {
    const style = document.createElement('style');
    style.id = 'spin-keyframes';
    style.innerHTML = `
      @keyframes spin {
        0% { transform: rotate(0deg);}
        100% { transform: rotate(360deg);}
      }
    `;
    document.head.appendChild(style);
  }
}


function hideCheckingOverlay() {
  document.querySelectorAll('.checking-overlay').forEach(e => e.remove());
}



function hideCheckingOverlay() {
  document.querySelectorAll(".checking-overlay").forEach(e => e.remove());
}

function showRewardPopup(rewardIdx) {
  // Sticker/Puzzle/Emoji/Reward als Popup zeigen, speichern etc.
}


function finishUniversalSession(sessionJSON) {
  // Finales Reward, Fortschritt speichern, Eltern/Endscreen etc.
}


function stopAllSounds() {
  // Musik & Sounds stoppen
}
function clearMainUI() {
  // Hauptbereich komplett leeren
}

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}












// Musik & Sound
const welcomeMusic = document.getElementById("welcomeMusic");
if (welcomeMusic) {
  welcomeMusic.volume = 0.3;
}

const frogSound = document.getElementById("frogSound");
if (frogSound) frogSound.volume = 0.42;

const introMusic = new Audio("audio/counting-benny-bg.mp3");
introMusic.loop = true;
introMusic.volume = 0.18;


// dynamischer Fortschrittsbalken (Frosch)
const track = document.querySelector(".frog-bar-track");
track.innerHTML = "";
sessions.forEach(() => {
  const spot = document.createElement("div");
  spot.className = "frog-bar-spot";
  track.appendChild(spot);
});
const frog = document.createElement("img");
frog.src = "images/frog.png";
frog.id = "jumpingFrog";
track.appendChild(frog);


// Fortschrittsbalken (Frosch)
function renderFrogProgress(lastIdx, currentIdx) {
  const spots = document.querySelectorAll(".frog-bar-spot");
  const frog = document.getElementById("jumpingFrog");
  if (!spots || !spots.length || !frog) return;

  // bestehender Fortschritts-Code
  spots.forEach((el, i) => {
    el.classList.remove("active");
    if (i < currentIdx) el.classList.add("frog-bar-done");
    if (i === currentIdx) el.classList.add("active");
  });

  const active = spots[currentIdx];
  if (active) {
    frog.style.left = active.offsetLeft + "px";
    frog.style.animation = "frogHop 0.45s";
  }
}

// Welcome: Tap, Musik, Animation
function showWelcome(onFinish) {
  const welcomeArea = document.getElementById('welcomeArea');
  welcomeArea.innerHTML = '';

  // Tap-Hinweis
  const tapHint = document.createElement('div');
  tapHint.className = "welcome-tap-hint";
  tapHint.innerText = "Tap anywhere to start!";
  welcomeArea.appendChild(tapHint);

  // Tap Handler: Musik starten, Animation zeigen
  welcomeArea.onclick = function() {
    try { welcomeMusic.currentTime = 0; welcomeMusic.play(); } catch(e) {}
    tapHint.style.opacity = 0;
    setTimeout(() => {
      welcomeArea.removeChild(tapHint);
      startWelcomeAnimation();
    }, 350);
    welcomeArea.onclick = null;
  };

  // Welcome Animation (Dynamisch!)
  function startWelcomeAnimation() {
    const lines = [
      `🎉 Welcome to Coach Max – Day ${currentDay}!`,
      "Ready for a day full of fun and learning?",
      "Every tap brings you closer to today’s secret <span class='highlight-word'>sticker</span>!",
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
      welcomeMusic.pause();
      welcomeMusic.currentTime = 0;
      welcomeArea.style.opacity = 0;
      setTimeout(() => {
        welcomeArea.style.display = "none";
        document.getElementById("mainContent").style.display = "";
        onFinish();
      }, 900);
    }, 5200);
  }
}

// Alle Animationstypen mit Emojis/SVG:
const breathingAnimations = [
  { name: "balloon",    html: "🎈" },
  { name: "circle",     html: `<div style="width:60px;height:60px;background:#80d8ff;border-radius:50%;"></div>` },
  { name: "monkey",     html: "🐵💨" },
  { name: "flower",     html: "🌸" },
  { name: "star",       html: "⭐" },
  { name: "cloud",      html: "☁️" },
  { name: "smiley",     html: "😊" }
];

// Zufallsauswahl pro Session
function pickBreathAnimation(session) {
  if (session.animation) {
    const found = breathingAnimations.find(a => session.animation.toLowerCase().includes(a.name));
    if (found) return found.html;
  }
  return breathingAnimations[Math.floor(Math.random() * breathingAnimations.length)].html;
}

// Zeige und animiere im Rhythmus
function showBreathingAnimationRhythm(stepIdx, session, breathingSteps) {
  const animationDiv = document.getElementById("breath-animation");
  const typ = session.animation || "";

  if (typ.includes("balloon")) {
    let balloon = document.getElementById("breathing-balloon");
    if (!balloon) {
      animationDiv.innerHTML = `<div id="breathing-balloon" class="breath-balloon"></div>`;
      balloon = document.getElementById("breathing-balloon");
    }
    // Immer beide Klassen entfernen, um Reset zu garantieren!
    balloon.classList.remove("grow", "shrink");
    balloon.style.transform = ""; // Fallback: neutral

    const step = breathingSteps[stepIdx];

    // Jetzt exakt nach dem breath-Property gehen!
    if (step && step.breath === "in") {
      balloon.classList.add("grow");
    } else if (step && step.breath === "out") {
      balloon.classList.add("shrink");
    }
    // bei hold oder ohne breath bleibt neutral (scale 1)
    return;
  }

 
   // Smiley-Logik für drei Gesichter im Rhythmus
  if (typ.includes("smiley")) {
    const faces = ["😊", "😮", "😌"];
    content = faces[stepIdx % faces.length];
  }
  animationDiv.innerHTML = content;

  // Animations-Effekt (Kreis/Ballon/Wolke bläst auf…)
  animationDiv.className = "breath-animation"; // Reset
  if (["balloon", "circle", "cloud"].some(t => typ.includes(t))) {
    if (breathingSteps[stepIdx].line.match(/in/i)) animationDiv.classList.add("animate-grow");
    if (breathingSteps[stepIdx].line.match(/out/i)) animationDiv.classList.add("animate-shrink");
  }
  if (typ.includes("star")) animationDiv.classList.add("animate-flash");
}

// Animierter Text, Next erst am Schluss
function showAnimatedTexts(session, linesBox, onComplete) {
  let totalDelay = 0;
  session.text.forEach((t, i) => {
    let delay = totalDelay * 1000;
    textTimeouts.push(setTimeout(() => {
      while (linesBox.childNodes.length >= 4) {
        linesBox.removeChild(linesBox.firstChild);
      }
      const p = document.createElement('div');
      p.className = "animated-text";
      p.innerText = t.line;
      if (i === session.text.length - 1) p.classList.add('glitter');
      linesBox.appendChild(p);

      if (i === session.text.length - 1 && typeof onComplete === "function") {
        onComplete();
      }
    }, delay));
    totalDelay += t.duration;
  });
}

function clearTimeouts() {
  textTimeouts.forEach(t => clearTimeout(t));
  textTimeouts = [];
}



// Rotation Hinweis (Fortsetzung)
function handleOrientation() {
  const notice = document.getElementById("rotationNotice");
  const mainContent = document.getElementById("mainContent");
  const welcomeArea = document.getElementById('welcomeArea');
  const isPortrait = window.matchMedia("(orientation: portrait)").matches;
  const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  // Prüfen ob notice & mainContent überhaupt existieren!
  if (!notice || !mainContent) return;

  if (!mobile) {
    notice.style.display = "none";
    mainContent.style.display = "";
    return;
  }
  if (isPortrait) {
    notice.style.display = "none";
    mainContent.style.display = "";
  } else {
    notice.style.display = "flex";
    mainContent.style.display = "none";
  }
}

window.addEventListener("orientationchange", handleOrientation);
window.addEventListener("resize", handleOrientation);


function showAvatarInVideoBox(videoBox, avatarName, avatarClass = "avatar") {
  if (!videoBox) return;
  videoBox.innerHTML = "";
  const avatarImg = document.createElement('img');
  avatarImg.src = `images/${avatarName}.png`;
  avatarImg.alt = capitalize(avatarName);
  avatarImg.className = avatarClass;
  videoBox.appendChild(avatarImg);
}


function playSessionVideoIfNeeded(session, callback = () => {}, autoRemove = true) {
  if (!session.video) {
    callback();
    return;
  }

  const existing = document.querySelector(".floating-video");
  if (existing) existing.remove();

  const videoBox = document.createElement("div");
  videoBox.className = "floating-video";
  videoBox.style.position = "fixed";
  videoBox.style.bottom = "16px";
  videoBox.style.right = "16px";
  videoBox.style.zIndex = "50";
  videoBox.style.borderRadius = "16px";
  videoBox.style.overflow = "hidden";
  videoBox.style.boxShadow = "0 0 12px #0003";
  videoBox.style.backgroundColor = "#000";

  const video = document.createElement("video");
  video.src = "videos/" + session.video;
  video.autoplay = true;
  video.playsInline = true;
  video.controls = false;
  video.muted = false;
  video.style.width = "180px";
  video.style.height = "auto";
  video.style.display = "block";
  video.style.borderRadius = "16px";

  video.onended = () => {
    if (autoRemove) videoBox.remove();
    callback();
  };

  videoBox.appendChild(video);
  document.body.appendChild(videoBox);
}


// Session mit Video, Play-Overlay, animiertem Text und fixiertem Next-Button
function renderSession(idx) {
  const s = sessions[idx]; // <-- Das MUSS als allererstes kommen!
  renderFrogProgress(idx, idx, sessions.length);
  console.log("=== renderSession", idx, "TYPE:", s.type, s);
  window.renderedSession = s; // Damit du im Browser jederzeit nachsehen kannst
  console.log("Session-Objekt:", s);
  try { breathingMusic.pause(); breathingMusic.currentTime = 0; } catch(e) {}
  clearTimeouts();
  document.querySelectorAll(".floating-video, .fixed-next-btn, .centered-next-btn").forEach(el => el.remove());
  document.getElementById('sessionTextArea').innerHTML = "";

  
  const localDay = s.day || window.currentDay || 1;
  const textArea = document.getElementById('sessionTextArea');

  // ===== 1. INTRO =====
  if (s.type === "intro") {
    try { introMusic.currentTime = 0; introMusic.play(); } catch(e) {}
    renderFrogProgress(idx, idx, sessions.length);
    const heading = document.createElement('h2');
    heading.textContent = s.title || `Welcome to Day ${localDay}!`;
    heading.className = "intro-heading session-heading";
    textArea.appendChild(heading);

    // Avatare nebeneinander: Momo & Benny
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

    // Smileys
    const bottomBox = document.createElement('div');
    bottomBox.className = "intro-emojis";
    bottomBox.innerHTML = "🤩&nbsp;🎉&nbsp;⭐&nbsp;👏";
    textArea.appendChild(bottomBox);

    // Animierte Textzeilen-Container
    const linesBox = document.createElement('div');
    linesBox.className = "animated-lines";
    textArea.appendChild(linesBox);

    // Video (fixiert unten rechts)
    videoElement = document.createElement('video');
    videoElement.src = `videos/${s.video}`;
    videoElement.setAttribute("controls", "true");
    videoElement.setAttribute("controlsList", "nodownload");
    videoElement.autoplay = false;
    videoElement.muted = false;
    videoElement.playsInline = true;
    videoElement.poster = "images/video-placeholder.png";
    videoElement.style.display = "block";
    videoElement.className = "session-video";

    const videoBox = document.createElement('div');
    videoBox.className = "floating-video";
    videoBox.appendChild(videoElement);
    document.body.appendChild(videoBox);

    // Play-Overlay
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
      if (!linesBox.hasAnimated) {
        showAnimatedTexts(s, linesBox, showNextBtn);
        linesBox.hasAnimated = true;
      }
    });
    videoElement.addEventListener('pause', () => {
      playBtn.style.display = "";
      videoElement.style.pointerEvents = "none";
    });
    
	videoBox.appendChild(playBtn);

    linesBox.hasAnimated = false;

    // Text-Ausrichtung & Padding
    textArea.style.textAlign = "center";
    textArea.style.padding = "18px 6px 14px 6px";
    textArea.style.alignItems = "center";

    function showNextBtn() {
      const btn = document.createElement('button');
      btn.innerText = idx < sessions.length - 1 ? "Next" : "Finish";
      btn.className = "centered-next-btn";
      btn.onclick = () => {
        try { introMusic.pause(); introMusic.currentTime = 0; } catch(e) {}
        currentSession++;
        renderSession(currentSession);
      };
      document.body.appendChild(btn);
    }
    return; // WICHTIG!
  }


else if (s.type === "universal-session") {
  renderUniversalSession(s);
  return;
}

else if (s.type === "drawing") {
  clearTimeouts();
  if (window.currentMusic) {
    window.currentMusic.pause();
    window.currentMusic = null;
  }

  // Froschbalken dynamisch
  const track = document.querySelector(".frog-bar-track");
  track.innerHTML = "";
  sessions.forEach(() => {
    const spot = document.createElement("div");
    spot.className = "frog-bar-spot";
    track.appendChild(spot);
  });
  const frog = document.createElement("img");
  frog.src = "images/frog.png";
  frog.id = "jumpingFrog";
  track.appendChild(frog);

  renderFrogProgress(lastSessionIdx, idx);
  document.querySelectorAll(".floating-video, .centered-next-btn").forEach(el => el.remove());
  const textArea = document.getElementById("sessionTextArea");
  textArea.innerHTML = "";

  if (s.avatar) showAvatarInVideoBox(null, s.avatar);

  let music = null;
  if (s.music) {
    music = new Audio("audio/" + s.music);
    music.loop = true;
    music.volume = 0.2;
    window.currentMusic = music;
  }

  playSessionVideoIfNeeded(s, () => {
    if (music) music.play();

    const canvasBox = document.createElement("div");
    canvasBox.style.position = "relative";
    canvasBox.style.width = "300px";
    canvasBox.style.height = "300px";
    canvasBox.style.margin = "16px auto";
    canvasBox.style.border = "3px dashed #ffd54f";
    canvasBox.style.borderRadius = "18px";
    canvasBox.style.background = "#fffbe6";
    canvasBox.style.boxShadow = "0 2px 12px #81d4fa88";

    const canvas = document.createElement("canvas");
    canvas.width = 300;
    canvas.height = 300;
    canvas.style.position = "absolute";
    canvas.style.left = "0";
    canvas.style.top = "0";
    canvas.style.zIndex = "2";

    const bgImg = document.createElement("img");
    bgImg.src = s.canvasTemplate || "";
    bgImg.style.position = "absolute";
    bgImg.style.left = "0";
    bgImg.style.top = "0";
    bgImg.style.width = "100%";
    bgImg.style.height = "100%";
    bgImg.style.objectFit = "contain";
    bgImg.style.zIndex = "1";
    bgImg.style.opacity = "0.4";

    canvasBox.appendChild(bgImg);
    canvasBox.appendChild(canvas);
    textArea.appendChild(canvasBox);

    const ctx = canvas.getContext("2d");
    ctx.lineCap = "round";
    let currentColor = s.colorOptions?.[0] || "#ff4081";
    let brushSize = s.brushSizes?.[1] || 8;
    ctx.lineWidth = brushSize;
    ctx.strokeStyle = currentColor;

    const bg = new Image();
    bg.src = s.canvasTemplate || "";
    bg.onload = () => ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);

    let drawing = false;
    function getPos(e) {
      const rect = canvas.getBoundingClientRect();
      const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
      const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
      return { x, y };
    }

    canvas.addEventListener("mousedown", (e) => {
      drawing = true;
      const { x, y } = getPos(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
    });
    canvas.addEventListener("mousemove", (e) => {
      if (drawing) {
        const { x, y } = getPos(e);
        ctx.lineTo(x, y);
        ctx.stroke();
      }
    });
    canvas.addEventListener("mouseup", () => drawing = false);
    canvas.addEventListener("touchstart", (e) => {
      drawing = true;
      const { x, y } = getPos(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
    });
    canvas.addEventListener("touchmove", (e) => {
      e.preventDefault();
      if (drawing) {
        const { x, y } = getPos(e);
        ctx.lineTo(x, y);
        ctx.stroke();
      }
    }, { passive: false });
    canvas.addEventListener("touchend", () => drawing = false);

    const toolbar = document.createElement("div");
    toolbar.style.display = "flex";
    toolbar.style.flexDirection = "column";
    toolbar.style.alignItems = "center";
    toolbar.style.gap = "12px";
    toolbar.style.marginTop = "20px";
    textArea.appendChild(toolbar);

    function createBtn(label, onClick) {
      const btn = document.createElement("button");
      btn.innerText = label;
      btn.className = "centered-next-btn";
      btn.onclick = onClick;
      return btn;
    }

    toolbar.appendChild(createBtn("🔁 Reset Drawing", () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (bg.complete) ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);
    }));

    toolbar.appendChild(createBtn("📤 Save Drawing", () => {
      const merged = document.createElement("canvas");
      merged.width = canvas.width;
      merged.height = canvas.height;
      const mctx = merged.getContext("2d");
      const bkg = new Image();
      bkg.onload = () => {
        mctx.drawImage(bkg, 0, 0);
        mctx.drawImage(canvas, 0, 0);
        const url = merged.toDataURL();
        const link = document.createElement("a");
        link.href = url;
        link.download = "drawing.png";
        link.click();
      };
      bkg.src = s.canvasTemplate || "";
    }));

    toolbar.appendChild(createBtn("✅ Finish Drawing", () => {
      new Audio("audio/yay.mp3").play();
      if (music) {
        music.pause();
        music.currentTime = 0;
      }
      const merged = document.createElement("canvas");
      merged.width = canvas.width;
      merged.height = canvas.height;
      const mctx = merged.getContext("2d");
      const bkg = new Image();
      bkg.onload = () => {
        mctx.drawImage(bkg, 0, 0);
        mctx.drawImage(canvas, 0, 0);
        const url = merged.toDataURL("image/png");
        localStorage.setItem(`drawingDay${currentDay}`, url);

        const rewardColor = s.rewardConditions?.color || "#ff4081";
        const rewardBrush = s.rewardConditions?.brushSize || 8;
        const giveReward = (currentColor === rewardColor && brushSize === rewardBrush);

        showUniversalReward(
          "🎨",
          s.onFinish || "Beautiful drawing!",
          () => {
            currentSession++;
            renderSession(currentSession);
          },
          giveReward ? (s.successSticker || 0) : 0
        );
      };
      bkg.src = s.canvasTemplate || "";
    }));
  });
}





// === Memory Session ===
else if (s.type === "memory") {
  clearTimeouts();
  if (window.currentMusic) {
    window.currentMusic.pause();
    window.currentMusic = null;
  }

  const track = document.querySelector(".frog-bar-track");
  track.innerHTML = "";
  sessions.forEach(() => {
    const spot = document.createElement("div");
    spot.className = "frog-bar-spot";
    track.appendChild(spot);
  });
  const frog = document.createElement("img");
  frog.src = "images/frog.png";
  frog.id = "jumpingFrog";
  track.appendChild(frog);
  renderFrogProgress(lastSessionIdx, idx);

  const textArea = document.getElementById("sessionTextArea");
  textArea.innerHTML = "";

  let music = null;
  if (s.music) {
    music = new Audio("audio/" + s.music);
    music.loop = true;
    music.volume = 0.3;
    window.currentMusic = music;
  }

  if (s.avatar || s.video) showAvatarInVideoBox(s.video, s.avatar);

  if (music) music.play();

  const gridSize = (s.gridSize || "3x2").split("x");
  const rows = parseInt(gridSize[1]);
  const cols = parseInt(gridSize[0]);
  const totalCards = rows * cols;
  const cardBack = s.cardBack || "images/cards/cardBack-rounded.png";

  let pairs = s.memoryImages || [];
  if (pairs.length * 2 !== totalCards) {
    console.warn("Memory image count mismatch with grid size");
    pairs = pairs.slice(0, totalCards / 2);
  }

  const cards = pairs.concat(pairs);
  if (s.shuffle !== false) {
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
  }

  const grid = document.createElement("div");
  grid.style.display = "grid";
  grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  grid.style.gap = "12px";
  grid.style.margin = "32px auto";
  grid.style.maxWidth = "360px";

  textArea.appendChild(grid);

  let flipped = [];
  let matched = [];

  cards.forEach((imgPath, index) => {
    const wrapper = document.createElement("div");
    wrapper.style.position = "relative";
    wrapper.style.width = "100%";
    wrapper.style.aspectRatio = "1 / 1";
    wrapper.style.cursor = "pointer";

    const front = document.createElement("img");
    front.src = imgPath;
    front.style.width = "100%";
    front.style.height = "100%";
    front.style.objectFit = "contain";
    front.style.borderRadius = "12px";
    front.style.position = "absolute";
    front.style.top = "0";
    front.style.left = "0";
    front.style.zIndex = "2";
    front.style.opacity = "0";

    const back = document.createElement("img");
    back.src = cardBack;
    back.style.width = "100%";
    back.style.height = "100%";
    back.style.objectFit = "contain";
    back.style.borderRadius = "12px";
    back.style.position = "absolute";
    back.style.top = "0";
    back.style.left = "0";
    back.style.zIndex = "1";

    wrapper.appendChild(front);
    wrapper.appendChild(back);
    grid.appendChild(wrapper);

    wrapper.addEventListener("click", () => {
      if (flipped.length === 2 || matched.includes(index) || flipped.includes(index)) return;

      front.style.opacity = "1";
      flipped.push(index);

      if (flipped.length === 2) {
        const [i1, i2] = flipped;
        const same = cards[i1] === cards[i2];
        setTimeout(() => {
          if (same) {
            matched.push(i1, i2);
            new Audio("audio/success.wav").play();
            if (matched.length === cards.length) {
              if (music) {
                music.pause();
                music.currentTime = 0;
              }
              showUniversalReward(
                "🧠",
                s.onFinish || "Well done!",
                () => {
                  currentSession++;
                  renderSession(currentSession);
                },
                s.successSticker || 0
              );
            }
          } else {
            grid.children[i1].children[0].style.opacity = "0";
            grid.children[i2].children[0].style.opacity = "0";
          }
          flipped = [];
        }, 800);
      }
    });
  });
}



  // ==== Modul: STORY ====

 else if (s.type === "story") {
  // 0) Aufräumen & Fortschritt
  clearTimeouts();
  renderFrogProgress(lastSessionIdx, idx);
  document.querySelectorAll(".floating-video, .centered-next-btn").forEach(el => el.remove());
  const textArea = document.getElementById("sessionTextArea");
  textArea.innerHTML = "";

  // 1) Überschrift
  const heading = document.createElement('h2');
  heading.className = "session-heading";
  heading.textContent = s.title || "Story Time!";
  heading.style.textAlign = "center";
  textArea.appendChild(heading);

  // Container für den animierten Text
  const linesBox = document.createElement('div');
  linesBox.className = "animated-lines";
  textArea.appendChild(linesBox);

  // Funktion: Story-Text Zeile für Zeile
  function showStoryTextLines() {
    if (!Array.isArray(s.story)) return;
    let i = 0;
    (function nextLine() {
      if (i < s.story.length) {
        const p = document.createElement('div');
        p.className = "animated-text";
        p.style.textAlign = "center";
        p.innerText = s.story[i++];
        linesBox.appendChild(p);
        setTimeout(nextLine, 2300);
      } else {
        showImagesAndNext();
      }
    })();
  }

  // Funktion: Bilder & Next-Button am Ende
  function showImagesAndNext() {
    if (Array.isArray(s.images)) {
      const imgBox = document.createElement('div');
      imgBox.style.display = "flex";
      imgBox.style.justifyContent = "center";
      imgBox.style.gap = "22px";
      imgBox.style.marginTop = "18px";
      s.images.forEach(src => {
        const img = document.createElement('img');
        img.src = src;
        img.style.width = "120px";
        img.style.height = "120px";
        img.style.objectFit = "cover";
        img.style.borderRadius = "18px";
        img.style.boxShadow = "0 4px 18px #ffd54faa";
        imgBox.appendChild(img);
      });
      textArea.appendChild(imgBox);
    }
    setTimeout(() => {
      const btn = document.createElement('button');
      btn.innerText = idx < sessions.length - 1 ? "Next" : "See your Reward";
      btn.className = "centered-next-btn";
      btn.onclick = () => {
      showUniversalReward(
      "images/stickers/star.png",       // Bild, optional
      s.onFinish || "Great job!",       // Text, optional
      () => {                           // Callback nach Reward
      if (idx >= sessions.length - 1) {
        localStorage.setItem(`day${localDay}Completed`, "1");
        window.location.href = "choose.html";
      } else {
        currentSession++;
        renderSession(currentSession);
      }
    }
  );
};

      document.body.appendChild(btn);
    }, 1200);
  }

  // 2) Video + Tap-to-Play Overlay (optional)
  if (s.video) {
    const video = document.createElement('video');
    video.src = `videos/${s.video}`;
    video.setAttribute("controls", "true");
    video.setAttribute("controlsList", "nodownload");
    video.autoplay = false;
    video.muted = false;
    video.playsInline = true;
    video.poster = "images/video-placeholder.png";
    video.className = "session-video";

    const videoBox = document.createElement("div");
    videoBox.className = "floating-video";
    videoBox.appendChild(video);

    const playBtn = document.createElement('button');
    playBtn.className = "custom-play-btn";
    playBtn.title = "Play";
    playBtn.innerHTML = `
      <svg viewBox="0 0 60 60">
        <circle cx="30" cy="30" r="28" fill="none"/>
        <polygon points="22,16 46,30 22,44" fill="#383838"/>
      </svg>
    `;
    videoBox.appendChild(playBtn);
    document.body.appendChild(videoBox);

    playBtn.addEventListener('click', () => {
      video.play();
      playBtn.style.display = "none";
      video.style.pointerEvents = "auto";
      showStoryTextLines();
    });
    video.addEventListener('play', () => {
      playBtn.style.display = "none";
      video.style.pointerEvents = "auto";
    });
    video.addEventListener('pause', () => {
      playBtn.style.display = "";
      video.style.pointerEvents = "none";
    });
    video.addEventListener('ended', () => {
      showAvatarInVideoBox(videoBox, "luna");
    });

  } else {
    // kein Video – direkt den Text anzeigen
    showStoryTextLines();
  }

  return;
}


}


// === Pause and resume music on tab switch ===
let resumeMusicOnReturn = false;
document.addEventListener("visibilitychange", () => {
  if (document.hidden && window.currentMusic && !window.currentMusic.paused) {
    window.currentMusic.pause();
    resumeMusicOnReturn = true;
  } else if (!document.hidden && resumeMusicOnReturn && window.currentMusic) {
    window.currentMusic.play();
    resumeMusicOnReturn = false;
  }
});

// === Fensterladen: Setup alles ===
window.onload = function() {
  
};




// Hilfsfunktion am Ende deiner Datei (oder im Kopf)
function finishDay() {
  clearTimeouts();
  document.querySelectorAll(".floating-video, .fixed-next-btn").forEach(el => el.remove());
  document.getElementById('sessionTextArea').innerHTML =
    `<div class="animated-text glitter" style="font-size:1.8rem;">Congratulations! You finished today’s adventure! 🥳</div>`;
}



window.onload = async () => {
  document.getElementById('mainContent').style.display = '';
  try {
    console.log("Lade JSON von", jsonURL);
    const res = await fetch(jsonURL);
    if (!res.ok) throw new Error("Fehler beim Laden des JSON: " + res.statusText);
    const data = await res.json();
    sessions = data.sessions;
    console.log("Sessions geladen:", sessions);
	currentDay = data.day || 1;
	
	 // ======= HIER DEN TITEL SETZEN! =======
    document.title = `Coach Max – Day ${currentDay}`;
    // ======================================

    currentSession = DEV_MODE ? DEV_START_SESSION : 0;

    if (DEV_MODE) {
      document.getElementById("welcomeArea").style.display = "none";
      document.getElementById("mainContent").style.display = "";
      renderSession(currentSession);
      handleOrientation();
    } else {
      showWelcome(() => {
        renderSession(currentSession);
        handleOrientation();
      });
    }
  } catch (e) {
    console.error("Fehler beim Initialisieren:", e);
    document.body.innerHTML = `<div style="color:red;font-size:1.4em;">Fehler beim Initialisieren:<br>${e.message}</div>`;
  }
};

const stickerImages = [
  "images/stickers/star.png",
  "images/stickers/party.png",
  "images/stickers/butterfly.png",
  "images/stickers/trophy.png",
  "images/stickers/medal.png"
];
// Lies die freigeschalteten Sticker aus dem LocalStorage
const unlocked = JSON.parse(localStorage.getItem('unlockedStickers') || "[]");

// Sticker-Board-Element holen

const board = document.getElementById('stickerBoard');
if (board) {
  stickerImages.forEach((src, idx) => {
    const card = document.createElement('div');
    card.className = "sticker-card" + (unlocked.includes(idx) ? "" : " locked");
    card.innerHTML = `<img src="${src}" alt="Sticker">`;
    board.appendChild(card);
  });
}


// Alle Sticker anzeigen (bunt wenn freigeschaltet, grau wenn nicht)
function unlockSticker(idx) {
  let unlocked = JSON.parse(localStorage.getItem('unlockedStickers') || "[]");
  if (!unlocked.includes(idx)) {
    unlocked.push(idx);
    localStorage.setItem('unlockedStickers', JSON.stringify(unlocked));
  }
 }
 
 // Puzzle-Teile freischalten & speichern
function unlockPuzzlePiece(puzzleId, pieceIdx) {
  // puzzleId: Zahl/String (z.B. "1" für Woche 1)
  // pieceIdx: Index des Teilchens (0-basiert)
  const key = `puzzle${puzzleId}Pieces`;
  let unlocked = JSON.parse(localStorage.getItem(key) || "[]");
  if (!unlocked.includes(pieceIdx)) {
    unlocked.push(pieceIdx);
    localStorage.setItem(key, JSON.stringify(unlocked));
  }
}

 
// Anzahl der verfügbaren Tage
const TOTAL_DAYS = 100;

// Erstelle automatisch ein Array [{nr:1,title:"Day 1"}, …, {nr:100,title:"Day 100"}]
const days = Array.from(
  { length: TOTAL_DAYS },
  (_, i) => ({ nr: i + 1, title: `Day ${i + 1}` })
);

function formatUnlockTime(ts) {
  const d = new Date(ts);
  // Format: 06:00
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function canStartDay(dayNr) {
  const unlock = localStorage.getItem("day" + dayNr + "UnlockTime");
  if (!unlock) return true; // Noch nie gesperrt → Start erlauben
  return Date.now() > parseInt(unlock);
}

function renderDayList() {
  const list = document.getElementById('dayList');
  list.innerHTML = '';
  days.forEach(day => {
    const unlockTime = localStorage.getItem("day" + day.nr + "UnlockTime");
    const unlocked = canStartDay(day.nr);

    const div = document.createElement('div');
    div.className = 'choose-day-row';

    if (unlocked) {
      div.innerHTML = `<span>✅ ${day.title}</span>
        <button onclick="startDay(${day.nr})">Start</button>`;
    } else {
      div.innerHTML = `<span>🕒 ${day.title}</span>
        <span style="color:#888;font-size:0.92em;margin-left:7px;">Gesperrt bis ${formatUnlockTime(unlockTime)} Uhr</span>`;
    }
    list.appendChild(div);
  });
}

function startDay(dayNr) {
  if (!canStartDay(dayNr)) {
    alert("This day is only available from 6:00 am!");
    return;
  }
 // Weiterleitung zum entsprechenden Tag (z.B. day1.html, day2.html, ...)
window.location.href = `day.html?day=${dayNr}`;
}

