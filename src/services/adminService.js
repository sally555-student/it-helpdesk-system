import api from "./authService";

/**
 * Get all users.
 * Backend: GET /api/user
 */
export async function getUsers() {
  const response = await api.get("/user");
  return response.data;
}

/**
 * Get all activity logs.
 * Backend: GET /api/AuditLog
 */
export async function getActivityLogs() {
  const response = await api.get("/AuditLog");
  return response.data;
}


/**
 * Enable or disable a user.
 * Backend: PUT /api/user/{id}/status
 */
export async function updateUserStatus(userId, isActive) {
  const response = await api.put(
    `/user/${userId}/status`,
    {
      isActive,
    }
  );

  return response.data;
}

/**
 * Get lookup data.
 * Backend: GET /api/lookup
 *
 * Returns:
 * {
 *   categories: [],
 *   priorities: [],
 *   statuses: []
 * }
 */
export async function getLookups() {
  const response = await api.get("/lookup");
  return response.data;
}

/**
 * Get tickets.
 * Backend: GET /api/ticket
 */
export async function getTickets() {
  const response = await api.get("/ticket");
  return response.data;
}

export async function getCategories() {
  const response = await api.get("/category");
  return response.data;
}

export async function createCategory(categoryName) {
  const response = await api.post("/category", {
    categoryName,
  });

  return response.data;
}

export async function deleteCategory(categoryId) {
  const response = await api.delete(
    `/category/${categoryId}`
  );

  return response.data;
}
