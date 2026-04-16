import { months } from "./workout-data.js";
import { renderApp, renderFatalError } from "./ui.js";
import { createInitialState, createWorkoutDraft, getSelectedWorkout } from "./state.js";
import { appendWorkoutSession, formatWorkoutSession, loadHistory } from "./storage.js";
import { formatTimer, getTimerStatus, parseRestPreset } from "./timer.js";

const appElement = document.querySelector("#app");
const THEME_STORAGE_KEY = "workout-tracker-theme-v1";
let state = createInitialState(loadHistory());
let timerIntervalId = null;
let timerFrameId = null;

function getWorkout() {
  return getSelectedWorkout(state.selectedMonthId, state.selectedDayId);
}

function syncTimerForExercise(exercise) {
  const restPreset = parseRestPreset(exercise ? exercise.rest : "");
  const currentExerciseId = exercise ? exercise.id : null;

  if (state.restTimer.exerciseId === currentExerciseId) {
    return;
  }

  state.restTimer = {
    exerciseId: currentExerciseId,
    minimumSeconds: restPreset.minimumSeconds,
    totalSeconds: restPreset.totalSeconds,
    secondsLeft: restPreset.totalSeconds,
    isRunning: false,
    endTimeMs: null
  };
}

function applyTheme() {
  document.body.setAttribute("data-theme", state.theme);
}

function loadThemePreference() {
  try {
    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme === "light" || savedTheme === "dark") {
      state.theme = savedTheme;
      return;
    }
  } catch {}

  state.theme = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function saveThemePreference() {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, state.theme);
  } catch {}
}

function updateTimerUi() {
  if (!appElement || state.currentScreen !== "exercise") {
    return;
  }

  const timerDisplay = appElement.querySelector("#timer-display");
  const timerStatus = appElement.querySelector("#timer-status");
  const timerToggle = appElement.querySelector("#timer-toggle");
  const timerCard = appElement.querySelector("#timer-card");

  if (timerDisplay) {
    timerDisplay.textContent = formatTimer(state.restTimer.secondsLeft);
  }

  if (timerStatus) {
    timerStatus.textContent = getTimerStatus(state.restTimer);
  }

  if (timerToggle) {
    timerToggle.textContent = state.restTimer.isRunning ? "Pause" : "Start";
  }

  if (timerCard) {
    const progress = state.restTimer.totalSeconds
      ? Math.max(0, Math.min(1, state.restTimer.secondsLeft / state.restTimer.totalSeconds))
      : 0;

    timerCard.style.setProperty("--timer-progress", String(progress));
  }
}

function tickTimerFrame() {
  if (!state.restTimer.isRunning || !state.restTimer.endTimeMs) {
    timerFrameId = null;
    return;
  }

  const nextSeconds = Math.max(0, (state.restTimer.endTimeMs - window.performance.now()) / 1000);
  state.restTimer.secondsLeft = nextSeconds;

  if (nextSeconds <= 0) {
    state.restTimer.secondsLeft = 0;
    state.restTimer.isRunning = false;
    state.restTimer.endTimeMs = null;
  }

  updateTimerUi();

  if (state.restTimer.isRunning) {
    timerFrameId = window.requestAnimationFrame(tickTimerFrame);
  } else {
    timerFrameId = null;
  }
}

function startTimerAnimation() {
  if (timerFrameId) {
    return;
  }

  timerFrameId = window.requestAnimationFrame(tickTimerFrame);
}

function stopTimerAnimation() {
  if (!timerFrameId) {
    return;
  }

  window.cancelAnimationFrame(timerFrameId);
  timerFrameId = null;
}

function ensureTimerLoop() {
  if (timerIntervalId) {
    return;
  }

  timerIntervalId = window.setInterval(() => {
    if (!state.restTimer.isRunning) {
      return;
    }

    updateTimerUi();
  }, 1000);
}

function stopTimerLoop() {
  if (!timerIntervalId) {
    return;
  }

  window.clearInterval(timerIntervalId);
  timerIntervalId = null;
  stopTimerAnimation();
}

function startWorkout(index = 0) {
  const workout = getWorkout();
  state.activeWorkoutDraft = createWorkoutDraft(workout.month, workout.day, state.history);
  state.expandedCoachingExerciseId = null;
  state.currentExerciseIndex = index;
  state.currentScreen = "exercise";
  syncTimerForExercise(workout.day.exercises[index]);
  ensureTimerLoop();
  render();
}

function goToExercise(index) {
  const workout = getWorkout();
  const nextIndex = Math.min(Math.max(index, 0), workout.day.exercises.length - 1);
  state.expandedCoachingExerciseId = null;
  state.currentExerciseIndex = nextIndex;
  state.currentScreen = "exercise";
  syncTimerForExercise(workout.day.exercises[nextIndex]);
  render();
}

function updateExerciseEntry(field, value) {
  const entry = state.activeWorkoutDraft.exerciseEntries[state.currentExerciseIndex];
  entry[field] = value;
}

function updateSetWeight(setIndex, value) {
  const entry = state.activeWorkoutDraft.exerciseEntries[state.currentExerciseIndex];
  entry.setWeights[setIndex] = value;
  entry.weightUsed = entry.setWeights.filter(Boolean).join(" / ");
}

function render() {
  if (!appElement) {
    return;
  }

  const workout = getWorkout();
  const exercise =
    state.currentScreen === "exercise" && state.activeWorkoutDraft
      ? workout.day.exercises[state.currentExerciseIndex]
      : null;

  if (exercise) {
    syncTimerForExercise(exercise);
  }

  appElement.innerHTML = renderApp({
    state,
    months,
    workout,
    exercise,
    timerState: state.restTimer
  });

  updateTimerUi();
}

