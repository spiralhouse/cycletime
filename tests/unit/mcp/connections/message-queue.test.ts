import { describe, it, expect, vi } from 'vitest';

import { MessageQueue, MessagePriority } from '../../../../src/mcp/connections/message-queue.js';

describe('MessageQueue - Simple Tests', () => {
  const mockConnectionId = 'conn-123';

  it('should initialize with correct properties', () => {
    const messageQueue = new MessageQueue(mockConnectionId);

    expect(messageQueue.getConnectionId()).toBe(mockConnectionId);
    expect(messageQueue.size()).toBe(0);
    expect(messageQueue.isEmpty()).toBe(true);
    expect(messageQueue.isFull()).toBe(false);
  });

  it('should enqueue messages with default priority', () => {
    const messageQueue = new MessageQueue(mockConnectionId);
    const message = { id: '1', content: 'test message' };
    const result = messageQueue.enqueue(message);

    expect(result.success).toBe(true);
    expect(messageQueue.size()).toBe(1);
    expect(messageQueue.isEmpty()).toBe(false);
  });

  it('should enqueue messages with specified priority', () => {
    const messageQueue = new MessageQueue(mockConnectionId);
    const message = { id: '1', content: 'urgent message' };
    const result = messageQueue.enqueue(message, MessagePriority.HIGH);

    expect(result.success).toBe(true);
    expect(messageQueue.size()).toBe(1);
  });

  it('should dequeue messages by priority order', () => {
    const messageQueue = new MessageQueue(mockConnectionId);
    
    messageQueue.enqueue({ id: '1', content: 'low msg' }, MessagePriority.LOW);
    messageQueue.enqueue({ id: '2', content: 'normal msg' }, MessagePriority.NORMAL);
    messageQueue.enqueue({ id: '3', content: 'high msg' }, MessagePriority.HIGH);

    const highMsg = messageQueue.dequeue();

    expect(highMsg?.message.content).toBe('high msg');
    
    const normalMsg = messageQueue.dequeue();

    expect(normalMsg?.message.content).toBe('normal msg');
    
    const lowMsg = messageQueue.dequeue();

    expect(lowMsg?.message.content).toBe('low msg');
  });

  it('should handle full queue', () => {
    const smallQueue = new MessageQueue(mockConnectionId, { maxSize: 2 });
    
    smallQueue.enqueue({ id: '1', content: 'msg1' });
    smallQueue.enqueue({ id: '2', content: 'msg2' });
    
    const result = smallQueue.enqueue({ id: '3', content: 'msg3' });
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('Queue is full');
    expect(smallQueue.size()).toBe(2);
    expect(smallQueue.isFull()).toBe(true);
  });

  it('should handle duplicate message IDs', () => {
    const messageQueue = new MessageQueue(mockConnectionId);
    const message1 = { id: '1', content: 'first message' };
    const message2 = { id: '1', content: 'second message' };
    
    messageQueue.enqueue(message1);
    const result = messageQueue.enqueue(message2);
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('already exists');
    expect(messageQueue.size()).toBe(1);
  });

  it('should remove message by ID', () => {
    const messageQueue = new MessageQueue(mockConnectionId);
    
    messageQueue.enqueue({ id: '1', content: 'msg1' });
    messageQueue.enqueue({ id: '2', content: 'msg2' });
    messageQueue.enqueue({ id: '3', content: 'msg3' });
    
    const result = messageQueue.remove('2');
    
    expect(result.success).toBe(true);
    expect(result.data?.message.content).toBe('msg2');
    expect(messageQueue.size()).toBe(2);
  });

  it('should track statistics correctly', () => {
    const messageQueue = new MessageQueue(mockConnectionId);
    
    messageQueue.enqueue({ id: '1', content: 'msg1' });
    messageQueue.enqueue({ id: '2', content: 'msg2' });
    messageQueue.dequeue();
    
    const stats = messageQueue.getStatistics();
    
    expect(stats.totalEnqueued).toBe(2);
    expect(stats.totalDequeued).toBe(1);
    expect(stats.currentSize).toBe(1);
    expect(stats.maxSize).toBe(100); // default
  });
});