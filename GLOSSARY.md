# GUOJIE-HONG Skills

Agent skills for the work before and around writing code: finding direction, settling requirements, choosing an implementation, and starting a team on Scrum.

## Language

### Shared

**Open question**:
A gap in the source material that blocks the work until someone settles it, tagged with the role that settles it.
_Avoid_: TBD, assumption, 待確認

**Evidence gap**:
A point the work needs but cannot back with evidence, such as a Deployment plan recommendation, left out and put to the user as a question instead of stated as fact.
_Avoid_: Open question, assumption, 待確認, 待查證

### Ask Jev

**Decider**:
The one person a run of Ask Jev names to settle the Open questions Jev cannot, the PM unless the run names someone else.
_Avoid_: owner, PM (as a general term), approver

### Scrum kickoff

**Product Backlog item**:
One ordered entry of the Product Backlog, written from the Product Owner's side as a User Story the team can pick up.
_Avoid_: Task, ticket, 任務

**Task**:
A piece of work the Developers split out of a Product Backlog item during a Sprint.
_Avoid_: Product Backlog item

**Sprint 1 draft**:
The Product Owner's proposal for the first Sprint, a proposed Sprint Goal and the suggested Product Backlog items, which the Scrum Team settles at Sprint Planning.
_Avoid_: Sprint plan, Sprint Backlog

### Deployment planning

**Deployment plan**:
How one repo should be deployed, to the cloud or on-premises, where every recommendation rests on evidence: a fact in the repo or a source actually read while planning.
_Avoid_: deploy guide, 部署建議

### Classic problem mapping

**Classic problem**:
A named, well-studied problem from any field whose known solutions a reliable source documents.
_Avoid_: pattern, prior art, 經典題

**Variant**:
The user's problem when it shares a Classic problem's structure but departs from it in specific, named ways.
_Avoid_: analogy, instance, 變形

### Course building

**Course**:
A set of Lessons on one topic, built for a named audience and total length, where every factual claim traces to a Source or is listed as an Unverified point.
_Avoid_: class, training, 課 (alone)

**Syllabus**:
The plan of a Course: its Lessons in order, what each one teaches, and which parts get an Explainer video.
_Avoid_: outline, table of contents, 大綱

**Lesson**:
One teaching session of a Course, with its own Handout, Slides and Exercises.
_Avoid_: chapter, unit

**Handout**:
The written material for one Lesson, where each factual claim carries the Source it rests on, followed by the Lesson's Unverified points.
_Avoid_: notes, 教材

**Unverified point**:
A point a Lesson teaches that no Source read for the Course backs and none contradicts, listed apart from the Handout's claims and marked as unverified.
_Avoid_: Evidence gap, 待查證, 未查證

**Slides**:
The material a teacher presents for one Lesson, drawn from that Lesson's Handout.
_Avoid_: deck, 簡報 (as a general term)

**Exercise**:
A practice question for one Lesson, whose answer rests on a Source.
_Avoid_: quiz, test, homework

**Source**:
A primary work, or a credible secondary one, that was actually read while building the Course and that the Course cites.
_Avoid_: reference (alone), 參考資料

**Explainer video**:
An animated, narrated walk-through of one hard part of a Lesson, which says only what that Lesson's Sources back.
_Avoid_: clip, 影片 (alone)

**Course project**:
Everything one Course is made of, kept together in one place.
_Avoid_: course folder, workspace

### Comment cleanup

**Outside reference**:
The part of a code comment that points the reader away from the code, to a document, spec section, ticket, meeting, discussion or date, instead of saying what the code is for.
_Avoid_: citation, cross-reference, 引述, 詳見
