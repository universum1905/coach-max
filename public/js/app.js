/* ==== COACH MAX UNIVERSAL SESSION TEMPLATE ==== */

let sessions = [], currentSession = 0, lastSessionIdx = 0;
let textTimeouts = [];
let currentDay = 1;
let currentMusic = null;

const DEV_MODE = true;              // false = Live, true = Test/Entwickler
const DEV_START_SESSION = 2;        // Index: 0 = Intro, 1 = Counting, etc.

function getDayParam() {
  const params = new URLSearchParams(window.location.search);
  return parseInt(params.get("day")) || 1;
}
currentDay = getDayParam();
const jsonURL = `days/day${currentDay}.json`;

let sessionStartTime = 0;
const minSessionDuration = 60 * 1000;

// ==== Firebase nur einmal initialisieren ====
import { app, analytics } from "./js/firebase.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const auth = getAuth(app);
const db = getFirestore(app);

// ==== OnLoad: DEV vs. Live ====
window.onload = async function() {
  document.getElementById('mainContent').style.display = '';
  try {
    const res = await fetch(jsonURL);
    if (!res.ok) throw new Error("Fehler beim Laden des JSON: " + res.statusText);
    const data = await res.json();
    sessions = data.sessions;
    currentDay = data.day || 1;
    document.title = `Coach Max – Day ${currentDay}`;
    currentSession = DEV_MODE ? DEV_START_SESSION : 0;
    renderSession(currentSession);
  } catch (e) {
    console.warn("Fehler beim Initialisieren:", e);
    // Fallback Dummy-Sessions
    sessions = [
      { type: "intro", title: "Test Intro", text: [{ line: "Welcome to Test Mode", duration: 3 }] },
      { type: "sequence", title: "Test Sequence", avatar: "momo", video: "day1-sequence.mp4", music: "focus-loop.mp3",
        questions: [{ question: "Can you repeat the sequence?", sequence: ["red","blue","yellow","green"], choices: ["red","blue","yellow","green","purple"], correct: [0,1,2,3] }]
      }
    ];
    currentSession = 0;
    renderSession(currentSession);
  }
};


// ==== KI/TTS-Limit-Logik (pro Tag und Session, z. B. 1000 Zeichen) ====
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


// === Ganz oben in app.js einfügen ===
let ttsUtterance = null;
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

// Simple Overlay-Animation (Minimalvariante)
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

  // Countdown-Anzeige (optional)
  let countdownDiv = overlay.querySelector("#waitCountdown");
  let remainingSec = Math.ceil(ms / 1000);
  countdownDiv.textContent = `${remainingSec} sec`;
  let interval = setInterval(() => {
    remainingSec--;
    if (remainingSec > 0) {
      countdownDiv.textContent = `${remainingSec} sec`;
    } else {
      clearInterval(interval);
    }
  }, 1000);
}

function hideWaitingOverlay() {
  document.getElementById("waitingOverlay")?.remove();
}




// ==== 2. Musik-/Sound-Handling ====
// Stoppt ALLE laufenden Sounds zentral
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
// Musik auch bei Tab-Wechsel pausieren
document.addEventListener("visibilitychange", function() {
  if (window.currentMusic) {
    if (document.hidden) window.currentMusic.pause();
    else window.currentMusic.play();
  }
});

function playSound(soundFile) {
  try {
    const audio = new Audio("audio/" + soundFile);
    audio.volume = 0.75;
    audio.play();
    if (!window.allSessionAudio) window.allSessionAudio = [];
    window.allSessionAudio.push(audio);
  } catch(e){}
}


// ==== 3. Überschrift zentriert OBEN, nur einmal! ====
// --- Session-Titel dynamisch setzen ---
let dynamicTitle = s.title || "";
if (s.type === "intro") {
  dynamicTitle = dynamicTitle.replace("{day}", currentDay) || `Welcome to Coach Max – Day ${currentDay}`;
}
renderSessionHeader(dynamicTitle);



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
    // ...dein Style...
    track.appendChild(frog);
  }

  const spots = track.querySelectorAll(".frog-bar-spot");
  const active = spots[currentIdx];
  if (active) {
    frog.style.left = active.offsetLeft + "px";
    frog.style.animation = "frogHop 0.45s";
    playSound("frog-hop.mp3");
  }
}

