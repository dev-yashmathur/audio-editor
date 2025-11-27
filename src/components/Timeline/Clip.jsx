import React, { useMemo, useState, useEffect, useRef } from 'react';
import useAudioStore from '../../store/useAudioStore';

const Clip = ({ clip, zoom }) => {
    const { selection, setSelection, moveClip, pushHistoryState } = useAudioStore();
    const isSelected = selection.includes(clip.id);

    const [isDragging, setIsDragging] = useState(false);
    const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
    const dragOffsetRef = useRef({ x: 0, y: 0 });
    const clipRef = useRef(null);

    const width = clip.duration * zoom;

    // Generate SVG path for waveform
    const waveformPath = useMemo(() => {
        if (!clip.waveform || clip.waveform.length === 0) return '';

        const points = clip.waveform;
        const step = width / points.length;

        // Create path: Move to start, line to each point (top), then mirror for bottom
        let path = `M 0 ${50}`; // Start middle

        // Top half
        points.forEach((val, i) => {
            const x = i * step;
            const y = 50 - (val * 50); // Scale to 50px height (half of 100px track)
            path += ` L ${x} ${y}`;
        });

        // Bottom half (mirror)
        for (let i = points.length - 1; i >= 0; i--) {
            const x = i * step;
            const y = 50 + (points[i] * 50);
            path += ` L ${x} ${y}`;
        }

        path += ' Z';
        return path;
    }, [clip.waveform, width]);

    const handleMouseDown = (e) => {
        e.stopPropagation();
        e.preventDefault(); // Prevent text selection
        pushHistoryState(); // Save state before drag
        setSelection([clip.id]); // Single select for now

        const rect = clipRef.current.getBoundingClientRect();
        dragOffsetRef.current = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };

        setDragPosition({
            x: rect.left,
            y: rect.top
        });
        setIsDragging(true);
    };

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isDragging) return;

            setDragPosition({
                x: e.clientX - dragOffsetRef.current.x,
                y: e.clientY - dragOffsetRef.current.y
            });
        };

        const handleMouseUp = (e) => {
            if (!isDragging) return;

            setIsDragging(false);

            // Calculate new time and track
            // We need to find the timeline container to get relative X
            // And find the track element under the cursor

            // 1. Find Track
            const elements = document.elementsFromPoint(e.clientX, e.clientY);
            const trackElement = elements.find(el => el.getAttribute('data-track-id'));
            const newTrackId = trackElement ? trackElement.getAttribute('data-track-id') : null;

            // 2. Find Time
            // We can use the drop X position relative to the track element
            let newTime = clip.startTime;

            if (trackElement) {
                const trackRect = trackElement.getBoundingClientRect();
                const relativeX = (e.clientX - dragOffsetRef.current.x) - trackRect.left;
                newTime = Math.max(0, relativeX / zoom);

                // Snap Logic
                const { snapEnabled, gridSize, clips } = useAudioStore.getState();

                if (snapEnabled) {
                    const snapThresholdPixels = 15; // Snap if within 15px
                    const snapThresholdTime = snapThresholdPixels / zoom;

                    let closestSnapTime = null;
                    let minDistance = Infinity;

                    // 1. Grid Snapping
                    if (gridSize > 0) {
                        const gridSnap = Math.round(newTime / gridSize) * gridSize;
                        const dist = Math.abs(newTime - gridSnap);
                        if (dist < minDistance) {
                            minDistance = dist;
                            closestSnapTime = gridSnap;
                        }
                    }

                    // 2. Clip Snapping (Snap Start to Start/End of other clips)
                    clips.forEach(otherClip => {
                        if (otherClip.id === clip.id) return; // Skip self

                        // Snap to Start
                        const distStart = Math.abs(newTime - otherClip.startTime);
                        if (distStart < minDistance) {
                            minDistance = distStart;
                            closestSnapTime = otherClip.startTime;
                        }

                        // Snap to End
                        const otherEnd = otherClip.startTime + otherClip.duration;
                        const distEnd = Math.abs(newTime - otherEnd);
                        if (distEnd < minDistance) {
                            minDistance = distEnd;
                            closestSnapTime = otherEnd;
                        }

                        // Snap Dragged End to Start/End of other clips?
                        // (newTime + clip.duration) ~= otherClip.startTime
                        // newTime ~= otherClip.startTime - clip.duration
                        const distEndToStart = Math.abs((newTime + clip.duration) - otherClip.startTime);
                        if (distEndToStart < minDistance) {
                            minDistance = distEndToStart;
                            closestSnapTime = otherClip.startTime - clip.duration;
                        }

                        // (newTime + clip.duration) ~= otherClip.end
                        const distEndToEnd = Math.abs((newTime + clip.duration) - otherEnd);
                        if (distEndToEnd < minDistance) {
                            minDistance = distEndToEnd;
                            closestSnapTime = otherEnd - clip.duration;
                        }
                    });

                    // Apply Snap if within threshold
                    if (closestSnapTime !== null && minDistance <= snapThresholdTime) {
                        newTime = closestSnapTime;
                    }
                }
            } else {
                // If dropped outside a track, maybe keep original time or calculate based on timeline container?
                // For now, let's try to keep it relative to where it was if possible, or just cancel if completely outside?
                // Better UX: If dropped on "no track", it snaps back (no change).
                // But if we want to support "drag to empty space to create track" later, we'd handle it here.
                // For now, if no track found, we don't move it (or we move it to the original track if we can calculate time).
                // Let's assume if no track is found, we cancel the move (or keep previous values).
                // Actually, let's try to find the timeline container to at least update time if on the same track area but missed the div?
                // But the track div covers the whole lane.

                // If newTrackId is null, we might want to cancel or just update time on current track if Y is close?
                // Let's stick to: if no track found, don't move.
            }

            if (newTrackId) {
                moveClip(clip.id, newTime, newTrackId);
            }
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, zoom, clip.id, clip.startTime, moveClip]);

    const style = {
        position: isDragging ? 'fixed' : 'absolute',
        left: isDragging ? `${dragPosition.x}px` : `${clip.startTime * zoom}px`,
        top: isDragging ? `${dragPosition.y}px` : 0,
        width: `${width}px`,
        height: isDragging ? '100px' : '100%', // Fixed height during drag to match track height
        backgroundColor: isSelected ? 'var(--primary)' : 'var(--bg-clip)',
        border: isSelected ? '1px solid white' : '1px solid var(--border)',
        borderRadius: '4px',
        overflow: 'hidden',
        cursor: isDragging ? 'grabbing' : 'grab',
        zIndex: isDragging ? 1000 : (isSelected ? 10 : 1), // High z-index during drag
        opacity: isDragging ? 0.8 : 1,
        pointerEvents: isDragging ? 'none' : 'auto' // Important: allow events to pass through to underlying tracks for detection
    };

    // When dragging, we need a placeholder in the original spot? 
    // Or just move the clip itself? The request said "move freely", implying the clip itself moves.
    // If we use position: fixed, it pops out of the flow.
    // We might want to keep a "ghost" in the original spot if we want to show where it was, 
    // but usually "free drag" means the object itself moves.
    // However, if we move the object itself, we need to make sure `pointerEvents: none` is set 
    // so `document.elementsFromPoint` can see the track *under* the clip.

    return (
        <div
            ref={clipRef}
            onMouseDown={handleMouseDown}
            style={style}
        >
            {/* Waveform Visualization */}
            {clip.waveform && (
                <svg
                    width="100%"
                    height="100%"
                    preserveAspectRatio="none"
                    style={{ position: 'absolute', top: 0, left: 0, opacity: 0.8 }}
                >
                    <path d={waveformPath} fill={isSelected ? 'white' : 'var(--primary)'} />
                </svg>
            )}

            <div style={{
                position: 'absolute',
                top: '2px',
                left: '4px',
                fontSize: '10px',
                color: isSelected ? 'var(--bg-panel)' : 'white',
                pointerEvents: 'none',
                fontWeight: 600,
                textShadow: isSelected ? 'none' : '0 1px 2px rgba(0,0,0,0.5)'
            }}>
                Clip
            </div>
        </div>
    );
};

export default Clip;
