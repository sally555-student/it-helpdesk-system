import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "../components/AppLayout";
import * as ticketService from "../services/ticketService";

export default function Agents() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  async function loadAgents() {
    try {
      setLoading(true);
      setError("");

      const data = await ticketService.getAgents();

      setAgents(data);
    } catch (err) {
      console.error(err);

      setError(
        err?.response?.data?.message ||
          err?.response?.data ||
          "Couldn't load IT agents."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAgents();
  }, []);

  // Search agents by name
  const filteredAgents = agents.filter((agent) =>
    agent.fullName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="agents-page">

        {/* ===== Header ===== */}
        <div className="agents-header">
          <div className="agents-title-section">

            <div className="agents-page-icon">
              <span>👥</span>
            </div>

            <div>
              <h1>IT Agents</h1>

              <p>
                Manage and view all IT Support Agents in your team.
              </p>

              <small>
                View agent details and their support information.
              </small>
            </div>
          </div>
        </div>

        {/* ===== Error ===== */}
        {error && (
          <div className="agents-error">
            <span>⚠</span>
            {error}
          </div>
        )}

        {/* ===== Main Card ===== */}
        <div className="agents-container">

          {/* Search */}
          {!loading && agents.length > 0 && (
            <div className="agents-toolbar">

              <div className="agents-search">
                <span className="search-icon">⌕</span>

                <input
                  type="text"
                  placeholder="Search agents by name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="agents-count">
                {filteredAgents.length}{" "}
                {filteredAgents.length === 1 ? "Agent" : "Agents"}
              </div>

            </div>
          )}

          {/* ===== Loading ===== */}
          {loading ? (
            <div className="agents-loading">
              <div className="loading-spinner"></div>
              <p>Loading IT agents...</p>
            </div>
          ) : agents.length === 0 ? (

            /* ===== Empty ===== */
            <div className="agents-empty">
              <div className="empty-icon">👥</div>

              <h3>No IT agents found</h3>

              <p>
                There are currently no IT Support Agents available.
              </p>
            </div>

          ) : filteredAgents.length === 0 ? (

            /* ===== No Search Results ===== */
            <div className="agents-empty">
              <div className="empty-icon">⌕</div>

              <h3>No agents found</h3>

              <p>
                Try searching with a different name.
              </p>
            </div>

          ) : (

            /* ===== Agents ===== */
            <div className="agents-list">

              {/* Table Header */}
              <div className="agents-list-header">
                <div>AGENT</div>
                <div>ROLE</div>
                <div>STATUS</div>
                <div>ACTIONS</div>
              </div>

              {/* Agent Rows */}
              {filteredAgents.map((agent) => (

                <div
                  className="agent-row"
                  key={agent.userId}
                >

                  {/* Agent */}
                  <div className="agent-information">

                    <div className="agent-avatar">
                      {agent.fullName
                        ?.charAt(0)
                        ?.toUpperCase()}
                    </div>

                    <div className="agent-name-container">
                      <h3>{agent.fullName}</h3>

                      <span>
                        IT Support Agent
                      </span>
                    </div>

                  </div>

                  {/* Role */}
                  <div>
                    <span className="agent-role-badge">
                      IT Support Agent
                    </span>
                  </div>

                  {/* Status */}
                  <div className="agent-status">
                    <span className="status-dot"></span>
                    Active
                  </div>

                  {/* Action */}
                  <div className="agent-actions">
                    <Link
                      to={`/agents/${agent.userId}`}
                      className="view-agent-button"
                    >
                      <span>◉</span>
                      View Details
                    </Link>
                  </div>

                </div>

              ))}

            </div>
          )}

          {/* ===== Footer ===== */}
          {!loading && filteredAgents.length > 0 && (
            <div className="agents-footer">

              <span>
                Showing {filteredAgents.length} of {agents.length} agents
              </span>

            </div>
          )}

        </div>

        {/* ===== Information Box ===== */}
        {!loading && agents.length > 0 && (
          <div className="agents-info">

            <div className="info-icon">
              i
            </div>

            <div>
              <h3>About IT Agents</h3>

              <p>
                IT Support Agents handle technical support requests,
                manage assigned tickets, and help employees resolve
                technical issues.
              </p>
            </div>

          </div>
        )}

      </div>
    </AppLayout>
  );
}