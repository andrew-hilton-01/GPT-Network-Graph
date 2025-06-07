/**
 * ChatGPT conversations.json parser
 * Converts the complex nested structure into a flat array of messages
 */

/**
 * Main parsing function
 * @param {string} jsonString - Raw JSON content from the file
 * @returns {Array} Array of message objects
 */
export function parseConversations(jsonString) {
  try {
    const data = JSON.parse(jsonString);
    
    // Validate the structure
    if (!Array.isArray(data)) {
      throw new Error('Invalid format: Expected an array of conversations');
    }
    
    const messages = [];
    
    // Process each conversation
    data.forEach((conversation, conversationIndex) => {
      if (!conversation || typeof conversation !== 'object') {
        console.warn(`Skipping invalid conversation at index ${conversationIndex}`);
        return;
      }
      
      // Extract conversation metadata
      const conversationId = conversation.id || `conv_${conversationIndex}`;
      const title = conversation.title || 'Untitled Conversation';
      const createTime = conversation.create_time || null;
      const updateTime = conversation.update_time || null;
      
      // Process the mapping (contains the actual messages)
      const mapping = conversation.mapping || {};
      
      // Extract messages from the mapping
      const conversationMessages = extractMessagesFromMapping(
        mapping, 
        conversationId, 
        title,
        createTime,
        updateTime
      );
      
      messages.push(...conversationMessages);
    });
    
    console.log(`Parsed ${messages.length} messages from ${data.length} conversations`);
    return messages;
    
  } catch (error) {
    console.error('Error parsing conversations:', error);
    throw new Error(`Failed to parse conversations: ${error.message}`);
  }
}

/**
 * Extract messages from the mapping structure
 * @param {Object} mapping - The mapping object from a conversation
 * @param {string} conversationId - ID of the conversation
 * @param {string} title - Title of the conversation
 * @param {number} createTime - Creation timestamp
 * @param {number} updateTime - Update timestamp
 * @returns {Array} Array of message objects
 */
function extractMessagesFromMapping(mapping, conversationId, title, createTime, updateTime) {
  const messages = [];
  
  // Traverse the mapping to find actual messages
  Object.keys(mapping).forEach(nodeId => {
    const node = mapping[nodeId];
    
    if (!node || !node.message) {
      return; // Skip nodes without messages
    }
    
    const message = node.message;
    
    // Skip system messages or empty messages
    if (!message.content || !message.content.parts || message.content.parts.length === 0) {
      return;
    }
    
    // Extract the actual text content
    const textContent = extractTextFromParts(message.content.parts);
    
    if (!textContent || textContent.trim().length === 0) {
      return; // Skip empty messages
    }
    
    // Determine the role (user, assistant, system)
    const role = message.author?.role || 'unknown';
    
    // Create the message object
    const messageObj = {
      id: message.id || nodeId,
      text: textContent,
      role: role,
      timestamp: message.create_time || createTime,
      conversationId: conversationId,
      conversationTitle: title,
      nodeId: nodeId,
      
      // Additional metadata
      metadata: {
        model: message.metadata?.model_slug || null,
        finishReason: message.metadata?.finish_details?.type || null,
        parentId: node.parent || null,
        children: node.children || [],
        conversationCreateTime: createTime,
        conversationUpdateTime: updateTime
      }
    };
    
    messages.push(messageObj);
  });
  
  // Sort messages by timestamp within each conversation
  messages.sort((a, b) => {
    const timeA = a.timestamp || 0;
    const timeB = b.timestamp || 0;
    return timeA - timeB;
  });
  
  return messages;
}

/**
 * Extract text content from message parts
 * @param {Array} parts - Array of content parts
 * @returns {string} Extracted text content
 */
function extractTextFromParts(parts) {
  if (!Array.isArray(parts)) {
    return '';
  }
  
  return parts
    .filter(part => typeof part === 'string' && part.trim().length > 0)
    .join(' ')
    .trim();
}

/**
 * Get statistics about the parsed conversations
 * @param {Array} messages - Array of message objects
 * @returns {Object} Statistics object
 */
