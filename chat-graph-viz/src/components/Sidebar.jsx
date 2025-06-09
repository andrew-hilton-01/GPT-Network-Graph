

function Sidebar({ messages, graphData, isProcessing, processingProgress, clusterLegend, sampleSize,
  setSampleSize,
  conversationLimit,
  setConversationLimit}) {
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
          <p>All data loading / processing is done in-browser, on your machine. Nothing is stored.</p>
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
              <li style={{ marginBottom: '8px' }}>Set your sample size. <p>This is how deep to sample from each conversation, distributed evenly</p></li>
              <li style={{ marginBottom: '8px' }}>Select the limit of conversations. Starts from most recent, default is {conversationLimit}</li>
              <li style={{ marginBottom: '8px' }}>Upload your ChatGPT conversations.json file</li>
              <li style={{ marginBottom: '8px' }}>AI analyzes message content using embeddings to create clusters titled by common keywords</li>
              <li style={{ marginBottom: '8px' }}>Conversations are positioned by semantic similarity, outliers are black nodes</li>
              <li>Too little data can fail to cluster properly, large graphs can take awhile to load.</li>
            </ol>
          </div>
        )}
        {!messages.length && !isProcessing && (
  <div style={{ 
    fontSize: '14px', 
    color: '#718096', 
    lineHeight: '1.5',
    marginTop: '20px'
  }}>
    <h4 style={{ color: '#2d3748', marginBottom: '12px', textAlign: "center"}}>Options</h4>
    <div style={{marginBottom: "14px"}}>
      <label htmlFor="sample-size-slider">Sample Size</label>
      <input
        type="range"
        id="sample-size-slider"
        min={500}
        max={5000}
        step={100}
        value={sampleSize}
        onChange={e => setSampleSize(Number(e.target.value))}
      />
      <div style={{textAlign: "right", color: "#bbb", fontSize: "0.9em"}}>{sampleSize}</div>

      <label htmlFor="convo-amt-slider">Conversation Limit</label>
      <input
        type="range"
        id="convo-amt-slider"
        min={10}
        max={1000}
        step={10}
        value={conversationLimit}
        onChange={e => setConversationLimit(Number(e.target.value))}
      />
      <div style={{textAlign: "right", color: "#bbb", fontSize: "0.9em"}}>{conversationLimit}</div>
    </div>
  </div>
)}
          {/* Cluster Legend */}
          {clusterLegend && clusterLegend.length > 0 && (
          <div className="stats-panel">
            <h3 className="stats-title">Clusters</h3>
            <ol className="cluster-legend" style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {clusterLegend
                .slice() // copy to avoid mutating original
                .sort((a, b) => b.count - a.count) // descending order by count
                .map(cl => (
                  <li key={cl.id} style={{ color: cl.color, marginBottom: '4px', display: 'flex', alignItems: 'center' }}>
                    <span style={{
                      background: cl.color,
                      display: 'inline-block',
                      borderRadius: '50%',
                      width: '1em',
                      height: '1em',
                      marginRight: '0.6em',
                      boxShadow: '0 0 0 1.5px #8882'
                    }}></span>
                    <span style={{ fontWeight: 600 }}>{cl.label}</span>
                    <span style={{color:"#aaa", marginLeft: "auto", fontSize: "0.92em"}}>({cl.count})</span>
                  </li>
                ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}

export default Sidebar;