🧘 Virtual Yoga Master
🌟 Project Overview
An immersive AI-powered yoga experience that transforms your practice with real-time pose analysis, voice coaching, and ambient lighting control. This application uses computer vision to track your body movements and provides instant feedback like a professional yoga instructor. The integration with lighting systems via OSC/Madmapper creates a fully immersive environment that responds to your poses in real-time.

Technical Implementation: The system captures video from the user's webcam and processes frames with MediaPipe Pose, detecting 33 key body points. When the user holds a pose, the app sends pose data and a snapshot to GPT-4 Turbo with Vision for expert analysis. The AI provides personalized feedback that appears on screen and is delivered through ElevenLabs' professional voice synthesis. For immersive experiences, the system sends OSC commands to MadMapper to control lighting environments. The Node.js backend securely connects to APIs while the intuitive frontend works directly in browsers.

🚀 Key Features
Real-time Pose Detection with MediaPipe Pose

AI-Powered Feedback from GPT-4 Vision

Professional Voice Guidance via ElevenLabs

Immersive Lighting Control via OSC/Madmapper

Interactive Feedback History

Performance Scoring System

Multi-language Support (English/Spanish)

Particle Visualization Effects

💻 Tech Stack
Frontend: HTML5, CSS3, JavaScript

Computer Vision: MediaPipe Pose

AI: GPT-4 Turbo with Vision, ElevenLabs Voice

Immersive Tech: OSC Protocol, MadMapper

Backend: Node.js, Express

APIs: ElevenLabs API, OpenAI API

🌈 Immersive Experience Packages
Package	Target Audience	Features	Price
Home Studio	Home Users	Basic lighting control, Voice feedback	$99
Pro Instructor	Yoga Studios	Advanced lighting profiles, Class management	$499
Premium Wellness	Spas/Retreats	Custom environments, Multi-user support	$1,499
Event Edition	Event Planners	Temporary licenses, Quick setup	$299/day
🏃‍♂️ Quick Start
Prerequisites
ElevenLabs API Key (free tier available)

OpenAI API Key

MadMapper (for lighting control)

Clone repo:

bash
git clone https://github.com/marcosSanchez-dev/yoga_mvp.git
Install dependencies:

bash
npm install
Add API keys to .env:

env
OPENAI_API_KEY=your_openai_key_here
ELEVENLABS_API_KEY=your_elevenlabs_key_here
Start the server:

bash
npm start
Open index.html in your browser

Connecting to MadMapper
Ensure MadMapper is running on your network

Update IP in script.js:

javascript
// Update with MadMapper machine's IP
const MADMAPPER_IP = "192.168.1.100"; 
The system will automatically send OSC commands when poses are detected

📂 Project Structure
text
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
🌟 Business Opportunities
This platform enables multiple revenue streams:

SaaS Licensing: Monthly subscriptions for studios

Hardware Bundles: Partner with LED manufacturers

Event Packages: Premium pricing for special events

Content Marketplace: Sell specialized yoga/lighting profiles

Corporate Wellness: B2B solutions for workplaces
