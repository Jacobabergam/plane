/**
 * homelab addition (not upstream).
 *
 * Subscribes to the homelab SSE feed at /rt/events (the plane-webhook server's
 * issue-change ticks, bridged same-origin by the web container's nginx) and
 * invokes `onTick` whenever an issue in `projectId` changes server-side. Layout
 * roots use it to silently refetch, so cards move columns live while the
 * pickup agent works instead of the human pull-refreshing the page.
 *
 * Also fires when the tab becomes visible again: iOS Safari kills EventSource
 * connections in the background, so a refetch-on-return covers anything missed
 * while the phone was locked.
 */

import { useEffect, useRef } from "react";

const LIVE_EVENTS_URL = "/rt/events";
// Collapse tick bursts (an agent move fires state + activity + label events in
// quick succession) into at most one refetch per window.
const REFRESH_THROTTLE_MS = 2000;

export const useLiveIssueRefresh = (projectId: string | undefined, onTick: () => void) => {
  // Keep the latest callback without re-subscribing the EventSource on every
  // render (callers pass inline closures).
  const handlerRef = useRef(onTick);
  handlerRef.current = onTick;

  useEffect(() => {
    // The feed only exists behind the deployed nginx; skip in `pnpm dev`.
    if (import.meta.env.DEV) return;
    if (!projectId) return;

    let lastRun = 0;
    let pending: ReturnType<typeof setTimeout> | undefined;

    const schedule = () => {
      if (pending) return;
      const wait = Math.max(0, REFRESH_THROTTLE_MS - (Date.now() - lastRun));
      pending = setTimeout(() => {
        pending = undefined;
        // A hidden tab skips the refetch; the visibilitychange listener below
        // schedules a fresh one when the user comes back.
        if (document.visibilityState !== "visible") return;
        lastRun = Date.now();
        handlerRef.current();
      }, wait);
    };

    const eventSource = new EventSource(LIVE_EVENTS_URL);
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // Ticks carry only { kind, project }; ignore other projects' churn.
        if (data?.project && data.project !== projectId) return;
      } catch {
        return;
      }
      schedule();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") schedule();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (pending) clearTimeout(pending);
      eventSource.close();
    };
  }, [projectId]);
};
