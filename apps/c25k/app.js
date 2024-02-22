var week = 1;
var day = 1;
var time;

var loop; // To store how many times we will have to do a countdown
var rep; // The current rep counter
var counter; // The seconds counter
var currentMode; // Either "run" or "walk"
var mainInterval; // Ticks every second, checking if a new countdown is needed
var activityInterval; // Ticks every second, doing the countdown
var extraInfoWatch; // Watch for button presses to show additional info
var paused = false; // Track pause state
var pauseOrResumeWatch; // Watch for button presses to pause/resume countdown
var defaultFontSize = (process.env.HWVERSION == 2) ? 7 : 8; // Default font size, Banglejs 2 has smaller
var activityBgColour; // Background colour of current activity

function outOfTime() {
  buzz();

  // Once we're done
  if (loop == 0) {
    clearWatch(extraInfoWatch); // Don't watch for button presses anymore
    if (pauseOrResumeWatch) clearWatch(pauseOrResumeWatch); // Don't watch for button presses anymore
    g.setBgColor("#75C0E0"); // Blue background for the "Done" text
    drawText("Done", defaultFontSize); // Write "Done" to screen
    g.reset();
    setTimeout(E.showMenu, 5000, mainmenu); // Show the main menu again after 5secs
    clearInterval(mainInterval); // Stop the main interval from starting a new activity
    mainInterval = undefined;
  }
}

// Buzz 3 times on state transitions
function buzz() {
  Bangle.buzz(500)
  .then(() => new Promise(resolve => setTimeout(resolve, 200)))
  .then(() => Bangle.buzz(500))
  .then(() => new Promise(resolve => setTimeout(resolve, 200)))
  .then(() => Bangle.buzz(500));
}

function drawText(text, size){
  g.clear();
  g.setFontAlign(0, 0); // center font
  g.setFont("6x8", size);
  g.drawString(text, g.getWidth() / 2, g.getHeight() / 2);
}

function countDown() {
  if (!paused) {
    var text = "";
    var size = defaultFontSize;
    if (time) {
      var w = week -1;
      var d = day - 1;
      var total = ("walk" in PLAN[w][d]) ? PLAN[w][d].repetition : 1;
      text += rep + "/" + total + "\n"; // Show the current/total rep count when time is shown
      size -= (process.env.HWVERSION == 2) ? 2 : 1; // Use smaller font size to fit everything nicely on the screen
    }
    text += (currentMode === "run") ? "Run\n" + counter : "Walk\n" + counter; // Switches output text
    if (time) text += "\n" + time;
    drawText(text, size); // draw the current mode and seconds
    Bangle.setLCDPower(1); // keep the watch LCD lit up

    counter--; // Reduce the seconds

    // If the current activity is done
    if (counter < 0) {
      clearInterval(activityInterval);
      activityInterval = undefined;
      outOfTime();
      return;
    }
  }
}

function startTimer(w, d) {
  // If something is already running, do nothing
  if (activityInterval) return;

  // Switches between the two modes
  if (!currentMode || currentMode === "walk") {
    currentMode = "run";
    rep++; // Increase the rep counter every time a "run" activity starts
    counter = PLAN[w][d].run * 60;
    activityBgColour = "#ff5733"; // Red background for running
  }
  else {
    currentMode = "walk";
    counter = PLAN[w][d].walk * 60;
    activityBgColour = "#4da80a"; // Green background for walking

  }

  g.setBgColor(activityBgColour);
  countDown();
  if (!activityInterval) {
    loop--; // Reduce the number of iterations
    activityInterval = setInterval(countDown, 1000); // Start a new activity
  }
}

function showTime() {
  if (time) return; // If clock is already shown, don't do anything even if the button was pressed again
  // Get the time and format it with a leading 0 if necessary
  var d = new Date();
  var h = d.getHours();
  var m = d.getMinutes();
  time = h + ":" + m.toString().padStart(2, 0);
  setTimeout(function() { time = undefined; }, 5000); // Hide clock after 5secs
}

