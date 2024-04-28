export function toDisplayDate (date: string | Date) {
  return new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

export function toIsoDate (date: string | Date) {
  return new Date(date).toISOString().split('T')[0]
}
