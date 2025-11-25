import { create } from 'zustand';
import audioEngine from '../audio/AudioEngine';
import { generateWaveform } from '../utils/waveformUtils';

const useAudioStore = create((set, get) => ({
    // Project State
    isPlaying: false,
    currentTime: 0,
    duration: 60, // Default 60s
    zoom: 50, // Pixels per second

    // Track & Clip State
    tracks: [
        { id: 'track-1', name: 'Audio 1', volume: 1.0, muted: false, solo: false },
        { id: 'track-2', name: 'Audio 2', volume: 1.0, muted: false, solo: false },
        { id: 'track-3', name: 'Audio 3', volume: 1.0, muted: false, solo: false },
    ],
    clips: [],
    selection: [], // Array of selected clip IDs

    // Assets (Imported Files)
    assets: [], // { id, name, type, url, duration, buffer, waveform }

    // Actions
    setIsPlaying: (isPlaying) => {
        const { clips, currentTime } = get();
        if (isPlaying) {
            audioEngine.play(clips, currentTime);
        } else {
            audioEngine.pause();
        }
        set({ isPlaying });
    },

    togglePlayback: () => {
        const { isPlaying } = get();
        get().setIsPlaying(!isPlaying);
    },

    setCurrentTime: (time) => set({ currentTime: time }),
    setZoom: (zoom) => set({ zoom }),

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

    addClip: (clip) => set((state) => ({
        clips: [...state.clips, clip]
    })),

    updateClip: (id, updates) => set((state) => ({
        clips: state.clips.map(c => c.id === id ? { ...c, ...updates } : c)
    })),

    removeClip: (id) => set((state) => ({
        clips: state.clips.filter(c => c.id !== id),
        selection: state.selection.filter(s => s !== id)
    })),

    setSelection: (ids) => set({ selection: ids }),
}));

export default useAudioStore;
