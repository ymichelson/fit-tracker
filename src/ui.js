import {
  escapeHtml,
  formatDateShort,
  formatDateTime,
  formatDuration,
  formatLastTime,
  formatRecentWorkout
} from "./format.js";
import { formatTimer, getTimerStatus } from "./timer.js";

function renderThemeButton(theme) {
  return `
    <button class="theme-toggle" type="button" data-action="toggle-theme" aria-label="Toggle color mode">
      <span class="theme-toggle-track">
        <span class="theme-toggle-thumb ${theme === "light" ? "is-light" : "is-dark"}"></span>
      </span>
      <span class="theme-toggle-label">${theme === "light" ? "Light" : "Dark"}</span>
    </button>
  `;
}

function generateExtraCoachingNotes(exercise) {
  const notes = [
    `Match every set to the same setup so the reps feel repeatable under fatigue.`,
    `Use the ${exercise.rest} rest window to reset breathing and your start position before the next set.`,
    `Because this is prescribed at RPE ${exercise.rpe}, stop the set when bar speed or control noticeably drops.`
  ];

  if (/squat|deadlift|row|press|bench|thrust/i.test(exercise.name)) {
    notes.push("Brace before every rep and treat the first rep like a technical setup, not a rushed start.");
  }

  if (/curl|raise|extension|flye|abduction|curl/i.test(exercise.name)) {
    notes.push("Keep the tempo controlled and avoid using momentum to steal reps at the end of the set.");
  }

  return notes;
}

function renderSetWeightInputs(entry, setCount) {
  return `
    <div class="set-weight-grid">
      ${Array.from({ length: setCount }, (_, index) => {
        const value = entry.setWeights[index] || "";

        return `
          <label class="set-weight-card" for="set-weight-${index}">
            <span class="set-weight-label">Set ${index + 1}</span>
            <input
              id="set-weight-${index}"
              class="set-weight-input"
              type="text"
              inputmode="decimal"
              placeholder="Weight"
              value="${escapeHtml(value)}"
              data-set-weight-index="${index}"
            />
          </label>
        `;
      }).join("")}
    </div>
  `;
}

function renderDayButtons(month, selectedDayId) {
  return month.days
    .map(
      (day) => `
        <button
          class="choice-card${selectedDayId === day.id ? " is-selected" : ""}"
          data-action="select-day"
          data-day-id="${day.id}"
          type="button"
        >
          <span class="choice-eyebrow">${escapeHtml(day.subtitle)}</span>
          <span class="choice-title">${escapeHtml(day.title)}</span>
        </button>
      `
    )
    .join("");
}

function renderMonthSegments(months, selectedMonthId) {
  return months
    .map(
      (month) => `
        <button
          class="segment-button${selectedMonthId === month.id ? " is-selected" : ""}"
          data-action="select-month"
          data-month-id="${month.id}"
          type="button"
        >
          ${escapeHtml(month.label)}
        </button>
      `
    )
    .join("");
}

function renderRecentStrip(history) {
  const recent = history.length ? history[history.length - 1] : null;
  if (!recent) {
    return "";
  }

  return `
    <section class="glass-card recent-card">
      <div>
        <p class="micro-label">Most recent</p>
        <h3>${escapeHtml(formatRecentWorkout(recent))}</h3>
      </div>
      <span class="pill subtle">${recent.exercises.length} logged</span>
    </section>
  `;
}

