// js/app.js

const jsonURL = "days/day1.json";
let sessions = [];
let currentSession = 0;

window.onload = async () => {
  const res = await fetch(jsonURL);
  const data = await res.json();
  sessions = data.sessions;
  renderSession(currentSession);
  updateProgress();
};

function renderSession(idx) {
  const sc = document.getElementById('sessionContainer');
  sc.innerHTML = "";
  const s = sessions[idx];

  // Main session block
  const div = document.createElement('div');
  div.className = 'session-block';
  div.style.background = s.bgColor;

  // Avatar image
  const img = document.createElement('img');
  img.src = `images/${s.avatar}`;
  img.className = "avatar-img";
  img.alt = "Avatar";
  div.appendChild(img);

  // Video
  const vid = document.createElement('video');
  vid.src = `videos/${s.video}`;
  vid.controls = true;
  vid.className = "session-video";
  vid.poster = "images/video-placeholder.png";
  div.appendChild(vid);

  // Animated text
  const textDiv = document.createElement('div');
  textDiv.className = "session-text";
  animateTextLines(s.text, textDiv);
  div.appendChild(textDiv);

  // Next button
  const btn = document.createElement('button');
  btn.innerText = idx < sessions.length - 1 ? "Next" : "Finish";
  btn.className = "next-btn";
  btn.onclick = () => {
    if (currentSession < sessions.length - 1) {
      currentSession++;
      renderSession(currentSession);
      updateProgress();
    } else {
      finishDay();
    }
  };
  div.appendChild(btn);

  sc.appendChild(div);
}

function animateTextLines(lines, parent) {
  parent.innerHTML = "";
  let idx = 0;
  function showLine() {
    if (idx < lines.length) {
      const p = document.createElement('p');
      p.className = "animated-text";
      p.innerText = lines[idx];
      parent.appendChild(p);
      p.classList.add('glitter-animate');
      idx++;
      setTimeout(showLine, 1300);
    }
  }
  showLine();
}

function updateProgress() {
  const bar = document.getElementById('progressBar');
  bar.innerHTML = "";
  // Example: Frosch als Progress-Avatar
  const frog = document.createElement('img');
  frog.src = 'images/frog.png'; // Platziere frog.png im images/
  frog.style.width = '50px';
  frog.className = 'jump-animation';
  bar.appendChild(frog);

  // Optional: Fortschrittsbalken (kinderfreundlich)
  const pr = document.createElement('div');
  pr.className = "progress-track";
  pr.style.width = "140px";
  pr.style.height = "14px";
  pr.style.background = "#c8e6c9";
  pr.style.borderRadius = "7px";
  pr.style.display = "inline-block";
  pr.style.marginLeft = "12px";
  pr.style.verticalAlign = "middle";

  const fill = document.createElement('div');
  fill.style.height = "100%";
  fill.style.borderRadius = "7px";
  fill.style.background = "#81d4fa";
  fill.style.width = ((currentSession+1)/sessions.length*100) + "%";
  pr.appendChild(fill);
  bar.appendChild(pr);
}

function finishDay() {
  alert("Great job! You finished Day 1 🎉");
  // Sticker, Sound, Unlock logik etc. kann hier integriert werden
}
