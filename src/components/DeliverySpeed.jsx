import React, { useEffect, useId, useRef, useState } from "react";
import { Activity, AlertCircle, ArrowRight, CheckCircle2, Clock3, RotateCw, Zap } from "lucide-react";
import { useAuth } from "../providers/AuthProvider";
import "./deliverySpeed.css";

const REFRESH_INTERVAL_MS = 60_000;
const REQUEST_TIMEOUT_MS = 15_000;
const SPEEDS = {
  fast: { label: "Fast", Icon: Zap },
  moderate: { label: "Moderate", Icon: Clock3 },
  slow: { label: "Slow", Icon: AlertCircle },
};
const ghanaTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Africa/Accra",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});
const ghanaDate = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Africa/Accra",
  year: "numeric",
  month: "short",
  day: "numeric",
});

function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor(seconds / 60) % 60;
  const remainder = Math.floor(seconds) % 60;
  if (hours) {
    if (minutes) return `${hours}h ${minutes}m`;
    if (remainder) return `${hours}h ${remainder}s`;
    return seconds > 3600 && seconds < 3601 ? ">1h" : `${hours}h`;
  }
  if (minutes) return remainder ? `${minutes}m ${remainder}s` : `${minutes}m`;
  return seconds > 0 && seconds < 1 ? "<1s" : `${remainder}s`;
}

function DeliveryTrend({ durations }) {
  const peak = Math.max(...durations, 1);
  return (
    <figure className="delivery-speed__trend">
      <figcaption>
        <strong>Recent deliveries</strong>
        <span>Shorter is faster</span>
      </figcaption>
      <ol className="delivery-speed__bars" aria-label="Delivery times, oldest to newest">
        {durations.map((seconds, index) => (
          <li key={index} title={formatDuration(seconds)}>
            <span className="delivery-speed__sr-only">{formatDuration(seconds)}</span>
            <span aria-hidden="true" style={{ height: `${(seconds / peak) * 100}%` }} />
          </li>
        ))}
      </ol>
      <div className="delivery-speed__axis" aria-hidden="true">
        <span>{durations.length > 1 ? "Oldest" : ""}</span>
        <span>Latest</span>
      </div>
    </figure>
  );
}

function DeliveryMoment({ label, value, Icon }) {
  const date = new Date(value);
  return (
    <div className="delivery-speed__moment">
      <span className="delivery-speed__moment-icon"><Icon size={15} aria-hidden="true" /></span>
      <div>
        <span>{label}</span>
        <time dateTime={value}>
          <strong>{ghanaTime.format(date)}</strong>
          {ghanaDate.format(date)} · GMT
        </time>
      </div>
    </div>
  );
}

