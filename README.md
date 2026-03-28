# HackWithAI — AI Health Insight Companion

A web app that lets you upload lab reports and get a clear breakdown of what the results mean — in multiple languages, with voice support — powered by the GROQ API.

---

## What it does

Most people get their lab reports and have no idea what half the values mean. This app takes that report, runs it through an AI reasoning pipeline, and gives you a clear summary of what's normal, what's not, and what you might want to ask your doctor about.

The results can also be read out loud in multiple languages — so it's accessible to people who are more comfortable listening than reading, or who prefer a language other than English.

---

## Tech Stack

- Frontend: React + TypeScript (Vite)
- Backend: Python + FastAPI
- AI: GROQ API
- RAG pipeline with a medical knowledge base for more grounded responses
- Text-to-speech with multilingual support

---

## Setup

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate       # Windows
source .venv/bin/activate    # Mac/Linux

pip install -r requirements.txt
```

Create a `.env` file inside `backend/`:

```
GROQ_API_KEY=your_key_here
APP_ENV=development
MAX_FILE_SIZE_MB=10
PORT=3000
```

Then run:

```bash
python app/main.py
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## Project Structure

```
hack-with-ai/
├── backend/
│   ├── app/
│   ├── lab_report_analyzer.py
│   ├── reasoning_layer.py
│   ├── rag_pipeline.py
│   ├── medical_knowledge.txt
│   └── requirements.txt
├── frontend/
│   ├── src/
│   ├── index.html
│   └── package.json
├── .gitignore
└── README.md
```

---

## Disclaimer

This is not a substitute for professional medical advice. Always talk to your doctor about your results.

---

## License

MIT
