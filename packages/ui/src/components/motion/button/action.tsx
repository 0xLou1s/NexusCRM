"use client"

import { forwardRef, useCallback, useEffect, useRef, useState } from "react"
import {
  StatefulButton,
  type ButtonState,
  type StatefulButtonProps,
} from "./stateful"

export interface ActionButtonProps extends Omit<
  StatefulButtonProps,
  "state" | "onClick"
> {
  /** Runs on click. Resolving marks success, throwing/rejecting marks error. */
  onAction: () => Promise<unknown> | void
  /** Ms to hold the success/error state before reverting to idle. 0 disables auto-reset. */
  resetDelay?: number
}

export const ActionButton = forwardRef<HTMLButtonElement, ActionButtonProps>(
  function ActionButton({ onAction, resetDelay = 1800, ...rest }, ref) {
    const [state, setState] = useState<ButtonState>("idle")
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
      undefined
    )

    useEffect(() => () => clearTimeout(timeoutRef.current), [])

    const handleClick = useCallback(() => {
      if (state === "loading") return
      clearTimeout(timeoutRef.current)
      setState("loading")
      Promise.resolve()
        .then(() => onAction())
        .then(() => setState("success"))
        .catch(() => setState("error"))
        .finally(() => {
          if (resetDelay > 0) {
            timeoutRef.current = setTimeout(() => setState("idle"), resetDelay)
          }
        })
    }, [onAction, resetDelay, state])

    return (
      <StatefulButton ref={ref} state={state} onClick={handleClick} {...rest} />
    )
  }
)
