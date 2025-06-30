const DEV_MODE = true;    // Auf true setzen für Entwicklung, auf false für Produktion
let DEV_START_SESSION = 0; // 0 = Intro, 1 = Breathing, 2 = Counting, usw.

function getDayParam() {
  const params = new URLSearchParams(window.location.search);
  return parseInt(params.get("day")) || 1;
}
let currentDay = getDayParam();
const jsonURL = `days/day${currentDay}.json`;



let sessions = [];
let currentSession = 0;
let textTimeouts = [];
let videoElement = null;


// Breathing Musik vorbereiten
const breathingMusic = document.getElementById("breathingMusic") 
   || new Audio("audio/focus-loop.mp3");  // Fallback, falls kein Audio-Tag
breathingMusic.loop = true;
breathingMusic.volume = 0.22;

function capitalize(word) {
  if (!word) return "";
  return word.charAt(0).toUpperCase() + word.slice(1);
}

// Musik & Sound
const welcomeMusic = document.getElementById("welcomeMusic");
welcomeMusic.volume = 0.3;

const frogSound = document.getElementById("frogSound");
frogSound.volume = 0.42;

const introMusic = new Audio("audio/counting-benny-bg.mp3");
introMusic.loop = true;
introMusic.volume = 0.18;

// Fortschrittsbalken (Frosch)
function renderFrogProgress(sessionIdx) {
  const total = sessions.length;
  const bar = document.getElementById("progressFrogBar");
  bar.innerHTML = "";
  const barTrack = document.createElement("div");
  barTrack.className = "frog-bar-track";
  bar.appendChild(barTrack);
  const spots = [];
  for (let i = 0; i < total; i++) {
    const spot = document.createElement("div");
    spot.className = "frog-bar-spot" + (i < sessionIdx ? " frog-bar-done" : "") + (i === sessionIdx ? " active" : "");
    barTrack.appendChild(spot);
    spots.push(spot);
  }
  // Frosch-Bild
  const frog = document.createElement("img");
  frog.src = "images/frog.png";
  frog.alt = "Frog";
  frog.id = "jumpingFrog";
  barTrack.appendChild(frog);
  setTimeout(() => {
    const spot = spots[sessionIdx];
    if (spot) {
      const left = spot.offsetLeft + (spot.offsetWidth - frog.offsetWidth) / 2;
      frog.style.left = left + "px";
      frog.style.animation = "frogHop 0.45s";
      frog.addEventListener("animationend", () => { frog.style.animation = ""; }, { once: true });
      frogSound.currentTime = 0;
      frogSound.play();
    }
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

// Session mit Video, Play-Overlay, animiertem Text und fixiertem Next-Button
function renderSession(idx) {
	console.log("Session-Objekt:", s);
  try { breathingMusic.pause(); breathingMusic.currentTime = 0; } catch(e) {}
  clearTimeouts();
  renderFrogProgress(idx);
  document.querySelectorAll(".floating-video, .fixed-next-btn, .centered-next-btn").forEach(el => el.remove());
  document.getElementById('sessionTextArea').innerHTML = "";

  const s = sessions[idx];
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
      <div class="play-tap-hint">Tap here to play!</div>
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
  if (s.type === "breathing") {
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
      <div class="play-tap-hint">Tap here to play!</div>
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
        currentSession++;
        renderSession(currentSession);
      };
      document.body.appendChild(btn);
    }
    return; // WICHTIG!
  }

  // ===== 3. COUNTING =====
  if (s.type === "counting") {
  clearTimeouts();
  const textArea = document.getElementById('sessionTextArea');
  textArea.innerHTML = "";

  // Überschrift und Avatar
  const heading = document.createElement('h2');
  heading.className = "session-heading";
  heading.textContent = s.title || "Counting Time!";
  textArea.appendChild(heading);

  if (s.avatar) {
    const avatarImg = document.createElement('img');
    avatarImg.src = "images/" + s.avatar + ".png";
    avatarImg.alt = s.avatar;
    avatarImg.className = "intro-avatar-small";
    textArea.appendChild(avatarImg);
  }

  // Animierte Zeilen (oben)
  const linesBox = document.createElement('div');
  linesBox.className = "animated-lines";
  textArea.appendChild(linesBox);

  if (Array.isArray(s.text)) {
    s.text.forEach((line, idx) => {
      setTimeout(() => {
        const p = document.createElement('div');
        p.className = "animated-text";
        p.innerText = line.line || line;
        linesBox.appendChild(p);
      }, idx * 900);
    });
  }

  // Video-Bereich (unten rechts, wie bei Intro)
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
      <div class="play-tap-hint">Tap here to play!</div>
    `;
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
    videoElement.addEventListener('ended', () => {
      playBtn.style.display = "";
      videoElement.style.pointerEvents = "none";
      showNextBtn();
    });
    videoBox.appendChild(playBtn);

    // Zähl-Overlay, wenn countingTimings definiert
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
              <div class="count-overlay">
                <img src="${step.image}" style="width:48px;height:48px;margin-right:18px;">
                <span style="font-size:2.3rem;font-weight:bold;">${step.number}</span>
              </div>
            `;
            setTimeout(() => {
              overlay.style.display = "none";
            }, 1400);
          }, (step.time || idx * 4) * 1000);
          timeoutHandles.push(timeout);
        });
      });

      videoElement.addEventListener('ended', clearCountingOverlays);
      videoElement.addEventListener('pause', clearCountingOverlays);
    }

    // Next-Button nach Video-Ende
    function showNextBtn() {
      const btn = document.createElement('button');
      btn.innerText = currentSession < sessions.length - 1 ? "Next" : "Finish";
      btn.className = "centered-next-btn";
      btn.onclick = () => {
        document.querySelectorAll('.floating-video, #countingOverlay').forEach(el => el.remove());
        currentSession++;
        renderSession(currentSession);
      };
      document.body.appendChild(btn);
    }
  } else {
    // Fallback: Kein Video, sofort Next-Button
    const btn = document.createElement('button');
    btn.innerText = currentSession < sessions.length - 1 ? "Next" : "Finish";
    btn.className = "centered-next-btn";
    btn.onclick = () => {
      currentSession++;
      renderSession(currentSession);
    };
    document.body.appendChild(btn);
  }
  return;
}



