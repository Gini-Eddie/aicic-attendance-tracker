import React from "react";
import { Course, Student } from "../types";

export function GroupedStudents({ students, courses, onViewStudentProfile }: { students: Student[]; courses: Course[]; onViewStudentProfile: (id: string) => void }) {
  const groups = courses.flatMap(course => {
    const members = students.filter(student => student.courses?.some(c => c.id === course.id));
    const cohorts = new Set(members.flatMap(student => student.registrations?.filter(r => r.course_id === course.id).map(r => r.cohort || "") || []));
    const currentCohort = (course.cohort || "").trim().toUpperCase();
    if (!cohorts.size || members.some(student => !student.registrations?.some(r => r.course_id === course.id))) cohorts.add(currentCohort);
    return [...cohorts].map(cohort => ({id: `${course.id}-${cohort}`, name: course.name, cohort, teachers: (course.teachers || []).map(t => t.name).join(", ") || "No teacher assigned",
      students: members.flatMap(student => {
        const registrations = student.registrations?.filter(r => r.course_id === course.id) || [];
        if (!registrations.length) return cohort === currentCohort ? [{...student}] : [];
        const match = registrations.find(r => r.cohort === cohort);
        return match ? [{...student, student_code: match.student_code}] : [];
      })}));
  });
  const unassigned = students.filter(student => !student.courses?.length);
  if (unassigned.length) groups.push({ id: "unassigned", name: "Not enrolled in a course", cohort: null, teachers: "No teacher assigned", students: unassigned });
  if (!students.length) return <p className="p-6 text-sm text-slate-500">No students have been registered yet.</p>;
  return <div className="divide-y divide-slate-200">{groups.map(group => <section key={group.id}>
    <div className="p-4 bg-slate-50 flex flex-wrap justify-between gap-2"><div><h4 className="font-bold text-sm text-slate-900">{group.name} · {group.students.length} students</h4><p className="text-xs text-slate-600 mt-1">Teachers: {group.teachers}{group.cohort ? ` · Cohort: ${group.cohort}` : ""}</p></div></div>
    {!group.students.length ? <p className="p-4 text-xs text-slate-500">No students enrolled.</p> : <div className="overflow-x-auto"><table className="min-w-full text-xs"><thead><tr className="text-left text-slate-600"><th className="px-4 py-3">Student</th><th className="px-4 py-3">Registration number</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Overall attendance</th><th className="px-4 py-3">Profile</th></tr></thead><tbody>{group.students.map(student => <tr key={student.id} className="border-t border-slate-100"><td className="px-4 py-3 font-semibold text-slate-900">{student.full_name}</td><td className="px-4 py-3 font-mono text-slate-700">{student.student_code}</td><td className="px-4 py-3 text-slate-500">{student.email || "—"}</td><td className="px-4 py-3 text-slate-700">{student.attendance_rate ?? 0}%</td><td className="px-4 py-3"><button className="text-sky-700 font-semibold" onClick={() => onViewStudentProfile(student.id)}>Inspect</button></td></tr>)}</tbody></table></div>}
  </section>)}</div>;
}
