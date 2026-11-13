const $ = (id) => document.getElementById(id);
const todayISO = () => { const d = new Date(); return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10); };
const addDays = (n) => { const d = new Date(); d.setDate(d.getDate()+n); return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10); };
const sampleTasks = [
  {id:1,name:"Finish DSA project documentation",description:"Prepare algorithm explanation and complexity analysis.",deadline:addDays(1),priority:"high",completed:false,created:Date.now()-50000},
  {id:2,name:"Revise DBMS transaction concepts",description:"Locks, serializability and recovery techniques.",deadline:addDays(2),priority:"medium",completed:false,created:Date.now()-40000},
  {id:3,name:"Complete Java practical file",description:"Finish pending programs before lab evaluation.",deadline:addDays(3),priority:"high",completed:false,created:Date.now()-30000},
  {id:4,name:"Practice sorting algorithms",description:"Quick sort, merge sort and counting sort.",deadline:addDays(4),priority:"low",completed:true,created:Date.now()-20000},
  {id:5,name:"Prepare for AD SA viva",description:"Revise heap, greedy method and time complexity.",deadline:addDays(-1),priority:"high",completed:false,created:Date.now()-10000}
];
let tasks = []; // Loaded from the C++ backend
let activeView = "all", activeFilter = "all", searchTerm = "";
const save = async () => {
  try {
    const response = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tasks)
    });
    if (!response.ok) throw new Error("Backend save failed");
  } catch (error) {
    console.error(error);
    toast("Backend not connected. Start run.bat first.");
  }
};
const dateLabel = (iso) => new Date(iso+"T00:00:00").toLocaleDateString("en-IN",{day:"numeric",month:"short"});
const priorityRank = {high:0,medium:1,low:2};
const isOverdue = t => !t.completed && t.deadline < todayISO();
function toast(message){const el=$("toast");el.textContent=message;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),2300)}
function visibleTasks(){
 let list=[...tasks];
 if(activeView==="today") list=list.filter(t=>t.deadline===todayISO()&&!t.completed);
 if(activeView==="upcoming") list=list.filter(t=>t.deadline>=todayISO()&&!t.completed);
 if(activeView==="completed") list=list.filter(t=>t.completed);
 if(activeFilter!=="all") list=list.filter(t=>t.priority===activeFilter);
 if(searchTerm) list=list.filter(t=>(t.name+" "+t.description).toLowerCase().includes(searchTerm));
 const sort=$("sortSelect").value;
 list.sort((a,b)=>sort==="priority"?(priorityRank[a.priority]-priorityRank[b.priority]||a.deadline.localeCompare(b.deadline)):sort==="created"?b.created-a.created:a.deadline.localeCompare(b.deadline));
 return list;
}
function render(){
 const total=tasks.length, done=tasks.filter(t=>t.completed).length, pending=total-done, overdue=tasks.filter(isOverdue).length, pct=total?Math.round(done/total*100):0;
 $("totalTasks").textContent=total;$("pendingTasks").textContent=pending-overdue;$("completedTasks").textContent=done;$("overdueTasks").textContent=overdue;$("allNavCount").textContent=total;
 $("progressPercent").textContent=pct+"%";$("progressRing").style.background=`conic-gradient(#8061e9 ${pct*3.6}deg,#eeeaf9 0deg)`;$("progressTitle").textContent=pct===100?"Amazing work — all done!":pct>=50?"You're building momentum":"You're just getting started";$("progressText").textContent=pct===100?"You cleared your list. Take a well-earned break.":"Every completed task is a win. Keep building momentum.";
 $("miniDone").textContent=done;$("miniLeft").textContent=pending;$("miniRate").textContent=pct+"%";
 const names={all:"Your tasks",today:"Today's tasks",upcoming:"Upcoming tasks",completed:"Completed tasks"};$("taskHeading").textContent=names[activeView];$("breadcrumbTitle").textContent=activeView[0].toUpperCase()+activeView.slice(1);$("sortLabel").textContent=$("sortSelect").selectedOptions[0].text.toLowerCase();
 const list=visibleTasks();$("taskList").innerHTML=list.map(t=>`<article class="task-item ${t.completed?"is-complete":""}">
 <input class="task-check" type="checkbox" data-action="complete" data-id="${t.id}" ${t.completed?"checked":""} aria-label="Mark complete">
 <div class="task-main"><div class="task-name">${escapeHTML(t.name)}</div>${t.description?`<div class="task-description">${escapeHTML(t.description)}</div>`:""}
 <div class="task-meta"><span class="task-date">◷ ${dateLabel(t.deadline)}</span><span class="priority-pill priority-${t.priority}">${t.priority.toUpperCase()}</span>${isOverdue(t)?'<span class="overdue-label">OVERDUE</span>':""}</div></div>
 <div class="task-actions"><button class="task-action" title="Edit" data-action="edit" data-id="${t.id}">✎</button><button class="task-action" title="Delete" data-action="delete" data-id="${t.id}">×</button></div></article>`).join("");
 $("emptyState").classList.toggle("hidden",list.length>0);$("taskList").classList.toggle("hidden",list.length===0);$("showingCount").textContent=`Showing ${list.length} of ${total} tasks`;
 const upcoming=tasks.filter(t=>!t.completed&&t.deadline>=todayISO()).sort((a,b)=>a.deadline.localeCompare(b.deadline)).slice(0,4);
 $("upcomingList").innerHTML=upcoming.length?upcoming.map(t=>{let d=new Date(t.deadline+"T00:00:00");return `<div class="upcoming-item"><div class="date-box"><strong>${d.getDate()}</strong><span>${d.toLocaleDateString("en-US",{month:"short"}).toUpperCase()}</span></div><div class="upcoming-copy"><strong>${escapeHTML(t.name)}</strong><small>${t.deadline===todayISO()?"Due today":"Due "+dateLabel(t.deadline)}</small></div><span class="upcoming-dot"></span></div>`}).join(""):'<div class="no-upcoming">No upcoming deadlines. Nice work!</div>';
}
function escapeHTML(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function openModal(task=null){
 $("taskModal").classList.remove("hidden");$("taskForm").reset();$("taskId").value=task?task.id:"";$("modalTitle").textContent=task?"Edit task":"Create a task";$("taskName").value=task?task.name:"";$("taskDescription").value=task?task.description:"";$("taskDeadline").value=task?task.deadline:todayISO();$("taskPriority").value=task?task.priority:"medium";$("taskName").focus();
}
function closeModal(){$("taskModal").classList.add("hidden")}
$("addTaskButton").onclick=()=>openModal();$("emptyAddButton").onclick=()=>openModal();$("closeModal").onclick=closeModal;$("cancelModal").onclick=closeModal;
$("taskForm").onsubmit=e=>{e.preventDefault();const id=$("taskId").value;const task={id:id?Number(id):Date.now(),name:$("taskName").value.trim(),description:$("taskDescription").value.trim(),deadline:$("taskDeadline").value,priority:$("taskPriority").value,completed:false,created:Date.now()};if(!task.name||!task.deadline)return;if(id){const old=tasks.find(t=>t.id===Number(id));task.completed=old.completed;task.created=old.created;tasks=tasks.map(t=>t.id===task.id?task:t);toast("Task updated successfully");}else{tasks.push(task);toast("New task added — let's go!");}save();closeModal();render()};
$("taskList").addEventListener("click",e=>{const el=e.target.closest("[data-action]");if(!el)return;const id=Number(el.dataset.id),action=el.dataset.action;if(action==="edit"){const t=tasks.find(x=>x.id===id);openModal(t)}if(action==="delete"){if(confirm("Delete this task?")){tasks=tasks.filter(t=>t.id!==id);save();render();toast("Task deleted")}}});
$("taskList").addEventListener("change",e=>{if(e.target.dataset.action==="complete"){const id=Number(e.target.dataset.id);tasks=tasks.map(t=>t.id===id?{...t,completed:e.target.checked}:t);save();render();toast(e.target.checked?"Task completed. Great job!":"Task moved back to pending")}});
document.querySelectorAll(".nav-item").forEach(b=>b.onclick=()=>{document.querySelectorAll(".nav-item").forEach(x=>x.classList.remove("active"));b.classList.add("active");activeView=b.dataset.view;render()});
document.querySelectorAll(".filter-chip").forEach(b=>b.onclick=()=>{document.querySelectorAll(".filter-chip").forEach(x=>x.classList.remove("active"));b.classList.add("active");activeFilter=b.dataset.filter;render()});
$("searchInput").oninput=e=>{searchTerm=e.target.value.toLowerCase().trim();render()};$("sortSelect").onchange=render;
$("themeButton").onclick=()=>{document.body.classList.toggle("light-mode");toast("Theme setting updated")};
$("currentDate").textContent=new Date().toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short",year:"numeric"});
const hour=new Date().getHours();$("greeting").innerHTML=(hour<12?"Good morning":hour<17?"Good afternoon":"Good evening")+'<span class="heading-dot">.</span>';
// Demo-only browser authentication. This is a UI/demo gate, not production security.
const AUTH_USERS_KEY = "smarttask_demo_users_v1";
const AUTH_SESSION_KEY = "smarttask_demo_session_v1";
let authMode = "login";
let currentUser = null;

function readUsers() {
  try { return JSON.parse(localStorage.getItem(AUTH_USERS_KEY) || "[]"); }
  catch { return []; }
}
function writeUsers(users) { localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users)); }
function ensureDemoUser() {
  const users = readUsers();
  if (!users.some(u => u.email === "demo@smarttask.local")) {
    users.push({name:"Demo User",email:"demo@smarttask.local",password:"demo123"});
    writeUsers(users);
  }
}
function setAuthMode(mode) {
  authMode = mode;
  $("loginTab").classList.toggle("active", mode === "login");
  $("signupTab").classList.toggle("active", mode === "signup");
  $("nameField").classList.toggle("hidden", mode !== "signup");
  $("authName").required = mode === "signup";
  $("authTitle").innerHTML = (mode === "login" ? "Welcome back" : "Create your account") + '<span class="heading-dot">.</span>';
  $("authSubtitle").textContent = mode === "login" ? "Log in to continue managing your tasks." : "Sign up for your SmartTask demo workspace.";
  $("authSubmit").textContent = mode === "login" ? "Log in to SmartTask" : "Create demo account";
  $("authPassword").autocomplete = mode === "login" ? "current-password" : "new-password";
  $("authError").classList.add("hidden");
}
function showAuth() {
  $("appShell").classList.add("hidden");
  $("authScreen").classList.remove("hidden");
  $("profileMenu").classList.add("hidden");
  setAuthMode("login");
}
function showApp(user) {
  currentUser = user;
  $("authScreen").classList.add("hidden");
  $("appShell").classList.remove("hidden");
  const name = user.name || user.email.split("@")[0];
  const initial = name.trim().charAt(0).toUpperCase() || "U";
  $("profileName").textContent = name;
  $("profileEmail").textContent = user.email;
  $("menuUserName").textContent = name;
  $("menuUserEmail").textContent = user.email;
  $("sideAvatar").textContent = initial;
  $("topAvatar").textContent = initial;
  $("workspaceName").textContent = name + "'s workspace";
  loadTasksFromBackend();
}
function logout() {
  localStorage.removeItem(AUTH_SESSION_KEY);
  currentUser = null;
  tasks = [];
  $("taskList").innerHTML = "";
  showAuth();
  toast("You have logged out");
}
function authenticate(event) {
  event.preventDefault();
  const email = $("authEmail").value.trim().toLowerCase();
  const password = $("authPassword").value;
  const users = readUsers();
  if (authMode === "signup") {
    const name = $("authName").value.trim();
    if (!name) return showAuthError("Please enter your name.");
    if (password.length < 6) return showAuthError("Password must be at least 6 characters.");
    if (users.some(u => u.email === email)) return showAuthError("An account with this email already exists. Please log in.");
    const user = {name,email,password};
    users.push(user); writeUsers(users);
    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify({name,email}));
    showApp({name,email});
    toast("Demo account created successfully");
    return;
  }
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) return showAuthError("Email or password is incorrect. Try the demo account below.");
  localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify({name:user.name,email:user.email}));
  showApp({name:user.name,email:user.email});
  toast("Welcome back, " + user.name);
}
function showAuthError(message) {
  $("authError").textContent = message;
  $("authError").classList.remove("hidden");
}
$("loginTab").onclick = () => setAuthMode("login");
$("signupTab").onclick = () => setAuthMode("signup");
$("authForm").onsubmit = authenticate;
$("useDemoButton").onclick = () => {
  setAuthMode("login");
  $("authEmail").value = "demo@smarttask.local";
  $("authPassword").value = "demo123";
  $("authForm").requestSubmit();
};
$("profileMenuButton").onclick = (event) => {
  event.stopPropagation();
  const menu = $("profileMenu");
  menu.classList.toggle("hidden");
  $("profileMenuButton").setAttribute("aria-expanded", String(!menu.classList.contains("hidden")));
};
document.addEventListener("click", (event) => {
  if (!event.target.closest("#profileMenu") && !event.target.closest("#profileMenuButton")) {
    $("profileMenu").classList.add("hidden");
    $("profileMenuButton").setAttribute("aria-expanded", "false");
  }
});
$("profileMenu").addEventListener("click", (event) => {
  const button = event.target.closest("[data-menu-action]");
  if (!button) return;
  const action = button.dataset.menuAction;
  $("profileMenu").classList.add("hidden");
  if (action === "logout") logout();
  else if (action === "workspace") toast("You're viewing " + (currentUser?.name || "your") + "'s workspace");
  else if (action === "settings") { document.body.classList.toggle("light-mode"); toast("Theme setting updated"); }
  else if (action === "account") toast("Signed in as " + currentUser.email);
});
$("workspaceButton").onclick = () => toast("Personal workspace for " + (currentUser?.name || "you"));
ensureDemoUser();
try {
  const session = JSON.parse(localStorage.getItem(AUTH_SESSION_KEY) || "null");
  const validUser = session && readUsers().find(u => u.email === session.email);
  if (validUser) showApp({name:validUser.name,email:validUser.email});
  else showAuth();
} catch { showAuth(); }

async function loadTasksFromBackend() {
  try {
    const response = await fetch("/api/tasks");
    if (!response.ok) throw new Error("Could not load tasks");
    tasks = await response.json();
    render();
  } catch (error) {
    console.error(error);
    toast("Can't reach C++ backend. Run run.bat and open http://localhost:8080");
  }
}
