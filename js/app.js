/* jshint esversion: 6 */

const DEV_MODE = true;    // Auf true setzen für Entwicklung, auf false für Produktion
let DEV_START_SESSION = 6; // 0 = Intro, 1 = Breathing, 2 = Counting, usw.



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
  // Prüfe, ob überhaupt eine Belohnung vorgesehen ist:
  if (!("rewardType" in sessionObj) && typeof sessionObj.successSticker === "undefined" && typeof sessionObj.successPuzzle === "undefined") {
    // Kein Reward definiert – direkt nächste Session (mit optionalem Callback)
    if (typeof nextAction === "function") nextAction();
    else {
      currentSession++;
      renderSession(currentSession);
    }
    return;
  }

  // Art des Rewards bestimmen
  let rewardType = sessionObj.rewardType || (typeof sessionObj.successPuzzle !== "undefined" ? "puzzle" : "star");
  let imgSrc = "";
  if (rewardType === "star") imgSrc = "images/stickers/star.png";
  if (rewardType === "trophy") imgSrc = "images/trophy.png";
  if (rewardType === "certificate") imgSrc = "images/certificate.png";
  if (rewardType === "puzzle" && typeof sessionObj.puzzleId !== "undefined" && typeof sessionObj.successPuzzle !== "undefined") {
    // Puzzle-Image zusammensetzen:
    const pieceIdx = Array.isArray(sessionObj.successPuzzle) ? sessionObj.successPuzzle[0] : sessionObj.successPuzzle;
    imgSrc = `images/puzzles/puzzle${sessionObj.puzzleId}_piece${pieceIdx}.png`;
  }
  // Optional: eigenen Bildpfad aus JSON nutzen
  if (sessionObj.rewardImg) imgSrc = sessionObj.rewardImg;

  showUniversalReward(
    imgSrc,
    sessionObj.onCorrect || "Great job!",
    nextAction || null,
    sessionObj.successSticker || 0,
    rewardType
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




function playSessionVideoIfNeeded(s, afterVideoCallback) {
  document.querySelectorAll(".floating-video").forEach(el => el.remove());
  if (s.video) {
    const video = document.createElement("video");
    video.src = `videos/${s.video}`;
    video.setAttribute("controls", "true");
    video.setAttribute("controlsList", "nodownload");
    video.autoplay = false;
    video.muted = false;
    video.playsInline = true;
    video.className = "session-video";
    const videoBox = document.createElement("div");
    videoBox.className = "floating-video";
    videoBox.appendChild(video);

    const playBtn = document.createElement("button");
    playBtn.className = "custom-play-btn";
    playBtn.innerHTML = `
      <svg viewBox="0 0 60 60">
        <circle cx="30" cy="30" r="28" fill="none"/>
        <polygon points="22,16 46,30 22,44" fill="#383838"/>
      </svg>
    `;
    videoBox.appendChild(playBtn);

    playBtn.onclick = () => { video.play(); playBtn.style.display = "none"; };
    video.addEventListener('play', () => playBtn.style.display = "none");
    video.addEventListener('ended', () => {
      setTimeout(() => {
        videoBox.remove();
        afterVideoCallback();
      }, 300);
    });

    document.body.appendChild(videoBox);
  } else {
    afterVideoCallback();
  }
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
function renderFrogProgress(fromIdx, toIdx) {
  const total = sessions.length;
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
  renderFrogProgress(lastSessionIdx, idx);
  document.querySelectorAll(".floating-video, .fixed-next-btn, .centered-next-btn").forEach(el => el.remove());
  document.getElementById('sessionTextArea').innerHTML = "";

  
  const localDay = s.day || window.currentDay || 1;
  const textArea = document.getElementById('sessionTextArea');

  // ===== 1. INTRO =====
  if (s.type === "intro") {
    try { introMusic.currentTime = 0; introMusic.play(); } catch(e) {}

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

  // ===== 2. BREATHING =====
   else if (s.type === "breathing") {
    try { 
      breathingMusic.currentTime = 0; 
      breathingMusic.play(); 
    } catch(e) {}

    const heading = document.createElement('h2');
    heading.className = "session-heading";
    heading.textContent = `Day ${localDay} Breathing`;
    textArea.appendChild(heading);

    const momoImg = document.createElement('img');
    momoImg.src = "images/meditationmomo.jpg";
    momoImg.alt = "Momo";
    momoImg.className = "intro-avatar-small";
    textArea.appendChild(momoImg);

    const breathAnim = document.createElement('div');
    breathAnim.id = "breath-animation";
    breathAnim.className = "breath-animation";
    textArea.appendChild(breathAnim);

    const linesBox = document.createElement('div');
    linesBox.className = "animated-lines";
    textArea.appendChild(linesBox);

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
  playBtn.style.display = "";
  videoElement.style.pointerEvents = "none";
  // Avatar nach Video anzeigen:
  const avatarName = s.avatar || "luna"; // oder Default
  showAvatarInVideoBox(videoBox, avatarName, "avatar");
});
    videoBox.appendChild(playBtn);

    let breathingStarted = false;
    function startBreathingSteps() {
      if (breathingStarted) return;
      breathingStarted = true;
      let idxStep = 0;
      function nextBreathStep() {
        if (idxStep < s.text.length) {
          showBreathingAnimationRhythm(idxStep, s, s.text);
          while (linesBox.childNodes.length >= 4) {
            linesBox.removeChild(linesBox.firstChild);
          }
          const p = document.createElement('div');
          p.className = "animated-text";
          p.innerText = s.text[idxStep].line;
          linesBox.appendChild(p);

          setTimeout(() => {
            idxStep++;
            nextBreathStep();
          }, s.text[idxStep].duration * 1000);
        } else {
          showNextBtn();
        }
      }
      nextBreathStep();
    }

    function showNextBtn() {
      try { breathingMusic.pause(); breathingMusic.currentTime = 0; } catch(e) {}
      const btn = document.createElement('button');
btn.innerText = idx < sessions.length - 1 ? "Next" : "Finish";
btn.className = "centered-next-btn";
btn.onclick = () => {
  lastSessionIdx = idx;
  currentSession++;
  renderSession(currentSession);
};
document.body.appendChild(btn);

    }
    return; // WICHTIG!
  }

  // ===== 3. COUNTING =====
  else if (s.type === "countingold") {
  clearTimeouts();
  const textArea = document.getElementById('sessionTextArea');
  textArea.innerHTML = "";

  // --- BACKGROUND MUSIC (optional from JSON) ---
  let countingMusic = null;
  if (s.music) {
    countingMusic = new Audio("audio/" + s.music);
    countingMusic.loop = true;
    countingMusic.volume = 0.18;
    countingMusic.play();
  }

  // --- Heading ---
  const heading = document.createElement('h2');
  heading.className = "session-heading";
  heading.textContent = s.title || "Counting Time!";
  textArea.appendChild(heading);
  textArea.style.textAlign = "center";

  // --- Animated lines (if provided) ---
  const linesBox = document.createElement('div');
  linesBox.className = "animated-lines";
  linesBox.style.alignItems = "center";
  textArea.appendChild(linesBox);

  if (Array.isArray(s.text)) {
    s.text.forEach((line, idx) => {
      setTimeout(() => {
        const p = document.createElement('div');
        p.className = "animated-text";
        p.style.textAlign = "center";
        p.innerText = line.line || line;
        linesBox.appendChild(p);
      }, idx * 900);
    });
  }

  let videoBox, video;

  // --- VIDEO (optional, animals-style: floating bottom right) ---
  if (s.video) {
    videoElement = document.createElement('video');
    videoElement.src = `videos/${s.video}`;
    videoElement.setAttribute("controls", "true");
    videoElement.setAttribute("controlsList", "nodownload");
    videoElement.autoplay = false;
    videoElement.muted = false;
    videoElement.playsInline = true;
    videoElement.poster = "images/video-placeholder.png";
    videoElement.className = "session-video";

    videoBox = document.createElement('div');
    videoBox.className = "floating-video";
    videoBox.style.position = "fixed";
    videoBox.style.right = "22px";
    videoBox.style.bottom = "65px";
    videoBox.style.zIndex = "1000";
    videoBox.appendChild(videoElement);
    document.body.appendChild(videoBox);

    // --- Play-Button Overlay ---
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

    playBtn.onclick = function () {
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

    // --- Counting Overlay (optional) ---
    if (Array.isArray(s.countingTimings) && s.countingTimings.length > 0) {
      const overlay = document.createElement('div');
      overlay.id = "countingOverlay";
      overlay.style.display = "none";
      document.body.appendChild(overlay);

      let timeoutHandles = [];

      function clearCountingOverlays() {
        overlay.style.display = "none";
        overlay.innerHTML = "";
        timeoutHandles.forEach(handle => clearTimeout(handle));
        timeoutHandles = [];
      }

      videoElement.addEventListener('play', () => {
        clearCountingOverlays();
        s.countingTimings.forEach((step, idx) => {
          const timeout = setTimeout(() => {
            overlay.style.display = "";
            overlay.innerHTML = `
              <div class="count-overlay" style="display: flex; align-items: center; justify-content: center;">
                <img src="${step.image}" style="width:48px;height:48px;margin-right:18px;">
                <span style="font-size:2.3rem;font-weight:bold;">${step.number}</span>
              </div>
            `;
            setTimeout(() => {
              overlay.style.display = "none";
            }, 2800);
          }, (step.time || idx * 4) * 1000);
          timeoutHandles.push(timeout);
        });
      });

      videoElement.addEventListener('ended', clearCountingOverlays);
      videoElement.addEventListener('pause', clearCountingOverlays);
    }

    // --- Nach Video: Frage, Yes-Button, Reward, Next ---
    videoElement.addEventListener('ended', () => {
      if (countingMusic) {
        countingMusic.pause();
        countingMusic.currentTime = 0;
      }
      if (videoBox) videoBox.remove();
      showQuestionAndReward();
    });

  } else {
    // --- Kein Video: Frage direkt anzeigen (optional) ---
    showQuestionAndReward();
  }




  function showQuestionAndReward() {
    textArea.innerHTML = "";
    const question = document.createElement("div");
    question.className = "counting-question";
    question.style.textAlign = "center";
    question.style.fontSize = "1.5rem";
    question.style.margin = "26px 0 16px 0";
    question.textContent = "Did you count with me?";
    textArea.appendChild(question);

    const yesBtn = document.createElement("button");
yesBtn.innerText = "Yes!";
yesBtn.className = "counting-yes-btn";
yesBtn.style.display = "block";
yesBtn.style.margin = "24px auto";
yesBtn.style.fontSize = "1.5rem";
yesBtn.style.padding = "12px 36px";
yesBtn.style.borderRadius = "24px";
yesBtn.style.background = "linear-gradient(90deg,#ffe082,#ffd54f,#ffe082)";
yesBtn.style.boxShadow = "0 2px 22px #ffd54f99, 0 0 18px #fffde4";
yesBtn.style.fontWeight = "bold";
yesBtn.style.position = "relative";
yesBtn.style.cursor = "pointer";
yesBtn.style.overflow = "hidden";
yesBtn.style.transition = "transform 0.2s";
yesBtn.style.animation = "countYesPulse 1s infinite alternate";

textArea.appendChild(yesBtn);


    yesBtn.onclick = function () {
      new Audio("audio/yay.mp3").play();
      question.remove();
      yesBtn.remove();

      // Show reward star (wie bei animals)
      showUniversalReward(
  "Yes",   // ← das ist jetzt das richtige Wort (wie bei rhyme)
  "",      // ← Kein Kompliment-Text nötig
  null,
  0
);

         
        },
        0 // Sticker-Index falls du ihn brauchst, sonst 0
      ;
    
  

  return;
}
  }

else if (s.type === "counting") {
  clearTimeouts();
  renderFrogProgress(lastSessionIdx, idx);
  document.querySelectorAll(".floating-video, .centered-next-btn, .reward-container").forEach(el => el.remove());

  const textArea = document.getElementById("sessionTextArea");
  textArea.innerHTML = "";

  // Überschrift bleibt immer oben
  const heading = document.createElement('h2');
  heading.className = "session-heading";
  heading.textContent = s.title || "Counting Time!";
  heading.style.textAlign = "center";
  heading.style.margin = "18px 0 8px 0";
  heading.style.fontSize = "2.2rem";
  textArea.appendChild(heading);

  // Fester Wrapper für Zentrierung
  const mainWrap = document.createElement('div');
  mainWrap.style.display = "flex";
  mainWrap.style.flexDirection = "column";
  mainWrap.style.justifyContent = "center";
  mainWrap.style.alignItems = "center";
  mainWrap.style.minHeight = "55vh";
  mainWrap.style.width = "100%";
  textArea.appendChild(mainWrap);

  // Musik abspielen (aus JSON)
  let sessionMusic = null;
  if (s.music) {
    sessionMusic = new Audio("audio/" + s.music);
    sessionMusic.loop = true;
    sessionMusic.volume = 0.17;
    sessionMusic.play();
    document.addEventListener("visibilitychange", function musicPauseHandler() {
      if (document.hidden && sessionMusic) sessionMusic.pause();
      else if (!document.hidden && sessionMusic) sessionMusic.play();
    });
    window.addEventListener("pagehide", function() {
      if (sessionMusic) { sessionMusic.pause(); sessionMusic.currentTime = 0; }
    });
  }

  // Video unten rechts (wie immer)
  let videoBox, video;
  if (s.video) {
    video = document.createElement('video');
    video.src = `videos/${s.video}`;
    video.setAttribute("controls", "true");
    video.setAttribute("controlsList", "nodownload");
    video.autoplay = false;
    video.muted = false;
    video.playsInline = true;
    video.poster = "images/video-placeholder.png";
    video.className = "session-video";

    videoBox = document.createElement("div");
    videoBox.className = "floating-video";
    videoBox.style.position = "fixed";
    videoBox.style.right = "14px";
    videoBox.style.bottom = "62px";
    videoBox.style.zIndex = "1000";
    videoBox.appendChild(video);
    document.body.appendChild(videoBox);

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

    playBtn.onclick = function () {
      video.play();
      playBtn.style.display = "none";
      video.style.pointerEvents = "auto";
    };
    video.addEventListener('play', () => {
      playBtn.style.display = "none";
      video.style.pointerEvents = "auto";
    });
    video.addEventListener('pause', () => {
      playBtn.style.display = "";
      video.style.pointerEvents = "none";
    });
    video.addEventListener('ended', () => {
      playBtn.style.display = "";
      video.style.pointerEvents = "none";
      showCountingGame();
    });
  } else {
    showCountingGame();
  }

  // Zeitsteuerung (minDuration aus JSON, Default 60s)
  const sessionStart = Date.now();
  const minDuration = s.minDuration ? parseInt(s.minDuration, 10) : 60;
  const pauseBetweenQuestions = s.pauseBetweenQuestions || 1700; // Millisekunden (1.7s Standard)

  // Counting-Game-Logik
  function showCountingGame() {
    mainWrap.innerHTML = "";

    // Kindgerechte Instruktion!
    const instr = document.createElement('div');
    instr.textContent = "Look at the animals above and choose the right number below. Tap the question box to check your answer!";
    instr.style.fontSize = "1.12rem";
    instr.style.margin = "0 0 15px 0";
    instr.style.textAlign = "center";
    instr.style.color = "#444";
    mainWrap.appendChild(instr);

    // Spielfeld (zentriert, mobilfreundlich)
    const gameBox = document.createElement('div');
    gameBox.style.display = "flex";
    gameBox.style.flexDirection = "column";
    gameBox.style.alignItems = "center";
    gameBox.style.justifyContent = "center";
    gameBox.style.gap = "18px";
    gameBox.style.width = "100%";
    mainWrap.appendChild(gameBox);

    let currentItem = 0;
    function showItem(idx) {
      gameBox.innerHTML = "";

      const item = s.items[idx];

      // Tiere nebeneinander (zentriert, mobilfreundlich)
      const animalBox = document.createElement('div');
      animalBox.style.display = "flex";
      animalBox.style.gap = "7px";
      animalBox.style.justifyContent = "center";
      animalBox.style.marginBottom = "8px";
      animalBox.style.flexWrap = "wrap";
      for (let k = 0; k < item.number; k++) {
        const img = document.createElement('img');
        img.src = item.image;
        img.alt = item.label || "Animal";
        img.style.width = "38px";
        img.style.height = "38px";
        img.style.objectFit = "contain";
        img.style.borderRadius = "12px";
        img.style.boxShadow = "0 2px 14px #ffd54f77";
        img.draggable = false;
        animalBox.appendChild(img);
      }

      // Drop-Zone als Quadrat (zentriert)
      const dropZone = document.createElement('div');
      dropZone.className = "drop-zone";
      dropZone.style.width = "52px";
      dropZone.style.height = "52px";
      dropZone.style.background = "#e3f2fd";
      dropZone.style.borderRadius = "10px";
      dropZone.style.display = "flex";
      dropZone.style.alignItems = "center";
      dropZone.style.justifyContent = "center";
      dropZone.style.fontWeight = "bold";
      dropZone.style.fontSize = "1.6rem";
      dropZone.style.boxShadow = "0 2px 10px #81d4fa88";
      dropZone.style.cursor = "pointer";
      dropZone.style.margin = "0 auto 12px auto";
      dropZone.style.border = "3px dashed #ffd54f";
      dropZone.style.transition = "all 0.16s";
      dropZone.innerText = "?";

      // Zahlen-Kacheln darunter (zentriert, gleiches Style)
      const numbers = [item.number];
      while (numbers.length < 3) {
        let n = Math.floor(Math.random() * 8) + 1;
        if (!numbers.includes(n)) numbers.push(n);
      }
      numbers.sort(() => Math.random() - 0.5);

      let selectedNumber = null;
      const numBox = document.createElement('div');
      numBox.style.display = "flex";
      numBox.style.gap = "15px";
      numBox.style.justifyContent = "center";
      numBox.style.marginTop = "8px";
      numbers.forEach(num => {
        const btn = document.createElement('div');
        btn.className = "draggable-number";
        btn.textContent = num;
        btn.style.width = "52px";
        btn.style.height = "52px";
        btn.style.background = "#e3f2fd";
        btn.style.borderRadius = "10px";
        btn.style.display = "flex";
        btn.style.alignItems = "center";
        btn.style.justifyContent = "center";
        btn.style.fontWeight = "bold";
        btn.style.fontSize = "1.42rem";
        btn.style.boxShadow = "0 2px 10px #81d4fa88";
        btn.style.cursor = "pointer";
        btn.style.border = "3px solid #ffd54f";
        btn.style.transition = "0.16s";
        btn.onclick = () => {
          Array.from(numBox.children).forEach(b => b.style.background = "#e3f2fd");
          btn.style.background = "#ffd54f";
          selectedNumber = num;
        };
        numBox.appendChild(btn);
      });

      // Fragezeichen-Box klickbar für Antwortauswertung
      dropZone.onclick = () => {
        if (selectedNumber === null) {
          dropZone.style.background = "#ffcdd2";
          setTimeout(() => dropZone.style.background = "#e3f2fd", 500);
          return;
        }
        if (selectedNumber === item.number) {
          new Audio("audio/yay.mp3").play();
          dropZone.innerText = `✔️`;
          dropZone.style.background = "#c8e6c9";
          dropZone.style.color = "#388e3c";
          animalBox.querySelectorAll('img').forEach(img => img.style.filter = "drop-shadow(0 0 14px #ffeb3b)");
          // Übergang zur nächsten Frage:
          if (currentItem < s.items.length - 1) {
            const nextMsg = document.createElement("div");
            nextMsg.textContent = "Well done! Next one loading...";
            nextMsg.style.textAlign = "center";
            nextMsg.style.color = "#43a047";
            nextMsg.style.fontSize = "1.11rem";
            nextMsg.style.fontWeight = "bold";
            nextMsg.style.margin = "10px 0 2px 0";
            mainWrap.appendChild(nextMsg);

            setTimeout(() => {
              nextMsg.remove();
              currentItem++;
              showItem(currentItem);
            }, pauseBetweenQuestions);
          } else {
            if (sessionMusic) { sessionMusic.pause(); sessionMusic.currentTime = 0; }
            const elapsed = (Date.now() - sessionStart) / 1000;
            if (elapsed >= minDuration) {
              showUniversalRewardFromSession(s);
            } else {
              const waitTime = Math.ceil(minDuration - elapsed);
              showLoadingOverlay(`⏳ Please wait ${waitTime}s...`, waitTime * 1000, () => {
                showUniversalRewardFromSession(s);
              });
            }
          }
        } else {
          new Audio("audio/fail.mp3").play();
          dropZone.innerText = `❌`;
          dropZone.style.background = "#ffcdd2";
          dropZone.style.color = "#d32f2f";
          setTimeout(() => {
            dropZone.innerText = "?";
            dropZone.style.background = "#e3f2fd";
            dropZone.style.color = "#222";
          }, 900);
        }
      };

      // Reihenfolge für perfekte Zentrierung
      gameBox.appendChild(animalBox);
      gameBox.appendChild(dropZone);
      gameBox.appendChild(numBox);
    }
    showItem(0);
  }
}

// ==== 4. NEUES MODUL: MEMORY ====
   else if (s.type === "memoryold") {
  clearTimeouts();
  renderFrogProgress(lastSessionIdx, idx);
  document.querySelectorAll(".floating-video, .centered-next-btn, .memory-reward-container").forEach(el => el.remove());
  const textArea = document.getElementById("sessionTextArea");
  textArea.innerHTML = "";

  // --- BACKGROUND MUSIC (optional) ---
  let memoryMusic = null;
  if (s.music) {
    memoryMusic = new Audio("audio/" + s.music);
    memoryMusic.loop = true;
    memoryMusic.volume = 0.18;
    memoryMusic.play();
  }

  // === NEU: Heading & Avatar SOFORT anzeigen ===
  const heading = document.createElement('h2');
  heading.className = "session-heading";
  heading.textContent = "Memory Game!";
  heading.style.textAlign = "center";
  textArea.appendChild(heading);

  if (s.avatar) {
    const avatarImg = document.createElement('img');
    avatarImg.src = "images/" + s.avatar + ".png";
    avatarImg.alt = s.avatar;
    avatarImg.className = "intro-avatar-small";
    avatarImg.style.display = "block";
    avatarImg.style.margin = "0 auto 10px auto";
    textArea.appendChild(avatarImg);
  }

  // --- VIDEO (optional, Animals-Style) ---
  // NUR das Video anzeigen – noch NICHT das Spielfeld!
  if (s.video) {
    const video = document.createElement("video");
    video.src = `videos/${s.video}`;
    video.setAttribute("controls", "true");
    video.setAttribute("controlsList", "nodownload");
    video.autoplay = false;
    video.muted = false;
    video.playsInline = true;
    video.poster = "images/video-placeholder.png";
    video.className = "session-video";

    // Floating Video-Box (unten rechts)
    const videoBox = document.createElement("div");
    videoBox.className = "floating-video";
    videoBox.style.margin = "0 auto 18px auto";
    videoBox.style.display = "flex";
    videoBox.style.justifyContent = "center";
    videoBox.appendChild(video);
    textArea.appendChild(videoBox);

    // Play-Button Overlay
    const playBtn = document.createElement("button");
    playBtn.className = "custom-play-btn";
    playBtn.title = "Play";
    playBtn.innerHTML = `
      <svg viewBox="0 0 60 60">
        <circle cx="30" cy="30" r="28" fill="none"/>
        <polygon points="22,16 46,30 22,44" fill="#383838"/>
      </svg>
    `;
    videoBox.appendChild(playBtn);

    playBtn.addEventListener("click", () => {
      video.play();
      playBtn.style.display = "none";
    });
    video.addEventListener("play", () => playBtn.style.display = "none");

    video.addEventListener("ended", () => {
      videoBox.remove();
      startMemoryGame();
    });

    return; // Spielfeld wird erst NACH Video angezeigt!
  } else {
    startMemoryGame(); // Kein Video – direkt starten
  }

  // --- Game Board & Logic wie gehabt ---
  function startMemoryGame() {
    // Game-Board nach Video-Ende (oder sofort, falls kein Video)
    const boardWrapper = document.createElement('div');
    boardWrapper.style.display = "flex";
    boardWrapper.style.justifyContent = "center";
    boardWrapper.style.alignItems = "center";
    boardWrapper.style.width = "100%";
    boardWrapper.style.margin = "22px 0";

    const board = document.createElement('div');
    board.style.display = "grid";
    // Wähle die Anzahl der Spalten DYNAMISCH oder z.B. 4 (für 4, 8, 12, ... Karten)
    const totalCards = s.cards.length;
    let columns = 2;
    if (totalCards === 4) columns = 2;
    else if (totalCards === 6) columns = 3;
    else if (totalCards === 8) columns = 4;
    else if (totalCards === 12) columns = 4;
    else if (totalCards === 16) columns = 4;
    else if (totalCards === 20) columns = 5;
    else if (totalCards === 24) columns = 6;
    else columns = Math.ceil(Math.sqrt(totalCards));

    board.style.gridTemplateColumns = `repeat(${columns}, 58px)`;
    board.style.gap = "16px";
    boardWrapper.appendChild(board);
    textArea.appendChild(boardWrapper);


    // Shuffle cards
    const shuffled = s.cards.slice().sort(() => Math.random() - 0.5);
    let opened = [], matched = [];
    shuffled.forEach((card, idx) => {
      const btn = document.createElement('button');
      btn.style.width = "58px";
      btn.style.height = "58px";
      btn.style.borderRadius = "16px";
      btn.style.background = "#fffbe6";
      btn.style.border = "2px solid #b2dfdb";
      btn.style.boxShadow = "0 2px 8px #81d4fa88";
      btn.style.fontSize = "2.1rem";
      btn.style.cursor = "pointer";
      btn.dataset.pair = card.pairId;
      btn.dataset.idx = idx;
      btn.innerHTML = `<span style="font-size:2.5rem;">❓</span>`; // Hidden

      btn.onclick = function () {
        if (btn.classList.contains("matched") || btn === opened[0]) return;
        btn.innerHTML = `<img src="${card.img}" alt="card" style="width:48px;height:48px;">`;
        opened.push(btn);

        if (opened.length === 2) {
          if (opened[0].dataset.pair === opened[1].dataset.pair) {
            // Correct!
            opened[0].classList.add("matched");
            opened[1].classList.add("matched");
            matched.push(opened[0], opened[1]);
            opened = [];
            if (matched.length === shuffled.length) {
              // --- PLAY YAY SOUND! ---
              new Audio("audio/yay.mp3").play();
              // --- STOP BACKGROUND MUSIC ---
              if (memoryMusic) {
                memoryMusic.pause();
                memoryMusic.currentTime = 0;
              }
              setTimeout(() => {
                showMemoryReward();
              }, 600);
            }
          } else {
            // Wrong: briefly show, then hide again
            setTimeout(() => {
              opened[0].innerHTML = `<span style="font-size:2.5rem;">❓</span>`;
              opened[1].innerHTML = `<span style="font-size:2.5rem;">❓</span>`;
              opened = [];
            }, 800);
          }
        }
      };
      board.appendChild(btn);
    });
  }

  function showMemoryReward() {
  showUniversalRewardFromSession(s, () => {
    currentSession++;
    renderSession(currentSession);
  });
}
   }

else if (s.type === "memory") {
  clearTimeouts();
  renderFrogProgress(lastSessionIdx, idx);
  document.querySelectorAll(".floating-video, .centered-next-btn, .reward-container").forEach(el => el.remove());
  const textArea = document.getElementById("sessionTextArea");
  textArea.innerHTML = "";

  // Überschrift bleibt immer oben
  const heading = document.createElement('h2');
  heading.className = "session-heading";
  heading.textContent = s.title || "Memory Game!";
  heading.style.textAlign = "center";
  heading.style.margin = "18px 0 8px 0";
  heading.style.fontSize = "2.2rem";
  textArea.appendChild(heading);

  // Zentrierter Wrapper
  const mainWrap = document.createElement('div');
  mainWrap.style.display = "flex";
  mainWrap.style.flexDirection = "column";
  mainWrap.style.justifyContent = "center";
  mainWrap.style.alignItems = "center";
  mainWrap.style.minHeight = "55vh";
  mainWrap.style.width = "100%";
  textArea.appendChild(mainWrap);

  // Musik abspielen (aus JSON)
  let sessionMusic = null;
  if (s.music) {
    sessionMusic = new Audio("audio/" + s.music);
    sessionMusic.loop = true;
    sessionMusic.volume = 0.18;
    sessionMusic.play();
    document.addEventListener("visibilitychange", function memoryMusicPauseHandler() {
      if (document.hidden && sessionMusic) sessionMusic.pause();
      else if (!document.hidden && sessionMusic) sessionMusic.play();
    });
    window.addEventListener("pagehide", function() {
      if (sessionMusic) { sessionMusic.pause(); sessionMusic.currentTime = 0; }
    });
  }

  // Video unten rechts
  let videoBox, video;
  if (s.video) {
    video = document.createElement('video');
    video.src = `videos/${s.video}`;
    video.setAttribute("controls", "true");
    video.setAttribute("controlsList", "nodownload");
    video.autoplay = false;
    video.muted = false;
    video.playsInline = true;
    video.poster = "images/video-placeholder.png";
    video.className = "session-video";

    videoBox = document.createElement("div");
    videoBox.className = "floating-video";
    videoBox.style.position = "fixed";
    videoBox.style.right = "14px";
    videoBox.style.bottom = "62px";
    videoBox.style.zIndex = "1000";
    videoBox.appendChild(video);
    document.body.appendChild(videoBox);

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

    playBtn.onclick = function () {
      video.play();
      playBtn.style.display = "none";
      video.style.pointerEvents = "auto";
    };
    video.addEventListener('play', () => {
      playBtn.style.display = "none";
      video.style.pointerEvents = "auto";
    });
    video.addEventListener('pause', () => {
      playBtn.style.display = "";
      video.style.pointerEvents = "none";
    });
    video.addEventListener('ended', () => {
      playBtn.style.display = "";
      video.style.pointerEvents = "none";
      startMemoryGame();
    });
  } else {
    startMemoryGame();
  }

  // Zeitsteuerung (minDuration aus JSON, Default 60s)
  const sessionStart = Date.now();
  const minDuration = s.minDuration ? parseInt(s.minDuration, 10) : 60;
  const pauseBetweenPairs = s.pauseBetweenPairs || 1800; // Millisekunden (1.8s Standard)

  // Memory-Game
  function startMemoryGame() {
    mainWrap.innerHTML = "";

    const instr = document.createElement('div');
    instr.textContent = "Find all the matching pairs!";
    instr.style.fontSize = "1.15rem";
    instr.style.margin = "0 0 17px 0";
    instr.style.textAlign = "center";
    instr.style.color = "#444";
    mainWrap.appendChild(instr);

    // Spielfeld
    const boardWrapper = document.createElement('div');
    boardWrapper.style.display = "flex";
    boardWrapper.style.justifyContent = "center";
    boardWrapper.style.alignItems = "center";
    boardWrapper.style.width = "100%";
    boardWrapper.style.margin = "12px 0";

    const board = document.createElement('div');
    const totalCards = s.cards.length;
    let columns = 2;
    if (totalCards === 4) columns = 2;
    else if (totalCards === 6) columns = 3;
    else if (totalCards === 8) columns = 4;
    else if (totalCards === 12) columns = 4;
    else if (totalCards === 16) columns = 4;
    else if (totalCards === 20) columns = 5;
    else if (totalCards === 24) columns = 6;
    else columns = Math.ceil(Math.sqrt(totalCards));

    board.style.display = "grid";
    board.style.gridTemplateColumns = `repeat(${columns}, 62px)`;
    board.style.gap = "14px";
    boardWrapper.appendChild(board);
    mainWrap.appendChild(boardWrapper);

    // Shuffle cards
    const shuffled = s.cards.slice().sort(() => Math.random() - 0.5);
    let opened = [], matched = [];
    let isBlocked = false;

    shuffled.forEach((card, idx) => {
      const btn = document.createElement('button');
      btn.style.width = "62px";
      btn.style.height = "62px";
      btn.style.borderRadius = "16px";
      btn.style.background = "#fffbe6";
      btn.style.border = "2px solid #b2dfdb";
      btn.style.boxShadow = "0 2px 8px #81d4fa88";
      btn.style.fontSize = "2.2rem";
      btn.style.cursor = "pointer";
      btn.dataset.pair = card.pairId;
      btn.dataset.idx = idx;
      btn.innerHTML = `<span style="font-size:2.5rem;">❓</span>`; // Hidden

      btn.onclick = function () {
        if (btn.classList.contains("matched") || btn === opened[0] || isBlocked) return;
        btn.innerHTML = `<img src="${card.img}" alt="card" style="width:48px;height:48px;">`;
        opened.push(btn);

        if (opened.length === 2) {
          isBlocked = true;
          if (opened[0].dataset.pair === opened[1].dataset.pair) {
            // Correct!
            opened[0].classList.add("matched");
            opened[1].classList.add("matched");
            matched.push(opened[0], opened[1]);
            setTimeout(() => {
              opened.forEach(el => {
                // SVG-Haken-Overlay
                const check = document.createElement("div");
                check.innerHTML = `
                  <svg width="38" height="38" viewBox="0 0 38 38">
                    <circle cx="19" cy="19" r="18" fill="#fffde7" stroke="#aeea00" stroke-width="2"/>
                    <polyline points="10,21 17,28 28,13" fill="none" stroke="#43a047" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                `;
                check.style.position = "absolute";
                check.style.left = "50%";
                check.style.top = "50%";
                check.style.transform = "translate(-50%,-50%) scale(0.5)";
                check.style.pointerEvents = "none";
                check.style.zIndex = "10";
                check.style.opacity = "1";
                check.style.transition = "opacity 0.7s, transform 0.27s";
                el.style.position = "relative";
                el.appendChild(check);
                setTimeout(() => { check.style.transform = "translate(-50%,-50%) scale(1.2)"; }, 40);
                setTimeout(() => { check.style.transform = "translate(-50%,-50%) scale(1)"; }, 220);
                setTimeout(() => {
                  check.style.opacity = "0";
                  check.style.transform = "translate(-50%,-50%) scale(0.7)";
                  setTimeout(() => check.remove(), 650);
                }, 950);
              });
            }, 120);
            new Audio("audio/yay.mp3").play();
            setTimeout(() => {
              opened = [];
              isBlocked = false;
              if (matched.length < shuffled.length) {
                const msg = document.createElement("div");
                msg.textContent = "Great! Next pair...";
                msg.style.textAlign = "center";
                msg.style.color = "#43a047";
                msg.style.fontSize = "1.12rem";
                msg.style.fontWeight = "bold";
                msg.style.margin = "8px 0 2px 0";
                mainWrap.appendChild(msg);
                setTimeout(() => { msg.remove(); }, pauseBetweenPairs);
              }
            }, pauseBetweenPairs);
            // Komplett fertig
            if (matched.length === shuffled.length) {
              setTimeout(() => {
                if (sessionMusic) { sessionMusic.pause(); sessionMusic.currentTime = 0; }
                const elapsed = (Date.now() - sessionStart) / 1000;
                if (elapsed >= minDuration) {
                  showUniversalRewardFromSession(s);
                } else {
                  const waitTime = Math.ceil(minDuration - elapsed);
                  showLoadingOverlay(`⏳ Please wait ${waitTime}s...`, waitTime * 1000, () => {
                    showUniversalRewardFromSession(s);
                  });
                }
              }, pauseBetweenPairs + 600);
            }
          } else {
            // Wrong: kurz zeigen, dann verstecken
            new Audio("audio/fail.mp3").play();
            setTimeout(() => {
              opened[0].innerHTML = `<span style="font-size:2.5rem;">❓</span>`;
              opened[1].innerHTML = `<span style="font-size:2.5rem;">❓</span>`;
              opened = [];
              isBlocked = false;
            }, 1100);
          }
        }
      };
      board.appendChild(btn);
    });
  }
}

// ==== Modul: SCHATTENRÄTSEL ====
 else if (s.type === "shadowold") {
  console.log("shadow BLOCK:", s, "s.video=", s.video);
  if (!s.video) alert("Achtung! s.video ist leer!");
  console.log("SHADOW-BLOCK WIRD AUSGEFÜHRT!", s);
  clearTimeouts();
  renderFrogProgress(lastSessionIdx, idx);
  document.querySelectorAll(".floating-video, .centered-next-btn").forEach(el => el.remove());
  document.getElementById("sessionTextArea").innerHTML = "";
  const textArea = document.getElementById("sessionTextArea");
  
  // --- BACKGROUND MUSIC (optional from JSON) ---
let shadowMusic = null;
if (s.music) {
  shadowMusic = new Audio("audio/" + s.music);
  shadowMusic.loop = true;
  shadowMusic.volume = 0.18;
  shadowMusic.play();
}

  // Überschrift
  const heading = document.createElement('h2');
  heading.className = "session-heading";
  heading.textContent = "Shadow Match!";
  textArea.appendChild(heading);

  // Video-Erklärung (optional)
  if (s.video) {
    console.log("SHADOW-BLOCK: s.video = ", s.video);
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
    videoBox.appendChild(playBtn);

    playBtn.onclick = () => {
      video.play();
      playBtn.style.display = "none";
      video.style.pointerEvents = "auto";
    };
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
      setTimeout(() => { renderShadowQuiz(); }, 400);
    });

    
  } else {
    renderShadowQuiz(); // Kein Video – direkt starten
  }

  // === Funktion: Shadow-Quiz anzeigen ===
  function renderShadowQuiz() {
    // Schattenbild
    const shadowImg = document.createElement('img');
    shadowImg.src = s.shadow;
    shadowImg.className = "shadow-image";
    shadowImg.style.width = "90px";
    shadowImg.style.height = "90px";
    shadowImg.style.margin = "18px 0";
    textArea.appendChild(shadowImg);

    // Antwort-Buttons
    const choices = document.createElement('div');
    choices.className = "shadow-buttons";
    textArea.appendChild(choices);

    s.choices.forEach((img, i) => {
      const btn = document.createElement('button');
      btn.innerHTML = `<img src="${img}" alt="choice" style="width:60px;height:60px;">`;
      btn.onclick = () => handleChoice(btn, i);
      choices.appendChild(btn);
    });

    function handleChoice(btn, i) {
      new Audio(`audio/${i === s.correct ? "yay.mp3" : "fail.mp3"}`).play();

      const prev = document.querySelector(".shadow-feedback");
      if (prev) prev.remove();

      const feedback = document.createElement("div");
      feedback.className = "animated-text shadow-feedback";
      feedback.style.textAlign = "center";
      feedback.style.marginTop = "17px";

      if (i === s.correct) {
  // Buttons ausblenden
  Array.from(choices.children).forEach((c, idx) => {
    if (idx !== i) c.style.display = "none";
  });
  
  // Optional: Feedback-Text als Animation
  feedback.classList.add("glitter");
  feedback.textContent = s.onCorrect || "Correct! Sticker unlocked!";
  textArea.appendChild(feedback);

if (shadowMusic) {
    shadowMusic.pause();
    shadowMusic.currentTime = 0;
  }

  // UNIVERSAL REWARD CONTAINER wie überall sonst:
  showUniversalRewardFromSession(s, () => {
  currentSession++;
  renderSession(currentSession);
});
	  }
	}
  }
 }


else if (s.type === "shadow") {
  clearTimeouts();
  renderFrogProgress(lastSessionIdx, idx);
  document.querySelectorAll(".floating-video, .centered-next-btn, .reward-container").forEach(el => el.remove());
  const textArea = document.getElementById("sessionTextArea");
  textArea.innerHTML = "";

  // Überschrift
  const heading = document.createElement('h2');
  heading.className = "session-heading";
  heading.textContent = s.title || "Shadow Match!";
  heading.style.textAlign = "center";
  heading.style.margin = "18px 0 8px 0";
  heading.style.fontSize = "2.2rem";
  textArea.appendChild(heading);

  // Musik abspielen (aus JSON)
  let sessionMusic = null;
  if (s.music) {
    sessionMusic = new Audio("audio/" + s.music);
    sessionMusic.loop = true;
    sessionMusic.volume = 0.17;
    sessionMusic.play();
    document.addEventListener("visibilitychange", function musicPauseHandler() {
      if (document.hidden && sessionMusic) sessionMusic.pause();
      else if (!document.hidden && sessionMusic) sessionMusic.play();
    });
    window.addEventListener("pagehide", function() {
      if (sessionMusic) { sessionMusic.pause(); sessionMusic.currentTime = 0; }
    });
  }

  // Video unten rechts (NUR EINMAL zu Beginn!)
  let videoBox, video;
  if (s.video) {
    video = document.createElement('video');
    video.src = `videos/${s.video}`;
    video.setAttribute("controls", "true");
    video.setAttribute("controlsList", "nodownload");
    video.autoplay = false;
    video.muted = false;
    video.playsInline = true;
    video.poster = "images/video-placeholder.png";
    video.className = "session-video";

    videoBox = document.createElement("div");
    videoBox.className = "floating-video";
    videoBox.style.position = "fixed";
    videoBox.style.right = "14px";
    videoBox.style.bottom = "62px";
    videoBox.style.zIndex = "1000";
    videoBox.appendChild(video);
    document.body.appendChild(videoBox);

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

    playBtn.onclick = function () {
      video.play();
      playBtn.style.display = "none";
      video.style.pointerEvents = "auto";
    };
    video.addEventListener('play', () => {
      playBtn.style.display = "none";
      video.style.pointerEvents = "auto";
    });
    video.addEventListener('pause', () => {
      playBtn.style.display = "";
      video.style.pointerEvents = "none";
    });
    video.addEventListener('ended', () => {
      playBtn.style.display = "";
      video.style.pointerEvents = "none";
      showShadowTask();
    }, { once: true }); // WICHTIG: nur EINMALIG!
  } else {
    showShadowTask();
  }

  // Multi-Task-Support (Mehrere Aufgaben pro Session)
  const tasks = Array.isArray(s.tasks) ? s.tasks : [s];
  let taskIdx = 0;
  const sessionStart = Date.now();
  const minDuration = s.minDuration ? parseInt(s.minDuration, 10) : 60;
  const pauseAfterCorrect = s.pauseAfterCorrect || 1700;

  function showShadowTask() {
    textArea.querySelectorAll(".shadowMain, .shadow-feedback").forEach(e => e.remove());
    const mainWrap = document.createElement('div');
    mainWrap.className = "shadowMain";
    mainWrap.style.display = "flex";
    mainWrap.style.flexDirection = "column";
    mainWrap.style.justifyContent = "center";
    mainWrap.style.alignItems = "center";
    mainWrap.style.minHeight = "54vh";
    mainWrap.style.width = "100%";
    textArea.appendChild(mainWrap);

    const currentTask = tasks[taskIdx];

    // Schattenbild groß und mittig
    const shadowImg = document.createElement('img');
    shadowImg.src = currentTask.shadow || currentTask.image || ""; // shadow ODER image
    shadowImg.className = "shadow-image";
    shadowImg.style.width = "110px";
    shadowImg.style.height = "110px";
    shadowImg.style.margin = "18px 0 18px 0";
    // Filter für Schatteneffekt:
    shadowImg.style.filter = "grayscale(1) brightness(0.32) contrast(2)";
    mainWrap.appendChild(shadowImg);

    // Frage (optional)
    if (currentTask.question) {
      const question = document.createElement("div");
      question.className = "animated-text";
      question.style.textAlign = "center";
      question.style.fontWeight = "bold";
      question.style.fontSize = "1.12rem";
      question.style.margin = "0 0 10px 0";
      question.innerText = currentTask.question;
      mainWrap.appendChild(question);
    }

    // Antwort-Buttons als Bilder
    const choicesBox = document.createElement('div');
    choicesBox.className = "shadow-buttons";
    choicesBox.style.display = "flex";
    choicesBox.style.justifyContent = "center";
    choicesBox.style.gap = "22px";
    choicesBox.style.margin = "8px 0";
    mainWrap.appendChild(choicesBox);

    currentTask.choices.forEach((img, i) => {
      const btn = document.createElement('button');
      btn.innerHTML = `<img src="${img}" alt="choice" style="width:78px;height:78px;border-radius:18px;box-shadow:0 2px 8px #ffd54f55;">`;
      btn.style.border = "none";
      btn.style.background = "#fffbe6";
      btn.style.borderRadius = "20px";
      btn.style.padding = "0";
      btn.style.transition = "transform 0.17s, box-shadow 0.17s";
      btn.className = "shadow-choice-btn bounce-glow";
      btn.onclick = () => handleChoice(btn, i, img);
      choicesBox.appendChild(btn);
    });

    // Bonus-Animation-Style (nur 1x pro Seite einfügen)
    if (!document.getElementById("shadow-btn-bounce-style")) {
      const style = document.createElement('style');
      style.id = "shadow-btn-bounce-style";
      style.innerHTML = `
        .bounce-glow {
          animation: bounceBtn 1.18s infinite alternate;
        }
        @keyframes bounceBtn {
          0% { box-shadow: 0 2px 10px #81d4fa88; transform: scale(1);}
          70%{ box-shadow: 0 7px 28px #ffd54f77; transform: scale(1.09);}
          100%{box-shadow: 0 2px 10px #81d4fa88; transform: scale(1);}
        }
      `;
      document.head.appendChild(style);
    }
  }

  function handleChoice(btn, i, imgSrc) {
    const currentTask = tasks[taskIdx];
    new Audio(`audio/${i === currentTask.correct ? "yay.mp3" : "fail.mp3"}`).play();

    // Feedback
    let feedback = textArea.querySelector(".shadow-feedback");
    if (!feedback) {
      feedback = document.createElement("div");
      feedback.className = "animated-text shadow-feedback";
      feedback.style.textAlign = "center";
      feedback.style.marginTop = "17px";
      feedback.style.fontWeight = "bold";
      feedback.style.fontSize = "1.13rem";
      textArea.appendChild(feedback);
    }

    if (i === currentTask.correct) {
      // Richtiger Button hervorheben, andere ausgrauen
      Array.from(btn.parentNode.children).forEach((b, idx) => {
        if (b !== btn) b.style.opacity = "0.4";
        b.disabled = true;
      });
      btn.style.background = "#b2dfdb";
      btn.style.transform = "scale(1.15)";
      setTimeout(() => btn.style.transform = "scale(1)", 130);

      feedback.textContent = currentTask.onCorrect || "Correct! Well done!";
      feedback.style.color = "#388e3c";

      setTimeout(() => {
        taskIdx++;
        if (taskIdx < tasks.length) {
          // Nur warten & nächste Frage laden!
          showLoadingOverlay("Next question loading...", 1200, showShadowTask);
        } else {
          // Session vorbei – erst jetzt Reward & ggf. Zeitsteuerung
          if (sessionMusic) { sessionMusic.pause(); sessionMusic.currentTime = 0; }
          const elapsed = (Date.now() - sessionStart) / 1000;
          if (elapsed >= minDuration) {
            showUniversalRewardFromSession(s);
          } else {
            const waitTime = Math.ceil(minDuration - elapsed);
            showLoadingOverlay(`⏳ Please wait ${waitTime}s...`, waitTime * 1000, () => {
              showUniversalRewardFromSession(s);
            });
          }
        }
      }, pauseAfterCorrect);
      return;
    }

    // Falsch-Logik
    feedback.style.color = "#d32f2f";
    feedback.textContent = currentTask.onWrong || "Oops, that's not right. Try again!";
    btn.classList.add("shake");
    setTimeout(() => btn.classList.remove("shake"), 600);
    setTimeout(() => {
      if (feedback.parentNode) feedback.remove();
    }, 1400);
  }
}



 
// ==== Modul: ANIMALS ====
 else if (s.type === "animalsold") {
  // Grund-Setup & Cleanup
  clearTimeouts();
  renderFrogProgress(lastSessionIdx, idx);
  document.querySelectorAll(".floating-video, .centered-next-btn, .animals-reward-container").forEach(el => el.remove());
  const textArea = document.getElementById("sessionTextArea");
  textArea.innerHTML = "";
  

  // Hintergrundmusik (optional)
  let musicAudio = null;
  if (s.music) {
    musicAudio = new Audio("audio/" + s.music);
    musicAudio.loop = true;
    musicAudio.volume = 0.17;
    musicAudio.play();
  }

  // Überschrift
  const heading = document.createElement("h2");
  heading.className = "session-heading";
  heading.textContent = "Guess the Animal!";
  heading.style.textAlign = "center";
  textArea.appendChild(heading);

  // Video unten rechts, fixiert & immer im Vordergrund
  let videoBox, video;
  if (s.video) {
    video = document.createElement("video");
    video.src = `videos/${s.video}`;
    video.setAttribute("controls", "true");
    video.setAttribute("controlsList", "nodownload");
    video.autoplay = false;
    video.muted = false;
    video.playsInline = true;
    video.poster = "images/video-placeholder.png";
    video.className = "session-video";

    videoBox = document.createElement("div");
    videoBox.className = "floating-video";
    videoBox.style.zIndex = "1000"; // Höchster Wert, bleibt IMMER oben
    videoBox.appendChild(video);
    document.body.appendChild(videoBox);

    // Play-Button wie immer
    const playBtn = document.createElement("button");
    playBtn.className = "custom-play-btn";
    playBtn.title = "Play";
    playBtn.innerHTML = `
      <svg viewBox="0 0 60 60">
        <circle cx="30" cy="30" r="28" fill="none"/>
        <polygon points="22,16 46,30 22,44" fill="#383838"/>
      </svg>
    `;
    videoBox.appendChild(playBtn);

    playBtn.addEventListener("click", () => {
      video.play();
      playBtn.style.display = "none";
    });
    video.addEventListener("play", () => playBtn.style.display = "none");

    video.addEventListener("ended", () => {
      // Avatar wird im Video-Container nach dem Video angezeigt
      showAvatarInVideoBox(videoBox, "momo");
      startAnimalSequence();
    });
  } else {
    startAnimalSequence();
  }

  function playRepeatedAudio(audioSrc, repeats, onComplete) {
    let count = 0;
    function playNext() {
      if (count < repeats) {
        const audio = new Audio(audioSrc);
        audio.onended = playNext;
        audio.play();
        count++;
      } else if (typeof onComplete === 'function') {
        onComplete();
      }
    }
    playNext();
  }

  function startAnimalSequence() {
    // Tiergeräusch (wiederholt), dann Textzeilen, dann Buttons
    playRepeatedAudio(`audio/${s.sound}`, s.repeats, () => {
      // Textzeilen mit Timings (optional)
      if (Array.isArray(s.text)) {
        s.text.forEach((line, i) => {
          setTimeout(() => {
            const p = document.createElement("div");
            p.className = "animated-text";
            p.style.textAlign = "center";
            p.innerText = line;
            textArea.appendChild(p);
            if (i === s.text.length - 1) showChoices();
          }, s.timings && s.timings[i] ? s.timings[i] * 1000 : i * 1200);
        });
      } else {
        showChoices();
      }
    });
  }

  function showChoices() {
    // CTA-Text
    const cta = document.createElement("div");
    cta.className = "animated-text";
    cta.style.textAlign = "center";
    cta.style.fontSize = "1.18rem";
    cta.style.marginBottom = "16px";
    cta.innerText = "Tap the right animal!";
    textArea.appendChild(cta);

    // Button-Container
    const box = document.createElement("div");
    box.className = "animals-buttons";
    box.style.display = "flex";
    box.style.justifyContent = "center";
    box.style.gap = "16px";
    textArea.appendChild(box);

    s.choices.forEach((src, i) => {
      const btn = document.createElement("button");
      btn.className = "animated-text fade-in-up";
      btn.style.animationDelay = `${i * 0.2}s`;
      btn.style.animationDuration = "0.6s";
      btn.style.border = "none";
      btn.style.background = "none";
      btn.style.position = "relative";
      btn.innerHTML = `<img src="${src}" style="width:72px;height:72px;border-radius:12px;">`;
      btn.addEventListener("click", () => handleChoice(btn, i, src));
      box.appendChild(btn);
    });
  }

  function handleChoice(btn, i, imgSrc) {
  // Remove previous wrong feedback
  const prevWrong = document.querySelector(".wrong-msg");
  if (prevWrong) prevWrong.remove();

  new Audio(`audio/${i === s.correct ? "yay.mp3" : "fail.mp3"}`).play();

  // Correct answer
  if (i === s.correct) {
    document.querySelectorAll('.animals-buttons').forEach(e => e.remove());
    showUniversalReward(
      s.choices[i],            // Image from choices (correct)
      s.onCorrect || "",       // onCorrect text from JSON
      () => {
        document.querySelectorAll(".animals-reward-container, .centered-next-btn").forEach(e => e.remove());
        if (typeof unlockSticker === "function") unlockSticker(0);
        if (musicAudio) { musicAudio.pause(); musicAudio.currentTime = 0; }
        currentSession++;
        renderSession(currentSession);
      },
      0
    );
    return; // ← Das verhindert, dass die Falsch-Logik darunter ausgeführt wird!
  }

  // Wrong answer logic (NO return needed here)
  const wrongMsg = document.createElement("div");
  wrongMsg.className = "wrong-msg animated-text";
  wrongMsg.style.color = "#d32f2f";
  wrongMsg.style.fontWeight = "bold";
  wrongMsg.style.textAlign = "center";
  wrongMsg.style.marginTop = "16px";
  wrongMsg.textContent = s.onWrong || "Oops, that’s not right. Try again!";
  textArea.appendChild(wrongMsg);

  btn.classList.add("shake");
  setTimeout(() => btn.classList.remove("shake"), 600);

  setTimeout(() => {
    if (wrongMsg.parentNode) wrongMsg.remove();
  }, 1600);
  // Funktion endet hier automatisch nach Ausführen der Falsch-Logik
}

 }


else if (s.type === "animals") {
  clearTimeouts();
  renderFrogProgress(lastSessionIdx, idx);
  document.querySelectorAll(".floating-video, .centered-next-btn, .reward-container").forEach(el => el.remove());
  const textArea = document.getElementById("sessionTextArea");
  textArea.innerHTML = "";

  // Überschrift bleibt immer oben
  const heading = document.createElement('h2');
  heading.className = "session-heading";
  heading.textContent = s.title || "Guess the Animal!";
  heading.style.textAlign = "center";
  heading.style.margin = "18px 0 8px 0";
  heading.style.fontSize = "2.2rem";
  textArea.appendChild(heading);

  // Fester Wrapper für Zentrierung
  const mainWrap = document.createElement('div');
  mainWrap.style.display = "flex";
  mainWrap.style.flexDirection = "column";
  mainWrap.style.justifyContent = "center";
  mainWrap.style.alignItems = "center";
  mainWrap.style.minHeight = "55vh";
  mainWrap.style.width = "100%";
  textArea.appendChild(mainWrap);

  // Musik abspielen (aus JSON)
  let sessionMusic = null;
  if (s.music) {
    sessionMusic = new Audio("audio/" + s.music);
    sessionMusic.loop = true;
    sessionMusic.volume = 0.17;
    sessionMusic.play();
    document.addEventListener("visibilitychange", function musicPauseHandler() {
      if (document.hidden && sessionMusic) sessionMusic.pause();
      else if (!document.hidden && sessionMusic) sessionMusic.play();
    });
    window.addEventListener("pagehide", function() {
      if (sessionMusic) { sessionMusic.pause(); sessionMusic.currentTime = 0; }
    });
  }

  // Video unten rechts (wie immer)
  let videoBox, video;
  if (s.video) {
    video = document.createElement('video');
    video.src = `videos/${s.video}`;
    video.setAttribute("controls", "true");
    video.setAttribute("controlsList", "nodownload");
    video.autoplay = false;
    video.muted = false;
    video.playsInline = true;
    video.poster = "images/video-placeholder.png";
    video.className = "session-video";

    videoBox = document.createElement("div");
    videoBox.className = "floating-video";
    videoBox.style.position = "fixed";
    videoBox.style.right = "14px";
    videoBox.style.bottom = "62px";
    videoBox.style.zIndex = "1000";
    videoBox.appendChild(video);
    document.body.appendChild(videoBox);

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

    playBtn.onclick = function () {
      video.play();
      playBtn.style.display = "none";
      video.style.pointerEvents = "auto";
    };
    video.addEventListener('play', () => {
      playBtn.style.display = "none";
      video.style.pointerEvents = "auto";
    });
    video.addEventListener('pause', () => {
      playBtn.style.display = "";
      video.style.pointerEvents = "none";
    });
    video.addEventListener('ended', () => {
      playBtn.style.display = "";
      video.style.pointerEvents = "none";
      showAnimalsGame();
    });
  } else {
    showAnimalsGame();
  }

  // Zeitsteuerung (minDuration aus JSON, Default 60s)
  const sessionStart = Date.now();
  const minDuration = s.minDuration ? parseInt(s.minDuration, 10) : 60;
  const pauseBetweenAnimals = s.pauseBetweenAnimals || 1800; // Millisekunden (1.8s Standard)

  // Mehrere Tiere pro Session
  let currentItem = 0;

  function showAnimalsGame() {
    mainWrap.innerHTML = "";

    function showAnimal(idx) {
      mainWrap.innerHTML = "";

      const animal = s.items[idx];

      // Tiergeräusch abspielen (optional)
      // Play Sound Again Button + automatisches Abspielen
      if (animal.sound) {
        const soundBtn = document.createElement("button");
        soundBtn.textContent = "🔊 Play Sound Again";
        soundBtn.className = "bounce-glow";
        soundBtn.style.margin = "0 0 12px 0";
        soundBtn.style.padding = "0.5em 1.7em";
        soundBtn.style.fontSize = "1.14rem";
        soundBtn.style.fontWeight = "bold";
        soundBtn.style.borderRadius = "21px";
        soundBtn.style.background = "linear-gradient(90deg,#fffde7,#ffe082,#ffd54f)";
        soundBtn.style.color = "#222";
        soundBtn.style.boxShadow = "0 3px 18px #ffe08277";
        soundBtn.style.border = "none";
        soundBtn.style.cursor = "pointer";
        soundBtn.style.position = "relative";
        soundBtn.style.overflow = "hidden";

        // Shine-Animation
        const shine = document.createElement("span");
        shine.style.position = "absolute";
        shine.style.top = "0";
        shine.style.left = "-70%";
        shine.style.width = "50%";
        shine.style.height = "100%";
        shine.style.background = "linear-gradient(120deg,rgba(255,255,255,0.6) 0%,rgba(255,255,255,0) 60%)";
        shine.style.pointerEvents = "none";
        shine.style.transform = "skewX(-22deg)";
        shine.style.transition = "left 0.7s";
        soundBtn.appendChild(shine);

        soundBtn.addEventListener("mouseenter", function() {
          shine.style.left = "110%";
          setTimeout(() => { shine.style.left = "-70%"; }, 700);
        });

        soundBtn.onclick = () => {
          soundBtn.style.transform = "scale(1.17)";
          setTimeout(() => soundBtn.style.transform = "scale(1)", 170);

          const sound = new Audio(animal.sound);
          sound.play();
        };

        // Animation style (CSS only 1x anlegen)
        if (!document.getElementById("animals-btn-bounce-style")) {
          const style = document.createElement('style');
          style.id = "animals-btn-bounce-style";
          style.innerHTML = `
            .bounce-glow {
              animation: bounceBtn 1.2s infinite alternate;
              transition: box-shadow 0.25s;
            }
            @keyframes bounceBtn {
              0%   { box-shadow: 0 3px 18px #ffe08277; transform: scale(1); }
              70%  { box-shadow: 0 6px 28px #ffe082ee; transform: scale(1.07);}
              100% { box-shadow: 0 3px 18px #ffe08277; transform: scale(1);}
            }
          `;
          document.head.appendChild(style);
        }

        mainWrap.appendChild(soundBtn);

        // Direkt beim Start einmal abspielen:
        const sound = new Audio(animal.sound);
        sound.play();
      }

      // Hinweis-Text
      const hints = Array.isArray(animal.hints) ? animal.hints : [animal.hints];
      hints.forEach(hint => {
        const p = document.createElement('div');
        p.className = "animated-text";
        p.textContent = hint;
        p.style.textAlign = "center";
        p.style.fontSize = "1.13rem";
        p.style.margin = "0 0 6px 0";
        p.style.color = "#444";
        mainWrap.appendChild(p);
      });

      // Auswahlmöglichkeiten als Buttons oder Bilder
      const choicesBox = document.createElement('div');
      choicesBox.style.display = "flex";
      choicesBox.style.justifyContent = "center";
      choicesBox.style.gap = "18px";
      choicesBox.style.margin = "18px 0 0 0";
      mainWrap.appendChild(choicesBox);

      animal.choices.forEach((img, i) => {
        const btn = document.createElement('button');
        btn.innerHTML = `<img src="${img}" alt="choice" style="width:72px;height:72px;border-radius:12px;">`;
        btn.style.border = "none";
        btn.style.background = "#fffbe6";
        btn.style.borderRadius = "13px";
        btn.style.boxShadow = "0 2px 10px #81d4fa88";
        btn.style.cursor = "pointer";
        btn.onclick = () => handleChoice(btn, i, animal.correct, img);
        choicesBox.appendChild(btn);
      });

      function handleChoice(btn, i, correctIdx, imgSrc) {
        new Audio(`audio/${i === correctIdx ? "yay.mp3" : "fail.mp3"}`).play();

        if (i === correctIdx) {
          Array.from(choicesBox.children).forEach(b => { if (b !== btn) b.style.opacity = "0.4"; });
          btn.style.border = "3px solid #43a047";
          btn.style.background = "#c8e6c9";
          btn.disabled = true;

          // Nächste Aufgabe oder Belohnung
          setTimeout(() => {
            if (currentItem < s.items.length - 1) {
              const nextMsg = document.createElement("div");
              nextMsg.textContent = "Great! Here comes the next animal...";
              nextMsg.style.textAlign = "center";
              nextMsg.style.color = "#43a047";
              nextMsg.style.fontSize = "1.12rem";
              nextMsg.style.fontWeight = "bold";
              nextMsg.style.margin = "14px 0 2px 0";
              mainWrap.appendChild(nextMsg);

              setTimeout(() => {
                nextMsg.remove();
                currentItem++;
                showAnimal(currentItem);
              }, pauseBetweenAnimals);
            } else {
              if (sessionMusic) { sessionMusic.pause(); sessionMusic.currentTime = 0; }
              const elapsed = (Date.now() - sessionStart) / 1000;
              if (elapsed >= minDuration) {
                showUniversalRewardFromSession(s);
              } else {
                const waitTime = Math.ceil(minDuration - elapsed);
                showLoadingOverlay(`⏳ Please wait ${waitTime}s...`, waitTime * 1000, () => {
                  showUniversalRewardFromSession(s);
                });
              }
            }
          }, 1000); // Kurze Pause nach richtiger Antwort für Animation/Feedback!
        } else {
          btn.style.border = "3px solid #d32f2f";
          btn.style.background = "#ffcdd2";
          btn.disabled = true;
          setTimeout(() => {
            btn.style.border = "none";
            btn.style.background = "#fffbe6";
            btn.disabled = false;
          }, 900);
        }
      }
    }
    showAnimal(currentItem);
  }
}

  // ==== Modul: RHYME ====
  else if (s.type === "rhymeold") {
  // 0) Aufräumen & Fortschritt
  clearTimeouts();
  renderFrogProgress(lastSessionIdx, idx);
  document.querySelectorAll(".floating-video, .centered-next-btn").forEach(el => el.remove());
  const textArea = document.getElementById("sessionTextArea");
  textArea.innerHTML = "";

  // 1) Überschrift
  const heading = document.createElement("h2");
  heading.className = "session-heading";
  heading.textContent = "Find the Rhyme!";
  heading.style.textAlign = "center";
  textArea.appendChild(heading);

  // 2) Video + Tap-to-Play Overlay (optional)
  let videoBox, video;
  if (s.video) {
    video = document.createElement("video");
    video.src = `videos/${s.video}`;
    video.playsInline = true;
    video.autoplay = false;
    video.muted = false;
    video.className = "session-video";

    videoBox = document.createElement("div");
    videoBox.className = "floating-video";
    videoBox.appendChild(video);
    document.body.appendChild(videoBox);

    const playBtn = document.createElement("button");
    playBtn.className = "custom-play-btn";
    playBtn.title = "Play";
    playBtn.innerHTML = `
      <svg viewBox="0 0 60 60">
        <circle cx="30" cy="30" r="28" fill="none"/>
        <polygon points="22,16 46,30 22,44" fill="#383838"/>
      </svg>
    `;
    videoBox.appendChild(playBtn);

    playBtn.addEventListener("click", () => {
      video.play();
      playBtn.style.display = "none";
    });
    video.addEventListener("play", () => playBtn.style.display = "none");
    video.addEventListener("ended", () => {
    // Avatar dynamisch aus JSON!
    showAvatarInVideoBox(videoBox, s.avatar || "benny"); // Fallback = Benny
    setTimeout(showQuestionAndChoices, 300);
    });
  } else {
    showQuestionAndChoices();
  }

  // 3) Frage & Buttons anzeigen
  function showQuestionAndChoices() {
  // Frage
  const questionDiv = document.createElement("div");
  questionDiv.className = "animated-text";
  questionDiv.style.textAlign = "center";
  questionDiv.style.fontSize = "1.19rem";
  questionDiv.style.margin = "18px auto 12px";
  questionDiv.textContent = s.question;
  textArea.appendChild(questionDiv);

  // Buttons-Container
  const box = document.createElement("div");
  box.className = "rhyme-buttons";
  box.style.display = "flex";
  box.style.flexDirection = "column";
  box.style.alignItems = "center";
  box.style.width = "100%";
  box.style.maxWidth = "440px";
  box.style.margin = "0 auto";
  box.style.padding = "0 12px";

  // Wahlmöglichkeiten
  s.choices.forEach((word, i) => {
    const btn = document.createElement("button");
    btn.style.border = "none";
    btn.style.background = "#fffbe6";
    btn.style.fontSize = "1.44rem";
    btn.style.fontWeight = "700";
    btn.style.padding = "0.9em 1.7em";
    btn.style.borderRadius = "16px";
    btn.style.boxShadow = "0 2px 10px #81d4fa88";
    btn.style.cursor = "pointer";
    btn.textContent = word;
    btn.addEventListener("click", () => handleChoice(btn, i));
    box.appendChild(btn);
  });

  // **Hier der entscheidende Befehl!**
  textArea.appendChild(box);
}


  // 4) Auswahl verarbeiten
  function handleChoice(btn, i) {
  // Feedback-Sound
  new Audio(`audio/${i === s.correct ? "yay.mp3" : "fail.mp3"}`).play();

  // vorheriges Feedback entfernen
  const prev = document.querySelector(".rhyme-feedback");
  if (prev) prev.remove();

  // Feedback-Element
  const feedback = document.createElement("div");
  feedback.className = "animated-text rhyme-feedback";
  feedback.style.textAlign = "center";
  feedback.style.marginTop = "17px";

  if (i === s.correct) {
    // Antwort-Buttons entfernen
    document.querySelectorAll('.rhyme-buttons').forEach(e => e.remove());

    showUniversalReward(
      s.choices[i],
      s.onCorrect || "",
      null, // oder null statt Callback, damit Next nur einmal kommt
      0
    );
    return;
  }

  // FALSCH-Logik (Feedback anzeigen)
  feedback.style.color = "#d32f2f";
  feedback.style.fontWeight = "bold";
  feedback.textContent = s.onWrong || "Oops, that's not right. Try again!";
  textArea.appendChild(feedback);

  btn.classList.add("shake");
  setTimeout(() => btn.classList.remove("shake"), 600);
  setTimeout(() => {
    if (feedback.parentNode) feedback.remove();
  }, 1600);
}
  }

else if (s.type === "rhyme") {
  clearTimeouts();
  renderFrogProgress(lastSessionIdx, idx);
  document.querySelectorAll(".floating-video, .centered-next-btn, .reward-container").forEach(el => el.remove());
  const textArea = document.getElementById("sessionTextArea");
  textArea.innerHTML = "";

  // Überschrift immer oben, groß
  const heading = document.createElement("h2");
  heading.className = "session-heading";
  heading.textContent = s.title || "Find the Rhymes!";
  heading.style.textAlign = "center";
  heading.style.margin = "18px 0 8px 0";
  heading.style.fontSize = "2.2rem";
  textArea.appendChild(heading);

  // Musik abspielen (aus JSON)
  let sessionMusic = null;
  if (s.music) {
    sessionMusic = new Audio("audio/" + s.music);
    sessionMusic.loop = true;
    sessionMusic.volume = 0.16;
    sessionMusic.play();
    document.addEventListener("visibilitychange", function musicPauseHandler() {
      if (document.hidden && sessionMusic) sessionMusic.pause();
      else if (!document.hidden && sessionMusic) sessionMusic.play();
    });
    window.addEventListener("pagehide", function() {
      if (sessionMusic) { sessionMusic.pause(); sessionMusic.currentTime = 0; }
    });
  }

  // Video unten rechts (wie immer)
  let videoBox, video;
  if (s.video) {
    video = document.createElement('video');
    video.src = `videos/${s.video}`;
    video.setAttribute("controls", "true");
    video.setAttribute("controlsList", "nodownload");
    video.autoplay = false;
    video.muted = false;
    video.playsInline = true;
    video.poster = "images/video-placeholder.png";
    video.className = "session-video";

    videoBox = document.createElement("div");
    videoBox.className = "floating-video";
    videoBox.style.position = "fixed";
    videoBox.style.right = "14px";
    videoBox.style.bottom = "62px";
    videoBox.style.zIndex = "1000";
    videoBox.appendChild(video);
    document.body.appendChild(videoBox);

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

    playBtn.onclick = function () {
      video.play();
      playBtn.style.display = "none";
      video.style.pointerEvents = "auto";
    };
    video.addEventListener('play', () => {
      playBtn.style.display = "none";
      video.style.pointerEvents = "auto";
    });
    video.addEventListener('pause', () => {
      playBtn.style.display = "";
      video.style.pointerEvents = "none";
    });
    video.addEventListener('ended', () => {
      playBtn.style.display = "";
      video.style.pointerEvents = "none";
      showRhymeQuestion();
    });
  } else {
    showRhymeQuestion();
  }

  // Multi-Question-Support
  const questions = Array.isArray(s.questions) ? s.questions : [];
  let qIdx = 0;
  const sessionStart = Date.now();
  const minDuration = s.minDuration ? parseInt(s.minDuration, 10) : 60;
  const pauseAfterCorrect = s.pauseAfterCorrect || 1700;

  function showRhymeQuestion() {
    textArea.querySelectorAll(".mainWrapRhyme, .rhyme-feedback").forEach(e => e.remove());
    const mainWrap = document.createElement('div');
    mainWrap.className = "mainWrapRhyme";
    mainWrap.style.display = "flex";
    mainWrap.style.flexDirection = "column";
    mainWrap.style.justifyContent = "center";
    mainWrap.style.alignItems = "center";
    mainWrap.style.minHeight = "54vh";
    mainWrap.style.width = "100%";
    textArea.appendChild(mainWrap);

    // Frage
    const currentQ = questions[qIdx];
    const questionDiv = document.createElement("div");
    questionDiv.className = "animated-text";
    questionDiv.textContent = currentQ.question || "What rhymes with ...?";
    questionDiv.style.textAlign = "center";
    questionDiv.style.fontSize = "1.27rem";
    questionDiv.style.margin = "0 0 17px 0";
    questionDiv.style.fontWeight = "bold";
    mainWrap.appendChild(questionDiv);

    // Buttons (Antwortmöglichkeiten)
    const choicesBox = document.createElement("div");
    choicesBox.style.display = "flex";
    choicesBox.style.flexDirection = "column";
    choicesBox.style.alignItems = "center";
    choicesBox.style.gap = "18px";
    choicesBox.style.margin = "15px 0 0 0";
    mainWrap.appendChild(choicesBox);

    currentQ.choices.forEach((word, i) => {
      const btn = document.createElement("button");
      btn.textContent = word;
      btn.style.border = "none";
      btn.style.background = "#fffbe6";
      btn.style.fontSize = "1.38rem";
      btn.style.fontWeight = "700";
      btn.style.padding = "0.85em 1.9em";
      btn.style.borderRadius = "18px";
      btn.style.boxShadow = "0 2px 10px #81d4fa88";
      btn.style.cursor = "pointer";
      btn.className = "rhyme-choice-btn bounce-glow";
      btn.style.transition = "transform 0.18s, box-shadow 0.22s";
      btn.onclick = () => handleChoice(btn, i);
      choicesBox.appendChild(btn);
    });

    // Bonus-Animation: Style für Buttons hinzufügen (nur 1x pro Session einfügen)
    if (!document.getElementById("rhyme-btn-bounce-style")) {
      const style = document.createElement('style');
      style.id = "rhyme-btn-bounce-style";
      style.innerHTML = `
        .bounce-glow {
          animation: bounceBtn 1.33s infinite alternate;
        }
        @keyframes bounceBtn {
          0% { box-shadow: 0 2px 10px #81d4fa88; transform: scale(1);}
          60%{ box-shadow: 0 7px 30px #ffd54f77; transform: scale(1.10);}
          100%{box-shadow: 0 2px 10px #81d4fa88; transform: scale(1);}
        }
      `;
      document.head.appendChild(style);
    }
  }

  function handleChoice(btn, i) {
    const currentQ = questions[qIdx];
    new Audio(`audio/${i === currentQ.correct ? "yay.mp3" : "fail.mp3"}`).play();

    // vorheriges Feedback entfernen
    const prev = textArea.querySelector(".rhyme-feedback");
    if (prev) prev.remove();

    // Feedback-Element
    const feedback = document.createElement("div");
    feedback.className = "animated-text rhyme-feedback";
    feedback.style.textAlign = "center";
    feedback.style.marginTop = "17px";
    feedback.style.fontWeight = "bold";
    feedback.style.fontSize = "1.13rem";

    if (i === currentQ.correct) {
      // Antwort-Buttons deaktivieren und animieren
      Array.from(btn.parentNode.children).forEach((b, idx) => {
        if (b !== btn) b.style.opacity = "0.5";
        b.disabled = true;
      });
      btn.style.background = "#b2dfdb";
      btn.style.transform = "scale(1.18)";
      setTimeout(() => btn.style.transform = "scale(1)", 180);

      feedback.textContent = currentQ.onCorrect || "Great! That's the rhyme!";
      feedback.style.color = "#388e3c";
      textArea.appendChild(feedback);

      setTimeout(() => {
  taskIdx++;
  if (taskIdx < tasks.length) {
    // Nächste Frage laden, OHNE Reward!
    showLoadingOverlay("Next question loading...", 1200, showShadowTask); // oder showPatternQuestion etc.
  } else {
    // Session vorbei – erst jetzt Reward & ggf. Zeitsteuerung
    if (sessionMusic) { sessionMusic.pause(); sessionMusic.currentTime = 0; }
    const elapsed = (Date.now() - sessionStart) / 1000;
    if (elapsed >= minDuration) {
      showUniversalRewardFromSession(s); // HIER der Reward!
    } else {
      const waitTime = Math.ceil(minDuration - elapsed);
      showLoadingOverlay(`⏳ Please wait ${waitTime}s...`, waitTime * 1000, () => {
        showUniversalRewardFromSession(s);
      });
    }
  }
}, pauseAfterCorrect);

      return;
    }

    // Falsch-Logik (Feedback anzeigen)
    feedback.style.color = "#d32f2f";
    feedback.textContent = currentQ.onWrong || "Oops, that's not right. Try again!";
    textArea.appendChild(feedback);

    btn.classList.add("shake");
    setTimeout(() => btn.classList.remove("shake"), 650);
    setTimeout(() => {
      if (feedback.parentNode) feedback.remove();
    }, 1400);
  }
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



  
// ==== Modul: PATTERN ====
 else if (s.type === "patternold") {
  clearTimeouts();
  renderFrogProgress(lastSessionIdx, idx);
  document.querySelectorAll(".floating-video, .centered-next-btn").forEach(el => el.remove());
  const textArea = document.getElementById("sessionTextArea");
  textArea.innerHTML = "";

  // --- Hintergrundmusik starten ---
  let patternMusic;
  if (s.music) {
    patternMusic = new Audio("audio/" + s.music);
    patternMusic.loop = true;
    patternMusic.volume = 0.24;
    patternMusic.play();
  }

  // Überschrift
  const heading = document.createElement("h2");
  heading.className = "session-heading";
  heading.textContent = s.title || "What comes next?";
  heading.style.textAlign = "center";
  textArea.appendChild(heading);

  // --- Video mit Play-Button ---
  const video = document.createElement("video");
  video.src = "videos/" + s.video;
  video.playsInline = true;
  video.autoplay = false;
  video.muted = false;
  video.className = "session-video";
  video.poster = "images/video-placeholder.png";
  const videoBox = document.createElement("div");
  videoBox.className = "floating-video";
  videoBox.appendChild(video);
  document.body.appendChild(videoBox);

  // Play-Button
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

  // --- Pattern-Fragefeld (initial unsichtbar) ---
  const patternBox = document.createElement("div");
  patternBox.style.display = "flex";
  patternBox.style.justifyContent = "center";
  patternBox.style.gap = "12px";
  patternBox.style.margin = "18px 0 7px";
  patternBox.style.flexWrap = "wrap";
  patternBox.style.maxWidth = "95vw";
  patternBox.style.fontSize = "2.1rem";
  patternBox.style.fontWeight = "bold";
  patternBox.style.overflowX = "auto";
  patternBox.style.padding = "0 10px";
  patternBox.style.visibility = "hidden";
  patternBox.id = "patternBox";
  textArea.appendChild(patternBox);

  (s.pattern || []).forEach((n, i) => {
    const el = document.createElement("div");
    el.style.minWidth = "52px";
    el.style.minHeight = "48px";
    el.style.background = n === "?" ? "#ffd54f" : "#fffbe6";
    el.style.margin = "0 4px";
    el.style.borderRadius = "12px";
    el.style.boxShadow = "0 2px 8px #b2dfdb99";
    el.style.display = "flex";
    el.style.justifyContent = "center";
    el.style.alignItems = "center";
    el.style.fontSize = "2.1rem";
    el.textContent = n;
    patternBox.appendChild(el);
  });

  // --- Frage und Antworten-Container (initial unsichtbar) ---
  const questionDiv = document.createElement("div");
  questionDiv.className = "animated-text";
  questionDiv.style.textAlign = "center";
  questionDiv.style.fontSize = "1.19rem";
  questionDiv.style.margin = "8px 0 12px";
  questionDiv.style.visibility = "hidden";
  questionDiv.textContent = s.question || "What comes next in the pattern?";
  textArea.appendChild(questionDiv);

  const answersBox = document.createElement("div");
  answersBox.className = "pattern-answers";
  answersBox.style.display = "flex";
  answersBox.style.justifyContent = "center";
  answersBox.style.gap = "16px";
  answersBox.style.flexWrap = "wrap";
  answersBox.style.margin = "8px 0 0";
  answersBox.style.padding = "0 8px";
  answersBox.style.visibility = "hidden";
  textArea.appendChild(answersBox);

  // Video-Event-Handler
  playBtn.addEventListener("click", () => {
    video.play();
    playBtn.style.display = "none";
    video.style.pointerEvents = "auto";
    patternBox.style.visibility = "visible";
    questionDiv.style.visibility = "visible";
  });
  video.addEventListener("play", () => {
    playBtn.style.display = "none";
    video.style.pointerEvents = "auto";
    patternBox.style.visibility = "visible";
    questionDiv.style.visibility = "visible";
  });
  video.addEventListener("pause", () => {
    playBtn.style.display = "";
    video.style.pointerEvents = "none";
  });
  video.addEventListener("ended", () => {
    playBtn.style.display = "";
    video.style.pointerEvents = "none";
    showAvatarInVideoBox(videoBox, "benny");
    answersBox.style.visibility = "visible";
    renderAnswers();
  });

  // Antworten rendern
  function renderAnswers() {
    answersBox.innerHTML = "";
    (s.answers || []).forEach((ans, i) => {
      const btn = document.createElement("button");
      btn.style.border = "none";
      btn.style.background = "#fffbe6";
      btn.style.fontSize = "1.5rem";
      btn.style.fontWeight = "bold";
      btn.style.padding = "0.92em 1.44em";
      btn.style.borderRadius = "18px";
      btn.style.boxShadow = "0 2px 10px #81d4fa88";
      btn.style.cursor = "pointer";
      btn.style.margin = "4px 0";
      btn.style.minWidth = "88px";
      btn.style.transition = "all 0.2s";
      btn.textContent = ans;
      btn.addEventListener("click", () => handleAnswer(btn, i));
      answersBox.appendChild(btn);
    });
  }

  // Antwort-Feedback
  let feedbackDiv = null;
  function handleAnswer(btn, i) {
  if (feedbackDiv) feedbackDiv.remove();
  new Audio(`audio/${i === s.correct ? "yay.mp3" : "fail.mp3"}`).play();

  feedbackDiv = document.createElement("div");
  feedbackDiv.className = "animated-text";
  feedbackDiv.style.textAlign = "center";
  feedbackDiv.style.fontSize = "1.22rem";
  feedbackDiv.style.fontWeight = "600";
  feedbackDiv.style.margin = "18px 0 8px";
  feedbackDiv.style.minHeight = "30px";
  feedbackDiv.style.transition = "all 0.22s";

  if (i === s.correct) {
    // ... wie im letzten Schritt beschrieben ...
    feedbackDiv.classList.add("glitter");
    feedbackDiv.textContent = s.onCorrect || "Great job! You found the right number!";
    textArea.insertBefore(feedbackDiv, answersBox);

    Array.from(answersBox.children).forEach((c, idx) => {
      if (idx !== i) c.style.display = "none";
    });

    showUniversalReward(
      s.answers[i],
      s.onCorrect || "",
      null,
      s.successSticker || 0
    );
    return;
  }
  
 

  // Falsch-Logik – rotes Feedback und Shake-Effekt
  feedbackDiv.textContent = s.onWrong || "Oops, that's not right. Try again!";
  feedbackDiv.style.color = "#d32f2f";
  textArea.insertBefore(feedbackDiv, answersBox);

  btn.classList.add("shake");
  setTimeout(() => btn.classList.remove("shake"), 600);
  setTimeout(() => {
    if (feedbackDiv.parentNode) feedbackDiv.remove();
  }, 1500);
}
 }


else if (s.type === "pattern") {
  clearTimeouts();
  renderFrogProgress(lastSessionIdx, idx);
  document.querySelectorAll(".floating-video, .centered-next-btn, .reward-container").forEach(el => el.remove());
  const textArea = document.getElementById("sessionTextArea");
  textArea.innerHTML = "";

  // Überschrift
  const heading = document.createElement("h2");
  heading.className = "session-heading";
  heading.textContent = s.title || "What comes next?";
  heading.style.textAlign = "center";
  heading.style.margin = "18px 0 8px 0";
  heading.style.fontSize = "2.2rem";
  textArea.appendChild(heading);

  // Hauptbereich
  const mainWrap = document.createElement('div');
  mainWrap.style.display = "flex";
  mainWrap.style.flexDirection = "column";
  mainWrap.style.justifyContent = "center";
  mainWrap.style.alignItems = "center";
  mainWrap.style.minHeight = "54vh";
  mainWrap.style.width = "100%";
  textArea.appendChild(mainWrap);

  // Musik abspielen (aus JSON)
  let sessionMusic = null;
  if (s.music) {
    sessionMusic = new Audio("audio/" + s.music);
    sessionMusic.loop = true;
    sessionMusic.volume = 0.15;
    sessionMusic.play();
    document.addEventListener("visibilitychange", function musicPauseHandler() {
      if (document.hidden && sessionMusic) sessionMusic.pause();
      else if (!document.hidden && sessionMusic) sessionMusic.play();
    });
    window.addEventListener("pagehide", function() {
      if (sessionMusic) { sessionMusic.pause(); sessionMusic.currentTime = 0; }
    });
  }

  // Video unten rechts
  let videoBox, video;
  if (s.video) {
    video = document.createElement("video");
    video.src = `videos/${s.video}`;
    video.setAttribute("controls", "true");
    video.setAttribute("controlsList", "nodownload");
    video.autoplay = false;
    video.muted = false;
    video.playsInline = true;
    video.poster = "images/video-placeholder.png";
    video.className = "session-video";

    videoBox = document.createElement("div");
    videoBox.className = "floating-video";
    videoBox.style.position = "fixed";
    videoBox.style.right = "14px";
    videoBox.style.bottom = "62px";
    videoBox.style.zIndex = "1000";
    videoBox.appendChild(video);
    document.body.appendChild(videoBox);

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

    playBtn.onclick = function () {
      video.play();
      playBtn.style.display = "none";
      video.style.pointerEvents = "auto";
    };
    video.addEventListener('play', () => {
      playBtn.style.display = "none";
      video.style.pointerEvents = "auto";
    });
    video.addEventListener('pause', () => {
      playBtn.style.display = "";
      video.style.pointerEvents = "none";
    });
    video.addEventListener('ended', () => {
      playBtn.style.display = "";
      video.style.pointerEvents = "none";
      showPatternQuestion();
    });
  } else {
    showPatternQuestion();
  }

  // Fragen & Zeitsteuerung
  const tasks = Array.isArray(s.tasks) ? s.tasks : [s];
  let taskIdx = 0;
  const sessionStart = Date.now();
  const minDuration = s.minDuration ? parseInt(s.minDuration, 10) : 60;
  const pauseAfterCorrect = s.pauseAfterCorrect || 1600;

  function showPatternQuestion() {
    mainWrap.innerHTML = "";

    // Pattern anzeigen (als bunte Boxen/Symbole/Zahlen/Bilder)
    const patternRow = document.createElement("div");
    patternRow.style.display = "flex";
    patternRow.style.justifyContent = "center";
    patternRow.style.gap = "14px";
    patternRow.style.margin = "16px 0 7px 0";
    patternRow.style.flexWrap = "wrap";
    patternRow.style.fontSize = "2.1rem";
    patternRow.style.fontWeight = "bold";
    patternRow.style.overflowX = "auto";
    patternRow.style.padding = "0 10px";

    const pattern = tasks[taskIdx].pattern || [];
    pattern.forEach(item => {
      const el = document.createElement("div");
      el.style.minWidth = "48px";
      el.style.minHeight = "46px";
      el.style.background = (item === "?" ? "#ffd54f" : "#fffbe6");
      el.style.margin = "0 2.5px";
      el.style.borderRadius = "14px";
      el.style.boxShadow = "0 2px 8px #b2dfdb99";
      el.style.display = "flex";
      el.style.justifyContent = "center";
      el.style.alignItems = "center";
      el.style.fontSize = "2.1rem";
      el.textContent = item;
      patternRow.appendChild(el);
    });
    mainWrap.appendChild(patternRow);

    // Frage
    const questionDiv = document.createElement("div");
    questionDiv.className = "animated-text";
    questionDiv.textContent = tasks[taskIdx].question || "What comes next in the pattern?";
    questionDiv.style.textAlign = "center";
    questionDiv.style.fontSize = "1.15rem";
    questionDiv.style.margin = "12px 0 11px 0";
    questionDiv.style.fontWeight = "bold";
    mainWrap.appendChild(questionDiv);

    // Antwortmöglichkeiten
    const answersBox = document.createElement("div");
    answersBox.style.display = "flex";
    answersBox.style.justifyContent = "center";
    answersBox.style.gap = "16px";
    answersBox.style.flexWrap = "wrap";
    answersBox.style.margin = "8px 0 0 0";
    answersBox.style.padding = "0 8px";
    mainWrap.appendChild(answersBox);

    (tasks[taskIdx].answers || []).forEach((ans, i) => {
      const btn = document.createElement("button");
      btn.style.border = "none";
      btn.style.background = "#fffbe6";
      btn.style.fontSize = "1.5rem";
      btn.style.fontWeight = "bold";
      btn.style.padding = "0.92em 1.44em";
      btn.style.borderRadius = "18px";
      btn.style.boxShadow = "0 2px 10px #81d4fa88";
      btn.style.cursor = "pointer";
      btn.style.margin = "4px 0";
      btn.style.minWidth = "88px";
      btn.style.transition = "all 0.2s";
      btn.classList.add("bounce-glow");
      btn.textContent = ans;
      btn.onclick = () => handleAnswer(btn, i);
      answersBox.appendChild(btn);
    });

    // Bonus-Animation: Button-Bounce
    if (!document.getElementById("pattern-btn-bounce-style")) {
      const style = document.createElement('style');
      style.id = "pattern-btn-bounce-style";
      style.innerHTML = `
        .bounce-glow {
          animation: bounceBtn 1.24s infinite alternate;
        }
        @keyframes bounceBtn {
          0% { box-shadow: 0 2px 10px #81d4fa88; transform: scale(1);}
          65%{ box-shadow: 0 7px 30px #ffd54f77; transform: scale(1.11);}
          100%{box-shadow: 0 2px 10px #81d4fa88; transform: scale(1);}
        }
      `;
      document.head.appendChild(style);
    }
  }

  function handleAnswer(btn, i) {
    const currentTask = tasks[taskIdx];
    new Audio(`audio/${i === currentTask.correct ? "yay.mp3" : "fail.mp3"}`).play();

    // Feedback-Element
    let feedback = mainWrap.querySelector(".pattern-feedback");
    if (!feedback) {
      feedback = document.createElement("div");
      feedback.className = "animated-text pattern-feedback";
      feedback.style.textAlign = "center";
      feedback.style.marginTop = "15px";
      feedback.style.fontWeight = "bold";
      feedback.style.fontSize = "1.13rem";
      mainWrap.appendChild(feedback);
    }

    if (i === currentTask.correct) {
      // Buttons deaktivieren
      Array.from(btn.parentNode.children).forEach((b, idx) => {
        if (b !== btn) b.style.opacity = "0.5";
        b.disabled = true;
      });
      btn.style.background = "#b2dfdb";
      btn.style.transform = "scale(1.13)";
      setTimeout(() => btn.style.transform = "scale(1)", 150);

      feedback.textContent = currentTask.onCorrect || "Great job! You found the pattern!";
      feedback.style.color = "#388e3c";

      setTimeout(() => {
  taskIdx++;
  if (taskIdx < tasks.length) {
    // Nächste Frage laden, OHNE Reward!
    showLoadingOverlay("Next question loading...", 1200, showPatternQuestion);
  } else {
    // Session vorbei – erst jetzt Reward & ggf. Zeitsteuerung
    if (sessionMusic) { sessionMusic.pause(); sessionMusic.currentTime = 0; }
    const elapsed = (Date.now() - sessionStart) / 1000;
    if (elapsed >= minDuration) {
      showUniversalRewardFromSession(s); // HIER der Reward!
    } else {
      const waitTime = Math.ceil(minDuration - elapsed);
      showLoadingOverlay(`⏳ Please wait ${waitTime}s...`, waitTime * 1000, () => {
        showUniversalRewardFromSession(s);
      });
    }
  }
}, pauseAfterCorrect);


    } else {
      feedback.style.color = "#d32f2f";
      feedback.textContent = currentTask.onWrong || "Oops, that's not right. Try again!";
      btn.classList.add("shake");
      setTimeout(() => btn.classList.remove("shake"), 650);
      setTimeout(() => {
        if (feedback.parentNode) feedback.remove();
      }, 1400);
    }
  }
}



// ==== Modul: CHATGPT-QUIZ ====
 else if (s.type === "chatgpt-quiz-old") {
  clearTimeouts();
  renderFrogProgress(lastSessionIdx, idx);
  document.querySelectorAll(".floating-video, .centered-next-btn").forEach(el => el.remove());
  const textArea = document.getElementById("sessionTextArea");

  // Nur beim ersten Aufruf Header einfügen
  if (!document.querySelector(".chatgpt-quiz-header")) {
    const headerWrap = document.createElement("div");
    headerWrap.className = "chatgpt-quiz-header";
    const heading = document.createElement("div");
    heading.className = "chatgpt-quiz-heading";
    heading.innerHTML = "🧠 Quiz Time!";
    headerWrap.appendChild(heading);
    textArea.appendChild(headerWrap);
  }

  let currentQ = 0;
  const totalQ = Array.isArray(s.questions) ? s.questions.length : 1;

  if (s.video) {
    const video = document.createElement("video");
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
    document.body.appendChild(videoBox);

    const playBtn = document.createElement("button");
    playBtn.className = "custom-play-btn";
    playBtn.title = "Play";
    playBtn.innerHTML = `
      <svg viewBox="0 0 60 60">
        <circle cx="30" cy="30" r="28" fill="none"/>
        <polygon points="22,16 46,30 22,44" fill="#383838"/>
      </svg>
    `;
    videoBox.appendChild(playBtn);

    playBtn.addEventListener("click", () => {
      video.play();
      playBtn.style.display = "none";
      video.style.pointerEvents = "auto";
    });
    video.addEventListener("play", () => {
      playBtn.style.display = "none";
      video.style.pointerEvents = "auto";
    });
    video.addEventListener("pause", () => {
      playBtn.style.display = "";
      video.style.pointerEvents = "none";
    });
    video.addEventListener("ended", () => {
      if (s.avatar) showAvatarInVideoBox(videoBox, s.avatar);
      setTimeout(showQuizQuestion, 400);
    });
  } else {
    showQuizQuestion();
  }

  function showQuizQuestion() {
    // Header belassen, Rest leeren
    Array.from(textArea.children).forEach((child, i) => {
      if (i > 0) child.remove();
    });

    const q = s.questions[currentQ];
    // Fortschrittsbalken
    const progress = document.createElement("div");
    progress.style.display = "flex";
    progress.style.justifyContent = "center";
    progress.style.gap = "10px";
    progress.style.margin = "6px 0 10px";
    for (let i = 0; i < totalQ; i++) {
      const dot = document.createElement("div");
      dot.style.width = "16px";
      dot.style.height = "16px";
      dot.style.borderRadius = "50%";
      dot.style.boxShadow = "0 1px 4px #b3e5fc88";
      dot.style.background = i < currentQ ? "#aed581" : (i === currentQ ? "#ffca28" : "#eee");
      progress.appendChild(dot);
    }
    textArea.appendChild(progress);

    // Frage
    const question = document.createElement("div");
    question.className = "chatgpt-question animated-text fade-in-up";
    question.textContent = q.question;
    textArea.appendChild(question);

    const box = document.createElement("div");
    box.className = "chatgpt-quiz-buttons";
    textArea.appendChild(box);

    const shuffled = q.answers.map((text, i) => ({ text, index: i }))
                              .sort(() => Math.random() - 0.5);

    shuffled.forEach((ansObj, j) => {
      const btn = document.createElement("button");
      btn.style.border = "2px solid transparent";
      btn.style.background = "#fffbe6";
      btn.style.fontSize = "1.28rem";
      btn.style.fontWeight = "600";
      btn.style.padding = "0.6em 1.3em";
      btn.style.borderRadius = "16px";
      btn.style.boxShadow = "0 2px 8px #81d4fa88";
      btn.style.cursor = "pointer";
      btn.style.minWidth = "200px";
      btn.style.display = "flex";
      btn.style.justifyContent = "center";
      btn.style.alignItems = "center";
      btn.style.gap = "12px";
      btn.classList.add("animated-text", "fade-in-up");
      btn.style.animationDelay = `${0.3 + j * 0.15}s`;
      btn.style.animationDuration = "0.6s";
      btn.textContent = ansObj.text;
      btn.addEventListener("click", () => handleAnswer(btn, ansObj.index));
      box.appendChild(btn);
    });
  }

  function handleAnswer(btn, i) {
    const prev = document.querySelector(".quiz-feedback");
    if (prev) prev.remove();

    const feedback = document.createElement("div");
    feedback.className = "animated-text quiz-feedback fade-in-up";
    feedback.style.textAlign = "center";
    feedback.style.marginTop = "17px";

    const q = s.questions[currentQ];
    const correct = i === q.correct;
    feedback.textContent = correct ? (q.onCorrect || "Great!") : (q.onWrong || "Try again!");
    textArea.appendChild(feedback);

    const audio = new Audio(correct ? "audio/correct-bell.mp3" : "audio/wrong-boing.mp3");
    audio.volume = 0.75;
    audio.play();

    const icon = document.createElement("span");
    icon.textContent = correct ? " ✅" : " ❌";
    icon.style.fontSize = "1.4rem";
    btn.appendChild(icon);
    btn.style.background = correct ? "#c8e6c9" : "#ffcdd2";
    btn.style.border = correct ? "2px solid #388e3c" : "2px solid #d32f2f";

    if (correct) {
      currentQ++;
      setTimeout(() => {
        if (currentQ < totalQ) {
          showQuizQuestion();
        } else {
          showFinalReward();
        }
      }, 1000);
    } else {
      btn.classList.add("shake");
      setTimeout(() => btn.classList.remove("shake"), 600);
    }
  }

  function showFinalReward() {
  // Belass ruhig das Text-Feedback
  const msg = document.createElement("div");
  msg.className = "animated-text glitter fade-in-up";
  msg.style.textAlign = "center";
  msg.textContent = "Awesome! You finished the quiz!";
  textArea.appendChild(msg);

  new Audio("audio/yay.mp3").play();
  showUniversalReward(
  "Quiz Complete!",                    // Bildpfad ODER Text
  "",                        // Text darunter (hier leer)
  () => { currentSession++; renderSession(currentSession); },  // Callback-Funktion
  0                         // Sticker-Index
);
    
}
 }


else if (s.type === "chatgpt-quiz") {
  clearTimeouts();
  renderFrogProgress(lastSessionIdx, idx);
  document.querySelectorAll(".floating-video, .centered-next-btn, .reward-container").forEach(e => e.remove());
  const textArea = document.getElementById("sessionTextArea");
  textArea.innerHTML = "";

  // Fortschrittsvariable GANZ OBEN deklarieren!
  let currentQ = 0;

  // Überschrift bleibt immer oben
  const heading = document.createElement('h2');
  heading.className = "session-heading";
  heading.textContent = s.title || "Quiz Time!";
  heading.style.textAlign = "center";
  heading.style.margin = "18px 0 8px 0";
  heading.style.fontSize = "2.2rem";
  textArea.appendChild(heading);

  // Wrapper für Mitte
  const mainWrap = document.createElement('div');
  mainWrap.style.display = "flex";
  mainWrap.style.flexDirection = "column";
  mainWrap.style.justifyContent = "center";
  mainWrap.style.alignItems = "center";
  mainWrap.style.minHeight = "55vh";
  mainWrap.style.width = "100%";
  textArea.appendChild(mainWrap);

  // Musik
  let sessionMusic = null;
  if (s.music) {
    sessionMusic = new Audio("audio/" + s.music);
    sessionMusic.loop = true;
    sessionMusic.volume = 0.18;
    sessionMusic.play();
    document.addEventListener("visibilitychange", function musicPauseHandler() {
      if (document.hidden && sessionMusic) sessionMusic.pause();
      else if (!document.hidden && sessionMusic) sessionMusic.play();
    });
    window.addEventListener("pagehide", function() {
      if (sessionMusic) { sessionMusic.pause(); sessionMusic.currentTime = 0; }
    });
  }

  // Video unten rechts (optional)
  let videoBox, video;
  let quizStarted = false; // Nur nach Video-Ende
  function showQuiz() {
    mainWrap.innerHTML = "";
    const qObj = s.questions[currentQ];

    // Frage
    const question = document.createElement('div');
    question.textContent = qObj.q;
    question.className = "animated-text";
    question.style.textAlign = "center";
    question.style.fontSize = "1.21rem";
    question.style.fontWeight = "bold";
    question.style.margin = "10px 0 14px 0";
    mainWrap.appendChild(question);

    // Antworten als Buttons
    const answersBox = document.createElement("div");
    answersBox.style.display = "flex";
    answersBox.style.justifyContent = "center";
    answersBox.style.gap = "18px";
    answersBox.style.flexWrap = "wrap";
    answersBox.style.margin = "8px 0 0 0";
    mainWrap.appendChild(answersBox);

    qObj.choices.forEach((ans, i) => {
      const btn = document.createElement("button");
      btn.style.border = "none";
      btn.style.background = "#fffbe6";
      btn.style.fontSize = "1.29rem";
      btn.style.fontWeight = "bold";
      btn.style.padding = "0.88em 1.38em";
      btn.style.borderRadius = "16px";
      btn.style.boxShadow = "0 2px 10px #81d4fa88";
      btn.style.cursor = "pointer";
      btn.style.margin = "4px 0";
      btn.style.minWidth = "105px";
      btn.style.transition = "all 0.2s";
      btn.classList.add("bounce-glow");
      btn.textContent = ans;
      btn.onclick = () => handleAnswer(btn, i, answersBox, qObj.correct);
      answersBox.appendChild(btn);
    });

    // Animation-Style (einmalig)
    if (!document.getElementById("quiz-btn-bounce-style")) {
      const style = document.createElement('style');
      style.id = "quiz-btn-bounce-style";
      style.innerHTML = `
        .bounce-glow {
          animation: bounceBtn 1.15s infinite alternate;
        }
        @keyframes bounceBtn {
          0% { box-shadow: 0 2px 10px #81d4fa88; transform: scale(1);}
          65%{ box-shadow: 0 7px 30px #ffd54f77; transform: scale(1.11);}
          100%{box-shadow: 0 2px 10px #81d4fa88; transform: scale(1);}
        }
      `;
      document.head.appendChild(style);
    }

    // Fortschritt
    const progress = document.createElement("div");
    progress.style.width = "100%";
    progress.style.margin = "15px 0 0 0";
    progress.style.display = "flex";
    progress.style.justifyContent = "center";
    for (let i = 0; i < s.questions.length; i++) {
      const dot = document.createElement("div");
      dot.style.width = "18px";
      dot.style.height = "18px";
      dot.style.borderRadius = "50%";
      dot.style.background = (i === currentQ) ? "#ffd54f" : "#bdbdbd";
      dot.style.margin = "0 5px";
      progress.appendChild(dot);
    }
    mainWrap.appendChild(progress);
  }

  function handleAnswer(btn, i, answersBox, correctIdx) {
    const qObj = s.questions[currentQ];
    const correct = (i === correctIdx);

    // Sounds:
    let correctSound = qObj.correctSound || s.correctSound || "yay.mp3";
    let wrongSound   = qObj.wrongSound   || s.wrongSound   || "fail.mp3";

    if (correct) {
      new Audio("audio/" + correctSound).play();

      // Buttons sperren
      Array.from(answersBox.children).forEach((b, idx) => {
        b.disabled = true;
        if (b !== btn) b.style.opacity = "0.5";
      });
      btn.style.background = "#b2dfdb";
      btn.style.transform = "scale(1.09)";
      setTimeout(() => btn.style.transform = "scale(1)", 150);

      // Feedback
      let feedback = mainWrap.querySelector(".quiz-feedback");
      if (!feedback) {
        feedback = document.createElement("div");
        feedback.className = "animated-text quiz-feedback";
        feedback.style.textAlign = "center";
        feedback.style.marginTop = "13px";
        feedback.style.fontWeight = "bold";
        feedback.style.fontSize = "1.12rem";
        mainWrap.appendChild(feedback);
      }
      feedback.textContent = qObj.onCorrect || "Great!";
      feedback.style.color = "#388e3c";

      setTimeout(() => {
        currentQ++;
        if (currentQ < s.questions.length) {
          mainWrap.innerHTML = "";
          const waitMsg = document.createElement("div");
          waitMsg.textContent = "Next question loading...";
          waitMsg.style.textAlign = "center";
          waitMsg.style.fontSize = "1.15rem";
          waitMsg.style.margin = "15px";
          mainWrap.appendChild(waitMsg);
          setTimeout(showQuiz, pauseBetweenQuestions);
        } else {
          if (sessionMusic) { sessionMusic.pause(); sessionMusic.currentTime = 0; }
          // Zeitsteuerung aktiv
          const elapsed = (Date.now() - sessionStart) / 1000;
          if (elapsed >= minDuration) {
            showUniversalRewardFromSession(s);
          } else {
            const waitTime = Math.ceil(minDuration - elapsed);
            showLoadingOverlay(`⏳ Please wait ${waitTime}s...`, waitTime * 1000, () => {
              showUniversalRewardFromSession(s);
            });
          }
        }
      }, pauseBetweenQuestions);

    } else {
      // FALSCH: Nur diesen Button kurz sperren & Effekte
      new Audio("audio/" + wrongSound).play();
      btn.disabled = true;
      btn.style.background = "#ffcdd2";
      btn.style.transform = "scale(1.08)";
      setTimeout(() => {
        btn.style.background = "#fffbe6";
        btn.style.transform = "scale(1)";
        btn.disabled = false;
      }, 950);

      // Feedback
      let feedback = mainWrap.querySelector(".quiz-feedback");
      if (!feedback) {
        feedback = document.createElement("div");
        feedback.className = "animated-text quiz-feedback";
        feedback.style.textAlign = "center";
        feedback.style.marginTop = "13px";
        feedback.style.fontWeight = "bold";
        feedback.style.fontSize = "1.12rem";
        mainWrap.appendChild(feedback);
      }
      feedback.textContent = qObj.onWrong || "Oops, try again!";
      feedback.style.color = "#d32f2f";

      btn.classList.add("shake");
      setTimeout(() => btn.classList.remove("shake"), 600);
      // Feedback bleibt sichtbar, bis richtig geantwortet wird!
    }
  }

  // Video Setup oder direkt Quiz zeigen
  let pauseBetweenQuestions = s.pauseBetweenQuestions || 1600;
  const sessionStart = Date.now();
  const minDuration = s.minDuration ? parseInt(s.minDuration, 10) : 60;

  if (s.video) {
    video = document.createElement('video');
    video.src = `videos/${s.video}`;
    video.setAttribute("controls", "true");
    video.setAttribute("controlsList", "nodownload");
    video.autoplay = false;
    video.muted = false;
    video.playsInline = true;
    video.poster = "images/video-placeholder.png";
    video.className = "session-video";

    videoBox = document.createElement("div");
    videoBox.className = "floating-video";
    videoBox.style.position = "fixed";
    videoBox.style.right = "14px";
    videoBox.style.bottom = "62px";
    videoBox.style.zIndex = "1000";
    videoBox.appendChild(video);
    document.body.appendChild(videoBox);

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

    playBtn.onclick = function () {
      video.play();
      playBtn.style.display = "none";
      video.style.pointerEvents = "auto";
    };
    video.addEventListener('play', () => {
      playBtn.style.display = "none";
      video.style.pointerEvents = "auto";
    });
    video.addEventListener('pause', () => {
      playBtn.style.display = "";
      video.style.pointerEvents = "none";
    });
    video.addEventListener('ended', () => {
      playBtn.style.display = "";
      video.style.pointerEvents = "none";
      if (!quizStarted) {
        quizStarted = true;
        showQuiz();
      }
    });
  } else {
    showQuiz();
  }
}

 // ==== AI-EMOJI-MADNESS ====
// In renderSession(idx) einfügen
else if (s.type === "ai-emoji-madness-old") {
  clearTimeouts();
  renderFrogProgress(lastSessionIdx, idx);
  document.querySelectorAll(".floating-video, .centered-next-btn, .reward-box, .glitter, .animals-reward-container").forEach(el => el.remove());
  document.getElementById("sessionTextArea").innerHTML = "";
  const textArea = document.getElementById("sessionTextArea");

  // Hintergrundmusik (optional)
  let music;
  if (s.music) {
    music = new Audio("audio/" + s.music);
    music.loop = true;
    music.volume = 0.19;
    music.play();
  }

  // Überschrift
  const heading = document.createElement("h2");
  heading.className = "session-heading";
  heading.textContent = s.title || "";
  heading.style.textAlign = "center";
  textArea.appendChild(heading);

  // Video unten rechts (mit Play-Button)
  let videoBox, video, playBtn;
  if (s.video) {
    video = document.createElement("video");
    video.src = "videos/" + s.video;
    video.playsInline = true;
    video.autoplay = false;
    video.muted = false;
    video.className = "session-video";
    video.poster = "images/video-placeholder.png";

    videoBox = document.createElement("div");
    videoBox.className = "floating-video";
    videoBox.appendChild(video);
    document.body.appendChild(videoBox);

    playBtn = document.createElement("button");
    playBtn.className = "custom-play-btn";
    playBtn.title = "Play";
    playBtn.innerHTML = `
      <svg viewBox="0 0 60 60">
        <circle cx="30" cy="30" r="28" fill="none"/>
        <polygon points="22,16 46,30 22,44" fill="#383838"/>
      </svg>
    `;
    videoBox.appendChild(playBtn);

    playBtn.onclick = () => {
      video.play();
      playBtn.style.display = "none";
      showEmojiAndQuestion();
    };
    video.addEventListener("play", () => playBtn.style.display = "none");
    video.addEventListener("ended", () => {
      showAvatarInVideoBox(videoBox, "momo");
    });
  } else {
    showEmojiAndQuestion();
  }

  // Zeigt die Emoji-Reihe & Frage
  function showEmojiAndQuestion() {
    const emojiRow = document.createElement("div");
    emojiRow.style.fontSize = "2.6rem";
    emojiRow.style.textAlign = "center";
    emojiRow.style.margin = "18px auto 10px auto";
    emojiRow.style.letterSpacing = "0.14em";
    emojiRow.style.padding = "0 10vw";
    emojiRow.style.wordBreak = "break-word";
    emojiRow.innerText = Array.isArray(s.emojis) ? s.emojis.join(" ") : "";
    textArea.appendChild(emojiRow);

    // Frage
    const questionDiv = document.createElement("div");
    questionDiv.className = "animated-text";
    questionDiv.style.textAlign = "center";
    questionDiv.style.fontSize = "1.22rem";
    questionDiv.style.margin = "10px auto 18px auto";
    questionDiv.textContent = s.question || "";
    textArea.appendChild(questionDiv);

    if (video) {
      video.addEventListener("ended", showChoices, { once: true });
    } else {
      showChoices();
    }
  }

  // Antwortmöglichkeiten zentriert anzeigen
  function showChoices() {
    if (document.querySelector(".emoji-choices")) return;
    const box = document.createElement("div");
    box.className = "emoji-choices";
    box.style.display = "flex";
    box.style.flexDirection = "column";
    box.style.alignItems = "center";
    box.style.gap = "18px";
    box.style.margin = "20px auto 0 auto";
    box.style.width = "100%";
    textArea.appendChild(box);

    // Choices als große Buttons
    s.choices.forEach((val, i) => {
      const btn = document.createElement("button");
      btn.style.border = "none";
      btn.style.background = "#fffbe6";
      btn.style.fontSize = "2.1rem";
      btn.style.fontWeight = "700";
      btn.style.padding = "0.62em 1.4em";
      btn.style.borderRadius = "19px";
      btn.style.boxShadow = "0 2px 10px #ffe08288";
      btn.style.cursor = "pointer";
      btn.style.width = "90vw";
      btn.style.maxWidth = "340px";
      btn.style.display = "flex";
      btn.style.justifyContent = "center";
      btn.style.alignItems = "center";
      btn.style.letterSpacing = "0.13em";
      btn.textContent = val;
      btn.onclick = () => handleChoice(btn, i, box);
      box.appendChild(btn);
    });
  }

  // Antwort-Handling
  function handleChoice(btn, i, box) {
    // Bei richtig: Buttons entfernen, Feedback + universeller Reward anzeigen
    if (i === s.correct) {
      new Audio("audio/yay.mp3").play();
      Array.from(box.children).forEach(b => { if (b !== btn) b.style.display = "none"; });
      btn.style.background = "#b2dfdb";
      btn.style.pointerEvents = "none";

      // Feedback-Text
      const feedback = document.createElement("div");
      feedback.className = "animated-text glitter";
      feedback.style.textAlign = "center";
      feedback.style.fontSize = "1.1rem";
      feedback.style.margin = "18px auto 6px auto";
      feedback.textContent = s.onCorrect || "Great!";
      textArea.insertBefore(feedback, box);

      // --- UNIVERSAL REWARD ---
      showUniversalReward(
        s.choices[i], // Das richtige Emoji/Text als Bild/Text (wird automatisch erkannt)
        s.onCorrect || "",
        () => {
          if (music) { music.pause(); music.currentTime = 0; }
          if (videoBox) videoBox.remove();
          currentSession++;
          renderSession(currentSession);
        },
        s.successSticker || 0
      );
    } else {
      new Audio("audio/fail.mp3").play();
      if (!document.querySelector(".wrong-msg")) {
        const wrong = document.createElement("div");
        wrong.className = "animated-text wrong-msg";
        wrong.style.textAlign = "center";
        wrong.style.color = "#d32f2f";
        wrong.style.margin = "12px auto 2px auto";
        wrong.textContent = s.onWrong || "Try again!";
        textArea.insertBefore(wrong, box);
        btn.classList.add("shake");
        setTimeout(() => { btn.classList.remove("shake"); wrong.remove(); }, 900);
      }
    }
  }

  return; // Session endet hier!
}

else if (s.type === "ai-emoji-madness") {
  clearTimeouts();
  renderFrogProgress(lastSessionIdx, idx);
  document.querySelectorAll(".floating-video, .centered-next-btn, .reward-container").forEach(e => e.remove());
  const textArea = document.getElementById("sessionTextArea");
  textArea.innerHTML = "";

  // Überschrift bleibt immer oben
  const heading = document.createElement('h2');
  heading.className = "session-heading";
  heading.textContent = s.title || "Emoji Quiz!";
  heading.style.textAlign = "center";
  heading.style.margin = "18px 0 8px 0";
  heading.style.fontSize = "2.2rem";
  textArea.appendChild(heading);

  // Wrapper für Mitte
  const mainWrap = document.createElement('div');
  mainWrap.style.display = "flex";
  mainWrap.style.flexDirection = "column";
  mainWrap.style.justifyContent = "center";
  mainWrap.style.alignItems = "center";
  mainWrap.style.minHeight = "55vh";
  mainWrap.style.width = "100%";
  textArea.appendChild(mainWrap);

  // Musik (optional)
  let sessionMusic = null;
  if (s.music) {
    sessionMusic = new Audio("audio/" + s.music);
    sessionMusic.loop = true;
    sessionMusic.volume = 0.18;
    sessionMusic.play();
    document.addEventListener("visibilitychange", function musicPauseHandler() {
      if (document.hidden && sessionMusic) sessionMusic.pause();
      else if (!document.hidden && sessionMusic) sessionMusic.play();
    });
    window.addEventListener("pagehide", function() {
      if (sessionMusic) { sessionMusic.pause(); sessionMusic.currentTime = 0; }
    });
  }

  // Video unten rechts (optional)
  let videoBox, video;
  if (s.video) {
    video = document.createElement('video');
    video.src = `videos/${s.video}`;
    video.setAttribute("controls", "true");
    video.setAttribute("controlsList", "nodownload");
    video.autoplay = false;
    video.muted = false;
    video.playsInline = true;
    video.poster = "images/video-placeholder.png";
    video.className = "session-video";

    videoBox = document.createElement("div");
    videoBox.className = "floating-video";
    videoBox.style.position = "fixed";
    videoBox.style.right = "14px";
    videoBox.style.bottom = "62px";
    videoBox.style.zIndex = "1000";
    videoBox.appendChild(video);
    document.body.appendChild(videoBox);

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

    playBtn.onclick = function () {
      video.play();
      playBtn.style.display = "none";
      video.style.pointerEvents = "auto";
    };
    video.addEventListener('play', () => {
      playBtn.style.display = "none";
      video.style.pointerEvents = "auto";
    });
    video.addEventListener('pause', () => {
      playBtn.style.display = "";
      video.style.pointerEvents = "none";
    });
    video.addEventListener('ended', () => {
      playBtn.style.display = "";
      video.style.pointerEvents = "none";
      showEmojiQuiz();
    });
  } else {
    showEmojiQuiz();
  }

  // Zeitsteuerung
  const sessionStart = Date.now();
  const minDuration = s.minDuration ? parseInt(s.minDuration, 10) : 60;
  const pauseBetweenQuestions = s.pauseBetweenQuestions || 1600;
  const tasks = Array.isArray(s.tasks) ? s.tasks : [s];
  let currentTask = 0;

  function showEmojiQuiz() {
    mainWrap.innerHTML = "";
    const task = tasks[currentTask];

    // Emojis zentriert & groß
    const emojiRow = document.createElement('div');
    emojiRow.textContent = (task.emojis || []).join(' ');
    emojiRow.style.fontSize = "2.4rem";
    emojiRow.style.letterSpacing = "0.14em";
    emojiRow.style.margin = "10px auto 16px auto";
    emojiRow.style.textAlign = "center";
    mainWrap.appendChild(emojiRow);

    // Frage
    const question = document.createElement('div');
    question.textContent = task.question;
    question.className = "animated-text";
    question.style.textAlign = "center";
    question.style.fontSize = "1.21rem";
    question.style.fontWeight = "bold";
    question.style.margin = "7px 0 16px 0";
    mainWrap.appendChild(question);

    // Antworten als Buttons
    const answersBox = document.createElement("div");
    answersBox.style.display = "flex";
    answersBox.style.justifyContent = "center";
    answersBox.style.gap = "18px";
    answersBox.style.flexWrap = "wrap";
    answersBox.style.margin = "8px 0 0 0";
    mainWrap.appendChild(answersBox);

    task.choices.forEach((ans, i) => {
      const btn = document.createElement("button");
      btn.style.border = "none";
      btn.style.background = "#fffbe6";
      btn.style.fontSize = "1.29rem";
      btn.style.fontWeight = "bold";
      btn.style.padding = "0.88em 1.38em";
      btn.style.borderRadius = "16px";
      btn.style.boxShadow = "0 2px 10px #81d4fa88";
      btn.style.cursor = "pointer";
      btn.style.margin = "4px 0";
      btn.style.minWidth = "105px";
      btn.style.transition = "all 0.2s";
      btn.classList.add("bounce-glow");
      btn.textContent = ans;
      btn.onclick = () => handleAnswer(btn, i, answersBox, task.correct, task.onCorrect, task.onWrong, task.correctSound, task.wrongSound);
      answersBox.appendChild(btn);
    });

    // Animation-Style (einmalig)
    if (!document.getElementById("emoji-btn-bounce-style")) {
      const style = document.createElement('style');
      style.id = "emoji-btn-bounce-style";
      style.innerHTML = `
        .bounce-glow {
          animation: bounceBtn 1.18s infinite alternate;
        }
        @keyframes bounceBtn {
          0% { box-shadow: 0 2px 10px #81d4fa88; transform: scale(1);}
          65%{ box-shadow: 0 7px 30px #ffd54f77; transform: scale(1.09);}
          100%{box-shadow: 0 2px 10px #81d4fa88; transform: scale(1);}
        }
      `;
      document.head.appendChild(style);
    }

    // Fortschritt
    const progress = document.createElement("div");
    progress.style.width = "100%";
    progress.style.margin = "15px 0 0 0";
    progress.style.display = "flex";
    progress.style.justifyContent = "center";
    for (let i = 0; i < tasks.length; i++) {
      const dot = document.createElement("div");
      dot.style.width = "18px";
      dot.style.height = "18px";
      dot.style.borderRadius = "50%";
      dot.style.background = (i === currentTask) ? "#ffd54f" : "#bdbdbd";
      dot.style.margin = "0 5px";
      progress.appendChild(dot);
    }
    mainWrap.appendChild(progress);
  }

  function handleAnswer(btn, i, answersBox, correctIdx, onCorrect, onWrong, correctSound, wrongSound) {
    const task = tasks[currentTask];
    // Sound-Handling
    let playCorrect = correctSound || s.correctSound || "yay.mp3";
    let playWrong   = wrongSound   || s.wrongSound   || "fail.mp3";
    const correct = (i === correctIdx);

    if (correct) {
      new Audio("audio/" + playCorrect).play();
      Array.from(answersBox.children).forEach((b, idx) => {
        b.disabled = true;
        if (b !== btn) b.style.opacity = "0.5";
      });
      btn.style.background = "#b2dfdb";
      btn.style.transform = "scale(1.09)";
      setTimeout(() => btn.style.transform = "scale(1)", 150);

      // Feedback
      let feedback = mainWrap.querySelector(".emoji-feedback");
      if (!feedback) {
        feedback = document.createElement("div");
        feedback.className = "animated-text emoji-feedback";
        feedback.style.textAlign = "center";
        feedback.style.marginTop = "13px";
        feedback.style.fontWeight = "bold";
        feedback.style.fontSize = "1.12rem";
        mainWrap.appendChild(feedback);
      }
      feedback.textContent = onCorrect || "Great!";
      feedback.style.color = "#388e3c";

      setTimeout(() => {
        currentTask++;
        if (currentTask < tasks.length) {
          mainWrap.innerHTML = "";
          const waitMsg = document.createElement("div");
          waitMsg.textContent = "Next question loading...";
          waitMsg.style.textAlign = "center";
          waitMsg.style.fontSize = "1.15rem";
          waitMsg.style.margin = "15px";
          mainWrap.appendChild(waitMsg);
          setTimeout(showEmojiQuiz, pauseBetweenQuestions);
        } else {
          if (sessionMusic) { sessionMusic.pause(); sessionMusic.currentTime = 0; }
          // Zeitsteuerung aktiv
          const elapsed = (Date.now() - sessionStart) / 1000;
          if (elapsed >= minDuration) {
            showUniversalRewardFromSession(s);
          } else {
            const waitTime = Math.ceil(minDuration - elapsed);
            showLoadingOverlay(`⏳ Please wait ${waitTime}s...`, waitTime * 1000, () => {
              showUniversalRewardFromSession(s);
            });
          }
        }
      }, pauseBetweenQuestions);

    } else {
      // FALSCH: Nur diesen Button kurz sperren & Effekte
      new Audio("audio/" + playWrong).play();
      btn.disabled = true;
      btn.style.background = "#ffcdd2";
      btn.style.transform = "scale(1.08)";
      setTimeout(() => {
        btn.style.background = "#fffbe6";
        btn.style.transform = "scale(1)";
        btn.disabled = false;
      }, 950);

      // Feedback
      let feedback = mainWrap.querySelector(".emoji-feedback");
      if (!feedback) {
        feedback = document.createElement("div");
        feedback.className = "animated-text emoji-feedback";
        feedback.style.textAlign = "center";
        feedback.style.marginTop = "13px";
        feedback.style.fontWeight = "bold";
        feedback.style.fontSize = "1.12rem";
        mainWrap.appendChild(feedback);
      }
      feedback.textContent = onWrong || "Oops, try again!";
      feedback.style.color = "#d32f2f";

      btn.classList.add("shake");
      setTimeout(() => btn.classList.remove("shake"), 600);
      // Feedback bleibt sichtbar, bis richtig geantwortet wird!
    }
  }
}



else if (s.type === "color-find-old") {
  clearTimeouts();
  renderFrogProgress(lastSessionIdx, idx);
  document.querySelectorAll(".floating-video, .centered-next-btn").forEach(el => el.remove());
  const textArea = document.getElementById("sessionTextArea");
  textArea.innerHTML = "";

  const heading = document.createElement('h2');
  heading.className = "session-heading";
  heading.style.textAlign = "center";
  heading.style.marginTop = "6px";
  heading.innerText = s.title || "Find the Color!";
  textArea.appendChild(heading);

  // Hintergrundmusik (optional aus JSON)
  let sessionMusic = null;
  if (s.music) {
    sessionMusic = new Audio("audio/" + s.music);
    sessionMusic.loop = true;
    sessionMusic.volume = 0.20;
    sessionMusic.play();
  }

  playSessionVideoIfNeeded(s, showFindTask);

  function showFindTask() {
	  if (s.avatar) showAvatarInVideoBox(null, s.avatar);

    // Großer, farbiger Kreis
    const colorCircle = document.createElement("div");
    colorCircle.style.width = "110px";
    colorCircle.style.height = "110px";
    colorCircle.style.margin = "24px auto 14px auto";
    colorCircle.style.borderRadius = "50%";
    colorCircle.style.background = s.color ? s.color.toLowerCase() : "#4caf50";
    colorCircle.style.border = "5px solid #ffd54f";
    colorCircle.style.boxShadow = "0 2px 32px #ffd54faa, 0 0 32px #aeea00aa";
    textArea.appendChild(colorCircle);

    // Frage
    const q = document.createElement("div");
    q.className = "animated-text";
    q.style.textAlign = "center";
    q.style.fontSize = "1.22rem";
    q.innerText = s.question || "Find something in this color!";
    textArea.appendChild(q);

    // Button
    const btn = document.createElement("button");
    btn.innerText = `I found something ${s.color || "in this color"}!`;
    btn.className = "centered-next-btn";
    btn.style.margin = "30px auto 0 auto";
    btn.onclick = () => {
      // --- HIER kommt der verbesserte Sound-Ablauf ---
      const yay = new Audio("audio/yay.mp3");
      yay.play();

      setTimeout(() => {
        if (sessionMusic) {
          sessionMusic.pause();
          sessionMusic.currentTime = 0;
        }
        showUniversalReward(
          s.color,
          s.onDone || "Well done!",
          () => { currentSession++; renderSession(currentSession); },
          s.successSticker || 0
        );
      }, 700); // Warte, bis "yay" fertig ist
    };
    textArea.appendChild(btn);
  }
}


else if (s.type === "color-find") {
  clearTimeouts();
  renderFrogProgress(lastSessionIdx, idx);
  document.querySelectorAll(".floating-video, .centered-next-btn, .reward-container").forEach(e => e.remove());

  const textArea = document.getElementById("sessionTextArea");
  textArea.innerHTML = "";

  // Überschrift
  const heading = document.createElement('h2');
  heading.className = "session-heading";
  heading.textContent = s.title || "Find the Color!";
  heading.style.textAlign = "center";
  heading.style.margin = "18px 0 8px 0";
  heading.style.fontSize = "2.2rem";
  textArea.appendChild(heading);

  // Haupt-Wrapper für Mitte
  const mainWrap = document.createElement('div');
mainWrap.className = "main-wrap";   // <<< HIER
textArea.appendChild(mainWrap);

  // Musik abspielen (optional)
  let sessionMusic = null;
  if (s.music) {
    sessionMusic = new Audio("audio/" + s.music);
    sessionMusic.loop = true;
    sessionMusic.volume = 0.16;
    sessionMusic.play();
    document.addEventListener("visibilitychange", function musicPauseHandler() {
      if (document.hidden && sessionMusic) sessionMusic.pause();
      else if (!document.hidden && sessionMusic) sessionMusic.play();
    });
    window.addEventListener("pagehide", function() {
      if (sessionMusic) { sessionMusic.pause(); sessionMusic.currentTime = 0; }
    });
  }

  // Video unten rechts (optional)
  let videoBox, video;
  if (s.video) {
    video = document.createElement('video');
    video.src = `videos/${s.video}`;
    video.setAttribute("controls", "true");
    video.setAttribute("controlsList", "nodownload");
    video.autoplay = false;
    video.muted = false;
    video.playsInline = true;
    video.poster = "images/video-placeholder.png";
    video.className = "session-video";

    videoBox = document.createElement("div");
    videoBox.className = "floating-video";
    videoBox.style.position = "fixed";
    videoBox.style.right = "14px";
    videoBox.style.bottom = "62px";
    videoBox.style.zIndex = "1000";
    videoBox.appendChild(video);
    document.body.appendChild(videoBox);

    // Custom Play Button
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

    playBtn.onclick = function () {
      video.play();
      playBtn.style.display = "none";
      video.style.pointerEvents = "auto";
    };
    video.addEventListener('play', () => {
      playBtn.style.display = "none";
      video.style.pointerEvents = "auto";
    });
    video.addEventListener('pause', () => {
      playBtn.style.display = "";
      video.style.pointerEvents = "none";
    });
    video.addEventListener('ended', () => {
      playBtn.style.display = "";
      video.style.pointerEvents = "none";
      showColorTasks();
    });
  } else {
    showColorTasks();
  }

  // Zeitsteuerung
  const sessionStart = Date.now();
  const minDuration = s.minDuration ? parseInt(s.minDuration, 10) : 60;
  const pauseBetweenQuestions = s.pauseBetweenQuestions || 1700;
  const tasks = Array.isArray(s.tasks) ? s.tasks : [s];
  let currentTaskIdx = 0;

  function showColorTasks() {
  mainWrap.innerHTML = "";
  const currentTask = tasks[currentTaskIdx];

  // Farbkugel
  const colorCircle = document.createElement("div");
  colorCircle.className = "color-circle";
  colorCircle.style.background = currentTask.color ? currentTask.color.toLowerCase() : "#4caf50";
  mainWrap.appendChild(colorCircle);

  // Frage
  const q = document.createElement("div");
  q.className = "animated-text";
  q.innerText = currentTask.question || "Find something in this color!";
  mainWrap.appendChild(q);

  // Button unter die Frage
  const btn = document.createElement("button");
  btn.innerText = currentTask.buttonText || `I found something ${currentTask.color || ""}!`;
  btn.className = "centered-next-btn";
  mainWrap.appendChild(btn);

      btn.onclick = () => {
      new Audio("audio/" + (currentTask.correctSound || s.correctSound || "yay.mp3")).play();
      btn.disabled = true;
      btn.style.background = "#b2dfdb";
      btn.style.color = "#388e3c";

      setTimeout(() => {
        currentTaskIdx++;
        if (currentTaskIdx < tasks.length) {
          mainWrap.innerHTML = "";
          const waitMsg = document.createElement("div");
          waitMsg.textContent = "Next question loading...";
          waitMsg.style.textAlign = "center";
          waitMsg.style.fontSize = "1.15rem";
          waitMsg.style.margin = "15px";
          mainWrap.appendChild(waitMsg);
          setTimeout(showColorTasks, pauseBetweenQuestions);
        } else {
          if (sessionMusic) { sessionMusic.pause(); sessionMusic.currentTime = 0; }
          const elapsed = (Date.now() - sessionStart) / 1000;
          if (elapsed >= minDuration) {
            showUniversalRewardFromSession(s);
          } else {
            const waitTime = Math.ceil(minDuration - elapsed);
            showLoadingOverlay(`⏳ Please wait ${waitTime}s...`, waitTime * 1000, () => {
              showUniversalRewardFromSession(s);
            });
          }
        }
      }, pauseBetweenQuestions);
    };
  }

  // Falls Video da ist, erst nach Video-Start starten, sonst sofort:
  if (!s.video) showColorTasks();
}


else if (s.type === "color-sequence-old") {
  clearTimeouts();
  renderFrogProgress(lastSessionIdx, idx);
  document.querySelectorAll(".floating-video, .centered-next-btn").forEach(el => el.remove());
  const textArea = document.getElementById("sessionTextArea");
  textArea.innerHTML = "";

  const heading = document.createElement('h2');
  heading.className = "session-heading";
  heading.style.textAlign = "center";
  heading.style.marginTop = "6px";
  heading.innerText = s.title || "Rainbow Sequence!";
  textArea.appendChild(heading);

  let sessionMusic = null;
  if (s.music) {
    sessionMusic = new Audio("audio/" + s.music);
    sessionMusic.loop = true;
    sessionMusic.volume = 0.20;
    sessionMusic.play();
  }

  playSessionVideoIfNeeded(s, () => showSequenceTask(false));

  function showExampleRainbow() {
  // Eltern-Container
  const exWrap = document.createElement("div");
  exWrap.className = "color-sequence-example";
  exWrap.style.display = "flex";
  exWrap.style.flexDirection = "column";
  exWrap.style.alignItems = "center";
  exWrap.style.justifyContent = "center";
  exWrap.style.width = "100%";
  exWrap.style.margin = "18px auto 10px auto";

  // Beispiel-Text oben, immer zentriert
  if (s.exampleText) {
    const exLabel = document.createElement("div");
    exLabel.innerText = s.exampleText;
    exLabel.style.fontWeight = "bold";
    exLabel.style.fontSize = "1.13rem";
    exLabel.style.textAlign = "center";
    exLabel.style.marginBottom = "10px";
    exLabel.style.width = "100%";
    exWrap.appendChild(exLabel);
  }

  // Die Kreise darunter in einer flex-wrap-Row (immer zentriert und umbrechend)
  const ballsRow = document.createElement("div");
  ballsRow.style.display = "flex";
  ballsRow.style.justifyContent = "center";
  ballsRow.style.flexWrap = "wrap";
  ballsRow.style.gap = "13px";
  ballsRow.style.width = "100%";
  ballsRow.style.maxWidth = "330px"; // Maximalbreite für Mobile (bei Bedarf anpassen)
  ballsRow.style.margin = "0 auto";
  ballsRow.style.paddingBottom = "3px";
  
  if (Array.isArray(s.example)) {
    s.example.forEach(color => {
      const ball = document.createElement("div");
      ball.style.width = "42px";
      ball.style.height = "42px";
      ball.style.borderRadius = "50%";
      ball.style.background = color.toLowerCase();
      ball.style.border = "2.5px solid #ffd54f";
      ball.title = color;
      ball.style.display = "inline-block";
      ball.style.margin = "0";
      ballsRow.appendChild(ball);
    });
  }
  exWrap.appendChild(ballsRow);

  return exWrap;
}


  function showSequenceTask(showOnlyButtons = false) {
    textArea.innerHTML = "";

    if (!showOnlyButtons) {
      const ex = showExampleRainbow();
      textArea.appendChild(ex);

      setTimeout(() => {
        textArea.innerHTML = "";
        showSequenceTask(true);
      }, 7000);
      return;
    }

    const againBtn = document.createElement("button");
    againBtn.innerText = "Show the rainbow example again";
    againBtn.className = "rainbow-btn-animated";
    againBtn.style.display = "block";
    againBtn.style.margin = "16px auto 22px auto";
    againBtn.style.padding = "1em 2em";
    againBtn.style.fontSize = "1.14rem";
    againBtn.style.fontWeight = "bold";
    againBtn.style.border = "none";
    againBtn.style.borderRadius = "22px";
    againBtn.style.background = "linear-gradient(90deg, #ffeb3b, #81d4fa, #ff80ab, #aed581, #fff176, #ffd54f)";
    againBtn.style.boxShadow = "0 2px 16px #ffd54f55";
    againBtn.style.cursor = "pointer";
    againBtn.style.animation = "rainbowPulse 1.3s infinite alternate";
    againBtn.onclick = () => {
      textArea.innerHTML = "";
      const ex = showExampleRainbow();
      textArea.appendChild(ex);
      setTimeout(() => {
        textArea.innerHTML = "";
        showSequenceTask(true);
      }, 7000);
    };
    textArea.appendChild(againBtn);

    const q = document.createElement("div");
    q.className = "animated-text";
    q.innerText = s.question || "Put the colors in the correct order!";
    q.style.marginTop = "6px";
    q.style.textAlign = "center";
    textArea.appendChild(q);

    const order = [];
    const box = document.createElement("div");
    box.style.display = "flex";
    box.style.justifyContent = "center";
    box.style.flexWrap = "wrap";
    box.style.gap = "18px";
    box.style.margin = "28px auto 0 auto";
    textArea.appendChild(box);

    s.colors.forEach((col, i) => {
      const btn = document.createElement("button");
      btn.style.width = "68px";
      btn.style.height = "68px";
      btn.style.borderRadius = "50%";
      btn.style.background = col.toLowerCase();
      btn.style.border = "4px solid #ffd54f";
      btn.style.margin = "0 6px";
      btn.style.display = "flex";
      btn.style.alignItems = "center";
      btn.style.justifyContent = "center";
      btn.style.fontWeight = "bold";
      btn.style.fontSize = "1.07rem";
      btn.style.boxShadow = "0 2px 12px #ffd54f33";
      btn.style.transition = "opacity 0.2s";
      btn.innerText = col;
      btn.onclick = () => {
        if (!order.includes(i)) {
          order.push(i);
          btn.style.opacity = "0.5";
          btn.disabled = true;
        }
        if (order.length === s.colors.length) {
          if (JSON.stringify(order) === JSON.stringify(s.solution)) {
            const yay = new Audio("audio/yay.mp3");
            yay.play();
            setTimeout(() => {
              if (sessionMusic) {
                sessionMusic.pause();
                sessionMusic.currentTime = 0;
              }
              showUniversalReward(
                "🌈",
                s.onCorrect || "Great order!",
                () => { currentSession++; renderSession(currentSession); },
                s.successSticker || 0
              );
            }, 700);
          } else {
            new Audio("audio/fail.mp3").play();
            const err = document.createElement("div");
            err.className = "animated-text";
            err.style.color = "#d32f2f";
            err.innerText = s.onWrong || "Oops... try again!";
            err.style.textAlign = "center";
            textArea.appendChild(err);
            setTimeout(() => {
              box.querySelectorAll("button").forEach((b, idx) => {
                b.disabled = false;
                b.style.opacity = "1";
              });
              order.length = 0;
              err.remove();
            }, 1400);
          }
        }
      };
      box.appendChild(btn);
    });
  }
}


else if (s.type === "color-sequence1") {
  clearTimeouts();
  renderFrogProgress(lastSessionIdx, idx);
  document.querySelectorAll(".floating-video, .centered-next-btn, .reward-container").forEach(e => e.remove());
  const textArea = document.getElementById("sessionTextArea");
  textArea.innerHTML = "";

  // Überschrift
  const heading = document.createElement('h2');
  heading.className = "session-heading";
  heading.textContent = s.title || "Rainbow Sequence!";
  heading.style.textAlign = "center";
  heading.style.margin = "18px 0 8px 0";
  heading.style.fontSize = "2.2rem";
  textArea.appendChild(heading);

  // Hauptbereich für alles
  const mainWrap = document.createElement('div');
  mainWrap.style.display = "flex";
  mainWrap.style.flexDirection = "column";
  mainWrap.style.justifyContent = "center";
  mainWrap.style.alignItems = "center";
  mainWrap.style.minHeight = "54vh";
  mainWrap.style.width = "100%";
  textArea.appendChild(mainWrap);

  // Video unten rechts (optional)
  let videoBox, video;
  if (s.video) {
    video = document.createElement('video');
    video.src = `videos/${s.video}`;
    video.setAttribute("controls", "true");
    video.setAttribute("controlsList", "nodownload");
    video.autoplay = false;
    video.muted = false;
    video.playsInline = true;
    video.poster = "images/video-placeholder.png";
    video.className = "session-video";

    videoBox = document.createElement("div");
    videoBox.className = "floating-video";
    videoBox.style.position = "fixed";
    videoBox.style.right = "14px";
    videoBox.style.bottom = "62px";
    videoBox.style.zIndex = "1000";
    videoBox.appendChild(video);
    document.body.appendChild(videoBox);

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

    playBtn.onclick = function () {
      video.play();
      playBtn.style.display = "none";
      video.style.pointerEvents = "auto";
    };
    video.addEventListener('play', () => {
      playBtn.style.display = "none";
      video.style.pointerEvents = "auto";
    });
    video.addEventListener('pause', () => {
      playBtn.style.display = "";
      video.style.pointerEvents = "none";
    });
    video.addEventListener('ended', () => {
      playBtn.style.display = "";
      video.style.pointerEvents = "none";
      showColorSequenceGame();
    });
  } else {
    showColorSequenceGame();
  }

  // Musik
  let sessionMusic = null;
  if (s.music) {
    sessionMusic = new Audio("audio/" + s.music);
    sessionMusic.loop = true;
    sessionMusic.volume = 0.15;
    sessionMusic.play();
    document.addEventListener("visibilitychange", function musicPauseHandler() {
      if (document.hidden && sessionMusic) sessionMusic.pause();
      else if (!document.hidden && sessionMusic) sessionMusic.play();
    });
    window.addEventListener("pagehide", function() {
      if (sessionMusic) { sessionMusic.pause(); sessionMusic.currentTime = 0; }
    });
  }

  // Zeitsteuerung (wie immer)
  const sessionStart = Date.now();
  const minDuration = s.minDuration ? parseInt(s.minDuration, 10) : 60;
  const pauseBetweenQuestions = s.pauseBetweenQuestions || 1800;
  const tasks = Array.isArray(s.tasks) ? s.tasks : [s];
  let taskIdx = 0;

  function showColorSequenceGame() {
    mainWrap.innerHTML = "";
    const task = tasks[taskIdx];

    // Beispiel oben anzeigen (optional)
    if (task.example && Array.isArray(task.example)) {
      const exRow = document.createElement("div");
      exRow.style.display = "flex";
      exRow.style.justifyContent = "center";
      exRow.style.gap = "10px";
      exRow.style.marginBottom = "18px";
      task.example.forEach(col => {
        const circle = document.createElement("div");
        circle.style.width = "38px";
        circle.style.height = "38px";
        circle.style.borderRadius = "50%";
        circle.style.background = col;
        circle.style.border = "2.5px solid #ffd54f";
        exRow.appendChild(circle);
      });
      mainWrap.appendChild(exRow);
    }

    // Frage
    const question = document.createElement("div");
    question.className = "animated-text";
    question.textContent = task.question || "Put the colors in the right order!";
    question.style.textAlign = "center";
    question.style.fontSize = "1.15rem";
    question.style.fontWeight = "bold";
    question.style.margin = "10px 0 16px 0";
    mainWrap.appendChild(question);

    // Die Ziel-Slots (Kreise, die zu befüllen sind)
    const slotsBox = document.createElement("div");
    slotsBox.style.display = "flex";
    slotsBox.style.justifyContent = "center";
    slotsBox.style.gap = "20px";
    slotsBox.style.margin = "14px 0 20px 0";
    mainWrap.appendChild(slotsBox);

    const slots = [];
    for (let i = 0; i < task.colors.length; i++) {
      const slot = document.createElement("div");
      slot.style.width = "50px";
      slot.style.height = "50px";
      slot.style.borderRadius = "50%";
      slot.style.background = "#fafafa";
      slot.style.border = "4px dashed #ffd54f";
      slot.style.boxShadow = "0 2px 10px #ffd54faa";
      slot.style.display = "flex";
      slot.style.alignItems = "center";
      slot.style.justifyContent = "center";
      slot.style.fontSize = "1.2rem";
      slot.style.transition = "background 0.2s";
      slot.style.cursor = "pointer";
      slot.dataset.slotIdx = i;
      slots.push(slot);
      slotsBox.appendChild(slot);
    }

    // Farbbälle unten zum Auswählen (wie Drag&Drop, nur per Klick)
    const ballsBox = document.createElement("div");
    ballsBox.style.display = "flex";
    ballsBox.style.justifyContent = "center";
    ballsBox.style.gap = "18px";
    ballsBox.style.marginTop = "18px";
    mainWrap.appendChild(ballsBox);

    const colorOrder = [];
    const used = new Array(task.colors.length).fill(false);

    task.colors.forEach((col, i) => {
      const ball = document.createElement("button");
      ball.style.width = "48px";
      ball.style.height = "48px";
      ball.style.borderRadius = "50%";
      ball.style.background = col;
      ball.style.border = "4px solid #ffd54f";
      ball.style.margin = "0";
      ball.style.display = "flex";
      ball.style.alignItems = "center";
      ball.style.justifyContent = "center";
      ball.style.cursor = "pointer";
      ball.style.fontWeight = "bold";
      ball.style.fontSize = "1.1rem";
      ball.style.boxShadow = "0 2px 12px #ffd54f33";
      ball.innerText = col;
      ball.onclick = () => {
        // Find first empty slot
        const emptyIdx = colorOrder.length;
        if (emptyIdx < slots.length && !used[i]) {
          slots[emptyIdx].style.background = col;
          slots[emptyIdx].style.color = "#222";
          slots[emptyIdx].innerText = col;
          colorOrder.push(i);
          used[i] = true;
          ball.disabled = true;
          ball.style.opacity = "0.33";
        }
        // Prüfe, ob voll
        if (colorOrder.length === slots.length) {
          setTimeout(() => {
            // Überprüfung
            const isCorrect = JSON.stringify(colorOrder) === JSON.stringify(task.solution);
            if (isCorrect) {
              new Audio("audio/" + (task.correctSound || s.correctSound || "yay.mp3")).play();
              slots.forEach(s => {
                s.style.background = "#c8e6c9";
                s.style.border = "4px solid #43a047";
              });
              const feedback = document.createElement("div");
              feedback.textContent = task.onCorrect || "Well done! That's the correct order!";
              feedback.style.textAlign = "center";
              feedback.style.color = "#388e3c";
              feedback.style.fontWeight = "bold";
              feedback.style.margin = "16px 0 4px 0";
              mainWrap.appendChild(feedback);
              setTimeout(() => {
                taskIdx++;
                if (taskIdx < tasks.length) {
                  mainWrap.innerHTML = "";
                  const waitMsg = document.createElement("div");
                  waitMsg.textContent = "Next question loading...";
                  waitMsg.style.textAlign = "center";
                  waitMsg.style.fontSize = "1.15rem";
                  waitMsg.style.margin = "13px";
                  mainWrap.appendChild(waitMsg);
                  setTimeout(showColorSequenceGame, pauseBetweenQuestions);
                } else {
                  if (sessionMusic) { sessionMusic.pause(); sessionMusic.currentTime = 0; }
                  // Zeitsteuerung
                  const elapsed = (Date.now() - sessionStart) / 1000;
                  if (elapsed >= minDuration) {
                    showUniversalRewardFromSession(s);
                  } else {
                    const waitTime = Math.ceil(minDuration - elapsed);
                    showLoadingOverlay(`⏳ Please wait ${waitTime}s...`, waitTime * 1000, () => {
                      showUniversalRewardFromSession(s);
                    });
                  }
                }
              }, 1100);
            } else {
              new Audio("audio/" + (task.wrongSound || s.wrongSound || "fail.mp3")).play();
              const feedback = document.createElement("div");
              feedback.textContent = task.onWrong || "Oops! Try again!";
              feedback.style.textAlign = "center";
              feedback.style.color = "#d32f2f";
              feedback.style.fontWeight = "bold";
              feedback.style.margin = "16px 0 4px 0";
              mainWrap.appendChild(feedback);
              setTimeout(() => {
                // Reset alles
                colorOrder.length = 0;
                used.fill(false);
                slots.forEach((slot) => {
                  slot.style.background = "#fafafa";
                  slot.style.color = "#222";
                  slot.innerText = "";
                });
                ballsBox.querySelectorAll("button").forEach((ball) => {
                  ball.disabled = false;
                  ball.style.opacity = "1";
                });
                feedback.remove();
              }, 1300);
            }
          }, 280);
        }
      };
      ballsBox.appendChild(ball);
    });
  }
}

else if (s.type === "color-sequence") {
  clearTimeouts();
  renderFrogProgress(lastSessionIdx, idx);
  document.querySelectorAll(".floating-video, .centered-next-btn, .reward-container").forEach(e => e.remove());
  const textArea = document.getElementById("sessionTextArea");
  textArea.innerHTML = "";

  // Überschrift
  const heading = document.createElement('h2');
  heading.className = "session-heading";
  heading.textContent = s.title || "Color Sequence!";
  heading.style.textAlign = "center";
  heading.style.margin = "18px 0 8px 0";
  heading.style.fontSize = "2.2rem";
  textArea.appendChild(heading);

  const mainWrap = document.createElement('div');
  mainWrap.style.display = "flex";
  mainWrap.style.flexDirection = "column";
  mainWrap.style.justifyContent = "center";
  mainWrap.style.alignItems = "center";
  mainWrap.style.minHeight = "55vh";
  textArea.appendChild(mainWrap);

  // Musik
  let sessionMusic = null;
  if (s.music) {
    sessionMusic = new Audio("audio/" + s.music);
    sessionMusic.loop = true;
    sessionMusic.volume = 0.16;
    sessionMusic.play();
    document.addEventListener("visibilitychange", function musicPauseHandler() {
      if (document.hidden && sessionMusic) sessionMusic.pause();
      else if (!document.hidden && sessionMusic) sessionMusic.play();
    });
    window.addEventListener("pagehide", function () {
      if (sessionMusic) { sessionMusic.pause(); sessionMusic.currentTime = 0; }
    });
  }

  // Video
  if (s.video) {
    const videoBox = document.createElement("div");
    videoBox.className = "floating-video";
    videoBox.style.position = "fixed";
    videoBox.style.right = "14px";
    videoBox.style.bottom = "62px";
    videoBox.style.zIndex = "1000";

    const video = document.createElement("video");
    video.src = "videos/" + s.video;
    video.controls = false;
    video.muted = false;
    video.playsInline = true;
    video.className = "session-video";
    video.style.pointerEvents = "none";
    videoBox.appendChild(video);

    const playBtn = document.createElement("button");
    playBtn.className = "custom-play-btn";
    playBtn.innerHTML = `<svg viewBox="0 0 60 60"><circle cx="30" cy="30" r="28" fill="none"/><polygon points="22,16 46,30 22,44" fill="#383838"/></svg>`;
    videoBox.appendChild(playBtn);

    playBtn.onclick = () => {
      video.play();
      playBtn.style.display = "none";
      video.style.pointerEvents = "auto";
    };

    video.addEventListener("ended", () => {
      playBtn.style.display = "";
      video.style.pointerEvents = "none";
      showTask();
    });

    document.body.appendChild(videoBox);
  } else {
    showTask();
  }

  const tasks = Array.isArray(s.tasks) ? s.tasks : [s];
  const pauseBetweenQuestions = s.pauseBetweenTasks || 1700;
  const sessionStart = Date.now();
  const minDuration = parseInt(s.minDuration || "60", 10);
  let taskIdx = 0;

  function showTask() {
  mainWrap.innerHTML = "";
  const current = tasks[taskIdx];

  // 1) Question text
  const q = document.createElement("div");
  q.textContent = current.question;
  Object.assign(q.style, {
    textAlign: "center",
    fontSize: "1.25rem",
    fontWeight: "bold",
    marginBottom: "16px"
  });
  mainWrap.appendChild(q);

  // 2) Drop targets
  const dropBox = document.createElement("div");
  Object.assign(dropBox.style, {
    display: "flex",
    justifyContent: "center",
    gap: "20px",
    marginBottom: "20px"
  });
  mainWrap.appendChild(dropBox);

  let userOrder = Array(current.colors.length).fill(null);

  function renderDrops() {
    dropBox.innerHTML = "";
    current.colors.forEach((col, i) => {
      const slot = document.createElement("div");
      Object.assign(slot.style, {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "60px"
      });

      const circle = document.createElement("div");
      Object.assign(circle.style, {
        width: "48px",
        height: "48px",
        borderRadius: "50%",
        border: "3px dashed #ffd54f",
        background: userOrder[i] !== null ? current.colors[userOrder[i]] : "#fffbe6",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "1.3rem",
        cursor: userOrder[i] !== null ? "pointer" : "default"
      });
      circle.textContent = userOrder[i] === null ? "?" : "";
      if (userOrder[i] !== null) {
        circle.onclick = () => {
          const idx = userOrder[i];
          userOrder[i] = null;
          colorBtns[idx].disabled = false;
          colorBtns[idx].style.opacity = "1";
          renderDrops();
        };
      }

      const label = document.createElement("div");
      label.textContent = userOrder[i] !== null
        ? current.colors[userOrder[i]].charAt(0).toUpperCase() + current.colors[userOrder[i]].slice(1)
        : "";
      label.style.marginTop = "6px";

      slot.append(circle, label);
      dropBox.appendChild(slot);
    });
  }
  renderDrops();

  // 3) Color option buttons
  const pickBox = document.createElement("div");
  Object.assign(pickBox.style, {
    display: "flex",
    justifyContent: "center",
    gap: "14px",
    marginBottom: "20px"
  });
  mainWrap.appendChild(pickBox);

  const colorBtns = current.colors.map((col, i) => {
    const btn = document.createElement("button");
    Object.assign(btn.style, {
      background: "none",
      border: "none",
      cursor: "pointer",
      display: "flex",
      flexDirection: "column",
      alignItems: "center"
    });
    const circ = document.createElement("div");
    Object.assign(circ.style, {
      width: "48px",
      height: "48px",
      borderRadius: "50%",
      background: col,
      border: "3px solid #ffd54f"
    });
    const lbl = document.createElement("div");
    lbl.textContent = col.charAt(0).toUpperCase() + col.slice(1);
    lbl.style.marginTop = "6px";

    btn.append(circ, lbl);
    btn.onclick = () => {
      const emptyIdx = userOrder.indexOf(null);
      if (emptyIdx >= 0) {
        userOrder[emptyIdx] = i;
        btn.disabled = true;
        btn.style.opacity = "0.5";
        renderDrops();
      }
    };
    pickBox.appendChild(btn);
    return btn;
  });

  // 4) Check Order button
  const checkBtn = document.createElement("button");
  checkBtn.innerText = "Check Order";
  checkBtn.className = "centered-next-btn";
  Object.assign(checkBtn.style, {
    position: "relative",
    zIndex: "2001",
    margin: "0 auto 20px",
    display: "block"
  });
  mainWrap.appendChild(checkBtn);

  // 5) Button logic
  checkBtn.onclick = () => {
    if (userOrder.includes(null)) {
      checkBtn.innerText = "Please place all colors!";
      checkBtn.style.background = "#ffcdd2";
      return setTimeout(() => {
        checkBtn.innerText = "Check Order";
        checkBtn.style.background = "";
      }, 800);
    }
    const isCorrect = JSON.stringify(userOrder) === JSON.stringify(current.solution);
    const soundFile = isCorrect ? (current.correctSound || s.correctSound) : (current.wrongSound || s.wrongSound);
    new Audio("audio/" + soundFile).play();

    if (isCorrect) {
      checkBtn.innerText = "Great!";
      setTimeout(() => {
        taskIdx++;
        if (taskIdx < tasks.length) {
          showTask();
        } else {
          showUniversalRewardFromSession(s);
        }
      }, pauseBetweenTasks);
    } else {
      checkBtn.innerText = "Oops, try again!";
      checkBtn.style.background = "#ffcdd2";
      setTimeout(() => {
        checkBtn.innerText = "Check Order";
        checkBtn.style.background = "";
      }, 800);
    }
  };
}


  if (!s.video) showTask();
}



else if (s.type === "color-detective") {
  clearTimeouts();
  renderFrogProgress(lastSessionIdx, idx);
  document.querySelectorAll(".floating-video, .centered-next-btn").forEach(el => el.remove());
  const textArea = document.getElementById("sessionTextArea");
  textArea.innerHTML = "";

  // === Überschrift schon VOR dem Video ===
  const heading = document.createElement('h2');
  heading.className = "session-heading";
  heading.style.textAlign = "center";
  heading.style.marginTop = "6px";
  heading.innerText = s.title || "Color Detective!";
  textArea.appendChild(heading);

  let sessionMusic = null;
  if (s.music) {
    sessionMusic = new Audio("audio/" + s.music);
    sessionMusic.loop = true;
    sessionMusic.volume = 0.20;
    sessionMusic.play();
  }

  playSessionVideoIfNeeded(s, showDetectiveTask);

  function showDetectiveTask() {
    if (s.avatar) showAvatarInVideoBox(null, s.avatar);

    // Frage
    const q = document.createElement("div");
    q.className = "animated-text";
    q.style.textAlign = "center";
    q.style.fontSize = "1.18rem";
    q.innerText = s.question || "Find the right color!";
    q.style.marginTop = "14px";
    textArea.appendChild(q);

    // Kreise weiter unten, mittig
    const box = document.createElement("div");
    box.style.display = "flex";
    box.style.justifyContent = "center";
    box.style.gap = "30px";
    box.style.marginTop = "48px";
    textArea.appendChild(box);

    s.choices.forEach((col, i) => {
      const btn = document.createElement("button");
      btn.style.width = "74px";
      btn.style.height = "74px";
      btn.style.borderRadius = "50%";
      btn.style.background = col;
      btn.style.border = "5px solid #ffd54f";
      btn.style.margin = "0 8px";
      btn.style.display = "flex";
      btn.style.alignItems = "center";
      btn.style.justifyContent = "center";
      btn.style.boxShadow = "0 2px 14px #ffd54f44";
      btn.onclick = () => {
        if (i === s.correct) {
          const yay = new Audio("audio/yay.mp3");
          yay.play();
          setTimeout(() => {
            if (sessionMusic) {
              sessionMusic.pause();
              sessionMusic.currentTime = 0;
            }
            showUniversalReward(
              "🔎",
              s.onCorrect || "Well done!",
              () => { currentSession++; renderSession(currentSession); },
              s.successSticker || 0
            );
          }, 700);
        } else {
          new Audio("audio/fail.mp3").play();
          btn.classList.add("shake");

          // Oops... try again Feedback
          const err = document.createElement("div");
          err.className = "animated-text";
          err.style.color = "#d32f2f";
          err.style.textAlign = "center";
          err.style.marginTop = "10px";
          err.innerText = "Oops... try again!";
          textArea.appendChild(err);

          setTimeout(() => btn.classList.remove("shake"), 700);
          setTimeout(() => {
            if (err.parentNode) err.remove();
          }, 1500);
        }
      };
      box.appendChild(btn);
    });
  }
}







else if (s.type === "color-memory") {
  clearTimeouts();
  renderFrogProgress(lastSessionIdx, idx);
  document.querySelectorAll(".floating-video, .centered-next-btn").forEach(el => el.remove());
  const textArea = document.getElementById("sessionTextArea");
  textArea.innerHTML = "";

  const heading = document.createElement('h2');
  heading.className = "session-heading";
  heading.style.textAlign = "center";
  heading.style.marginTop = "6px";
  heading.innerText = s.title || "Memory Game!";
  textArea.appendChild(heading);

  let sessionMusic = null;
  if (s.music) {
    sessionMusic = new Audio("audio/" + s.music);
    sessionMusic.loop = true;
    sessionMusic.volume = 0.20;
    sessionMusic.play();
  }

  playSessionVideoIfNeeded(s, showMemoryTask);

  function showMemoryTask() {
    // "Show sequence again"-Button (oben, schön, bunt)
    const againBtn = document.createElement("button");
    againBtn.innerText = "Show sequence again";
    againBtn.className = "rainbow-btn-animated";
    againBtn.style.display = "block";
    againBtn.style.margin = "18px auto 20px auto";
    againBtn.style.padding = "1em 2em";
    againBtn.style.fontSize = "1.09rem";
    againBtn.style.fontWeight = "bold";
    againBtn.style.border = "none";
    againBtn.style.borderRadius = "22px";
    againBtn.style.background = "linear-gradient(90deg, #ffeb3b, #81d4fa, #ff80ab, #aed581, #fff176, #ffd54f)";
    againBtn.style.boxShadow = "0 2px 14px #ffd54f55";
    againBtn.style.cursor = "pointer";
    againBtn.style.animation = "rainbowPulse 1.1s infinite alternate";
    againBtn.onclick = () => {
      showSequence();
    };
    textArea.appendChild(againBtn);

    // Sequenz einmal initial zeigen
    showSequence();

    function showSequence() {
      const seqBox = document.createElement("div");
      seqBox.style.display = "flex";
      seqBox.style.justifyContent = "center";
      seqBox.style.gap = "18px";
      seqBox.style.fontSize = "2rem";
      seqBox.style.margin = "16px auto 20px auto";
      s.sequence.forEach(color => {
        const ball = document.createElement("div");
        ball.style.width = "50px";
        ball.style.height = "50px";
        ball.style.borderRadius = "50%";
        ball.style.background = color.toLowerCase();
        ball.style.border = "3px solid #ffd54f";
        ball.title = color;
        ball.style.display = "inline-block";
        ball.style.margin = "0 6px";
        seqBox.appendChild(ball);
      });
      textArea.appendChild(seqBox);

      setTimeout(() => {
        seqBox.remove();
      }, 3000);
    }

    setTimeout(() => {
      const q = document.createElement("div");
      q.className = "animated-text";
      q.innerText = "Which order was correct?";
      q.style.textAlign = "center";
      textArea.appendChild(q);

      const box = document.createElement("div");
      box.style.display = "flex";
      box.style.flexDirection = "column";
      box.style.alignItems = "center";
      box.style.gap = "14px";
      box.style.marginTop = "20px";
      textArea.appendChild(box);

      s.choices.forEach((order, i) => {
        const btn = document.createElement("button");
        btn.innerText = order;
        btn.style.background = "#fffbe6";
        btn.style.border = "2px solid #ffd54f";
        btn.style.borderRadius = "16px";
        btn.style.padding = "0.9em 1.5em";
        btn.style.fontSize = "1.11rem";
        btn.style.width = "220px";
        btn.style.margin = "0 auto";
        btn.onclick = () => {
          if (i === s.correct) {
            const yay = new Audio("audio/yay.mp3");
            yay.play();
            setTimeout(() => {
              if (sessionMusic) {
                sessionMusic.pause();
                sessionMusic.currentTime = 0;
              }
              showUniversalReward(
                "🧠",
                s.onCorrect || "Well remembered!",
                () => { currentSession++; renderSession(currentSession); },
                s.successSticker || 0
              );
            }, 700);
          } else {
            new Audio("audio/fail.mp3").play();
            btn.classList.add("shake");

            // Oops... try again Feedback
            const err = document.createElement("div");
            err.className = "animated-text";
            err.style.color = "#d32f2f";
            err.style.textAlign = "center";
            err.style.marginTop = "10px";
            err.innerText = "Oops... try again!";
            textArea.appendChild(err);

            setTimeout(() => btn.classList.remove("shake"), 700);
            setTimeout(() => {
              if (err.parentNode) err.remove();
            }, 1500);
          }
        };
        box.appendChild(btn);
      });
    }, 3500);
  }
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

