# The Catenean Ideas and Future Plan

## Core Positioning

The Catenean is not trying to replace Canvas, Google Calendar, or Notion.

- Canvas shows what assignments exist.
- Google Calendar stores dates and reminders.
- Notion lets students organize manually.
- The Catenean plans what to study today.

The product should sit on top of existing school tools. It should pull academic tasks from syllabi, Canvas, and student input, ask the student to approve them, then turn approved work into a practical study plan.

## Product Hierarchy

1. Academic planner
   - Syllabus upload
   - Canvas assignment import
   - Student approval before scheduling
   - Availability-based study blocks
   - Reminders and calendar sync

2. Daily habit layer
   - Study blocks
   - Pomodoro or focus timer
   - Streaks
   - Completion tracking

3. Reward layer
   - Catenean XP
   - Level ups
   - Free food rewards
   - Cosmetics and outfits

4. Social campus layer
   - Virtual Ateneo map
   - Manual check-ins
   - Opt-in friends
   - Org events
   - Campus-themed quests

5. Community and learning layer
   - Org learning-material repositories
   - Google Drive or repository integrations
   - Course and professor fit assistant
   - Latin honors calculator

## Canvas Integration

Canvas integration is possible and should become a major differentiator.

The ideal flow:

1. Student connects Canvas.
2. The Catenean imports courses and assignments.
3. New or changed assignments appear as pending items.
4. Student reviews and approves each item.
5. Approved items become confirmed deadlines.
6. The schedule rebuilds around those deadlines.
7. Email reminders and Google Calendar events update from approved data.

The trust rule should stay the same: imported Canvas work should wait for student approval before it affects the schedule.

## Email and Calendar

Email reminders should be server-side and should only use confirmed academic data.

Reminder types:

- Upcoming deadline reminders
- Study block reminders
- Missed study block follow-ups
- Weekly plan summaries
- Finals week reminders

Google Calendar sync should create or update events only after student approval.

Recommended calendar behavior:

- Confirmed deadlines become due-date events.
- Study blocks become timed calendar events.
- Store the external Google event ID to prevent duplicates.
- Let students turn sync on or off per course.

## Latin Honors Calculator

This is a strong early feature because it is simple, useful, and emotionally relevant to students.

Basic inputs:

- Current units completed
- Current QPI or GWA
- Remaining units
- Target final QPI or GWA

Formula:

```text
required_remaining_average =
(target_final_average * total_units - current_average * completed_units)
/
remaining_units
```

Future version:

- Ateneo-specific Latin honors thresholds
- Disqualification rules
- Retake rules
- Minimum residency rules
- Per-semester planning
- "What if" grade scenarios

This should be labeled as an estimate until school policies are verified.

## Org Learning Materials

Org repositories can be a powerful campus moat.

Example:

- Ateneo Math Society connects a Google Drive folder.
- The Catenean indexes approved folders and files.
- Students can discover samplex, reviewers, and supplemental materials by course.
- The app links back to the original Drive files or uses retrieval with citations.

Important rule: materials should only be indexed with permission from the org or owner. Do not scrape private folders or repost copyrighted material without approval.

## Professor and Course Fit Assistant

This can work well as a partner feature with a friend building a professor or course grader.

Safer positioning:

"Course fit assistant" instead of "professor ratings."

Potential fit factors:

- Schedule fit
- Workload
- Assessment style
- Attendance expectations
- Grading components
- Student learning preferences
- Reported difficulty

Avoid relying on scraped Facebook content as the foundation. A safer long-term path is opt-in student reviews, org partnerships, or user-submitted structured feedback.

## Virtual Campus and Game Layer

The social map should be virtual, not live-location based.

Core privacy rules:

- No automatic live location.
- Students manually place their Catenean on the virtual campus.
- Friends are visible only by mutual opt-in.
- Events are joined manually.
- Campus presence is playful, not surveillance.

Campus locations:

- Rizal Library
- SEC Walk
- Matteo Ricci
- Gonzaga
- MVP
- Bellarmine
- Leong Hall
- Dorm or home study space

## Event and Game Ideas

### Cat Nap Timer

A focus timer where the Catenean naps while the student studies. Completing the session gives XP, food, or streak progress.

### Campus Stamp Card

Students manually place their Catenean at different virtual campus spots and complete study tasks to collect stamps.

### Finals Week Study Rally

A campus-wide event where completed study blocks fill a shared progress meter. When the goal is reached, participants unlock a limited cosmetic or food reward.

### Org Study Quests

Student orgs create quests tied to their subjects or events.

Examples:

- Complete three math study blocks this week.
- Review one samplex.
- Upload and confirm your syllabus.
- Join a virtual study room during finals week.

### Outfit Showcase

Students dress up their Catenean for a theme. Friends or org members vote with limited daily votes.

### Samplex Hunt

Students unlock links to approved reviewers or samplex collections through course-specific study quests.

### Buddy Study Room

Friends start a focus session together. Their Cateneans appear in a shared virtual room. Finishing together gives a small bonus.

## Suggested Build Order

### Phase 1: Core Pilot

- Finish frontend
- Stabilize syllabus upload
- Stabilize deadline approval
- Stabilize schedule generation
- Test with real students
- Track whether students come back the next day

### Phase 2: Utility Integrations

- Email reminders
- Google Calendar sync
- Latin honors calculator
- Feedback and analytics

### Phase 3: Canvas

- Student-connected Canvas import
- Pending approval queue
- Assignment update detection
- Course matching
- Schedule rebuild after approval

### Phase 4: Reward Layer

- XP
- Food
- Level ups
- Basic cosmetics
- Cat Nap Timer

### Phase 5: Campus Social Layer

- Virtual Ateneo map
- Manual check-ins
- Opt-in friends
- Campus Stamp Card
- Outfit Showcase

### Phase 6: Partnerships

- Org study quests
- Org learning-material repositories
- Course fit assistant partnership
- Professor/course structured feedback

## Hiring Guidance

Do not hire full-time yet unless a task is blocking launch or taking time away from validation.

The best next proof is not team size. It is whether real students use the planner.

Recommended approach:

- Build the core yourself for now.
- Use friends or volunteers for testing, design feedback, and campus distribution.
- Bring in short-term help only for narrow tasks.
- Consider hiring after there is real usage, retention, or payment intent.

Good early helper roles:

- UI polish designer
- Campus ambassador
- Student org partnership lead
- Part-time backend/integration developer for Canvas or Google Calendar
- Illustrator for Catenean assets

Avoid hiring too early for:

- Full game development
- Large content operations
- Complex social features
- Mobile app development
- Full-time growth roles

## Validation Signals

Strong signs:

- Students upload real syllabi.
- Students approve extracted deadlines.
- Students set availability.
- Students generate a study plan.
- Students come back within 24 to 48 hours.
- Students ask for Canvas or calendar sync.
- Students share it with blockmates.
- Student orgs ask to host events or connect materials.

Weak signs:

- Students only say it looks cute.
- Students do not upload real syllabi.
- Students do not trust the extracted deadlines.
- Students say it is like Notion or Calendar and do not continue.
- Students ask for many features but do not use the core planner.

## Main Strategic Rule

The academic planner must remain the product.

The game, mascot, map, events, and community features should make students come back to complete their study plan. They should not become a separate product that distracts from studying.

