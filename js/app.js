const container = document.getElementById('session-container');
const nextBtn = document.getElementById('next-btn');
const fill = document.getElementById('fill');
let day = localStorage.getItem('currentDay') || 1;
let sessions = [], idx = 0;

// Load the day's sessions from JSON
fetch(`days/day${day}.json`)
  .then(res => res.json())
  .then(data => { sessions = data.sessions; showSession(0); });

function showSession(i) {
  if (i >= sessions.length) return;
  idx = i;
  container.innerHTML = '';
  nextBtn.classList.add('hidden');

  const s = sessions[i];
  // Display text or question
  const txt = document.createElement('div');
  txt.className = 'text';
  txt.textContent = s.text || s.question;
  container.appendChild(txt);

  // Insert video if available
  if (s.video) {
    const vid = document.createElement('video');
    vid.src = s.video;
    vid.controls = true;
    vid.autoplay = false;
    vid.className = 'video';
    container.appendChild(vid);
  }

  // Options for quiz/rhyme
  if (s.options) {
    s.options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.textContent = opt;
      btn.onclick = () => handleAnswer(opt, s.correct);
      container.appendChild(btn);
    });
  }

  // Always show Next button after 1 second delay
  setTimeout(() => nextBtn.classList.remove('hidden'), 1000);
  nextBtn.onclick = () => { updateProgress(); showSession(i + 1); };
}

function handleAnswer(selected, correct) {
  if (selected === correct) {
    alert('Great job! 🎉');
    updateProgress();
    showSession(idx + 1);
  } else {
    alert('Try again!');
  }
}

function updateProgress() {
  const perc = ((idx + 1) / sessions.length) * 100;
  fill.style.width = perc + '%';
}
