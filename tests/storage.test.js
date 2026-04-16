import test from "node:test";
import assert from "node:assert/strict";

import { months } from "../src/workout-data.js";
import { createWorkoutDraft, getSelectedWorkout } from "../src/state.js";
import {
  HISTORY_STORAGE_KEY,
  appendWorkoutSession,
  findLatestExerciseEntry,
  formatWorkoutSession,
  loadHistory
} from "../src/storage.js";

function createMockStorage() {
  const store = new Map();
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, value);
    }
  };
}

test("loadHistory returns saved sessions", () => {
  const storage = createMockStorage();
  const payload = [{ id: "session-1", exercises: [] }];
  storage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(payload));

  assert.deepEqual(loadHistory(storage), payload);
});

test("findLatestExerciseEntry prefers exercise id matches", () => {
  const history = [
    {
      date: "2026-04-10T09:00:00.000Z",
      exercises: [{ exerciseId: "back-squat", exerciseName: "Back Squat", weightUsed: "80kg" }]
    },
    {
      date: "2026-04-12T09:00:00.000Z",
      exercises: [{ exerciseId: "back-squat", exerciseName: "Back Squat", weightUsed: "82.5kg" }]
    }
  ];

  const entry = findLatestExerciseEntry(history, { id: "back-squat", name: "Back Squat" });
  assert.equal(entry.weightUsed, "82.5kg");
  assert.equal(entry.date, "2026-04-12T09:00:00.000Z");
});

test("findLatestExerciseEntry falls back to name", () => {
  const history = [
    {
      date: "2026-04-11T09:00:00.000Z",
      exercises: [{ exerciseId: "legacy-id", exerciseName: "Deadlift", weightUsed: "110kg" }]
    }
  ];

  const entry = findLatestExerciseEntry(history, { id: "deadlift-new", name: "Deadlift" });
  assert.equal(entry.weightUsed, "110kg");
});

test("createWorkoutDraft creates entries from selected workout", () => {
  const { month, day } = getSelectedWorkout("month-1", "day-1");
  const draft = createWorkoutDraft(month, day, []);

  assert.equal(draft.monthId, "month-1");
  assert.equal(draft.dayId, "day-1");
  assert.equal(draft.exerciseEntries.length, 7);
  assert.equal(draft.exerciseEntries[0].exerciseName, "Back Squat");
  assert.deepEqual(draft.exerciseEntries[0].setWeights, ["", "", ""]);
});

test("formatWorkoutSession produces savable summary payload", () => {
  const workout = months[0].days[0];
  const draft = {
    startedAt: "2026-04-17T07:00:00.000Z",
    monthId: "month-1",
    dayId: "day-1",
    dayTitle: workout.title,
    exerciseEntries: [
      {
        exerciseId: "back-squat",
        exerciseName: "Back Squat",
        weightUsed: "85 / 85 / 85",
        setWeights: ["85", "85", "85"],
        completedSets: 3
      }
    ]
  };

  const session = formatWorkoutSession(draft, workout, "2026-04-17T08:00:00.000Z");

  assert.equal(session.monthId, "month-1");
  assert.equal(session.dayId, "day-1");
  assert.equal(session.dayTitle, "Lower Body #1");
  assert.deepEqual(session.exercises[0], {
    exerciseId: "back-squat",
    exerciseName: "Back Squat",
    weightUsed: "85 / 85 / 85",
    setWeights: ["85", "85", "85"],
    completedSets: 3
  });
});

test("appendWorkoutSession persists history", () => {
  const storage = createMockStorage();
  const nextHistory = appendWorkoutSession([], { id: "session-2", exercises: [] }, storage);

  assert.equal(nextHistory.length, 1);
  assert.equal(JSON.parse(storage.getItem(HISTORY_STORAGE_KEY)).length, 1);
});
