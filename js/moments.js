// ========================================================
// 🌍 MOMENTS.JS - GLOBAL FIRESTORE & CLOUDINARY MANAGEMENT
// ========================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Sənin Firebase konfiqurasiyan
const firebaseConfig = {
    apiKey: "AIzaSyAIxHLeMpePzJKCnoD2GDDnsgaQxTgGhPk",
    authDomain: "zara-ganjlik-6615.firebaseapp.com",
    projectId: "zara-ganjlik-6615",
    storageBucket: "zara-ganjlik-6615.firebasestorage.app",
    messagingSenderId: "1083900874117",
    appId: "1:1083900874117:web:ea51e535e698a2f338c8ec",
    measurementId: "G-YE37TH5ZK1"
};

// Bu fayla özəl Firebase instansiyası
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

document.addEventListener("DOMContentLoaded", () => {
    const exploreMomentsBtn = document.getElementById("exploreMomentsBtn");
    const spaRoot = document.getElementById("spa-moments-root");
    let globalVideoObserver = null;

    if (exploreMomentsBtn) {
        exploreMomentsBtn.addEventListener("click", (e) => {
            e.preventDefault();
            
            // Əgər kontent artıq yüklənibsə yenidən fetch etmə, sadəcə aç
            if (spaRoot.innerHTML.trim() !== "") {
                openMomentsView();
                loadApprovedVideos(); 
                return;
            }

            // SPA (Single Page Application) məntiqi ilə moments.htm yüklənir
            fetch("moments.htm")
                .then(response => {
                    if (!response.ok) throw new Error("moments.htm tapılmadı!");
                    return response.text();
                })
                .then(htmlContent => {
                    spaRoot.innerHTML = htmlContent;
                    openMomentsView();
                    loadApprovedVideos(); 
                    setTimeout(initVideoAutoplay, 200); 
                })
                .catch(err => console.error("SPA Yükləmə xətası:", err));
        });
    }

    function openMomentsView() {
        const platform = document.getElementById("momentsPlatform");
        if (platform) {
            platform.classList.remove("hidden");
            document.body.style.overflow = "hidden"; // Arxadakı səhifə skrol olmasın
        }
    }

    // --- FIRESTORE-DAN YALNIZ TƏSDİQLƏNMİŞ (APPROVED) VİDEOLARI OXUMAQ ---
// --- FIRESTORE-DAN YALNIZ TƏSDİQLƏNMİŞ (APPROVED) VİDEOLARI OXUMAQ ---
    async function loadApprovedVideos() {
        const container = document.querySelector(".zara-container");
        if (!container) return;

        // Köhnə kartları təmizləyirik
        document.querySelectorAll(".zara-card.dynamic-card").forEach(el => el.remove());

        try {
            // 🔥 DÜZƏLİŞ: İndex xətasının qarşısını almaq üçün sadəcə statusa görə filter edirik
            // Videolar onsuz da JS daxilində tarixinə görə sıralanacaq
            const q = query(
                collection(db, "approved_moments"), 
                where("status", "==", "approved")
            );
            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
                const noVideoHTML = `
                    <div class="zara-card dynamic-card w-full h-full flex items-center justify-center bg-black text-white">
                        <p class="text-[10px] tracking-widest font-light text-zinc-500 uppercase">No moments shared yet.</p>
                    </div>
                `;
                container.insertAdjacentHTML("beforeend", noVideoHTML);
                return;
            }

            // Gələn məlumatları massivə yığıb tarixinə görə azalan sıra ilə düzürük
            const videoList = [];
            querySnapshot.forEach((doc) => {
                videoList.push(doc.data());
            });
            videoList.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

            // Videoları ekrana render edirik
            videoList.forEach((video) => {
                const cardHTML = `
                    <div class="zara-card dynamic-card w-full h-full relative bg-black md:grid md:grid-cols-12 md:pt-20 animate-fadeIn">
                        <div class="w-full h-full md:col-span-7 relative bg-zinc-950 flex items-center justify-center overflow-hidden group/player">
                            <video class="w-full h-full object-cover md:object-contain cursor-pointer" loop playsinline preload="auto" src="${video.url}"></video>
                            <div class="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                                <div class="play-overlay-icon bg-black/40 text-white w-14 h-14 rounded-full flex items-center justify-center opacity-0 scale-75 transition-all duration-300">
                                    <i class="fa-solid fa-play text-xl ml-1"></i>
                                </div>
                            </div>
                            <div class="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col gap-2 z-40 opacity-0 group-hover/player:opacity-100 md:group-hover/player:opacity-100 transition-opacity duration-300 select-none">
                                <div class="w-full h-1.5 bg-white/20 rounded-full cursor-pointer relative progress-container group/timeline">
                                    <div class="h-full bg-white rounded-full w-0 progress-bar relative"></div>
                                </div>
                                <div class="flex items-center justify-between text-white text-[10px] tracking-widest font-light mt-1">
                                    <button class="control-play-btn cursor-pointer transition hover:text-zinc-300 px-1 text-xs">
                                        <i class="fa-solid fa-play"></i>
                                    </button>
                                    <div class="time-display font-mono">
                                        <span class="current-time">00:00</span> / <span class="duration-time">00:00</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="absolute left-0 bottom-0 w-full p-6 pb-12 z-40 md:relative md:p-12 md:col-span-5 md:h-full md:bg-black flex flex-col justify-end md:justify-center gap-6 text-white">
                            <div class="flex items-center gap-4">
                                <div class="w-12 h-12 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700 flex items-center justify-center font-black text-xs">ST</div>
                                <div class="flex flex-col">
                                    <span class="text-sm font-bold tracking-widest uppercase">Staff Member</span>
                                    <span class="text-[10px] text-zinc-400 font-light tracking-wide uppercase">Zara Ganjlik</span>
                                </div>
                            </div>
                            <p class="text-xs font-light tracking-wide leading-relaxed text-zinc-300 max-w-md uppercase">${video.caption}</p>
                            <div class="absolute right-6 bottom-36 md:relative md:right-0 md:bottom-0 flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8 mt-2">
                                <button class="like-btn flex flex-col md:flex-row items-center gap-1 md:gap-2 cursor-pointer">
                                    <i class="fa-regular fa-heart text-xl"></i>
                                    <span class="text-[10px] font-light tracking-widest text-zinc-400">0 BEĞENİ</span>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                container.insertAdjacentHTML("beforeend", cardHTML);
            });

            initVideoAutoplay();

        } catch (error) {
            console.error("Moments məlumatları çəkilərkən xəta:", error);
        }
    }

    // --- CLOUDINARY YÜKLƏMƏ VƏ FIRESTORE-A PENDING OLARAQ YAZMA MƏNTİQİ ---
    document.addEventListener("submit", async function(e) {
        if (e.target && e.target.id === "uploadForm") {
            e.preventDefault();
            
            const videoInput = document.getElementById("videoInput");
            const captionInput = document.getElementById("captionInput");
            const submitBtn = e.target.querySelector("button[type='submit']");
            
            if (!videoInput || videoInput.files.length === 0) {
                alert("Zəhmət olmasa video seçin!");
                return;
            }
            
            const file = videoInput.files[0];
            submitBtn.textContent = "UPLOADING TO BULUD...";
            submitBtn.disabled = true;
            
            const CLOUD_NAME = "drkjgwlyk"; 
            const UPLOAD_PRESET = "lkb769t5"; 
            const formData = new FormData();
            formData.append("file", file);
            formData.append("upload_preset", UPLOAD_PRESET);
            
            try {
                // 1. Böyük video faylını Cloudinary buluduna yükləyirik
                const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`, {
                    method: "POST",
                    body: formData
                });
                const data = await res.json();
                
                // 2. Alınan video linkini Firestore-a "pending" statusu ilə qeyd edirik
                await addDoc(collection(db, "approved_moments"), {
                    url: data.secure_url,
                    caption: captionInput ? captionInput.value.trim() : "Zara Ganjlik Moment",
                    status: "pending", // 🚀 Menecer təsdiqindən keçmək üçün ilk dəfə pending gedir
                    createdAt: Date.now()
                });
                
                const modal = document.getElementById("uploadModal");
                if (modal) modal.style.setProperty("display", "none", "important");
                e.target.reset();
                
                alert("Müraciətiniz uğurla göndərildi! Menecer təsdiqlədikdən sonra canlı yayında görünəcək. 🛡️");
                loadApprovedVideos();

            } catch (err) {
                alert("Xəta baş verdi: " + err.message);
            } finally {
                submitBtn.textContent = "SUBMIT";
                submitBtn.disabled = false;
            }
        }
    });

    // --- VİDEO SEÇİLƏNDƏ MODALDA ADININ GÖRÜNMƏSİ ---
    document.addEventListener("change", (e) => {
        if (e.target && e.target.id === "videoInput") {
            const fileSelectedName = document.getElementById("fileSelectedName");
            const uploadPlaceholder = document.getElementById("uploadPlaceholder");
            const fileNameText = document.getElementById("fileNameText");

            if (e.target.files && e.target.files.length > 0) {
                const file = e.target.files[0];
                if (fileNameText) fileNameText.textContent = file.name;
                if (fileSelectedName) fileSelectedName.classList.remove("hidden");
                if (uploadPlaceholder) uploadPlaceholder.classList.add("hidden");
            }
        }
    });
   // --- QLOBLAL KLİK VƏ PLAYER KONTROLLARI ---
    document.addEventListener("click", (e) => {
        if (e.target.closest("#openUploadBtn")) {
            e.preventDefault();
            const modal = document.getElementById("uploadModal");
            if (modal) modal.style.setProperty("display", "flex", "important");
        }
        if (e.target.closest("#closeUploadBtn") || e.target.id === "modalOverlay") {
            e.preventDefault();
            const modal = document.getElementById("uploadModal");
            if (modal) modal.style.setProperty("display", "none", "important");
        }
        if (e.target.closest("#closePlatformBtn")) {
            e.preventDefault();
            const platform = document.getElementById("momentsPlatform");
            if (platform) {
                platform.classList.add("hidden");
                document.body.style.overflow = ""; // Ana səhifənin skrolunu qaytarır
                document.querySelectorAll("#momentsPlatform video").forEach(v => v.pause());
            }
        }
        
        // 🎥 VİDEONUN ÖZÜNƏ KLİKLƏYƏNDƏ PLAY/PAUSE + İKONLARIN DƏYİŞMƏSİ
        if (e.target.tagName === "VIDEO" && e.target.closest(".zara-container")) {
            window.hasInteracted = true;
            const video = e.target;
            const card = video.closest(".zara-card");
            const playOverlayIcon = card.querySelector(".play-overlay-icon");
            const btnIcon = card.querySelector(".control-play-btn i");

            if (video.paused) {
                video.play().catch(() => {});
                if (btnIcon) btnIcon.className = "fa-solid fa-pause";
            } else {
                video.pause();
                if (btnIcon) btnIcon.className = "fa-solid fa-play";
                
                // Ortada çıxan böyük pauza ikonunun vizual effekti
                if (playOverlayIcon) {
                    playOverlayIcon.style.opacity = "1";
                    playOverlayIcon.style.transform = "scale(1)";
                    setTimeout(() => {
                        playOverlayIcon.style.opacity = "0";
                        playOverlayIcon.style.transform = "scale(0.75)";
                    }, 400);
                }
            }
        }

        // 🎛️ SOL ALTDAKI MINI PLAY/PAUSE DÜYMƏSİNƏ KLİKLƏYƏNDƏ
        if (e.target.closest(".control-play-btn")) {
            e.preventDefault();
            const btn = e.target.closest(".control-play-btn");
            const card = btn.closest(".zara-card");
            const video = card.querySelector("video");
            const btnIcon = btn.querySelector("i");

            if (video) {
                window.hasInteracted = true;
                if (video.paused) {
                    video.play().catch(() => {});
                    if (btnIcon) btnIcon.className = "fa-solid fa-pause";
                } else {
                    video.pause();
                    if (btnIcon) btnIcon.className = "fa-solid fa-play";
                }
            }
        }

        // ⏱️ PROGRESS BAR-IN (AĞ XƏTTİN) ÜZƏRİNƏ KLİKLƏYƏNDƏ VİDEONU İRƏLİ-GERİ SİRİMCƏK
        if (e.target.closest(".progress-container")) {
            const container = e.target.closest(".progress-container");
            const card = container.closest(".zara-card");
            const video = card.querySelector("video");

            if (video && video.duration) {
                const rect = container.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const width = rect.width;
                const clickPercentage = clickX / width;
                video.currentTime = clickPercentage * video.duration;
            }
        }
    });

    // --- 📈 PROGRESS BAR VƏ VAXTIN DİNAMİK YENİLƏNMƏSİ ---
    document.addEventListener("timeupdate", (e) => {
        if (e.target.tagName === "VIDEO" && e.target.closest(".zara-container")) {
            const video = e.target;
            const card = video.closest(".zara-card");
            if (!card) return;

            const progressBar = card.querySelector(".progress-bar");
            const currentTimeEl = card.querySelector(".current-time");
            const durationTimeEl = card.querySelector(".duration-time");

            if (video.duration) {
                // Xətti doldururuq
                const percentage = (video.currentTime / video.duration) * 100;
                if (progressBar) progressBar.style.width = `${percentage}%`;

                // Saniyələri yazırıq
                if (currentTimeEl) currentTimeEl.textContent = formatTime(video.currentTime);
                if (durationTimeEl) durationTimeEl.textContent = formatTime(video.duration);
            }
        }
    }, true); // Event bubbling üçün true qoyuruq ki, dinamik gələn videoları tutsun

    // 🕒 Zamanı 00:00 formatına salan köməkçi funksiya
    function formatTime(seconds) {
        if (isNaN(seconds)) return "00:00";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }

    // --- AUTOMATİK OYNATMA MƏNTİQİ (INTERSECTION OBSERVER) ---
    function initVideoAutoplay() {
        const cards = document.querySelectorAll(".zara-card");
        const container = document.querySelector(".zara-container");
        if (!container) return;
        if (globalVideoObserver) globalVideoObserver.disconnect();

        globalVideoObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const video = entry.target.querySelector("video");
                const card = entry.target;
                if (!video) return;
                
                const btnIcon = card.querySelector(".control-play-btn i");

                if (entry.isIntersecting) {
                    if (window.hasInteracted) {
                        video.muted = false;
                        video.play()
                            .then(() => {
                                if (btnIcon) btnIcon.className = "fa-solid fa-pause";
                            })
                            .catch(() => {});
                    }
                } else {
                    video.pause();
                    video.currentTime = 0;
                    if (btnIcon) btnIcon.className = "fa-solid fa-play";
                }
            });
        }, { root: container, threshold: 0.6 });

        cards.forEach(card => globalVideoObserver.observe(card));
    }
});