SMARTTASK PRO — FULL PROJECT (FRONTEND + C++ BACKEND)
======================================================

WHAT IS INCLUDED
- public/index.html  : dashboard page
- public/style.css   : interface styling
- public/script.js   : frontend interactions; communicates with C++ using fetch()
- backend.cpp        : C++17 HTTP server, task storage, priority-queue scheduler
- run.bat            : compile and start on Windows with g++

REQUIREMENTS
- Windows 10/11
- VS Code
- g++ compiler (MinGW-w64 / MSYS2 MinGW-w64) available in PATH

RUN THE PROJECT
1. Extract this ZIP to a normal folder, e.g. Desktop\SmartTaskPro_FullProject.
2. Open that folder in VS Code: File > Open Folder.
3. Ensure g++ works: open VS Code Terminal and run: g++ --version
4. Double-click run.bat OR run it from the VS Code terminal:
      .\run.bat
5. Wait for "SMARTTASK PRO - C++ BACKEND ONLINE".
6. Open this URL in Chrome/Edge:
      http://localhost:8080
7. Keep the terminal/server window open while using the app.
8. Press Ctrl+C in the server window to stop it.

HOW THE INTEGRATION WORKS
- The C++ program serves the frontend files from the public folder.
- JavaScript calls the C++ backend using fetch("/api/tasks") and fetch("/api/sync").
- C++ stores task data in tasks.json in the project root.
- Because the same C++ server serves both the website and API, no separate Live Server is needed.

DSA CONCEPTS IN THE BACKEND
- std::vector<Task> stores tasks.
- std::priority_queue<Task> in GET /api/schedule schedules unfinished tasks by priority
  (High > Medium > Low), then earliest deadline.
- Sorting/searching can be extended in the next project iteration.

API ENDPOINTS
- GET    /api/health       Check backend status
- GET    /api/tasks        Get all saved tasks
- POST   /api/sync         Save the frontend task list to tasks.json
- GET    /api/schedule     Get unfinished tasks ordered using a priority queue
- POST   /api/tasks        Add one task
- PUT    /api/tasks/{id}   Update one task
- DELETE /api/tasks/{id}   Delete one task

IMPORTANT NOTES
- This starter backend targets Windows and uses the built-in Winsock library.
- It is a classroom/demo project server, not a production security-hardened server.
- The browser app needs the backend running. Opening index.html directly or using Live Server
  will not connect correctly; use http://localhost:8080 instead.
- If port 8080 is busy, close the other app using it or change the port in backend.cpp.
- If g++ is not recognized, install MinGW-w64/MSYS2 and add its MinGW bin directory to PATH.


DEMO LOGIN / SIGNUP / LOGOUT
- On first launch, the app shows a login screen.
- Quick demo login:
    Email: demo@smarttask.local
    Password: demo123
- Use the Sign up tab to create a demo account in this browser.
- Click the three-dot menu beside your profile at the bottom of the sidebar.
  It includes My Workspace, Settings & theme, Account details, and Log out.
- Demo accounts are stored in browser localStorage. This is NOT production
  authentication: passwords are not securely hashed and should never be real
  credentials. All demo accounts currently use the same C++ task list stored
  in tasks.json, so this is a presentation/demo login rather than private
  multi-user data isolation.
- To sign out, open the three-dot profile menu and choose Log out.
