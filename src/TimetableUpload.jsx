import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, Loader, Check, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { digitizeTimetable } from './geminiService';

const TimetableUpload = ({ isOpen, onClose, onScheduleExtracted }) => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState(null);
    const [extractedSchedule, setExtractedSchedule] = useState(null);
    const fileInputRef = useRef(null);

    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            processFile(file);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file) {
            processFile(file);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    const processFile = (file) => {
        // Validate file type
        const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            setError('Please upload a PNG, JPG, or WebP image');
            return;
        }

        setSelectedFile(file);
        setError(null);
        setExtractedSchedule(null);

        // Create preview
        const reader = new FileReader();
        reader.onload = (e) => {
            setPreview(e.target.result);
        };
        reader.readAsDataURL(file);
    };

    const handleDigitize = async () => {
        if (!preview || !selectedFile) return;

        setIsProcessing(true);
        setError(null);

        try {
            const schedule = await digitizeTimetable(preview, selectedFile.type);
            setExtractedSchedule(schedule);
        } catch (err) {
            console.error('Digitization error:', err);
            setError(err.message || 'Failed to digitize timetable. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleConfirm = () => {
        if (extractedSchedule) {
            onScheduleExtracted(extractedSchedule);
            handleClose();
        }
    };

    const handleClose = () => {
        setSelectedFile(null);
        setPreview(null);
        setError(null);
        setExtractedSchedule(null);
        setIsProcessing(false);
        onClose();
    };

    const countClasses = (schedule) => {
        if (!schedule) return 0;
        return Object.values(schedule).reduce((sum, day) => sum + day.length, 0);
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="modal-overlay"
                onClick={handleClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="upload-modal"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="upload-modal-header">
                        <h2>Upload Academic Timetable</h2>
                        <button onClick={handleClose} className="upload-close-btn">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="upload-modal-content">
                        {!extractedSchedule ? (
                            <>
                                {/* Dropzone */}
                                <div
                                    className={`upload-dropzone ${preview ? 'has-file' : ''}`}
                                    onDrop={handleDrop}
                                    onDragOver={handleDragOver}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/png,image/jpeg,image/jpg,image/webp"
                                        onChange={handleFileSelect}
                                        style={{ display: 'none' }}
                                    />

                                    {preview ? (
                                        <div className="upload-preview">
                                            <img src={preview} alt="Timetable preview" />
                                            <div className="upload-preview-overlay">
                                                <ImageIcon size={24} />
                                                <span>Click to change image</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="upload-placeholder">
                                            <Upload size={48} />
                                            <p className="upload-text">Drop your timetable image here</p>
                                            <p className="upload-hint">or click to browse (PNG, JPG, WebP)</p>
                                        </div>
                                    )}
                                </div>

                                {/* Error */}
                                {error && (
                                    <div className="upload-error">
                                        <AlertCircle size={16} />
                                        <span>{error}</span>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="upload-actions">
                                    <button onClick={handleClose} className="btn-secondary">
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleDigitize}
                                        className="btn-primary"
                                        disabled={!preview || isProcessing}
                                    >
                                        {isProcessing ? (
                                            <>
                                                <Loader size={16} className="spinning" />
                                                Processing...
                                            </>
                                        ) : (
                                            <>
                                                <Upload size={16} />
                                                Digitize Timetable
                                            </>
                                        )}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                {/* Preview extracted schedule */}
                                <div className="extracted-schedule">
                                    <div className="extracted-header">
                                        <Check size={24} className="success-icon" />
                                        <div>
                                            <h3>Timetable Extracted!</h3>
                                            <p>Found {countClasses(extractedSchedule)} classes across the week</p>
                                        </div>
                                    </div>

                                    <div className="extracted-preview">
                                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => (
                                            <div key={day} className="extracted-day">
                                                <h4>{day}</h4>
                                                {extractedSchedule[day]?.length > 0 ? (
                                                    <ul>
                                                        {extractedSchedule[day].map((cls, idx) => (
                                                            <li key={idx}>
                                                                <span className="extracted-time">{cls.time}-{cls.end}</span>
                                                                <span className="extracted-title">{cls.title}</span>
                                                                <span className="extracted-meta">{cls.type} {cls.location}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                ) : (
                                                    <p className="no-classes">No classes</p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="upload-actions">
                                    <button
                                        onClick={() => setExtractedSchedule(null)}
                                        className="btn-secondary"
                                    >
                                        Try Again
                                    </button>
                                    <button onClick={handleConfirm} className="btn-primary">
                                        <Check size={16} />
                                        Confirm & Apply
                                    </button>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Info */}
                    <div className="upload-info">
                        <p>📸 Upload a clear photo of your academic timetable</p>
                        <p>🤖 AI will extract classes, times, and locations</p>
                        <p>✏️ You can still add personal blocks on top</p>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default TimetableUpload;
