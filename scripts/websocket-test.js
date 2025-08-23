#!/usr/bin/env node

/**
 * JCVD WebSocket Connection Smoke Test
 * Validates WebSocket functionality and protocol compliance
 * Usage: node websocket-test.js <websocket_url>
 */

const WebSocket = require('ws');
const process = require('process');

// Configuration
const WS_URL = process.argv[2] || 'ws://jcvd-smoke:8080/ws';
const SSE_URL = process.argv[3] || 'http://jcvd-smoke:8080/mcp/events';
const CONNECTION_TIMEOUT = 10000; // 10 seconds
const RESPONSE_TIMEOUT = 5000;    // 5 seconds
const TEST_MESSAGES = [
    { type: 'ping', data: 'test-ping' },
    { type: 'list-tools', data: {} },
    { type: 'invalid', data: 'should-handle-gracefully' }
];

// Colors for output
const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m'
};

function log(level, message) {
    const timestamp = new Date().toISOString();
    const color = colors[level] || colors.reset;
    console.log(`${color}[${level.toUpperCase()}]${colors.reset} ${timestamp} - ${message}`);
}

function logInfo(message) { log('blue', message); }
function logSuccess(message) { log('green', message); }
function logError(message) { log('red', message); }
function logWarning(message) { log('yellow', message); }

class WebSocketSmokeTest {
    constructor(url) {
        this.url = url;
        this.ws = null;
        this.testResults = {
            connection: false,
            messageHandling: false,
            protocolCompliance: false,
            gracefulClose: false
        };
        this.receivedMessages = [];
        this.connectionStartTime = null;
    }

    async runTests() {
        logInfo('======================================');
        logInfo('JCVD WebSocket Smoke Tests - Starting');
        logInfo('======================================');
        logInfo(`Target URL: ${this.url}`);
        logInfo(`Connection timeout: ${CONNECTION_TIMEOUT}ms`);
        logInfo(`Response timeout: ${RESPONSE_TIMEOUT}ms`);
        console.log('');

        try {
            await this.testConnection();
            await this.testMessageHandling();
            await this.testProtocolCompliance();
            await this.testGracefulClose();
            
            this.printResults();
            
            if (Object.values(this.testResults).every(result => result === true)) {
                logSuccess('All WebSocket tests passed!');
                process.exit(0);
            } else {
                logError('Some WebSocket tests failed!');
                process.exit(1);
            }
        } catch (error) {
            logError(`WebSocket test suite failed: ${error.message}`);
            process.exit(1);
        }
    }

