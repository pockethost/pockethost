/**
 * Edges log in as records of the `edges` auth collection (`edge_id` + the edge's secret). Routes edges call accept a
 * superuser or an edge login (`$apis.requireAuth('_superusers', 'edges')`); handlers use this to tell them apart.
 *
 * @returns The calling edge's record, or undefined when the caller is a superuser (or anyone else)
 */
export const authEdge = (e: core.RequestEvent): models.Record | undefined => {
  const auth = e.auth
  if (!auth || auth.collection().name !== 'edges') return undefined
  return auth
}