// Am Anfang von renderSession() nach dem Switch/if zu session.type


// ==== 4. NEUES MODUL: MEMORY ====
if (s.type === "memory") {
  // Speicher die Session-TextArea
  const textArea = document.getElementById('sessionTextArea');
  textArea.innerHTML = "";
  
  // Überschrift, Avatar
  const heading = document.createElement('h2');
  heading.className = "session-heading";
  heading.textContent = "Memory Game!";
  textArea.appendChild(heading);

  if (s.avatar) {
    const avatarImg = document.createElement('img');
    avatarImg.src = "images/" + s.avatar + ".png";
    avatarImg.alt = s.avatar;
    avatarImg.className = "intro-avatar-small";
    textArea.appendChild(avatarImg);
  }

  // Spielfeld
  const board = document.createElement('div');
  board.style.display = "grid";
  board.style.gridTemplateColumns = "repeat(4, 58px)";
  board.style.gap = "16px";
  board.style.margin = "22px 0";
  board.style.justifyContent = "center";
  textArea.appendChild(board);

  // Karten mischen
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
    btn.innerHTML = `<span style="font-size:2.5rem;">❓</span>`; // Verdeckt

    btn.onclick = function () {
      if (btn.classList.contains("matched") || btn === opened[0]) return;
      btn.innerHTML = `<img src="${card.img}" alt="card" style="width:48px;height:48px;">`;
      opened.push(btn);

      if (opened.length === 2) {
        if (opened[0].dataset.pair === opened[1].dataset.pair) {
          // Richtig!
          opened[0].classList.add("matched");
          opened[1].classList.add("matched");
          matched.push(opened[0], opened[1]);
          opened = [];
          if (matched.length === shuffled.length) {
            setTimeout(() => {
              showMemoryReward();
            }, 600);
          }
        } else {
          // Falsch: kurz anzeigen, dann wieder verdecken
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

  // Belohnung/Sticker/Glitzer nach Abschluss
  function showMemoryReward() {
    // Glitzer-Konfetti
    let confetti = document.createElement('div');
    confetti.className = "animated-text glitter";
    confetti.style.fontSize = "1.8rem";
    confetti.innerHTML = "You did it! 🎉<br>Sticker unlocked!";
    textArea.appendChild(confetti);

    // Zufälliger Spruch
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
      praise.innerHTML = compliment;
      textArea.appendChild(praise);
    }, 1400);

    // Sticker (direkt am Board/Popup) – hier kannst du unlockSticker(s.successSticker) aufrufen!
    setTimeout(() => {
      if (typeof unlockSticker === "function" && s.successSticker !== undefined) unlockSticker(s.successSticker);
      const btn = document.createElement('button');
      btn.innerText = idx < sessions.length - 1 ? "Next" : "Finish";
      btn.className = "centered-next-btn";
      btn.onclick = () => {
        currentSession++;
        renderSession(currentSession);
      };
      textArea.appendChild(btn);
    }, 2200);
  }
  return; // Wichtig!
}

// ==== 5. NEUES MODUL: SCHATTENRÄTSEL ====
if (s.type === "shadow") {
  const textArea = document.getElementById('sessionTextArea');
  textArea.innerHTML = "";

  const heading = document.createElement('h2');
  heading.className = "session-heading";
  heading.textContent = "Shadow Match!";
  textArea.appendChild(heading);

  // Schattenbild
  const shadowImg = document.createElement('img');
  shadowImg.src = s.shadow;
  shadowImg.style.width = "90px";
  shadowImg.style.height = "90px";
  shadowImg.style.filter = "brightness(0) grayscale(1)";
  shadowImg.style.margin = "18px 0";
  textArea.appendChild(shadowImg);

  // Auswahlmöglichkeiten
  const choices = document.createElement('div');
  choices.style.display = "flex";
  choices.style.justifyContent = "center";
  choices.style.gap = "18px";
  textArea.appendChild(choices);

  s.choices.forEach((img, i) => {
    const btn = document.createElement('button');
    btn.style.width = "72px";
    btn.style.height = "72px";
    btn.style.borderRadius = "20px";
    btn.style.background = "#fffbe6";
    btn.style.border = "2px solid #ffd54f";
    btn.style.boxShadow = "0 2px 10px #81d4fa88";
    btn.style.cursor = "pointer";
    btn.innerHTML = `<img src="${img}" alt="choice" style="width:60px;height:60px;">`;
    btn.onclick = () => {
      if (i === s.correct) {
        btn.style.border = "2px solid #43a047";
        setTimeout(() => showShadowReward(), 350);
      } else {
        btn.style.border = "2px solid #d32f2f";
        btn.classList.add("shake");
        setTimeout(() => {
          btn.style.border = "2px solid #ffd54f";
          btn.classList.remove("shake");
        }, 600);
      }
    };
    choices.appendChild(btn);
  });

  function showShadowReward() {
    let confetti = document.createElement('div');
    confetti.className = "animated-text glitter";
    confetti.style.fontSize = "1.6rem";
    confetti.innerHTML = "Correct! 🥳 Sticker unlocked!";
    textArea.appendChild(confetti);

    setTimeout(() => {
      let praise = document.createElement('div');
      praise.className = "animated-text";
      praise.style.color = "#44a047";
      praise.innerHTML = "Coach Max says: You are a shadow detective!";
      textArea.appendChild(praise);
    }, 1200);

    setTimeout(() => {
      if (typeof unlockSticker === "function" && s.successSticker !== undefined) unlockSticker(s.successSticker);
      const btn = document.createElement('button');
      btn.innerText = currentSession < sessions.length - 1 ? "Next" : "Finish";
      btn.className = "centered-next-btn";
      btn.onclick = () => {
        currentSession++;
        renderSession(currentSession);
      };
      textArea.appendChild(btn);
    }, 1800);
  }
  return;
}

// ...dein bestehendes renderSession geht weiter...

   

// Hilfsfunktion am Ende deiner Datei (oder im Kopf)
function finishDay() {
  clearTimeouts();
  document.querySelectorAll(".floating-video, .fixed-next-btn").forEach(el => el.remove());
  document.getElementById('sessionTextArea').innerHTML =
    `<div class="animated-text glitter" style="font-size:1.8rem;">Congratulations! You finished today’s adventure! 🥳</div>`;
}



window.onload = async () => {
  const res = await fetch(jsonURL);
  const data = await res.json();
  sessions = data.sessions;
  currentDay = data.day || 1;

  currentSession = DEV_MODE ? DEV_START_SESSION : 0;

  if (DEV_MODE) {
    // Direkt die gewünschte Session anzeigen
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
const days = [
  { nr: 1, title: "Day 1" },
  { nr: 2, title: "Day 2" },
  { nr: 3, title: "Day 3" },
  // ...weitere Tage
];

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
    alert("Dieser Tag ist erst ab 6:00 Uhr morgens verfügbar!");
    return;
  }
 // Weiterleitung zum entsprechenden Tag (z.B. day1.html, day2.html, ...)
  window.location.href = `day${dayNr}.html`;
}