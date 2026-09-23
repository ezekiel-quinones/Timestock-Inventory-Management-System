import baseConfig from "./tailwind.config.js"

export default {
  ...baseConfig,
  content: [
    "./src/features/reports/**/*.{js,jsx}",
    "./src/features/products/ProductsNotificationCenter.jsx",
    "./src/components/ui/{alert,badge,button,card,input,label,select,table}.jsx",
  ],
  important: false,
  corePlugins: {
    preflight: true,
  },
}
