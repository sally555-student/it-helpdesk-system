import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import * as ticketService from "../services/ticketService";

export default function AppLayout({
  children,
  notificationCount = 0,
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // ================= NOTIFICATIONS =================
  const [liveNotificationCount, setLiveNotificationCount] =
    useState(notificationCount);

  useEffect(() => {
    let mounted = true;

    async function loadNotificationCount() {
      try {
        const tickets = await ticketService.getTickets();

        const readIds = JSON.parse(
          localStorage.getItem(
            "helpdesk-read-notifications"
          ) || "[]"
        );

        const unread = (
          Array.isArray(tickets) ? tickets : []
        ).filter((ticket) => {
          const status = (ticket.statusName || "")
            .replace(/\s+/g, "")
            .toLowerCase();

          const type =
            status === "resolved"
              ? "resolved"
              : status === "closed"
              ? "closed"
              : ticket.assignedToUserName
              ? "assigned"
              : "created";

          return !readIds.includes(
            `${ticket.ticketId}-${type}`
          );
        }).length;

        if (mounted) {
          setLiveNotificationCount(unread);
        }
      } catch {
        // Notifications are secondary UI.
        // Keep the layout usable if API is unavailable.
      }
    }

    loadNotificationCount();

    return () => {
      mounted = false;
    };
  }, [notificationCount, location.pathname]);

  const displayedNotificationCount =
    notificationCount || liveNotificationCount;

  // ================= LOGOUT =================
  function handleLogout() {
    logout();
    navigate("/login");
  }

  // ================= ROLES =================
  const isAgent =
    user?.role === "Agent" ||
    user?.role === "IT Support Agent";

  const isManager = user?.role === "Manager";
  const isAdmin = user?.role === "Admin";
  const isEmployee = user?.role === "Employee";

  return (
    <div
      className={`app-shell ${
        sidebarOpen ? "" : "sidebar-collapsed"
      }`}
    >
      {/* =====================================================
          SIDEBAR
      ====================================================== */}
      <aside className="sidebar">

        {/* ================= LOGO ================= */}
        <button
          type="button"
          className="sidebar-logo"
          onClick={() =>
            setSidebarOpen((prev) => !prev)
          }
          title={
            sidebarOpen
              ? "Collapse sidebar"
              : "Expand sidebar"
          }
        >
          <div className="sidebar-logo-icon">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M18 10a6 6 0 0 0-12 0v4" />
              <path d="M6 14H4a2 2 0 0 1-2-2v-1a2 2 0 0 1 2-2h2" />
              <path d="M18 14h2a2 2 0 0 0 2-2v-1a2 2 0 0 0-2-2h-2" />
              <path d="M18 14v2a2 2 0 0 1-2 2h-2" />
              <path d="M14 18h-2" />
            </svg>
          </div>

          <span>IT Help Desk</span>
        </button>

        {/* ================= NAVIGATION ================= */}
        <nav className="sidebar-navigation">

          {/* ================= ADMIN SETTINGS ================= */}
          {isAdmin && (
            <Link
              to="/admin-settings"
              className={`sidebar-link ${
                location.pathname === "/admin-settings"
                  ? "active"
                  : ""
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-1.7 1.7-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V20h-2.4v-.2a1.7 1.7 0 0 0-1.03-1.56 1.7 1.7 0 0 0-1.88.34l-.06.06-1.7-1.7.06-.06A1.7 1.7 0 0 0 8.4 15a1.7 1.7 0 0 0-1.56-1.03H6v-2.4h.84A1.7 1.7 0 0 0 8.4 10a1.7 1.7 0 0 0-.34-1.88L8 8.06l1.7-1.7.06.06a1.7 1.7 0 0 0 1.88.34A1.7 1.7 0 0 0 12.67 5.2V5h2.4v.2a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06 1.7 1.7-.06.06a1.7 1.7 0 0 0-.34 1.88 1.7 1.7 0 0 0 1.56 1.03H22v2.4h-.2a1.7 1.7 0 0 0-1.56 1.03Z" />
              </svg>

              <span>Admin Settings</span>
            </Link>
          )}

          {/* ================= DASHBOARD ================= */}
          <Link
            to="/dashboard"
            className={`sidebar-link ${
              location.pathname === "/dashboard"
                ? "active"
                : ""
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <rect
                x="4"
                y="4"
                width="6"
                height="6"
                rx="1"
              />
              <rect
                x="14"
                y="4"
                width="6"
                height="6"
                rx="1"
              />
              <rect
                x="4"
                y="14"
                width="6"
                height="6"
                rx="1"
              />
              <rect
                x="14"
                y="14"
                width="6"
                height="6"
                rx="1"
              />
            </svg>

            <span>Dashboard</span>
          </Link>

          {/* ================= TICKETS ================= */}
          <Link
            to="/tickets"
            className={`sidebar-link ${
              location.pathname === "/tickets" ||
              location.pathname.startsWith("/tickets/")
                ? "active"
                : ""
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M20 13l-7 7-9-3-2-7 7-7 9 3z" />
              <path d="M8 12l4-4" />
              <path d="M12 16l4-4" />
            </svg>

            <span>Tickets</span>
          </Link>

          {/* ================= NOTIFICATIONS ================= */}
          <Link
            to="/notifications"
            className={`sidebar-link ${
              location.pathname === "/notifications"
                ? "active"
                : ""
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
              <path d="M10 21h4" />
            </svg>

            <span>Notifications</span>

            {displayedNotificationCount > 0 && (
              <span className="sidebar-notification-count">
                {displayedNotificationCount > 99
                  ? "99+"
                  : displayedNotificationCount}
              </span>
            )}
          </Link>

          {/* ================= AGENT: MY REQUESTS ================= */}
          {isAgent && (
            <Link
              to="/assignment-requests"
              className={`sidebar-link ${
                location.pathname ===
                "/assignment-requests"
                  ? "active"
                  : ""
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                <path d="M10 21h4" />
              </svg>

              <span>My Requests</span>
            </Link>
          )}

          {/* ================= MANAGER / ADMIN ================= */}
          {(isManager || isAdmin) && (
            <Link
              to="/assignment-requests/manage"
              className={`sidebar-link ${
                location.pathname ===
                "/assignment-requests/manage"
                  ? "active"
                  : ""
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                <path d="M10 21h4" />
              </svg>

              <span>Assignment Requests</span>
            </Link>
          )}

          {/* ================= IT AGENTS ================= */}
          {(isAdmin || isManager) && (
            <Link
              to="/agents"
              className={`sidebar-link ${
                location.pathname === "/agents"
                  ? "active"
                  : ""
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <circle cx="9" cy="7" r="3" />
                <path d="M3 21c0-4 2.5-7 6-7s6 3 6 7" />
                <circle cx="17" cy="8" r="2.5" />
                <path d="M15 14c3 0 5 2.5 5 6" />
              </svg>

              <span>IT Agents</span>
            </Link>
          )}

          {/* ================= NEW TICKET ================= */}
          {(isAdmin || isEmployee) && (
            <Link
              to="/tickets/new"
              className={`sidebar-link ${
                location.pathname === "/tickets/new"
                  ? "active"
                  : ""
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v8" />
                <path d="M8 12h8" />
              </svg>

              <span>New Ticket</span>
            </Link>
          )}

        </nav>
      </aside>

      {/* =====================================================
          MAIN
      ====================================================== */}
      <div className="app-main">

        {/* ================= HEADER ================= */}
        <header className="app-header">

          {/* Notification */}
          <div className="header-actions">
            <Link
              className="header-notification"
              to="/notifications"
              title="Notifications"
            >
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

              {displayedNotificationCount > 0 && (
                <span className="header-notification-badge">
                  {displayedNotificationCount > 99
                    ? "99+"
                    : displayedNotificationCount}
                </span>
              )}
            </Link>
          </div>

          {/* ================= USER ================= */}
          <div className="header-user">

            <button
              type="button"
              className="header-profile-button"
              onClick={() => navigate("/profile")}
            >
              <div className="header-user-info">
                <div className="header-user-name">
                  {user?.fullName || "User"}
                </div>

                <div className="header-role">
                  {user?.role || "Employee"}
                </div>
              </div>

              <div className="header-avatar">
                {user?.fullName
                  ?.charAt(0)
                  ?.toUpperCase() || "U"}
              </div>
            </button>

            {/* ================= CHEVRON ================= */}
            <button
              type="button"
              className="header-chevron"
              onClick={() =>
                setProfileMenuOpen((prev) => !prev)
              }
              title="Account menu"
              aria-label="Account menu"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>

            {/* ================= PROFILE DROPDOWN ================= */}
            {profileMenuOpen && (
              <div className="profile-dropdown">

                <button
                  type="button"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    navigate("/profile");
                  }}
                >
                  <span>👤</span>
                  My Profile
                </button>

                <div className="profile-dropdown-divider" />

                <button
                  type="button"
                  className="profile-logout"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    handleLogout();
                  }}
                >
                  <span>↪</span>
                  Logout
                </button>

              </div>
            )}

          </div>
        </header>

        {/* =====================================================
            DECORATIVE BACKGROUND
        ====================================================== */}
        <div className="decorative-shape decorative-top-right" />

        <div className="decorative-shape decorative-bottom-left" />

        <div className="decorative-shape decorative-bottom-left-inner" />

        <div className="decorative-shape decorative-bottom-right" />

        {/* ================= TOP DOTS ================= */}
        <div className="decorative-dots dots-top">
          {Array.from({ length: 15 }).map(
            (_, index) => (
              <span key={index} />
            )
          )}
        </div>

        {/* ================= BOTTOM DOTS ================= */}
        <div className="decorative-dots dots-bottom">
          {Array.from({ length: 15 }).map(
            (_, index) => (
              <span key={index} />
            )
          )}
        </div>

        {/* ================= PAGE CONTENT ================= */}
        <main className="app-content">
          {children}
        </main>

      </div>
    </div>
  );
}