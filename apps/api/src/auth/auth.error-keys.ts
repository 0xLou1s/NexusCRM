// Auth's slice of the error catalogue. Composed into ERROR_KEYS in
// common/errors/error-keys.ts, which is what turns every key in the API into the
// literal union the frontend translates from.
export const AUTH_ERROR_KEYS = {
  invalidCredentials: "auth.invalidCredentials",
  emailAlreadyTaken: "auth.emailAlreadyTaken",
  registrationClosed: "auth.registrationClosed",
  invalidRefreshToken: "auth.invalidRefreshToken",
  refreshTokenReused: "auth.refreshTokenReused",
  accountDisabled: "auth.accountDisabled",
} as const