// ==== 4. Floating Video universal ====
function renderFloatingVideo(sessionObj, onVideoEndedCallback) {
  // Alte Videoboxen entfernen
  document.querySelectorAll(".floating-video").forEach(el => el.remove());

  // Kein Video? -> Direkt Callback
  if (!sessionObj.video) {
    window.currentVideo = null; // <- Wichtig, reset!
    if (typeof onVideoEndedCallback === "function") onVideoEndedCallback();
    return;
  }

  // Floating Video-Container erstellen
  const videoBox = document.createElement("div");
  videoBox.className = "floating-video";

  // Videoelement erstellen
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

  // GLOBAL setzen, damit Tab-Event funktioniert!
  window.currentVideo = videoElement;

  // Play-Overlay
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
    // Nach Video: Avatar einblenden (Box bleibt)
    videoBox.innerHTML = `<img class="avatar" src="images/${sessionObj.avatar || 'luna'}.png" style="width:100%;height:100%;border-radius:50%;object-fit:contain;">`;
    window.currentVideo = null; // Video ist durch!
    if (typeof onVideoEndedCallback === "function") setTimeout(() => onVideoEndedCallback(), 400);
  });
  videoBox.appendChild(playBtn);

  document.body.appendChild(videoBox);
}

// Tabwechsel: Musik & Video pausieren
document.addEventListener("visibilitychange", function() {
  if (window.currentMusic) {
    if (document.hidden) window.currentMusic.pause();
    else window.currentMusic.play();
  }
  if (window.currentVideo) {
    if (document.hidden) window.currentVideo.pause();
    // else window.currentVideo.play(); // <-- Nur wenn du willst!
  }
});

// ==== 5. Haupt-Session-Renderer ====
function renderSession(idx) {
  sessionStartTime = Date.now(); // <<< HIER!
  const s = sessions[idx];
  lastSessionIdx = idx;
  clearTimeouts();
  stopAllSounds();
  document.querySelectorAll(".floating-video, .centered-next-btn, .animals-reward-container").forEach(el => el.remove());

  // Nur das Spielfeld leeren, Überschrift bleibt!
  const textArea = document.getElementById("sessionTextArea");
  if (textArea) textArea.innerHTML = "";

  // Überschrift immer nur HIER!
  renderSessionHeader(s.title || "");
    
// Hier direkt nach dem Aufbau der Session:
renderFrogProgress(currentSession, currentSession, sessions.length);


  // Zentraler Spielfeld-Container (Game/Quiz/Memory etc.)
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

  // Spezialfall: Intro & Story – synchron!
 // renderSession:
if (s.type === "intro" || s.type === "story") {
  renderFloatingVideo(s);
  if (s.type === "intro")  renderIntroSession(s, idx, gameContainer);
  else                     renderStorySession(s, idx, gameContainer);
  return;
}
// Alle anderen: Erst nach Video das Spielfeld
renderFloatingVideo(s, () => {
  // UNIVERSALER QUIZ-TYP
  if (
    s.type === "counting" ||
    s.type === "animals-quiz" ||
    s.type === "rhyme" ||
    s.type === "chatgpt-quiz" ||
    s.type === "color-quiz" ||
    s.type === "sequence" ||
    s.type === "shadow"
  ) {
    renderUniversalQuizSession(s, idx, gameContainer);
  }
  // MEMORY separat
  else if (s.type === "memory") {
    renderMemoryField(s, idx, gameContainer);
  }
  // ZEICHNEN separat
  else if (s.type === "drawing") {
    renderDrawingSession(s, idx, gameContainer);
  }
  // SPEZIELLE ANIMAL-SESSION
  else if (s.type === "animals") {
    renderAnimalsSession(s, idx, gameContainer);
  }
  // Fallback
  else {
    renderUnknownSession(s, idx, gameContainer);
  }
});
}






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
                            window.location.href = "choose.html";
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
                          window.location.href = "choose.html";
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



