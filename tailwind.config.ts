import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#16233F", // azul-marinho principal
          light: "#2C4870",
          dark: "#0E1729",
        },
        surface: {
          DEFAULT: "#F5F6F8", // fundo geral
          panel: "#FFFFFF", // painéis
          sunken: "#EEF0F3", // linhas alternadas, campos
        },
        border: {
          DEFAULT: "#D8DCE2",
          strong: "#B7BEC9",
        },
        accent: {
          DEFAULT: "#C97A2B", // âmbar - ações e destaques
          light: "#E0954C",
          dark: "#A65F1A",
        },
        text: {
          DEFAULT: "#1B2432",
          muted: "#5B6472",
          faint: "#8A93A2",
        },
        status: {
          ok: "#2E7D4F",
          warn: "#B8860B",
          danger: "#B23A2E",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto",
          "Helvetica Neue", "Arial", "system-ui", "sans-serif",
        ],
        mono: [
          "ui-monospace", "SFMono-Regular", "Consolas", "Liberation Mono",
          "Menlo", "monospace",
        ],
      },
      borderRadius: {
        DEFAULT: "3px",
        sm: "2px",
        md: "4px",
      },
      boxShadow: {
        panel: "0 1px 2px rgba(16, 23, 41, 0.06)",
      },
    },
  },
  plugins: [],
};
export default config;
