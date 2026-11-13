// SmartTask Pro - portable C++17 HTTP backend (Windows Winsock + Linux/POSIX)
#ifdef _WIN32
#include <winsock2.h>
#include <ws2tcpip.h>
#include <windows.h>
#pragma comment(lib, "Ws2_32.lib")
#else
#include <sys/types.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <unistd.h>
#include <cstdlib>
using SOCKET = int;
#define INVALID_SOCKET (-1)
#define SOCKET_ERROR (-1)
#define closesocket close
#endif
#include <algorithm>
#include <cctype>
#include <ctime>
#include <fstream>
#include <iostream>
#include <queue>
#include <regex>
#include <sstream>
#include <string>
#include <vector>

struct Task {
    long long id = 0;
    std::string name, description, deadline, priority = "medium";
    bool completed = false;
    long long created = 0;
};

std::vector<Task> tasks;
const std::string DATA_FILE = "tasks.json";

std::string jsonEscape(const std::string& s) {
    std::string out;
    for (char c : s) {
        if (c == '\\') out += "\\\\";
        else if (c == '"') out += "\\\"";
        else if (c == '\n') out += "\\n";
        else if (c == '\r') out += "\\r";
        else if (c == '\t') out += "\\t";
        else out += c;
    }
    return out;
}

std::string getString(const std::string& obj, const std::string& key, const std::string& fallback = "") {
    std::string needle = "\"" + key + "\"";
    size_t p = obj.find(needle);
    if (p == std::string::npos) return fallback;
    p = obj.find(':', p + needle.size());
    if (p == std::string::npos) return fallback;
    p = obj.find('"', p + 1);
    if (p == std::string::npos) return fallback;
    ++p;
    std::string out;
    bool esc = false;
    for (; p < obj.size(); ++p) {
        char c = obj[p];
        if (esc) {
            if (c == 'n') out += '\n';
            else if (c == 'r') out += '\r';
            else if (c == 't') out += '\t';
            else out += c;
            esc = false;
        } else if (c == '\\') esc = true;
        else if (c == '"') break;
        else out += c;
    }
    return out;
}

long long getNumber(const std::string& obj, const std::string& key, long long fallback = 0) {
    std::regex re("\"" + key + R"("\s*:\s*(-?\d+))");
    std::smatch m;
    if (std::regex_search(obj, m, re)) {
        try { return std::stoll(m[1].str()); } catch (...) {}
    }
    return fallback;
}

bool getBool(const std::string& obj, const std::string& key, bool fallback = false) {
    std::regex re("\"" + key + R"("\s*:\s*(true|false))");
    std::smatch m;
    if (std::regex_search(obj, m, re)) return m[1] == "true";
    return fallback;
}

std::string taskToJson(const Task& t) {
    std::ostringstream o;
    o << "{\"id\":" << t.id
      << ",\"name\":\"" << jsonEscape(t.name)
      << "\",\"description\":\"" << jsonEscape(t.description)
      << "\",\"deadline\":\"" << jsonEscape(t.deadline)
      << "\",\"priority\":\"" << jsonEscape(t.priority)
      << "\",\"completed\":" << (t.completed ? "true" : "false")
      << ",\"created\":" << t.created << "}";
    return o.str();
}

std::string tasksToJson(const std::vector<Task>& list) {
    std::string out = "[";
    for (size_t i = 0; i < list.size(); ++i) {
        if (i) out += ",";
        out += taskToJson(list[i]);
    }
    return out + "]";
}

Task parseTask(const std::string& obj) {
    Task t;
    t.id = getNumber(obj, "id", 0);
    t.name = getString(obj, "name");
    t.description = getString(obj, "description");
    t.deadline = getString(obj, "deadline");
    t.priority = getString(obj, "priority", "medium");
    t.completed = getBool(obj, "completed", false);
    t.created = getNumber(obj, "created", static_cast<long long>(std::time(nullptr)) * 1000);
    if (t.priority != "high" && t.priority != "medium" && t.priority != "low") t.priority = "medium";
    return t;
}

std::vector<Task> parseTaskArray(const std::string& body) {
    std::vector<Task> result;
    bool inString = false, escaped = false;
    int depth = 0;
    size_t start = std::string::npos;
    for (size_t i = 0; i < body.size(); ++i) {
        char c = body[i];
        if (inString) {
            if (escaped) escaped = false;
            else if (c == '\\') escaped = true;
            else if (c == '"') inString = false;
            continue;
        }
        if (c == '"') inString = true;
        else if (c == '{') {
            if (depth == 0) start = i;
            ++depth;
        } else if (c == '}') {
            --depth;
            if (depth == 0 && start != std::string::npos) {
                Task t = parseTask(body.substr(start, i - start + 1));
                if (t.id != 0 && !t.name.empty()) result.push_back(t);
                start = std::string::npos;
            }
        }
    }
    return result;
}