export function getConversationStats(messages) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return {
      totalMessages: 0,
      totalConversations: 0,
      userMessages: 0,
      assistantMessages: 0,
      averageMessagesPerConversation: 0,
      dateRange: null,
      topModels: []
    };
  }
  
  const conversations = new Set();
  const roles = {};
  const models = {};
  const timestamps = [];
  
  messages.forEach(message => {
    // Count conversations
    conversations.add(message.conversationId);
    
    // Count roles
    roles[message.role] = (roles[message.role] || 0) + 1;
    
    // Count models
    if (message.metadata.model) {
      models[message.metadata.model] = (models[message.metadata.model] || 0) + 1;
    }
    
    // Collect timestamps
    if (message.timestamp) {
      timestamps.push(message.timestamp);
    }
  });
  
  // Calculate date range
  let dateRange = null;
  if (timestamps.length > 0) {
    const sortedTimestamps = timestamps.sort((a, b) => a - b);
    dateRange = {
      earliest: new Date(sortedTimestamps[0] * 1000),
      latest: new Date(sortedTimestamps[sortedTimestamps.length - 1] * 1000)
    };
  }
  
  // Get top models
  const topModels = Object.entries(models)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([model, count]) => ({ model, count }));
  
  return {
    totalMessages: messages.length,
    totalConversations: conversations.size,
    userMessages: roles.user || 0,
    assistantMessages: roles.assistant || 0,
    averageMessagesPerConversation: conversations.size > 0 ? 
      Math.round(messages.length / conversations.size * 10) / 10 : 0,
    dateRange,
    topModels
  };
}

/**
 * Filter messages by various criteria
 * @param {Array} messages - Array of message objects
 * @param {Object} filters - Filter criteria
 * @returns {Array} Filtered messages
 */
export function filterMessages(messages, filters = {}) {
  if (!Array.isArray(messages)) {
    return [];
  }
  
  let filtered = messages;
  
  // Filter by role
  if (filters.role && filters.role !== 'all') {
    filtered = filtered.filter(msg => msg.role === filters.role);
  }
  
  // Filter by date range
  if (filters.startDate || filters.endDate) {
    filtered = filtered.filter(msg => {
      if (!msg.timestamp) return false;
      
      const msgDate = new Date(msg.timestamp * 1000);
      
      if (filters.startDate && msgDate < filters.startDate) {
        return false;
      }
      
      if (filters.endDate && msgDate > filters.endDate) {
        return false;
      }
      
      return true;
    });
  }
  
  // Filter by minimum text length
  if (filters.minLength) {
    filtered = filtered.filter(msg => msg.text.length >= filters.minLength);
  }
  
  // Filter by search term
  if (filters.searchTerm) {
    const term = filters.searchTerm.toLowerCase();
    filtered = filtered.filter(msg => 
      msg.text.toLowerCase().includes(term) ||
      msg.conversationTitle.toLowerCase().includes(term)
    );
  }
  
  return filtered;
}

/**
 * Sample a subset of messages for testing
 * @param {Array} messages - Array of message objects
 * @param {number} maxMessages - Maximum number of messages to return
 * @returns {Array} Sampled messages
 */
export function sampleMessages(messages, maxMessages = 1000) {
  if (!Array.isArray(messages) || messages.length <= maxMessages) {
    return messages;
  }
  
  // Try to maintain conversation structure by sampling conversations
  const conversationGroups = {};
  
  messages.forEach(msg => {
    if (!conversationGroups[msg.conversationId]) {
      conversationGroups[msg.conversationId] = [];
    }
    conversationGroups[msg.conversationId].push(msg);
  });
  
  const conversations = Object.values(conversationGroups);
  const sampledMessages = [];
  
  // Calculate how many messages per conversation to keep
  const messagesPerConv = Math.floor(maxMessages / conversations.length);
  
  conversations.forEach(convMessages => {
    if (convMessages.length <= messagesPerConv) {
      sampledMessages.push(...convMessages);
    } else {
      // Sample evenly from the conversation
      const step = convMessages.length / messagesPerConv;
      for (let i = 0; i < messagesPerConv; i++) {
        const index = Math.floor(i * step);
        sampledMessages.push(convMessages[index]);
      }
    }
  });
  
  return sampledMessages.slice(0, maxMessages);
}