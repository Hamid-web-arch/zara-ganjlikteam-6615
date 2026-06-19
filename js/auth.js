import { auth, db } from './firebase-config.js';
import { 
    signInWithEmailAndPassword, 
    sendPasswordResetEmail,
    onAuthStateChanged,
    setPersistence,
    browserLocalPersistence,
    signOut
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

console.log("✅ Dual-Role Gateway System Active (Strict Path Routing)");

onAuthStateChanged(auth, async (user) => {
    // Əgər istifadəçi giriş edibsə və hələ də auth səhifəsindədirsə
    if (user && window.location.pathname.includes("auth.htm")) {
        try {
            // 1. Bazadan məlumatı çək
            const staffSnap = await getDoc(doc(db, "staff", user.uid));
            const crewSnap = await getDoc(doc(db, "crew", user.uid));
            
            const userData = staffSnap.exists() ? staffSnap.data() : (crewSnap.exists() ? crewSnap.data() : null);
            
            if (!userData) {
                await signOut(auth);
                alert("İstifadəçi məlumatları tapılmadı.");
                return;
            }

            const userAccessLevel = userData.accessLevel; // 'admin' və ya 'user'
            const selectedRole = localStorage.getItem("user_role");

            // 2. Yönləndirmə Məntiqi (DAHA ELASTİK)
            if (userAccessLevel === "admin") {
                // Admin həm admin panelə, həm də profilə girə bilər
                window.location.href = selectedRole === "admin" ? "admin.htm" : "../staff-profile.htm";
            } 
            else if (userAccessLevel === "user") {
                // User yalnız profilə girə bilər
                if (selectedRole === "admin") {
                    await signOut(auth);
                    alert("Sizin admin panelinə giriş icazəniz yoxdur!");
                } else {
                    window.location.href = "../staff-profile.htm";
                }
            }
        } catch (error) {
            console.error("Auth Xətası:", error);
            await signOut(auth);
        }
    }
});
// --- 🔐 GİRİŞ MƏNTİQİ ---
const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;
        const selectedRole = window.currentAuthRole; // Bu auth.htm-dəki seçimlə gəlir

        if (!selectedRole) {
            alert("Zəhmət olmasa giriş növünü seçin.");
            return;
        }

        try {
            // ROLU YADDA SAXLA
            localStorage.setItem("user_role", selectedRole);
            
            await setPersistence(auth, browserLocalPersistence);
            await signInWithEmailAndPassword(auth, email, password);
            // Yönləndirmə onAuthStateChanged tərəfindən həyata keçiriləcək
        } catch (error) {
            alert("Giriş rədd edildi: Məlumatlar yanlışdır.");
        }
    });
}

// --- 🔑 ŞİFRƏ SIFIRLAMA ---
const resetModal = document.getElementById('reset-modal');
const openResetBtn = document.getElementById('open-reset');
const closeResetBtn = document.getElementById('close-reset');
const sendResetBtn = document.getElementById('send-reset-btn');
const resetEmailInput = document.getElementById('reset-email-input');

if (openResetBtn && resetModal) {
    openResetBtn.addEventListener('click', (e) => {
        e.preventDefault();
        resetModal.classList.remove('hidden');
    });
}

if (closeResetBtn && resetModal) {
    closeResetBtn.addEventListener('click', () => resetModal.classList.add('hidden'));
}

if (sendResetBtn && resetModal) {
    sendResetBtn.addEventListener('click', async () => {
        const email = resetEmailInput.value.trim();
        if (!email) return alert("Email daxil edin.");
        try {
            await sendPasswordResetEmail(auth, email);
            alert("Link göndərildi.");
            resetModal.classList.add('hidden');
        } catch (error) {
            alert("Xəta: Email tapılmadı.");
        }
    });
}