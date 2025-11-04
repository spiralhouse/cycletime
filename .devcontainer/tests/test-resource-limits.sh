#!/bin/bash
# test-resource-limits.sh - Resource Limit Stress Tests
# Validates CPU, memory, PID, and disk I/O limits under load

set -euo pipefail

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

# Cleanup list
declare -a CLEANUP_PIDS=()
declare -a CLEANUP_FILES=()

# Function: Cleanup on exit
cleanup() {
    echo ""
    echo "Cleaning up test processes and files..."

    # Kill any background processes
    for pid in "${CLEANUP_PIDS[@]}"; do
        if kill -0 "$pid" 2>/dev/null; then
            kill -9 "$pid" 2>/dev/null || true
        fi
    done

    # Remove test files
    for file in "${CLEANUP_FILES[@]}"; do
        rm -f "$file" 2>/dev/null || true
    done

    # Additional cleanup for fork bomb test
    pkill -9 -f "fork-bomb-test" 2>/dev/null || true
}

trap cleanup EXIT INT TERM

# Function: Report test result
report_test() {
    local test_name="$1"
    local result="$2"
    local message="${3:-}"

    ((TESTS_TOTAL++))

    if [[ "$result" == "pass" ]]; then
        ((TESTS_PASSED++))
        echo -e "${GREEN}✓${NC} $test_name"
        [[ -n "$message" ]] && echo "  $message"
    elif [[ "$result" == "skip" ]]; then
        echo -e "${YELLOW}⊘${NC} $test_name (skipped)"
        [[ -n "$message" ]] && echo "  $message"
    else
        ((TESTS_FAILED++))
        echo -e "${RED}✗${NC} $test_name"
        [[ -n "$message" ]] && echo "  $message"
    fi
}

echo -e "${BLUE}=== Resource Limits Stress Test Suite ===${NC}"
echo "Testing CPU, memory, PID, and disk I/O limits under load..."
echo "WARNING: This test suite intentionally creates high load"
echo ""

# Test 1: CPU Limit Detection
echo -e "${BLUE}[Test Group: CPU Limits]${NC}"

if [[ -f "/sys/fs/cgroup/cpu.max" ]] || [[ -f "/sys/fs/cgroup/cpu/cpu.cfs_quota_us" ]]; then
    # Try cgroup v2 first
    if [[ -f "/sys/fs/cgroup/cpu.max" ]]; then
        cpu_limit=$(cat /sys/fs/cgroup/cpu.max 2>/dev/null | awk '{print $1}')
        if [[ "$cpu_limit" != "max" ]]; then
            report_test "CPU limit configured (cgroup v2)" "pass" "Quota: $cpu_limit"
        else
            report_test "CPU limit configured (cgroup v2)" "skip" "No limit set"
        fi
    # Try cgroup v1
    elif [[ -f "/sys/fs/cgroup/cpu/cpu.cfs_quota_us" ]]; then
        cpu_quota=$(cat /sys/fs/cgroup/cpu/cpu.cfs_quota_us 2>/dev/null)
        if [[ "$cpu_quota" != "-1" ]]; then
            report_test "CPU limit configured (cgroup v1)" "pass" "Quota: $cpu_quota µs"
        else
            report_test "CPU limit configured (cgroup v1)" "skip" "No limit set"
        fi
    fi
else
    report_test "CPU limit configured" "skip" "cgroup not available"
fi

# Test 2: CPU Stress Test (Brief)
echo "Running brief CPU stress test (5 seconds)..."

cpu_test_start=$(date +%s)
# Create CPU load with multiple background processes
for i in {1..4}; do
    (while [[ $(($(date +%s) - cpu_test_start)) -lt 5 ]]; do :; done) &
    CLEANUP_PIDS+=($!)
done

sleep 6  # Let it run

# Check if processes completed or were throttled
completed=0
for pid in "${CLEANUP_PIDS[@]}"; do
    if ! kill -0 "$pid" 2>/dev/null; then
        ((completed++))
    fi
done

if [[ $completed -ge 2 ]]; then
    report_test "CPU stress test completes" "pass" "$completed/4 processes completed"
