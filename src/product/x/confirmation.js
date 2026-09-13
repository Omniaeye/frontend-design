// A successful confirmation already returns the authoritative saved post.
export async function confirmPost({ request, previewId, onConfirmed, refresh }) {
  const result = await request('/x/confirm', { previewId });
  onConfirmed(result.post);
  try {
    await refresh();
  } catch {
    /* Keep the authoritative confirmation visible. */
  }
  return result.post;
}
export function mergeConfirmedPost(posts, post) {
  return [post, ...posts.filter((item) => item.id !== post.id)];
}
