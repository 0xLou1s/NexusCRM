import base from "@workspace/prettier-config/base"

/** @type {import("prettier").Config} */
export default {
  ...base,
  tailwindStylesheet: "../../packages/ui/src/styles/globals.css",
}
