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
  if (window.ttsUtterance) window.speechSynthesis.cancel();
  window.ttsUtterance = new SpeechSynthesisUtterance(text);
  window.ttsUtterance.lang = "en-US";
  window.ttsUtterance.pitch = 1.1;
  window.ttsUtterance.rate = 1;
  window.ttsUtterance.volume = 1;
  window.speechSynthesis.speak(window.ttsUtterance);
}




/* ==== Helper: Zeitverzögerung & Overlays ==== */
function tryShowNextButtonOrWait(callback) {
  let now = Date.now();
  let remaining = minSessionDuration - (now - sessionStartTime);
  if (remaining > 0) {
    showWaitingOverlay(remaining);
    const timeoutId = setTimeout(() => {
      hideWaitingOverlay();
      callback();
    }, remaining);
    // Timeout-ID speichern für späteres Aufräumen
    textTimeouts.push(timeoutId);
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
  // Interval-ID speichern für späteres Aufräumen
  textTimeouts.push(interval);
}
function hideWaitingOverlay() {
  const overlay = document.getElementById("waitingOverlay");
  if (overlay) overlay.remove();
}

/* ==== Helper: Audio ==== */
function stopAllSounds() {
  if (window.currentMusic) {
    try { 
      window.currentMusic.pause(); 
      window.currentMusic.currentTime = 0; 
    } catch(e) {}
    window.currentMusic = null;
  }
  if (window.allSessionAudio && Array.isArray(window.allSessionAudio)) {
    window.allSessionAudio.forEach(audio => { 
      try { 
        audio.pause(); 
        audio.currentTime = 0; 
      } catch(e){} 
    });
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
  if (window.currentMusic) {
    if (document.hidden) {
      window.currentMusic.pause();
    } else {
      window.currentMusic.play();
    }
  }
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
    if (typeof onVideoEndedCallback === "function") {
      const timeoutId = setTimeout(() => onVideoEndedCallback(), 400);
      textTimeouts.push(timeoutId);
    }
  });
  videoBox.appendChild(playBtn);

  document.body.appendChild(videoBox);
}


function playSessionVideoAndRestoreAvatar(opts) {
  const videoContainer = document.querySelector('.floating-video');
  if (!videoContainer) return;
  videoContainer.innerHTML = "";

  const video = document.createElement("video");
  video.src = opts.videoUrl;
  video.autoplay = true;
  video.muted = false;
  video.playsInline = true;
  video.style.width = "100%";
  video.style.height = "100%";
  video.style.objectFit = "cover";
  video.style.borderRadius = "inherit";
  video.style.display = "block";
  videoContainer.appendChild(video);

  video.onended = () => {
    videoContainer.innerHTML = "";
    if (opts.avatar) {
      const avatarImg = document.createElement("img");
      avatarImg.src = "images/" + opts.avatar + ".png";
      avatarImg.alt = "Avatar";
      avatarImg.style.width = "100%";
      avatarImg.style.height = "100%";
      avatarImg.style.borderRadius = "inherit";
      avatarImg.style.objectFit = "cover";
      avatarImg.style.display = "block";
      videoContainer.appendChild(avatarImg);
    }
    if (opts.onEnded) opts.onEnded();
  };
}

/* ==== Session Header ==== */
function renderSessionHeader(title) {
  const header = document.getElementById("sessionHeader");
  if (header) header.innerText = title || "";
}

/* ==== Haupt-Session-Renderer ==== */

function renderSession12(idx) {
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
  Object.assign(gameContainer.style, {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    maxWidth: "370px",
    margin: "0 auto",
    position: "relative",
    zIndex: "3"
  });
  textArea.appendChild(gameContainer);

  // --- Intro & Story ---
  if (s.type === "intro" || s.type === "story") {
    renderFloatingVideo(s);
    if (s.type === "intro") renderIntroSession(s, idx, gameContainer);
    else renderStorySession(s, idx, gameContainer);
    return;
  }

  // --- Alle anderen Sessions ---
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
    else if (s.type === "sequence") renderSequenceSession(s, idx, gameContainer);
    else if (s.type === "memory") renderMemoryField(s, idx, gameContainer);
    else if (s.type === "drawing") renderDrawingSession(s, idx, gameContainer);
    else if (s.type === "animals") renderAnimalsSession(s, idx, gameContainer);
    else if (s.type === "tapmatch") renderTapMatchSession(s, idx, gameContainer);
    else if (s.type === "reaction") renderReactionSession(s, idx, gameContainer);
    else renderUnknownSession(s, idx, gameContainer);
  });
}

function renderSession123(idx) {
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
  Object.assign(gameContainer.style, {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    maxWidth: "370px",
    margin: "0 auto",
    position: "relative",
    zIndex: "3"
  });
  textArea.appendChild(gameContainer);

  // --- Intro & Story ---
  if (s.type === "intro" || s.type === "story") {
    renderFloatingVideo(s);
    if (s.type === "intro") renderIntroSession(s, idx, gameContainer);
    else renderStorySession(s, idx, gameContainer);
    return;
  }

  // --- Drawing braucht KEIN renderFloatingVideo! ---
  if (s.type === "drawing") {
    renderDrawingSession(s, idx, gameContainer);
    return;
  }
  if (s.type === "explain") {
  renderExplainSession(s, idx, gameContainer);
  return;
}

  // --- Alle anderen Sessions ---
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
    else if (s.type === "sequence") renderSequenceSession(s, idx, gameContainer);
    else if (s.type === "memory") renderMemoryField(s, idx, gameContainer);
    else if (s.type === "animals") renderAnimalsSession(s, idx, gameContainer);
    else if (s.type === "tapmatch") renderTapMatchSession(s, idx, gameContainer);
    else if (s.type === "reaction") renderReactionSession(s, idx, gameContainer);
	else renderUnknownSession(s, idx, gameContainer);
  });
}


function renderSession(idx) {
  sessionStartTime = Date.now();
  const s = sessions[idx];
  lastSessionIdx = idx;

  clearTimeouts();
  stopAllSounds();

  document
    .querySelectorAll(".floating-video, .centered-next-btn, .animals-reward-container")
    .forEach(el => el.remove());

  const textArea = document.getElementById("sessionTextArea");
  if (textArea) textArea.innerHTML = "";

  renderSessionHeader(s.title || "");
  renderFrogProgress(currentSession, currentSession, sessions.length);

  const gameContainer = document.createElement("div");
  gameContainer.id = "gameContainer";
  Object.assign(gameContainer.style, {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    maxWidth: "370px",
    margin: "0 auto",
    position: "relative",
    zIndex: "3",
  });
  textArea.appendChild(gameContainer);

  switch (s.type) {
    // --- Intro & Story: mit Floating-Video, dann direkt rendern
    case "intro": {
      renderFloatingVideo(s);
      renderIntroSession(s, idx, gameContainer);
      return;
    }
    case "story": {
      renderFloatingVideo(s);
      renderStorySession(s, idx, gameContainer);
      return;
    }

    // --- Drawing: ausdrücklich KEIN Floating-Video
    case "drawing": {
      renderDrawingSession(s, idx, gameContainer);
      return;
    }

    // --- Explain: direkt rendern (ohne Universal-Spinner)
    case "explain": {
      renderExplainSession(s, idx, gameContainer);
      return;
    }

    // --- Alles andere: Floating-Video + passender Renderer
    default: {
      renderFloatingVideo(s, () => {
        switch (s.type) {
          case "counting":
          case "animals-quiz":
          case "rhyme":
          case "chatgpt-quiz":
          case "color-quiz":
          case "shadow":
            renderUniversalQuizSession(s, idx, gameContainer);
            break;

          case "sequence":
            renderSequenceSession(s, idx, gameContainer);
            break;

          case "memory":
            renderMemoryField(s, idx, gameContainer);
            break;

          case "animals":
            renderAnimalsSession(s, idx, gameContainer);
            break;

          case "tapmatch":
            renderTapMatchSession(s, idx, gameContainer);
            break;

          case "reaction":
            renderReactionSession(s, idx, gameContainer);
            break;

          default:
            renderUnknownSession(s, idx, gameContainer);
            break;
        }
      });
    }
  }
}




// ==== Intro Session ====
function renderIntroSession(s, idx, container) {
  clearTimeouts();
  stopAllSounds();
  container.innerHTML = "";

  // Avatare-Row
  const avatarRow = document.createElement('div');
  Object.assign(avatarRow.style, {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "22px",
    marginBottom: "12px"
  });

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
    let textIdx = 0;
    function showNextLine() {
      if (textIdx < s.text.length) {
        const t = s.text[textIdx];
        const p = document.createElement('div');
        p.className = "animated-text";
        p.innerText = t.line;
        linesBox.appendChild(p);
        const timeoutId = setTimeout(() => {
          if (linesBox.childNodes.length > 4) linesBox.removeChild(linesBox.firstChild);
          textIdx++;
          showNextLine();
        }, (t.duration || 2) * 1000);
        textTimeouts.push(timeoutId);
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
            introMusic.volume = 0.04;
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
          introMusic.volume = 0.04;
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
        introMusic.volume = 0.04;
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

  // Musik initialisieren, aber noch nicht abspielen!
  let quizMusic = null;
  if (s.music) {
    try {
      quizMusic = new Audio("audio/" + s.music);
      quizMusic.loop = false;
      quizMusic.volume = 0.08;
      window.currentMusic = quizMusic;
    } catch (e) {}
  }

  const questions = Array.isArray(s.questions) ? s.questions : [];
  let qIdx = 0;
  let wrongAnswers = new Set();

  function setAllButtonsDisabled(disabled) {
    container.querySelectorAll(".quiz-choice-btn").forEach(btn => {
      btn.disabled = disabled;
      btn.style.opacity = disabled ? "0.5" : "1";
      btn.style.pointerEvents = disabled ? "none" : "";
    });
  }

  function speakTextWithLock(text, cb) {
    setAllButtonsDisabled(true);
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "en-US";
    utter.onend = () => {
      setAllButtonsDisabled(false);
      if (cb) cb();
    };
    window.speechSynthesis.speak(utter);
  }

  function showQuestion() {
    container.innerHTML = "";
    const q = questions[qIdx];
    wrongAnswers = new Set();

    if (q.question) {
      const qDiv = document.createElement('div');
      qDiv.className = "quiz-question";
      qDiv.textContent = q.question;
      container.appendChild(qDiv);
    }

    // Tierbild + Listen-Again-Button (ohne Sound!)
    let listenBtn = null;
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

      if (q.sound) {
        listenBtn = document.createElement('button');
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

    // Buttons vorbereiten
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

        setAllButtonsDisabled(true);
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

          if (isCorrect) {
            playSound(q.correctSound || "yay.mp3");
            runAnimations(q.correctAnimation || ["confetti-glow", "emoji-party"]);
            if (s.avatar) playAvatarAnimation(s.avatar, "tada");

            speakTextWithLock(feedbackDiv.innerText, () => {
              const timeoutId = setTimeout(() => {
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

                  speakTextWithLock(q.funFact, () => {
                    const timeoutId2 = setTimeout(() => {
                      funDiv.remove();
                      solved = true;
                      qIdx++;
                      if (qIdx < questions.length) showQuestion();
                      else finishQuiz();
                    }, 800);
                    textTimeouts.push(timeoutId2);
                  });
                } else {
                  solved = true;
                  qIdx++;
                  if (qIdx < questions.length) showQuestion();
                  else finishQuiz();
                }
              }, 500);
              textTimeouts.push(timeoutId);
            });
          } else {
            playSound(q.wrongSound || "fail.mp3");
            runAnimations(q.wrongAnimation || ["shake"]);
            if (s.avatar) playAvatarAnimation(s.avatar, "wiggle");

            speakTextWithLock(feedbackDiv.innerText, () => {
              wrongAnswers.add(i);
              btnBox.querySelectorAll("button").forEach((b, idx) => {
                b.style.display = "";
                b.disabled = wrongAnswers.has(idx);
                if (wrongAnswers.has(idx)) b.classList.add("wrong");
                else b.classList.remove("wrong");
              });
              if (feedbackDiv) feedbackDiv.remove();
            });
          }
        }, 1100);
      };
      btnBox.appendChild(btn);
    });
    container.appendChild(btnBox);

    // === Video-Ende → Musik starten → TTS/Sound/Buttons ===
    setAllButtonsDisabled(true);
    const vid = document.querySelector('.floating-video video');
    if (vid) {
      vid.addEventListener('ended', () => {
        if (quizMusic) quizMusic.play();
        if (q.ttsText) {
          speakTextWithLock(q.ttsText, () => {
            if (q.sound) playSound(q.sound);
            setAllButtonsDisabled(false);
          });
        } else {
          if (q.sound) playSound(q.sound);
          setAllButtonsDisabled(false);
        }
      }, { once: true });
    } else {
      if (quizMusic) quizMusic.play();
      if (q.ttsText) {
        speakTextWithLock(q.ttsText, () => {
          if (q.sound) playSound(q.sound);
          setAllButtonsDisabled(false);
        });
      } else {
        if (q.sound) playSound(q.sound);
        setAllButtonsDisabled(false);
      }
    }
  }

  function finishQuiz() {
    if (window.currentMusic) { try { window.currentMusic.pause(); window.currentMusic.currentTime = 0; } catch (e) {} }
    if ((Array.isArray(s.congratsVideos) && s.congratsVideos.length) || s.congratsVideo) {
      let videoUrl = null;
      if (Array.isArray(s.congratsVideos) && s.congratsVideos.length) {
        videoUrl = s.congratsVideos[Math.floor(Math.random() * s.congratsVideos.length)];
      } else if (s.congratsVideo) {
        videoUrl = s.congratsVideo;
      }
      playSessionVideoAndRestoreAvatar({
        videoUrl,
        avatar: s.avatar,
        onEnded: () => {
          tryShowNextButtonOrWait(() => {
            showUniversalReward(
              s,
              () => {
                if (currentSession < sessions.length - 1) {
                  currentSession++;
                  renderSession(currentSession);
                } else window.location.href = "/choose";
              }
            );
          });
        }
      });
    } else {
      tryShowNextButtonOrWait(() => {
        showUniversalReward(
          s,
          () => {
            if (currentSession < sessions.length - 1) {
              currentSession++;
              renderSession(currentSession);
            } else window.location.href = "/choose";
          }
        );
      });
    }
  }

  showQuestion();
}


