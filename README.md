# CloudDocs: Real-time Collaborative Document System

A premium document collaboration system with real-time editing, version control, and user authentication.

## 🚀 Features
- **Real-time Collaboration**: Multiple users editing the same document simultaneously with visual updates.
- **Secure Authentication**: JWT-based login and registration system.
- **Auto-save**: Documents are automatically saved to the database.
- **Modern UI**: Sleek, dark-mode glassmorphism design.

## 🛠️ Technology Stack
- **Frontend**: React, Vite, Socket.io-client, Quill.js, Lucide-React.
- **Backend**: Node.js, Express, Socket.io, Mongoose.
- **Database**: MongoDB.

## 🏁 Getting Started

### 1. Prerequisites
- Node.js installed on your system.
- MongoDB instance (Local or MongoDB Atlas).

### 2. Backend Setup
1. Navigate to the `server` directory.
2. Create/Edit the `.env` file and add your MongoDB connection string:
   ```env
   MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/collab-docs
   JWT_SECRET=your_jwt_secret
   PORT=5000
   ```
3. Run `npm install` (if not already done).
4. Start the server: `node index.js`.

### 3. Frontend Setup
1. Navigate to the `client` directory.
2. Run `npm install` (if not already done).
3. Start the dev server: `npm run dev`.
4. Open your browser at `http://localhost:5173`.

## 🔒 Security
The system uses `bcryptjs` for password hashing and `jsonwebtoken` for secure session management.

## 📝 Version Control & Comments
The backend schema is already structured to support document versioning and comments. You can extend the UI in `Editor.jsx` to display the `versions` array from the Document model.
