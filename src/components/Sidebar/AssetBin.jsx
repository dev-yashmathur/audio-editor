import React, { useCallback } from 'react';
import { Music, Video, FileAudio, Loader2, Beaker } from 'lucide-react';
import useAudioStore from '../../store/useAudioStore';
// import { extractAudioFromVideo } from '../../utils/ffmpegUtils';

const AssetBin = () => {
  const { assets, importFile, addClipToTrack, tracks } = useAudioStore();
  const [isProcessing, setIsProcessing] = React.useState(false);

  const handleFileUpload = async (files) => {
    setIsProcessing(true);
    try {
      for (const file of files) {
        if (file.type.startsWith('video/')) {
          // Extract audio from video
          // const audioBlob = await extractAudioFromVideo(file);
          // Create a new File object with the audio blob
          // const audioFile = new File([audioBlob], file.name.replace(/\.[^/.]+$/, ".mp3"), { type: 'audio/mp3' });
          // await importFile(audioFile);
          alert("Video import temporarily disabled");
        } else if (file.type.startsWith('audio/')) {
          await importFile(file);
        }
      }
    } catch (error) {
      console.error("Import failed:", error);
      alert("Failed to import file. See console for details.");
    } finally {
      setIsProcessing(false);
    }
  };

  const createDemoAsset = async () => {
    setIsProcessing(true);
    try {
      // Create a simple oscillator beep
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const sampleRate = ctx.sampleRate;
      const duration = 5; // 5 seconds
      const numFrames = duration * sampleRate;
      const buffer = ctx.createBuffer(1, numFrames, sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < numFrames; i++) {
        // Sine wave at 440Hz
        data[i] = Math.sin(i * 440 * 2 * Math.PI / sampleRate) * 0.5;
      }

      // Convert AudioBuffer to WAV Blob
      const wavBlob = await audioBufferToWav(buffer);
      const file = new File([wavBlob], "Demo_Beep.wav", { type: 'audio/wav' });
      await importFile(file);
    } catch (e) {
      console.error("Demo creation failed", e);
    } finally {
      setIsProcessing(false);
    }
  };

  // Helper to convert AudioBuffer to WAV (simplified)
  const audioBufferToWav = (buffer) => {
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
  };

  const onDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const onDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    handleFileUpload(files);
  };

  const onDragStart = (e, assetId) => {
    e.dataTransfer.setData('application/react-dnd-asset-id', assetId);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDoubleClick = (assetId) => {
    // Add to first track at 0s for testing
    if (tracks.length > 0) {
      addClipToTrack(tracks[0].id, assetId, 0);
    }
  };

  return (
    <div
      style={{ height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text-main)' }}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-header)' }}>
        <h2 style={{ fontSize: '14px', fontWeight: 600 }}>My Media</h2>
      </div>

      <div style={{ padding: '12px', flex: 1, overflowY: 'auto' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <label style={{
            flex: 1,
            padding: '10px',
            backgroundColor: 'var(--primary)',
            borderRadius: '4px',
            fontWeight: 600,
            textAlign: 'center',
            cursor: 'pointer',
            fontSize: '13px'
          }}>
            {isProcessing ? <Loader2 className="animate-spin" size={16} style={{ display: 'inline' }} /> : '+ Import'}
            <input
              type="file"
              multiple
              accept="audio/*,video/*"
              style={{ display: 'none' }}
              onChange={(e) => handleFileUpload(Array.from(e.target.files))}
            />
          </label>
          <button
            onClick={createDemoAsset}
            title="Load Demo Asset"
            style={{
              padding: '10px',
              backgroundColor: 'var(--bg-panel)',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            <Beaker size={18} color="var(--text-muted)" />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {assets.map(asset => (
            <div
              key={asset.id}
              draggable
              onDragStart={(e) => onDragStart(e, asset.id)}
              onDoubleClick={() => handleDoubleClick(asset.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '8px',
                backgroundColor: 'var(--bg-panel)',
                borderRadius: '4px',
                cursor: 'grab',
                border: '1px solid transparent'
              }}
              onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
              onMouseOut={(e) => e.currentTarget.style.borderColor = 'transparent'}
            >
              <div style={{ marginRight: '12px', color: 'var(--text-muted)' }}>
                {asset.type === 'video' ? <Video size={20} /> : <Music size={20} />}
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{asset.name}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {Math.floor(asset.duration / 60)}:{(Math.floor(asset.duration) % 60).toString().padStart(2, '0')}
                </div>
              </div>
            </div>
          ))}
          {assets.length === 0 && !isProcessing && (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', marginTop: '20px' }}>
              Drag & Drop files here
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssetBin;
