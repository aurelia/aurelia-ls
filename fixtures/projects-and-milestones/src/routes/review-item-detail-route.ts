import { resolve } from 'aurelia';
import { IRouteContext } from '@aurelia/router';
import { ReviewItemBrowseState } from '../review-item-browse-state';

export class ReviewItemDetailRoute {
  readonly state = resolve(ReviewItemBrowseState);
  readonly reviewId = resolve(IRouteContext).getRouteParameters<{
    reviewId: string;
  }>().reviewId;
  readonly reviewItemPromise: ReturnType<ReviewItemBrowseState['loadReview']> = this.state.loadReview(this.reviewId);
}
