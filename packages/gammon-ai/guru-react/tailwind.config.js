/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                guru: {
                    bg: '#121212',
                    pointDark: '#1e1e1e',
                    pointLight: '#2d2d2d',
                    checkerRed: '#8B0000',
                    checkerBeige: '#D2B48C',
                    gold: '#FFD700',
                }
            },
            animation: {
                'spin-slow': 'spin 3s linear infinite',
            }
        },
    },
    plugins: [],
}
