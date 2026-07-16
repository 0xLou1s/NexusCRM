import type { MessagesFor } from "@/lib/i18n/types"

export const USERS_MESSAGES: MessagesFor<"users"> = {
  "users.notFound": {
    title: "User not found",
    description: "No such user in this organization.",
  },
  "users.cannotManageUser": {
    title: "Not allowed",
    description: "You may only manage users below your own role.",
  },
  "users.cannotAssignRole": {
    title: "Not allowed",
    description: "You may not grant that role.",
  },
  "users.cannotDemoteSelf": {
    title: "Not allowed",
    description: "You cannot change your own role.",
  },
  "users.cannotDeactivateSelf": {
    title: "Not allowed",
    description: "You cannot deactivate yourself.",
  },
  "users.teamNotFound": {
    title: "Team not found",
    description: "No such team in this organization.",
  },
}
