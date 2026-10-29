import React, { useState, useEffect } from 'react';
import { 
  Lock, Settings, Eye, EyeOff, Edit, Plus, Trash2, FileSpreadsheet, Check, 
  X, AlertCircle, Save, PlusCircle, RefreshCw, Upload, Flame, MapPin, MessageSquare,
  Play, Video, Calendar, Phone, Users, Download, Image as ImageIcon
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Section, Service, Review, ContactInfo, AdminSettings, Reel, Lead } from '../types';
import { 
  getLeads, saveLead, deleteLead, 
  saveService as dbSaveService, deleteService as dbDeleteService,
  saveReel as dbSaveReel, deleteReel as dbDeleteReel,
  saveReview as dbSaveReview, deleteReview as dbDeleteReview,
  saveSection as dbSaveSection, deleteSection as dbDeleteSection,
  saveContacts as dbSaveContacts
} from '../lib/db';
import { 
  SERVICE_PRESET_GALLERY, 
  REEL_PRESET_COVERS, 
  resolveServiceImage, 
  getFallbackServiceImage,
  resolveReelThumbnail, 
  getFallbackReelCover,
  parseVideoSource, 
  compressImageFile,
  useTransparentLogo
} from '../lib/media';

interface AdminPanelProps {
  settings: AdminSettings;
  onSaveSettings: (newSettings: AdminSettings, newSections?: Section[], newReels?: Reel[]) => void;
  sections: Section[];
  onSaveSections: (newSections: Section[]) => void;
  reels: Reel[];
  onSaveReels?: (newReels: Reel[]) => void;
  onSaveServicesLive?: (newServices: Service[]) => void;
  onClose: () => void;
}

