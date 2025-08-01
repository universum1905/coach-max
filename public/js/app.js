/* ==== COACH MAX UNIVERSAL SESSION TEMPLATE ==== */

/* ==== DEV/LIVE Umschalter & Firebase Setup ==== */
import { DEV_MODE, DEV_DAY, DEV_START_SESSION } from "/js/config.js";
import { app } from "/js/firebase.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const auth = getAuth(app);
const db = getFirestore(app);

/* ==== Globale Variablen ==== */
let sessions = [];
let currentSession = DEV_MODE ? DEV_START_SESSION : 0;
let lastSessionIdx = 0;
let textTimeouts = [];
let currentDay = DEV_MODE ? DEV_DAY : getDayParam();
let currentMusic = null;
let sessionStartTime = 0;
const minSessionDuration = 60 * 1000;
let ttsUtterance = null;


/* ==== Day-Parameter ==== */
function getCurrentPage() {
  const path = window.location.pathname.split('/').filter(Boolean);
  let page = path[0] || 'index';
  return page.replace('.html', ''); // entfernt .html-Endung
}

function getDayParam() {
  const path = window.location.pathname.split('/').filter(Boolean);
  // Prüfe zuerst Pfad (wie /day/1)
  if (path[0] === "day" && path[1]) {
    return parseInt(path[1]);
  }
  // Fallback: URL-Parameter (day.html?day=1)
  const urlParams = new URLSearchParams(window.location.search);
  return parseInt(urlParams.get('day')) || 1;
}

/* ==== JSON-URL ==== */
const jsonURL = `days/day${currentDay}.json`;

/* ==== KI/TTS-Limit ==== */
function canUseTTS(sessionIndex) {
  let key = `ttsUsed_day${currentDay}_session${sessionIndex}`;
  let alreadyDone = localStorage.getItem(key);
  let charCount = parseInt(localStorage.getItem(`ttsCharCount_day${currentDay}`) || "0");
  if (alreadyDone || charCount >= 1000) return false;
  return true;
}
function registerTTS(sessionIndex, text) {
  let key = `ttsUsed_day${currentDay}_session${sessionIndex}`;
  localStorage.setItem(key, "1");
  let charCount = parseInt(localStorage.getItem(`ttsCharCount_day${currentDay}`) || "0");
  charCount += text.length;
  localStorage.setItem(`ttsCharCount_day${currentDay}`, charCount);
}
function speakText(text) {
  if (!window.speechSynthesis) return;
  if (ttsUtterance) window.speechSynthesis.cancel();
  ttsUtterance = new SpeechSynthesisUtterance(text);
  ttsUtterance.lang = "en-US";
  ttsUtterance.pitch = 1.1;
  ttsUtterance.rate = 1;
  ttsUtterance.volume = 1;
  window.speechSynthesis.speak(ttsUtterance);
}

/* ==== Helper: Zeitverzögerung & Overlays ==== */
function tryShowNextButtonOrWait(callback) {
  let now = Date.now();
  let remaining = minSessionDuration - (now - sessionStartTime);
  if (remaining > 0) {
    showWaitingOverlay(remaining);
    setTimeout(() => {
      hideWaitingOverlay();
      callback();
    }, remaining);
  } else {
    callback();
  }
}
function showWaitingOverlay(ms) {
  let overlay = document.createElement("div");
  overlay.id = "waitingOverlay";
  overlay.style.position = "fixed";
  overlay.style.left = 0;
  overlay.style.top = 0;
  overlay.style.width = "100vw";
  overlay.style.height = "100vh";
  overlay.style.background = "rgba(250,250,210,0.87)";
  overlay.style.zIndex = 9999;
  overlay.style.display = "flex";
  overlay.style.flexDirection = "column";
  overlay.style.justifyContent = "center";
  overlay.style.alignItems = "center";
  overlay.innerHTML = `<div style="font-size:2.2em; margin-bottom:18px;">⏳</div>
    <div style="font-size:1.3em; margin-bottom:8px;">Just a moment...</div>
    <div id="waitCountdown" style="font-size:1.1em;"></div>`;
  document.body.appendChild(overlay);
  let countdownDiv = overlay.querySelector("#waitCountdown");
  let remainingSec = Math.ceil(ms / 1000);
  countdownDiv.textContent = `${remainingSec} sec`;
  let interval = setInterval(() => {
    remainingSec--;
    if (remainingSec > 0) countdownDiv.textContent = `${remainingSec} sec`;
    else clearInterval(interval);
  }, 1000);
}
function hideWaitingOverlay() {
  document.getElementById("waitingOverlay")?.remove();
}

/* ==== Helper: Audio ==== */
function stopAllSounds() {
  if (window.currentMusic) {
    try { window.currentMusic.pause(); window.currentMusic.currentTime = 0; } catch(e) {}
    window.currentMusic = null;
  }
  if (window.allSessionAudio && Array.isArray(window.allSessionAudio)) {
    window.allSessionAudio.forEach(a => { try { a.pause(); a.currentTime = 0; } catch(e){} });
    window.allSessionAudio = [];
  }
}
function playSound(soundFile) {
  try {
    const audio = new Audio("audio/" + soundFile);
    audio.volume = 0.75;
    audio.play();
    if (!window.allSessionAudio) window.allSessionAudio = [];
    window.allSessionAudio.push(audio);
  } catch(e){}
}
document.addEventListener("visibilitychange", function() {
  if (window.currentMusic) document.hidden ? window.currentMusic.pause() : window.currentMusic.play();
  if (window.currentVideo && document.hidden) window.currentVideo.pause();
});



/* ==== Fortschrittsanzeige: Frosch ==== */
function renderFrogProgress(currentIdx, _, totalSessions = null) {
  const track = document.querySelector(".frog-bar-track");
  if (!track) return;
  track.innerHTML = "";

  const numSpots = totalSessions || sessions.length;
  for (let i = 0; i < numSpots; i++) {
    const spot = document.createElement("div");
    spot.className = "frog-bar-spot";
    if (i < currentIdx) spot.classList.add("frog-bar-done");
    if (i === currentIdx) spot.classList.add("active");
    track.appendChild(spot);
  }

  let frog = document.getElementById("jumpingFrog");
  if (!frog) {
    frog = document.createElement("img");
    frog.src = "images/frog.png";
    frog.id = "jumpingFrog";
    track.appendChild(frog);
  }

  const spots = track.querySelectorAll(".frog-bar-spot");
const active = spots[currentIdx];
if (active) {
  frog.style.position = "absolute";
  frog.style.left =
    (active.offsetLeft + active.offsetWidth / 2 - frog.offsetWidth / 2) + "px";
  frog.style.bottom = "22px";
  frog.style.animation = "frogHop 0.45s";
  playSound("frog-hop.mp3");
}
}

