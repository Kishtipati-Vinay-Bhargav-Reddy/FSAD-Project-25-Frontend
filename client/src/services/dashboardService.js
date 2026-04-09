import api from "./api";

const buildParams = (params = {}) => ({
  ...(params.studentEmail && { studentEmail: params.studentEmail }),
  ...(params.status && { status: params.status }),
  ...(params.courseCode && { courseCode: params.courseCode }),
  ...(params.assignmentId && { assignmentId: params.assignmentId }),
  ...(params.studentName && { studentName: params.studentName }),
});

const withParams = (params = {}) => {
  const safeParams = buildParams(params);
  return Object.keys(safeParams).length > 0 ? { params: safeParams } : undefined;
};

export const fetchTeacherDashboard = async (filters = {}) => {
  try {
    const [assignRes, submissionRes] = await Promise.all([
      api.get("/assignments", withParams({ courseCode: filters.courseCode })),
      api.get("/submissions", withParams(filters)),
    ]);

    const assignments = assignRes.data || [];
    const submissions = submissionRes.data || [];
    const gradedSubmissions = submissions.filter(
      (submission) => submission.grade != null
    );

    return {
      assignments,
      submissions,
      stats: {
        totalAssignments: assignments.length,
        submittedCount: submissions.length,
        gradedCount: submissions.filter(
          (submission) => submission.status === "GRADED"
        ).length,
        averageGrade: gradedSubmissions.length
          ? Math.round(
              gradedSubmissions.reduce(
                (sum, submission) => sum + Number(submission.grade || 0),
                0
              ) / gradedSubmissions.length
            )
          : 0,
      },
    };
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const fetchStudentDashboard = async ({
  studentEmail,
  status,
  courseCode,
} = {}) => {
  if (!studentEmail) {
    return { assignments: [], submissions: [], stats: {} };
  }

  try {
    const [assignRes, submissionRes] = await Promise.all([
      api.get("/assignments"),
      api.get(
        "/submissions/mine",
        withParams({
          studentEmail,
          status,
          courseCode,
        })
      ),
    ]);

    const assignments = assignRes.data || [];
    const submissions = submissionRes.data || [];
    const gradedSubmissions = submissions.filter(
      (submission) => submission.grade != null
    );

    return {
      assignments,
      submissions,
      stats: {
        totalAssignments: assignments.length,
        submittedCount: submissions.length,
        gradedCount: submissions.filter(
          (submission) => submission.status === "GRADED"
        ).length,
        averageGrade: gradedSubmissions.length
          ? Math.round(
              gradedSubmissions.reduce(
                (sum, submission) => sum + Number(submission.grade || 0),
                0
              ) / gradedSubmissions.length
            )
          : 0,
      },
    };
  } catch (error) {
    console.error(error);
    throw error;
  }
};
