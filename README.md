# CloudDocs ☁️

CloudDocs is a full-stack, real-time document collaboration platform built with the MERN stack (MongoDB, Express, React, Node.js) and Socket.io. It seamlessly blends modern text editing with robust collaborative features right in your browser.

## ✨ Features

- **Real-time Collaboration**: Type alongside your teammates with sub-second synchronization.
- **Live Presence & Cursors**: See exactly who is editing and track their cursor movements in real-time.
- **Persistent Live Chat**: Communicate directly within the document interface using the integrated chat system.
- **Version History & Rollback**: Create save checkpoints and instantly restore your document to any previous state.
- **Secure Access Control**: JWT-based authentication ensures only authorized users (owners and invited collaborators) can view or modify documents.
- **Modern Interface**: A sleek, glassmorphic UI offering a premium user experience.

## 🛠️ Technology Stack

- **Frontend**: React (Vite), Quill.js (Rich Text Editor), Lucide-React (Icons), raw CSS (Tailwinds not required).
- **Backend**: Node.js, Express.js, Socket.io (WebSocket for real-time engine).
- **Database**: MongoDB Atlas (Cloud database for persistence), Mongoose ODM.
- **Security**: JWT (JSON Web Tokens), Bcrypt (Password hashing).

## 🚀 Getting Started

### Prerequisites
- Node.js installed on your machine.
- A MongoDB cluster URL (or local installation).

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/shivakasula48/clouddocs.git
   cd clouddocs
   ```

2. **Install Server Dependencies:**
   ```bash
   cd server
   npm install
   ```

3. **Install Client Dependencies:**
   ```bash
   cd ../client
   npm install
   ```

4. **Environment Variables (.env)**
   Create a `.env` file in the `server` directory and add:
   ```env
   PORT=5000
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret_key
   ```

### Running the Application

Open two terminal windows:

**Terminal 1 (Backend Server):**
```bash
cd server
node index.js
```

**Terminal 2 (Frontend Client):**
```bash
cd client
npm run dev
```

The application will be accessible at `http://localhost:5173`.
