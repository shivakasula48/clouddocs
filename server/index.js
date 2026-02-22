const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// In-Memory Fallback Store (for demo if MongoDB is unavailable)
const mockDocs = new Map();
const mockUsers = [];
const activeUsers = new Map(); // { documentId: [{ userId, username, socketId, color }] }

// MongoDB Connection with careful error handling
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/collab-docs';
let isMongoConnected = false;

mongoose.connect(MONGO_URI, {
    serverSelectionTimeoutMS: 5000
})
    .then(() => {
        console.log('✅ Connected to MongoDB');
        isMongoConnected = true;
    })
    .catch(err => {
        console.warn('⚠️ MongoDB connection failed. Running in "Demo Mode" (In-Memory).');
        console.log('To use a real DB, update MONGO_URI in .env');
    });

// Document Schema
const documentSchema = new mongoose.Schema({
    _id: String,
    data: Object,
    title: { type: String, default: 'Untitled Document' },
    owner: { type: String, required: true },
    collaborators: [{ type: String }],
    versions: [{
        data: Object,
        createdAt: { type: Date, default: Date.now }
    }],
    messages: [{
        text: String,
        sender: String,
        createdAt: { type: Date, default: Date.now }
    }]
});

const Document = mongoose.model('Document', documentSchema);
const defaultValue = "";

// Auth Routes
app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (isMongoConnected) {
            const user = new User({ username, email, password });
            await user.save();
        } else {
            const hashedPassword = await bcrypt.hash(password, 10);
            mockUsers.push({ username, email, password: hashedPassword, _id: Date.now().toString() });
        }

        res.status(201).json({ message: 'User created' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        let user;

        if (isMongoConnected) {
            user = await User.findOne({ email });
        } else {
            user = mockUsers.find(u => u.email === email);
        }

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
        res.json({ token, username: user.username });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/documents', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: "Unauthorized" });
        const token = authHeader.split(' ')[1];

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userEmail = await getUserEmailById(decoded.userId);

        let docs = [];
        if (isMongoConnected) {
            docs = await Document.find({
                $or: [{ owner: userEmail }, { collaborators: userEmail }]
            }, '_id title owner collaborators');
        } else {
            docs = Array.from(mockDocs.entries())
                .filter(([id, doc]) => doc.owner === userEmail || doc.collaborators.includes(userEmail))
                .map(([id, doc]) => ({
                    _id: id,
                    title: doc.title || 'Untitled Document',
                    owner: doc.owner,
                    collaborators: doc.collaborators
                }));
        }
        res.json(docs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Auth middleware for sockets
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error("Authentication error"));
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return next(new Error("Authentication error"));
        socket.userId = decoded.userId;
        next();
    });
});

async function getUserEmailById(id) {
    if (isMongoConnected) {
        const user = await User.findById(id);
        return user?.email;
    } else {
        return mockUsers.find(u => u._id === id)?.email;
    }
}

async function getUsernameById(id) {
    if (isMongoConnected) {
        const user = await User.findById(id);
        return user?.username;
    } else {
        return mockUsers.find(u => u._id === id)?.username;
    }
}

