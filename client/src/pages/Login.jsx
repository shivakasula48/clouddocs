import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/login`, { email, password });
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('username', res.data.username);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed');
        }
    };

    return (
        <div className="auth-container">
            <div className="glass-morphism auth-card">
                <h2>Welcome Back</h2>
                <p>Collaborate in real-time with CloudDocs</p>
                {error && <p className="error">{error}</p>}
                <form onSubmit={handleSubmit}>
                    <input
                        type="email"
                        placeholder="Email Address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    <button type="submit" className="btn-primary">Sign In</button>
                </form>
                <p>Don't have an account? <Link to="/register">Sign Up</Link></p>
            </div>

            <style jsx>{`
                .auth-container {
                    height: 100vh;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    background: radial-gradient(circle at top left, #1e293b, #0f172a);
                }
                .auth-card {
                    padding: 40px;
                    width: 100%;
                    max-width: 400px;
                    text-align: center;
                }
                h2 { margin-bottom: 8px; font-weight: 700; color: white; }
                p { color: #94a3b8; margin-bottom: 24px; font-size: 0.9rem; }
                form { display: flex; flex-direction: column; gap: 16px; }
                input {
                    padding: 12px 16px;
                    border-radius: 8px;
                    border: 1px solid rgba(255,255,255,0.1);
                    background: rgba(255,255,255,0.05);
                    color: white;
                    outline: none;
                }
                input:focus { border-color: #6366f1; }
                .error { color: #ef4444; margin-bottom: 16px; font-size: 0.8rem; }
                a { color: #6366f1; text-decoration: none; }
                a:hover { text-decoration: underline; }
            `}</style>
        </div>
    );
};

export default Login;
