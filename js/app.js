const jsonURL = "days/day1.json";
let sessions = [];
let currentSession = 0;
let textTimeouts = [];
let videoElement = null;

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

  // Welcome Animation
  function startWelcomeAnimation() {
    const lines = [
      "🎉 Welcome to Coach Max!",
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

// Animierter Text, Next erst am Schluss
function showAnimatedTexts(session, textArea, onComplete) {
  textArea.innerHTML = "";
  let totalDelay = 0;
  session.text.forEach((t, i) => {
    let delay = totalDelay * 1000;
    textTimeouts.push(setTimeout(() => {
      const p = document.createElement('div');
      p.className = "animated-text";
      p.innerText = t.line;
      if (i === session.text.length - 1) p.classList.add('glitter');
      textArea.appendChild(p);
      p.scrollIntoView({behavior: "smooth", block: "end"});
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
  clearTimeouts();
  renderFrogProgress(idx);
  document.querySelectorAll(".floating-video, .fixed-next-btn").forEach(el => el.remove());
  document.getElementById('sessionTextArea').innerHTML = "";

  const s = sessions[idx];
  const textArea = document.getElementById('sessionTextArea');

  // --- INTRO-SESSION: Musik + Bild + Smileys + zentriert + kein Video ---
  if (s.type === "intro") {
    try { introMusic.currentTime = 0; introMusic.play(); } catch(e) {}

    // Oberes Maskottchen-Bild (z.B. Benny)
    const topImg = document.createElement('img');
    topImg.src = "images/benny.png"; // Pfad zu deinem Maskottchen
    topImg.alt = "Benny";
    topImg.className = "intro-mascot";
    textArea.appendChild(topImg);

    // Animierter Text, zentriert & gepolstert
    textArea.style.textAlign = "center";
    textArea.style.padding = "26px 14px 18px 14px";
    textArea.style.alignItems = "center";

    showAnimatedTexts(s, textArea, showNextBtn, true);

    // Untere Smileys/Glitzer
    const bottomBox = document.createElement('div');
    bottomBox.className = "intro-emojis";
    bottomBox.innerHTML = "🤩&nbsp;🎉&nbsp;⭐&nbsp;👏";
    textArea.appendChild(bottomBox);

    // Stoppe Musik beim Next
    function showNextBtn() {
      const btn = document.createElement('button');
      btn.innerText = idx < sessions.length - 1 ? "Next" : "Finish";
      btn.className = "centered-next-btn";
      btn.onclick = () => {
        try { introMusic.pause(); introMusic.currentTime = 0; } catch(e) {}
        currentSession++;
        if (currentSession < sessions.length) {
          renderSession(currentSession);
        } else {
          finishDay();
        }
      };
      document.body.appendChild(btn);
    }
    return; // Intro fertig, kein Video/Play-Overlay/Frosch hier
  }

  // --- Restliche Sessions (wie gehabt, Video etc.) ---
  // ... (dein bisheriger Code für Video, Play, Next etc.)
}


  // Video + Play-Overlay
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
  // Video fixiert
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
    if (!textArea.hasAnimated) {
      showAnimatedTexts(s, textArea, showNextBtn);
      textArea.hasAnimated = true;
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

  textArea.hasAnimated = false;

  // Next-Button erst nach Textanimation anzeigen
  function showNextBtn() {
    const btn = document.createElement('button');
    btn.innerText = idx < sessions.length - 1 ? "Next" : "Finish";
    btn.className = "fixed-next-btn";
    btn.onclick = () => {
      currentSession++;
      if (currentSession < sessions.length) {
        renderSession(currentSession);
      } else {
        finishDay();
      }
    };
    document.body.appendChild(btn);
  }


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
  showWelcome(() => {
    renderSession(currentSession);
    handleOrientation();
  });
};

