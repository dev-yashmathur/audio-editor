class AudioEngine {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.sources = new Map(); // Map<clipId, AudioBufferSourceNode>
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
            this.masterGain.connect(this.audioContext.destination);
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
        // clip: { id, src, startTime, duration, offset, volume }
        // startTime: when to start playing in the timeline (global time)
        // offsetTime: where we are currently in the timeline (playhead position)

        const buffer = this.buffers.get(clip.src);
        if (!buffer) return;

        // Calculate when this clip should play relative to "now"
        // If the clip starts in the future relative to the playhead:
        // delay = clip.startTime - offsetTime
        // startOffset = clip.offset (start from beginning of clip + crop)

        // If the clip is already partially played (playhead is inside the clip):
        // delay = 0
        // startOffset = clip.offset + (offsetTime - clip.startTime)

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

        if (duration <= 0) return; // Clip is already finished

        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;

        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = clip.volume || 1.0;

        source.connect(gainNode);
        gainNode.connect(this.masterGain);

        source.start(this.audioContext.currentTime + delay, startOffset, duration);
        this.sources.set(clip.id, source);

        source.onended = () => {
            this.sources.delete(clip.id);
        };
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
                // Ignore errors if source already stopped
            }
        });
        this.sources.clear();
    }
}

const audioEngine = new AudioEngine();
export default audioEngine;
