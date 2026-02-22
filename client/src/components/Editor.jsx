import React, { useCallback, useEffect, useState } from "react";
import Quill from "quill";
import "quill/dist/quill.snow.css";
import { io } from "socket.io-client";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { Save, CheckCircle, Home, Share2, Users, X, MessageSquare, History, Send } from "lucide-react";

const SAVE_INTERVAL_MS = 2000;
const TOOLBAR_OPTIONS = [
    [{ header: [1, 2, 3, 4, 5, 6, false] }],
    [{ font: [] }],
    [{ list: "ordered" }, { list: "bullet" }],
    ["bold", "italic", "underline"],
    [{ color: [] }, { background: [] }],
    [{ script: "sub" }, { script: "super" }],
    [{ align: [] }],
    ["image", "blockquote", "code-block"],
    ["clean"],
];

const RemoteCursor = ({ quill, data }) => {
    const [coords, setCoords] = useState(null);

    useEffect(() => {
        if (!quill || !data.range) return;

        const updateCoords = () => {
            const bounds = quill.getBounds(data.range.index);
            if (bounds) {
                setCoords(bounds);
            }
        };

        updateCoords();
        quill.on('text-change', updateCoords);
        return () => quill.off('text-change', updateCoords);
    }, [quill, data.range]);

    if (!coords) return null;

    return (
        <div
            className="remote-cursor"
            style={{
                left: coords.left,
                top: coords.top,
                backgroundColor: data.color,
                height: coords.height
            }}
        >
            <div className="cursor-label" style={{ backgroundColor: data.color }}>
                {data.username}
            </div>
        </div>
    );
};

