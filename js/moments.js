document.addEventListener("DOMContentLoaded", () => {
    const exploreMomentsBtn = document.getElementById("exploreMomentsBtn");
    const spaRoot = document.getElementById("spa-moments-root");
    let globalVideoObserver = null; // 🚀 Yeni: Observer-i qlobalda saxlayaq ki, hər dəfə sıfırlaya bilək

    // 1. "Explore Moments" düyməsinə basanda pleyer səhifəsini gətir
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
                    
                    // 🚀 Tam doldurulduqdan bir az sonra avtopleyeri işə salırıq
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

    // ========================================================
    // TƏSDİQLƏNMİŞ VİDEOLARI LOCALSTORAGE-DƏN OXUYUB PLEYERƏ DÜZMƏK
    // ========================================================
    function loadApprovedVideos() {
        const container = document.querySelector(".zara-container");
        if (!container) return;

        // Köhnə dinamik kartları təmizləyirik
        document.querySelectorAll(".zara-card.dynamic-card").forEach(el => el.remove());

        const approvedVideos = JSON.parse(localStorage.getItem("zara_approved_moments")) || [];
        
        approvedVideos.slice().reverse().forEach(video => {
            const cardHTML = `
                <div class="zara-card dynamic-card w-full h-full relative bg-black md:grid md:grid-cols-12 md:pt-20 animate-fadeIn">
                    <div class="w-full h-full md:col-span-7 relative bg-zinc-950 flex items-center justify-center overflow-hidden group/player">
                        
                        <!-- 🚀 DƏYİŞİKLİK: preload="auto" və playsinline mütləq bura tam oturduldu -->
                        <video 
                            class="w-full h-full object-cover md:object-contain cursor-pointer" 
                            loop 
                            playsinline 
                            preload="auto" 
                            src="${video.url}">
                        </video>
                        
                        <div class="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                            <div class="play-overlay-icon bg-black/40 text-white w-14 h-14 rounded-full flex items-center justify-center opacity-0 scale-75 transition-all duration-300">
                                <i class="fa-solid fa-play text-xl ml-1"></i>
                            </div>
                        </div>

                        <div class="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col gap-2 z-40 opacity-0 group-hover/player:opacity-100 md:group-hover/player:opacity-100 transition-opacity duration-300 select-none">
                            <div class="w-full h-1.5 bg-white/20 rounded-full cursor-pointer relative progress-container group/timeline">
                                <div class="h-full bg-white rounded-full w-0 progress-bar relative">
                                    <span class="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 bg-white rounded-full group-hover/timeline:w-3 group-hover/timeline:h-3 transition-all -mr-1.5 shadow-md shadow-black"></span>
                                </div>
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

                        <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/20 pointer-events-none md:hidden"></div>
                    </div>

                    <div class="absolute left-0 bottom-0 w-full p-6 pb-12 z-40 md:relative md:p-12 md:col-span-5 md:h-full md:bg-black flex flex-col justify-end md:justify-center gap-6 text-white">
                        <div class="flex items-center gap-4">
                            <div class="w-12 h-12 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700 flex items-center justify-center font-black text-xs select-none">ST</div>
                            <div class="flex flex-col">
                                <span class="text-sm font-bold tracking-widest uppercase">Staff Member</span>
                                <span class="text-[10px] text-zinc-400 font-light tracking-wide uppercase">Zara Employee</span>
                            </div>
                        </div>
                        <p class="text-xs font-light tracking-wide leading-relaxed text-zinc-300 max-w-md uppercase">
                            ${video.caption}
                        </p>

                        <div class="absolute right-6 bottom-36 md:relative md:right-0 md:bottom-0 flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8 mt-2 select-none">
                            <button class="like-btn flex flex-col md:flex-row items-center gap-1 md:gap-2 cursor-pointer group">
                                <i class="fa-regular fa-heart text-xl"></i>
                                <span class="text-[10px] font-light tracking-widest text-zinc-400">0 BEĞENİ</span>
                            </button>
                            <button class="open-comments-btn flex flex-col md:flex-row items-center gap-1 md:gap-2 cursor-pointer group">
                                <i class="fa-regular fa-comment text-xl"></i>
                                <span class="text-[10px] font-light tracking-widest text-zinc-400">0 YORUM</span>
                            </button>
                        </div>
                    </div>
                </div>
            `;
            container.insertAdjacentHTML("afterbegin", cardHTML);
        });

        // Autoplay-i yenidən tetikləyirik
        initVideoAutoplay();
    }

    // ========================================================
    // GLOBAL KLİK MEXANİZMİ
    // ========================================================
    document.addEventListener("click", (e) => {
        if (e.target.closest("#openUploadBtn")) {
            e.preventDefault();
            const modal = document.getElementById("uploadModal");
            if (modal) modal.style.setProperty("display", "flex", "important");
        }

        if (
            e.target.closest("#closeUploadBtn") || 
            e.target.id === "modalOverlay" || 
            (e.target.id === "uploadModal" && !e.target.closest(".bg-white"))
        ) {
            e.preventDefault();
            const modal = document.getElementById("uploadModal");
            if (modal) {
                modal.style.setProperty("display", "none", "important");
                const form = document.getElementById("uploadForm");
                if (form) form.reset();
                
                const placeholder = document.getElementById("uploadPlaceholder");
                const selectedInfo = document.getElementById("fileSelectedName");
                if (placeholder) placeholder.classList.remove("hidden");
                if (selectedInfo) selectedInfo.classList.add("hidden");
            }
        }

        if (e.target.closest("#closePlatformBtn")) {
            e.preventDefault();
            const platform = document.getElementById("momentsPlatform");
            if (platform) {
                platform.classList.add("hidden");
                document.body.style.overflow = "";
                document.querySelectorAll("#momentsPlatform video").forEach(v => v.pause());
            }
        }

        if (e.target.closest(".open-comments-btn")) {
            e.preventDefault();
            const panel = document.getElementById("commentPanel");
            if (panel) panel.classList.remove("translate-x-full");
        }
        if (e.target.closest("#closeCommentsBtn")) {
            e.preventDefault();
            const panel = document.getElementById("commentPanel");
            if (panel) panel.classList.add("translate-x-full");
        }

        if (e.target.tagName === "VIDEO" && e.target.closest(".zara-container")) {
            window.hasInteracted = true;
            if (e.target.paused) e.target.play().catch(() => {});
            else e.target.pause();
        }

        if (e.target.closest(".like-btn")) {
            e.preventDefault();
            const btn = e.target.closest(".like-btn");
            const icon = btn.querySelector("i");
            const textSpan = btn.querySelector("span");
            
            if (icon && textSpan) {
                let currentLikes = parseInt(textSpan.textContent) || 0;
                icon.classList.toggle("fa-regular");
                icon.classList.toggle("fa-solid");
                if (icon.classList.contains("fa-solid")) {
                    currentLikes++;
                    icon.style.color = "#ef4444"; 
                } else {
                    currentLikes--;
                    icon.style.color = ""; 
                }
                textSpan.textContent = `${currentLikes} BEĞENİ`;
            }
        }

        if (e.target.closest("#sendCommentBtn")) {
            e.preventDefault();
            const commentInput = document.getElementById("commentInput");
            const commentsList = document.getElementById("commentsList");
            const activeCard = e.target.closest(".zara-card") || document.querySelector(".zara-card"); 
            const commentCounter = activeCard ? activeCard.querySelector(".open-comments-btn span") : null;

            if (commentInput && commentInput.value.trim() !== "" && commentsList) {
                const commentText = commentInput.value.trim();
                const newCommentHTML = `
                    <div class="flex items-start gap-3 text-xs animate-fadeIn">
                        <div class="w-8 h-8 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700 flex items-center justify-center font-bold text-[10px] select-none">ST</div>
                        <div class="flex flex-col gap-1 flex-1">
                            <div class="flex items-baseline justify-between">
                                <span class="font-bold tracking-wide text-white uppercase">Staff Member</span>
                                <span class="text-[9px] text-zinc-500 font-light">İNDİ</span>
                            </div>
                            <p class="text-zinc-300 font-light leading-relaxed">${commentText}</p>
                        </div>
                    </div>
                `;
                commentsList.insertAdjacentHTML("afterbegin", newCommentHTML);
                commentInput.value = "";
                if (commentCounter) {
                    let currentCommentCount = parseInt(commentCounter.textContent) || 0;
                    currentCommentCount++;
                    commentCounter.textContent = `${currentCommentCount} YORUM`;
                }
            }
        }
    });

    // FAYL SEÇİLƏNDƏ VİZUAL DEYİŞİKLİK
    document.addEventListener("change", (e) => {
        if (e.target.id === "videoInput") {
            const file = e.target.files[0];
            const placeholder = document.getElementById("uploadPlaceholder");
            const selectedInfo = document.getElementById("fileSelectedName");
            const fileNameText = document.getElementById("fileNameText");

            if (file) {
                if (placeholder) placeholder.classList.add("hidden");
                if (selectedInfo) selectedInfo.classList.remove("hidden");
                if (fileNameText) fileNameText.textContent = file.name;
            }
        }
    });

    // REELS REJİMİ: OBSERVER
    function initVideoAutoplay() {
        const cards = document.querySelectorAll(".zara-card");
        const container = document.querySelector(".zara-container");
        if (!container) return;

        // 🚀 Əgər köhnə observer varsa, dublikat idarəetmə olmasın deyə onu tam təmizləyirik (Disconnect)
        if (globalVideoObserver) {
            globalVideoObserver.disconnect();
        }

        if (window.hasInteracted === undefined) {
            window.hasInteracted = false; 
        }

        const observerOptions = {
            root: container,
            threshold: 0.6 
        };

        globalVideoObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const video = entry.target.querySelector("video");
                const progressBar = entry.target.querySelector(".progress-bar");
                const progressContainer = entry.target.querySelector(".progress-container");
                const playBtn = entry.target.querySelector(".control-play-btn");
                const playIcon = playBtn ? playBtn.querySelector("i") : null;
                const currentTimeEl = entry.target.querySelector(".current-time");
                const durationTimeEl = entry.target.querySelector(".duration-time");
                const overlayIcon = entry.target.querySelector(".play-overlay-icon");

                if (!video) return;

                const formatTime = (time) => {
                    if (isNaN(time)) return "00:00";
                    const mins = Math.floor(time / 60).toString().padStart(2, '0');
                    const secs = Math.floor(time % 60).toString().padStart(2, '0');
                    return `${mins}:${secs}`;
                };

                if (entry.isIntersecting) {
                    // Metadata yüklənəndə vaxtı yaz
                    video.onloadedmetadata = () => {
                        if (durationTimeEl) durationTimeEl.textContent = formatTime(video.duration);
                    };
                    if (video.duration && durationTimeEl) {
                        durationTimeEl.textContent = formatTime(video.duration);
                    }

                    video.ontimeupdate = () => {
                        if (video.duration && progressBar) {
                            const percentage = (video.currentTime / video.duration) * 100;
                            progressBar.style.width = `${percentage}%`;
                        }
                        if (currentTimeEl) currentTimeEl.textContent = formatTime(video.currentTime);
                    };

                    // 🚀 DƏYİŞİKLİK BURADADIR: Səhifə ilk açılıb və hələ toxunulmayıbsa
                    if (!window.hasInteracted) {
                        // video.pause() əmrini sildik! Çünki video onsuz da avtomatik başlamır (autoplay yoxdur HTML-də).
                        // Sadəcə səsini və pleyer düymələrini ilkin vəziyyətə gətiririk ki, ilk kadr (Cloudinary tərəfindən) dərhal render olunsun.
                        video.muted = false; 
                        if (playIcon) playIcon.className = "fa-solid fa-play";
                        
                        if (overlayIcon) {
                            overlayIcon.classList.remove("opacity-0", "scale-75");
                            overlayIcon.classList.add("opacity-100", "scale-100");
                        }
                    } else {
                        // İstifadəçi artıq interaksiya edibsə, skrol olunan növbəti videolar avtomatik səsli açılacaq
                        video.muted = false;
                        video.play().catch(() => {
                            video.muted = true; // Brauzer yenə də icaza verməsə səssiz et və oynat
                            video.play().catch(() => {});
                        });
                        if (playIcon) playIcon.className = "fa-solid fa-pause";
                        if (overlayIcon) {
                            overlayIcon.classList.remove("opacity-100", "scale-100");
                            overlayIcon.classList.add("opacity-0", "scale-75");
                        }
                    }

                    // Dinamik klik hadisələri
                    if (progressContainer) {
                        progressContainer.onclick = (e) => {
                            e.stopPropagation();
                            window.hasInteracted = true;
                            const rect = progressContainer.getBoundingClientRect();
                            const clickX = e.clientX - rect.left;
                            video.currentTime = (clickX / rect.width) * video.duration;
                        };
                    }

                    if (playBtn) {
                        playBtn.onclick = (e) => {
                            e.stopPropagation();
                            window.hasInteracted = true;
                            togglePlayPause(video, playIcon, overlayIcon);
                        };
                    }

                    video.onclick = (e) => {
                        e.stopPropagation();
                        window.hasInteracted = true;
                        video.muted = false;
                        togglePlayPause(video, playIcon, overlayIcon);
                    };

                } else {
                    // Video ekrandan çıxanda tam dayandırılır və sıfırlanır
                    video.pause();
                    video.currentTime = 0;
                    video.ontimeupdate = null;
                    if (playIcon) playIcon.className = "fa-solid fa-play";
                }
            });
        }, observerOptions);

        cards.forEach(card => globalVideoObserver.observe(card));

        function togglePlayPause(video, playIcon, overlayIcon) {
            if (video.paused) {
                video.muted = false;
                video.play().catch(() => {
                    video.muted = true;
                    video.play().catch(() => {});
                });
                if (playIcon) playIcon.className = "fa-solid fa-pause";
                
                if (overlayIcon) {
                    overlayIcon.querySelector("i").className = "fa-solid fa-play";
                    overlayIcon.classList.remove("opacity-100", "scale-100");
                    overlayIcon.classList.add("scale-110");
                    setTimeout(() => {
                        overlayIcon.classList.remove("scale-110");
                        overlayIcon.classList.add("opacity-0", "scale-75");
                    }, 300);
                }
            } else {
                video.pause();
                if (playIcon) playIcon.className = "fa-solid fa-play";
                
                if (overlayIcon) {
                    overlayIcon.querySelector("i").className = "fa-solid fa-pause";
                    overlayIcon.classList.remove("opacity-0", "scale-75");
                    overlayIcon.classList.add("opacity-100", "scale-100");
                }
            }
        }
    }

    // 🚀 ƏGƏR SUBMIT FORM VARSA CLOUDINARY INPUTU
    const uploadForm = document.getElementById("uploadForm");
    if (uploadForm) {
        uploadForm.addEventListener("submit", function(submitEvent) {
            submitEvent.preventDefault();
            
            const videoInput = document.getElementById("videoInput");
            const captionInput = document.getElementById("captionInput");
            const submitBtn = uploadForm.querySelector("button[type='submit']");
            
            if (!videoInput || videoInput.files.length === 0) {
                alert("Zəhmət olmasa, ilk öncə bir video seçin!");
                return;
            }
            
            const file = videoInput.files[0];
            const originalBtnText = submitBtn.textContent;
            
            submitBtn.textContent = "UPLOADING TO BULUD... PLEASE WAIT";
            submitBtn.disabled = true;
            submitBtn.style.opacity = "0.7";
            
            const CLOUD_NAME = "drkjgwlyk"; 
            const UPLOAD_PRESET = "lkb769t5"; 
            
            const formData = new FormData();
            formData.append("file", file);
            formData.append("upload_preset", UPLOAD_PRESET);
            
            const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`;
            
            fetch(url, {
                method: "POST",
                body: formData
            })
            .then(res => {
                if (!res.ok) throw new Error("Cloud Sunucu Hatası!");
                return res.json();
            })
            .then(data => {
                const secureVideoUrl = data.secure_url; 
                const videoCaption = captionInput ? captionInput.value.trim() : "New Zara Moment";
                
                const pendingVideos = JSON.parse(localStorage.getItem("zara_pending_moments")) || [];
                pendingVideos.unshift({ url: secureVideoUrl, caption: videoCaption });
                localStorage.setItem("zara_pending_moments", JSON.stringify(pendingVideos));
                
                const modal = document.getElementById("uploadModal");
                if (modal) modal.style.setProperty("display", "none", "important");
                uploadForm.reset();
                
                const placeholder = document.getElementById("uploadPlaceholder");
                const selectedInfo = document.getElementById("fileSelectedName");
                if (placeholder) placeholder.classList.remove("hidden");
                if (selectedInfo) selectedInfo.classList.add("hidden");
                
                alert("Möhtəşəm! Videonuz uğurla buluda yükləndi və menecerin təsdiqi üçün Admin Panelə 'Pending' olaraq göndərildi! 🔔");
            })
            .catch(err => {
                console.error("Xəta:", err);
                alert("Yükləmə xətası: " + err.message);
            })
            .finally(() => {
                submitBtn.textContent = originalBtnText;
                submitBtn.disabled = false;
                submitBtn.style.opacity = "";
            });
        });
    }
});