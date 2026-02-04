import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Clock, BookOpen, Coffee, Dumbbell, Moon, Sun,
  Heart, Monitor, Target, Flame, Play, Pause, Square,
  Plus, Trash2, Check, Volume2, VolumeX, Edit3, X, Music, Bell, Link, LogOut, Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from './AuthContext';
import TimetableUpload from './TimetableUpload';

// ═══════════════════════════════════════════════════════════
// DEFAULT ACADEMIC SCHEDULE (fallback if no uploaded timetable)
// ═══════════════════════════════════════════════════════════

const DEFAULT_ACADEMIC_SCHEDULE = {
  Monday: [
    { time: '09:00', end: '09:50', title: 'MATH F102', type: 'L3', location: 'F104' },
    { time: '10:00', end: '10:50', title: 'PHY F101', type: 'L2', location: 'F105' },
    { time: '11:00', end: '12:50', title: 'CS F111', type: 'P2', location: 'D313' },
    { time: '16:00', end: '16:50', title: 'MATH F113', type: 'L1', location: 'F103' },
    { time: '17:00', end: '17:50', title: 'EEE F111', type: 'L2', location: 'F105' },
    { time: '18:00', end: '18:50', title: 'BITS F102', type: 'L1', location: 'F105' },
  ],
  Tuesday: [
    { time: '08:00', end: '08:50', title: 'EEE F111', type: 'L2', location: 'F105' },
    { time: '09:00', end: '09:50', title: 'CS F111', type: 'L1', location: 'F105' },
    { time: '17:00', end: '17:50', title: 'MATH F102', type: 'T12', location: 'G104' },
  ],
  Wednesday: [
    { time: '08:00', end: '08:50', title: 'PHY F101', type: 'T9', location: 'I211' },
    { time: '09:00', end: '09:50', title: 'MATH F102', type: 'L3', location: 'F104' },
    { time: '10:00', end: '10:50', title: 'PHY F101', type: 'L2', location: 'F105' },
    { time: '16:00', end: '16:50', title: 'MATH F113', type: 'L1', location: 'F103' },
  ],
  Thursday: [
    { time: '08:00', end: '08:50', title: 'EEE F111', type: 'L2', location: 'F105' },
    { time: '09:00', end: '09:50', title: 'CS F111', type: 'L1', location: 'F105' },
    { time: '10:00', end: '11:50', title: 'PHY F101', type: 'P4', location: 'A222' },
    { time: '14:00', end: '14:50', title: 'HSS F101', type: 'L5', location: 'F103' },
    { time: '15:00', end: '15:50', title: 'MATH F113', type: 'T8', location: 'G208' },
  ],
  Friday: [
    { time: '08:00', end: '08:50', title: 'EEE F111', type: 'T8', location: 'J119' },
    { time: '09:00', end: '09:50', title: 'MATH F102', type: 'L3', location: 'F104' },
    { time: '14:00', end: '14:50', title: 'HSS F101', type: 'L5', location: 'F103' },
    { time: '16:00', end: '16:50', title: 'MATH F113', type: 'L1', location: 'F103' },
    { time: '17:00', end: '17:50', title: 'CS F111', type: 'L1', location: 'F105' },
  ],
  Saturday: [],
  Sunday: []
};

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const TIME_SLOTS = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

// ═══════════════════════════════════════════════════════════
// HELPER: Generate Deep Work Blocks
// ═══════════════════════════════════════════════════════════

const generateDeepWorkBlocks = (academicSchedule) => {
  const blocks = [];
  const lockInStart = 8 * 60;
  const lockInEnd = 18 * 60;

  const busyTimes = academicSchedule.map(item => ({
    start: parseInt(item.time.split(':')[0]) * 60 + parseInt(item.time.split(':')[1]),
    end: parseInt(item.end.split(':')[0]) * 60 + parseInt(item.end.split(':')[1])
  })).sort((a, b) => a.start - b.start);

  let current = lockInStart;

  for (const busy of busyTimes) {
    if (busy.start > current && busy.start <= lockInEnd) {
      const gapEnd = Math.min(busy.start, lockInEnd);
      const duration = gapEnd - current;

      if (duration >= 30) {
        const hours = Math.floor(current / 60);
        const mins = current % 60;
        const endHours = Math.floor(gapEnd / 60);
        const endMins = gapEnd % 60;

        blocks.push({
          time: `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`,
          end: `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`,
          title: duration >= 120 ? 'Deep Work' : 'Focus Block',
          type: 'DW',
          location: 'Startup',
          isDeepWork: true
        });
      }
    }
    current = Math.max(current, busy.end);
  }

  if (current < lockInEnd) {
    const hours = Math.floor(current / 60);
    const mins = current % 60;
    const duration = lockInEnd - current;

    if (duration >= 30) {
      blocks.push({
        time: `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`,
        end: '18:00',
        title: duration >= 120 ? 'Deep Work' : 'Focus Block',
        type: 'DW',
        location: 'Startup',
        isDeepWork: true
      });
    }
  }

  return blocks;
};

