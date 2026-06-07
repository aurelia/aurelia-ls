import { ReviewItem } from '../review-item';
import { ReviewerProfile } from '../reviewer-profile';

export class ReviewAssignmentService {
  private readonly reviewerProfiles: ReviewerProfile[] = [
    new ReviewerProfile('ada', 'Ada Lovelace', 'ada@example.test'),
    new ReviewerProfile('grace', 'Grace Hopper', 'grace@example.test'),
  ];

  private readonly reviewItems: ReviewItem[] = [
    new ReviewItem(1, 'Architecture review', false, this.reviewerProfiles.find((reviewerProfile) => reviewerProfile.reviewerId === 'ada') ?? null),
    new ReviewItem(2, 'Launch checklist review', true, this.reviewerProfiles.find((reviewerProfile) => reviewerProfile.reviewerId === 'grace') ?? null),
  ];

  async loadReviews(): Promise<readonly ReviewItem[]> {
    return this.reviewItems;
  }

  async loadReview(id: string): Promise<ReviewItem | null> {
    return this.reviewItems.find((reviewItem) => String(reviewItem.id) === id) ?? null;
  }

  async createReview(title: string, done: boolean, reviewer: ReviewerProfile | null): Promise<readonly ReviewItem[]> {
    const nextId = this.reviewItems.length === 0 ? 1 : Math.max(...this.reviewItems.map((reviewItem) => reviewItem.id)) + 1;
    this.reviewItems.push(new ReviewItem(nextId, title, done, reviewer));
    return this.reviewItems;
  }
}