/* ==== Universal Floating Video ==== */
function renderFloatingVideo(sessionObj, onVideoEndedCallback) {
  document.querySelectorAll(".floating-video").forEach(el => el.remove());
  if (!sessionObj.video) {
    window.currentVideo = null;
    if (typeof onVideoEndedCallback === "function") onVideoEndedCallback();
    return;
  }

  const videoBox = document.createElement("div");
  videoBox.className = "floating-video";

  const videoElement = document.createElement("video");
  videoElement.src = "videos/" + sessionObj.video;
  videoElement.setAttribute("controls", "true");
  videoElement.setAttribute("controlsList", "nodownload");
  videoElement.autoplay = false;
  videoElement.muted = false;
  videoElement.playsInline = true;
  videoElement.poster = "images/video-placeholder.png";
  videoElement.style.width = "100%";
  videoElement.style.height = "100%";
  videoElement.style.objectFit = "cover";
  videoBox.appendChild(videoElement);

  window.currentVideo = videoElement;

  const playBtn = document.createElement('button');
  playBtn.className = "custom-play-btn";
  playBtn.title = "Play";
  playBtn.innerHTML = `<svg viewBox="0 0 60 60"><circle cx="30" cy="30" r="28" fill="none"/><polygon points="22,16 46,30 22,44" fill="#383838"/></svg>`;
  playBtn.onclick = function() {
    videoElement.play();
    playBtn.style.display = "none";
    videoElement.style.pointerEvents = "auto";
  };
  videoElement.addEventListener('play', () => { playBtn.style.display = "none"; });
  videoElement.addEventListener('pause', () => { playBtn.style.display = ""; });
  videoElement.addEventListener('ended', () => {
    videoBox.innerHTML = `<img class="avatar" src="images/${sessionObj.avatar || 'luna'}.png" style="width:100%;height:100%;border-radius:50%;object-fit:contain;">`;
    window.currentVideo = null;
    if (typeof onVideoEndedCallback === "function") setTimeout(() => onVideoEndedCallback(), 400);
  });
  videoBox.appendChild(playBtn);

  document.body.appendChild(videoBox);
}



/* ==== Session Header ==== */
function renderSessionHeader(title) {
  const header = document.getElementById("sessionHeader");
  if (header) header.innerText = title || "";
}

/* ==== Haupt-Session-Renderer ==== */
function renderSession(idx) {
  sessionStartTime = Date.now();
  const s = sessions[idx];
  lastSessionIdx = idx;
  clearTimeouts();
  stopAllSounds();
  document.querySelectorAll(".floating-video, .centered-next-btn, .animals-reward-container").forEach(el => el.remove());

  const textArea = document.getElementById("sessionTextArea");
  if (textArea) textArea.innerHTML = "";

  renderSessionHeader(s.title || "");
  renderFrogProgress(currentSession, currentSession, sessions.length);

  const gameContainer = document.createElement("div");
  gameContainer.id = "gameContainer";
  gameContainer.style.display = "flex";
  gameContainer.style.flexDirection = "column";
  gameContainer.style.alignItems = "center";
  gameContainer.style.justifyContent = "center";
  gameContainer.style.width = "100%";
  gameContainer.style.maxWidth = "370px";
  gameContainer.style.margin = "0 auto";
  gameContainer.style.position = "relative";
  gameContainer.style.zIndex = "3";
  textArea.appendChild(gameContainer);

  if (s.type === "intro" || s.type === "story") {
    renderFloatingVideo(s);
    if (s.type === "intro") renderIntroSession(s, idx, gameContainer);
    else renderStorySession(s, idx, gameContainer);
    return;
  }
  renderFloatingVideo(s, () => {
  if (
    s.type === "counting" ||
    s.type === "animals-quiz" ||
    s.type === "rhyme" ||
    s.type === "chatgpt-quiz" ||
    s.type === "color-quiz" ||
    s.type === "shadow"
  ) {
    renderUniversalQuizSession(s, idx, gameContainer);
  }
  else if (s.type === "sequence") {
    renderSequenceSession(s, idx, gameContainer); // <--- jetzt wird dein eigener Block aktiv!
  }
  else if (s.type === "memory") {
    renderMemoryField(s, idx, gameContainer);
  }
  else if (s.type === "drawing") {
    renderDrawingSession(s, idx, gameContainer);
  }
  else if (s.type === "animals") {
    renderAnimalsSession(s, idx, gameContainer);
  }
  else if (s.type === "dragdrop") {
  renderDragDropSession(s, idx, gameContainer);
  }
  else {
    renderUnknownSession(s, idx, gameContainer);
  }
});
}




// ==== Intro Session ====
function renderIntroSession(s, idx, container) {
  clearTimeouts();
  stopAllSounds();
  container.innerHTML = "";

  // Avatare-Row
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
  container.appendChild(avatarRow);

  const emojiBox = document.createElement('div');
  emojiBox.className = "intro-emojis";
  emojiBox.innerHTML = "🤩&nbsp;🎉&nbsp;⭐&nbsp;👏";
  container.appendChild(emojiBox);

  const linesBox = document.createElement('div');
  linesBox.className = "animated-lines";
  container.appendChild(linesBox);

  let introMusic = null;
  const floatingBox = document.querySelector('.floating-video');
  const video = floatingBox ? floatingBox.querySelector('video') : null;
  let started = false, videoDone = false, textDone = false;

  function showAnimatedTextsSync(onComplete) {
    let idx = 0;
    function showNextLine() {
      if (idx < s.text.length) {
        const t = s.text[idx];
        const p = document.createElement('div');
        p.className = "animated-text";
        p.innerText = t.line;
        linesBox.appendChild(p);
        textTimeouts.push(setTimeout(() => {
          if (linesBox.childNodes.length > 4) linesBox.removeChild(linesBox.firstChild);
          idx++;
          showNextLine();
        }, (t.duration || 2) * 1000));
      } else if (typeof onComplete === "function") {
        onComplete();
      }
    }
    showNextLine();
  }

  function tryShowNextBtn() {
    if (videoDone && textDone) {
      const btn = document.createElement('button');
      btn.innerText = idx < sessions.length - 1 ? "Next" : "Finish";
      btn.className = "centered-next-btn";
      btn.onclick = () => {
        if (introMusic) { try { introMusic.pause(); } catch(e){} }
        currentSession++;
        renderSession(currentSession);
      };
      document.body.appendChild(btn);
    }
  }

  if (video) {
    video.addEventListener('play', () => {
      if (!started) {
        started = true;
        if (s.music) {
          try {
            introMusic = new Audio("audio/" + s.music);
            introMusic.loop = false;
            introMusic.volume = 0.18;
            introMusic.play();
            window.currentMusic = introMusic;
          } catch (e) {}
        }
        showAnimatedTextsSync(() => {
          textDone = true;
          tryShowNextBtn();
        });
      }
    });
    video.addEventListener('ended', () => {
      videoDone = true;
      tryShowNextBtn();
    });
    if (!video.paused && !started) {
      started = true;
      if (s.music) {
        try {
          introMusic = new Audio("audio/" + s.music);
          introMusic.loop = false;
          introMusic.volume = 0.18;
          introMusic.play();
          window.currentMusic = introMusic;
        } catch (e) {}
      }
      showAnimatedTextsSync(() => {
        textDone = true;
        tryShowNextBtn();
      });
    }
  } else {
    if (s.music) {
      try {
        introMusic = new Audio("audio/" + s.music);
        introMusic.loop = false;
        introMusic.volume = 0.18;
        introMusic.play();
        window.currentMusic = introMusic;
      } catch (e) {}
    }
    showAnimatedTextsSync(() => {
      textDone = true;
      videoDone = true;
      tryShowNextBtn();
    });
  }
}

// ==== Universal Quiz Session (z.B. animals-quiz, counting, rhyme etc.) ====
// ==== Universal Quiz Session (animals-quiz, counting, rhyme, chatgpt-quiz, sequence, etc.) ====

