import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import AppLayout from "../components/AppLayout";
import { useAuth } from "../context/AuthContext";
import * as ticketService from "../services/ticketService";
import * as ticketCommentService from "../services/ticketCommentService";

const STAFF_ROLES = [
  "Admin",
  "Manager",
  "IT Support Agent",
];

// =========================================================
// DATE / TIME HELPERS
// =========================================================

function parseBackendUtc(value) {
  if (!value) return null;

  const text = String(value).trim();

  /*
   * Backend already supplied timezone information.
   *
   * Examples:
   * 2026-08-31T08:23:16Z
   * 2026-08-31T08:23:16+00:00
   * 2026-08-31T08:23:16-04:00
   */
  if (
    text.endsWith("Z") ||
    /[+-]\d{2}:\d{2}$/.test(text)
  ) {
    return new Date(text);
  }

  /*
   * Backend returned a DateTime without timezone.
   *
   * Our backend/database stores these values as UTC,
   * so explicitly mark them as UTC.
   */
  return new Date(`${text}Z`);
}

function formatBackendDate(value) {
  const date = parseBackendUtc(value);

  if (!date || Number.isNaN(date.getTime())) {
    return "-";
  }

  /*
   * Converts UTC to the browser/user's local timezone.
   *
   * Example:
   * Backend UTC: 2026-08-31T08:23:16Z
   * Lebanon:     2026-08-31 11:23:16
   */
  return date.toLocaleString();
}

// =========================================================
// COMPONENT
// =========================================================

