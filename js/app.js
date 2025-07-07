/* jshint esversion: 6 */

const DEV_MODE = true;    // Auf true setzen für Entwicklung, auf false für Produktion
let DEV_START_SESSION = 5; // 0 = Intro, 1 = Breathing, 2 = Counting, usw.



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

// 🎁 Globale Funktion für zentrierten Reward-Sticker + Yay!
function showUniversalReward(imgSrcOrText, correctTextStr = "", nextAction = null, stickerIdx = 0) {
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

  // Korrekte Antwort/Text/Bild, wie gehabt
  if (imgSrcOrText && typeof imgSrcOrText === "string" && imgSrcOrText.startsWith("images/")) {
    const img = document.createElement("img");
    img.src = imgSrcOrText;
    img.style.width = "90px";
    img.style.height = "90px";
    img.style.objectFit = "cover";
    img.style.borderRadius = "22px";
    img.style.marginBottom = "14px";
    reward.appendChild(img);
  } else if (imgSrcOrText) {
    const word = document.createElement("div");
    word.textContent = imgSrcOrText;
    word.style.fontSize = "2.1rem";
    word.style.fontWeight = "bold";
    word.style.color = "#44a047";
    word.style.marginBottom = "16px";
    reward.appendChild(word);
  }

  // Text-Feedback ("Great", "Correct", etc.)
  if (typeof correctTextStr === "string" && correctTextStr.length > 0) {
    const correctText = document.createElement("div");
    correctText.className = "animals-correct-text";
    correctText.innerText = correctTextStr;
    correctText.style.marginBottom = "9px";
    correctText.style.fontSize = "1.1rem";
    correctText.style.color = "#444";
    correctText.style.textAlign = "center";
    reward.appendChild(correctText);
  }

  // Yay & Reward-Text
  const yay = document.createElement("div");
  yay.textContent = "🎉 Yay! Your Reward";
  yay.style.fontWeight = "bold";
  yay.style.fontSize = "1.45rem";
  yay.style.color = "#ffa000";
  yay.style.textShadow = "0 1px 6px #fff9c4";
  yay.style.marginBottom = "11px";
  reward.appendChild(yay);

  // Animierter Sticker (KORREKTER STICKER, dynamisch nach Index!)
  const stickerImg = document.createElement("img");
  stickerImg.src = stickerImages[stickerIdx] || stickerImages[0]; // <-- Das ist die Änderung!
  stickerImg.style.width = "72px";
  stickerImg.style.height = "72px";
  stickerImg.style.borderRadius = "16px";
  stickerImg.style.margin = "0 0 4px 0";
  stickerImg.className = "reward-animated";
  reward.appendChild(stickerImg);

  document.body.appendChild(reward);

  // Sticker speichern – das ist jetzt überall garantiert!
  if (typeof unlockSticker === "function" && typeof stickerIdx === "number") {
    unlockSticker(stickerIdx);
  }

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


function showUniversalReward(imgSrcOrText, correctTextStr = "", nextAction = null, stickerIdx = 0) {
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

  if (correctTextStr) {
    const correctText = document.createElement("div");
    correctText.className = "animals-correct-text";
    correctText.innerText = correctTextStr;
    correctText.style.marginBottom = "9px";
    correctText.style.fontSize = "1.1rem";
    correctText.style.color = "#444";
    correctText.style.textAlign = "center";
    reward.appendChild(correctText);
  }

  // Bild oder Wort
  if (imgSrcOrText && typeof imgSrcOrText === "string" && imgSrcOrText.startsWith("images/")) {
    const img = document.createElement("img");
    img.src = imgSrcOrText;
    img.style.width = "90px";
    img.style.height = "90px";
    img.style.objectFit = "cover";
    img.style.borderRadius = "22px";
    img.style.marginBottom = "14px";
    reward.appendChild(img);
  } else if (imgSrcOrText) {
    const word = document.createElement("div");
    word.textContent = imgSrcOrText;
    word.style.fontSize = "2.1rem";
    word.style.fontWeight = "bold";
    word.style.color = "#44a047";
    word.style.marginBottom = "16px";
    reward.appendChild(word);
  }

  // Yay & Reward
  const yay = document.createElement("div");
  yay.textContent = "🎉 Yay! Your Reward";
  yay.style.fontWeight = "bold";
  yay.style.fontSize = "1.45rem";
  yay.style.color = "#ffa000";
  yay.style.textShadow = "0 1px 6px #fff9c4";
  yay.style.marginBottom = "11px";
  reward.appendChild(yay);

  // Animierter Stern
  const star = document.createElement("img");
  star.src = "images/stickers/star.png";
  star.style.width = "72px";
  star.style.height = "72px";
  star.style.borderRadius = "16px";
  star.style.margin = "0 0 4px 0";
  star.className = "reward-animated";
  reward.appendChild(star);

  document.body.appendChild(reward);

  // Sticker speichern
  if (typeof unlockSticker === "function" && typeof stickerIdx === "number") {
    unlockSticker(stickerIdx);
  }

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
      startBreathingSteps();
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
  else if (s.type === "counting") {
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

  let videoBox = null;

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
    videoBox.style.bottom = "22px";
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








// ==== 4. NEUES MODUL: MEMORY ====
   else if (s.type === "memory") {
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

  // --- VIDEO (optional, Animals-Style) ---
  // --- VIDEO (optional, Animals-Style) ---
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

  // Floating Video-Box (unten rechts, wie bei animals)
  const videoBox = document.createElement("div");
  videoBox.className = "floating-video";
  videoBox.style.position = "fixed";
  videoBox.style.bottom = "22px";
  videoBox.style.right = "22px";
  videoBox.style.zIndex = "1000";
  videoBox.appendChild(video);
  document.body.appendChild(videoBox);

  // Play button overlay (wie bei animals)
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
    // Video-Box entfernen nach Ende
    videoBox.remove();
    startMemoryGame();
  });

  return; // Don't show game before video ended!
} else {
  startMemoryGame();
}


  function startMemoryGame() {
    textArea.innerHTML = "";

    // --- Heading & Avatar ---
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

    // --- Game Board ---
    const board = document.createElement('div');
    board.style.display = "grid";
    board.style.gridTemplateColumns = "repeat(4, 58px)";
    board.style.gap = "16px";
    board.style.margin = "22px 0";
    board.style.justifyContent = "center";
    textArea.appendChild(board);

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
    createRewardStar();

    // Compliment
    let compliments = [
      "Super memory skills!",
      "You are a clever fox!",
      "Max is proud of you!",
      "You rock!"
    ];
    let compliment = compliments[Math.floor(Math.random() * compliments.length)];
    setTimeout(() => {
      let praise = document.createElement('div');
      praise.className = "animated-text";
      praise.style.color = "#44a047";
      praise.style.textAlign = "center";
      praise.style.marginTop = "18px";
      praise.innerHTML = compliment;
      textArea.appendChild(praise);
    }, 1600);

    // Unlock sticker
    if (typeof unlockSticker === "function" && s.successSticker !== undefined) {
      unlockSticker(s.successSticker);
    }

    // Next/Finish Button
    setTimeout(() => {
      const btn = document.createElement('button');
      btn.innerText = currentSession < sessions.length - 1 ? "Next" : "Finish";
      btn.className = "centered-next-btn";
      btn.onclick = () => {
        document.querySelectorAll(".centered-next-btn, div[style*='fixed'], .animated-text").forEach(e => e.remove());
        currentSession++;
        renderSession(currentSession);
      };
      document.body.appendChild(btn);
    }, 2200);
  }

  return;
}



