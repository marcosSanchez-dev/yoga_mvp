# 🧘‍♀️ Virtual Yoga Coach

## 🌟 Project Overview
**A real-time AI-powered yoga instructor** that analyzes your poses through your device's camera and provides personalized feedback like a human teacher.

**Technical Implementation:** This application combines computer vision and artificial intelligence to analyze yoga poses in real time. The system first captures video from the user's webcam and processes each frame with MediaPipe Pose, which detects 33 key body points (like shoulders, elbows, and wrists). When the user holds a pose, the app takes a snapshot and sends it to GPT-4 Turbo with Vision along with pose data. The AI acts like a yoga teacher - it looks at the body position, checks for common mistakes, and gives personalized advice to improve the pose. The feedback appears on screen and can be read aloud by the computer's voice system. The backend uses Node.js to safely connect to OpenAI's API, while the frontend shows the camera view with simple buttons for controls. Everything works directly in the web browser without needing special apps.

## 🚀 Key Features
- Real-time **pose detection** using computer vision
- **AI-powered feedback** with GPT-4 Vision
- Voice-guided instructions
- Interactive feedback history
- Simple, intuitive interface

## 💻 Tech Stack
- **Frontend**: HTML5, CSS3, JavaScript
- **Computer Vision**: MediaPipe Pose
- **AI**: GPT-4 Turbo with Vision
- **Backend**: Node.js, Express
- **APIs**: Web Speech API, OpenAI API

## 🏃‍♂️ Quick Start
1. Clone repo:
```bash
git clone https://github.com/yourusername/virtual-yoga-coach.git

Install dependencies:

bash
npm install
Add your OpenAI API key to .env:

env
OPENAI_API_KEY=your_key_here
Start the server:

bash
npm start
Open index.html in your browser

📂 Project Structure
text
virtual-yoga-coach/
├── public/            # Static files
│   ├── index.html
│   ├── style.css
│   └── script.js
├── server/            # Backend files
│   └── openai-proxy.js
├── package.json
└── README.md
🤝 How to Contribute
Fork the project

Create your feature branch

Commit your changes

Push to the branch

Open a pull request
