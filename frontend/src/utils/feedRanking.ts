// Feed ranking engine.
//
// Mirrors the way Instagram / YouTube order content: each tab applies a
// different blend of recency, engagement and personal affinity instead of a
// single newest-first list.
//
//   Following → only accounts you follow (+ your own), reverse-chronological.
//   Trending  → engagement *velocity* with time decay (the Reddit/YouTube
//               "hot" curve) so fast-rising recent posts win, not all-time leaders.
//   Discover  → personalised "For You": log-scaled engagement + recency decay +
//               follow/role affinity + media boost, de-duplicated by author so a
//               single account can't flood the top.
//   Saved     → bookmarked posts, newest first.

export type FeedFilter = 'Following' | 'Discover' | 'Trending' | 'Saved' | string;

export interface RankablePost {
  id: string;
  author: { _id: string; title?: string };
  type: string;
  images?: string[];
  video?: { url: string } | undefined;
  likes: number;
  comments: number;
  shares: number;
  isLiked: boolean;
  isBookmarked: boolean;
  /** Epoch millis the post was created. Used instead of the display timestamp. */
  createdAtMs: number;
}

export interface FeedContext {
  followingIds: Set<string>;
  currentUserId: string | null;
  currentUserRole?: string | null;
  /** Injectable "now" for deterministic tests; defaults to Date.now(). */
  now?: number;
}

const HOUR_MS = 1000 * 60 * 60;

const ageHours = (post: RankablePost, now: number): number =>
  Math.max(0, (now - post.createdAtMs) / HOUR_MS);

// Weighted engagement — comments and shares signal far more intent than a like,
// matching how both platforms value "meaningful" interactions.
const engagementScore = (post: RankablePost): number =>
  Math.max(0, post.likes) + Math.max(0, post.comments) * 2 + Math.max(0, post.shares) * 3;

const hasMedia = (post: RankablePost): boolean =>
  post.type === 'video' || post.type === 'image' || !!post.video || !!(post.images && post.images.length);

const isOwn = (post: RankablePost, ctx: FeedContext): boolean =>
  !!ctx.currentUserId && post.author._id === ctx.currentUserId;

const isFollowed = (post: RankablePost, ctx: FeedContext): boolean =>
  ctx.followingIds.has(post.author._id);

const byNewest = (a: RankablePost, b: RankablePost) => b.createdAtMs - a.createdAtMs;

/**
 * "Hot" velocity score. Dividing engagement by a super-linear function of age
 * means a post needs *sustained, fast* interaction to stay on top — old posts
 * decay out even if their absolute like count is high.
 */
const trendingScore = (post: RankablePost, now: number): number => {
  const age = ageHours(post, now);
  const base = engagementScore(post) + (hasMedia(post) ? 1 : 0);
  return (base + 1) / Math.pow(age + 2, 1.5);
};

/**
 * Personalised relevance score for the Discover / "For You" tab.
 * All terms are roughly on a 0–3 scale so the weights below are comparable.
 */
const relevanceScore = (post: RankablePost, ctx: FeedContext): number => {
  const now = ctx.now ?? Date.now();
  const age = ageHours(post, now);

  // log1p keeps a viral post from dwarfing everything else linearly.
  const engagement = Math.log1p(engagementScore(post)); // ~0–5
  // Exponential recency decay, ~36h half-life.
  const recency = Math.exp(-age / 36); // 1 → 0
  const followAffinity = isFollowed(post, ctx) ? 1 : 0;
  const roleAffinity =
    ctx.currentUserRole && post.author.title && post.author.title === ctx.currentUserRole ? 1 : 0;
  const media = hasMedia(post) ? 1 : 0;
  // Surface fresh content: gently down-rank your own posts and things you've
  // already engaged with so Discover keeps feeling new.
  const seenPenalty = post.isLiked || post.isBookmarked ? 1 : 0;
  const ownPenalty = isOwn(post, ctx) ? 1 : 0;

  return (
    1.0 * engagement +
    2.0 * recency +
    1.2 * followAffinity +
    0.6 * roleAffinity +
    0.5 * media -
    0.4 * seenPenalty -
    1.0 * ownPenalty
  );
};

/**
 * Greedy re-rank that demotes posts whose author has already appeared, so the
 * top of Discover stays varied (Instagram Explore does the same).
 */
const diversifyByAuthor = (
  scored: Array<{ post: RankablePost; score: number }>,
  penaltyPerRepeat = 0.6
): RankablePost[] => {
  const pool = [...scored];
  const seenByAuthor: Record<string, number> = {};
  const ordered: RankablePost[] = [];

  while (pool.length) {
    let bestIdx = 0;
    let bestAdj = -Infinity;
    for (let i = 0; i < pool.length; i++) {
      const repeats = seenByAuthor[pool[i].post.author._id] || 0;
      const adjusted = pool[i].score - repeats * penaltyPerRepeat;
      if (adjusted > bestAdj) {
        bestAdj = adjusted;
        bestIdx = i;
      }
    }
    const [picked] = pool.splice(bestIdx, 1);
    seenByAuthor[picked.post.author._id] = (seenByAuthor[picked.post.author._id] || 0) + 1;
    ordered.push(picked.post);
  }
  return ordered;
};

/**
 * Orders (and where appropriate filters) the feed for the active tab.
 * Pure function — safe to call inside render.
 */
export function rankFeed<T extends RankablePost>(
  posts: T[],
  filter: FeedFilter,
  ctx: FeedContext
): T[] {
  const now = ctx.now ?? Date.now();

  // De-dupe defensively; the same post can arrive twice via socket + fetch.
  const unique = posts.filter((p, i, self) => self.findIndex(x => x.id === p.id) === i);

  switch (filter) {
    case 'Saved':
      return unique.filter(p => p.isBookmarked).sort(byNewest);

    case 'Following':
      // Only the accounts you follow (plus your own posts), newest first —
      // exactly Instagram's "Following" feed.
      return unique
        .filter(p => isFollowed(p, ctx) || isOwn(p, ctx))
        .sort(byNewest);

    case 'Trending':
      return unique
        // Keep trending fresh: ignore anything older than 30 days.
        .filter(p => ageHours(p, now) <= 24 * 30)
        .map(p => ({ post: p, score: trendingScore(p, now) }))
        .sort((a, b) => b.score - a.score)
        .map(s => s.post as T);

    case 'Discover':
    default: {
      const scored = unique.map(p => ({ post: p, score: relevanceScore(p, { ...ctx, now }) }));
      return diversifyByAuthor(scored) as T[];
    }
  }
}
