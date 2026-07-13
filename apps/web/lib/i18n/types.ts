import type { ErrorKey } from "@/lib/api/errors"

export interface ErrorMessage {
  title: string
  description: string
}

// The union comes from the generated schema, so a key added on the backend does
// not compile here until somebody translates it.
export type MessagesFor<Namespace extends string> = Record<
  Extract<ErrorKey, `${Namespace}.${string}`>,
  ErrorMessage
>