export default function TicketDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [ticket, setTicket] = useState(null);

  const [lookups, setLookups] = useState({
    categories: [],
    priorities: [],
    statuses: [],
  });

  const [agents, setAgents] = useState([]);

  const [form, setForm] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);

  // =========================================================
  // ROLE CHECKS
  // =========================================================

  const isEmployee =
    user?.role === "Employee";

  const isAgent =
    user?.role === "IT Support Agent";

  const isManager =
    user?.role === "Manager";

  const isAdmin =
    user?.role === "Admin";

  const isStaff =
    STAFF_ROLES.includes(user?.role);

  // =========================================================
  // COMMENTS
  // =========================================================

  const [comments, setComments] = useState([]);

  const [commentText, setCommentText] =
    useState("");

  const [commentType, setCommentType] =
    useState("Public");

  const [commentSaving, setCommentSaving] =
    useState(false);

  const [commentError, setCommentError] =
    useState("");

  // =========================================================
  // TICKET PERMISSIONS
  // =========================================================

  const isOwner =
    ticket &&
    ticket.createdByUserId === user?.userId;

  const openStatus =
    lookups.statuses.find(
      (s) => s.statusName === "Open"
    );

  const isStillOpen =
    ticket &&
    openStatus &&
    ticket.statusId === openStatus.statusId;

  /*
   * Employee:
   * Can edit only his own ticket while Open.
   *
   * Agent:
   * Can edit according to backend rules.
   *
   * Admin:
   * Can edit everything.
   *
   * Manager:
   * Cannot edit ticket information.
   */
  const canEdit =
    isAdmin ||
    isAgent ||
    (
      isEmployee &&
      isOwner &&
      isStillOpen
    );

  /*
   * Only Admin can delete.
   *
   * Employee can cancel his own Open ticket.
   */
  const canDeleteOrCancel =
    isAdmin ||
    (
      isEmployee &&
      isOwner &&
      isStillOpen
    );

  // =========================================================
  // LOAD TICKET
  // =========================================================

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setNotFound(false);

    try {
      const [
        ticketData,
        lookupData,
      ] = await Promise.all([
        ticketService.getTicketById(id),
        ticketService.getLookups(),
      ]);

      setTicket(ticketData);
      setLookups(lookupData);

      setForm({
        title: ticketData.title,

        description:
          ticketData.description,

        categoryId:
          String(ticketData.categoryId),

        priorityId:
          String(ticketData.priorityId),

        statusId:
          String(ticketData.statusId),

        assignedToUserId:
          ticketData.assignedToUserId
            ? String(
                ticketData.assignedToUserId
              )
            : "",
      });

      /*
       * Manager and Admin need the list
       * of IT Support Agents.
       */
      if (isManager || isAdmin) {
        try {
          const agentData =
            await ticketService.getAgents();

          setAgents(agentData);
        } catch {
          setAgents([]);
        }
      }
    } catch (err) {
      console.error(err);

      if (
        err.response?.status === 404
      ) {
        setNotFound(true);
      } else {
        setError(
          "Couldn't load this ticket."
        );
      }
    } finally {
      setLoading(false);
    }
  }, [
    id,
    isManager,
    isAdmin,
  ]);

  useEffect(() => {
    load();
  }, [load]);

  // =========================================================
  // UPDATE FORM
  // =========================================================

  function updateForm(key, value) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  // =========================================================
  // LOAD COMMENTS
  // =========================================================

  async function loadComments() {
    try {
      const data =
        await ticketCommentService.getComments(
          id
        );

      setComments(data);
    } catch (err) {
      console.error(err);

      setCommentError(
        "Couldn't load comments."
      );
    }
  }

  useEffect(() => {
    if (ticket) {
      loadComments();
    }
  }, [id, ticket]);

  // =========================================================
  // ADD COMMENT
  // =========================================================

  async function handleAddComment() {
    if (!commentText.trim()) {
      return;
    }

    try {
      setCommentSaving(true);
      setCommentError("");

      await ticketCommentService.addComment(
        id,
        {
          commentText:
            commentText.trim(),

          commentType: isEmployee
            ? "Public"
            : commentType,
        }
      );

      setCommentText("");
      setCommentType("Public");

      await loadComments();
    } catch (err) {
      console.error(err);

      setCommentError(
        err.response?.data?.message ||
          err.response?.data ||
          "Couldn't add comment."
      );
    } finally {
      setCommentSaving(false);
    }
  }

  // =========================================================
  // SAVE / ASSIGN
  // =========================================================

  async function handleSave(e) {
    e.preventDefault();

    setError("");
    setSaving(true);

    try {
      // =====================================================
      // MANAGER
      // =====================================================

      if (isManager) {
        if (!form.assignedToUserId) {
          setError(
            "Please select an IT Support Agent."
          );

          setSaving(false);
          return;
        }

        await ticketService.assignTicket(
          id,
          Number(
            form.assignedToUserId
          )
        );

        await load();

        return;
      }

      // =====================================================
      // EMPLOYEE / AGENT / ADMIN
      // =====================================================

      const updated =
        await ticketService.updateTicket(
          id,
          {
            title: form.title,

            description:
              form.description,

            categoryId:
              Number(
                form.categoryId
              ),

            priorityId:
              Number(
                form.priorityId
              ),

            statusId:
              Number(
                form.statusId
              ),

            assignedToUserId:
              form.assignedToUserId
                ? Number(
                    form.assignedToUserId
                  )
                : null,
          }
        );

      setTicket(updated);
    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.message ||
          "Couldn't save changes."
      );
    } finally {
      setSaving(false);
    }
  }

  // =========================================================
  // DELETE / CANCEL
  // =========================================================

  async function handleDelete() {
    const isCancel =
      isEmployee;

    const confirmed =
      window.confirm(
        isCancel
          ? "Cancel this ticket? This can't be undone."
          : "Permanently delete this ticket?"
      );

    if (!confirmed) {
      return;
    }

    try {
      await ticketService.deleteTicket(
        id
      );

      navigate("/tickets");
    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.message ||
          "Couldn't delete this ticket."
      );
    }
  }

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <AppLayout>
        <p className="muted">
          Loading ticket...
        </p>
      </AppLayout>
    );
  }

  // =========================================================
  // NOT FOUND
  // =========================================================

  if (notFound) {
    return (
      <AppLayout>
        <p className="muted">
          Ticket not found.
        </p>

        <Link to="/tickets">
          Back to tickets
        </Link>
      </AppLayout>
    );
  }

  // =========================================================
  // ERROR
  // =========================================================

  if (!ticket || !form) {
    return (
      <AppLayout>
        <div className="error-banner">
          {error ||
            "Something went wrong."}
        </div>
      </AppLayout>
    );
  }

  // =========================================================
  // PAGE
  // =========================================================

  return (
    <AppLayout>

      {/* ===================================================
          HEADER
      =================================================== */}

      <div className="page-header">

        <div>
          <h1>
            {ticket.ticketReference}
          </h1>

          {isManager && (
            <p className="muted">
              Manager — Assign ticket to
              an IT Support Agent
            </p>
          )}
        </div>

        <Link
          to="/tickets"
          className="button-secondary"
        >
          Back to tickets
        </Link>

      </div>

      {/* ===================================================
          ERROR
      =================================================== */}

      {error && (
        <div className="error-banner">
          {error}
        </div>
      )}

      {/* ===================================================
          MANAGER INFORMATION
      =================================================== */}

      {isManager && (
        <div className="panel-form">

          <p className="muted">
            You can view this ticket and
            assign it to an IT Support
            Agent. Ticket information
            cannot be edited by the Manager.
          </p>

        </div>
      )}

      {/* ===================================================
          TICKET FORM
      =================================================== */}

      <form
        className="panel-form"
        onSubmit={handleSave}
      >

        {/* TITLE */}

        <label htmlFor="title">
          Title
        </label>

        <input
          id="title"
          type="text"
          value={form.title}
          onChange={(e) =>
            updateForm(
              "title",
              e.target.value
            )
          }
          disabled={!canEdit}
          maxLength={200}
          required
        />

        {/* DESCRIPTION */}

        <label htmlFor="description">
          Description
        </label>

        <textarea
          id="description"
          rows={6}
          value={form.description}
          onChange={(e) =>
            updateForm(
              "description",
              e.target.value
            )
          }
          disabled={!canEdit}
          required
        />

        {/* CATEGORY / PRIORITY */}

        <div className="form-row">

          <div>

            <label htmlFor="category">
              Category
            </label>

            <select
              id="category"
              value={form.categoryId}
              onChange={(e) =>
                updateForm(
                  "categoryId",
                  e.target.value
                )
              }
              disabled={!canEdit}
            >
              {lookups.categories.map(
                (c) => (
                  <option
                    key={c.categoryId}
                    value={c.categoryId}
                  >
                    {c.categoryName}
                  </option>
                )
              )}
            </select>

          </div>

          <div>

            <label htmlFor="priority">
              Priority
            </label>

            <select
              id="priority"
              value={form.priorityId}
              onChange={(e) =>
                updateForm(
                  "priorityId",
                  e.target.value
                )
              }
              disabled={!canEdit}
            >
              {lookups.priorities.map(
                (p) => (
                  <option
                    key={p.priorityId}
                    value={p.priorityId}
                  >
                    {p.priorityName}
                  </option>
                )
              )}
            </select>

          </div>

        </div>

        {/* =================================================
            MANAGER ASSIGN
        ================================================= */}

        {isManager && (
          <div className="form-row">

            <div>

              <label htmlFor="assignedTo">
                Assign to IT Support Agent
              </label>

              <select
                id="assignedTo"
                value={
                  form.assignedToUserId
                }
                onChange={(e) =>
                  updateForm(
                    "assignedToUserId",
                    e.target.value
                  )
                }
                required
              >

                <option value="">
                  Select IT Support Agent
                </option>

                {agents.map(
                  (agent) => (
                    <option
                      key={agent.userId}
                      value={agent.userId}
                    >
                      {agent.fullName}
                    </option>
                  )
                )}

              </select>

            </div>

          </div>
        )}

        {/* =================================================
            AGENT / ADMIN STATUS
        ================================================= */}

        {(isAgent || isAdmin) && (
          <div className="form-row">

            <div>

              <label htmlFor="status">
                Status
              </label>

              <select
                id="status"
                value={form.statusId}
                onChange={(e) =>
                  updateForm(
                    "statusId",
                    e.target.value
                  )
                }
              >

                {lookups.statuses.map(
                  (s) => (
                    <option
                      key={s.statusId}
                      value={s.statusId}
                    >
                      {s.statusName}
                    </option>
                  )
                )}

              </select>

            </div>

            {/* ADMIN ASSIGN */}

            {isAdmin && (
              <div>

                <label htmlFor="assignedTo">
                  Assigned to
                </label>

                <select
                  id="assignedTo"
                  value={
                    form.assignedToUserId
                  }
                  onChange={(e) =>
                    updateForm(
                      "assignedToUserId",
                      e.target.value
                    )
                  }
                >

                  <option value="">
                    Unassigned
                  </option>

                  {agents.map(
                    (agent) => (
                      <option
                        key={agent.userId}
                        value={agent.userId}
                      >
                        {agent.fullName}
                      </option>
                    )
                  )}

                </select>

              </div>
            )}

          </div>
        )}

        {/* =================================================
            EMPLOYEE VIEW
        ================================================= */}

        {isEmployee && (
          <p className="muted small">

            Status:{" "}

            <strong>
              {ticket.statusName}
            </strong>

            {" · "}

            Assigned to:{" "}

            <strong>
              {ticket.assignedToUserName ||
                "Unassigned"}
            </strong>

          </p>
        )}

        {/* =================================================
            MANAGER CURRENT ASSIGNMENT
        ================================================= */}

        {isManager && (
          <p className="muted small">

            Current assigned agent:{" "}

            <strong>
              {ticket.assignedToUserName ||
                "Unassigned"}
            </strong>

          </p>
        )}

        {/* =================================================
            WORK TIME INFORMATION
        ================================================= */}

        {(isAdmin ||
          isManager ||
          isAgent) && (
          <div className="work-time-info">

            <p className="muted small">

              <strong>
                Work Started:
              </strong>{" "}

              {formatBackendDate(
                ticket.workingStartedAt
              )}

            </p>

            <p className="muted small">

              <strong>
                Work Finished:
              </strong>{" "}

              {formatBackendDate(
                ticket.workingFinishedAt
              )}

            </p>

          </div>
        )}

        {/* =================================================
            CREATED INFORMATION
        ================================================= */}

        <p className="muted small">

          Created by{" "}

          {ticket.createdByUserName}

          {" on "}

          {formatBackendDate(
            ticket.createdDate
          )}

          {ticket.updatedDate && (
            <>
              {" · Last updated "}

              {formatBackendDate(
                ticket.updatedDate
              )}
            </>
          )}

        </p>

        {/* =================================================
            ACTION BUTTONS
        ================================================= */}

        <div className="form-actions">

          {/* EMPLOYEE CANCEL */}

          {canDeleteOrCancel && (
            <button
              type="button"
              className="button-danger"
              onClick={handleDelete}
            >
              {isEmployee
                ? "Cancel ticket"
                : "Delete ticket"}
            </button>
          )}

          {/* MANAGER */}

          {isManager && (
            <button
              type="submit"
              disabled={
                saving ||
                !form.assignedToUserId
              }
            >
              {saving
                ? "Assigning..."
                : "Assign Ticket"}
            </button>
          )}

          {/* AGENT / ADMIN / EMPLOYEE */}

          {!isManager &&
            (canEdit || isStaff) && (
              <button
                type="submit"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : "Save changes"}
              </button>
            )}

        </div>

      </form>

      {/* =====================================================
          COMMENTS & ACTIVITY
      ===================================================== */}

      <section className="ticket-comments">

        <div className="comments-heading">

          <div>

            <h2>
              Comments & Activity
            </h2>

            <p className="muted">
              Communication and updates
              related to this ticket.
            </p>

          </div>

          <span className="comments-count">
            {comments.length}
          </span>

        </div>

        {/* COMMENT ERROR */}

        {commentError && (
          <div className="error-banner">
            {commentError}
          </div>
        )}

        {/* =================================================
            COMMENTS LIST
        ================================================= */}

        <div className="comments-list">

          {comments.length === 0 ? (

            <div className="comments-empty">

              <div className="empty-icon">
                💬
              </div>

              <strong>
                No comments yet
              </strong>

              <p className="muted">
                Start the conversation
                about this ticket.
              </p>

            </div>

          ) : (

            comments.map(
              (comment) => (

                <article
                  key={
                    comment.commentId
                  }
                  className={`comment-card ${
                    comment.commentType ===
                    "Internal"
                      ? "internal"
                      : "public"
                  }`}
                >

                  <div className="comment-top">

                    <div className="comment-user">

                      <div className="comment-avatar">

                        {comment.userName
                          ?.charAt(0)
                          ?.toUpperCase() ||
                          "?"}

                      </div>

                      <div>

                        <strong>
                          {comment.userName}
                        </strong>

                        <span>
                          {comment.userRole}
                        </span>

                      </div>

                    </div>

                    <div className="comment-meta">

                      {/* FIXED UTC DATE */}

                      <span>
                        {formatBackendDate(
                          comment.createdDate
                        )}
                      </span>

                      <span
                        className={`comment-badge ${
                          comment.commentType ===
                          "Internal"
                            ? "internal-badge"
                            : "public-badge"
                        }`}
                      >
                        {comment.commentType ===
                        "Internal"
                          ? "🔒 Internal"
                          : "🌐 Public"}
                      </span>

                    </div>

                  </div>

                  <div className="comment-text">
                    {comment.commentText}
                  </div>

                </article>

              )
            )

          )}

        </div>

        {/* =================================================
            ADD COMMENT
        ================================================= */}

        <div className="add-comment-card">

          <h3>
            Add a comment
          </h3>

          <textarea
            value={commentText}
            onChange={(e) =>
              setCommentText(
                e.target.value
              )
            }
            placeholder="Write a comment..."
            rows={5}
            maxLength={4000}
          />

          <div className="comment-footer">

            {/* EMPLOYEE */}

            {isEmployee ? (

              <div className="comment-visibility-fixed">
                🌐 Public comment
              </div>

            ) : (

              <div className="comment-visibility">

                <label htmlFor="commentType">
                  Visibility
                </label>

                <select
                  id="commentType"
                  value={commentType}
                  onChange={(e) =>
                    setCommentType(
                      e.target.value
                    )
                  }
                >

                  <option value="Public">
                    🌐 Public — Employee can see
                  </option>

                  <option value="Internal">
                    🔒 Internal — Staff only
                  </option>

                </select>

              </div>

            )}

            <button
              type="button"
              onClick={handleAddComment}
              disabled={
                commentSaving ||
                !commentText.trim()
              }
            >
              {commentSaving
                ? "Adding..."
                : "Add Comment"}
            </button>

          </div>

        </div>

      </section>

    </AppLayout>
  );
}