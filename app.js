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
  setDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCIhVp-q6jIkgP5Hid0CPVkHVx-2Vk9WUI",
  authDomain: "prakashsir-quiz-system.firebaseapp.com",
  projectId: "prakashsir-quiz-system"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

window.register = async function(){

  const emailVal = email.value.trim().toLowerCase();
  const passwordVal = password.value;

  if(!emailVal || !passwordVal){
    msg.innerText = "Enter email and password.";
    return;
  }

  // 🔥 CHECK PERMANENT APPROVAL LIST
  const allowedSnap = await getDoc(doc(db,"allowedEmails",emailVal));

  if(!allowedSnap.exists()){
    msg.innerText = "You are not approved by admin yet.";
    return;
  }

  try{

    const userCred = await createUserWithEmailAndPassword(auth,emailVal,passwordVal);
    const user = userCred.user;

    await setDoc(doc(db,"users",user.uid),{
      email:user.email,
      role:"student",
      status:"registered",
      attempts:{},
      createdAt:new Date().toISOString()
    });

    await sendEmailVerification(user);

    msg.innerText="Registered successfully. Verify email then login.";

  }catch(e){
    msg.innerText=e.message;
  }
};



window.login = async function(){

  try{

    const email = document.getElementById("email").value.trim().toLowerCase();
    const password = document.getElementById("password").value;

    const userCred = await signInWithEmailAndPassword(auth,email,password);
    const user = userCred.user;

    const userRef = doc(db,"users",user.uid);
    const userDoc = await getDoc(userRef);

    if(!userDoc.exists()){
      await setDoc(userRef,{
        email:user.email,
        role:(user.email==="prakash4snu@gmail.com")?"admin":"student",
        status:"online",
        attempts:{}
      });
    }

    const role = (await getDoc(userRef)).data().role;

    // ================= ADMIN =================
    if(role==="admin"){
      window.location.href="admin.html";
      return;
    }

    // ================= STUDENT =================
    if(!user.emailVerified){
      msg.innerText="Verify email first.";
      return;
    }

    // ⭐⭐⭐ ADD VALIDATION HERE ⭐⭐⭐
    const examSnap = await getDoc(doc(db,"examSessions","activeExam"));

    if(!examSnap.exists()){
      msg.innerText="No exam available now.";
      return;
    }

    const allowedEmails = examSnap.data().allowedEmails || [];

    if(!allowedEmails.includes(user.email.toLowerCase())){
      msg.innerText="You are not allowed for this exam.";
      return;
    }

    // ⭐ ONLY AFTER PASSING VALIDATION
    window.location.href="student.html";

  }catch(e){
    msg.innerText="Invalid login.";
  }
};


window.resetPassword = async function(){
  await sendPasswordResetEmail(auth,email.value.trim());
  msg.innerText="Password reset email sent.";
};
