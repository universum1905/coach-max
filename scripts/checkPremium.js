// checkPremium.js
const paidStart = 8;
const currentDay = parseInt(window.location.pathname.match(/day(\d+)\.html/)?.[1]);

if (currentDay >= paidStart) {
  const hasPremium = localStorage.getItem("hasPremium") === "true";
  if (!hasPremium) {
    document.body.innerHTML = `
      <div class="text-center p-10 text-xl text-gray-700">
        <h2 class="text-3xl font-bold mb-4">🔒 Premium Required</h2>
        <p class="mb-4">This day is part of the premium plan. Please subscribe to unlock Day ${currentDay} and beyond.</p>
        <a href="subscribe.html" class="bg-blue-500 text-white px-6 py-2 rounded-full inline-block">🔓 Unlock Premium</a>
      </div>`;
  }
}
