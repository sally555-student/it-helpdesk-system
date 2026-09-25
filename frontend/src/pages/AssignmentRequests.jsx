
import { useEffect, useState } from "react";
import AppLayout from "../components/AppLayout";
import * as assignmentService from "../services/assignmentRequestService";

/*
 * Backend dates are stored in UTC.
 * This function makes sure the browser interprets them as UTC
 * before converting them to the user's local timezone.
 */
function formatDateTime(value) {
  if (!value) return "-";

  let text = String(value).trim();

  // If backend sends a date without timezone information,
  // explicitly tell JavaScript that it is UTC.
  if (
    !text.endsWith("Z") &&
    !/[+-]\d{2}:\d{2}$/.test(text)
  ) {
    text += "Z";
  }

  const date = new Date(text);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export default function AssignmentRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadRequests() {
    try {
      setLoading(true);
      setError("");

      const data = await assignmentService.getMyRequests();

      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);

      setError(
        "Couldn't load your assignment requests."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRequests();
  }, []);

  return (
    <AppLayout>
      <div className="page-header">
        <h1>My Assignment Requests</h1>
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
          You have no assignment requests.
        </p>
      ) : (
        <table className="ticket-table">
          <thead>
            <tr>
              <th>Reference</th>
              <th>Ticket</th>
              <th>Status</th>
              <th>Requested</th>
            </tr>
          </thead>

          <tbody>
            {requests.map((request) => (
              <tr key={request.requestId}>
                <td>
                  {request.ticketReference}
                </td>

                <td>
                  {request.ticketTitle}
                </td>

                <td>
                  <span
                    className={`badge status-${String(
                      request.status || ""
                    ).toLowerCase()}`}
                  >
                    {request.status}
                  </span>
                </td>

                <td>
                  {formatDateTime(request.createdDate)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </AppLayout>
  );
}

