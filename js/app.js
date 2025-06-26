const container = document.getElementById('session-container');
const nextBtn = document.getElementById('next-btn');
const fill = document.getElementById('fill');
let day = localStorage.getItem('currentDay') || 1;
let sessions = [];
let idx = 0;

fetch(`days/day${day}.json`).then(r=>r.json()).then(data=>{
  sessions = data.sessions;
  showSession(0);
});

function showSession(i) {
  if (i >= sessions.length) return;  
  idx = i;
  container.innerHTML = '';
  const s = sessions[i];
  // Text / Frage
  const div = document.createElement('div');
  div.className = 'text fadeIn';
  div.textContent = s.text || s.question;
  container.appendChild(div);
  // Video
  if (s.video) {
    const vid = document.createElement('video');
    vid.src = s.video;
    vid.controls = true;
    vid.autoplay = false;
    vid.className = 'video slideUp';
    vid.addEventListener('play', ()=> vid.volume=1);
    container.appendChild(vid);
  }
  // Auswahl bei Rhyme
  if (s.options) {
    s.options.forEach(opt=>{
      const btn = document.createElement('button');
      btn.textContent = opt;
      btn.onclick = ()=> handleAnswer(opt, s.correct);
      container.appendChild(btn);
    });
  }
  // Next-Button
  nextBtn.classList.remove('hidden');
  nextBtn.onclick = ()=> {
    updateProgress();
    showSession(i+1);
  };
}

function handleAnswer(sel, correct) {
  if (sel === correct) {
    alert('Correct!'); // Sticker freischalten
  } else alert('Try again!');
}

function updateProgress() {
  const perc = ((idx+1)/sessions.length)*100;
  fill.style.width = perc+'%';
}