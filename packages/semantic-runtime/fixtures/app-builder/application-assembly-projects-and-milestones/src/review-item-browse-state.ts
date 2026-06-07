import { resolve } from 'aurelia';
import { ReviewItem } from './review-item';
import { ReviewAssignmentService } from './services/review-assignment-service';
import { ReviewerProfile } from './reviewer-profile';

export class ReviewItemBrowseState {
  private readonly reviewAssignmentService = resolve(ReviewAssignmentService);
  readonly reviewerProfiles: ReviewerProfile[] = [
    new ReviewerProfile('ada', 'Ada Lovelace', 'ada@example.test'),
    new ReviewerProfile('grace', 'Grace Hopper', 'grace@example.test'),
  ];

  loadReviews(): Promise<readonly ReviewItem[]> {
    return this.reviewAssignmentService.loadReviews();
  }

  loadReview(id: string): Promise<ReviewItem | null> {
    return this.reviewAssignmentService.loadReview(id);
  }

  createReviewItem(title: string, done: boolean, reviewer: ReviewerProfile | null): Promise<readonly ReviewItem[]> {
    return this.reviewAssignmentService.createReview(title, done, reviewer);
  }

  reviewerForReviewItem(reviewItem: ReviewItem): ReviewerProfile | null {
    return reviewItem.reviewer;
  }

  reviewerLabelForReviewItem(reviewItem: ReviewItem): string {
    const reviewerProfile = this.reviewerForReviewItem(reviewItem);
    return reviewerProfile == null ? '' : String(reviewerProfile.displayName);
  }

  matchReviewerProfile(left: ReviewerProfile | null, right: ReviewerProfile | null): boolean {
    return left?.reviewerId === right?.reviewerId;
  }
}
