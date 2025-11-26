import React, { useEffect } from 'react';
import useAudioStore from '../store/useAudioStore';

const KeyboardShortcuts = () => {
    const {
        togglePlayback,
        undo,
        redo,
        deleteClips,
        duplicateClips,
        splitClip,
        currentTime,
        selection,
        skipTime
    } = useAudioStore();

    useEffect(() => {
        const handleKeyDown = (e) => {
            // Ignore if typing in an input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            // Space: Play/Pause
            if (e.code === 'Space') {
                e.preventDefault();
                togglePlayback();
            }

            // Undo: Cmd+Z / Ctrl+Z
            if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                undo();
            }

            // Redo: Cmd+Shift+Z / Ctrl+Shift+Z / Cmd+Y
            if (((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'z') || ((e.metaKey || e.ctrlKey) && e.key === 'y')) {
                e.preventDefault();
                redo();
            }

            // Delete: Backspace / Delete
            if (e.key === 'Backspace' || e.key === 'Delete') {
                if (selection.length > 0) {
                    e.preventDefault();
                    deleteClips(selection);
                }
            }

            // Duplicate: Cmd+D
            if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
                e.preventDefault();
                duplicateClips(selection);
            }

            // Split: Cmd+B
            if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
                e.preventDefault();
                splitClip(currentTime);
            }

            // Skip: Left/Right Arrows
            if (e.key === 'ArrowLeft') {
                skipTime(-10);
            }
            if (e.key === 'ArrowRight') {
                skipTime(10);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [togglePlayback, undo, redo, deleteClips, duplicateClips, splitClip, currentTime, selection, skipTime]);

    return null; // This component doesn't render anything
};

export default KeyboardShortcuts;
