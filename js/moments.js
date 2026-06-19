// ========================================================
// 🌍 MOMENTS.JS - GLOBAL FIRESTORE & CLOUDINARY MANAGEMENT
// ========================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    getDocs, 
    query, 
    where, 
    onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Firebase konfiqurasiyan
const firebaseConfig = {
    apiKey: "AIzaSyAIxHLeMpePzJKCnoD2GDDnsgaQxTgGhPk",
    authDomain: "zara-ganjlik-6615.firebaseapp.com",
    projectId: "zara-ganjlik-6615",
    storageBucket: "zara-ganjlik-6615.firebasestorage.app",
    messagingSenderId: "1083900874117",
    appId: "1:1083900874117:web:ea51e535e698a2f338c8ec",
    measurementId: "G-YE37TH5ZK1"
};

// Comments üçün global dəyişənlər
let activeVideoId = null; 
let activeParentCommentId = null; // 🌟 Kiməsə cavab yazılırsa onun ID-si
let unsubscribeComments = null;
let globalVideoObserver = null;

// Firebase instansiyası
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

document.addEventListener("DOMContentLoaded", () => {
    const exploreMomentsBtn = document.getElementById("exploreMomentsBtn");
    const spaRoot = document.getElementById("spa-moments-root");

    if (exploreMomentsBtn) {
        exploreMomentsBtn.addEventListener("click", (e) => {
            e.preventDefault();
            if (spaRoot.innerHTML.trim() !== "") {
                openMomentsView();
                loadApprovedVideos(); 
                return;
            }

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
            document.body.style.overflow = "hidden";
        }
    }

    // --- VAHiD VƏ MƏRKƏZİ KLİK KONTROLERİ ---
    document.addEventListener("click", (e) => {
        // Modalı Açmaq
        if (e.target.closest("#openUploadBtn")) {
            e.preventDefault();
            const modal = document.getElementById("uploadModal");
            if (modal) modal.style.setProperty("display", "flex", "important");
        }
        
        // Modalı Bağlamaq
        if (e.target.closest("#closeUploadBtn") || e.target.id === "modalOverlay") {
            e.preventDefault();
            const modal = document.getElementById("uploadModal");
            if (modal) modal.style.setProperty("display", "none", "important");
        }
        
        // Platformanı Bağlamaq
        if (e.target.closest("#closePlatformBtn")) {
            e.preventDefault();
            const platform = document.getElementById("momentsPlatform");
            if (platform) {
                platform.classList.add("hidden");
                document.body.style.overflow = ""; 
                document.querySelectorAll("#momentsPlatform video").forEach(v => v.pause());
            }
        }
        
        // VİDEO PLAY/PAUSE
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

        // MINI PLAY DÜYMƏSİ
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

        // PROGRESS BAR
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

        // =========================================================
        // 💬 ŞƏRH PANELİNİ AÇMAQ
        // =========================================================
        if (e.target.closest(".open-comments-btn")) {
            e.preventDefault();
            const card = e.target.closest(".zara-card");
            if (card) {
                activeVideoId = card.getAttribute("data-video-id"); 
                resetReplyState(); // Yeni video açılanda köhnə reply dövlətini təmizlə
                const commentPanel = document.getElementById("commentPanel");
                if (commentPanel) {
                    commentPanel.classList.remove("translate-x-full"); 
                    loadCommentsRealTime(activeVideoId); 
                }
            }
        }

        // =========================================================
        // ✖️ ŞƏRH PANELİNİ BAĞLAMAQ
        // =========================================================
        if (e.target.closest("#closeCommentsBtn")) {
            e.preventDefault();
            const commentPanel = document.getElementById("commentPanel");
            if (commentPanel) commentPanel.classList.add("translate-x-full"); 
            if (unsubscribeComments) {
                unsubscribeComments();
                unsubscribeComments = null;
            }
            activeVideoId = null;
            resetReplyState();
        }

        // =========================================================
        // ↩️ "CAVAB YAZ" DÜYMƏSİNƏ KLİKLƏYƏNDƏ
        // =========================================================
        if (e.target.closest(".reply-trigger-btn")) {
            e.preventDefault();
            const replyBtn = e.target.closest(".reply-trigger-btn");
            activeParentCommentId = replyBtn.getAttribute("data-comment-id");
            const authorName = replyBtn.getAttribute("data-author") || "STAFF MEMBER";
            
            // İnterfeysdə cavab rejimini aktivləşdir
            const indicator = document.getElementById("replyIndicator");
            const targetNameEl = document.getElementById("replyTargetName");
            const inputField = document.getElementById("commentInput");

            if (indicator && targetNameEl && inputField) {
                targetNameEl.textContent = authorName;
                indicator.classList.remove("hidden");
                inputField.placeholder = `CAVAB YAZ...`;
                inputField.focus();
            }
        }

        // =========================================================
        // ❌ CAVAB REJİMİNİ LƏĞV ETMEK
        // =========================================================
        if (e.target.id === "cancelReplyBtn") {
            e.preventDefault();
            resetReplyState();
        }
    });

    // Cavab vəziyyətini sıfırlayan köməkçi funksiya
    function resetReplyState() {
        activeParentCommentId = null;
        const indicator = document.getElementById("replyIndicator");
        const inputField = document.getElementById("commentInput");
        if (indicator) indicator.classList.add("hidden");
        if (inputField) {
            inputField.placeholder = "YORUM YAZ...";
        }
    }

    // --- PROGRESS BAR REFRESH ---
    document.addEventListener("timeupdate", (e) => {
        if (e.target.tagName === "VIDEO" && e.target.closest(".zara-container")) {
            const video = e.target;
            const card = video.closest(".zara-card");
            if (!card) return;

            const progressBar = card.querySelector(".progress-bar");
            const currentTimeEl = card.querySelector(".current-time");
            const durationTimeEl = card.querySelector(".duration-time");

            if (video.duration) {
                const percentage = (video.currentTime / video.duration) * 100;
                if (progressBar) progressBar.style.width = `${percentage}%`;
                if (currentTimeEl) currentTimeEl.textContent = formatTime(video.currentTime);
                if (durationTimeEl) durationTimeEl.textContent = formatTime(video.duration);
            }
        }
    }, true);

    // --- SELEKTED FILE NAME ---
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

    // --- CLOUDINARY UPLOAD ---
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
                const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`, {
                    method: "POST",
                    body: formData
                });
                const data = await res.json();
                
                await addDoc(collection(db, "approved_moments"), {
                    url: data.secure_url,
                    caption: captionInput ? captionInput.value.trim() : "Zara Ganjlik Moment",
                    status: "pending", 
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

    // =========================================================================
    // 🔥 ŞƏRH VƏ CAVAB GÖNDƏRMƏK (SUBMIT)
    // =========================================================================
    document.addEventListener("submit", async function(e) {
        if (e.target && e.target.id === "commentForm") {
            e.preventDefault();
            
            const commentInput = document.getElementById("commentInput");
            const sendBtn = document.getElementById("sendCommentBtn");
            
            if (!activeVideoId || !commentInput || commentInput.value.trim() === "") return;

            const textToSend = commentInput.value.trim();
            if (sendBtn) sendBtn.disabled = true; 

            try {
                // Əgər activeParentCommentId varsa cavabdır, yoxdursa ana şərhdir (null)
                await addDoc(collection(db, "comments"), {
                    videoId: activeVideoId,
                    parentId: activeParentCommentId || null, 
                    text: textToSend,
                    createdAt: Date.now()
                });

                commentInput.value = ""; 
                resetReplyState(); // Göndərildikdən sonra cavab rejimindən çıx
                updateCommentCount(activeVideoId);
            } catch (err) {
                console.error("Şərh göndərilərkən xəta:", err);
            } finally {
                if (sendBtn) sendBtn.disabled = false; 
            }
        }
    });

    // --- VİDEOLARI YÜKLƏMƏK ---
    async function loadApprovedVideos() {
        const container = document.querySelector(".zara-container");
        if (!container) return;
        document.querySelectorAll(".zara-card.dynamic-card").forEach(el => el.remove());

        try {
            const q = query(collection(db, "approved_moments"), where("status", "==", "approved"));
            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
                container.insertAdjacentHTML("beforeend", `
                    <div class="zara-card dynamic-card w-full h-full flex items-center justify-center bg-black text-white">
                        <p class="text-[10px] tracking-widest font-light text-zinc-500 uppercase">No moments shared yet.</p>
                    </div>
                `);
                return;
            }

            const videoList = [];
            querySnapshot.forEach((doc) => { videoList.push({ id: doc.id, ...doc.data() }); });
            videoList.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

            videoList.forEach((video) => {
                const cardHTML = `
                    <div class="zara-card dynamic-card w-full h-full relative bg-black md:grid md:grid-cols-12 md:pt-20 animate-fadeIn" data-video-id="${video.id}">
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
                                <button class="open-comments-btn flex flex-col md:flex-row items-center gap-1 md:gap-2 cursor-pointer">
                                    <i class="fa-regular fa-comment text-xl"></i>
                                    <span class="text-[10px] font-light tracking-widest text-zinc-400 uppercase comment-count-text">YÜKLƏNİR...</span>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                container.insertAdjacentHTML("beforeend", cardHTML);
                updateCommentCount(video.id);
            });
            initVideoAutoplay();
        } catch (error) {
            console.error("Moments məlumatları çəkilərkən xəta:", error);
        }
    }

    // =========================================================================
    // 👁️ REAL-TIME ŞƏRHLƏRİ VƏ CAVABLARI LİSTƏLƏMƏK (ŞƏRHLƏR ARTIQ GÖRÜNÜR)
    // =========================================================================
    function loadCommentsRealTime(videoId) {
        const commentsList = document.getElementById("commentsList");
        const commentPanelTitle = document.querySelector("#commentPanel h3");
        if (!commentsList) return;

        if (unsubscribeComments) unsubscribeComments();

        // 🎯 Composite Index xətasından qaçmaq üçün ORDER BY-ı buradan çıxartdıq, JS daxilində çeşidləyəcəyik
        const q = query(collection(db, "comments"), where("videoId", "==", videoId));

        unsubscribeComments = onSnapshot(q, (snapshot) => {
            commentsList.innerHTML = ""; 
            
            if (commentPanelTitle) {
                commentPanelTitle.textContent = `YORUMLAR (${snapshot.size})`;
            }

            if (snapshot.empty) {
                commentsList.innerHTML = `
                    <p class="text-[10px] tracking-widest font-light text-zinc-500 uppercase text-center mt-8">Hələ şərh yazılmayıb.</p>
                `;
                return;
            }

            // Bütün gələn şərhləri massivə yığırıq
            const allComments = [];
            snapshot.forEach((doc) => {
                allComments.push({ id: doc.id, ...doc.data() });
            });

            // Şərhləri tarixinə görə köhnədən yeniyə sıralayırıq (Müştərilər üçün xronoloji)
            allComments.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

            // Ana şərhləri və cavabları (replies) qruplaşdırırıq
            const mainComments = allComments.filter(c => !c.parentId);
            const replies = allComments.filter(c => c.parentId);

            // Öncə ana şərhləri ekrana basırıq
            mainComments.forEach((comment) => {
                const commentId = comment.id;
                
                // Bu ana şərhə aid olan alt cavabları tapırıq
                const currentReplies = replies.filter(r => r.parentId === commentId);
                let repliesHTML = "";

                currentReplies.forEach(reply => {
                    repliesHTML += `
                        <!-- Alt Cavab Kartı -->
                        <div class="ml-6 pl-3 border-l-2 border-white/10 mt-2 flex flex-col gap-0.5 bg-white/5 p-2 rounded">
                            <div class="flex items-center justify-between text-[9px] tracking-widest font-bold">
                                <span class="text-zinc-400 uppercase">↩️ STAFF REPLY</span>
                                <span class="text-zinc-500 font-mono text-[8px]">${formatCommentDate(reply.createdAt)}</span>
                            </div>
                            <p class="text-[11px] font-light tracking-wide text-zinc-300 uppercase break-words">${reply.text}</p>
                        </div>
                    `;
                });

                const commentHTML = `
                    <div class="border-b border-white/5 pb-4 flex flex-col gap-1 select-none animate-fadeIn group">
                        <div class="flex items-center justify-between text-[10px] tracking-widest font-bold">
                            <span class="text-zinc-300 uppercase">STAFF MEMBER</span>
                            <span class="text-zinc-500 font-mono text-[9px]">${formatCommentDate(comment.createdAt)}</span>
                        </div>
                        <p class="text-xs font-light tracking-wide text-zinc-100 uppercase break-words">${comment.text}</p>
                        
                        <!-- Cavab Ver Düyməsi -->
                        <div class="flex justify-end mt-1 opacity-60 group-hover:opacity-100 transition-opacity">
                            <button class="reply-trigger-btn text-[9px] tracking-widest font-bold text-zinc-400 hover:text-white transition cursor-pointer flex items-center gap-1 uppercase" 
                                    data-comment-id="${commentId}" 
                                    data-author="STAFF">
                                <i class="fa-solid fa-reply text-[8px]"></i> Cavab Yaz
                            </button>
                        </div>

                        <!-- Bu şərhə yazılmış alt cavablar buraya render olunur -->
                        <div class="replies-container">
                            ${repliesHTML}
                        </div>
                    </div>
                `;
                commentsList.insertAdjacentHTML("beforeend", commentHTML);
            });

            commentsList.scrollTop = commentsList.scrollHeight;
        }, (error) => {
            console.error("Şərhlər canlı yüklənərkən xəta:", error);
        });
    }

    // --- KARTLARDAKI ŞƏRH SAYINI YENİLƏMƏK ---
    async function updateCommentCount(videoId) {
        const card = document.querySelector(`.zara-card[data-video-id="${videoId}"]`);
        if (!card) return;
        const countTextEl = card.querySelector(".comment-count-text");
        
        try {
            const q = query(collection(db, "comments"), where("videoId", "==", videoId));
            const snapshot = await getDocs(q);
            if (countTextEl) {
                countTextEl.textContent = snapshot.size > 0 ? `YORUMLAR (${snapshot.size})` : "ŞƏRH YAZ";
            }
        } catch (err) {
            console.error("Say hesablama xətası:", err);
        }
    }

    // --- AUTOPLAY ---
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
                            .then(() => { if (btnIcon) btnIcon.className = "fa-solid fa-pause"; })
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

    function formatTime(seconds) {
        if (isNaN(seconds)) return "00:00";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }

    function formatCommentDate(timestamp) {
        if (!timestamp) return "";
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + " - " + date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
});