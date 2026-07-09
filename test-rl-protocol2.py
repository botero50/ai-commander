#!/usr/bin/env python3
"""
Test different POST /reset formats to find the correct protocol.
"""
import socket

def send_raw_http(body_str, content_type="application/json"):
    """Send raw HTTP and capture response bytes."""

    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(3)

    try:
        sock.connect(("127.0.0.1", 6000))

        body = body_str.encode() if isinstance(body_str, str) else body_str
        request = (
            "POST /reset HTTP/1.1\r\n"
            "Host: localhost\r\n"
            "Content-Type: {}\r\n"
            "Content-Length: {}\r\n"
            "Connection: close\r\n"
            "\r\n"
        ).format(content_type, len(body))

        print("[SEND] Body: {}".format(repr(body_str)))
        print("[SEND] Content-Type: {}".format(content_type))

        sock.sendall(request.encode() + body)

        data = b""
        while True:
            try:
                chunk = sock.recv(1024)
                if not chunk:
                    break
                data += chunk
            except socket.timeout:
                break

        status_line = data.split(b'\r\n')[0] if data else b"(no response)"
        print("[RECV] Status: {}".format(status_line))
        print("[RECV] Total bytes: {}".format(len(data)))
        if data and len(data) > 50:
            print("[RECV] Body preview: {}".format(repr(data[data.find(b'\r\n\r\n')+4:data.find(b'\r\n\r\n')+100])))
        print()

        return data

    finally:
        sock.close()

if __name__ == "__main__":
    print("=" * 70)
    print("Protocol Discovery: Testing POST /reset with different formats")
    print("=" * 70)
    print()

    tests = [
        ('{"tick":0}', "application/json"),
        ('{"tick":0,"commands":[]}', "application/json"),
        ('tick=0', "application/x-www-form-urlencoded"),
        ('', "application/json"),
        ('[0,0]', "application/json"),
    ]

    for i, (body, ctype) in enumerate(tests, 1):
        print("Test {}: {}".format(i, ctype))
        send_raw_http(body, ctype)
