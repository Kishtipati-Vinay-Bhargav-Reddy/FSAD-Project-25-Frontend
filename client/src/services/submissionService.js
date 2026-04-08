import api from "./api";


export const submitAssignment = async (formData) => {
  try {
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
  } catch (error) {
    console.error("UPLOAD ERROR:", error.response?.data || error.message);
    throw error;
  }
};


export const fetchSubmissionsByAssignment = async (assignmentId) => {
  try {
    if (!assignmentId) return [];

    const { data } = await api.get(`/submissions/${assignmentId}`);
    return data;
  } catch (error) {
    console.error("FETCH ERROR:", error.response?.data || error.message);
    return [];
  }
};

export const getAllSubmissions = async () => {
  try {
    const { data } = await api.get("/submissions");
    return data;
  } catch (error) {
    console.error("GET ALL ERROR:", error.response?.data || error.message);
    return [];
  }
};


export const gradeSubmission = async (id, payload) => {
  try {
    if (!id) throw new Error("Submission ID missing");

    const { data } = await api.put(`/submissions/grade/${id}`, payload);
    return data;
  } catch (error) {
    console.error("GRADE ERROR:", error.response?.data || error.message);
    throw error;
  }
};


export const getFileUrl = (fileName) => {
  if (!fileName) return null;
  return `http://localhost:8080/submissions/file/${fileName}`;
};