// ==== Modul: SCHATTENRÄTSEL ====
 else if (s.type === "shadow") {
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
  showUniversalReward(
    s.choices[i],               // Das richtige Bild
    s.onCorrect || "",          // Richtiger Text (optional)
    null,                       // Callback (Next wird universell erzeugt)
    s.successSticker || 0       // Sticker-Index, falls definiert
  );
  return;
} else {
    // ---- HIER DIESEN CODE EINBAUEN: ----
    btn.style.border = "2px solid #d32f2f";
    feedback.textContent = s.onWrong || "Oops, that's not right. Try again!";
    feedback.style.color = "#d32f2f";
    textArea.appendChild(feedback);
    btn.classList.add("shake");
    setTimeout(() => btn.classList.remove("shake"), 600);
    setTimeout(() => {
      if (feedback.parentNode) feedback.remove();
      btn.style.border = "2px solid #ffd54f";
    }, 1500);
  }
}
  }
 }


  
// ==== Modul: ANIMALS ====
 else if (s.type === "animals") {
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









  // ==== Modul: RHYME ====
  else if (s.type === "rhyme") {
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
      showAvatarInVideoBox(videoBox, "benny");
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
    box.style.justifyContent = "center";
    box.style.gap = "16px";
    box.style.padding = "0 24px";
    box.style.maxWidth = "440px";
    textArea.appendChild(box);

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
      btn.innerText = idx < sessions.length - 1 ? "Next" : "Finish";
      btn.className = "centered-next-btn";
      btn.onclick = () => {
        if (idx >= sessions.length - 1) {
          localStorage.setItem(`day${localDay}Completed`, "1");
          window.location.href = "choose.html";
        } else {
          currentSession++;
          renderSession(currentSession);
        }
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
 else if (s.type === "pattern") {
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



// ==== Modul: CHATGPT-QUIZ ====
 else if (s.type === "chatgpt-quiz") {
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


 // ==== AI-EMOJI-MADNESS ====
// In renderSession(idx) einfügen
else if (s.type === "ai-emoji-madness") {
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

