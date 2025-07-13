/* jshint esversion: 6 */

const DEV_MODE = true;    // Auf true setzen für Entwicklung, auf false für Produktion
let DEV_START_SESSION = 2; // 0 = Intro, 1 = Breathing, 2 = Counting, usw.



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
    btn.innerText = typeof currentSession !== "undefined" && sessions && currentSession < sessions.length - 1 ? "Next" : "Finish";
    btn.className = "centered-next-btn";
    btn.style.marginTop = "20px";
    btn.onclick = () => {
      document.querySelectorAll(".animals-reward-container, .centered-next-btn").forEach(e => e.remove());
      if (typeof nextAction === "function") {
        nextAction();
      } else {
        currentSession++;
        renderSession(currentSession);
      }
    };
    reward.insertAdjacentElement('afterend', btn);
  }, 800);
}

/**
 * Universeller Reward-Aufruf – übernimmt ALLE Sticker, Puzzle, Pokal, Zertifikat, usw.
 * Ruft am Ende jeder Session einfach auf: showUniversalRewardFromSession(s);
 * s = aktuelles Session-Objekt aus deinem sessions-Array.
 */

function showUniversalRewardFromSession(sessionObj, nextAction) {
  if (!sessionObj) return;

  // Kein Reward vorgesehen? Dann direkt nächste Session
  if (
    !("rewardType" in sessionObj) &&
    typeof sessionObj.successSticker === "undefined" &&
    typeof sessionObj.successPuzzle === "undefined" &&
    typeof sessionObj.specialReward === "undefined"
  ) {
    if (typeof nextAction === "function") nextAction();
    else {
      currentSession++;
      renderSession(currentSession);
    }
    return;
  }

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
    // weitere Typen nach Bedarf ergänzen!
  };

  let imgSrc = rewardImgMap[rewardType] || rewardImgMap["star"];

  // Puzzle-Teil(er) abfragen
  if (rewardType === "puzzle" && typeof sessionObj.puzzleId !== "undefined" && typeof sessionObj.successPuzzle !== "undefined") {
    const pieces = Array.isArray(sessionObj.successPuzzle) ? sessionObj.successPuzzle : [sessionObj.successPuzzle];
    // Optional: Mehrere Puzzle-Teile nebeneinander/Animation anzeigen
    imgSrc = `images/puzzles/puzzle${sessionObj.puzzleId}_piece${pieces[0]}.png`;
    // TODO: Weitere Puzzle-Teile als Animation anzeigen (wenn nötig)
  }

  // Eigener Bildpfad aus JSON überschreibt alles
  if (sessionObj.rewardImg) imgSrc = sessionObj.rewardImg;

  // Animation/Sound für besondere Rewards
  let rewardAnim = sessionObj.rewardAnimation || 
    (rewardType === "party-sticker" ? "emoji-party"
    : rewardType === "puzzle" ? "confetti-glow"
    : rewardType === "trophy" ? "confetti-glow"
    : "bounce");

  let rewardSound = sessionObj.rewardSound ||
    (rewardType === "party-sticker" || rewardType === "trophy" ? "applause.mp3"
    : "yay.mp3");

  // Text für das Popup
  let rewardText = sessionObj.onCorrect
    || (rewardType === "star" ? "Super gemacht!" 
    : rewardType === "trophy" ? "Wow! Pokal freigeschaltet!"
    : rewardType === "party-sticker" ? "Partysticker gesammelt!"
    : rewardType === "medal" ? "Du hast eine Medaille verdient!"
    : rewardType === "puzzle" ? "Ein neues Puzzleteil!" 
    : "Great job!");

  // Zeige das universelle Reward-Popup
  showUniversalReward(
    imgSrc,
    rewardText,
    nextAction || null,
    sessionObj.successSticker || 0,
    rewardType,
    rewardAnim,
    rewardSound
  );
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


