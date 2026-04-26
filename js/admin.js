import { db, auth } from './firebase-config.js';
import { 
    collection, addDoc, serverTimestamp, onSnapshot, deleteDoc, doc, 
    query, orderBy, where, getDocs, getDoc, setDoc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Global API KEY
const IMGBB_API_KEY = 'b51274c83040a9aabda95abab390ad52';

/* ----------------- AUTH CHECK & INITIALIZATION ------------------*/
// Səhifə yüklənən kimi ilk işimiz sessiyanı yoxlamaq olmalıdır
onAuthStateChanged(auth, (user) => {
    if (!user) {
        console.log("Giriş edilməyib, yönləndirilir...");
        window.location.href = "auth.htm";
    } else {
        console.log("Admin daxil olub:", user.email);
        // İstifadəçi daxil olubsa, dataları yükləyirik
        loadHeroSettings();
        initCrewList();
        initStaffList();
    }
});

/* ----------------- Hero Settings START ------------------*/
const heroForm = document.getElementById('hero-settings-form');
const heroTitleInput = document.getElementById('hero-title-input');
const heroFileInput = document.getElementById('hero-file-input');
const previewImg = document.getElementById('preview-img');
const previewBox = document.getElementById('preview-box');

async function loadHeroSettings() {
    try {
        const docRef = doc(db, "settings", "hero");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            if(heroTitleInput) heroTitleInput.value = data.title || "";
            if (data.image && previewImg) {
                previewImg.src = data.image;
                previewBox.classList.remove('hidden');
            }
        }
    } catch (error) {
        console.error("Hero məlumat gətirilərkən xəta:", error);
    }
}

// Şəkil önbaxış (Preview)
if (heroFileInput) {
    heroFileInput.addEventListener('change', function() {
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                previewImg.src = e.target.result;
                previewBox.classList.remove('hidden');
            };
            reader.readAsDataURL(file);
        }
    });
}

// Hero Update
if (heroForm) {
    heroForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const file = heroFileInput.files[0];
        const titleValue = heroTitleInput.value.trim();
        const saveBtn = e.submitter;

        try {
            const originalText = saveBtn.innerText;
            saveBtn.innerText = "UPDATING...";
            saveBtn.disabled = true;

            let imageUrl = previewImg.src;

            if (file) {
                const formData = new FormData();
                formData.append('image', file);
                const resp = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
                    method: 'POST',
                    body: formData
                });
                const imgData = await resp.json();
                if(imgData.success) imageUrl = imgData.data.url;
            }

            await setDoc(doc(db, "settings", "hero"), {
                title: titleValue || "Gandjlik 6615",
                image: imageUrl,
                updatedAt: serverTimestamp()
            });

            alert("Ana səhifə uğurla yeniləndi!");
            saveBtn.innerText = originalText;
        } catch (err) {
            console.error("Hero update xətası:", err);
            alert("Yenilənmə alınmadı.");
        } finally {
            saveBtn.disabled = false;
        }
    });
}

/* ----------------- The CREW START ------------------*/
const crewForm = document.getElementById('add-crew-form');
const crewTable = document.getElementById('crew-table-body');
const submitBtn = document.getElementById('submit-btn');

function initCrewList() {
    if (!crewTable) return;
    const q = query(collection(db, "crew"), orderBy("createdAt", "desc"));
    
    onSnapshot(q, (snapshot) => {
        crewTable.innerHTML = "";
        snapshot.forEach((memberDoc) => {
            const member = memberDoc.data();
            const memberId = memberDoc.id;
            
            crewTable.innerHTML += `
                <tr class="group transition-all hover:bg-white/[0.02]">
                    <td class="py-4 flex items-center gap-3">
                        <img src="${member.image}" class="w-10 h-10 object-cover rounded-sm grayscale group-hover:grayscale-0 transition-all">
                        <span class="text-[10px] uppercase tracking-widest text-white">${member.name}</span>
                    </td>
                    <td class="py-4 text-[9px] text-white/40 uppercase tracking-widest">${member.role}</td>
                    <td class="py-4 text-right">
                        <button onclick="deleteMember('${memberId}')" 
                            class="text-[8px] text-red-500/40 hover:text-red-500 uppercase tracking-widest transition">
                            [ Remove ]
                        </button>
                    </td>
                </tr>
            `;
        });
    });
}

