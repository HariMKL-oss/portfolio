# Interview Copilot

Your AI-powered real-time interview assistant. Listens to recruiter questions via speakerphone and generates tailored answers based on your Resume and Job Description.

## How to Run

### Prerequisites
- Node.js 18+ installed
- Android phone with Expo Go app installed (from Play Store)
- OR Android emulator set up via Android Studio

### Setup

```bash
cd ai-call-assistant
npm install
npx expo start
```

Then scan the QR code with Expo Go on your Android phone.

### API Keys Required

Go to **Settings** in the app and configure:
- **OpenAI API Key** — for Whisper speech-to-text AND GPT-4o answer generation
- OR **Deepgram API Key** (faster STT) + **Google Gemini API Key** (alternative LLM)

## How to Use

1. Open the app → Paste your **Resume** and **Job Description**
2. Select your target **Role** (Software Engineer, Frontend Dev, etc.)
3. Tap **Start Interview Session**
4. Put your phone on **Speakerphone** during the interview call
5. When the recruiter asks a question → **Tap the mic button**
6. When they finish asking → **Tap again**
7. Read the AI-generated answer on screen and respond naturally!
