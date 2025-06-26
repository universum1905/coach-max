// app.js

const sessionContainer = document.getElementById("session-container");
const rewardPopup = document.getElementById("reward-popup");
const stickerImg = document.getElementById("sticker-img");
const yaySound = document.getElementById("yay-sound");
const failSound = document.getElementById("fail-sound");

let currentDay = 1;

fetch(`days/day${currentDay}.json`)
  .then((res) => res.json())
  .then((data) => {
    document.getElementById("day-title").textContent = data.title;
    renderProgressFrog(0, data.sessions.length);
    startSessions(data.sessions);
  });

let sessionIndex = 0;

function renderProgressFrog(step, total) {
  for (let i = 0; i < total; i++) {
    const el = document.getElementById(`step-${i}`);
    if (el) {
      if (i === step) {
        el.textContent = "🐸";
        el.classList.add("active");
      } else {
        el.textContent = "";
        el.classList.remove("active");
      }
    }
  }
}

function startSessions(sessions) {
  if (sessionIndex >= sessions.length) return;
  const session = sessions[sessionIndex];
  sessionContainer.innerHTML = "";
  renderProgressFrog(sessionIndex, sessions.length);

  const wrapper = document.createElement("div");
  wrapper.className = "session-block";

  const content = document.createElement("div");
  content.className = "session-content";

  const video = document.createElement("video");
  video.src = `video/day${currentDay}-${session.type}.mp4`;
  video.autoplay = true;
  video.muted = true;
  video.className = "avatar-video";
  content.appendChild(video);

  if (session.text || session.question || session.instruction) {
    const message = document.createElement("p");
    message.textContent = session.text || session.question || session.instruction;
    message.className = "session-text";
    content.appendChild(message);
  }

  if (session.type === "intro" || session.type === "story" || session.type === "breath") {
    const nextBtn = document.createElement("button");
    nextBtn.textContent = "Next ▶️";
    nextBtn.onclick = () => {
      if (session.sticker) unlockSticker(session.sticker);
      sessionIndex++;
      startSessions(sessions);
    };
    content.appendChild(nextBtn);
  }

  if (["counting", "rhyme", "animal"].includes(session.type)) {
    session.options.forEach((opt) => {
      const btn = document.createElement("button");
      btn.textContent = opt;
      btn.onclick = () => {
        if (opt === session.answer) {
          unlockSticker(session.sticker);
          sessionIndex++;
          startSessions(sessions);
        } else {
          failSound.play();
          alert("Try again! ❌");
        }
      };
      content.appendChild(btn);
    });
  }

  wrapper.appendChild(content);
  sessionContainer.appendChild(wrapper);
}

function unlockSticker(stickerName) {
  yaySound.play();
  rewardPopup.style.display = "block";
  stickerImg.src = `images/stickers/${stickerName}`;

  let unlocked = JSON.parse(localStorage.getItem("stickers")) || [];
  if (!unlocked.includes(stickerName)) {
    unlocked.push(stickerName);
    localStorage.setItem("stickers", JSON.stringify(unlocked));
  }

  setTimeout(() => {
    rewardPopup.style.display = "none";
  }, 2000);
}