// Crew Add
if (crewForm) {
    crewForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nameInput = document.getElementById('crew-name');
        const roleInput = document.getElementById('crew-role');
        const fileInput = document.getElementById('crew-img-file');
        const file = fileInput.files[0];

        if (!file) return alert("Zəhmət olmasa şəkil seçin.");

        try {
            submitBtn.innerText = "CHECKING...";
            submitBtn.disabled = true;

            const qCheck = query(collection(db, "crew"), where("name", "==", nameInput.value.trim()));
            const querySnapshot = await getDocs(qCheck);

            if (!querySnapshot.empty) {
                alert("Bu adda üzv artıq mövcuddur!");
                return;
            }

            submitBtn.innerText = "UPLOADING...";
            const formData = new FormData();
            formData.append('image', file);

            const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
                method: 'POST',
                body: formData
            });
            const data = await response.json();

            if (data.success) {
                await addDoc(collection(db, "crew"), {
                    name: nameInput.value.trim(),
                    role: roleInput.value,
                    image: data.data.url,
                    createdAt: serverTimestamp()
                });
                crewForm.reset();
                alert("Uğurla əlavə edildi!");
            }
        } catch (err) {
            console.error("Crew əlavə xətası:", err);
            alert("Xəta baş verdi.");
        } finally {
            submitBtn.innerText = "Add to Crew";
            submitBtn.disabled = false;
        }
    });
}

window.deleteMember = async (id) => {
    if(confirm("Are you sure?")) {
        try {
            await deleteDoc(doc(db, "crew", id));
        } catch (error) {
            console.error("Silərkən xəta:", error);
        }
    }
};
/* ----------------- The STAFF START ------------------*/
const staffForm = document.getElementById('add-staff-form');
const staffTable = document.getElementById('staff-table-body');
const staffSubmitBtn = document.getElementById('staff-submit-btn');
let editStaffId = null; // BU VACİBDİR: Redaktə rejimində olduğumuzu yadda saxlayır

// 1. Real-time Staff Siyahısı
function initStaffList() {
    if (!staffTable) return;
    const qStaff = query(collection(db, "staff"), orderBy("createdAt", "desc"));
    
    onSnapshot(qStaff, (snapshot) => {
        staffTable.innerHTML = "";
        snapshot.forEach((docSnap) => {
            const member = docSnap.data();
            const memberId = docSnap.id; // ID-ni buradan götürürük
            
            staffTable.innerHTML += `
                <tr class="group border-b border-white/5 hover:bg-white/[0.02]">
                    <td class="py-4 flex items-center gap-3">
                        <img src="${member.image}" class="w-10 h-10 object-cover rounded-full grayscale group-hover:grayscale-0 transition-all">
                        <span class="text-[10px] uppercase tracking-widest text-white">${member.name}</span>
                    </td>
                    <td class="py-4 text-[9px] text-white/40 uppercase tracking-widest">${member.role}</td>
                    <td class="py-4 text-right space-x-2">
                        <button onclick="editStaffMember('${memberId}')" 
                            class="text-[8px] text-blue-500/50 hover:text-blue-500 uppercase tracking-widest transition">
                            [ Edit ]
                        </button>
                        <button onclick="deleteStaffMember('${memberId}')" 
                            class="text-[8px] text-red-500/40 hover:text-red-500 uppercase tracking-widest transition">
                            [ Remove ]
                        </button>
                    </td>
                </tr>
            `;
        });
    });
}

