import React from 'react';
import AssetBin from './components/Sidebar/AssetBin';
import ActionToolbar from './components/Toolbar/ActionToolbar';
import Timeline from './components/Timeline/Timeline';
import Visualizer from './components/Stage/Visualizer';
import KeyboardShortcuts from './components/KeyboardShortcuts';



function App() {
  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }}>
      <KeyboardShortcuts />
      <div style={{
        width: '280px',
        minWidth: '200px',
        borderRight: '1px solid var(--border)',
        backgroundColor: 'var(--bg-panel)',
        zIndex: 20
      }}>
        <AssetBin />
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ height: '40%', borderBottom: '1px solid var(--border)', position: 'relative' }}>
          <Visualizer />
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <ActionToolbar />
          <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
            <Timeline />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
