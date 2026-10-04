import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  base: "./",
  plugins: [react()],
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  define: {
    "process.env.NEXT_PUBLIC_API_ORIGIN": JSON.stringify("https://pulso-eleicoes-2026.johnwdolinski.chatgpt.site"),
  },
  build: { outDir: "docs", emptyOutDir: true },
});
