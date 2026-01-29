/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "#0D0D11",
                surface: "#1A1B23",
                accent: "#00B4D8",
                glass: "rgba(255, 255, 255, 0.05)",
            },
            backdropBlur: {
                xs: "2px",
            }
        },
    },
    plugins: [],
}
