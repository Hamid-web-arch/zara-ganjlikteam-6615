// 1. BÜTÜN İMPORTLAR ƏN YUXARIDA OLMALIDIR
import { db } from './firebase-config.js';
import { 
    collection, 
    query, 
    orderBy, 
    onSnapshot, 
    doc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// 2. Dəyişənlərin Təyini (Header və Hero üçün)
const header = document.getElementById('main-header');
const navContent = document.getElementById('nav-content');

// 3. Dəyişənlərin Təyini (Yeni 2 Sətirli Komanda Bölməsi üçün)
const crewDisplay = document.getElementById('crew-display-container');
const staffDisplay = document.getElementById('staff-display-container');

let swiperCrewInstance = null;
let swiperStaffInstance = null;

/* -------------- Header Scroll Effect START --------------- */
window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        header.classList.replace('bg-transparent', 'bg-white');
        header.classList.replace('border-transparent', 'border-gray-200');
        header.classList.replace('py-8', 'py-4');
        navContent.classList.remove('mix-blend-difference');
        
        navContent.querySelectorAll('h1, span, li, a').forEach(el => {
            el.classList.add('text-black');
            el.classList.remove('text-white');
        });
    } else {
        header.classList.replace('bg-white', 'bg-transparent');
        header.classList.replace('border-gray-200', 'border-transparent');
        header.classList.replace('py-4', 'py-8');
        navContent.classList.add('mix-blend-difference');
        
        navContent.querySelectorAll('h1, span, li, a').forEach(el => {
            el.classList.add('text-white');
            el.classList.remove('text-black');
        });
    }
});
/* -------------- Header Scroll Effect END --------------- */

/* -------------- HERO Section START --------------- */
const heroDocRef = doc(db, "settings", "hero");

onSnapshot(heroDocRef, (snapshot) => {
    if (snapshot.exists()) {
        const data = snapshot.data();
        
        const heroTitle = document.getElementById('hero-title-text');
        if (heroTitle && data.title) {
            heroTitle.innerText = data.title;
        }

        const navLoc = document.getElementById('nav-location');
        if (navLoc && data.title) {
            navLoc.innerText = data.title;
        }

        const bgImg = document.querySelector('section.relative img');
        if (bgImg && data.image) {
            bgImg.src = data.image;
        }
    }
});
/* -------------- HERO Section END --------------- */

/* -------------- NEW 2-ROW TEAM SECTION START --------------- */
// Swiper motorlarını tam responsive parametrlərlə başladırıq
function buildTeamSliders() {
   const commonSliderOptions = {
    slidesPerView: 1.5, // Mobildə yan tərəfdən sonrakı şəkil bir az görünsün
    spaceBetween: 16,
    grabCursor: true,   // İstifadəçiyə sürüşdürmə ikonası verir (Tək saxladıq)
    allowTouchMove: true, // Həm mobildə barmaqla, həm PC-də mouse ilə sürüşdürmə
    mousewheel: { forceToAxis: true },
    observer: true,
    observeParents: true,
    updateOnWindowResize: true,
    speed: 800, // Keçid sürəti hamar olsun deyə bura qaldırdıq
    
    // Sərbəst və ipək kimi axan sürüşmə rejimi
    freeMode: {
        enabled: true,
        sticky: false,
        momentumBounce: false,
    },
    
    // Ekran ölçülərinə görə dairələrin sayı
    breakpoints: {
        480: { slidesPerView: 2.2, spaceBetween: 20 },
        768: { slidesPerView: 3.2, spaceBetween: 24 },
        1024: { slidesPerView: 4, spaceBetween: 30 },
        1440: { slidesPerView: 5, spaceBetween: 35 } // Böyük ekranlarda 5 dairə
    }
};

    if (document.querySelector('.crewSwiper') && !swiperCrewInstance) {
        swiperCrewInstance = new Swiper(".crewSwiper", {
            ...commonSliderOptions,
            navigation: { nextEl: ".crew-next", prevEl: ".crew-prev" }
        });
    }

    if (document.querySelector('.staffSwiper') && !swiperStaffInstance) {
        swiperStaffInstance = new Swiper(".staffSwiper", {
            ...commonSliderOptions,
            navigation: { nextEl: ".staff-next", prevEl: ".staff-prev" }
        });
    }
}

