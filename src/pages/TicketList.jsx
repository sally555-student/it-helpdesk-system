import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AppLayout from "../components/AppLayout";
import * as assignmentRequestService from "../services/assignmentRequestService";
import * as ticketService from "../services/ticketService";
import CurrentWork from "./CurrentWork";
import CompletedWork from "./CompletedWork";

function parseBackendUtc(value) {
  if (!value) return null;

  const text = String(value);

  if (
    text.endsWith("Z") ||
    /[+-]\d{2}:\d{2}$/.test(text)
  ) {
    return new Date(text);
  }

  return new Date(`${text}Z`);
}

function formatWorkingTime(totalWorkingSeconds) {
  const totalSeconds = Number(totalWorkingSeconds) || 0;

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return (
    `${String(hours).padStart(2, "0")}:` +
    `${String(minutes).padStart(2, "0")}:` +
    `${String(seconds).padStart(2, "0")}`
  );
}

// =========================================================
// DATE FILTER
// =========================================================

function isTicketInDateRange(createdDate, range) {
  if (!range) {
    return true;
  }

  const ticketDate = new Date(createdDate);

  if (Number.isNaN(ticketDate.getTime())) {
    return false;
  }

  const now = new Date();

  // Start of today
  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  // Start of tomorrow
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(todayStart.getDate() + 1);

  switch (range) {
    // =====================================================
    // TODAY
    // =====================================================
    case "today":
      return (
        ticketDate >= todayStart &&
        ticketDate < tomorrowStart
      );

    // =====================================================
    // YESTERDAY
    // =====================================================
    case "yesterday": {
      const yesterdayStart = new Date(todayStart);

      yesterdayStart.setDate(
        todayStart.getDate() - 1
      );

      return (
        ticketDate >= yesterdayStart &&
        ticketDate < todayStart
      );
    }

    // =====================================================
    // LAST 3 DAYS
    // Includes today
    // =====================================================
    case "last3days": {
      const start = new Date(todayStart);

      start.setDate(
        todayStart.getDate() - 2
      );

      return (
        ticketDate >= start &&
        ticketDate < tomorrowStart
      );
    }

    // =====================================================
    // LAST 7 DAYS
    // Includes today
    // =====================================================
    case "last7days": {
      const start = new Date(todayStart);

      start.setDate(
        todayStart.getDate() - 6
      );

      return (
        ticketDate >= start &&
        ticketDate < tomorrowStart
      );
    }

    // =====================================================
    // LAST 30 DAYS
    // Includes today
    // =====================================================
    case "last30days": {
      const start = new Date(todayStart);

      start.setDate(
        todayStart.getDate() - 29
      );

      return (
        ticketDate >= start &&
        ticketDate < tomorrowStart
      );
    }

    // =====================================================
    // THIS WEEK
    // Monday -> Today
    // =====================================================
    case "thisweek": {
      const day = todayStart.getDay();

      // Sunday = 0
      // Monday = 1
      const daysFromMonday =
        day === 0 ? 6 : day - 1;

      const start = new Date(todayStart);

      start.setDate(
        todayStart.getDate() - daysFromMonday
      );

      return (
        ticketDate >= start &&
        ticketDate < tomorrowStart
      );
    }

    // =====================================================
    // LAST WEEK
    // Previous Monday -> Previous Sunday
    // =====================================================
    case "lastweek": {
      const day = todayStart.getDay();

      const daysFromMonday =
        day === 0 ? 6 : day - 1;

      // Start of this week
      const thisWeekStart = new Date(todayStart);

      thisWeekStart.setDate(
        todayStart.getDate() - daysFromMonday
      );

      // Start of last week
      const lastWeekStart = new Date(
        thisWeekStart
      );

      lastWeekStart.setDate(
        thisWeekStart.getDate() - 7
      );

      return (
        ticketDate >= lastWeekStart &&
        ticketDate < thisWeekStart
      );
    }

    // =====================================================
    // THIS MONTH
    // =====================================================
    case "thismonth": {
      const start = new Date(
        now.getFullYear(),
        now.getMonth(),
        1
      );

      return (
        ticketDate >= start &&
        ticketDate < tomorrowStart
      );
    }

    // =====================================================
    // LAST MONTH
    // =====================================================
    case "lastmonth": {
      const start = new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        1
      );

      const end = new Date(
        now.getFullYear(),
        now.getMonth(),
        1
      );

      return (
        ticketDate >= start &&
        ticketDate < end
      );
    }

    default:
      return true;
  }
}

