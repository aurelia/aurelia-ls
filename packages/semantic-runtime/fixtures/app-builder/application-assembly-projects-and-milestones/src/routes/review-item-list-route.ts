import { resolve } from 'aurelia';
import { ReviewItemBrowseState } from '../review-item-browse-state';
import type { ReviewerProfile } from '../reviewer-profile';

export class ReviewItemListRoute {
  readonly state = resolve(ReviewItemBrowseState);

  reviewItemsPromise: ReturnType<ReviewItemBrowseState['loadReviews']> = this.state.loadReviews();
  title: string = '';
  done: boolean = false;
  reviewer: ReviewerProfile | null = this.state.reviewerProfiles[0] ?? null;
  createReviewStatusMessage: string = '';

  async createReview() {
    this.reviewItemsPromise = this.state.createReviewItem(this.title, this.done, this.reviewer);
    await this.reviewItemsPromise;
    this.createReviewStatusMessage = 'Review saved.';
  }
}