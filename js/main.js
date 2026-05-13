// 1. BÜTÜN İMPORTLAR ƏN YUXARIDA OLMALIDIR
import { db } from './firebase-config.js';
import { 
    collection, 
    query, 
    orderBy, 
    onSnapshot, 
    doc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// 2. Dəyişənlərin Təyini
const crewContainer = document.getElementById('crew-container');
let swiperInstance = null;
const header = document.getElementById('main-header');
const navContent = document.getElementById('nav-content');

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
        
        // Mərkəzdəki böyük başlıq
        const heroTitle = document.getElementById('hero-title-text');
        if (heroTitle && data.title) {
            heroTitle.innerText = data.title;
        }

        // Navbardakı məkan yazısı
        const navLoc = document.getElementById('nav-location');
        if (navLoc && data.title) {
            navLoc.innerText = data.title;
        }

        // Background şəkil
        const bgImg = document.querySelector('section.relative img');
        if (bgImg && data.image) {
            bgImg.src = data.image;
        }
    }
});
/* -------------- HERO Section END --------------- */

/* -------------- THE CREW Section START --------------- */
const crewQuery = query(collection(db, "crew"), orderBy("createdAt", "desc"));

onSnapshot(crewQuery, (snapshot) => {
    if (!crewContainer) return;
    
    crewContainer.innerHTML = "";
    snapshot.forEach((doc) => {
        const member = doc.data();
        const memberHTML = `
            <div class="swiper-slide group cursor-pointer">
                <div class="relative aspect-[3/4] overflow-hidden bg-gray-50 mb-6">
                    <img src="${member.image}" 
                         class="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-[1200ms] ease-out group-hover:scale-105" 
                         alt="${member.name}" />
                </div>
                <div class="space-y-1 transform group-hover:translate-x-2 transition-transform duration-500">
                    <h3 class="text-[12px] font-bold uppercase tracking-[0.2em] text-black">${member.name}</h3>
                    <p class="text-[10px] uppercase tracking-[0.3em] text-gray-400 font-light">${member.role}</p>
                </div>
            </div>
        `;
        crewContainer.innerHTML += memberHTML;
    });

    if (!snapshot.empty) {
        setTimeout(() => {
            initSwiper();
        }, 100);
    }
});

function initSwiper() {
    if (swiperInstance) swiperInstance.destroy(true, true);

    swiperInstance = new Swiper(".crewSwiper", {
        slidesPerView: 1.2,
        spaceBetween: 20,
        grabCursor: true,
        allowTouchMove: true,
        mousewheel: {
            forceToAxis: true,
        },
        navigation: {
            nextEl: ".swiper-button-next-custom",
            prevEl: ".swiper-button-prev-custom",
        },
        breakpoints: {
            640: { slidesPerView: 2.2, spaceBetween: 30 },
            1024: { slidesPerView: 3, spaceBetween: 50 },
            1440: { slidesPerView: 4, spaceBetween: 70 }
        }
    });
}
/* -------------- THE CREW Section END --------------- */

/* -------------- THE STAFF Section START --------------- */
// 1. Dəyişənləri təyin edirik
const staffContainer = document.getElementById('staff-display-container');
let staffSwiperInstance = null;

// 2. Firebase-dən 'staff' kolleksiyasını dinləyirik
const staffQuery = query(collection(db, "staff"), orderBy("createdAt", "desc"));

onSnapshot(staffQuery, (snapshot) => {
    if (!staffContainer) return;
    
    staffContainer.innerHTML = ""; // Köhnə datanı təmizləyirik
    
    snapshot.forEach((doc) => {
        const data = doc.data();
        
        // Sizin istədiyiniz dairəvi şəkil və hover effekti olan HTML struktur
        const slideHTML = `
            <div class="swiper-slide text-center group cursor-pointer">
                <div class="staff-img-wrapper">
                    <img src="${data.image}" 
                         alt="${data.name}" 
                         class="loading="lazy"">
                </div>
                <div class="staff-info-box transform transition-transform duration-500 group-hover:-translate-y-2">
                    <h3 class="font-sync text-[10px] text-white tracking-[0.2em] ">${data.name}</h3>
                    <p class="text-[8px] text-white/30  tracking-[0.4em] mt-2">${data.role}</p>
                </div>
            </div>
        `;
        staffContainer.insertAdjacentHTML('beforeend', slideHTML);
    });

    // Data gəldikdən sonra Swiper-i başladırıq
    if (!snapshot.empty) {
        setTimeout(() => {
            initStaffSwiper();
        }, 150);
    }
});

// 3. Staff Swiper Funksiyası
function initStaffSwiper() {
    if (staffSwiperInstance) staffSwiperInstance.destroy(true, true);

    staffSwiperInstance = new Swiper(".staffSwiper", {
        slidesPerView: 1.5,
        spaceBetween: 20,
        centeredSlides: false,
        grabCursor: true,
        pagination: {
            el: ".swiper-pagination",
            clickable: true,
        },
        breakpoints: {
            640: { slidesPerView: 2.5, spaceBetween: 30 },
            1024: { slidesPerView: 4, spaceBetween: 40 },
            1440: { slidesPerView: 5, spaceBetween: 50 }
        }
    });
}
/* -------------- THE STAFF Section END --------------- */