function renderOverviewCards(day, history) {
  return day.exercises
    .map((exercise, index) => {
      let latest = null;

      for (let historyIndex = history.length - 1; historyIndex >= 0; historyIndex -= 1) {
        const session = history[historyIndex];
        const entries = Array.isArray(session.exercises) ? session.exercises : [];

        for (let entryIndex = 0; entryIndex < entries.length; entryIndex += 1) {
          const entry = entries[entryIndex];
          const isMatch =
            entry.exerciseId === exercise.id || entry.exerciseName === exercise.name;

          if (isMatch && entry.weightUsed) {
            latest = {
              weightUsed: entry.weightUsed,
              date: session.date
            };
            break;
          }
        }

        if (latest) {
          break;
        }
      }

      return `
        <button
          class="exercise-card"
          type="button"
          data-action="jump-to-exercise"
          data-index="${index}"
        >
          <div class="exercise-card-row">
            <div>
              <p class="micro-label">Exercise ${index + 1}</p>
              <h3>${escapeHtml(exercise.name)}</h3>
            </div>
            <span class="pill">${exercise.sets} x ${escapeHtml(exercise.reps)}</span>
          </div>
          <div class="exercise-meta-grid">
            <span>RPE ${escapeHtml(exercise.rpe)}</span>
            <span>${escapeHtml(exercise.rest)} rest</span>
            <span>${escapeHtml(formatLastTime(latest))}</span>
          </div>
        </button>
      `;
    })
    .join("");
}

function renderSetTracker(entry, setCount) {
  return `
    <div class="set-tracker" role="group" aria-label="Completed sets">
      ${Array.from({ length: setCount }, (_, index) => {
        const done = index < entry.completedSets;
        return `
          <button
            class="set-dot${done ? " is-done" : ""}"
            type="button"
            data-action="toggle-set"
            data-set-index="${index}"
            aria-pressed="${done}"
          >
            <span>${index + 1}</span>
          </button>
        `;
      }).join("")}
    </div>
  `;
}

export function renderApp({ state, months, workout, exercise, timerState }) {
  let screenMarkup = "";

  switch (state.currentScreen) {
    case "home":
      screenMarkup = renderHomeScreen({ state, months, workout });
      break;
    case "overview":
      screenMarkup = renderOverviewScreen({ state, workout });
      break;
    case "exercise":
      screenMarkup = renderExerciseScreen({ state, workout, exercise, timerState });
      break;
    case "summary":
      screenMarkup = renderSummaryScreen({ state, workout });
      break;
    default:
      screenMarkup = renderHomeScreen({ state, months, workout });
      break;
  }

  return `
    <main class="app-frame">
      <div class="utility-row">
        ${renderThemeButton(state.theme)}
      </div>
      <section class="screen screen-${state.currentScreen}">
        ${screenMarkup}
      </section>
    </main>
  `;
}

export function renderHomeScreen({ state, months, workout }) {
  const { month, day } = workout;
  return `
    <header class="glass-card hero-card hero-stack">
      <div class="hero-copy">
        <p class="micro-label">Workout tracker</p>
        <h1>Beautiful focus for every lift.</h1>
        <p class="hero-text">
          Your two-month gym plan, distilled into one calm, premium flow built for the gym floor.
        </p>
      </div>
      <div class="glance-row">
        <div class="glance-chip">
          <span class="glance-value">${escapeHtml(month.label)}</span>
          <span class="glance-label">${escapeHtml(month.description)}</span>
        </div>
        <div class="glance-chip">
          <span class="glance-value">4 days</span>
          <span class="glance-label">7 exercises each</span>
        </div>
      </div>
    </header>

    <section class="panel">
      <p class="micro-label">Select month</p>
      <div class="segment-control">
        ${renderMonthSegments(months, state.selectedMonthId)}
      </div>
    </section>

    <section class="panel">
      <div class="section-row">
        <div>
          <p class="micro-label">Workout day</p>
          <h2>Choose today’s session</h2>
        </div>
      </div>
      <div class="choice-grid">
        ${renderDayButtons(month, state.selectedDayId)}
      </div>
    </section>

    <section class="glass-card preview-card">
      <div class="section-row">
        <div>
          <p class="micro-label">Ready to train</p>
          <h2>${escapeHtml(day.title)}</h2>
          <p>${escapeHtml(day.subtitle)} • ${escapeHtml(month.label)}</p>
        </div>
        <span class="pill">${day.exercises.length} exercises</span>
      </div>
      <p class="preview-description">${escapeHtml(month.description)}</p>
      <div class="preview-rail">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <div class="preview-list">
        ${day.exercises
          .map((exercise, index) => `<span>${index + 1}. ${escapeHtml(exercise.name)}</span>`)
          .join("")}
      </div>
    </section>

    ${renderRecentStrip(state.history)}

    <div class="sticky-actions">
      <button class="button button-secondary" type="button" data-action="view-overview">
        View Workout
      </button>
      <button class="button button-primary" type="button" data-action="start-workout">
        Start Workout
      </button>
    </div>
  `;
}

