import React, { useState, useEffect, useRef } from 'react';
import FileUpload from './components/FileUpload';
import GraphContainer from './components/GraphContainer';
import Sidebar from './components/Sidebar';
import './App.css';
import { inject } from "@vercel/analytics"
inject();
function App() {
  // State for managing the application data flow
  const [messages, setMessages] = useState([]);
  const [processedData, setProcessedData] = useState(null); // Changed from graphData to processedData
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [processingProgress, setProcessingProgress] = useState(null);
  const [error, setError] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null); // New state for selected message
  const [clusterLegend, setClusterLegend] = useState([]);
  const [sampleSize, setSampleSize] = useState(2000);
  const [conversationLimit, setConversationLimit] = useState(100);
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
          setProcessedData(payload); // Changed from setGraphData to setProcessedData
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
    setSelectedMessage(null); // Clear any selected message
    
    // Start processing the messages
    if (workerRef.current && loadedMessages.length > 0) {
      setIsProcessing(true);
      setProcessedData(null); // Changed from setGraphData to setProcessedData
      setProcessingProgress(null);
      
      workerRef.current.postMessage({
        type: 'PROCESS_MESSAGES',
        payload: loadedMessages
      });
    }
  };

  // Handle message selection from graph
  const handleMessageSelect = (message) => {
    setSelectedMessage(message);
    console.log('Selected message:', message);
  };

  // Clear error handler
  const clearError = () => {
    setError(null);
  };

  return (
    <div className="app-container">
      <Sidebar 
        messages={messages}
        processedData={processedData} // Changed from graphData to processedData
        selectedMessage={selectedMessage} // Pass selected message to sidebar
        isProcessing={isProcessing}
        processingProgress={processingProgress}
        clusterLegend={clusterLegend}
        sampleSize={sampleSize}
        setSampleSize={setSampleSize}
        conversationLimit={conversationLimit}
        setConversationLimit={setConversationLimit}
      />
      
      <main className="main-content">
        {!processedData && (
  <div className="file-upload-section">
    <FileUpload 
      onMessagesLoaded={handleMessagesLoaded}
      isProcessing={isProcessing}
      setIsProcessing={setIsProcessing}
      setProcessingStatus={setProcessingStatus}
      setProcessedData={setProcessedData}
      sampleSize={sampleSize}
      conversationLimit={conversationLimit}
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
)}

        
        {processedData && processedData.messages && processedData.messages.length > 0 && (
        <GraphContainer 
          processedData={processedData}
          onMessageSelect={handleMessageSelect}
          isLoading={isProcessing}
          onLegendReady={setClusterLegend}
        />
      )}

      </main>
    </div>
  );
}

export default App;