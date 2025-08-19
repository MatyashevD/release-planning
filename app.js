// Supabase init
const SUPABASE_URL = "https://nfixznxrpiobbstrqvdw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5maXh6bnhycGlvYmJzdHJxdmR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1MjA1MDgsImV4cCI6MjA3MTA5NjUwOH0.bTCzAPdX5mDVl8AtbZeefsSFqlPo7c_zebKimn_mCsY";
const { createClient } = window.supabase;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Elements
const els = {
  board: document.getElementById("board"),
  search: document.getElementById("search"),
  filterRelease: document.getElementById("filterRelease"),
  newTaskBtn: document.getElementById("newTaskBtn"),
  logoutBtn: document.getElementById("logoutBtn"),
  themeBtn: document.getElementById("themeBtn"),
  progressChart: document.getElementById("progressChart"),
  releaseInfo: document.getElementById("releaseInfo"),
  loginModal: document.getElementById("loginModal"),
  createTaskModal: document.getElementById("createTaskModal"),
  saveTaskBtn: document.getElementById("saveTaskBtn"),
  cancelTaskBtn: document.getElementById("cancelTaskBtn"),
  taskTitle: document.getElementById("taskTitle"),
  taskDescription: document.getElementById("taskDescription"),
  taskAssignee: document.getElementById("taskAssignee"),
  taskPriority: document.getElementById("taskPriority"),
  taskRelease: document.getElementById("taskRelease"),
  taskTags: document.getElementById("taskTags"),
  taskLink: document.getElementById("taskLink"),
  taskDetailPanel: document.getElementById("taskDetailPanel"),
  detailTitleInput: document.getElementById("detailTitleInput"),
  detailDescription: document.getElementById("detailDescription"),
  detailAssignee: document.getElementById("detailAssignee"),
  detailPriority: document.getElementById("detailPriority"),
  detailRelease: document.getElementById("detailRelease"),
  detailTags: document.getElementById("detailTags"),
  detailLink: document.getElementById("detailLink"),
  updateTaskBtn: document.getElementById("updateTaskBtn"),
  deleteTaskBtn: document.getElementById("deleteTaskBtn"),
  closePanelBtn: document.getElementById("closePanelBtn"),
  authEmail: document.getElementById("authEmail"),
  authPassword: document.getElementById("authPassword"),
  loginBtn: document.getElementById("loginBtn"),
  signupBtn: document.getElementById("signupBtn")
};

const STATUS_ORDER = [
  {id:'ready', label:'Ready to Dev'},
  {id:'dev', label:'В разработке'},
  {id:'review', label:'Review / QA'},
  {id:'test', label:'Тестирование'},
  {id:'rfr', label:'Готово к релизу'},
  {id:'released', label:'Released'}
];

let tasks = [];
let chart;
let currentTaskId = null;

// Utils
function showToast(msg,type="info"){
  const t=document.createElement("div");
  t.className=`toast ${type}`;
  t.innerText=msg;
  document.body.appendChild(t);
  setTimeout(()=>t.remove(),4000);
}

// Kanban
async function loadData(){
  const { data } = await supabase.from("tasks").select("*");
  tasks=data||[];
  render();
}
function render(){
  els.board.innerHTML="";
  const rels=[...new Set(tasks.map(x=>x.release).filter(Boolean))];
  els.filterRelease.innerHTML='<option value="">Все релизы</option>'+rels.map(r=>`<option>${r}</option>`).join("");
  STATUS_ORDER.forEach(s=>{
    const col=document.createElement("div");col.className="column";
    col.innerHTML=`<div class="col-header">${s.label}</div>`;
    const dz=document.createElement("div");dz.className="dropzone";dz.dataset.status=s.id;
    dz.addEventListener("dragover",e=>e.preventDefault());
    dz.addEventListener("drop",onDrop);
    col.appendChild(dz);
    els.board.appendChild(col);
    getItems(s.id).forEach(it=>dz.appendChild(cardEl(it)));
  });
  renderChart();
}
function getItems(status){
  const q=els.search.value.toLowerCase();
  const fr=els.filterRelease.value;
  return tasks.filter(x=>x.status===status).filter(x=>{
    if(fr&&x.release!==fr)return false;
    const hay=[x.title,x.description,x.assignee,x.release,(x.tags||[]).join(" ")].join(" ").toLowerCase();
    return !q||hay.includes(q);
  });
}
function cardEl(it){
  const el=document.createElement("div");el.className="card";el.draggable=true;el.dataset.id=it.id;
  const prio={"Low":"prio-low","Medium":"prio-med","High":"prio-high","Critical":"prio-critical"}[it.priority||"Low"];
  el.innerHTML=`<div><span class="priority ${prio}"></span><b>${it.title}</b></div><div>${it.assignee||""} | Release: ${it.release||""}</div>`;
  el.addEventListener("dragstart",e=>{el.classList.add("dragging");e.dataTransfer.setData("text/plain",it.id);});
  el.addEventListener("dragend",()=>el.classList.remove("dragging"));
  el.addEventListener("click",()=>openTaskDetail(it.id));
  return el;
}
async function onDrop(e){
  const id=e.dataTransfer.getData("text/plain");
  const task=tasks.find(x=>x.id==id);
  if(task){task.status=e.currentTarget.dataset.status;await supabase.from("tasks").update({status:task.status}).eq("id",task.id);loadData();}
}

