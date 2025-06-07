// components/FileUpload.jsx
import React, { useRef, useState } from 'react';
import { parseConversations, getConversationStats, sampleMessages } from '../utils/ChatParser.js';

function FileUpload({ onMessagesLoaded, isProcessing, setIsProcessing, setProcessingStatus, setGraphData }) {
  const fileInputRef = useRef(null);
  const [error, setError] = useState(null);
  const [fileInfo, setFileInfo] = useState(null);

  const handleFileSelect = () => {
    if (isProcessing) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Reset previous state
    setError(null);
    setFileInfo(null);
    
    try {
      setIsProcessing(true);
      setProcessingStatus('Reading file...');
      
      // Validate file type
      if (!file.name.endsWith('.json')) {
        throw new Error('Please select a JSON file');
      }
      
      // Read the file
      const fileContent = await readFile(file);
      setProcessingStatus('Parsing conversations...');
      
      // Parse the conversations
      const messages = parseConversations(fileContent);
      
      if (messages.length === 0) {
        throw new Error('No valid messages found in the file');
      }
      
      // Sample messages if there are too many (for performance)
      const sampledMessages = sampleMessages(messages, 2000);
      
      if (sampledMessages.length < messages.length) {
        setProcessingStatus(`Sampled ${sampledMessages.length} messages from ${messages.length} total`);
      }
      
      // Get statistics
      const stats = getConversationStats(sampledMessages);
      
      // Update file info
      setFileInfo({
        name: file.name,
        size: formatFileSize(file.size),
        totalMessages: messages.length,
        sampledMessages: sampledMessages.length,
        conversations: stats.totalConversations,
        dateRange: stats.dateRange
      });
      
      // Pass the messages to the parent component
      onMessagesLoaded(sampledMessages);
      setProcessingStatus('Conversations loaded successfully!');
      
      // Clear the success message after 3 seconds
      setTimeout(() => {
        setProcessingStatus('');
      }, 3000);
      
    } catch (err) {
      console.error('Error processing file:', err);
      setError(err.message);
      setProcessingStatus('');
    } finally {
      setIsProcessing(false);
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle drag and drop
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isProcessing) return;
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      // Simulate file input change
      const event = { target: { files: [file] } };
      handleFileChange(event);
    }
  };

  return (
    <div>
      <div 
        className={`file-upload ${isProcessing ? 'disabled' : ''}`}
        onClick={handleFileSelect}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileChange}
          disabled={isProcessing}
        />
        
        <button 
          className="upload-button"
          disabled={isProcessing}
        >
          {isProcessing ? 'Processing...' : 'Choose ChatGPT Export File'}
        </button>
        
        <p className="upload-text">
          Select your conversations.json file from ChatGPT export
          <br />
          <small>Or drag and drop the file here</small>
        </p>
      </div>

      {/* Error display */}
      {error && (
        <div className="status-message status-error">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* File info display */}
      {fileInfo && (
        <div className="status-message status-success">
          <strong>File loaded:</strong> {fileInfo.name} ({fileInfo.size})
          <br />
          <small>
            {fileInfo.sampledMessages} messages from {fileInfo.conversations} conversations
            {fileInfo.dateRange && (
              <span>
                {' • '}
                {fileInfo.dateRange.earliest.toLocaleDateString()} to{' '}
                {fileInfo.dateRange.latest.toLocaleDateString()}
              </span>
            )}
          </small>
        </div>
      )}
    </div>
  );
}

// Helper functions
function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      resolve(e.target.result);
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default FileUpload;