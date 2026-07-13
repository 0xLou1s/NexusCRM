"use client"

import { bindToast } from "@/lib/toast"
import {
  AnimatedToastStack,
  useAnimatedToastStack,
} from "@workspace/ui/components/motion/toast"
import { useEffect, type ReactNode } from "react"

export function ToastProvider({ children }: { children: ReactNode }) {
  const { toasts, showToast, dismissToast } = useAnimatedToastStack({
    limit: 3,
  })

  useEffect(() => {
    bindToast(showToast)

    return () => bindToast(undefined)
  }, [showToast])

  return (
    <>
      {children}
      <AnimatedToastStack
        toasts={toasts}
        onDismiss={dismissToast}
        position="top-right"
        placement="fixed"
        maxVisible={3}
      />
    </>
  )
}
