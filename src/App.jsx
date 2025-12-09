import React from 'react';
import AssetBin from './components/Sidebar/AssetBin';
import ActionToolbar from './components/Toolbar/ActionToolbar';
import Timeline from './components/Timeline/Timeline';
import Visualizer from './components/Stage/Visualizer';
import KeyboardShortcuts from './components/KeyboardShortcuts';



function App() {
  const [sidebarWidth, setSidebarWidth] = React.useState(280);
  const [isResizing, setIsResizing] = React.useState(false);
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const sidebarRef = React.useRef(null);

  const startResizing = React.useCallback(() => {
    setIsResizing(true);
  }, []);

  const stopResizing = React.useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = React.useCallback(
    (mouseMoveEvent) => {
      if (isResizing) {
        const newWidth = mouseMoveEvent.clientX;
        if (newWidth < 50) {
          setIsCollapsed(true);
          setSidebarWidth(0);
        } else {
          setIsCollapsed(false);
          setSidebarWidth(Math.max(150, Math.min(newWidth, 600)));
        }
      }
    },
    [isResizing]
  );

  React.useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);

  const toggleSidebar = () => {
    if (isCollapsed) {
      setIsCollapsed(false);
      setSidebarWidth(280);
    } else {
      setIsCollapsed(true);
      setSidebarWidth(0);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }}>
      <KeyboardShortcuts />

      {/* Sidebar */}
      <div style={{
        width: isCollapsed ? '0px' : `${sidebarWidth}px`,
        minWidth: isCollapsed ? '0px' : '150px',
        borderRight: isCollapsed ? 'none' : '1px solid var(--border)',
        backgroundColor: 'var(--bg-panel)',
        zIndex: 20,
        overflow: 'hidden',
        position: 'relative',
        transition: isResizing ? 'none' : 'width 0.2s ease'
      }}>
        <AssetBin onClose={() => { setIsCollapsed(true); setSidebarWidth(0); }} />
      </div>

      {/* Resize Handle */}
      {!isCollapsed && (
        <div
          onMouseDown={startResizing}
          style={{
            width: '4px',
            cursor: 'col-resize',
            backgroundColor: isResizing ? 'var(--primary)' : 'transparent',
            zIndex: 21,
            height: '100%',
            transition: 'background-color 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--primary)'}
          onMouseOut={(e) => !isResizing && (e.currentTarget.style.backgroundColor = 'transparent')}
        />
      )}

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative' }}>

        {/* Show Sidebar Button (when collapsed) */}
        {isCollapsed && (
          <button
            onClick={toggleSidebar}
            style={{
              position: 'absolute',
              top: '12px',
              left: '12px',
              zIndex: 30,
              backgroundColor: 'var(--bg-panel)',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              padding: '6px',
              cursor: 'pointer',
              color: 'var(--text-muted)'
            }}
            title="Show Sidebar"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="9" y1="3" x2="9" y2="21" />
            </svg>
          </button>
        )}

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