// Create Task
function openCreateTaskModal(){els.createTaskModal.style.display="flex";}
function closeCreateTaskModal(){els.createTaskModal.style.display="none";}
els.newTaskBtn.onclick=openCreateTaskModal;
els.cancelTaskBtn.onclick=closeCreateTaskModal;
els.saveTaskBtn.onclick=async()=>{
  const task={
    title:els.taskTitle.value,
    description:els.taskDescription.value,
    assignee:els.taskAssignee.value,
    priority:els.taskPriority.value,
    release:els.taskRelease.value,
    tags:els.taskTags.value.split(",").map(x=>x.trim()).filter(Boolean),
    link:els.taskLink.value,
    status:"ready"
  };
  await supabase.from("tasks").insert([task]);
  closeCreateTaskModal();showToast("Задача создана","success");loadData();
};

// Task Detail Panel
function openTaskDetail(id){
  currentTaskId=id;
  const it=tasks.find(t=>t.id==id);
  if(!it)return;
  els.detailTitleInput.value=it.title;
  els.detailDescription.value=it.description||"";
  els.detailAssignee.value=it.assignee||"";
  els.detailPriority.value=it.priority||"Low";
  els.detailRelease.value=it.release||"";
  els.detailTags.value=(it.tags||[]).join(", ");
  els.detailLink.value=it.link||"";
  els.taskDetailPanel.classList.add("open");
}
function closeTaskDetail(){els.taskDetailPanel.classList.remove("open");currentTaskId=null;}
els.closePanelBtn.onclick=closeTaskDetail;
els.updateTaskBtn.onclick=async()=>{
  if(!currentTaskId)return;
  const updated={
    title:els.detailTitleInput.value,
    description:els.detailDescription.value,
    assignee:els.detailAssignee.value,
    priority:els.detailPriority.value,
    release:els.detailRelease.value,
    tags:els.detailTags.value.split(",").map(x=>x.trim()).filter(Boolean),
    link:els.detailLink.value
  };
  await supabase.from("tasks").update(updated).eq("id",currentTaskId);
  showToast("Задача обновлена","success");loadData();
};
els.deleteTaskBtn.onclick=async()=>{
  if(!currentTaskId)return;
  if(confirm("Удалить задачу?")){await supabase.from("tasks").delete().eq("id",currentTaskId);showToast("Задача удалена","danger");closeTaskDetail();loadData();}
};

// Chart
function renderChart(){
  const counts=STATUS_ORDER.map(s=>tasks.filter(x=>x.status===s.id).length);
  if(chart)chart.destroy();
  chart=new Chart(els.progressChart,{type:"bar",data:{labels:STATUS_ORDER.map(s=>s.label),datasets:[{data:counts,backgroundColor:"rgba(122,162,255,0.7)"}]},options:{plugins:{legend:{display:false}},responsive:true,maintainAspectRatio:false}});
}

// Auth
els.loginBtn.onclick=async()=>{
  const {error}=await supabase.auth.signInWithPassword({email:els.authEmail.value,password:els.authPassword.value});
  if(error)showToast(error.message,"danger");else{els.loginModal.style.display="none";loadData();}
};
els.signupBtn.onclick=async()=>{
  const {error}=await supabase.auth.signUp({email:els.authEmail.value,password:els.authPassword.value});
  if(error)showToast(error.message,"danger");else showToast("Проверьте почту для подтверждения","info");
};
els.logoutBtn.onclick=async()=>{await supabase.auth.signOut();els.loginModal.style.display="flex";};

// Events
els.search.oninput=render;
els.filterRelease.onchange=render;
document.addEventListener("keydown",e=>{if(e.key==="Escape"){closeCreateTaskModal();closeTaskDetail();}if(e.key.toLowerCase()==="n"){openCreateTaskModal();}});
els.themeBtn.onclick=()=>{document.body.classList.toggle("light");els.themeBtn.textContent=document.body.classList.contains("light")?"☀️":"🌙";};

// Init
supabase.auth.getUser().then(({data})=>{if(!data.user)els.loginModal.style.display="flex";else loadData();});
