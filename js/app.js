const jsonURL = "days/day1.json";
let sessions = [];
let currentSession = 0;
let textTimeouts = [];
let videoElement = null;

// ---- Animierte Texte ----
function showAnimatedTexts(session, textArea) {
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
    }, delay));
    totalDelay += t.duration;
  });
}

// ---- Welcome-Overlay ----
function showWelcome(onFinish) {
  const welcomeArea = document.getElementById('welcomeArea');
  welcomeArea.innerHTML = '';
  const tapHint = document.createElement('div');
  tapHint.className = "welcome-tap-hint";
  tapHint.innerText = "Tap anywhere to start!";
  welcomeArea.appendChild(tapHint);

  welcomeArea.onclick = function() {
    tapHint.style.opacity = 0;
    setTimeout(() => {
      welcomeArea.removeChild(tapHint);
      welcomeArea.style.display = "none";
      document.getElementById("mainContent").style.display = "";
      if (typeof onFinish === "function") onFinish();
    }, 350);
    welcomeArea.onclick = null;
  };
}

// ---- Sessionwechsel ----
function renderSession(idx) {
  clearTimeouts();
  document.querySelectorAll(".floating-video, .fixed-next-btn").forEach(el => el.remove());
  document.getElementById('sessionTextArea').innerHTML = "";

  const s = sessions[idx];
  const textArea = document.getElementById('sessionTextArea');
  showAnimatedTexts(s, textArea);

  // --- Video, fixiert ---
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
  // Container für Video
  const videoBox = document.createElement('div');
  videoBox.className = "floating-video";
  videoBox.appendChild(videoElement);
  document.body.appendChild(videoBox);

  // --- Next-Button, fixiert links unten ---
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
function clearTimeouts() {
  textTimeouts.forEach(t => clearTimeout(t));
  textTimeouts = [];
}

window.onload = async () => {
  const res = await fetch(jsonURL);
  const data = await res.json();
  sessions = data.sessions;
  showWelcome(() => renderSession(currentSession));
};
