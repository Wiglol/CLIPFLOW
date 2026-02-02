export function humanError(err: unknown): string {
  if (!err) return 'Unknown error.'
  if (typeof err === 'string') return err
  if (err instanceof Error) {
    const msg = err.message || 'Error'
    return msg
  }
  try {
    return JSON.stringify(err)
  } catch {
    return 'Unexpected error.'
  }
}
