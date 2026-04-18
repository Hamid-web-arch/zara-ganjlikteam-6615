import { db, auth } from './firebase-config.js';
import { 
    collection, addDoc, serverTimestamp, onSnapshot, deleteDoc, doc, 
    query, orderBy, where, getDocs 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const IMGBB_API_KEY = 'b51274c83040a9aabda95abab390ad52';
const crewForm = document.getElementById('add-crew-form');
const crewTable = document.getElementById('crew-table-body');
const submitBtn = document.getElementById('submit-btn');

// 1. Giriş yoxlanışı
onAuthStateChanged(auth, (user) => {
    if (!user) window.location.href = "auth.html";
});

// 2. Real-time Siyahı (Görünmə problemini həll edən hissə)
const q = query(collection(db, "crew"), orderBy("createdAt", "desc"));
onSnapshot(q, (snapshot) => {
    if (!crewTable) return;
    crewTable.innerHTML = "";
    
    snapshot.forEach((memberDoc) => {
        const member = memberDoc.data();
        const memberId = memberDoc.id; // ID-ni buradan götürürük
        
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

// 3. Əlavə etmə (Dublikat yoxlaması ilə birgə)
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

        // Eyni ad varmı yoxla
        const qCheck = query(collection(db, "crew"), where("name", "==", nameInput.value.trim()));
        const querySnapshot = await getDocs(qCheck);

        if (!querySnapshot.empty) {
            alert("Bu adda üzv artıq mövcuddur!");
            return;
        }

        // Şəkli yüklə
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
        console.error(err);
        alert("Xəta baş verdi.");
    } finally {
        submitBtn.innerText = "Add to Crew";
        submitBtn.disabled = false;
    }
});

// 4. Silmə Funksiyası
window.deleteMember = async (id) => {
    if(confirm("Are you sure?")) {
        try {
            await deleteDoc(doc(db, "crew", id));
        } catch (error) {
            console.error("Silərkən xəta:", error);
        }
    }
};

// 5. Logout
document.getElementById('logout-btn').addEventListener('click', () => {
    signOut(auth).then(() => window.location.href = "auth.htm");
});