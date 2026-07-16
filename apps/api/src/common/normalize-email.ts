// Login looks a user up by this exact form, so every path that writes an email —
// registration, staff creation — must normalize it the same way or the address
// stored is not the address that can sign in.
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}
