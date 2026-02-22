import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidV4 } from 'uuid';
import { FileText, Plus, LogOut, User, Home } from 'lucide-react';
import axios from 'axios';

const Dashboard = () => {
    const navigate = useNavigate();
    const username = localStorage.getItem('username');
    const [documents, setDocuments] = useState([]);

    useEffect(() => {
        const fetchDocs = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get('http://192.168.1.60:5000/api/documents', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setDocuments(res.data);
            } catch (err) {
                console.error("Error fetching docs", err);
            }
        };
        fetchDocs();
    }, []);

    const handleCreateNew = (content = "") => {
        const id = uuidV4();
        navigate(`/documents/${id}`, { state: { initialContent: typeof content === 'string' ? content : "" } });
    };

    const handleUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            handleCreateNew(event.target.result);
        };
        reader.readAsText(file);
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        navigate('/login');
    };

    return (
        <div className="dashboard-container">
            <nav className="glass-morphism nav-bar">
                <div className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>CloudDocs</div>
                <div className="user-info">
                    <input
                        type="file"
                        id="fileUpload"
                        style={{ display: 'none' }}
                        onChange={handleUpload}
                        accept=".txt,.md,.js,.html,.css"
                    />
                    <button
                        className="upload-btn-nav"
                        onClick={() => document.getElementById('fileUpload').click()}
                    >
                        Upload Document
                    </button>
                    <User size={18} />
                    <span>{username}</span>
                    <button onClick={handleLogout} className="logout-btn">
                        <LogOut size={18} />
                    </button>
                </div>
            </nav>

            <main className="main-content">
                <div className="header-section">
                    <h1>My Documents</h1>
                    <button onClick={() => handleCreateNew()} className="btn-primary create-btn">
                        <Plus size={20} />
                        New Document
                    </button>
                </div>

                <div className="docs-grid">
                    <div className="glass-morphism doc-card placeholder" onClick={() => handleCreateNew()}>
                        <div className="doc-icon"><Plus size={32} /></div>
                        <h3>Create New</h3>
                        <p>Start a blank document</p>
                    </div>

                    {documents.map(doc => (
                        <div key={doc._id} className="glass-morphism doc-card" onClick={() => navigate(`/documents/${doc._id}`)}>
                            <div className="doc-icon"><FileText size={32} /></div>
                            <h3>{doc.title || 'Untitled'}</h3>
                            <p>ID: {doc._id.substring(0, 8)}...</p>
                        </div>
                    ))}
                </div>
            </main>

            <style jsx>{`
                .dashboard-container {
                    min-height: 100vh;
                    padding: 20px;
                    background: #0f172a;
                }
                .nav-bar {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 15px 30px;
                    margin-bottom: 40px;
                }
                .logo { font-size: 1.5rem; font-weight: 800; color: #6366f1; }
                .user-info { display: flex; align-items: center; gap: 12px; color: #94a3b8; }
                .upload-btn-nav {
                    background: rgba(99, 102, 241, 0.1);
                    border: 1px solid rgba(99, 102, 241, 0.3);
                    color: #6366f1;
                    padding: 6px 12px;
                    border-radius: 6px;
                    font-size: 0.85rem;
                    font-weight: 600;
                    margin-right: 10px;
                }
                .upload-btn-nav:hover {
                    background: rgba(99, 102, 241, 0.2);
                    border-color: #6366f1;
                }
                .logout-btn { 
                    background: transparent; 
                    border: none; 
                    color: #94a3b8; 
                    display: flex; 
                    align-items: center;
                    margin-left: 10px;
                }
                .logout-btn:hover { color: #ef4444; }
                
                .main-content { max-width: 1200px; margin: 0 auto; }
                .header-section { 
                    display: flex; 
                    justify-content: space-between; 
                    align-items: center; 
                    margin-bottom: 30px; 
                }
                h1 { font-size: 2rem; color: white; }
                .create-btn { display: flex; align-items: center; gap: 8px; }
                
                .docs-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
                    gap: 20px;
                }
                .doc-card {
                    padding: 30px;
                    text-align: center;
                    cursor: pointer;
                    transition: transform 0.2s;
                }
                .doc-card:hover { transform: translateY(-5px); }
                .doc-icon { 
                    margin-bottom: 15px; 
                    color: #6366f1; 
                    display: flex; 
                    justify-content: center; 
                }
                h3 { margin-bottom: 8px; color: white; }
                p { color: #94a3b8; font-size: 0.9rem; }
            `}</style>
        </div>
    );
};

export default Dashboard;
