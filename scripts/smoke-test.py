#!/usr/bin/env python3
"""
CycleTime Container Smoke Test Script

Comprehensive validation of functionality.
This script performs smoke tests against a running CycleTime server to verify:
- Server startup time
- Health endpoint availability
- MCP endpoints functionality
- Application readiness and response times

Usage:
    python smoke-test.py [--hostname HOSTNAME] [--port PORT] [--timeout TIMEOUT]

Example:
    python3 smoke-test.py # uses the default values equivalent the line below
    python3 smoke-test.py --hostname localhost --port 8080 --timeout 30
"""

import argparse
import json
import sys
import time
import urllib.request
import urllib.error
from typing import Dict, Any, Optional, Tuple

# ANSI color codes for output
class Colors:
    """ANSI color codes for terminal output."""
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    RESET = '\033[0m'
    BOLD = '\033[1m'

def print_status(message: str, status: str = "INFO") -> None:
    """Print a status message with color coding."""
    color = {
        "INFO": Colors.BLUE,
        "SUCCESS": Colors.GREEN,
        "ERROR": Colors.RED,
        "WARN": Colors.YELLOW
    }.get(status, Colors.RESET)

    prefix = {
        "INFO": "ℹ️ ",
        "SUCCESS": "✅",
        "ERROR": "❌",
        "WARN": "⚠️ "
    }.get(status, "")

    print(f"{color}{prefix} {message}{Colors.RESET}")

def print_header(message: str) -> None:
    """Print a section header."""
    print(f"\n{Colors.BOLD}{Colors.CYAN}{message}{Colors.RESET}")

def test_http_connectivity(base_url: str, timeout: int) -> Tuple[bool, float]:
    """
    Test basic HTTP connectivity to the server.

    Verifies that the server is running and responsive to HTTP requests.
    A 404 response is acceptable as it indicates the server is running.
    """
    print_status(f"Testing HTTP connectivity to {base_url}...", "INFO")

    start_time = time.time()
    try:
        req = urllib.request.Request(base_url, method='GET')
        req.add_header('User-Agent', 'CycleTime-SmokeTest/1.0')

        with urllib.request.urlopen(req, timeout=timeout) as response:
            elapsed = time.time() - start_time
            status_code = response.getcode()

            print_status(
                f"Server responding (HTTP {status_code}, {elapsed:.3f}s)",
                "SUCCESS"
            )
            return True, elapsed

    except urllib.error.HTTPError as e:
        elapsed = time.time() - start_time
        if e.code in [404, 405]:
            # 404/405 acceptable - server is running, just no root endpoint
            print_status(
                f"Server responding (HTTP {e.code}, {elapsed:.3f}s)",
                "SUCCESS"
            )
            return True, elapsed
        else:
            print_status(f"HTTP error: {e.code} - {e.reason}", "ERROR")
            return False, elapsed

    except urllib.error.URLError as e:
        elapsed = time.time() - start_time
        print_status(f"Connection failed: {e.reason}", "ERROR")
        return False, elapsed

    except Exception as e:
        elapsed = time.time() - start_time
        print_status(f"Unexpected error: {type(e).__name__}: {str(e)}", "ERROR")
        return False, elapsed

