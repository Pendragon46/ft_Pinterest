import { useCallback, useEffect, useState } from "react";

interface Health {
  status: string;
  backend: string;
  database: string;
  uptime: number;
  version: string;
  timestamp: string;
}

const REFRESH_INTERVAL_MS = 30_000;

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts: string[] = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}min`);
  if (!days && !hours) parts.push(`${secs}s`);

  return parts.join(" ");
}

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "medium",
    });
  } catch {
    return iso;
  }
}

function getStatusTone(value: string): { color: string; bg: string; label: string } {
  const normalized = value.toLowerCase();
  if (["ok", "up", "healthy", "connected", "online"].includes(normalized)) {
    return { color: "#15803d", bg: "#dcfce7", label: value };
  }
  if (["degraded", "warning", "slow"].includes(normalized)) {
    return { color: "#b45309", bg: "#fef3c7", label: value };
  }
  if (["down", "error", "offline", "disconnected"].includes(normalized)) {
    return { color: "#b91c1c", bg: "#fee2e2", label: value };
  }
  return { color: "#475569", bg: "#f1f5f9", label: value };
}

function StatusDot({ value }: { value: string }) {
  const tone = getStatusTone(value);
  return (
    <span
      style={{
        display: "inline-block",
        width: 8,
        height: 8,
        borderRadius: "50%",
        backgroundColor: tone.color,
        marginRight: 8,
      }}
    />
  );
}

function StatusBadge({ value }: { value: string }) {
  const tone = getStatusTone(value);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        color: tone.color,
        backgroundColor: tone.bg,
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: 13,
        fontWeight: 600,
      }}
    >
      <StatusDot value={value} />
      {tone.label}
    </span>
  );
}

export default function StatusPage() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch("/api/health");
      if (!res.ok) {
        throw new Error(`Server responded with status ${res.status}`);
      }
      const data: Health = await res.json();
      setHealth(data);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to fetch system status."
      );
    } finally {
      setLoading(false);
      setLastChecked(new Date());
    }
  }, []);

  useEffect(() => {
    // fetchHealth is async — every setState runs after `await`, never synchronously
    // in the effect body, so this is a false positive of the sync-set-state rule.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchHealth();
    const interval = setInterval(fetchHealth, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  return (
    <div
      style={{
        maxWidth: 640,
        margin: "0 auto",
        padding: "48px 24px",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 24,
        }}
      >
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>
          System status
        </h1>
        <button
          onClick={fetchHealth}
          style={{
            border: "1px solid #e2e8f0",
            backgroundColor: "#fff",
            borderRadius: 8,
            padding: "6px 12px",
            fontSize: 13,
            cursor: "pointer",
            color: "#334155",
          }}
        >
          Refresh
        </button>
      </div>

      {loading && (
        <div style={{ color: "#64748b", fontSize: 14 }}>
          Loading status…
        </div>
      )}

      {!loading && error && (
        <div
          style={{
            backgroundColor: "#fee2e2",
            color: "#b91c1c",
            borderRadius: 10,
            padding: "16px 18px",
            fontSize: 14,
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      {!loading && health && (
        <div
          style={{
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <Row label="Overall status">
            <StatusBadge value={health.status} />
          </Row>
          <Row label="Backend">
            <StatusBadge value={health.backend} />
          </Row>
          <Row label="Database">
            <StatusBadge value={health.database} />
          </Row>
          <Row label="Version">
            <code style={{ fontSize: 13, color: "#334155" }}>
              {health.version}
            </code>
          </Row>
          <Row label="Uptime">
            <span style={{ fontSize: 14 }}>{formatUptime(health.uptime)}</span>
          </Row>
          <Row label="Last updated" last>
            <span style={{ fontSize: 14, color: "#64748b" }}>
              {formatTimestamp(health.timestamp)}
            </span>
          </Row>
        </div>
      )}

      {lastChecked && !loading && (
        <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 16 }}>
          Checked at {lastChecked.toLocaleTimeString("en-US")} · auto-refreshes
          every {REFRESH_INTERVAL_MS / 1000}s
        </p>
      )}
    </div>
  );
}

function Row({
  label,
  children,
  last = false,
}: {
  label: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 18px",
        borderBottom: last ? "none" : "1px solid #f1f5f9",
      }}
    >
      <span style={{ fontSize: 14, color: "#64748b" }}>{label}</span>
      {children}
    </div>
  );
}