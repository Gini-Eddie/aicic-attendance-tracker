import React, { useEffect, useState } from "react";
import { api } from "../services/api";
import { Course } from "../types";

export function MyCourses({ onSelectCourse }: { onSelectCourse: (id: string) => void }) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = async () => {
    setLoading(true); setError("");
    try { setCourses(await api.getCourses()); }
    catch (err: any) { setError(err.message || "Could not load your courses."); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  return <section className="space-y-5">
    <div><h1 className="text-2xl font-bold text-slate-900">My Courses</h1><p className="text-sm text-slate-600 mt-1">Open a course to manage students and attendance.</p></div>
    {loading ? <p role="status">Loading your courses...</p> : error ? <div role="alert" className="rounded-xl bg-rose-50 p-4 text-rose-700">{error} <button onClick={load} className="underline ml-2">Try again</button></div> : courses.length === 0 ? <p className="bg-white rounded-xl border border-slate-200 p-6">No courses are assigned to you yet. Ask your administrator to assign a course.</p> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{courses.map(course => <button key={course.id} onClick={() => onSelectCourse(course.id)} className="text-left bg-white border border-slate-200 rounded-2xl p-6 hover:border-sky-500 focus-visible:outline-2 focus-visible:outline-sky-500">
      <h2 className="font-bold text-slate-900">{course.name}</h2><p className="text-sm text-slate-600 mt-2">{course.description}</p><p className="text-xs text-slate-500 mt-4">{course.enrolled_students_count || 0} students · {course.total_sessions_count || 0} sessions</p><span className="block text-sky-700 font-semibold text-sm mt-4">Open course →</span>
    </button>)}</div>}
  </section>;
}
