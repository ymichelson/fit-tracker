export function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function formatDateShort(value) {
  if (!value) {
    return "No history yet";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric"
  }).format(new Date(value));
}

export function formatDateTime(value) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

export function formatDuration(startedAt, completedAt = Date.now()) {
  const elapsedMs = Math.max(0, new Date(completedAt).getTime() - new Date(startedAt).getTime());
  const totalMinutes = Math.round(elapsedMs / 60000);

  if (totalMinutes < 1) {
    return "Just started";
  }

  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

export function formatLastTime(entry) {
  if (!entry || !entry.weightUsed) {
    return "No previous weight";
  }

  if (!entry.date) {
    return entry.weightUsed;
  }

  return `${entry.weightUsed} • ${formatDateShort(entry.date)}`;
}

export function formatRecentWorkout(session) {
  if (!session) {
    return "";
  }

  return `${session.dayTitle} • ${formatDateShort(session.date)}`;
}
