import { db } from './firebase-config.js';
// Diqqət: Funksiyaları fiqurlu mötərizə { } daxilində yazmalıyıq
import { collection, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const crewContainer = document.getElementById('crew-container');
let swiperInstance = null;

// Firestore-dan datanı çəkmək
const q = query(collection(db, "crew"), orderBy("createdAt", "desc"));

onSnapshot(q, (snapshot) => {
    console.log("Məlumat sayı:", snapshot.size);
    crewContainer.innerHTML = "";

    snapshot.forEach((doc) => {
        const member = doc.data();
        
        // Swiper Slide strukturu
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

    // Swiper-i başlatmazdan əvvəl datanın gəldiyinə əmin oluruq
    if (!snapshot.empty) {
        setTimeout(() => {
            initSwiper();
        }, 100); // Kiçik bir gecikmə DOM-un hazır olması üçün yaxşıdır
    }
});

function initSwiper() {
    if (swiperInstance) swiperInstance.destroy(true, true);

    swiperInstance = new Swiper(".crewSwiper", {
        // --- BU HİSSƏLƏRİ ƏLAVƏ ET VEYA YENİLƏ ---
        slidesPerView: 1.2,
        spaceBetween: 20,
        grabCursor: true,           // Siçanla tutub sürüşdürmək üçün əl işarəsi çıxarır
        allowTouchMove: true,       // Sürüşdürməni aktiv edir
        mousewheel: {               // Siçanın təkəri ilə də sürüşdürmək istəsən (istəyə bağlı)
            forceToAxis: true,
        },
        // ---------------------------------------
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


const header = document.getElementById('main-header');
const navContent = document.getElementById('nav-content');

window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        // SCROLL HALI
        header.classList.replace('bg-transparent', 'bg-white');
        header.classList.replace('border-transparent', 'border-gray-200');
        header.classList.replace('py-8', 'py-4'); // Header daralır
        
        navContent.classList.remove('mix-blend-difference');
        
        // Yazıları qara edirik
        navContent.querySelectorAll('h1, span, li, a').forEach(el => {
            el.classList.add('text-black');
            el.classList.remove('text-white');
        });
    } else {
        // İLK HAL (Yuxarıda)
        header.classList.replace('bg-white', 'bg-transparent');
        header.classList.replace('border-gray-200', 'border-transparent');
        header.classList.replace('py-4', 'py-8'); // Header genişlənir
        
        navContent.classList.add('mix-blend-difference');
        
        // Yazıları ağ edirik
        navContent.querySelectorAll('h1, span, li, a').forEach(el => {
            el.classList.add('text-white');
            el.classList.remove('text-black');
        });
    }
});