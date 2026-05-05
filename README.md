# 💬 Real-Time Chat Application

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socketdotio&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)

> A full-stack real-time chat application where multiple users can connect, join rooms, and communicate instantly through a modern web interface.

---

## 📌 What This Project Does

This application allows users to:

1. **Enter a username** and choose a chat room to join
2. **Send and receive messages instantly** without refreshing the page — powered by WebSockets (Socket.io)
3. **See who is online** in the same room in real time
4. **Get notified** when someone joins or leaves the room
5. **See typing indicators** when another user is typing
6. **Track message status** — Sent ✔️, Delivered ✔️✔️, Seen 👀
7. **Load chat history** — last 50 messages are fetched from the database on join
8. **Search past messages** within any room
9. **Set up a profile** — upload a photo, write a bio, track profile completion
10. **Receive notifications** — in-app banner and browser push notifications for new messages
11. **Use emojis** in messages via a built-in emoji picker 😊
12. **Switch between Dark 🌙 and Light ☀️ themes** — preference saved automatically

All messages are **AES-256 encrypted** before being stored in the database, meaning even if someone accessed the database directly, they cannot read the messages.

---

## 🚀 Features

### ✅ Core (Required)
| Feature | Description |
|---------|-------------|
| Real-time messaging | Messages appear instantly for all users in the room |
| Multiple users | Handles many users connecting at the same time |
| Join / Leave events | Room notifies everyone when a user connects or disconnects |
| Message timestamps | Every message shows the time it was sent |
| Online users list | Sidebar shows all users currently in the room |

### ⭐ Bonus
| Feature | Description |
|---------|-------------|
| Chat rooms | 4 rooms — General, Tech, Random, Gaming |
| Typing indicators | Shows who is typing in real time |
| Read receipts | Sent ✔️ → Delivered ✔️✔️ → Seen 👀 |
| Chat history | Last 50 messages load when you join a room |
| Message search | Search any keyword across room messages |
| User profiles | Avatar, bio, profile completion progress bar |
| Profile picture upload | Upload and change your avatar |
| Notifications | In-app banner + browser push notifications |
| Emoji picker | Full emoji picker built into the chat input |
| Dark / Light theme | Toggle with 🌙 / ☀️ button, saved in localStorage |
| AES-256 encryption | All messages encrypted before saving to database |
| Responsive design | Works on mobile and desktop |

---

## 🔄 System Flow

```
User opens browser
       ↓
  Enters username + selects room → clicks Join
       ↓
  Frontend emits: joinRoom (Socket.io)
       ↓
  Server receives → saves user → joins socket room
       ↓
  Server fetches last 50 messages from MySQL → sends to user
  Server notifies room: "X has joined"
  Server sends updated user list to room
       ↓
  User types message → clicks Send
       ↓
  Frontend emits: chatMessage
       ↓
  Server encrypts message → saves to MySQL → broadcasts to room
       ↓
  All users in room receive the message instantly
       ↓
  User disconnects → server removes user → notifies room
```

---

## 📁 Project Structure

```
chatting app/
├── backend/
│   ├── server.js          # Express server, REST API routes, Socket.io setup
│   ├── socketHandler.js   # All socket event logic (modular)
│   └── db.js              # MySQL connection, table init, encrypt/decrypt, queries
├── frontend/
│   ├── index.html         # Join screen + full chat UI
│   ├── style.css          # Dark/light theme with CSS variables
│   ├── chat.js            # Client-side socket logic + UI interactions
│   └── uploads/           # Uploaded profile pictures
├── .env                   # Environment variables (DB credentials, encryption key)
├── .gitignore             # Ignores node_modules and .env
├── package.json           # Project dependencies and scripts
└── README.md              # Project documentation
```

---

## ⚙️ Setup & Run

### Prerequisites
- Node.js installed
- XAMPP running (MySQL must be started)
- Database named `chatapp` created in phpMyAdmin

### 1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd "chatting app"
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment
Edit the `.env` file:
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=chatapp
ENCRYPTION_KEY=your_64_char_hex_key
```

### 4. Start the server
```bash
npm start
```

Development mode (auto-reload):
```bash
npm run dev
```

### 5. Open in browser
```
http://localhost:3000
```

> 💡 Open multiple browser tabs to test real-time messaging between users.

---

## 🗄️ Database

Tables are **auto-created** when the server starts — no manual SQL needed.

### `messages` table
| Column | Type | Description |
|--------|------|-------------|
| id | INT | Primary key (auto increment) |
| username | VARCHAR(50) | Who sent the message |
| room | VARCHAR(50) | Which room it was sent in |
| message | TEXT | AES-256 encrypted message content |
| iv | VARCHAR(64) | Initialization vector for decryption |
| status | ENUM | sent / delivered / seen |
| created_at | TIMESTAMP | When the message was sent |

### `profiles` table
| Column | Type | Description |
|--------|------|-------------|
| id | INT | Primary key (auto increment) |
| username | VARCHAR(50) | Unique username |
| avatar | VARCHAR(255) | Path to uploaded avatar image |
| bio | VARCHAR(200) | User's bio text |
| created_at | TIMESTAMP | When the profile was created |

---

## 🔌 Socket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `joinRoom` | Client → Server | User joins a room with a username |
| `chatMessage` | Client → Server | User sends a message |
| `chatMessage` | Server → Client | Broadcast message to room |
| `messageHistory` | Server → Client | Last 50 messages sent on join |
| `messageStatus` | Server → Client | Status update (sent / delivered) |
| `messagesSeen` | Server → Client | Notify sender messages were seen |
| `markSeen` | Client → Server | User marks messages as seen |
| `typing` | Client ↔ Server | User started typing |
| `stopTyping` | Client ↔ Server | User stopped typing |
| `notification` | Server → Client | Join / leave announcements |
| `roomUsers` | Server → Client | Updated online users list |
| `searchMessages` | Client → Server | Search messages in a room |
| `searchResults` | Server → Client | Return matching messages |

---

## 🌐 REST API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/profile/:username` | Fetch a user's profile |
| POST | `/api/profile` | Update bio and avatar URL |
| POST | `/api/upload-avatar` | Upload a profile picture (max 2MB) |

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Runtime | Node.js | JavaScript server environment |
| Framework | Express.js | HTTP server and REST API routing |
| Real-time | Socket.io | WebSocket-based live communication |
| Database | MySQL via XAMPP | Persistent message and profile storage |
| DB Driver | mysql2 | Node.js MySQL connection with promises |
| Encryption | AES-256-CBC (crypto) | Secure message storage |
| File Upload | Multer | Handle profile picture uploads |
| Frontend | HTML5, CSS3, Vanilla JS | Chat interface and client logic |

---

## 🔒 Security

- Messages encrypted with **AES-256-CBC** before storing — unreadable in database
- **XSS protection** — all user input is HTML-escaped before rendering
- **File upload validation** — only images allowed, max 2MB
- **Environment variables** — credentials never hardcoded in source code

---

## 👥 Team

| Member | Role | Files Responsible |
|--------|------|-------------------|
|KARABO Carine | Backend Lead | `backend/server.js` |
|UWASE Sandrne | Socket Logic | `backend/socketHandler.js` |
| YIMANIFITE Joshua| Frontend / UI | `frontend/index.html`, `frontend/style.css` |
|UMUKUNDWA Sandrine | Client Logic & Docs | `frontend/chat.js`, `README.md` |
