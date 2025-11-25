import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpeg = null;

export const initFFmpeg = async () => {
    if (ffmpeg) return ffmpeg;

    ffmpeg = new FFmpeg();

    // Load ffmpeg.wasm from a CDN or local public folder
    // For this MVP, we'll use the unpkg CDN links which is standard for ffmpeg.wasm usage
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';

    await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });

    return ffmpeg;
};

export const extractAudioFromVideo = async (videoFile) => {
    if (!ffmpeg) await initFFmpeg();

    const inputName = 'input.mp4';
    const outputName = 'output.mp3';

    await ffmpeg.writeFile(inputName, await fetchFile(videoFile));

    // Run FFmpeg command to extract audio
    // -i input.mp4 -vn (no video) -acodec libmp3lame -q:a 2 (high quality) output.mp3
    await ffmpeg.exec(['-i', inputName, '-vn', '-acodec', 'libmp3lame', '-q:a', '2', outputName]);

    const data = await ffmpeg.readFile(outputName);
    const blob = new Blob([data.buffer], { type: 'audio/mp3' });

    return blob;
};
