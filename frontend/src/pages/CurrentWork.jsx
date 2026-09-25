import React, { useEffect, useState } from "react";
import "./CurrentWork.css";

function parseBackendUtc(value) {
  if (!value) return null;

  const text = String(value);

  // Backend already supplied timezone
  if (
    text.endsWith("Z") ||
    /[+-]\d{2}:\d{2}$/.test(text)
  ) {
    return new Date(text);
  }

  // SQL datetime2 value is UTC but has no timezone marker
  return new Date(`${text}Z`);
}

function CurrentWork({
  ticket,
  onPause,
  onResume,
  onFinish,
}) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!ticket) {
      setElapsed(0);
      return;
    }

    const calculateElapsed = () => {
      const savedSeconds =
        Number(ticket.totalWorkingSeconds) || 0;

      /*
       * API may return:
       * true
       * false
       * 1
       * 0
       * "1"
       * "0"
       */
      const isPaused =
        ticket.isPaused === true ||
        ticket.isPaused === 1 ||
        ticket.isPaused === "1" ||
        ticket.status === "Paused";

      /*
       * IMPORTANT:
       *
       * When paused, display ONLY the accumulated
       * working time and DO NOT calculate anything
       * from the start date.
       */
      if (isPaused) {
        setElapsed(savedSeconds);
        return;
      }

      /*
       * sessionStartedAt:
       *
       * - First Start Work:
       *   sessionStartedAt = original start
       *
       * - Resume:
       *   sessionStartedAt = resume time
       *
       * This prevents the pause period from being counted.
       */
      const sessionStartedAt =
        ticket.sessionStartedAt ||
        ticket.workingStartedAt ||
        ticket.startedAt;

      if (!sessionStartedAt) {
        setElapsed(savedSeconds);
        return;
      }

      const startDate =
        parseBackendUtc(sessionStartedAt);

      if (
        !startDate ||
        Number.isNaN(startDate.getTime())
      ) {
        setElapsed(savedSeconds);
        return;
      }

      const startTime =
        startDate.getTime();

      const now = Date.now();

      /*
       * Calculate ONLY the current active session.
       */
      const currentSessionSeconds =
        Math.max(
          0,
          Math.floor(
            (now - startTime) / 1000
          )
        );

      /*
       * Total displayed time =
       * previous accumulated time
       * +
       * current active session
       */
      setElapsed(
        savedSeconds +
        currentSessionSeconds
      );
    };

    // Calculate immediately
    calculateElapsed();

    // Update every second
    const interval = setInterval(
      calculateElapsed,
      1000
    );

    return () => {
      clearInterval(interval);
    };
  }, [
    ticket?.workingStartedAt,
    ticket?.sessionStartedAt,
    ticket?.startedAt,
    ticket?.isPaused,
    ticket?.status,
    ticket?.totalWorkingSeconds,
  ]);

  if (!ticket) {
    return null;
  }

  const hours = Math.floor(
    elapsed / 3600
  );

  const minutes = Math.floor(
    (elapsed % 3600) / 60
  );

  const seconds =
    elapsed % 60;

  const formattedTime =
    `${String(hours).padStart(2, "0")}:` +
    `${String(minutes).padStart(2, "0")}:` +
    `${String(seconds).padStart(2, "0")}`;

  /*
   * Detect every possible paused value.
   */
  const isPaused =
    ticket.isPaused === true ||
    ticket.isPaused === 1 ||
    ticket.isPaused === "1" ||
    ticket.status === "Paused";

  /*
   * IMPORTANT:
   *
   * Started At always uses the ORIGINAL
   * workingStartedAt.
   *
   * We do NOT use sessionStartedAt here.
   */
  const originalStartedAt =
    ticket.originalWorkingStartedAt ||
    ticket.workingStartedAt ||
    ticket.startedAt;

  const startedDate =
    parseBackendUtc(originalStartedAt);

  return (
    <div className="current-work">

      <div className="current-work-header">
        CURRENT WORK
      </div>

      <div className="current-work-content">

        {/* TICKET */}
        <div className="work-ticket-info">

          <p className="ticket-number">
            Ticket:
            <span>
              {ticket.ticketReference}
            </span>
          </p>

          <h2>
            {ticket.title}
          </h2>

          <div className="work-status">

            <span
              className={`status-dot ${
                isPaused
                  ? "paused"
                  : ""
              }`}
            />

            Status:

            <strong>
              {isPaused
                ? "Paused"
                : "In Progress"}
            </strong>

          </div>

        </div>


        {/* TIME */}
        <div className="work-time">

          {/* STARTED AT */}
          <div className="time-section">

            <label>
              Started At
            </label>

            <div className="started-time">

              {startedDate &&
              !Number.isNaN(
                startedDate.getTime()
              ) ? (
                startedDate.toLocaleTimeString(
                  [],
                  {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  }
                )
              ) : (
                "--:--:--"
              )}

            </div>

          </div>


          {/* WORKING TIME */}
          <div className="time-section">

            <label>
              Working Time
            </label>

            <div className="working-time">
              {formattedTime}
            </div>

          </div>

        </div>


        {/* MESSAGE */}
        <div className="work-message">

          <div className="work-icon">
            {isPaused
              ? "⏸"
              : "💼"}
          </div>

          <h3>
            {isPaused
              ? "Work is currently paused"
              : "You are working on this ticket"}
          </h3>

          <p>
            {isPaused
              ? "Resume the work when you are ready."
              : "Please resolve the issue or pause the work if needed."}
          </p>

        </div>


        {/* BUTTONS */}
        <div className="work-actions">

          <button
            type="button"
            className="pause-button"
            onClick={
              isPaused
                ? onResume
                : onPause
            }
          >

            <span className="button-icon">
              {isPaused
                ? "▶"
                : "Ⅱ"}
            </span>

            {isPaused
              ? "Resume"
              : "Pause"}

          </button>


          <button
            type="button"
            className="finish-button"
            onClick={onFinish}
          >

            <span className="button-icon">
              ✓
            </span>

            Finish

          </button>

        </div>

      </div>

    </div>
  );
}

export default CurrentWork;