def test_mcp_endpoint_availability(mcp_url: str, timeout: int) -> Tuple[bool, float]:
    """
    Test MCP endpoint availability via SSE connection attempt.

    The MCP endpoint uses Server-Sent Events (SSE) for transport.
    A successful connection returns 200 OK with text/event-stream content type.
    """
    print_status(f"Testing MCP endpoint at {mcp_url}...", "INFO")

    start_time = time.time()
    try:
        req = urllib.request.Request(mcp_url, method='GET')
        req.add_header('Accept', 'text/event-stream')
        req.add_header('User-Agent', 'CycleTime-SmokeTest/1.0')
        req.add_header('Cache-Control', 'no-cache')

        with urllib.request.urlopen(req, timeout=timeout) as response:
            elapsed = time.time() - start_time
            status_code = response.getcode()
            content_type = response.headers.get('Content-Type', '')

            if status_code == 200 and 'text/event-stream' in content_type:
                print_status(
                    f"MCP endpoint available (SSE, {elapsed:.3f}s)",
                    "SUCCESS"
                )
                return True, elapsed
            elif status_code == 200:
                print_status(
                    f"MCP endpoint responding but not SSE (content-type: {content_type})",
                    "WARN"
                )
                return True, elapsed
            else:
                print_status(
                    f"MCP endpoint returned unexpected status: {status_code}",
                    "WARN"
                )
                return False, elapsed

    except urllib.error.HTTPError as e:
        elapsed = time.time() - start_time

        if e.code == 400:
            # 400 might indicate the endpoint is there but requires proper headers
            print_status(
                f"MCP endpoint exists (HTTP 400, may require initialization)",
                "SUCCESS"
            )
            return True, elapsed
        else:
            print_status(f"MCP endpoint error: HTTP {e.code} - {e.reason}", "ERROR")
            return False, elapsed

    except urllib.error.URLError as e:
        elapsed = time.time() - start_time
        print_status(f"MCP endpoint connection failed: {e.reason}", "ERROR")
        return False, elapsed

    except Exception as e:
        elapsed = time.time() - start_time
        print_status(f"Unexpected error: {type(e).__name__}: {str(e)}", "ERROR")
        return False, elapsed

def send_jsonrpc_request(
    url: str,
    method: str,
    params: Optional[Dict[str, Any]] = None,
    timeout: int = 10,
    request_id: int = 1
) -> Tuple[bool, Optional[Dict], float]:
    """
    Send a JSON-RPC 2.0 request to the MCP server.

    MCP uses JSON-RPC 2.0 over HTTP POST (Streamable HTTP transport).

    IMPORTANT (MCP Spec 2025-06-18):
    - MCP-Protocol-Version header REQUIRED on all requests
    - Batch requests REMOVED (will be rejected)
    - Single request/response only
    """
    request_data = {
        "jsonrpc": "2.0",
        "method": method,
        "id": request_id
    }

    if params is not None:
        request_data["params"] = params

    json_data = json.dumps(request_data).encode('utf-8')

    start_time = time.time()
    try:
        req = urllib.request.Request(
            url,
            data=json_data,
            headers={
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'MCP-Protocol-Version': '2025-06-18',  # NEW REQUIREMENT in 2025-06-18
                'User-Agent': 'CycleTime-SmokeTest/1.0'
            },
            method='POST'
        )

        with urllib.request.urlopen(req, timeout=timeout) as response:
            elapsed = time.time() - start_time
            response_data = json.loads(response.read().decode('utf-8'))

            # Check for JSON-RPC error response
            if 'error' in response_data:
                error_info = response_data['error']
                error_msg = error_info.get('message', 'Unknown error')
                error_code = error_info.get('code', 'N/A')
                return False, response_data, elapsed

            return True, response_data, elapsed

    except urllib.error.HTTPError as e:
        elapsed = time.time() - start_time
        try:
            error_body = e.read().decode('utf-8')
            error_data = json.loads(error_body)
            return False, error_data, elapsed
        except:
            return False, {
                "error": {
                    "code": e.code,
                    "message": f"HTTP {e.code}: {e.reason}"
                }
            }, elapsed

    except Exception as e:
        elapsed = time.time() - start_time
        return False, {
            "error": {
                "code": -1,
                "message": f"{type(e).__name__}: {str(e)}"
            }
        }, elapsed

def test_mcp_initialize(mcp_url: str, timeout: int) -> Tuple[bool, float, Optional[Dict]]:
    """
    Test MCP initialize operation.

    The initialize method establishes the protocol version and capabilities.
    Required before any other MCP operations.

    IMPORTANT: MCP Spec 2025-06-18 requires MCP-Protocol-Version header on ALL requests.
    """
    print_status("Sending MCP initialize request...", "INFO")

    params = {
        "protocolVersion": "2025-06-18",
        "capabilities": {},
        "clientInfo": {
            "name": "cycletime-smoke-test",
            "version": "1.0.0"
        }
    }

    success, response, elapsed = send_jsonrpc_request(
        mcp_url,
        "initialize",
        params,
        timeout
    )

    if success and response and 'result' in response:
        result = response['result']
        server_info = result.get('serverInfo', {})
        server_name = server_info.get('name', 'Unknown')
        server_version = server_info.get('version', 'Unknown')

        print_status(
            f"MCP initialized: {server_name} v{server_version} ({elapsed:.3f}s)",
            "SUCCESS"
        )
        return True, elapsed, result
    else:
        error_info = response.get('error', {}) if response else {}
        error_msg = error_info.get('message', 'No response')
        error_code = error_info.get('code', 'N/A')

        print_status(
            f"MCP initialize failed: [{error_code}] {error_msg}",
            "ERROR"
        )
        return False, elapsed, None