function renderUniversalQuizSession(s, idx, container) {
  clearTimeouts();
  stopAllSounds();
  container.innerHTML = "";

  // Musik (optional)
  if (window.currentMusic) {
    try { window.currentMusic.pause(); window.currentMusic.currentTime = 0; } catch (e) {}
    window.currentMusic = null;
  }
  if (s.music) {
    try {
      window.currentMusic = new Audio("audio/" + s.music);
      window.currentMusic.loop = false;
      window.currentMusic.volume = 0.2;
      window.currentMusic.play();
    } catch (e) {}
  }

  const questions = Array.isArray(s.questions) ? s.questions : [];
  let qIdx = 0;
  let wrongAnswers = new Set();

  function showQuestion() {
    container.innerHTML = "";
    const q = questions[qIdx];
    wrongAnswers = new Set(); // Pro Frage zurücksetzen

    // Frage
    if (q.question) {
      const qDiv = document.createElement('div');
      qDiv.className = "quiz-question";
      qDiv.textContent = q.question;
      container.appendChild(qDiv);
    }

    // Bild(er) + Listen Again Button (optional)
    if (q.img) {
      const imgSoundWrap = document.createElement('div');
      imgSoundWrap.style.display = "flex";
      imgSoundWrap.style.alignItems = "center";
      imgSoundWrap.style.justifyContent = "center";
      imgSoundWrap.style.gap = "16px";
      imgSoundWrap.style.margin = "14px 0 10px 0";

      if (q.num > 0) {
        for (let i = 0; i < q.num; i++) {
          const img = document.createElement('img');
          img.src = q.img;
          img.style.width = "72px";
          img.style.height = "72px";
          img.style.objectFit = "contain";
          img.style.margin = "6px 0";
          img.style.borderRadius = "14px";
          imgSoundWrap.appendChild(img);
        }
      } else {
        const img = document.createElement('img');
        img.src = q.img;
        img.style.width = "110px";
        img.style.height = "auto";
        img.style.objectFit = "contain";
        imgSoundWrap.appendChild(img);
      }

      // Listen-Again-Button (Sound beim Start und als Button)
      if (q.sound) {
        playSound(q.sound);

        const listenBtn = document.createElement('button');
        listenBtn.className = "animal-listen-btn";
        listenBtn.innerHTML = '🔊 Listen Again';
        listenBtn.style.marginLeft = "14px";
        listenBtn.onclick = function (e) {
          e.stopPropagation();
          playSound(q.sound);
          listenBtn.classList.add('bounce-anim');
          setTimeout(() => listenBtn.classList.remove('bounce-anim'), 600);
        };
        imgSoundWrap.appendChild(listenBtn);
      }

      container.appendChild(imgSoundWrap);
    }

    // Antwort-Buttons
    const btnBox = document.createElement('div');
    btnBox.className = "quiz-buttons";
    let solved = false;
    let feedbackDiv = null;

    q.choices.forEach((val, i) => {
      const btn = document.createElement('button');
      btn.textContent = val;
      btn.className = "quiz-choice-btn";
      if (wrongAnswers.has(i)) {
        btn.classList.add("wrong");
        btn.disabled = true;
      }
      btn.onclick = function () {
        if (solved || btn.disabled) return;

        btnBox.querySelectorAll("button").forEach(b => {
          if (b !== btn) b.style.display = "none";
          else b.classList.add("selected");
        });

        const spinner = document.createElement('div');
        spinner.className = "wait-spinner";
        btn.insertAdjacentElement('afterend', spinner);

        setTimeout(() => {
          spinner.remove();
          btn.classList.remove("selected");
          const isCorrect = (i === q.correct);

          if (isCorrect) btn.classList.add("correct");
          else btn.classList.add("wrong");

          if (feedbackDiv) feedbackDiv.remove();
          feedbackDiv = document.createElement("div");
          feedbackDiv.className = "quiz-feedback";
          feedbackDiv.innerText = isCorrect ? (q.feedbackCorrect || "Great job! 🎉") : (q.feedbackWrong || "Try again!");
          feedbackDiv.style.color = isCorrect ? "#219821" : "#c82121";
          feedbackDiv.style.marginTop = "12px";
          btn.insertAdjacentElement('afterend', feedbackDiv);

          // === TTS für Feedback ===
          speakText(feedbackDiv.innerText);

          playSound(isCorrect ? (q.correctSound || "yay.mp3") : (q.wrongSound || "fail.mp3"));
          runAnimations(isCorrect ? (q.correctAnimation || ["confetti-glow"]) : (q.wrongAnimation || ["shake"]));
          if (s.avatar) playAvatarAnimation(s.avatar, isCorrect ? "tada" : "wiggle");

          setTimeout(() => {
            if (isCorrect) {
              if (q.funFact) {
                if (feedbackDiv) feedbackDiv.remove();
                const funDiv = document.createElement("div");
                funDiv.className = "animal-funfact";
                funDiv.innerHTML = "🐾 <b>Fun Fact:</b> " + q.funFact;
                funDiv.style.marginTop = "18px";
                funDiv.style.fontSize = "1.12em";
                funDiv.style.textAlign = "center";
                funDiv.style.color = "#555";
                btn.insertAdjacentElement('afterend', funDiv);

                setTimeout(() => {
                  funDiv.remove();
                  solved = true;
                  qIdx++;
                  if (qIdx < questions.length) {
                    showQuestion();
                  } else {
                    if (window.currentMusic) { try { window.currentMusic.pause(); window.currentMusic.currentTime = 0; } catch (e) {} }
                    tryShowNextButtonOrWait(() => {
                      showUniversalReward(
                        s,
                        () => {
                          if (currentSession < sessions.length - 1) {
                            currentSession++;
                            renderSession(currentSession);
                          } else {
                            window.location.href = "/choose";
                          }
                        }
                      );
                    });
                  }
                }, 5000);
              } else {
                solved = true;
                qIdx++;
                if (qIdx < questions.length) {
                  showQuestion();
                } else {
                  if (window.currentMusic) { try { window.currentMusic.pause(); window.currentMusic.currentTime = 0; } catch (e) {} }
                  tryShowNextButtonOrWait(() => {
                    showUniversalReward(
                      s,
                      () => {
                        if (currentSession < sessions.length - 1) {
                          currentSession++;
                          renderSession(currentSession);
                        } else {
                          window.location.href = "/choose";
                        }
                      }
                    );
                  });
                }
              }
            } else {
              wrongAnswers.add(i);
              btnBox.querySelectorAll("button").forEach((b, idx) => {
                b.style.display = "";
                b.disabled = wrongAnswers.has(idx);
                if (wrongAnswers.has(idx)) b.classList.add("wrong");
                else b.classList.remove("wrong");
              });
              if (feedbackDiv) feedbackDiv.remove();
            }
          }, 1200);
        }, 1200);
      };
      btnBox.appendChild(btn);
    });
    container.appendChild(btnBox);
  }

  showQuestion();
}

