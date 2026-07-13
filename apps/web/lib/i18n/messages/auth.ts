import type { MessagesFor } from "@/lib/i18n/types"

export const AUTH_MESSAGES: MessagesFor<"auth"> = {
  "auth.invalidCredentials": {
    title: "Sign-in failed",
    description: "That email and password do not match.",
  },
  "auth.emailAlreadyTaken": {
    title: "Email already in use",
    description: "That email already belongs to a user.",
  },
  "auth.registrationClosed": {
    title: "Registration closed",
    description: "This instance already has an organization.",
  },
  "auth.invalidRefreshToken": {
    title: "Session ended",
    description: "Please sign in again.",
  },
  "auth.refreshTokenReused": {
    title: "Signed out everywhere",
    description:
      "A token from this session was reused, so every session was revoked.",
  },
  "auth.accountDisabled": {
    title: "Account deactivated",
    description: "This account has been deactivated.",
  },
}