io.on("connection", socket => {
    socket.on("get-document", async documentId => {
        const userEmail = await getUserEmailById(socket.userId);
        const username = await getUsernameById(socket.userId);
        const doc = await findOrCreateDocument(documentId, socket.userId);

        if (!(doc.owner === userEmail || doc.collaborators.includes(userEmail))) {
            return socket.emit("permission-denied", "You don't have access to this document.");
        }

        socket.join(documentId);
        socket.emit("load-document", doc.data);
        socket.emit("load-title", doc.title);
        socket.emit("load-permissions", { owner: doc.owner, collaborators: doc.collaborators });
        socket.emit("load-chat", doc.messages || []);
        socket.emit("load-versions", doc.versions || []);

        // Presence logic
        if (!activeUsers.has(documentId)) activeUsers.set(documentId, []);
        const color = `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;
        const userPresence = { userId: socket.userId, username, socketId: socket.id, color };
        activeUsers.get(documentId).push(userPresence);
        io.in(documentId).emit("user-list-update", activeUsers.get(documentId));

        socket.on("cursor-move", range => {
            socket.broadcast.to(documentId).emit("remote-cursor-move", {
                userId: socket.userId,
                username,
                range,
                color
            });
        });

        socket.on("send-changes", delta => {
            socket.broadcast.to(documentId).emit("receive-changes", delta);
        });

        socket.on("send-chat-message", async text => {
            const message = { text, sender: username, createdAt: new Date() };
            if (isMongoConnected) {
                await Document.findByIdAndUpdate(documentId, { $push: { messages: message } });
            } else {
                const currentDoc = mockDocs.get(documentId);
                if (!currentDoc.messages) currentDoc.messages = [];
                currentDoc.messages.push(message);
                mockDocs.set(documentId, currentDoc);
            }
            io.in(documentId).emit("receive-chat-message", message);
        });

        socket.on("create-version", async data => {
            const version = { data, createdAt: new Date() };
            if (isMongoConnected) {
                await Document.findByIdAndUpdate(documentId, { $push: { versions: version } });
                const updated = await Document.findById(documentId);
                io.in(documentId).emit("load-versions", updated.versions);
            } else {
                const currentDoc = mockDocs.get(documentId);
                if (!currentDoc.versions) currentDoc.versions = [];
                currentDoc.versions.push(version);
                mockDocs.set(documentId, currentDoc);
                io.in(documentId).emit("load-versions", currentDoc.versions);
            }
        });

        socket.on("disconnect", () => {
            if (activeUsers.has(documentId)) {
                const list = activeUsers.get(documentId).filter(u => u.socketId !== socket.id);
                activeUsers.set(documentId, list);
                io.in(documentId).emit("user-list-update", list);
            }
        });

        socket.on("share-document", async invitedEmail => {
            if (isMongoConnected) {
                await Document.findByIdAndUpdate(documentId, { $addToSet: { collaborators: invitedEmail } });
            } else {
                const currentDoc = mockDocs.get(documentId);
                if (!currentDoc.collaborators.includes(invitedEmail)) {
                    currentDoc.collaborators.push(invitedEmail);
                    mockDocs.set(documentId, currentDoc);
                }
            }
            const updatedDoc = await findOrCreateDocument(documentId, socket.userId);
            io.in(documentId).emit("load-permissions", { owner: updatedDoc.owner, collaborators: updatedDoc.collaborators });
        });

        socket.on("change-title", async newTitle => {
            if (isMongoConnected) {
                await Document.findByIdAndUpdate(documentId, { title: newTitle });
            } else {
                const currentDoc = mockDocs.get(documentId) || { data: "" };
                mockDocs.set(documentId, { ...currentDoc, title: newTitle });
            }
            socket.broadcast.to(documentId).emit("receive-title-change", newTitle);
        });

        socket.on("save-document", async data => {
            if (isMongoConnected) {
                await Document.findByIdAndUpdate(documentId, { data });
            } else {
                const currentDoc = mockDocs.get(documentId) || { title: "Untitled Document" };
                mockDocs.set(documentId, { ...currentDoc, data });
            }
        });
    });
});

async function findOrCreateDocument(id, userId) {
    if (id == null) return;
    const userEmail = await getUserEmailById(userId);

    if (isMongoConnected) {
        let document = await Document.findById(id);
        if (document) return document;
        return await Document.create({
            _id: id,
            data: defaultValue,
            title: "Untitled Document",
            owner: userEmail,
            collaborators: [],
            versions: [],
            messages: []
        });
    } else {
        if (!mockDocs.has(id)) {
            mockDocs.set(id, {
                data: defaultValue,
                title: "Untitled Document",
                owner: userEmail,
                collaborators: [],
                versions: [],
                messages: []
            });
        }
        return mockDocs.get(id);
    }
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