void saveTasks() {
    std::ofstream f(DATA_FILE, std::ios::trunc);
    f << tasksToJson(tasks);
}
void loadTasks() {
    std::ifstream f(DATA_FILE);
    if (!f) return;
    std::stringstream buffer; buffer << f.rdbuf();
    tasks = parseTaskArray(buffer.str());
}

std::string mimeType(const std::string& path) {
    if (path.size() >= 5 && path.substr(path.size()-5) == ".html") return "text/html; charset=utf-8";
    if (path.size() >= 4 && path.substr(path.size()-4) == ".css") return "text/css; charset=utf-8";
    if (path.size() >= 3 && path.substr(path.size()-3) == ".js") return "application/javascript; charset=utf-8";
    if (path.size() >= 4 && path.substr(path.size()-4) == ".png") return "image/png";
    if (path.size() >= 4 && path.substr(path.size()-4) == ".svg") return "image/svg+xml";
    return "text/plain; charset=utf-8";
}

void sendResponse(SOCKET client, int code, const std::string& status, const std::string& body, const std::string& type = "application/json; charset=utf-8") {
    std::ostringstream h;
    h << "HTTP/1.1 " << code << " " << status << "\r\n"
      << "Content-Type: " << type << "\r\n"
      << "Content-Length: " << body.size() << "\r\n"
      << "Access-Control-Allow-Origin: *\r\n"
      << "Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS\r\n"
      << "Access-Control-Allow-Headers: Content-Type\r\n"
      << "Connection: close\r\n\r\n";
    std::string response = h.str() + body;
    send(client, response.c_str(), static_cast<int>(response.size()), 0);
}

std::string readRequest(SOCKET client) {
    std::string request;
    char buf[4096];
    int contentLength = 0;
    bool headersRead = false;
    size_t headerEnd = std::string::npos;
    while (true) {
        int n = recv(client, buf, sizeof(buf), 0);
        if (n <= 0) break;
        request.append(buf, n);
        if (!headersRead) {
            headerEnd = request.find("\r\n\r\n");
            if (headerEnd != std::string::npos) {
                headersRead = true;
                std::string headers = request.substr(0, headerEnd);
                std::smatch m;
                if (std::regex_search(headers, m, std::regex(R"(Content-Length:\s*(\d+))", std::regex::icase)))
                    contentLength = std::stoi(m[1]);
            }
        }
        if (headersRead && request.size() >= headerEnd + 4 + static_cast<size_t>(contentLength)) break;
    }
    return request;
}

