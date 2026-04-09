import api from "./api";

const buildRequestConfig = (params = {}) => {
  const safeParams = {
    ...(params.courseCode && { courseCode: params.courseCode }),
  };

  return Object.keys(safeParams).length > 0 ? { params: safeParams } : undefined;
};

const buildTeacherCourseFilterConfig = (filters = {}) => {
  const safeParams = {
    ...(filters.status && { status: filters.status }),
    ...(filters.studentName && { studentName: filters.studentName }),
  };

  return Object.keys(safeParams).length > 0 ? { params: safeParams } : undefined;
};

export const createAssignment = async (assignment) => {
  const formattedDate = assignment.dueDate?.trim();

  if (!formattedDate) {
    throw new Error("Assignment deadline missing");
  }

  const formData = new FormData();
  formData.append("title", assignment.title?.trim() || "");
  formData.append("description", assignment.description?.trim() || "");
  formData.append("dueDate", formattedDate);
  formData.append("courseCode", assignment.courseCode?.trim()?.toUpperCase() || "");
  formData.append("courseName", assignment.courseName?.trim() || "");

  if (assignment.questionFile) {
    formData.append("questionFile", assignment.questionFile);
  }

  const { data } = await api.post("/assignments", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return data;
};

export const fetchAssignments = async (courseCode) => {
  try {
    const response = await api.get(
      "/assignments",
      buildRequestConfig({ courseCode })
    );
    return response.data;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const fetchCourses = async () => {
  try {
    const response = await api.get("/assignments/courses");
    console.log("Courses API response:", response.data);
    return response.data;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const fetchTeacherCourses = async () => {
  try {
    const response = await api.get("/teacher/courses");
    console.log("Courses API response:", response.data);
    return response.data;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const fetchFilteredTeacherCourses = async (filters = {}) => {
  try {
    const requestConfig = buildTeacherCourseFilterConfig(filters);
    const response = requestConfig
      ? await api.get("/teacher/courses/filter", requestConfig)
      : await api.get("/teacher/courses");
    console.log("Filtered teacher courses API response:", response.data);
    return response.data;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const createCourse = async (course) => {
  const { data } = await api.post("/assignments/courses", {
    code: course.code?.trim()?.toUpperCase(),
    name: course.name?.trim(),
    department: course.department?.trim(),
    term: course.term?.trim(),
  });

  return data;
};

export const removeCourse = async (courseCode) => {
  const { data } = await api.put(
    `/assignments/courses/${encodeURIComponent(courseCode)}/remove`
  );

  return data;
};

export const removeAssignment = async (assignmentId) => {
  const { data } = await api.put(`/assignments/${assignmentId}/remove`);
  return data;
};

export const getAssignmentQuestionFileUrl = (assignmentId) =>
  `${api.defaults.baseURL}/assignments/${assignmentId}/question-file`;
