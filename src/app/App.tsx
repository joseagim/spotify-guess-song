import { BrowserRouter, Route, Routes } from 'react-router'
import { CallbackPage } from '../features/auth/CallbackPage'
import { ComingSoonPage } from '../features/placeholder/ComingSoonPage'
import { SettingsPage } from '../features/settings/SettingsPage'
import { SoundLabPage } from '../features/lab/SoundLabPage'
import { Layout } from './Layout'

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="callback" element={<CallbackPage />} />
        <Route element={<Layout />}>
          <Route index element={<ComingSoonPage feature="play" />} />
          <Route path="library" element={<ComingSoonPage feature="library" />} />
          <Route path="daily" element={<ComingSoonPage feature="daily" />} />
          <Route path="records" element={<ComingSoonPage feature="records" />} />
          <Route path="lab" element={<SoundLabPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<ComingSoonPage feature="play" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
