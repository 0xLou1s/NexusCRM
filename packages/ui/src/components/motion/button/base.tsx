"use client"

import { EASE_OUT, SPRING_PRESS } from "@workspace/ui/lib/ease"
import { useHoverCapable } from "@workspace/ui/lib/hooks/use-hover-capable"
import { cn } from "@workspace/ui/lib/utils"
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type HTMLMotionProps,
} from "motion/react"
import {
  forwardRef,
  useCallback,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
} from "react"

export type ButtonVariant = "primary" | "secondary" | "ghost" | "outline"
export type ButtonSize = "sm" | "md" | "lg" | "icon"

export interface ButtonProps extends Omit<
  HTMLMotionProps<"button">,
  "children"
> {
  variant?: ButtonVariant
  size?: ButtonSize
  pressScale?: number
  /** Spawn a Material-style ripple from the press point. Off by default. */
  ripple?: boolean
  children?: ReactNode
}

type Ripple = { id: number; x: number; y: number; size: number }

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primary-foreground hover:bg-primary/90",
  secondary: "border border-border bg-card text-foreground hover:border-border",
  ghost: "text-muted-foreground hover:text-foreground hover:bg-primary/5",
  outline:
    "border border-border bg-transparent text-foreground hover:bg-primary/5",
}

const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs gap-1.5 rounded-full",
  md: "h-10 px-5 text-sm gap-2 rounded-full",
  lg: "h-12 px-6 text-base gap-2 rounded-full",
  icon: "h-8 w-8 rounded-lg",
}

/** Base Button's default size. Single source of truth for consumers that
 *  inherit sizing (e.g. StatefulButton). */
export const DEFAULT_BUTTON_SIZE: ButtonSize = "sm"

/** Icon dimensions per size, kept in sync with SIZE_CLASS. */
export const ICON_SIZE_CLASS: Record<ButtonSize, string> = {
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
  lg: "h-5 w-5",
  icon: "h-4 w-4",
}

/** Animated width of an icon slot per size (matches the gap/scale of SIZE_CLASS). */
export const ICON_SLOT_WIDTH: Record<ButtonSize, string> = {
  sm: "1.25rem",
  md: "1.5rem",
  lg: "1.75rem",
  icon: "1.5rem",
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "primary",
      size = DEFAULT_BUTTON_SIZE,
      pressScale = 0.93,
      ripple = false,
      className,
      children,
      onPointerDown,
      ...rest
    },
    ref
  ) {
    const reduce = useReducedMotion()
    const canHover = useHoverCapable()
    const [ripples, setRipples] = useState<Ripple[]>([])
    const nextId = useRef(0)

    const handlePointerDown = useCallback(
      (event: PointerEvent<HTMLButtonElement>) => {
        if (ripple && !reduce) {
          const rect = event.currentTarget.getBoundingClientRect()
          const size = Math.max(rect.width, rect.height) * 2
          setRipples((prev) => [
            ...prev,
            {
              id: nextId.current++,
              x: event.clientX - rect.left,
              y: event.clientY - rect.top,
              size,
            },
          ])
        }
        onPointerDown?.(event)
      },
      [ripple, reduce, onPointerDown]
    )

    return (
      <motion.button
        ref={ref}
        type="button"
        whileTap={reduce ? undefined : { scale: pressScale }}
        whileHover={reduce || !canHover ? undefined : { scale: 1.02 }}
        transition={SPRING_PRESS}
        onPointerDown={handlePointerDown}
        className={cn(
          "inline-flex items-center justify-center font-medium select-none",
          "transition-colors",
          "disabled:pointer-events-none disabled:opacity-50",
          ripple && "relative overflow-hidden",
          VARIANT_CLASS[variant],
          SIZE_CLASS[size],
          className
        )}
        {...rest}
      >
        {ripple && !reduce ? (
          <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
            <AnimatePresence>
              {ripples.map((r) => (
                <motion.span
                  key={r.id}
                  className="absolute rounded-full bg-current"
                  style={{
                    left: r.x,
                    top: r.y,
                    width: r.size,
                    height: r.size,
                    x: "-50%",
                    y: "-50%",
                  }}
                  initial={{ scale: 0, opacity: 0.3 }}
                  animate={{ scale: 1, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.6, ease: EASE_OUT }}
                  onAnimationComplete={() =>
                    setRipples((prev) => prev.filter((x) => x.id !== r.id))
                  }
                />
              ))}
            </AnimatePresence>
          </span>
        ) : null}
        {children}
      </motion.button>
    )
  }
)
