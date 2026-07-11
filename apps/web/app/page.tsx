"use client"

import { Button } from "@workspace/ui/components/motion/button/base"
import {
  StatefulButton,
  type ButtonState,
} from "@workspace/ui/components/motion/button/stateful"
import { ArrowRight } from "lucide-react"
import { useState } from "react"

export default function Page() {
  const [state, setState] = useState<ButtonState>("idle")

  const run = () => {
    setState("loading")
    setTimeout(() => {
      setState("success")
      setTimeout(() => setState("idle"), 1800)
    }, 1400)
  }

  return (
    <div className="flex min-h-svh p-6">
      <div className="flex max-w-md min-w-0 flex-col gap-4 text-sm leading-loose">
        <div>
          <h1 className="font-medium">Project ready!</h1>
          <p>You may now add components and start building.</p>
          <p>We&apos;ve already added the button component for you.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="primary" ripple>
            Ripple
          </Button>
        </div>

        <StatefulButton
          state={state}
          variant="primary"
          size="sm"
          onClick={run}
          loadingText="Saving"
          successText="Saved"
          icon={<ArrowRight className="h-4 w-4" />}
        >
          Save changes
        </StatefulButton>

        <div className="font-mono text-xs text-muted-foreground">
          (Press <kbd>d</kbd> to toggle dark mode)
        </div>
      </div>
    </div>
  )
}