// ==== Memory Session ====
function renderMemoryField(s, idx, container) {
  container.innerHTML = "";
  clearTimeouts();
  stopAllSounds();
  let memoryMusic = null;
  if (window.currentMusic) {
    try { window.currentMusic.pause(); window.currentMusic.currentTime = 0; } catch(e) {}
    window.currentMusic = null;
  }
  if (s.music) {
    try {
      memoryMusic = new Audio("audio/" + s.music);
      memoryMusic.loop = false;
      memoryMusic.volume = 0.2;
      memoryMusic.play();
      window.currentMusic = memoryMusic;
    } catch (e) {}
  }
  const gridSize = (s.gridSize || "3x2").split("x");
  const rows = parseInt(gridSize[1]);
  const cols = parseInt(gridSize[0]);
  const totalCards = rows * cols;
  const cardBack = s.cardBack || "images/cards/cardBack-rounded.png";

  let pairs = s.memoryImages || [];
  if (pairs.length * 2 !== totalCards) {
    pairs = pairs.slice(0, totalCards / 2);
  }
  const cards = pairs.concat(pairs);
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  const grid = document.createElement("div");
  grid.className = "memory-grid";
  grid.style.display = "grid";
  grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  grid.style.gap = "14px";
  grid.style.margin = "0 auto";
  grid.style.maxWidth = "340px";
  grid.style.width = "100%";
  grid.style.padding = "12px";
  grid.style.background = "rgba(255,255,246,0.97)";
  grid.style.borderRadius = "22px";
  grid.style.boxShadow = "0 4px 22px #ffd54f44";
  container.appendChild(grid);

  let flipped = [];
  let matched = [];
  cards.forEach((imgPath, index) => {
    const wrapper = document.createElement("div");
    wrapper.className = "memory-card";
    wrapper.style.position = "relative";
    wrapper.style.aspectRatio = "1/1";
    wrapper.style.cursor = "pointer";
    wrapper.style.background = "#fffbe6";
    wrapper.style.borderRadius = "18px";
    wrapper.style.transition = "box-shadow 0.18s";
    wrapper.style.boxShadow = "0 2px 12px #ffd54f44";
    const front = document.createElement("img");
    front.src = imgPath;
    front.className = "front";
    front.style.display = "none";
    front.style.width = "100%";
    front.style.height = "100%";
    front.style.borderRadius = "16px";
    const back = document.createElement("img");
    back.src = cardBack;
    back.className = "back";
    back.style.display = "block";
    back.style.width = "100%";
    back.style.height = "100%";
    back.style.borderRadius = "16px";
    back.style.boxShadow = "0 1px 7px #fbc02d55";
    wrapper.appendChild(front);
    wrapper.appendChild(back);
    grid.appendChild(wrapper);

    wrapper.addEventListener("click", () => {
      if (
        flipped.length === 2 ||
        matched.includes(index) ||
        flipped.includes(index) ||
        wrapper.classList.contains("flipped")
      ) return;

      wrapper.classList.add("flipped");
      front.style.display = "block";
      back.style.display = "none";
      flipped.push(index);

      if (flipped.length === 2) {
        const [i1, i2] = flipped;
        const same = cards[i1] === cards[i2];
        setTimeout(() => {
          if (same) {
            matched.push(i1, i2);
            runAnimations(["confetti-glow", "emoji-party"]);
            playSound("yay.mp3");
            if (s.avatar) playAvatarAnimation(s.avatar, "tada");
            if (matched.length === cards.length) {
              if (memoryMusic) {
                memoryMusic.pause();
                memoryMusic.currentTime = 0;
              }
              tryShowNextButtonOrWait(() => {
                showUniversalReward(
                  s,
                  () => {
                    if (currentSession < sessions.length - 1) {
                      currentSession++;
                      renderSession(currentSession);
                    } else {
                      window.location.href = "/choose";
                    }
                  }
                );
              });
            }
          } else {
            [i1, i2].forEach(idx => {
              const card = grid.children[idx];
              card.classList.remove("flipped");
              card.querySelector('.front').style.display = "none";
              card.querySelector('.back').style.display = "block";
            });
            runAnimations(["shake"]);
            playSound("fail.mp3");
            if (s.avatar) playAvatarAnimation(s.avatar, "wiggle");
          }
          flipped = [];
        }, 800);
      }
    });
  });
}



