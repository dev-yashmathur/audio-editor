import React from 'react';
import { Scissors, Trash2, Copy, Magnet, ZoomIn, ZoomOut, Undo, Redo, Play, Pause, Square } from 'lucide-react';
import useAudioStore from '../../store/useAudioStore';

const ActionToolbar = () => {
    const { isPlaying, togglePlayback, setIsPlaying, currentTime } = useAudioStore();

    const formatTime = (time) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        const milliseconds = Math.floor((time % 1) * 100);
        return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
    };

    return (
        <div style={{
            height: '48px',
            backgroundColor: 'var(--bg-panel)',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            justifyContent: 'space-between'
        }}>
            {/* Left Group: History */}
            <div style={{ display: 'flex', gap: '8px' }}>
                <button title="Undo"><Undo size={18} /></button>
                <button title="Redo"><Redo size={18} /></button>
            </div>

            {/* Center Group: Transport & Actions */}
            <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                {/* Transport */}
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', borderRight: '1px solid var(--border)', paddingRight: '24px' }}>
                    <div style={{
                        fontFamily: 'monospace',
                        fontSize: '14px',
                        color: 'var(--primary)',
                        backgroundColor: 'rgba(0,0,0,0.2)',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        minWidth: '80px',
                        textAlign: 'center'
                    }}>
                        {formatTime(currentTime)}
                    </div>
                    <button
                        onClick={togglePlayback}
                        style={{
                            backgroundColor: isPlaying ? 'var(--primary)' : 'transparent',
                            padding: '8px',
                            borderRadius: '50%',
                            border: isPlaying ? 'none' : '1px solid var(--text-muted)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        {isPlaying ? <Pause size={18} fill="white" color="white" /> : <Play size={18} fill="white" color="var(--text-main)" />}
                    </button>
                    <button onClick={() => setIsPlaying(false)} style={{ cursor: 'pointer' }}><Square size={16} fill="var(--text-muted)" /></button>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <button style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        backgroundColor: 'rgba(45, 127, 249, 0.2)',
                        color: 'var(--primary)',
                        padding: '6px 12px',
                        borderRadius: '4px',
                        fontWeight: 600,
                        fontSize: '13px'
                    }}>
                        <Scissors size={16} /> SPLIT
                    </button>
                    <button title="Delete"><Trash2 size={18} /></button>
                    <button title="Duplicate"><Copy size={18} /></button>
                </div>
            </div>

            {/* Right Group: View */}
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <button title="Snap to Grid" style={{ color: 'var(--primary)' }}><Magnet size={18} /></button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ZoomOut size={16} />
                    <input type="range" min="10" max="200" defaultValue="50" style={{ width: '80px' }} />
                    <ZoomIn size={16} />
                </div>
            </div>
        </div>
    );
};

export default ActionToolbar;
