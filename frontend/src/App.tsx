import { AppProviders } from '@/app/providers'
import { AppRouter } from '@/app/router'
import { IntroReveal } from '@/components/IntroReveal'

function App() {
  return (
    <AppProviders>
      <AppRouter />
      <IntroReveal />
    </AppProviders>
  )
}

export default App
