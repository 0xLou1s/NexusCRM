import type { z, ZodType } from "zod"

// One payload argument per event: multi-argument events cannot be validated or
// versioned as a unit, so they are not expressible here.
export type EventSchemas = Record<string, ZodType>

export type EventHandlers<TEvents extends EventSchemas> = {
  [TName in keyof TEvents]: (payload: z.infer<TEvents[TName]>) => void
}

export const serverToClientEventSchemas = {} as const satisfies EventSchemas

// The server joins a socket into rooms from the caller's ACL, so clients have
// nothing to subscribe to and this catalogue stays close to empty.
export const clientToServerEventSchemas = {} as const satisfies EventSchemas

export type ServerToClientEvents = EventHandlers<
  typeof serverToClientEventSchemas
>
export type ClientToServerEvents = EventHandlers<
  typeof clientToServerEventSchemas
>

export type ServerToClientEventName = keyof typeof serverToClientEventSchemas
export type ClientToServerEventName = keyof typeof clientToServerEventSchemas
