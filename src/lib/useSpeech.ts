import { useSyncExternalStore } from 'react'
import { getSpeaker, type SpeechStatus } from './speech'

export function useSpeechStatus(): SpeechStatus {
  const speaker = getSpeaker()
  return useSyncExternalStore(speaker.subscribe, speaker.status, () => 'checking' as const)
}
