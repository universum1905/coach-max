// Coach Max – JSON-basierte app.js (korrigiert)
// Funktion: Lädt Sessions aus day1.json, zeigt Text oben, Video unten rechts

let sessionIndex = 0;
let sessions = [];
const sessionContainer = document.getElementById('session-container');
const rewardPopup = document.getElementById('reward-popup');
const progressSteps = document.querySelectorAll('.progress-step');
const yaySound = document.getElementById('yay-sound');

function showSession(index) {
  const s = sessions[index];

  // Session-Container vorbereiten
  sessionContainer.innerHTML = '';

  // Textfeld oben
  const sessionTextDiv = document.createElement('div');
  sessionTextDiv.className = 'session-text';
  sessionTextDiv.textContent = s.text;
  sessionContainer.appendChild(sessionTextDiv);

  // Video-Container unten rechts
  const videoEl = document.createElement('video');
  videoEl.src = s.video;
  videoEl.controls = true;
  videoEl.className = 'avatar-video';
  sessionContainer.appendChild(videoEl);

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
