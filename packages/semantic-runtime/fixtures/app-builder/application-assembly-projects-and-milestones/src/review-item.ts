import type { ReviewerProfile } from './reviewer-profile';

export class ReviewItem {
  constructor(
    readonly id: number,
    readonly title: string,
    readonly done: boolean,
    public reviewer: ReviewerProfile | null,
  ) {}
}
