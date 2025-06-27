const jsonURL = "days/day1.json";
let sessions = [];
let currentSession = 0;
let textTimeouts = [];
let videoElement = null;

// Erkennung Mobilgerät
function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Rotationshinweis/Seitenanzeige je nach Device & Ausrichtung
function handleOrientation() {
  const notice = document.getElementById("rotationNotice");
  const mainContent = document.getElementById("mainContent");
  const welcomeArea = document.getElementById('welcomeArea');
  const isPortrait = window.matchMedia("(orientation: portrait)").matches;
  const mobile = isMobileDevice();

  if (!mobile) {
    notice.style.display = "none";
    if (welcomeArea.style.display !== "none") mainContent.style.display = "none";
    else mainContent.style.display = '';
    return;
  }

  if (isPortrait) {
    notice.style.display = "none";
    if (welcomeArea.style.display !== "none") mainContent.style.display = "none";
    else mainContent.style.display = '';
  } else {
    notice.style.display = "flex";
    mainContent.style.display = "none";
  }
}
window.addEventListener("orientationchange", handleOrientation);
window.addEventListener("resize", handleOrientation);

// Welcome-Bereich animiert, zentral, groß, 6,5s sichtbar
function showWelcome(onFinish) {
  const lines = [
  "🎉 Welcome to Coach Max!",
  "Ready for a day full of fun and learning?",
  `Every tap brings you closer to today’s secret <span class="highlight-word">sticker</span>!`,
  "Let’s jump right in!"
];
  const welcomeArea = document.getElementById('welcomeArea');
  welcomeArea.innerHTML = "";

  // Container für animierte Zeilen
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
      setTimeout(showNextLine, 850);
    }
  }
  showNextLine();

  // Welcome nach 6,5s ausblenden, dann App starten
  setTimeout(() => {
    welcomeArea.style.opacity = 0;
    setTimeout(() => {
      welcomeArea.style.display = "none";
      document.getElementById("mainContent").style.display = "";
      if (typeof onFinish === "function") onFinish();
    }, 900);
  }, 6500);
}

window.onload = async () => {
  try {
    const res = await fetch(jsonURL);
    if (!res.ok) throw new Error("JSON not found: " + jsonURL);
    const data = await res.json();
    if (!data.sessions) throw new Error("No 'sessions' array in JSON!");
    sessions = data.sessions;

    // Welcome zuerst anzeigen, dann App starten
    showWelcome(() => {
      renderSession(currentSession);
      handleOrientation();
    });

  } catch (e) {
    document.body.innerHTML = `<h2 style="color:red">Error loading day: ${e}</h2>`;
    console.error(e);
  }
};

function clearTimeouts() {
  textTimeouts.forEach(t => clearTimeout(t));
  textTimeouts = [];
}

