# Staff, cohort imports and company laptop attendance

Deploy the backend and frontend from the same commit. The backend requirements now include `openpyxl` for Excel uploads. Startup creates the new registration, approval and notification tables; existing columns and invitation settings are retained. No new environment variables are required.

## Admin and tutor views

Administrators can use **Switch to tutor view** in the navigation. Their account stays an administrator. Tutor view lists their assigned courses; creating a course automatically assigns its creator as a tutor. Administrators can also assign an existing administrator to a course from the admin dashboard's assignments tab.

**Teachers & Administrators** lists all active staff and their course assignments. The tutor directory includes administrators who teach a course. Deleting a teacher revokes login and existing tokens, removes assignments and closes their active sessions. Historical attendance and session ownership remain available. Administrator accounts cannot be deleted through the teacher controls.

## Uploading existing students

Open a course and expand **Upload students from CSV or Excel**. Supply a cohort (for example `MATRIX`), a track abbreviation (`UI`, `AI`, `WEB`) and a file with `name,email` headings. `full_name`, `student_name` and `email_address` headings are also accepted. Excel uploads read the first worksheet of an `.xlsx` workbook. `.xls` files must be saved as `.xlsx` or CSV first.

Example:

```csv
name,email
Ada Example,ada@example.com
Emeka Example,emeka@example.com
```

Files may contain up to 1,000 data rows and 2 MB. Expanded Excel workbooks are limited to 20 MB. Invalid rows are reported without importing them; valid rows are saved together. A database conflict rolls back the whole upload so it can be retried.

Numbers such as `MATRIX-UI-001` are generated after the highest existing suffix for that prefix. Previously issued numbers, including removed registrations, are reserved. The same email within the same course and cohort is skipped. The same email may have separate registrations in other courses or cohorts; its existing name is retained. Removed registrations are skipped too, preventing an old upload from silently reinstating a removed student.

The first imported cohort becomes the current cohort only if the course has no cohort setting. Subsequent imports retain the existing current cohort. Use the cohort selector to view rosters and start a session for a particular cohort. Export the selected roster using **Export student CSV**.

Removing a student affects that course/cohort registration, preserves other registrations and historical attendance, and creates a notification visible to every admin. Read status is separate for each admin.

## Company laptop attendance

An administrator opens **Attendance desk, staff & notifications**, then **Company laptop desk**. The admin selects a course, cohort and open session, enters the student's registration number, checks the displayed name and confirms the submission. This is an admin-operated desk: keep the signed-in admin account supervised.

Desk submissions are saved as **Unverified** and do not count as present. Assigned tutors use **Awaiting verification** to approve or reject each submission. An admin who is assigned to that course can also verify it. Review is allowed after a session closes, using the original submission time. A removed registration cannot be approved.

Repeated desk submissions and attempts to bypass review through the public link are rejected. The existing public QR/link name-confirmation flow remains available for other students.

## CSV exports

Staff management exports names, emails, roles and course assignments. Course pages export cohort rosters and individual attendance sessions. Attendance CSVs distinguish pending, rejected and recorded attendance, identify company laptop submissions and list their verifier. CSV cells beginning with spreadsheet formula characters are escaped.

## Verification

```powershell
.\.venv\Scripts\python.exe -W ignore::DeprecationWarning -m unittest backend.test_api_routes -v
npm run lint
npm run build
```

The regression suite uses an isolated in-memory SQLite database with foreign-key checks enabled. It does not connect to the deployed database.
