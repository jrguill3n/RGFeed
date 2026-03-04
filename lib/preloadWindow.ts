/**
 * preloadWindow.ts
 *
 * Directional preload window logic -- translated from Slop Social (React Native).
 *
 * In Slop Social, FlashList uses source={null} for items outside the preload window.
 * Here we unmount MuxPlayer entirely for those items and render a poster placeholder.
 *
 * Window sizes match the Slop Social defaults, with an extra +1 ahead for web
 * buffering latency (see warmup strategy in FeedVideoPlayer).
 */

export const MAX_AHEAD = 6
export const MAX_BEHIND = 1

/**
 * Returns true if the item at `index` should have a MuxPlayer mounted.
 *
 * distance = index - currentIndex
 * "ahead" depends on scroll direction:
 *   "down" -> positive distance is ahead (user scrolling toward higher indices)
 *   "up"   -> negative distance is ahead (user scrolling toward lower indices)
 */
export function shouldPreload(
  index: number,
  currentIndex: number,
  scrollDirection: 'down' | 'up'
): boolean {
  if (index === currentIndex) return true
  const distance = index - currentIndex
  const isAhead = scrollDirection === 'down' ? distance > 0 : distance < 0
  const absDist = Math.abs(distance)
  return isAhead ? absDist <= MAX_AHEAD : absDist <= MAX_BEHIND
}