// ==== Memory Session ====

function renderMemoryField(s, idx, container) {
  container.innerHTML = "";
  clearTimeouts();
  stopAllSounds();

  if (window.currentMusic) {
    try { window.currentMusic.pause(); window.currentMusic.currentTime = 0; } catch(e) {}
    window.currentMusic = null;
  }
  let memoryMusic = null;
  if (s.music) {
    try {
      memoryMusic = new Audio("audio/" + s.music);
      memoryMusic.loop = false;
      memoryMusic.volume = 0.08;
      memoryMusic.play();
      window.currentMusic = memoryMusic;
    } catch (e) {}
  }

  // ======= Header EINMALIG =======
  const header = document.createElement("div");
  header.className = "quiz-question";
  header.textContent = s.title || "Memory Game";
  header.style.margin = "0 0 18px 0";
  container.appendChild(header);

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
  let lock = true;

  function setAllCardsDisabled(disabled) {
    container.querySelectorAll('.memory-card').forEach(card => {
      card.style.pointerEvents = disabled ? "none" : "";
      card.style.opacity = disabled ? 0.5 : 1;
    });
    lock = disabled;
  }

  // Feedback-Overlay (z. B. "Yay!", "Try again!") animiert wie bei tapmatch/quiz
  function showMemoryFeedback(msg, color, cb) {
    let feedbackDiv = document.createElement("div");
    feedbackDiv.className = "memory-feedback";
    feedbackDiv.innerHTML = msg;
    feedbackDiv.style.position = "fixed";
    feedbackDiv.style.left = "50%";
    feedbackDiv.style.top = "26%";
    feedbackDiv.style.transform = "translate(-50%, -50%)";
    feedbackDiv.style.background = color || "#fff";
    feedbackDiv.style.color = "#222";
    feedbackDiv.style.fontSize = "1.5em";
    feedbackDiv.style.fontWeight = "bold";
    feedbackDiv.style.padding = "24px 38px";
    feedbackDiv.style.borderRadius = "22px";
    feedbackDiv.style.boxShadow = "0 6px 32px #ffd54faa";
    feedbackDiv.style.zIndex = "11";
    feedbackDiv.style.textAlign = "center";
    feedbackDiv.style.opacity = "0.95";
    feedbackDiv.style.transition = "all 0.4s";
    feedbackDiv.style.pointerEvents = "none";
    document.body.appendChild(feedbackDiv);
    const timeoutId1 = setTimeout(() => {
      feedbackDiv.style.opacity = "0";
      const timeoutId2 = setTimeout(() => {
        feedbackDiv.remove();
        if (cb) cb();
      }, 320);
      textTimeouts.push(timeoutId2);
    }, 1000);
    textTimeouts.push(timeoutId1);
  }

  // TTS-Lock analog zu tapmatch/quiz
  function speakTextWithLock(text, cb) {
    setAllCardsDisabled(true);
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "en-US";
    utter.onend = () => {
      setAllCardsDisabled(false);
      if (cb) cb();
    };
    window.speechSynthesis.speak(utter);
  }

  // ---- Gratulationsvideo in .floating-video nach Fun Fact ----
function showCongratsVideoAndReward() {
  const videoContainer = document.querySelector('.floating-video');
  if (!videoContainer) return;
  videoContainer.innerHTML = "";

  // Video-URL aus JSON
  let videoUrl = null;
  if (Array.isArray(s.congratsVideos) && s.congratsVideos.length) {
    videoUrl = s.congratsVideos[Math.floor(Math.random() * s.congratsVideos.length)];
  } else if (s.congratsVideo) {
    videoUrl = s.congratsVideo;
  } else {
    videoUrl = "videos/congrats-test.mp4";
  }

  // Das Video nimmt die komplette Fläche des Containers ein
  const video = document.createElement("video");
  video.src = videoUrl;
  video.autoplay = true;
  video.muted = false;
  video.playsInline = true;
  video.style.width = "100%";
  video.style.height = "100%";
  video.style.display = "block";
  video.style.objectFit = "cover"; // Füllt den Container, kein Rand
  video.style.borderRadius = "inherit"; // Wenn Container rund, dann Video rund
  videoContainer.appendChild(video);

  video.onended = () => {
    videoContainer.innerHTML = "";
    // Avatarbild wieder anzeigen
    if (s.avatar) {
      const avatarImg = document.createElement("img");
      avatarImg.src = "images/" + s.avatar + ".png";
      avatarImg.alt = "Avatar";
      avatarImg.style.width = "100%";
      avatarImg.style.height = "100%";
      avatarImg.style.borderRadius = "inherit";
      avatarImg.style.objectFit = "cover";
      avatarImg.style.display = "block";
      videoContainer.appendChild(avatarImg);
    }
    // Jetzt Reward wie gehabt
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
  };
}

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
        wrapper.classList.contains("flipped") ||
        lock
      ) return;

      wrapper.classList.add("flipped");
      front.style.display = "block";
      back.style.display = "none";
      flipped.push(index);

      if (flipped.length === 2) {
        setAllCardsDisabled(true);
        const [i1, i2] = flipped;
        const same = cards[i1] === cards[i2];
        const timeoutId = setTimeout(() => {
          if (same) {
            matched.push(i1, i2);
            runAnimations(s.correctAnimation || ["confetti-glow", "emoji-party"]);
            playSound(s.correctSound || "yay.mp3");
            if (s.avatar) playAvatarAnimation(s.avatar, "tada");

            showMemoryFeedback(s.feedbackCorrect || "Yay! You made a match! 🎉", "#e6ffed", () => {
              speakTextWithLock(s.feedbackCorrect || "Yay! You made a match!", () => {
                const timeoutId2 = setTimeout(() => {
                  if (matched.length === cards.length) {
                    if (memoryMusic) {
                      memoryMusic.pause();
                      memoryMusic.currentTime = 0;
                    }
                    function afterFunFactOrDirect() {
                      showCongratsVideoAndReward(); // im universal floating-video!
                    }
                    if (s.funFact) {
                      const funDiv = document.createElement("div");
                      funDiv.className = "animal-funfact";
                      funDiv.innerHTML = "🐾 <b>Fun Fact:</b> " + s.funFact;
                      funDiv.style.marginTop = "18px";
                      funDiv.style.fontSize = "1.12em";
                      funDiv.style.textAlign = "center";
                      funDiv.style.color = "#555";
                      container.appendChild(funDiv);
                      speakTextWithLock(s.funFact, () => {
                        const timeoutId3 = setTimeout(() => {
                          funDiv.remove();
                          afterFunFactOrDirect();
                        }, 1200);
                        textTimeouts.push(timeoutId3);
                      });
                    } else {
                      afterFunFactOrDirect();
                    }
                  } else {
                    setAllCardsDisabled(false);
                  }
                                  }, 300);
                  textTimeouts.push(timeoutId2);
              });
            });
          } else {
            runAnimations(s.wrongAnimation || ["shake"]);
            playSound(s.wrongSound || "fail.mp3");
            if (s.avatar) playAvatarAnimation(s.avatar, "wiggle");

            showMemoryFeedback(s.feedbackWrong || "Oops! Try again!", "#ffd7d7", () => {
              speakTextWithLock(s.feedbackWrong || "Oops! Try again!", () => {
                [i1, i2].forEach(idx => {
                  const card = grid.children[idx];
                  card.classList.remove("flipped");
                  card.querySelector('.front').style.display = "none";
                  card.querySelector('.back').style.display = "block";
                });
                setAllCardsDisabled(false);
              });
            });
          }
          flipped = [];
        }, 800);
        textTimeouts.push(timeoutId);
      }
    });
  });

  // --- Nach Video/Session-Start: Erst Anleitung per TTS, dann Karten freischalten
  setAllCardsDisabled(true);
  if (s.ttsText) {
    speakTextWithLock(s.ttsText);
  } else {
    setAllCardsDisabled(false);
  }
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
    bgMusic.volume = 0.08;
  }

  const questions = Array.isArray(s.questions) ? s.questions : [];
  let qIdx = 0;

  // === TITEL EINMALIG (OBEN) ===
  let header = document.createElement('div');
  header.className = "quiz-question";
  header.style.margin = "0 0 18px 0";
  header.textContent = s.title || (questions[0] && questions[0].question) || "";
  container.appendChild(header);

  function speakWithCallback(text, cb) {
    if (!text) return cb && cb();
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "en-US";
    utter.onend = () => cb && cb();
    window.speechSynthesis.speak(utter);
  }

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
        btnBox.querySelectorAll("button").forEach(b => b.disabled = false);
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
      btnBox.querySelectorAll("button").forEach(b => b.disabled = true);
      const timeoutId = setTimeout(() => {
        seqCont.querySelectorAll(".sequence-box").forEach(box => box.style.background = "#ddd");
        if (typeof cb === "function") cb();
      }, dur || 7000);
      textTimeouts.push(timeoutId);
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
          // === 1. Feedback anzeigen, sprechen, dann Fun Fact ===
          const feedbackDiv = document.createElement("div");
          feedbackDiv.className = "sequence-feedback";
          feedbackDiv.innerHTML = q.feedbackCorrect || "Great job!";
          feedbackDiv.style.marginTop = "18px";
          feedbackDiv.style.textAlign = "center";
          feedbackDiv.style.fontWeight = "bold";
          container.appendChild(feedbackDiv);

          speakWithCallback(q.feedbackCorrect || "Great job!", () => {
            const timeoutId1 = setTimeout(() => {
              feedbackDiv.remove();
              if (q.funFact) {
                const factDiv = document.createElement('div');
                factDiv.className = "animal-funfact";
                factDiv.innerHTML = "🐾 <b>Fun Fact:</b> " + q.funFact;
                factDiv.style.marginTop = "18px";
                container.appendChild(factDiv);
                speakWithCallback(q.funFact, () => {
                  const timeoutId2 = setTimeout(() => {
                    factDiv.remove();
                    nextQuestion();
                  }, 800);
                  textTimeouts.push(timeoutId2);
                });
              } else {
                nextQuestion();
              }
            }, 600);
            textTimeouts.push(timeoutId1);
          });

        } else {
          // === Falsch: Feedback anzeigen und sprechen, dann Sequence und neue Eingabe ===
          const feedbackDiv = document.createElement("div");
          feedbackDiv.className = "sequence-feedback";
          feedbackDiv.innerHTML = q.feedbackWrong || "Oops! Try again!";
          feedbackDiv.style.marginTop = "18px";
          feedbackDiv.style.textAlign = "center";
          feedbackDiv.style.fontWeight = "bold";
          container.appendChild(feedbackDiv);

          speakWithCallback(q.feedbackWrong || "Oops! Try again!", () => {
            const timeoutId = setTimeout(() => {
              feedbackDiv.remove();
              userSequence = [];
              updateChosen();
              updateCheckBtn();
              highlightSequence(q.sequence, seqContainer, 7000, () => {
                showingSequence = false;
                repeatBtn.disabled = false;
                btnBox.querySelectorAll("button").forEach(b => b.disabled = false);
              });
            }, 600);
            textTimeouts.push(timeoutId);
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
        // === NEU: Gratulationsvideo am Ende anzeigen, dann Avatar, dann Reward ===
        if ((Array.isArray(s.congratsVideos) && s.congratsVideos.length) || s.congratsVideo) {
          let videoUrl = null;
          if (Array.isArray(s.congratsVideos) && s.congratsVideos.length) {
            videoUrl = s.congratsVideos[Math.floor(Math.random() * s.congratsVideos.length)];
          } else if (s.congratsVideo) {
            videoUrl = s.congratsVideo;
          }
          playSessionVideoAndRestoreAvatar({
            videoUrl,
            avatar: s.avatar,
            onEnded: () => {
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
          });
        } else {
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
    }

    // --- TTS nach Video-Ende, dann Sequence ---
    function startSequenceAfterTTS() {
      if (bgMusic) bgMusic.play();
      if (q.ttsText) {
        speakWithCallback(q.ttsText, () => {
          highlightSequence(q.sequence, seqContainer, 7000, () => {
            showingSequence = false;
            repeatBtn.disabled = false;
            btnBox.querySelectorAll("button").forEach(b => b.disabled = false);
          });
        });
      } else {
        highlightSequence(q.sequence, seqContainer, 7000, () => {
          showingSequence = false;
          repeatBtn.disabled = false;
          btnBox.querySelectorAll("button").forEach(b => b.disabled = false);
        });
      }
    }

    const video = document.querySelector('.floating-video video');
    if (video) {
      video.addEventListener('ended', () => {
        startSequenceAfterTTS();
      }, { once: true });
    } else {
      startSequenceAfterTTS();
    }

    document.addEventListener("visibilitychange", function () {
      if (bgMusic) document.hidden ? bgMusic.pause() : bgMusic.play();
    });

    btnBox.querySelectorAll("button").forEach(b => b.disabled = true);
    checkBtn.disabled = true;
    repeatBtn.disabled = true;

    updateChosen();
    updateCheckBtn();
  }

  showQuestion();
}


function renderTapMatchSession(s, idx, container) {
  clearTimeouts();
  stopAllSounds();
  container.innerHTML = "";

  let musicInstance = null; // Musik erst nach Videoende abspielen!

  const questions = Array.isArray(s.questions) ? [...s.questions] : [];
  let qIdx = 0;
  let selectedItem = null;

  // ======= Header EINMALIG =======
  let header = document.createElement('div');
  header.className = "quiz-question";
  header.style.margin = "0 0 18px 0";
  header.textContent = s.title || (questions[0] && questions[0].question) || "";
  container.appendChild(header);

  function setAllCardsDisabled(disabled) {
    container.querySelectorAll(".tapmatch-item, .tapmatch-target").forEach(div => {
      if (!div.classList.contains("matched")) {
        div.style.opacity = disabled ? "0.4" : "1";
        div.style.pointerEvents = disabled ? "none" : "";
      }
    });
  }

  function speakTextWithLock(text, cb) {
    setAllCardsDisabled(true);
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "en-US";
    utter.onend = () => {
      setAllCardsDisabled(false);
      if (cb) cb();
    };
    window.speechSynthesis.speak(utter);
  }

  // Universal-Video/Avatar: Nutzt wie bei Memory/Sequence den globalen Container
  function showCongratsVideoAndReward() {
    let videoUrl = "videos/congrats-test.mp4";
    if (Array.isArray(s.congratsVideos) && s.congratsVideos.length) {
      videoUrl = s.congratsVideos[Math.floor(Math.random() * s.congratsVideos.length)];
    } else if (typeof s.congratsVideo === "string") {
      videoUrl = s.congratsVideo;
    }
    playSessionVideoAndRestoreAvatar({
      videoUrl,
      avatar: s.avatar,
      onEnded: () => {
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
    });
  }

  function showQuestion() {
    // Alles außer Header löschen!
    Array.from(container.children).forEach((el, i) => { if (i > 0) el.remove(); });
    const q = questions[qIdx];
    selectedItem = null;

    // --- VIDEO ---
    if (q.video) {
      const videoWrap = document.createElement("div");
      videoWrap.className = "tapmatch-video-wrap";
      Object.assign(videoWrap.style, { display: "flex", justifyContent: "center", margin: "0 auto 12px" });
      const video = document.createElement("video");
      Object.assign(video, { src: q.video, playsInline: true, controls: false, autoplay: true, muted: false });
      Object.assign(video.style, { maxWidth: "220px", borderRadius: "16px", boxShadow: "0 4px 16px #ffd54f55" });
      videoWrap.appendChild(video);
      container.appendChild(videoWrap);

      let cardsPrepared = false;
      function showCardsIfNotYet() {
        if (!cardsPrepared) {
          cardsPrepared = true;
          showTapMatchCards(q);
          setTimeout(() => setAllCardsDisabled(true), 10);
        }
      }
      video.onended = () => {
        // MUSIK startet JETZT!
        if (s.music) {
          try {
            musicInstance = new Audio("audio/" + s.music);
            musicInstance.loop = false;
            musicInstance.volume = 0.08;
            musicInstance.play();
            window.currentMusic = musicInstance;
          } catch (e) {}
        }
        if (s.avatar) playAvatarAnimation(s.avatar, "talk");
        showCardsIfNotYet();
        if (q.ttsText) {
          speakTextWithLock(q.ttsText);
        } else {
          setAllCardsDisabled(false);
        }
      };
      setTimeout(showCardsIfNotYet, 16000);
      return;
    }

    // --- KEIN VIDEO ---
    if (s.music) {
      try {
        musicInstance = new Audio("audio/" + s.music);
        musicInstance.loop = false;
        musicInstance.volume = 0.08;
        musicInstance.play();
        window.currentMusic = musicInstance;
      } catch (e) {}
    }
    showTapMatchCards(q);
    setAllCardsDisabled(false);
    if (q.ttsText) speakTextWithLock(q.ttsText);
  }

  function showTapMatchCards(q) {
    // ** ALLE alten Frage-Elemente löschen (außer Header) **
    Array.from(container.children).forEach((el, i) => { if (i > 0) el.remove(); });

    // Frage-Text anzeigen
    if (q.question) {
      const qDiv = document.createElement('div');
      qDiv.className = "quiz-subquestion";
      Object.assign(qDiv.style, { margin: "0 0 12px", textAlign: "center" });
      qDiv.textContent = q.question;
      container.appendChild(qDiv);
    }

    // Karten-Wrapper
    const cardsWrap = document.createElement("div");
    cardsWrap.className = "tapmatch-cardswrap";
    Object.assign(cardsWrap.style, {
      display: "flex", justifyContent: "center", gap: "44px",
      margin: "12px 0 0", flexWrap: "wrap"
    });
    container.appendChild(cardsWrap);

    // Items- & Targets-Container
    const itemsDiv = document.createElement("div");
    itemsDiv.className = "tapmatch-items";
    Object.assign(itemsDiv.style, {
      display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "14px"
    });
    cardsWrap.appendChild(itemsDiv);

    const targetsDiv = document.createElement("div");
    targetsDiv.className = "tapmatch-targets";
    Object.assign(targetsDiv.style, {
      display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "14px"
    });
    cardsWrap.appendChild(targetsDiv);

    const CARD_W = "88px", CARD_H = "88px";
    let items = Array.isArray(q.items) ? [...q.items] : [];
    items.sort(() => Math.random() - 0.5);

    // Animal-Karten
    items.forEach(item => {
      const itemDiv = document.createElement("div");
      itemDiv.className = "tapmatch-item";
      Object.assign(itemDiv.style, {
        width: CARD_W, height: CARD_H, borderRadius: "16px",
        background: "#81d4fa", boxShadow: "0 2px 12px #ffd54faa",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "1em", cursor: "pointer", border: "3px solid #ffd54f"
      });
      itemDiv.dataset.solution = item.solution;
      if (item.img) {
        const img = document.createElement("img");
        img.src = item.img; img.alt = item.label;
        Object.assign(img.style, { width: "64px", height: "64px" });
        itemDiv.appendChild(img);
      } else {
        itemDiv.textContent = item.label;
      }
      itemsDiv.appendChild(itemDiv);

      itemDiv.addEventListener("click", () => {
        if (itemDiv.style.pointerEvents === "none") return;
        if (itemDiv.classList.contains("matched")) return;
        if (selectedItem && selectedItem !== itemDiv) {
          Object.assign(selectedItem.style, { boxShadow: "0 2px 12px #ffd54faa", background: "#81d4fa" });
        }
        selectedItem = itemDiv;
        Object.assign(itemDiv.style, { background: "#ffe082", boxShadow: "0 0 12px #ffe082" });
      });
    });

    // Home-Karten
    q.targets.forEach(target => {
      const targetDiv = document.createElement("div");
      targetDiv.className = "tapmatch-target";
      Object.assign(targetDiv.style, {
        width: CARD_W, height: CARD_H, border: "3px dashed #ffd54f",
        borderRadius: "16px", background: "#fffbe6",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "1.1em", cursor: "pointer"
      });
      targetDiv.dataset.solution = target.solution;
      if (target.img) {
        const img = document.createElement("img");
        img.src = target.img; img.alt = target.label;
        Object.assign(img.style, { width: "64px", height: "64px" });
        if (target.shadow) img.classList.add("shadow-image");
        targetDiv.appendChild(img);
      } else {
        targetDiv.textContent = target.label;
      }
      targetsDiv.appendChild(targetDiv);

      targetDiv.addEventListener("click", () => {
        if (targetDiv.style.pointerEvents === "none") return;
        if (selectedItem &&
            !targetDiv.classList.contains("matched") &&
            !selectedItem.classList.contains("matched")) {
          Object.assign(selectedItem.style, { background: "#ffe082" });
          Object.assign(targetDiv.style, { background: "#ffe082" });

          showUniversalSpinner(container, 1200, "Checking…", () => {
            const sol = targetDiv.dataset.solution;
            if (selectedItem.dataset.solution === sol) {
              targetDiv.classList.add("matched");
              selectedItem.classList.add("matched");
              Object.assign(targetDiv.style, { background: "#b9f6ca", opacity: "1" });
              Object.assign(selectedItem.style, { background: "#b9f6ca", opacity: "1" });
              playSound(q.correctSound || "yay.mp3");
              runAnimations(q.correctAnimation || ["confetti-glow", "emoji-party"]);
              if (s.avatar) playAvatarAnimation(s.avatar, "tada");

              // Wenn komplett gelöst: Feedback, dann Fun Fact, dann Gratulationsvideo, dann Reward!
              if (
                itemsDiv.querySelectorAll(".matched").length === items.length &&
                targetsDiv.querySelectorAll(".matched").length === items.length
              ) {
                // --- Feedback anzeigen (yay), sprechen, dann Fun Fact ---
                const feedbackDiv = document.createElement("div");
                feedbackDiv.className = "tapmatch-feedback";
                feedbackDiv.innerHTML = q.feedbackCorrect || "Great job!";
                feedbackDiv.style.marginTop = "18px";
                feedbackDiv.style.textAlign = "center";
                feedbackDiv.style.fontWeight = "bold";
                container.appendChild(feedbackDiv);

                speakTextWithLock(q.feedbackCorrect || "Great job!", () => {
                  setTimeout(() => {
                    feedbackDiv.remove();
                    // Fun Fact?
                    function doAfterFunFact() {
                      // === Nur nach letzter Frage: Gratulationsvideo, dann Reward ===
                      if (qIdx === questions.length - 1 && ((Array.isArray(s.congratsVideos) && s.congratsVideos.length) || s.congratsVideo)) {
                        showCongratsVideoAndReward();
                      } else {
                        setTimeout(() => {
                          qIdx++;
                          showQuestion();
                        }, 500);
                      }
                    }

                    if (q.funFact) {
                      setTimeout(() => {
                        const funFactDiv = document.createElement("div");
                        funFactDiv.className = "animal-funfact";
                        Object.assign(funFactDiv.style, {
                          margin: "24px auto 10px", fontSize: "1.12em",
                          textAlign: "center", background: "#fffde7",
                          borderRadius: "14px", padding: "8px 10px",
                          boxShadow: "0 2px 8px #ffe08266"
                        });
                        funFactDiv.innerHTML = `✨ <b>Fun Fact:</b> ${q.funFact}`;
                        container.appendChild(funFactDiv);
                        speakTextWithLock(q.funFact, () => {
                          setTimeout(() => {
                            funFactDiv.remove();
                            doAfterFunFact();
                          }, 800);
                        });
                      }, 400);
                    } else {
                      doAfterFunFact();
                    }
                  }, 300);
                });
              }
              selectedItem = null;
            } else {
              // Falsch: Feedback anzeigen und sprechen, dann neu
              Object.assign(targetDiv.style, { background: "#ffd1d1" });
              Object.assign(selectedItem.style, { background: "#ffd1d1" });
              playSound(q.wrongSound || "fail.mp3");
              runAnimations(q.wrongAnimation || ["shake"]);
              if (s.avatar) playAvatarAnimation(s.avatar, "wiggle");
              targetDiv.classList.add("wrong");
              selectedItem.classList.add("wrong");

              const feedbackDiv = document.createElement("div");
              feedbackDiv.className = "tapmatch-feedback";
              feedbackDiv.innerHTML = q.feedbackWrong || "Oops! Try again!";
              feedbackDiv.style.marginTop = "18px";
              feedbackDiv.style.textAlign = "center";
              feedbackDiv.style.fontWeight = "bold";
              container.appendChild(feedbackDiv);

              speakTextWithLock(q.feedbackWrong || "Oops! Try again!", () => {
                setTimeout(() => {
                  feedbackDiv.remove();
                  targetDiv.classList.remove("wrong");
                  selectedItem.classList.remove("wrong");
                  Object.assign(targetDiv.style, { background: "#fffbe6" });
                  Object.assign(selectedItem.style, { background: "#81d4fa" });
                  selectedItem = null;
                }, 600);
              });
            }
          });
        }
      });
    });
  }

  showQuestion();
}



function renderReactionSession(s, idx, container) {
  clearTimeouts();
  stopAllSounds();
  container.innerHTML = "";

  let musicInstance = null; // Musik-Objekt
  let roundIdx = 0;
  let reactionStart = 0;
  let musicStarted = false;

  function setAllDisabled(disabled) {
    container.querySelectorAll(".reaction-animal-btn").forEach(btn => {
      btn.disabled = disabled;
      btn.style.opacity = disabled ? "0.6" : "1";
    });
  }

  function speakWithLock(text, cb) {
    setAllDisabled(true);
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "en-US";
    utter.onend = () => {
      setAllDisabled(false);
      if (cb) cb();
    };
    window.speechSynthesis.speak(utter);
  }

  function playMusicIfNeeded() {
    // Musik wird nur einmal pro Session gestartet (nach erstem Video)
    if (musicStarted || !s.music) return;
    try {
      musicInstance = new Audio("audio/" + s.music);
      musicInstance.loop = false;
      musicInstance.volume = 0.08;
      musicInstance.play();
      window.currentMusic = musicInstance;
      musicStarted = true;
    } catch (e) {}
  }

  function showRound() {
    container.innerHTML = "";
    const r = s.rounds[roundIdx];

    // Headline
    const header = document.createElement('div');
    header.className = "quiz-question";
    header.textContent = s.title || "Reaction Game";
    header.style.margin = "0 0 18px 0";
    container.appendChild(header);

    // VIDEO (optional, pro Runde)
    if (r.video) {
      const videoWrap = document.createElement("div");
      videoWrap.className = "reaction-video-wrap";
      videoWrap.style.display = "flex";
      videoWrap.style.justifyContent = "center";
      videoWrap.style.margin = "0 auto 12px";
      const video = document.createElement("video");
      video.src = r.video;
      video.playsInline = true;
      video.controls = false;
      video.autoplay = true;
      video.muted = false;
      video.style.maxWidth = "220px";
      video.style.borderRadius = "16px";
      video.style.boxShadow = "0 4px 16px #ffd54f55";
      videoWrap.appendChild(video);
      container.appendChild(videoWrap);

      video.onended = () => {
        playMusicIfNeeded(); // Musik exakt jetzt!
        startRestOfRound(r);
      };
      return;
    }

    // --- KEIN VIDEO ---
    playMusicIfNeeded();
    startRestOfRound(r);
  }

  function startRestOfRound(r) {
    let ttsText = r.ttsText || s.ttsText || null;
    if (ttsText) {
      speakWithLock(ttsText, () => setupRound(r));
    } else {
      setupRound(r);
    }
  }

  function setupRound(r) {
    // Countdown
    const countdown = document.createElement("div");
    countdown.className = "reaction-countdown";
    countdown.style.textAlign = "center";
    countdown.style.fontSize = "2em";
    countdown.textContent = "3";
    container.appendChild(countdown);

    let count = 3;
    const interval = setInterval(() => {
      count--;
      if (count > 0) {
        countdown.textContent = count;
      } else {
        clearInterval(interval);
        countdown.textContent = "Go!";
        setTimeout(() => {
          countdown.remove();
          startReactionRound(r);
        }, 600);
      }
    }, 700);
  }

  function startReactionRound(r) {
    if (r.sound) playSound(r.sound);

    const btnWrap = document.createElement("div");
    btnWrap.className = "reaction-animals-wrap";
    btnWrap.style.display = "flex";
    btnWrap.style.justifyContent = "center";
    btnWrap.style.gap = "28px";
    btnWrap.style.margin = "22px 0 10px";
    container.appendChild(btnWrap);

    r.options.forEach(opt => {
      const btn = document.createElement("button");
      btn.className = "reaction-animal-btn";
      btn.style.background = "#fffbe6";
      btn.style.border = "2px solid #ffd54f";
      btn.style.borderRadius = "16px";
      btn.style.width = "96px";
      btn.style.height = "96px";
      btn.style.display = "flex";
      btn.style.alignItems = "center";
      btn.style.justifyContent = "center";
      btn.style.boxShadow = "0 2px 12px #ffd54faa";
      btn.style.transition = "box-shadow 0.18s";
      btn.style.cursor = "pointer";
      btn.style.position = "relative";
      btn.innerHTML = `<img src="${opt.img}" alt="${opt.label}" style="width:68px;height:68px;object-fit:contain;">`;
      btn.setAttribute("data-label", opt.label);

      btn.onclick = function () {
        setAllDisabled(true);
        const isCorrect = opt.label.toLowerCase() === r.target.toLowerCase();
        const reactionTimeMs = Math.max(0, Math.round(performance.now() - reactionStart));
        const reactionTimeSec = (reactionTimeMs / 1000).toFixed(2);

        if (isCorrect) {
          playSound("yay.mp3");
          runAnimations(r.correctAnimation || ["confetti-glow", "emoji-party"]);
          btn.style.background = "#b9f6ca";
          const feedback = document.createElement("div");
          feedback.className = "reaction-feedback";
          feedback.innerHTML = (r.feedbackCorrect || "Great!") + `<br><span style="font-size:0.9em;">⏱️ ${reactionTimeSec} s</span>`;
          feedback.style.textAlign = "center";
          feedback.style.margin = "18px auto 0";
          feedback.style.fontWeight = "bold";
          container.appendChild(feedback);
          speakWithLock(r.feedbackCorrect || "Great!", () => {
            setTimeout(() => {
              feedback.remove();
              // Fun Fact
              if (r.funFact) {
                const funDiv = document.createElement("div");
                funDiv.className = "animal-funfact";
                funDiv.innerHTML = "🐾 <b>Fun Fact:</b> " + r.funFact;
                funDiv.style.marginTop = "18px";
                funDiv.style.fontSize = "1.12em";
                funDiv.style.textAlign = "center";
                funDiv.style.color = "#555";
                container.appendChild(funDiv);
                speakWithLock(r.funFact, () => {
                  setTimeout(() => {
                    funDiv.remove();
                    nextRound();
                  }, 900);
                });
              } else {
                nextRound();
              }
            }, 700);
          });
        } else {
          playSound("fail.mp3");
          runAnimations(r.wrongAnimation || ["shake"]);
          btn.style.background = "#ffd1d1";
          const feedback = document.createElement("div");
          feedback.className = "reaction-feedback";
          feedback.innerHTML = r.feedbackWrong || "Try again!";
          feedback.style.textAlign = "center";
          feedback.style.margin = "18px auto 0";
          feedback.style.fontWeight = "bold";
          container.appendChild(feedback);
          speakWithLock(r.feedbackWrong || "Try again!", () => {
            setTimeout(() => {
              feedback.remove();
              showRound();
            }, 800);
          });
        }
      };

      btnWrap.appendChild(btn);
    });

    setTimeout(() => { reactionStart = performance.now(); }, 160);
    setAllDisabled(false);
  }

  function nextRound() {
    roundIdx++;
    if (roundIdx < s.rounds.length) {
      showRound();
    } else {
      if ((Array.isArray(s.congratsVideos) && s.congratsVideos.length) || s.congratsVideo) {
        let videoUrl = null;
        if (Array.isArray(s.congratsVideos) && s.congratsVideos.length) {
          videoUrl = s.congratsVideos[Math.floor(Math.random() * s.congratsVideos.length)];
        } else if (s.congratsVideo) {
          videoUrl = s.congratsVideo;
        }
        playSessionVideoAndRestoreAvatar({
          videoUrl,
          avatar: s.avatar,
          onEnded: () => {
            tryShowNextButtonOrWait(() => {
              showUniversalReward(
                s,
                () => {
                  if (currentSession < sessions.length - 1) {
                    currentSession++;
                    renderSession(currentSession);
                  } else window.location.href = "/choose";
                }
              );
            });
          }
        });
      } else {
        tryShowNextButtonOrWait(() => {
          showUniversalReward(
            s,
            () => {
              if (currentSession < sessions.length - 1) {
                currentSession++;
                renderSession(currentSession);
              } else window.location.href = "/choose";
            }
          );
        });
      }
    }
  }

  showRound();
}


function renderStorySession(s, idx, container) {
  clearTimeouts();
  stopAllSounds();
  container.innerHTML = "";

  let sessionStarted = Date.now();
  let textFinished = false;
  let videoFinished = false;

  // === Header ===
  const header = document.createElement("div");
  header.className = "quiz-question";
  header.style.margin = "0 0 18px 0";
  header.textContent = s.title || "Story Time!";
  container.appendChild(header);

  // === Bildcontainer (optional) ===
  if (s.storyImg) {
    const img = document.createElement("img");
    img.src = s.storyImg;
    img.style.maxWidth = "220px";
    img.style.display = "block";
    img.style.margin = "0 auto 16px";
    img.style.borderRadius = "14px";
    img.style.boxShadow = "0 4px 16px #ffd54f55";
    container.appendChild(img);
  }

  // === Story-Textbox ===
  const textBox = document.createElement("div");
  textBox.className = "story-text";
  textBox.style.fontSize = "1.15em";
  textBox.style.background = "#fffde7";
  textBox.style.borderRadius = "16px";
  textBox.style.padding = "18px 18px";
  textBox.style.margin = "0 0 18px 0";
  textBox.style.boxShadow = "0 2px 10px #ffe08244";
  textBox.style.lineHeight = "1.5";
  container.appendChild(textBox);

  // === Zeilen vorbereiten ===
  let lines = [];
  if (Array.isArray(s.storyLines)) {
    lines = s.storyLines.map(l => (typeof l === "string" ? { line: l, duration: 3 } : l));
  } else if (s.storyText) {
    lines = [{ line: s.storyText, duration: 3 }];
  }

  let lineIdx = 0;
  function showNextLine(cb) {
    if (lineIdx >= lines.length) {
      textFinished = true;
      if (cb) cb();
      tryShowNextButton();
      return;
    }
    const p = document.createElement("div");
    p.className = "animated-text";
    p.textContent = lines[lineIdx].line;
    textBox.appendChild(p);
    textTimeouts.push(
      setTimeout(() => {
        if (textBox.childNodes.length > 4) textBox.removeChild(textBox.firstChild);
        lineIdx++;
        showNextLine(cb);
      }, (lines[lineIdx].duration || 3) * 1000)
    );
  }

  // === Video mit stabilem Play-Button ===
  const videoBox = document.createElement("div");
  videoBox.className = "floating-video";
  const video = document.createElement("video");
  video.src = s.video;
  video.setAttribute("controls", "true");
  video.setAttribute("controlsList", "nodownload");
  video.autoplay = false;
  video.muted = false;
  video.playsInline = true;
  video.poster = "images/video-placeholder.png";
  video.style.width = "100%";
  video.style.height = "100%";
  video.style.borderRadius = "50%";
  videoBox.appendChild(video);

  const playBtn = document.createElement('button');
  playBtn.className = "custom-play-btn";
  playBtn.title = "Play";
  playBtn.innerHTML = `
    <svg viewBox="0 0 60 60">
      <circle cx="30" cy="30" r="28" fill="none"/>
      <polygon points="22,16 46,30 22,44" fill="#383838"/>
    </svg>`;
  videoBox.appendChild(playBtn);
  document.body.appendChild(videoBox);

  // Play-Button: startet Video + Text
  playBtn.addEventListener('click', () => {
    video.play().then(() => {
      playBtn.style.display = "none";
      video.style.pointerEvents = "auto";
      if (lineIdx === 0) showNextLine();
    }).catch(err => console.log("Video Play Error:", err));
  });

  // Video-Ende
  video.addEventListener('ended', () => {
    videoFinished = true;
    tryShowNextButton();
  });

  // === Next-Button mit globaler Warteanzeige ===
  function tryShowNextButton() {
    if (videoFinished && textFinished) {
      tryShowNextButtonOrWait(() => {
        const btn = document.createElement("button");
        btn.innerText = idx < sessions.length - 1 ? "Next" : "Finish";
        btn.className = "centered-next-btn";
        btn.onclick = () => {
          currentSession++;
          renderSession(currentSession);
        };
        document.body.appendChild(btn);
      });
    }
  }
}


function renderDrawingSession1(s, idx, container) {
  clearTimeouts();
  stopAllSounds();
  container.innerHTML = "";

  // --- CSS-in-JS für zentrierte Drawing-Session ---
  if (!document.getElementById('drawing-session-css')) {
    const style = document.createElement("style");
    style.id = "drawing-session-css";
    style.textContent = `
@import url('https://fonts.googleapis.com/css2?family=Comic+Neue:wght@700&family=Quicksand:wght@700&display=swap');
body, html { margin:0; padding:0; width:100vw; }
#main, .main, .container, .outer { box-sizing: border-box !important; margin:0 auto !important; width:100vw !important; padding:0 !important;}
.drawing-root * { font-family: 'Comic Neue', 'Comic Sans MS', 'Quicksand', cursive !important; }
.drawing-root { 
  max-width: 370px;
  margin: 32px auto 0 auto;
  background: #fff9ef;
  padding: 16px 12px 10px 12px;
  border-radius: 28px;
  box-shadow: 0 2px 16px #ffd54f33;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  left: 50%;
  transform: translateX(-50%);
}
.drawing-h2 { font-size: 1.7em; font-weight: bold; text-align: center; margin-bottom: 14px; margin-top: 6px; }
.drawing-tabs { display: flex; justify-content: center; gap: 12px; margin-bottom: 16px; width: 100%; }
.drawing-tab { flex: 1; padding: 12px 0; font-size: 1.13em; font-weight: bold; border-radius: 18px; border: 2px solid #ffd54f; cursor: pointer; transition: background .15s; background: #fff; color: #555; }
.drawing-tab.active { background: #ffe082; color: #222; box-shadow: 0 3px 12px #ffd54f77; }
.drawing-canvas-wrap { display: flex; justify-content: center; align-items: center; width: 100%; }
.drawing-canvas { border: 3px solid #ffd54f; border-radius: 22px; background: #fff; margin-bottom: 18px; display: block; touch-action: none; box-shadow: 0 2px 10px #ffd54f44; }
.drawing-tools { display: flex; justify-content: center; gap: 12px; margin-bottom: 12px; width: 100%; }
.drawing-toolbtn { font-size: 1.13em; padding: 8px 24px; border: none; border-radius: 14px; background: #e0f7fa; color: #1976d2; font-weight: bold; cursor: pointer; transition: background .12s;}
.drawing-toolbtn.active { background: #1976d2; color: #fff; }
.drawing-color-row { display: flex; justify-content: center; gap: 10px; margin-bottom: 13px; }
.drawing-colorbtn { width: 34px; height: 34px; border-radius: 50%; border: 3px solid #ffd54f; box-shadow: 0 2px 6px #ffd54f66; cursor: pointer; outline: none; transition: box-shadow .12s; }
.drawing-colorbtn.selected { box-shadow: 0 0 0 4px #81d4fa, 0 2px 6px #ffd54f66; }
.drawing-size-row { display: flex; justify-content: center; margin-bottom: 10px; }
.drawing-size-sel { padding: 6px 12px; font-size: 1em; border-radius: 12px; border: 2px solid #ffd54f; background: #fffbe6; }
.drawing-btnrow { display: flex; justify-content: center; gap: 28px; margin-bottom: 3px; }
.drawing-actionbtn { font-size: 1.13em; font-weight: bold; padding: 11px 30px; border: none; border-radius: 16px; cursor: pointer; transition: background .14s; box-shadow: 0 1px 8px #ffd54f66; }
.drawing-actionbtn.clear { background: #e57373; color: #fff; }
.drawing-actionbtn.done  { background: #81c784; color: #222; }
@media (max-width: 480px) {
  .drawing-root { max-width: 99vw; left: 50% !important; transform: translateX(-50%) !important; }
  .drawing-canvas { width: 96vw !important; max-width: 96vw; height: 62vw !important; max-height: 68vw; }
}
.floating-video { position:fixed;right:18px;bottom:90px;width:160px;height:160px;border-radius:50%;overflow:hidden;z-index:12;
  box-shadow:0 6px 32px #b2ebf2, 0 2px 24px #fbc02d; background:#fff;display:flex;align-items:center;justify-content:center;}
.floating-video video { width:140px; height:140px; border-radius:50%; object-fit:contain; background:#eee; pointer-events:none; }
.custom-play-btn { position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:80px;height:80px;border-radius:50%;
  background:linear-gradient(135deg, #ffd54f 60%, #81d4fa 100%);display:flex;align-items:center;justify-content:center;
  border:none;box-shadow:0 2px 8px #b3e5fc;z-index:45;cursor:pointer; }
.custom-play-btn svg { width:36px;height:36px;fill:#383838; }
@media (max-width:600px) {
  .floating-video { width:110px; height:110px; right:6px; bottom:68px; }
  .floating-video video { width:90px; height:90px; }
  .custom-play-btn { width:54px;height:54px; }
}
`;
    document.head.appendChild(style);
  }

  // --- Floating Video wie überall ---
  if (s.video) {
    document.querySelectorAll(".floating-video").forEach(el => el.remove());
    const videoBox = document.createElement("div");
    videoBox.className = "floating-video";
    const videoEl = document.createElement("video");
    videoEl.src = s.video;
    videoEl.playsInline = true;
    videoEl.style.width = "100%";
    videoEl.style.height = "100%";
    videoBox.appendChild(videoEl);

    // Play overlay
    const playBtn = document.createElement("button");
    playBtn.className = "custom-play-btn";
    playBtn.innerHTML = `
      <svg viewBox="0 0 60 60">
        <circle cx="30" cy="30" r="28" fill="none"/>
        <polygon points="22,16 46,30 22,44" fill="#383838"/>
      </svg>`;
    videoBox.appendChild(playBtn);

    playBtn.onclick = () => {
      videoEl.play();
      playBtn.style.display = "none";
      videoEl.style.pointerEvents = "auto";
    };
    videoEl.addEventListener("play",  () => playBtn.style.display = "none");
    videoEl.addEventListener("pause", () => playBtn.style.display = "");
    videoEl.addEventListener("ended", () => {
      videoBox.remove();
      buildDrawingUI();
    });

    document.body.appendChild(videoBox);
    return;
  }

  // --- Drawing UI ---
  buildDrawingUI();

  function buildDrawingUI() {
    let mode = "free";
    let tool = "brush";
    let brushSize = 8;
    let brushColor = "#1976d2";
    let lastX = null, lastY = null;
    let drawing = false;
    let templateLoaded = false;

    // Root-Wrapper
    const root = document.createElement("div");
    root.className = "drawing-root";
    container.appendChild(root);

    // Heading
    const h2 = document.createElement("div");
    h2.className = "drawing-h2";
    h2.textContent = s.title || "Draw Something!";
    root.appendChild(h2);

    // Tabs
    const tabs = document.createElement("div");
    tabs.className = "drawing-tabs";
    const freeBtn  = document.createElement("button");
    freeBtn.className = "drawing-tab active";
    freeBtn.innerHTML = "🖍️ Free Drawing";
    const traceBtn = document.createElement("button");
    traceBtn.className = "drawing-tab";
    traceBtn.innerHTML = "✏️ Trace Template";
    tabs.append(freeBtn, traceBtn);
    root.appendChild(tabs);

    // Canvas
    const canvasWrap = document.createElement("div");
    canvasWrap.className = "drawing-canvas-wrap";
    root.appendChild(canvasWrap);

    const canvas = document.createElement("canvas");
    canvas.width = 320; canvas.height = 400;
    canvas.className = "drawing-canvas";
    canvas.style.width = "320px";
    canvas.style.height = "400px";
    canvasWrap.appendChild(canvas);

    const ctx  = canvas.getContext("2d");
    const buf  = document.createElement("canvas");
    buf.width = canvas.width; buf.height = canvas.height;
    const bctx = buf.getContext("2d");

    // Tools Row
    const toolRow = document.createElement("div");
    toolRow.className = "drawing-tools";
    root.appendChild(toolRow);
    const brushBtn = document.createElement("button");
    brushBtn.className = "drawing-toolbtn active";
    brushBtn.innerHTML = "🖌️ Brush";
    const fillBtn  = document.createElement("button");
    fillBtn.className = "drawing-toolbtn";
    fillBtn.innerHTML = "🪣 Fill";
    toolRow.append(brushBtn, fillBtn);

    // Color Row
    const colorRow = document.createElement("div");
    colorRow.className = "drawing-color-row";
    const colors = ["#1976d2","#e53935","#43a047","#fbc02d","#ab47bc","#ffb300","#000","#fff"];
    colors.forEach(c => {
      const btn = document.createElement("button");
      btn.className = "drawing-colorbtn";
      btn.style.background = c;
      if (brushColor === c) btn.classList.add("selected");
      btn.onclick = () => {
        brushColor = c;
        colorRow.querySelectorAll("button").forEach(b => b.classList.remove("selected"));
        btn.classList.add("selected");
      };
      colorRow.appendChild(btn);
    });
    root.appendChild(colorRow);

    // Brush Size Row (Dropdown)
    const sizeRow = document.createElement("div");
    sizeRow.className = "drawing-size-row";
    const sizeSel = document.createElement("select");
    sizeSel.className = "drawing-size-sel";
    [{label:"Thin",v:4},{label:"Medium",v:8},{label:"Thick",v:16}].forEach(opt => {
      const o = document.createElement("option");
      o.value = opt.v;
      o.textContent = opt.label;
      if (opt.v === brushSize) o.selected = true;
      sizeSel.appendChild(o);
    });
    sizeSel.onchange = e => brushSize = +e.target.value;
    sizeRow.appendChild(sizeSel);
    root.appendChild(sizeRow);

    // Buttons: Clear & Done
    const btnRow = document.createElement("div");
    btnRow.className = "drawing-btnrow";
    const clearBtn = document.createElement("button");
    clearBtn.className = "drawing-actionbtn clear";
    clearBtn.textContent = "🗑️ Clear";
    clearBtn.onclick = () => { bctx.clearRect(0,0,buf.width,buf.height); redraw(); };
    const doneBtn = document.createElement("button");
    doneBtn.className = "drawing-actionbtn done";
    doneBtn.textContent = "✅ Done";
    doneBtn.onclick = () => {
      tryShowNextButtonOrWait(() => {
        const nextBtn = document.createElement("button");
        nextBtn.textContent = idx < sessions.length-1 ? "➡️ Next" : "🎉 Finish";
        nextBtn.className = "centered-next-btn";
        nextBtn.onclick = () => { currentSession++; renderSession(currentSession); };
        document.body.append(nextBtn);
      });
    };
    btnRow.append(clearBtn, doneBtn);
    root.appendChild(btnRow);

    // Zeichenlogik
    drawing = false;
    let templateImg = new Image();
    
    if (s.drawingTemplate) {
      templateImg.onload = () => { templateLoaded = true; if (mode === "trace") redraw(); };
      templateImg.src = s.drawingTemplate;
    }

    canvas.addEventListener("pointerdown", e => {
      if (tool === "brush") {
        drawing = true;
        lastX = e.offsetX; lastY = e.offsetY;
        bctx.beginPath();
        bctx.moveTo(lastX, lastY);
      } else if (tool === "fill") {
        floodFill(Math.floor(e.offsetX), Math.floor(e.offsetY), brushColor);
        redraw();
      }
    });
    canvas.addEventListener("pointermove", e => {
      if (!drawing) return;
      bctx.lineCap = "round";
      bctx.lineJoin = "round";
      bctx.lineWidth = brushSize;
      bctx.strokeStyle = brushColor;
      bctx.lineTo(e.offsetX, e.offsetY);
      bctx.stroke();
      bctx.beginPath();
      bctx.moveTo(e.offsetX, e.offsetY);
      redraw();
    });
    ["pointerup","pointerleave"].forEach(ev =>
      canvas.addEventListener(ev, () => {
        if (drawing) {
          bctx.closePath();
          drawing = false;
        }
      })
    );

    // Tabs switching
    freeBtn.onclick = () => switchMode("free");
    traceBtn.onclick = () => switchMode("trace");
    function switchMode(m) {
      mode = m;
      freeBtn.classList.toggle("active", m==="free");
      traceBtn.classList.toggle("active", m==="trace");
      if (m==="free") {
        // Lösche alles beim Umschalten auf free!
        bctx.clearRect(0,0,buf.width,buf.height);
      }
      redraw();
    }

    // Tool switching
    brushBtn.onclick = () => {
      tool = "brush";
      brushBtn.classList.add("active");
      fillBtn.classList.remove("active");
    };
    fillBtn.onclick = () => {
      tool = "fill";
      fillBtn.classList.add("active");
      brushBtn.classList.remove("active");
    };

    function redraw() {
      ctx.clearRect(0,0,canvas.width,canvas.height);
      if (mode==="trace" && templateLoaded) {
        ctx.globalAlpha = 0.27;
        ctx.drawImage(templateImg, 0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1;
      }
      ctx.drawImage(buf, 0, 0);
    }

    function floodFill(x, y, color) {
      const w = buf.width, h = buf.height;
      const img = bctx.getImageData(0,0,w,h), d = img.data;
      const idx0 = (y*w + x)*4;
      const orig = [d[idx0],d[idx0+1],d[idx0+2],d[idx0+3]];
      const tgt  = hexToRgba(color);
      if (orig[0]===tgt[0]&&orig[1]===tgt[1]&&orig[2]===tgt[2]) return;
      const stack = [[x,y]];
      while (stack.length) {
        const [cx,cy] = stack.pop(), i = (cy*w+cx)*4;
        if (i<0||i>=d.length) continue;
        if (d[i]===orig[0]&&d[i+1]===orig[1]&&d[i+2]===orig[2]) {
          d[i]=tgt[0]; d[i+1]=tgt[1]; d[i+2]=tgt[2];
          stack.push([cx+1,cy],[cx-1,cy],[cx,cy+1],[cx,cy-1]);
        }
      }
      bctx.putImageData(img,0,0);
    }
    function hexToRgba(h) {
      const v = h.replace("#",""), a = [...v.match(/.{2}/g)].map(x=>parseInt(x,16));
      return a.length === 3 ? [...a,255] : a;
    }
    // Initial
    switchMode("free");
  }
}




function renderDrawingSession12(s, idx, container) {
  clearTimeouts();
  stopAllSounds();
  container.innerHTML = "";

  // --- CSS-in-JS für zentrierte Drawing-Session + Letterbox ---
  if (!document.getElementById('drawing-session-css')) {
    const style = document.createElement("style");
    style.id = "drawing-session-css";
    style.textContent = `
@import url('https://fonts.googleapis.com/css2?family=Comic+Neue:wght@700&family=Quicksand:wght@700&display=swap');
body, html { margin:0; padding:0; width:100vw; }
.drawing-root * { font-family: 'Comic Neue', 'Comic Sans MS', 'Quicksand', cursive !important; }
.drawing-root { 
  max-width: 370px;
  margin: 8px auto 0 auto;
  background: #fff9ef;
  padding: 8px 7px 7px 7px;
  border-radius: 26px;
  box-shadow: 0 2px 16px #ffd54f33;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  left: 50%;
  transform: translateX(-50%);
}
.drawing-h2 { font-size: 1.7em; font-weight: bold; text-align: center; margin-bottom: 12px; margin-top: 2px; }
.drawing-tabs { display: flex; justify-content: center; gap: 12px; margin-bottom: 15px; width: 100%; }
.drawing-tab { flex: 1; padding: 12px 0; font-size: 1.13em; font-weight: bold; border-radius: 18px; border: 2px solid #ffd54f; cursor: pointer; transition: background .15s; background: #fff; color: #555; }
.drawing-tab.active { background: #ffe082; color: #222; box-shadow: 0 3px 12px #ffd54f77; }
.drawing-canvas-wrap { display: flex; justify-content: center; align-items: center; width: 100%; }
.drawing-canvas { border: 3px solid #ffd54f; border-radius: 22px; background: #fff; margin-bottom: 13px; display: block; touch-action: none; box-shadow: 0 2px 10px #ffd54f44; }
.drawing-tools { display: flex; justify-content: center; gap: 12px; margin-bottom: 10px; width: 100%; }
.drawing-toolbtn { font-size: 1.13em; padding: 8px 24px; border: none; border-radius: 14px; background: #e0f7fa; color: #1976d2; font-weight: bold; cursor: pointer; transition: background .12s;}
.drawing-toolbtn.active { background: #1976d2; color: #fff; }
.drawing-color-row { display: flex; justify-content: center; gap: 10px; margin-bottom: 11px; }
.drawing-colorbtn { width: 34px; height: 34px; border-radius: 50%; border: 3px solid #ffd54f; box-shadow: 0 2px 6px #ffd54f66; cursor: pointer; outline: none; transition: box-shadow .12s; }
.drawing-colorbtn.selected { box-shadow: 0 0 0 4px #81d4fa, 0 2px 6px #ffd54f66; }
.drawing-size-row { display: flex; justify-content: center; margin-bottom: 7px; }
.drawing-size-sel { padding: 6px 12px; font-size: 1em; border-radius: 12px; border: 2px solid #ffd54f; background: #fffbe6; }
.drawing-btnrow { display: flex; justify-content: center; gap: 28px; margin-bottom: 3px; }
.drawing-actionbtn { font-size: 1.13em; font-weight: bold; padding: 11px 30px; border: none; border-radius: 16px; cursor: pointer; transition: background .14s; box-shadow: 0 1px 8px #ffd54f66; }
.drawing-actionbtn.clear { background: #e57373; color: #fff; }
.drawing-actionbtn.done  { background: #81c784; color: #222; }
@media (max-width: 480px) {
  .drawing-root { max-width: 99vw; left: 50% !important; transform: translateX(-50%) !important; }
  .drawing-canvas { width: 96vw !important; max-width: 96vw; height: 62vw !important; max-height: 68vw; }
}
.floating-video { position:fixed;right:18px;bottom:90px;width:160px;height:160px;border-radius:50%;overflow:hidden;z-index:12;
  box-shadow:0 6px 32px #b2ebf2, 0 2px 24px #fbc02d; background:#fff;display:flex;align-items:center;justify-content:center;}
.floating-video video { width:140px; height:140px; border-radius:50%; object-fit:contain; background:#eee; pointer-events:none; }
.custom-play-btn { position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:80px;height:80px;border-radius:50%;
  background:linear-gradient(135deg, #ffd54f 60%, #81d4fa 100%);display:flex;align-items:center;justify-content:center;
  border:none;box-shadow:0 2px 8px #b3e5fc;z-index:45;cursor:pointer; }
.custom-play-btn svg { width:36px;height:36px;fill:#383838; }
@media (max-width:600px) {
  .floating-video { width:110px; height:110px; right:6px; bottom:68px; }
  .floating-video video { width:90px; height:90px; }
  .custom-play-btn { width:54px;height:54px; }
}
`;
    document.head.appendChild(style);
  }

  // --- Floating Video wie überall ---
  if (s.video) {
    document.querySelectorAll(".floating-video").forEach(el => el.remove());
    const videoBox = document.createElement("div");
    videoBox.className = "floating-video";
    const videoEl = document.createElement("video");
    videoEl.src = s.video;
    videoEl.playsInline = true;
    videoEl.style.width = "100%";
    videoEl.style.height = "100%";
    videoBox.appendChild(videoEl);

    // Play overlay
    const playBtn = document.createElement("button");
    playBtn.className = "custom-play-btn";
    playBtn.innerHTML = `
      <svg viewBox="0 0 60 60">
        <circle cx="30" cy="30" r="28" fill="none"/>
        <polygon points="22,16 46,30 22,44" fill="#383838"/>
      </svg>`;
    videoBox.appendChild(playBtn);

    playBtn.onclick = () => {
      videoEl.play();
      playBtn.style.display = "none";
      videoEl.style.pointerEvents = "auto";
    };
    videoEl.addEventListener("play",  () => playBtn.style.display = "none");
    videoEl.addEventListener("pause", () => playBtn.style.display = "");
    videoEl.addEventListener("ended", () => {
      videoBox.remove();
      buildDrawingUI();
    });

    document.body.appendChild(videoBox);
    return;
  }

  // --- Drawing UI ---
  buildDrawingUI();

  function buildDrawingUI() {
    let mode = "free";
    let tool = "brush";
    let brushSize = 8;
    let brushColor = "#1976d2";
    let lastX = null, lastY = null;
    let drawing = false;
    let templateLoaded = false;
    let templateImg = new Image();
    let templateBox = { x: 0, y: 0, w: 0, h: 0 };

    // Root-Wrapper
    const root = document.createElement("div");
    root.className = "drawing-root";
    container.appendChild(root);

    // Heading
    const h2 = document.createElement("div");
    h2.className = "drawing-h2";
    h2.textContent = s.title || "Draw Something!";
    root.appendChild(h2);

    // Tabs
    const tabs = document.createElement("div");
    tabs.className = "drawing-tabs";
    const freeBtn  = document.createElement("button");
    freeBtn.className = "drawing-tab active";
    freeBtn.innerHTML = "🖍️ Free Drawing";
    const traceBtn = document.createElement("button");
    traceBtn.className = "drawing-tab";
    traceBtn.innerHTML = "✏️ Trace Template";
    tabs.append(freeBtn, traceBtn);
    root.appendChild(tabs);

    // Canvas
    const canvasWrap = document.createElement("div");
    canvasWrap.className = "drawing-canvas-wrap";
    root.appendChild(canvasWrap);

    const canvas = document.createElement("canvas");
    canvas.width = 320; canvas.height = 400;
    canvas.className = "drawing-canvas";
    canvas.style.width = "320px";
    canvas.style.height = "400px";
    canvasWrap.appendChild(canvas);

    const ctx  = canvas.getContext("2d");
    const buf  = document.createElement("canvas");
    buf.width = canvas.width; buf.height = canvas.height;
    const bctx = buf.getContext("2d");

    // Tools Row
    const toolRow = document.createElement("div");
    toolRow.className = "drawing-tools";
    root.appendChild(toolRow);
    const brushBtn = document.createElement("button");
    brushBtn.className = "drawing-toolbtn active";
    brushBtn.innerHTML = "🖌️ Brush";
    const fillBtn  = document.createElement("button");
    fillBtn.className = "drawing-toolbtn";
    fillBtn.innerHTML = "🪣 Fill";
    toolRow.append(brushBtn, fillBtn);

    // Color Row
    const colorRow = document.createElement("div");
    colorRow.className = "drawing-color-row";
    const colors = ["#1976d2","#e53935","#43a047","#fbc02d","#ab47bc","#ffb300","#000","#fff"];
    colors.forEach(c => {
      const btn = document.createElement("button");
      btn.className = "drawing-colorbtn";
      btn.style.background = c;
      if (brushColor === c) btn.classList.add("selected");
      btn.onclick = () => {
        brushColor = c;
        colorRow.querySelectorAll("button").forEach(b => b.classList.remove("selected"));
        btn.classList.add("selected");
      };
      colorRow.appendChild(btn);
    });
    root.appendChild(colorRow);

    // Brush Size Row (Dropdown)
    const sizeRow = document.createElement("div");
    sizeRow.className = "drawing-size-row";
    const sizeSel = document.createElement("select");
    sizeSel.className = "drawing-size-sel";
    [{label:"Thin",v:4},{label:"Medium",v:8},{label:"Thick",v:16}].forEach(opt => {
      const o = document.createElement("option");
      o.value = opt.v;
      o.textContent = opt.label;
      if (opt.v === brushSize) o.selected = true;
      sizeSel.appendChild(o);
    });
    sizeSel.onchange = e => brushSize = +e.target.value;
    sizeRow.appendChild(sizeSel);
    root.appendChild(sizeRow);

    // Buttons: Clear & Done
    const btnRow = document.createElement("div");
    btnRow.className = "drawing-btnrow";
    const clearBtn = document.createElement("button");
    clearBtn.className = "drawing-actionbtn clear";
    clearBtn.textContent = "🗑️ Clear";
    clearBtn.onclick = () => { bctx.clearRect(0,0,buf.width,buf.height); redraw(); };
    const doneBtn = document.createElement("button");
    doneBtn.className = "drawing-actionbtn done";
    doneBtn.textContent = "✅ Done";
    doneBtn.onclick = () => {
      tryShowNextButtonOrWait(() => {
        const nextBtn = document.createElement("button");
        nextBtn.textContent = idx < sessions.length-1 ? "➡️ Next" : "🎉 Finish";
        nextBtn.className = "centered-next-btn";
        nextBtn.onclick = () => { currentSession++; renderSession(currentSession); };
        document.body.append(nextBtn);
      });
    };
    btnRow.append(clearBtn, doneBtn);
    root.appendChild(btnRow);

    // Zeichenlogik & Template
    drawing = false;

    // --- Template letterboxed einpassen ---
    if (s.drawingTemplate) {
      templateImg.onload = () => {
        templateLoaded = true;
        templateBox = getLetterboxBox(templateImg, canvas);
        if (mode === "trace") redraw();
      };
      templateImg.src = s.drawingTemplate;
    }

    function getLetterboxBox(img, c) {
      const iw = img.width, ih = img.height;
      const cw = c.width, ch = c.height;
      const ir = iw/ih, cr = cw/ch;
      let dw, dh, dx, dy;
      if (ir > cr) {
        dw = cw;
        dh = cw / ir;
        dx = 0;
        dy = (ch - dh) / 2;
      } else {
        dh = ch;
        dw = ch * ir;
        dy = 0;
        dx = (cw - dw) / 2;
      }
      return {x:dx, y:dy, w:dw, h:dh};
    }

    // Für Touch UND Maus!
    function getPointer(e) {
      const rect = canvas.getBoundingClientRect();
      if (e.touches && e.touches.length) {
        return {
          x: (e.touches[0].clientX - rect.left) * (canvas.width / rect.width),
          y: (e.touches[0].clientY - rect.top) * (canvas.height / rect.height)
        };
      } else {
        return {
          x: (e.clientX - rect.left) * (canvas.width / rect.width),
          y: (e.clientY - rect.top)  * (canvas.height / rect.height)
        };
      }
    }

    canvas.addEventListener("pointerdown", e => {
      const {x, y} = getPointer(e);
      if (tool === "brush") {
        drawing = true;
        lastX = x; lastY = y;
        bctx.beginPath();
        bctx.moveTo(lastX, lastY);
      } else if (tool === "fill") {
        floodFill(Math.floor(x), Math.floor(y), brushColor);
        redraw();
      }
    });
    canvas.addEventListener("pointermove", e => {
      if (!drawing) return;
      const {x, y} = getPointer(e);
      bctx.lineCap = "round";
      bctx.lineJoin = "round";
      bctx.lineWidth = brushSize;
      bctx.strokeStyle = brushColor;
      bctx.lineTo(x, y);
      bctx.stroke();
      bctx.beginPath();
      bctx.moveTo(x, y);
      redraw();
    });
    ["pointerup","pointerleave"].forEach(ev =>
      canvas.addEventListener(ev, () => {
        if (drawing) {
          bctx.closePath();
          drawing = false;
        }
      })
    );

    // Tabs switching (löscht IMMER das Canvas)
    freeBtn.onclick = () => switchMode("free");
    traceBtn.onclick = () => switchMode("trace");
    function switchMode(m) {
      mode = m;
      freeBtn.classList.toggle("active", m==="free");
      traceBtn.classList.toggle("active", m==="trace");
      // Immer beim Umschalten alles löschen!
      bctx.clearRect(0,0,buf.width,buf.height);
      redraw();
    }

    // Tool switching
    brushBtn.onclick = () => {
      tool = "brush";
      brushBtn.classList.add("active");
      fillBtn.classList.remove("active");
    };
    fillBtn.onclick = () => {
      tool = "fill";
      fillBtn.classList.add("active");
      brushBtn.classList.remove("active");
    };

    // --- Letterbox-Template im Canvas korrekt einpassen ---
    function redraw() {
      ctx.clearRect(0,0,canvas.width,canvas.height);
      if (mode==="trace" && templateLoaded) {
        ctx.globalAlpha = 0.27;
        ctx.drawImage(templateImg, templateBox.x, templateBox.y, templateBox.w, templateBox.h);
        ctx.globalAlpha = 1;
      }
      ctx.drawImage(buf, 0, 0);
    }

    // Flood Fill wie gehabt
    function floodFill(x, y, color) {
      const w = buf.width, h = buf.height;
      const img = bctx.getImageData(0,0,w,h), d = img.data;
      const idx0 = (y*w + x)*4;
      const orig = [d[idx0],d[idx0+1],d[idx0+2],d[idx0+3]];
      const tgt  = hexToRgba(color);
      if (orig[0]===tgt[0]&&orig[1]===tgt[1]&&orig[2]===tgt[2]) return;
      const stack = [[x,y]];
      while (stack.length) {
        const [cx,cy] = stack.pop(), i = (cy*w+cx)*4;
        if (i<0||i>=d.length) continue;
        if (d[i]===orig[0]&&d[i+1]===orig[1]&&d[i+2]===orig[2]) {
         d[i]=tgt[0]; d[i+1]=tgt[1]; d[i+2]=tgt[2];
          stack.push([cx+1,cy],[cx-1,cy],[cx,cy+1],[cx,cy-1]);
        }
      }
      bctx.putImageData(img,0,0);
    }
    function hexToRgba(h) {
      const v = h.replace("#",""), a = [...v.match(/.{2}/g)].map(x=>parseInt(x,16));
      return a.length === 3 ? [...a,255] : a;
    }
    // Initial
    switchMode("free");
  }
} 



function renderDrawingSession123(s, idx, container) {
  clearTimeouts();
  stopAllSounds();
  container.innerHTML = "";

  // --- CSS-in-JS für zentrierte Drawing-Session + Letterbox ---
  if (!document.getElementById('drawing-session-css')) {
    const style = document.createElement("style");
    style.id = "drawing-session-css";
    style.textContent = `
@import url('https://fonts.googleapis.com/css2?family=Comic+Neue:wght@700&family=Quicksand:wght@700&display=swap');
body, html { margin:0; padding:0; width:100vw; }
.drawing-root * { font-family: 'Comic Neue', 'Comic Sans MS', 'Quicksand', cursive !important; }
.drawing-root { 
  max-width: 370px;
  margin: 8px auto 0 auto;
  background: #fff9ef;
  padding: 8px 7px 7px 7px;
  border-radius: 26px;
  box-shadow: 0 2px 16px #ffd54f33;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  left: 50%;
  transform: translateX(-50%);
}
.drawing-h2 { font-size: 1.7em; font-weight: bold; text-align: center; margin-bottom: 12px; margin-top: 2px; }
.drawing-tabs { display: flex; justify-content: center; gap: 12px; margin-bottom: 15px; width: 100%; }
.drawing-tab { flex: 1; padding: 12px 0; font-size: 1.13em; font-weight: bold; border-radius: 18px; border: 2px solid #ffd54f; cursor: pointer; transition: background .15s; background: #fff; color: #555; }
.drawing-tab.active { background: #ffe082; color: #222; box-shadow: 0 3px 12px #ffd54f77; }
.drawing-canvas-wrap { display: flex; justify-content: center; align-items: center; width: 100%; }
.drawing-canvas { border: 3px solid #ffd54f; border-radius: 22px; background: #fff; margin-bottom: 13px; display: block; touch-action: none; box-shadow: 0 2px 10px #ffd54f44; }
.drawing-tools { display: flex; justify-content: center; gap: 12px; margin-bottom: 10px; width: 100%; }
.drawing-toolbtn { font-size: 1.13em; padding: 8px 24px; border: none; border-radius: 14px; background: #e0f7fa; color: #1976d2; font-weight: bold; cursor: pointer; transition: background .12s;}
.drawing-toolbtn.active { background: #1976d2; color: #fff; }
.drawing-color-row { display: flex; justify-content: center; gap: 10px; margin-bottom: 11px; }
.drawing-colorbtn { width: 34px; height: 34px; border-radius: 50%; border: 3px solid #ffd54f; box-shadow: 0 2px 6px #ffd54f66; cursor: pointer; outline: none; transition: box-shadow .12s; }
.drawing-colorbtn.selected { box-shadow: 0 0 0 4px #81d4fa, 0 2px 6px #ffd54f66; }
.drawing-size-row { display: flex; justify-content: center; margin-bottom: 7px; }
.drawing-size-sel { padding: 6px 12px; font-size: 1em; border-radius: 12px; border: 2px solid #ffd54f; background: #fffbe6; }
.drawing-btnrow { display: flex; justify-content: center; gap: 28px; margin-bottom: 3px; }
.drawing-actionbtn { font-size: 1.13em; font-weight: bold; padding: 11px 30px; border: none; border-radius: 16px; cursor: pointer; transition: background .14s; box-shadow: 0 1px 8px #ffd54f66; }
.drawing-actionbtn.clear { background: #e57373; color: #fff; }
.drawing-actionbtn.done  { background: #81c784; color: #222; }
@media (max-width: 480px) {
  .drawing-root { max-width: 99vw; left: 50% !important; transform: translateX(-50%) !important; }
  .drawing-canvas { width: 96vw !important; max-width: 96vw; height: 62vw !important; max-height: 68vw; }
}
.floating-video { position:fixed;right:18px;bottom:90px;width:160px;height:160px;border-radius:50%;overflow:hidden;z-index:12;
  box-shadow:0 6px 32px #b2ebf2, 0 2px 24px #fbc02d; background:#fff;display:flex;align-items:center;justify-content:center;}
.floating-video video { width:140px; height:140px; border-radius:50%; object-fit:contain; background:#eee; pointer-events:none; }
.custom-play-btn { position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:80px;height:80px;border-radius:50%;
  background:linear-gradient(135deg, #ffd54f 60%, #81d4fa 100%);display:flex;align-items:center;justify-content:center;
  border:none;box-shadow:0 2px 8px #b3e5fc;z-index:45;cursor:pointer; }
.custom-play-btn svg { width:36px;height:36px;fill:#383838; }
@media (max-width:600px) {
  .floating-video { width:110px; height:110px; right:6px; bottom:68px; }
  .floating-video video { width:90px; height:90px; }
  .custom-play-btn { width:54px;height:54px; }
}
`;
    document.head.appendChild(style);
  }

  // --- Floating Video ---
  if (s.video) {
    document.querySelectorAll(".floating-video").forEach(el => el.remove());
    const videoBox = document.createElement("div");
    videoBox.className = "floating-video";
    const videoEl = document.createElement("video");
    videoEl.src = s.video;
    videoEl.playsInline = true;
    videoEl.style.width = "100%";
    videoEl.style.height = "100%";
    videoBox.appendChild(videoEl);

    const playBtn = document.createElement("button");
    playBtn.className = "custom-play-btn";
    playBtn.innerHTML = `<svg viewBox="0 0 60 60">
      <circle cx="30" cy="30" r="28" fill="none"/>
      <polygon points="22,16 46,30 22,44" fill="#383838"/>
    </svg>`;
    videoBox.appendChild(playBtn);

    playBtn.onclick = () => { videoEl.play(); playBtn.style.display = "none"; videoEl.style.pointerEvents = "auto"; };
    videoEl.addEventListener("play",  () => playBtn.style.display = "none");
    videoEl.addEventListener("pause", () => playBtn.style.display = "");
    videoEl.addEventListener("ended", () => { videoBox.remove(); buildDrawingUI(); });

    document.body.appendChild(videoBox);
    return;
  }

  buildDrawingUI();

  function buildDrawingUI() {
    let mode = "free";
    let tool = "brush";
    let brushSize = 8;
    let brushColor = "#1976d2";
    let drawing = false;
    let templateLoaded = false;
    let templateImg = new Image();
    let templateBox = { x: 0, y: 0, w: 0, h: 0 };

    const root = document.createElement("div");
    root.className = "drawing-root";
    container.appendChild(root);

    const h2 = document.createElement("div");
    h2.className = "drawing-h2";
    h2.textContent = s.title || "Draw Something!";
    root.appendChild(h2);

    const tabs = document.createElement("div");
    tabs.className = "drawing-tabs";
    const freeBtn  = document.createElement("button");
    freeBtn.className = "drawing-tab active";
    freeBtn.innerHTML = "🖍️ Free Drawing";
    const traceBtn = document.createElement("button");
    traceBtn.className = "drawing-tab";
    traceBtn.innerHTML = "✏️ Trace Template";
    tabs.append(freeBtn, traceBtn);
    root.appendChild(tabs);

    const canvasWrap = document.createElement("div");
    canvasWrap.className = "drawing-canvas-wrap";
    root.appendChild(canvasWrap);

    const canvas = document.createElement("canvas");
    canvas.width = 320; canvas.height = 400;
    canvas.className = "drawing-canvas";
    canvas.style.width = "320px"; canvas.style.height = "400px";
    canvasWrap.appendChild(canvas);

    const ctx  = canvas.getContext("2d");
    const buf  = document.createElement("canvas");
    buf.width = canvas.width; buf.height = canvas.height;
    const bctx = buf.getContext("2d");

    // --- NEU: Template laden ---
    const templateUrl = s.drawingTemplate || "templates/cat.svg";
    fetch(templateUrl)
      .then(res => res.text())
      .then(svgText => {
        const blob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        templateImg.onload = () => {
          templateLoaded = true;
          templateBox = getLetterboxBox(templateImg, canvas);
          if (mode === "trace") redraw();
        };
        templateImg.src = url;
      })
      .catch(err => console.error("SVG-Fehler:", err));

    function getLetterboxBox(img, c) {
      const ir = img.width / img.height, cr = c.width / c.height;
      let dw, dh, dx, dy;
      if (ir > cr) { dw = c.width; dh = c.width / ir; dx = 0; dy = (c.height - dh) / 2; }
      else { dh = c.height; dw = c.height * ir; dy = 0; dx = (c.width - dw) / 2; }
      return {x:dx, y:dy, w:dw, h:dh};
    }

    // Tools
    const toolRow = document.createElement("div");
    toolRow.className = "drawing-tools";
    root.appendChild(toolRow);
    const brushBtn = document.createElement("button");
    brushBtn.className = "drawing-toolbtn active"; brushBtn.innerHTML = "🖌️ Brush";
    const fillBtn  = document.createElement("button");
    fillBtn.className = "drawing-toolbtn"; fillBtn.innerHTML = "🪣 Fill";
    toolRow.append(brushBtn, fillBtn);

    const colorRow = document.createElement("div");
    colorRow.className = "drawing-color-row";
    const colors = ["#1976d2","#e53935","#43a047","#fbc02d","#ab47bc","#ffb300","#000","#fff"];
    colors.forEach(c => {
      const btn = document.createElement("button");
      btn.className = "drawing-colorbtn";
      btn.style.background = c;
      if (brushColor === c) btn.classList.add("selected");
      btn.onclick = () => { brushColor = c; colorRow.querySelectorAll("button").forEach(b => b.classList.remove("selected")); btn.classList.add("selected"); };
      colorRow.appendChild(btn);
    });
    root.appendChild(colorRow);

    const sizeRow = document.createElement("div");
    sizeRow.className = "drawing-size-row";
    const sizeSel = document.createElement("select");
    sizeSel.className = "drawing-size-sel";
    [{label:"Thin",v:4},{label:"Medium",v:8},{label:"Thick",v:16}].forEach(opt => {
      const o = document.createElement("option"); o.value = opt.v; o.textContent = opt.label; if (opt.v === brushSize) o.selected = true; sizeSel.appendChild(o);
    });
    sizeSel.onchange = e => brushSize = +e.target.value;
    sizeRow.appendChild(sizeSel);
    root.appendChild(sizeRow);

    const btnRow = document.createElement("div");
    btnRow.className = "drawing-btnrow";
    const clearBtn = document.createElement("button");
    clearBtn.className = "drawing-actionbtn clear"; clearBtn.textContent = "🗑️ Clear";
    clearBtn.onclick = () => { bctx.clearRect(0,0,buf.width,buf.height); redraw(); };
    const doneBtn = document.createElement("button");
    doneBtn.className = "drawing-actionbtn done"; doneBtn.textContent = "✅ Done";
    doneBtn.onclick = () => { tryShowNextButtonOrWait(() => { const nextBtn = document.createElement("button"); nextBtn.textContent = idx < sessions.length-1 ? "➡️ Next" : "🎉 Finish"; nextBtn.className = "centered-next-btn"; nextBtn.onclick = () => { currentSession++; renderSession(currentSession); }; document.body.append(nextBtn); }); };
    btnRow.append(clearBtn, doneBtn);
    root.appendChild(btnRow);

    // Pointer
    function getPointer(e) { const rect = canvas.getBoundingClientRect(); const cx = e.touches ? e.touches[0].clientX : e.clientX; const cy = e.touches ? e.touches[0].clientY : e.clientY; return { x: (cx - rect.left) * (canvas.width / rect.width), y: (cy - rect.top) * (canvas.height / rect.height)}; }

    canvas.addEventListener("pointerdown", e => { const {x, y} = getPointer(e); if (tool === "brush") { drawing = true; bctx.beginPath(); bctx.moveTo(x, y); } else if (tool === "fill") { floodFill(Math.floor(x), Math.floor(y), brushColor); redraw(); } });
    canvas.addEventListener("pointermove", e => { if (!drawing) return; const {x, y} = getPointer(e); bctx.lineCap = "round"; bctx.lineJoin = "round"; bctx.lineWidth = brushSize; bctx.strokeStyle = brushColor; bctx.lineTo(x, y); bctx.stroke(); bctx.beginPath(); bctx.moveTo(x, y); redraw(); });
    ["pointerup","pointerleave"].forEach(ev => canvas.addEventListener(ev, () => { if (drawing) { bctx.closePath(); drawing = false; } }));

    freeBtn.onclick = () => switchMode("free");
    traceBtn.onclick = () => switchMode("trace");
    function switchMode(m) { mode = m; freeBtn.classList.toggle("active", m==="free"); traceBtn.classList.toggle("active", m==="trace"); bctx.clearRect(0,0,buf.width,buf.height); redraw(); }

    brushBtn.onclick = () => { tool = "brush"; brushBtn.classList.add("active"); fillBtn.classList.remove("active"); };
    fillBtn.onclick = () => { tool = "fill"; fillBtn.classList.add("active"); brushBtn.classList.remove("active"); };

    function redraw() { ctx.clearRect(0,0,canvas.width,canvas.height); if (mode==="trace" && templateLoaded) { ctx.globalAlpha = 0.27; ctx.drawImage(templateImg, templateBox.x, templateBox.y, templateBox.w, templateBox.h); ctx.globalAlpha = 1; } ctx.drawImage(buf, 0, 0); }

    function floodFill(x, y, color) {
      const w = buf.width, h = buf.height; const img = bctx.getImageData(0,0,w,h), d = img.data; const idx0 = (y*w + x)*4; const orig = [d[idx0],d[idx0+1],d[idx0+2],d[idx0+3]]; const tgt  = hexToRgba(color);
      const tol = 20; // Farbtoleranz
      const stack = [[x,y]]; while (stack.length) { const [cx,cy] = stack.pop(), i = (cy*w+cx)*4; if (i<0||i>=d.length) continue;
        if (Math.abs(d[i]-orig[0])<tol && Math.abs(d[i+1]-orig[1])<tol && Math.abs(d[i+2]-orig[2])<tol) { d[i]=tgt[0]; d[i+1]=tgt[1]; d[i+2]=tgt[2]; stack.push([cx+1,cy],[cx-1,cy],[cx,cy+1],[cx,cy-1]); } }
      bctx.putImageData(img,0,0);
    }
    function hexToRgba(h) { const v=h.replace("#",""), a=[...v.match(/.{2}/g)].map(x=>parseInt(x,16)); return a.length===3?[...a,255]:a; }

    switchMode("free");
  }
}



function renderExplainSession1(s, idx, container) {
  clearTimeouts();
  stopAllSounds();
  container.innerHTML = "";

  // Universal Spinner entfernen
  document.querySelectorAll(".universal-spinner").forEach(el => el.remove());

  // Überschrift / Titel
  const header = document.createElement("div");
  header.className = "quiz-question";
  header.textContent = s.title || "Let's learn something new!";
  container.appendChild(header);

  // Helfer: aktiven Kindernamen für TTS einsetzen
  const childName = (localStorage.getItem("activeChildName") || "").trim() || "buddy";
  const personalize = (txt) =>
    (txt || "").replaceAll("{childName}", childName).replaceAll("{ChildName}", childName);

  // Video-Box (zentriert, oben)
  let videoEl = null;
  const hasVideo = !s.reminder && s.video;
  if (hasVideo) {
    const videoWrap = document.createElement("div");
    videoWrap.className = "explain-video-wrap";
    const video = document.createElement("video");
    video.src = (s.video.startsWith("videos/") ? s.video : "videos/" + s.video);
    video.playsInline = true;
    video.controls = true;        // Eltern können pausieren
    video.autoplay = false;       // Autoplay ist mobil oft geblockt
    video.muted = false;
    video.className = "explain-video";
    videoWrap.appendChild(video);
    container.appendChild(videoWrap);
    videoEl = video;
  }

  // Beispiele unten als Chips
  const examples = Array.isArray(s.examples) ? s.examples : [];
  if (examples.length) {
    const exWrap = document.createElement("div");
    exWrap.className = "explain-examples";
    examples.forEach((t) => {
      const chip = document.createElement("div");
      chip.className = "explain-chip";
      chip.textContent = t;
      exWrap.appendChild(chip);
    });
    container.appendChild(exWrap);
  }

  // TTS-Logik: Buttons während TTS sperren
  function setDisabled(disabled) {
    container.querySelectorAll("button, video").forEach(el => {
      if (el.tagName === "VIDEO") {
        el.controls = !disabled;  // Video bleibt bedienbar, aber wir sperren sonst nichts Hartes
      } else {
        el.disabled = disabled;
        el.style.opacity = disabled ? "0.6" : "1";
      }
    });
  }
  function speakWithLock(text, cb) {
    if (!text) return cb && cb();
    setDisabled(true);
    try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch(e){}
    const u = new SpeechSynthesisUtterance(personalize(text));
    u.lang = "en-US";
    u.rate = 1;
    u.pitch = 1.05;
    u.onend = () => { setDisabled(false); cb && cb(); };
    try { window.speechSynthesis.speak(u); } catch(e){ setDisabled(false); cb && cb(); }
  }

  // "Listen again" Button (nur wenn TTS-Text vorhanden)
  let listenBtn = null;
  if (s.ttsText) {
    listenBtn = document.createElement("button");
    listenBtn.className = "animal-listen-btn";
    listenBtn.style.marginTop = "10px";
    listenBtn.innerHTML = "🔊 Listen again";
    listenBtn.onclick = () => speakWithLock(s.ttsText);
    container.appendChild(listenBtn);
  }

  // Ablauf:
  // - Falls Video existiert: erst Video ansehen, dann personalisiertes TTS
  // - Falls Reminder: sofort TTS
  function showNextBtn() {
    tryShowNextButtonOrWait(() => {
      const btn = document.createElement("button");
      btn.className = "centered-next-btn";
      btn.textContent = (idx < sessions.length - 1) ? "Next" : "Finish";
      btn.onclick = () => {
        if (idx < sessions.length - 1) { currentSession++; renderSession(currentSession); }
        else { window.location.href = "/choose"; }
      };
      container.appendChild(btn);
    });
  }

  if (hasVideo && videoEl) {
    // Start-Hinweis, optional TTS vor dem Video?
    // Wir spielen TTS NACH dem Video, damit die Erklärung zusammenpasst.
    videoEl.addEventListener("ended", () => {
      if (s.ttsText) speakWithLock(s.ttsText, showNextBtn);
      else showNextBtn();
    }, { once: true });

    // Falls Nutzer gar nicht abspielt → kleiner Hinweis
    const hint = document.createElement("div");
    hint.style.fontSize = "0.95rem";
    hint.style.color = "#666";
    hint.style.textAlign = "center";
    hint.style.marginTop = "6px";
    hint.textContent = "Tip: Play the short video, then we'll continue!";
    container.appendChild(hint);
  } else {
    // Reminder-Variante: nur TTS/Text
    if (s.ttsText) speakWithLock(s.ttsText, showNextBtn);
    else showNextBtn();
  }
}


function renderExplainSession(s, idx, container) { 
  console.log("renderExplainSession aufgerufen - ohne Wartungs-Overlay!");
  clearTimeouts();
  stopAllSounds();
  container.innerHTML = "";

  // Universal Spinner entfernen
  document.querySelectorAll(".universal-spinner").forEach(el => el.remove());

  // Animation für Play-Button
  const style = document.createElement("style");
  style.textContent = `
    @keyframes pulsePlay {
      0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255,193,7, 0.7); }
      70% { transform: scale(1.1); box-shadow: 0 0 0 15px rgba(255,193,7, 0); }
      100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255,193,7, 0); }
    }
    .play-btn-animated {
      background: #ffc107;
      border: none;
      border-radius: 50%;
      width: 80px;
      height: 80px;
      font-size: 1.8em;
      font-weight: bold;
      color: #fff;
      cursor: pointer;
      animation: pulsePlay 1.5s infinite;
    }
  `;
  document.head.appendChild(style);

  // Überschrift
  const header = document.createElement("div");
  header.className = "quiz-question";
  header.style.marginTop = "-10px";
  header.textContent = s.title || "Let's learn something new!";
  container.appendChild(header);

  const childName = (localStorage.getItem("activeChildName") || "").trim() || "buddy";
  const personalize = (txt) =>
    (txt || "").replaceAll("{childName}", childName).replaceAll("{ChildName}", childName);

  function setDisabled(disabled) {
    container.querySelectorAll("button, video").forEach(el => {
      if (el.tagName === "VIDEO") {
        el.controls = !disabled;
      } else {
        el.disabled = disabled;
        el.style.opacity = disabled ? "0.6" : "1";
      }
    });
  }

  function speakWithLock(text, cb) {
    if (!text) return cb && cb();
    setDisabled(true);
    try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch(e){}
    const liveText = document.createElement("div");
    liveText.style.margin = "8px auto";
    liveText.style.padding = "10px";
    liveText.style.maxWidth = "360px";
    liveText.style.background = "#fffde7";
    liveText.style.borderRadius = "14px";
    liveText.style.textAlign = "center";
    liveText.textContent = personalize(text);
    container.appendChild(liveText);
    const u = new SpeechSynthesisUtterance(personalize(text));
    u.lang = "en-US";
    u.rate = 1;
    u.pitch = 1.05;
    u.onend = () => { setDisabled(false); liveText.remove(); cb && cb(); };
    try { window.speechSynthesis.speak(u); } catch(e){ setDisabled(false); liveText.remove(); cb && cb(); }
  }

  function showVideoAndExamples() {
    const hasVideo = !s.reminder && s.video;
    let videoEl = null;
    if (hasVideo) {
      const video = document.createElement("video");
      video.src = (s.video.startsWith("videos/") ? s.video : "videos/" + s.video);
      video.playsInline = true;
      video.controls = true;
      video.autoplay = false;
      video.muted = false;
      video.style.display = "block";
      video.style.maxWidth = "240px";
      video.style.margin = "0 auto 8px auto";
      video.style.borderRadius = "16px";
      container.appendChild(video);
      videoEl = video;
    }

    const tip = document.createElement("div");
    tip.style.fontSize = "0.95rem";
    tip.style.color = "#666";
    tip.style.textAlign = "center";
    tip.style.margin = "6px auto";
    tip.textContent = "Tip: Play the short video, then we'll continue!";
    container.appendChild(tip);

    const examples = Array.isArray(s.examples) ? s.examples : [];
    if (examples.length) {
      const exWrap = document.createElement("div");
      exWrap.style.display = "flex";
      exWrap.style.flexWrap = "wrap";
      exWrap.style.justifyContent = "center";
      exWrap.style.gap = "8px";
      const palette = ["#81d4fa","#ffe082","#b9f6ca","#ffccbc","#d1c4e9","#c5e1a5","#ffecb3","#b3e5fc"];
      examples.forEach((t, i) => {
        const chip = document.createElement("div");
        chip.style.background = palette[i % palette.length];
        chip.style.padding = "8px 12px";
        chip.style.borderRadius = "16px";
        chip.style.fontWeight = "bold";
        chip.textContent = t;
        exWrap.appendChild(chip);
      });
      container.appendChild(exWrap);
    }

    // Next-Button sofort anzeigen (ohne Wartezeit und ohne Mindestdauer)
    const btn = document.createElement("button");
    btn.className = "centered-next-btn";
    btn.textContent = (idx < sessions.length - 1) ? "Next" : "Finish";
    btn.onclick = () => {
      if (idx < sessions.length - 1) { currentSession++; renderSession(currentSession); }
      else { window.location.href = "/choose"; }
    };
    container.appendChild(btn);
  }

  const playBtn = document.createElement("button");
  playBtn.className = "play-btn-animated";
  playBtn.textContent = "▶";
  playBtn.onclick = () => {
    playBtn.remove();
    if (s.ttsText) speakWithLock(s.ttsText, showVideoAndExamples);
    else showVideoAndExamples();
  };
  container.appendChild(playBtn);
}



/* Temporary stubs to satisfy linter – implement later */
function renderDrawingSession() { /* no-op */ }
function renderAnimalsSession() { /* no-op */ }



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
  console.log("Current page:", getCurrentPage());
  console.log("Current day:", getDayParam());

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