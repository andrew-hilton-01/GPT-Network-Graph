// public/processingWorker.js
// Web Worker for processing message embeddings and clustering

// Import TensorFlow.js and Universal Sentence Encoder
importScripts('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.10.0/dist/tf.min.js');
importScripts('https://cdn.jsdelivr.net/npm/@tensorflow-models/universal-sentence-encoder@1.3.3/dist/universal-sentence-encoder.min.js');

// Global variables
let model = null;
let isModelLoaded = false;

// Initialize the worker
console.log('Processing Worker initialized');

// Main message handler
self.onmessage = async function(event) {
  const { type, payload } = event.data;
  
  try {
    switch (type) {
      case 'LOAD_MODEL':
        await loadModel();
        break;
        
      case 'PROCESS_MESSAGES':
        await processMessages(payload);
        break;
        
      default:
        self.postMessage({
          type: 'ERROR',
          payload: `Unknown message type: ${type}`
        });
    }
  } catch (error) {
    console.error('Worker error:', error);
    self.postMessage({
      type: 'ERROR',
      payload: error.message
    });
  }
};

/**
 * Load the Universal Sentence Encoder model
 */
async function loadModel() {
  try {
    self.postMessage({
      type: 'STATUS',
      payload: 'Loading Universal Sentence Encoder model...'
    });
    
    // Load the model
    model = await use.load();
    isModelLoaded = true;
    
    self.postMessage({
      type: 'MODEL_LOADED',
      payload: 'Model loaded successfully'
    });
    
    console.log('Universal Sentence Encoder model loaded');
    
  } catch (error) {
    console.error('Error loading model:', error);
    self.postMessage({
      type: 'ERROR',
      payload: `Failed to load model: ${error.message}`
    });
  }
}

/**
 * Process messages: generate embeddings and cluster
 */
async function processMessages(messages) {
  if (!isModelLoaded) {
    throw new Error('Model not loaded. Call LOAD_MODEL first.');
  }
  
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error('Invalid messages array');
  }
  
  console.log(`Processing ${messages.length} messages...`);
  
  try {
    // Step 1: Generate embeddings
    self.postMessage({
      type: 'STATUS',
      payload: `Generating embeddings for ${messages.length} messages...`
    });
    
    const embeddings = await generateEmbeddings(messages);
    
    // Step 2: Perform clustering
    self.postMessage({
      type: 'STATUS',
      payload: 'Clustering messages by similarity...'
    });
    
    const clusteredMessages = await clusterMessages(messages, embeddings);
    
    // Step 3: Send results back
    self.postMessage({
      type: 'PROCESSING_COMPLETE',
      payload: {
        messages: clusteredMessages,
        stats: {
          totalMessages: messages.length,
          totalClusters: Math.max(...clusteredMessages.map(m => m.clusterId)) + 1,
          embeddingDimensions: embeddings.length > 0 ? embeddings[0].length : 0
        }
      }
    });
    
    console.log('Processing complete');
    
  } catch (error) {
    console.error('Error processing messages:', error);
    throw error;
  }
}

/**
 * Generate embeddings for all messages
 */
async function generateEmbeddings(messages) {
  const batchSize = 50; // Process in batches to avoid memory issues
  const allEmbeddings = [];
  
  // Extract text content and clean it
  const texts = messages.map(msg => cleanText(msg.text));
  
  // Process in batches
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const batchEnd = Math.min(i + batchSize, texts.length);
    
    self.postMessage({
      type: 'PROGRESS',
      payload: {
        step: 'embeddings',
        current: batchEnd,
        total: texts.length,
        message: `Processing embeddings: ${batchEnd}/${texts.length}`
      }
    });
    
    try {
      // Generate embeddings for this batch
      const embeddings = await model.embed(batch);
      const embeddingArray = await embeddings.array();
      
      // Add to results
      allEmbeddings.push(...embeddingArray);
      
      // Clean up tensor to prevent memory leaks
      embeddings.dispose();
      
      // Small delay to prevent blocking
      await new Promise(resolve => setTimeout(resolve, 10));

    } catch (error) {
      console.error(`Error processing batch ${i}-${batchEnd}:`, error);
      throw error;
    }
  }
  
  return allEmbeddings;
}

