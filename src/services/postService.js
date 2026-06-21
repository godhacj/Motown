/**
 * postService.js
 *
 * Stub layer for all post-related backend API calls.
 * Each function returns a resolved Promise matching the shape a real API
 * would return. Replace the bodies with actual fetch/axios calls when the
 * backend is ready — callers don't need to change.
 *
 * Base URL pattern (set via env var when wiring up):
 *   const BASE = import.meta.env.VITE_API_BASE_URL + '/posts'
 */

// ─── Likes ────────────────────────────────────────────────────────────────────

/**
 * Like a post.
 * @param {number|string} postId
 * @returns {Promise<{ postId, likes: number }>}
 */
export async function likePost(postId) {
  // TODO: POST /api/posts/:postId/like
  return Promise.resolve({ postId, likes: 0 })
}

/**
 * Unlike a post.
 * @param {number|string} postId
 * @returns {Promise<{ postId, likes: number }>}
 */
export async function unlikePost(postId) {
  // TODO: DELETE /api/posts/:postId/like
  return Promise.resolve({ postId, likes: 0 })
}

// ─── Saves ────────────────────────────────────────────────────────────────────

/**
 * Save (bookmark) a post.
 * @param {number|string} postId
 * @returns {Promise<{ postId, saves: number }>}
 */
export async function savePost(postId) {
  // TODO: POST /api/posts/:postId/save
  return Promise.resolve({ postId, saves: 0 })
}

/**
 * Unsave a post.
 * @param {number|string} postId
 * @returns {Promise<{ postId, saves: number }>}
 */
export async function unsavePost(postId) {
  // TODO: DELETE /api/posts/:postId/save
  return Promise.resolve({ postId, saves: 0 })
}

// ─── Shares ───────────────────────────────────────────────────────────────────

/**
 * Record a share event.
 * @param {number|string} postId
 * @param {'facebook'|'twitter'|'whatsapp'|'copy'} platform
 * @returns {Promise<{ postId, shares: number }>}
 */
export async function sharePost(postId, platform) {
  // TODO: POST /api/posts/:postId/share  { platform }
  return Promise.resolve({ postId, platform, shares: 0 })
}

// ─── Comments ─────────────────────────────────────────────────────────────────

/**
 * Fetch all comments for a post.
 * @param {number|string} postId
 * @returns {Promise<Array<{ id, author, avatar, text, time }>>}
 */
export async function getComments(postId) {
  // TODO: GET /api/posts/:postId/comments
  return Promise.resolve([])
}

/**
 * Post a new comment.
 * @param {number|string} postId
 * @param {string} text
 * @returns {Promise<{ id, author, avatar, text, time }>}
 */
export async function addComment(postId, text) {
  // TODO: POST /api/posts/:postId/comments  { text }
  return Promise.resolve({
    id: Date.now(),
    author: 'You',
    avatar: null,
    text,
    time: 'just now',
  })
}

// ─── Counts ───────────────────────────────────────────────────────────────────

/**
 * Fetch current counts for a single post.
 * @param {number|string} postId
 * @returns {Promise<{ likes: number, saves: number, shares: number, comments: number }>}
 */
export async function getPostCounts(postId) {
  // TODO: GET /api/posts/:postId/counts
  return Promise.resolve({ likes: 0, saves: 0, shares: 0, comments: 0 })
}

/**
 * Fetch counts for multiple posts in one request.
 * @param {Array<number|string>} postIds
 * @returns {Promise<Record<string, { likes: number, saves: number, shares: number, comments: number }>>}
 */
export async function getBulkPostCounts(postIds) {
  // TODO: POST /api/posts/counts  { ids: postIds }
  return Promise.resolve(
    Object.fromEntries(postIds.map(id => [id, { likes: 0, saves: 0, shares: 0, comments: 0 }]))
  )
}
