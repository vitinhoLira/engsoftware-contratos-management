import { initializeApp } from "firebase/app";
import { config } from "dotenv"; config();
import { getDatabase } from "firebase/database";

const {apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId} = process.env;

const firebaseConfig = {
    apiKey:
    authDomain:,
    projectId: ,
    storageBucket:,
    messagingSenderId: ,
    appId: 
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);