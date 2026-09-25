import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../components/AppLayout";
import { useAuth } from "../context/AuthContext";
import * as adminService from "../services/adminService";
import "./AdminSettings.css";

export default function AdminSettings() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeSection, setActiveSection] = useState("users");

  // =========================================================
  // USERS
  // =========================================================

  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const [selectedUser, setSelectedUser] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // =========================================================
  // ADMIN PROTECTION
  // =========================================================

  useEffect(() => {
    if (user && user.role !== "Admin") {
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate]);

  // =========================================================
  // LOAD USERS
  // =========================================================

  useEffect(() => {
    if (user?.role !== "Admin") return;

    loadUsers();
  }, [user]);

  async function loadUsers() {
    try {
      setLoadingUsers(true);
      setError("");

      const data = await adminService.getUsers();

      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load users:", err);

      setError(
        err.response?.data?.message ||
          "Unable to load users. Please try again."
      );
    } finally {
      setLoadingUsers(false);
    }
  }

  // =========================================================
  // ENABLE / DISABLE USER
  // =========================================================

  async function handleToggleUser() {
    if (!selectedUser) return;

    const newStatus = !selectedUser.isActive;

    const action = newStatus ? "enable" : "disable";

    const confirmed = window.confirm(
      newStatus
        ? `Enable ${selectedUser.fullName}'s account?`
        : `Disable ${selectedUser.fullName}'s account?`
    );

    if (!confirmed) return;

    try {
      setActionLoading(true);
      setError("");

      await adminService.updateUserStatus(
        selectedUser.userId,
        newStatus
      );

      setUsers((currentUsers) =>
        currentUsers.map((item) =>
          item.userId === selectedUser.userId
            ? {
                ...item,
                isActive: newStatus,
              }
            : item
        )
      );

      setSelectedUser(null);
    } catch (err) {
      console.error(`Failed to ${action} user:`, err);

      setError(
        err.response?.data?.message ||
          `Unable to ${action} the user. Please try again.`
      );
    } finally {
      setActionLoading(false);
    }
  }

  // =========================================================
  // FILTER USERS
  // =========================================================

  const filteredUsers = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    return users.filter((item) => {
      const matchesSearch =
        !searchValue ||
        item.fullName?.toLowerCase().includes(searchValue) ||
        item.email?.toLowerCase().includes(searchValue) ||
        String(item.userId).includes(searchValue);

      const matchesRole =
        roleFilter === "All" ||
        item.roleName === roleFilter;

      const matchesStatus =
        statusFilter === "All" ||
        (statusFilter === "Active" && item.isActive) ||
        (statusFilter === "Inactive" && !item.isActive);

      return (
        matchesSearch &&
        matchesRole &&
        matchesStatus
      );
    });
  }, [users, search, roleFilter, statusFilter]);

  // =========================================================
  // STATISTICS
  // =========================================================

  const totalUsers = users.length;

  const activeUsers = users.filter(
    (item) => item.isActive
  ).length;

  const inactiveUsers = users.filter(
    (item) => !item.isActive
  ).length;

  const agents = users.filter(
    (item) => item.roleName === "IT Support Agent"
  ).length;

  // =========================================================
  // ADMIN CHECK
  // =========================================================

  if (!user || user.role !== "Admin") {
    return null;
  }

  return (
    <AppLayout>
      <div className="admin-settings-page">

        {/* =====================================================
            HEADER
        ====================================================== */}

        <div className="admin-settings-header">

          <div>
            <div className="admin-breadcrumb">
              Administration
            </div>

            <h1>Admin Settings</h1>

            <p>
              Manage users, categories and monitor system activity.
            </p>
          </div>

          <div className="admin-header-badge">
            <span className="admin-shield">
              ◆
            </span>

            Administrator
          </div>

        </div>


        {/* =====================================================
            STATISTICS
        ====================================================== */}

        <div className="admin-stats">

          <div className="admin-stat-card">

            <div className="admin-stat-icon users-icon">
              👥
            </div>

            <div>
              <span>Total Users</span>
              <strong>{totalUsers}</strong>
            </div>

          </div>


          <div className="admin-stat-card">

            <div className="admin-stat-icon active-icon">
              ✓
            </div>

            <div>
              <span>Active Users</span>
              <strong>{activeUsers}</strong>
            </div>

          </div>


          <div className="admin-stat-card">

            <div className="admin-stat-icon inactive-icon">
              !
            </div>

            <div>
              <span>Inactive Users</span>
              <strong>{inactiveUsers}</strong>
            </div>

          </div>


          <div className="admin-stat-card">

            <div className="admin-stat-icon agent-icon">
              ◉
            </div>

            <div>
              <span>IT Agents</span>
              <strong>{agents}</strong>
            </div>

          </div>

        </div>


        {/* =====================================================
            SETTINGS NAVIGATION
        ====================================================== */}

        <div className="admin-settings-grid">

          {/* USERS */}

          <button
            type="button"
            className={`admin-section-card ${
              activeSection === "users"
                ? "selected"
                : ""
            }`}
            onClick={() =>
              setActiveSection("users")
            }
          >

            <div className="admin-section-icon">
              👥
            </div>

            <div className="admin-section-content">

              <h3>
                Users
              </h3>

              <p>
                Manage accounts, roles and access.
              </p>

            </div>

            <span className="admin-section-arrow">
              →
            </span>

          </button>


          {/* CATEGORIES */}

          <button
            type="button"
            className={`admin-section-card ${
              activeSection === "categories"
                ? "selected"
                : ""
            }`}
            onClick={() =>
              setActiveSection("categories")
            }
          >

            <div className="admin-section-icon">
              🏷
            </div>

            <div className="admin-section-content">

              <h3>
                Categories
              </h3>

              <p>
                Add or delete ticket categories.
              </p>

            </div>

            <span className="admin-section-arrow">
              →
            </span>

          </button>


          {/* ACTIVITY */}

          <button
            type="button"
            className={`admin-section-card ${
              activeSection === "activity"
                ? "selected"
                : ""
            }`}
            onClick={() =>
              setActiveSection("activity")
            }
          >

            <div className="admin-section-icon">
              📋
            </div>

            <div className="admin-section-content">

              <h3>
                Activity Log
              </h3>

              <p>
                Monitor important system actions.
              </p>

            </div>

            <span className="admin-section-arrow">
              →
            </span>

          </button>

        </div>


        {/* =====================================================
            USERS
        ====================================================== */}

        {activeSection === "users" && (

          <section className="admin-panel">

            <div className="admin-panel-header">

              <div>

                <div className="admin-panel-label">
                  USER MANAGEMENT
                </div>

                <h2>
                  Users
                </h2>

                <p>
                  Manage user accounts and system access.
                </p>

              </div>

              <button
                type="button"
                className="admin-refresh-button"
                onClick={loadUsers}
                disabled={loadingUsers}
              >

                <span>↻</span>

                {loadingUsers
                  ? "Refreshing..."
                  : "Refresh"}

              </button>

            </div>


            {/* ERROR */}

            {error && (

              <div className="admin-error">
                <span>!</span>
                {error}
              </div>

            )}


            {/* FILTERS */}

            <div className="admin-filters">

              <div className="admin-search">

                <span className="search-icon">
                  ⌕
                </span>

                <input
                  type="text"
                  placeholder="Search by name, email or ID..."
                  value={search}
                  onChange={(e) =>
                    setSearch(e.target.value)
                  }
                />

                {search && (
                  <button
                    type="button"
                    className="search-clear"
                    onClick={() =>
                      setSearch("")
                    }
                  >
                    ×
                  </button>
                )}

              </div>


              <select
                value={roleFilter}
                onChange={(e) =>
                  setRoleFilter(e.target.value)
                }
              >

                <option value="All">
                  All Roles
                </option>

                <option value="Admin">
                  Admin
                </option>

                <option value="Manager">
                  Manager
                </option>

                <option value="IT Support Agent">
                  IT Support Agent
                </option>

                <option value="Employee">
                  Employee
                </option>

              </select>


              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value)
                }
              >

                <option value="All">
                  All Status
                </option>

                <option value="Active">
                  Active
                </option>

                <option value="Inactive">
                  Inactive
                </option>

              </select>

            </div>


            {/* USERS TABLE */}

            {loadingUsers ? (

              <div className="admin-loading">

                <div className="admin-spinner"></div>

                <p>
                  Loading users...
                </p>

              </div>

            ) : filteredUsers.length === 0 ? (

              <div className="admin-empty">

                <div className="admin-empty-icon">
                  👥
                </div>

                <h3>
                  No users found
                </h3>

                <p>
                  Try changing your search or filters.
                </p>

              </div>

            ) : (

              <div className="admin-table-wrapper">

                <table className="admin-users-table">

                  <thead>

                    <tr>
                      <th>User</th>
                      <th>User ID</th>
                      <th>Department</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>

                  </thead>


                  <tbody>

                    {filteredUsers.map((item) => (

                      <tr key={item.userId}>

                        <td>

                          <div className="admin-user-cell">

                            <div className="admin-user-avatar">
                              {item.fullName
                                ?.charAt(0)
                                ?.toUpperCase() || "U"}
                            </div>

                            <div className="admin-user-info">

                              <strong>
                                {item.fullName || "Unknown User"}
                              </strong>

                              <span>
                                {item.email || "No email"}
                              </span>

                            </div>

                          </div>

                        </td>


                        <td>

                          <span className="user-id">
                            #{item.userId}
                          </span>

                        </td>


                        <td>
                          {item.department || "—"}
                        </td>


                        <td>

                          <span
                            className={`role-badge role-${item.roleName
                              ?.toLowerCase()
                              .replace(/\s+/g, "-")}`}
                          >
                            {item.roleName || "Unknown"}
                          </span>

                        </td>


                        <td>

                          <span
                            className={`status-badge ${
                              item.isActive
                                ? "status-active"
                                : "status-inactive"
                            }`}
                          >

                            <span className="status-dot"></span>

                            {item.isActive
                              ? "Active"
                              : "Inactive"}

                          </span>

                        </td>


                        <td>

                          <button
                            type="button"
                            className={`user-action-button ${
                              item.isActive
                                ? "disable"
                                : "enable"
                            }`}
                            onClick={() =>
                              setSelectedUser(item)
                            }
                          >

                            {item.isActive
                              ? "Disable"
                              : "Enable"}

                          </button>

                        </td>

                      </tr>

                    ))}

                  </tbody>

                </table>

              </div>

            )}


            <div className="admin-table-footer">

              Showing{" "}

              <strong>
                {filteredUsers.length}
              </strong>

              {" "}of{" "}

              <strong>
                {users.length}
              </strong>

              {" "}users

            </div>

          </section>

        )}


        {/* =====================================================
            CATEGORIES
        ====================================================== */}

        {activeSection === "categories" && (
          <CategoryManagement />
        )}


        {/* =====================================================
            ACTIVITY
        ====================================================== */}

        {activeSection === "activity" && (
          <ActivityLog />
        )}


        {/* =====================================================
            USER CONFIRMATION MODAL
        ====================================================== */}

        {selectedUser && (

          <div
            className="admin-modal-overlay"
            onClick={() => {
              if (!actionLoading) {
                setSelectedUser(null);
              }
            }}
          >

            <div
              className="admin-modal"
              onClick={(e) =>
                e.stopPropagation()
              }
            >

              <div
                className={`modal-icon ${
                  selectedUser.isActive
                    ? "modal-danger-icon"
                    : "modal-success-icon"
                }`}
              >
                {selectedUser.isActive
                  ? "!"
                  : "✓"}
              </div>


              <h3>
                {selectedUser.isActive
                  ? "Disable User?"
                  : "Enable User?"}
              </h3>


              <p>
                Are you sure you want to{" "}
                {selectedUser.isActive
                  ? "disable"
                  : "enable"}{" "}
                <strong>
                  {selectedUser.fullName}
                </strong>
                's account?
              </p>


              {selectedUser.isActive && (

                <div className="modal-warning">

                  <span>!</span>

                  This user will no longer be able
                  to access the HelpDesk system.

                </div>

              )}


              <div className="modal-actions">

                <button
                  type="button"
                  className="modal-cancel"
                  onClick={() =>
                    setSelectedUser(null)
                  }
                  disabled={actionLoading}
                >
                  Cancel
                </button>


                <button
                  type="button"
                  className={`modal-confirm ${
                    selectedUser.isActive
                      ? "danger"
                      : "success"
                  }`}
                  onClick={handleToggleUser}
                  disabled={actionLoading}
                >

                  {actionLoading
                    ? "Please wait..."
                    : selectedUser.isActive
                    ? "Disable User"
                    : "Enable User"}

                </button>

              </div>

            </div>

          </div>

        )}

      </div>
    </AppLayout>
  );
}


