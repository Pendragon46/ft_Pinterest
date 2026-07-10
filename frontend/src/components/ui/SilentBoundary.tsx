import { Component } from 'react'
import type { ReactNode } from 'react'

// Renders nothing if a child throws — for optional, non-critical UI (e.g. an
// animation) that must never take the whole app down.
export class SilentBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    return this.state.failed ? null : this.props.children
  }
}