const Editor = () => {
    const { id: documentId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const [socket, setSocket] = useState();
    const [quill, setQuill] = useState();
    const [saveStatus, setSaveStatus] = useState("Synced");
    const [documentTitle, setDocumentTitle] = useState("Loading...");
    const [permissions, setPermissions] = useState({ owner: "", collaborators: [] });
    const [activeUsers, setActiveUsers] = useState([]);
    const [remoteCursors, setRemoteCursors] = useState({}); // { socketId: { color, range, username } }
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState("");
    const [versions, setVersions] = useState([]);
    const [activeTab, setActiveTab] = useState("chat"); // "chat" | "versions"

    useEffect(() => {
        const token = localStorage.getItem('token');
        const s = io(import.meta.env.VITE_API_URL, {
            auth: { token }
        });
        setSocket(s);

        s.on("permission-denied", (message) => {
            alert(message);
            navigate('/');
        });

        return () => {
            s.disconnect();
        };
    }, [navigate]);

    useEffect(() => {
        if (socket == null || quill == null) return;

        socket.once("load-document", (document) => {
            if (location.state?.initialContent && !document) {
                quill.setText(location.state.initialContent);
            } else {
                quill.setContents(document);
            }
            quill.enable();
        });

        socket.on("load-title", (title) => {
            setDocumentTitle(title);
        });

        socket.on("receive-title-change", (newTitle) => {
            setDocumentTitle(newTitle);
        });

        socket.on("load-permissions", (perms) => {
            setPermissions(perms);
        });

        socket.on("user-list-update", (users) => {
            setActiveUsers(users);
        });

        socket.on("remote-cursor-move", (data) => {
            setRemoteCursors(prev => ({
                ...prev,
                [data.userId]: data
            }));
        });

        socket.on("load-chat", (messages) => {
            setChatMessages(messages);
        });

        socket.on("receive-chat-message", (msg) => {
            setChatMessages(prev => [...prev, msg]);
        });

        socket.on("load-versions", (hist) => {
            setVersions(hist);
        });

        socket.emit("get-document", documentId);
    }, [socket, quill, documentId, location.state]);

    useEffect(() => {
        if (socket == null || quill == null) return;

        const handler = (range) => {
            if (range) socket.emit("cursor-move", range);
        };
        quill.on("selection-change", handler);

        return () => {
            quill.off("selection-change", handler);
        };
    }, [socket, quill]);

    const handleInvite = (e) => {
        e.preventDefault();
        if (!inviteEmail) return;
        socket.emit("share-document", inviteEmail);
        setInviteEmail("");
    };

    const handleTitleChange = (e) => {
        const newTitle = e.target.value;
        setDocumentTitle(newTitle);
        socket.emit("change-title", newTitle);
    };

    useEffect(() => {
        if (socket == null || quill == null) return;

        const interval = setInterval(() => {
            socket.emit("save-document", quill.getContents());
            setSaveStatus("Auto-saved");
            setTimeout(() => setSaveStatus("Synced"), 2000);
        }, SAVE_INTERVAL_MS);

        return () => {
            clearInterval(interval);
        };
    }, [socket, quill]);

    const handleManualSave = () => {
        if (socket == null || quill == null) return;
        socket.emit("save-document", quill.getContents());
        setSaveStatus("Manually Saved!");
        setTimeout(() => setSaveStatus("Synced"), 2000);
    };

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!chatInput.trim() || socket == null) return;
        socket.emit("send-chat-message", chatInput);
        setChatInput("");
    };

    const handleCreateVersion = () => {
        if (socket == null || quill == null) return;
        socket.emit("create-version", quill.getContents());
        alert("Version checkpoint created!");
    };

    const restoreVersion = (data) => {
        if (!quill) return;
        quill.setContents(data);
    };

    useEffect(() => {
        if (socket == null || quill == null) return;

        const handler = (delta, oldDelta, source) => {
            if (source !== "user") return;
            socket.emit("send-changes", delta);
            setSaveStatus("Unsaved Changes...");
        };
        quill.on("text-change", handler);

        return () => {
            quill.off("text-change", handler);
        };
    }, [socket, quill]);

    useEffect(() => {
        if (socket == null || quill == null) return;

        const handler = (delta) => {
            quill.updateContents(delta);
        };
        socket.on("receive-changes", handler);

        return () => {
            socket.off("receive-changes", handler);
        };
    }, [socket, quill]);

    const wrapperRef = useCallback((wrapper) => {
        if (wrapper == null) return;

        wrapper.innerHTML = "";
        const editor = document.createElement("div");
        wrapper.append(editor);
        const q = new Quill(editor, {
            theme: "snow",
            modules: { toolbar: TOOLBAR_OPTIONS },
        });
        q.disable();
        q.setText("Loading...");
        setQuill(q);
    }, []);

    return (
        <div className="editor-page">
            <nav className="editor-nav glass-morphism">
                <div className="nav-left">
                    <button className="home-btn" onClick={() => navigate('/')}>
                        <Home size={18} />
                    </button>
                    <input
                        className="doc-title-input"
                        value={documentTitle}
                        onChange={handleTitleChange}
                        placeholder="Untitled Document"
                    />
                    <div className="save-indicator">
                        <CheckCircle size={14} color={saveStatus === "Synced" ? "#10b981" : "#f59e0b"} />
                        <span>{saveStatus}</span>
                    </div>
                </div>
                <div className="nav-right">
                    <div className="active-users">
                        {activeUsers.map(user => (
                            <div
                                key={user.socketId}
                                className="user-avatar"
                                style={{ backgroundColor: user.color }}
                                title={user.username}
                            >
                                {user.username.charAt(0).toUpperCase()}
                            </div>
                        ))}
                    </div>
                    <button className="share-btn-nav" onClick={() => setIsShareModalOpen(true)}>
                        <Share2 size={18} />
                        Share
                    </button>
                    <button className="manual-save-btn" onClick={handleManualSave}>
                        <Save size={18} />
                        Save
                    </button>
                    <div className="status-indicator">
                        <span className="dot"></span> Real-time Sync Active
                    </div>
                </div>
            </nav>

            <div className="editor-main">
                <div className="editor-container" ref={wrapperRef}>
                    {Object.values(remoteCursors).map(cursor => (
                        cursor.range && (
                            <RemoteCursor
                                key={cursor.userId}
                                quill={quill}
                                data={cursor}
                            />
                        )
                    ))}
                </div>

                <aside className="comments-drawer glass-morphism">
                    <div className="drawer-tabs">
                        <button
                            className={activeTab === 'chat' ? 'active' : ''}
                            onClick={() => setActiveTab('chat')}
                        >
                            <MessageSquare size={16} /> Chat
                        </button>
                        <button
                            className={activeTab === 'versions' ? 'active' : ''}
                            onClick={() => setActiveTab('versions')}
                        >
                            <History size={16} /> History
                        </button>
                    </div>

                    {activeTab === 'chat' ? (
                        <>
                            <div className="comment-list">
                                {chatMessages.map((msg, i) => (
                                    <div key={i} className="comment-item">
                                        <div className="comment-meta">
                                            <strong>{msg.sender}</strong>
                                            <span>{new Date(msg.createdAt).toLocaleTimeString()}</span>
                                        </div>
                                        <p>{msg.text}</p>
                                    </div>
                                ))}
                            </div>
                            <form className="comment-input-area" onSubmit={handleSendMessage}>
                                <input
                                    type="text"
                                    placeholder="Type a message..."
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                />
                                <button type="submit"><Send size={16} /></button>
                            </form>
                        </>
                    ) : (
                        <div className="version-list">
                            <button className="create-version-btn" onClick={handleCreateVersion}>
                                Save Current Version
                            </button>
                            {versions.slice().reverse().map((v, i) => (
                                <div key={i} className="version-item">
                                    <div className="version-info">
                                        <strong>Version {versions.length - i}</strong>
                                        <span>{new Date(v.createdAt).toLocaleString()}</span>
                                    </div>
                                    <button onClick={() => restoreVersion(v.data)}>Restore</button>
                                </div>
                            ))}
                        </div>
                    )}
                </aside>
            </div>

            {isShareModalOpen && (
                <div className="modal-overlay">
                    <div className="share-modal glass-morphism animate-in">
                        <div className="modal-header">
                            <h3>Share</h3>
                            <button className="close-btn" onClick={() => setIsShareModalOpen(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="permissions-content">
                            <div className="owner-section">
                                <label>Owner: {permissions.owner}</label>
                            </div>
                            <form onSubmit={handleInvite} className="invite-form">
                                <input
                                    type="email"
                                    placeholder="Invite by email"
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                />
                                <button type="submit">Invite</button>
                            </form>
                            <label>Collaborators</label>
                            {permissions.collaborators.map(email => (
                                <div key={email} className="collab-item">{email}</div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Editor;
