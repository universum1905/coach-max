// Coach Max – JSON-basierte app.js
// Funktion: Lädt Sessions aus day1.json, steuert Video & Avatar

let sessionIndex = 0;
let sessions = [];
const sessionContainer = document.getElementById('session-container');
const avatarVideo = document.getElementById('avatar-video');
const rewardPopup = document.getElementById('reward-popup');
const progressSteps = document.querySelectorAll('.progress-step');
const yaySound = document.getElementById('yay-sound');

function showSession(index) {
  const s = sessions[index];

  sessionContainer.innerHTML = `
    <div class="session-block">
      <div class="session-text">${s.text}</div>
      <video controls src="${s.video}" preload="metadata"></video>
    </div>
  `;

  avatarVideo.src = s.avatar;

  // Fortschritt aktualisieren
  progressSteps.forEach((step, i) => {
    step.classList.toggle('active', i === index);
  });
}

function nextSession() {
  sessionIndex++;
  if (sessionIndex < sessions.length) {
    showSession(sessionIndex);
  } else {
    showReward();
  }
}

function showReward() {
  yaySound.play();
  rewardPopup.style.display = 'block';
  document.getElementById('sticker-img').src = 'images/sticker1.png';
}

// Daten aus JSON laden
fetch('day1.json')
  .then(response => response.json())
  .then(data => {
    sessions = data.sessions;
    showSession(sessionIndex);
  })
  .catch(error => {
    console.error('Fehler beim Laden von day1.json:', error);
  });
