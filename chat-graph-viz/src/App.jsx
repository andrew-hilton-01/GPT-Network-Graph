import React, { useState, useEffect, useRef } from 'react';
import FileUpload from './components/FileUpload';
import GraphContainer from './components/GraphContainer';
import Sidebar from './components/Sidebar';
import './App.css';

function App() {
  // State for managing the application data flow
  const [messages, setMessages] = useState([]);
  const [graphData, setGraphData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [processingProgress, setProcessingProgress] = useState(null);
  const [error, setError] = useState(null);
  
  // Web Worker reference
  const workerRef = useRef(null);

  // Initialize Web Worker
  useEffect(() => {
    // Create the worker
    workerRef.current = new Worker('/ProcessingWorker.js');
    
    // Set up worker message handler
    workerRef.current.onmessage = function(event) {
      const { type, payload } = event.data;
      
      console.log('Message from worker:', { type, payload });
      
      switch (type) {
        case 'MODEL_LOADED':
          console.log('✅ Model loaded successfully');
          setProcessingStatus('');
          break;
          
        case 'STATUS':
          setProcessingStatus(payload);
          break;
          
        case 'PROGRESS':
          setProcessingProgress(payload);
          setProcessingStatus(payload.message);
          break;
          
        case 'PROCESSING_COMPLETE':
          console.log('✅ Processing complete:', payload.stats);
          setGraphData(payload);
          setIsProcessing(false);
          setProcessingStatus('Processing complete!');
          setProcessingProgress(null);
          
          // Clear success message after 3 seconds
          setTimeout(() => {
            setProcessingStatus('');
          }, 3000);
          break;
          
        case 'ERROR':
          console.error('❌ Worker error:', payload);
          setError(payload);
          setIsProcessing(false);
          setProcessingStatus('');
          setProcessingProgress(null);
          break;
          
        default:
          console.warn('Unknown worker message type:', type);
      }
    };
    
    // Handle worker errors
    workerRef.current.onerror = function(error) {
      console.error('Worker error:', error);
      setError('Web Worker error occurred');
      setIsProcessing(false);
      setProcessingStatus('');
    };
    
    // Load the model immediately
    workerRef.current.postMessage({ type: 'LOAD_MODEL' });
    setProcessingStatus('Initializing TensorFlow.js model...');
    
    // Cleanup function
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);

  // Handle messages loaded from file upload
  const handleMessagesLoaded = (loadedMessages) => {
    console.log(`📥 Messages loaded: ${loadedMessages.length}`);
    setMessages(loadedMessages);
    setError(null);
    
    // Start processing the messages
    if (workerRef.current && loadedMessages.length > 0) {
      setIsProcessing(true);
      setGraphData(null);
      setProcessingProgress(null);
      
      workerRef.current.postMessage({
        type: 'PROCESS_MESSAGES',
        payload: loadedMessages
      });
    }
  };

  // Clear error handler
  const clearError = () => {
    setError(null);
  };

  return (
    <div className="app-container">
      <Sidebar 
        messages={messages}
        graphData={graphData}
        isProcessing={isProcessing}
        processingProgress={processingProgress}
      />
      
      <main className="main-content">
        <div className="file-upload-section">
          <FileUpload 
            onMessagesLoaded={handleMessagesLoaded}
            isProcessing={isProcessing}
            setIsProcessing={setIsProcessing}
            setProcessingStatus={setProcessingStatus}
            setGraphData={setGraphData}
          />
          
          {/* Processing status */}
          {processingStatus && (
            <div className="status-message status-info">
              {processingStatus}
              {processingProgress && (
                <div className="progress-container mt-2">
                  <div 
                    className="progress-bar" 
                    style={{ 
                      width: `${(processingProgress.current / processingProgress.total) * 100}%` 
                    }}
                  ></div>
                </div>
              )}
            </div>
          )}
          
          {/* Error display */}
          {error && (
            <div className="status-message status-error">
              <strong>Error:</strong> {error}
              <button 
                onClick={clearError}
                style={{ 
                  marginLeft: '10px', 
                  background: 'none', 
                  border: 'none', 
                  color: 'inherit', 
                  textDecoration: 'underline',
                  cursor: 'pointer'
                }}
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
        
        <GraphContainer 
          graphData={graphData}
          isLoading={isProcessing}
        />
      </main>
    </div>
  );
}

export default App;