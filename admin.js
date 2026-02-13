import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  getFirestore,
  collection,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCIhVp-q6jIkgP5Hid0CPVkHVx-2Vk9WUI",
  authDomain: "prakashsir-quiz-system.firebaseapp.com",
  projectId: "prakashsir-quiz-system"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

window.logout = async function(){
  await signOut(auth);
  window.location.href="index.html";
};

// ================= QUIZ MANAGER =================
window.loadQuizManager = async function(){

  const snap = await getDocs(collection(db,"quizzes"));

  let html="<h2>Quiz Manager</h2>";

  html+=`
    <input id="newQuizName" placeholder="New Quiz Name">
    <button onclick="createQuiz()">Create Quiz</button>
    <hr>
  `;

  snap.forEach(d=>{
    html+=`
      <div>
        ${d.id}
        <button onclick="deleteQuiz('${d.id}')">Delete</button>
      </div>
    `;
  });

  adminContent.innerHTML=html;
};

window.createQuiz = async function(){

  const name=document.getElementById("newQuizName").value;
  if(!name) return;

  await setDoc(doc(db,"quizzes",name),{
    name:name,
    createdAt:new Date().toISOString()
  });

  loadQuizManager();
};

window.deleteQuiz = async function(id){
  await deleteDoc(doc(db,"quizzes",id));
  loadQuizManager();
};

// ================= STUDENT MANAGER =================
window.loadStudentManager = async function(){

  const snap = await getDocs(collection(db,"users"));

  let html="<h2>Students</h2>";

  snap.forEach(d=>{
    const u=d.data();
    if(u.role==="student"){
      html+=`
        <div>
          ${u.email} 
          <span class="status-${u.status}">${u.status}</span>
        </div>
      `;
    }
  });

  adminContent.innerHTML=html;
};

// ================= EXAM CONTROL =================
window.loadExamControl = async function(){

  const quizSnap=await getDocs(collection(db,"quizzes"));
  const userSnap=await getDocs(collection(db,"users"));

  let html="<h2>Exam Control</h2>";

  html+="<select id='quizSelect'>";
  quizSnap.forEach(d=>{
    html+=`<option value="${d.id}">${d.id}</option>`;
  });
  html+="</select>";

  html+="<input id='duration' type='number' placeholder='Duration (minutes)'>";

  html+="<h3>Select Students</h3>";

  userSnap.forEach(d=>{
    const u=d.data();
    if(u.role==="student"){
      html+=`
        <div>
          <input type="checkbox" value="${d.id}" class="studentCheck">
          ${u.email}
        </div>
      `;
    }
  });

  html+=`
    <button onclick="startExam()">Start Exam</button>
    <button onclick="stopExam()">Stop Exam</button>
  `;

  adminContent.innerHTML=html;
};

window.startExam = async function(){

  const quiz=document.getElementById("quizSelect").value;
  const duration=Number(document.getElementById("duration").value);

  const selected=[];
  document.querySelectorAll(".studentCheck:checked")
    .forEach(cb=>selected.push(cb.value));

  await setDoc(doc(db,"examSessions","activeExam"),{
    quizId:quiz,
    duration:duration,
    status:"running",
    allowedStudents:selected,
    startedAt:new Date().toISOString()
  });

  alert("Exam Started");
};

window.stopExam = async function(){
  await updateDoc(doc(db,"examSessions","activeExam"),{
    status:"stopped"
  });
  alert("Exam Stopped");
};



window.downloadResults = async function(){

  try{

    const snap = await getDocs(collection(db,"results"));

    if(snap.empty){
      alert("No results available.");
      return;
    }

    const rows = [["Email","Quiz","Score","Total","Submitted At"]];

    snap.forEach(d=>{
      const r = d.data();
      rows.push([
        r.email || "",
        r.quizId || "",
        r.score || 0,
        r.total || 0,
        r.submittedAt || ""
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Results");

    XLSX.writeFile(wb, "results.xlsx");

  }catch(e){
    alert("Error downloading results: " + e.message);
  }
};