export function renderOverviewScreen({ state, workout }) {
  const { month, day } = workout;
  return `
    <header class="top-bar">
      <button class="icon-button" type="button" data-action="go-home">Back</button>
      <div class="top-bar-copy">
        <p class="micro-label">${escapeHtml(month.label)} • ${escapeHtml(day.subtitle)}</p>
        <h1>${escapeHtml(day.title)}</h1>
      </div>
    </header>

    <section class="glass-card summary-hero">
      <p>${escapeHtml(month.description)}</p>
      <p class="summary-inline">${day.exercises.length} exercises • Tap any card to jump in</p>
    </section>

    <section class="exercise-list">
      ${renderOverviewCards(day, state.history)}
    </section>

    <div class="sticky-actions">
      <button class="button button-secondary" type="button" data-action="go-home">
        Home
      </button>
      <button class="button button-primary" type="button" data-action="start-workout">
        Start Workout Flow
      </button>
    </div>
  `;
}

export function renderExerciseScreen({ state, workout, exercise, timerState }) {
  const entry = state.activeWorkoutDraft.exerciseEntries[state.currentExerciseIndex];
  const isLast = state.currentExerciseIndex === workout.day.exercises.length - 1;
  const lastTime = entry.lastLoggedWeight
    ? `${escapeHtml(entry.lastLoggedWeight)} • ${escapeHtml(formatDateShort(entry.lastLoggedDate))}`
    : "No previous entry";
  const timerProgress = timerState.totalSeconds
    ? Math.max(0, Math.min(1, timerState.secondsLeft / timerState.totalSeconds))
    : 0;
  const showExtraNotes = state.expandedCoachingExerciseId === exercise.id;
  const extraNotes = generateExtraCoachingNotes(exercise);

  return `
    <header class="top-bar">
      <button class="icon-button" type="button" data-action="back-to-overview">Overview</button>
      <div class="top-bar-copy">
        <p class="micro-label">Exercise ${state.currentExerciseIndex + 1} of ${workout.day.exercises.length}</p>
        <h1>${escapeHtml(exercise.name)}</h1>
      </div>
    </header>

    <section class="glass-card exercise-hero">
      <div class="section-row">
        <div>
          <p class="micro-label">Prescription</p>
          <h2>${exercise.sets} sets • ${escapeHtml(exercise.reps)} reps</h2>
        </div>
        <span class="pill">RPE ${escapeHtml(exercise.rpe)}</span>
      </div>
      <div class="prescription-grid">
        <div class="prescription-cell">
          <span class="prescription-label">Sets</span>
          <strong>${exercise.sets}</strong>
        </div>
        <div class="prescription-cell">
          <span class="prescription-label">Reps</span>
          <strong>${escapeHtml(exercise.reps)}</strong>
        </div>
        <div class="prescription-cell">
          <span class="prescription-label">RPE</span>
          <strong>${escapeHtml(exercise.rpe)}</strong>
        </div>
        <div class="prescription-cell">
          <span class="prescription-label">Rest</span>
          <strong>${escapeHtml(exercise.rest)}</strong>
        </div>
      </div>
      <span class="metric-pill">Last time: ${lastTime}</span>
    </section>

    <section class="panel">
      <div class="section-row">
        <p class="micro-label">Coaching notes</p>
        <button class="pill subtle" type="button" data-action="toggle-extra-coaching">
          ${showExtraNotes ? "Less notes" : "More notes"}
        </button>
      </div>
      <p class="body-copy">${escapeHtml(exercise.tips)}</p>
      ${showExtraNotes ? `
        <div class="extra-notes-list">
          ${extraNotes.map((note) => `<p>${escapeHtml(note)}</p>`).join("")}
        </div>
      ` : ""}
    </section>

    <section class="panel">
      <div class="section-row">
        <label class="field-label">Weight used</label>
        <span class="pill subtle">${escapeHtml(entry.weightUsed || "Per set logging")}</span>
      </div>
      ${renderSetWeightInputs(entry, exercise.sets)}
      ${renderSetTracker(entry, exercise.sets)}
    </section>

    <section class="glass-card timer-card" id="timer-card" style="--timer-progress:${timerProgress};">
      <div>
        <p class="micro-label">Rest timer</p>
        <h2 id="timer-display">${formatTimer(timerState.secondsLeft)}</h2>
        <p id="timer-status">${escapeHtml(getTimerStatus(timerState))}</p>
        <p id="timer-preset">Preset from ${escapeHtml(exercise.rest)}</p>
      </div>
      <div class="timer-actions">
        <button
          class="button button-secondary compact"
          type="button"
          data-action="toggle-timer"
          id="timer-toggle"
        >
          ${timerState.isRunning ? "Pause" : "Start"}
        </button>
        <button class="button ghost compact" type="button" data-action="reset-timer">
          Reset
        </button>
      </div>
    </section>

    <div class="sticky-actions">
      <button
        class="button button-secondary"
        type="button"
        data-action="previous-exercise"
        ${state.currentExerciseIndex === 0 ? "disabled" : ""}
      >
        Previous
      </button>
      <button
        class="button button-primary"
        type="button"
        data-action="${isLast ? "finish-workout" : "next-exercise"}"
      >
        ${isLast ? "Finish Workout" : "Next"}
      </button>
    </div>
  `;
}

