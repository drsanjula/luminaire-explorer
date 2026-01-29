# Luminaire Media Explorer

Luminaire is a high-performance, modern media explorer for macOS built with Tauri, Rust, React, and Python AI. It is designed to handle large media libraries (40,000+ items) with ease, providing instant search and local AI-powered tagging.

## Features

- **Blazing Fast Indexing**: Rust-powered concurrent file system scanner.
- **Local AI Tagging**: Uses `Qwen-VL` to automatically tag your photos and videos for natural language search.
- **Premium UI/UX**: Custom dark-mode design with glassmorphism, smooth animations, and a virtualized grid.
- **HDR Media Player**: Full-screen playback for high-end formats including HDR10.
- **Smart Search**: Search by tags, filenames, or content.

## Tech Stack

- **Backend**: Rust (Tauri)
- **Frontend**: React, TypeScript, Tailwind CSS, Framer Motion
- **Database**: SQLite (via SQLx)
- **AI Core**: Python (Transformers, PyTorch, Qwen-VL)
- **Processors**: FFmpeg (for thumbnail generation)

## Getting Started

### Prerequisites

- [Rust](https://rustup.rs/)
- [Node.js](https://nodejs.org/)
- [FFmpeg](https://ffmpeg.org/) (installed via `brew install ffmpeg`)
- [Python 3.10+](https://www.python.org/)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/drsanjula/luminaire-explorer.git
   cd luminaire-explorer
   ```

2. **Install Frontend Dependencies**:
   ```bash
   npm install
   ```

3. **Set up AI Environment**:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r ai/requirements.txt # (Wait, I should create this file)
   ```

4. **Run the App**:
   ```bash
   npm run tauri dev
   ```

5. **Start AI Worker**:
   ```bash
   python ai/ai_worker.py
   ```

## Development

The project is structured into three main modules:
- `src-tauri`: Rust backend for file IO and DB.
- `src`: React frontend for the user interface.
- `ai`: Python service for VLM-based image tagging.

---
Built with ❤️ by Antigravity for Sanju.
