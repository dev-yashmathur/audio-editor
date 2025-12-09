class AudioEngine {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.sources = new Set(); // Set<AudioBufferSourceNode>
        this.activeClips = new Map(); // Map<clipId, { source, gainNode }>
        this.buffers = new Map(); // Map<src, AudioBuffer>
        this.startTime = 0;
        this.pauseTime = 0;
        this.isPlaying = false;
    }

    init() {
        if (!this.audioContext) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContext();
            this.masterGain = this.audioContext.createGain();

            // Create Analyser
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 2048; // Good balance for visualizer

            // Connect: masterGain -> analyser -> destination
            this.masterGain.connect(this.analyser);
            this.analyser.connect(this.audioContext.destination);
        } else if (!this.analyser) {
            // Ensure analyser exists if context exists (e.g. from previous session or HMR)
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 2048;

            // Re-route
            try {
                this.masterGain.disconnect();
            } catch (e) {
                // Ignore if not connected
            }
            this.masterGain.connect(this.analyser);
            this.analyser.connect(this.audioContext.destination);
        }

        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        return this.audioContext;
    }

    async loadAudio(url) {
        this.init();
        if (this.buffers.has(url)) return this.buffers.get(url);

        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
        this.buffers.set(url, audioBuffer);
        return audioBuffer;
    }

    async loadBlob(blob) {
        this.init();
        const arrayBuffer = await blob.arrayBuffer();
        const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
        const blobUrl = URL.createObjectURL(blob);
        this.buffers.set(blobUrl, audioBuffer);
        return { url: blobUrl, buffer: audioBuffer };
    }

    scheduleClip(clip, startTime, offsetTime) {
        // clip: { id, src, startTime, duration, offset, volume, effectiveVolume }
        // startTime: when to start playing in the timeline (global time)
        // offsetTime: where we are currently in the timeline (playhead position)

        const buffer = this.buffers.get(clip.src);
        if (!buffer) return;

        let delay = 0;
        let startOffset = clip.offset || 0;
        let duration = clip.duration;

        if (clip.startTime > offsetTime) {
            delay = clip.startTime - offsetTime;
        } else {
            const timePassed = offsetTime - clip.startTime;
            startOffset += timePassed;
            duration -= timePassed;
        }

        if (duration <= 0) return;

        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;

        const gainNode = this.audioContext.createGain();
        // Use effectiveVolume if present, otherwise fallback to volume or 1.0
        const volume = clip.effectiveVolume !== undefined ? clip.effectiveVolume : (clip.volume || 1.0);
        gainNode.gain.value = volume;

        source.connect(gainNode);
        gainNode.connect(this.masterGain);

        source.start(this.audioContext.currentTime + delay, startOffset, duration);
        this.sources.add(source);
        this.activeClips.set(clip.id, { source, gainNode });

        source.onended = () => {
            this.sources.delete(source);
            this.activeClips.delete(clip.id);
        };
    }

    setClipVolume(clipId, volume) {
        const activeClip = this.activeClips.get(clipId);
        if (activeClip && activeClip.gainNode) {
            // Smooth transition to avoid clicks
            activeClip.gainNode.gain.setTargetAtTime(volume, this.audioContext.currentTime, 0.01);
        }
    }

    play(clips, currentTime) {
        this.init();
        this.stop(); // Stop any currently playing sources
        this.startTime = this.audioContext.currentTime;
        this.pauseTime = currentTime;
        this.isPlaying = true;

        clips.forEach(clip => {
            // Check if clip ends after current time
            if (clip.startTime + clip.duration > currentTime) {
                this.scheduleClip(clip, clip.startTime, currentTime);
            }
        });
    }

    pause() {
        this.stop();
        this.isPlaying = false;
    }

    stop() {
        this.sources.forEach(source => {
            try {
                source.stop();
            } catch (e) {
                // Ignore errors
            }
        });
        this.sources.clear();
        this.activeClips.clear();
    }

    async render(clips, duration) {
        // Create OfflineAudioContext
        const sampleRate = 44100;
        const length = Math.ceil(duration * sampleRate);
        const offlineCtx = new OfflineAudioContext(2, length, sampleRate);

        // Schedule all clips
        for (const clip of clips) {
            const buffer = this.buffers.get(clip.src);
            if (!buffer) continue;

            const source = offlineCtx.createBufferSource();
            source.buffer = buffer;

            const gainNode = offlineCtx.createGain();
            const volume = clip.effectiveVolume !== undefined ? clip.effectiveVolume : (clip.volume || 1.0);
            gainNode.gain.value = volume;

            source.connect(gainNode);
            gainNode.connect(offlineCtx.destination);

            source.start(clip.startTime, clip.offset || 0, clip.duration);
        }

        // Render
        const renderedBuffer = await offlineCtx.startRendering();
        return renderedBuffer;
    }

    bufferToWav(buffer) {
        const numOfChan = buffer.numberOfChannels;
        const length = buffer.length * numOfChan * 2 + 44;
        const bufferArr = new ArrayBuffer(length);
        const view = new DataView(bufferArr);
        const channels = [];
        let i;
        let sample;
        let offset = 0;
        let pos = 0;

        // write WAVE header
        setUint32(0x46464952); // "RIFF"
        setUint32(length - 8); // file length - 8
        setUint32(0x45564157); // "WAVE"

        setUint32(0x20746d66); // "fmt " chunk
        setUint32(16); // length = 16
        setUint16(1); // PCM (uncompressed)
        setUint16(numOfChan);
        setUint32(buffer.sampleRate);
        setUint32(buffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
        setUint16(numOfChan * 2); // block-align
        setUint16(16); // 16-bit (hardcoded in this example)

        setUint32(0x61746164); // "data" - chunk
        setUint32(length - pos - 4); // chunk length

        // write interleaved data
        for (i = 0; i < buffer.numberOfChannels; i++)
            channels.push(buffer.getChannelData(i));

        while (pos < buffer.length) {
            for (i = 0; i < numOfChan; i++) {
                sample = Math.max(-1, Math.min(1, channels[i][pos])); // clamp
                sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0; // scale to 16-bit signed int
                view.setInt16(44 + offset, sample, true);
                offset += 2;
            }
            pos++;
        }

        return new Blob([bufferArr], { type: 'audio/wav' });

        function setUint16(data) {
            view.setUint16(pos, data, true);
            pos += 2;
        }

        function setUint32(data) {
            view.setUint32(pos, data, true);
            pos += 4;
        }
    }
}

const audioEngine = new AudioEngine();
export default audioEngine;
