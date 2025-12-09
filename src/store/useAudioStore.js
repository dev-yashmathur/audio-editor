import { create } from 'zustand';
import audioEngine from '../audio/AudioEngine';
import { generateWaveform } from '../utils/waveformUtils';

const getEffectiveClips = (clips, tracks) => {
    const soloTrack = tracks.find(t => t.solo);
    return clips.map(clip => {
        const track = tracks.find(t => t.id === clip.trackId);
        if (!track) return { ...clip, effectiveVolume: 0 };

        let effectiveVolume = 0;
        if (soloTrack) {
            if (track.solo) {
                effectiveVolume = (clip.volume || 1.0) * track.volume;
            } else {
                effectiveVolume = 0;
            }
        } else {
            if (track.muted) {
                effectiveVolume = 0;
            } else {
                effectiveVolume = (clip.volume || 1.0) * track.volume;
            }
        }
        return { ...clip, effectiveVolume };
    });
};

const useAudioStore = create((set, get) => ({
    // Project State
    isPlaying: false,
    currentTime: 0,
    duration: 60, // Default 60s
    zoom: 50, // Pixels per second
    snapEnabled: false,
    gridSize: 1.0, // Seconds

    // Track & Clip State
    tracks: [
        { id: 'track-1', name: 'Audio 1', volume: 1.0, muted: false, solo: false },
        { id: 'track-2', name: 'Audio 2', volume: 1.0, muted: false, solo: false },
        { id: 'track-3', name: 'Audio 3', volume: 1.0, muted: false, solo: false },
    ],
    clips: [],
    selection: [], // Array of selected clip IDs
    // History State
    past: [],
    future: [],

    // Assets (Imported Files)
    assets: [], // { id, name, type, url, duration, buffer, waveform }

    // History Actions
    pushHistory: () => {
        const { clips, past } = get();
        // Limit history to 50 states
        const newPast = [...past, clips].slice(-50);
        set({ past: newPast, future: [] });
    },

    // Helper to refresh playback if playing
    refreshPlayback: () => {
        const { isPlaying, clips, tracks, currentTime } = get();
        if (isPlaying) {
            // Stop current playback and restart with new clips
            const effectiveClips = getEffectiveClips(clips, tracks);
            audioEngine.play(effectiveClips, currentTime);
        }
    },

    undo: () => {
        const { past, future, clips } = get();
        if (past.length === 0) return;

        const previous = past[past.length - 1];
        const newPast = past.slice(0, past.length - 1);

        set({
            past: newPast,
            clips: previous,
            future: [clips, ...future]
        });
        get().refreshPlayback();
    },

    redo: () => {
        const { past, future, clips } = get();
        if (future.length === 0) return;

        const next = future[0];
        const newFuture = future.slice(1);

        set({
            past: [...past, clips],
            clips: next,
            future: newFuture
        });
        get().refreshPlayback();
    },

    // Actions
    // Playback Actions
    setIsPlaying: (isPlaying) => {
        const { clips, tracks, currentTime } = get();
        if (isPlaying) {
            const effectiveClips = getEffectiveClips(clips, tracks);
            audioEngine.play(effectiveClips, currentTime);
        } else {
            audioEngine.pause();
        }
        set({ isPlaying });
    },

    togglePlayback: () => {
        const { isPlaying } = get();
        get().setIsPlaying(!isPlaying);
    },

    setCurrentTime: (time) => set({ currentTime: Math.max(0, time) }),

    seekTo: (time) => {
        const newTime = Math.max(0, time);
        set({ currentTime: newTime });
        const { isPlaying, clips, tracks } = get();
        if (isPlaying) {
            const effectiveClips = getEffectiveClips(clips, tracks);
            audioEngine.play(effectiveClips, newTime);
        }
    },

    skipTime: (seconds) => {
        const { currentTime, isPlaying, clips, tracks } = get();
        const newTime = Math.max(0, currentTime + seconds);
        set({ currentTime: newTime });

        // If playing, restart playback from new time
        if (isPlaying) {
            const effectiveClips = getEffectiveClips(clips, tracks);
            audioEngine.play(effectiveClips, newTime);
        }
    },

    setZoom: (zoom) => set({ zoom }),

    toggleSnap: () => set((state) => ({ snapEnabled: !state.snapEnabled })),
    setGridSize: (gridSize) => set({ gridSize }),

    importFile: async (file) => {
        // file is a File object or Blob with name
        const { buffer, url } = await audioEngine.loadBlob(file);
        const waveform = generateWaveform(buffer);

        const newAsset = {
            id: `asset-${Date.now()}`,
            name: file.name,
            type: file.type.startsWith('video') ? 'video' : 'audio',
            url,
            duration: buffer.duration,
            buffer,
            waveform
        };

        set((state) => ({ assets: [...state.assets, newAsset] }));
        return newAsset;
    },

    addClipToTrack: (trackId, assetId, startTime) => {
        get().pushHistory(); // Save state
        const asset = get().assets.find(a => a.id === assetId);
        if (!asset) return;

        const newClip = {
            id: `clip-${Date.now()}`,
            trackId,
            assetId,
            src: asset.url,
            startTime,
            duration: asset.duration,
            offset: 0,
            volume: 1.0,
            waveform: asset.waveform
        };

        set((state) => ({ clips: [...state.clips, newClip] }));
        get().recalculateDuration();
        get().refreshPlayback();
    },

    addTrack: () => set((state) => ({
        tracks: [...state.tracks, {
            id: `track-${Date.now()}`,
            name: `Audio ${state.tracks.length + 1}`,
            volume: 1.0,
            muted: false,
            solo: false
        }]
    })),

    updateTrackVolume: (trackId, volume) => {
        set((state) => ({
            tracks: state.tracks.map(t => t.id === trackId ? { ...t, volume } : t)
        }));

        // Update real-time volume
        const { clips, tracks, isPlaying } = get();
        if (isPlaying) {
            const effectiveClips = getEffectiveClips(clips, tracks);
            effectiveClips.forEach(clip => {
                if (clip.trackId === trackId) {
                    audioEngine.setClipVolume(clip.id, clip.effectiveVolume);
                }
            });
        }
    },

    toggleTrackMute: (trackId) => {
        set((state) => ({
            tracks: state.tracks.map(t => t.id === trackId ? { ...t, muted: !t.muted } : t)
        }));

        // Update real-time volume (mute affects all clips on this track)
        const { clips, tracks, isPlaying } = get();
        if (isPlaying) {
            const effectiveClips = getEffectiveClips(clips, tracks);
            // We need to update ALL clips because solo/mute interaction might affect others 
            // (though mute only affects this track, unless solo logic is involved)
            // But to be safe and simple, update all.
            effectiveClips.forEach(clip => {
                audioEngine.setClipVolume(clip.id, clip.effectiveVolume);
            });
        }
    },

    toggleTrackSolo: (trackId) => {
        set((state) => ({
            tracks: state.tracks.map(t => t.id === trackId ? { ...t, solo: !t.solo } : t)
        }));

        // Update real-time volume (solo affects ALL tracks)
        const { clips, tracks, isPlaying } = get();
        if (isPlaying) {
            const effectiveClips = getEffectiveClips(clips, tracks);
            effectiveClips.forEach(clip => {
                audioEngine.setClipVolume(clip.id, clip.effectiveVolume);
            });
        }
    },

    addClip: (clip) => {
        get().pushHistory();
        set((state) => ({
            clips: [...state.clips, clip]
        }));
        get().recalculateDuration();
        get().refreshPlayback();
    },

    updateClip: (id, updates) => {
        // We might want to debounce history for continuous updates like dragging, 
        // but for now we'll handle it in the specific actions or let the component decide when to push
        set((state) => ({
            clips: state.clips.map(c => c.id === id ? { ...c, ...updates } : c)
        }));
        get().recalculateDuration();
        // Note: Dragging calls this frequently, so we might not want to refresh playback on every pixel
        // But for "moveClip" (on mouse up), we should.
    },

    // Editing Actions
    splitClip: (splitTime) => {
        get().pushHistory();
        const { clips, selection } = get();
        // Only split selected clip if one is selected, otherwise split all under playhead (simplified for MVP: split selected)
        const selectedId = selection[0];
        if (!selectedId) return;

        const clip = clips.find(c => c.id === selectedId);
        if (!clip) return;

        // Check if split time is within clip
        if (splitTime <= clip.startTime || splitTime >= clip.startTime + clip.duration) return;

        const firstDuration = splitTime - clip.startTime;
        const secondDuration = clip.duration - firstDuration;

        const leftClip = {
            ...clip,
            id: `clip-${Date.now()}-1`,
            duration: firstDuration
        };

        const rightClip = {
            ...clip,
            id: `clip-${Date.now()}-2`,
            startTime: splitTime,
            offset: clip.offset + firstDuration,
            duration: secondDuration
        };

        set((state) => ({
            clips: state.clips.filter(c => c.id !== clip.id).concat([leftClip, rightClip]),
            selection: [leftClip.id] // Select the left part
        }));
        get().recalculateDuration();
        get().refreshPlayback();
    },

    deleteClips: (ids) => {
        get().pushHistory();
        set((state) => ({
            clips: state.clips.filter(c => !ids.includes(c.id)),
            selection: []
        }));
        get().recalculateDuration();
        get().refreshPlayback();
    },

    duplicateClips: (ids) => {
        get().pushHistory();
        const { clips } = get();
        const newClips = [];

        ids.forEach(id => {
            const clip = clips.find(c => c.id === id);
            if (clip) {
                newClips.push({
                    ...clip,
                    id: `clip-${Date.now()}-${Math.random()}`,
                    startTime: clip.startTime + clip.duration, // Place after original
                });
            }
        });

        set((state) => ({
            clips: [...state.clips, ...newClips],
            selection: newClips.map(c => c.id)
        }));
        get().recalculateDuration();
        get().refreshPlayback();
    },

    moveClip: (id, newStartTime, newTrackId) => {
        get().moveClips([{ id, startTime: newStartTime, trackId: newTrackId }]);
    },

    moveClips: (updates) => {
        // updates: [{ id, startTime, trackId }]
        set((state) => {
            const newClips = state.clips.map(c => {
                const update = updates.find(u => u.id === c.id);
                if (update) {
                    return {
                        ...c,
                        startTime: Math.max(0, update.startTime !== undefined ? update.startTime : c.startTime),
                        trackId: update.trackId || c.trackId
                    };
                }
                return c;
            });
            return { clips: newClips };
        });
        get().recalculateDuration();
    },

    // Helper to push history manually (e.g. before drag start)
    pushHistoryState: () => get().pushHistory(),

    setSelection: (ids) => set({ selection: ids }),

    recalculateDuration: () => {
        const { clips } = get();
        if (clips.length === 0) {
            set({ duration: 60 });
            return;
        }
        const maxEndTime = Math.max(...clips.map(c => c.startTime + c.duration));
        // Ensure at least 60s, and add 30s buffer
        set({ duration: Math.max(60, maxEndTime + 30) });
    },

    exportProject: async (format = 'wav') => {
        const { clips, tracks } = get();
        if (clips.length === 0) {
            alert('No clips to export');
            return;
        }

        try {
            // Calculate exact duration of content
            const exportDuration = Math.max(...clips.map(c => c.startTime + c.duration));

            // 1. Render Timeline to AudioBuffer
            const effectiveClips = getEffectiveClips(clips, tracks);
            const renderedBuffer = await audioEngine.render(effectiveClips, exportDuration);

            // 2. Convert to WAV Blob
            let blob = audioEngine.bufferToWav(renderedBuffer);

            // 3. Convert to requested format if needed
            if (format !== 'wav') {
                const { convertFile } = await import('../utils/ffmpegUtils');
                blob = await convertFile(blob, format);
            }

            // 4. Trigger Download
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `project_export.${format}`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error('Export failed:', e);
            alert('Export failed. See console for details.');
        }
    },
}));

export default useAudioStore;
