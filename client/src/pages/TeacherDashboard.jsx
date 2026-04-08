import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import SectionHeader from "../components/SectionHeader";
import StatCard from "../components/StatCard";
import {
  createAssignment,
  createCourse,
  fetchAssignments,
  fetchCourses,
  getAssignmentQuestionFileUrl,
  removeAssignment,
  removeCourse,
} from "../services/assignmentService";
import {
  getAllSubmissions,
  gradeSubmission,
  getFileUrl,
} from "../services/submissionService";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { formatDueDate } from "../utils/dateTime";

const EMPTY_ASSIGNMENT_FORM = {
  title: "",
  description: "",
  dueDate: "",
  questionFile: null,
};

const EMPTY_COURSE_FORM = {
  code: "",
  name: "",
  department: "",
  term: "",
};

const UNASSIGNED_COURSE = {
  code: "UNASSIGNED",
  name: "Course Not Assigned",
  department: "General",
  term: "Existing assignments",
};

const normalizeCourseCode = (courseCode) =>
  courseCode?.trim()?.toUpperCase() || UNASSIGNED_COURSE.code;

const buildStats = (assignments, submissions) => {
  const gradedSubmissions = submissions.filter(
    (submission) => submission.grade != null
  );

  return {
    totalAssignments: assignments.length,
    submittedCount: submissions.length,
    gradedCount: submissions.filter(
      (submission) => submission.status === "GRADED"
    ).length,
    averageGrade: gradedSubmissions.length
      ? (
          gradedSubmissions.reduce(
            (sum, submission) => sum + Number(submission.grade || 0),
            0
          ) / gradedSubmissions.length
        ).toFixed(1)
      : "0.0",
  };
};

const getErrorMessage = (error, fallbackMessage) =>
  error?.response?.data?.message ||
  error?.response?.data ||
  error?.message ||
  fallbackMessage;

