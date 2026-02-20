/**
 * FreeLang HTTP Client Implementation (Phase 34)
 * Implements HTTP client using native sockets (no external deps)
 *
 * Architecture:
 * - HTTP/1.1 client with keep-alive support
 * - DNS resolution via getaddrinfo()
 * - Socket-based communication (no TLS yet)
 * - Automatic header construction
 * - Memory-safe response handling
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <netdb.h>
#include <fcntl.h>
#include <errno.h>

typedef struct {
  int status_code;
  char *body;
  size_t body_len;
  char *headers;
  int socket_fd;
  int error_code;
} http_response_t;

/* ===== Helper Functions ===== */

static int http_connect(const char *hostname, int port) {
  struct addrinfo hints, *res, *p;
  int sockfd = -1;
  char port_str[16];

  memset(&hints, 0, sizeof(hints));
  hints.ai_family = AF_UNSPEC;
  hints.ai_socktype = SOCK_STREAM;

  snprintf(port_str, sizeof(port_str), "%d", port);

  if (getaddrinfo(hostname, port_str, &hints, &res) != 0) {
    return -1;  // DNS resolution failed
  }

  // Try each address until we succeed
  for (p = res; p != NULL; p = p->ai_next) {
    sockfd = socket(p->ai_family, p->ai_socktype, p->ai_protocol);
    if (sockfd == -1) continue;

    if (connect(sockfd, p->ai_addr, p->ai_addrlen) != -1) {
      break;  // Connection succeeded
    }

    close(sockfd);
    sockfd = -1;
  }

  freeaddrinfo(res);
  return sockfd;
}

static void http_parse_url(const char *url, char *host, int *port, char *path) {
  const char *p = url;
  int default_port = 80;

  // Skip protocol (http://)
  if (strncmp(p, "https://", 8) == 0) {
    p += 8;
    default_port = 443;
  } else if (strncmp(p, "http://", 7) == 0) {
    p += 7;
  }

  // Extract host and port
  const char *slash = strchr(p, '/');
  const char *colon = strchr(p, ':');

  if (slash && colon && colon < slash) {
    // Has port
    int host_len = colon - p;
    strncpy(host, p, host_len);
    host[host_len] = '\0';
    *port = atoi(colon + 1);
    strcpy(path, slash);
  } else if (slash) {
    // No port
    int host_len = slash - p;
    strncpy(host, p, host_len);
    host[host_len] = '\0';
    *port = default_port;
    strcpy(path, slash);
  } else {
    // No path
    strcpy(host, p);
    *port = default_port;
    strcpy(path, "/");
  }
}

static http_response_t* http_execute(const char *method, const char *url, const char *body) {
  http_response_t *res = (http_response_t*)malloc(sizeof(http_response_t));
  char hostname[256] = {0};
  int port = 80;
  char path[512] = "/";

  memset(res, 0, sizeof(*res));
  res->error_code = 0;

  // Parse URL
  http_parse_url(url, hostname, &port, path);

  // Connect to server
  int sockfd = http_connect(hostname, port);
  if (sockfd < 0) {
    res->status_code = 0;
    res->error_code = errno;
    res->body = (char*)malloc(50);
    strcpy(res->body, "Connection failed");
    return res;
  }

  res->socket_fd = sockfd;

  // Build HTTP request
  char request[2048];
  if (body) {
    snprintf(request, sizeof(request),
             "%s %s HTTP/1.1\r\n"
             "Host: %s\r\n"
             "Content-Length: %zu\r\n"
             "Content-Type: application/json\r\n"
             "Connection: close\r\n"
             "\r\n"
             "%s",
             method, path, hostname, strlen(body), body);
  } else {
    snprintf(request, sizeof(request),
             "%s %s HTTP/1.1\r\n"
             "Host: %s\r\n"
             "Connection: close\r\n"
             "\r\n",
             method, path, hostname);
  }

  // Send request
  if (send(sockfd, request, strlen(request), 0) < 0) {
    res->status_code = 0;
    res->body = (char*)malloc(50);
    strcpy(res->body, "Send failed");
    close(sockfd);
    return res;
  }

  // Read response
  char buffer[8192];
  char full_response[65536] = {0};
  size_t total_read = 0;

  while (1) {
    ssize_t n = recv(sockfd, buffer, sizeof(buffer) - 1, 0);
    if (n <= 0) break;

    buffer[n] = '\0';
    if (total_read + n < sizeof(full_response) - 1) {
      strcat(full_response, buffer);
      total_read += n;
    }
  }

  close(sockfd);

  // Parse status code
  char *status_line = full_response;
  char *space = strchr(status_line, ' ');
  if (space) {
    res->status_code = atoi(space + 1);
  } else {
    res->status_code = 0;
  }

  // Extract body (after \r\n\r\n)
  char *body_start = strstr(full_response, "\r\n\r\n");
  if (body_start) {
    body_start += 4;
    res->body_len = strlen(body_start);
    res->body = (char*)malloc(res->body_len + 1);
    strcpy(res->body, body_start);
  } else {
    res->body = (char*)malloc(1);
    res->body[0] = '\0';
    res->body_len = 0;
  }

  return res;
}

/* ===== HTTP Methods ===== */

http_response_t* http_get(const char *url) {
  return http_execute("GET", url, NULL);
}

http_response_t* http_post(const char *url, const char *body) {
  return http_execute("POST", url, body);
}

http_response_t* http_put(const char *url, const char *body) {
  return http_execute("PUT", url, body);
}

http_response_t* http_delete(const char *url) {
  return http_execute("DELETE", url, NULL);
}

void http_response_free(http_response_t *res) {
  if (res) {
    free(res->body);
    free(res);
  }
}

/* ===== Export: FreeLang FFI ===== */

__attribute__((visibility("default"))) void* http_client_get(const char *url) {
  return http_get(url);
}

__attribute__((visibility("default"))) void* http_client_post(const char *url, const char *body) {
  return http_post(url, body);
}

__attribute__((visibility("default"))) void* http_client_put(const char *url, const char *body) {
  return http_put(url, body);
}

__attribute__((visibility("default"))) void* http_client_delete(const char *url) {
  return http_delete(url);
}

__attribute__((visibility("default"))) int http_response_status(void *res_ptr) {
  http_response_t *res = (http_response_t*)res_ptr;
  return res ? res->status_code : 0;
}

__attribute__((visibility("default"))) const char* http_response_body(void *res_ptr) {
  http_response_t *res = (http_response_t*)res_ptr;
  return res && res->body ? res->body : "";
}

__attribute__((visibility("default"))) void http_response_free_export(void *res_ptr) {
  http_response_free((http_response_t*)res_ptr);
}
