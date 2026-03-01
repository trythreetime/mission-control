export function formatElapsed(from: Date): string {
  const diffMs = Math.max(0, Date.now() - from.getTime());
  const totalMinutes = Math.floor(diffMs / 60000);

  if (totalMinutes < 1) return "<1m";
  if (totalMinutes < 60) return `${totalMinutes}m`;

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours < 24) return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;

  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours === 0 ? `${days}d` : `${days}d ${remHours}h`;
}

export function toPercent(value: number | null): string {
  return value === null ? "--" : `${value}%`;
}

export function toLatency(value: number | null): string {
  return value === null ? "--" : `${value}ms`;
}

export function toHeartbeat(lastHeartbeatAt: Date | null): string {
  if (!lastHeartbeatAt) return "never";
  return `${formatElapsed(lastHeartbeatAt)} ago`;
}

export function toClockTime(at: Date): string {
  return at.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
