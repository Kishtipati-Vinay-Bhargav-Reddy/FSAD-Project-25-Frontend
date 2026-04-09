import api from "./api";

export const fetchUsers = async () => {
  try {
    const response = await api.get("/admin/users");
    return response.data;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const updateUserRole = async (userId, role) => {
  const { data } = await api.put(`/admin/users/${userId}/role`, { role });
  return data;
};

export const deleteCourseAsAdmin = async (courseCode) => {
  const { data } = await api.delete(`/admin/courses/${encodeURIComponent(courseCode)}`);
  return data;
};