// Für Session-Type: "sequence"
function renderSequenceSession(s, idx, container) {
  clearTimeouts();
  stopAllSounds();
  container.innerHTML = "";

  // Musik vorbereiten
  let bgMusic = null;
  if (s.music) {
    bgMusic = new Audio("audio/" + s.music);
    bgMusic.loop = true;
    bgMusic.volume = 0.18;
  }

  const questions = Array.isArray(s.questions) ? s.questions : [];
  let qIdx = 0;

  // === TITEL EINMALIG (OBEN) ===
  let header = document.createElement('div');
  header.className = "quiz-question";
  header.style.margin = "0 0 18px 0";
  header.textContent = s.title || (questions[0] && questions[0].question) || "";
  container.appendChild(header);

  function showQuestion() {
    // Entferne alles außer Überschrift
    Array.from(container.children).forEach((el, i) => { if (i > 0) el.remove(); });

    const q = questions[qIdx];
    let userSequence = [];
    let showingSequence = false;

    // === FRAGE (question) JEWEILS ÜBER DER SEQUENZ ===
    if (q.question) {
      const questionDiv = document.createElement('div');
      questionDiv.className = "quiz-subquestion";
      questionDiv.style.fontSize = "1.13em";
      questionDiv.style.fontWeight = "500";
      questionDiv.style.margin = "0 0 10px 0";
      questionDiv.style.textAlign = "center";
      questionDiv.textContent = q.question;
      container.appendChild(questionDiv);
    }

    // === SEQUENCE-BOXEN + REPEAT BUTTON ===
    const seqWrap = document.createElement('div');
    seqWrap.className = "sequence-row-wrap";
    seqWrap.style.marginTop = "16px";
    container.appendChild(seqWrap);

    const seqContainer = document.createElement('div');
    seqContainer.className = "sequence-container";
    seqWrap.appendChild(seqContainer);

    // Repeat Button
    const repeatBtn = document.createElement('button');
    repeatBtn.className = "repeat-sequence-btn";
    repeatBtn.innerHTML = "&#8635;";
    repeatBtn.title = "Repeat sequence";
    repeatBtn.disabled = true;
    repeatBtn.onclick = () => {
      if (showingSequence) return;
      highlightSequence(q.sequence, seqContainer, 7000, () => {
        showingSequence = false;
        repeatBtn.disabled = false;
      });
    };
    seqWrap.appendChild(repeatBtn);

    function highlightSequence(seq, seqCont, dur, cb) {
      showingSequence = true;
      seqCont.innerHTML = "";
      seq.forEach(color => {
        const box = document.createElement('div');
        box.className = "sequence-box sequence-highlight";
        box.style.background = color;
        seqCont.appendChild(box);
      });
      repeatBtn.disabled = true;
      setTimeout(() => {
        seqCont.querySelectorAll(".sequence-box").forEach(box => box.style.background = "#ddd");
        if (typeof cb === "function") cb();
      }, dur || 7000);
    }

    // === USER-AUSWAHL (unter Sequence) ===
    const chosenWrap = document.createElement('div');
    chosenWrap.className = "user-sequence-row";
    chosenWrap.style.marginTop = "10px";
    container.appendChild(chosenWrap);

    function updateChosen() {
      chosenWrap.innerHTML = "";
      userSequence.forEach((idx, pos) => {
        const col = q.choices[idx];
        const box = document.createElement('div');
        box.className = "user-sequence-item";
        box.style.background = col;
        // Remove-X
        const xBtn = document.createElement('span');
        xBtn.className = "remove-x";
        xBtn.textContent = "×";
        xBtn.onclick = (e) => {
          e.stopPropagation();
          userSequence.splice(pos, 1);
          updateChosen();
          updateCheckBtn();
        };
        box.appendChild(xBtn);
        chosenWrap.appendChild(box);
      });
    }

    // === AUSWAHL-BUTTONS ===
    const btnBox = document.createElement('div');
    btnBox.className = "quiz-buttons";
    container.appendChild(btnBox);

    q.choices.forEach((val, i) => {
      const btn = document.createElement('button');
      btn.textContent = val.charAt(0).toUpperCase() + val.slice(1);
      btn.className = "quiz-choice-btn";
      btn.style.background = val;
      btn.style.color = (val === "yellow") ? "#222" : "#fff";
      btn.onclick = function () {
        if (showingSequence) return;
        if (userSequence.length >= q.correct.length) return;
        userSequence.push(i);
        updateChosen();
        updateCheckBtn();
      };
      btnBox.appendChild(btn);
    });

    // === CHECK BUTTON ===
    const checkBtn = document.createElement('button');
    checkBtn.textContent = "Check";
    checkBtn.className = "centered-next-btn";
    checkBtn.style.display = "none";
    checkBtn.onclick = checkAnswer;
    container.appendChild(checkBtn);

    function updateCheckBtn() {
      checkBtn.style.display = (userSequence.length === q.correct.length) ? "" : "none";
      checkBtn.disabled = false;
    }

    function checkAnswer() {
      btnBox.querySelectorAll("button").forEach(b => b.disabled = true);
      checkBtn.disabled = true;
      repeatBtn.disabled = true;

      showUniversalSpinner(container, 1200, "Checking…", () => {
        const isCorrect = JSON.stringify(userSequence) === JSON.stringify(q.correct);

        playSound(isCorrect ? (q.correctSound || "yay.mp3") : (q.wrongSound || "fail.mp3"));
        runAnimations(isCorrect ? (q.correctAnimation || ["confetti-glow"]) : (q.wrongAnimation || ["shake"]));
        if (s.avatar) playAvatarAnimation(s.avatar, isCorrect ? "tada" : "wiggle");

        if (isCorrect) {
          // Fun Fact & Reward
          if (q.funFact) {
            const factDiv = document.createElement('div');
            factDiv.className = "animal-funfact";
            factDiv.innerHTML = "🐾 <b>Fun Fact:</b> " + q.funFact;
            factDiv.style.marginTop = "18px";
            container.appendChild(factDiv);
            speakText(q.funFact);
            ttsUtterance.onend = function () {
              setTimeout(() => {
                factDiv.remove();
                nextQuestion();
              }, 1600);
            };
          } else {
            nextQuestion();
          }
        } else {
          highlightSequence(q.sequence, seqContainer, 7000, () => {
            // Alles neu (aber Titel bleibt!)
            showQuestion();
          });
        }
      });
    }

    function nextQuestion() {
      qIdx++;
      if (qIdx < questions.length) {
        showQuestion();
      } else {
        if (window.currentMusic) { try { window.currentMusic.pause(); window.currentMusic.currentTime = 0; } catch (e) {} }
        tryShowNextButtonOrWait(() => {
          showUniversalReward(
            s,
            () => {
              if (currentSession < sessions.length - 1) {
                currentSession++;
                renderSession(currentSession);
              } else {
                window.location.href = "/choose";
              }
            }
          );
        });
      }
    }

    // Musik nach Video-Ende oder sofort
    const video = document.querySelector('.floating-video video');
    if (video) {
      video.addEventListener('ended', () => {
        if (bgMusic) bgMusic.play();
        highlightSequence(q.sequence, seqContainer, 7000, () => {
          showingSequence = false;
          repeatBtn.disabled = false;
        });
      }, { once: true });
    } else {
      if (bgMusic) bgMusic.play();
      highlightSequence(q.sequence, seqContainer, 7000, () => {
        showingSequence = false;
        repeatBtn.disabled = false;
      });
    }

    // Musik bei Tabwechsel stoppen
    document.addEventListener("visibilitychange", function () {
      if (bgMusic) document.hidden ? bgMusic.pause() : bgMusic.play();
    });

    // Initial: Buttons deaktivieren bis Sequence fertig
    btnBox.querySelectorAll("button").forEach(b => b.disabled = true);
    checkBtn.disabled = true;
    repeatBtn.disabled = true;
    setTimeout(() => {
      btnBox.querySelectorAll("button").forEach(b => b.disabled = false);
      repeatBtn.disabled = false;
    }, 7000);

    updateChosen();
    updateCheckBtn();
  }

  showQuestion();
}