// ═══════════════════════════════════════════════════════════
// MAIN APP COMPONENT
// ═══════════════════════════════════════════════════════════

const App = () => {
  const { user, logout } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeView, setActiveView] = useState('dashboard');

  // Focus Timer State
  const [focusActive, setFocusActive] = useState(false);
  const [focusDuration, setFocusDuration] = useState(25);
  const [focusTimeLeft, setFocusTimeLeft] = useState(0);
  const [showFocusModal, setShowFocusModal] = useState(false);
  const [customMinutes, setCustomMinutes] = useState(25);

  // Music State
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [musicUrl, setMusicUrl] = useState(() => {
    return localStorage.getItem('musicUrl') || 'https://youtu.be/6rvv8bU3pKA?list=RD6rvv8bU3pKA';
  });
  const [showMusicModal, setShowMusicModal] = useState(false);
  const [tempMusicUrl, setTempMusicUrl] = useState('');

  // Todo State
  const [todos, setTodos] = useState(() => {
    try {
      const saved = localStorage.getItem('productivity-todos');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [newTodo, setNewTodo] = useState('');

  // Academic Schedule (from localStorage or default)
  const [academicSchedule, setAcademicSchedule] = useState(() => {
    try {
      const saved = localStorage.getItem('academicSchedule');
      return saved ? JSON.parse(saved) : DEFAULT_ACADEMIC_SCHEDULE;
    } catch {
      return DEFAULT_ACADEMIC_SCHEDULE;
    }
  });

  // Weekend Schedule (editable)
  const [weekendSchedule, setWeekendSchedule] = useState(() => {
    try {
      const saved = localStorage.getItem('weekendSchedule');
      return saved ? JSON.parse(saved) : { Saturday: [], Sunday: [] };
    } catch {
      return { Saturday: [], Sunday: [] };
    }
  });

  // Weekday User Blocks (personal blocks on Mon-Fri, separate from academic)
  const [weekdayUserBlocks, setWeekdayUserBlocks] = useState(() => {
    try {
      const saved = localStorage.getItem('weekdayUserBlocks');
      return saved ? JSON.parse(saved) : { Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [] };
    } catch {
      return { Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [] };
    }
  });

  // Timetable Upload Modal
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Drag state for weekend editing
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [dragEnd, setDragEnd] = useState(null);
  const [dragDay, setDragDay] = useState(null);

  // Notifications state
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notifiedClasses, setNotifiedClasses] = useState(new Set());
  const [toastNotification, setToastNotification] = useState(null); // In-app toast

  // Edit Modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingBlock, setEditingBlock] = useState(null);

  // Create Event Modal state (Google Calendar style)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newEvent, setNewEvent] = useState({
    id: null, // null for new events, set for editing existing
    title: '',
    day: null,
    startTime: '',
    endTime: '',
    description: '',
    color: 'teal'
  });

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Save todos to localStorage
  useEffect(() => {
    localStorage.setItem('productivity-todos', JSON.stringify(todos));
  }, [todos]);

  // Save academic schedule to localStorage
  useEffect(() => {
    localStorage.setItem('academicSchedule', JSON.stringify(academicSchedule));
  }, [academicSchedule]);

  // Save weekend schedule to localStorage
  useEffect(() => {
    localStorage.setItem('weekendSchedule', JSON.stringify(weekendSchedule));
  }, [weekendSchedule]);

  // Save weekday user blocks to localStorage
  useEffect(() => {
    localStorage.setItem('weekdayUserBlocks', JSON.stringify(weekdayUserBlocks));
  }, [weekdayUserBlocks]);

  // Save music URL
  useEffect(() => {
    localStorage.setItem('musicUrl', musicUrl);
  }, [musicUrl]);

  // Request notification permission and enable in-app toasts
  const requestNotificationPermission = async () => {
    setNotificationsEnabled(true);
    showToast('Notifications Enabled', 'You will be notified 5 minutes before each class.');

    // Also try browser notifications
    if ('Notification' in window && Notification.permission !== 'granted') {
      await Notification.requestPermission();
    }
  };

  // Show in-app toast notification (visible for 30 seconds)
  const showToast = (title, body) => {
    setToastNotification({ title, body, id: Date.now() });
    setTimeout(() => {
      setToastNotification(null);
    }, 30000); // 30 seconds
  };

  // Dismiss toast manually
  const dismissToast = () => {
    setToastNotification(null);
  };

  // Check for upcoming classes and send notifications
  useEffect(() => {
    if (!notificationsEnabled) return;

    const currentDayName = DAYS[currentTime.getDay() === 0 ? 6 : currentTime.getDay() - 1];
    const schedule = academicSchedule[currentDayName] || [];
    const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();

    schedule.forEach(classItem => {
      const classMinutes = parseInt(classItem.time.split(':')[0]) * 60 + parseInt(classItem.time.split(':')[1]);
      const minutesUntilClass = classMinutes - currentMinutes;
      const classKey = `${currentDayName}-${classItem.time}-${classItem.title}`;

      // Notify 5 minutes before
      if (minutesUntilClass === 5 && !notifiedClasses.has(classKey)) {
        // Show in-app toast (stays for 30 seconds)
        showToast(
          `⏰ Class in 5 minutes: ${classItem.title}`,
          `${classItem.type} at ${classItem.location} • Starting at ${classItem.time}`
        );

        // Also try browser notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`Class in 5 minutes: ${classItem.title}`, {
            body: `${classItem.type} at ${classItem.location}`,
            icon: '🔔',
            requireInteraction: true
          });
        }

        setNotifiedClasses(prev => new Set([...prev, classKey]));
      }
    });
  }, [currentTime, notificationsEnabled, notifiedClasses]);

  // Reset notified classes at midnight
  useEffect(() => {
    if (currentTime.getHours() === 0 && currentTime.getMinutes() === 0) {
      setNotifiedClasses(new Set());
    }
  }, [currentTime]);

  // Focus Timer Logic
  useEffect(() => {
    let interval;
    if (focusActive && focusTimeLeft > 0) {
      interval = setInterval(() => {
        setFocusTimeLeft(prev => {
          if (prev <= 1) {
            playPleasantSound();
            setFocusActive(false);
            setMusicPlaying(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [focusActive, focusTimeLeft]);

  // Pleasant completion sound
  const playPleasantSound = () => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();

    // Create a pleasant chime sequence
    const playNote = (freq, startTime, duration) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = freq;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0, audioContext.currentTime + startTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + startTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + startTime + duration);

      oscillator.start(audioContext.currentTime + startTime);
      oscillator.stop(audioContext.currentTime + startTime + duration);
    };

    // Pleasant chord progression (C major arpeggio)
    playNote(523.25, 0, 0.5);     // C5
    playNote(659.25, 0.15, 0.5);  // E5
    playNote(783.99, 0.3, 0.5);   // G5
    playNote(1046.50, 0.45, 0.8); // C6

    // Close audio context after sounds complete
    setTimeout(() => audioContext.close(), 2000);
  };

  const startFocusTimer = () => {
    setFocusTimeLeft(customMinutes * 60);
    setFocusDuration(customMinutes);
    setFocusActive(true);
    setShowFocusModal(false);
    setMusicPlaying(true);
  };

  const stopFocusTimer = () => {
    setFocusActive(false);
    setFocusTimeLeft(0);
    setMusicPlaying(false);
  };

  const toggleMusic = () => {
    setMusicPlaying(!musicPlaying);
  };

  const saveMusicUrl = () => {
    if (tempMusicUrl.trim()) {
      setMusicUrl(tempMusicUrl.trim());
      showToast('Music URL Saved', 'Your focus music has been updated. Start a focus session to play it.');
    }
    setShowMusicModal(false);
  };

  // Extract YouTube video ID
  const getYouTubeEmbedUrl = (url) => {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    if (match) {
      return `https://www.youtube.com/embed/${match[1]}?autoplay=1&loop=1&playlist=${match[1]}`;
    }
    return url;
  };

  // Todo functions
  const addTodo = () => {
    if (newTodo.trim()) {
      const newItem = { id: Date.now(), text: newTodo.trim(), done: false };
      setTodos(prevTodos => [...prevTodos, newItem]);
      setNewTodo('');
    }
  };

  const toggleTodo = (id) => {
    setTodos(prevTodos =>
      prevTodos.map(t => t.id === id ? { ...t, done: !t.done } : t)
    );
  };

  const deleteTodo = (id) => {
    setTodos(prevTodos => prevTodos.filter(t => t.id !== id));
  };

  // Drag handlers for creating blocks (works on all days, but blocks creation on academic slots)
  const handleMouseDown = (day, slotIndex, hasAcademicBlock = false) => {
    // Don't start drag if there's an academic block at this slot
    if (hasAcademicBlock) return;
    setIsDragging(true);
    setDragDay(day);
    setDragStart(slotIndex);
    setDragEnd(slotIndex);
  };

  const handleMouseMove = (slotIndex) => {
    if (isDragging) {
      setDragEnd(slotIndex);
    }
  };

  const handleMouseUp = () => {
    if (isDragging && dragDay && dragStart !== null && dragEnd !== null) {
      const startSlot = Math.min(dragStart, dragEnd);
      const endSlot = Math.max(dragStart, dragEnd);

      const startTime = TIME_SLOTS[startSlot];
      const endHour = parseInt(TIME_SLOTS[endSlot].split(':')[0]) + 1;
      const endTime = `${endHour.toString().padStart(2, '0')}:00`;

      // Open Google Calendar-style modal instead of prompt
      setNewEvent({
        title: '',
        day: dragDay,
        startTime: startTime,
        endTime: endTime,
        description: '',
        color: 'teal'
      });
      setShowCreateModal(true);
    }
    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
    setDragDay(null);
  };

  const handleCreateEvent = () => {
    if (newEvent.title.trim() && newEvent.day) {
      const isWeekend = newEvent.day === 'Saturday' || newEvent.day === 'Sunday';

      if (newEvent.id) {
        // Editing existing event
        if (isWeekend) {
          setWeekendSchedule(prev => ({
            ...prev,
            [newEvent.day]: prev[newEvent.day].map(b =>
              b.id === newEvent.id
                ? {
                  ...b,
                  time: newEvent.startTime,
                  end: newEvent.endTime,
                  title: newEvent.title.trim(),
                  location: newEvent.description || '',
                  color: newEvent.color
                }
                : b
            )
          }));
        } else {
          // Editing weekday user block
          setWeekdayUserBlocks(prev => ({
            ...prev,
            [newEvent.day]: prev[newEvent.day].map(b =>
              b.id === newEvent.id
                ? {
                  ...b,
                  time: newEvent.startTime,
                  end: newEvent.endTime,
                  title: newEvent.title.trim(),
                  location: newEvent.description || '',
                  color: newEvent.color
                }
                : b
            )
          }));
        }
      } else {
        // Creating new event
        const newBlock = {
          id: Date.now(),
          time: newEvent.startTime,
          end: newEvent.endTime,
          title: newEvent.title.trim(),
          type: 'Custom',
          location: newEvent.description || '',
          color: newEvent.color,
          isUserBlock: true
        };

        if (isWeekend) {
          setWeekendSchedule(prev => ({
            ...prev,
            [newEvent.day]: [...prev[newEvent.day], newBlock]
          }));
        } else {
          // Add to weekday user blocks
          setWeekdayUserBlocks(prev => ({
            ...prev,
            [newEvent.day]: [...(prev[newEvent.day] || []), newBlock]
          }));
        }
      }
      setShowCreateModal(false);
      setNewEvent({ id: null, title: '', day: null, startTime: '', endTime: '', description: '', color: 'teal' });
    }
  };

  const handleCancelCreate = () => {
    setShowCreateModal(false);
    setNewEvent({ id: null, title: '', day: null, startTime: '', endTime: '', description: '', color: 'teal' });
  };

  const handleDeleteEvent = () => {
    if (newEvent.id && newEvent.day) {
      const isWeekend = newEvent.day === 'Saturday' || newEvent.day === 'Sunday';

      if (isWeekend) {
        setWeekendSchedule(prev => ({
          ...prev,
          [newEvent.day]: prev[newEvent.day].filter(b => b.id !== newEvent.id)
        }));
      } else {
        // Delete from weekday user blocks
        setWeekdayUserBlocks(prev => ({
          ...prev,
          [newEvent.day]: prev[newEvent.day].filter(b => b.id !== newEvent.id)
        }));
      }
      setShowCreateModal(false);
      setNewEvent({ id: null, title: '', day: null, startTime: '', endTime: '', description: '', color: 'teal' });
    }
  };

  const handleContextMenu = (e, day, blockId) => {
    e.preventDefault();
    // Do nothing - we handle everything via click now
  };

  const handleBlockClick = (e, day, block) => {
    e.stopPropagation();
    e.preventDefault();

    // Check if this is an academic block (not editable) or a user block (editable)
    const isWeekend = day === 'Saturday' || day === 'Sunday';
    const isUserBlock = block.isUserBlock || isWeekend;

    // For academic blocks on weekdays, show read-only toast
    if (!isUserBlock) {
      setToastNotification({ title: 'Read Only', body: 'Academic schedule cannot be edited. Upload a new timetable to change it.', id: Date.now() });
      setTimeout(() => setToastNotification(null), 3000);
      return;
    }

    // Open the gcal modal with this block's data (for user blocks)
    setNewEvent({
      id: block.id,
      title: block.title,
      day: day,
      startTime: block.time,
      endTime: block.end,
      description: block.location || '',
      color: block.color || 'teal'
    });
    setShowCreateModal(true);
  };

  const handleBlockDoubleClick = (e, day, block) => {
    // Just use the same handler as single click
    handleBlockClick(e, day, block);
  };

  const handleSaveBlock = () => {
    if (!editingBlock) return;

    // Validate times
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(editingBlock.time) || !timeRegex.test(editingBlock.end)) {
      setToastNotification({ title: 'Invalid Format', body: 'Please use HH:MM format', id: Date.now() });
      setTimeout(() => setToastNotification(null), 3000);
      return;
    }

    setWeekendSchedule(prev => ({
      ...prev,
      [editingBlock.day]: prev[editingBlock.day].map(b =>
        b.id === editingBlock.id
          ? { ...b, title: editingBlock.title, time: editingBlock.time, end: editingBlock.end }
          : b
      )
    }));
    setShowEditModal(false);
    setEditingBlock(null);
  };

  // Format time with seconds
  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  // Format timer display
  const formatTimer = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Handler for uploaded timetable
  const handleScheduleExtracted = (newSchedule) => {
    setAcademicSchedule(newSchedule);
    showToast('Timetable Updated', 'Your academic schedule has been updated from the uploaded image.');
  };

  // Get full schedule for a day (academic + user blocks + deep work blocks)
  const getFullScheduleForDay = (day) => {
    if (day === 'Saturday' || day === 'Sunday') {
      return weekendSchedule[day] || [];
    }
    const academic = academicSchedule[day] || [];
    const userBlocks = weekdayUserBlocks[day] || [];
    const allBlocks = [...academic, ...userBlocks];
    const deepWork = generateDeepWorkBlocks(allBlocks);
    return [...allBlocks, ...deepWork].sort((a, b) => {
      const aMin = parseInt(a.time.split(':')[0]) * 60 + parseInt(a.time.split(':')[1]);
      const bMin = parseInt(b.time.split(':')[0]) * 60 + parseInt(b.time.split(':')[1]);
      return aMin - bMin;
    });
  };

  // Check if a time slot has a class (returns both academic and user blocks)
  const getClassAtSlot = (day, slotIndex) => {
    let schedule;
    if (day === 'Saturday' || day === 'Sunday') {
      schedule = weekendSchedule[day] || [];
    } else {
      // Combine academic schedule and user blocks for weekdays
      const academic = (academicSchedule[day] || []).map(item => ({ ...item, isAcademic: true }));
      const userBlocks = (weekdayUserBlocks[day] || []).map(item => ({ ...item, isUserBlock: true }));
      schedule = [...academic, ...userBlocks];
    }

    const slotTime = TIME_SLOTS[slotIndex];
    const slotMinutes = parseInt(slotTime.split(':')[0]) * 60;

    for (const item of schedule) {
      const startMinutes = parseInt(item.time.split(':')[0]) * 60 + parseInt(item.time.split(':')[1]);
      const endMinutes = parseInt(item.end.split(':')[0]) * 60 + parseInt(item.end.split(':')[1]);

      if (slotMinutes >= startMinutes && slotMinutes < endMinutes) {
        const isStart = slotMinutes === startMinutes;
        const span = Math.ceil((endMinutes - startMinutes) / 60);
        return { ...item, isStart, span };
      }
    }
    return null;
  };

  // Check if a slot has an academic block (for blocking drag)
  const hasAcademicBlockAtSlot = (day, slotIndex) => {
    if (day === 'Saturday' || day === 'Sunday') return false;
    const academic = academicSchedule[day] || [];
    const slotTime = TIME_SLOTS[slotIndex];
    const slotMinutes = parseInt(slotTime.split(':')[0]) * 60;

    for (const item of academic) {
      const startMinutes = parseInt(item.time.split(':')[0]) * 60 + parseInt(item.time.split(':')[1]);
      const endMinutes = parseInt(item.end.split(':')[0]) * 60 + parseInt(item.end.split(':')[1]);
      if (slotMinutes >= startMinutes && slotMinutes < endMinutes) {
        return true;
      }
    }
    return false;
  };

  const currentDayName = DAYS[currentTime.getDay() === 0 ? 6 : currentTime.getDay() - 1];

  return (
    <div className="command-center">
      {/* YouTube Music Player - invisible but in viewport for autoplay to work */}
      {musicPlaying && (
        <div
          style={{
            position: 'fixed',
            bottom: '0px',
            right: '0px',
            width: '1px',
            height: '1px',
            opacity: 0,
            pointerEvents: 'none',
            zIndex: -1
          }}
        >
          <iframe
            key={musicUrl}
            src={getYouTubeEmbedUrl(musicUrl)}
            allow="autoplay; encrypted-media"
            allowFullScreen
            title="Background Music"
            width="300"
            height="200"
            style={{ border: 'none' }}
          />
        </div>
      )}

      {/* In-App Toast Notification */}
      <AnimatePresence>
        {toastNotification && (
          <motion.div
            initial={{ opacity: 0, y: -100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -100 }}
            className="toast-notification"
          >
            <div className="toast-content">
              <Bell size={20} className="toast-icon" />
              <div className="toast-text">
                <p className="toast-title">{toastNotification.title}</p>
                <p className="toast-body">{toastNotification.body}</p>
              </div>
              <button onClick={dismissToast} className="toast-close">
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Focus Modal */}
      <AnimatePresence>
        {showFocusModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay"
            onClick={() => setShowFocusModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="modal-content"
              onClick={e => e.stopPropagation()}
            >
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>
                Start Focus Session
              </h3>

              <div style={{ marginBottom: '1.5rem' }}>
                <label className="input-label">Duration (minutes)</label>
                <input
                  type="number"
                  value={customMinutes}
                  onChange={e => setCustomMinutes(Math.max(1, parseInt(e.target.value) || 1))}
                  className="input-field"
                  min="1"
                  max="180"
                />
              </div>

              <div className="info-box">
                <p className="info-title">🚫 Sites Blocked During Focus:</p>
                <p className="info-text">Instagram, Twitter/X, Reddit</p>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setShowFocusModal(false)} className="btn-secondary" style={{ flex: 1 }}>
                  Cancel
                </button>
                <button onClick={startFocusTimer} className="btn-primary" style={{ flex: 1 }}>
                  <Play size={16} /> Start Focus
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Music URL Modal */}
      <AnimatePresence>
        {showMusicModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay"
            onClick={() => setShowMusicModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="modal-content"
              onClick={e => e.stopPropagation()}
            >
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>
                Set Focus Music
              </h3>

              <div style={{ marginBottom: '1rem' }}>
                <label className="input-label">YouTube URL</label>
                <input
                  type="text"
                  value={tempMusicUrl}
                  onChange={e => setTempMusicUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                  className="input-field"
                />
              </div>

              <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '1.5rem' }}>
                Current: {musicUrl.substring(0, 40)}...
              </p>

              <div className="flex gap-3">
                <button onClick={() => setShowMusicModal(false)} className="btn-secondary" style={{ flex: 1 }}>
                  Cancel
                </button>
                <button onClick={saveMusicUrl} className="btn-primary" style={{ flex: 1 }}>
                  <Check size={16} /> Save
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Google Calendar-Style Create Event Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay"
            onClick={handleCancelCreate}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="gcal-modal"
              onClick={e => e.stopPropagation()}
            >
              {/* Title Input - Large, prominent like Google Calendar */}
              <input
                type="text"
                value={newEvent.title}
                onChange={e => setNewEvent({ ...newEvent, title: e.target.value })}
                placeholder="Add title"
                className="gcal-title-input"
                autoFocus
              />

              {/* Date/Time Row */}
              <div className="gcal-datetime-row">
                <div className="gcal-datetime-icon">
                  <Clock size={18} />
                </div>
                <div className="gcal-datetime-content">
                  <span className="gcal-day-label">{newEvent.day}</span>
                  <div className="gcal-time-selectors">
                    <input
                      type="time"
                      value={newEvent.startTime}
                      onChange={e => setNewEvent({ ...newEvent, startTime: e.target.value })}
                      className="gcal-time-input"
                    />
                    <span className="gcal-time-divider">–</span>
                    <input
                      type="time"
                      value={newEvent.endTime}
                      onChange={e => setNewEvent({ ...newEvent, endTime: e.target.value })}
                      className="gcal-time-input"
                    />
                  </div>
                </div>
              </div>

              {/* Description/Notes */}
              <div className="gcal-description-row">
                <div className="gcal-datetime-icon">
                  <Edit3 size={18} />
                </div>
                <input
                  type="text"
                  value={newEvent.description}
                  onChange={e => setNewEvent({ ...newEvent, description: e.target.value })}
                  placeholder="Add description or location"
                  className="gcal-description-input"
                />
              </div>

              {/* Color Selection */}
              <div className="gcal-color-row">
                <span className="gcal-color-label">Color</span>
                <div className="gcal-color-options">
                  {['teal', 'coral', 'purple', 'blue', 'green'].map(color => (
                    <button
                      key={color}
                      className={`gcal-color-btn ${color} ${newEvent.color === color ? 'selected' : ''}`}
                      onClick={() => setNewEvent({ ...newEvent, color })}
                    />
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="gcal-actions">
                {/* Delete button - only show when editing existing event */}
                {newEvent.id && (
                  <button onClick={handleDeleteEvent} className="gcal-btn-delete" title="Delete event">
                    <Trash2 size={16} />
                  </button>
                )}
                <div className="gcal-actions-right">
                  <button onClick={handleCancelCreate} className="gcal-btn-cancel">
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateEvent}
                    className="gcal-btn-save"
                    disabled={!newEvent.title.trim()}
                  >
                    Save
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="header">
        <div className="header-left">
          <div className="status-indicator">
            <div className={`status-dot ${focusActive ? 'active' : ''}`} />
            <span className="status-text">
              {focusActive ? 'FOCUS MODE' : 'READY'}
            </span>
          </div>
          <h1 className="title">Daily Protocol</h1>
        </div>

        <div className="header-center">
          <div className="time-display">{formatTime(currentTime)}</div>
          <p className="date-display">
            {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </p>
        </div>

        <div className="header-right">
          <button
            onClick={requestNotificationPermission}
            className={`icon-btn ${notificationsEnabled ? 'active' : ''}`}
            title="Enable class notifications"
          >
            <Bell size={18} />
          </button>
          <button
            onClick={() => setShowUploadModal(true)}
            className="icon-btn"
            title="Upload academic timetable"
          >
            <Upload size={18} />
          </button>
          <div className="nav-tabs">
            <button
              className={`nav-btn ${activeView === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveView('dashboard')}
            >
              Dashboard
            </button>
            <button
              className={`nav-btn ${activeView === 'timetable' ? 'active' : ''}`}
              onClick={() => setActiveView('timetable')}
            >
              Week View
            </button>
          </div>
          <button
            onClick={logout}
            className="icon-btn"
            title={`Sign out${user?.displayName ? ` (${user.displayName.split(' ')[0]})` : ''}`}
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        <AnimatePresence mode="wait">
          {activeView === 'dashboard' ? (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="dashboard-grid"
            >
              {/* Focus Timer Card */}
              <div className="card focus-card">
                <div className="card-header">
                  <span className="card-label">Focus Timer</span>
                  <div className="flex gap-2">
                    <button onClick={() => { setTempMusicUrl(musicUrl); setShowMusicModal(true); }} className="icon-btn-sm" title="Set music URL">
                      <Link size={14} />
                    </button>
                    <button onClick={toggleMusic} className="icon-btn-sm" title={musicPlaying ? 'Pause music' : 'Play music'}>
                      {musicPlaying ? <Volume2 size={14} /> : <VolumeX size={14} />}
                    </button>
                  </div>
                </div>

                {focusActive ? (
                  <div className="focus-active">
                    <div className="timer-display">{formatTimer(focusTimeLeft)}</div>
                    <div className="timer-progress">
                      <div
                        className="timer-progress-fill"
                        style={{ width: `${(focusTimeLeft / (focusDuration * 60)) * 100}%` }}
                      />
                    </div>
                    <div className="blocked-notice">
                      🚫 Instagram, Twitter, Reddit blocked
                    </div>
                    <button onClick={stopFocusTimer} className="btn-danger">
                      <Square size={16} /> End Session
                    </button>
                  </div>
                ) : (
                  <div className="focus-idle">
                    <div className="focus-icon">
                      <Target size={48} />
                    </div>
                    <p className="focus-hint">Lock in. Build the startup.</p>
                    <button onClick={() => setShowFocusModal(true)} className="btn-primary">
                      <Play size={16} /> Start Lock-In
                    </button>
                  </div>
                )}

                <button onClick={toggleMusic} className="music-btn">
                  <Music size={16} />
                  {musicPlaying ? 'Music Playing' : 'Play Focus Music'}
                </button>
              </div>

              {/* Today's Schedule with Time Blocks */}
              <div className="card schedule-card">
                <div className="card-header">
                  <span className="card-label">Today's Schedule</span>
                  <span className="day-badge">{currentDayName}</span>
                </div>
                <div className="schedule-list">
                  {getFullScheduleForDay(currentDayName).length > 0 ? (
                    getFullScheduleForDay(currentDayName).map((item, idx) => (
                      <div
                        key={idx}
                        className={`schedule-item ${item.isDeepWork ? 'deep-work' : ''}`}
                      >
                        <span className="schedule-time">{item.time} - {item.end}</span>
                        <div className="schedule-info">
                          <span className={`schedule-title ${item.isDeepWork ? 'startup' : ''}`}>
                            {item.title}
                          </span>
                          <span className="schedule-location">
                            {item.type} {item.location && `• ${item.location}`}
                          </span>
                        </div>
                        {item.isDeepWork && <Flame size={16} className="deep-work-icon" />}
                      </div>
                    ))
                  ) : (
                    <div className="empty-state">
                      <Flame size={32} />
                      <p>No schedule. Full deep work day.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Todo List */}
              <div className="card todo-card">
                <div className="card-header">
                  <span className="card-label">To-Do List</span>
                  <span className="todo-count">{todos.filter(t => !t.done).length} left</span>
                </div>

                <div className="todo-input-row">
                  <input
                    type="text"
                    value={newTodo}
                    onChange={e => setNewTodo(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTodo();
                      }
                    }}
                    placeholder="Add a task..."
                    className="input-field"
                  />
                  <button onClick={addTodo} className="btn-icon">
                    <Plus size={18} />
                  </button>
                </div>

                <div className="todo-list">
                  {todos.map(todo => (
                    <div key={todo.id} className={`todo-item ${todo.done ? 'done' : ''}`}>
                      <button onClick={() => toggleTodo(todo.id)} className="todo-check">
                        {todo.done && <Check size={14} />}
                      </button>
                      <span className="todo-text">{todo.text}</span>
                      <button onClick={() => deleteTodo(todo.id)} className="todo-delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  {todos.length === 0 && (
                    <p className="empty-hint">No tasks yet. Add one above.</p>
                  )}
                </div>
              </div>

              {/* Quick Rituals */}
              <div className="card rituals-card">
                <div className="card-header">
                  <span className="card-label">Daily Rituals</span>
                </div>
                <div className="rituals-grid">
                  <div className="ritual-item"><Sun size={16} /> <span>6:30 Wake + Sunlight</span></div>
                  <div className="ritual-item"><BookOpen size={16} /> <span>7:00 Pre-read</span></div>
                  <div className="ritual-item"><Coffee size={16} /> <span>7:30 Breakfast</span></div>
                  <div className="ritual-item"><Target size={16} /> <span>8:00-18:00 Lock-In</span></div>
                  <div className="ritual-item"><Dumbbell size={16} /> <span>19:00 Exercise</span></div>
                  <div className="ritual-item"><Heart size={16} /> <span>22:00 Connection</span></div>
                  <div className="ritual-item"><Moon size={16} /> <span>23:30 Sleep</span></div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="timetable"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="timetable-view"
            >
              <div className="timetable-hint">
                💡 <strong>All days:</strong> Click and drag to add personal blocks. Academic blocks are read-only.
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="upload-hint-btn"
                >
                  📸 Upload Timetable
                </button>
              </div>

              {/* Week Timetable Grid */}
              <div
                className="timetable-grid"
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                {/* Header Row */}
                <div className="timetable-header-cell">Time</div>
                {DAYS.map(day => (
                  <div
                    key={day}
                    className={`timetable-header-cell ${day === currentDayName ? 'current' : ''} editable`}
                  >
                    {day.slice(0, 3)}
                  </div>
                ))}

                {/* Time Slots & Cells */}
                {TIME_SLOTS.map((slot, slotIndex) => (
                  <React.Fragment key={slot}>
                    <div className="timetable-time-cell">{slot}</div>
                    {DAYS.map(day => {
                      const classInfo = getClassAtSlot(day, slotIndex);
                      const isWeekend = day === 'Saturday' || day === 'Sunday';
                      const hasAcademic = hasAcademicBlockAtSlot(day, slotIndex);
                      const isDragTarget = isDragging && dragDay === day &&
                        slotIndex >= Math.min(dragStart, dragEnd) &&
                        slotIndex <= Math.max(dragStart, dragEnd);

                      // Skip cells that are covered by multi-hour blocks
                      if (classInfo && !classInfo.isStart) {
                        return null;
                      }

                      // Determine if this block is editable (user block or weekend)
                      const isEditable = classInfo && (classInfo.isUserBlock || isWeekend);

                      return (
                        <div
                          key={day}
                          className={`timetable-cell ${classInfo ? 'has-class' : ''} ${isWeekend ? 'weekend' : ''} ${isDragTarget ? 'drag-target' : ''} ${hasAcademic ? 'has-academic' : ''}`}
                          style={classInfo?.span > 1 ? { gridRow: `span ${classInfo.span}` } : {}}
                          onMouseDown={() => !classInfo && handleMouseDown(day, slotIndex, hasAcademic)}
                          onMouseMove={() => handleMouseMove(slotIndex)}
                          onContextMenu={(e) => classInfo && handleContextMenu(e, day, classInfo.id)}
                          onDoubleClick={(e) => classInfo && handleBlockDoubleClick(e, day, classInfo)}
                        >
                          {classInfo && (
                            <div
                              className={`class-block ${classInfo.isDeepWork ? 'deep-work-block' : ''} ${classInfo.isUserBlock ? 'user-block' : ''} ${classInfo.isAcademic ? 'academic-block' : ''}`}
                              onClick={(e) => handleBlockClick(e, day, classInfo)}
                              style={{ cursor: isEditable ? 'pointer' : 'default' }}
                            >
                              <span className="class-title">{classInfo.title}</span>
                              <span className="class-meta">
                                {classInfo.type} {classInfo.location && `• ${classInfo.location}`}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Edit Block Modal */}
        <AnimatePresence>
          {showEditModal && editingBlock && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="modal-overlay"
              onClick={() => setShowEditModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="modal-content"
                onClick={e => e.stopPropagation()}
              >
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>
                  Edit Session
                </h3>

                <div className="input-group">
                  <label>Activity</label>
                  <input
                    type="text"
                    className="input-field"
                    value={editingBlock.title}
                    onChange={e => setEditingBlock({ ...editingBlock, title: e.target.value })}
                  />
                </div>

                <div className="input-row">
                  <div className="input-group">
                    <label>Start Time</label>
                    <input
                      type="time"
                      className="input-field"
                      value={editingBlock.time}
                      onChange={e => setEditingBlock({ ...editingBlock, time: e.target.value })}
                    />
                  </div>
                  <div className="input-group">
                    <label>End Time</label>
                    <input
                      type="time"
                      className="input-field"
                      value={editingBlock.end}
                      onChange={e => setEditingBlock({ ...editingBlock, end: e.target.value })}
                    />
                  </div>
                </div>

                <div className="modal-actions">
                  <button onClick={() => setShowEditModal(false)} className="btn-secondary">Cancel</button>
                  <button onClick={handleSaveBlock} className="btn-primary">Save Changes</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Timetable Upload Modal */}
      <TimetableUpload
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onScheduleExtracted={handleScheduleExtracted}
      />
    </div >
  );
};

export default App;