export function renderSummaryScreen({ state, workout }) {
  const entries = state.activeWorkoutDraft.exerciseEntries;

  return `
    <header class="top-bar">
      <button class="icon-button" type="button" data-action="go-home">Home</button>
      <div class="top-bar-copy">
        <p class="micro-label">${escapeHtml(workout.month.label)} • ${escapeHtml(workout.day.subtitle)}</p>
        <h1>Workout summary</h1>
      </div>
    </header>

    <section class="glass-card summary-hero">
      <p class="micro-label">Complete</p>
      <h2>${escapeHtml(workout.day.title)}</h2>
      <p>Started ${escapeHtml(formatDateTime(state.activeWorkoutDraft.startedAt))}</p>
      <p class="summary-inline">Duration ${escapeHtml(formatDuration(state.activeWorkoutDraft.startedAt))}</p>
    </section>

    <section class="summary-list">
      ${entries
        .map(
          (entry, index) => `
            <article class="summary-card">
              <div class="exercise-card-row">
                <div>
                  <p class="micro-label">Exercise ${index + 1}</p>
                  <h3>${escapeHtml(entry.exerciseName)}</h3>
                </div>
                <span class="pill">${escapeHtml(entry.weightUsed || "No weight")}</span>
              </div>
              <div class="exercise-meta-grid">
                <span>${entry.completedSets} sets done</span>
                <span>${escapeHtml(entry.weightUsed || "No weight logged")}</span>
              </div>
            </article>
          `
        )
        .join("")}
    </section>

    <div class="sticky-actions">
      <button class="button button-secondary" type="button" data-action="go-home">
        Return Home
      </button>
      <button class="button button-primary" type="button" data-action="save-workout">
        Save Workout
      </button>
    </div>
  `;
}

export function renderFatalError(message) {
  return `
    <main class="app-frame">
      <section class="screen">
        <section class="glass-card">
          <p class="micro-label">Startup error</p>
          <h1>Something went wrong while loading the app.</h1>
          <p class="body-copy">${escapeHtml(message)}</p>
          <p class="body-copy">Refresh once after this change. If the issue remains, this message should replace the blank screen with something actionable.</p>
        </section>
      </section>
    </main>
  `;
}