function renderDragDropSession(s, idx, container) {
  clearTimeouts();
  stopAllSounds();
  container.innerHTML = "";

  // Musik abspielen
  if (s.music) {
    try {
      window.currentMusic = new Audio("audio/" + s.music);
      window.currentMusic.loop = false;
      window.currentMusic.volume = 0.2;
      window.currentMusic.play();
    } catch (e) {}
  }

  const questions = Array.isArray(s.questions) ? s.questions : [];
  let qIdx = 0;

  function showQuestion() {
    container.innerHTML = "";

    const q = questions[qIdx];
    let solvedCount = 0;

    // Fragentext
    if (q.question) {
      const qDiv = document.createElement('div');
      qDiv.className = "quiz-question";
      qDiv.textContent = q.question;
      container.appendChild(qDiv);
    }

    // Drop-Ziele
    const targets = document.createElement("div");
    targets.className = "dragdrop-targets";
    targets.style.display = "flex";
    targets.style.flexWrap = "wrap";
    targets.style.justifyContent = "center";
    targets.style.gap = "20px";
    targets.style.margin = "25px 0 18px 0";
    container.appendChild(targets);

    // Draggables
    const draggables = document.createElement("div");
    draggables.className = "dragdrop-draggables";
    draggables.style.display = "flex";
    draggables.style.flexWrap = "wrap";
    draggables.style.justifyContent = "center";
    draggables.style.gap = "20px";
    draggables.style.margin = "15px 0 16px 0";
    container.appendChild(draggables);

    let currentDrag = null;
    let matched = [];

    // Ziele erstellen
    q.targets.forEach((target, i) => {
      const targetDiv = document.createElement("div");
      targetDiv.className = "dragdrop-target";
      targetDiv.style.width = "94px";
      targetDiv.style.height = "94px";
      targetDiv.style.border = "3px dashed #ffd54f";
      targetDiv.style.borderRadius = "18px";
      targetDiv.style.background = "#fffbe6";
      targetDiv.style.display = "flex";
      targetDiv.style.alignItems = "center";
      targetDiv.style.justifyContent = "center";
      targetDiv.style.position = "relative";
      targetDiv.style.fontSize = "1.1em";
      targetDiv.dataset.solution = target.solution;
      targetDiv.dataset.index = i;

      // Schattenbild?
      if (target.img) {
        const img = document.createElement("img");
        img.src = target.img;
        img.alt = target.label;
        img.style.width = "60px";
        img.style.height = "60px";
        // Wende Schatten-Klasse an, wenn shadow: true
        if (target.shadow) img.classList.add("shadow-image");
        targetDiv.appendChild(img);
      } else {
        targetDiv.textContent = target.label;
      }
      targets.appendChild(targetDiv);

      // DragOver/Drop (Desktop)
      targetDiv.addEventListener("dragover", function (e) {
        e.preventDefault();
        targetDiv.style.background = "#ffe082";
        targetDiv.style.border = "3px solid #ffd54f";
      });
      targetDiv.addEventListener("dragleave", function () {
        targetDiv.style.background = "#fffbe6";
        targetDiv.style.border = "3px dashed #ffd54f";
      });
      targetDiv.addEventListener("drop", function (e) {
        e.preventDefault();
        targetDiv.style.background = "#b9f6ca";
        targetDiv.style.border = "3px solid #39c839";
        const dropped = e.dataTransfer.getData("text/plain");
        handleMatch(dropped, targetDiv);
      });

      // Touch-Drop
      targetDiv.addEventListener("touchend", function (e) {
        if (!currentDrag) return;
        const touch = e.changedTouches[0];
        const rect = targetDiv.getBoundingClientRect();
        if (
          touch.clientX >= rect.left &&
          touch.clientX <= rect.right &&
          touch.clientY >= rect.top &&
          touch.clientY <= rect.bottom
        ) {
          handleMatch(currentDrag.dataset.solution, targetDiv, currentDrag);
        }
      });
    });

    // Karten erstellen
    // Shuffle für Abwechslung!
    let items = Array.isArray(q.items) ? [...q.items] : [];
    items = items.sort(() => Math.random() - 0.5);

    items.forEach((item, i) => {
      const drag = document.createElement("div");
      drag.className = "dragdrop-draggable";
      drag.style.width = "84px";
      drag.style.height = "84px";
      drag.style.borderRadius = "15px";
      drag.style.background = "#81d4fa";
      drag.style.boxShadow = "0 2px 12px #ffd54faa";
      drag.style.display = "flex";
      drag.style.alignItems = "center";
      drag.style.justifyContent = "center";
      drag.style.marginBottom = "10px";
      drag.style.fontSize = "1em";
      drag.style.cursor = "grab";
      drag.style.transition = "box-shadow 0.18s, background 0.18s";
      drag.draggable = true;
      drag.dataset.solution = item.solution;

      if (item.img) {
        const img = document.createElement("img");
        img.src = item.img;
        img.alt = item.label;
        img.style.width = "60px";
        img.style.height = "60px";
        drag.appendChild(img);
      } else {
        drag.textContent = item.label;
      }
      draggables.appendChild(drag);

      // Drag & Drop (Desktop)
      drag.addEventListener("dragstart", function (e) {
        e.dataTransfer.setData("text/plain", item.solution);
        drag.classList.add("dragging");
        setTimeout(() => (drag.style.opacity = "0.4"), 0);
      });
      drag.addEventListener("dragend", function () {
        drag.classList.remove("dragging");
        drag.style.opacity = "1";
      });

      // Touch
      drag.addEventListener("touchstart", function (e) {
        currentDrag = drag;
        drag.classList.add("dragging");
        drag.style.zIndex = "1000";
      });
      drag.addEventListener("touchend", function (e) {
        setTimeout(() => {
          drag.classList.remove("dragging");
          drag.style.zIndex = "";
          currentDrag = null;
        }, 150);
      });
    });

    function handleMatch(solution, targetDiv, dragEl = null) {
      if (
        solution === targetDiv.dataset.solution &&
        !targetDiv.classList.contains("done")
      ) {
        // Korrekt!
        // Finde das passende draggable
        let d = dragEl;
        if (!d) {
          d = [...draggables.children].find(
            c => c.dataset.solution === solution && !c.classList.contains("dragged-done")
          );
        }
        if (d) d.style.pointerEvents = "none";
        targetDiv.classList.add("done");
        if (d) d.classList.add("dragged-done");
        targetDiv.style.background = "#b9f6ca";
        playSound(q.correctSound || "yay.mp3");
        matched.push(solution);
        solvedCount++;
        setTimeout(() => {
          targetDiv.style.background = "#fffbe6";
          targetDiv.style.border = "3px dashed #ffd54f";
        }, 500);

        // Alle gelöst?
        if (solvedCount === items.length) {
          setTimeout(() => {
            showAnswerFeedback(
              container,
              q.feedbackCorrect || "Great job!",
              "#219821",
              2000,
              () => {
                if (qIdx < questions.length - 1) {
                  qIdx++;
                  showQuestion();
                } else {
                  tryShowNextButtonOrWait(() => {
                    showUniversalReward(
                      s,
                      () => {
                        window.location.href = "/choose";
                      }
                    );
                  });
                }
              }
            );
            runAnimations(q.correctAnimation || ["confetti-glow"]);
          }, 500);
        }
      } else {
        // Falsch
        targetDiv.style.background = "#ffd1d1";
        playSound(q.wrongSound || "fail.mp3");
        showAnswerFeedback(
          container,
          q.feedbackWrong || "Oops! Try again!",
          "#c82121",
          1200
        );
        runAnimations(q.wrongAnimation || ["shake"]);
        setTimeout(() => (targetDiv.style.background = "#fffbe6"), 500);
      }
    }
  }

  showQuestion();
}




// ==== Drawing Session ====
// Hier Platzhalter, da du eigene Logik hast (füge ein, falls notwendig)
function renderDrawingSession(s, idx, container) {
  // Deine Drawing-Session-Logik
}

// ==== Animals Session ====
// Wenn du sie brauchst, eigene Funktion hier einfügen (siehe früherer Code).

// ==== Fallback für unbekannte Typen ====
function renderUnknownSession(s, idx, container) {
  const textArea = document.getElementById("sessionTextArea");
  if (textArea) {
    textArea.innerHTML = `<div style="color:red;font-weight:bold;font-size:1.3em;padding:2em;">
      Sorry, this session type (<b>${s.type}</b>) is not implemented yet!
    </div>`;
  }
}

