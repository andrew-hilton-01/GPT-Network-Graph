// components/GraphContainer.jsx
import React from 'react';

function GraphContainer({ graphData, isLoading }) {
  if (isLoading) {
    return (
      <div className="graph-container">
        <div className="loading">
          <div className="spinner"></div>
          <span className="loading-text">Processing your conversations...</span>
        </div>
      </div>
    );
  }

  if (!graphData) {
    return (
      <div className="graph-container">
        <div className="graph-placeholder">
          Upload a ChatGPT export to visualize your conversations
        </div>
      </div>
    );
  }

  return (
    <div className="graph-container">
      {/* TODO: Sigma.js graph will go here */}
      <div className="graph-placeholder">
        Graph visualization will appear here
        <br />
        <small>Data loaded: {graphData ? 'Yes' : 'No'}</small>
      </div>
    </div>
  );
}

export default GraphContainer;