// Populate the PLAN menu
function populatePlan() {
  for (var i = 0; i < PLAN.length; i++) {
    for (var j = 0; j < PLAN[i].length; j++) {
      // Ever line will have the following format:
      // w{week}d{day}(r:{run mins}|w:{walk mins}|x{number of reps})
      var name = "w" + (i + 1) + "d" + (j + 1);
      if (process.env.HWVERSION == 2) name += "\n"; // Print in 2 lines to accomodate the Bangle.js 2 screen
      name += "(r:" + PLAN[i][j].run;
      if ("walk" in PLAN[i][j]) name += "|w:" + PLAN[i][j].walk;
      if ("repetition" in PLAN[i][j]) name += "|x" + PLAN[i][j].repetition;
      name += ")";
      // Each menu item will have a function that start the program at the selected day
      planmenu[name] = getFunc(i, j);
    }
  }
}

// Helper function to generate functions for the PLAN menu
function getFunc(i, j) {
  return function() {
    week = i + 1;
    day = j + 1;
    startActivity();
  };
}

function startActivity() {
  var w = week - 1;
  var d = day - 1;

  loop = ("walk" in PLAN[w][d]) ? PLAN[w][d].repetition * 2 : 1;
  rep = 0;

  E.showMenu(); // Hide the main menu
  extraInfoWatch = setWatch(showTime, (process.env.HWVERSION == 2) ? BTN1 : BTN2, {repeat: true}); // Show the clock on button press
  if (process.env.HWVERSION == 1) pauseOrResumeWatch = setWatch(pauseOrResumeActivity, BTN1, {repeat: true}); // Pause or resume on button press (Bangle.js 1 only)
  buzz();
  mainInterval = setInterval(function() {startTimer(w, d);}, 1000); // Check every second if we need to do something
}

// Pause or resume current activity
function pauseOrResumeActivity() {
  paused = !paused;
  buzz();
  if (paused) {
    g.setBgColor("#fdd835"); // Yellow background for pause screen
    drawText("Paused", (process.env.HWVERSION == 2) ? defaultFontSize - 3 : defaultFontSize - 2); // Although the font size is configured here, this feature does not work on Bangle.js 2 as the only physical button is tied to the extra info screen already
  }
  else {
    g.setBgColor(activityBgColour);
  }
}

const PLAN = [
  [
    {"run": 1, "walk": 1.5, "repetition": 8},
    {"run": 1, "walk": 1.5, "repetition": 8},
    {"run": 1, "walk": 1.5, "repetition": 8},
  ],
  [
    {"run": 1.5, "walk": 2, "repetition": 6},
    {"run": 1.5, "walk": 2, "repetition": 6},
    {"run": 1.5, "walk": 2, "repetition": 6},
  ],
  [
    {"run": 2, "walk": 2, "repetition": 5},
    {"run": 2.5, "walk": 2.5, "repetition": 4},
    {"run": 2.5, "walk": 2.5, "repetition": 4},
  ],
  [
    {"run": 3, "walk": 2, "repetition": 5},
    {"run": 3, "walk": 2, "repetition": 5},
    {"run": 4, "walk": 2.5, "repetition": 3},
  ],
  [
    {"run": 5, "walk": 2, "repetition": 3},
    {"run": 8, "walk": 5, "repetition": 2},
    {"run": 20},
  ],
  [
    {"run": 6, "walk": 3, "repetition": 2},
    {"run": 10, "walk": 3, "repetition": 2},
    {"run": 25},
  ],
  [
    {"run": 25},
    {"run": 25},
    {"run": 25},
  ],
  [
    {"run": 30},
    {"run": 30},
    {"run": 30},
  ],
];

// Main menu
var mainmenu = {
  "" : {
    "title" : "-- C25K --"
  },
  "Week" : {
    value : week,
    min:1,max:PLAN.length,step:1,
    onchange : v => { week = v; }
  },
  "Day" : {
    value : day,
    min:1,max:3,step:1,
    onchange : v => { day = v; }
  },
  "View plan" : function() { E.showMenu(planmenu); },
  "Start" : function() { startActivity(); },
  "Exit" : function() { load(); },
};

// Plan view
var planmenu = {
  "" : {
    title : "-- Plan --",
    back : function() { E.showMenu(mainmenu);},
  }
};

// Populate the PLAN menu view
populatePlan();
// Actually display the menu
E.showMenu(mainmenu);
