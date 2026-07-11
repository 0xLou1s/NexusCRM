import base from "@workspace/prettier-config/base"

/** @type {import("prettier").Config} */
export default {
  ...base,
  tailwindStylesheet: "./src/styles/globals.css",
}
