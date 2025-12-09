import React, { useMemo, useState, useEffect, useRef } from 'react';
import useAudioStore from '../../store/useAudioStore';

const Clip = ({ clip, zoom }) => {
    const { selection, setSelection, moveClip, pushHistoryState, assets } = useAudioStore();
    const isSelected = selection.includes(clip.id);

    const asset = assets.find(a => a.id === clip.assetId);
    const clipName = asset ? asset.name : 'Clip';

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
        let path = `M 0 ${50} `; // Start middle

        // Top half
        points.forEach((val, i) => {
            const x = i * step;
            const y = 50 - (val * 50); // Scale to 50px height (half of 100px track)
            path += ` L ${x} ${y} `;
        });

        // Bottom half (mirror)
        for (let i = points.length - 1; i >= 0; i--) {
            const x = i * step;
            const y = 50 + (points[i] * 50);
            path += ` L ${x} ${y} `;
        }

        path += ' Z';
        return path;
    }, [clip.waveform, width]);

    const handleMouseDown = (e) => {
        e.stopPropagation();
        e.preventDefault(); // Prevent text selection
        pushHistoryState(); // Save state before drag

        if (e.shiftKey) {
            // Toggle selection
            if (isSelected) {
                setSelection(selection.filter(id => id !== clip.id));
            } else {
                setSelection([...selection, clip.id]);
            }
        } else {
            // If not holding shift
            if (!isSelected) {
                // If clicking an unselected clip, select only this one
                setSelection([clip.id]);
            }
            // If already selected, do nothing (preserve multi-selection for potential drag)
        }

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

            // Calculate new time and track for the DRAGGED clip
            const elements = document.elementsFromPoint(e.clientX, e.clientY);
            const trackElement = elements.find(el => el.getAttribute('data-track-id'));
            const newTrackId = trackElement ? trackElement.getAttribute('data-track-id') : null;

            let newTime = clip.startTime;

            if (trackElement) {
                const trackRect = trackElement.getBoundingClientRect();
                const relativeX = (e.clientX - dragOffsetRef.current.x) - trackRect.left;
                newTime = Math.max(0, relativeX / zoom);

                // Snap Logic (Only for the dragged clip for now, others follow relative)
                const { snapEnabled, gridSize, clips, tracks, moveClips, selection } = useAudioStore.getState();

                if (snapEnabled) {
                    const snapThresholdPixels = 15;
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

                    // 2. Clip Snapping
                    clips.forEach(otherClip => {
                        if (selection.includes(otherClip.id)) return; // Don't snap to other selected clips (they move with us)

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

                        // Snap Dragged End to Start/End of other clips
                        const distEndToStart = Math.abs((newTime + clip.duration) - otherClip.startTime);
                        if (distEndToStart < minDistance) {
                            minDistance = distEndToStart;
                            closestSnapTime = otherClip.startTime - clip.duration;
                        }

                        const distEndToEnd = Math.abs((newTime + clip.duration) - otherEnd);
                        if (distEndToEnd < minDistance) {
                            minDistance = distEndToEnd;
                            closestSnapTime = otherEnd - clip.duration;
                        }
                    });

                    if (closestSnapTime !== null && minDistance <= snapThresholdTime) {
                        newTime = closestSnapTime;
                    }
                }

                // Calculate Deltas
                const timeDelta = newTime - clip.startTime;

                let trackDelta = 0;
                if (newTrackId && newTrackId !== clip.trackId) {
                    const oldTrackIndex = tracks.findIndex(t => t.id === clip.trackId);
                    const newTrackIndex = tracks.findIndex(t => t.id === newTrackId);
                    if (oldTrackIndex !== -1 && newTrackIndex !== -1) {
                        trackDelta = newTrackIndex - oldTrackIndex;
                    }
                }

                // Apply to ALL selected clips
                const updates = [];
                selection.forEach(selectedId => {
                    const selectedClip = clips.find(c => c.id === selectedId);
                    if (selectedClip) {
                        let updatedTrackId = selectedClip.trackId;

                        if (trackDelta !== 0) {
                            const currentTrackIndex = tracks.findIndex(t => t.id === selectedClip.trackId);
                            const targetTrackIndex = currentTrackIndex + trackDelta;
                            if (targetTrackIndex >= 0 && targetTrackIndex < tracks.length) {
                                updatedTrackId = tracks[targetTrackIndex].id;
                            }
                        }

                        updates.push({
                            id: selectedId,
                            startTime: selectedClip.startTime + timeDelta,
                            trackId: updatedTrackId
                        });
                    }
                });

                if (updates.length > 0) {
                    moveClips(updates);
                }

            } else {
                // No track found, cancel move? Or just don't move.
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
        border: '1px solid white',
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
                {clipName}
            </div>
        </div>
    );
};

export default Clip;
