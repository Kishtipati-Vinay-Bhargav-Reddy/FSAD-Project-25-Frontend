import api from "./api";


export const fetchTeacherDashboard = async () => {
  try {
    const [assignRes, submissionRes] = await Promise.all([
      api.get("/assignments"),
      api.get("/submissions"),
    ]);

    const assignments = assignRes.data || [];
    const submissions = submissionRes.data || [];

    return {
      assignments,
      submissions,
      stats: {
        totalAssignments: assignments.length,
        submittedCount: submissions.length,
        gradedCount: submissions.filter(s => s.status === "GRADED").length,
        averageGrade: submissions.length
          ? Math.round(
              submissions
                .filter(s => s.grade != null)
                .reduce((a, b) => a + b.grade, 0) /
                (submissions.filter(s => s.grade != null).length || 1)
            )
          : 0,
      },
    };
  } catch (error) {
    console.error("TEACHER ERROR:", error);
    return { assignments: [], submissions: [], stats: {} };
  }
};


export const fetchStudentDashboard = async ({ studentEmail, studentName } = {}) => {
  try {
    if (!studentEmail) {
      return { assignments: [], submissions: [], stats: {} };
    }

    const [assignRes, submissionRes] = await Promise.all([
      api.get("/assignments"),
      api.get("/submissions/mine", {
        params: {
          studentEmail,
          studentName,
        },
      }),
    ]);

    const assignments = assignRes.data || [];
    const submissions = submissionRes.data || [];

    return {
      assignments,
      submissions,
      stats: {
        totalAssignments: assignments.length,
        submittedCount: submissions.length,
        gradedCount: submissions.filter(s => s.status === "GRADED").length,
        averageGrade:
          submissions.length > 0
            ? Math.round(
                submissions
                  .filter(s => s.grade != null)
                  .reduce((acc, s) => acc + s.grade, 0) /
                  (submissions.filter(s => s.grade != null).length || 1)
              )
            : 0,
      },
    };
  } catch (error) {
    console.error("STUDENT ERROR:", error);
    return { assignments: [], submissions: [], stats: {} };
  }
};
