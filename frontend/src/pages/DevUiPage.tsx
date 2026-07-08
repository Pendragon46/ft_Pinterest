// TEMPORARY DEV PAGE — visual showcase of every UI component state.
// Remove this file (plus its route and DevNav link) before production.
// Labels are hardcoded on purpose: throwaway dev tooling, not product UI.
import { useState } from 'react'
import type { ReactNode } from 'react'

import { Button } from '@/components/ui/Button'
import { Divider } from '@/components/ui/Divider'
import { GoogleIcon } from '@/components/ui/GoogleIcon'
import { Input } from '@/components/ui/Input'
import { Logo } from '@/components/ui/Logo'
import { Spinner } from '@/components/ui/Spinner'
import { TextLink } from '@/components/ui/TextLink'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-2xl">{title}</h2>
      {children}
    </section>
  )
}

export function DevUiPage() {
  const [loading, setLoading] = useState(false)

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-3xl flex-col gap-10 p-6 pt-16">
      <h1 className="text-4xl">UI kit — dev showcase</h1>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Primary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button disabled>Disabled</Button>
          <Button loading>Loading</Button>
          <Button
            loading={loading}
            onClick={() => {
              setLoading(true)
              window.setTimeout(() => {
                setLoading(false)
              }, 2000)
            }}
          >
            Click me (2s)
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline">
            <GoogleIcon />
            With icon
          </Button>
        </div>
        <Button fullWidth>Full width</Button>
      </Section>

      <Section title="Inputs">
        <Input label="Empty" placeholder="Placeholder text" />
        <Input label="Filled" defaultValue="Some value" />
        <Input
          label="With helper"
          placeholder="Type here"
          helperText="Helper text under the field."
        />
        <Input
          label="With error"
          defaultValue="oops"
          error="This field has an error."
        />
        <Input label="Disabled" defaultValue="Untouchable" disabled />
        <Input label="Read only" defaultValue="Read-only value" readOnly />
      </Section>

      <Section title="Divider">
        <Divider />
        <Divider>or</Divider>
      </Section>

      <Section title="TextLink">
        <p>
          A paragraph with a <TextLink to="/">text link</TextLink> inside.
        </p>
      </Section>

      <Section title="Spinner">
        <div className="flex items-center gap-4">
          <Spinner />
          <Spinner size="md" />
          <span className="text-neutral-500">sm / md — currentColor</span>
        </div>
      </Section>

      <Section title="Logo">
        <div className="flex items-center gap-6 text-3xl">
          <Logo />
          <Logo withWordmark />
        </div>
        <div className="flex items-center rounded-xl bg-neutral-950 p-6 text-3xl text-white">
          <Logo withWordmark />
        </div>
      </Section>
    </main>
  )
}
