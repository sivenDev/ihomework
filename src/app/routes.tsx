import { Navigate, Route, Routes } from 'react-router-dom'
import { ChildHome } from './ChildHome'
import { ChildLayout } from './ChildLayout'
import { ParentGate } from './ParentGate'
import { ParentHome } from './ParentHome'
import { AsrCheck } from './AsrCheck'
import { ParentTextbookPage } from '../features/textbook/ParentTextbookPage'
import { BossBattlePage } from '../features/boss/BossBattlePage'
import { WritePracticePage } from '../features/handwriting/WritePracticePage'
import { CharacterFamily } from '../features/challenges/CharacterFamily'
import { FlashRecall } from '../features/challenges/FlashRecall'
import { RadicalDetective } from '../features/challenges/RadicalDetective'
import { AssessmentHome } from '../features/assessment/AssessmentHome'
import { DictationPage } from '../features/assessment/DictationPage'
import { ReadingPage } from '../features/assessment/ReadingPage'
import { RecognitionPage } from '../features/assessment/RecognitionPage'
import { ReportPage } from '../features/assessment/ReportPage'
import { WordsPage } from '../features/assessment/WordsPage'
import { WritingPage } from '../features/assessment/WritingPage'

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<ChildLayout />}>
        <Route index element={<ChildHome />} />
        <Route path="boss" element={<BossBattlePage />} />
        <Route path="write" element={<WritePracticePage />} />
        <Route path="detective" element={<RadicalDetective />} />
        <Route path="family" element={<CharacterFamily />} />
        <Route path="flash" element={<FlashRecall />} />
      </Route>
      <Route path="parent" element={<ParentGate />}>
        <Route index element={<ParentHome />} />
        <Route path="textbook" element={<ParentTextbookPage />} />
        <Route path="assessment" element={<AssessmentHome />} />
        <Route path="assessment/recognition" element={<RecognitionPage key="recognition" mode="recognition" />} />
        <Route path="assessment/extension" element={<RecognitionPage key="extension" mode="extension" />} />
        <Route path="assessment/dictation" element={<DictationPage />} />
        <Route path="assessment/words" element={<WordsPage />} />
        <Route path="assessment/reading" element={<ReadingPage />} />
        <Route path="assessment/writing" element={<WritingPage />} />
        <Route path="assessment/report/:id" element={<ReportPage />} />
      </Route>
      <Route path="asr-check" element={<AsrCheck />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
