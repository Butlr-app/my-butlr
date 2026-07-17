export function appendSpeechTranscript(current: string, transcript: string): string {
  const base = current.trim()
  const addition = transcript.trim()
  if (!addition) return current
  if (!base) return addition
  return `${base} ${addition}`
}