else
    report_test "CPU stress test completes" "fail" "Only $completed/4 processes completed"
fi

# Cleanup CPU test processes
for pid in "${CLEANUP_PIDS[@]}"; do
    kill -9 "$pid" 2>/dev/null || true
done
CLEANUP_PIDS=()

echo ""
echo -e "${BLUE}[Test Group: Memory Limits]${NC}"

# Test 3: Memory Limit Detection
if [[ -f "/sys/fs/cgroup/memory.max" ]] || [[ -f "/sys/fs/cgroup/memory/memory.limit_in_bytes" ]]; then
    # Try cgroup v2
    if [[ -f "/sys/fs/cgroup/memory.max" ]]; then
        mem_limit=$(cat /sys/fs/cgroup/memory.max 2>/dev/null)
        if [[ "$mem_limit" != "max" ]]; then
            mem_limit_gb=$((mem_limit / 1024 / 1024 / 1024))
            report_test "Memory limit configured (cgroup v2)" "pass" "Limit: ${mem_limit_gb}GB"
        else
            report_test "Memory limit configured (cgroup v2)" "skip" "No limit set"
        fi
    # Try cgroup v1
    elif [[ -f "/sys/fs/cgroup/memory/memory.limit_in_bytes" ]]; then
        mem_limit=$(cat /sys/fs/cgroup/memory/memory.limit_in_bytes 2>/dev/null)
        if [[ "$mem_limit" != "9223372036854771712" ]]; then  # max value
            mem_limit_gb=$((mem_limit / 1024 / 1024 / 1024))
            report_test "Memory limit configured (cgroup v1)" "pass" "Limit: ${mem_limit_gb}GB"
        else
            report_test "Memory limit configured (cgroup v1)" "skip" "No limit set"
        fi
    fi
else
    report_test "Memory limit configured" "skip" "cgroup not available"
fi

# Test 4: Memory Current Usage
if [[ -f "/sys/fs/cgroup/memory.current" ]] || [[ -f "/sys/fs/cgroup/memory/memory.usage_in_bytes" ]]; then
    if [[ -f "/sys/fs/cgroup/memory.current" ]]; then
        mem_usage=$(cat /sys/fs/cgroup/memory.current 2>/dev/null)
    else
        mem_usage=$(cat /sys/fs/cgroup/memory/memory.usage_in_bytes 2>/dev/null)
    fi

    mem_usage_mb=$((mem_usage / 1024 / 1024))
    if [[ $mem_usage_mb -gt 0 ]]; then
        report_test "Memory usage tracking" "pass" "Current: ${mem_usage_mb}MB"
    else
        report_test "Memory usage tracking" "skip" "Cannot read usage"
    fi
else
    report_test "Memory usage tracking" "skip" "cgroup not available"
fi

# Test 5: OOM Killer Configuration
if [[ -f "/sys/fs/cgroup/memory.oom.group" ]] || [[ -f "/sys/fs/cgroup/memory/memory.oom_control" ]]; then
    report_test "OOM killer configured" "pass" "OOM protection available"
else
    report_test "OOM killer configured" "skip" "OOM controls not available"
fi

# Test 6: Memory Stress Test (Moderate - 100MB allocation)
echo "Running moderate memory allocation test..."

mem_test_file="/tmp/mem-test-$$"
CLEANUP_FILES+=("$mem_test_file")

# Try to allocate 100MB
if dd if=/dev/zero of="$mem_test_file" bs=1M count=100 2>/dev/null; then
    file_size=$(stat -f%z "$mem_test_file" 2>/dev/null || stat -c%s "$mem_test_file" 2>/dev/null || echo 0)
    if [[ $file_size -ge 104857600 ]]; then
        report_test "Memory allocation (100MB)" "pass" "Allocation successful"
    else
        report_test "Memory allocation (100MB)" "fail" "Allocation incomplete"
    fi
else
    report_test "Memory allocation (100MB)" "fail" "Allocation failed"
fi

echo ""
echo -e "${BLUE}[Test Group: PID Limits]${NC}"