// Slayderləri ilkin olaraq canlandırırıq
buildTeamSliders();

// 1. SƏTİR: THE CREW - 'crew' kolleksiyasından datanın çəkilməsi
const qCrew = query(collection(db, "crew"), orderBy("createdAt", "desc"));
onSnapshot(qCrew, (snapshot) => {
    if (!crewDisplay) return;
    crewDisplay.innerHTML = "";
    
    snapshot.forEach((doc) => {
        const item = doc.data();
      const cardHTML = `
    <div class="swiper-slide group cursor-pointer" 
         style="display: flex !important; flex-direction: column !important; align-items: center !important; justify-content: center !important; text-align: center !important; height: auto;">
        
        <div class="rounded-full overflow-hidden bg-white/5 mb-4 border border-white/5 relative select-none" 
             style="width: 160px; height: 160px; min-width: 160px; min-height: 160px; display: flex !important; align-items: center !important; justify-content: center !important;">
            <img src="${item.image}" 
                 class="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-[1000ms] ease-out group-hover:scale-105" 
                 alt="${item.name || ''}" />
        </div>
        
        <div class="space-y-1 transform group-hover:-translate-y-1 transition-transform duration-300" 
             style="width: 100%; display: flex !important; flex-direction: column !important; align-items: center !important; justify-content: center !important;">
            <h3 class="font-sync text-[10px] text-white tracking-[0.15em] block truncate px-2" style="width: 100%; text-align: center !important;">${item.name || ''}</h3>
            <p class="text-[8px] text-white/30 tracking-[0.3em] uppercase block truncate px-2" style="width: 100%; text-align: center !important;">${item.role || ''}</p>
        </div>
        
    </div>
`;
        crewDisplay.insertAdjacentHTML('beforeend', cardHTML);
    });

    setTimeout(() => {
        if (swiperCrewInstance) swiperCrewInstance.update();
    }, 250);
});

// 2. SƏTİR: THE STAFF - 'staff' kolleksiyasından datanın çəkilməsi
const qStaff = query(collection(db, "staff"), orderBy("createdAt", "desc"));
onSnapshot(qStaff, (snapshot) => {
    if (!staffDisplay) return;
    staffDisplay.innerHTML = "";
    
    snapshot.forEach((doc) => {
        const item = doc.data();
     const cardHTML = `
    <div class="swiper-slide group cursor-pointer" 
         style="display: flex !important; flex-direction: column !important; align-items: center !important; justify-content: center !important; text-align: center !important; height: auto;">
        
        <div class="rounded-full overflow-hidden bg-white/5 mb-4 border border-white/5 relative select-none" 
             style="width: 160px; height: 160px; min-width: 160px; min-height: 160px; display: flex !important; align-items: center !important; justify-content: center !important;">
            <img src="${item.image}" 
                 class="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-[1000ms] ease-out group-hover:scale-105" 
                 alt="${item.name || ''}" />
        </div>
        
        <div class="space-y-1 transform group-hover:-translate-y-1 transition-transform duration-300" 
             style="width: 100%; display: flex !important; flex-direction: column !important; align-items: center !important; justify-content: center !important;">
            <h3 class="font-sync text-[10px] text-white tracking-[0.15em] block truncate px-2" style="width: 100%; text-align: center !important;">${item.name || ''}</h3>
            <p class="text-[8px] text-white/30 tracking-[0.3em] uppercase block truncate px-2" style="width: 100%; text-align: center !important;">${item.role || ''}</p>
        </div>
        
    </div>
`;
        staffDisplay.insertAdjacentHTML('beforeend', cardHTML);
    });

    setTimeout(() => {
        if (swiperStaffInstance) swiperStaffInstance.update();
    }, 250);
});
/* -------------- NEW 2-ROW TEAM SECTION END --------------- */
