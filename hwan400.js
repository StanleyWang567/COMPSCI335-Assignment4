"use strict";

const endpoints = [""];
let currentUser = null;

// Get the modal
var modal = document.getElementById("myModal");

// Get the <span> element that closes the modal
var span = document.getElementsByClassName("close")[0];

// When the user clicks on <span> (x), close the modal
span.onclick = function () {
  modal.style.display = "none";
};

// When the user clicks anywhere outside of the modal, close it
window.onclick = function (event) {
  if (event.target == modal) {
    modal.style.display = "none";
  }
};

async function renderAllSigns() {
  const response = await fetch("http://localhost:5000/api/allSigns");
  const signs = await response.json();

  renderSigns(signs);
}

async function renderSigns(signs) {
  const container = document.getElementById("signs-container");
  let images = [];

  for (const sign of signs) {
    const response = await fetch(
      `http://localhost:5000/api/SignImage/${sign.id}`,
    );
    const imageText = await response.text();
    images.push(imageText);
  }

  container.innerHTML = signs
    .map(
      (sign, index) =>
        `
    <div class="flex-box">
            <div class="" style="font-weight: bold; font-size: large; overflow-wrap: break-word;">
              ${sign.meaning}
            </div>
            <div class="signImageContainer">
              ${images[index]}
            </div>
            

            <div class="">
              ${sign.description}
            </div>
          </div>
    `,
    )
    .join("");
}