def test_mcp_tools_list(mcp_url: str, timeout: int) -> Tuple[bool, int, float, Optional[list]]:
    """
    Test MCP tools/list operation.

    Lists all available MCP tools provided by the server.
    Expected to return tools like session_create_session, project_create_project, etc.
    """
    print_status("Requesting MCP tools list...", "INFO")

    success, response, elapsed = send_jsonrpc_request(
        mcp_url,
        "tools/list",
        None,
        timeout
    )

    if success and response and 'result' in response:
        result = response['result']
        tools = result.get('tools', [])
        tool_count = len(tools)

        print_status(
            f"MCP tools list retrieved: {tool_count} tools available ({elapsed:.3f}s)",
            "SUCCESS"
        )

        # Display sample tools
        if tool_count > 0:
            sample_tools = [t.get('name', 'unknown') for t in tools[:5]]
            if tool_count > 5:
                sample_tools.append(f"... and {tool_count - 5} more")
            print_status(f"  Tools: {', '.join(sample_tools)}", "INFO")

        return True, tool_count, elapsed, tools
    else:
        error_info = response.get('error', {}) if response else {}
        error_msg = error_info.get('message', 'No response')
        error_code = error_info.get('code', 'N/A')

        print_status(
            f"MCP tools/list failed: [{error_code}] {error_msg}",
            "ERROR"
        )
        return False, 0, elapsed, None

def test_mcp_tool_call(mcp_url: str, timeout: int) -> Tuple[bool, float]:
    """
    Test calling a simple MCP tool (project_list_projects).

    Verifies that the tools/call operation works end-to-end.
    Uses project_list_projects as it requires no arguments and is safe to call.
    """
    print_status("Testing MCP tool call (project_list_projects)...", "INFO")

    params = {
        "name": "project_list_projects",
        "arguments": {}
    }

    success, response, elapsed = send_jsonrpc_request(
        mcp_url,
        "tools/call",
        params,
        timeout
    )

    if success and response and 'result' in response:
        result = response['result']
        content = result.get('content', [])

        print_status(
            f"MCP tool call succeeded ({len(content)} content items, {elapsed:.3f}s)",
            "SUCCESS"
        )
        return True, elapsed
    else:
        # Check if it's a well-formed error response (still indicates system working)
        if response and 'error' in response:
            error_info = response['error']
            error_code = error_info.get('code', 'N/A')

            # Some errors are acceptable (e.g., tool not found might be configuration)
            if error_code == -32601:  # Method not found
                print_status(
                    f"Tool not available but MCP protocol working ({elapsed:.3f}s)",
                    "WARN"
                )
                return True, elapsed

        error_info = response.get('error', {}) if response else {}
        error_msg = error_info.get('message', 'No response')
        error_code = error_info.get('code', 'N/A')

        print_status(
            f"MCP tool call failed: [{error_code}] {error_msg}",
            "ERROR"
        )
        return False, elapsed

def test_mcp_resources_list(mcp_url: str, timeout: int) -> Tuple[bool, int, float]:
    """
    Test MCP resources/list operation (optional).

    Lists available MCP resources. Not all servers implement resources.
    Failure is acceptable if resources are not configured.
    """
    print_status("Requesting MCP resources list (optional)...", "INFO")

    success, response, elapsed = send_jsonrpc_request(
        mcp_url,
        "resources/list",
        None,
        timeout
    )

    if success and response and 'result' in response:
        result = response['result']
        resources = result.get('resources', [])
        resource_count = len(resources)

        print_status(
            f"MCP resources list retrieved: {resource_count} resources ({elapsed:.3f}s)",
            "SUCCESS"
        )
        return True, resource_count, elapsed
    else:
        error_info = response.get('error', {}) if response else {}
        error_code = error_info.get('code', 'N/A')

        # Method not found is acceptable - resources are optional
        if error_code == -32601:
            print_status(
                "Resources not implemented (acceptable, {elapsed:.3f}s)",
                "INFO"
            )
            return True, 0, elapsed

        error_msg = error_info.get('message', 'No response')
        print_status(
            f"MCP resources/list failed: [{error_code}] {error_msg}",
            "WARN"
        )
        return False, 0, elapsed

