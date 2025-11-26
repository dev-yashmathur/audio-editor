import React from 'react';
import useAudioStore from '../../store/useAudioStore';

// Inline SVGs for reliability
const Icons = {
    Undo: (props) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M3 7v6h6" /><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" /></svg>,
    Redo: (props) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M21 7v6h-6" /><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 3.7" /></svg>,
    Rewind: (props) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polygon points="11 19 2 12 11 5 11 19" /><polygon points="22 19 13 12 22 5 22 19" /></svg>,
    FastForward: (props) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polygon points="13 19 22 12 13 5 13 19" /><polygon points="2 19 11 12 2 5 2 19" /></svg>,
    Play: (props) => <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polygon points="5 3 19 12 5 21 5 3" /></svg>,
    Pause: (props) => <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>,
    Square: (props) => <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /></svg>,
    Scissors: (props) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><line x1="20" y1="4" x2="8.12" y2="15.88" /><line x1="14.47" y1="14.48" x2="20" y2="20" /><line x1="8.12" y1="8.12" x2="12" y2="12" /></svg>,
    Trash2: (props) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>,
    Copy: (props) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>,
    Magnet: (props) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m6 15-4-4 6.75-6.77a7.79 7.79 0 0 1 11 11L13 22l-4-4" /><path d="m11 8 6 6" /></svg>,
    ZoomIn: (props) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" /></svg>,
    ZoomOut: (props) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="8" y1="11" x2="14" y2="11" /></svg>
};

const ActionToolbar = () => {
    const { isPlaying, togglePlayback, setIsPlaying, currentTime, splitClip, deleteClips, duplicateClips, selection, undo, redo, skipTime } = useAudioStore();

    console.log('ActionToolbar render. currentTime:', currentTime, typeof currentTime);

    const formatTime = (time) => {
        try {
            if (time === undefined || time === null || typeof time !== 'number' || isNaN(time)) return '0:00.00';
            const minutes = Math.floor(time / 60);
            const seconds = Math.floor(time % 60);
            const milliseconds = Math.floor((time % 1) * 100);
            return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
        } catch (e) {
            console.error('formatTime error:', e);
            return 'Error';
        }
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
                <button title="Undo" onClick={undo} style={{ cursor: 'pointer', border: 'none', background: 'none', color: 'var(--text-muted)', minWidth: '24px', minHeight: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icons.Undo width={18} height={18} />
                </button>
                <button title="Redo" onClick={redo} style={{ cursor: 'pointer', border: 'none', background: 'none', color: 'var(--text-muted)', minWidth: '24px', minHeight: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icons.Redo width={18} height={18} />
                </button>
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

                    <button onClick={() => skipTime(-10)} style={{ cursor: 'pointer', border: 'none', background: 'none', color: 'var(--text-muted)', minWidth: '24px', minHeight: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="-10s">
                        <Icons.Rewind width={16} height={16} />
                    </button>

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
                            justifyContent: 'center',
                            minWidth: '32px',
                            minHeight: '32px',
                            color: isPlaying ? 'white' : 'var(--text-main)'
                        }}
                    >
                        {isPlaying ?
                            <Icons.Pause width={18} height={18} fill="white" stroke="white" /> :
                            <Icons.Play width={18} height={18} fill="white" stroke="currentColor" />
                        }
                    </button>

                    <button onClick={() => skipTime(10)} style={{ cursor: 'pointer', border: 'none', background: 'none', color: 'var(--text-muted)', minWidth: '24px', minHeight: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="+10s">
                        <Icons.FastForward width={16} height={16} />
                    </button>

                    <button onClick={() => setIsPlaying(false)} style={{ cursor: 'pointer', border: 'none', background: 'none', color: 'var(--text-muted)', minWidth: '24px', minHeight: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icons.Square width={16} height={16} fill="currentColor" stroke="currentColor" />
                    </button>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <button
                        onClick={() => splitClip(currentTime)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            backgroundColor: 'rgba(45, 127, 249, 0.2)',
                            color: 'var(--primary)',
                            padding: '6px 12px',
                            borderRadius: '4px',
                            fontWeight: 600,
                            fontSize: '13px',
                            cursor: 'pointer',
                            border: 'none',
                            minWidth: '60px',
                            justifyContent: 'center'
                        }}
                    >
                        <Icons.Scissors width={16} height={16} /> SPLIT
                    </button>
                    <button
                        title="Delete"
                        onClick={() => deleteClips(selection)}
                        style={{ cursor: 'pointer', border: 'none', background: 'none', color: 'var(--text-muted)', minWidth: '24px', minHeight: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <Icons.Trash2 width={18} height={18} />
                    </button>
                    <button
                        title="Duplicate"
                        onClick={() => duplicateClips(selection)}
                        style={{ cursor: 'pointer', border: 'none', background: 'none', color: 'var(--text-muted)', minWidth: '24px', minHeight: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <Icons.Copy width={18} height={18} />
                    </button>
                </div>
            </div>

            {/* Right Group: View */}
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <button title="Snap to Grid" style={{ color: 'var(--primary)', border: 'none', background: 'none', cursor: 'pointer', minWidth: '24px', minHeight: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icons.Magnet width={18} height={18} />
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Icons.ZoomOut width={16} height={16} color="var(--text-muted)" />
                    <input type="range" min="10" max="200" defaultValue="50" style={{ width: '80px' }} />
                    <Icons.ZoomIn width={16} height={16} color="var(--text-muted)" />
                </div>
            </div>
        </div>
    );
};

export default ActionToolbar;
