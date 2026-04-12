import assert from "node:assert/strict";
import test from "node:test";

import { ClaimHomeKind, createClaimRoute } from "../out/model/claims/index.js";
import {
  SemanticInquiryEpisode,
  SemanticReadMode
} from "../out/model/semantic-api/index.js";
import {
  AuthoredOccurrenceTarget,
  createQuestionRoute,
  getQuestionRouteClaimRoute
} from "../out/query/framing/question-route.js";
import { WorldFrameKind, createWorldFrame } from "../out/query/framing/world-frame.js";
import { planSemanticQuery } from "../out/query/routing/query-planner.js";

test("planSemanticQuery composes anchored support for occurrence-guided explain", () => {
  const query = {
    questionRoute: createQuestionRoute(
      createClaimRoute(ClaimHomeKind.AuthoredOccurrenceBasis),
      {
        inquiryEpisode: SemanticInquiryEpisode.BoundedClosureExplanation,
        readMode: SemanticReadMode.Explain,
        authoredOccurrenceTarget: new AuthoredOccurrenceTarget(
          "template-source:app-root.html",
          39
        )
      }
    ),
    worldFrame: createWorldFrame(11, WorldFrameKind.Current)
  };

  const plan = planSemanticQuery(query);

  assert.equal(
    getQuestionRouteClaimRoute(plan.query.questionRoute).home,
    ClaimHomeKind.AnchoredSupport
  );
  assert.equal(plan.query.questionRoute.inquiryEpisode, SemanticInquiryEpisode.BoundedClosureExplanation);
  assert.equal(plan.query.questionRoute.readMode, SemanticReadMode.Explain);
  assert.equal(
    plan.query.questionRoute.focusRef.authoredOccurrenceTarget?.templateSourceRef,
    "template-source:app-root.html"
  );
});

test("planSemanticQuery keeps governing-anchor occurrence routing distinct from anchored support", () => {
  const query = {
    questionRoute: createQuestionRoute(
      createClaimRoute(ClaimHomeKind.AuthoredOccurrenceBasis),
      {
        inquiryEpisode: SemanticInquiryEpisode.GoverningAnchorJump,
        readMode: SemanticReadMode.Explain,
        authoredOccurrenceTarget: new AuthoredOccurrenceTarget(
          "template-source:app-root.html",
          39
        )
      }
    ),
    worldFrame: createWorldFrame(12, WorldFrameKind.Current)
  };

  const plan = planSemanticQuery(query);

  assert.equal(
    getQuestionRouteClaimRoute(plan.query.questionRoute).home,
    ClaimHomeKind.AuthoredOccurrenceBasis
  );
});
