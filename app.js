// ================= FIREBASE IMPORTS =================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail
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


// ================= FIREBASE CONFIG =================
const firebaseConfig = {
  apiKey: "AIzaSyCIhVp-q6jIkgP5Hid0CPVkHVx-2Vk9WUI",
  authDomain: "prakashsir-quiz-system.firebaseapp.com",
  projectId: "prakashsir-quiz-system",
  storageBucket: "prakashsir-quiz-system.appspot.com",
  messagingSenderId: "319414061738",
  appId: "1:319414061738:web:318c9c438e0991f09a9ed3"
};


// ================= INITIALIZE =================
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let questions = [];
let timerInterval;


// ================= REGISTER =================
window.register = async function(){

  const emailVal = email.value.trim();
  const passwordVal = password.value;

  if(!emailVal || !passwordVal){
    msg.innerText = "Enter email and password.";
    return;
  }

  const allowed = await getDoc(doc(db,"allowedEmails",emailVal));

  if(!allowed.exists()){
    msg.innerText = "You are not allowed.";
    return;
  }

  try{
    const user = await createUserWithEmailAndPassword(auth,emailVal,passwordVal);
    await sendEmailVerification(user.user);
    msg.innerText = "Verification email sent. Verify before login.";
  }catch(e){
    if(e.code==="auth/email-already-in-use"){
      msg.innerText="Already registered. Please login.";
    }else{
      msg.innerText=e.message;
    }
  }
};


// ================= LOGIN =================
window.login = async function(){

  const emailVal = email.value.trim();
  const passwordVal = password.value;

  const allowed = await getDoc(doc(db,"allowedEmails",emailVal));
  if(!allowed.exists()){
    msg.innerText="Email not allowed.";
    return;
  }

  try{

    const userCred = await signInWithEmailAndPassword(auth,emailVal,passwordVal);
    const user = userCred.user;

    if(!user.emailVerified){
      msg.innerText="Verify email before login.";
      return;
    }

    const userRef = doc(db,"users",user.uid);
    const userDoc = await getDoc(userRef);

    if(!userDoc.exists()){
      await setDoc(userRef,{
        email:user.email,
        role:(user.email==="prakash4snu@gmail.com")?"admin":"student",
        createdAt:new Date().toISOString()
      });
    }

    const data = (await getDoc(userRef)).data();

    if(data.role==="admin") loadAdmin();
    else checkExamStatus();

  }catch(e){
    msg.innerText="Invalid login credentials.";
  }
};


// ================= RESET PASSWORD =================
window.resetPassword = async function(){
  try{
    await sendPasswordResetEmail(auth,email.value.trim());
    msg.innerText="Password reset email sent.";
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
<button onclick="uploadStudents()">Upload Students</button>

<h3>Upload Questions Excel</h3>
<input type="file" id="questionFile">
<button onclick="uploadQuestions()">Upload Questions</button>

<hr>

<input id="duration" placeholder="Duration (minutes)">

<button onclick="startExam()">Start Exam</button>
<button onclick="stopExam()">Stop Exam</button>
<button onclick="downloadResults()">Download Results</button>
`;
}


// ================= UPLOAD STUDENTS =================
window.uploadStudents = async function(){

const file=document.getElementById("studentFile").files[0];
if(!file){ alert("Select file"); return; }

const reader=new FileReader();

reader.onload=async function(e){

const wb=XLSX.read(new Uint8Array(e.target.result),{type:"array"});
const rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

for(const r of rows){
await setDoc(doc(db,"allowedEmails",r.email),{email:r.email});
}

alert("Students uploaded");
};

reader.readAsArrayBuffer(file);
};


// ================= UPLOAD QUESTIONS =================
window.uploadQuestions = async function(){

const file=document.getElementById("questionFile").files[0];
if(!file){ alert("Select file"); return; }

const reader=new FileReader();

reader.onload=async function(e){

const wb=XLSX.read(new Uint8Array(e.target.result),{type:"array"});
const rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

let i=1;
for(const r of rows){
await setDoc(doc(db,"quizzes","quiz1","questions","q"+i),r);
i++;
}

alert("Questions uploaded");
};

reader.readAsArrayBuffer(file);
};


// ================= START EXAM =================
window.startExam = async function(){
await setDoc(doc(db,"config","activeQuiz"),{
quizId:"quiz1",
duration:Number(duration.value),
status:"running"
});
alert("Exam started");
};


// ================= STOP EXAM =================
window.stopExam = async function(){
await updateDoc(doc(db,"config","activeQuiz"),{status:"stopped"});
alert("Exam stopped");
};


// ================= CHECK STATUS =================
async function checkExamStatus(){

const cfg=await getDoc(doc(db,"config","activeQuiz"));

if(!cfg.exists() || cfg.data().status!=="running"){
document.body.innerHTML="<h3>Exam not started</h3>";
return;
}

loadQuiz(cfg.data().quizId,cfg.data().duration);
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
timer.innerText=`Time Left: ${Math.floor(t/60)}:${t%60}`;
if(--t<=0){clearInterval(timerInterval);submitQuiz();}
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
total:questions.length,
submittedAt:new Date().toISOString()
});

document.body.innerHTML=`<h2>Submitted</h2><h3>Score ${score}/${questions.length}</h3>`;
};


// ================= DOWNLOAD RESULTS =================
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
