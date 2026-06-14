export const BeforeCreate_autoVacuum = (e: core.ModelEvent) => {
  const record = e.model as models.Record
  record.set('autoVacuum', true)
}
