import React, { useRef } from 'react';
import Track from './Track';
import useAudioStore from '../../store/useAudioStore';

const Timeline = () => {
    const { tracks, clips, zoom, currentTime, addTrack } = useAudioStore();
    const containerRef = React.useRef(null);
    const [scrollLeft, setScrollLeft] = React.useState(0);

    // Auto-scroll logic
    React.useEffect(() => {
        if (!containerRef.current) return;

        const playheadPos = 200 + currentTime * zoom; // 200px offset for headers
        const container = containerRef.current;
        const containerWidth = container.clientWidth;
        const currentScroll = container.scrollLeft;

        // Buffer zone (20% of width)
        const rightBuffer = containerWidth * 0.8;

        if (playheadPos > currentScroll + rightBuffer) {
            container.scrollTo({
                left: playheadPos - (containerWidth * 0.2), // Scroll to keep playhead at 20%
                behavior: 'smooth'
            });
        }
    }, [currentTime, zoom]);

    // Playback Loop
    React.useEffect(() => {
        let animationFrame;
        const { isPlaying, setIsPlaying } = useAudioStore.getState();

        const loop = () => {
            const { isPlaying, currentTime } = useAudioStore.getState();
            if (isPlaying) {
                useAudioStore.getState().setCurrentTime(currentTime + 0.016);
                animationFrame = requestAnimationFrame(loop);
            }
        };

        if (useAudioStore.getState().isPlaying) {
            loop();
        }

        // Subscribe to isPlaying changes to start/stop loop
        const unsubscribe = useAudioStore.subscribe((state, prevState) => {
            if (state.isPlaying && !prevState.isPlaying) {
                loop();
            } else if (!state.isPlaying && prevState.isPlaying) {
                cancelAnimationFrame(animationFrame);
            }
        });

        return () => {
            unsubscribe();
            cancelAnimationFrame(animationFrame);
        };
    }, []);

    const handleScroll = (e) => {
        setScrollLeft(e.target.scrollLeft);
    };

    // Scrubbing Logic
    const lastSeekTime = useRef(0);
    const seekThrottleMs = 100;

    const handleRulerMouseDown = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const newTime = Math.max(0, x / zoom);

        useAudioStore.getState().seekTo(newTime); // Immediate seek on click

        const handleMouseMove = (moveEvent) => {
            const moveX = moveEvent.clientX - rect.left;
            const moveTime = Math.max(0, moveX / zoom);

            // Immediate visual update
            useAudioStore.getState().setCurrentTime(moveTime);

            // Throttled audio seek
            const now = Date.now();
            if (now - lastSeekTime.current > seekThrottleMs) {
                useAudioStore.getState().seekTo(moveTime);
                lastSeekTime.current = now;
            }
        };

        const handleMouseUp = (upEvent) => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);

            // Final seek to ensure accuracy
            const upX = upEvent.clientX - rect.left;
            const finalTime = Math.max(0, upX / zoom);
            useAudioStore.getState().seekTo(finalTime);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    // Generate ruler ticks
    const renderRuler = () => {
        const ticks = [];
        const duration = 300; // Render 5 minutes for now
        const tickInterval = 1; // Every second

        for (let i = 0; i <= duration; i += tickInterval) {
            const left = i * zoom; // Removed 200px offset
            if (left < scrollLeft || left > scrollLeft + window.innerWidth) continue; // Optimization

            ticks.push(
                <div key={i} style={{
                    position: 'absolute',
                    left: `${left}px`,
                    top: 0,
                    bottom: 0,
                    borderLeft: '1px solid var(--text-muted)',
                    opacity: 0.5,
                    height: i % 5 === 0 ? '100%' : '10px',
                    pointerEvents: 'none'
                }}>
                    {i % 5 === 0 && (
                        <span style={{
                            position: 'absolute',
                            left: '4px',
                            top: '2px',
                            fontSize: '10px',
                            color: 'var(--text-muted)'
                        }}>
                            {Math.floor(i / 60)}:{(i % 60).toString().padStart(2, '0')}
                        </span>
                    )}
                </div>
            );
        }
        return ticks;
    };

    return (
        <div
            ref={containerRef}
            onScroll={handleScroll}
            style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                overflowY: 'auto',
                overflowX: 'auto',
                position: 'relative'
            }}
        >
            {/* Ruler */}
            <div style={{
                height: '30px',
                minWidth: `${200 + 300 * zoom}px`, // Ensure width for scrolling
                backgroundColor: 'var(--bg-header)',
                borderBottom: '1px solid var(--border)',
                position: 'sticky',
                top: 0,
                zIndex: 20,
                display: 'flex'
            }}>
                {/* Fixed Header Space */}
                <div style={{
                    width: '200px',
                    height: '100%',
                    backgroundColor: 'var(--bg-header)',
                    borderRight: '1px solid var(--border)',
                    position: 'sticky',
                    left: 0,
                    zIndex: 21,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--text-muted)'
                }}>
                    <span>TRACKS</span>
                    <button
                        onClick={addTrack}
                        style={{
                            background: 'none',
                            border: '1px solid var(--border)',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            padding: '2px 6px',
                            fontSize: '10px',
                            color: 'var(--text-main)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}
                    >
                        + Add
                    </button>
                </div>

                {/* Ruler Ticks */}
                <div
                    onMouseDown={handleRulerMouseDown}
                    style={{
                        position: 'relative',
                        flex: 1,
                        cursor: 'pointer'
                    }}
                >
                    {renderRuler()}

                    {/* Playhead Indicator on Ruler */}
                    <div style={{
                        position: 'absolute',
                        left: `${currentTime * zoom}px`,
                        top: 0,
                        bottom: 0,
                        width: 0,
                        borderLeft: '10px solid transparent',
                        borderRight: '10px solid transparent',
                        borderTop: '10px solid var(--primary)',
                        transform: 'translateX(-10px)',
                        zIndex: 22,
                        pointerEvents: 'none'
                    }} />
                </div>
            </div>

            {/* Tracks Container */}
            <div style={{ flex: 1, position: 'relative', minWidth: `${200 + 300 * zoom}px` }}>
                {tracks.map(track => (
                    <Track
                        key={track.id}
                        track={track}
                        clips={clips.filter(c => c.trackId === track.id)}
                        zoom={zoom}
                    />
                ))}

                {/* Playhead Line */}
                <div style={{
                    position: 'absolute',
                    left: `${200 + currentTime * zoom}px`,
                    top: 0,
                    bottom: 0,
                    width: '2px',
                    backgroundColor: 'var(--primary)',
                    pointerEvents: 'none',
                    zIndex: 10
                }} />
            </div>
        </div>
    );
};

export default Timeline;