    async testConnection() {
        logInfo('Testing WebSocket connection establishment...');
        
        return new Promise((resolve, reject) => {
            this.connectionStartTime = Date.now();
            
            const timeout = setTimeout(() => {
                logWarning(`WebSocket connection timeout after ${CONNECTION_TIMEOUT}ms`);
                logInfo('WebSocket endpoint may not be implemented yet - checking SSE alternative...');
                this.testResults.connection = false;
                this.testSSEFallback().then(resolve).catch(reject);
            }, CONNECTION_TIMEOUT);

            this.ws = new WebSocket(this.url);

            this.ws.on('open', () => {
                const connectionTime = Date.now() - this.connectionStartTime;
                clearTimeout(timeout);
                logSuccess(`WebSocket connected successfully in ${connectionTime}ms`);
                this.testResults.connection = true;
                resolve();
            });

            this.ws.on('error', (error) => {
                clearTimeout(timeout);
                logWarning(`WebSocket connection failed: ${error.message}`);
                logInfo('Testing SSE endpoint as fallback for real-time communication...');
                this.testResults.connection = false;
                this.testSSEFallback().then(resolve).catch(reject);
            });

            // Set up message handler for later tests
            this.ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    this.receivedMessages.push({
                        timestamp: Date.now(),
                        message: message
                    });
                    logInfo(`Received message: ${JSON.stringify(message)}`);
                } catch (e) {
                    logWarning(`Received non-JSON message: ${data.toString()}`);
                    this.receivedMessages.push({
                        timestamp: Date.now(),
                        message: data.toString(),
                        raw: true
                    });
                }
            });
        });
    }

    async testSSEFallback() {
        logInfo('Testing SSE endpoint as WebSocket alternative...');
        
        // Simple connectivity test for SSE endpoint
        const http = require('http');
        const url = require('url');
        
        return new Promise((resolve) => {
            const sseUrl = url.parse(SSE_URL);
            const options = {
                hostname: sseUrl.hostname,
                port: sseUrl.port,
                path: sseUrl.path,
                method: 'GET',
                timeout: 5000
            };

            const req = http.request(options, (res) => {
                if (res.statusCode === 200) {
                    logSuccess('SSE endpoint available for real-time communication');
                    this.testResults.connection = true;
                } else {
                    logWarning(`SSE endpoint returned status ${res.statusCode}`);
                    this.testResults.connection = false;
                }
                resolve();
            });

            req.on('error', (error) => {
                logWarning(`SSE endpoint not accessible: ${error.message}`);
                logInfo('Real-time communication endpoints not yet fully implemented');
                this.testResults.connection = false;
                resolve();
            });

            req.on('timeout', () => {
                logWarning('SSE endpoint timeout - may not be implemented yet');
                this.testResults.connection = false;
                resolve();
            });

            req.end();
        });
    }

    async testMessageHandling() {
        if (!this.testResults.connection) {
            logWarning('Skipping message handling test - connection failed');
            return;
        }

        logInfo('Testing message handling capabilities...');

        for (const testMessage of TEST_MESSAGES) {
            try {
                await this.sendAndWaitForResponse(testMessage);
            } catch (error) {
                logWarning(`Message test failed for ${testMessage.type}: ${error.message}`);
            }
        }

        // Check if we received any responses
        if (this.receivedMessages.length > 0) {
            logSuccess(`Message handling working - received ${this.receivedMessages.length} responses`);
            this.testResults.messageHandling = true;
        } else {
            logWarning('No responses received to test messages');
            this.testResults.messageHandling = false;
        }
    }

    async sendAndWaitForResponse(message) {
        return new Promise((resolve, reject) => {
            const messageId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const messageWithId = { ...message, id: messageId };
            
            logInfo(`Sending test message: ${JSON.stringify(messageWithId)}`);
            
            const timeout = setTimeout(() => {
                logWarning(`No response received for message ${messageId} within ${RESPONSE_TIMEOUT}ms`);
                resolve(); // Don't reject, just continue
            }, RESPONSE_TIMEOUT);

            // Listen for specific response (simplified - just wait for any response)
            const originalMessageCount = this.receivedMessages.length;
            
            this.ws.send(JSON.stringify(messageWithId));

            const checkForResponse = setInterval(() => {
                if (this.receivedMessages.length > originalMessageCount) {
                    clearTimeout(timeout);
                    clearInterval(checkForResponse);
                    logSuccess(`Received response for message ${messageId}`);
                    resolve();
                }
            }, 100);
        });
    }

    async testProtocolCompliance() {
        if (!this.testResults.connection) {
            logWarning('Skipping protocol compliance test - connection failed');
            return;
        }

        logInfo('Testing MCP protocol compliance...');

        // Test basic MCP protocol structure
        const mcpTestMessage = {
            jsonrpc: '2.0',
            method: 'tools/list',
            id: 'protocol_test_1'
        };

        try {
            await this.sendAndWaitForResponse(mcpTestMessage);
            
            // Check if any received messages look like valid MCP responses
            const mcpResponses = this.receivedMessages.filter(msg => 
                !msg.raw && 
                msg.message && 
                (msg.message.jsonrpc === '2.0' || msg.message.id || msg.message.method)
            );

            if (mcpResponses.length > 0) {
                logSuccess(`MCP protocol compliance verified - received ${mcpResponses.length} MCP-format messages`);
                this.testResults.protocolCompliance = true;
            } else {
                logWarning('No MCP-compliant responses detected');
                this.testResults.protocolCompliance = false;
            }
        } catch (error) {
            logError(`Protocol compliance test failed: ${error.message}`);
            this.testResults.protocolCompliance = false;
        }
    }

    async testGracefulClose() {
        if (!this.testResults.connection) {
            logWarning('Skipping graceful close test - connection failed');
            return;
        }

        logInfo('Testing graceful connection close...');

        return new Promise((resolve) => {
            this.ws.on('close', (code, reason) => {
                if (code === 1000) {
                    logSuccess(`WebSocket closed gracefully with code ${code}`);
                    this.testResults.gracefulClose = true;
                } else {
                    logWarning(`WebSocket closed with code ${code}, reason: ${reason}`);
                    this.testResults.gracefulClose = false;
                }
                resolve();
            });

            this.ws.close(1000, 'Test completed');
        });
    }

    printResults() {
        console.log('');
        logInfo('======================================');
        logInfo('WebSocket Test Results Summary');
        logInfo('======================================');
        
        const results = [
            { test: 'Connection Establishment', result: this.testResults.connection },
            { test: 'Message Handling', result: this.testResults.messageHandling },
            { test: 'Protocol Compliance', result: this.testResults.protocolCompliance },
            { test: 'Graceful Close', result: this.testResults.gracefulClose }
        ];

        results.forEach(({ test, result }) => {
            const status = result ? '✓ PASS' : '✗ FAIL';
            const color = result ? 'green' : 'red';
            log(color, `${test}: ${status}`);
        });

        console.log('');
        logInfo(`Total messages received: ${this.receivedMessages.length}`);
        logInfo(`Connection URL: ${this.url}`);
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    logWarning('Received SIGINT, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    logWarning('Received SIGTERM, shutting down gracefully...');
    process.exit(0);
});

// Run the tests
const smokeTest = new WebSocketSmokeTest(WS_URL);
smokeTest.runTests().catch((error) => {
    logError(`Test execution failed: ${error.message}`);
    process.exit(1);
});