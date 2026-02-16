import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCIhVp-q6jIkgP5Hid0CPVkHVx-2Vk9WUI",
  authDomain: "prakashsir-quiz-system.firebaseapp.com",
  projectId: "prakashsir-quiz-system"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// REGISTER (check active exam allowedEmails)
window.register = async function(){
  const emailVal = email.value.trim().toLowerCase();
  const passwordVal = password.value;

  if(!emailVal || !passwordVal){ msg.innerText="Enter email and password"; return; }

  const examSnap = await getDoc(doc(db,"examSessions","activeExam"));
  if(!examSnap.exists()){ msg.innerText="Registration closed"; return; }

  const allowed = examSnap.data().allowedEmails || [];
  if(!allowed.map(e=>e.toLowerCase()).includes(emailVal)){
    msg.innerText="You are not approved by admin yet."; return;
  }

  try{
    const cred = await createUserWithEmailAndPassword(auth,emailVal,passwordVal);
    await setDoc(doc(db,"users",cred.user.uid),{email:cred.user.email,role:"student",attempts:{},createdAt:new Date().toISOString()});
    await sendEmailVerification(cred.user);
    msg.innerText="Registered. Verify email then login.";
  }catch(e){ msg.innerText=e.message; }
};

// LOGIN
window.login = async function(){
  try{
    const emailVal=email.value.trim().toLowerCase();
    const passwordVal=password.value;
    const cred=await signInWithEmailAndPassword(auth,emailVal,passwordVal);
    const user=cred.user;

    const ref=doc(db,"users",user.uid);
    const snap=await getDoc(ref);
    if(!snap.exists()) await setDoc(ref,{email:user.email,role:(user.email==="prakash4snu@gmail.com")?"admin":"student",attempts:{}});

    const role=(await getDoc(ref)).data().role;
    if(role==="admin"){ window.location.href="admin.html"; return; }
    if(!user.emailVerified){ msg.innerText="Verify email first"; return; }
    window.location.href="student.html";
  }catch(e){ msg.innerText="Invalid login"; }
};

window.resetPassword=async()=>{ await sendPasswordResetEmail(auth,email.value.trim()); msg.innerText="Password reset email sent"; };