void handleClient(SOCKET client) {
    std::string req = readRequest(client);
    size_t lineEnd = req.find("\r\n");
    if (lineEnd == std::string::npos) { sendResponse(client, 400, "Bad Request", "{\"error\":\"bad request\"}"); return; }
    std::istringstream first(req.substr(0, lineEnd));
    std::string method, path, version;
    first >> method >> path >> version;
    size_t headerEnd = req.find("\r\n\r\n");
    std::string body = headerEnd == std::string::npos ? "" : req.substr(headerEnd + 4);

    if (method == "OPTIONS") { sendResponse(client, 204, "No Content", ""); return; }
    if (path == "/api/health") { sendResponse(client, 200, "OK", "{\"status\":\"online\",\"backend\":\"C++17\"}"); return; }
    if (path == "/api/tasks" && method == "GET") { sendResponse(client, 200, "OK", tasksToJson(tasks)); return; }

    if (path == "/api/sync" && method == "POST") {
        tasks = parseTaskArray(body);
        saveTasks();
        sendResponse(client, 200, "OK", "{\"success\":true,\"count\":" + std::to_string(tasks.size()) + "}");
        return;
    }

    if (path == "/api/schedule" && method == "GET") {
        // DSA: Priority Queue (max priority first), then earliest deadline.
        auto rank = [](const Task& t) { return t.priority == "high" ? 3 : t.priority == "medium" ? 2 : 1; };
        struct Compare {
            bool operator()(const Task& a, const Task& b) const {
                auto r = [](const Task& t) { return t.priority == "high" ? 3 : t.priority == "medium" ? 2 : 1; };
                if (r(a) != r(b)) return r(a) < r(b);
                return a.deadline > b.deadline;
            }
        };
        std::priority_queue<Task, std::vector<Task>, Compare> pq;
        for (const auto& t : tasks) if (!t.completed) pq.push(t);
        std::vector<Task> ordered;
        while (!pq.empty()) { ordered.push_back(pq.top()); pq.pop(); }
        sendResponse(client, 200, "OK", tasksToJson(ordered));
        return;
    }

    if (path == "/api/tasks" && method == "POST") {
        Task t = parseTask(body);
        if (t.id == 0) t.id = static_cast<long long>(std::time(nullptr)) * 1000 + static_cast<long long>(tasks.size());
        if (t.created == 0) t.created = static_cast<long long>(std::time(nullptr)) * 1000;
        tasks.push_back(t); saveTasks();
        sendResponse(client, 201, "Created", taskToJson(t)); return;
    }

    if (path.rfind("/api/tasks/", 0) == 0) {
        long long id = 0;
        try { id = std::stoll(path.substr(std::string("/api/tasks/").size())); } catch (...) {}
        auto it = std::find_if(tasks.begin(), tasks.end(), [id](const Task& t) { return t.id == id; });
        if (it == tasks.end()) { sendResponse(client, 404, "Not Found", "{\"error\":\"task not found\"}"); return; }
        if (method == "DELETE") {
            tasks.erase(it); saveTasks(); sendResponse(client, 200, "OK", "{\"success\":true}"); return;
        }
        if (method == "PUT") {
            Task updated = parseTask(body); updated.id = id;
            if (updated.created == 0) updated.created = it->created;
            *it = updated; saveTasks(); sendResponse(client, 200, "OK", taskToJson(*it)); return;
        }
    }

    if (path.rfind("/api/", 0) == 0) { sendResponse(client, 404, "Not Found", "{\"error\":\"unknown API route\"}"); return; }

    // Serve the frontend from /public. Prevent directory traversal.
    std::string relative = path == "/" ? "/index.html" : path;
    if (relative.find("..") != std::string::npos || relative.find('\\') != std::string::npos) {
        sendResponse(client, 403, "Forbidden", "Forbidden", "text/plain"); return;
    }
    std::string filename = "public" + relative;
    std::ifstream file(filename, std::ios::binary);
    if (!file) { sendResponse(client, 404, "Not Found", "File not found: " + relative, "text/plain; charset=utf-8"); return; }
    std::stringstream data; data << file.rdbuf();
    sendResponse(client, 200, "OK", data.str(), mimeType(filename));
}

int main() {
#ifdef _WIN32
    WSADATA wsa;
    if (WSAStartup(MAKEWORD(2,2), &wsa) != 0) {
        std::cerr << "Winsock startup failed.\\n"; return 1;
    }
#endif
    loadTasks();

    int port = 8080;
    if (const char* envPort = std::getenv("PORT")) {
        try { port = std::stoi(envPort); } catch (...) {}
    }

    SOCKET server = socket(AF_INET, SOCK_STREAM, 0);
    if (server == INVALID_SOCKET) {
        std::cerr << "Could not create server socket.\\n";
#ifdef _WIN32
        WSACleanup();
#endif
        return 1;
    }

    sockaddr_in addr{};
    addr.sin_family = AF_INET;
    addr.sin_port = htons(static_cast<unsigned short>(port));
    addr.sin_addr.s_addr = htonl(INADDR_ANY);
    int reuse = 1;
#ifdef _WIN32
    setsockopt(server, SOL_SOCKET, SO_REUSEADDR, reinterpret_cast<const char*>(&reuse), sizeof(reuse));
#else
    setsockopt(server, SOL_SOCKET, SO_REUSEADDR, &reuse, sizeof(reuse));
#endif

    if (bind(server, reinterpret_cast<sockaddr*>(&addr), sizeof(addr)) == SOCKET_ERROR ||
        listen(server, 64) == SOCKET_ERROR) {
        std::cerr << "Could not start server on port " << port << ".\\n";
        closesocket(server);
#ifdef _WIN32
        WSACleanup();
#endif
        return 1;
    }

    std::cout << "=========================================\\n";
    std::cout << "  SMARTTASK PRO - C++ BACKEND ONLINE\\n";
    std::cout << "  Listening on 0.0.0.0:" << port << "\\n";
    std::cout << "  API : /api/health\\n";
    std::cout << "  Press Ctrl+C to stop the server\\n";
    std::cout << "=========================================\\n";

    while (true) {
        SOCKET client = accept(server, nullptr, nullptr);
        if (client == INVALID_SOCKET) continue;
        handleClient(client);
        closesocket(client);
    }

    closesocket(server);
#ifdef _WIN32
    WSACleanup();
#endif
    return 0;
}
