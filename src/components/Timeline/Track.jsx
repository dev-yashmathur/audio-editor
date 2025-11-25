import React from 'react';
import Clip from './Clip';
import { Volume2, Mic, MoreVertical } from 'lucide-react';
import useAudioStore from '../../store/useAudioStore';

const Track = ({ track, clips, zoom }) => {
    const { addClipToTrack } = useAudioStore();

    const onDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    };

    const onDrop = (e) => {
        e.preventDefault();
        const assetId = e.dataTransfer.getData('application/react-dnd-asset-id');
        if (assetId) {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const startTime = x / zoom;
            addClipToTrack(track.id, assetId, Math.max(0, startTime));
        }
    };

    return (
        <div style={{
            display: 'flex',
            height: '100px',
            borderBottom: '1px solid var(--border)',
            backgroundColor: 'var(--bg-panel)'
        }}>
            {/* Track Header */}
            <div style={{
                width: '200px',
                minWidth: '200px',
                borderRight: '1px solid var(--border)',
                padding: '8px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, fontSize: '13px' }}>{track.name}</span>
                    <MoreVertical size={14} color="var(--text-muted)" />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button style={{
                        padding: '2px 6px',
                        borderRadius: '2px',
                        backgroundColor: track.muted ? 'var(--primary)' : '#444',
                        fontSize: '10px',
                        fontWeight: 'bold'
                    }}>M</button>
                    <button style={{
                        padding: '2px 6px',
                        borderRadius: '2px',
                        backgroundColor: track.solo ? 'var(--warning)' : '#444',
                        color: track.solo ? 'black' : 'white',
                        fontSize: '10px',
                        fontWeight: 'bold'
                    }}>S</button>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Volume2 size={12} color="var(--text-muted)" />
                        <input type="range" min="0" max="100" defaultValue={track.volume * 100} style={{ width: '100%', height: '4px' }} />
                    </div>
                </div>
            </div>

            {/* Track Lane */}
            <div
                style={{
                    flex: 1,
                    position: 'relative',
                    backgroundColor: 'var(--bg-dark)',
                    overflow: 'hidden'
                }}
                onDragOver={onDragOver}
                onDrop={onDrop}
            >
                {clips.map(clip => (
                    <Clip key={clip.id} clip={clip} zoom={zoom} />
                ))}

                {/* Grid Lines Placeholder */}
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none',
                    backgroundImage: 'linear-gradient(90deg, var(--border) 1px, transparent 1px)',
                    backgroundSize: `${zoom}px 100%`,
                    opacity: 0.1
                }} />
            </div>
        </div>
    );
};

export default Track;
