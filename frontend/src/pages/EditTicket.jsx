
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AppLayout from "../components/AppLayout";
import * as ticketService from "../services/ticketService";
import "./EditTicket.css";

export default function EditTicket() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [ticket, setTicket] = useState(null);

  const [lookups, setLookups] = useState({
    categories: [],
    priorities: [],
    statuses: [],
  });

  const [agents, setAgents] = useState([]);

  const [form, setForm] = useState({
    title: "",
    description: "",
    categoryId: "",
    priorityId: "",
    statusId: "",
    assignedToUserId: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // =========================================================
  // ROLES
  // =========================================================

  const isEmployee = user?.role === "Employee";
  const isAgent = user?.role === "IT Support Agent";
  const isManager = user?.role === "Manager";
  const isAdmin = user?.role === "Admin";

  const canAssign = isManager || isAdmin;
  const canChangeStatus = isAgent || isManager || isAdmin;

  // =========================================================
  // LOAD DATA
  // =========================================================

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const [ticketData, lookupData] =
          await Promise.all([
            ticketService.getTicketById(id),
            ticketService.getLookups(),
          ]);

        setTicket(ticketData);
        setLookups(lookupData);

        setForm({
          title: ticketData.title || "",
          description: ticketData.description || "",
          categoryId: ticketData.categoryId || "",
          priorityId: ticketData.priorityId || "",
          statusId: ticketData.statusId || "",
          assignedToUserId:
            ticketData.assignedToUserId || "",
        });

        // Manager / Admin only
        if (canAssign) {
          const agentData =
            await ticketService.getAgents();

          setAgents(agentData);
        }
      } catch (err) {
        console.error(err);

        setError(
          err?.response?.data?.message ||
            err?.response?.data ||
            "Couldn't load the ticket."
        );
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      loadData();
    }
  }, [id, canAssign]);

  // =========================================================
  // HANDLE CHANGE
  // =========================================================

  function handleChange(e) {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  // =========================================================
  // SUBMIT
  // =========================================================

  async function handleSubmit(e) {
    e.preventDefault();

    if (saving) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      await ticketService.updateTicket(id, {
        title: form.title.trim(),
        description: form.description.trim(),
        categoryId: Number(form.categoryId),
        priorityId: Number(form.priorityId),

        // Employee keeps the current status
        statusId: canChangeStatus
          ? Number(form.statusId)
          : ticket.statusId,

        // Only Manager/Admin can change assignment
        assignedToUserId: canAssign
          ? form.assignedToUserId
            ? Number(form.assignedToUserId)
            : null
          : ticket.assignedToUserId,
      });

      navigate(`/tickets/${id}`);
    } catch (err) {
      console.error(err);

      setError(
        err?.response?.data?.message ||
          err?.response?.data ||
          "Couldn't update the ticket."
      );
    } finally {
      setSaving(false);
    }
  }

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <AppLayout>
        <div className="edit-ticket-page">
          <div className="edit-ticket-loading">
            <div className="edit-ticket-spinner" />
            <p>Loading ticket...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  // =========================================================
  // NOT FOUND
  // =========================================================

  if (!ticket) {
    return (
      <AppLayout>
        <div className="edit-ticket-page">
          <div className="edit-ticket-error">
            <div className="edit-ticket-error-icon">
              !
            </div>

            <div>
              <h2>Ticket not found</h2>
              <p>
                The ticket you're trying to edit
                could not be found.
              </p>

              <button
                type="button"
                onClick={() =>
                  navigate("/tickets")
                }
              >
                Back to Tickets
              </button>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  // =========================================================
  // PAGE TITLE
  // =========================================================

  const pageTitle = isEmployee
    ? "Edit Ticket"
    : isManager || isAdmin
    ? "Manage Ticket"
    : isAgent
    ? "Update Ticket"
    : "Edit Ticket";

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <AppLayout>
      <div className="edit-ticket-page">

        {/* =================================================
            HEADER
            ================================================= */}

        <div className="edit-ticket-header">

          <div className="edit-ticket-header-left">

            <button
              type="button"
              className="back-button"
              onClick={() =>
                navigate(`/tickets/${id}`)
              }
              title="Back to ticket"
            >
              ←
            </button>

            <div>
              <div className="edit-ticket-eyebrow">
                TICKET
              </div>

              <h1>{pageTitle}</h1>

              <div className="edit-ticket-reference">
                {ticket.ticketReference}
              </div>
            </div>

          </div>

          <div className="edit-ticket-status">

            <span className="status-label">
              Current status
            </span>

            <span
              className={`edit-status-badge status-${(
                ticket.statusName || ""
              )
                .replace(/\s+/g, "")
                .toLowerCase()}`}
            >
              {ticket.statusName}
            </span>

          </div>

        </div>

        {/* =================================================
            ERROR
            ================================================= */}

        {error && (
          <div className="edit-ticket-error-banner">
            <span className="error-icon">!</span>
            <span>{error}</span>
          </div>
        )}

        {/* =================================================
            EMPLOYEE FORM
            ================================================= */}

        <form
          onSubmit={handleSubmit}
          className="edit-ticket-layout"
        >

          {/* =================================================
              MAIN FORM
              ================================================= */}

          <div className="edit-ticket-main">

            <div className="edit-ticket-card">

              <div className="edit-ticket-card-header">
                <div>
                  <h2>Ticket Information</h2>

                  <p>
                    Update the information related
                    to your support request.
                  </p>
                </div>

                <div className="edit-card-icon">
                  ✎
                </div>
              </div>

              <div className="edit-ticket-card-body">

                {/* TITLE */}

                <div className="form-field full-width">

                  <label htmlFor="title">
                    Title
                    <span className="required">
                      *
                    </span>
                  </label>

                  <input
                    id="title"
                    type="text"
                    name="title"
                    value={form.title}
                    onChange={handleChange}
                    maxLength={200}
                    placeholder="Enter a short title for your issue"
                    required
                  />

                  <span className="field-hint">
                    Briefly describe the problem.
                  </span>

                </div>

                {/* DESCRIPTION */}

                <div className="form-field full-width">

                  <label htmlFor="description">
                    Description
                    <span className="required">
                      *
                    </span>
                  </label>

                  <textarea
                    id="description"
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    rows={7}
                    placeholder="Describe your issue in detail..."
                    required
                  />

                  <span className="field-hint">
                    Include any useful details that
                    can help the IT team understand
                    the problem.
                  </span>

                </div>

                {/* CATEGORY + PRIORITY */}

                <div className="form-row">

                  <div className="form-field">

                    <label htmlFor="categoryId">
                      Category
                      <span className="required">
                        *
                      </span>
                    </label>

                    <select
                      id="categoryId"
                      name="categoryId"
                      value={form.categoryId}
                      onChange={handleChange}
                      required
                    >
                      <option value="">
                        Select category
                      </option>

                      {lookups.categories.map(
                        (category) => (
                          <option
                            key={
                              category.categoryId
                            }
                            value={
                              category.categoryId
                            }
                          >
                            {
                              category.categoryName
                            }
                          </option>
                        )
                      )}
                    </select>

                  </div>

                  <div className="form-field">

                    <label htmlFor="priorityId">
                      Priority
                      <span className="required">
                        *
                      </span>
                    </label>

                    <select
                      id="priorityId"
                      name="priorityId"
                      value={form.priorityId}
                      onChange={handleChange}
                      required
                    >
                      <option value="">
                        Select priority
                      </option>

                      {lookups.priorities.map(
                        (priority) => (
                          <option
                            key={
                              priority.priorityId
                            }
                            value={
                              priority.priorityId
                            }
                          >
                            {
                              priority.priorityName
                            }
                          </option>
                        )
                      )}
                    </select>

                  </div>

                </div>

                {/* =================================================
                    STAFF ONLY
                    ================================================= */}

                {canChangeStatus && (
                  <div className="form-field full-width">

                    <label htmlFor="statusId">
                      Status
                      <span className="required">
                        *
                      </span>
                    </label>

                    <select
                      id="statusId"
                      name="statusId"
                      value={form.statusId}
                      onChange={handleChange}
                      required
                    >
                      <option value="">
                        Select status
                      </option>

                      {lookups.statuses.map(
                        (status) => (
                          <option
                            key={status.statusId}
                            value={status.statusId}
                          >
                            {status.statusName}
                          </option>
                        )
                      )}
                    </select>

                  </div>
                )}

              </div>
            </div>

            {/* =================================================
                ACTIONS
                ================================================= */}

            <div className="edit-ticket-actions">

              <button
                type="button"
                className="cancel-button"
                onClick={() =>
                  navigate(`/tickets/${id}`)
                }
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="save-button"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <span className="button-spinner" />
                    Saving...
                  </>
                ) : (
                  <>
                    ✓
                    {isManager || isAdmin
                      ? "Save & Assign"
                      : "Save Changes"}
                  </>
                )}
              </button>

            </div>

          </div>

          {/* =================================================
              SIDE INFORMATION
              ================================================= */}

          <aside className="edit-ticket-sidebar">

            {/* CURRENT TICKET */}

            <div className="edit-info-card">

              <div className="info-card-title">
                <span className="info-icon">
                  #
                </span>

                Ticket Details
              </div>

              <div className="info-list">

                <div className="info-item">
                  <span>Reference</span>
                  <strong>
                    {ticket.ticketReference}
                  </strong>
                </div>

                <div className="info-item">
                  <span>Created</span>
                  <strong>
                    {ticket.createdDate
                      ? new Date(
                          ticket.createdDate
                        ).toLocaleDateString()
                      : "-"}
                  </strong>
                </div>

                <div className="info-item">
                  <span>Created by</span>
                  <strong>
                    {ticket.createdByUserName ||
                      user?.fullName ||
                      "-"}
                  </strong>
                </div>

                <div className="info-item">
                  <span>Assigned to</span>
                  <strong>
                    {ticket.assignedToUserName ||
                      "Unassigned"}
                  </strong>
                </div>

              </div>

            </div>

            {/* EMPLOYEE INFORMATION */}

            {isEmployee && (
              <div className="edit-help-card">

                <div className="help-icon">
                  ?
                </div>

                <div>
                  <h3>
                    Before saving
                  </h3>

                  <p>
                    Make sure the ticket information
                    accurately describes your issue.
                    Changes can be made while the
                    ticket is still Open.
                  </p>
                </div>

              </div>
            )}

            {/* STAFF ASSIGNMENT */}

            {canAssign && (
              <div className="edit-info-card">

                <div className="info-card-title">
                  <span className="info-icon">
                    👤
                  </span>

                  Assignment
                </div>

                <div className="form-field">

                  <label htmlFor="assignedToUserId">
                    Assign to IT Agent
                  </label>

                  <select
                    id="assignedToUserId"
                    name="assignedToUserId"
                    value={
                      form.assignedToUserId
                    }
                    onChange={handleChange}
                  >
                    <option value="">
                      Unassigned
                    </option>

                    {agents.map((agent) => (
                      <option
                        key={agent.userId}
                        value={agent.userId}
                      >
                        {agent.fullName}
                      </option>
                    ))}

                  </select>

                </div>

              </div>
            )}

          </aside>

        </form>

      </div>
    </AppLayout>
  );
}