// ==== Universeller Reward (Sticker, Puzzle, Trophy) ====
function showUniversalReward(sessionObj, nextAction = null) {
  stopAllSounds();
  document.querySelectorAll(".animals-reward-container, .centered-next-btn").forEach(e => e.remove());

  const reward = document.createElement("div");
  reward.className = "animals-reward-container";
  reward.style.position = "fixed";
  reward.style.left = "50%";
  reward.style.transform = "translateX(-50%)";
  reward.style.top = "15vh";
  reward.style.zIndex = "500";
  reward.style.background = "#fffbe6";
  reward.style.padding = "26px 30px 30px 30px";
  reward.style.borderRadius = "30px";
  reward.style.boxShadow = "0 10px 40px #b2ebf2, 0 4px 24px #ffd54f99";
  reward.style.display = "flex";
  reward.style.flexDirection = "column";
  reward.style.alignItems = "center";
  reward.style.minWidth = "260px";
  reward.style.maxWidth = "92vw";

  let rewardImg;
  const rewardType = sessionObj.rewardType ||
    (typeof sessionObj.successPuzzle !== "undefined" ? "puzzle" : "star");
  if (rewardType === "star") {
    rewardImg = document.createElement("img");
    rewardImg.src = "images/stickers/star.png";
    rewardImg.style.width = "82px";
    rewardImg.style.height = "82px";
    rewardImg.style.borderRadius = "22px";
    rewardImg.style.margin = "0 0 14px 0";
    rewardImg.className = "reward-animated";
    reward.appendChild(rewardImg);
  } else if (rewardType === "puzzle") {
    rewardImg = document.createElement("img");
    rewardImg.src = typeof sessionObj.rewardImg === "string" ? sessionObj.rewardImg : "images/puzzles/piece.png";
    rewardImg.style.width = "94px";
    rewardImg.style.height = "94px";
    rewardImg.style.borderRadius = "18px";
    rewardImg.style.margin = "0 0 10px 0";
    rewardImg.className = "reward-animated";
    reward.appendChild(rewardImg);
    const rewardAnim = document.createElement("div");
    rewardAnim.className = "reward-sparkle";
    rewardAnim.innerText = "✨";
    rewardAnim.style.fontSize = "2.7rem";
    reward.appendChild(rewardAnim);
  }

  let mainText = sessionObj.onFinish
    || sessionObj.finalRewardText
    || sessionObj.feedbackCorrect
    || "Great job!";

  const feedbackDiv = document.createElement("div");
  feedbackDiv.className = "animals-correct-text";
  feedbackDiv.innerText = mainText;
  feedbackDiv.style.marginBottom = "11px";
  feedbackDiv.style.fontSize = "1.18rem";
  feedbackDiv.style.color = "#444";
  feedbackDiv.style.textAlign = "center";
  reward.appendChild(feedbackDiv);

  const yay = document.createElement("div");
  yay.textContent = {
    "star": "🎉 Yay! You unlocked a Star!",
    "puzzle": "🧩 You got a Puzzle Piece!",
    "trophy": "🏆 You won a Trophy!",
  }[rewardType] || "🎉 Reward!";
  yay.style.fontWeight = "bold";
  yay.style.fontSize = "1.37rem";
  yay.style.color = "#ffa000";
  yay.style.textShadow = "0 1px 6px #fff9c4";
  yay.style.marginBottom = "11px";
  reward.appendChild(yay);

  document.body.appendChild(reward);

  // Speicherlogik (Puzzle, Sticker, Trophy)
  if (rewardType === "puzzle" && typeof unlockPuzzlePiece === "function") {
    if (typeof sessions === "object" && sessions[currentSession]) {
      const s = sessions[currentSession];
      const puzzleId = s.puzzleId || 1;
      const pieces = Array.isArray(s.successPuzzle) ? s.successPuzzle : [s.successPuzzle];
      pieces.forEach(pieceIdx => unlockPuzzlePiece(puzzleId, pieceIdx));
      const key = `puzzle${puzzleId}Pieces`;
      const totalPieces = 8;
      const unlocked = JSON.parse(localStorage.getItem(key) || "[]");
      if (unlocked.length >= totalPieces) {
        setTimeout(() => {
          const completePopup = document.createElement("div");
          completePopup.className = "puzzle-complete-popup";
          completePopup.style.position = "fixed";
          completePopup.style.top = "50%";
          completePopup.style.left = "50%";
          completePopup.style.transform = "translate(-50%, -50%)";
          completePopup.style.background = "#fffde4";
          completePopup.style.padding = "44px 38px";
          completePopup.style.borderRadius = "36px";
          completePopup.style.boxShadow = "0 10px 38px #ffe082b8, 0 2px 16px #90caf9";
          completePopup.style.display = "flex";
          completePopup.style.flexDirection = "column";
          completePopup.style.alignItems = "center";
          completePopup.style.zIndex = "9000";
          completePopup.innerHTML = `
            <img src="images/puzzles/trophy.png" style="width:92px;height:92px;margin-bottom:18px;">
            <div style="font-size:2rem;color:#ffa000;font-weight:bold;text-align:center;margin-bottom:7px;">Puzzle Complete!</div>
            <div style="font-size:1.17rem;color:#444;text-align:center;margin-bottom:21px;">You finished the puzzle!<br>Get ready for a new one tomorrow.</div>
            <button class="centered-next-btn" style="font-size:1.15em;padding:10px 30px;margin-top:10px;">OK</button>
          `;
          document.body.appendChild(completePopup);
          completePopup.querySelector("button").onclick = () => completePopup.remove();
          playSound("fanfare.mp3");
          runAnimations(["confetti-glow", "emoji-party"]);
        }, 500);
      }
    }
  } else if (rewardType === "star" && typeof unlockSticker === "function") {
    unlockSticker(sessionObj.successSticker || 0);
  } else if (rewardType === "trophy") {
    localStorage.setItem(`trophyDay${currentDay}`, "1");
  }

  // Soundeffekt
  let audioSrc = "audio/yay.mp3";
  if (rewardType === "trophy") audioSrc = "audio/fanfare.mp3";
  try {
    const rewardAudio = new Audio(audioSrc);
    rewardAudio.play();
    if (!window.allSessionAudio) window.allSessionAudio = [];
    window.allSessionAudio.push(rewardAudio);
  } catch(e){}

  tryShowNextButtonOrWait(() => {
    const btn = document.createElement("button");
    btn.innerText = (currentSession < sessions.length - 1) ? "Next" : "Finish";
    btn.className = "centered-next-btn";
    btn.onclick = () => {
      document.querySelectorAll(".animals-reward-container, .centered-next-btn").forEach(e => e.remove());
      if (currentSession < sessions.length - 1) {
        currentSession++;
        renderSession(currentSession);
      } else {
        window.location.href = "/choose";
      }
    };
    reward.insertAdjacentElement('afterend', btn);
  });
}

// ==== Sticker & Puzzle Speicher ====
function unlockSticker(idx) {
  let unlocked = JSON.parse(localStorage.getItem('unlockedStickers') || "[]");
  if (!unlocked.includes(idx)) {
    unlocked.push(idx);
    localStorage.setItem('unlockedStickers', JSON.stringify(unlocked));
  }
}
function unlockPuzzlePiece(puzzleId, pieceIdx) {
  const key = `puzzle${puzzleId}Pieces`;
  let unlocked = JSON.parse(localStorage.getItem(key) || "[]");
  if (!unlocked.includes(pieceIdx)) {
    unlocked.push(pieceIdx);
    localStorage.setItem(key, JSON.stringify(unlocked));
  }
}

// ==== Animationen ====
function runAnimations(anims) {
  anims.forEach(anim => {
    if (anim === "confetti-glow") runAnimation_confettiGlow();
    if (anim === "emoji-party") runAnimation_emojiParty();
    if (anim === "sparkle") runAnimation_sparkle();
    if (anim === "shake") runAnimation_shake();
  });
}
function runAnimation_confettiGlow() {
  const confettiBox = document.createElement("div");
  confettiBox.className = "confetti-overlay";
  document.body.appendChild(confettiBox);
  for (let i = 0; i < 25; i++) {
    const piece = document.createElement("div");
    piece.className = "confetti-piece";
    piece.style.left = Math.random() * 100 + "vw";
    piece.style.animationDelay = (Math.random() * 0.8) + "s";
    confettiBox.appendChild(piece);
  }
  setTimeout(() => confettiBox.remove(), 1600);
}
function runAnimation_emojiParty() {
  const emojiList = ["🥳", "🎉", "⭐️", "👏", "🎈", "😻", "🐸", "🌈"];
  for (let i = 0; i < 14; i++) {
    const emoji = document.createElement("div");
    emoji.className = "party-emoji";
    emoji.innerText = emojiList[Math.floor(Math.random()*emojiList.length)];
    emoji.style.left = Math.random() * 90 + "vw";
    emoji.style.top = (60 + Math.random()*30) + "vh";
    emoji.style.fontSize = (1.9 + Math.random()*1.8) + "rem";
    emoji.style.animationDelay = (Math.random()*0.7) + "s";
    document.body.appendChild(emoji);
    setTimeout(() => emoji.remove(), 1800);
  }
}
function runAnimation_shake(selector = ".centered-next-btn, .animals-buttons button, .reward-animated") {
  document.querySelectorAll(selector).forEach(el => {
    el.classList.add("shake");
    setTimeout(() => el.classList.remove("shake"), 500);
  });
}
function runAnimation_sparkle() {
  const sparkle = document.createElement("div");
  sparkle.className = "sparkle-anim";
  sparkle.innerHTML = "✨✨✨";
  document.body.appendChild(sparkle);
  setTimeout(() => sparkle.remove(), 1300);
}
function playAvatarAnimation(avatarName, animType) {
  const img = document.querySelector(".floating-video img.avatar");
  if (!img) return;
  img.classList.remove("avatar-bounce", "avatar-wiggle", "avatar-tada");
  if (animType === "bounce") img.classList.add("avatar-bounce");
  if (animType === "wiggle") img.classList.add("avatar-wiggle");
  if (animType === "tada")   img.classList.add("avatar-tada");
  if (animType !== "bounce") {
    setTimeout(() => img.classList.remove("avatar-wiggle", "avatar-tada"), 1500);
  }
}

