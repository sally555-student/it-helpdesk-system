import React from "react";
import "./CompletedWork.css";

function parseBackendUtc(value) {
  if (!value) return null;

  const text = String(value);

  // Already contains timezone information
  if (
    text.endsWith("Z") ||
    /[+-]\d{2}:\d{2}$/.test(text)
  ) {
    return new Date(text);
  }

  // SQL Server datetime2 value is UTC
  return new Date(`${text}Z`);
}


function formatWorkingTime(totalWorkingSeconds) {
  const totalSeconds = Math.max(
    0,
    Math.floor(Number(totalWorkingSeconds) || 0)
  );

  const hours = Math.floor(
    totalSeconds / 3600
  );

  const minutes = Math.floor(
    (totalSeconds % 3600) / 60
  );

  const seconds =
    totalSeconds % 60;

  return (
    `${String(hours).padStart(2, "0")}:` +
    `${String(minutes).padStart(2, "0")}:` +
    `${String(seconds).padStart(2, "0")}`
  );
}


function formatDate(date) {
  const parsed = parseBackendUtc(date);

  if (
    !parsed ||
    Number.isNaN(parsed.getTime())
  ) {
    return "-";
  }

  return parsed.toLocaleString([], {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}


function CompletedWork({ tickets = [] }) {
  return (
    <div className="completed-work">

      <div className="completed-work-header">

        <div>
          <span className="completed-label">
            COMPLETED WORK
          </span>

          <h2>
            Completed Tickets
          </h2>
        </div>

        <span className="completed-count">
          {tickets.length} Completed
        </span>

      </div>


      {tickets.length === 0 ? (

        <div className="completed-empty">

          <strong>
            No completed tickets yet
          </strong>

          <span>
            Completed tickets will appear here once work is finished.
          </span>

        </div>

      ) : (

        <div className="completed-table-wrapper">

          <table className="completed-table">

            <thead>

              <tr>
                <th>Ticket</th>
                <th>Started At</th>
                <th>Finished At</th>
                <th>Total Time</th>
                <th>Status</th>
                <th>Created By</th>
                <th>Completed By</th>
              </tr>

            </thead>


            <tbody>

              {tickets.map((ticket) => (

                <tr key={ticket.ticketId}>

                  {/* TICKET */}
                  <td>

                    <div className="completed-ticket">

                      <strong>
                        {ticket.ticketReference}
                      </strong>

                      <span>
                        {ticket.title}
                      </span>

                    </div>

                  </td>


                  {/* STARTED */}
                  <td>
                    {formatDate(
                      ticket.workingStartedAt
                    )}
                  </td>


                  {/* FINISHED */}
                  <td>
                    {formatDate(
                      ticket.workingFinishedAt
                    )}
                  </td>


                  {/* TOTAL */}
                  <td>

                    <span className="total-working-time">

                      {formatWorkingTime(
                        ticket.totalWorkingSeconds
                      )}

                    </span>

                  </td>


                  {/* STATUS */}
                  <td>

                    <span className="completed-status">

                      <span className="completed-status-dot" />

                      {ticket.statusName ||
                        "Resolved"}

                    </span>

                  </td>


                  {/* CREATED BY */}
                  <td>
                    {ticket.createdByUserName ||
                      "-"}
                  </td>


                  {/* COMPLETED BY */}
                  <td>
                    {ticket.assignedToUserName ||
                      "-"}
                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

      )}

    </div>
  );
}

export default CompletedWork;