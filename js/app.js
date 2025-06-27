// js/app.js

const jsonURL = "days/day1.json";
let sessions = [];
let currentSession = 0;
let textTimeouts = [];
let videoElement = null;

// Rotationshinweis
function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function handleOrientation() {
  const notice = document.getElementById("rotationNotice");
  const mainContent = document.getElementById("mainContent");
  const isPortrait = window.matchMedia("(orientation: portrait)").matches;
  const mobile = isMobileDevice();

  if (!mobile) {
    // Immer Desktop: Hinweis NIE anzeigen!
    notice.style.display = "none";
    mainContent.style.display = '';
    if (videoElement) videoElement.controls = true;
    return;
  }

  if (isPortrait) {
    // Mobil & Hochformat: Inhalt anzeigen
    notice.style.display = "none";
    mainContent.style.display = '';
    if (videoElement) videoElement.controls = true;
  } else {
    // Mobil & Querformat: Hinweis anzeigen
    notice.style.display = "flex";
    mainContent.style.display = 'none';
    if (videoElement) videoElement.controls = false;
  }
}
window.addEventListener("orientationchange", handleOrientation);
window.addEventListener("resize", handleOrientation);

window.onload = async () => {
  try {
    const res = await fetch(jsonURL);
    if (!res.ok) throw new Error("JSON not found: " + jsonURL);
    const data = await res.json();
    if (!data.sessions) throw new Error("No 'sessions' array in JSON!");
    sessions = data.sessions;
    renderSession(currentSession);
    handleOrientation();
  } catch (e) {
    document.body.innerHTML = `<h2 style="color:red">Error loading day: ${e}</h2>`;
    console.error(e);
  }
};

function clearTimeouts() {
  textTimeouts.forEach(t => clearTimeout(t));
  textTimeouts = [];
}

// Hauptfunktion zum Anzeigen einer Session
function renderSession(idx) {
  clearTimeouts();

  // Entferne ggf. alte Video/Frosch-Container
  document.querySelectorAll(".floating-video, .floating-frog").forEach(el => el.remove());
  // Entferne Texte
  document.getElementById('sessionTextArea').innerHTML = "";

  const s = sessions[idx];

  // --- Animierter Textbereich ---
  const textArea = document.getElementById('sessionTextArea');
  // Platz für die animierten Texte

  // --- Video-Element: fix unten rechts, rund ---
  videoElement = document.createElement('video');
  videoElement.src = `videos/${s.video}`;
  videoElement.controls = true;
  videoElement.autoplay = false;
  videoElement.muted = false;
  videoElement.playsInline = true;
  videoElement.setAttribute('tabindex', '0');
  videoElement.className = "";
  videoElement.poster = "images/video-placeholder.png";

  // Container fürs runde, fixierte Video
  const videoBox = document.createElement('div');
  videoBox.className = "floating-video";
  videoBox.appendChild(videoElement);
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
  // Alles aufräumen
  clearTimeouts();
  document.querySelectorAll(".floating-video, .floating-frog").forEach(el => el.remove());
  document.getElementById('sessionTextArea').innerHTML =
    `<div class="animated-text" style="font-size:1.8rem;">Congratulations! You finished today’s adventure! 🥳</div>`;
}