export default function DeliverySpeed({ network, networkLabel }) {
  const { authFetch } = useAuth();
  const titleId = useId();
  const [snapshot, setSnapshot] = useState(null);
  const [refreshing, setRefreshing] = useState(true);
  const [failed, setFailed] = useState(false);
  const [chosenNetwork, setChosenNetwork] = useState(null);
  const refreshRef = useRef(null);

  useEffect(() => {
    let active = true;
    let controller;
    let timeout;

    const refresh = async () => {
      if (controller) return;
      controller = new AbortController();
      timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      setRefreshing(true);
      try {
        const response = await authFetch("/data/delivery-stats/", {
          auth: false,
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Could not refresh delivery speeds");
        const payload = await response.json();
        if (payload.status !== "success" || !Array.isArray(payload.data) || !Number.isFinite(Date.parse(payload.as_of))) {
          throw new Error("Could not read delivery speeds");
        }
        if (active) {
          setSnapshot(payload);
          setFailed(false);
        }
      } catch {
        if (active) setFailed(true);
      } finally {
        window.clearTimeout(timeout);
        controller = null;
        if (active) setRefreshing(false);
      }
    };

    const refreshWhenVisible = () => {
      if (document.visibilityState !== "hidden") refresh();
    };
    refreshRef.current = refresh;
    refresh();
    const interval = window.setInterval(refreshWhenVisible, REFRESH_INTERVAL_MS);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.clearTimeout(timeout);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      controller?.abort();
    };
  }, [authFetch]);

  const networks = snapshot?.data || [];
  const selected = network
    ? networks.find((entry) => entry.network === network.toLowerCase())
    : networks.find((entry) => entry.network === chosenNetwork)
      || networks.find((entry) => entry.latest_delivery)
      || networks[0];
  const speed = SPEEDS[selected?.speed];
  const SpeedIcon = speed?.Icon;
  const latest = selected?.latest_delivery;
  const label = selected?.label || networkLabel || network;

  return (
    <section className="delivery-speed" aria-labelledby={titleId}>
      <div className="delivery-speed__header">
        <span className="delivery-speed__icon"><Activity size={21} aria-hidden="true" /></span>
        <div className="delivery-speed__heading">
          <h2 id={titleId}>Live delivery speeds</h2>
          <p>See how long data orders take on this store.</p>
        </div>
        <div className="delivery-speed__controls">
          <span className={`delivery-speed__live${snapshot && !failed ? " is-live" : ""}`}>
            {failed ? (snapshot ? "Saved data" : "Offline") : snapshot ? "Live" : "Connecting"}
          </span>
          <button
            type="button"
            aria-label="Refresh delivery speeds"
            title="Refresh delivery speeds"
            className="delivery-speed__refresh"
            disabled={refreshing}
            onClick={() => refreshRef.current?.()}
          >
            <RotateCw size={16} aria-hidden="true" />
          </button>
        </div>
      </div>

      {!network && networks.length > 1 && (
        <div className="delivery-speed__networks" role="group" aria-label="Delivery network">
          {networks.map((entry) => (
            <button
              key={entry.network}
              type="button"
              aria-pressed={selected === entry}
              data-speed={entry.speed || undefined}
              onClick={() => setChosenNetwork(entry.network)}
            >
              <span className="delivery-speed__dot" aria-hidden="true" />
              {entry.label}
            </button>
          ))}
        </div>
      )}

      {latest && speed ? (
        <>
          <div className="delivery-speed__overview" data-speed={selected.speed}>
            <div className="delivery-speed__metric">
              <span className="delivery-speed__network">{label}</span>
              <div className="delivery-speed__value">
                <strong>{formatDuration(selected.average_seconds)}</strong>
                <span className="delivery-speed__badge"><SpeedIcon size={14} aria-hidden="true" />{speed.label}</span>
              </div>
              <span>Average for {selected.recent_durations_seconds.length} recent {selected.recent_durations_seconds.length === 1 ? "delivery" : "deliveries"}</span>
            </div>
            <DeliveryTrend durations={selected.recent_durations_seconds} />
          </div>

          <div className="delivery-speed__latest">
            <h3>Latest delivered order</h3>
            <div className="delivery-speed__timeline">
              <DeliveryMoment label="Placed" value={latest.placed_at} Icon={Clock3} />
              <ArrowRight size={16} aria-hidden="true" />
              <DeliveryMoment label="Delivered" value={latest.delivered_at} Icon={CheckCircle2} />
            </div>
          </div>
        </>
      ) : (
        <div className="delivery-speed__empty" role="status">
          {label && <span className="delivery-speed__network">{label}</span>}
          {!snapshot ? (
            <strong>{failed ? "Delivery speeds are temporarily unavailable." : "Checking recent deliveries…"}</strong>
          ) : (
            <>
              <strong>No confirmed deliveries yet</strong>
              <span>Delivery times will appear here after an order is delivered.</span>
            </>
          )}
        </div>
      )}

      {snapshot && (
        <div className="delivery-speed__footer">
          <span>{failed ? "Refresh failed. " : ""}Observed times, not a delivery guarantee.</span>
          <time dateTime={snapshot.as_of} title={`${ghanaDate.format(new Date(snapshot.as_of))} GMT`}>
            Checked {ghanaTime.format(new Date(snapshot.as_of))} GMT
          </time>
        </div>
      )}
    </section>
  );
}
