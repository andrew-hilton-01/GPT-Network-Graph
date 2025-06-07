import React from 'react';

function Sidebar({ messages, graphData, isProcessing, processingProgress }) {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h1>Chat Graph Viz</h1>
        <p style={{ fontSize: '14px', color: '#718096' }}>
          Visualize your ChatGPT conversations
        </p>
      </div>
      
      <div className="sidebar-content">
        {/* File Statistics */}
        {messages.length > 0 && (
          <div className="stats-panel">
            <h3 className="stats-title">Data Overview</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-value">{messages.length}</div>
                <div className="stat-label">Messages</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">
                  {new Set(messages.map(m => m.conversationId)).size}
                </div>
                <div className="stat-label">Conversations</div>
              </div>
            </div>
          </div>
        )}
        
        {/* Processing Progress */}
        {isProcessing && (
          <div className="stats-panel">
            <h3 className="stats-title">Processing</h3>
            {processingProgress ? (
              <div>
                <div className="stat-item text-center mb-2">
                  <div className="stat-value">
                    {Math.round((processingProgress.current / processingProgress.total) * 100)}%
                  </div>
                  <div className="stat-label">Complete</div>
                </div>
                
                <div className="progress-container">
                  <div 
                    className="progress-bar" 
                    style={{ 
                      width: `${(processingProgress.current / processingProgress.total) * 100}%` 
                    }}
                  ></div>
                </div>
                
                <div style={{ 
                  fontSize: '12px', 
                  color: '#718096', 
                  textAlign: 'center',
                  marginTop: '8px'
                }}>
                  {processingProgress.step === 'embeddings' ? 'Generating embeddings...' : 'Clustering messages...'}
                  <br />
                  {processingProgress.current} / {processingProgress.total}
                </div>
              </div>
            ) : (
              <div className="loading">
                <div className="spinner"></div>
                <span className="loading-text">Processing...</span>
              </div>
            )}
          </div>
        )}
        
        {/* Processing Results */}
        {graphData && (
          <div className="stats-panel">
            <h3 className="stats-title">Analysis Results</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-value">{graphData.stats.totalMessages}</div>
                <div className="stat-label">Processed</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{graphData.stats.totalClusters}</div>
                <div className="stat-label">Clusters</div>
              </div>
            </div>
            
            <div style={{ 
              fontSize: '12px', 
              color: '#718096', 
              textAlign: 'center',
              marginTop: '12px'
            }}>
              Embedding dimensions: {graphData.stats.embeddingDimensions}
            </div>
          </div>
        )}
        
        {/* Model Status */}
        <div style={{ 
          fontSize: '12px', 
          color: '#a0aec0', 
          textAlign: 'center',
          marginTop: '20px',
          padding: '12px',
          backgroundColor: '#f7fafc',
          borderRadius: '6px'
        }}>
          <strong>AI Model:</strong> Universal Sentence Encoder
          <br />
          <strong>Framework:</strong> TensorFlow.js
        </div>
        
        {/* Instructions */}
        {!messages.length && !isProcessing && (
          <div style={{ 
            fontSize: '14px', 
            color: '#718096', 
            lineHeight: '1.5',
            marginTop: '20px'
          }}>
            <h4 style={{ color: '#2d3748', marginBottom: '12px' }}>How it works:</h4>
            <ol style={{ paddingLeft: '20px' }}>
              <li style={{ marginBottom: '8px' }}>Upload your ChatGPT conversations.json file</li>
              <li style={{ marginBottom: '8px' }}>AI analyzes message content using embeddings</li>
              <li style={{ marginBottom: '8px' }}>Messages are clustered by similarity</li>
              <li>Interactive graph shows conversation patterns</li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}

export default Sidebar;