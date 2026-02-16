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
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

onAuthStateChanged(auth, async (user)=>{

  if(!user){
    window.location.href="index.html";
    return;
  }

  const userDoc = await getDoc(doc(db,"users",user.uid));

  if(!userDoc.exists() || userDoc.data().role !== "admin"){
    alert("Access Denied");
    window.location.href="student.html";
    return;
  }

  // only admin reaches here
  console.log("Admin authenticated");

});



const firebaseConfig = {
  apiKey: "AIzaSyCIhVp-q6jIkgP5Hid0CPVkHVx-2Vk9WUI",
  authDomain: "prakashsir-quiz-system.firebaseapp.com",
  projectId: "prakashsir-quiz-system"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ================= LOGOUT =================
window.logout = async function(){
  await signOut(auth);
  window.location.href="index.html";
};



// =====================================================
// QUIZ MANAGER (Create Quiz + Upload Excel Questions)
// =====================================================
window.loadQuizManager = async function(){

  const snap = await getDocs(collection(db,"quizzes"));

  let html="<h2>Quiz Manager</h2>";

  html+=`
    <input id="newQuizName" placeholder="New Quiz Name">
    <input type="file" id="quizExcelFile">
    <button onclick="createQuiz()">Create Quiz + Upload Questions</button>
    <hr>
  `;

  snap.forEach(d=>{
    html+=`
      <div>
        ${d.id}
        <button onclick="deleteQuiz('${d.id}')">Delete</button>
        <button onclick="resetAttempts('${d.id}')">Reset Attempts</button>
      </div>
    `;
  });

  adminContent.innerHTML=html;
};


// CREATE QUIZ
window.createQuiz = async function(){

  const name = document.getElementById("newQuizName").value.trim();
  const file = document.getElementById("quizExcelFile").files[0];

  if(!name) return alert("Enter quiz name");
  if(!file) return alert("Select Excel file");

  await setDoc(doc(db,"quizzes",name),{
    name:name,
    createdAt:new Date().toISOString()
  });

  const reader = new FileReader();

  reader.onload = async function(e){

    const wb = XLSX.read(new Uint8Array(e.target.result),{type:"array"});
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

    let i=1;

    for(const r of rows){
      await setDoc(doc(db,"quizzes",name,"questions","q"+i),{
        question:r.question,
        option1:r.option1,
        option2:r.option2,
        option3:r.option3,
        option4:r.option4,
        answer:r.answer
      });
      i++;
    }

    alert("Quiz Created & Questions Uploaded");
    loadQuizManager();
  };

  reader.readAsArrayBuffer(file);
};


// DELETE QUIZ
window.deleteQuiz = async function(id){
  await deleteDoc(doc(db,"quizzes",id));
  alert("Quiz Deleted");
  loadQuizManager();
};



// =====================================================
// STUDENT MANAGER (VIEW REGISTERED STUDENTS)
// =====================================================
window.loadStudentManager = async function(){

  const snap = await getDocs(collection(db,"users"));

  let html="<h2>Students</h2>";

  snap.forEach(d=>{
    const u=d.data();
    if(u.role==="student"){
      html+=`
        <div>
          ${u.email}
          <span style="color:lightgreen">${u.status || "registered"}</span>
        </div>
      `;
    }
  });

  adminContent.innerHTML=html;
};



// =====================================================
// UPLOAD ALLOWED EXAM EMAILS
// =====================================================
window.uploadExamStudents = async function(){

  const file=document.getElementById("studentExcelFile").files[0];
  if(!file) return alert("Select Excel");

  const reader=new FileReader();

  reader.onload=async function(e){

    const wb=XLSX.read(new Uint8Array(e.target.result),{type:"array"});
    const rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

    const emails=[];

    rows.forEach(r=>{
      if(r.email) emails.push(r.email.toLowerCase());
    });

    await updateDoc(doc(db,"examSessions","activeExam"),{
      allowedEmails:emails
    });

    alert("Allowed Students Uploaded");
  };

  reader.readAsArrayBuffer(file);
};



// =====================================================
// EXAM CONTROL PANEL
// =====================================================
window.loadExamControl = async function(){

  const quizSnap=await getDocs(collection(db,"quizzes"));

  let html="<h2>Exam Control</h2>";

  html+="<select id='quizSelect'>";
  quizSnap.forEach(d=>{
    html+=`<option value="${d.id}">${d.id}</option>`;
  });
  html+="</select>";

  html+="<input id='duration' type='number' placeholder='Duration (minutes)'>";

  html+=`
    <h3>Upload Allowed Student Emails</h3>
    <input type="file" id="studentExcelFile">
    <button onclick="uploadExamStudents()">Upload</button>
    <br><br>
    <button onclick="startExam()">Start Exam</button>
    <button onclick="stopExam()">Stop Exam</button>
  `;

  adminContent.innerHTML=html;
};


// START EXAM
window.startExam = async function(){

  const quiz=document.getElementById("quizSelect").value;
  const duration=Number(document.getElementById("duration").value);

  if(!quiz || !duration) return alert("Select quiz & duration");

  await setDoc(doc(db,"examSessions","activeExam"),{
    quizId:quiz,
    duration:duration,
    status:"running",
    allowedEmails:[],
    startedAt:new Date().toISOString()
  });

  alert("Exam Started");
};


// STOP EXAM
window.stopExam = async function(){
  await updateDoc(doc(db,"examSessions","activeExam"),{ status:"stopped" });
  alert("Exam Stopped");
};



// =====================================================
// DOWNLOAD RESULTS
// =====================================================
window.downloadResults = async function(){

  try{

    const snap = await getDocs(collection(db,"results"));
    if(snap.empty) return alert("No results");

    const rows=[["Email","Quiz","Score","Total","Submitted At"]];

    snap.forEach(d=>{
      const r=d.data();
      rows.push([r.email,r.quizId,r.score,r.total,r.submittedAt]);
    });

    const ws=XLSX.utils.aoa_to_sheet(rows);
    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws,"Results");

    XLSX.writeFile(wb,"results.xlsx");

  }catch(e){
    alert("Download Error: "+e.message);
  }
};



// =====================================================
// RESET ATTEMPTS FOR A QUIZ (ALLOW RE-EXAM)
// =====================================================
window.resetAttempts = async function(quizId){

  const usersSnap = await getDocs(collection(db,"users"));

  for(const u of usersSnap.docs){
    const data=u.data();
    if(data.role==="student"){
      await updateDoc(doc(db,"users",u.id),{
        [`attempts.${quizId}`]: false
      });
    }
  }

  alert("All students can retake: "+quizId);
};
