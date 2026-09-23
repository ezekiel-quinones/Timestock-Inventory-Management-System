import path from "node:path"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

export default defineConfig({
  base: "/login-assets/sidebar/",
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  plugins: [react()],
  build: {
    outDir: "dist/sidebar",
    emptyOutDir: false,
    minify: "esbuild",
    lib: {
      entry: path.resolve(import.meta.dirname, "src/features/sidebar/index.jsx"),
      formats: ["es"],
      fileName: "sidebar",
      cssFileName: "sidebar",
    },
  },
})
