import api from "./api";

const buildParams = (filters = {}) => ({
  ...(filters.assignmentId && { assignmentId: filters.assignmentId }),
  ...(filters.studentEmail && { studentEmail: filters.studentEmail }),
  ...(filters.studentName && { studentName: filters.studentName }),
  ...(filters.status && { status: filters.status }),
  ...(filters.courseCode && { courseCode: filters.courseCode }),
});

const withParams = (filters = {}) => {
  const safeParams = buildParams(filters);
  return Object.keys(safeParams).length > 0 ? { params: safeParams } : undefined;
};

export const submitAssignment = async (formData) => {
  const assignmentId = formData.get("assignmentId");
  const file = formData.get("file");
  const studentName = formData.get("studentName");
  const studentEmail = formData.get("studentEmail");

  if (!assignmentId) throw new Error("Assignment not selected");
  if (!file) throw new Error("File not selected");
  if (!studentName) throw new Error("Student name missing");
  if (!studentEmail) throw new Error("Student email missing");

  const { data } = await api.post("/submissions/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return data;
};

export const fetchSubmissionsByAssignment = async (assignmentId) => {
  if (!assignmentId) {
    return [];
  }

  try {
    const response = await api.get(`/submissions/${assignmentId}`);
    return response.data;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const getAllSubmissions = async (filters = {}) => {
  try {
    const response = await api.get("/submissions", withParams(filters));
    return response.data;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const getMySubmissions = async (filters = {}) => {
  try {
    const response = await api.get("/submissions/mine", withParams(filters));
    return response.data;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const gradeSubmission = async (id, payload) => {
  if (!id) throw new Error("Submission ID missing");

  const { data } = await api.put(`/submissions/grade/${id}`, payload);
  return data;
};

export const fetchSubmissionAnalytics = async () => {
  try {
    const response = await api.get("/submissions/analytics");
    return response.data;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const fetchAnalyticsSummary = async () => {
  try {
    const response = await api.get("/analytics/summary");
    return response.data;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const downloadAssignmentZip = async (
  assignmentId,
  assignmentTitle = "assignment"
) => {
  const response = await api.get(
    `/submissions/assignment/${assignmentId}/download-zip`,
    {
      responseType: "blob",
    }
  );

  const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = `${assignmentTitle || "assignment"}-submissions.zip`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);
};

export const getFileUrl = (fileName) => {
  if (!fileName) return null;
  return `http://localhost:8080/submissions/file/${fileName}`;
};
