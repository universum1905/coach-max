// Coach Max – app.js
// Funktion: Steuert die Sessions, Videos, Texte, Avatar & Fortschritt

let sessionIndex = 0;
const sessionContainer = document.getElementById('session-container');
const avatarVideo = document.getElementById('avatar-video');
const rewardPopup = document.getElementById('reward-popup');
const progressSteps = document.querySelectorAll('.progress-step');
const yaySound = document.getElementById('yay-sound');

// Beispiel-Inhalte pro Session (du kannst sie in JSON auslagern)
const sessions = [
  {
    text: "Hi! I'm Luna 🐱 – welcome to your first adventure!",
    avatar: "images/luna.png",
    video: "videos/day1-intro.mp4"
  },
  {
    text: "Take a deep breath with Momo 🐵 – in and out...",
    avatar: "images/momo.png",
    video: "videos/day1-breath.mp4"
  },
  {
    text: "Let's count to 10 with Benny 🐶!",
    avatar: "images/benny.png",
    video: "videos/day1-counting.mp4"
  },
  {
    text: "Can you rhyme with Luna?",
    avatar: "images/luna.png",
    video: "videos/day1-rhyme.mp4"
  },
  {
    text: "What animal sound is that? Momo knows it!",
    avatar: "images/momo.png",
    video: "videos/day1-animals.mp4"
  },
  {
    text: "Time for a bedtime story 💤 with Luna.",
    avatar: "images/luna.png",
    video: "videos/day1-story.mp4"
  }
];

function showSession(index) {
  const s = sessions[index];

  sessionContainer.innerHTML = `
    <div class="session-block">
      <div class="session-text">${s.text}</div>
      <video controls src="${s.video}" preload="metadata"></video>
    </div>
  `;

  avatarVideo.src = s.avatar;

  // Fortschrittsbalken aktualisieren
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

// Direkt erste Session laden
showSession(sessionIndex);
