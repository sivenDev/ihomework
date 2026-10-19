import { HashRouter } from 'react-router-dom'
import { SpeechNotice } from '../components/SpeechNotice'
import { ParentSessionProvider } from './ParentSession'
import { AppRoutes } from './routes'
import './App.css'

// 使用 HashRouter：GitHub Pages 没有服务端路由，刷新子页面时不会 404
export function App() {
  return (
    <HashRouter>
      <ParentSessionProvider>
        <SpeechNotice />
        <AppRoutes />
      </ParentSessionProvider>
    </HashRouter>
  )
}
