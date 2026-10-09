# Counsellor Part ONLY: Requirements (from IT3060 Milestone 02 report)

Source: `IT3060HCI2026_Milestone02_Group_WE_90.pdf` (Group IT_04.01_WE_90, Career Guidance and University Course Matching App for School Students).

> Sample names, counts and percentages in the hi-fi screens are prototype data. Use them only as seed data. Confirm exact wording against the Figma hi-fi prototype if a label looks unclear.

## 0. Scope (strict)

IN scope (counsellor role only, backend + Expo frontend):
- I15 Counsellor dashboard and Student list
- I16 Student profile (counsellor view)
- I17 Guidance form (assessment summary + recommended pathways)
- I18 Counsellor settings

OUT of scope, do NOT build or modify: parent home/progress, parent overview and privacy settings screens, parent inquiry/guidance screens, admin dashboard and audit logs, onboarding, sign-up/sign-in, consent, quiz/results, course search/list/detail. Do not change existing parent routes (`parent.routes.js`) or other members' screens.

## 1. Relevant requirements

- FR05 (High): counsellor dashboard summarising each student's aptitude profile and matched careers.
- FR02: show source / verification on data points (student profile shows "Source: aptitude assessment - verified").
- NFR03: role-based access (counsellor only sees assigned students).
- NFR06: wording is decision support that complements the counsellor, not replaces.
- NFR01: simple, legible UI, low density, readable text.
- Privacy (FR06/NFR07 impact on counsellor): the counsellor may see a student's quiz results only when the "Assigned School Counsellor Access" setting for that student is ON. This setting already lives on the parent/privacy side; the counsellor part only READS it.

## 2. Screens and fields

### 2.1 Counsellor Dashboard (I15)
- Header: avatar/initials, counsellor name (e.g. "Dr. K. Jayasuriya"), title ("Senior Counsellor"), "Counsellor Portal" badge, notification bell.
- Search bar: "Search assigned student by name or index..."
- Stat row: Total students (e.g. 48 Assigned), Completed (e.g. 38/48, 79%), Pending reviews (e.g. 10 Profiles).
- "Assigned Students" card list. Each card: name, status chip (REVIEWED or PENDING REVIEW), stream (e.g. Physical Science, Commerce), top match with % (e.g. Software Engineering 96%, Financial Tech 88%), and a status-based button:
  - Reviewed: "View Profile & Advise"
  - Pending review: "Provide Recommendations"
- Bottom tabs (4): Dashboard, Students, Guidance, Settings.

### 2.2 Student List (I15)
- Search bar; status filter pills: All Students (n), Pending (n), Reviewed (n); "Filter by Stream".
- Cards: photo/initials, name, index no., stream, top match %, status chip, status-based CTA (same two CTAs as above).

### 2.3 Student Profile, counsellor view (I16)
- Header "Student Profile" with a "Follow up" action (behaviour not specified, see open questions).
- Student card: initials, name, "Grade 12, Physical Science Stream, Index No.", status chip.
- "Aptitude & Interest Assessment": bars, e.g. Logical Reasoning, Analytical Thinking, Creative/Design, Communication (percent values).
- "Top 3 Matched Career Paths": rank, title (e.g. Software Engineering, Data Science, Computer Systems Engineering), match %, one-line description, source line "Source: aptitude assessment - verified".
- "Counsellor Recommendation Notes": editable (pencil icon). Sample: "Strong logical aptitude. Recommended for IT/Computing streams."
- Buttons: "Mark as Reviewed & Notify Parent" (primary), "Sign Out".

### 2.4 Guidance Form (I17)
- Title "Guidance Form" with "Draft Saved" indicator (autosave).
- Student summary card: name, "Top Career Match: Software Engineering (96%)".
- "Assessment Summary": free-text box, placeholder like "Summarize the student's aptitude, strengths and recommended guidance notes...".
- "Recommended Pathway": checklist (e.g. Software Engineering, Data Science & AI, Information Technology); multiple can be ticked.
- Fast single-session note taking: autosave as draft, then final submit.

### 2.5 Counsellor Settings (I18)
- Profile card: initials, name, "Senior Educational Counsellor", "Colombo Zone / Western Province", "Verified Advisor" badge.
- Rows: School Affiliation (e.g. Royal College), Notifications (toggle, on), Email Alerts (toggle, off), UGC Handbook Version (e.g. v2026.1).
- "Sign Out" button.

## 3. Behaviour rules (counsellor side)

- A counsellor sees only students assigned to them.
- Student status values: Pending Review, Reviewed.
- Guidance form autosaves as a draft ("Draft Saved"), and has a final save.
- "Mark as Reviewed & Notify Parent": set status to Reviewed, store the reviewed timestamp, and create a notification record for the linked parent. The parent-facing screens are out of scope, so only store the data and expose it through the counsellor API.
- Quiz results / aptitude data are returned to the counsellor only if that student's counsellor-access setting is ON; otherwise return a clear "not shared" state and show it in the UI.
- Wording on counsellor screens must keep the decision-support tone (NFR06).

## 4. CRUD needed (counsellor data)

- Guidance notes / recommendations: create (draft), read, update (edit note, pathways), delete (remove a draft or note).
- Review status: update to Reviewed.
- Counsellor profile/settings: read, update (notifications, email alerts).
- Read-only: assigned students list (search, status filter, stream filter), student profile with aptitude bars and top-3 matches.

## 5. Test case for this part (report TC-05)

Log into Counsellor Portal, Dashboard, tap View Profile & Advise on a student card, review aptitude bars, enter a note, tap Mark as Reviewed & Notify Parent. Pass: done in under 90 seconds, task completion rate captured.

## 6. Existing repo facts (from Codex's inspection)

Only parent routes are mounted in `server.js`; counsellor notes and quiz results are placeholders in `studentResults.js`; no counsellor role middleware; temporary `x-user-id` auth; Expo has only onboarding/privacy screens; Neon database.

## 7. Open questions for the owner

1. "Follow up" button on the Student Profile header: what should it do?
2. Can a counsellor edit a note after "Mark as Reviewed & Notify Parent", and can Reviewed be reversed?
3. Should the dashboard stat counts be computed from the database (yes by default)?
