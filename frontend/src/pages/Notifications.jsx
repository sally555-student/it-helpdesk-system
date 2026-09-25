
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "../components/AppLayout";
import * as ticketService from "../services/ticketService";

/* =========================================================
   HELPERS
========================================================= */

const statusKey = (value = "") =>
  String(value)
    .replace(/\s+/g, "")
    .toLowerCase();

/*
  Backend timestamps are UTC.

  If backend sends:
    2026-08-31T08:30:00
  treat it as UTC.

  If backend sends:
    2026-08-31T08:30:00Z
  or:
    2026-08-31T08:30:00+00:00
  keep timezone information.
*/
function parseBackendUtc(value) {
  if (!value) return null;

  const text = String(value).trim();

  if (!text) return null;

  if (
    text.endsWith("Z") ||
    /[+-]\d{2}:\d{2}$/.test(text)
  ) {
    const date = new Date(text);

    return Number.isNaN(date.getTime())
      ? null
      : date;
  }

  const utcText = `${text}Z`;

  const date = new Date(utcText);

  return Number.isNaN(date.getTime())
    ? null
    : date;
}

/* =========================================================
   CURRENT USER
========================================================= */

function getCurrentUser() {
  try {
    /*
      Adjust these keys only if your AuthContext uses
      different localStorage names.
    */

    const possibleKeys = [
      "user",
      "currentUser",
      "helpdesk-user",
    ];

    for (const key of possibleKeys) {
      const value = localStorage.getItem(key);

      if (!value) continue;

      try {
        const parsed = JSON.parse(value);

        if (parsed) {
          return parsed;
        }
      } catch {
        // Ignore invalid JSON and try next key
      }
    }

    return null;
  } catch {
    return null;
  }
}

/* =========================================================
   GET COMMENTS
========================================================= */

