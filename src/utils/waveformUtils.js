/**
 * Generates waveform peaks data from an AudioBuffer.
 * @param {AudioBuffer} audioBuffer 
 * @param {number} samples Number of samples to generate (resolution)
 * @returns {number[]} Array of peak values between -1 and 1
 */
export const generateWaveform = (audioBuffer, samples = 1000) => {
    const rawData = audioBuffer.getChannelData(0); // Use first channel
    const blockSize = Math.floor(rawData.length / samples);
    const filteredData = [];

    for (let i = 0; i < samples; i++) {
        let blockStart = blockSize * i;
        let sum = 0;
        for (let j = 0; j < blockSize; j++) {
            sum = sum + Math.abs(rawData[blockStart + j]);
        }
        filteredData.push(sum / blockSize);
    }

    // Normalize to 0-1 range (optional, but good for rendering)
    const multiplier = Math.pow(Math.max(...filteredData), -1);
    return filteredData.map(n => n * multiplier);
};
