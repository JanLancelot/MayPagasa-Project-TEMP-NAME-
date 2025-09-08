import { initializeApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";


const firebaseConfig = {
  apiKey: "AIzaSyDI5dSLH_jZ0ISzGfeaZjEKOQgFiW12PVM",
  authDomain: "fullstack-sveltekit.firebaseapp.com",
  projectId: "fullstack-sveltekit",
  storageBucket: "fullstack-sveltekit.appspot.com",
  messagingSenderId: "129763204626",
  appId: "1:129763204626:web:859cc217279b9bf1b202cb"
};

const app: FirebaseApp = initializeApp(firebaseConfig);

export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);
