import assert from 'node:assert/strict';

import type {
  AotBuildEvidence,
  LaneTranscript,
  ProjectsAndMilestonesApplicationObservation,
  ProjectsAndMilestonesObservation,
} from './contract.js';

const checkpointLabels = [
  'projects-initial',
  'project-created',
  'project-detail',
  'milestones',
  'milestone-detail',
  'assignments',
  'assignment-created',
  'assignment-detail',
  'reviews',
  'review-created',
  'review-detail',
] as const;

const projectNames = ['Platform refresh', 'Docs cleanup'];
const projectOptions = [...projectNames, 'Compiler audit'];
const assignmentRows = [
  { title: 'Prepare release notes', project: 'Platform refresh', status: 'Open' },
  { title: 'Check deployment checklist', project: 'Docs cleanup', status: 'Done' },
  { title: 'Collect preview feedback', project: 'Platform refresh', status: 'Open' },
];
const reviewRows = [
  { title: 'Architecture review', reviewer: 'Ada Lovelace', status: 'Open' },
  { title: 'Launch checklist review', reviewer: 'Grace Hopper', status: 'Done' },
];

export function assertProjectsAndMilestonesBuildEvidence(evidence: AotBuildEvidence): void {
  assert.deepEqual(
    evidence.artifacts.map(artifact => artifact.definitionName).sort(),
    [
      'milestone-detail-route',
      'milestone-list-route',
      'my-app',
      'project-detail-route',
      'project-list-route',
      'review-item-detail-route',
      'review-item-list-route',
      'task-item-detail-route',
      'task-item-list-route',
    ],
    'projects-and-milestones did not emit its exact nine-resource cohort',
  );
  assert.equal(evidence.runtimeConfiguration.modules.length, 1);
  // Resource and renderer breadth remains intentionally provisional. This golden proves compiler closure and
  // functional parity without turning the current registration projection into a permanent optimization target.
}

