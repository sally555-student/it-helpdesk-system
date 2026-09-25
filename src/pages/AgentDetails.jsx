import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AppLayout from "../components/AppLayout";
import * as ticketService from "../services/ticketService";

export default function AgentDetails() {
  const { id } = useParams();

  const [agent, setAgent] = useState(null);
  const [tickets, setTickets] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      // Get all agents
      const agents = await ticketService.getAgents();

      // Find selected agent
      const selectedAgent = agents.find(
        (a) => Number(a.userId) === Number(id)
      );

      if (!selectedAgent) {
        setError("Agent not found.");
        return;
      }

      setAgent(selectedAgent);

      // Get all tickets
      const allTickets = await ticketService.getTickets();

      // Get only tickets assigned to this agent
      const agentTickets = allTickets.filter(
        (ticket) =>
          Number(ticket.assignedToUserId) === Number(id)
      );

      setTickets(agentTickets);
    } catch (err) {
      console.error(err);

      setError(
        err?.response?.data?.message ||
          err?.response?.data ||
          "Couldn't load agent details."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [id]);

  return (
    <AppLayout>
      <div className="agent-details-page">

        {/* ==========================================
            BACK BUTTON
        ========================================== */}

        <Link
          to="/agents"
          className="agent-back-link"
        >
          <span>←</span>
          Back to IT Agents
        </Link>


        {/* ==========================================
            PAGE HEADER
        ========================================== */}

        <div className="agent-details-header">

          <h1>
            Agent Details
          </h1>

          <p>
            View agent information and their assigned support tickets.
          </p>

        </div>


        {/* ==========================================
            LOADING
        ========================================== */}

        {loading && (
          <div className="agent-details-loading">

            <div className="agent-loading-spinner"></div>

            <p>
              Loading agent details...
            </p>

          </div>
        )}


        {/* ==========================================
            ERROR
        ========================================== */}

        {error && (
          <div className="agent-details-error">

            <span>⚠</span>

            <div>
              <strong>Unable to load agent</strong>
              <p>{error}</p>
            </div>

          </div>
        )}


        {!loading && !error && agent && (
          <>

            {/* ==========================================
                AGENT PROFILE CARD
            ========================================== */}

            <div className="agent-profile-card">

              {/* Profile */}

              <div className="agent-profile-main">

                <div className="agent-large-avatar">
                  {agent.fullName
                    ?.charAt(0)
                    ?.toUpperCase()}
                </div>

                <div className="agent-profile-name">

                  <h2>
                    {agent.fullName}
                  </h2>

                  <span className="agent-role-badge-large">
                    IT Support Agent
                  </span>

                </div>

              </div>


              {/* Divider */}

              <div className="agent-profile-divider"></div>


              {/* Information */}

              <div className="agent-profile-information">

                <div className="profile-info-item">

                  <div className="profile-info-icon">
                    👤
                  </div>

                  <div>
                    <span>
                      Full Name
                    </span>

                    <strong>
                      {agent.fullName}
                    </strong>
                  </div>

                </div>


                <div className="profile-info-item">

                  <div className="profile-info-icon">
                    🪪
                  </div>

                  <div>
                    <span>
                      User ID
                    </span>

                    <strong>
                      {agent.userId}
                    </strong>
                  </div>

                </div>


                <div className="profile-info-item">

                  <div className="profile-info-icon">
                    🎫
                  </div>

                  <div>
                    <span>
                      Assigned Tickets
                    </span>

                    <strong>
                      {tickets.length}
                    </strong>
                  </div>

                </div>

              </div>

            </div>


            {/* ==========================================
                ASSIGNED TICKETS CARD
            ========================================== */}

            <div className="assigned-tickets-card">

              {/* Section Header */}

              <div className="assigned-tickets-header">

                <div className="assigned-tickets-title">

                  <div className="tickets-section-icon">
                    🎫
                  </div>

                  <div>
                    <h2>
                      Assigned Tickets
                    </h2>

                    <p>
                      Tickets currently assigned to this agent.
                    </p>
                  </div>

                </div>

                <div className="ticket-count-badge">
                  {tickets.length}
                </div>

              </div>


              {/* No Tickets */}

              {tickets.length === 0 ? (

                <div className="no-agent-tickets">

                  <div className="no-tickets-icon">
                    🎫
                  </div>

                  <h3>
                    No assigned tickets
                  </h3>

                  <p>
                    This agent currently has no tickets assigned.
                  </p>

                </div>

              ) : (

                /* ==========================================
                   TICKET TABLE
                ========================================== */

                <div className="agent-tickets-table-wrapper">

                  <table className="agent-tickets-table">

                    <thead>

                      <tr>
                        <th>REFERENCE</th>
                        <th>TITLE</th>
                        <th>CATEGORY</th>
                        <th>PRIORITY</th>
                        <th>STATUS</th>
                      </tr>

                    </thead>

                    <tbody>

                      {tickets.map((ticket) => (

                        <tr key={ticket.ticketId}>

                          {/* Reference */}

                          <td>

                            <Link
                              to={`/tickets/${ticket.ticketId}`}
                              className="ticket-reference-link"
                            >
                              {ticket.ticketReference}
                            </Link>

                          </td>


                          {/* Title */}

                          <td>

                            <span className="ticket-title">
                              {ticket.title}
                            </span>

                          </td>


                          {/* Category */}

                          <td>

                            <div className="ticket-category">

                              <span className="category-icon">
                                ◇
                              </span>

                              {ticket.categoryName || "-"}

                            </div>

                          </td>


                          {/* Priority */}

                          <td>

                            <span
                              className={`agent-ticket-priority priority-${(
                                ticket.priorityName || ""
                              ).toLowerCase()}`}
                            >
                              <span className="priority-dot"></span>

                              {ticket.priorityName || "-"}
                            </span>

                          </td>


                          {/* Status */}

                          <td>

                            <span
                              className={`agent-ticket-status status-${(
                                ticket.statusName || ""
                              )
                                .replace(/\s+/g, "")
                                .toLowerCase()}`}
                            >
                              <span className="status-dot"></span>

                              {ticket.statusName || "-"}
                            </span>

                          </td>

                        </tr>

                      ))}

                    </tbody>

                  </table>

                </div>

              )}

            </div>

          </>
        )}

      </div>
    </AppLayout>
  );
}