// Sessionanzeige inkl. Video, Play-Overlay, Frosch, Textanimation etc.
function renderSession(idx) {
  clearTimeouts();
  renderFrogProgress(idx);

  // Entferne ggf. alte Video/Frosch-Container
  document.querySelectorAll(".floating-video, .floating-frog").forEach(el => el.remove());
  // Entferne Texte
  document.getElementById('sessionTextArea').innerHTML = "";

  const s = sessions[idx];

  // --- Animierter Textbereich ---
  const textArea = document.getElementById('sessionTextArea');

  // --- Video-Element: fix unten rechts, rund ---
  videoElement = document.createElement('video');
  videoElement.src = `videos/${s.video}`;
  videoElement.setAttribute("controls", "true");
  videoElement.setAttribute("controlsList", "nodownload");
  videoElement.autoplay = false;
  videoElement.muted = false;
  videoElement.playsInline = true;
  videoElement.poster = "images/video-placeholder.png";
  videoElement.style.display = "block";
  videoElement.oncontextmenu = function(e) { e.preventDefault(); return false; };

  // Eigener Play-Button als Overlay (kann später noch durch Avatar ersetzt werden)
  const playBtn = document.createElement('button');
  playBtn.className = "custom-play-btn";
  playBtn.title = "Play";
  playBtn.innerHTML = `
    <svg viewBox="0 0 60 60">
      <circle cx="30" cy="30" r="28" fill="none"/>
      <polygon points="22,16 46,30 22,44" fill="#383838"/>
    </svg>
    <span style="display:block;font-size:1rem;color:#222;margin-top:2px;">Tap to play</span>
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
  });

  // Container fürs Video und den Play-Button
  const videoBox = document.createElement('div');
  videoBox.className = "floating-video";
  videoBox.appendChild(videoElement);
  videoBox.appendChild(playBtn);
  document.body.appendChild(videoBox);

  // Frosch (fix unten links)
  const frogBox = document.createElement('div');
  frogBox.className = "floating-frog";
  const frogImg = document.createElement('img');
  frogImg.src = "images/frog.png";
  frogImg.alt = "Frog";
  frogBox.appendChild(frogImg);
  document.body.appendChild(frogBox);

  // --- Next-Button ---
  const btn = document.createElement('button');
  btn.innerText = idx < sessions.length - 1 ? "Next" : "Finish";
  btn.className = "next-btn";
  btn.onclick = () => {
    currentSession++;
    if (currentSession < sessions.length) {
      renderSession(currentSession);
    } else {
      finishDay();
    }
  };

  // --- Animierte, getimte Textanzeige ---
  // Warte bis Video läuft!
  let textShown = false;
  videoElement.addEventListener('play', () => {
    if (textShown) return;
    textShown = true;
    showAnimatedTexts(s, textArea, btn);
  });
}

function showAnimatedTexts(session, textArea, btn) {
  textArea.innerHTML = "";
  // Zeitpunkte im JSON z.B. timings: [0, 2.5, 4.3]
  const timings = session.timings || [];
  session.text.forEach((t, i) => {
    let delay = (timings[i] !== undefined) ? timings[i] * 1000 : (i * 1800);
    textTimeouts.push(setTimeout(() => {
      const p = document.createElement('div');
      p.className = "animated-text";
      p.innerText = t;
      textArea.appendChild(p);
      // Automatisch nach unten scrollen wenn nötig
      p.scrollIntoView({behavior: "smooth", block: "end"});
      // Button nach dem letzten Text einblenden
      if (i === session.text.length - 1) {
        textArea.appendChild(btn);
      }
    }, delay));
  });
}

function finishDay() {
  clearTimeouts();
  document.querySelectorAll(".floating-video, .floating-frog").forEach(el => el.remove());
  document.getElementById('sessionTextArea').innerHTML =
    `<div class="animated-text" style="font-size:1.8rem;">Congratulations! You finished today’s adventure! 🥳</div>`;
}
function renderFrogProgress(sessionIdx) {
  const total = sessions.length;
  const bar = document.getElementById("progressFrogBar");
  bar.innerHTML = ""; // leeren

  // Track für Spots
  const barTrack = document.createElement("div");
  barTrack.className = "frog-bar-track";
  bar.appendChild(barTrack);

  // Spots bauen
  const spots = [];
  for (let i = 0; i < total; i++) {
    const spot = document.createElement("div");
    spot.className = "frog-bar-spot" + (i < sessionIdx ? " frog-bar-done" : "") + (i === sessionIdx ? " active" : "");
    barTrack.appendChild(spot);
    spots.push(spot);
  }

  // Frosch absolut positionieren
  const frog = document.createElement("img");
  frog.src = "images/frog.png";
  frog.alt = "Frog";
  frog.id = "jumpingFrog";
  barTrack.appendChild(frog);

  // Position berechnen (Spot-Offsets)
  setTimeout(() => {
    const spot = spots[sessionIdx];
    if (spot) {
      const rect = spot.getBoundingClientRect();
      const trackRect = barTrack.getBoundingClientRect();
      // Zentriere Frosch über aktuellem Spot
      const left = spot.offsetLeft + (spot.offsetWidth - frog.offsetWidth) / 2;
      frog.style.left = left + "px";
      frog.style.animation = "frogHop 0.45s"; // Restart Animation
      // Animation zurücksetzen, damit sie bei jedem Schritt neu startet
      frog.addEventListener("animationend", () => {
        frog.style.animation = "";
      }, { once: true });
    }
  }, 30);
}

