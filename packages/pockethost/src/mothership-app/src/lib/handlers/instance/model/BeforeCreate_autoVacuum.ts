export const BeforeCreate_autoVacuum = (e: core.RecordEvent) => {
  e.record.set('autoVacuum', true)
}
