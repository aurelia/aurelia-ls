import { resolve } from 'aurelia';
import { IRouteContext } from '@aurelia/router';
import { ReviewItemBrowseState } from '../review-item-browse-state';

export class ReviewItemDetailRoute {
  readonly state = resolve(ReviewItemBrowseState);
  readonly routeParams = resolve(IRouteContext).getRouteParameters<{
    reviewId: string;
  }>();
  readonly reviewItemPromise: ReturnType<ReviewItemBrowseState['loadReview']> = this.state.loadReview(this.routeParams.reviewId);
}