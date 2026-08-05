/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}", 
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: '#FF7F50', // 따뜻한 코랄 포인트
        bglight: '#FFF9F5', // 부드러운 배경색
      }
    },
  },
  plugins: [],
}