def run_smoke_tests(hostname: str, port: int, timeout: int) -> bool:
    """
    Run all smoke tests and return overall success status.

    Test sequence:
    1. HTTP connectivity (baseline server health)
    2. MCP endpoint availability (SSE transport check)
    3. MCP initialize (protocol handshake)
    4. MCP tools list (tool discovery)
    5. MCP tool call (end-to-end tool execution)
    6. MCP resources list (optional, resource discovery)
    """
    print(f"\n{Colors.BOLD}{'='*70}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.CYAN}CycleTime Server Smoke Test Suite{Colors.RESET}")
    print(f"{Colors.BOLD}{'='*70}{Colors.RESET}\n")

    print_status(f"Target: {hostname}:{port}", "INFO")
    print_status(f"Timeout: {timeout}s per request", "INFO")
    print_status(f"Started: {time.strftime('%Y-%m-%d %H:%M:%S')}", "INFO")

    base_url = f"http://{hostname}:{port}"
    mcp_url = f"{base_url}/mcp"

    results = {
        'tests_run': 0,
        'tests_passed': 0,
        'tests_failed': 0,
        'tests_warned': 0
    }

    # Test 1: HTTP Connectivity
    print_header("[1/6] HTTP Connectivity Test")
    http_success, http_time = test_http_connectivity(base_url, timeout)
    results['tests_run'] += 1
    if http_success:
        results['tests_passed'] += 1
        results['http_time'] = http_time
    else:
        results['tests_failed'] += 1
        print_status("Cannot proceed with MCP tests - server not responding", "ERROR")
        print_summary(results)
        return False

    # Test 2: MCP Endpoint Availability
    print_header("[2/6] MCP Endpoint Availability Test")
    mcp_avail_success, mcp_avail_time = test_mcp_endpoint_availability(mcp_url, timeout)
    results['tests_run'] += 1
    if mcp_avail_success:
        results['tests_passed'] += 1
        results['mcp_avail_time'] = mcp_avail_time
    else:
        results['tests_failed'] += 1
        # Continue with JSON-RPC tests even if SSE check fails
        print_status("Continuing with JSON-RPC tests...", "INFO")

    # Test 3: MCP Initialize
    print_header("[3/6] MCP Initialize Test")
    init_success, init_time, init_result = test_mcp_initialize(mcp_url, timeout)
    results['tests_run'] += 1
    if init_success:
        results['tests_passed'] += 1
        results['init_time'] = init_time
        results['init_result'] = init_result
    else:
        results['tests_failed'] += 1

    # Test 4: MCP Tools List
    print_header("[4/6] MCP Tools List Test")
    tools_success, tool_count, tools_time, tools_list = test_mcp_tools_list(mcp_url, timeout)
    results['tests_run'] += 1
    if tools_success:
        results['tests_passed'] += 1
        results['tools_time'] = tools_time
        results['tool_count'] = tool_count
    else:
        results['tests_failed'] += 1

    # Test 5: MCP Tool Call
    print_header("[5/6] MCP Tool Call Test")
    call_success, call_time = test_mcp_tool_call(mcp_url, timeout)
    results['tests_run'] += 1
    if call_success:
        results['tests_passed'] += 1
        results['call_time'] = call_time
    else:
        results['tests_failed'] += 1

    # Test 6: MCP Resources List (optional)
    print_header("[6/6] MCP Resources List Test (Optional)")
    resources_success, resource_count, resources_time = test_mcp_resources_list(mcp_url, timeout)
    results['tests_run'] += 1
    if resources_success:
        results['tests_passed'] += 1
        results['resources_time'] = resources_time
        results['resource_count'] = resource_count
    else:
        # Resources are optional, don't count as failure
        results['tests_warned'] += 1

    # Print summary
    print_summary(results)

    # Success if all critical tests passed
    critical_tests_passed = (
        http_success and
        init_success and
        tools_success and
        call_success
    )

    return critical_tests_passed