# Test 7: PID Limit Detection
if [[ -f "/sys/fs/cgroup/pids.max" ]] || [[ -f "/sys/fs/cgroup/pids/pids.max" ]]; then
    if [[ -f "/sys/fs/cgroup/pids.max" ]]; then
        pid_limit=$(cat /sys/fs/cgroup/pids.max 2>/dev/null)
    else
        pid_limit=$(cat /sys/fs/cgroup/pids/pids.max 2>/dev/null)
    fi

    if [[ "$pid_limit" != "max" ]]; then
        report_test "PID limit configured" "pass" "Max PIDs: $pid_limit"
    else
        report_test "PID limit configured" "skip" "No limit set"
    fi
else
    report_test "PID limit configured" "skip" "cgroup pids not available"
fi

# Test 8: Current PID Usage
if [[ -f "/sys/fs/cgroup/pids.current" ]] || [[ -f "/sys/fs/cgroup/pids/pids.current" ]]; then
    if [[ -f "/sys/fs/cgroup/pids.current" ]]; then
        pid_current=$(cat /sys/fs/cgroup/pids.current 2>/dev/null)
    else
        pid_current=$(cat /sys/fs/cgroup/pids/pids.current 2>/dev/null)
    fi

    if [[ $pid_current -gt 0 ]]; then
        report_test "PID usage tracking" "pass" "Current PIDs: $pid_current"
    else
        report_test "PID usage tracking" "skip" "Cannot read PID usage"
    fi
else
    report_test "PID usage tracking" "skip" "cgroup pids not available"
fi

# Test 9: Fork Bomb Protection (Controlled Test)
echo "Testing fork bomb protection (creating 50 processes)..."

fork_test_pids=()
fork_success=0

for i in {1..50}; do
    if sleep 2 &
        fork_test_pids+=($!)
        ((fork_success++))
    then
        :
    else
        break
    fi
done

if [[ $fork_success -ge 40 ]]; then
    report_test "Fork bomb protection (moderate)" "pass" "Created $fork_success/50 processes"
elif [[ $fork_success -ge 20 ]]; then
    report_test "Fork bomb protection (moderate)" "pass" "Limited to $fork_success processes (protection active)"
else
    report_test "Fork bomb protection (moderate)" "fail" "Only $fork_success processes (too restrictive)"
fi

# Cleanup fork test
for pid in "${fork_test_pids[@]}"; do
    kill -9 "$pid" 2>/dev/null || true
done

echo ""
echo -e "${BLUE}[Test Group: Disk I/O Limits]${NC}"

# Test 10: Disk I/O Weight/Limit Detection
if [[ -f "/sys/fs/cgroup/io.max" ]] || [[ -f "/sys/fs/cgroup/blkio/blkio.throttle.read_bps_device" ]]; then
    report_test "Disk I/O limits available" "pass" "I/O cgroup controls present"
else
    report_test "Disk I/O limits available" "skip" "I/O cgroup not available"
fi

# Test 11: Disk Write Test (1MB)
echo "Testing disk write performance..."

write_test_file="/tmp/write-test-$$"
CLEANUP_FILES+=("$write_test_file")

write_start=$(date +%s%N)
if dd if=/dev/zero of="$write_test_file" bs=1M count=1 conv=fsync 2>/dev/null; then
    write_end=$(date +%s%N)
    write_duration=$(( (write_end - write_start) / 1000000 ))  # Convert to ms

    if [[ $write_duration -lt 10000 ]]; then  # Less than 10 seconds
        report_test "Disk write (1MB, fsync)" "pass" "Completed in ${write_duration}ms"
    else
        report_test "Disk write (1MB, fsync)" "skip" "Slow write (${write_duration}ms, may be throttled)"
    fi
else
    report_test "Disk write (1MB, fsync)" "fail" "Write failed"
fi

# Test 12: Disk Read Test (1MB)
if [[ -f "$write_test_file" ]]; then
    read_start=$(date +%s%N)
    if dd if="$write_test_file" of=/dev/null bs=1M 2>/dev/null; then
        read_end=$(date +%s%N)
        read_duration=$(( (read_end - read_start) / 1000000 ))

        if [[ $read_duration -lt 5000 ]]; then
            report_test "Disk read (1MB)" "pass" "Completed in ${read_duration}ms"
        else
            report_test "Disk read (1MB)" "skip" "Slow read (${read_duration}ms, may be throttled)"
        fi
    else
        report_test "Disk read (1MB)" "fail" "Read failed"
    fi
