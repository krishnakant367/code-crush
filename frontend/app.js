const EMOJI_DATA = [
    { id: 'food', icon: 'fa-burger', text: 'I want food', color: '#f39c12' },
    { id: 'water', icon: 'fa-glass-water', text: 'I need water', color: '#3498db' },
    { id: 'washroom', icon: 'fa-restroom', text: 'I need to use the washroom', color: '#9b59b6' },
    { id: 'pain', icon: 'fa-face-frown', text: 'I am in pain', color: '#e74c3c' },
    { id: 'sleep', icon: 'fa-bed', text: 'I want to sleep', color: '#34495e' },
    { id: 'yes', icon: 'fa-thumbs-up', text: 'Yes', color: '#2ecc71' },
    { id: 'no', icon: 'fa-thumbs-down', text: 'No', color: '#e74c3c' },
    { id: 'thanks', icon: 'fa-hands-praying', text: 'Thank you', color: '#f1c40f' },
    { id: 'doctor', icon: 'fa-user-doctor', text: 'I need a doctor', color: '#1abc9c' },
    { id: 'family', icon: 'fa-people-group', text: 'Call my family', color: '#e67e22' }
];

// Initialize Grid
const emojiGrid = document.getElementById('emoji-grid');
const synth = window.speechSynthesis;

function renderGrid() {
    EMOJI_DATA.forEach(item => {
        const btn = document.createElement('button');
        btn.className = 'grid-item';
        btn.style.setProperty('--clr', item.color);
        btn.innerHTML = `
            <i class="fa-solid ${item.icon}"></i>
            <span>${item.text}</span>
        `;
        btn.onclick = () => speak(item.text);
        emojiGrid.appendChild(btn);
    });
}

function speak(text) {
    if (synth.speaking) {
        synth.cancel();
    }
    const utterThis = new SpeechSynthesisUtterance(text);
    // Find a good English voice if available
    const voices = synth.getVoices();
    const goodVoice = voices.find(v => v.lang.includes('en-') && v.name.includes('Google')) || voices[0];
    if (goodVoice) utterThis.voice = goodVoice;
    
    synth.speak(utterThis);
}

// Ensure voices are loaded
speechSynthesis.onvoiceschanged = () => synth.getVoices();

// Navigation Tabs
const tabBtns = document.querySelectorAll('.tab-btn');
const views = document.querySelectorAll('.view-section:not(.emergency-mode)');

tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        views.forEach(v => v.classList.remove('active'));
        
        btn.classList.add('active');
        document.getElementById(btn.dataset.target).classList.add('active');
    });
});

// Emergency Mode
const emergencyBtn = document.getElementById('emergency-btn');
const closeEmergencyBtn = document.getElementById('close-emergency-btn');
const emergencyView = document.getElementById('emergency-view');

emergencyBtn.addEventListener('click', () => {
    emergencyView.classList.add('active');
});

closeEmergencyBtn.addEventListener('click', () => {
    emergencyView.classList.remove('active');
});

// Emergency Cards Speech
document.querySelectorAll('.em-card').forEach(card => {
    if (card.id !== 'location-btn') {
        card.addEventListener('click', () => {
            speak(card.dataset.message);
        });
    }
});

// Geolocation
const locationBtn = document.getElementById('location-btn');
locationBtn.addEventListener('click', () => {
    if ("geolocation" in navigator) {
        speak("Fetching location");
        navigator.geolocation.getCurrentPosition(position => {
            const msg = `My coordinates are Latitude ${position.coords.latitude.toFixed(4)} and Longitude ${position.coords.longitude.toFixed(4)}`;
            speak(msg);
            alert(`Location:\nLat: ${position.coords.latitude}\nLon: ${position.coords.longitude}`);
        }, () => {
            speak("Failed to get location");
        });
    } else {
        speak("Location not supported");
    }
});

// Voice Input (Speech to Text)
const micBtn = document.getElementById('mic-btn');
const voiceStatus = document.getElementById('voice-status');

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;

    micBtn.addEventListener('click', () => {
        recognition.start();
        micBtn.classList.add('listening');
        voiceStatus.innerText = "Listening...";
    });

    recognition.onresult = (event) => {
        const text = event.results[0][0].transcript.toLowerCase();
        voiceStatus.innerText = `Heard: "${text}"`;
        
        // Match speech to emoji and trigger it
        const matched = EMOJI_DATA.find(item => text.includes(item.text.toLowerCase()) || text.includes(item.id));
        if (matched) {
            speak(`I found: ${matched.text}`);
            // Highlight the button briefly
            const btns = document.querySelectorAll('.grid-item');
            btns.forEach(btn => {
                if (btn.innerText.includes(matched.text)) {
                    btn.style.transform = 'scale(1.05)';
                    setTimeout(() => btn.style.transform = 'none', 1000);
                }
            });
        }
    };

    recognition.onend = () => {
        micBtn.classList.remove('listening');
        setTimeout(() => voiceStatus.innerText = "", 3000);
    };
} else {
    micBtn.style.display = 'none';
}

// Video & Gesture Recognition (WebSockets)
const video = document.getElementById('videoElement');
const canvas = document.getElementById('canvasElement');
const ctx = canvas.getContext('2d');
const toggleCameraBtn = document.getElementById('toggle-camera-btn');
const gestureText = document.getElementById('gesture-text');

let stream = null;
let captureInterval = null;

// Initialize Socket.IO
// Connect to the same host that served the page
const socket = io();

socket.on('connect', () => {
    console.log('Connected to backend for gestures!');
});

socket.on('gesture_result', (data) => {
    gestureText.innerText = data.text;
    gestureText.style.color = '#2ecc71';
    
    // Optional: speak the gesture if it's new (throttle it to prevent spam)
    // speak(data.text);
    
    setTimeout(() => {
        gestureText.style.color = 'white';
    }, 500);
});

toggleCameraBtn.addEventListener('click', async () => {
    if (stream) {
        // Stop Camera
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
        video.srcObject = null;
        stream = null;
        clearInterval(captureInterval);
        toggleCameraBtn.innerHTML = '<i class="fa-solid fa-camera"></i> Start Camera';
        toggleCameraBtn.style.background = 'var(--primary)';
        gestureText.innerText = 'Camera stopped';
    } else {
        // Start Camera
        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
            video.srcObject = stream;
            toggleCameraBtn.innerHTML = '<i class="fa-solid fa-video-slash"></i> Stop Camera';
            toggleCameraBtn.style.background = '#e74c3c';
            gestureText.innerText = 'Analyzing...';
            
            // Set canvas size equal to video stream
            video.onloadedmetadata = () => {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                
                // Start capturing frames
                captureInterval = setInterval(() => {
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    // Convert to base64 jpeg
                    const imageData = canvas.toDataURL('image/jpeg', 0.5); // 0.5 quality for lower latency
                    socket.emit('video_frame', imageData);
                }, 200); // 5 FPS to not overload server
            };
            
        } catch (err) {
            console.error("Camera access denied:", err);
            alert("Please enable camera access.");
        }
    }
});

// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('service-worker.js').then(reg => {
            console.log('SW registered:', reg.scope);
        }).catch(err => {
            console.log('SW registration failed:', err);
        });
    });
}

// Initial render
renderGrid();