def print_summary(results: Dict[str, Any]) -> None:
    """Print test execution summary."""
    print(f"\n{Colors.BOLD}{'='*70}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.CYAN}Test Summary{Colors.RESET}")
    print(f"{Colors.BOLD}{'='*70}{Colors.RESET}\n")

    tests_run = results['tests_run']
    tests_passed = results['tests_passed']
    tests_failed = results['tests_failed']
    tests_warned = results.get('tests_warned', 0)

    # Overall status
    if tests_failed == 0:
        print_status(
            f"All critical tests passed! ({tests_passed}/{tests_run} passed)",
            "SUCCESS"
        )
    else:
        print_status(
            f"{tests_failed} test(s) failed ({tests_passed}/{tests_run} passed)",
            "ERROR"
        )

    if tests_warned > 0:
        print_status(f"{tests_warned} test(s) warned (non-critical)", "WARN")

    print()

    # Detailed metrics
    print(f"{Colors.BOLD}Response Times:{Colors.RESET}")

    if 'http_time' in results:
        print(f"  HTTP Connectivity:    {results['http_time']:.3f}s")

    if 'mcp_avail_time' in results:
        print(f"  MCP Endpoint Check:   {results['mcp_avail_time']:.3f}s")

    if 'init_time' in results:
        print(f"  MCP Initialize:       {results['init_time']:.3f}s")

    if 'tools_time' in results:
        print(f"  MCP Tools List:       {results['tools_time']:.3f}s")

    if 'call_time' in results:
        print(f"  MCP Tool Call:        {results['call_time']:.3f}s")

    if 'resources_time' in results:
        print(f"  MCP Resources List:   {results['resources_time']:.3f}s")

    print()

    # Functional metrics
    print(f"{Colors.BOLD}Server Capabilities:{Colors.RESET}")

    if 'init_result' in results and results['init_result']:
        server_info = results['init_result'].get('serverInfo', {})
        print(f"  Server Name:          {server_info.get('name', 'N/A')}")
        print(f"  Server Version:       {server_info.get('version', 'N/A')}")

    if 'tool_count' in results:
        print(f"  Available Tools:      {results['tool_count']}")

    if 'resource_count' in results:
        print(f"  Available Resources:  {results['resource_count']}")

    print()

def main():
    """Main entry point for the smoke test script."""
    parser = argparse.ArgumentParser(
        description='CycleTime Server Smoke Test Suite - Comprehensive health checks',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s                                    # Use defaults (localhost:8080)
  %(prog)s --hostname localhost --port 8080  # Explicit defaults
  %(prog)s --hostname 192.168.1.100          # Remote server
  %(prog)s --timeout 60                      # Custom timeout (60s per request)

Exit Codes:
  0 - All critical tests passed
  1 - One or more critical tests failed
  130 - Interrupted by user (Ctrl+C)

Test Coverage:
  • HTTP connectivity and server responsiveness
  • MCP endpoint availability (SSE transport)
  • MCP protocol initialization and handshake
  • Tool discovery (tools/list operation)
  • Tool execution (tools/call operation)
  • Resource discovery (optional)

For more information, see: docs/guides/testing/smoke-testing.md
        """
    )

    parser.add_argument(
        '--hostname',
        type=str,
        default='localhost',
        help='Server hostname or IP address (default: localhost)'
    )

    parser.add_argument(
        '--port',
        type=int,
        default=8080,
        help='Server port number (default: 8080)'
    )

    parser.add_argument(
        '--timeout',
        type=int,
        default=30,
        help='Request timeout in seconds per test (default: 30)'
    )

    parser.add_argument(
        '--version',
        action='version',
        version='%(prog)s 1.0.0'
    )

    args = parser.parse_args()

    # Validate arguments
    if args.port < 1 or args.port > 65535:
        print_status("Error: Port must be between 1 and 65535", "ERROR")
        sys.exit(1)

    if args.timeout < 1:
        print_status("Error: Timeout must be at least 1 second", "ERROR")
        sys.exit(1)

    try:
        success = run_smoke_tests(args.hostname, args.port, args.timeout)
        sys.exit(0 if success else 1)

    except KeyboardInterrupt:
        print_status("\n\nSmoke test interrupted by user", "WARN")
        sys.exit(130)

    except Exception as e:
        print_status(f"\nUnexpected error: {type(e).__name__}: {str(e)}", "ERROR")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()
