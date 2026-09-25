import api from "./authService";

// Agent: request to work on a ticket
export async function createRequest(ticketId) {
  const response = await api.post(
    "/TicketAssignmentRequest",
    null,
    {
      params: { ticketId },
    }
  );

  return response.data;
}

// Agent: get his own requests
export async function getMyRequests() {
  const response = await api.get(
    "/TicketAssignmentRequest/my"
  );

  return response.data;
}

// Manager/Admin: get pending requests
export async function getPendingRequests() {
  const response = await api.get(
    "/TicketAssignmentRequest/pending"
  );

  return response.data;
}

// Manager/Admin: approve request
export async function approveRequest(requestId) {
  const response = await api.put(
    `/TicketAssignmentRequest/${requestId}/approve`
  );

  return response.data;
}

// Manager/Admin: reject request
export async function rejectRequest(requestId) {
  const response = await api.put(
    `/TicketAssignmentRequest/${requestId}/reject`
  );

  return response.data;
}

// For dashboard compatibility
export async function getAllRequests() {
  return getPendingRequests();
}