export default function TicketList() {
  const { user } = useAuth();

  const [tickets, setTickets] = useState([]);

  const [lookups, setLookups] = useState({
    categories: [],
    priorities: [],
    statuses: [],
  });

  const [filters, setFilters] = useState({
    statusId: "",
    categoryId: "",
    priorityId: "",
    search: "",
  });

  // =========================================================
  // DATE FILTER
  // =========================================================

  const [dateFilter, setDateFilter] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [requestingTicketId, setRequestingTicketId] =
    useState(null);

  const [myRequests, setMyRequests] = useState([]);

  const [currentWork, setCurrentWork] =
    useState(null);

  // =========================================================
  // LOAD TICKETS
  // =========================================================
const loadTickets = useCallback(async () => {
  setLoading(true);
  setError("");

  try {
    const data =
      await ticketService.getTickets(filters);

    setTickets(data);

    if (user?.role === "IT Support Agent") {

      const activeWorkTicket = data.find(
        (t) =>
          t.statusName === "In Progress" &&
          t.assignedToUserName === user?.fullName
      );

      if (activeWorkTicket) {

        /*
         * API/database can return:
         * true / false
         * 1 / 0
         * "1" / "0"
         */
        const backendIsPaused =
          activeWorkTicket.isPaused === true ||
          activeWorkTicket.isPaused === 1 ||
          activeWorkTicket.isPaused === "1";

        /*
         * IMPORTANT:
         *
         * Preserve frontend sessionStartedAt.
         *
         * This is needed after Resume because the
         * database does not contain sessionStartedAt.
         */
        setCurrentWork((previous) => {

          const originalStartedAt =
            previous?.originalWorkingStartedAt ||
            activeWorkTicket.workingStartedAt ||
            activeWorkTicket.startedAt;

          /*
           * If backend says PAUSED:
           *
           * - timer must be frozen
           * - there is NO active session
           */
          if (backendIsPaused) {
            return {
              ...activeWorkTicket,

              status: "Paused",

              originalWorkingStartedAt:
                originalStartedAt,

              workingStartedAt:
                activeWorkTicket.workingStartedAt,

              sessionStartedAt: null,

              workingFinishedAt:
                activeWorkTicket.workingFinishedAt,

              totalWorkingSeconds:
                Number(
                  activeWorkTicket.totalWorkingSeconds
                ) || 0,

              isPaused: true,
            };
          }

          /*
           * Ticket is actively being worked.
           *
           * Preserve sessionStartedAt if it already
           * exists (especially after Resume).
           */
          return {
            ...activeWorkTicket,

            status: "In Progress",

            originalWorkingStartedAt:
              originalStartedAt,

            workingStartedAt:
              activeWorkTicket.workingStartedAt,

            /*
             * KEEP the current active session.
             *
             * If this is the first Start Work,
             * use the original start time.
             */
            sessionStartedAt:
              previous?.sessionStartedAt ||
              activeWorkTicket.workingStartedAt ||
              activeWorkTicket.startedAt,

            workingFinishedAt:
              activeWorkTicket.workingFinishedAt,

            totalWorkingSeconds:
              Number(
                activeWorkTicket.totalWorkingSeconds
              ) || 0,

            isPaused: false,
          };
        });

      } else {
        setCurrentWork(null);
      }
    }

  } catch (err) {
    console.error(err);

    setError(
      "Couldn't load tickets. Try refreshing."
    );

  } finally {
    setLoading(false);
  }
}, [filters, user]);
  // =========================================================
  // LOAD LOOKUPS
  // =========================================================

  useEffect(() => {
    ticketService
      .getLookups()
      .then(setLookups)
      .catch((err) =>
        console.error(err)
      );
  }, []);

  // =========================================================
  // LOAD TICKETS WHEN FILTERS CHANGE
  // =========================================================

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  // =========================================================
  // LOAD AGENT REQUESTS
  // =========================================================

  useEffect(() => {
    if (
      user?.role ===
      "IT Support Agent"
    ) {
      assignmentRequestService
        .getMyRequests()
        .then(setMyRequests)
        .catch((err) =>
          console.error(err)
        );
    }
  }, [user]);

  // =========================================================
  // UPDATE FILTER
  // =========================================================

  function updateFilter(key, value) {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  // =========================================================
  // REQUEST TO WORK
  // =========================================================

  async function handleRequestToWork(ticketId) {
    if (requestingTicketId === ticketId) {
      return;
    }

    try {
      setRequestingTicketId(ticketId);
      setError("");

      await assignmentRequestService.createRequest(
        ticketId
      );

      // Refresh agent requests
      const requests =
        await assignmentRequestService.getMyRequests();

      setMyRequests(requests);

      // Refresh tickets
      await loadTickets();
    } catch (err) {
      console.error(err);

      const message =
        err?.response?.data?.message ||
        err?.response?.data ||
        "Failed to send request.";

      setError(message);
    } finally {
      setRequestingTicketId(null);
    }
  }

  // =========================================================
  // START WORK
  // =========================================================
async function handleStartWork(ticket) {
  try {
    setError("");

    const inProgressStatusId = 2;

    const startedAt =
      new Date().toISOString();

    await ticketService.updateTicket(
      ticket.ticketId,
      {
        title: ticket.title,
        description: ticket.description,
        categoryId: ticket.categoryId,
        priorityId: ticket.priorityId,
        statusId: inProgressStatusId,
        assignedToUserId:
          ticket.assignedToUserId,

        // ORIGINAL start time - never change after this
        workingStartedAt: startedAt,

        workingFinishedAt: null,

        // New ticket starts from zero
        totalWorkingSeconds: 0,

        isPaused: false,
      }
    );

    await loadTickets();

  } catch (err) {
    console.error(err);

    setError(
      err?.response?.data?.message ||
      err?.response?.data ||
      "Failed to start work."
    );
  }
}async function handlePause() {
  if (!currentWork) {
    return;
  }

  try {
    setError("");

    const now = Date.now();

    /*
     * IMPORTANT:
     *
     * sessionStartedAt is the beginning of
     * the CURRENT active working session.
     *
     * If it doesn't exist, fall back to the
     * original workingStartedAt.
     */
    const sessionStartedAt =
      currentWork.sessionStartedAt ||
      currentWork.workingStartedAt ||
      currentWork.startedAt;

    let currentSessionSeconds = 0;

    if (sessionStartedAt) {
      const startDate =
        parseBackendUtc(sessionStartedAt);

      if (
        startDate &&
        !Number.isNaN(
          startDate.getTime()
        )
      ) {
        currentSessionSeconds =
          Math.max(
            0,
            Math.floor(
              (now -
                startDate.getTime()) /
                1000
            )
          );
      }
    }

    const previousSeconds =
      Number(
        currentWork.totalWorkingSeconds
      ) || 0;

    const totalWorkingSeconds =
      previousSeconds +
      currentSessionSeconds;

    await ticketService.updateTicket(
      currentWork.ticketId,
      {
        title: currentWork.title,
        description: currentWork.description,
        categoryId: currentWork.categoryId,
        priorityId:
          currentWork.priorityId,
        statusId: 2,
        assignedToUserId:
          currentWork.assignedToUserId,

        /*
         * KEEP THE ORIGINAL START TIME.
         */
        workingStartedAt:
          currentWork.originalWorkingStartedAt ||
          currentWork.workingStartedAt ||
          currentWork.startedAt,

        totalWorkingSeconds,

        isPaused: true,
      }
    );

    /*
     * Keep the original start time.
     * Remove the active session because
     * the ticket is now paused.
     */
    setCurrentWork((previous) => ({
      ...previous,

      originalWorkingStartedAt:
        previous.originalWorkingStartedAt ||
        previous.workingStartedAt ||
        previous.startedAt,

      sessionStartedAt: null,

      workingStartedAt:
        previous.originalWorkingStartedAt ||
        previous.workingStartedAt ||
        previous.startedAt,

      totalWorkingSeconds,

      isPaused: true,

      status: "Paused",
    }));

    await loadTickets();

  } catch (err) {
    console.error(err);

    setError(
      err?.response?.data?.message ||
      err?.response?.data ||
      "Failed to pause work."
    );
  }
}async function handleResume() {
  if (!currentWork) {
    return;
  }

  try {
    setError("");

    /*
     * Get the ORIGINAL Start Work time.
     */
    const originalStartedAt =
      currentWork.originalWorkingStartedAt ||
      currentWork.workingStartedAt ||
      currentWork.startedAt;

    if (!originalStartedAt) {
      setError(
        "Original work start time is missing."
      );
      return;
    }

    /*
     * This is ONLY the beginning of the
     * NEW active session.
     */
    const resumedAt =
      new Date().toISOString();

    const savedSeconds =
      Number(
        currentWork.totalWorkingSeconds
      ) || 0;

    await ticketService.updateTicket(
      currentWork.ticketId,
      {
        title: currentWork.title,
        description: currentWork.description,
        categoryId:
          currentWork.categoryId,
        priorityId:
          currentWork.priorityId,
        statusId: 2,
        assignedToUserId:
          currentWork.assignedToUserId,

        /*
         * NEVER replace the original start.
         */
        workingStartedAt:
          originalStartedAt,

        totalWorkingSeconds:
          savedSeconds,

        isPaused: false,
      }
    );

    /*
     * Store the new active session
     * separately in React.
     */
    setCurrentWork((previous) => ({
      ...previous,

      originalWorkingStartedAt:
        originalStartedAt,

      sessionStartedAt:
        resumedAt,

      workingStartedAt:
        originalStartedAt,

      totalWorkingSeconds:
        savedSeconds,

      isPaused: false,

      status: "In Progress",
    }));

    await loadTickets();

  } catch (err) {
    console.error(err);

    setError(
      err?.response?.data?.message ||
      err?.response?.data ||
      "Failed to resume work."
    );
  }
}
  async function handleFinishWork() {
  if (!currentWork) {
    return;
  }

  try {
    setError("");

    const now = Date.now();

    /*
     * ORIGINAL start time.
     * This is what we display as Started At.
     */
    const originalStartedAt =
      currentWork.originalWorkingStartedAt ||
      currentWork.workingStartedAt ||
      currentWork.startedAt;

    /*
     * Current active session.
     *
     * If the ticket was resumed, this is the
     * resume time.
     *
     * If it was never paused, it is the
     * original start time.
     */
    const sessionStartedAt =
      currentWork.sessionStartedAt ||
      currentWork.workingStartedAt ||
      currentWork.startedAt;

    const previousSeconds =
      Number(
        currentWork.totalWorkingSeconds
      ) || 0;

    let currentSessionSeconds = 0;

    /*
     * If currently working, calculate only
     * the CURRENT active session.
     */
    if (
      !currentWork.isPaused &&
      sessionStartedAt
    ) {
      const startDate =
        parseBackendUtc(
          sessionStartedAt
        );

      if (
        startDate &&
        !Number.isNaN(
          startDate.getTime()
        )
      ) {
        currentSessionSeconds =
          Math.max(
            0,
            Math.floor(
              (now -
                startDate.getTime()) /
                1000
            )
          );
      }
    }

    const totalWorkingSeconds =
      previousSeconds +
      currentSessionSeconds;

    const finishedAt =
      new Date().toISOString();

    await ticketService.updateTicket(
      currentWork.ticketId,
      {
        title: currentWork.title,
        description: currentWork.description,
        categoryId:
          currentWork.categoryId,
        priorityId:
          currentWork.priorityId,
        statusId: 4,
        assignedToUserId:
          currentWork.assignedToUserId,

        /*
         * Keep ORIGINAL Started At.
         */
        workingStartedAt:
          originalStartedAt,

        workingFinishedAt:
          finishedAt,

        totalWorkingSeconds,

        isPaused: false,
      }
    );

    setCurrentWork(null);

    await loadTickets();

  } catch (err) {
    console.error(err);

    setError(
      err?.response?.data?.message ||
      err?.response?.data ||
      "Failed to finish work."
    );
  }
}

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <AppLayout>
      <div className="page-header">
        <h1>Tickets</h1>

        {/* Employee and Admin can create tickets */}
        {(user?.role === "Admin" ||
          user?.role === "Employee") && (
          <Link
            className="button-link"
            to="/tickets/new"
          >
            + New Ticket
          </Link>
        )}
      </div>

      {/* =====================================================
          FILTERS
          ===================================================== */}

      <div className="filter-bar">
        {/* SEARCH */}
        <input
          type="text"
          placeholder="Search title, description, reference..."
          value={filters.search}
          onChange={(e) =>
            updateFilter(
              "search",
              e.target.value
            )
          }
        />

        {/* STATUS */}
        <select
          value={filters.statusId}
          onChange={(e) =>
            updateFilter(
              "statusId",
              e.target.value
            )
          }
        >
          <option value="">
            All statuses
          </option>

          {lookups.statuses.map((s) => (
            <option
              key={s.statusId}
              value={s.statusId}
            >
              {s.statusName}
            </option>
          ))}
        </select>

        {/* CATEGORY */}
        <select
          value={filters.categoryId}
          onChange={(e) =>
            updateFilter(
              "categoryId",
              e.target.value
            )
          }
        >
          <option value="">
            All categories
          </option>

          {lookups.categories.map((c) => (
            <option
              key={c.categoryId}
              value={c.categoryId}
            >
              {c.categoryName}
            </option>
          ))}
        </select>

        {/* PRIORITY */}
        <select
          value={filters.priorityId}
          onChange={(e) =>
            updateFilter(
              "priorityId",
              e.target.value
            )
          }
        >
          <option value="">
            All priorities
          </option>

          {lookups.priorities.map((p) => (
            <option
              key={p.priorityId}
              value={p.priorityId}
            >
              {p.priorityName}
            </option>
          ))}
        </select>

        {/* =================================================
            DATE FILTER
            ================================================= */}

        <select
          value={dateFilter}
          onChange={(e) =>
            setDateFilter(e.target.value)
          }
        >
          <option value="">
            All dates
          </option>

          <option value="today">
            Today
          </option>

          <option value="yesterday">
            Yesterday
          </option>

          <option value="last3days">
            Last 3 days
          </option>

          <option value="last7days">
            Last 7 days
          </option>

          <option value="last30days">
            Last 30 days
          </option>

          <option value="thisweek">
            This week
          </option>

          <option value="lastweek">
            Last week
          </option>

          <option value="thismonth">
            This month
          </option>

          <option value="lastmonth">
            Last month
          </option>
        </select>
      </div>

      {/* =====================================================
          ERROR
          ===================================================== */}

      {error && (
        <div className="error-banner">
          {error}
        </div>
      )}

      {/* =====================================================
          TICKET TABLE
          ===================================================== */}

      {loading ? (
        <p className="muted">
          Loading tickets...
        </p>
      ) : (
        (() => {
          const isAgent =
            user?.role ===
            "IT Support Agent";

          // Start with all loaded tickets
          let displayedTickets = tickets;

          // =================================================
          // AGENT FILTER
          // Hide Resolved and Closed when no status selected
          // =================================================

          if (
            isAgent &&
            !filters.statusId
          ) {
            displayedTickets =
              displayedTickets.filter(
                (t) =>
                  t.statusName !==
                    "Resolved" &&
                  t.statusName !==
                    "Closed"
              );
          }

          // =================================================
          // DATE FILTER
          // =================================================

          if (dateFilter) {
            displayedTickets =
              displayedTickets.filter(
                (t) =>
                  isTicketInDateRange(
                    t.createdDate,
                    dateFilter
                  )
              );
          }

          // =================================================
          // NO RESULTS
          // =================================================

          if (
            displayedTickets.length === 0
          ) {
            return (
              <p className="muted">
                No tickets match these filters.
              </p>
            );
          }

          // =================================================
          // TABLE
          // =================================================

          return (
            <table className="ticket-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Assigned to</th>
                  <th>Created</th>

                  {(user?.role === "Admin" ||
                    user?.role === "Manager") && (
                    <>
                      <th>Start Time</th>
                      <th>Finish Time</th>
                      <th>Total Time</th>
                      <th>Created By</th>
                      <th>Completed By</th>
                    </>
                  )}

                  {(user?.role === "Employee" ||
                    user?.role ===
                      "IT Support Agent") && (
                    <th>Action</th>
                  )}
                </tr>
              </thead>

              <tbody>
                {displayedTickets.map(
                  (t) => {
                    const isAssignedToMe =
                      t.assignedToUserName ===
                      user?.fullName;

                    // Find this agent's request
                    const myRequest =
                      myRequests.find(
                        (r) =>
                          r.ticketId ===
                          t.ticketId
                      );

                    // Agent can request
                    // an unassigned Open ticket
                    const canRequest =
                      isAgent &&
                      t.statusName ===
                        "Open" &&
                      !t.assignedToUserName &&
                      !myRequest;

                    // Request waiting for Manager/Admin
                    const requestIsPending =
                      isAgent &&
                      myRequest?.status ===
                        "Pending";

                    return (
                      <tr
                        key={t.ticketId}
                      >
                        {/* =================================
                            REFERENCE
                            ================================= */}

                        <td>
                          <Link
                            to={`/tickets/${t.ticketId}`}
                          >
                            {t.ticketReference}
                          </Link>
                        </td>

                        {/* =================================
                            TITLE
                            ================================= */}

                        <td>
                          {t.title}
                        </td>

                        {/* =================================
                            CATEGORY
                            ================================= */}

                        <td>
                          {t.categoryName}
                        </td>

                        {/* =================================
                            PRIORITY
                            ================================= */}

                        <td>
                          <span
                            className={`badge priority-${t.priorityName.toLowerCase()}`}
                          >
                            {t.priorityName}
                          </span>
                        </td>

                        {/* =================================
                            STATUS
                            ================================= */}

                        <td>
                          <span
                            className={`badge status-${t.statusName
                              .replace(
                                /\s+/g,
                                ""
                              )
                              .toLowerCase()}`}
                          >
                            {t.statusName}
                          </span>
                        </td>

                        {/* =================================
                            ASSIGNED TO
                            ================================= */}

                        <td>
                          {t.assignedToUserName ||
                            "Unassigned"}
                        </td>

                        {/* =================================
                            CREATED
                            ================================= */}

                        <td>
                          {new Date(
                            t.createdDate
                          ).toLocaleDateString()}
                        </td>

                        {/* =================================
                            ADMIN / MANAGER COLUMNS
                            ================================= */}

                        {(user?.role ===
                          "Admin" ||
                          user?.role ===
                            "Manager") && (
                          <>
                            <td>
  {t.workingStartedAt
    ? (() => {
        const date = parseBackendUtc(
          t.workingStartedAt
        );

        return date
          ? date.toLocaleString()
          : "-";
      })()
    : "-"}
</td>

<td>
  {t.workingFinishedAt
    ? (() => {
        const date = parseBackendUtc(
          t.workingFinishedAt
        );

        return date
          ? date.toLocaleString()
          : "-";
      })()
    : "-"}
</td>

                            <td>
                              {t.totalWorkingSeconds
                                ? formatWorkingTime(
                                    t.totalWorkingSeconds
                                  )
                                : "-"}
                            </td>

                            <td>
                              {t.createdByUserName ||
                                "-"}
                            </td>

                            <td>
                              {(
                                t.statusName ===
                                  "Resolved" ||
                                t.statusName ===
                                  "Closed"
                              )
                                ? t.assignedToUserName ||
                                  "-"
                                : "-"}
                            </td>
                          </>
                        )}

                        {/* =================================
                            ACTION
                            ================================= */}

                        {(user?.role ===
                          "Employee" ||
                          user?.role ===
                            "IT Support Agent") && (
                          <td>
                            {/* ============================
                                EMPLOYEE
                                ============================ */}

                            {user?.role ===
                              "Employee" &&
                              t.statusName ===
                                "Open" && (
                                <Link
                                  className="edit-icon"
                                  to={`/tickets/${t.ticketId}/edit`}
                                  title="Edit ticket"
                                >
                                  ✏️
                                </Link>
                              )}

                            {/* ============================
                                AGENT
                                ============================ */}

                            {isAgent && (
                              <>
                                {/* REQUEST */}
                                {canRequest && (
                                  <button
                                    className="button-link"
                                    onClick={() =>
                                      handleRequestToWork(
                                        t.ticketId
                                      )
                                    }
                                    disabled={
                                      requestingTicketId ===
                                      t.ticketId
                                    }
                                  >
                                    {requestingTicketId ===
                                    t.ticketId
                                      ? "Request Sending..."
                                      : "Request"}
                                  </button>
                                )}

                                {/* REQUEST PENDING */}
                                {requestIsPending && (
                                  <span className="muted">
                                    Request Sending
                                  </span>
                                )}

                                {/* APPROVED + ASSIGNED */}
                                {isAssignedToMe &&
                                  t.statusName ===
                                    "Open" && (
                                    <button
                                      className="button-link"
                                      onClick={() =>
                                        handleStartWork(
                                          t
                                        )
                                      }
                                    >
                                      Start Work
                                    </button>
                                  )}
                              </>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          );
        })()
      )}

      {/* =====================================================
          CURRENT WORK
          ===================================================== */}

      {currentWork && (
        <CurrentWork
          ticket={currentWork}
          onPause={handlePause}
          onResume={handleResume}
          onFinish={handleFinishWork}
        />
      )}

      {/* =====================================================
          COMPLETED WORK
          ===================================================== */}

      {user?.role ===
        "IT Support Agent" &&
        (() => {
          const completedTickets =
            tickets
              .filter(
                (t) =>
                  t.assignedToUserName ===
                    user?.fullName &&
                  (
                    t.statusName ===
                      "Resolved" ||
                    t.statusName ===
                      "Closed"
                  )
              )
              .map((t) => ({
                ...t,
                startedAt:
                  t.workingStartedAt,
                finishedAt:
                  t.workingFinishedAt,
                createdByName:
                  t.createdByUserName,
                assignedToName:
                  t.assignedToUserName,
              }));

          return (
            <CompletedWork
              tickets={completedTickets}
            />
          );
        })()}
    </AppLayout>
  );
}