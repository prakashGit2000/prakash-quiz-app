app.js

// ================= FIREBASE IMPORTS (CDN ONLY) =================
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


// ================= YOUR FIREBASE CONFIG =================
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

    const emailVal = email.value;

    // ✅ Step 1 — Check if email is allowed
    const allowed = await getDoc(doc(db,"allowedEmails",emailVal));

    if(!allowed.exists()){
      msg.innerText="This email is not allowed.";
      return;
    }

    // ✅ Step 2 — Sign in
    const userCred = await signInWithEmailAndPassword(auth,emailVal,password.value);
    const user = userCred.user;

    // ✅ Step 3 — Auto-create Firestore profile if missing
    const userRef = doc(db,"users",user.uid);
    const userDoc = await getDoc(userRef);

    if(!userDoc.exists()){
      await setDoc(userRef,{
        email: user.email,
        role: (user.email === "prakash4snu@gmail.com") ? "admin" : "student",
        attempted: false,
        createdAt: new Date().toISOString()
      });
    }

    const data = (await getDoc(userRef)).data();

    // ✅ Admin login
    if(data.role === "admin"){
      loadAdmin();
      return;
    }

    // ✅ Students must verify email
    if(!user.emailVerified){
      msg.innerText="Please verify your email before login.";
      return;
    }

    checkExamStatus();

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

<input id="duration" placeholder="Duration (minutes)">

<button onclick="startExam()">Start Exam</button>
<button onclick="stopExam()">Stop Exam</button>
<button onclick="downloadResults()">Download Results</button>

<p id="adminMsg"></p>
`;
}


// ================= UPLOAD STUDENTS =================
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


// ================= UPLOAD QUESTIONS =================
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
await setDoc(doc(db,"quizzes","quiz1","questions","q"+i),r);
i++;
}

alert("Questions Uploaded");
};

reader.readAsArrayBuffer(file);
};


// ================= START =================
window.startExam = async function(){
await setDoc(doc(db,"config","activeQuiz"),{
quizId:"quiz1",
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
