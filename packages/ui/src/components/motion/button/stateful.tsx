"use client"
// beui.dev/components/motion/button

import { EASE_OUT, SPRING_SWAP } from "@workspace/ui/lib/ease"
import { cn } from "@workspace/ui/lib/utils"
import { Check, Loader2, X } from "lucide-react"
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Variants,
} from "motion/react"
import {
  forwardRef,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"
import {
  Button,
  DEFAULT_BUTTON_SIZE,
  ICON_SIZE_CLASS,
  ICON_SLOT_WIDTH,
  type ButtonProps,
} from "./base"

export type ButtonState = "idle" | "loading" | "success" | "error"

export interface StatefulButtonProps extends Omit<ButtonProps, "children"> {
  state?: ButtonState
  children: ReactNode
  loadingText?: ReactNode
  successText?: ReactNode
  errorText?: ReactNode
  icon?: ReactNode
}

const CASCADE_STAGGER = 0.025
const ROLL_BLUR = "blur(6px)"

const CASCADE_LETTER_VARIANTS: Variants = {
  initial: { opacity: 0, y: "105%", filter: ROLL_BLUR },
  animate: (delay: number = 0) => ({
    opacity: 1,
    y: "0%",
    filter: "blur(0px)",
    transition: { ...SPRING_SWAP, delay },
  }),
  exit: (delay: number = 0) => ({
    opacity: 0,
    y: "-105%",
    filter: ROLL_BLUR,
    transition: { duration: 0.16, ease: EASE_OUT, delay: delay * 0.5 },
  }),
}

const ICON_VARIANTS: Variants = {
  // Width collapses too, so the icon adds/removes its own space smoothly
  // instead of popping the row width in a single frame. The expanded width is
  // supplied per-instance via `custom` so it can track the button size.
  initial: { opacity: 0, width: 0, scale: 0.7, filter: ROLL_BLUR },
  animate: (width: string = ICON_SLOT_WIDTH[DEFAULT_BUTTON_SIZE]) => ({
    opacity: 1,
    width,
    scale: 1,
    filter: "blur(0px)",
    transition: SPRING_SWAP,
  }),
  exit: {
    opacity: 0,
    width: 0,
    scale: 0.7,
    filter: ROLL_BLUR,
    transition: { duration: 0.16, ease: EASE_OUT },
  },
}

function IconSlot({
  keyId,
  width,
  children,
}: {
  keyId: string
  width: string
  children: ReactNode
}) {
  const reduce = useReducedMotion()
  return (
    <motion.span
      key={keyId}
      variants={ICON_VARIANTS}
      custom={width}
      initial={reduce ? { opacity: 0 } : "initial"}
      animate={reduce ? { opacity: 1 } : "animate"}
      exit={reduce ? { opacity: 0 } : "exit"}
      transition={reduce ? { duration: 0.15 } : undefined}
      className="inline-grid shrink-0 place-items-center overflow-hidden"
    >
      {children}
    </motion.span>
  )
}

function TextSlot({ value, children }: { value: string; children: ReactNode }) {
  const reduce = useReducedMotion()
  const measureRef = useRef<HTMLSpanElement>(null)
  const [width, setWidth] = useState<number>()
  const label = typeof children === "string" ? children : null
  const cascade = label !== null && !reduce

  // Width is set instantly from the measurer; the parent's single `layout`
  // animation smooths the resize (text + icons together) so nothing competes.
  useLayoutEffect(() => {
    const nextWidth = measureRef.current?.offsetWidth
    if (!nextWidth) return
    setWidth((current) => (current === nextWidth ? current : nextWidth))
  })

  return (
    <motion.span
      initial={false}
      animate={{ width }}
      transition={reduce ? { duration: 0 } : SPRING_SWAP}
      className="relative inline-block overflow-hidden align-bottom whitespace-nowrap"
    >
      <span
        ref={measureRef}
        aria-hidden
        className="invisible inline-block whitespace-nowrap"
      >
        {cascade
          ? // Measure with the same per-letter split as the overlay: summing
            // individual inline-block advances is wider than the kerned string,
            // so measuring the plain string would clip the last glyph.
            label.split("").map((char, index) => (
              <span
                // biome-ignore lint/suspicious/noArrayIndexKey: position is the slot identity.
                key={index}
                className="inline-block whitespace-pre"
              >
                {char}
              </span>
            ))
          : children}
      </span>

      {cascade ? (
        <>
          <span className="sr-only">{label}</span>
          <AnimatePresence initial={false}>
            <motion.span
              key={`cascade-${value}`}
              aria-hidden
              initial="initial"
              animate="animate"
              exit="exit"
              className="absolute top-0 left-0 inline-block whitespace-pre"
            >
              {label.split("").map((char, index) => (
                <motion.span
                  // biome-ignore lint/suspicious/noArrayIndexKey: position is the slot identity.
                  key={index}
                  custom={index * CASCADE_STAGGER}
                  variants={CASCADE_LETTER_VARIANTS}
                  className="inline-block whitespace-pre will-change-[opacity,filter,transform]"
                >
                  {char}
                </motion.span>
              ))}
            </motion.span>
          </AnimatePresence>
        </>
      ) : (
        <AnimatePresence initial={false}>
          <motion.span
            key={`text-${value}`}
            initial={
              reduce ? { opacity: 0 } : { opacity: 0, y: 14, filter: ROLL_BLUR }
            }
            animate={
              reduce
                ? { opacity: 1 }
                : { opacity: 1, y: 0, filter: "blur(0px)" }
            }
            exit={
              reduce
                ? { opacity: 0 }
                : { opacity: 0, y: -14, filter: ROLL_BLUR }
            }
            transition={reduce ? { duration: 0.15 } : SPRING_SWAP}
            className="absolute top-0 left-0 inline-block will-change-[opacity,filter,transform]"
          >
            {children}
          </motion.span>
        </AnimatePresence>
      )}
    </motion.span>
  )
}

export const StatefulButton = forwardRef<
  HTMLButtonElement,
  StatefulButtonProps
>(function StatefulButton(
  {
    state = "idle",
    children,
    loadingText = "Loading",
    successText = "Done",
    errorText = "Try again",
    icon,
    disabled,
    size = DEFAULT_BUTTON_SIZE,
    ...rest
  },
  ref
) {
  const isBusy = state === "loading"
  const iconClass = ICON_SIZE_CLASS[size]
  const slotWidth = ICON_SLOT_WIDTH[size]
  const stateText =
    state === "loading"
      ? loadingText
      : state === "success"
        ? successText
        : state === "error"
          ? errorText
          : children
  const textKey =
    typeof stateText === "string" ? `${state}-${stateText}` : state

  return (
    <Button
      ref={ref}
      size={size}
      disabled={disabled || isBusy}
      aria-busy={isBusy}
      whileHover={undefined}
      {...rest}
    >
      <span
        aria-live="polite"
        className="relative inline-flex items-center justify-center overflow-hidden"
      >
        <TextSlot value={textKey}>{stateText}</TextSlot>

        {/* All state icons live on the right of the text for consistency. */}
        <AnimatePresence initial={false}>
          {state === "loading" ? (
            <IconSlot keyId="loading-icon" width={slotWidth}>
              <Loader2 className={cn(iconClass, "animate-spin")} />
            </IconSlot>
          ) : null}
          {state === "success" ? (
            <IconSlot keyId="success-icon" width={slotWidth}>
              <Check className={iconClass} />
            </IconSlot>
          ) : null}
          {state === "error" ? (
            <IconSlot keyId="error-icon" width={slotWidth}>
              <X className={iconClass} />
            </IconSlot>
          ) : null}
          {state === "idle" && icon ? (
            <IconSlot keyId="idle-icon" width={slotWidth}>
              {icon}
            </IconSlot>
          ) : null}
        </AnimatePresence>
      </span>
    </Button>
  )
})