function formatICalDate(str) {
  if (!str) return "N/A";
  // Parse YYYYMMDDTHHMMSSZ format
  const year = str.substring(0, 4);
  const month = str.substring(4, 6);
  const day = str.substring(6, 8);
  const hour = str.substring(9, 11);
  const min = str.substring(11, 13);

  const dateObj = new Date(Date.UTC(year, month - 1, day, hour, min));
  return dateObj.toLocaleString([], {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function renderEvents(events) {
  const container = document.getElementById("events-container");

  container.innerHTML = events
    .map(
      (item, index) =>
        `
    <div class="flex-box">
            <div class="" style="font-weight: bold; font-size: large">
              ${item.SUMMARY}
            </div>

            <div class="">
              ${item.DESCRIPTION}
            </div>

            <div class="">
              Location: ${item.LOCATION}
            </div>

            <div class="">
              Start time: ${formatICalDate(item.DTSTART)}
            </div>

            <div class="">
              End time: ${formatICalDate(item.DTEND)}
            </div>

            <a href="http://localhost:5000/api/Event/${index}"> Add to Calendar </a>
          </div>
    `,
    )
    .join("");
}

async function fetchEvents() {
  const response = await fetch("http://localhost:5000/api/EventCount");
  const text = await response.text();

  if (!text) {
    document.getElementById("eventStatus").innerText =
      "Unable to fetch event count!";
    document.getElementById("eventStatus").style.color = "red";
    return;
  }

  const count = parseInt(text, 10);
  const eventData = [];

  for (let i = 0; i < count; i++) {
    const currentEvent = {};
    const response = await fetch(`http://localhost:5000/api/Event/${i}`);
    const text = await response.text();
    if (!text) {
      document.getElementById("eventStatus").innerText =
        "No event exists with index: ";
      continue;
    }
    const lines = text.split(/\r?\n/);

    for (const line of lines) {
      // Find the first colon that separates KEY and VALUE
      const colonIndex = line.indexOf(":");
      if (colonIndex !== -1) {
        const key = line.substring(0, colonIndex).trim();
        const value = line.substring(colonIndex + 1).trim();
        currentEvent[key] = value;
      }
    }

    eventData.push(currentEvent);
  }

  renderEvents(eventData);
}

async function renderSpecificSigns(text) {
  const response = await fetch(`http://localhost:5000/api/Signs/${text}`);
  const signs = await response.json();

  renderSigns(signs);
}

async function handleRegister() {
  const address = "";
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  if (!username || !password) {
    document.getElementById("registerStatus").innerText =
      "Please fill in both fields.";
    document.getElementById("registerStatus").style.color = "red";
    return;
  }

  document.getElementById("registerStatus").style.color = "red";

  const payload = {
    username: username,
    password: password,
    address: address,
  };

  try {
    const response = await fetch("http://localhost:5000/api/Register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      document.getElementById("registerStatus").innerText =
        "Registration not successful!";
      throw new Error(`Server returned status: ${response.status}`);
    }

    const result = await response.text();

    if (result.includes("registered")) {
      document.getElementById("registerStatus").style.color = "green";
    } else {
      document.getElementById("registerStatus").style.color = "red";
    }

    document.getElementById("registerStatus").innerText = result;
  } catch (error) {
    console.log("Error registering new account: ", error);
    document.getElementById("registerStatus").innerText =
      "Registration failed! Eorr:" + error;
    document.getElementById("registerStatus").style.color = "red";
  }
}

async function handleComment() {
  const comment = document.getElementById("comment").value;

  if (!currentUser) {
    document.getElementById("logoutButton").style.display = "none";
    document.getElementById("loginStatus").innerText =
      "Please log in to leave a comment.";
    document.getElementById("loginStatus").style.color = "red";
    modal.style.display = "block";
    return;
  }

  if (!comment) {
    document.getElementById("commentStatus").innerText =
      "Please write a comment first.";
    document.getElementById("commentStatus").style.color = "red";
    return;
  }

  try {
    const response = await fetch(
      `http://localhost:5000/api/Comment?comment=${encodeURIComponent(comment)}`,
      {
        method: "POST",
        headers: {
          Authorization: currentUser.authHeader,
        },
      },
    );

    if (!response.ok) {
      document.getElementById("commentStatus").innerText =
        "Comment not successful!";
      throw new Error(`Server returned status: ${response.status}`);
    }

    document.getElementById("commentStatus").innerText =
      "Comment added successfully.";
    document.getElementById("commentStatus").style.color = "green";
    const iframe = document.getElementById("commentsIframe"); // ensure ID matches your <iframe>
    if (iframe) {
      iframe.src = iframe.src;
    }
    document.getElementById("comment").value = "";
  } catch (error) {
    console.log("Error commenting new account: ", error);
    document.getElementById("commentStatus").innerText =
      "Comment failed! Eorr:" + error;
    document.getElementById("commentStatus").style.color = "red";
  }
}

async function handleLogin() {
  const username = document.getElementById("loginUsername").value;
  const password = document.getElementById("loginPassword").value;

  const credentials = btoa(`${username}:${password}`);

  try {
    const response = await fetch("http://localhost:5000/api/TestAuth", {
      method: "GET",
      headers: {
        Authorization: `Basic ${credentials}`,
      },
    });

    if (!response.ok) {
      document.getElementById("loginStatus").innerText =
        "login not successful!";
      throw new Error(`Server returned status: ${response.status}`);
    }
    currentUser = {
      username: username,
      authHeader: `Basic ${credentials}`,
    };

    document.getElementById("loginStatus").innerText = await response.text();
    document.getElementById("loginStatus").style.color = "green";
    document.getElementById("logoutButton").style.display = "block";

    setTimeout(() => {
      modal.style.display = "none";
    }, 500);
  } catch (error) {
    document.getElementById("loginStatus").innerText =
      "login failed! Eorr:" + error;
    document.getElementById("loginStatus").style.color = "red";
  }
}

async function handleLogout() {
  currentUser = null;
  document.getElementById("commentStatus").innerText = "You have logged out.";
  document.getElementById("commentStatus").style.color = "red";
  document.getElementById("logoutButton").style.display = "none";
}

async function fetchPlot() {
  const response = await fetch("http://localhost:5000/api/Log");
  const logs = await response.json();

  renderPlots(logs);
}

async function renderPlots(data) {
  const container = document.getElementById("plot-container");

  // 1. Calculate dynamic data ranges
  const practiceMinutes = data.map((d) => d.practiceMinutes);
  const quizScores = data.map((d) => d.quizScore);

  const xMin = 0;
  const xMax = Math.max(...practiceMinutes, 400); // Dynamic max (at least 400)
  const yMin = 0;
  const yMax = Math.max(...quizScores, 100); // Dynamic max (at least 100)

  // 2. Pixel boundaries inside SVG graph area
  const plotLeft = 50;
  const plotRight = 450;
  const plotWidth = plotRight - plotLeft; // 400px wide area

  const plotTop = 15;
  const plotBottom = 85;
  const plotHeight = plotBottom - plotTop; // 70px tall area

  // 3. Proportional mapping of points
  const circlesHtml = data
    .map((item) => {
      // Map PracticeMinutes (0 to xMax) -> (50 to 450)
      const cx =
        plotLeft + ((item.practiceMinutes - xMin) / (xMax - xMin)) * plotWidth;

      // Map QuizScore (0 to yMax) -> (85 down to 15)
      const cy =
        plotBottom - ((item.quizScore - yMin) / (yMax - yMin)) * plotHeight;

      return `<circle cx="${cx}" cy="${cy}" r="2" fill="red" class="circle"></circle>`;
    })
    .join("");

  // 4. Render complete SVG with Axes, Ticks, Labels & Raw Data
  container.innerHTML = `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 500 120"
      style="max-width: 900px; display: block; margin: 0 auto; height: auto"
    >
      <!-- X-AXIS LINE -->
      <line x1="${plotLeft}" y1="${plotBottom}" x2="${plotRight}" y2="${plotBottom}" stroke="black" stroke-width="0.5" />

      <!-- X-AXIS TICKS & LABELS -->
      <line x1="50" y1="85" x2="50" y2="88" stroke="black" stroke-width="0.5" />
      <line x1="150" y1="85" x2="150" y2="88" stroke="black" stroke-width="0.5" />
      <line x1="250" y1="85" x2="250" y2="88" stroke="black" stroke-width="0.5" />
      <line x1="350" y1="85" x2="350" y2="88" stroke="black" stroke-width="0.5" />
      <line x1="450" y1="85" x2="450" y2="88" stroke="black" stroke-width="0.5" />

      <text x="50" y="96" font-size="5" font-weight="bold" text-anchor="middle">0</text>
      <text x="150" y="96" font-size="5" font-weight="bold" text-anchor="middle">100</text>
      <text x="250" y="96" font-size="5" font-weight="bold" text-anchor="middle">200</text>
      <text x="350" y="96" font-size="5" font-weight="bold" text-anchor="middle">300</text>
      <text x="450" y="96" font-size="5" font-weight="bold" text-anchor="middle">400</text>
      <text x="250" y="108" font-size="5" font-weight="bold" text-anchor="middle">Practice Time (Minutes)</text>

      <!-- Y-AXIS LINE -->
      <line x1="${plotLeft}" y1="${plotTop}" x2="${plotLeft}" y2="${plotBottom}" stroke="black" stroke-width="0.5" />

      <!-- Y-AXIS TICKS & LABELS -->
      <line x1="47" y1="85" x2="50" y2="85" stroke="black" stroke-width="0.5" />
      <line x1="47" y1="67.5" x2="50" y2="67.5" stroke="black" stroke-width="0.5" />
      <line x1="47" y1="50" x2="50" y2="50" stroke="black" stroke-width="0.5" />
      <line x1="47" y1="32.5" x2="50" y2="32.5" stroke="black" stroke-width="0.5" />
      <line x1="47" y1="15" x2="50" y2="15" stroke="black" stroke-width="0.5" />

      <text x="44" y="85" font-size="5" font-weight="bold" text-anchor="end" dominant-baseline="central">0</text>
      <text x="44" y="67.5" font-size="5" font-weight="bold" text-anchor="end" dominant-baseline="central">25</text>
      <text x="44" y="50" font-size="5" font-weight="bold" text-anchor="end" dominant-baseline="central">50</text>
      <text x="44" y="32.5" font-size="5" font-weight="bold" text-anchor="end" dominant-baseline="central">75</text>
      <text x="44" y="15" font-size="5" font-weight="bold" text-anchor="end" dominant-baseline="central">100</text>

      <!-- Y-AXIS TITLE -->
      <text x="22" y="50" font-size="5" font-weight="bold" text-anchor="middle">Score</text>

      ${circlesHtml}
    </svg>

    <h4 style="margin-top: 15px; margin-bottom: 5px;">Raw Data</h4>
    <pre style="max-height: 150px; overflow-y: auto; background: #f4f4f4; padding: 10px; border-radius: 6px; border: 1px solid #ccc; font-size: 12px;">${JSON.stringify(data, null, 2)}</pre>`;
}

async function renderFooter() {
  const response = await fetch("http://localhost:5000/api/Version");
  const text = await response.text();

  document.querySelector("footer").innerHTML = `
  <div style="color: white">Stanley Wang | 610639735 | Version: ${text}</div>`;
}

function setActiveNav(clickedElement) {
  document.querySelectorAll(".navbar-link").forEach((link) => {
    link.classList.remove("active-button");
  });
  clickedElement.classList.add("active-button");
}

async function handleNavigation() {
  setActiveNav(document.getElementById("navbar-about"));
  document.getElementById("signs").style.display = "none";
  document.getElementById("register").style.display = "none";
  document.getElementById("events").style.display = "none";
  document.getElementById("guestbook").style.display = "none";
  document.getElementById("plots").style.display = "none";

  document.getElementById("navbar-signs").addEventListener("click", (e) => {
    document.getElementById("signs").style.display = "block";
    document.getElementById("register").style.display = "none";
    document.getElementById("events").style.display = "none";
    document.getElementById("guestbook").style.display = "none";
    document.getElementById("plots").style.display = "none";
    document.getElementById("about").style.display = "none";
    setActiveNav(e.currentTarget);
  });

  document.getElementById("navbar-register").addEventListener("click", (e) => {
    document.getElementById("signs").style.display = "none";
    document.getElementById("register").style.display = "block";
    document.getElementById("events").style.display = "none";
    document.getElementById("guestbook").style.display = "none";
    document.getElementById("plots").style.display = "none";
    document.getElementById("about").style.display = "none";
    setActiveNav(e.currentTarget);
  });

  document.getElementById("navbar-guestbook").addEventListener("click", (e) => {
    document.getElementById("signs").style.display = "none";
    document.getElementById("register").style.display = "none";
    document.getElementById("events").style.display = "none";
    document.getElementById("guestbook").style.display = "block";
    document.getElementById("plots").style.display = "none";
    document.getElementById("about").style.display = "none";
    setActiveNav(e.currentTarget);
  });

  document.getElementById("navbar-plots").addEventListener("click", (e) => {
    document.getElementById("signs").style.display = "none";
    document.getElementById("register").style.display = "none";
    document.getElementById("events").style.display = "none";
    document.getElementById("guestbook").style.display = "none";
    document.getElementById("plots").style.display = "block";
    document.getElementById("about").style.display = "none";
    setActiveNav(e.currentTarget);
  });

  document.getElementById("navbar-events").addEventListener("click", (e) => {
    document.getElementById("signs").style.display = "none";
    document.getElementById("register").style.display = "none";
    document.getElementById("events").style.display = "block";
    document.getElementById("guestbook").style.display = "none";
    document.getElementById("plots").style.display = "none";
    document.getElementById("about").style.display = "none";
    setActiveNav(e.currentTarget);
  });

  document.getElementById("navbar-about").addEventListener("click", (e) => {
    document.getElementById("signs").style.display = "none";
    document.getElementById("register").style.display = "none";
    document.getElementById("events").style.display = "none";
    document.getElementById("guestbook").style.display = "none";
    document.getElementById("plots").style.display = "none";
    document.getElementById("about").style.display = "block";
    setActiveNav(e.currentTarget);
  });
}

function init() {
  renderAllSigns();
  fetchEvents();
  fetchPlot();
  renderFooter();
  document
    .getElementById("registerButton")
    .addEventListener("click", handleRegister);

  document
    .getElementById("commentButton")
    .addEventListener("click", handleComment);

  document.getElementById("loginButton").addEventListener("click", handleLogin);

  document
    .getElementById("logoutButton")
    .addEventListener("click", handleLogout);

  document.getElementById("logoutButton").style.display = "none";
  document.getElementById("signInput").addEventListener("input", (event) => {
    const text = event.target.value;
    if (!text || text.length === 0) {
      renderAllSigns();
    } else {
      renderSpecificSigns(text);
    }
  });

  handleNavigation();
}

init();
