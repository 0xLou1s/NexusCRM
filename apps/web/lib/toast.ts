import type { ErrorMessage } from "@/lib/i18n/types"
import type { ToastInput } from "@workspace/ui/components/motion/toast"

type ShowToast = (input: ToastInput) => string

// ToastProvider owns the stack in a React hook and binds it here on mount. The
// callers that need it are not in a tree: handleApiError runs in a catch block,
// the fetch middleware in no component at all.
let showToast: ShowToast | undefined

export function bindToast(show: ShowToast | undefined): void {
  showToast = show
}

export function toastError({ title, description }: ErrorMessage): void {
  showToast?.({ status: "error", title, description })
}