/* =============================================================
   CATEGORY MANAGEMENT
============================================================= */

function CategoryManagement() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showAdd, setShowAdd] = useState(false);
  const [newCategory, setNewCategory] = useState("");

  const [deleteCategory, setDeleteCategory] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    try {
      setLoading(true);
      setError("");

      const data = await adminService.getCategories();

      const categoriesData = Array.isArray(data)
        ? data
        : [];

      const categoriesWithCounts =
        categoriesData.map((category) => ({
          id: category.categoryId,
          name: category.categoryName,
          tickets: Number(category.ticketCount) || 0,
        }));

      setCategories(categoriesWithCounts);
    } catch (err) {
      console.error(
        "Failed to load categories:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Unable to load categories. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleAddCategory() {
    const name = newCategory.trim();

    if (!name) {
      setError("Please enter a category name.");
      return;
    }

    try {
      setActionLoading(true);
      setError("");

      await adminService.createCategory(name);

      await loadCategories();

      setNewCategory("");
      setShowAdd(false);
    } catch (err) {
      console.error(
        "Failed to create category:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Unable to create category."
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function confirmDeleteCategory() {
    if (!deleteCategory) return;

    try {
      setActionLoading(true);
      setError("");

      await adminService.deleteCategory(
        deleteCategory.id
      );

      setCategories((current) =>
        current.filter(
          (category) =>
            category.id !== deleteCategory.id
        )
      );

      setDeleteCategory(null);
    } catch (err) {
      console.error(
        "Failed to delete category:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Unable to delete category."
      );
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <>
      <section className="admin-panel">

        <div className="admin-panel-header">

          <div>

            <div className="admin-panel-label">
              TICKET SETTINGS
            </div>

            <h2>
              Categories
            </h2>

            <p>
              View ticket categories and their usage.
            </p>

          </div>

          <div className="category-header-actions">

            <button
              type="button"
              className="category-add-button"
              onClick={() => {
                setShowAdd(true);
                setError("");
              }}
            >
              + Add Category
            </button>

            <button
              type="button"
              className="admin-refresh-button"
              onClick={loadCategories}
              disabled={
                loading || actionLoading
              }
            >

              <span>↻</span>

              {loading
                ? "Refreshing..."
                : "Refresh"}

            </button>

          </div>

        </div>


        {error && (
          <div className="admin-error">
            <span>!</span>
            {error}
          </div>
        )}


        {loading ? (

          <div className="admin-loading">

            <div className="admin-spinner"></div>

            <p>
              Loading categories...
            </p>

          </div>

        ) : categories.length === 0 ? (

          <div className="admin-empty">

            <div className="admin-empty-icon">
              🏷
            </div>

            <h3>
              No categories found
            </h3>

            <p>
              Add your first ticket category.
            </p>

          </div>

        ) : (

          <div className="admin-table-wrapper">

            <table className="admin-users-table">

              <thead>

                <tr>
                  <th>Category</th>
                  <th>Tickets</th>
                  <th>Action</th>
                </tr>

              </thead>

              <tbody>

                {categories.map((category) => (

                  <tr key={category.id}>

                    <td>

                      <div className="category-name-cell">

                        <div className="category-icon">
                          🏷
                        </div>

                        <div>
                          <strong>
                            {category.name}
                          </strong>
                        </div>

                      </div>

                    </td>

                    <td>

                      <span className="category-ticket-count">

                        {category.tickets}

                        {" "}

                        {category.tickets === 1
                          ? "ticket"
                          : "tickets"}

                      </span>

                    </td>

                    <td>

                      <button
                        type="button"
                        className={`category-delete-button ${
                          category.tickets > 0
                            ? "disabled"
                            : ""
                        }`}
                        onClick={() => {

                          if (category.tickets > 0) {

                            setError(
                              `"${category.name}" cannot be deleted because it is used by ${category.tickets} ${
                                category.tickets === 1
                                  ? "ticket"
                                  : "tickets"
                              }.`
                            );

                            return;
                          }

                          setError("");
                          setDeleteCategory(
                            category
                          );
                        }}
                      >
                        Delete
                      </button>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        )}


        <div className="admin-table-footer">

          Showing{" "}

          <strong>
            {categories.length}
          </strong>

          {" "}categories

        </div>

      </section>


      {/* ADD CATEGORY MODAL */}

      {showAdd && (

        <div
          className="admin-modal-overlay"
          onClick={() => {

            if (!actionLoading) {

              setShowAdd(false);
              setNewCategory("");

            }

          }}
        >

          <div
            className="admin-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div className="modal-icon modal-success-icon">
              +
            </div>

            <h3>
              Add Category
            </h3>

            <p>
              Enter a name for the new ticket category.
            </p>

            <input
              type="text"
              className="category-input"
              placeholder="e.g. Network Security"
              value={newCategory}
              onChange={(e) =>
                setNewCategory(e.target.value)
              }
              onKeyDown={(e) => {

                if (e.key === "Enter") {
                  handleAddCategory();
                }

              }}
              autoFocus
              disabled={actionLoading}
            />

            <div className="modal-actions">

              <button
                type="button"
                className="modal-cancel"
                onClick={() => {

                  setShowAdd(false);
                  setNewCategory("");

                }}
                disabled={actionLoading}
              >
                Cancel
              </button>

              <button
                type="button"
                className="modal-confirm success"
                onClick={handleAddCategory}
                disabled={
                  actionLoading ||
                  !newCategory.trim()
                }
              >
                {actionLoading
                  ? "Adding..."
                  : "Add Category"}
              </button>

            </div>

          </div>

        </div>

      )}


      {/* DELETE CATEGORY MODAL */}

      {deleteCategory && (

        <div
          className="admin-modal-overlay"
          onClick={() => {

            if (!actionLoading) {
              setDeleteCategory(null);
            }

          }}
        >

          <div
            className="admin-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div className="modal-icon modal-danger-icon">
              !
            </div>

            <h3>
              Delete Category?
            </h3>

            <p>
              Are you sure you want to delete{" "}
              <strong>
                {deleteCategory.name}
              </strong>
              ?
            </p>

            <div className="modal-warning">

              <span>!</span>

              This category has no tickets and can be safely deleted.

            </div>

            <div className="modal-actions">

              <button
                type="button"
                className="modal-cancel"
                onClick={() =>
                  setDeleteCategory(null)
                }
                disabled={actionLoading}
              >
                Cancel
              </button>

              <button
                type="button"
                className="modal-confirm danger"
                onClick={confirmDeleteCategory}
                disabled={actionLoading}
              >
                {actionLoading
                  ? "Deleting..."
                  : "Delete Category"}
              </button>

            </div>

          </div>

        </div>

      )}

    </>
  );
}


/* =============================================================
   BACKEND DATE PARSER
============================================================= */

function parseBackendUtc(value) {
  if (!value) {
    return null;
  }

  const text = String(value).trim();

  /*
   * If the backend already provides timezone information,
   * keep it exactly as supplied.
   *
   * Examples:
   * 2026-08-31T08:30:00Z
   * 2026-08-31T08:30:00+00:00
   * 2026-08-31T08:30:00+03:00
   */

  if (
    text.endsWith("Z") ||
    /[+-]\d{2}:\d{2}$/.test(text)
  ) {
    const date = new Date(text);

    return Number.isNaN(date.getTime())
      ? null
      : date;
  }

  /*
   * If the backend sends a DateTime without timezone,
   * ASP.NET commonly represents a UTC DateTime like:
   *
   * 2026-08-31T08:30:00
   *
   * Treat it explicitly as UTC.
   */

  const utcDate = new Date(`${text}Z`);

  return Number.isNaN(utcDate.getTime())
    ? null
    : utcDate;
}


/* =============================================================
   ACTIVITY LOG
============================================================= */

function ActivityLog() {
  const [search, setSearch] = useState("");
  const [activityFilter, setActivityFilter] =
    useState("All");

  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // =========================================================
  // LOAD ACTIVITY LOGS
  // =========================================================

  useEffect(() => {
    loadActivities();
  }, []);

  async function loadActivities() {
    try {
      setLoading(true);
      setError("");

      const data =
        await adminService.getActivityLogs();

      const activityData =
        Array.isArray(data)
          ? data
          : [];

      const formattedActivities =
        activityData.map((item) => {

          const entityType =
            item.entityType?.toLowerCase() ||
            "system";

          let type = "system";
          let category = "System";

          if (entityType === "user") {

            type = "user";
            category = "Users";

          } else if (entityType === "ticket") {

            type = "ticket";
            category = "Tickets";

          } else if (entityType === "category") {

            type = "category";
            category = "Categories";

          } else if (
            entityType === "assignment request" ||
            entityType === "assignmentrequest"
          ) {

            type = "ticket";
            category = "Tickets";

          }

          return {

            id: item.auditLogId,

            type,

            user:
              item.userName ||
              "System",

            action:
              item.action ||
              "System Action",

            description:
              item.description ||
              "No description",

            category,

            /*
             * IMPORTANT:
             * createdAt is converted through the
             * corrected UTC parser.
             */
            time: formatActivityTime(
              item.createdAt
            ),

          };

        });

      setActivities(
        formattedActivities
      );

    } catch (err) {

      console.error(
        "Failed to load activity logs:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Unable to load activity log. Please try again."
      );

    } finally {

      setLoading(false);

    }
  }


  // =========================================================
  // FORMAT DATE / TIME
  // =========================================================

  function formatActivityTime(dateValue) {

    const date =
      parseBackendUtc(dateValue);

    if (!date) {
      return "Unknown time";
    }

    const now = new Date();

    /*
     * The Date object is already converted to
     * the browser's local timezone.
     */

    const isToday =
      date.getFullYear() ===
        now.getFullYear() &&
      date.getMonth() ===
        now.getMonth() &&
      date.getDate() ===
        now.getDate();

    const yesterday =
      new Date(now);

    yesterday.setDate(
      yesterday.getDate() - 1
    );

    const isYesterday =
      date.getFullYear() ===
        yesterday.getFullYear() &&
      date.getMonth() ===
        yesterday.getMonth() &&
      date.getDate() ===
        yesterday.getDate();

    const time =
      date.toLocaleTimeString(
        "en-US",
        {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }
      );

    if (isToday) {
      return `Today, ${time}`;
    }

    if (isYesterday) {
      return `Yesterday, ${time}`;
    }

    return (
      date.toLocaleDateString(
        "en-US",
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }
      ) +
      `, ${time}`
    );
  }


  // =========================================================
  // FILTER
  // =========================================================

  const filteredActivities =
    activities.filter((activity) => {

      const value =
        search.trim().toLowerCase();

      const matchesSearch =
        !value ||
        activity.user
          ?.toLowerCase()
          .includes(value) ||
        activity.action
          ?.toLowerCase()
          .includes(value) ||
        activity.description
          ?.toLowerCase()
          .includes(value);

      const matchesFilter =
        activityFilter === "All" ||
        activity.category ===
          activityFilter;

      return (
        matchesSearch &&
        matchesFilter
      );
    });


  // =========================================================
  // ICON
  // =========================================================

  function getIcon(type) {

    if (type === "user") {
      return "👤";
    }

    if (type === "category") {
      return "🏷";
    }

    if (type === "ticket") {
      return "🎫";
    }

    return "◆";
  }


  // =========================================================
  // RENDER
  // =========================================================

  return (

    <section className="admin-panel">

      {/* HEADER */}

      <div className="admin-panel-header">

        <div>

          <div className="admin-panel-label">
            SYSTEM MONITORING
          </div>

          <h2>
            Activity Log
          </h2>

          <p>
            Monitor important system actions.
          </p>

        </div>

        <span className="activity-count">
          {filteredActivities.length} activities
        </span>

      </div>


      {/* ERROR */}

      {error && (

        <div className="admin-error">

          <span>!</span>

          {error}

        </div>

      )}


      {/* FILTERS */}

      <div className="admin-filters">

        <div className="admin-search">

          <span className="search-icon">
            ⌕
          </span>

          <input
            type="text"
            placeholder="Search activity..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
          />

          {search && (

            <button
              type="button"
              className="search-clear"
              onClick={() =>
                setSearch("")
              }
            >
              ×
            </button>

          )}

        </div>


        <select
          value={activityFilter}
          onChange={(e) =>
            setActivityFilter(
              e.target.value
            )
          }
        >

          <option value="All">
            All Activity
          </option>

          <option value="Users">
            Users
          </option>

          <option value="Tickets">
            Tickets
          </option>

          <option value="Categories">
            Categories
          </option>

        </select>

      </div>


      {/* LOADING */}

      {loading && (

        <div className="admin-loading">

          <div className="admin-spinner"></div>

          <p>
            Loading activity...
          </p>

        </div>

      )}


      {/* EMPTY */}

      {!loading &&
        filteredActivities.length === 0 && (

          <div className="admin-empty">

            <div className="admin-empty-icon">
              📋
            </div>

            <h3>
              No activity found
            </h3>

            <p>

              {activities.length === 0
                ? "No system activity has been recorded yet."
                : "Try changing your search or filter."}

            </p>

          </div>

        )}


      {/* ACTIVITY TABLE */}

      {!loading &&
        filteredActivities.length > 0 && (

          <div className="admin-table-wrapper">

            <table className="admin-users-table">

              <thead>

                <tr>

                  <th>
                    Activity
                  </th>

                  <th>
                    User
                  </th>

                  <th>
                    Description
                  </th>

                  <th>
                    Category
                  </th>

                  <th>
                    Time
                  </th>

                </tr>

              </thead>


              <tbody>

                {filteredActivities.map(
                  (activity) => (

                    <tr
                      key={activity.id}
                    >

                      {/* ACTIVITY */}

                      <td>

                        <div className="activity-name-cell">

                          <div
                            className={`activity-icon activity-${activity.type}`}
                          >
                            {getIcon(
                              activity.type
                            )}
                          </div>

                          <strong>
                            {activity.action}
                          </strong>

                        </div>

                      </td>


                      {/* USER */}

                      <td>

                        <strong className="activity-user-name">
                          {activity.user}
                        </strong>

                      </td>


                      {/* DESCRIPTION */}

                      <td>

                        <span className="activity-description">
                          {activity.description}
                        </span>

                      </td>


                      {/* CATEGORY */}

                      <td>

                        <span className="activity-category-badge">
                          {activity.category}
                        </span>

                      </td>


                      {/* TIME */}

                      <td>

                        <span className="activity-time">
                          {activity.time}
                        </span>

                      </td>

                    </tr>

                  )
                )}

              </tbody>

            </table>

          </div>

        )}


      {/* FOOTER */}

      <div className="admin-table-footer">

        Showing{" "}

        <strong>
          {filteredActivities.length}
        </strong>

        {" "}activities

      </div>

    </section>

  );
}

