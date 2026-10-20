import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { ChildHome } from './ChildHome'
import { ChildLayout } from './ChildLayout'
import { ParentGate } from './ParentGate'

// 除孩子首页外，各页面按需加载（单独的代码块），首屏更快
const ParentHome = lazy(() => import('./ParentHome').then((m) => ({ default: m.ParentHome })))
const ParentTextbookPage = lazy(() => import('../features/textbook/ParentTextbookPage').then((m) => ({ default: m.ParentTextbookPage })))
const BossBattlePage = lazy(() => import('../features/boss/BossBattlePage').then((m) => ({ default: m.BossBattlePage })))
const WritePracticePage = lazy(() => import('../features/handwriting/WritePracticePage').then((m) => ({ default: m.WritePracticePage })))
const CharacterFamily = lazy(() => import('../features/challenges/CharacterFamily').then((m) => ({ default: m.CharacterFamily })))
const FlashRecall = lazy(() => import('../features/challenges/FlashRecall').then((m) => ({ default: m.FlashRecall })))
const RadicalDetective = lazy(() => import('../features/challenges/RadicalDetective').then((m) => ({ default: m.RadicalDetective })))
const LearnPage = lazy(() => import('../features/daily/LearnPage').then((m) => ({ default: m.LearnPage })))
const ParentPracticePage = lazy(() => import('../features/daily/ParentPracticePage').then((m) => ({ default: m.ParentPracticePage })))
const UnitChallengePage = lazy(() => import('../features/daily/WeeklyBossPage').then((m) => ({ default: m.UnitChallengePage })))
const WeeklyBossPage = lazy(() => import('../features/daily/WeeklyBossPage').then((m) => ({ default: m.WeeklyBossPage })))
const ParentRewardsPage = lazy(() => import('../features/rewards/ParentRewardsPage').then((m) => ({ default: m.ParentRewardsPage })))
const RewardShopPage = lazy(() => import('../features/rewards/RewardShopPage').then((m) => ({ default: m.RewardShopPage })))
const ParentBooksPage = lazy(() => import('../features/reading/ParentBooksPage').then((m) => ({ default: m.ParentBooksPage })))
const ReadingLogPage = lazy(() => import('../features/reading/ReadingLogPage').then((m) => ({ default: m.ReadingLogPage })))
const ParentWritingPage = lazy(() => import('../features/writing/ParentWritingPage').then((m) => ({ default: m.ParentWritingPage })))
const ParentWritingScorePage = lazy(() => import('../features/writing/ParentWritingPage').then((m) => ({ default: m.ParentWritingScorePage })))
const WritingCasePage = lazy(() => import('../features/writing/WritingCasePage').then((m) => ({ default: m.WritingCasePage })))
const AssessmentHome = lazy(() => import('../features/assessment/AssessmentHome').then((m) => ({ default: m.AssessmentHome })))
const DictationPage = lazy(() => import('../features/assessment/DictationPage').then((m) => ({ default: m.DictationPage })))
const ReadingPage = lazy(() => import('../features/assessment/ReadingPage').then((m) => ({ default: m.ReadingPage })))
const RecognitionPage = lazy(() => import('../features/assessment/RecognitionPage').then((m) => ({ default: m.RecognitionPage })))
const ReportPage = lazy(() => import('../features/assessment/ReportPage').then((m) => ({ default: m.ReportPage })))
const WordsPage = lazy(() => import('../features/assessment/WordsPage').then((m) => ({ default: m.WordsPage })))
const WritingPage = lazy(() => import('../features/assessment/WritingPage').then((m) => ({ default: m.WritingPage })))

export function AppRoutes() {
  return (
    <Suspense fallback={<div className="page muted">正在加载…</div>}>
      <Routes>
        <Route element={<ChildLayout />}>
          <Route index element={<ChildHome />} />
          <Route path="boss" element={<BossBattlePage />} />
          <Route path="write" element={<WritePracticePage />} />
          <Route path="detective" element={<RadicalDetective />} />
          <Route path="family" element={<CharacterFamily />} />
          <Route path="flash" element={<FlashRecall />} />
          <Route path="learn" element={<LearnPage />} />
          <Route path="exam/weekly" element={<WeeklyBossPage />} />
          <Route path="exam/unit/:id" element={<UnitChallengePage />} />
          <Route path="rewards" element={<RewardShopPage />} />
          <Route path="writing" element={<WritingCasePage />} />
          <Route path="reading" element={<ReadingLogPage />} />
        </Route>
        <Route path="parent" element={<ParentGate />}>
          <Route index element={<ParentHome />} />
          <Route path="textbook" element={<ParentTextbookPage />} />
          <Route path="practice" element={<ParentPracticePage />} />
          <Route path="rewards" element={<ParentRewardsPage />} />
          <Route path="writing" element={<ParentWritingPage />} />
          <Route path="writing/:id" element={<ParentWritingScorePage />} />
          <Route path="books" element={<ParentBooksPage />} />
          <Route path="assessment" element={<AssessmentHome />} />
          <Route path="assessment/recognition" element={<RecognitionPage key="recognition" mode="recognition" />} />
          <Route path="assessment/extension" element={<RecognitionPage key="extension" mode="extension" />} />
          <Route path="assessment/dictation" element={<DictationPage />} />
          <Route path="assessment/words" element={<WordsPage />} />
          <Route path="assessment/reading" element={<ReadingPage />} />
          <Route path="assessment/writing" element={<WritingPage />} />
          <Route path="assessment/report/:id" element={<ReportPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