export function assertProjectsAndMilestonesExpectations(transcript: LaneTranscript): void {
  assert.equal(transcript.probes, null, `${transcript.lane} projects-and-milestones unexpectedly installed G0 probes`);
  assert.deepEqual(transcript.semantic.console, [], `${transcript.lane} projects-and-milestones wrote to the browser console`);
  assert.deepEqual(transcript.semantic.pageErrors, [], `${transcript.lane} projects-and-milestones raised a page error`);
  assert.equal(transcript.semantic.teardownEvents, null);
  assert.deepEqual(transcript.semantic.checkpoints.map(checkpoint => checkpoint.label), checkpointLabels);

  const initial = route(transcript, 'projects-initial', '/projects@main', 'Projects | Project Milestone Hub');
  assert.equal(initial.kind, 'project-list');
  assert.equal(initial.heading, 'Projects');
  assert.equal(initial.name, '');
  assert.equal(initial.phase, '');
  assert.deepEqual(initial.projects.map(project => project.name), projectNames);
  assert.deepEqual(initial.projects.map(project => project.detailLocation), ['/projects/1', '/projects/2']);

  const createdProject = route(transcript, 'project-created', '/projects@main', 'Projects | Project Milestone Hub');
  assert.equal(createdProject.kind, 'project-list');
  assert.equal(createdProject.heading, 'Projects');
  assert.equal(createdProject.name, 'Compiler audit');
  assert.equal(createdProject.phase, 'AOT');
  assert.deepEqual(createdProject.projects.map(project => project.name), projectOptions);
  assert.deepEqual(createdProject.projects.map(project => project.detailLocation), [
    '/projects/1',
    '/projects/2',
    '/projects/3',
  ]);

  const projectDetail = route(
    transcript,
    'project-detail',
    '/projects@main/1@detail',
    'Project Detail | Projects | Project Milestone Hub',
  );
  assert.equal(projectDetail.kind, 'project-detail');
  assert.equal(projectDetail.heading, 'Platform refresh');
  assert.equal(projectDetail.phase, 'Planning');
  assert.deepEqual(projectDetail.assignments.map(({ title, status }) => ({ title, status })), [
    { title: 'Prepare release notes', status: 'Open' },
    { title: 'Collect preview feedback', status: 'Open' },
  ]);
  assert.equal(projectDetail.backLocation, '/projects/');
  assert.deepEqual(projectDetail.assignments.map(item => item.detailLocation), ['/assignments/1', '/assignments/3']);

  const milestones = route(transcript, 'milestones', '/milestones@main', 'Milestones | Project Milestone Hub');
  assert.equal(milestones.kind, 'milestone-list');
  assert.equal(milestones.heading, 'Milestones');
  assert.deepEqual(milestones.milestones.map(milestone => milestone.title), ['Prototype review', 'Public preview']);
  assert.deepEqual(milestones.milestones.map(milestone => milestone.detailLocation), [
    '/milestones/1',
    '/milestones/2',
  ]);

  const milestoneDetail = route(
    transcript,
    'milestone-detail',
    '/milestones@main/2@detail',
    'Milestone Detail | Milestones | Project Milestone Hub',
  );
  assert.equal(milestoneDetail.kind, 'milestone-detail');
  assert.equal(milestoneDetail.heading, 'Public preview');
  assert.equal(milestoneDetail.targetDate, '2026-07-01');
  assert.equal(milestoneDetail.backLocation, '/milestones/');

  const assignments = route(transcript, 'assignments', '/assignments@main', 'Assignments | Project Milestone Hub');
  assert.equal(assignments.kind, 'assignment-list');
  assert.equal(assignments.heading, 'Assignments');
  assert.equal(assignments.title, '');
  assert.equal(assignments.done, false);
  assert.deepEqual(assignments.project, { options: projectOptions, selected: 'Platform refresh' });
  assert.equal(assignments.statusMessage, null);
  assert.deepEqual(stripAssignmentLinks(assignments.assignments), assignmentRows);
  assert.deepEqual(assignments.assignments.map(item => item.projectLocation), [
    '/projects/1',
    '/projects/2',
    '/projects/1',
  ]);
  assert.deepEqual(assignments.assignments.map(item => item.detailLocation), [
    '/assignments/1',
    '/assignments/2',
    '/assignments/3',
  ]);

  const createdAssignment = route(
    transcript,
    'assignment-created',
    '/assignments@main',
    'Assignments | Project Milestone Hub',
  );
  assert.equal(createdAssignment.kind, 'assignment-list');
  assert.equal(createdAssignment.heading, 'Assignments');
  assert.equal(createdAssignment.title, 'Trace generated wire');
  assert.equal(createdAssignment.done, true);
  assert.deepEqual(createdAssignment.project, { options: projectOptions, selected: 'Docs cleanup' });
  assert.equal(createdAssignment.statusMessage, 'Assignment saved.');
  assert.deepEqual(stripAssignmentLinks(createdAssignment.assignments), [
    ...assignmentRows,
    { title: 'Trace generated wire', project: 'Docs cleanup', status: 'Done' },
  ]);
  assert.deepEqual(createdAssignment.assignments.map(item => item.projectLocation), [
    '/projects/1',
    '/projects/2',
    '/projects/1',
    '/projects/2',
  ]);
  assert.deepEqual(createdAssignment.assignments.map(item => item.detailLocation), [
    '/assignments/1',
    '/assignments/2',
    '/assignments/3',
    '/assignments/4',
  ]);

  const assignmentDetail = route(
    transcript,
    'assignment-detail',
    '/assignments@main/4@detail',
    'Assignment Detail | Assignments | Project Milestone Hub',
  );
  assert.equal(assignmentDetail.kind, 'assignment-detail');
  assert.equal(assignmentDetail.heading, 'Trace generated wire');
  assert.equal(assignmentDetail.status, 'Done');
  assert.equal(assignmentDetail.project, 'Docs cleanup');
  assert.equal(assignmentDetail.backLocation, '/assignments/');

  const reviews = route(transcript, 'reviews', '/reviews@main', 'Reviews | Project Milestone Hub');
  assert.equal(reviews.kind, 'review-list');
  assert.equal(reviews.heading, 'Reviews');
  assert.equal(reviews.title, '');
  assert.equal(reviews.done, false);
  assert.deepEqual(reviews.reviewer, {
    options: ['Ada Lovelace', 'Grace Hopper'],
    selected: 'Ada Lovelace',
  });
  assert.equal(reviews.statusMessage, null);
  assert.deepEqual(stripReviewLinks(reviews.reviews), reviewRows);
  assert.deepEqual(reviews.reviews.map(review => review.detailLocation), ['/reviews/1', '/reviews/2']);

  const createdReview = route(transcript, 'review-created', '/reviews@main', 'Reviews | Project Milestone Hub');
  assert.equal(createdReview.kind, 'review-list');
  assert.equal(createdReview.heading, 'Reviews');
  assert.equal(createdReview.title, 'AOT closure review');
  assert.equal(createdReview.done, true);
  assert.deepEqual(createdReview.reviewer, {
    options: ['Ada Lovelace', 'Grace Hopper'],
    selected: 'Grace Hopper',
  });
  assert.equal(createdReview.statusMessage, 'Review saved.');
  assert.deepEqual(stripReviewLinks(createdReview.reviews), [
    ...reviewRows,
    { title: 'AOT closure review', reviewer: 'Grace Hopper', status: 'Done' },
  ]);
  assert.deepEqual(createdReview.reviews.map(review => review.detailLocation), [
    '/reviews/1',
    '/reviews/2',
    '/reviews/3',
  ]);

  const reviewDetail = route(
    transcript,
    'review-detail',
    '/reviews@main/3@detail',
    'Review Detail | Reviews | Project Milestone Hub',
  );
  assert.equal(reviewDetail.kind, 'review-detail');
  assert.equal(reviewDetail.heading, 'AOT closure review');
  assert.equal(reviewDetail.status, 'Done');
  assert.equal(reviewDetail.reviewer, 'Grace Hopper');
  assert.equal(reviewDetail.backLocation, '/reviews/');
}

