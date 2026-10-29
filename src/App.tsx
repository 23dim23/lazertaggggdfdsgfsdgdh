import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import SectionViewer from './components/SectionViewer';
import ServicesCatalogue from './components/ServicesCatalogue';
import ReelsWidget from './components/ReelsWidget';
import ReviewsBlock from './components/ReviewsBlock';
import Footer from './components/Footer';
import BookingModal from './components/BookingModal';
import AdminPanel from './components/AdminPanel';

import { Section, Service, Review, ContactInfo, AdminSettings, Reel } from './types';
import { 
  INITIAL_SECTIONS, 
  INITIAL_SERVICES, 
  INITIAL_REVIEWS, 
  INITIAL_REELS, 
  DEFAULT_CONTACTS 
} from './data';
import { 
  testFirestoreConnection, 
  getSections, 
  getServices, 
  getReviews, 
  getContacts, 
  saveSection, 
  deleteSection,
  saveService, 
  deleteService, 
  saveReview, 
  deleteReview, 
  saveContacts,
  getReels,
  saveReel,
  deleteReel
} from './lib/db';
import { resolveServiceImage, resolveReelThumbnail, useTransparentLogo } from './lib/media';

export default function App() {
  // Navigation State
  const [activeSectionId, setActiveSectionId] = useState<string>('home');

  // Core App Content States
  const [sections, setSections] = useState<Section[]>(INITIAL_SECTIONS);
  const [services, setServices] = useState<Service[]>(INITIAL_SERVICES);
  const [reviews, setReviews] = useState<Review[]>(INITIAL_REVIEWS);
  const [contacts, setContacts] = useState<ContactInfo>(DEFAULT_CONTACTS);
  const [reels, setReels] = useState<Reel[]>(INITIAL_REELS);

  // Loading/saving overlay states
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Modals / Overlays Visibility States
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [selectedBookingPackage, setSelectedBookingPackage] = useState<string | undefined>(undefined);
  const [selectedBookingPrice, setSelectedBookingPrice] = useState<number | undefined>(undefined);

  const logoSrc = useTransparentLogo();

  // Load Firestore data on initial mount
  useEffect(() => {
    async function initAndLoadData() {
      setIsLoading(true);
      try {
        await testFirestoreConnection();
        const [dbSections, dbServices, dbReviews, dbContacts, dbReels] = await Promise.all([
          getSections(),
          getServices(),
          getReviews(),
          getContacts(),
          getReels(),
        ]);

        // Ensure every service loaded from DB has a valid resolved image
        const hydratedServices = dbServices.map((srv, idx) => ({
          ...srv,
          image: resolveServiceImage(srv, idx),
        }));

        // Ensure every reel loaded from DB has a valid resolved thumbnail
        const hydratedReels = dbReels.map((rl, idx) => ({
          ...rl,
          thumbnailUrl: resolveReelThumbnail(rl, idx),
        }));

        setSections(dbSections);
        setServices(hydratedServices);
        setReviews(dbReviews);
        setContacts(dbContacts);
        setReels(hydratedReels);
      } catch (err) {
        console.warn("Using local fallback database.", err);
      } finally {
        setIsLoading(false);
      }
    }
    initAndLoadData();
  }, []);

  // Dynamic Yandex Metrika Initialization
  useEffect(() => {
    if (contacts.yandexMetrikaId) {
      const id = contacts.yandexMetrikaId.trim();
      if (!id || id === '99999999') return;

      try {
        const scriptId = 'yandex-metrika-script';
        if (!document.getElementById(scriptId)) {
          const script = document.createElement('script');
          script.id = scriptId;
          script.type = 'text/javascript';
          script.innerHTML = `
            (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
            m[i].l=1*new Date();
            for (var j = 0; j < e.length; j++) {if (e[j].r) { return; }}
            k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
            (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");

            ym(${id}, "init", {
              clickmap:true,
              trackLinks:true,
              accurateTrackBounce:true,
              webvisor:true
            });
          `;
          document.head.appendChild(script);

          const noscript = document.createElement('noscript');
          noscript.innerHTML = `<div><img src="https://mc.yandex.ru/watch/${id}" style="position:absolute; left:-9999px;" alt="" /></div>`;
          document.body.appendChild(noscript);
        }
      } catch (err) {
        console.warn('Failed to initialize Yandex Metrika:', err);
      }
    }
  }, [contacts.yandexMetrikaId]);

  // Handle Admin settings update
  const handleSaveAdminSettings = async (newSettings: AdminSettings, newSections?: Section[], newReels?: Reel[]) => {
    setIsSaving(true);
    try {
      const hydratedServices = newSettings.services.map((srv, idx) => ({
        ...srv,
        image: resolveServiceImage(srv, idx),
      }));

      // Update state locally first so UI is snappy
      setServices(hydratedServices);
      setReviews(newSettings.reviews);
      setContacts(newSettings.contacts);
      
      const updatedSections = newSections || sections.map(sec => ({
        ...sec,
        isActive: newSettings.visibleSections[sec.id] !== undefined ? newSettings.visibleSections[sec.id] : sec.isActive,
        ...(newSettings.sectionsContent[sec.id] || {})
      }));
      setSections(updatedSections);

      let hydratedReels = reels;
      if (newReels) {
        hydratedReels = newReels.map((rl, idx) => ({
          ...rl,
          thumbnailUrl: resolveReelThumbnail(rl, idx),
        }));
        setReels(hydratedReels);
      }

      // Persist each collection independently so an error in one never blocks the others
      try {
        await saveContacts(newSettings.contacts);
      } catch (e) {
        console.warn('Error saving contacts:', e);
      }

      try {
        for (const sec of updatedSections) {
          await saveSection(sec);
        }
        if (newSections) {
          const existingSections = await getSections();
          const newSectionIds = new Set(newSections.map(s => s.id));
          for (const sec of existingSections) {
            if (!newSectionIds.has(sec.id)) {
              await deleteSection(sec.id);
            }
          }
        }
      } catch (e) {
        console.warn('Error saving sections:', e);
      }

      try {
        for (const srv of hydratedServices) {
          await saveService(srv);
        }
        const existingServices = await getServices();
        const newServiceIds = new Set(hydratedServices.map(s => s.id));
        for (const srv of existingServices) {
          if (!newServiceIds.has(srv.id)) {
            await deleteService(srv.id);
          }
        }
      } catch (e) {
        console.warn('Error saving services:', e);
      }

      try {
        for (const rev of newSettings.reviews) {
          await saveReview(rev);
        }
        const existingReviews = await getReviews();
        const newReviewIds = new Set(newSettings.reviews.map(r => r.id));
        for (const rev of existingReviews) {
          if (!newReviewIds.has(rev.id)) {
            await deleteReview(rev.id);
          }
        }
      } catch (e) {
        console.warn('Error saving reviews:', e);
      }

      if (newReels) {
        try {
          for (const rl of hydratedReels) {
            await saveReel(rl);
          }
          const existingReels = await getReels();
          const newReelsIds = new Set(hydratedReels.map(r => r.id));
          for (const rl of existingReels) {
            if (!newReelsIds.has(rl.id)) {
              await deleteReel(rl.id);
            }
          }
        } catch (e) {
          console.warn('Error saving reels:', e);
        }
      }

      // Also keep localStorage synced as backup
      localStorage.setItem('lazertag_sections', JSON.stringify(updatedSections));
      localStorage.setItem('lazertag_services', JSON.stringify(hydratedServices));
      localStorage.setItem('lazertag_reviews', JSON.stringify(newSettings.reviews));
      localStorage.setItem('lazertag_contacts', JSON.stringify(newSettings.contacts));
      if (newReels) {
        localStorage.setItem('lazertag_reels', JSON.stringify(hydratedReels));
      }
    } catch (err) {
      console.warn('Error saving to Firestore:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Add a new review directly from the UI
  const handleAddReview = async (newReview: Review) => {
    try {
      setReviews(prev => [newReview, ...prev]);
      await saveReview(newReview);
    } catch (err) {
      console.warn('Error saving review to Firestore:', err);
      const saved = localStorage.getItem('lazertag_reviews');
      const localRev = saved ? JSON.parse(saved) : INITIAL_REVIEWS;
      localStorage.setItem('lazertag_reviews', JSON.stringify([newReview, ...localRev]));
    }
  };

  // Trigger booking modal for a specific package/service
  const handleBookPackage = (packageName: string, price?: number) => {
    setSelectedBookingPackage(packageName);
    setSelectedBookingPrice(price);
    setIsBookingOpen(true);
  };

  const handleOpenGeneralBooking = () => {
    setSelectedBookingPackage(undefined);
    setSelectedBookingPrice(undefined);
    setIsBookingOpen(true);
  };

  // Scroll to services list helper
  const scrollToServices = () => {
    const el = document.getElementById('services-catalogue');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  // Scroll to Reels Atmosphere helper
  const scrollToAtmosphere = () => {
    const el = document.getElementById('atmosphere-vibe');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  // Scroll to active section container helper
  const handleSectionChange = (id: string) => {
    setActiveSectionId(id);
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 50);
  };

  const currentSection = sections.find(s => s.id === activeSectionId);

  // Prepare current admin settings model
  const adminSettings: AdminSettings = {
    visibleSections: sections.reduce((acc, sec) => {
      acc[sec.id] = sec.isActive;
      return acc;
    }, {} as { [id: string]: boolean }),
    sectionsContent: sections.reduce((acc, sec) => {
      acc[sec.id] = {
        heroTitle: sec.heroTitle,
        heroSubtitle: sec.heroSubtitle,
        description: sec.description,
        contentMarkdown: sec.contentMarkdown
      };
      return acc;
    }, {} as { [id: string]: Partial<Section> }),
    services,
    reviews,
    contacts
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center relative overflow-hidden">
        {/* Tactical grid bg */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#18181b_1px,transparent_1px),linear-gradient(to_bottom,#18181b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-35" />
        
        <div className="relative z-10 flex flex-col items-center">
          {/* Animated loading ring */}
          <div className="relative w-24 h-24 flex items-center justify-center">
            <div className="absolute inset-0 border-4 border-orange-500/20 rounded-full" />
            <div className="absolute inset-0 border-4 border-t-orange-500 border-r-orange-500 rounded-full animate-spin" />
            <img src={logoSrc} alt="Лазер Квест" className="w-16 h-16 object-contain drop-shadow" />
          </div>
          
          <h2 className="text-sm font-black text-white uppercase tracking-widest mt-6">
            ЛАЗЕР <span className="text-orange-500">КВЕСТ</span>
          </h2>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1.5 font-bold">
            Загрузка тактических полигонов...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-orange-500 selection:text-black">
      
      {/* Interactive Global Laser Quest Header */}
      <Navbar 
        sections={sections}
        activeSectionId={activeSectionId}
        onSectionChange={handleSectionChange}
        onOpenAdmin={() => setIsAdminOpen(true)}
        onOpenBooking={handleOpenGeneralBooking}
      />

      {/* Conditional page render based on selected navigation tab */}
      {activeSectionId === 'home' && currentSection ? (
        <>
          {/* Hero Banner Section */}
          <Hero 
            onExplore={scrollToServices}
            onOpenBooking={handleOpenGeneralBooking}
            onOpenAtmosphere={scrollToAtmosphere}
            heroTitle={currentSection.heroTitle}
            heroSubtitle={currentSection.heroSubtitle}
            promoBadge={contacts.promoBadge}
          />

          {/* Atmospheric Reels / VK Clips block */}
          <ReelsWidget reels={reels} />

          {/* Interactive Services / Products Catalogue */}
          <ServicesCatalogue 
            services={services}
            onBookService={handleBookPackage}
          />

          {/* Reviews Slider / Grid block with verified icons */}
          <ReviewsBlock 
            reviews={reviews}
            onAddReview={handleAddReview}
          />
        </>
      ) : (
        currentSection && (
          <SectionViewer 
            section={currentSection}
            contacts={contacts}
            onBookPackage={handleBookPackage}
            onOpenBooking={handleOpenGeneralBooking}
          />
        )
      )}

      {/* Styled Footer with map & socials links */}
      <Footer contacts={contacts} onOpenAdmin={() => setIsAdminOpen(true)} />

      {/* Booking Form Overlay Drawer */}
      <BookingModal 
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        packageName={selectedBookingPackage}
        packagePrice={selectedBookingPrice}
      />

      {/* Passcode protected Administration Dashboard */}
      {isAdminOpen && (
        <AdminPanel 
          settings={adminSettings}
          onSaveSettings={handleSaveAdminSettings}
          sections={sections}
          onSaveSections={setSections}
          reels={reels}
          onSaveReels={setReels}
          onSaveServicesLive={setServices}
          onClose={() => setIsAdminOpen(false)}
        />
      )}

    </div>
  );
}
