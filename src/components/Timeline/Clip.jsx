import React, { useMemo } from 'react';

const Clip = ({ clip, zoom }) => {
    const width = clip.duration * zoom;
    const left = clip.startTime * zoom;

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

    return (
        <div style={{
            position: 'absolute',
            left: `${left}px`,
            width: `${width}px`,
            height: '100%',
            backgroundColor: 'rgba(45, 127, 249, 0.5)',
            border: '1px solid var(--primary)',
            borderRadius: '4px',
            overflow: 'hidden',
            cursor: 'move',
            color: 'white',
            fontSize: '11px',
            boxSizing: 'border-box'
        }}>
            {/* Waveform SVG */}
            <svg
                width="100%"
                height="100%"
                preserveAspectRatio="none"
                style={{ position: 'absolute', top: 0, left: 0, opacity: 0.8 }}
            >
                <path d={waveformPath} fill="rgba(255, 255, 255, 0.5)" />
            </svg>

            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                padding: '2px 4px',
                zIndex: 2,
                textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '100%'
            }}>
                {clip.id}
            </div>
        </div>
    );
};

export default Clip;
