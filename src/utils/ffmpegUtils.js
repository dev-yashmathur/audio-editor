import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

import wasmURL from '@ffmpeg/core/wasm?url'
import coreURL from '@ffmpeg/core?url'

let ffmpeg = null;

export const initFFmpeg = async () => {
    if (ffmpeg) return ffmpeg;

    ffmpeg = new FFmpeg();

    // Load ffmpeg.wasm from local public folder
    // Using toBlobURL ensures correct worker creation and path resolution
    const baseURL = '/ffmpeg';

    try {
        await ffmpeg.load({
            coreURL: coreURL,
            wasmURL: wasmURL
        });
        console.log('FFmpeg loaded successfully');
    } catch (e) {
        console.error('Failed to load FFmpeg:', e);
        throw e;
    }

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

export const convertFile = async (file, outputFormat) => {
    if (!ffmpeg) await initFFmpeg();

    const inputName = 'input.wav';
    const outputName = `output.${outputFormat}`;

    await ffmpeg.writeFile(inputName, await fetchFile(file));

    // FFmpeg command
    // -i input.wav -acodec libmp3lame -q:a 2 output.mp3
    // -i input.wav -c:a aac -b:a 192k output.m4a
    let args = ['-i', inputName];

    if (outputFormat === 'mp3') {
        args.push('-acodec', 'libmp3lame', '-q:a', '2', outputName);
    } else if (outputFormat === 'm4a') {
        args.push('-c:a', 'aac', '-b:a', '192k', outputName);
    } else {
        throw new Error(`Unsupported format: ${outputFormat}`);
    }

    await ffmpeg.exec(args);

    const data = await ffmpeg.readFile(outputName);
    const blob = new Blob([data.buffer], { type: `audio/${outputFormat}` });

    return blob;
};