// ==== Universal Spinner & Feedback ====
function showUniversalSpinner(container, ms = 3000, text = "Checking…", cb = null) {
  container.querySelectorAll('.universal-spinner').forEach(e => e.remove());
  const spinner = document.createElement('div');
  spinner.className = 'universal-spinner';
  spinner.innerHTML = `
    <div class="spinner-ring"></div>
    <div style="text-align:center; font-size:1.08em; margin-top:13px;">${text}</div>
  `;
  spinner.style.display = "flex";
  spinner.style.flexDirection = "column";
  spinner.style.alignItems = "center";
  spinner.style.justifyContent = "center";
  spinner.style.position = "absolute";
  spinner.style.left = "50%";
  spinner.style.top = "48%";
  spinner.style.transform = "translate(-50%,-50%)";
  spinner.style.zIndex = "200";
  spinner.style.background = "rgba(255,255,240,0.90)";
  spinner.style.borderRadius = "24px";
  spinner.style.padding = "36px 38px 26px";
  spinner.style.boxShadow = "0 4px 22px #ffd54f44";
  container.appendChild(spinner);
  if (!document.getElementById('universalSpinnerCSS')) {
    const style = document.createElement('style');
    style.id = 'universalSpinnerCSS';
    style.innerHTML = `
      .spinner-ring {
        border: 5px solid #f3f3f3;
        border-top: 5px solid #7ec1ff;
        border-radius: 50%;
        width: 56px; height: 56px;
        animation: spin 1.1s linear infinite;
        margin: 0 auto;
      }
      @keyframes spin {
        0% { transform: rotate(0deg);}
        100% { transform: rotate(360deg);}
      }
      .universal-spinner { pointer-events:none; }
    `;
    document.head.appendChild(style);
  }
  setTimeout(() => {
    spinner.remove();
    if (typeof cb === "function") cb();
  }, ms);
}

// ==== Helper für Feedback (optional universal, je nach Bedarf) ====
function showAnswerFeedback(container, text, color = "#219821", duration = 3000, callback = null) {
  container.querySelectorAll('.quiz-feedback').forEach(fb => fb.remove());
  const feedback = document.createElement("div");
  feedback.className = "quiz-feedback";
  feedback.innerText = text;
  feedback.style.color = color;
  feedback.style.marginTop = "12px";
  const spinner = document.createElement('div');
  spinner.className = "wait-spinner";
  feedback.appendChild(spinner);
  container.appendChild(feedback);
  setTimeout(() => {
    feedback.remove();
    if (typeof callback === "function") callback();
  }, duration);
}

// ==== Fallback: Tag abschließen (für DEV & LIVE) ====
async function finishDay(stickers = [], puzzlePieces = []) {
  try {
    if (!DEV_MODE) {
      const activeChildId = localStorage.getItem("activeChildId");
      const user = auth.currentUser;
      if (user && activeChildId) {
        const childRef = doc(db, "users", user.uid, "children", activeChildId);
        const childSnap = await getDoc(childRef);
        const childData = childSnap.data() || {};
        const updatedStickers = Array.from(new Set([...(childData.stickers || []), ...stickers]));
        const updatedPuzzle = Array.from(new Set([...(childData.puzzlePieces || []), ...puzzlePieces]));
        await updateDoc(childRef, {
          completedDays: arrayUnion(currentDay),
          stickers: updatedStickers,
          puzzlePieces: updatedPuzzle
        });
      }
    }
  } catch (e) {}
  setTimeout(() => {
    window.location.href = "/choose";
  }, 800);
}
window.finishDay = finishDay;



// ==== Initialisierung & DEV-Dummy ====
window.onload = async function () {
  const page = getCurrentPage();

  if (page === 'index') {
    // Index-Seite: nichts weiter tun
    return;
  }

  if (page === 'choose') {
    // Choose-Seite: hier kannst du später Logik ergänzen (z.B. Animationen)
    return;
  }

  if (page === 'stickerboard' || page === 'puzzleboard' || page === 'gallery' || page === 'parents' || page === 'thankyou') {
    // Diese Seiten brauchen aktuell keine spezielle JS-Logik
    return;
  }

  if (page === 'day') {
    document.getElementById('mainContent').style.display = '';
    try {
      const res = await fetch(jsonURL);
      if (!res.ok) throw new Error("Day JSON not found: " + jsonURL);
      const data = await res.json();
      sessions = data.sessions;
      currentDay = data.day || 1;
      document.title = `Coach Max – Day ${currentDay}`;
      currentSession = DEV_MODE ? DEV_START_SESSION : 0;
      renderSession(currentSession);
    } catch (e) {
      if (DEV_MODE) {
        sessions = [
          {
            type: "intro",
            title: `Welcome to Day ${currentDay} (Test Mode)`,
            text: [{ line: "Welcome to Test Mode", duration: 3 }]
          },
          {
            type: "sequence",
            title: "Test Sequence",
            avatar: "momo",
            video: "day1-sequence.mp4",
            music: "focus-loop.mp3",
            questions: [
              {
                question: "Can you repeat the color sequence?",
                sequence: ["red", "blue", "yellow", "green"],
                choices: ["red", "blue", "yellow", "green", "purple"],
                correct: [0, 1, 2, 3],
                feedbackCorrect: "Great job!",
                feedbackWrong: "Try again!",
                showDuration: 5000,
                revealDuration: 3000,
                repeatable: true
              }
            ]
          }
        ];
        currentSession = 0;
        renderSession(currentSession);
      } else {
        const textArea = document.getElementById("sessionTextArea");
        if (textArea) {
          textArea.innerHTML = `
            <div style="color:red;font-size:1.3em;padding:2em;text-align:center;">
              Oops! We couldn't load today's session.<br>
              Please try again later.
            </div>`;
        }
      }
    }
    return;
  }

  console.log(`Unbehandelte Seite: ${page}`);
};

// ==== Helper/Utility ====
function clearTimeouts() {
  if (Array.isArray(textTimeouts)) {
    textTimeouts.forEach(t => clearTimeout(t));
    textTimeouts = [];
  }
}

