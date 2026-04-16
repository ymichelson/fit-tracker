import { months } from "./workout-data.js";
import { findLatestExerciseEntry } from "./storage.js";

export function getMonthById(monthId) {
  return months.find((month) => month.id === monthId) || months[0];
}

export function getDayById(month, dayId) {
  return month.days.find((day) => day.id === dayId) || month.days[0];
}

export function getSelectedWorkout(selectedMonthId, selectedDayId) {
  const month = getMonthById(selectedMonthId);
  const day = getDayById(month, selectedDayId);
  return { month, day };
}

export function createWorkoutDraft(month, day, history, startedAt = new Date().toISOString()) {
  return {
    startedAt,
    monthId: month.id,
    dayId: day.id,
    dayTitle: day.title,
    exerciseEntries: day.exercises.map((exercise) => {
      const lastEntry = findLatestExerciseEntry(history, exercise);
      return {
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        weightUsed: "",
        setWeights: Array.from({ length: exercise.sets }, () => ""),
        completedSets: 0,
        lastLoggedWeight: lastEntry ? lastEntry.weightUsed : "",
        lastLoggedDate: lastEntry ? lastEntry.date : ""
      };
    })
  };
}

export function createInitialState(history) {
  return {
    selectedMonthId: months[0].id,
    selectedDayId: months[0].days[0].id,
    currentScreen: "home",
    currentExerciseIndex: 0,
    theme: "dark",
    expandedCoachingExerciseId: null,
    activeWorkoutDraft: null,
    history,
    restTimer: {
      exerciseId: null,
      minimumSeconds: 0,
      totalSeconds: 0,
      secondsLeft: 0,
      isRunning: false,
      endTimeMs: null
    }
  };
}
