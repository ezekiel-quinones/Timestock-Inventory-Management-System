import path from "node:path"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

export default defineConfig({
  base: "/login-assets/settings/",
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  build: {
    outDir: "dist/settings",
    emptyOutDir: true,
    minify: "esbuild",
    lib: {
      entry: path.resolve(import.meta.dirname, "src/features/settings/index.jsx"),
      formats: ["es"],
      fileName: "settings",
      cssFileName: "settings",
    },
  },
})