// ==== 7. Universeller Reward ====
function showUniversalReward(sessionObj, nextAction = null) {
  stopAllSounds();
  document.querySelectorAll(".animals-reward-container, .centered-next-btn").forEach(e => e.remove());

  // Popup bauen
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

  // Bild/Emoji je nach Reward-Type
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

  // === Überschrift / Feedback dynamisch ===
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

  // Zusatz-Animation/Emoji
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

  // === Speicherlogik wie gehabt ...
  if (rewardType === "puzzle" && typeof unlockPuzzlePiece === "function") {
    if (typeof sessions === "object" && sessions[currentSession]) {
      const s = sessions[currentSession];
      const puzzleId = s.puzzleId || 1;
      const pieces = Array.isArray(s.successPuzzle) ? s.successPuzzle : [s.successPuzzle];
      pieces.forEach(pieceIdx => unlockPuzzlePiece(puzzleId, pieceIdx));

      // --- Puzzle Complete: Alle Teile gesammelt? ---
      const key = `puzzle${puzzleId}Pieces`;
      const totalPieces = 8; // Passe ggf. an!
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

  // Finish-Button (mit Zeit-Logik): Immer zu choose.html oder next session
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
        window.location.href = "choose.html";
      }
    };
    reward.insertAdjacentElement('afterend', btn);
  });
}

// ==== Tag als abgeschlossen markieren und weiterleiten ====
async function finishDay(stickers = [], puzzlePieces = []) {
  try {
    if (!DEV_MODE) {
      // Live: Speichern in Firebase
      const activeChildId = localStorage.getItem("activeChildId");
      const user = auth.currentUser;
      if (user && activeChildId) {
        const childRef = doc(db, "users", user.uid, "children", activeChildId);
        await updateDoc(childRef, {
          completedDays: arrayUnion(currentDay),
          stickers: arrayUnion(...stickers),
          puzzlePieces: arrayUnion(...puzzlePieces)
        });
      }
    } else {
      console.log("DEV_MODE: Speichern simuliert:", { currentDay, stickers, puzzlePieces });
    }
  } catch (e) {
    console.warn("Fehler beim Speichern:", e);
  }

  // Weiterleitung: Im DEV-Mode UND Live gleich
  setTimeout(() => {
    window.location.href = "choose.html";
  }, 800);
}


// ==== 8. Initialisierung ====
/* ==== COACH MAX UNIVERSAL SESSION TEMPLATE ==== */

let sessions = [], currentSession = 0, lastSessionIdx = 0;
let textTimeouts = [];
let currentDay = 1;
let currentMusic = null;

const DEV_MODE = true;              // false = Live, true = Test/Entwickler
const DEV_START_SESSION = 0;        // Index: Startsession in DEV

function getDayParam() {
  const params = new URLSearchParams(window.location.search);
  const d = parseInt(params.get("day"));
  return d > 0 ? d : 1; // Fallback auf Day 1
}
currentDay = getDayParam();
const jsonURL = `days/day${currentDay}.json`;

let sessionStartTime = 0;
const minSessionDuration = 60 * 1000;