// 2. REDAKTƏ FUNKSİYASI (Məlumatları inputlara doldurur)
window.editStaffMember = async (id) => {
    try {
        const { getDoc, doc: docRef } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
        const docSnap = await getDoc(docRef(db, "staff", id));

        if (docSnap.exists()) {
            const data = docSnap.data();
            document.getElementById('staff-name').value = data.name;
            document.getElementById('staff-role').value = data.role;
            
            editStaffId = id; // Redaktə rejiminə keçdik
            staffSubmitBtn.innerText = "UPDATE STAFF MEMBER";
            staffForm.scrollIntoView({ behavior: 'smooth' });
        }
    } catch (err) {
        console.error("Məlumat gətirilərkən xəta:", err);
    }
};

// 3. Staff Əlavə Etmə və ya Yeniləmə
if (staffForm) {
    staffForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const nameInput = document.getElementById('staff-name');
        const roleInput = document.getElementById('staff-role');
        const fileInput = document.getElementById('staff-img-file');
        const file = fileInput.files[0];
        
        const { updateDoc, addDoc, doc: fireDoc, collection: fireColl } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");

        try {
            staffSubmitBtn.innerText = "SAVING...";
            staffSubmitBtn.disabled = true;

            let imageUrl = null;

            // 1. Şəkil yükləmə məntiqi: Yalnız şəkil seçilibsə ImgBB-yə göndər
            if (file) {
                const formData = new FormData();
                formData.append('image', file);
                const resp = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
                    method: 'POST',
                    body: formData
                });
                const imgData = await resp.json();
                if (imgData.success) imageUrl = imgData.data.url;
            }

            // 2. Redaktə (UPDATE) Rejimi
            if (editStaffId) {
                const updateData = {
                    name: nameInput.value.trim(),
                    role: roleInput.value.trim(),
                    updatedAt: serverTimestamp()
                };
                
                // Əgər yeni şəkil YÜKLƏNİBSƏ, onu da update obyektinə əlavə et
                // Yüklənməyibsə, bazadakı köhnə şəkil olduğu kimi qalacaq
                if (imageUrl) {
                    updateData.image = imageUrl;
                }

                await updateDoc(fireDoc(db, "staff", editStaffId), updateData);
                alert("Məlumatlar uğurla yeniləndi!");
                
                // Formu sıfırla və rejimdən çıx
                editStaffId = null;
                staffSubmitBtn.innerText = "Add to Staff";
            } 
            // 3. Yeni Əlavə (ADD) Rejimi
            else {
                // Yeni işçi üçün şəkil mütləqdir
                if (!imageUrl) {
                    alert("Yeni işçi üçün şəkil mütləqdir!");
                    staffSubmitBtn.disabled = false;
                    staffSubmitBtn.innerText = "Add to Staff";
                    return;
                }

                await addDoc(fireColl(db, "staff"), {
                    name: nameInput.value.trim(),
                    role: roleInput.value.trim(),
                    image: imageUrl,
                    createdAt: serverTimestamp()
                });
                alert("Yeni işçi əlavə edildi!");
            }

            staffForm.reset();
        } catch (err) {
            console.error("Xəta baş verdi:", err);
            alert("Xəta baş verdi, konsola baxın.");
        } finally {
            staffSubmitBtn.disabled = false;
        }
    });
}

// 4. Staff Silmə Funksiyası
window.deleteStaffMember = async (id) => {
    if(confirm("Bu işçini silmək istədiyinizə əminsiniz?")) {
        try {
            const { deleteDoc, doc: docRef } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
            await deleteDoc(docRef(db, "staff", id));
        } catch (error) {
            console.error(error);
        }
    }
};
/* ----------------- The STAFF END ------------------*/

// Logout
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        signOut(auth).then(() => {
            window.location.href = "auth.htm";
        }).catch((error) => {
            console.error("Logout xətası:", error);
        });
    });
}