export const HISTORY_STORAGE_KEY = "workout-tracker-history-v1";

function getDefaultStorage() {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    return null;
  }

  return null;
}

export function loadHistory(storage = getDefaultStorage()) {
  if (!storage) {
    return [];
  }

  try {
    const raw = storage.getItem(HISTORY_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveHistory(history, storage = getDefaultStorage()) {
  if (!storage) {
    return history;
  }

  storage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
  return history;
}

export function findLatestExerciseEntry(history, exercise) {
  if (!Array.isArray(history) || !exercise) {
    return null;
  }

  for (let historyIndex = history.length - 1; historyIndex >= 0; historyIndex -= 1) {
    const session = history[historyIndex];
    const exercises = Array.isArray(session && session.exercises) ? session.exercises : [];

    const byId = exercises.find((entry) => entry.exerciseId === exercise.id && entry.weightUsed);
    if (byId) {
      return {
        weightUsed: byId.weightUsed,
        notes: byId.notes || "",
        date: session.date
      };
    }

    const byName = exercises.find((entry) => entry.exerciseName === exercise.name && entry.weightUsed);
    if (byName) {
      return {
        weightUsed: byName.weightUsed,
        notes: byName.notes || "",
        date: session.date
      };
    }
  }

  return null;
}

export function formatWorkoutSession(draft, workout, completedAt = new Date().toISOString()) {
  return {
    id: `${draft.monthId}-${draft.dayId}-${new Date(completedAt).getTime()}`,
    date: completedAt,
    monthId: draft.monthId,
    dayId: draft.dayId,
    dayTitle: workout.title,
    exercises: draft.exerciseEntries.map((entry) => ({
      exerciseId: entry.exerciseId,
      exerciseName: entry.exerciseName,
      weightUsed: entry.weightUsed,
      setWeights: entry.setWeights,
      completedSets: entry.completedSets
    }))
  };
}

export function appendWorkoutSession(history, session, storage = getDefaultStorage()) {
  const nextHistory = [...history, session];
  saveHistory(nextHistory, storage);
  return nextHistory;
}
