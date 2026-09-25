import { useEffect, useState } from "react";
import AppLayout from "../components/AppLayout";
import * as assignmentService from "../services/assignmentRequestService";

export default function AssignmentRequestManagement() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [processingId, setProcessingId] = useState(null);

  async function loadRequests() {
    try {
      setLoading(true);
      setError("");

      const data =
        await assignmentService.getPendingRequests();

      setRequests(data);
    } catch (err) {
      console.error(err);
      setError(
        "Couldn't load assignment requests."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRequests();
  }, []);

  async function handleApprove(requestId) {
    try {
      setProcessingId(requestId);
      setError("");

      await assignmentService.approveRequest(
        requestId
      );

      alert(
        "Request approved and ticket assigned."
      );

      await loadRequests();
    } catch (err) {
      console.error(err);

      setError(
        err?.response?.data ||
          "Failed to approve request."
      );
    } finally {
      setProcessingId(null);
    }
  }

  async function handleReject(requestId) {
    try {
      setProcessingId(requestId);
      setError("");

      await assignmentService.rejectRequest(
        requestId
      );

      alert("Request rejected.");

      await loadRequests();
    } catch (err) {
      console.error(err);

      setError(
        err?.response?.data ||
          "Failed to reject request."
      );
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <AppLayout>
      <div className="page-header">
        <h1>Assignment Requests</h1>
      </div>

      {error && (
        <div className="error-banner">
          {error}
        </div>
      )}

      {loading ? (
        <p className="muted">
          Loading requests...
        </p>
      ) : requests.length === 0 ? (
        <p className="muted">
          No pending assignment requests.
        </p>
      ) : (
        <table className="ticket-table">
          <thead>
            <tr>
              <th>Ticket</th>
              <th>Agent</th>
              <th>Status</th>
              <th>Requested</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {requests.map((request) => (
              <tr key={request.requestId}>

                <td>
                  <strong>
                    {request.ticketTitle}
                  </strong>
                </td>

                <td>
                  {request.agentName}
                </td>

                <td>
                  <span className="badge status-pending">
                    {request.status}
                  </span>
                </td>

                <td>
                  {new Date(
                    request.requestedAt
                  ).toLocaleString()}
                </td>

                <td>
                  <button
                    className="button-link"
                    disabled={
                      processingId ===
                      request.requestId
                    }
                    onClick={() =>
                      handleApprove(
                        request.requestId
                      )
                    }
                  >
                    Approve
                  </button>

                  <button
                    className="button-link"
                    disabled={
                      processingId ===
                      request.requestId
                    }
                    onClick={() =>
                      handleReject(
                        request.requestId
                      )
                    }
                    style={{
                      marginLeft: "8px",
                    }}
                  >
                    Reject
                  </button>
                </td>

              </tr>
            ))}
          </tbody>
        </table>
      )}
    </AppLayout>
  );
}