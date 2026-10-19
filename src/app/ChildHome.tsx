import { Link } from 'react-router-dom'
import { HanziSpeak } from '../components/HanziSpeak'

const ISLANDS: { name: string; icon: string; note: string; to?: string }[] = [
  { name: '错字 Boss', icon: '🐉', note: '打败没记住的字', to: '/boss' },
  { name: '写字练习', icon: '✍️', note: '描红、默写本课的字', to: '/write' },
  { name: '部首侦探', icon: '🔍', note: '推理汉字的读音和意思', to: '/detective' },
  { name: '字族网络', icon: '🕸️', note: '一个声旁，带出一串字', to: '/family' },
  { name: '生字闪认', icon: '⚡', note: '挑战你的最快纪录', to: '/flash' },
]

export function ChildHome() {
  return (
    <div className="page">
      <div className="topbar">
        <h1>汉字闯关</h1>
        <Link className="btn btn-quiet" to="/parent">
          家长
        </Link>
      </div>

      <section className="card welcome">
        <HanziSpeak text="今天也来闯关吧！点一点汉字，听听它怎么读。" />
      </section>

      <section aria-labelledby="map-title">
        <h2 id="map-title" className="section-title">
          闯关地图
        </h2>
        <ul className="island-grid">
          {ISLANDS.map((island) =>
            island.to ? (
              <li key={island.name}>
                <Link className="card island island-open" to={island.to}>
                  <span className="island-icon" aria-hidden="true">
                    {island.icon}
                  </span>
                  <span className="island-name">{island.name}</span>
                  <span className="muted">{island.note}</span>
                </Link>
              </li>
            ) : (
              <li key={island.name} className="card island" aria-disabled="true">
                <span className="island-icon" aria-hidden="true">
                  {island.icon}
                </span>
                <span className="island-name">{island.name}</span>
                <span className="muted">{island.note}</span>
                <span className="island-badge">即将开放</span>
              </li>
            ),
          )}
        </ul>
      </section>
    </div>
  )
}