function renderSessionHeader(title) {
  let titleEl = document.getElementById("mainTitle");
  if (!titleEl) {
    titleEl = document.createElement("h2");
    titleEl.id = "mainTitle";
    titleEl.className = "session-heading";
    document.getElementById("mainContent").prepend(titleEl); // Passe ggf. das Container-Target an
  }
  titleEl.innerText = title;
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





function renderVideoAvatarFromJSON(task, trigger) {
  const box = document.getElementById("videoAvatarBox");
  if (!box || !task) return;

  // Prüfen ob Video angezeigt werden soll (z.B. nur beim ersten Anzeigen)
  if (task.video && (!trigger || trigger === "show" || trigger === "always")) {
    // Video einfügen
    box.innerHTML = `
      <video id="coachSessionVideo" width="100%" height="100%" autoplay>
        <source src="videos/${task.video}" type="video/mp4">
      </video>
    `;
    // Nach Video-Ende: Avatar-PNG + ggf. Animation
    const vid = document.getElementById("coachSessionVideo");
    vid.onended = function() {
      // Avatar anzeigen
      box.innerHTML = `<img id="coachAvatar" src="images/${task.avatar}.png" style="width:100%; border-radius:50%;">`;
      // Avatar-Animation sofort nach Video, falls so gewünscht
      if (task.avatarAnimation && (task.avatarAnimationTrigger === "afterVideo" || !task.avatarAnimationTrigger)) {
        playAvatarAnimation(task.avatar, task.avatarAnimation);
      }
    };
  } else {
    // Kein Video – sofort Avatar-PNG anzeigen
    box.innerHTML = `<img id="coachAvatar" src="images/${task.avatar}.png" style="width:100%; border-radius:50%;">`;
    // Avatar-Animation je nach Trigger auslösen
    if (task.avatarAnimation && (!task.avatarAnimationTrigger || task.avatarAnimationTrigger === trigger)) {
      playAvatarAnimation(task.avatar, task.avatarAnimation);
    }
  }
}



// Die Animationen-Funktion bleibt wie gehabt:
function playAvatarAnimation(avatar, animType) {
  const img = document.getElementById("coachAvatar");
  if (!img) return;
  img.src = `images/${avatar}.png`;
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

// --- Universal Renderer Entry ---
async function renderUniversalSession(sessionJSON) {
  stopAllSounds();
  clearMainUI();

  // Aufgaben holen
  const questions = sessionJSON.questions || sessionJSON.tasks || [];

  // Video unten rechts
  renderUniversalVideoBox(sessionJSON);

  // Musik
  let music = null;
  if (sessionJSON.music) {
    music = new Audio("audio/" + sessionJSON.music);
    music.loop = true;
    music.volume = 0.22;
    music.play();
    window.addEventListener("beforeunload", () => { music.pause(); });
    window.addEventListener("blur", () => { music.pause(); });
    window.addEventListener("focus", () => { if (music) music.play(); });
  }

  // Überschrift, Frosch-Balken
  renderSessionHeader(sessionJSON.title || "");
  renderFrogProgress(0, 0, questions.length);

  function showQuestion(idx) {
    const q = questions[idx];
    clearQuestionUI();
    renderFrogProgress(idx, idx, questions.length);

    renderAvatarBox(q.avatar, q.avatarAnimation, "always");
    renderQuestionText(q);

    // *** UNIVERSAL-LOGIK ***
    renderUniversalAnswerButtons(q, (result) => {
      // Für Quiz: result = index (number)
      // Für Reihenfolge: result = true/false (boolean)
      let isCorrect;
      if (Array.isArray(q.choices)) {
        isCorrect = result === q.correct;
      } else if (Array.isArray(q.colors)) {
        isCorrect = result;
      } else {
        isCorrect = false;
      }

      lockAnswerButtons();

      // Sound, Animation, Feedback, wie gehabt:
      const sound = isCorrect
        ? q.correctSound || randomFrom(soundPool.correct)
        : q.wrongSound   || randomFrom(soundPool.wrong);
      playSound(sound);

      const anims = isCorrect
        ? (q.correctAnimation || [randomFrom(animationPool.correct)])
        : (q.wrongAnimation   || [randomFrom(animationPool.wrong)]);
      runAnimations(anims);

      if (q.avatar && q.avatarAnimation && (!q.avatarAnimationTrigger || q.avatarAnimationTrigger === (isCorrect ? "correct" : "wrong"))) {
        playAvatarAnimation(q.avatar, q.avatarAnimation);
      }
      renderFeedbackText(isCorrect, q);
      showCheckingOverlay();

      setTimeout(() => {
        hideCheckingOverlay();
        if (isCorrect) {
          if (q.reward !== undefined) showRewardPopup(q.reward);
          setTimeout(() => {
            if (idx + 1 < questions.length) {
              showQuestion(idx + 1);
            } else {
              finishUniversalSession(sessionJSON);
            }
          }, 1400);
        } else {
          unlockAnswerButtons();
        }
      }, 1200);
    });
    // *** ENDE UNIVERSAL-LOGIK ***
  }

  if (questions.length > 0) showQuestion(0);
  window.addEventListener("beforeunload", stopAllSounds);
}


// Universelles Video-Box-Rendering (nur 1x pro Session)
function renderUniversalVideoBox(sessionJSON) {
  // Video entfernen, falls schon da
  document.querySelectorAll(".floating-video").forEach(el => el.remove());

  if (!sessionJSON.video) return;

  const videoBox = document.createElement('div');
  videoBox.className = "floating-video";
  videoBox.style.position = "fixed";
  videoBox.style.right = "24px";
  videoBox.style.bottom = "22px";
  videoBox.style.zIndex = "1200";
  videoBox.style.width = "220px";
  videoBox.style.height = "220px";
  videoBox.style.borderRadius = "50%";
  videoBox.style.overflow = "hidden";
  videoBox.style.background = "#fff";
  videoBox.style.boxShadow = "0 6px 32px #4442, 0 2px 8px #0001";

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
  playBtn.style.position = "absolute";
  playBtn.style.left = "50%";
  playBtn.style.top = "50%";
  playBtn.style.transform = "translate(-50%,-50%)";
  playBtn.style.zIndex = "2";
  playBtn.style.background = "rgba(255,255,255,0.85)";
  playBtn.style.border = "none";
  playBtn.style.borderRadius = "50%";
  playBtn.style.padding = "18px";
  playBtn.style.cursor = "pointer";
  playBtn.style.boxShadow = "0 2px 8px #0001";
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
    playBtn.style.display = "";
    videoElement.style.pointerEvents = "none";
  });
  videoBox.appendChild(playBtn);

  // Einhängen in Body
  document.body.appendChild(videoBox);
}