const TeacherDashboard = () => {
  const { user, logout } = useAuth();
  const { pushToast } = useToast();

  const [courses, setCourses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [allSubmissions, setAllSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedCourseCode, setSelectedCourseCode] = useState("");
  const [selectedAssignment, setSelectedAssignment] = useState("");

  const [assignmentForm, setAssignmentForm] = useState(EMPTY_ASSIGNMENT_FORM);
  const [courseForm, setCourseForm] = useState(EMPTY_COURSE_FORM);
  const [grading, setGrading] = useState({});

  const [creatingAssignment, setCreatingAssignment] = useState(false);
  const [creatingCourse, setCreatingCourse] = useState(false);
  const [removingCourse, setRemovingCourse] = useState(false);
  const [removingAssignmentId, setRemovingAssignmentId] = useState(null);
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [assignmentFileInputKey, setAssignmentFileInputKey] = useState(0);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [coursesData, assignmentsData, submissionsData] = await Promise.all([
        fetchCourses(),
        fetchAssignments(),
        getAllSubmissions(),
      ]);

      setCourses(coursesData || []);
      setAssignments(assignmentsData || []);
      setAllSubmissions(submissionsData || []);
    } catch (error) {
      pushToast(
        getErrorMessage(error, "Unable to load dashboard."),
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  const courseCards = useMemo(() => {
    const courseMap = new Map();

    (courses || []).forEach((course) => {
      courseMap.set(normalizeCourseCode(course.code), {
        ...course,
        code: normalizeCourseCode(course.code),
        name: course.name || "Course",
      });
    });

    (assignments || []).forEach((assignment) => {
      const courseCode = normalizeCourseCode(assignment.courseCode);

      if (!courseMap.has(courseCode)) {
        courseMap.set(courseCode, {
          code: courseCode,
          name: assignment.courseName || UNASSIGNED_COURSE.name,
          department: UNASSIGNED_COURSE.department,
          term: UNASSIGNED_COURSE.term,
        });
      }
    });

    return Array.from(courseMap.values())
      .map((course) => {
        const courseAssignments = assignments.filter(
          (assignment) => normalizeCourseCode(assignment.courseCode) === course.code
        );
        const courseAssignmentIds = new Set(
          courseAssignments.map((assignment) => assignment.id)
        );
        const courseSubmissions = allSubmissions.filter((submission) =>
          courseAssignmentIds.has(submission.assignmentId)
        );

        return {
          ...course,
          stats: buildStats(courseAssignments, courseSubmissions),
        };
      })
      .filter(
        (course) =>
          course.code === UNASSIGNED_COURSE.code
            ? course.stats.totalAssignments > 0
            : course.active !== false
      );
  }, [courses, assignments, allSubmissions]);

  const selectedCourse = useMemo(
    () => courseCards.find((course) => course.code === selectedCourseCode) || null,
    [courseCards, selectedCourseCode]
  );

  const selectedAssignments = useMemo(
    () =>
      selectedCourse
        ? assignments.filter(
            (assignment) =>
              normalizeCourseCode(assignment.courseCode) === selectedCourse.code
          )
        : [],
    [assignments, selectedCourse]
  );

  const selectedAssignmentIds = useMemo(
    () => new Set(selectedAssignments.map((assignment) => assignment.id)),
    [selectedAssignments]
  );

  const selectedCourseSubmissions = useMemo(
    () =>
      allSubmissions.filter((submission) =>
        selectedAssignmentIds.has(submission.assignmentId)
      ),
    [allSubmissions, selectedAssignmentIds]
  );

  const selectedAssignmentSubmissions = useMemo(() => {
    if (!selectedAssignment) {
      return [];
    }

    return selectedCourseSubmissions.filter(
      (submission) => submission.assignmentId === Number(selectedAssignment)
    );
  }, [selectedAssignment, selectedCourseSubmissions]);

  const dashboardStats = useMemo(
    () =>
      selectedCourse
        ? buildStats(selectedAssignments, selectedCourseSubmissions)
        : buildStats(assignments, allSubmissions),
    [
      selectedCourse,
      selectedAssignments,
      selectedCourseSubmissions,
      assignments,
      allSubmissions,
    ]
  );

  useEffect(() => {
    setSelectedAssignment("");
    setGrading({});
    setAssignmentForm({ ...EMPTY_ASSIGNMENT_FORM });
    setAssignmentFileInputKey((prev) => prev + 1);
  }, [selectedCourseCode]);

  useEffect(() => {
    if (
      selectedAssignment &&
      !selectedAssignments.some(
        (assignment) => assignment.id === Number(selectedAssignment)
      )
    ) {
      setSelectedAssignment("");
      setGrading({});
    }
  }, [selectedAssignment, selectedAssignments]);

  const handleCreateAssignment = async (e) => {
    e.preventDefault();

    if (!selectedCourse) {
      pushToast("Select a course first.", "error");
      return;
    }

    if (
      !assignmentForm.title ||
      !assignmentForm.description ||
      !assignmentForm.dueDate
    ) {
      pushToast("Complete all assignment fields.", "error");
      return;
    }

    setCreatingAssignment(true);
    try {
      await createAssignment({
        ...assignmentForm,
        courseCode: selectedCourse.code,
        courseName: selectedCourse.name,
      });

      pushToast("Assignment created.", "success");
      setAssignmentForm({ ...EMPTY_ASSIGNMENT_FORM });
      setAssignmentFileInputKey((prev) => prev + 1);
      await loadDashboard();
    } catch (error) {
      pushToast(
        getErrorMessage(error, "Error creating assignment."),
        "error"
      );
    } finally {
      setCreatingAssignment(false);
    }
  };

  const handleCreateCourse = async (e) => {
    e.preventDefault();

    if (
      !courseForm.code ||
      !courseForm.name ||
      !courseForm.department ||
      !courseForm.term
    ) {
      pushToast("Complete all course fields.", "error");
      return;
    }

    setCreatingCourse(true);
    try {
      const newCourse = await createCourse(courseForm);

      pushToast("Course created.", "success");
      setCourseForm(EMPTY_COURSE_FORM);
      setShowCourseForm(false);
      await loadDashboard();
      setSelectedCourseCode(normalizeCourseCode(newCourse.code));
    } catch (error) {
      pushToast(
        getErrorMessage(error, "Unable to create course."),
        "error"
      );
    } finally {
      setCreatingCourse(false);
    }
  };

  const handleGradeChange = (id, field, value) => {
    setGrading((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const handleGradeSubmit = async (id) => {
    const payload = grading[id];
    const existingSubmission = selectedAssignmentSubmissions.find(
      (submission) => submission.id === id
    );
    const gradeValue = payload?.grade ?? existingSubmission?.grade;

    if (gradeValue == null || gradeValue === "") {
      pushToast("Enter valid grade.", "error");
      return;
    }

    try {
      await gradeSubmission(id, {
        grade: Number(gradeValue),
        feedback: payload?.feedback ?? existingSubmission?.feedback ?? "",
      });

      pushToast("Grade saved.", "success");
      await loadDashboard();
    } catch (error) {
      pushToast(getErrorMessage(error, "Unable to grade."), "error");
    }
  };

  const handleRemoveSelectedCourse = async () => {
    if (!selectedCourse || selectedCourse.code === UNASSIGNED_COURSE.code) {
      return;
    }

    const shouldRemove = window.confirm(
      `Remove ${selectedCourse.name}? This will hide the course from normal use, but it will not be permanently deleted.`
    );

    if (!shouldRemove) {
      return;
    }

    setRemovingCourse(true);
    try {
      await removeCourse(selectedCourse.code);
      pushToast("Course removed. Existing data was preserved.", "success");
      setSelectedCourseCode("");
      setSelectedAssignment("");
      await loadDashboard();
    } catch (error) {
      pushToast(
        getErrorMessage(error, "Unable to remove course."),
        "error"
      );
    } finally {
      setRemovingCourse(false);
    }
  };

  const handleRemoveAssignment = async (assignment) => {
    const shouldRemove = window.confirm(
      `Remove ${assignment.title}? This will hide the assignment from the course, but it will not be permanently deleted.`
    );

    if (!shouldRemove) {
      return;
    }

    setRemovingAssignmentId(assignment.id);
    try {
      await removeAssignment(assignment.id);
      pushToast("Assignment removed. Existing data was preserved.", "success");

      if (selectedAssignment === String(assignment.id)) {
        setSelectedAssignment("");
        setGrading({});
      }

      await loadDashboard();
    } catch (error) {
      pushToast(
        getErrorMessage(error, "Unable to remove assignment."),
        "error"
      );
    } finally {
      setRemovingAssignmentId(null);
    }
  };

  if (loading) {
    return <div className="text-white text-center mt-20">Loading...</div>;
  }

  return (
    <div className="min-h-screen px-6 py-10">
      <div className="container mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">
          <div>
            <p className="uppercase text-xs tracking-[0.3em] text-slate-200/60">
              Teacher dashboard
            </p>
            <h1 className="font-display text-3xl text-white mt-2">
              Welcome, {user?.name}
            </h1>
          </div>

          <button onClick={logout} className="btn-secondary">
            Logout
          </button>
        </div>

        <div className="grid md:grid-cols-4 gap-4 mb-10">
          <StatCard
            label={selectedCourse ? "Assignments" : "Courses"}
            value={selectedCourse ? dashboardStats.totalAssignments : courseCards.length}
            hint={selectedCourse ? "In this course" : "Available to manage"}
          />
          <StatCard
            label="Submissions"
            value={dashboardStats.submittedCount}
            hint={selectedCourse ? "For this course only" : "Across all courses"}
          />
          <StatCard
            label="Graded"
            value={dashboardStats.gradedCount}
            hint="Reviewed student work"
          />
          <StatCard
            label="Avg Grade"
            value={`${dashboardStats.averageGrade}/10`}
            hint={selectedCourse ? "Within selected course" : "Across graded submissions"}
          />
        </div>

        <div className="glass-panel p-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <SectionHeader
              title="Choose Course"
              subtitle="Open one course at a time to create assignments and grade submissions separately."
            />

            <button
              type="button"
              className="btn-secondary"
              onClick={() => setShowCourseForm((prev) => !prev)}
            >
              {showCourseForm ? "Close course form" : "Create new course"}
            </button>
          </div>

          {showCourseForm ? (
            <form
              onSubmit={handleCreateCourse}
              className="border border-white/10 rounded-[20px] bg-white/5 p-5 mb-6"
            >
              <div className="grid md:grid-cols-2 gap-4">
                <input
                  className="input-field"
                  placeholder="Course code"
                  value={courseForm.code}
                  onChange={(e) =>
                    setCourseForm((prev) => ({ ...prev, code: e.target.value }))
                  }
                />

                <input
                  className="input-field"
                  placeholder="Course name"
                  value={courseForm.name}
                  onChange={(e) =>
                    setCourseForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                />

                <input
                  className="input-field"
                  placeholder="Department"
                  value={courseForm.department}
                  onChange={(e) =>
                    setCourseForm((prev) => ({
                      ...prev,
                      department: e.target.value,
                    }))
                  }
                />

                <input
                  className="input-field"
                  placeholder="Term"
                  value={courseForm.term}
                  onChange={(e) =>
                    setCourseForm((prev) => ({ ...prev, term: e.target.value }))
                  }
                />
              </div>

              <button className="btn-primary mt-4" type="submit">
                {creatingCourse ? "Creating..." : "Save course"}
              </button>
            </form>
          ) : null}

          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {courseCards.map((course) => (
              <button
                key={course.code}
                type="button"
                className={`text-left rounded-[20px] border p-5 transition ${
                  selectedCourse?.code === course.code
                    ? "border-amber-200/70 bg-amber-200/10"
                    : "border-white/10 bg-white/5 hover:bg-white/10"
                }`}
                onClick={() => setSelectedCourseCode(course.code)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-200/60">
                      {course.code}
                    </p>
                    <h3 className="mt-3 text-xl text-white font-display">
                      {course.name}
                    </h3>
                    <p className="mt-2 text-sm text-slate-200/70">
                      {course.department} | {course.term}
                    </p>
                  </div>

                  <span className="btn-pill">{course.stats.totalAssignments}</span>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-5 text-sm text-slate-200/80">
                  <div className="rounded-2xl border border-white/10 bg-black/10 px-3 py-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-200/60">
                      Submissions
                    </p>
                    <p className="mt-2 text-lg text-white">
                      {course.stats.submittedCount}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/10 px-3 py-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-200/60">
                      Graded
                    </p>
                    <p className="mt-2 text-lg text-white">
                      {course.stats.gradedCount}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {selectedCourse ? (
          <>
            <div className="glass-panel p-6 mt-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <p className="uppercase text-xs tracking-[0.3em] text-slate-200/60">
                  Selected course
                </p>
                <h2 className="font-display text-2xl text-white mt-2">
                  {selectedCourse.name}
                </h2>
                <p className="text-slate-200/70 mt-2">
                  {selectedCourse.code} | {selectedCourse.department} | {selectedCourse.term}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setSelectedCourseCode("")}
                >
                  Back to courses
                </button>

                {selectedCourse.code !== UNASSIGNED_COURSE.code ? (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={handleRemoveSelectedCourse}
                    disabled={removingCourse}
                  >
                    {removingCourse ? "Removing..." : "Remove course"}
                  </button>
                ) : null}
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-8 mt-10">
              <motion.div className="glass-panel p-6">
                <SectionHeader
                  title="Create Assignment"
                  subtitle={`New work created here will stay inside ${selectedCourse.name}.`}
                />

                <form onSubmit={handleCreateAssignment} className="space-y-4">
                  <input
                    className="input-field"
                    placeholder="Title"
                    value={assignmentForm.title}
                    onChange={(e) =>
                      setAssignmentForm((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                  />

                  <textarea
                    className="input-field"
                    placeholder="Description"
                    value={assignmentForm.description}
                    onChange={(e) =>
                      setAssignmentForm((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                  />

                  <div>
                    <label className="text-xs uppercase tracking-[0.2em] text-slate-200/70">
                      Assignment deadline
                    </label>
                    <input
                      type="datetime-local"
                      className="input-field mt-2"
                      value={assignmentForm.dueDate}
                      onChange={(e) =>
                        setAssignmentForm((prev) => ({
                          ...prev,
                          dueDate: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div>
                    <label className="text-xs uppercase tracking-[0.2em] text-slate-200/70">
                      Question file (optional)
                    </label>
                    <input
                      key={assignmentFileInputKey}
                      type="file"
                      accept=".pdf,.doc,.docx"
                      className="input-field mt-2"
                      onChange={(e) =>
                        setAssignmentForm((prev) => ({
                          ...prev,
                          questionFile: e.target.files?.[0] || null,
                        }))
                      }
                    />
                    <p className="text-xs text-slate-200/60 mt-2">
                      Upload a PDF or Word file containing the assignment questions.
                    </p>
                  </div>

                  <button
                    className="btn-primary w-full"
                    type="submit"
                    disabled={creatingAssignment}
                  >
                    {creatingAssignment ? "Creating..." : "Create assignment"}
                  </button>
                </form>
              </motion.div>

              <motion.div className="glass-panel p-6">
                <SectionHeader
                  title="Course Assignments"
                  subtitle="Only assignments from the selected course are listed here."
                />

                {selectedAssignments.length === 0 ? (
                  <p className="text-slate-300">
                    No assignments created for this course yet.
                  </p>
                ) : (
                  selectedAssignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="mb-4 border border-white/10 rounded-xl p-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div>
                          <p className="text-white font-semibold">{assignment.title}</p>
                          <p className="text-slate-300 mt-2">{assignment.description}</p>
                          <p className="text-sm text-slate-200/70 mt-2">
                            Deadline: {formatDueDate(assignment.dueDate)}
                          </p>
                          {assignment.questionFileName ? (
                            <a
                              href={getAssignmentQuestionFileUrl(assignment.id)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-block mt-2 text-blue-400 underline"
                            >
                              {assignment.questionFileOriginalName || "View question file"}
                            </a>
                          ) : null}
                        </div>

                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => handleRemoveAssignment(assignment)}
                          disabled={removingAssignmentId === assignment.id}
                        >
                          {removingAssignmentId === assignment.id ? "Removing..." : "Remove assignment"}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </motion.div>
            </div>

            <div className="mt-10 glass-panel p-6">
              <SectionHeader
                title="View Submissions"
                subtitle="Select an assignment from this course to open grading only for that work."
              />

              <select
                className="input-field bg-transparent text-white mb-4"
                value={selectedAssignment}
                onChange={(e) => setSelectedAssignment(e.target.value)}
              >
                <option value="" style={{ color: "black" }}>
                  Select assignment
                </option>

                {selectedAssignments.map((assignment) => (
                  <option
                    key={assignment.id}
                    value={assignment.id}
                    style={{ color: "black" }}
                  >
                    {assignment.title}
                  </option>
                ))}
              </select>

              {!selectedAssignment ? (
                <p className="text-slate-300">
                  Choose one assignment from {selectedCourse.name} to view and grade submissions.
                </p>
              ) : null}

              {selectedAssignment && selectedAssignmentSubmissions.length === 0 ? (
                <p className="text-slate-300">No submissions yet.</p>
              ) : null}

              {selectedAssignmentSubmissions.map((submission) => (
                <div
                  key={submission.id}
                  className="mb-4 border border-white/10 p-4 rounded-lg"
                >
                  <p>
                    <b>Student:</b> {submission.studentName}
                  </p>
                  <p>
                    <b>Status:</b> {submission.status}
                  </p>

                  {submission.fileName ? (
                    <a
                      href={getFileUrl(submission.fileName)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 underline"
                    >
                      View File
                    </a>
                  ) : null}

                  <input
                    type="number"
                    min="0"
                    max="10"
                    className="input-field mt-2"
                    placeholder="Grade (0-10)"
                    value={grading[submission.id]?.grade ?? submission.grade ?? ""}
                    onChange={(e) => {
                      let value = Number(e.target.value);
                      if (value > 10) value = 10;
                      if (value < 0) value = 0;
                      handleGradeChange(submission.id, "grade", value);
                    }}
                  />

                  <input
                    className="input-field mt-2"
                    placeholder="Feedback"
                    value={
                      grading[submission.id]?.feedback ??
                      submission.feedback ??
                      ""
                    }
                    onChange={(e) =>
                      handleGradeChange(submission.id, "feedback", e.target.value)
                    }
                  />

                  <button
                    className="btn-primary mt-2"
                    onClick={() => handleGradeSubmit(submission.id)}
                  >
                    Save Grade
                  </button>
                </div>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default TeacherDashboard;
