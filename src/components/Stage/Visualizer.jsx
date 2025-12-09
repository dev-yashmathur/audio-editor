import React, { useEffect, useRef } from 'react';
import useAudioStore from '../../store/useAudioStore';
import audioEngine from '../../audio/AudioEngine';

const Visualizer = () => {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const clips = useAudioStore(state => state.clips);
    const isPlaying = useAudioStore(state => state.isPlaying);

    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const ctx = canvas.getContext('2d');
        let animationId;

        const resize = () => {
            canvas.width = container.clientWidth;
            canvas.height = container.clientHeight;
        };

        window.addEventListener('resize', resize);
        resize();

        const draw = () => {
            if (!audioEngine.analyser) {
                animationId = requestAnimationFrame(draw);
                return;
            }

            const bufferLength = audioEngine.analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            audioEngine.analyser.getByteFrequencyData(dataArray);

            const width = canvas.width;
            const height = canvas.height;

            ctx.clearRect(0, 0, width, height);

            // Draw Bars
            // We'll use a subset of the buffer for better visuals (lower frequencies are more active)
            const barsToDraw = 64;
            const step = Math.floor(bufferLength / 2 / barsToDraw);
            const barWidth = (width / barsToDraw) - 2;

            for (let i = 0; i < barsToDraw; i++) {
                const dataIndex = i * step;
                const value = dataArray[dataIndex];
                const percent = value / 255;
                const barHeight = percent * height * 0.8; // Leave some space at top

                const x = i * (barWidth + 2);
                const y = height - barHeight - 20; // Space for labels

                // Gradient Color
                // Left (Bass): Blue (#2D7FF9)
                // Mid: Purple
                // Right (Treble): Red (#F92D2D)
                const gradient = ctx.createLinearGradient(0, height, width, height);
                gradient.addColorStop(0, '#2D7FF9');
                gradient.addColorStop(0.5, '#9D4EDD');
                gradient.addColorStop(1, '#F92D2D');

                ctx.fillStyle = gradient;

                // Draw bar
                // We actually need to fill based on the x position to get the global gradient effect across bars
                // Or we can set the fillStyle to the global gradient and just draw the rect
                ctx.fillRect(x, y, barWidth, barHeight);
            }

            // Draw Labels
            ctx.fillStyle = '#666';
            ctx.font = '10px Inter, sans-serif';
            ctx.textAlign = 'center';

            ctx.fillText('Bass', width * 0.25, height - 5);
            ctx.fillText('Mid', width * 0.5, height - 5);
            ctx.fillText('Treble', width * 0.75, height - 5);

            // Peak Level Line (Static for now, or dynamic if we calculate peak)
            ctx.strokeStyle = '#333';
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(0, height * 0.1);
            ctx.lineTo(width, height * 0.1);
            ctx.stroke();

            ctx.fillStyle = '#444';
            ctx.fillText('Peak Level', width / 2, height * 0.1 - 5);

            if (isPlaying) {
                animationId = requestAnimationFrame(draw);
            }
        };

        if (isPlaying) {
            draw();
        } else {
            // Draw once to show state (or clear)
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            // Maybe draw a flat line or empty bars?
            // For now, just clear or keep last frame? 
            // If stopped, usually visualizers go flat.
            // Let's draw flat bars or just the labels.

            // Re-draw labels and grid even if stopped
            const width = canvas.width;
            const height = canvas.height;

            ctx.fillStyle = '#666';
            ctx.font = '10px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Bass', width * 0.25, height - 5);
            ctx.fillText('Mid', width * 0.5, height - 5);
            ctx.fillText('Treble', width * 0.75, height - 5);

            ctx.strokeStyle = '#333';
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(0, height * 0.1);
            ctx.lineTo(width, height * 0.1);
            ctx.stroke();
            ctx.fillStyle = '#444';
            ctx.fillText('Peak Level', width / 2, height * 0.1 - 5);
        }

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationId);
        };
    }, [isPlaying]);

    const showEmptyState = clips.length === 0;

    const importFile = useAudioStore(state => state.importFile);

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            for (const file of files) {
                if (file.type.startsWith('audio/') || file.type.startsWith('video/')) {
                    try {
                        await importFile(file);
                    } catch (error) {
                        console.error("Import failed:", error);
                        alert(`Failed to import ${file.name}`);
                    }
                }
            }
        }
    };

    return (
        <div ref={containerRef}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            style={{
                width: '100%',
                height: '100%',
                backgroundColor: '#111',
                position: 'relative',
                overflow: 'hidden'
            }}>
            {showEmptyState ? (
                <div style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-muted)',
                    gap: '16px'
                }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '50%',
                        backgroundColor: '#222',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '8px'
                    }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 18V5l12-2v13" />
                            <circle cx="6" cy="18" r="3" />
                            <circle cx="18" cy="16" r="3" />
                        </svg>
                    </div>
                    <p style={{ fontSize: '14px', maxWidth: '200px', textAlign: 'center', lineHeight: '1.5' }}>
                        Import a media and drag it to the tracks to start editing
                    </p>
                </div>
            ) : (
                <canvas
                    ref={canvasRef}
                    style={{ width: '100%', height: '100%', display: 'block' }}
                />
            )}

            {/* Output Meter (Right Side) */}
            <div style={{
                position: 'absolute',
                right: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                height: '60%',
                width: '12px',
                backgroundColor: '#222',
                borderRadius: '6px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column-reverse'
            }}>
                {/* Simulated meter for now */}
                <div style={{
                    width: '100%',
                    height: isPlaying ? '70%' : '0%',
                    backgroundColor: '#4CAF50',
                    transition: 'height 0.1s ease'
                }}></div>
            </div>
            <div style={{
                position: 'absolute',
                right: '14px',
                bottom: '15%',
                color: '#666',
                fontSize: '10px'
            }}>Output</div>

            {/* Keyboard Shortcuts Legend */}
            <div style={{
                position: 'absolute',
                top: '16px',
                right: '48px', // Moved left to avoid meter
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                padding: '12px',
                borderRadius: '8px',
                color: 'var(--text-muted)',
                fontSize: '11px',
                pointerEvents: 'none',
                backdropFilter: 'blur(4px)',
                border: '1px solid rgba(255,255,255,0.1)'
            }}>
                <div style={{ marginBottom: '8px', fontWeight: '600', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Shortcuts</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'auto auto', gap: '4px 24px' }}>
                    <span>Play/Pause</span> <span style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>Space</span>
                    <span>Undo</span> <span style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>Cmd+Z</span>
                    <span>Redo</span> <span style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>Cmd+Shift+Z</span>
                    <span>Split</span> <span style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>Cmd+B</span>
                    <span>Duplicate</span> <span style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>Cmd+D</span>
                    <span>Delete</span> <span style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>Delete</span>
                    <span>Seek</span> <span style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>Arrows</span>
                </div>
            </div>
        </div>
    );
};

export default Visualizer;
