import { db, auth } from './firebase-config.js';
import {
    collection, addDoc, serverTimestamp, onSnapshot, deleteDoc, doc,
    query, orderBy, where, getDocs, getDoc, setDoc, updateDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import {
    onAuthStateChanged,
    signOut,
    createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
/* ----------------- CONFIG & ELEMENTS ------------------*/
// admin.js və ya staff-profile.js-in ən başındakı importların yanına əlavə et:
import { IMGBB_API_KEY } from './config.js';
const content = document.getElementById('admin-main-content');
const loader = document.getElementById('loader-overlay');
let isAdminVerified = false; // Admini bir dəfə yoxladıqdan sonra true olacaq

/* ----------------- AUTH & ROLE CHECK (GUARDS ADMIN PANEL) ------------------*/
onAuthStateChanged(auth, async (user) => {
    // 1. Əgər admin artıq təsdiqlənibsə və istifadəçi hələ də odursa, heç nə etmə
    if (isAdminVerified && auth.currentUser?.uid === user?.uid) return;

    if (!user) {
        window.location.href = "auth.htm";
        return;
    }

    try {
        const staffSnap = await getDoc(doc(db, "staff", user.uid));
        const crewSnap = await getDoc(doc(db, "crew", user.uid));

        const userData = staffSnap.exists() ? staffSnap.data() : (crewSnap.exists() ? crewSnap.data() : null);
        const isAdmin = userData?.accessLevel === "admin";

        if (isAdmin) {
            isAdminVerified = true; 
            if (content) content.style.display = 'block';
            if (loader) loader.style.display = 'none';

            if (!window.adminInitialized) {
                loadHeroSettings();
                initCrewList();
                initStaffList();
                window.adminInitialized = true;
            }
        } else {
            // Əgər admin deyilsə, profilə göndər
            // Amma yoxla ki, bəlkə hələ də adminin özüdür, sadəcə məlumatı bazadan gec gəlir?
            window.location.href = "../staff-profile.htm";
        }
    } catch (error) {
        console.error("Auth Guard Xətası:", error);
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
            if (heroTitleInput) heroTitleInput.value = data.title || "";
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
    heroFileInput.addEventListener('change', function () {
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
                if (imgData.success) imageUrl = imgData.data.url;
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
const crewSubmitBtn = document.getElementById('crew-submit-btn');
let editCrewId = null;

function initCrewList() {
    if (!crewTable) return;
    onSnapshot(query(collection(db, "crew"), orderBy("createdAt", "desc")), (snapshot) => {
        crewTable.innerHTML = "";
        snapshot.forEach((docSnap) => {
            const m = docSnap.data();
            const img = m.image || 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png';

            // Cədvəldə rol hissəsinin yanında admin/user statusunu da kiçik qeyd edirik
            const badge = m.accessLevel === 'admin' ? ' <span class="text-blue-400 text-[8px]">[ADMIN]</span>' : '';

            crewTable.innerHTML += `
    <tr class="group border-b border-white/5 hover:bg-white/[0.02]">
        <td class="py-4 flex items-center gap-3">
            <img src="${img}" class="w-10 h-10 object-cover rounded-full">
            <span class="text-[10px] text-white">${m.name}</span>
        </td>
        <td class="py-4 text-[9px] text-white/40 ">${m.role}${badge}</td>
        <td class="py-4 text-[9px] text-white/40">${m.idCode || '-'}</td>
        <td class="py-4 text-[9px] text-white/40">${m.email || '-'}</td>
        <td class="py-4 text-right space-x-2 pr-6">
            <button onclick="editCrewMember('${docSnap.id}')" class="text-[8px] text-blue-500">[ EDIT ]</button>
            <button onclick="deleteCrewMember('${docSnap.id}')" class="text-[8px] text-red-500">[ REMOVE ]</button>
        </td>
    </tr>`;
        });
    });
}

window.editCrewMember = async (id) => {
    const docSnap = await getDoc(doc(db, "crew", id));
    if (docSnap.exists()) {
        const d = docSnap.data();
        document.getElementById('crew-name').value = d.name;
        document.getElementById('crew-role').value = d.role;
        document.getElementById('crew-id').value = d.idCode || '';
        document.getElementById('crew-email').value = d.email || '';

        // Yenilik: Bazadakı accessLevel-i dropdown-da seçirik
        if (document.getElementById('crew-access-level')) {
            document.getElementById('crew-access-level').value = d.accessLevel || 'user';
        }

        editCrewId = id;
        crewSubmitBtn.innerText = "UPDATE CREW";
        crewForm.scrollIntoView({ behavior: 'smooth' });
    }
};

crewForm?.addEventListener('submit', async (e) => {
    e.preventDefault();

    // 1. Şəkil Məntiqi: Default şəkli təyin et
    const fileInput = document.getElementById('crew-img-file');
    const file = fileInput?.files[0];
    let imageUrl = "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"; 

    if (file) {
        const formData = new FormData();
        formData.append('image', file);
        
        try {
            const resp = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { 
                method: 'POST', 
                body: formData 
            });
            const imgData = await resp.json();
            if (imgData.success) {
                imageUrl = imgData.data.url;
            }
        } catch (error) {
            console.error("Crew şəkli yüklənə bilmədi, default şəkil saxlanıldı:", error);
        }
    }

    // 2. Form məlumatlarını al
    const name = document.getElementById('crew-name').value;
    const role = document.getElementById('crew-role').value;
    const idCode = document.getElementById('crew-id').value;
    const email = document.getElementById('crew-email').value;
    const password = document.getElementById('crew-password').value;
    const accessLevel = document.getElementById('crew-access-level')?.value || 'user';

    try {
        if (editCrewId) {
            // Məlumat yeniləmə: image sahəsini birbaşa imageUrl ilə yeniləyirik
            const data = { name, role, idCode, email, accessLevel, image: imageUrl, updatedAt: serverTimestamp() };
            await updateDoc(doc(db, "crew", editCrewId), data);

            editCrewId = null;
            crewSubmitBtn.innerText = "Add Crew";
            alert("Məlumatlar uğurla yeniləndi!");
        } else {
            // Yeni istifadəçi yaratma
            if (!password) return alert("Yeni crew üzvü üçün şifrə daxil edin!");

            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const uid = userCredential.user.uid;

            // Bazaya yazılacaq obyekt
            const data = {
                name, role, idCode, email, accessLevel,
                image: imageUrl, // Hər zaman dolu olacaq (yüklənən və ya default)
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };
            
            await setDoc(doc(db, "crew", uid), data);
            alert("Crew üzvü uğurla əlavə olundu!");
        }
        
        crewForm.reset();
        // Əgər siyahını yeniləyən funksiyan varsa, onu buraya əlavə et:
        if (typeof renderCrewList === 'function') renderCrewList();
        
    } catch (error) {
        console.error("Xəta:", error);
        alert("Xəta: " + error.message);
    }
});

window.deleteCrewMember = async (id) => {
    if (confirm("Bu işçini silmək istəyirsiniz?")) {
        try {
            // Firestore-dan silirik
            await deleteDoc(doc(db, "crew", id));
            alert("İşçi bazadan silindi. QEYD: İstifadəçinin giriş icazəsini (Auth) Firebase konsolundan da əllə silməyi unutmayın.");
        } catch (error) {
            alert("Silinmə xətası: " + error.message);
        }
    }
};
/* ----------------- The CREW END ------------------*/


/* ----------------- The STAFF START ------------------*/
const staffForm = document.getElementById('add-staff-form');
const staffTable = document.getElementById('staff-table-body');
const staffSubmitBtn = document.getElementById('staff-submit-btn');
let editStaffId = null;

function initStaffList() {
    if (!staffTable) return;
    onSnapshot(query(collection(db, "staff"), orderBy("createdAt", "desc")), (snapshot) => {
        staffTable.innerHTML = "";
        snapshot.forEach((docSnap) => {
            const m = docSnap.data();
            const img = m.image || 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png';

            // Cədvəldə rol hissəsinin yanında admin/user statusunu da kiçik qeyd edirik
            const badge = m.accessLevel === 'admin' ? ' <span class="text-blue-400 text-[8px]">[ADMIN]</span>' : '';

            staffTable.innerHTML += `
                <tr class="group border-b border-white/5 hover:bg-white/[0.02]">
                    <td class="py-4 flex items-center gap-3">
                        <img src="${img}" class="w-10 h-10 object-cover rounded-full">
                        <span class="text-[10px] text-white">${m.name}</span>
                    </td>
                    <td class="py-4 text-[9px] text-white/40 ">${m.role}${badge}</td>
                    <td class="py-4 text-[9px] text-white/40">${m.idCode || '-'}</td>
                    <td class="py-4 text-[9px] text-white/40">${m.email || '-'}</td>
                    <td class="py-4 text-right space-x-2 pr-6">
                        <button onclick="editStaffMember('${docSnap.id}')" class="text-[8px] text-blue-500">[ EDIT ]</button>
                        <button onclick="deleteStaffMember('${docSnap.id}')" class="text-[8px] text-red-500">[ REMOVE ]</button>
                    </td>
                </tr>`;
        });
    });
}

window.editStaffMember = async (id) => {
    const docSnap = await getDoc(doc(db, "staff", id));
    if (docSnap.exists()) {
        const d = docSnap.data();
        document.getElementById('staff-name').value = d.name;
        document.getElementById('staff-role').value = d.role;
        document.getElementById('staff-id').value = d.idCode || '';
        document.getElementById('staff-email').value = d.email || '';

        // Yenilik: Bazadakı accessLevel-i dropdown-da seçirik
        if (document.getElementById('staff-access-level')) {
            document.getElementById('staff-access-level').value = d.accessLevel || 'user';
        }

        editStaffId = id;
        staffSubmitBtn.innerText = "UPDATE STAFF";
        staffForm.scrollIntoView({ behavior: 'smooth' });
    }
};

staffForm?.addEventListener('submit', async (e) => {
    e.preventDefault();

    // 1. Şəkil Məntiqi: Əvvəlcə default şəkli təyin edirik
    const fileInput = document.getElementById('staff-img-file');
    const file = fileInput?.files[0];
    let imageUrl = "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"; 

    // Əgər istifadəçi şəkil seçibsə, ImgBB-yə yüklə
    if (file) {
        const formData = new FormData();
        formData.append('image', file);
        
        try {
            const resp = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { 
                method: 'POST', 
                body: formData 
            });
            const imgData = await resp.json();
            if (imgData.success) {
                imageUrl = imgData.data.url; // Şəkil uğurla yüklənərsə, linki yenilə
            }
        } catch (error) {
            console.error("Şəkil yüklənə bilmədi, default şəkil saxlanıldı:", error);
        }
    }

    // 2. Form məlumatlarını al
    const name = document.getElementById('staff-name').value;
    const role = document.getElementById('staff-role').value;
    const idCode = document.getElementById('staff-id').value;
    const email = document.getElementById('staff-email').value;
    const password = document.getElementById('staff-password').value;
    const accessLevel = document.getElementById('staff-access-level')?.value || 'user';

    try {
        if (editStaffId) {
            // Məlumat yeniləmə
            const data = { name, role, idCode, email, accessLevel, image: imageUrl, updatedAt: serverTimestamp() };
            await updateDoc(doc(db, "staff", editStaffId), data);
            
            editStaffId = null;
            staffSubmitBtn.innerText = "Add Staff";
            alert("Staff məlumatları uğurla yeniləndi!");
        } else {
            // Yeni istifadəçi yaratma
            if (!password) return alert("Yeni staff üçün şifrə tələb olunur!");

            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const uid = userCredential.user.uid;

            // Şəkil linki artıq 'imageUrl' dəyişənindədir (yüklənən və ya default)
            const data = {
                name, role, idCode, email, accessLevel,
                image: imageUrl, 
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };
            
            await setDoc(doc(db, "staff", uid), data);
            alert("Staff üzvü uğurla əlavə olundu!");
        }
        
        staffForm.reset();
        if (typeof renderStaffList === 'function') renderStaffList();
    } catch (error) {
        console.error("Firebase xətası:", error);
        alert("Xəta baş verdi: " + error.message);
    }
});
// Silinmə funksiyası
window.deleteStaffMember = async (id) => {
    if (confirm("Bu staff üzvünü silmək istəyirsiniz?")) {
        try {
            await deleteDoc(doc(db, "staff", id));
            alert("Staff bazadan silindi. QEYD: İstifadəçinin giriş icazəsini (Auth) Firebase konsolundan da əllə silməyi unutmayın.");
        } catch (error) {
            alert("Silinmə xətası: " + error.message);
        }
    }
};
/* ----------------- The STAFF END ------------------*/
/* ========================================================
// 🛡️ MOMENTS APP/REJ SYSTEM
// ======================================================== */
document.addEventListener("DOMContentLoaded", () => {
    let currentTab = "pending";

    const tabPendingBtn = document.getElementById("tabPendingBtn");
    const tabLiveBtn = document.getElementById("tabLiveBtn");

    renderAdminMoments();

    if (tabPendingBtn && tabLiveBtn) {
        tabPendingBtn.addEventListener("click", () => {
            currentTab = "pending";
            tabPendingBtn.className = "border border-white bg-white text-black text-[9px] font-bold tracking-widest px-4 py-2 uppercase transition cursor-pointer";
            tabLiveBtn.className = "border border-white/10 bg-transparent text-white/40 text-[9px] font-bold tracking-widest px-4 py-2 uppercase transition hover:border-white/20 cursor-pointer";
            renderAdminMoments();
        });

        tabLiveBtn.addEventListener("click", () => {
            currentTab = "approved";
            tabLiveBtn.className = "border border-white bg-white text-black text-[9px] font-bold tracking-widest px-4 py-2 uppercase transition cursor-pointer";
            tabPendingBtn.className = "border border-white/10 bg-transparent text-white/40 text-[9px] font-bold tracking-widest px-4 py-2 uppercase transition hover:border-white/20 cursor-pointer";
            renderAdminMoments();
        });
    }

    async function renderAdminMoments() {
        const listContainer = document.getElementById("adminMomentsList");
        const pendingCountEl = document.getElementById("pendingCount");
        const liveCountEl = document.getElementById("liveCount");

        if (!listContainer) return;

        listContainer.innerHTML = `
            <div class="col-span-full py-12 text-center text-white/40 text-[9px] tracking-widest uppercase font-light animate-pulse">
                CONNECTING TO GLOBAL DATABASE...
            </div>
        `;

        try {
            const allMomentsQuery = query(collection(db, "approved_moments"), orderBy("createdAt", "desc"));
            const allSnapshot = await getDocs(allMomentsQuery);

            let pendingCount = 0;
            let approvedCount = 0;
            let activeList = [];

            allSnapshot.forEach((docSnap) => {
                const data = docSnap.data();
                const item = { id: docSnap.id, ...data };

                if (data.status === "approved" || !data.status) {
                    approvedCount++;
                    if (currentTab === "approved") activeList.push(item);
                } else if (data.status === "pending") {
                    pendingCount++;
                    if (currentTab === "pending") activeList.push(item);
                }
            });

            if (pendingCountEl) pendingCountEl.textContent = pendingCount;
            if (liveCountEl) liveCountEl.textContent = approvedCount;

            if (activeList.length === 0) {
                listContainer.innerHTML = `
                    <div class="col-span-full py-12 text-center text-white/20 text-[9px] tracking-widest uppercase font-light">
                        No videos found in this section.
                    </div>
                `;
                return;
            }

            listContainer.innerHTML = "";

            activeList.forEach((video) => {
                let actionButtonsHTML = "";

                if (currentTab === "pending") {
                    actionButtonsHTML = `
                        <button data-id="${video.id}" class="approve-btn-trigger bg-white text-black text-[9px] font-bold tracking-widest py-3 uppercase transition hover:bg-zinc-200 cursor-pointer">
                            APPROVE
                        </button>
                        <button data-id="${video.id}" class="reject-btn-trigger bg-transparent border border-white/10 text-white/40 text-[9px] font-bold tracking-widest py-3 uppercase transition hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 cursor-pointer">
                            REJECT
                        </button>
                    `;
                } else {
                    actionButtonsHTML = `
                        <button data-id="${video.id}" class="remove-btn-trigger col-span-2 bg-transparent border border-red-500/30 text-red-400 text-[9px] font-bold tracking-widest py-3 uppercase transition hover:bg-red-500/10 hover:border-red-500 cursor-pointer">
                            REMOVE FROM LIVE FEED
                        </button>
                    `;
                }

                const cardHTML = `
                    <div class="border border-white/5 bg-white/[0.02] p-4 rounded-sm flex flex-col justify-between gap-4 transition-all hover:border-white/10 animate-fadeIn" data-doc-id="${video.id}">
                        <div class="relative aspect-[9/16] w-full max-h-[260px] bg-black/50 rounded-sm overflow-hidden border border-white/5">
                            <video src="${video.url}" class="w-full h-full object-cover" controls muted></video>
                        </div>
                        <div class="flex flex-col gap-1">
                            <span class="text-[8px] text-white/30 tracking-widest uppercase">Caption</span>
                            <p class="text-[10px] text-white/80 font-light tracking-wide leading-relaxed uppercase">${video.caption}</p>
                        </div>
                        <div class="grid grid-cols-2 gap-3 pt-2 border-t border-white/5">
                            ${actionButtonsHTML}
                        </div>
                    </div>
                `;
                listContainer.insertAdjacentHTML("beforeend", cardHTML);
            });

            initActionListeners();

        } catch (error) {
            console.error("Firestore-dan data oxunarkən xəta:", error);
            listContainer.innerHTML = `<div class="col-span-full py-12 text-center text-red-500 text-[9px]">ERROR LOADING DATABASE</div>`;
        }
    }

    function initActionListeners() {
        document.querySelectorAll(".approve-btn-trigger").forEach(btn => {
            btn.addEventListener("click", async (e) => {
                const docId = e.target.getAttribute("data-id");
                e.target.textContent = "WAIT...";
                e.target.disabled = true;

                try {
                    const docRef = doc(db, "approved_moments", docId);
                    await updateDoc(docRef, { status: "approved" });
                    alert("Moments video approved and added to the live feed! 🎉");
                    renderAdminMoments();
                } catch (err) {
                    alert("Approve xətası: " + err.message);
                    renderAdminMoments();
                }
            });
        });

        document.querySelectorAll(".reject-btn-trigger").forEach(btn => {
            btn.addEventListener("click", async (e) => {
                const docId = e.target.getAttribute("data-id");
                if (confirm("Are you sure you want to reject this video proposal?")) {
                    e.target.textContent = "REJECTING...";
                    e.target.disabled = true;

                    try {
                        await deleteDoc(doc(db, "approved_moments", docId));
                        renderAdminMoments();
                    } catch (err) {
                        alert("Reject xətası: " + err.message);
                        renderAdminMoments();
                    }
                }
            });
        });

        document.querySelectorAll(".remove-btn-trigger").forEach(btn => {
            btn.addEventListener("click", async (e) => {
                const docId = e.target.getAttribute("data-id");
                if (confirm("🚨 Diqqət! Bu video Moments platformasından tamamilə silinəcək. Əminsiniz?")) {
                    e.target.textContent = "REMOVING...";
                    e.target.disabled = true;

                    try {
                        await deleteDoc(doc(db, "approved_moments", docId));
                        alert("Video successfully removed from the live feed. 🗑️");
                        renderAdminMoments();
                    } catch (err) {
                        alert("Silmə xətası: " + err.message);
                        renderAdminMoments();
                    }
                }
            });
        });
    }
});

/* ----------------- Logout və Back Məntiqi ------------------*/
const logoutBtn = document.getElementById('logout-btn');
const backBtn = document.getElementById('back-btn');

if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        signOut(auth).then(() => {
            window.location.href = "auth.htm";
        }).catch((error) => {
            console.error("Logout xətası:", error);
        });
    });
}

if (backBtn) {
    backBtn.addEventListener('click', () => {
        window.location.href = "index.htm";
    });
}