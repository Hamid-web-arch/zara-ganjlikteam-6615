import { auth, db } from './firebase-config.js';
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged, sendPasswordResetEmail, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
const profileImg = document.getElementById('profile-img');
const uploadInput = document.getElementById('upload-img');
const passwordBtn = document.getElementById('change-password-btn');
// admin.js və ya staff-profile.js-in ən başındakı importların yanına əlavə et:
import { IMGBB_API_KEY } from './config.js';

// 1. İstifadəçi məlumatlarını həm staff, həm də crew kolleksiyasında axtarırıq
onAuthStateChanged(auth, async (user) => {
    if (user) {
        let docSnap;
        let collectionName = "";

        // Əvvəlcə 'staff' kolleksiyasında yoxlayırıq
        let docRef = doc(db, "staff", user.uid);
        docSnap = await getDoc(docRef);
        collectionName = "staff";

        // Əgər staff-da yoxdursa, 'crew' kolleksiyasında axtarırıq
        if (!docSnap.exists()) {
            docRef = doc(db, "crew", user.uid);
            docSnap = await getDoc(docRef);
            collectionName = "crew";
        }

        if (docSnap.exists()) {
            const data = docSnap.data();
            document.getElementById('profile-name').innerText = data.name || 'N/A';
            document.getElementById('profile-role').innerText = data.role || 'N/A';
            document.getElementById('profile-id').innerText = data.idCode || '-';
            document.getElementById('profile-email').innerText = data.email || user.email;
            if (data.image) profileImg.src = data.image;

            // Şəkil yükləmək üçün istifadə edəcəyimiz kolleksiya adını yadda saxlayırıq
            window.activeCollection = collectionName;
        }
    } else {
        window.location.href = "auth.htm";
    }
});


// 2. Şəkil yükləmə funksiyası (Daha detallı xəta yoxlaması ilə)
uploadInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // 1. Kolleksiyanın hazır olub olmadığını yoxlayaq
    if (!window.activeCollection) {
        alert("Sistem hələ hazır deyil, bir az gözləyin...");
        return;
    }

    alert("Şəkil yüklənir, zəhmət olmasa gözləyin...");

    const formData = new FormData();
    formData.append('image', file);

    try {
        console.log("Sorğu göndərilir...");

        const resp = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
            method: 'POST',
            body: formData
        });

        const result = await resp.json();
        console.log("ImgBB cavabı:", result); // !!! Konsola bax: bura nə yazır?

        if (result.success) {
            const imageUrl = result.data.url;
            const user = auth.currentUser;

            // Şəkil linkini bazaya yazıb-yazmadığını yoxlayaq
            console.log("Bazaya göndərilən URL:", imageUrl);

            await updateDoc(doc(db, window.activeCollection, user.uid), { image: imageUrl });

            profileImg.src = imageUrl;
            alert("Şəkil uğurla yeniləndi!");
        } else {
            // ImgBB-dən gələn konkret xətanı göstər
            alert("ImgBB xətası: " + (result.error ? result.error.message : "Naməlum xəta"));
        }
    } catch (error) {
        console.error("Xəta detalları:", error);
        alert("Şəkil yüklənmədi. Konsola (F12) baxın.");
    }
});
// 3. Şifrə sıfırlama
if (passwordBtn) {
    passwordBtn.addEventListener('click', async () => {
        const user = auth.currentUser;
        if (user) {
            await sendPasswordResetEmail(auth, user.email);
            alert("Şifrəni dəyişmək üçün email ünvanınıza link göndərildi.");
        }
    });
}

// Logout funksiyası
const logoutBtn = document.getElementById('logout-btn');

if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        try {
            await signOut(auth); // Firebase-dən çıxış edir
            window.location.href = "auth.htm"; // Giriş səhifəsinə göndərir
        } catch (error) {
            console.error("Çıxış zamanı xəta:", error);
            alert("Çıxış edilərkən xəta baş verdi.");
        }
    });
}