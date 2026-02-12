import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  getDocs,
  collection,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


// 🔴 PUT YOUR REAL CONFIG HERE
const firebaseConfig = {
  apiKey: "PASTE_API_KEY",
  authDomain: "prakashsir-quiz-system.firebaseapp.com",
  projectId: "prakashsir-quiz-system"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let questions = [];
let timerInterval;


// ================= REGISTER =================
window.register = async function () {
  try {
    const emailVal = email.value;
    const passwordVal = password.value;

    const allowed = await getDoc(doc(db,"allowedEmails",emailVal));

    if(!allowed.exists()){
      msg.innerText="You are not allowed.";
      return;
    }

    const user = await createUserWithEmailAndPassword(auth,emailVal,passwordVal);
    await sendEmailVerification(user.user);

    msg.innerText="Verification email sent.";
  } catch(e){
    msg.innerText=e.message;
  }
};


// ================= LOGIN =================
window.login = async function () {
  try{
    const userCred = await signInWithEmailAndPassword(auth,email.value,password.value);

    if(!userCred.user.emailVerified){
      msg.innerText="Verify email first.";
      return;
    }

    if(userCred.user.email==="YOUR_ADMIN_EMAIL"){
      loadAdmin();
    }else{
      checkExamStatus();
    }
  }catch(e){
    msg.innerText=e.message;
  }
};


// ================= ADMIN PANEL =================
function loadAdmin(){

document.body.innerHTML=`
<h2>Admin Dashboard</h2>

<h3>Upload Students Excel</h3>
<input type="file" id="studentFile">
<button onclick="uploadStudents()">Upload</button>

<h3>Upload Questions Excel</h3>
<input type="file" id="questionFile">
<button onclick="uploadQuestions()">Upload</button>

<hr>

<select id="quizSelect">
<option value="quiz1">Quiz 1</option>
</select>

<input id="duration" placeholder="Duration (minutes)">

<button onclick="startExam()">Start Exam</button>
<button onclick="stopExam()">Stop Exam</button>
<button onclick="downloadResults()">Download Results</button>

<p id="adminMsg"></p>
`;
}


// ================= STUDENT EXCEL UPLOAD =================
window.uploadStudents = async function(){

const file=document.getElementById("studentFile").files[0];
if(!file){alert("Select file");return;}

const reader=new FileReader();

reader.onload=async function(e){
const data=new Uint8Array(e.target.result);
const workbook=XLSX.read(data,{type:"array"});
const rows=XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

for(const r of rows){
await setDoc(doc(db,"allowedEmails",r.email),{email:r.email});
}

alert("Students Uploaded");
};

reader.readAsArrayBuffer(file);
};


// ================= QUESTIONS UPLOAD =================
window.uploadQuestions = async function(){

const file=document.getElementById("questionFile").files[0];
if(!file){alert("Select file");return;}

const reader=new FileReader();

reader.onload=async function(e){

const data=new Uint8Array(e.target.result);
const workbook=XLSX.read(data,{type:"array"});
const rows=XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

let i=1;

for(const r of rows){

await setDoc(doc(db,"quizzes","quiz1","questions","q"+i),{
question:r.question,
options:[r.option1,r.option2,r.option3,r.option4],
answer:r.answer
});

i++;
}

alert("Questions Uploaded");
};

reader.readAsArrayBuffer(file);
};


// ================= START EXAM =================
window.startExam = async function(){

await setDoc(doc(db,"config","activeQuiz"),{
quizId:quizSelect.value,
duration:Number(duration.value),
status:"running"
});

adminMsg.innerText="Exam Started";
};


// ================= STOP =================
window.stopExam = async function(){
await updateDoc(doc(db,"config","activeQuiz"),{status:"stopped"});
adminMsg.innerText="Exam Stopped";
};


// ================= CHECK =================
async function checkExamStatus(){

const cfg=await getDoc(doc(db,"config","activeQuiz"));
const data=cfg.data();

if(data.status!=="running"){
document.body.innerHTML="<h3>Exam not started</h3>";
return;
}

loadQuiz(data.quizId,data.duration);
}


// ================= LOAD QUIZ =================
async function loadQuiz(quizId,duration){

document.body.innerHTML="<h2 id='timer'></h2><div id='quiz'></div>";

startTimer(duration);

const snap=await getDocs(collection(db,"quizzes",quizId,"questions"));

let html="";

snap.forEach(d=>{
const q=d.data();
questions.push(q);

html+=`
<p><b>${q.question}</b></p>
${q.options.map(o=>`<label><input type="radio" name="${q.question}" value="${o}">${o}</label><br>`).join("")}
<br>`;
});

html+=`<button onclick="submitQuiz()">Submit</button>`;
quiz.innerHTML=html;
}


// ================= TIMER =================
function startTimer(minutes){
let t=minutes*60;

timerInterval=setInterval(()=>{
const m=Math.floor(t/60);
const s=t%60;
timer.innerText=`Time Left: ${m}:${s}`;
t--;
if(t<=0){clearInterval(timerInterval);submitQuiz();}
},1000);
}


// ================= SUBMIT =================
window.submitQuiz = async function(){

clearInterval(timerInterval);

let score=0;

questions.forEach(q=>{
const ans=document.querySelector(`input[name="${q.question}"]:checked`);
if(ans && ans.value===q.answer) score++;
});

await setDoc(doc(db,"results",auth.currentUser.uid),{
email:auth.currentUser.email,
score,
total:questions.length
});

document.body.innerHTML=`<h2>Submitted</h2><h3>Score ${score}</h3>`;
};


// ================= DOWNLOAD =================
window.downloadResults = async function(){

const snap=await getDocs(collection(db,"results"));
const rows=[["Email","Score","Total"]];

snap.forEach(d=>{
const r=d.data();
rows.push([r.email,r.score,r.total]);
});

const ws=XLSX.utils.aoa_to_sheet(rows);
const wb=XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb,ws,"Results");
XLSX.writeFile(wb,"results.xlsx");
};
