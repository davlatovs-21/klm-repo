const klmNotificationKeys={snapshot:'klm-project-snapshot-v1',inbox:'klm-notification-inbox-v1'};
const notificationPanel=document.querySelector('#notificationPanel');
const notificationBtn=document.querySelector('#notificationBtn');

function getNotificationInbox(){try{return JSON.parse(localStorage.getItem(klmNotificationKeys.inbox))||[]}catch{return []}}
function saveNotificationInbox(items){localStorage.setItem(klmNotificationKeys.inbox,JSON.stringify(items.slice(0,50)))}
function renderNotificationInbox(){
  const inbox=getNotificationInbox();
  document.querySelector('#notificationCount').textContent=inbox.length;
  notificationBtn.classList.toggle('has-news',inbox.length>0);
  document.querySelector('#notificationList').innerHTML=inbox.length?inbox.map(item=>`<div class="notification-item" data-project="${item.projectId}"><span>${item.type==='new'?'+':'↻'}</span><div><b>${item.title}</b><p>${item.message}</p><small>${item.date}</small></div></div>`).join(''):`<div class="notification-empty"><span>✓</span><p>Новых событий пока нет.<br>Мы сообщим после обновления данных.</p></div>`;
  document.querySelectorAll('.notification-item').forEach(el=>el.addEventListener('click',()=>{toggleNotificationPanel(false);location.hash='projects';setTimeout(()=>openProject(el.dataset.project),50)}));
}
function syncNotificationPermission(){
  const supported='Notification' in window,granted=supported&&Notification.permission==='granted';
  document.querySelector('#notificationPermission').classList.toggle('enabled',granted);
  const button=document.querySelector('#enableNotifications');button.textContent=granted?'Включены':supported?'Включить':'Недоступно';button.disabled=!supported||granted;
}
function toggleNotificationPanel(force){const open=typeof force==='boolean'?force:!notificationPanel.classList.contains('open');notificationPanel.classList.toggle('open',open);notificationPanel.setAttribute('aria-hidden',String(!open))}
async function requestKlmNotifications(){
  if(!('Notification' in window))return;
  const permission=await Notification.requestPermission();syncNotificationPermission();
  if(permission==='granted')new Notification('KLM Менеджер в Таджикистане',{body:'Системные уведомления включены.'});
}
function detectProjectUpdates(){
  const current=Object.fromEntries(projects.map(project=>[project.id,project.updated]));
  let previous=null;try{previous=JSON.parse(localStorage.getItem(klmNotificationKeys.snapshot))}catch{}
  const events=[];
  if(previous)projects.forEach(project=>{if(!previous[project.id])events.push({type:'new',projectId:project.id,title:'Новый проект',message:project.name,date:project.updated});else if(previous[project.id]!==project.updated)events.push({type:'update',projectId:project.id,title:'Обновлена информация',message:project.name,date:project.updated})});
  if(events.length){saveNotificationInbox([...events,...getNotificationInbox()]);if('Notification' in window&&Notification.permission==='granted')new Notification('KLM Менеджер: обновление рынка',{body:`Новых и обновлённых проектов: ${events.length}`})}
  localStorage.setItem(klmNotificationKeys.snapshot,JSON.stringify(current));renderNotificationInbox();syncNotificationPermission();
}

notificationBtn.addEventListener('click',()=>toggleNotificationPanel());
document.querySelector('#closeNotifications').addEventListener('click',()=>toggleNotificationPanel(false));
document.querySelector('#enableNotifications').addEventListener('click',requestKlmNotifications);
document.querySelector('#readAllNotifications').addEventListener('click',()=>{saveNotificationInbox([]);renderNotificationInbox()});
document.addEventListener('keydown',event=>{if(event.key==='Escape')toggleNotificationPanel(false)});
detectProjectUpdates();