export default function AdminPanel({ 
  settings, 
  onSaveSettings, 
  sections, 
  onSaveSections, 
  reels,
  onSaveReels,
  onSaveServicesLive,
  onClose 
}: AdminPanelProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const logoSrc = useTransparentLogo();

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg(prev => (prev === msg ? null : prev));
    }, 3500);
  };

  useEffect(() => {
    const session = localStorage.getItem('admin_session');
    if (session === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const [activeTab, setActiveTab] = useState<'sections' | 'services' | 'reviews' | 'contacts' | 'leads' | 'reels'>('services');

  // Fetch leads dynamically when active tab is 'leads'
  useEffect(() => {
    if (isAuthenticated && activeTab === 'leads') {
      setIsLoadingLeads(true);
      getLeads()
        .then((data) => {
          setLocalLeads(data);
        })
        .catch((err) => {
          console.error('Error fetching leads:', err);
        })
        .finally(() => {
          setIsLoadingLeads(false);
        });
    }
  }, [isAuthenticated, activeTab]);

  // Excel mapping and import states
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [excelData, setExcelData] = useState<any[][] | null>(null);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState({
    category: '',
    name: '',
    description: '',
    price: '',
    oldPrice: '',
    image: '',
  });
  const [importStatus, setImportStatus] = useState<'idle' | 'previewing' | 'success' | 'error'>('idle');

  // Local editable copies
  const [localServices, setLocalServices] = useState<Service[]>(() =>
    settings.services.map((srv, idx) => ({
      ...srv,
      image: resolveServiceImage(srv, idx),
    }))
  );
  const [localReviews, setLocalReviews] = useState<Review[]>([...settings.reviews]);
  const [localContacts, setLocalContacts] = useState<ContactInfo>({ ...settings.contacts });
  const [localSections, setLocalSections] = useState<Section[]>([...sections]);
  const [localReels, setLocalReels] = useState<Reel[]>(() =>
    reels.map((rl, idx) => ({
      ...rl,
      thumbnailUrl: resolveReelThumbnail(rl, idx),
    }))
  );
  const [localLeads, setLocalLeads] = useState<Lead[]>([]);
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);

  // Form states for adding/editing sections, services, reviews, reels
  const [showSectionAddForm, setShowSectionAddForm] = useState(false);
  const [sectionForm, setSectionForm] = useState<Partial<Section>>({
    id: '', title: '', heroTitle: '', heroSubtitle: '', description: '', contentMarkdown: '', isActive: false
  });

  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [serviceForm, setServiceForm] = useState<Partial<Service>>({
    name: '', category: 'Основное', description: '', price: 0, oldPrice: undefined, duration: '', availability: 'Доступно', image: ''
  });
  const [isUploadingServiceImg, setIsUploadingServiceImg] = useState(false);

  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [reviewForm, setReviewForm] = useState<Partial<Review>>({
    author: '', rating: 5, text: '', source: 'manual'
  });

  const [editingReelId, setEditingReelId] = useState<string | null>(null);
  const [reelForm, setReelForm] = useState<Partial<Reel>>({
    title: '', videoUrl: '', thumbnailUrl: '', likes: 120, plays: '1.5K', duration: '0:15', tag: 'Общее'
  });
  const [isUploadingReelThumb, setIsUploadingReelThumb] = useState(false);

  const [leadsSearchQuery, setLeadsSearchQuery] = useState('');
  const [leadsStatusFilter, setLeadsStatusFilter] = useState<'all' | 'new' | 'processing' | 'completed' | 'canceled'>('all');

  // Handle Admin login
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'laserkvest2026' || password === 'admin' || password === '1234') {
      setIsAuthenticated(true);
      setErrorMsg('');
      localStorage.setItem('admin_session', 'true');
    } else {
      setErrorMsg('Неверный пароль администратора.');
    }
  };

  // Section visibility toggler
  const toggleSectionActive = async (id: string) => {
    const updated = localSections.map(sec => 
      sec.id === id ? { ...sec, isActive: !sec.isActive } : sec
    );
    setLocalSections(updated);
    onSaveSections(updated);
    const target = updated.find(s => s.id === id);
    if (target) {
      try {
        await dbSaveSection(target);
        showToast(`Раздел «${target.title}» ${target.isActive ? 'включен' : 'скрыт'}!`);
      } catch (e) {
        console.error(e);
      }
    }
  };

  // Save edits of a section text
  const handleSectionTextChange = (id: string, field: keyof Section, value: string) => {
    setLocalSections(prev => prev.map(sec => 
      sec.id === id ? { ...sec, [field]: value } : sec
    ));
  };

  // Add a new custom website section
  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sectionForm.id || !sectionForm.title) {
      showToast('Заполните ID раздела и заголовок вкладки!');
      return;
    }

    const cleanId = sectionForm.id.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '');
    if (cleanId === 'home') {
      showToast('Идентификатор "home" зарезервирован.');
      return;
    }
    if (localSections.some(sec => sec.id === cleanId)) {
      showToast('Раздел с таким идентификатором уже существует!');
      return;
    }

    const newSec: Section = {
      id: cleanId,
      title: sectionForm.title,
      heroTitle: sectionForm.heroTitle || '',
      heroSubtitle: sectionForm.heroSubtitle || '',
      description: sectionForm.description || '',
      contentMarkdown: sectionForm.contentMarkdown || '',
      isActive: sectionForm.isActive ?? false
    };

    const updated = [...localSections, newSec];
    setLocalSections(updated);
    onSaveSections(updated);
    try {
      await dbSaveSection(newSec);
      showToast(`Раздел «${newSec.title}» создан и сохранен!`);
    } catch (err) {
      console.error(err);
    }

    setSectionForm({
      id: '', title: '', heroTitle: '', heroSubtitle: '', description: '', contentMarkdown: '', isActive: false
    });
    setShowSectionAddForm(false);
  };

  // Delete a website section
  const handleDeleteSection = async (id: string) => {
    if (id === 'home') {
      showToast('Нельзя удалить главную страницу!');
      return;
    }
    const updated = localSections.filter(sec => sec.id !== id);
    setLocalSections(updated);
    onSaveSections(updated);
    try {
      await dbDeleteSection(id);
      showToast('Раздел удален с сайта.');
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Service Photo File Upload
  const handleServiceImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingServiceImg(true);
    try {
      const compressedDataUrl = await compressImageFile(file, 800, 600, 0.82);
      setServiceForm(prev => ({ ...prev, image: compressedDataUrl }));
      showToast('Фото услуги успешно загружено!');
    } catch (err) {
      console.error(err);
      showToast('Не удалось обработать фото. Попробуйте другой файл.');
    } finally {
      setIsUploadingServiceImg(false);
    }
  };

  // Handle Reel Cover File Upload
  const handleReelCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingReelThumb(true);
    try {
      const compressedDataUrl = await compressImageFile(file, 540, 960, 0.82);
      setReelForm(prev => ({ ...prev, thumbnailUrl: compressedDataUrl }));
      showToast('Обложка для клипа успешно загружена!');
    } catch (err) {
      console.error(err);
      showToast('Не удалось обработать обложку.');
    } finally {
      setIsUploadingReelThumb(false);
    }
  };

  // Reels / VK Clips helper handlers (with immediate Firestore persistence!)
  const handleSaveReelForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reelForm.title || !reelForm.videoUrl) {
      showToast('Заполните название и укажите ссылку на видео или VK Клип!');
      return;
    }

    const resolvedThumb = resolveReelThumbnail(reelForm, localReels.length);

    let targetReel: Reel;
    let updatedReels: Reel[];

    if (editingReelId) {
      targetReel = {
        id: editingReelId,
        title: reelForm.title.trim(),
        videoUrl: reelForm.videoUrl.trim(),
        thumbnailUrl: resolvedThumb,
        likes: Number(reelForm.likes) || 120,
        plays: reelForm.plays || '1.5K',
        duration: reelForm.duration || '0:15',
        tag: reelForm.tag || 'Общее'
      };
      updatedReels = localReels.map(rl => rl.id === editingReelId ? targetReel : rl);
      setEditingReelId(null);
    } else {
      targetReel = {
        id: 'reel_' + Date.now(),
        title: reelForm.title.trim(),
        videoUrl: reelForm.videoUrl.trim(),
        thumbnailUrl: resolvedThumb,
        likes: Number(reelForm.likes) || 120,
        plays: reelForm.plays || '1.5K',
        duration: reelForm.duration || '0:15',
        tag: reelForm.tag || 'Общее'
      };
      updatedReels = [targetReel, ...localReels];
    }

    setLocalReels(updatedReels);
    if (onSaveReels) onSaveReels(updatedReels);
    localStorage.setItem('lazertag_reels', JSON.stringify(updatedReels));

    try {
      await dbSaveReel(targetReel);
      showToast('VK Клип успешно сохранен и опубликован на сайте!');
    } catch (err) {
      console.error('Error saving reel to Firestore:', err);
      showToast('Клип добавлен локально (ошибка облачной синхронизации).');
    }

    setReelForm({ title: '', videoUrl: '', thumbnailUrl: '', likes: 120, plays: '1.5K', duration: '0:15', tag: 'Общее' });
  };

  const handleEditReel = (reel: Reel) => {
    setEditingReelId(reel.id);
    setReelForm(reel);
  };

  const handleDeleteReel = async (id: string) => {
    const updatedReels = localReels.filter(r => r.id !== id);
    setLocalReels(updatedReels);
    if (onSaveReels) onSaveReels(updatedReels);
    localStorage.setItem('lazertag_reels', JSON.stringify(updatedReels));
    try {
      await dbDeleteReel(id);
      showToast('Видео-клип удален с сайта.');
    } catch (err) {
      console.error('Error deleting reel:', err);
    }
  };

  // Leads Actions
  const handleUpdateLeadStatus = async (leadId: string, newStatus: 'new' | 'processing' | 'completed' | 'canceled') => {
    const lead = localLeads.find(l => l.id === leadId);
    if (!lead) return;

    const updatedLead: Lead = { ...lead, status: newStatus };
    setLocalLeads(prev => prev.map(l => l.id === leadId ? updatedLead : l));

    try {
      await saveLead(updatedLead);
      showToast('Статус заявки обновлен.');
    } catch (err) {
      console.error('Failed to update lead status in Firestore:', err);
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    setLocalLeads(prev => prev.filter(l => l.id !== leadId));
    try {
      await deleteLead(leadId);
      showToast('Заявка удалена.');
    } catch (err) {
      console.error('Failed to delete lead from Firestore:', err);
    }
  };

  const handleExportLeadsToExcel = () => {
    if (localLeads.length === 0) {
      showToast('Нет заявок для экспорта!');
      return;
    }

    const formatted = localLeads.map((l, i) => ({
      '№': i + 1,
      'Имя': l.name,
      'Телефон': l.phone,
      'Дата игры': l.date,
      'Количество гостей': l.guests,
      'Пакет / Тариф': l.packageName || 'Общая заявка',
      'Стоимость': l.packagePrice ? `${l.packagePrice} ₽` : 'Не указана',
      'Комментарий': l.comment,
      'Дата создания': new Date(l.createdAt).toLocaleString('ru-RU'),
      'Статус': l.status === 'new' ? 'Новая' : 
                l.status === 'processing' ? 'В обработке' : 
                l.status === 'completed' ? 'Завершена' : 'Отменена'
    }));

    const ws = XLSX.utils.json_to_sheet(formatted);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Заявки");
    XLSX.writeFile(wb, `leads_export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Excel file loader using xlsx
  const handleExcelFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExcelFile(file);
    setImportStatus('idle');

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

        if (data && data.length > 0) {
          setExcelData(data);
          const headers = (data[0] || []).map(h => String(h || ''));
          setExcelHeaders(headers);

          // Propose smart mappings based on typical Yandex Map Excel export fields (including Photo!)
          const mapping = {
            category: headers.find(h => /категор|раздел/i.test(h)) || '',
            name: headers.find(h => /назван|услуг|товар|имя|заголов/i.test(h)) || '',
            description: headers.find(h => /опис|информ|коммент/i.test(h)) || '',
            price: headers.find(h => /цен|стоим/i.test(h)) || '',
            oldPrice: headers.find(h => /скидк|стар/i.test(h)) || '',
            image: headers.find(h => /фото|картинк|изображ|photo|image|img|ссылк/i.test(h)) || '',
          };
          setColumnMapping(mapping);
          setImportStatus('previewing');
        } else {
          setErrorMsg('Файл Excel пуст или поврежден.');
          setImportStatus('error');
        }
      } catch (err) {
        setErrorMsg('Ошибка при чтении Excel файла. Убедитесь в корректности формата.');
        setImportStatus('error');
      }
    };
    reader.readAsBinaryString(file);
  };

  // Process mapping and import parsed services (with photos and immediate Firestore save!)
  const processExcelImport = async () => {
    if (!excelData || excelData.length <= 1) return;

    const headers = excelHeaders;
    const catIdx = headers.indexOf(columnMapping.category);
    const nameIdx = headers.indexOf(columnMapping.name);
    const descIdx = headers.indexOf(columnMapping.description);
    const priceIdx = headers.indexOf(columnMapping.price);
    const oldPriceIdx = headers.indexOf(columnMapping.oldPrice);
    const imgIdx = headers.indexOf(columnMapping.image);

    if (nameIdx === -1 || priceIdx === -1) {
      showToast('Необходимо сопоставить как минимум «Название» и «Цену» услуги!');
      return;
    }

    const importedServices: Service[] = [];

    for (let i = 1; i < excelData.length; i++) {
      const row = excelData[i];
      if (!row || row.length === 0) continue;

      const name = String(row[nameIdx] || '').trim();
      const priceVal = parseFloat(String(row[priceIdx] || '').replace(/[^\d.]/g, ''));
      
      if (!name || isNaN(priceVal)) continue;

      const category = catIdx !== -1 && row[catIdx] ? String(row[catIdx]).trim() : 'Основное';
      const description = descIdx !== -1 && row[descIdx] ? String(row[descIdx]).trim() : 'Подробности уточняйте у организатора праздника.';
      const oldPriceVal = oldPriceIdx !== -1 && row[oldPriceIdx] 
        ? parseFloat(String(row[oldPriceIdx]).replace(/[^\d.]/g, '')) 
        : undefined;
      const rawImage = imgIdx !== -1 && row[imgIdx] ? String(row[imgIdx]).trim() : '';

      const draftSrv: Partial<Service> = {
        category,
        name,
        description,
        image: rawImage,
      };

      const srvObj: Service = {
        id: `srv-excel-${Date.now()}-${i}`,
        category,
        name,
        description,
        price: priceVal,
        ...(oldPriceVal && !isNaN(oldPriceVal) ? { oldPrice: oldPriceVal } : {}),
        image: resolveServiceImage(draftSrv, i),
        availability: 'Доступно',
        isPopular: false
      };

      importedServices.push(srvObj);
    }

    if (importedServices.length > 0) {
      const updated = [...localServices, ...importedServices];
      setLocalServices(updated);
      if (onSaveServicesLive) onSaveServicesLive(updated);
      setImportStatus('success');
      setExcelFile(null);
      setExcelData(null);

      // Persist imported services immediately to Firestore
      try {
        for (const srv of importedServices) {
          await dbSaveService(srv);
        }
        showToast(`Импортировано и сохранено услуг: ${importedServices.length} шт.`);
      } catch (e) {
        console.error('Error saving imported services:', e);
      }
    } else {
      showToast('Не удалось импортировать услуги. Проверьте колонки.');
    }
  };

  // Manage Service Form Submit (with immediate Firestore persistence!)
  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceForm.name || serviceForm.price === undefined) return;

    const resolvedImg = resolveServiceImage(serviceForm, localServices.length);

    let savedSrv: Service;
    let updatedList: Service[];

    if (editingServiceId) {
      savedSrv = {
        id: editingServiceId,
        category: serviceForm.category || 'Основное',
        name: serviceForm.name.trim(),
        description: serviceForm.description || '',
        price: Number(serviceForm.price),
        ...(serviceForm.oldPrice ? { oldPrice: Number(serviceForm.oldPrice) } : {}),
        ...(serviceForm.duration ? { duration: serviceForm.duration } : {}),
        availability: serviceForm.availability || 'Доступно',
        image: resolvedImg,
        isPopular: Boolean(serviceForm.isPopular)
      };
      updatedList = localServices.map(s => s.id === editingServiceId ? savedSrv : s);
      setEditingServiceId(null);
    } else {
      savedSrv = {
        id: `srv-manual-${Date.now()}`,
        category: serviceForm.category || 'Основное',
        name: serviceForm.name.trim(),
        description: serviceForm.description || '',
        price: Number(serviceForm.price),
        ...(serviceForm.oldPrice ? { oldPrice: Number(serviceForm.oldPrice) } : {}),
        ...(serviceForm.duration ? { duration: serviceForm.duration } : {}),
        availability: serviceForm.availability || 'Доступно',
        image: resolvedImg,
        isPopular: Boolean(serviceForm.isPopular)
      };
      updatedList = [savedSrv, ...localServices];
    }

    setLocalServices(updatedList);
    if (onSaveServicesLive) onSaveServicesLive(updatedList);
    localStorage.setItem('lazertag_services', JSON.stringify(updatedList));

    try {
      await dbSaveService(savedSrv);
      showToast('Услуга с фотографией сохранена на сайте!');
    } catch (err) {
      console.error('Error saving service to Firestore:', err);
      showToast('Услуга сохранена локально.');
    }

    setServiceForm({
      name: '', category: 'Основное', description: '', price: 0, oldPrice: undefined, duration: '', availability: 'Доступно', image: ''
    });
  };

  // Auto-populate thematic photos for all existing services and persist to Firestore
  const handleRefreshAllServicePhotos = async () => {
    const updated = localServices.map((srv, idx) => ({
      ...srv,
      image: getFallbackServiceImage(srv, idx),
    }));
    setLocalServices(updated);
    if (onSaveServicesLive) onSaveServicesLive(updated);
    try {
      for (const srv of updated) {
        await dbSaveService(srv);
      }
      showToast('Тематические обложки успешно обновлены для всех услуг!');
    } catch (e) {
      console.error(e);
    }
  };

  const handleEditService = (srv: Service) => {
    setEditingServiceId(srv.id);
    setServiceForm({
      ...srv,
      image: resolveServiceImage(srv),
    });
  };

  const handleDeleteService = async (id: string) => {
    const updated = localServices.filter(s => s.id !== id);
    setLocalServices(updated);
    if (onSaveServicesLive) onSaveServicesLive(updated);
    try {
      await dbDeleteService(id);
      showToast('Услуга удалена.');
    } catch (err) {
      console.error(err);
    }
  };

  // Manage Review Form Submit
  const handleSaveReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewForm.author || !reviewForm.text) return;

    let targetRev: Review;
    let updated: Review[];

    if (editingReviewId) {
      targetRev = {
        id: editingReviewId,
        author: reviewForm.author,
        date: reviewForm.date || new Date().toLocaleDateString('ru-RU'),
        rating: Number(reviewForm.rating || 5),
        text: reviewForm.text,
        source: reviewForm.source || 'manual',
      };
      updated = localReviews.map(r => r.id === editingReviewId ? targetRev : r);
      setEditingReviewId(null);
    } else {
      targetRev = {
        id: `rev-manual-${Date.now()}`,
        author: reviewForm.author,
        date: new Date().toLocaleDateString('ru-RU'),
        rating: Number(reviewForm.rating || 5),
        text: reviewForm.text,
        source: reviewForm.source || 'manual',
      };
      updated = [targetRev, ...localReviews];
    }

    setLocalReviews(updated);
    try {
      await dbSaveReview(targetRev);
      showToast('Отзыв успешно сохранен!');
    } catch (err) {
      console.error(err);
    }

    setReviewForm({ author: '', rating: 5, text: '', source: 'manual' });
  };

  const handleEditReview = (rev: Review) => {
    setEditingReviewId(rev.id);
    setReviewForm(rev);
  };

  const handleDeleteReview = async (id: string) => {
    setLocalReviews(prev => prev.filter(r => r.id !== id));
    try {
      await dbDeleteReview(id);
      showToast('Отзыв удален.');
    } catch (err) {
      console.error(err);
    }
  };

  // Save all changes to the main parent state & Firestore
  const handleSaveAll = () => {
    onSaveSections(localSections);

    const newSettings: AdminSettings = {
      visibleSections: localSections.reduce((acc, sec) => {
        acc[sec.id] = sec.isActive;
        return acc;
      }, {} as { [id: string]: boolean }),
      sectionsContent: localSections.reduce((acc, sec) => {
        acc[sec.id] = {
          heroTitle: sec.heroTitle,
          heroSubtitle: sec.heroSubtitle,
          description: sec.description,
          contentMarkdown: sec.contentMarkdown
        };
        return acc;
      }, {} as { [id: string]: Partial<Section> }),
      services: localServices,
      reviews: localReviews,
      contacts: localContacts
    };

    onSaveSettings(newSettings, localSections, localReels);
    showToast('Все изменения успешно сохранены на сайте!');
    setTimeout(() => {
      onClose();
    }, 600);
  };

  const parsedReelPreview = parseVideoSource(reelForm.videoUrl);

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4">
        <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-2xl relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="text-center mb-6">
            <img src={logoSrc} alt="Лазер Квест" className="w-16 h-16 object-contain mx-auto mb-3" />
            <h3 className="text-xl font-extrabold text-white">Панель управления клубом</h3>
            <p className="text-xs text-zinc-400 mt-1">Введите пароль для редактирования разделов, услуг и VK Клипов</p>
          </div>

          <div className="space-y-4">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Пароль администратора</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Введите пароль..."
                  className="w-full bg-zinc-950 text-white text-xs border border-zinc-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>

              {errorMsg && (
                <div className="flex items-start gap-2 text-xs text-red-400 bg-red-950/30 border border-red-900/50 p-3 rounded-lg">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="whitespace-pre-line text-left">{errorMsg}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-amber-500 text-white font-extrabold py-3 rounded-xl transition-all shadow-lg shadow-orange-950/50 text-xs uppercase tracking-wider cursor-pointer"
              >
                Войти в панель
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex bg-black/95 backdrop-blur-md p-3 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-6xl bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col h-[92vh] shadow-2xl overflow-hidden self-center mx-auto relative">
        
        {/* Floating Toast Feedback */}
        {toastMsg && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-orange-600 text-white px-4 py-2.5 rounded-xl text-xs font-extrabold shadow-xl flex items-center gap-2 border border-orange-400">
            <Check className="w-4 h-4 shrink-0" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Admin Header */}
        <div className="p-4 sm:p-5 bg-zinc-950 border-b border-zinc-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <img src={logoSrc} alt="Лазер Квест" className="w-11 h-11 object-contain shrink-0" />
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                Панель управления «Лазер Квест»
                <span className="text-[9px] bg-orange-950/60 text-orange-400 px-2 py-0.5 border border-orange-500/30 rounded uppercase font-black">
                  ОБЛАКО
                </span>
              </h3>
              <p className="text-xs text-zinc-400">
                Все добавленные услуги и VK Клипы автоматически сохраняются на сайте
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-stretch sm:self-auto w-full sm:w-auto">
            <button
              onClick={() => {
                localStorage.removeItem('admin_session');
                setIsAuthenticated(false);
                onClose();
              }}
              className="bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 hover:text-white px-3.5 py-2.5 rounded-xl font-bold transition-all cursor-pointer"
            >
              Выйти
            </button>
            <button
              onClick={onClose}
              className="bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Закрыть
            </button>
            <button
              onClick={handleSaveAll}
              className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-amber-500 text-white px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-orange-950/50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Применить изменения
            </button>
          </div>
        </div>

        {/* Inner layout split */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Admin Sidebar Navigation */}
          <div className="w-full md:w-[230px] bg-zinc-950/60 md:border-r border-zinc-800 p-3.5 flex flex-row md:flex-col gap-1.5 overflow-x-auto shrink-0">
            <button
              onClick={() => setActiveTab('services')}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shrink-0 cursor-pointer transition-colors ${
                activeTab === 'services' 
                  ? 'bg-orange-600 text-white shadow-md shadow-orange-950/40' 
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              Услуги и Фото ({localServices.length})
            </button>

            <button
              onClick={() => setActiveTab('reels')}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shrink-0 cursor-pointer transition-colors ${
                activeTab === 'reels' 
                  ? 'bg-orange-600 text-white shadow-md shadow-orange-950/40' 
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              <Video className="w-4 h-4" />
              VK Клипы ({localReels.length})
            </button>

            <button
              onClick={() => setActiveTab('sections')}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shrink-0 cursor-pointer transition-colors ${
                activeTab === 'sections' 
                  ? 'bg-orange-600 text-white shadow-md shadow-orange-950/40' 
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              <Settings className="w-4 h-4" />
              Разделы сайта ({localSections.length})
            </button>

            <button
              onClick={() => setActiveTab('reviews')}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shrink-0 cursor-pointer transition-colors ${
                activeTab === 'reviews' 
                  ? 'bg-orange-600 text-white shadow-md shadow-orange-950/40' 
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              Отзывы ({localReviews.length})
            </button>

            <button
              onClick={() => setActiveTab('contacts')}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shrink-0 cursor-pointer transition-colors ${
                activeTab === 'contacts' 
                  ? 'bg-orange-600 text-white shadow-md shadow-orange-950/40' 
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              <MapPin className="w-4 h-4" />
              Контакты и Карта
            </button>

            <button
              onClick={() => setActiveTab('leads')}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shrink-0 cursor-pointer transition-colors ${
                activeTab === 'leads' 
                  ? 'bg-orange-600 text-white shadow-md shadow-orange-950/40' 
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              <Calendar className="w-4 h-4" />
              Заявки ({localLeads.length})
            </button>
          </div>

          {/* Admin Content Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-zinc-900/30">
            
            {/* TAB 1: Sections Content & Visibility */}
            {activeTab === 'sections' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-black text-white uppercase tracking-wider mb-1">Редактор разделов сайта</h4>
                    <p className="text-xs text-zinc-400">Включайте и выключайте разделы, редактируйте заголовки и описания страниц.</p>
                  </div>
                  <button
                    onClick={() => setShowSectionAddForm(!showSectionAddForm)}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold transition-all self-start sm:self-center cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Создать раздел
                  </button>
                </div>

                {showSectionAddForm && (
                  <form onSubmit={handleAddSection} className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60">
                      <h5 className="text-xs font-black text-white uppercase tracking-wider">Новый раздел сайта</h5>
                      <button 
                        type="button" 
                        onClick={() => setShowSectionAddForm(false)} 
                        className="text-zinc-500 hover:text-white transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-wider mb-1">Уникальный ID (на латинице)</label>
                        <input
                          type="text"
                          required
                          value={sectionForm.id || ''}
                          onChange={(e) => setSectionForm(prev => ({ ...prev, id: e.target.value }))}
                          placeholder="quests"
                          className="w-full bg-zinc-900 text-xs text-white border border-zinc-800 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-wider mb-1">Заголовок во вкладке навигации</label>
                        <input
                          type="text"
                          required
                          value={sectionForm.title || ''}
                          onChange={(e) => setSectionForm(prev => ({ ...prev, title: e.target.value }))}
                          placeholder="Квесты"
                          className="w-full bg-zinc-900 text-xs text-white border border-zinc-800 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-wider mb-1">Главный заголовок (Hero Title)</label>
                        <input
                          type="text"
                          value={sectionForm.heroTitle || ''}
                          onChange={(e) => setSectionForm(prev => ({ ...prev, heroTitle: e.target.value }))}
                          placeholder="Сюжетные квесты в Сочи"
                          className="w-full bg-zinc-900 text-xs text-white border border-zinc-800 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-wider mb-1">Подзаголовок (Hero Subtitle)</label>
                        <input
                          type="text"
                          value={sectionForm.heroSubtitle || ''}
                          onChange={(e) => setSectionForm(prev => ({ ...prev, heroSubtitle: e.target.value }))}
                          placeholder="Полное погружение в атмосферу..."
                          className="w-full bg-zinc-900 text-xs text-white border border-zinc-800 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-wider mb-1">Основное наполнение страницы</label>
                      <textarea
                        value={sectionForm.description || ''}
                        onChange={(e) => setSectionForm(prev => ({ ...prev, description: e.target.value }))}
                        rows={3}
                        className="w-full bg-zinc-900 text-xs text-white border border-zinc-800 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500 resize-none"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <input
                        type="checkbox"
                        id="new-section-isactive"
                        checked={sectionForm.isActive || false}
                        onChange={(e) => setSectionForm(prev => ({ ...prev, isActive: e.target.checked }))}
                        className="rounded border-zinc-800 bg-zinc-900 text-orange-500 h-4 w-4"
                      />
                      <label htmlFor="new-section-isactive" className="text-xs text-zinc-300 select-none">Сделать активным (отображать на сайте)</label>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowSectionAddForm(false)}
                        className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition-all"
                      >
                        Отмена
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold transition-all"
                      >
                        Создать раздел
                      </button>
                    </div>
                  </form>
                )}

                <div className="space-y-4">
                  {localSections.map((sec) => (
                    <div key={sec.id} className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-5">
                      <div className="flex items-center justify-between mb-4 pb-4 border-b border-zinc-800">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-black text-orange-400 uppercase tracking-widest bg-orange-500/10 border border-orange-500/30 px-2 py-0.5 rounded">
                            {sec.id.toUpperCase()}
                          </span>
                          <h5 className="text-sm font-black text-white">{sec.title}</h5>
                          {sec.id !== 'home' && (
                            <button
                              onClick={() => handleDeleteSection(sec.id)}
                              className="text-zinc-500 hover:text-red-400 p-1 rounded-lg transition-all ml-1"
                              title="Удалить этот раздел"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        <button
                          onClick={() => toggleSectionActive(sec.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all cursor-pointer ${
                            sec.isActive
                              ? 'bg-orange-950/50 text-orange-400 border-orange-500/40'
                              : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                          }`}
                        >
                          {sec.isActive ? (
                            <>
                              <Eye className="w-3.5 h-3.5" />
                              Активен на сайте
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3.5 h-3.5" />
                              Скрыт
                            </>
                          )}
                        </button>
                      </div>

                      <div className="space-y-3.5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-wider mb-1">Заголовок страницы (Hero Title)</label>
                            <input
                              type="text"
                              value={sec.heroTitle || ''}
                              onChange={(e) => handleSectionTextChange(sec.id, 'heroTitle', e.target.value)}
                              className="w-full bg-zinc-900 text-xs text-white border border-zinc-800 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-wider mb-1">Вкладка в навигации</label>
                            <input
                              type="text"
                              value={sec.title || ''}
                              onChange={(e) => handleSectionTextChange(sec.id, 'title', e.target.value)}
                              className="w-full bg-zinc-900 text-xs text-white border border-zinc-800 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-wider mb-1">Краткое описание (Hero Subtitle)</label>
                          <textarea
                            value={sec.heroSubtitle || ''}
                            onChange={(e) => handleSectionTextChange(sec.id, 'heroSubtitle', e.target.value)}
                            rows={2}
                            className="w-full bg-zinc-900 text-xs text-white border border-zinc-800 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500 resize-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-wider mb-1">Основное текстовое наполнение</label>
                          <textarea
                            value={sec.description || ''}
                            onChange={(e) => handleSectionTextChange(sec.id, 'description', e.target.value)}
                            rows={3}
                            className="w-full bg-zinc-900 text-xs text-white border border-zinc-800 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500 resize-none"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 2: Services Management + Photo Picker + Excel Importer */}
            {activeTab === 'services' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h4 className="text-sm font-black text-white uppercase tracking-wider mb-1">Управление каталогом услуг и фото</h4>
                    <p className="text-xs text-zinc-400">Добавляйте услуги с фотографиями, загружайте снимки с телефона/ПК или импортируйте прайс Excel.</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-auto">
                    <button
                      type="button"
                      onClick={handleRefreshAllServicePhotos}
                      className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-800 hover:border-orange-500/50 text-zinc-300 hover:text-orange-400 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-orange-500" />
                      Авто-обложки ко всем услугам
                    </button>

                    <input
                      type="file"
                      accept=".xlsx, .xls, .csv"
                      id="excel-file-uploader"
                      className="hidden"
                      onChange={handleExcelFileChange}
                    />
                    <label
                      htmlFor="excel-file-uploader"
                      className="cursor-pointer flex items-center justify-center gap-1.5 bg-zinc-950 border border-orange-500/40 hover:border-orange-500 text-orange-400 px-4 py-2.5 rounded-xl text-xs font-bold transition-all"
                    >
                      <Upload className="w-4 h-4 text-orange-500" />
                      Импорт из Excel
                    </label>
                  </div>
                </div>

                {/* Excel Import Preview Window */}
                {importStatus === 'previewing' && excelData && (
                  <div className="bg-zinc-950 border border-orange-500/40 p-5 rounded-2xl space-y-4">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-black text-orange-400 uppercase tracking-widest flex items-center gap-1.5">
                        <FileSpreadsheet className="w-4 h-4 text-orange-500" />
                        Предпросмотр данных Excel ({excelData.length - 1} строк обнаружено)
                      </h5>
                      <button 
                        onClick={() => setImportStatus('idle')}
                        className="text-zinc-500 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      Сопоставьте колонки вашего Excel-файла с полями сайта (если колонки с фото нет в файле, система автоматически подберет тематическую обложку к каждой услуге):
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                      <div>
                        <label className="block text-[9px] font-black text-zinc-400 uppercase mb-1">Название *</label>
                        <select
                          value={columnMapping.name}
                          onChange={(e) => setColumnMapping(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full bg-zinc-900 text-xs text-white border border-zinc-800 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-orange-500"
                        >
                          <option value="">-- Выбрать --</option>
                          {excelHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[9px] font-black text-zinc-400 uppercase mb-1">Цена *</label>
                        <select
                          value={columnMapping.price}
                          onChange={(e) => setColumnMapping(prev => ({ ...prev, price: e.target.value }))}
                          className="w-full bg-zinc-900 text-xs text-white border border-zinc-800 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-orange-500"
                        >
                          <option value="">-- Выбрать --</option>
                          {excelHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[9px] font-black text-zinc-400 uppercase mb-1">Категория</label>
                        <select
                          value={columnMapping.category}
                          onChange={(e) => setColumnMapping(prev => ({ ...prev, category: e.target.value }))}
                          className="w-full bg-zinc-900 text-xs text-white border border-zinc-800 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-orange-500"
                        >
                          <option value="">-- Авто --</option>
                          {excelHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[9px] font-black text-zinc-400 uppercase mb-1">Описание</label>
                        <select
                          value={columnMapping.description}
                          onChange={(e) => setColumnMapping(prev => ({ ...prev, description: e.target.value }))}
                          className="w-full bg-zinc-900 text-xs text-white border border-zinc-800 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-orange-500"
                        >
                          <option value="">-- Пропустить --</option>
                          {excelHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[9px] font-black text-zinc-400 uppercase mb-1">Старая цена</label>
                        <select
                          value={columnMapping.oldPrice}
                          onChange={(e) => setColumnMapping(prev => ({ ...prev, oldPrice: e.target.value }))}
                          className="w-full bg-zinc-900 text-xs text-white border border-zinc-800 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-orange-500"
                        >
                          <option value="">-- Пропустить --</option>
                          {excelHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[9px] font-black text-orange-400 uppercase mb-1">Фото (ссылка)</label>
                        <select
                          value={columnMapping.image}
                          onChange={(e) => setColumnMapping(prev => ({ ...prev, image: e.target.value }))}
                          className="w-full bg-zinc-900 text-xs text-white border border-orange-500/40 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-orange-500"
                        >
                          <option value="">-- Авто-подбор --</option>
                          {excelHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end pt-2">
                      <button
                        onClick={() => setImportStatus('idle')}
                        className="bg-zinc-900 border border-zinc-800 text-zinc-400 px-4 py-2 rounded-lg text-xs font-bold hover:text-white"
                      >
                        Сбросить
                      </button>
                      <button
                        onClick={processExcelImport}
                        className="bg-gradient-to-r from-orange-600 to-orange-500 text-white px-5 py-2 rounded-lg text-xs font-black hover:brightness-110 shadow"
                      >
                        Импортировать услуги с фото
                      </button>
                    </div>
                  </div>
                )}

                {importStatus === 'success' && (
                  <div className="bg-orange-950/30 border border-orange-500/40 p-4 rounded-xl flex items-center gap-2.5 text-xs text-orange-300">
                    <Check className="w-5 h-5 shrink-0 text-orange-500" />
                    <span>Прайс-лист и фотографии успешно импортированы и сохранены на сайте!</span>
                  </div>
                )}

                {/* Add/Edit Manual Service Form with Photo Upload & Presets */}
                <form onSubmit={handleSaveService} className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 space-y-4">
                  <h5 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-1.5">
                    <PlusCircle className="w-4 h-4 text-orange-500" />
                    {editingServiceId ? 'Редактировать услугу и фотографию' : 'Добавить новую услугу'}
                  </h5>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Название услуги *</label>
                      <input
                        type="text"
                        required
                        value={serviceForm.name || ''}
                        onChange={(e) => setServiceForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Например: Квест Игра в кальмара"
                        className="w-full bg-zinc-900 text-xs text-white border border-zinc-800 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-orange-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Категория *</label>
                      <input
                        type="text"
                        required
                        value={serviceForm.category || ''}
                        onChange={(e) => setServiceForm(prev => ({ ...prev, category: e.target.value }))}
                        placeholder="Основное, Шоу-программы..."
                        className="w-full bg-zinc-900 text-xs text-white border border-zinc-800 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-orange-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Цена (руб.) *</label>
                      <input
                        type="number"
                        required
                        value={serviceForm.price ?? ''}
                        onChange={(e) => setServiceForm(prev => ({ ...prev, price: Number(e.target.value) }))}
                        placeholder="5000"
                        className="w-full bg-zinc-900 text-xs text-white border border-zinc-800 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-orange-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Старая цена (опционально)</label>
                      <input
                        type="number"
                        value={serviceForm.oldPrice || ''}
                        onChange={(e) => setServiceForm(prev => ({ ...prev, oldPrice: e.target.value ? Number(e.target.value) : undefined }))}
                        placeholder="6500"
                        className="w-full bg-zinc-900 text-xs text-white border border-zinc-800 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-orange-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Описание услуги</label>
                      <input
                        type="text"
                        value={serviceForm.description || ''}
                        onChange={(e) => setServiceForm(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Расскажите подробнее о деталях и фишках услуги..."
                        className="w-full bg-zinc-900 text-xs text-white border border-zinc-800 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-orange-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Продолжительность</label>
                      <input
                        type="text"
                        value={serviceForm.duration || ''}
                        onChange={(e) => setServiceForm(prev => ({ ...prev, duration: e.target.value }))}
                        placeholder="Например: 2 часа"
                        className="w-full bg-zinc-900 text-xs text-white border border-zinc-800 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-orange-500"
                      />
                    </div>
                  </div>

                  {/* PHOTO UPLOAD & SELECTION BLOCK */}
                  <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <label className="text-[11px] font-black text-orange-400 uppercase tracking-wider flex items-center gap-1.5">
                        <ImageIcon className="w-4 h-4 text-orange-500" />
                        Фотография услуги (загрузите файл, вставьте ссылку или выберите готовую обложку)
                      </label>

                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          accept="image/*"
                          id="service-photo-upload"
                          className="hidden"
                          onChange={handleServiceImageUpload}
                        />
                        <label
                          htmlFor="service-photo-upload"
                          className="cursor-pointer bg-orange-600 hover:bg-orange-500 text-white text-[11px] font-extrabold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          {isUploadingServiceImg ? 'Загрузка...' : 'Загрузить фото с телефона / ПК'}
                        </label>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                      <div className="md:col-span-2 space-y-2">
                        <input
                          type="text"
                          value={serviceForm.image?.startsWith('data:image/') ? '' : (serviceForm.image || '')}
                          onChange={(e) => setServiceForm(prev => ({ ...prev, image: e.target.value }))}
                          placeholder="Или вставьте прямую ссылку на фото (https://...) — если пусто, подберется автоматически"
                          className="w-full bg-zinc-950 text-xs text-white border border-zinc-800 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500"
                        />

                        <div>
                          <span className="block text-[10px] font-bold text-zinc-400 mb-1.5">Быстрый выбор тематической обложки:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {SERVICE_PRESET_GALLERY.map((preset) => (
                              <button
                                key={preset.id}
                                type="button"
                                onClick={() => setServiceForm(prev => ({ ...prev, image: preset.url }))}
                                className={`text-[10px] font-bold px-2.5 py-1 rounded-md border transition-all cursor-pointer ${
                                  serviceForm.image === preset.url
                                    ? 'bg-orange-600 border-orange-500 text-white'
                                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                                }`}
                              >
                                {preset.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Live Preview of the Service Photo */}
                      <div className="flex items-center gap-3 bg-zinc-950 p-2.5 rounded-xl border border-zinc-800">
                        <img
                          src={resolveServiceImage(serviceForm)}
                          alt="Предпросмотр"
                          className="w-24 h-16 object-cover rounded-lg border border-zinc-700 shrink-0"
                        />
                        <div className="text-[10px] text-zinc-400 leading-tight">
                          <span className="font-bold text-white block mb-0.5">Превью карточки</span>
                          Эта картинка будет показана в каталоге услуг
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between flex-wrap gap-4 pt-2 border-t border-zinc-800">
                    <label className="flex items-center gap-2 text-xs font-bold text-zinc-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={serviceForm.isPopular || false}
                        onChange={(e) => setServiceForm(prev => ({ ...prev, isPopular: e.target.checked }))}
                        className="rounded border-zinc-800 text-orange-500 focus:ring-orange-500"
                      />
                      Отметить как «Хит продаж» 🔥
                    </label>

                    <div className="flex gap-2">
                      {editingServiceId && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingServiceId(null);
                            setServiceForm({ name: '', category: 'Основное', description: '', price: 0, image: '' });
                          }}
                          className="bg-zinc-900 border border-zinc-800 text-zinc-400 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer"
                        >
                          Отмена
                        </button>
                      )}
                      <button
                        type="submit"
                        className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-amber-500 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-lg cursor-pointer"
                      >
                        {editingServiceId ? 'Сохранить услугу и фото' : 'Создать услугу'}
                      </button>
                    </div>
                  </div>
                </form>

                {/* Services Table List with Photo Previews */}
                <div className="space-y-2">
                  <div className="text-xs font-black uppercase text-zinc-400 tracking-wider mb-2">
                    Список активных услуг на сайте ({localServices.length})
                  </div>
                  
                  {localServices.length === 0 ? (
                    <p className="text-sm text-zinc-500">Нет услуг. Добавьте первую!</p>
                  ) : (
                    <div className="space-y-2.5">
                      {localServices.map((srv, idx) => (
                        <div 
                          key={srv.id} 
                          className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <img
                              src={resolveServiceImage(srv, idx)}
                              alt={srv.name}
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src = getFallbackServiceImage(srv, idx);
                              }}
                              className="w-16 h-12 object-cover rounded-lg border border-zinc-800 shrink-0 bg-zinc-900"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
                                  {srv.category}
                                </span>
                                {srv.isPopular && (
                                  <span className="text-[9px] font-bold text-orange-400 bg-orange-950/40 border border-orange-500/30 px-1.5 py-0.5 rounded">
                                    ХИТ 🔥
                                  </span>
                                )}
                                <h6 className="text-xs font-extrabold text-white truncate">{srv.name}</h6>
                              </div>
                              <p className="text-[11px] text-zinc-400 mt-1 line-clamp-1">{srv.description}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 self-stretch sm:self-auto justify-between border-t sm:border-t-0 pt-2.5 sm:pt-0 border-zinc-900 shrink-0">
                            <span className="text-sm font-black text-orange-400 whitespace-nowrap tabular-nums">
                              {Number(srv.price || 0).toLocaleString('ru-RU')} ₽
                            </span>
                            
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleEditService(srv)}
                                className="w-8 h-8 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 flex items-center justify-center text-zinc-300 hover:text-orange-400 transition-colors cursor-pointer"
                                title="Редактировать услугу и фото"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteService(srv.id)}
                                className="w-8 h-8 rounded-lg bg-red-950/20 hover:bg-red-900 border border-red-900/30 flex items-center justify-center text-red-400 hover:text-white transition-colors cursor-pointer"
                                title="Удалить"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: Reviews Management */}
            {activeTab === 'reviews' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-black text-white uppercase tracking-wider mb-1">Управление отзывами</h4>
                  <p className="text-xs text-zinc-400">Добавляйте отзывы вручную, редактируйте оценки или удаляйте неактуальные.</p>
                </div>

                <form onSubmit={handleSaveReview} className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 space-y-4">
                  <h5 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-1.5">
                    <PlusCircle className="w-4 h-4 text-orange-500" />
                    {editingReviewId ? 'Редактировать отзыв' : 'Добавить отзыв вручную'}
                  </h5>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Имя автора</label>
                      <input
                        type="text"
                        required
                        value={reviewForm.author || ''}
                        onChange={(e) => setReviewForm(prev => ({ ...prev, author: e.target.value }))}
                        placeholder="Екатерина М."
                        className="w-full bg-zinc-900 text-xs text-white border border-zinc-800 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-orange-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Оценка (1-5)</label>
                      <select
                        value={reviewForm.rating || 5}
                        onChange={(e) => setReviewForm(prev => ({ ...prev, rating: Number(e.target.value) }))}
                        className="w-full bg-zinc-900 text-xs text-white border border-zinc-800 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-orange-500"
                      >
                        <option value={5}>⭐⭐⭐⭐⭐ (5 звезд)</option>
                        <option value={4}>⭐⭐⭐⭐ (4 звезды)</option>
                        <option value={3}>⭐⭐⭐ (3 звезды)</option>
                        <option value={2}>⭐⭐ (2 звезды)</option>
                        <option value={1}>⭐ (1 звезда)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Источник</label>
                      <select
                        value={reviewForm.source || 'manual'}
                        onChange={(e) => setReviewForm(prev => ({ ...prev, source: e.target.value as any }))}
                        className="w-full bg-zinc-900 text-xs text-white border border-zinc-800 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-orange-500"
                      >
                        <option value="yandex">Яндекс Карты</option>
                        <option value="vk">ВКонтакте</option>
                        <option value="manual">Сайт клуба</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Текст отзыва</label>
                    <textarea
                      required
                      value={reviewForm.text || ''}
                      onChange={(e) => setReviewForm(prev => ({ ...prev, text: e.target.value }))}
                      placeholder="Напишите текст отзыва здесь..."
                      rows={3}
                      className="w-full bg-zinc-900 text-xs text-white border border-zinc-800 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500 resize-none"
                    />
                  </div>

                  <div className="flex gap-2 justify-end pt-2 border-t border-zinc-800">
                    {editingReviewId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingReviewId(null);
                          setReviewForm({ author: '', rating: 5, text: '', source: 'manual' });
                        }}
                        className="bg-zinc-900 border border-zinc-800 text-zinc-400 px-4 py-2 rounded-lg text-xs font-bold transition-all"
                      >
                        Отмена
                      </button>
                    )}
                    <button
                      type="submit"
                      className="bg-orange-600 hover:bg-orange-500 text-white px-5 py-2 rounded-lg text-xs font-black shadow-lg cursor-pointer"
                    >
                      {editingReviewId ? 'Сохранить отзыв' : 'Создать отзыв'}
                    </button>
                  </div>
                </form>

                <div className="space-y-2">
                  <div className="text-xs font-black uppercase text-zinc-400 tracking-wider mb-2">Активные отзывы ({localReviews.length})</div>
                  {localReviews.map((rev) => (
                    <div 
                      key={rev.id} 
                      className="bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h6 className="text-xs font-extrabold text-white">{rev.author}</h6>
                          <span className="text-[10px] text-zinc-500">{rev.date}</span>
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-zinc-900 text-orange-400 border border-zinc-800">
                            {rev.source === 'yandex' ? 'Яндекс' : rev.source === 'vk' ? 'ВКонтакте' : 'Сайт'}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-300 mt-1.5 leading-relaxed">«{rev.text}»</p>
                      </div>

                      <div className="flex items-center gap-1.5 self-end sm:self-center">
                        <button
                          onClick={() => handleEditReview(rev)}
                          className="w-8 h-8 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteReview(rev.id)}
                          className="w-8 h-8 rounded-lg bg-red-950/20 hover:bg-red-900 border border-red-900/30 flex items-center justify-center text-red-400 hover:text-white transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 4: Contact Settings */}
            {activeTab === 'contacts' && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    await dbSaveContacts(localContacts);
                    showToast('Контакты и промо-бейдж сохранены на сайте!');
                  } catch (err) {
                    console.error(err);
                  }
                }}
                className="space-y-6"
              >
                <div>
                  <h4 className="text-sm font-black text-white uppercase tracking-wider mb-1">Редактор контактной информации</h4>
                  <p className="text-xs text-zinc-400">Обновите ваши номера телефонов, адрес, рабочие часы, промо-бейдж и ссылку на карту.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Номер телефона</label>
                    <input
                      type="text"
                      required
                      value={localContacts.phone}
                      onChange={(e) => setLocalContacts(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full bg-zinc-950 text-xs text-white border border-zinc-800 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Email для связи</label>
                    <input
                      type="email"
                      required
                      value={localContacts.email}
                      onChange={(e) => setLocalContacts(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full bg-zinc-950 text-xs text-white border border-zinc-800 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Физический Адрес полигонов</label>
                  <input
                    type="text"
                    required
                    value={localContacts.address}
                    onChange={(e) => setLocalContacts(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full bg-zinc-950 text-xs text-white border border-zinc-800 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Часы работы</label>
                  <input
                    type="text"
                    required
                    value={localContacts.workingHours}
                    onChange={(e) => setLocalContacts(prev => ({ ...prev, workingHours: e.target.value }))}
                    className="w-full bg-zinc-950 text-xs text-white border border-zinc-800 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Интерактивный виджет Яндекс Карт (Ссылка iframe)</label>
                  <input
                    type="text"
                    value={localContacts.yandexMapWidgetUrl}
                    onChange={(e) => setLocalContacts(prev => ({ ...prev, yandexMapWidgetUrl: e.target.value }))}
                    className="w-full bg-zinc-950 text-xs text-white border border-zinc-800 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Яндекс Метрика ID</label>
                    <input
                      type="text"
                      placeholder="Например: 95483210"
                      value={localContacts.yandexMetrikaId || ''}
                      onChange={(e) => setLocalContacts(prev => ({ ...prev, yandexMetrikaId: e.target.value }))}
                      className="w-full bg-zinc-950 text-xs text-white border border-zinc-800 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Текст промо-бейджа (на главном баннере)</label>
                    <input
                      type="text"
                      placeholder="Например: СКИДКА -15% НА ДЕНЬ РОЖДЕНИЯ В БУДНИ!"
                      value={localContacts.promoBadge || ''}
                      onChange={(e) => setLocalContacts(prev => ({ ...prev, promoBadge: e.target.value }))}
                      className="w-full bg-zinc-950 text-xs text-white border border-zinc-800 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="bg-orange-600 hover:bg-orange-500 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer"
                  >
                    Сохранить контакты
                  </button>
                </div>
              </form>
            )}

            {/* TAB 5: Reels / VK Clips Management */}
            {activeTab === 'reels' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-black text-white uppercase tracking-wider mb-1">Менеджер VK Клипов и Reels</h4>
                  <p className="text-xs text-zinc-400">
                    Вставьте любую ссылку на VK Клип (например, <span className="text-orange-400 font-mono">https://vk.com/clip-123456_789012</span>, <span className="text-orange-400 font-mono">https://vkvideo.ru/clip...</span> или код вставки iframe) — плеер ВКонтакте и превью-обложка подключатся автоматически!
                  </p>
                </div>

                {/* Form to Add / Edit Reel */}
                <form onSubmit={handleSaveReelForm} className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 space-y-4">
                  <h5 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Video className="w-4 h-4 text-orange-500" />
                    {editingReelId ? 'Редактировать VK Клип / Ролик' : 'Добавить новый VK Клип / Reels'}
                  </h5>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-wider mb-1">Название ролика *</label>
                      <input
                        type="text"
                        required
                        value={reelForm.title || ''}
                        onChange={(e) => setReelForm(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Эмоции именинника на полигоне! 🔥"
                        className="w-full bg-zinc-900 text-xs text-white border border-zinc-800 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-wider mb-1">Ссылка на VK Клип / Видео ролик *</label>
                      <input
                        type="text"
                        required
                        value={reelForm.videoUrl || ''}
                        onChange={(e) => setReelForm(prev => ({ ...prev, videoUrl: e.target.value }))}
                        placeholder="https://vk.com/clip-123456_78910 или код iframe"
                        className="w-full bg-zinc-900 text-xs text-white border border-zinc-800 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-orange-500"
                      />
                      {reelForm.videoUrl && (
                        <div className="mt-1.5 text-[10px] font-bold flex items-center gap-1.5">
                          {parsedReelPreview.type === 'vk' ? (
                            <span className="text-orange-400">
                              ✓ Распознан VK Клип {parsedReelPreview.clipKey ? `(ID: ${parsedReelPreview.clipKey})` : ''} — встроенный плеер подключен
                            </span>
                          ) : parsedReelPreview.type === 'youtube' || parsedReelPreview.type === 'rutube' ? (
                            <span className="text-orange-400">
                              ✓ Распознан {parsedReelPreview.label} — встроенный плеер подключен
                            </span>
                          ) : (
                            <span className="text-zinc-400">
                              Формат ссылки: {parsedReelPreview.label}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-wider mb-1">Тег / Категория</label>
                      <select
                        value={reelForm.tag || 'Общее'}
                        onChange={(e) => setReelForm(prev => ({ ...prev, tag: e.target.value }))}
                        className="w-full bg-zinc-900 text-xs text-white border border-zinc-800 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-orange-500"
                      >
                        <option value="Общее">Общее</option>
                        <option value="День рождения">День рождения</option>
                        <option value="Корпоратив">Корпоратив</option>
                        <option value="Атмосфера">Атмосфера</option>
                        <option value="Отзывы">Отзывы</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-wider mb-1">Длительность</label>
                      <input
                        type="text"
                        value={reelForm.duration || '0:15'}
                        onChange={(e) => setReelForm(prev => ({ ...prev, duration: e.target.value }))}
                        className="w-full bg-zinc-900 text-xs text-white border border-zinc-800 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-wider mb-1">Просмотры (например 4.2K)</label>
                      <input
                        type="text"
                        value={reelForm.plays || '1.5K'}
                        onChange={(e) => setReelForm(prev => ({ ...prev, plays: e.target.value }))}
                        className="w-full bg-zinc-900 text-xs text-white border border-zinc-800 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-orange-500"
                      />
                    </div>
                  </div>

                  {/* Cover / Preview Image Picker for VK Clip */}
                  <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <label className="text-[11px] font-black text-orange-400 uppercase tracking-wider flex items-center gap-1.5">
                        <ImageIcon className="w-4 h-4 text-orange-500" />
                        Превью-обложка клипа (загрузите фото, выберите шаблон или оставьте пустым для авто-обложки)
                      </label>

                      <div>
                        <input
                          type="file"
                          accept="image/*"
                          id="reel-cover-upload"
                          className="hidden"
                          onChange={handleReelCoverUpload}
                        />
                        <label
                          htmlFor="reel-cover-upload"
                          className="cursor-pointer bg-orange-600 hover:bg-orange-500 text-white text-[11px] font-extrabold px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 transition-colors"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          {isUploadingReelThumb ? 'Загрузка...' : 'Загрузить обложку с телефона / ПК'}
                        </label>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                      <div className="md:col-span-2 space-y-2">
                        <input
                          type="text"
                          value={reelForm.thumbnailUrl?.startsWith('data:image/') ? '' : (reelForm.thumbnailUrl || '')}
                          onChange={(e) => setReelForm(prev => ({ ...prev, thumbnailUrl: e.target.value }))}
                          placeholder="Или вставьте ссылку на картинку обложки (https://...) — если пусто, создается фирменная обложка"
                          className="w-full bg-zinc-950 text-xs text-white border border-zinc-800 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500"
                        />

                        <div className="flex flex-wrap gap-1.5 items-center">
                          <span className="text-[10px] font-bold text-zinc-400 mr-1">Фирменные обложки:</span>
                          {REEL_PRESET_COVERS.map((preset) => (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() => setReelForm(prev => ({ ...prev, thumbnailUrl: preset.url }))}
                              className={`text-[10px] font-bold px-2.5 py-1 rounded-md border transition-all cursor-pointer ${
                                reelForm.thumbnailUrl === preset.url
                                  ? 'bg-orange-600 border-orange-500 text-white'
                                  : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                              }`}
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Live Vertical Cover Preview */}
                      <div className="flex items-center gap-3 bg-zinc-950 p-2.5 rounded-xl border border-zinc-800">
                        <img
                          src={resolveReelThumbnail(reelForm)}
                          alt="Превью клипа"
                          className="w-14 h-20 object-cover rounded-lg border border-zinc-700 shrink-0"
                        />
                        <div className="text-[10px] text-zinc-400 leading-tight">
                          <span className="font-bold text-white block mb-0.5">Превью на сайте</span>
                          Вертикальная карточка клипа 9:16
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    {editingReelId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingReelId(null);
                          setReelForm({ title: '', videoUrl: '', thumbnailUrl: '', likes: 120, plays: '1.5K', duration: '0:15', tag: 'Общее' });
                        }}
                        className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        Отмена
                      </button>
                    )}
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-amber-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-lg cursor-pointer"
                    >
                      <PlusCircle className="w-4 h-4" />
                      {editingReelId ? 'Сохранить клип на сайте' : 'Добавить клип на сайт'}
                    </button>
                  </div>
                </form>

                {/* Reels list grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {localReels.map((rl, idx) => {
                    const parsed = parseVideoSource(rl.videoUrl);
                    return (
                      <div key={rl.id} className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="relative w-16 h-24 bg-zinc-900 rounded-lg overflow-hidden border border-zinc-800 shrink-0">
                            <img
                              src={resolveReelThumbnail(rl, idx)}
                              alt={rl.title}
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src = getFallbackReelCover(rl, idx);
                              }}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                              <Play className="w-4 h-4 text-white fill-white" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h6 className="text-xs font-bold text-white truncate">{rl.title}</h6>
                            <p className="text-[10px] text-zinc-500 truncate mt-0.5">{rl.videoUrl}</p>
                            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                              <span className="inline-block text-[9px] font-black uppercase tracking-wider bg-orange-500/15 border border-orange-500/30 text-orange-400 px-1.5 py-0.5 rounded">
                                {rl.tag}
                              </span>
                              <span className="inline-block text-[9px] font-bold bg-zinc-900 border border-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded">
                                {parsed.label}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between border-t border-zinc-800/80 pt-3">
                          <span className="text-[10px] text-zinc-400 font-mono">Длительность: {rl.duration}</span>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleEditReel(rl)}
                              className="w-7 h-7 rounded bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 flex items-center justify-center text-zinc-300 hover:text-orange-400 transition-all cursor-pointer"
                              title="Редактировать"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteReel(rl.id)}
                              className="w-7 h-7 rounded bg-red-950/20 border border-red-900/30 hover:bg-red-900 flex items-center justify-center text-red-400 hover:text-white transition-all cursor-pointer"
                              title="Удалить"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 6: Leads / Booking Form Submissions organizer */}
            {activeTab === 'leads' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-black text-white uppercase tracking-wider mb-1">Менеджер заявок и праздников</h4>
                    <p className="text-xs text-zinc-400">Просматривайте, фильтруйте, обновляйте статус обработки и выгружайте входящие заявки в Excel.</p>
                  </div>
                  <button
                    onClick={handleExportLeadsToExcel}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold transition-all self-start sm:self-center cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    Экспорт в Excel
                  </button>
                </div>

                {/* Filters */}
                <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
                  <div className="w-full md:w-72">
                    <input
                      type="text"
                      placeholder="Поиск по имени или телефону..."
                      value={leadsSearchQuery}
                      onChange={(e) => setLeadsSearchQuery(e.target.value)}
                      className="w-full bg-zinc-900 text-xs text-white border border-zinc-800 rounded-lg px-3.5 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto shrink-0 select-none pb-2 md:pb-0">
                    {(['all', 'new', 'processing', 'completed', 'canceled'] as const).map((status) => (
                      <button
                        key={status}
                        onClick={() => setLeadsStatusFilter(status)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border cursor-pointer ${
                          leadsStatusFilter === status
                            ? 'bg-orange-600 text-white border-orange-500'
                            : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                        }`}
                      >
                        {status === 'all' ? 'Все' : 
                         status === 'new' ? 'Новые' : 
                         status === 'processing' ? 'В обработке' : 
                         status === 'completed' ? 'Завершены' : 'Отменены'}
                      </button>
                    ))}
                  </div>
                </div>

                {isLoadingLeads ? (
                  <div className="py-12 text-center text-zinc-400 flex items-center justify-center gap-2">
                    <RefreshCw className="w-5 h-5 animate-spin text-orange-500" />
                    Загрузка актуальных заявок...
                  </div>
                ) : localLeads.length === 0 ? (
                  <div className="py-12 text-center text-zinc-500 bg-zinc-950/50 border border-zinc-800 rounded-2xl">
                    <Calendar className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                    Нет заявок, подходящих под критерии поиска.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {localLeads
                      .filter(l => {
                        const q = leadsSearchQuery.toLowerCase();
                        const matchesSearch = l.name.toLowerCase().includes(q) || l.phone.includes(q);
                        const matchesFilter = leadsStatusFilter === 'all' || l.status === leadsStatusFilter;
                        return matchesSearch && matchesFilter;
                      })
                      .map((l) => (
                        <div 
                          key={l.id} 
                          className={`bg-zinc-950 border rounded-2xl p-5 transition-all ${
                            l.status === 'new' ? 'border-orange-500/40' : 'border-zinc-800'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800/60 mb-4">
                            <div className="flex items-center gap-2">
                              <h5 className="text-sm font-black text-white">{l.name}</h5>
                              <span className="text-[10px] text-zinc-500 font-mono">
                                от {new Date(l.createdAt).toLocaleDateString('ru-RU')} в {new Date(l.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <select
                                value={l.status}
                                onChange={(e) => handleUpdateLeadStatus(l.id, e.target.value as any)}
                                className={`text-[10px] font-black uppercase tracking-wider rounded-lg px-2.5 py-1.5 border bg-zinc-900 focus:outline-none cursor-pointer ${
                                  l.status === 'new' ? 'text-orange-400 border-orange-500/40' :
                                  l.status === 'processing' ? 'text-amber-400 border-amber-500/30' :
                                  l.status === 'completed' ? 'text-emerald-400 border-emerald-500/30' :
                                  'text-zinc-500 border-zinc-800'
                                }`}
                              >
                                <option value="new">Новая</option>
                                <option value="processing">В обработке</option>
                                <option value="completed">Завершена</option>
                                <option value="canceled">Отменена</option>
                              </select>

                              <button
                                onClick={() => handleDeleteLead(l.id)}
                                className="w-8 h-8 rounded-lg bg-red-950/20 border border-red-900/30 flex items-center justify-center text-red-400 hover:text-white transition-all hover:bg-red-900 cursor-pointer"
                                title="Удалить заявку"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div>
                              <span className="block text-[9px] font-black text-zinc-500 uppercase tracking-wider mb-1">Номер телефона</span>
                              <a href={`tel:${l.phone}`} className="text-xs font-bold text-white hover:text-orange-400 transition-colors flex items-center gap-1.5 font-mono">
                                <Phone className="w-3.5 h-3.5 text-orange-500" />
                                {l.phone}
                              </a>
                            </div>

                            <div>
                              <span className="block text-[9px] font-black text-zinc-500 uppercase tracking-wider mb-1">Выбранная Дата</span>
                              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                                {new Date(l.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                              </div>
                            </div>

                            <div>
                              <span className="block text-[9px] font-black text-zinc-500 uppercase tracking-wider mb-1">Кол-во игроков</span>
                              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                                <Users className="w-3.5 h-3.5 text-zinc-400" />
                                {l.guests} человек
                              </div>
                            </div>

                            <div>
                              <span className="block text-[9px] font-black text-zinc-500 uppercase tracking-wider mb-1">Пакет / Бюджет</span>
                              <div className="text-xs font-bold text-orange-400">
                                {l.packageName ? `${l.packageName} (${l.packagePrice} ₽)` : 'Общий расчет'}
                              </div>
                            </div>
                          </div>

                          {l.comment && (
                            <div className="mt-4 bg-zinc-900/60 border border-zinc-800 p-3 rounded-xl">
                              <span className="block text-[9px] font-black text-zinc-500 uppercase tracking-wider mb-1">Комментарий:</span>
                              <p className="text-xs text-zinc-300 leading-relaxed">«{l.comment}»</p>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}