// === Hilfsfunktionen – ALLES modular für Kinder-UX ===

function renderSessionHeader(title) {
  // Kindgerechte Überschrift
  document.getElementById("mainTitle").innerText = title;
}

function renderAvatarBox(avatar, anim, trigger) {
  // Zeigt Floating-Avatar-Bild oder -Animation, triggert Lottie/Animation falls angegeben
  // ...
}
function renderQuestionText(q) {
  // Frage-Text, Bild, Audio oder Video anzeigen
  // ...
}
function renderUniversalAnswerButtons(q, onSelect) {
  const area = document.getElementById("sessionTextArea");
  
  // Quiz/Multiple Choice
  if (Array.isArray(q.choices)) {
    const btns = [];
    q.choices.forEach((choice, idx) => {
      const btn = document.createElement("button");
      btn.className = "quiz-choice-btn";
      btn.innerText = choice;
      btn.onclick = () => onSelect(idx);
      area.appendChild(btn);
      btns.push(btn);
    });
    return;
  }

  // Reihenfolge/Sequenz (z.B. Farben)
  if (Array.isArray(q.colors) && Array.isArray(q.solution)) {
    let userSequence = [];
    const btns = [];
    q.colors.forEach((color, idx) => {
      const btn = document.createElement("button");
      btn.className = "sequence-choice-btn";
      btn.innerText = color;
      btn.onclick = () => {
        if (btn.disabled) return;
        btn.disabled = true;
        btn.classList.add("selected");
        userSequence.push(idx);
        if (userSequence.length === q.solution.length) {
          // Wenn fertig: vergleichen!
          const correct = userSequence.every((val, i) => val === q.solution[i]);
          onSelect(correct); // Übergibt true/false!
        }
      };
      area.appendChild(btn);
      btns.push(btn);
    });
    return;
  }

  // Kann beliebig erweitert werden…
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

function renderFeedbackText(isCorrect, q) {
  // Feedback-Text (z.B. "Super gemacht!", "Oops, nochmal probieren!")
}
function showCheckingOverlay() {
  // Spinner/Kreise mit "Checking..." für 2–3 Sek. anzeigen
}
function hideCheckingOverlay() {
  // Checking-Overlay ausblenden
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
function clearQuestionUI() {
  // Frage-Bereich leeren
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

// Fortschrittsbalken (Frosch)
function renderFrogProgress(fromIdx, toIdx, total) {
  const bar = document.getElementById("progressFrogBar");
  bar.innerHTML = "";
  const barTrack = document.createElement("div");
  barTrack.className = "frog-bar-track";
  bar.appendChild(barTrack);
  const spots = [];
  for (let i = 0; i < total; i++) {
    spots[i] = document.createElement("div");
    spots[i].className = "frog-bar-spot" + (i < toIdx ? " frog-bar-done" : "") + (i === toIdx ? " active" : "");
    barTrack.appendChild(spots[i]);
  }
  // Frosch-Bild
  const frog = document.createElement("img");
  frog.src = "images/frog.png";
  frog.alt = "Frog";
  frog.id = "jumpingFrog";
  barTrack.appendChild(frog);

  // Frosch-Startposition auf fromIdx
  const startSpot = spots[fromIdx] || spots[0];
  const endSpot = spots[toIdx] || spots[0];
  frog.style.position = "absolute";
  frog.style.transition = "none";
  frog.style.left = startSpot.offsetLeft + (startSpot.offsetWidth - frog.offsetWidth) / 2 + "px";

  setTimeout(() => {
    frog.style.transition = "left 0.5s cubic-bezier(.39,1.35,.51,1.01)";
    frog.style.left = endSpot.offsetLeft + (endSpot.offsetWidth - frog.offsetWidth) / 2 + "px";
    frog.style.animation = "frogHop 0.45s";
    frog.addEventListener("animationend", () => { frog.style.animation = ""; }, { once: true });
    frogSound.currentTime = 0;
    frogSound.play();
  }, 30);
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






// Session mit Video, Play-Overlay, animiertem Text und fixiertem Next-Button
function renderSession(idx) {
  const s = sessions[idx]; // <-- Das MUSS als allererstes kommen!
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
    videoElement.addEventListener('ended', () => {
  playBtn.style.display = "";
  videoElement.style.pointerEvents = "none";
  // Avatar nach Video anzeigen:
  const avatarName = s.avatar || "luna"; // fallback auf Luna
  showAvatarInVideoBox(videoBox, avatarName, "avatar");
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

