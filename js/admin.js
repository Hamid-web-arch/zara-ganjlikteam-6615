import { db, auth } from './firebase-config.js';
import { 
    collection, addDoc, serverTimestamp, onSnapshot, deleteDoc, doc, 
    query, orderBy, where, getDocs, getDoc, setDoc, updateDoc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
/* ----------------- CONFIG & ELEMENTS ------------------*/
const IMGBB_API_KEY = 'b51274c83040a9aabda95abab390ad52';
const content = document.getElementById('admin-main-content');
const loader = document.getElementById('loader-overlay');

onAuthStateChanged(auth, (user) => {
    if (user) {
        // Giriş uğurludursa
        if (content) content.style.display = 'block';
        if (loader) loader.style.display = 'none';
    } else {
        // Giriş yoxdursa, birbaşa auth.htm-ə tulla
        window.location.href = "../auth.htm";
    }
});

/* ----------------- AUTH CHECK ------------------*/
// Bütün yoxlamaları tək bir blokda birləşdiririk
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("Admin daxil olub:", user.email);
        
        // 1. Ekranı göstər
        if (content) content.style.display = 'block';
        if (loader) loader.style.display = 'none';

        // 2. Dataları yüklə (Bu funksiyaların aşağıda yazıldığından əmin ol)
        if (typeof loadHeroSettings === "function") loadHeroSettings();
        if (typeof initCrewList === "function") initCrewList();
        if (typeof initStaffList === "function") initStaffList();
        
    } else {
        console.log("Giriş edilməyib, yönləndirilir...");
        window.location.href = "auth.htm";
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
const crewSubmitBtn = document.getElementById('crew-submit-btn');
let editCrewId = null; // Birebir eyni məntiq: Redaktə rejimini yadda saxlayır

// 1. Real-time Crew Siyahısı
function initCrewList() {
    if (!crewTable) return;
    const qCrew = query(collection(db, "crew"), orderBy("createdAt", "desc"));
    
    onSnapshot(qCrew, (snapshot) => {
        crewTable.innerHTML = "";
        snapshot.forEach((docSnap) => {
            const member = docSnap.data();
            const memberId = docSnap.id; 
            
            crewTable.innerHTML += `
                <tr class="group border-b border-white/5 hover:bg-white/[0.02]">
                    <td class="py-4 flex items-center gap-3">
                        <img src="${member.image}" class="w-10 h-10 object-cover rounded-full grayscale group-hover:grayscale-0 transition-all">
                        <span class="text-[10px] uppercase tracking-widest text-white">${member.name}</span>
                    </td>
                    <td class="py-4 text-[9px] text-white/40 uppercase tracking-widest">${member.role}</td>
                    <td class="py-4 text-right space-x-2">
                        <button onclick="editCrewMember('${memberId}')" 
                            class="text-[8px] text-blue-500/50 hover:text-blue-500 uppercase tracking-widest transition">
                            [ Edit ]
                        </button>
                        <button onclick="deleteCrewMember('${memberId}')" 
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
window.editCrewMember = async (id) => {
    try {
        const { getDoc, doc: docRef } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
        const docSnap = await getDoc(docRef(db, "crew", id));

        if (docSnap.exists()) {
            const data = docSnap.data();
            document.getElementById('crew-name').value = data.name;
            document.getElementById('crew-role').value = data.role;
            
            editCrewId = id; // Redaktə rejiminə keçdik
            if (crewSubmitBtn) crewSubmitBtn.innerText = "UPDATE CREW MEMBER";
            if (crewForm) crewForm.scrollIntoView({ behavior: 'smooth' });
        }
    } catch (err) {
        console.error("Məlumat gətirilərkən xəta:", err);
    }
};

// 3. Crew Əlavə Etmə və ya Yeniləmə
if (crewForm) {
    crewForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const nameInput = document.getElementById('crew-name');
        const roleInput = document.getElementById('crew-role');
        const fileInput = document.getElementById('crew-img-file');
        const file = fileInput.files[0];
        
        const { updateDoc, addDoc, doc: fireDoc, collection: fireColl } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");

        try {
            if (crewSubmitBtn) {
                crewSubmitBtn.innerText = "SAVING...";
                crewSubmitBtn.disabled = true;
            }

            let imageUrl = null;

            // Şəkil yükləmə məntiqi: Yalnız şəkil seçilibsə ImgBB-yə göndər
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

            // --- REDAKTƏ (UPDATE) REJİMİ ---
            if (editCrewId) {
                const updateData = {
                    name: nameInput.value.trim(),
                    role: roleInput.value.trim(),
                    updatedAt: serverTimestamp()
                };
                
                // Əgər yeni şəkil YÜKLƏNİBSƏ, onu da obyektə əlavə et
                // Yüklənməyibsə, bazadakı köhnə şəkil olduğu kimi qalacaq
                if (imageUrl) {
                    updateData.image = imageUrl;
                }

                await updateDoc(fireDoc(db, "crew", editCrewId), updateData);
                alert("Məlumatlar uğurla yeniləndi!");
                
                // Formu sıfırla və rejimdən çıx
                editCrewId = null;
                if (crewSubmitBtn) crewSubmitBtn.innerText = "Add to Crew";
            } 
            // --- YENİ ƏLAVƏ (ADD) REJİMİ ---
            else {
                // Eyni adda üzvün olub-olmadığını yoxlayırıq (Unikal olması üçün)
                const qCheck = query(fireColl(db, "crew"), where("name", "==", nameInput.value.trim()));
                const querySnapshot = await getDocs(qCheck);

                if (!querySnapshot.empty) {
                    alert("Bu adda üzv artıq mövcuddur!");
                    if (crewSubmitBtn) {
                        crewSubmitBtn.innerText = "Add to Crew";
                        crewSubmitBtn.disabled = false;
                    }
                    return;
                }

                if (!imageUrl) {
                    imageUrl = "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"; 
                }

                await addDoc(fireColl(db, "crew"), {
                    name: nameInput.value.trim(),
                    role: roleInput.value.trim(),
                    image: imageUrl,
                    createdAt: serverTimestamp()
                });
                alert("Yeni Crew üzvü əlavə edildi!");
            }

            crewForm.reset();
        } catch (err) {
            console.error("Xəta baş verdi:", err);
            alert("Xəta baş verdi, konsola baxın.");
        } finally {
            if (crewSubmitBtn) {
                crewSubmitBtn.disabled = false;
                if (!editCrewId) crewSubmitBtn.innerText = "Add to Crew";
            }
        }
    });
}

// 4. Crew Silmə Funksiyası
window.deleteCrewMember = async (id) => {
    if(confirm("Bu Crew üzvünü silmək istədiyinizə əminsiniz?")) {
        try {
            const { deleteDoc, doc: docRef } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
            await deleteDoc(docRef(db, "crew", id));
            
            // Əgər silinən üzv hal-hazırda redaktə olunurdusa, rejimi sıfırla
            if (editCrewId === id) {
                editCrewId = null;
                if (crewSubmitBtn) crewSubmitBtn.innerText = "Add to Crew";
                if (crewForm) crewForm.reset();
            }
        } catch (error) {
            console.error(error);
        }
    }
};
/* ----------------- The CREW END ------------------*/
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
            const memberId = docSnap.id; 
            
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
                    imageUrl = "https://cdn-icons-png.flaticon.com/512/149/149071.png"; 
                    // İstəsən yuxarıdakı linki istənilən minimalist bir boş profil şəkli linki ilə əvəzləyə bilərsən
                }
                // if (!imageUrl) {
                //     alert("Yeni işçi üçün şəkil mütləqdir!");
                //     staffSubmitBtn.disabled = false;
                //     staffSubmitBtn.innerText = "Add to Staff";
                //     return;
                // }

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


// ========================================================
// 🛡️ ADMIN.JS - GLOBAL FIRESTORE MOMENTS APP/REJ SYSTEM
// ========================================================
// ⚠️ TƏKRAR IMPORTLAR VƏ INITIALIZEAPP BURADAN SİLİNDİ! 
// ⚠️ SİSTEM ARTIQ FAZLANIN ƏN YUXARISINDAKI 'db' INSTANSIYASI İLƏ İŞLƏYİR.

document.addEventListener("DOMContentLoaded", () => {
    // Cari olaraq hansı tabda olduğumuzu izləmək üçün ("pending" və ya "approved")
    let currentTab = "pending";

    // Tab elementlərini tapırıq
    const tabPendingBtn = document.getElementById("tabPendingBtn");
    const tabLiveBtn = document.getElementById("tabLiveBtn");

    // Səhifə yüklənəndə ilk görünüşü render edirik
    renderAdminMoments();

    // TAB KLİK MEXANİZMLƏRİ
    if (tabPendingBtn && tabLiveBtn) {
        tabPendingBtn.addEventListener("click", () => {
            currentTab = "pending";
            // Vizual olaraq aktiv tabı rəngləmək
            tabPendingBtn.className = "border border-white bg-white text-black text-[9px] font-bold tracking-widest px-4 py-2 uppercase transition cursor-pointer";
            tabLiveBtn.className = "border border-white/10 bg-transparent text-white/40 text-[9px] font-bold tracking-widest px-4 py-2 uppercase transition hover:border-white/20 cursor-pointer";
            renderAdminMoments();
        });

        tabLiveBtn.addEventListener("click", () => {
            currentTab = "approved"; // Qlobal bazada canlı videolar "approved" adlanır
            // Vizual olaraq aktiv tabı rəngləmək
            tabLiveBtn.className = "border border-white bg-white text-black text-[9px] font-bold tracking-widest px-4 py-2 uppercase transition cursor-pointer";
            tabPendingBtn.className = "border border-white/10 bg-transparent text-white/40 text-[9px] font-bold tracking-widest px-4 py-2 uppercase transition hover:border-white/20 cursor-pointer";
            renderAdminMoments();
        });
    }

    // ƏSAS RENDER FUNKSİYASI (FIRESTORE-DAN REAL DATA ÇƏKİR)
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
            // 1. Sayğaclar üçün bütün videoları çəkirik (Statusuna görə filterləmək üçün)
            const allMomentsQuery = query(collection(db, "approved_moments"), orderBy("createdAt", "desc"));
            const allSnapshot = await getDocs(allMomentsQuery);
            
            let pendingCount = 0;
            let approvedCount = 0;
            let activeList = [];

            allSnapshot.forEach((docSnap) => {
                const data = docSnap.data();
                const item = { id: docSnap.id, ...data };

                // Status sayğacı
                if (data.status === "approved" || !data.status) { 
                    approvedCount++;
                    if (currentTab === "approved") activeList.push(item);
                } else if (data.status === "pending") {
                    pendingCount++;
                    if (currentTab === "pending") activeList.push(item);
                }
            });

            // Sayğacları ekranda yeniləyirik
            if (pendingCountEl) pendingCountEl.textContent = pendingCount;
            if (liveCountEl) liveCountEl.textContent = approvedCount;

            // Əgər aktiv siyahı boşdursa
            if (activeList.length === 0) {
                listContainer.innerHTML = `
                    <div class="col-span-full py-12 text-center text-white/20 text-[9px] tracking-widest uppercase font-light">
                        No videos found in this section.
                    </div>
                `;
                return;
            }

            // Konteyneri təmizləyib videoları düzürük
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

            // Düymələrə klik hadisələrini təyin edirik
            initActionListeners();

        } catch (error) {
            console.error("Firestore-dan data oxunarkən xəta:", error);
            listContainer.innerHTML = `<div class="col-span-full py-12 text-center text-red-500 text-[9px]">ERROR LOADING DATABASE</div>`;
        }
    }

    // DÜYMƏLƏRİN DİNAMİK İŞƏ SALINMASI
    function initActionListeners() {
        // Təsdiqləmə (Approve)
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

        // Rədd etmə (Reject)
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

        // Canlıdan Silmə (Remove Live)
        document.querySelectorAll(".remove-btn-trigger").forEach(btn => {
            btn.addEventListener("click", async (e) => {
                const docId = e.target.getAttribute("data-id");
                if (confirm("🚨 Diqqət! Bu video Moments platformasından (canlı yayından) tamamilə silinəcək. Əminsiniz?")) {
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