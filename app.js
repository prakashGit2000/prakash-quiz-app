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



// ================= REGISTER =================
window.register = async function(){

  const email = document.getElementById("email").value.trim().toLowerCase();
  const password = document.getElementById("password").value;

  if(!email || !password){
    msg.innerText="Enter email & password";
    return;
  }

  try{

    const userCred = await createUserWithEmailAndPassword(auth,email,password);
    const user = userCred.user;

    // create user profile
    await setDoc(doc(db,"users",user.uid),{
      email:user.email,
      role:"student",
      status:"registered",
      attempts:{},
      createdAt:new Date().toISOString()
    });

    await sendEmailVerification(user);

    msg.innerText="Registered successfully. Verify email before login.";

  }catch(e){
    msg.innerText=e.message;
  }
};



// ================= LOGIN =================
window.login = async function(){

  try{

    const email = document.getElementById("email").value.trim().toLowerCase();
    const password = document.getElementById("password").value;

    const userCred = await signInWithEmailAndPassword(auth,email,password);
    const user = userCred.user;

    const userRef = doc(db,"users",user.uid);
    const userDoc = await getDoc(userRef);

    // if admin login
    if(email==="prakash4snu@gmail.com"){
      await setDoc(userRef,{
        email:user.email,
        role:"admin",
        status:"online"
      },{merge:true});

      window.location.href="admin.html";
      return;
    }

    // student login
    if(!user.emailVerified){
      msg.innerText="Verify your email first.";
      return;
    }

    // ensure user profile exists
    if(!userDoc.exists()){
      await setDoc(userRef,{
        email:user.email,
        role:"student",
        status:"online",
        attempts:{}
      });
    }else{
      await setDoc(userRef,{status:"online"},{merge:true});
    }

    window.location.href="student.html";

  }catch(e){
    msg.innerText="Invalid email or password.";
  }
};



// ================= RESET PASSWORD =================
window.resetPassword = async function(){
  await sendPasswordResetEmail(auth,document.getElementById("email").value.trim());
  msg.innerText="Password reset email sent.";
};