function saveWorkout() {
  const workout = getWorkout();
  const session = formatWorkoutSession(state.activeWorkoutDraft, workout.day);
  state.history = appendWorkoutSession(state.history, session);
  state.activeWorkoutDraft = null;
  state.expandedCoachingExerciseId = null;
  state.currentScreen = "home";
  state.currentExerciseIndex = 0;
  state.restTimer = {
    exerciseId: null,
    minimumSeconds: 0,
    totalSeconds: 0,
    secondsLeft: 0,
    isRunning: false,
    endTimeMs: null
  };
  stopTimerLoop();
  render();
}

function attachEvents() {
  if (!appElement) {
    throw new Error("App root #app was not found in index.html");
  }

  appElement.addEventListener("click", (event) => {
    const rawTarget = event.target;
    if (!(rawTarget instanceof Element)) {
      return;
    }

    const target = rawTarget.closest("[data-action]");
    if (!target) {
      return;
    }

    const { action } = target.dataset;

    switch (action) {
      case "select-month": {
        const nextMonthId = target.dataset.monthId;
        const month = months.find((item) => item.id === nextMonthId) || months[0];
        state.selectedMonthId = month.id;
        state.selectedDayId = month.days[0].id;
        state.currentScreen = "home";
        render();
        break;
      }
      case "select-day":
        state.selectedDayId = target.dataset.dayId;
        state.currentScreen = "home";
        render();
        break;
      case "view-overview":
        state.currentScreen = "overview";
        render();
        break;
      case "start-workout":
        startWorkout(0);
        break;
      case "jump-to-exercise":
        startWorkout(Number(target.dataset.index));
        break;
      case "go-home":
        state.currentScreen = "home";
        state.activeWorkoutDraft = null;
        state.expandedCoachingExerciseId = null;
        state.currentExerciseIndex = 0;
        state.restTimer.isRunning = false;
        state.restTimer.endTimeMs = null;
        stopTimerAnimation();
        render();
        break;
      case "back-to-overview":
        state.currentScreen = "overview";
        state.restTimer.isRunning = false;
        state.restTimer.endTimeMs = null;
        stopTimerAnimation();
        render();
        break;
      case "previous-exercise":
        goToExercise(state.currentExerciseIndex - 1);
        break;
      case "next-exercise":
        goToExercise(state.currentExerciseIndex + 1);
        break;
      case "finish-workout":
        state.currentScreen = "summary";
        state.restTimer.isRunning = false;
        state.restTimer.endTimeMs = null;
        stopTimerAnimation();
        render();
        break;
      case "save-workout":
        saveWorkout();
        break;
      case "toggle-set": {
        const setIndex = Number(target.dataset.setIndex);
        const entry = state.activeWorkoutDraft.exerciseEntries[state.currentExerciseIndex];
        entry.completedSets = entry.completedSets === setIndex + 1 ? setIndex : setIndex + 1;
        render();
        break;
      }
      case "toggle-timer":
        if (state.restTimer.totalSeconds > 0) {
          if (state.restTimer.isRunning) {
            state.restTimer.isRunning = false;
            state.restTimer.endTimeMs = null;
            stopTimerAnimation();
          } else {
            state.restTimer.isRunning = true;
            state.restTimer.endTimeMs = window.performance.now() + state.restTimer.secondsLeft * 1000;
            startTimerAnimation();
          }
        }
        updateTimerUi();
        break;
      case "reset-timer":
        state.restTimer.secondsLeft = state.restTimer.totalSeconds;
        state.restTimer.isRunning = false;
        state.restTimer.endTimeMs = null;
        stopTimerAnimation();
        updateTimerUi();
        break;
      case "toggle-theme":
        state.theme = state.theme === "dark" ? "light" : "dark";
        saveThemePreference();
        applyTheme();
        render();
        break;
      case "toggle-extra-coaching": {
        const currentExerciseId = state.activeWorkoutDraft.exerciseEntries[state.currentExerciseIndex].exerciseId;
        state.expandedCoachingExerciseId =
          state.expandedCoachingExerciseId === currentExerciseId ? null : currentExerciseId;
        render();
        break;
      }
      default:
        break;
    }
  });

  appElement.addEventListener("input", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) && !(target instanceof HTMLTextAreaElement)) {
      return;
    }

    const setWeightIndex = target.dataset.setWeightIndex;
    if (setWeightIndex !== undefined && state.activeWorkoutDraft) {
      updateSetWeight(Number(setWeightIndex), target.value);
      return;
    }

    const field = target.dataset.field;
    if (!field || !state.activeWorkoutDraft) {
      return;
    }

    updateExerciseEntry(field, target.value);
  });
}

function showFatalError(error) {
  if (!appElement) {
    return;
  }

  const message = error && error.message ? error.message : String(error);
  appElement.innerHTML = renderFatalError(message);
  console.error(error);
}

try {
  loadThemePreference();
  applyTheme();
  attachEvents();

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    });
  }

  window.addEventListener("beforeunload", () => {
    stopTimerLoop();
  });

  window.addEventListener("error", (event) => {
    showFatalError(event.error || event.message || "Unknown runtime error");
  });

  window.addEventListener("unhandledrejection", (event) => {
    showFatalError(event.reason || "Unhandled promise rejection");
  });

  render();
} catch (error) {
  showFatalError(error);
}