/**
 * Clean text for better embedding quality
 */
function cleanText(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  return text
    .trim()
    .replace(/\s+/g, ' ') // Normalize whitespace
    .substring(0, 500); // Limit length for performance
}

/**
 * Cluster messages using K-means clustering
 */
async function clusterMessages(messages, embeddings) {
  if (embeddings.length !== messages.length) {
    throw new Error('Embeddings and messages length mismatch');
  }
  
  // Determine optimal number of clusters (simple heuristic)
  const numClusters = Math.min(
    Math.max(3, Math.floor(Math.sqrt(messages.length / 2))),
    20 // Cap at 20 clusters for visualization
  );
  
  console.log(`Clustering into ${numClusters} clusters`);
  
  self.postMessage({
    type: 'STATUS',
    payload: `Running K-means clustering (${numClusters} clusters)...`
  });
  
  // Run K-means clustering
  const clusterAssignments = await kMeansClustering(embeddings, numClusters);
  
  // Assign cluster IDs to messages
  const clusteredMessages = messages.map((message, index) => ({
    ...message,
    clusterId: clusterAssignments[index],
    embedding: embeddings[index] // Include embedding for graph layout
  }));
  
  return clusteredMessages;
}

/**
 * K-means clustering implementation
 */
async function kMeansClustering(embeddings, k, maxIterations = 10) {
  const numPoints = embeddings.length;
  const dimensions = embeddings[0].length;
  
  // Initialize centroids randomly
  let centroids = [];
  for (let i = 0; i < k; i++) {
    const randomIndex = Math.floor(Math.random() * numPoints);
    centroids.push([...embeddings[randomIndex]]);
  }
  
  let assignments = new Array(numPoints).fill(0);
  
  // K-means iterations
  for (let iter = 0; iter < maxIterations; iter++) {
    let changed = false;
    
    // Assign points to nearest centroid
    for (let i = 0; i < numPoints; i++) {
      let minDistance = Infinity;
      let closestCentroid = 0;
      
      for (let j = 0; j < k; j++) {
        const distance = euclideanDistance(embeddings[i], centroids[j]);
        if (distance < minDistance) {
          minDistance = distance;
          closestCentroid = j;
        }
      }
      
      if (assignments[i] !== closestCentroid) {
        assignments[i] = closestCentroid;
        changed = true;
      }
    }
    
    // Update centroids
    const newCentroids = new Array(k).fill(null).map(() => new Array(dimensions).fill(0));
    const clusterCounts = new Array(k).fill(0);
    
    for (let i = 0; i < numPoints; i++) {
      const cluster = assignments[i];
      clusterCounts[cluster]++;
      
      for (let d = 0; d < dimensions; d++) {
        newCentroids[cluster][d] += embeddings[i][d];
      }
    }
    
    // Average the centroids
    for (let j = 0; j < k; j++) {
      if (clusterCounts[j] > 0) {
        for (let d = 0; d < dimensions; d++) {
          newCentroids[j][d] /= clusterCounts[j];
        }
      }
    }
    
    centroids = newCentroids;
    
    // Progress update
    self.postMessage({
      type: 'PROGRESS',
      payload: {
        step: 'clustering',
        current: iter + 1,
        total: maxIterations,
        message: `K-means iteration ${iter + 1}/${maxIterations}`
      }
    });
    
    // Early termination if no changes
    if (!changed) {
      console.log(`K-means converged after ${iter + 1} iterations`);
      break;
    }
    
    // Small delay to prevent blocking
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  
  return assignments;
}

/**
 * Calculate Euclidean distance between two vectors
 */
function euclideanDistance(a, b) {
  if (a.length !== b.length) {
    throw new Error('Vectors must have same length');
  }
  
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  
  return Math.sqrt(sum);
}