async function getTicketComments(ticketId) {
  /*
    We intentionally keep this frontend-only.

    The backend already exposes:
      GET /api/tickets/{ticketId}/comments

    We use fetch directly here so no backend notification
    system is required.
  */

  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("jwt") ||
    localStorage.getItem("accessToken");

  const baseUrl =
    import.meta.env.VITE_API_URL ||
    "https://localhost:58752/api";

  const response = await fetch(
    `${baseUrl}/tickets/${ticketId}/comments`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {}),
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to load comments for ticket ${ticketId}`
    );
  }

  return await response.json();
}

/* =========================================================
   TICKET NOTIFICATION
========================================================= */

function notificationForTicket(ticket) {
  const status = statusKey(ticket.statusName);

  if (status === "resolved") {
    return {
      id: `${ticket.ticketId}-resolved`,
      type: "resolved",
      title: "Ticket resolved",
      text: `${ticket.ticketReference} has been marked as resolved.`,
      date:
        ticket.resolvedDate ||
        ticket.resolvedAt ||
        ticket.updatedDate ||
        ticket.updatedAt ||
        ticket.createdDate ||
        ticket.createdAt,
      ticketId: ticket.ticketId,
    };
  }

  if (status === "closed") {
    return {
      id: `${ticket.ticketId}-closed`,
      type: "closed",
      title: "Ticket closed",
      text: `${ticket.ticketReference} has been closed.`,
      date:
        ticket.closedDate ||
        ticket.closedAt ||
        ticket.updatedDate ||
        ticket.updatedAt ||
        ticket.createdDate ||
        ticket.createdAt,
      ticketId: ticket.ticketId,
    };
  }

  if (
    ticket.assignedToUserName ||
    ticket.assignedToName ||
    ticket.assignedToFullName
  ) {
    const assignedName =
      ticket.assignedToUserName ||
      ticket.assignedToName ||
      ticket.assignedToFullName;

    return {
      id: `${ticket.ticketId}-assigned`,
      type: "assigned",
      title: "Ticket assigned",
      text: `${ticket.ticketReference} is assigned to ${assignedName}.`,
      date:
        ticket.updatedDate ||
        ticket.updatedAt ||
        ticket.createdDate ||
        ticket.createdAt,
      ticketId: ticket.ticketId,
    };
  }

  return {
    id: `${ticket.ticketId}-created`,
    type: "created",
    title: "New ticket created",
    text: `${ticket.ticketReference}: ${ticket.title}`,
    date:
      ticket.createdDate ||
      ticket.createdAt,
    ticketId: ticket.ticketId,
  };
}

/* =========================================================
   COMMENT NOTIFICATIONS
========================================================= */

function commentNotificationFor(
  comment,
  ticket,
  currentUser
) {
  if (!comment) return null;

  /*
    Don't notify the user about their own comment.
  */

  const currentUserId =
    currentUser?.userId ??
    currentUser?.id ??
    currentUser?.UserId;

  const commentUserId =
    comment.userId ??
    comment.UserId;

  if (
    currentUserId != null &&
    commentUserId != null &&
    Number(currentUserId) === Number(commentUserId)
  ) {
    return null;
  }

  const commenterName =
    comment.userName ||
    comment.UserName ||
    "Someone";

  const commentText =
    comment.commentText ||
    comment.CommentText ||
    "";

  const createdDate =
    comment.createdDate ||
    comment.CreatedDate;

  return {
    id: `comment-${comment.commentId}`,
    type: "comment",
    title: "New comment",
    text: `${commenterName} commented on ${
      ticket.ticketReference
    }: "${commentText}"`,
    date: createdDate,
    ticketId: ticket.ticketId,
  };
}

/* =========================================================
   BELL ICON
========================================================= */

function BellIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21h4" />
    </svg>
  );
}

/* =========================================================
   NOTIFICATION ICON
========================================================= */

function NotificationIcon({ type }) {
  const icons = {
    created: (
      <path d="M12 8v8M8 12h8" />
    ),

    assigned: (
      <>
        <circle
          cx="12"
          cy="8"
          r="3"
        />

        <path d="M5.5 20c.8-3.5 3-5.2 6.5-5.2s5.7 1.7 6.5 5.2" />
      </>
    ),

    resolved: (
      <path d="m5 12 4 4L19 6" />
    ),

    closed: (
      <>
        <path d="m5 12 4 4L19 6" />

        <circle
          cx="12"
          cy="12"
          r="9"
        />
      </>
    ),

    comment: (
      <>
        <path d="M5 5h14v10H9l-4 4V5z" />
        <path d="M8 9h8" />
        <path d="M8 12h5" />
      </>
    ),
  };

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {icons[type] || icons.created}
    </svg>
  );
}

/* =========================================================
   FORMAT NOTIFICATION TIME
========================================================= */

function formatDate(value) {
  const date = parseBackendUtc(value);

  if (!date) {
    return "";
  }

  const now = Date.now();
  const timestamp = date.getTime();

  let diff = now - timestamp;

  /*
    Protect against small clock differences.
  */

  if (diff < 0) {
    diff = 0;
  }

  const minutes = Math.floor(
    diff / 60000
  );

  if (minutes < 1) {
    return "Just now";
  }

  if (minutes < 60) {
    return `${minutes} min ago`;
  }

  const hours = Math.floor(
    minutes / 60
  );

  if (hours < 24) {
    return `${hours} hr ago`;
  }

  const days = Math.floor(
    hours / 24
  );

  if (days < 7) {
    return `${days} day${
      days === 1 ? "" : "s"
    } ago`;
  }

  return date.toLocaleDateString();
}

/* =========================================================
   NOTIFICATIONS PAGE
========================================================= */

export default function Notifications() {
  const [tickets, setTickets] = useState([]);

  const [commentNotifications, setCommentNotifications] =
    useState([]);

  const [readIds, setReadIds] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem(
          "helpdesk-read-notifications"
        ) || "[]"
      );
    } catch {
      return [];
    }
  });

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  /* =======================================================
     LOAD TICKETS + COMMENTS
  ======================================================= */

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setError("");

        const data =
          await ticketService.getTickets();

        if (!mounted) return;

        const ticketList =
          Array.isArray(data)
            ? data
            : [];

        setTickets(ticketList);

        /*
          Get current logged-in user.
        */
        const currentUser =
          getCurrentUser();

        /*
          Load comments for all tickets.

          Promise.allSettled means one ticket failing
          to load comments will NOT break all notifications.
        */

        const commentResults =
          await Promise.allSettled(
            ticketList.map(async (ticket) => {
              const comments =
                await getTicketComments(
                  ticket.ticketId
                );

              return {
                ticket,
                comments:
                  Array.isArray(comments)
                    ? comments
                    : [],
              };
            })
          );

        if (!mounted) return;

        const generatedCommentNotifications =
          [];

        commentResults.forEach(
          (result) => {
            if (
              result.status !== "fulfilled"
            ) {
              return;
            }

            const {
              ticket,
              comments,
            } = result.value;

            comments.forEach(
              (comment) => {
                const notification =
                  commentNotificationFor(
                    comment,
                    ticket,
                    currentUser
                  );

                if (notification) {
                  generatedCommentNotifications.push(
                    notification
                  );
                }
              }
            );
          }
        );

        setCommentNotifications(
          generatedCommentNotifications
        );
      } catch (err) {
        console.error(
          "Notifications loading error:",
          err
        );

        if (mounted) {
          setError(
            "Couldn't load notifications. Try refreshing the page."
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    load();

    /*
      Refresh every 30 seconds.

      This allows a newly-created comment to appear
      without manually refreshing the page.
    */

    const interval = setInterval(
      load,
      30000
    );

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  /* =======================================================
     BUILD ALL NOTIFICATIONS
  ======================================================= */

  const notifications = useMemo(() => {
    const ticketNotifications =
      tickets.map(
        notificationForTicket
      );

    const allNotifications = [
      ...ticketNotifications,
      ...commentNotifications,
    ];

    return allNotifications.sort(
      (a, b) => {
        const dateA =
          parseBackendUtc(a.date);

        const dateB =
          parseBackendUtc(b.date);

        return (
          (dateB?.getTime() || 0) -
          (dateA?.getTime() || 0)
        );
      }
    );
  }, [
    tickets,
    commentNotifications,
  ]);

  /* =======================================================
     UNREAD COUNT
  ======================================================= */

  const unreadCount =
    notifications.filter(
      (item) =>
        !readIds.includes(item.id)
    ).length;

  /* =======================================================
     MARK ONE AS READ
  ======================================================= */

  function markAsRead(id) {
    setReadIds((current) => {
      if (current.includes(id)) {
        return current;
      }

      const next = [
        ...current,
        id,
      ];

      localStorage.setItem(
        "helpdesk-read-notifications",
        JSON.stringify(next)
      );

      return next;
    });
  }

  /* =======================================================
     MARK ALL AS READ
  ======================================================= */

  function markAllAsRead() {
    const ids =
      notifications.map(
        (item) => item.id
      );

    setReadIds(ids);

    localStorage.setItem(
      "helpdesk-read-notifications",
      JSON.stringify(ids)
    );
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <AppLayout
      notificationCount={
        unreadCount
      }
    >
      <div className="notifications-page">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="notifications-header">

          <div>
            <p className="dashboard-eyebrow">
              ACTIVITY
            </p>

            <h1>
              Notifications
            </h1>

            <p>
              Stay up to date with your latest
              ticket activity.
            </p>
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              className="notifications-read-all"
              onClick={
                markAllAsRead
              }
            >
              Mark all as read
            </button>
          )}

        </div>

        {/* =================================================
            ERROR
        ================================================= */}

        {error && (
          <div className="error-banner">
            {error}
          </div>
        )}

        {/* =================================================
            LOADING
        ================================================= */}

        {loading ? (
          <div className="dashboard-loading">

            <div className="dashboard-loading-spinner" />

            <span>
              Loading notifications...
            </span>

          </div>

        ) : notifications.length === 0 ? (

          /* =================================================
             EMPTY
          ================================================= */

          <div className="notifications-empty">

            <div className="notifications-empty-icon">
              <BellIcon />
            </div>

            <h2>
              You're all caught up
            </h2>

            <p>
              There are no ticket
              notifications to show yet.
            </p>

          </div>

        ) : (

          /* =================================================
             NOTIFICATION LIST
          ================================================= */

          <div className="notifications-list">

            {notifications.map(
              (notification) => {

                const unread =
                  !readIds.includes(
                    notification.id
                  );

                return (
                  <Link
                    to={`/tickets/${notification.ticketId}`}
                    key={
                      notification.id
                    }
                    className={`notification-card ${
                      unread
                        ? "unread"
                        : ""
                    }`}
                    onClick={() =>
                      markAsRead(
                        notification.id
                      )
                    }
                  >

                    {/* ICON */}

                    <div
                      className={`notification-icon ${notification.type}`}
                    >
                      <NotificationIcon
                        type={
                          notification.type
                        }
                      />
                    </div>

                    {/* CONTENT */}

                    <div className="notification-content">

                      <div className="notification-title-row">

                        <strong>
                          {
                            notification.title
                          }
                        </strong>

                        {unread && (
                          <span className="notification-unread-dot" />
                        )}

                      </div>

                      <p>
                        {
                          notification.text
                        }
                      </p>

                      <span className="notification-date">
                        {formatDate(
                          notification.date
                        )}
                      </span>

                    </div>

                    {/* ARROW */}

                    <span className="notification-arrow">
                      ›
                    </span>

                  </Link>
                );
              }
            )}

          </div>
        )}

      </div>
    </AppLayout>
  );
}
