import { Navigate, Route, Routes } from 'react-router-dom'
import { ChildHome } from './ChildHome'
import { ChildLayout } from './ChildLayout'
import { ParentGate } from './ParentGate'
import { ParentHome } from './ParentHome'
import { ParentTextbookPage } from '../features/textbook/ParentTextbookPage'

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<ChildLayout />}>
        <Route index element={<ChildHome />} />
      </Route>
      <Route path="parent" element={<ParentGate />}>
        <Route index element={<ParentHome />} />
        <Route path="textbook" element={<ParentTextbookPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
