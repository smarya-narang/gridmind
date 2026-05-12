<div align="center">

# 🧠 GridMind
### Watch AI Think in Real-Time

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://gridmind-nydfqycfa-smaryas-projects.vercel.app/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![D3.js](https://img.shields.io/badge/D3.js-7.9-F9A03C?style=for-the-badge&logo=d3.js&logoColor=white)](https://d3js.org/)
[![Groq](https://img.shields.io/badge/Powered%20by-Groq-f55036?style=for-the-badge)](https://groq.com/)

[**Try the Live Demo!**](https://gridmind-nydfqycfa-smaryas-projects.vercel.app/)

</div>

---

## 🌟 What is GridMind?

GridMind is a cutting-edge visual reasoning interface that breaks down the "black box" of Large Language Models. Instead of just giving you a wall of text, GridMind intercepts the LLM's streaming thought process and renders it as a **live, dynamic neural graph** right before your eyes. 

Watch as the AI generates hypotheses, branches out into different logical pathways, encounters contradictions, and ultimately converges on a final conclusion.

## ✨ Crazy Features

- **🔴 Real-Time Node Rendering:** Watch thoughts spawn on the grid the exact millisecond the AI thinks them.
- **🌌 Physics-Based D3.js Graph:** A fully interactive, force-directed graph where ideas physically repel and attract each other.
- **⚡ Blazing Fast Llama 3 on Groq:** Powered by `llama-3.3-70b-versatile` running at hundreds of tokens per second.
- **🧠 Complexity Meter:** Live tracking of cognitive depth, reasoning steps, and logical branching.
- **📸 High-Res PNG Exports:** Found an incredibly deep thought tree? Export the entire massive SVG graph to a high-res PNG instantly.
- **🔗 Universal Deep Linking:** Share exact thoughts and graph layouts with a single Base64 encoded URL. No databases required.

---

## 🛠️ Tech Stack

- **Frontend:** React 18, Vite
- **Data Visualization:** D3.js (Force-directed graphs, custom SVG manipulation)
- **AI Backend:** Groq Cloud API (Llama 3 70B)
- **Styling:** Vanilla CSS + CSS Variables (Glassmorphism & Neon Design System)

---

## 🚀 Run It Locally

Want to mess around with the physics engine or try a different LLM? It's easy:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/smarya-narang/gridmind.git
   cd gridmind
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Add your Groq API Key:**
   Create a `.env` file in the root directory and add your key:
   ```env
   VITE_GROQ_API_KEY=gsk_your_groq_api_key_here
   ```

4. **Start the Dev Server:**
   ```bash
   npm run dev
   ```

---

<div align="center">
  <p>Built with ❤️ by Smarya Narang</p>
</div>