/* ==== WICHTIG: DEV-FREUNDLICHES LADEN ==== */
window.onload = async function() {
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
    console.warn("Fehler beim Initialisieren:", e.message);
    if (DEV_MODE) {
      // === Dummy Sessions ===
      console.log("DEV_MODE aktiv: Dummy-Sessions geladen.");
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
              sequence: ["red","blue","yellow","green"],
              choices: ["red","blue","yellow","green","purple"],
              correct: [0,1,2,3],
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
      // === Live-Modus: Fehleranzeige, kein Redirect ===
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
};
// Immer ganz oben im Code behalten!

function clearTimeouts() {
  if (Array.isArray(textTimeouts)) {
    textTimeouts.forEach(t => clearTimeout(t));
    textTimeouts = [];
  }
}


// ==== 9. Helper: Animationen, Sound usw. ====
// ... z.B. runAnimations, playAvatarAnimation wie gehabt ...

// ==== 10. Optional: renderIntroSession/renderMemoryField etc. ====
// Wichtig: Diese Funktionen arbeiten **ausschließlich** im gameContainer!










// Fallback, falls ein Session-Typ nicht erkannt wird:
function renderUnknownSession(s, idx) {
  const textArea = document.getElementById("sessionTextArea");
  if (textArea) {
    textArea.innerHTML = `<div style="color:red;font-weight:bold;font-size:1.3em;padding:2em;">
      Sorry, this session type (<b>${s.type}</b>) is not implemented yet!
    </div>`;
  }
}

/* ==== COACH MAX APP.JS – STEP 5: REWARD-SYSTEM, NEXT-BUTTON, STICKER, PUZZLE ==== */



// Sticker speichern
function unlockSticker(idx) {
  let unlocked = JSON.parse(localStorage.getItem('unlockedStickers') || "[]");
  if (!unlocked.includes(idx)) {
    unlocked.push(idx);
    localStorage.setItem('unlockedStickers', JSON.stringify(unlocked));
  }
}

// Puzzle-Teile speichern
function unlockPuzzlePiece(puzzleId, pieceIdx) {
  const key = `puzzle${puzzleId}Pieces`;
  let unlocked = JSON.parse(localStorage.getItem(key) || "[]");
  if (!unlocked.includes(pieceIdx)) {
    unlocked.push(pieceIdx);
    localStorage.setItem(key, JSON.stringify(unlocked));
  }
}

/* ==== COACH MAX APP.JS – STEP 6.1: INTRO-SESSION MIT VIDEO & ANIMIERTEM TEXT ==== */

function renderIntroSession(s, idx, container) {
  clearTimeouts();
  stopAllSounds();
  container.innerHTML = "";
  // ... alle Elemente via container.appendChild(...)





  // Avatare-Row unter der Überschrift (Momo & Benny)
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

  // Emojis als untere Box (optional)
  const emojiBox = document.createElement('div');
  emojiBox.className = "intro-emojis";
  emojiBox.innerHTML = "🤩&nbsp;🎉&nbsp;⭐&nbsp;👏";
  container.appendChild(emojiBox);

  // Container für animierte Textzeilen
  const linesBox = document.createElement('div');
  linesBox.className = "animated-lines";
  container.appendChild(linesBox);

  // Musik-Objekt initialisieren (damit wir stoppen können)
  let introMusic = null;

  // Holt das Video-Element aus dem .floating-video-Container
  const floatingBox = document.querySelector('.floating-video');
  const video = floatingBox ? floatingBox.querySelector('video') : null;

  let started = false, videoDone = false, textDone = false;

  // Text-Animation (wie gehabt)
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

  // **Hier ist die entscheidende Logik:**  
  // Musik & Text laufen LOS, sobald das Video startet (durch Play/Autoplay)
  if (video) {
    video.addEventListener('play', () => {
      if (!started) {
        started = true;
        // Musik abspielen, falls im JSON
        if (s.music) {
          try {
            introMusic = new Audio("audio/" + s.music);
            introMusic.loop = false;
            introMusic.volume = 0.18;
            introMusic.play();
            window.currentMusic = introMusic;
          } catch (e) {}
        }
        // Text-Animation sofort starten
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

    // Falls das Video schon läuft (Autoplay/DEV), direkt starten!
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
    // Kein Video: Musik & Text sofort
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


/* ==== COACH MAX APP.JS – STEP 6.3: COUNTING-SESSION ==== */


function renderCountingSession(s, idx, container) {
  clearTimeouts();
  stopAllSounds();
  container.innerHTML = "";

  // Musik
  if (window.currentMusic) {
    try { window.currentMusic.pause(); window.currentMusic.currentTime = 0; } catch(e) {}
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

function showQuestion() {
  container.innerHTML = "";

  const q = questions[qIdx];

  // Frage
  if (q.question) {
    const qDiv = document.createElement('div');
    qDiv.className = "quiz-question";
    qDiv.textContent = q.question;
    container.appendChild(qDiv);
  }

  // Tierbild(er) + Listen Again
  let imgSoundWrap = null;
  if (q.img) {
    imgSoundWrap = document.createElement('div');
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

    // Listen Again Button (nur falls Sound)
    if (q.sound) {
      playSound(q.sound);
      const listenBtn = document.createElement('button');
      listenBtn.className = "animal-listen-btn";
      listenBtn.innerHTML = '🔊 Listen Again';
      listenBtn.style.marginLeft = "14px";
      listenBtn.onclick = function(e) {
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

  q.choices.forEach((val, i) => {
    const btn = document.createElement('button');
    btn.textContent = val;
    btn.className = "quiz-choice-btn";
    btn.onclick = function () {
      if (solved || btn.disabled) return;
      solved = true;

      // Nur der angeklickte Button bleibt sichtbar
      btnBox.querySelectorAll("button").forEach((b, idx) => {
        if (b !== btn) b.style.display = "none";
        b.disabled = true;
      });
      btn.classList.add("selected");

      // Spinner unter Button
      showUniversalSpinner(container, 3000, "Checking…", () => {
        btn.classList.remove("selected");
        const isCorrect = (i === q.correct);

        // Feedback anlegen
        const feedback = document.createElement("div");
        feedback.className = "quiz-feedback";
        feedback.innerText = isCorrect ? (q.feedbackCorrect || "Great job! 🎉") : (q.feedbackWrong || "Try again!");
        feedback.style.color = isCorrect ? "#219821" : "#c82121";
        feedback.style.marginTop = "18px";
        btn.parentNode.insertAdjacentElement("afterend", feedback);

        // Animationen/Sounds
        playSound(isCorrect ? (q.correctSound || "yay.mp3") : (q.wrongSound || "fail.mp3"));
        runAnimations(isCorrect ? (q.correctAnimation || ["confetti-glow"]) : (q.wrongAnimation || ["shake"]));
        if (s.avatar) playAvatarAnimation(s.avatar, isCorrect ? "tada" : "wiggle");

        if (isCorrect) {
          btn.classList.add("correct");

          // Fun Fact unter Feedback
          let factDiv = null;
          if (q.funFact) {
            factDiv = document.createElement("div");
            factDiv.className = "animal-funfact";
            factDiv.innerHTML = "🐾 <b>Fun Fact:</b> " + q.funFact;
            factDiv.style.marginTop = "14px";
            factDiv.style.fontSize = "1.09em";
            factDiv.style.textAlign = "center";
            factDiv.style.color = "#555";
            feedback.insertAdjacentElement("afterend", factDiv);
          }

          // Alles 5 Sekunden stehen lassen
          setTimeout(() => {
            feedback.remove();
            if (factDiv) factDiv.remove();
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
                      window.location.href = "choose.html";
                    }
                  }
                );
              });
            }
          }, 5000);

        } else {
          btn.classList.add("wrong");
          // Nach 1,1 s Feedback & Button entfernen, andere Optionen erscheinen wieder
          setTimeout(() => {
            feedback.remove();
            btn.style.display = "none";
            btnBox.querySelectorAll("button").forEach((b, idx) => {
              if (b !== btn) {
                b.style.display = "";
                b.disabled = false;
              }
            });
            solved = false;
          }, 1100);
        }
      });
    };
    btnBox.appendChild(btn);
  });
  container.appendChild(btnBox);
}

  showQuestion();
}


// HINWEIS: Diese Funktion ersetzt deinen bisherigen renderMemorySession!
function renderMemoryField(s, idx, container) {
  // Aufräumen
  container.innerHTML = "";
  clearTimeouts();
  stopAllSounds();

  // Musik abspielen (wenn im JSON)
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

  // Memory-Grid Setup
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

  // Karten mischen (Fisher-Yates)
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }

  // Grid-Container
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

  // Karten-Logik
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

    // Vorder- und Rückseite
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

    // Flip-Logik
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
        window.location.href = "choose.html";
      }
    }
  );
});
            }
          } else {
            // zurückdrehen
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



function renderSequenceSession(s, idx, container) {
  clearTimeouts();
  stopAllSounds();
  container.innerHTML = "";

  // Musik vorbereiten (startet nach Video)
  let bgMusic = null;
  if (s.music) {
    bgMusic = new Audio("audio/" + s.music);
    bgMusic.loop = true;
    bgMusic.volume = 0.2;
  }

  const questions = Array.isArray(s.questions) ? s.questions : [];
  let qIdx = 0;

  function showQuestion() {
    container.innerHTML = "";
    const q = questions[qIdx];
    let userSequence = [];
    let showingSequence = true;
    let allowRepeat = q.repeatable || false;

    // Titel
    if (q.question) {
      const qDiv = document.createElement('div');
      qDiv.className = "quiz-question";
      qDiv.textContent = q.question;
      container.appendChild(qDiv);
    }

    // Sequenzanzeige
    const seqContainer = document.createElement('div');
    seqContainer.className = "sequence-container";
    seqContainer.style.display = "flex";
    seqContainer.style.justifyContent = "center";
    seqContainer.style.gap = "10px";
    container.appendChild(seqContainer);

    q.sequence.forEach(color => {
      const box = document.createElement('div');
      box.className = "sequence-box";
      box.style.width = "60px";
      box.style.height = "60px";
      box.style.borderRadius = "10px";
      box.style.background = color;
      seqContainer.appendChild(box);
    });

    // Nach showDuration: ausblenden
    setTimeout(() => {
      seqContainer.querySelectorAll(".sequence-box").forEach(box => box.style.background = "#ccc");
      showingSequence = false;
    }, q.showDuration || 5000);

    // Wiederholbutton
    if (allowRepeat) {
      const repeatBtn = document.createElement('button');
      repeatBtn.textContent = "🔁 Repeat";
      repeatBtn.className = "animal-listen-btn";
      repeatBtn.onclick = () => {
        if (showingSequence) return;
        showingSequence = true;
        let i = 0;
        seqContainer.querySelectorAll(".sequence-box").forEach((box, idx) => {
          box.style.background = q.sequence[idx];
        });
        setTimeout(() => {
          seqContainer.querySelectorAll(".sequence-box").forEach(box => box.style.background = "#ccc");
          showingSequence = false;
        }, q.showDuration || 5000);
      };
      container.appendChild(repeatBtn);
    }

    // Antwortfelder
    const btnBox = document.createElement('div');
    btnBox.className = "quiz-buttons";
    container.appendChild(btnBox);

    q.choices.forEach((choice, i) => {
      const btn = document.createElement('button');
      btn.textContent = choice;
      btn.className = "quiz-choice-btn";
      btn.onclick = () => {
        if (showingSequence) return;
        userSequence.push(i);
        btn.classList.add("selected");
        if (userSequence.length === q.correct.length) checkAnswer();
      };
      btnBox.appendChild(btn);
    });

    // Check
    function checkAnswer() {
      const spinner = document.createElement('div');
      spinner.className = "wait-spinner";
      container.appendChild(spinner);

      setTimeout(() => {
        spinner.remove();
        const isCorrect = JSON.stringify(userSequence) === JSON.stringify(q.correct);
        const feedbackDiv = document.createElement("div");
        feedbackDiv.className = "quiz-feedback";
        feedbackDiv.innerText = isCorrect ? (q.feedbackCorrect || "Great job!") : (q.feedbackWrong || "Try again!");
        feedbackDiv.style.color = isCorrect ? "#219821" : "#c82121";
        container.appendChild(feedbackDiv);

        playSound(isCorrect ? (q.correctSound || "yay.mp3") : (q.wrongSound || "fail.mp3"));
        runAnimations(isCorrect ? (q.correctAnimation || ["confetti-glow"]) : (q.wrongAnimation || ["shake"]));
        if (s.avatar) playAvatarAnimation(s.avatar, isCorrect ? "tada" : "wiggle");

        if (isCorrect) {
          setTimeout(() => {
            qIdx++;
            if (qIdx < questions.length) showQuestion();
            else {
              if (bgMusic) bgMusic.pause();
              tryShowNextButtonOrWait(() => {
                showUniversalReward(s, () => {
                  if (currentSession < sessions.length - 1) {
                    currentSession++;
                    renderSession(currentSession);
                  } else {
                    window.location.href = "choose.html";
                  }
                });
              });
            }
          }, 2000);
        } else {
          // Richtige Reihenfolge zeigen
          seqContainer.querySelectorAll(".sequence-box").forEach((box, idx) => {
            box.style.background = q.sequence[idx];
          });
          setTimeout(() => {
            seqContainer.querySelectorAll(".sequence-box").forEach(box => box.style.background = "#ccc");
            userSequence = [];
            btnBox.querySelectorAll("button").forEach(b => b.classList.remove("selected"));
            feedbackDiv.remove();
          }, q.revealDuration || 3000);
        }
      }, 1000);
    }
  }

  // Starte mit Frage 1
  showQuestion();

  // Starte Musik nach Video-Ende
  const video = document.querySelector('.floating-video video');
  if (video) {
    video.addEventListener('ended', () => {
      if (bgMusic) bgMusic.play();
    });
  } else {
    if (bgMusic) bgMusic.play();
  }
}






function runAnimations(anims) {
  anims.forEach(anim => {
    if (anim === "confetti-glow") runAnimation_confettiGlow();
    if (anim === "emoji-party") runAnimation_emojiParty();
    if (anim === "sparkle") runAnimation_sparkle();
    if (anim === "shake") runAnimation_shake();
    // Füge weitere Animationen hinzu, wie du sie brauchst
  });
}

function runAnimation_confettiGlow() {
  // Einfache Konfetti-Animation (Demo!)
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
  // Holt das Avatar-Bild aus dem Floating-Video-Container
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

function showAnswerFeedback(container, text, color = "#219821", duration = 3000, callback = null) {
  // Alte Feedbacks entfernen
  container.querySelectorAll('.quiz-feedback').forEach(fb => fb.remove());
  const feedback = document.createElement("div");
  feedback.className = "quiz-feedback";
  feedback.innerText = text;
  feedback.style.color = color;
  feedback.style.marginTop = "12px";

  // Spinner
  const spinner = document.createElement('div');
  spinner.className = "wait-spinner";
  feedback.appendChild(spinner);

  container.appendChild(feedback);

  setTimeout(() => {
    feedback.remove();
    if (typeof callback === "function") callback();
  }, duration);
}

function showUniversalSpinner(container, ms = 3000, text = "Checking…", cb = null) {
  console.log('spinner!')
  // Entfernt alte Spinner
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
  // Einmaliges CSS
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





// Firebase
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
const auth = getAuth();
const db = getFirestore();

// Elemente
const setupOverlay = document.getElementById('setupOverlay');
const letsStartBtn = document.getElementById('letsStartBtn');

// Nach Elternvideo: Button öffnet Overlay statt direkte Weiterleitung
letsStartBtn.onclick = () => {
  setupOverlay.classList.remove('hidden');
};

// Registrierung/Login
document.getElementById('loginBtn').onclick = async () => {
  const email = document.getElementById('parentEmail').value;
  const password = document.getElementById('parentPassword').value;
  try {
    let user;
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      user = cred.user;
    } catch {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      user = cred.user;
      // Neue Accounts: 7-Tage-Test setzen
      await setDoc(doc(db, "users", user.uid), { subscriptionStatus: "trial", trialEnds: Date.now() + 7*24*60*60*1000 });
    }
    alert("Login successful!");
  } catch (e) {
    alert("Error: " + e.message);
  }
};

// Kind speichern & Weiterleiten
document.getElementById('saveChildBtn').onclick = async () => {
  const name = document.getElementById('childName').value;
  const user = auth.currentUser;
  if (!user) return alert("Please login first!");
  if (!name) return alert("Please enter your child's name!");
  await setDoc(doc(db, "users", user.uid, "children", "child1"), { name: name, progress: {}, stickers: [] });
  window.location.href = 'choose.html';
};