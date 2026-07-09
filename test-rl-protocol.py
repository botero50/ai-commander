#!/usr/bin/env python3
"""
Capture raw HTTP protocol exchange with RL Interface.
"""
import socket
import sys

def send_raw_http(host="127.0.0.1", port=6000, request_line="GET / HTTP/1.1\r\n\r\n"):
    """Send raw HTTP and capture response bytes."""

    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(3)

    try:
        sock.connect((host, int(port)))
        print("[SEND] Raw bytes:")
        print(repr(request_line))
        print()

        sock.sendall(request_line.encode() if isinstance(request_line, str) else request_line)

        print("[RECV] Raw response:")
        data = b""
        while True:
            try:
                chunk = sock.recv(1024)
                if not chunk:
                    break
                data += chunk
            except socket.timeout:
                break

        print(repr(data))
        print()
        print("[DECODED]")
        print(data.decode('utf-8', errors='ignore'))

        return data

    finally:
        sock.close()

if __name__ == "__main__":
    print("=" * 70)
    print("Test 1: GET / (root)")
    print("=" * 70)
    send_raw_http("127.0.0.1", 6000, "GET / HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n")

    print()
    print("=" * 70)
    print("Test 2: GET /reset (wrong method)")
    print("=" * 70)
    send_raw_http("127.0.0.1", 6000, "GET /reset HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n")

    print()
    print("=" * 70)
    print("Test 3: POST /reset (with empty body)")
    print("=" * 70)
    send_raw_http("127.0.0.1", 6000, "POST /reset HTTP/1.1\r\nHost: localhost\r\nContent-Length: 0\r\nConnection: close\r\n\r\n")

    print()
    print("=" * 70)
    print("Test 4: POST /reset (with JSON body)")
    print("=" * 70)
    body = '{"commands":[]}'
    request = "POST /reset HTTP/1.1\r\nHost: localhost\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}".format(len(body), body)
    send_raw_http("127.0.0.1", 6000, request)
