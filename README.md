# 🧘 Virtual Yoga Master

## 🌟 Project Overview

**Virtual Yoga Master** is an immersive AI-powered yoga experience that transforms your practice with real-time pose analysis, voice coaching, and ambient lighting control.  
The app uses computer vision to track your body movements and provides instant feedback like a professional yoga instructor.  
It also integrates with lighting systems (via OSC/MadMapper) to create a fully immersive environment that responds to your poses in real-time.

### 🔧 Technical Implementation

- Captures video from the user's webcam.
- Processes frames using **MediaPipe Pose**, detecting 33 body landmarks.
- Sends pose data and snapshots to **GPT-4 Turbo with Vision** for expert analysis.
- Provides real-time feedback on screen and via **ElevenLabs** voice synthesis.
- Sends **OSC** commands to **MadMapper** to trigger responsive lighting.
- Uses a **Node.js + Express** backend to securely connect with APIs.
- Frontend runs directly in the browser for ease of use.

---

## 🚀 Key Features

- ✅ Real-time Pose Detection (MediaPipe Pose)  
- 🧠 AI-Powered Feedback (GPT-4 Turbo Vision)  
- 🎙️ Professional Voice Guidance (ElevenLabs)  
- 💡 Immersive Lighting Control (OSC / MadMapper)  
- 📈 Interactive Feedback History  
- 🏅 Performance Scoring System  
- 🌐 Multi-language Support (English / Spanish)  
- ✨ Particle Visualization Effects  

---

## 💻 Tech Stack

| Layer          | Technologies                           |
| -------------- | --------------------------------------- |
| Frontend       | HTML5, CSS3, JavaScript                |
| Computer Vision| MediaPipe Pose                         |
| AI             | GPT-4 Turbo with Vision, ElevenLabs    |
| Immersive Tech | OSC Protocol, MadMapper                |
| Backend        | Node.js, Express                       |
| APIs           | OpenAI API, ElevenLabs API             |

---

## 🌈 Immersive Experience Packages

| Package          | Target Audience   | Features                                         | Price       |
|------------------|-------------------|--------------------------------------------------|-------------|
| Home Studio      | Home Users        | Basic lighting control, Voice feedback           | $99         |
| Pro Instructor   | Yoga Studios      | Advanced lighting profiles, Class management     | $499        |
| Premium Wellness | Spas / Retreats   | Custom environments, Multi-user support          | $1,499      |
| Event Edition    | Event Planners    | Temporary licenses, Quick setup                  | $299/day    |

---

## 🏃‍♂️ Quick Start

### ✅ Prerequisites

- ElevenLabs API Key (Free tier available)  
- OpenAI API Key  
- MadMapper (for lighting control)

### ⚙️ Setup Instructions

1. **Clone the repo:**

   ```bash
   git clone https://github.com/marcosSanchez-dev/yoga_mvp.git
Install dependencies:

bash
Copiar
Editar
npm install
Add your API keys to .env:

env
Copiar
Editar
OPENAI_API_KEY=your_openai_key_here
ELEVENLABS_API_KEY=your_elevenlabs_key_here
Start the server:

bash
Copiar
Editar
npm start
Open index.html in your browser

🔌 Connecting to MadMapper
Ensure MadMapper is running on the same network.

In script.js, update the IP address:

javascript
Copiar
Editar
// Update with your MadMapper machine's IP
const MADMAPPER_IP = "192.168.1.100";
The system will send OSC commands automatically when poses are detected.

📂 Project Structure
csharp
Copiar
Editar
virtual-yoga-master/
├── public/               # Frontend files
│   ├── assets/           # Reference images
│   ├── index.html        # Main interface
│   ├── style.css         # Styling
│   └── script.js         # Main application logic
├── server/               # Backend
│   └── openai-proxy.js   # API proxy
├── .env.example          # Environment template
├── package.json          # Dependencies
└── README.md             # Project documentation
💼 Business Opportunities
This platform opens the door to multiple revenue streams:

SaaS Licensing: Monthly subscriptions for studios

Hardware Bundles: Partner with LED manufacturers

Event Packages: Premium pricing for events and retreats

Content Marketplace: Sell yoga routines and lighting presets

Corporate Wellness: Custom B2B solutions for remote teams