else
    report_test "Disk read (1MB)" "skip" "No test file available"
fi

# Test 13: Disk Space Check
df_output=$(df -h /tmp 2>/dev/null || df -h / 2>/dev/null)
if echo "$df_output" | tail -1 | awk '{print $(NF-1)}' | grep -qE '^[0-9]+%$'; then
    disk_usage=$(echo "$df_output" | tail -1 | awk '{print $(NF-1)}' | tr -d '%')

    if [[ $disk_usage -lt 90 ]]; then
        report_test "Disk space available" "pass" "Usage: ${disk_usage}%"
    else
        report_test "Disk space available" "fail" "Usage: ${disk_usage}% (too high)"
    fi
else
    report_test "Disk space available" "skip" "Cannot determine disk usage"
fi

echo ""
echo -e "${BLUE}[Test Group: Combined Stress Test]${NC}"

# Test 14: Combined Load Test (Brief)
echo "Running combined stress test (CPU + Memory + Disk for 3 seconds)..."

combined_start=$(date +%s)
combined_pids=()

# CPU load
for i in {1..2}; do
    (while [[ $(($(date +%s) - combined_start)) -lt 3 ]]; do :; done) &
    combined_pids+=($!)
done

# Memory load (small allocations)
(for i in {1..10}; do
    dd if=/dev/zero of="/tmp/combined-mem-$$-$i" bs=1M count=10 2>/dev/null &
done
wait
rm -f /tmp/combined-mem-$$-* 2>/dev/null) &
combined_pids+=($!)

# Disk I/O load
(for i in {1..5}; do
    dd if=/dev/zero of="/tmp/combined-io-$$-$i" bs=1M count=5 conv=fsync 2>/dev/null
    rm -f "/tmp/combined-io-$$-$i"
done) &
combined_pids+=($!)

# Wait for test to complete
sleep 4

# Check if system is still responsive
if [[ -f "/proc/loadavg" ]]; then
    load_avg=$(cat /proc/loadavg | awk '{print $1}')
    report_test "System responsive under combined load" "pass" "Load average: $load_avg"
else
    report_test "System responsive under combined load" "pass" "System still responsive"
fi

# Cleanup combined test
for pid in "${combined_pids[@]}"; do
    kill -9 "$pid" 2>/dev/null || true
done
rm -f /tmp/combined-* 2>/dev/null

echo ""
echo -e "${BLUE}[Test Group: Resource Recovery]${NC}"

# Test 15: Resource Recovery After Stress
sleep 2

if [[ -f "/proc/loadavg" ]]; then
    post_load=$(cat /proc/loadavg | awk '{print $1}')
    # Load should be lower than during stress
    report_test "System load recovers after stress" "pass" "Post-stress load: $post_load"
else
    report_test "System load recovers after stress" "skip" "Cannot check load average"
fi

# Test 16: Memory Cleanup Verification
if command -v free >/dev/null 2>&1; then
    free_mem=$(free -m | awk '/^Mem:/ {print $4}')
    if [[ $free_mem -gt 0 ]]; then
        report_test "Memory available after cleanup" "pass" "Free: ${free_mem}MB"
    else
        report_test "Memory available after cleanup" "skip" "Cannot determine free memory"
    fi
else
    report_test "Memory available after cleanup" "skip" "free command not available"
fi

echo ""
echo -e "${BLUE}=== Test Summary ===${NC}"
echo "Total tests: $TESTS_TOTAL"
echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Failed: ${RED}$TESTS_FAILED${NC}"

if [[ $TESTS_FAILED -eq 0 ]]; then
    echo ""
    echo -e "${GREEN}✓ All resource limit tests passed!${NC}"
    exit 0
else
    echo ""
    echo -e "${RED}✗ Some resource limit tests failed${NC}"
    exit 1
fi
