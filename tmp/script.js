
// ========= Config =========
const API_CONFIG = {
    serverUrl: "https://api.heygen.com",
    token: "HEYGEN_API_TOKEN"
};

// Global state
let sessionInfo = null;
let room = null;
let mediaStream = null;

// DOM elements
const mediaElement = document.getElementById("mediaElement");
const taskInput = document.getElementById("taskInput");

// ========= Create and Start Session =========

async function createSession() {
    // Create new session
    const response = await fetch(`${API_CONFIG.serverUrl}/v1/streaming.new`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${API_CONFIG.token}`
        },
        body: JSON.stringify({
            version: "v2",
            avatar_id: "90115f9617174150b47bbdbb776e5408"
        })
    });
    
    sessionInfo = await response.json();
    
    // Start streaming
    await fetch(`${API_CONFIG.serverUrl}/v1/streaming.start`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${API_CONFIG.token}`
        },
        body: JSON.stringify({
            session_id: sessionInfo.session_id
        })
    });
    
    // Connect to LiveKit room
    room = new LiveKitClient.Room();
    await room.connect(sessionInfo.url, sessionInfo.access_token);
    
    // Handle media streams
    room.on(LiveKitClient.RoomEvent.TrackSubscribed, (track) => {
        if (track.kind === "video" || track.kind === "audio") {
            mediaStream.addTrack(track.mediaStreamTrack);
            mediaElement.srcObject = mediaStream;
        }
    });
    
    
}


// ========= Send Text to Avatar =========

async function sendText(text) {
    await fetch(`${API_CONFIG.serverUrl}/v1/streaming.task`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${API_CONFIG.token}`
        },
        body: JSON.stringify({
            session_id: sessionInfo.session_id,
            text: text,
            task_type: "talk"  // or "repeat" to make avatar repeat exactly what you say
        })
    });
}


// ========= Close Session =========

async function closeSession() {
  await fetch(`${API_CONFIG.serverUrl}/v1/streaming.stop`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${API_CONFIG.token}`
    },
    body: JSON.stringify({
      session_id: sessionInfo.session_id
    })
  });
  
  if (room) {
    room.disconnect();
  }
  
  mediaElement.srcObject = null;
  sessionInfo = null;
  room = null;
  mediaStream = null;
}

// ========= Event Listeners =======

// Start session
document.querySelector("#startBtn").addEventListener("click", async () => {
  await createSession();
});

// Close session
document.querySelector("#closeBtn").addEventListener("click", closeSession);

// Send text
document.querySelector("#talkBtn").addEventListener("click", () => {
  const text = taskInput.value.trim();
  if (text) {
    sendText(text);
    taskInput.value = "";
  }
});


// Start session
document.querySelector("#startBtn").addEventListener("click", async () => {
  await createSession();
});

// Close session
document.querySelector("#closeBtn").addEventListener("click", closeSession);

// Send text
document.querySelector("#talkBtn").addEventListener("click", () => {
  const text = taskInput.value.trim();
  if (text) {
    sendText(text);
    taskInput.value = "";
  }
});

// ========= WebSocket Events =======

const wsUrl = `wss://api.heygen.com/v1/ws/streaming.chat?session_id=${sessionId}&session_token=${token}&silence_response=false`;
const ws = new WebSocket(wsUrl);

ws.addEventListener("message", (event) => {
  const data = JSON.parse(event.data);
  console.log("Event:", data);
});


// ========= LiveKit Room Event =======

room.on(LivekitClient.RoomEvent.DataReceived, (message) => {
  const data = new TextDecoder().decode(message);
  console.log("Room message:", JSON.parse(data));
});


