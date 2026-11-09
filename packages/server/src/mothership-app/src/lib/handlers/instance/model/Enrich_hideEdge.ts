/** Customers see the region, never the edge. Superusers (the edges' mirror, operators) still see `edge`. */
export const Enrich_hideEdge = (e: core.RecordEnrichEvent) => {
  if (!e.requestInfo?.auth?.isSuperuser()) {
    e.record?.hide('edge')
  }
}
