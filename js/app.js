let sessionIndex = 0;

const sessions = [
  {
    text: "Welcome to Day 1! Let's get started 🎉",
    video: "day1-intro.mp4",
    avatar: "luna"
  },
  {
    text: "Take a deep breath with Momo 🧘‍♂️",
    video: "day1-breath.mp4",
    avatar: "momo"
  },
  {
    text: "Let's count from 1 to 10 together!",
    video: "day1-counting.mp4",
    avatar: "benny"
  },
  {
    text: "Can you guess the animal sounds?",
    video: "day1-animals.mp4",
    avatar: "momo"
  },
  {
    text: "Time for a fun rhyme challenge!",
    video: "day1-rhyme.mp4",
    avatar: "benny"
  },
  {
    text: "Luna will tell you a magical story 🌙",
    video: "day1-story.mp4",
    avatar: "luna"
  }
];

function playSession(index) {
  const session = sessions[index];
  const container = document.getElementById("session-container");
  const avatar = document.getElementById("avatar-video");

  // Update session content
  container.innerHTML = `
    <div class="session-block">
      <div class="session-text">${session.text}</div>
      <video id="session-video" src="videos/${session.video}" controls preload="metadata" playsinline></video>
    </div>
  `;

  // Show avatar
  avatar.src = `images/${session.avatar}.png`;
  avatar.style.display = "block";

  // Setup video manually
  const video = document.getElementById("session-video");
  video.autoplay = false;
  video.muted = false;
  video.controls = true;
}

function nextSession() {
  sessionIndex++;
  if (sessionIndex < sessions.length) {
    updateProgressBar();
    playSession(sessionIndex);
  } else {
    showReward();
  }
}

function updateProgressBar() {
  const steps = document.querySelectorAll(".progress-step");
  steps.forEach((step, index) => {
    step.classList.toggle("active", index === sessionIndex);
  });
}

function showReward() {
  const popup = document.getElementById("reward-popup");
  popup.style.display = "block";
}

// Initial setup
document.addEventListener("DOMContentLoaded", () => {
  updateProgressBar();
  playSession(sessionIndex);
});
