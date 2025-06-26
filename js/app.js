const container = document.getElementById('session-container');
const nextBtn = document.getElementById('next-btn');
const fill = document.getElementById('fill');
let day = localStorage.getItem('currentDay') || 1;
let sessions = [], idx = 0;

// Load the day's sessions from JSON
fetch(`days/day${day}.json`)
  .then(response => response.json())
  .then(data => { sessions = data.sessions; showSession(0); });

// Display session at index i
function showSession(i) {
  if (i >= sessions.length) return;
  idx = i;
  container.innerHTML = '';
  nextBtn.classList.add('hidden');

  const session = sessions[i];

  // Display text or question
  const textEl = document.createElement('div');
  textEl.className = 'text';
  textEl.textContent = session.text || session.question;
  container.appendChild(textEl);

  // Insert video if available
  if (session.video) {
    const videoEl = document.createElement('video');
    videoEl.src = session.video;
    videoEl.controls = true;
    videoEl.autoplay = false;
    videoEl.className = 'video';
    container.appendChild(videoEl);
  }

  // Add option buttons for quiz or rhyme
  if (session.options) {
    session.options.forEach(option => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.textContent = option;
      btn.addEventListener('click', () => handleAnswer(option, session.correct));
      container.appendChild(btn);
    });
    return;
  }

  // Show Next button after duration
  setTimeout(() => nextBtn.classList.remove('hidden'), (session.duration || 5) * 1000);
  nextBtn.onclick = () => { updateProgress(); showSession(i + 1); };
}

// Handle answer selection
function handleAnswer(selected, correct) {
  if (selected === correct) {
    alert('Great job! 🎉');
    updateProgress();
    showSession(idx + 1);
  } else {
    alert('Try again!');
  }
}

// Update progress bar
function updateProgress() {
  const percent = ((idx + 1) / sessions.length) * 100;
  fill.style.width = percent + '%';
}