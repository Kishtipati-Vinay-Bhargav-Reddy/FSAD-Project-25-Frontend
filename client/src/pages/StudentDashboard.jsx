import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import SectionHeader from "../components/SectionHeader";
import StatCard from "../components/StatCard";
import { fetchStudentDashboard } from "../services/dashboardService";
import {
  fetchCourses,
  getAssignmentQuestionFileUrl,
} from "../services/assignmentService";
import { submitAssignment, getFileUrl } from "../services/submissionService";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import {
  formatDueDate,
  isDeadlinePassed,
  isRecentlyUpdated,
} from "../utils/dateTime";
import {
  DOCUMENT_ACCEPT,
  validateDocumentFile,
} from "../utils/fileValidation";
import { getErrorMessage } from "../utils/apiError";

const UNASSIGNED_COURSE = {
  code: "UNASSIGNED",
  name: "Course Not Assigned",
  department: "General",
  term: "Existing assignments",
};

const GRADE_SEEN_STORAGE_PREFIX = "seen_grade_updates_";

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

const StudentDashboard = () => {
  const { user, logout } = useAuth();
  const { pushToast } = useToast();

  const [courses, setCourses] = useState([]);
  const [data, setData] = useState({
    assignments: [],
    submissions: [],
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedCourseCode, setSelectedCourseCode] = useState("");
  const [submissionStatusFilter, setSubmissionStatusFilter] = useState("");
  const [form, setForm] = useState({
    assignmentId: "",
    file: null,
  });
  const [fileInputKey, setFileInputKey] = useState(0);
  const fileInputRef = useRef(null);

  const loadDashboard = async () => {
    if (!user?.email) {
      setData({ assignments: [], submissions: [] });
      setCourses([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [response, coursesData] = await Promise.all([
        fetchStudentDashboard({
          studentEmail: user.email,
        }),
        fetchCourses(),
      ]);

      setData({
        assignments: response?.assignments || [],
        submissions: response?.submissions || [],
      });
      setCourses(coursesData || []);
    } catch (error) {
      pushToast(getErrorMessage(error, "Unable to load dashboard."), "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [user?.email]);

  const allAssignmentMap = useMemo(
    () => new Map((data.assignments || []).map((assignment) => [assignment.id, assignment])),
    [data.assignments]
  );

  useEffect(() => {
    if (!user?.email || !data.submissions.length) {
      return;
    }

    const storageKey = `${GRADE_SEEN_STORAGE_PREFIX}${user.email.toLowerCase()}`;
    const seenGrades = JSON.parse(window.localStorage.getItem(storageKey) || "{}");
    const nextSeenGrades = { ...seenGrades };
    let hasNewSeenState = false;

    data.submissions.forEach((submission) => {
      if (
        submission.status === "GRADED" &&
        submission.gradedAt &&
        isRecentlyUpdated(submission.gradedAt, 72) &&
        seenGrades[submission.id] !== submission.gradedAt
      ) {
        const assignment = allAssignmentMap.get(submission.assignmentId);
        pushToast(
          `New grade received${assignment?.title ? ` for ${assignment.title}` : ""}.`,
          "success"
        );
        nextSeenGrades[submission.id] = submission.gradedAt;
        hasNewSeenState = true;
      }
    });

    if (hasNewSeenState) {
      window.localStorage.setItem(storageKey, JSON.stringify(nextSeenGrades));
    }
  }, [allAssignmentMap, data.submissions, pushToast, user?.email]);

  const activeCourseMap = useMemo(() => {
    const map = new Map();

    (courses || [])
      .filter((course) => course.active !== false)
      .forEach((course) => {
        map.set(normalizeCourseCode(course.code), {
          ...course,
          code: normalizeCourseCode(course.code),
        });
      });

    return map;
  }, [courses]);

  const visibleAssignments = useMemo(
    () =>
      (data.assignments || []).filter((assignment) => {
        const courseCode = normalizeCourseCode(assignment.courseCode);
        return (
          courseCode === UNASSIGNED_COURSE.code || activeCourseMap.has(courseCode)
        );
      }),
    [activeCourseMap, data.assignments]
  );

  const assignmentMap = useMemo(
    () => new Map(visibleAssignments.map((assignment) => [assignment.id, assignment])),
    [visibleAssignments]
  );

  const visibleAssignmentIds = useMemo(
    () => new Set(visibleAssignments.map((assignment) => assignment.id)),
    [visibleAssignments]
  );

  const visibleSubmissions = useMemo(
    () =>
      (data.submissions || []).filter((submission) =>
        visibleAssignmentIds.has(submission.assignmentId)
      ),
    [data.submissions, visibleAssignmentIds]
  );

  const courseCards = useMemo(() => {
    const courseMap = new Map(activeCourseMap);

    visibleAssignments.forEach((assignment) => {
      const courseCode = normalizeCourseCode(assignment.courseCode);

      if (
        courseCode === UNASSIGNED_COURSE.code &&
        !courseMap.has(UNASSIGNED_COURSE.code)
      ) {
        courseMap.set(UNASSIGNED_COURSE.code, UNASSIGNED_COURSE);
      }
    });

    return Array.from(courseMap.values())
      .map((course) => {
        const courseAssignments = visibleAssignments.filter(
          (assignment) => normalizeCourseCode(assignment.courseCode) === course.code
        );
        const courseAssignmentIds = new Set(
          courseAssignments.map((assignment) => assignment.id)
        );
        const courseSubmissions = visibleSubmissions.filter((submission) =>
          courseAssignmentIds.has(submission.assignmentId)
        );

        return {
          ...course,
          stats: buildStats(courseAssignments, courseSubmissions),
        };
      })
      .filter((course) => course.stats.totalAssignments > 0);
  }, [activeCourseMap, visibleAssignments, visibleSubmissions]);

  const selectedCourse = useMemo(
    () => courseCards.find((course) => course.code === selectedCourseCode) || null,
    [courseCards, selectedCourseCode]
  );

  const selectedAssignments = useMemo(
    () =>
      selectedCourse
        ? visibleAssignments.filter(
            (assignment) =>
              normalizeCourseCode(assignment.courseCode) === selectedCourse.code
          )
        : [],
    [selectedCourse, visibleAssignments]
  );

  const selectedAssignmentIds = useMemo(
    () => new Set(selectedAssignments.map((assignment) => assignment.id)),
    [selectedAssignments]
  );

  const selectedSubmissions = useMemo(
    () =>
      visibleSubmissions.filter((submission) =>
        selectedAssignmentIds.has(submission.assignmentId)
      ),
    [selectedAssignmentIds, visibleSubmissions]
  );

  const filteredSelectedSubmissions = useMemo(
    () =>
      submissionStatusFilter
        ? selectedSubmissions.filter(
            (submission) => submission.status === submissionStatusFilter
          )
        : selectedSubmissions,
    [selectedSubmissions, submissionStatusFilter]
  );

  const submissionMap = useMemo(() => {
    const map = new Map();

    selectedSubmissions.forEach((submission) => {
      if (submission.assignmentId) {
        map.set(submission.assignmentId, submission);
      }
    });

    return map;
  }, [selectedSubmissions]);

  const selectedFormAssignment = useMemo(() => {
    if (!form.assignmentId) {
      return null;
    }

    return assignmentMap.get(Number(form.assignmentId)) || null;
  }, [assignmentMap, form.assignmentId]);

  const selectedFormSubmission = useMemo(() => {
    if (!form.assignmentId) {
      return null;
    }

    return submissionMap.get(Number(form.assignmentId)) || null;
  }, [form.assignmentId, submissionMap]);

  const selectedFormIsExpired = isDeadlinePassed(selectedFormAssignment?.dueDate);

  const dashboardStats = useMemo(
    () =>
      selectedCourse
        ? buildStats(selectedAssignments, selectedSubmissions)
        : buildStats(visibleAssignments, visibleSubmissions),
    [
      selectedAssignments,
      selectedCourse,
      selectedSubmissions,
      visibleAssignments,
      visibleSubmissions,
    ]
  );

  useEffect(() => {
    if (
      selectedCourseCode &&
      !courseCards.some((course) => course.code === selectedCourseCode)
    ) {
      setSelectedCourseCode("");
    }
  }, [courseCards, selectedCourseCode]);

  useEffect(() => {
    setForm({
      assignmentId: "",
      file: null,
    });
    setFileInputKey((prev) => prev + 1);
    setSubmissionStatusFilter("");
  }, [selectedCourseCode]);

  const handleFileChange = (event) => {
    const nextFile = event.target.files?.[0] || null;
    const validationError = validateDocumentFile(nextFile);

    if (validationError) {
      pushToast(validationError, "error");
      event.target.value = "";
      setForm((prev) => ({ ...prev, file: null }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      file: nextFile,
    }));
  };

  const handleEditSubmission = (assignmentId) => {
    const assignment = assignmentMap.get(assignmentId);

    if (isDeadlinePassed(assignment?.dueDate)) {
      pushToast("Deadline passed", "error");
      return;
    }

    setForm({
      assignmentId: String(assignmentId),
      file: null,
    });
    setFileInputKey((prev) => prev + 1);
    fileInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    pushToast(
      "Choose a new file to replace your previous submission.",
      "success"
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!selectedCourse) {
      pushToast("Select a course first.", "error");
      return;
    }

    if (!form.assignmentId || !form.file) {
      pushToast("Select assignment and upload file.", "error");
      return;
    }

    if (selectedFormIsExpired) {
      pushToast("Deadline passed", "error");
      return;
    }

    const validationError = validateDocumentFile(form.file);

    if (validationError) {
      pushToast(validationError, "error");
      return;
    }

    setSubmitting(true);

    try {
      const isEditingSubmission = Boolean(selectedFormSubmission);
      const formData = new FormData();

      formData.append("file", form.file);
      formData.append("assignmentId", Number(form.assignmentId));
      formData.append("studentName", user?.name || "Student");
      formData.append("studentEmail", user?.email || "");

      await submitAssignment(formData);

      pushToast(
        isEditingSubmission ? "Submission updated." : "Submitted successfully",
        "success"
      );
      setForm({ assignmentId: "", file: null });
      setFileInputKey((prev) => prev + 1);
      await loadDashboard();
    } catch (error) {
      pushToast(getErrorMessage(error, "Upload failed."), "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-200">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen px-6 py-10">
      <div className="container mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <p className="uppercase text-xs tracking-[0.3em] text-slate-200/60">
              Student dashboard
            </p>
            <h1 className="font-display text-3xl text-white mt-2">
              Welcome, {user?.name}
            </h1>
          </div>

          <button className="btn-secondary" onClick={logout}>
            Logout
          </button>
        </div>

        <div className="grid md:grid-cols-4 gap-4 mt-8">
          <StatCard
            label={selectedCourse ? "Assignments" : "Courses"}
            value={selectedCourse ? dashboardStats.totalAssignments : courseCards.length}
            hint={selectedCourse ? "In this course" : "Available to study"}
          />
          <StatCard
            label="Submitted"
            value={dashboardStats.submittedCount}
            hint={selectedCourse ? "In this course" : "Across active courses"}
          />
          <StatCard
            label="Graded"
            value={dashboardStats.gradedCount}
            hint="Reviewed by teachers"
          />
          <StatCard
            label="Avg grade"
            value={`${dashboardStats.averageGrade}/10`}
            hint={selectedCourse ? "Within selected course" : "Across graded submissions"}
          />
        </div>

        <div className="glass-panel p-6 mt-10">
          <SectionHeader
            title="Choose Course"
            subtitle="Open one course at a time to see assignments, deadlines, and submission status."
          />

          {courseCards.length === 0 ? (
            <p className="text-slate-300">No active courses available right now.</p>
          ) : (
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
                        Submitted
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
          )}
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

              <button
                type="button"
                className="btn-secondary"
                onClick={() => setSelectedCourseCode("")}
              >
                Back to courses
              </button>
            </div>

            <div className="grid lg:grid-cols-2 gap-8 mt-10">
              <motion.div className="glass-panel p-6">
                <SectionHeader
                  title="Submit Assignment"
                  subtitle={`Upload your work only for assignments inside ${selectedCourse.name}. Submitted work can still be replaced before the deadline.`}
                />

                {selectedAssignments.length === 0 ? (
                  <p className="text-slate-300">
                    No assignments are available in this course right now.
                  </p>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="text-xs uppercase tracking-[0.2em] text-slate-200/70">
                        Assignment
                      </label>

                      <select
                        className="input-field bg-transparent text-white mt-2"
                        value={form.assignmentId}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            assignmentId: event.target.value,
                            file: null,
                          }))
                        }
                      >
                        <option
                          value=""
                          style={{ backgroundColor: "#1e293b", color: "white" }}
                        >
                          Select assignment
                        </option>

                        {selectedAssignments.map((assignment) => {
                          const isExpired = isDeadlinePassed(assignment.dueDate);
                          const hasSubmission = submissionMap.get(assignment.id);

                          return (
                            <option
                              key={assignment.id}
                              value={assignment.id}
                              style={{ backgroundColor: "#1e293b", color: "white" }}
                            >
                              {`${assignment.title}${
                                hasSubmission ? " (Submitted)" : ""
                              }${isExpired ? " (Expired)" : ""}`}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {selectedFormSubmission ? (
                      <div className="rounded-2xl border border-amber-200/30 bg-amber-200/10 px-4 py-3 text-sm text-slate-100">
                        You already submitted this assignment. Uploading a new file will replace
                        the old one and send it back for teacher review.
                      </div>
                    ) : null}

                    {selectedFormAssignment && selectedFormIsExpired ? (
                      <div className="rounded-2xl border border-rose-300/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                        Deadline passed
                      </div>
                    ) : null}

                    <div>
                      <label className="text-xs uppercase tracking-[0.2em] text-slate-200/70">
                        {selectedFormSubmission ? "Replace file" : "Upload file"}
                      </label>

                      <input
                        key={fileInputKey}
                        ref={fileInputRef}
                        type="file"
                        accept={DOCUMENT_ACCEPT}
                        onChange={handleFileChange}
                        disabled={selectedFormIsExpired}
                        className="input-field mt-2"
                      />
                      <p className="text-xs text-slate-200/60 mt-2">
                        Accepted formats: PDF, DOC, DOCX. Maximum size: 10MB.
                      </p>
                    </div>

                    <button
                      className="btn-primary w-full"
                      type="submit"
                      disabled={submitting || selectedFormIsExpired}
                    >
                      {selectedFormIsExpired
                        ? "Deadline passed"
                        : submitting
                          ? selectedFormSubmission
                            ? "Updating..."
                            : "Uploading..."
                          : selectedFormSubmission
                            ? "Update submission"
                            : "Submit assignment"}
                    </button>
                  </form>
                )}
              </motion.div>

              <motion.div className="glass-panel p-6">
                <SectionHeader
                  title="Course Assignments"
                  subtitle="Check deadlines and your progress for this selected course."
                />

                {selectedAssignments.length === 0 ? (
                  <p className="text-slate-300">
                    No assignments are available in this course.
                  </p>
                ) : (
                  selectedAssignments.map((assignment) => {
                    const submission = submissionMap.get(assignment.id);
                    const expired = isDeadlinePassed(assignment.dueDate);
                    const hasNewGrade =
                      submission?.status === "GRADED" &&
                      isRecentlyUpdated(submission?.gradedAt, 72);

                    return (
                      <div
                        key={assignment.id}
                        className={`border p-4 rounded-xl mb-4 ${
                          hasNewGrade
                            ? "border-emerald-300/40 bg-emerald-500/5"
                            : expired
                              ? "border-rose-300/40 bg-rose-500/5"
                              : "border-white/10"
                        }`}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-white font-semibold">
                            {assignment.title}
                          </h3>
                          {expired ? (
                            <span className="rounded-full bg-rose-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-rose-100">
                              Expired
                            </span>
                          ) : null}
                          {hasNewGrade ? (
                            <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100">
                              NEW
                            </span>
                          ) : null}
                        </div>

                        <p className="text-sm text-slate-200/70 mt-2">
                          Deadline: {formatDueDate(assignment.dueDate)}
                        </p>

                        <p className="text-sm text-slate-200/70">
                          Status: {submission?.status || "Pending"}
                        </p>

                        <p className="text-sm text-slate-200/70">
                          Grade: {submission?.grade ?? "-"}
                        </p>

                        <p className="text-sm text-slate-200/70">
                          Feedback: {submission?.feedback ?? "-"}
                        </p>

                        {assignment.questionFileName ? (
                          <a
                            href={getAssignmentQuestionFileUrl(assignment.id)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-block mt-2 text-blue-400 underline"
                          >
                            {assignment.questionFileOriginalName || "View question file"}
                          </a>
                        ) : null}

                        {submission?.fileName ? (
                          <a
                            href={getFileUrl(submission.fileName)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-block mt-2 ml-0 sm:ml-4 text-blue-400 underline"
                          >
                            View File
                          </a>
                        ) : null}

                        {submission ? (
                          <button
                            type="button"
                            className="btn-secondary mt-3"
                            onClick={() => handleEditSubmission(assignment.id)}
                            disabled={expired}
                          >
                            {expired ? "Deadline passed" : "Edit submission"}
                          </button>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </motion.div>
            </div>

            <div className="mt-10 glass-panel p-6">
              <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
                <SectionHeader
                  title="Submission Status"
                  subtitle="All submission records for the selected course."
                />

                <div className="w-full lg:w-64">
                  <label className="text-xs uppercase tracking-[0.2em] text-slate-200/70">
                    Filter by status
                  </label>
                  <select
                    className="input-field bg-transparent text-white mt-2"
                    value={submissionStatusFilter}
                    onChange={(event) => setSubmissionStatusFilter(event.target.value)}
                  >
                    <option value="" style={{ backgroundColor: "#1e293b", color: "white" }}>
                      All statuses
                    </option>
                    <option value="PENDING" style={{ backgroundColor: "#1e293b", color: "white" }}>
                      Pending
                    </option>
                    <option value="GRADED" style={{ backgroundColor: "#1e293b", color: "white" }}>
                      Graded
                    </option>
                  </select>
                </div>
              </div>

              {filteredSelectedSubmissions.length === 0 ? (
                <p className="text-slate-300">No submissions match this filter.</p>
              ) : (
                <table className="w-full text-left">
                  <thead>
                    <tr>
                      <th>Assignment</th>
                      <th>Status</th>
                      <th>Grade</th>
                      <th>Feedback</th>
                      <th>File</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredSelectedSubmissions.map((submission) => {
                      const assignment = assignmentMap.get(submission.assignmentId);
                      const hasNewGrade =
                        submission.status === "GRADED" &&
                        isRecentlyUpdated(submission.gradedAt, 72);

                      return (
                        <tr key={submission.id} className={hasNewGrade ? "bg-emerald-500/5" : ""}>
                          <td>
                            {assignment?.title || submission.assignmentId}
                            {hasNewGrade ? (
                              <span className="ml-2 rounded-full bg-emerald-500/20 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-emerald-100">
                                NEW
                              </span>
                            ) : null}
                          </td>
                          <td>{submission.status}</td>
                          <td>{submission.grade ?? "-"}</td>
                          <td>{submission.feedback ?? "-"}</td>
                          <td>
                            {submission.fileName ? (
                              <a
                                href={getFileUrl(submission.fileName)}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-400 underline"
                              >
                                View
                              </a>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default StudentDashboard;
