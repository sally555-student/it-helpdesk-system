import api from "./authService";

export async function getComments(ticketId) {
  const response = await api.get(
    `/tickets/${ticketId}/comments`
  );

  return response.data;
}

export async function addComment(ticketId, data) {
  const response = await api.post(
    `/tickets/${ticketId}/comments`,
    data
  );

  return response.data;
}