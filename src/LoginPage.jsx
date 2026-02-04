import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from './AuthContext';
import { Mail, Lock, User, ArrowRight, Loader2 } from 'lucide-react';

const LoginPage = () => {
    const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
    const [isSignUp, setIsSignUp] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        name: ''
    });

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
    };

    const handleGoogleSignIn = async () => {
        setLoading(true);
        setError('');
        const result = await signInWithGoogle();
        if (!result.success) {
            setError(result.error);
        }
        setLoading(false);
    };

    const handleEmailSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        let result;
        if (isSignUp) {
            result = await signUpWithEmail(formData.email, formData.password, formData.name);
        } else {
            result = await signInWithEmail(formData.email, formData.password);
        }

        if (!result.success) {
            setError(result.error);
        }
        setLoading(false);
    };

    return (
        <div className="login-container">
            {/* Background gradient orbs */}
            <div className="login-bg-orb orb-1" />
            <div className="login-bg-orb orb-2" />
            <div className="login-bg-orb orb-3" />

            <motion.div
                className="login-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                {/* Logo/Brand */}
                <div className="login-header">
                    <div className="login-logo">
                        <span className="logo-icon">❄️</span>
                    </div>
                    <h1 className="login-title">Igloo Workspace</h1>
                    <p className="login-subtitle">
                        {isSignUp ? 'Create your account' : 'Welcome back'}
                    </p>
                </div>

                {/* Error Message */}
                <AnimatePresence>
                    {error && (
                        <motion.div
                            className="login-error"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                        >
                            {error}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Google Sign In */}
                <button
                    className="login-google-btn"
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                >
                    <svg viewBox="0 0 24 24" width="20" height="20">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    <span>Continue with Google</span>
                </button>

                {/* Divider */}
                <div className="login-divider">
                    <span>or</span>
                </div>

                {/* Email Form */}
                <form onSubmit={handleEmailSubmit} className="login-form">
                    <AnimatePresence>
                        {isSignUp && (
                            <motion.div
                                className="login-input-group"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                            >
                                <User size={18} className="login-input-icon" />
                                <input
                                    type="text"
                                    name="name"
                                    placeholder="Full name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    className="login-input"
                                    required={isSignUp}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="login-input-group">
                        <Mail size={18} className="login-input-icon" />
                        <input
                            type="email"
                            name="email"
                            placeholder="Email address"
                            value={formData.email}
                            onChange={handleInputChange}
                            className="login-input"
                            required
                        />
                    </div>

                    <div className="login-input-group">
                        <Lock size={18} className="login-input-icon" />
                        <input
                            type="password"
                            name="password"
                            placeholder="Password"
                            value={formData.password}
                            onChange={handleInputChange}
                            className="login-input"
                            required
                            minLength={6}
                        />
                    </div>

                    <button
                        type="submit"
                        className="login-submit-btn"
                        disabled={loading}
                    >
                        {loading ? (
                            <Loader2 size={20} className="spin" />
                        ) : (
                            <>
                                <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
                                <ArrowRight size={18} />
                            </>
                        )}
                    </button>
                </form>

                {/* Toggle Sign Up / Sign In */}
                <p className="login-toggle">
                    {isSignUp ? 'Already have an account?' : "Don't have an account?"}
                    <button
                        type="button"
                        onClick={() => {
                            setIsSignUp(!isSignUp);
                            setError('');
                        }}
                        className="login-toggle-btn"
                    >
                        {isSignUp ? 'Sign In' : 'Sign Up'}
                    </button>
                </p>
            </motion.div>

            {/* Footer */}
            <p className="login-footer">
                Your productivity sanctuary 🧊
            </p>
        </div>
    );
};

export default LoginPage;
