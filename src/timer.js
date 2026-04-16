export function parseRestPreset(restValue) {
  if (!restValue) {
    return {
      minimumSeconds: 0,
      totalSeconds: 0
    };
  }

  const matches = String(restValue).match(/\d+/g);
  if (!matches || !matches.length) {
    return {
      minimumSeconds: 0,
      totalSeconds: 0
    };
  }

  const values = matches.map((value) => Number(value)).filter((value) => Number.isFinite(value));
  if (!values.length) {
    return {
      minimumSeconds: 0,
      totalSeconds: 0
    };
  }

  const minimumMinutes = values[0];
  const maximumMinutes = values.length > 1 ? values[values.length - 1] : values[0];

  return {
    minimumSeconds: minimumMinutes * 60,
    totalSeconds: maximumMinutes * 60
  };
}

export function formatTimer(secondsLeft) {
  const safeSeconds = Math.max(0, Math.floor(secondsLeft));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function getTimerStatus(timerState) {
  const totalSeconds = timerState && timerState.totalSeconds ? timerState.totalSeconds : 0;
  const minimumSeconds = timerState && timerState.minimumSeconds ? timerState.minimumSeconds : 0;
  const secondsLeft = timerState && typeof timerState.secondsLeft === "number" ? timerState.secondsLeft : 0;
  const elapsedSeconds = Math.max(0, totalSeconds - secondsLeft);

  if (!totalSeconds) {
    return "No timer preset";
  }

  if (secondsLeft === 0) {
    return "Full rest complete";
  }

  if (elapsedSeconds >= minimumSeconds && minimumSeconds > 0) {
    return "Minimum rest reached";
  }

  return `Minimum in ${formatTimer(Math.max(0, minimumSeconds - elapsedSeconds))}`;
}
