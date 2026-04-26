import { auth } from './firebase-config.js';
import { 
    signInWithEmailAndPassword, 
    sendPasswordResetEmail,
    onAuthStateChanged,
    setPersistence,
    browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

console.log("✅ Manager Auth System Active");

// --- SESSİYA YOXLANILMASI (AUTO-LOGIN) ---
// Səhifə açılan kimi bu funksiya işə düşür
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("⚡ Aktiv sessiya tapıldı:", user.email);
        // Əgər istifadəçi artıq daxil olubsa və login səhifəsindədirsə, birbaşa adminə göndər
        if (window.location.pathname.includes("auth.htm")) {
            window.location.href = "admin.htm";
        }
    } else {
        console.log("📡 Aktiv sessiya yoxdur.");
    }
});

// --- LOGIN LOGIC ---
const loginForm = document.getElementById('login-form');

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        try {
            console.log("⏳ Verifying credentials...");
            
            // 1. Öncə sessiya növünü təyin edirik (Local = Brauzer yaddaşında qalsın)
            await setPersistence(auth, browserLocalPersistence);
            
            // 2. Sonra giriş edirik
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            
            console.log("✅ Welcome, Manager:", userCredential.user.email);
            window.location.href = "admin.htm"; 

        } catch (error) {
            console.error("❌ Access Denied:", error.code);
            alert("SİSTEMƏ GİRİŞ RƏDD EDİLDİ: Email və ya şifrə yanlışdır.");
        }
    });
}
// --- RESET PASSWORD LOGIC ---
const resetModal = document.getElementById('reset-modal');
const openResetBtn = document.getElementById('open-reset');
const closeResetBtn = document.getElementById('close-reset');
const sendResetBtn = document.getElementById('send-reset-btn');
const resetEmailInput = document.getElementById('reset-email-input');

// Modalı aç
if (openResetBtn) {
    openResetBtn.addEventListener('click', (e) => {
        e.preventDefault();
        resetModal.classList.remove('hidden');
    });
}

// Modalı bağla
if (closeResetBtn) {
    closeResetBtn.addEventListener('click', () => {
        resetModal.classList.add('hidden');
    });
}

// Şifrə sıfırlama linki göndər
if (sendResetBtn) {
    sendResetBtn.addEventListener('click', async () => {
        const email = resetEmailInput.value;

        if (!email) {
            alert("Zəhmət olmasa email daxil edin.");
            return;
        }

        try {
            console.log("⏳ Sending reset link...");
            await sendPasswordResetEmail(auth, email);
            alert("Şifrə yeniləmə linki emailinizə göndərildi. Gələnlər və ya Spam qutusunu yoxlayın.");
            resetModal.classList.add('hidden');
            resetEmailInput.value = ""; // Inputu təmizlə
        } catch (error) {
            console.error("❌ Reset Error:", error.code);
            alert("Xəta: Email tapılmadı və ya sistem problemi.");
        }
    });
}

// Modal kənarına klikləyəndə bağlanması üçün (opsional)
window.addEventListener('click', (e) => {
    if (e.target === resetModal) {
        resetModal.classList.add('hidden');
    }
});