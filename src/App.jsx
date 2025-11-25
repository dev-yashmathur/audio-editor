import React from 'react';
import AssetBin from './components/Sidebar/AssetBin';
import Visualizer from './components/Stage/Visualizer';
import ActionToolbar from './components/Toolbar/ActionToolbar';
import Timeline from './components/Timeline/Timeline';
import './App.css';

function App() {
  return (
    <div className="app-container" style={{ display: 'flex', height: '100%', width: '100%', overflow: 'hidden' }}>
      {/* Zone A: Sidebar */}
      <div style={{
        width: '280px',
        minWidth: '200px',
        borderRight: '1px solid var(--border)',
        backgroundColor: 'var(--bg-panel)',
        zIndex: 20
      }}>
        <AssetBin />
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        {/* Zone B: Visual Stage */}
        <div style={{
          height: '40%',
          minHeight: '200px',
          borderBottom: '1px solid var(--border)',
          position: 'relative'
        }}>
          <Visualizer />
        </div>

        {/* Zone C: Timeline Area */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--bg-dark)',
          position: 'relative',
          minHeight: 0
        }}>
          <ActionToolbar />
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <Timeline />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