function route(
  transcript: LaneTranscript,
  label: string,
  location: string,
  documentTitle: string,
): ProjectsAndMilestonesObservation['route'] {
  const checkpoint = transcript.semantic.checkpoints.find(candidate => candidate.label === label);
  assert.ok(checkpoint != null, `${transcript.lane} projects-and-milestones has no ${label} checkpoint`);
  assert.equal(
    checkpoint.observation.kind,
    'projects-and-milestones',
    `${transcript.lane} ${label} is not a projects-and-milestones observation`,
  );
  const observation: ProjectsAndMilestonesApplicationObservation = checkpoint.observation;
  assert.equal(observation.model.location, location);
  assert.equal(observation.model.documentTitle, documentTitle);
  assert.deepEqual(observation.model.navigation.map(link => link.label), [
    'Projects',
    'Milestones',
    'Assignments',
    'Reviews',
  ]);
  assert.deepEqual(observation.model.navigation.map(link => link.location), [
    '/projects',
    '/milestones',
    '/assignments',
    '/reviews',
  ]);
  return observation.model.route;
}

function stripAssignmentLinks(
  assignments: readonly {
    readonly title: string;
    readonly project: string;
    readonly status: string;
  }[],
) {
  return assignments.map(({ title, project, status }) => ({ title, project, status }));
}

function stripReviewLinks(
  reviews: readonly {
    readonly title: string;
    readonly reviewer: string;
    readonly status: string;
  }[],
) {
  return reviews.map(({ title, reviewer, status }) => ({ title, reviewer, status }));
}
