import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc,
  getDocs,
  collection,
  setDoc,
  updateDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCIhVp-q6jIkgP5Hid0CPVkHVx-2Vk9WUI",
  authDomain: "prakashsir-quiz-system.firebaseapp.com",
  projectId: "prakashsir-quiz-system"
};

let currentIndex = 0;
let answers = {};


const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let timerInterval;
let questions = [];
let currentQuizId = null;


// ================= AUTH CHECK =================
auth.onAuthStateChanged(async user => {

  if (!user) {
    window.location.href = "index.html";
    return;
  }

  const userDoc = await getDoc(doc(db, "users", user.uid));
  window.userData = userDoc.data();

  if (window.userData?.attempts?.[currentQuizId] === true) {
  alert("You already attempted this quiz.");
  return;
}



  listenExam(user);
});


// ================= REALTIME EXAM LISTENER =================
function listenExam(user) {

  const examRef = doc(db, "examSessions", "activeExam");

  onSnapshot(examRef, async snap => {

    if (!snap.exists()) {
      examTitle.innerText = "No active exam";
      return;
    }

    const data = snap.data();

    if (
      data.status === "running" &&
      data.allowedStudents?.includes(user.uid)
    ) {
      loadQuiz(user, data.quizId, data.duration);
    }

    if (data.status === "stopped") {
      submitQuiz(user);
    }
  });
}






async function loadQuiz(user, quizId, duration){

  currentQuizId = quizId;
  questions = [];
  answers = {};
  currentIndex = 0;

  clearInterval(timerInterval);

  const snap = await getDocs(collection(db,"quizzes",quizId,"questions"));

  snap.forEach(d=>{
    const q=d.data();
    questions.push({
      id:d.id,
      question:q.question,
      options:[q.option1,q.option2,q.option3,q.option4],
      answer:q.answer
    });
    answers[d.id]=null;
  });

  renderQuestion();
  renderPalette();
  startTimer(user,duration);
}






function renderQuestion() {

  const q = questions[currentIndex];

  let html = `
    <div class="question-title">
      <h3>Q${currentIndex + 1}. ${q.question}</h3>
    </div>
    <div class="options">
  `;

  const options = [
    q.option1,
    q.option2,
    q.option3,
    q.option4
  ];

  options.forEach((opt, index) => {

    html += `
      <label class="option-row">
        <input type="radio"
               name="option"
               value="${index + 1}"
               ${answers[currentIndex] == index + 1 ? "checked" : ""}>
        <span>${opt}</span>
      </label>
    `;
  });

  html += `</div>`;

  questionBox.innerHTML = html;

  updatePalette();
}


document.addEventListener("change", function(e){
  if(e.target.name === "option"){
    answers[currentIndex] = Number(e.target.value);
  }
});





window.saveAnswer=function(qid,value){
  answers[qid]=value;
  updatePalette();
}





window.nextQuestion=function(){
  if(currentIndex<questions.length-1){
    currentIndex++;
    renderQuestion();
  }
}

window.prevQuestion=function(){
  if(currentIndex>0){
    currentIndex--;
    renderQuestion();
  }
}






function renderPalette(){

  let html="";

  questions.forEach((q,i)=>{
    html+=`<div class="qbox" id="p${i}" onclick="jump(${i})">${i+1}</div>`;
  });

  palette.innerHTML=html;
  updatePalette();
}

window.jump=function(i){
  currentIndex=i;
  renderQuestion();
}

function updatePalette(){

  questions.forEach((q,i)=>{

    const box=document.getElementById("p"+i);
    box.className="qbox";

    if(i===currentIndex) box.classList.add("current");
    else if(answers[q.id]) box.classList.add("answered");
    else box.classList.add("notanswered");

  });
}




// ================= TIMER =================
const timerEl = document.getElementById("timer");

function startTimer(user, minutes) {

  let t = minutes * 60;

  timerInterval = setInterval(() => {

    let min = Math.floor(t / 60);
    let sec = t % 60;

    if (sec < 10) sec = "0" + sec;

    timerEl.innerText = "Time Left: " + min + ":" + sec;

    if (--t <= 0) {
      clearInterval(timerInterval);
      submitQuiz(user);
    }

  }, 1000);
}



// ================= MANUAL SUBMIT =================
window.manualSubmit = function () {
  submitQuiz(auth.currentUser);
};


// ================= SUBMIT QUIZ =================
async function submitQuiz(user) {

  if (!user || !currentQuizId) return;

  if (window.userData?.attempts?.[currentQuizId] === true) {
    alert("You already attempted this quiz.");
    return;
  }

  clearInterval(timerInterval);
let score = 0;
let attempted=0;
questions.forEach((q, index) => {

  if (Number(q.answer) === answers[index]) {
    score++;
  }

});

  




  await setDoc(doc(db,"results",`${user.uid}_${currentQuizId}`),{
  userId:user.uid,
  email:user.email,
  quizId:currentQuizId,
  score,
  total:questions.length,
  attempted,
  notAttempted:questions.length-attempted,
  submittedAt:new Date().toISOString()
});


  await updateDoc(doc(db, "users", user.uid), {
    [`attempts.${currentQuizId}`]: true,
    status: "submitted"
  });

  if (!window.userData.attempts) {
    window.userData.attempts = {};
  }

  window.userData.attempts[currentQuizId] = true;

  quiz.innerHTML = `
    <h2>Submitted Successfully</h2>
    <h3>Score: ${score}/${questions.length}</h3>
  `;

  setTimeout(() => {
    window.location.href = "index.html";
  }, 5000);
}



// ================= TAB SWITCH DETECTION =================
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    alert("Tab switching is not allowed!");
  }
});
