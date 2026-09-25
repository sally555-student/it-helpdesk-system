import api from "./authService";

export async function getLookups() {
  const response = await api.get("/lookup");
  return response.data; // { categories, priorities, statuses }
}

export async function getAgents() {
  const response = await api.get("/user/agents");
  return response.data; // [{ userId, fullName }]
}

export async function getTickets(filters = {}) {
  const params = {};
  if (filters.statusId) params.statusId = filters.statusId;
  if (filters.categoryId) params.categoryId = filters.categoryId;
  if (filters.priorityId) params.priorityId = filters.priorityId;
  if (filters.search) params.search = filters.search;

  const response = await api.get("/ticket", { params });
  return response.data;
}

export async function getTicketById(id) {
  const response = await api.get(`/ticket/${id}`);
  return response.data;
}

export async function createTicket(data) {
  const response = await api.post("/ticket", data);
  return response.data;
}

export async function updateTicket(id, data) {
  const response = await api.put(`/ticket/${id}`, data);
  return response.data;
}

export async function deleteTicket(id) {
  await api.delete(`/ticket/${id}`);}

  export async function assignTicket(id, agentId) {
  const response = await api.put(`/ticket/${id}/assign`, {
    assignedToUserId: agentId,
  });

  return response.data;
}

