import React, { useEffect, useMemo, useState } from "react";
import SectionHeader from "../components/SectionHeader";
import StatCard from "../components/StatCard";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { fetchCourses } from "../services/assignmentService";
import {
  deleteCourseAsAdmin,
  fetchUsers,
  updateUserRole,
} from "../services/adminService";
import { getErrorMessage } from "../utils/apiError";

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const { pushToast } = useToast();

  const [users, setUsers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState(null);
  const [deletingCourseCode, setDeletingCourseCode] = useState(null);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [usersData, coursesData] = await Promise.all([
        fetchUsers(),
        fetchCourses(),
      ]);
      setUsers(usersData || []);
      setCourses(coursesData || []);
    } catch (error) {
      pushToast(getErrorMessage(error, "Unable to load admin dashboard."), "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const activeCourses = useMemo(
    () => (courses || []).filter((course) => course.active !== false),
    [courses]
  );

  const stats = useMemo(
    () => ({
      totalUsers: users.length,
      students: users.filter((currentUser) => currentUser.role === "student").length,
      teachers: users.filter((currentUser) => currentUser.role === "teacher").length,
      admins: users.filter((currentUser) => currentUser.role === "admin").length,
    }),
    [users]
  );

  const handleRoleChange = async (targetUser, nextRole) => {
    if (!nextRole || nextRole === targetUser.role) {
      return;
    }

    setUpdatingUserId(targetUser.id);
    try {
      const updatedUser = await updateUserRole(targetUser.id, nextRole);
      setUsers((prev) =>
        prev.map((currentUser) =>
          currentUser.id === updatedUser.id ? updatedUser : currentUser
        )
      );
      pushToast(`Role updated for ${updatedUser.name}.`, "success");
    } catch (error) {
      pushToast(getErrorMessage(error, "Unable to update user role."), "error");
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleDeleteCourse = async (courseCode, courseName) => {
    const shouldDelete = window.confirm(
      `Delete ${courseName}? This keeps related records safe but removes the course from active use.`
    );

    if (!shouldDelete) {
      return;
    }

    setDeletingCourseCode(courseCode);
    try {
      await deleteCourseAsAdmin(courseCode);
      pushToast("Course deleted from active use.", "success");
      await loadDashboard();
    } catch (error) {
      pushToast(getErrorMessage(error, "Unable to delete course."), "error");
    } finally {
      setDeletingCourseCode(null);
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
              Admin dashboard
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
          <StatCard label="Users" value={stats.totalUsers} hint="Registered accounts" />
          <StatCard label="Students" value={stats.students} hint="Learner access" />
          <StatCard label="Teachers" value={stats.teachers} hint="Teaching access" />
          <StatCard label="Admins" value={stats.admins} hint="System managers" />
        </div>

        <div className="grid xl:grid-cols-2 gap-8">
          <div className="glass-panel p-6">
            <SectionHeader
              title="User Roles"
              subtitle="Promote or demote student and teacher accounts without touching admin users."
            />

            {users.length === 0 ? (
              <p className="text-slate-300">No users found.</p>
            ) : (
              <div className="space-y-4">
                {users.map((currentUser) => (
                  <div
                    key={currentUser.id}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div>
                        <p className="text-white font-semibold">{currentUser.name}</p>
                        <p className="text-sm text-slate-200/70 mt-1">
                          {currentUser.email}
                        </p>
                      </div>

                      {currentUser.role === "admin" ? (
                        <span className="rounded-full bg-amber-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-100">
                          Admin
                        </span>
                      ) : (
                        <select
                          className="input-field bg-transparent text-white"
                          value={currentUser.role}
                          disabled={updatingUserId === currentUser.id}
                          onChange={(event) =>
                            handleRoleChange(currentUser, event.target.value)
                          }
                        >
                          <option value="student" style={{ color: "black" }}>
                            Student
                          </option>
                          <option value="teacher" style={{ color: "black" }}>
                            Teacher
                          </option>
                        </select>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="glass-panel p-6">
            <SectionHeader
              title="Course Control"
              subtitle="Remove courses from active use while preserving submission history."
            />

            {activeCourses.length === 0 ? (
              <p className="text-slate-300">No active courses available.</p>
            ) : (
              <div className="space-y-4">
                {activeCourses.map((course) => (
                  <div
                    key={course.code}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div>
                        <p className="text-white font-semibold">{course.name}</p>
                        <p className="text-sm text-slate-200/70 mt-1">
                          {course.code} | {course.department} | {course.term}
                        </p>
                      </div>

                      <button
                        type="button"
                        className="btn-secondary"
                        disabled={deletingCourseCode === course.code}
                        onClick={() =>
                          handleDeleteCourse(course.code, course.name)
                        }
                      >
                        {deletingCourseCode === course.code
                          ? "Deleting..."
                          : "Delete course"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
