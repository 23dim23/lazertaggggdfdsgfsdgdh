import React, { useState, useEffect } from 'react';
import { 
  Lock, Settings, Eye, EyeOff, Edit, Plus, Trash2, FileSpreadsheet, Check, 
  X, AlertCircle, Save, PlusCircle, RefreshCw, Upload, Sparkles, MapPin, MessageSquare,
  Play, Video, Calendar, Clock, User, Phone, Users, CheckCircle2, AlertTriangle, FileDown, Download
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Section, Service, Review, ContactInfo, AdminSettings, Reel, Lead } from '../types';
import { getLeads, saveLead, deleteLead } from '../lib/db';

interface AdminPanelProps {
  settings: AdminSettings;
  onSaveSettings: (newSettings: AdminSettings, newSections?: Section[], newReels?: Reel[]) => void;
  sections: Section[];
  onSaveSections: (newSections: Section[]) => void;
  reels: Reel[];
  onClose: () => void;
}

export default function AdminPanel({ 
  settings, 
  onSaveSettings, 
  sections, 
  onSaveSections, 
  reels,
  onClose 
}: AdminPanelProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const session = localStorage.getItem('admin_session');
    if (session === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const [activeTab, setActiveTab] = useState<'sections' | 'services' | 'reviews' | 'contacts' | 'leads' | 'reels'>('sections');

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
  });
  const [importStatus, setImportStatus] = useState<'idle' | 'previewing' | 'success' | 'error'>('idle');

  // Local editable copies
  const [localServices, setLocalServices] = useState<Service[]>([...settings.services]);
  const [localReviews, setLocalReviews] = useState<Review[]>([...settings.reviews]);
  const [localContacts, setLocalContacts] = useState<ContactInfo>({ ...settings.contacts });
  const [localSections, setLocalSections] = useState<Section[]>([...sections]);
  const [localReels, setLocalReels] = useState<Reel[]>([...reels]);
  const [localLeads, setLocalLeads] = useState<Lead[]>([]);
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);

  // Form states for adding/editing sections, services, reviews, reels, leads
  const [showSectionAddForm, setShowSectionAddForm] = useState(false);
  const [sectionForm, setSectionForm] = useState<Partial<Section>>({
    id: '', title: '', heroTitle: '', heroSubtitle: '', description: '', contentMarkdown: '', isActive: false
  });

  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [serviceForm, setServiceForm] = useState<Partial<Service>>({
    name: '', category: 'Основное', description: '', price: 0, oldPrice: undefined, duration: '', availability: ''
  });

  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [reviewForm, setReviewForm] = useState<Partial<Review>>({
    author: '', rating: 5, text: '', source: 'manual'
  });

  const [editingReelId, setEditingReelId] = useState<string | null>(null);
  const [reelForm, setReelForm] = useState<Partial<Reel>>({
    title: '', videoUrl: '', thumbnailUrl: '', likes: 0, plays: '0', duration: '0:15', tag: 'Общее'
  });

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
  const toggleSectionActive = (id: string) => {
    setLocalSections(prev => prev.map(sec => 
      sec.id === id ? { ...sec, isActive: !sec.isActive } : sec
    ));
  };

  // Save edits of a section text
  const handleSectionTextChange = (id: string, field: keyof Section, value: string) => {
    setLocalSections(prev => prev.map(sec => 
      sec.id === id ? { ...sec, [field]: value } : sec
    ));
  };

  // Add a new custom website section
  const handleAddSection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sectionForm.id || !sectionForm.title) {
      alert('Заполните ID раздела и заголовок вкладки!');
      return;
    }

    const cleanId = sectionForm.id.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '');
    if (cleanId === 'home') {
      alert('Идентификатор "home" зарезервирован.');
      return;
    }
    if (localSections.some(sec => sec.id === cleanId)) {
      alert('Раздел с таким идентификатором уже существует!');
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

    setLocalSections(prev => [...prev, newSec]);
    setSectionForm({
      id: '', title: '', heroTitle: '', heroSubtitle: '', description: '', contentMarkdown: '', isActive: false
    });
    setShowSectionAddForm(false);
  };

  // Delete a website section
  const handleDeleteSection = (id: string) => {
    if (id === 'home') {
      alert('Нельзя удалить главную страницу!');
      return;
    }
    if (window.confirm(`Вы действительно хотите безвозвратно удалить раздел "${id}" с сайта?`)) {
      setLocalSections(prev => prev.filter(sec => sec.id !== id));
    }
  };

  // Reels / VK Clips helper handlers
  const handleSaveReelForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reelForm.title || !reelForm.videoUrl) {
      alert('Заполните название и укажите ссылку на видео!');
      return;
    }

    let defaultThumb = reelForm.thumbnailUrl;
    if (!defaultThumb) {
      defaultThumb = 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&q=80&w=300';
    }

    if (editingReelId) {
      setLocalReels(prev => prev.map(rl => 
        rl.id === editingReelId ? {
          ...rl,
          title: reelForm.title || '',
          videoUrl: reelForm.videoUrl || '',
          thumbnailUrl: defaultThumb || '',
          likes: reelForm.likes || 0,
          plays: reelForm.plays || '0',
          duration: reelForm.duration || '0:15',
          tag: reelForm.tag || 'Общее'
        } : rl
      ));
      setEditingReelId(null);
    } else {
      const newReel: Reel = {
        id: 'reel_' + Date.now(),
        title: reelForm.title,
        videoUrl: reelForm.videoUrl,
        thumbnailUrl: defaultThumb,
        likes: reelForm.likes || 0,
        plays: reelForm.plays || '0',
        duration: reelForm.duration || '0:15',
        tag: reelForm.tag || 'Общее'
      };
      setLocalReels(prev => [...prev, newReel]);
    }

    setReelForm({ title: '', videoUrl: '', thumbnailUrl: '', likes: 0, plays: '0', duration: '0:15', tag: 'Общее' });
  };

  const handleEditReel = (reel: Reel) => {
    setEditingReelId(reel.id);
    setReelForm(reel);
  };

  const handleDeleteReel = (id: string) => {
    if (window.confirm('Удалить этот видео-клип?')) {
      setLocalReels(prev => prev.filter(r => r.id !== id));
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
    } catch (err) {
      console.error('Failed to update lead status in Firestore:', err);
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    if (window.confirm('Вы действительно хотите навсегда удалить эту заявку?')) {
      setLocalLeads(prev => prev.filter(l => l.id !== leadId));
      try {
        await deleteLead(leadId);
      } catch (err) {
        console.error('Failed to delete lead from Firestore:', err);
      }
    }
  };

  const handleExportLeadsToExcel = () => {
    if (localLeads.length === 0) {
      alert('Нет заявок для экспорта!');
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

          // Propose smart mappings based on typical Yandex Map Excel export fields
          const mapping = {
            category: headers.find(h => /категор|раздел/i.test(h)) || '',
            name: headers.find(h => /назван|услуг|товар|имя/i.test(h)) || '',
            description: headers.find(h => /опис|информ/i.test(h)) || '',
            price: headers.find(h => /цен|стоим/i.test(h)) || '',
            oldPrice: headers.find(h => /скидк|стар/i.test(h)) || '',
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

  // Process mapping and import parsed services
  const processExcelImport = () => {
    if (!excelData || excelData.length <= 1) return;

    const headers = excelHeaders;
    const catIdx = headers.indexOf(columnMapping.category);
    const nameIdx = headers.indexOf(columnMapping.name);
    const descIdx = headers.indexOf(columnMapping.description);
    const priceIdx = headers.indexOf(columnMapping.price);
    const oldPriceIdx = headers.indexOf(columnMapping.oldPrice);

    if (nameIdx === -1 || priceIdx === -1) {
      alert('Необходимо сопоставить как минимум "Название" и "Цену" услуги!');
      return;
    }

    const importedServices: Service[] = [];

    // Skip the first header row
    for (let i = 1; i < excelData.length; i++) {
      const row = excelData[i];
      if (!row || row.length === 0) continue;

      const name = String(row[nameIdx] || '').trim();
      const priceVal = parseFloat(String(row[priceIdx] || '').replace(/[^\d.]/g, ''));
      
      if (!name || isNaN(priceVal)) continue;

      const category = catIdx !== -1 && row[catIdx] ? String(row[catIdx]).trim() : 'Импортированные';
      const description = descIdx !== -1 && row[descIdx] ? String(row[descIdx]).trim() : 'Описание отсутствует';
      const oldPriceVal = oldPriceIdx !== -1 && row[oldPriceIdx] 
        ? parseFloat(String(row[oldPriceIdx]).replace(/[^\d.]/g, '')) 
        : undefined;

      importedServices.push({
        id: `srv-excel-${Date.now()}-${i}`,
        category,
        name,
        description,
        price: priceVal,
        oldPrice: isNaN(oldPriceVal || NaN) ? undefined : oldPriceVal,
        availability: 'Доступно',
        isPopular: false
      });
    }

    if (importedServices.length > 0) {
      setLocalServices(prev => [...prev, ...importedServices]);
      setImportStatus('success');
      setExcelFile(null);
      setExcelData(null);
    } else {
      alert('Не удалось импортировать ни одной услуги. Проверьте правильность сопоставления колонок.');
    }
  };

  // Manage Service Form Submit
  const handleSaveService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceForm.name || !serviceForm.price) return;

    if (editingServiceId) {
      setLocalServices(prev => prev.map(s => 
        s.id === editingServiceId ? { ...s, ...serviceForm } as Service : s
      ));
      setEditingServiceId(null);
    } else {
      const newService: Service = {
        id: `srv-manual-${Date.now()}`,
        category: serviceForm.category || 'Основное',
        name: serviceForm.name,
        description: serviceForm.description || '',
        price: Number(serviceForm.price),
        oldPrice: serviceForm.oldPrice ? Number(serviceForm.oldPrice) : undefined,
        duration: serviceForm.duration,
        availability: serviceForm.availability || 'Доступно',
        isPopular: serviceForm.isPopular || false
      };
      setLocalServices(prev => [...prev, newService]);
    }

    setServiceForm({
      name: '', category: 'Основное', description: '', price: 0, oldPrice: undefined, duration: '', availability: ''
    });
  };

  const handleEditService = (srv: Service) => {
    setEditingServiceId(srv.id);
    setServiceForm(srv);
  };

  const handleDeleteService = (id: string) => {
    if (window.confirm('Вы действительно хотите удалить эту услугу?')) {
      setLocalServices(prev => prev.filter(s => s.id !== id));
    }
  };

  // Manage Review Form Submit
  const handleSaveReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewForm.author || !reviewForm.text) return;

    if (editingReviewId) {
      setLocalReviews(prev => prev.map(r => 
        r.id === editingReviewId ? { ...r, ...reviewForm } as Review : r
      ));
      setEditingReviewId(null);
    } else {
      const newReview: Review = {
        id: `rev-manual-${Date.now()}`,
        author: reviewForm.author,
        date: new Date().toLocaleDateString('ru-RU'),
        rating: Number(reviewForm.rating || 5),
        text: reviewForm.text,
        source: reviewForm.source || 'manual',
        avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100'
      };
      setLocalReviews(prev => [...prev, newReview]);
    }

    setReviewForm({ author: '', rating: 5, text: '', source: 'manual' });
  };

  const handleEditReview = (rev: Review) => {
    setEditingReviewId(rev.id);
    setReviewForm(rev);
  };

  const handleDeleteReview = (id: string) => {
    if (window.confirm('Удалить этот отзыв?')) {
      setLocalReviews(prev => prev.filter(r => r.id !== id));
    }
  };

  // Save all changes to the main parent state & localStorage
  const handleSaveAll = () => {
    // Save sections state
    onSaveSections(localSections);

    // Save admin settings state
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
    alert('Все изменения сохранены успешно! Превью сайта обновлено.');
    onClose();
  };

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4">
        <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-2xl relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-cyan-500/20 border border-cyan-500 text-cyan-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-extrabold text-white">Панель управления клубом</h3>
            <p className="text-xs text-zinc-500 mt-1">Введите пароль для редактирования разделов и услуг</p>
          </div>

          <div className="space-y-4">
            {/* Password Login Option */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Пароль администратора</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Введите пароль..."
                  className="w-full bg-zinc-950 text-white text-xs border border-zinc-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
                <span className="block text-[10px] text-zinc-500 mt-2 leading-relaxed text-center">
                  * Введите верный пароль для включения режима редактирования.
                </span>
              </div>

              {errorMsg && (
                <div className="flex items-start gap-2 text-xs text-rose-400 bg-rose-950/20 border border-rose-900/40 p-3 rounded-lg">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="whitespace-pre-line text-left">{errorMsg}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold py-3 rounded-xl transition-all shadow-md text-xs uppercase tracking-wider"
              >
                Войти в админку
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex bg-black/95 backdrop-blur-md p-4 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-6xl bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col h-[90vh] shadow-2xl overflow-hidden self-center mx-auto">
        
        {/* Admin Header */}
        <div className="p-4 sm:p-6 bg-zinc-950 border-b border-zinc-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cyan-500 text-black font-black rounded-lg flex items-center justify-center shrink-0">
              АД
            </div>
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                Панель управления
                <span className="text-[9px] bg-cyan-950/50 text-cyan-400 px-2 py-0.5 border border-cyan-800/40 rounded uppercase font-black">
                  ОБЛАКО
                </span>
              </h3>
              <p className="text-xs text-zinc-400">
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 " />
                  Режим редактирования (Синхронизация с Firestore)
                </span>
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
              className="bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 hover:text-white px-3.5 py-2.5 rounded-xl font-bold transition-all"
            >
              Выйти
            </button>
            <button
              onClick={onClose}
              className="bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all"
            >
              Закрыть
            </button>
            <button
              onClick={handleSaveAll}
              className="bg-gradient-to-r from-cyan-500 to-emerald-500 text-black px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 hover:brightness-110 transition-all shadow-md shadow-cyan-950/40"
            >
              <Save className="w-4 h-4" />
              Применить изменения
            </button>
          </div>
        </div>

        {/* Inner layout split */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Admin Sidebar Navigation */}
          <div className="w-full md:w-[220px] bg-zinc-950/40 md:border-r border-zinc-800 p-4 flex flex-row md:flex-col gap-1.5 overflow-x-auto shrink-0">
            <button
              onClick={() => setActiveTab('sections')}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shrink-0 ${
                activeTab === 'sections' 
                  ? 'bg-cyan-500 text-black' 
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              <Settings className="w-4 h-4" />
              Разделы сайта ({localSections.length})
            </button>

            <button
              onClick={() => setActiveTab('services')}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shrink-0 ${
                activeTab === 'services' 
                  ? 'bg-cyan-500 text-black' 
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              Услуги ({localServices.length})
            </button>

            <button
              onClick={() => setActiveTab('reviews')}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shrink-0 ${
                activeTab === 'reviews' 
                  ? 'bg-cyan-500 text-black' 
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              Отзывы ({localReviews.length})
            </button>

            <button
              onClick={() => setActiveTab('contacts')}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shrink-0 ${
                activeTab === 'contacts' 
                  ? 'bg-cyan-500 text-black' 
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              <MapPin className="w-4 h-4" />
              Контакты и Карта
            </button>

            <button
              onClick={() => setActiveTab('reels')}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shrink-0 ${
                activeTab === 'reels' 
                  ? 'bg-cyan-500 text-black' 
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              <Video className="w-4 h-4" />
              VK Клипы ({localReels.length})
            </button>

            <button
              onClick={() => setActiveTab('leads')}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shrink-0 ${
                activeTab === 'leads' 
                  ? 'bg-cyan-500 text-black' 
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              <Calendar className="w-4 h-4" />
              Заявки ({localLeads.length})
            </button>
          </div>

          {/* Admin Content Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-zinc-900/20">
            
            {/* TAB 1: Sections Content & Visibility */}
            {activeTab === 'sections' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-black text-white uppercase tracking-wider mb-1">Редактор разделов главной страницы</h4>
                    <p className="text-xs text-zinc-500">Включайте и выключайте разделы, редактируйте тексты и наполняйте страницы в тени перед публикацией.</p>
                  </div>
                  <button
                    onClick={() => setShowSectionAddForm(!showSectionAddForm)}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black rounded-xl text-xs font-bold transition-all shadow-lg shadow-cyan-500/10 self-start sm:self-center"
                  >
                    <Plus className="w-4 h-4" />
                    Создать раздел
                  </button>
                </div>

                {/* Add Section Form dropdown */}
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
                        <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-wider mb-1">Уникальный ID (на латинице, например: corporativy)</label>
                        <input
                          type="text"
                          required
                          value={sectionForm.id || ''}
                          onChange={(e) => setSectionForm(prev => ({ ...prev, id: e.target.value }))}
                          placeholder="corporates"
                          className="w-full bg-zinc-900 text-xs text-white border border-zinc-800 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-wider mb-1">Заголовок во вкладке навигации</label>
                        <input
                          type="text"
                          required
                          value={sectionForm.title || ''}
                          onChange={(e) => setSectionForm(prev => ({ ...prev, title: e.target.value }))}
                          placeholder="Корпоративы"
                          className="w-full bg-zinc-900 text-xs text-white border border-zinc-800 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-wider mb-1">Главный заголовок (Hero Title)</label>
                        <input
                          type="text"
                          value={sectionForm.heroTitle || ''}
                          onChange={(e) => setSectionForm(prev => ({ ...prev, heroTitle: e.target.value }))}
                          placeholder="Лучшие лазертаг-игры для компаний!"
                          className="w-full bg-zinc-900 text-xs text-white border border-zinc-800 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-wider mb-1">Подзаголовок (Hero Subtitle)</label>
                        <input
                          type="text"
                          value={sectionForm.heroSubtitle || ''}
                          onChange={(e) => setSectionForm(prev => ({ ...prev, heroSubtitle: e.target.value }))}
                          placeholder="Корпоратив, который запомнится навсегда..."
                          className="w-full bg-zinc-900 text-xs text-white border border-zinc-800 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-wider mb-1">Основное наполнение страницы (Текст)</label>
                      <textarea
                        value={sectionForm.description || ''}
                        onChange={(e) => setSectionForm(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Опишите мероприятие, условия проведения, доступность и общие правила проведения..."
                        rows={3}
                        className="w-full bg-zinc-900 text-xs text-white border border-zinc-800 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-cyan-500 resize-none"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <input
                        type="checkbox"
                        id="new-section-isactive"
                        checked={sectionForm.isActive || false}
                        onChange={(e) => setSectionForm(prev => ({ ...prev, isActive: e.target.checked }))}
                        className="rounded border-zinc-850 bg-zinc-900 text-cyan-500 focus:ring-0 focus:ring-offset-0 h-4 w-4"
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
                        className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black rounded-xl text-xs font-bold transition-all"
                      >
                        Создать раздел
                      </button>
                    </div>
                  </form>
                )}

                <div className="space-y-4">
                  {localSections.map((sec) => (
                    <div key={sec.id} className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5">
                      <div className="flex items-center justify-between mb-4 pb-4 border-b border-zinc-800">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-black text-cyan-400 uppercase tracking-widest bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded">
                            {sec.id.toUpperCase()}
                          </span>
                          <h5 className="text-sm font-black text-white">{sec.title}</h5>
                          {sec.id !== 'home' && (
                            <button
                              onClick={() => handleDeleteSection(sec.id)}
                              className="text-zinc-500 hover:text-red-400 p-1 rounded-lg hover:bg-zinc-850 transition-all ml-1"
                              title="Удалить этот раздел"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Visibility controller */}
                        <button
                          onClick={() => toggleSectionActive(sec.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all ${
                            sec.isActive
                              ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30 hover:bg-emerald-950/60'
                              : 'bg-zinc-950 text-zinc-500 border-zinc-850 hover:bg-zinc-900'
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
                              Скрыт (в тени)
                            </>
                          )}
                        </button>
                      </div>

                      {/* Editing fields */}
                      <div className="space-y-3.5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-wider mb-1">Заголовок страницы (Hero Title)</label>
                            <input
                              type="text"
                              value={sec.heroTitle || ''}
                              onChange={(e) => handleSectionTextChange(sec.id, 'heroTitle', e.target.value)}
                              className="w-full bg-zinc-950 text-xs text-white border border-zinc-800 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-wider mb-1">Вкладка в навигации</label>
                            <input
                              type="text"
                              value={sec.title || ''}
                              onChange={(e) => handleSectionTextChange(sec.id, 'title', e.target.value)}
                              className="w-full bg-zinc-950 text-xs text-white border border-zinc-800 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-wider mb-1">Краткое описание (Hero Subtitle)</label>
                          <textarea
                            value={sec.heroSubtitle || ''}
                            onChange={(e) => handleSectionTextChange(sec.id, 'heroSubtitle', e.target.value)}
                            rows={2}
                            className="w-full bg-zinc-950 text-xs text-white border border-zinc-800 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-cyan-500 resize-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-wider mb-1">Основное текстовое наполнение</label>
                          <textarea
                            value={sec.description || ''}
                            onChange={(e) => handleSectionTextChange(sec.id, 'description', e.target.value)}
                            rows={3}
                            className="w-full bg-zinc-950 text-xs text-white border border-zinc-800 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-cyan-500 resize-none"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 2: Services Management + Excel Importer */}
            {activeTab === 'services' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h4 className="text-sm font-black text-white uppercase tracking-wider mb-1">Управление каталогом услуг</h4>
                    <p className="text-xs text-zinc-500">Добавляйте услуги вручную или импортируйте прайс-лист Excel из личного кабинета Яндекс Бизнеса.</p>
                  </div>

                  <div className="relative self-stretch sm:self-auto">
                    <input
                      type="file"
                      accept=".xlsx, .xls, .csv"
                      id="excel-file-uploader"
                      className="hidden"
                      onChange={handleExcelFileChange}
                    />
                    <label
                      htmlFor="excel-file-uploader"
                      className="cursor-pointer flex items-center justify-center gap-1.5 bg-zinc-950 border border-zinc-800 hover:border-cyan-500 hover:text-cyan-400 px-4 py-2.5 rounded-xl text-xs font-bold text-white transition-all"
                    >
                      <Upload className="w-4 h-4 text-cyan-400" />
                      Импорт из Excel Яндекс Карт
                    </label>
                  </div>
                </div>

                {/* Excel Import Preview Window */}
                {importStatus === 'previewing' && excelData && (
                  <div className="bg-zinc-950 border border-cyan-500/30 p-5 rounded-2xl space-y-4">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-black text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 animate-spin text-emerald-400" />
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
                      Сопоставьте колонки вашего Excel-файла с полями сайта, чтобы завершить импорт услуг:
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                      {/* Name Column Mapping */}
                      <div>
                        <label className="block text-[9px] font-black text-zinc-500 uppercase mb-1">Название услуги *</label>
                        <select
                          value={columnMapping.name}
                          onChange={(e) => setColumnMapping(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full bg-zinc-900 text-xs text-white border border-zinc-800 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        >
                          <option value="">-- Выбрать --</option>
                          {excelHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>

                      {/* Price Column Mapping */}
                      <div>
                        <label className="block text-[9px] font-black text-zinc-500 uppercase mb-1">Цена *</label>
                        <select
                          value={columnMapping.price}
                          onChange={(e) => setColumnMapping(prev => ({ ...prev, price: e.target.value }))}
                          className="w-full bg-zinc-900 text-xs text-white border border-zinc-800 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        >
                          <option value="">-- Выбрать --</option>
                          {excelHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>

                      {/* Category Mapping */}
                      <div>
                        <label className="block text-[9px] font-black text-zinc-500 uppercase mb-1">Категория</label>
                        <select
                          value={columnMapping.category}
                          onChange={(e) => setColumnMapping(prev => ({ ...prev, category: e.target.value }))}
                          className="w-full bg-zinc-900 text-xs text-white border border-zinc-800 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        >
                          <option value="">-- Пропустить --</option>
                          {excelHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>

                      {/* Description Mapping */}
                      <div>
                        <label className="block text-[9px] font-black text-zinc-500 uppercase mb-1">Описание</label>
                        <select
                          value={columnMapping.description}
                          onChange={(e) => setColumnMapping(prev => ({ ...prev, description: e.target.value }))}
                          className="w-full bg-zinc-900 text-xs text-white border border-zinc-800 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        >
                          <option value="">-- Пропустить --</option>
                          {excelHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>

                      {/* Discount price Mapping */}
                      <div>
                        <label className="block text-[9px] font-black text-zinc-500 uppercase mb-1">Старая цена</label>
                        <select
                          value={columnMapping.oldPrice}
                          onChange={(e) => setColumnMapping(prev => ({ ...prev, oldPrice: e.target.value }))}
                          className="w-full bg-zinc-900 text-xs text-white border border-zinc-800 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        >
                          <option value="">-- Пропустить --</option>
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
                        className="bg-gradient-to-r from-cyan-500 to-emerald-500 text-black px-5 py-2 rounded-lg text-xs font-black hover:brightness-110 shadow"
                      >
                        Импортировать в каталог
                      </button>
                    </div>
                  </div>
                )}

                {importStatus === 'success' && (
                  <div className="bg-emerald-950/20 border border-emerald-500/30 p-4 rounded-xl flex items-center gap-2.5 text-xs text-emerald-400">
                    <Check className="w-5 h-5 shrink-0" />
                    <span>Прайс-лист успешно импортирован в локальный каталог! Нажмите «Применить изменения» вверху для публикации на сайт.</span>
                  </div>
                )}

                {/* Add/Edit Manual Service Form */}
                <form onSubmit={handleSaveService} className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 space-y-4">
                  <h5 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-1.5">
                    <PlusCircle className="w-4 h-4 text-cyan-400" />
                    {editingServiceId ? 'Редактировать услугу' : 'Создать новую услугу вручную'}
                  </h5>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Название услуги</label>
                      <input
                        type="text"
                        required
                        value={serviceForm.name}
                        onChange={(e) => setServiceForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Например: Прятки в темноте"
                        className="w-full bg-zinc-950 text-xs text-white border border-zinc-800 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Категория</label>
                      <input
                        type="text"
                        required
                        value={serviceForm.category}
                        onChange={(e) => setServiceForm(prev => ({ ...prev, category: e.target.value }))}
                        placeholder="Основное, Шоу-программы..."
                        className="w-full bg-zinc-950 text-xs text-white border border-zinc-800 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Цена (руб.)</label>
                      <input
                        type="number"
                        required
                        value={serviceForm.price || ''}
                        onChange={(e) => setServiceForm(prev => ({ ...prev, price: Number(e.target.value) }))}
                        placeholder="5000"
                        className="w-full bg-zinc-950 text-xs text-white border border-zinc-800 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Скидочная/Старая цена</label>
                      <input
                        type="number"
                        value={serviceForm.oldPrice || ''}
                        onChange={(e) => setServiceForm(prev => ({ ...prev, oldPrice: e.target.value ? Number(e.target.value) : undefined }))}
                        placeholder="6500"
                        className="w-full bg-zinc-950 text-xs text-white border border-zinc-800 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-cyan-500"
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
                        className="w-full bg-zinc-950 text-xs text-white border border-zinc-800 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Продолжительность</label>
                      <input
                        type="text"
                        value={serviceForm.duration || ''}
                        onChange={(e) => setServiceForm(prev => ({ ...prev, duration: e.target.value }))}
                        placeholder="Например: 1.5 часа"
                        className="w-full bg-zinc-950 text-xs text-white border border-zinc-800 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-6 pt-1">
                    <label className="flex items-center gap-2 text-xs font-bold text-zinc-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={serviceForm.isPopular || false}
                        onChange={(e) => setServiceForm(prev => ({ ...prev, isPopular: e.target.checked }))}
                        className="rounded border-zinc-800 text-cyan-500 focus:ring-cyan-500"
                      />
                      Отметить как «Хит продаж» ⭐
                    </label>
                  </div>

                  <div className="flex gap-2 justify-end pt-2 border-t border-zinc-800">
                    {editingServiceId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingServiceId(null);
                          setServiceForm({ name: '', category: 'Основное', description: '', price: 0 });
                        }}
                        className="bg-zinc-950 border border-zinc-800 text-zinc-400 px-4 py-2 rounded-lg text-xs font-bold transition-all"
                      >
                        Отмена
                      </button>
                    )}
                    <button
                      type="submit"
                      className="bg-cyan-500 text-black px-5 py-2 rounded-lg text-xs font-black hover:brightness-110 shadow-lg"
                    >
                      {editingServiceId ? 'Сохранить изменения' : 'Создать услугу'}
                    </button>
                  </div>
                </form>

                {/* Services Table List */}
                <div className="space-y-2">
                  <div className="text-xs font-black uppercase text-zinc-400 tracking-wider mb-2">Список активных услуг на сайте ({localServices.length})</div>
                  
                  {localServices.length === 0 ? (
                    <p className="text-sm text-zinc-600 italic">Нет услуг. Добавьте первую!</p>
                  ) : (
                    <div className="space-y-2.5">
                      {localServices.map((srv) => (
                        <div 
                          key={srv.id} 
                          className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                        >
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                                {srv.category}
                              </span>
                              {srv.isPopular && <span className="text-[9px] font-bold text-amber-400 bg-amber-950/20 border border-amber-500/20 px-1.5 py-0.5 rounded">ХИТ ⭐</span>}
                              <h6 className="text-xs font-extrabold text-white">{srv.name}</h6>
                            </div>
                            <p className="text-[11px] text-zinc-500 mt-1 line-clamp-1">{srv.description}</p>
                          </div>

                          <div className="flex items-center gap-5 self-stretch sm:self-auto justify-between border-t sm:border-t-0 pt-2.5 sm:pt-0 border-zinc-900">
                            <span className="text-sm font-black text-emerald-400 whitespace-nowrap">{srv.price.toLocaleString()} ₽</span>
                            
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleEditService(srv)}
                                className="w-8 h-8 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-850 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                                title="Редактировать"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteService(srv.id)}
                                className="w-8 h-8 rounded-lg bg-red-950/20 hover:bg-red-900 border border-red-900/30 flex items-center justify-center text-red-400 hover:text-white transition-colors"
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
                  <h4 className="text-sm font-black text-white uppercase tracking-wider mb-1">Управление отзывами и источниками</h4>
                  <p className="text-xs text-zinc-500">Добавляйте отзывы вручную, редактируйте оценки или удаляйте неактуальные.</p>
                </div>

                {/* Add/Edit Review Form */}
                <form onSubmit={handleSaveReview} className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 space-y-4">
                  <h5 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-1.5">
                    <PlusCircle className="w-4 h-4 text-cyan-400" />
                    {editingReviewId ? 'Редактировать отзыв' : 'Добавить отзыв вручную'}
                  </h5>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Имя автора</label>
                      <input
                        type="text"
                        required
                        value={reviewForm.author}
                        onChange={(e) => setReviewForm(prev => ({ ...prev, author: e.target.value }))}
                        placeholder="Екатерина М."
                        className="w-full bg-zinc-950 text-xs text-white border border-zinc-800 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Оценка (1-5)</label>
                      <select
                        value={reviewForm.rating || 5}
                        onChange={(e) => setReviewForm(prev => ({ ...prev, rating: Number(e.target.value) }))}
                        className="w-full bg-zinc-950 text-xs text-white border border-zinc-800 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-cyan-500"
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
                        className="w-full bg-zinc-950 text-xs text-white border border-zinc-800 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      >
                        <option value="yandex">Яндекс Карты</option>
                        <option value="vk">ВКонтакте</option>
                        <option value="manual">Сайт клуба (Ручной)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Текст отзыва</label>
                    <textarea
                      required
                      value={reviewForm.text}
                      onChange={(e) => setReviewForm(prev => ({ ...prev, text: e.target.value }))}
                      placeholder="Напишите текст отзыва здесь..."
                      rows={3}
                      className="w-full bg-zinc-950 text-xs text-white border border-zinc-800 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-cyan-500 resize-none"
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
                        className="bg-zinc-950 border border-zinc-800 text-zinc-400 px-4 py-2 rounded-lg text-xs font-bold transition-all"
                      >
                        Отмена
                      </button>
                    )}
                    <button
                      type="submit"
                      className="bg-cyan-500 text-black px-5 py-2 rounded-lg text-xs font-black hover:brightness-110 shadow-lg"
                    >
                      {editingReviewId ? 'Сохранить отзыв' : 'Создать отзыв'}
                    </button>
                  </div>
                </form>

                {/* Reviews List */}
                <div className="space-y-2">
                  <div className="text-xs font-black uppercase text-zinc-400 tracking-wider mb-2">Активные отзывы ({localReviews.length})</div>
                  {localReviews.map((rev) => (
                    <div 
                      key={rev.id} 
                      className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h6 className="text-xs font-extrabold text-white">{rev.author}</h6>
                          <span className="text-[10px] text-zinc-500">{rev.date}</span>
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-zinc-900 text-zinc-400">
                            {rev.source === 'yandex' ? 'Яндекс' : rev.source === 'vk' ? 'ВКонтакте' : 'Ручной'}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-1.5 italic leading-relaxed">«{rev.text}»</p>
                      </div>

                      <div className="flex items-center gap-4 self-stretch sm:self-auto justify-end">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleEditReview(rev)}
                            className="w-8 h-8 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-850 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
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
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 4: Contact Settings */}
            {activeTab === 'contacts' && (
              <form onSubmit={(e) => { e.preventDefault(); alert('Контакты временно сохранены локально. Нажмите «Применить изменения» для сохранения.'); }} className="space-y-6">
                <div>
                  <h4 className="text-sm font-black text-white uppercase tracking-wider mb-1">Редактор контактной информации</h4>
                  <p className="text-xs text-zinc-500">Обновите ваши номера телефонов, адрес, рабочие часы и ссылку на карту.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Номер телефона</label>
                    <input
                      type="text"
                      required
                      value={localContacts.phone}
                      onChange={(e) => setLocalContacts(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full bg-zinc-950 text-xs text-white border border-zinc-800 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Email для связи</label>
                    <input
                      type="email"
                      required
                      value={localContacts.email}
                      onChange={(e) => setLocalContacts(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full bg-zinc-950 text-xs text-white border border-zinc-800 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Физический Адрес клуба</label>
                  <input
                    type="text"
                    required
                    value={localContacts.address}
                    onChange={(e) => setLocalContacts(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full bg-zinc-950 text-xs text-white border border-zinc-800 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Часы работы</label>
                  <input
                    type="text"
                    required
                    value={localContacts.workingHours}
                    onChange={(e) => setLocalContacts(prev => ({ ...prev, workingHours: e.target.value }))}
                    className="w-full bg-zinc-950 text-xs text-white border border-zinc-800 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Интерактивный виджет Яндекс Карт (Ссылка iframe)</label>
                  <input
                    type="text"
                    value={localContacts.yandexMapWidgetUrl}
                    onChange={(e) => setLocalContacts(prev => ({ ...prev, yandexMapWidgetUrl: e.target.value }))}
                    className="w-full bg-zinc-950 text-xs text-white border border-zinc-800 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                  <p className="text-[9px] text-zinc-500 mt-1">
                    Скопируйте ссылку iframe («Поделиться» &rarr; «Встроить карту» &rarr; скопируйте параметр `src` ссылки)
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Яндекс Метрика ID</label>
                    <input
                      type="text"
                      placeholder="Например: 95483210"
                      value={localContacts.yandexMetrikaId || ''}
                      onChange={(e) => setLocalContacts(prev => ({ ...prev, yandexMetrikaId: e.target.value }))}
                      className="w-full bg-zinc-950 text-xs text-white border border-zinc-800 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                    <p className="text-[9px] text-zinc-500 mt-1">
                      Оставьте пустым или введите числовой идентификатор вашего счетчика
                    </p>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Текст промо-бейджа (на главном баннере)</label>
                    <input
                      type="text"
                      placeholder="Например: СКИДКА -15% НА ДЕНЬ РОЖДЕНИЯ В БУДНИ!"
                      value={localContacts.promoBadge || ''}
                      onChange={(e) => setLocalContacts(prev => ({ ...prev, promoBadge: e.target.value }))}
                      className="w-full bg-zinc-950 text-xs text-white border border-zinc-800 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                    <p className="text-[9px] text-zinc-500 mt-1">
                      Яркая плашка в самом верху сайта. Оставьте пустым, чтобы скрыть бейдж.
                    </p>
                  </div>
                </div>
              </form>
            )}

            {/* TAB 5: Reels / VK Clips Management */}
            {activeTab === 'reels' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-black text-white uppercase tracking-wider mb-1">Менеджер VK Клипов и Reels</h4>
                    <p className="text-xs text-zinc-500">Добавляйте ссылки на вертикальные ролики VK Клипы или Reels для отображения в интерактивном виджете.</p>
                  </div>
                </div>

                {/* Form to Add / Edit Reel */}
                <form onSubmit={handleSaveReelForm} className="bg-zinc-950 border border-zinc-850 rounded-2xl p-5 space-y-4">
                  <h5 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Video className="w-4 h-4 text-cyan-400" />
                    {editingReelId ? 'Редактировать видео-клип' : 'Добавить новый VK Клип / Reels'}
                  </h5>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-wider mb-1">Название ролика</label>
                      <input
                        type="text"
                        required
                        value={reelForm.title || ''}
                        onChange={(e) => setReelForm(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Супер-игра в лазертаг!"
                        className="w-full bg-zinc-900 text-xs text-white border border-zinc-800 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-wider mb-1">Ссылка на VK Клип / Видео ролик</label>
                      <input
                        type="text"
                        required
                        value={reelForm.videoUrl || ''}
                        onChange={(e) => setReelForm(prev => ({ ...prev, videoUrl: e.target.value }))}
                        placeholder="https://vk.com/clip-123456_78910"
                        className="w-full bg-zinc-900 text-xs text-white border border-zinc-800 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-wider mb-1">Ссылка на обложку (опционально)</label>
                      <input
                        type="text"
                        value={reelForm.thumbnailUrl || ''}
                        onChange={(e) => setReelForm(prev => ({ ...prev, thumbnailUrl: e.target.value }))}
                        placeholder="https://images.unsplash.com/... (или пусто для авто)"
                        className="w-full bg-zinc-900 text-xs text-white border border-zinc-800 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-wider mb-1">Продолжительность (формат 0:15)</label>
                      <input
                        type="text"
                        value={reelForm.duration || '0:15'}
                        onChange={(e) => setReelForm(prev => ({ ...prev, duration: e.target.value }))}
                        className="w-full bg-zinc-900 text-xs text-white border border-zinc-800 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-wider mb-1">Тег / Категория</label>
                      <select
                        value={reelForm.tag || 'Общее'}
                        onChange={(e) => setReelForm(prev => ({ ...prev, tag: e.target.value }))}
                        className="w-full bg-zinc-900 text-xs text-white border border-zinc-800 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      >
                        <option value="Общее">Общее</option>
                        <option value="Праздник">Праздники</option>
                        <option value="Атмосфера">Атмосфера</option>
                        <option value="Отзывы">Отзывы</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    {editingReelId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingReelId(null);
                          setReelForm({ title: '', videoUrl: '', thumbnailUrl: '', likes: 0, plays: '0', duration: '0:15', tag: 'Общее' });
                        }}
                        className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition-all"
                      >
                        Отмена
                      </button>
                    )}
                    <button
                      type="submit"
                      className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      {editingReelId ? 'Сохранить изменения' : 'Вставить ролик'}
                    </button>
                  </div>
                </form>

                {/* Reels list grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {localReels.map((rl) => (
                    <div key={rl.id} className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="relative w-16 h-24 bg-zinc-950 rounded-lg overflow-hidden border border-zinc-800 shrink-0">
                          <img src={rl.thumbnailUrl} alt={rl.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <Play className="w-4 h-4 text-white/80" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h6 className="text-xs font-bold text-white truncate">{rl.title}</h6>
                          <p className="text-[9px] text-zinc-500 truncate mt-0.5">{rl.videoUrl}</p>
                          <span className="inline-block text-[9px] font-black uppercase tracking-wider bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded mt-2">
                            {rl.tag}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-zinc-800/60 pt-3">
                        <span className="text-[10px] text-zinc-500 font-mono">Длительность: {rl.duration}</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleEditReel(rl)}
                            className="w-7 h-7 rounded bg-zinc-950 border border-zinc-850 hover:bg-zinc-900 flex items-center justify-center text-zinc-400 hover:text-white transition-all"
                            title="Редактировать"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteReel(rl.id)}
                            className="w-7 h-7 rounded bg-red-950/20 border border-red-900/30 hover:bg-red-900 flex items-center justify-center text-red-400 hover:text-white transition-all"
                            title="Удалить"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 6: Leads / Booking Form Submissions organizer */}
            {activeTab === 'leads' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-black text-white uppercase tracking-wider mb-1">Менеджер заявок и праздников</h4>
                    <p className="text-xs text-zinc-500">Просматривайте, фильтруйте, обновляйте статус обработки и выгружайте входящие заявки в Excel.</p>
                  </div>
                  <button
                    onClick={handleExportLeadsToExcel}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-500/10 self-start sm:self-center"
                  >
                    <Download className="w-4 h-4" />
                    Экспорт в Excel
                  </button>
                </div>

                {/* Filters */}
                <div className="bg-zinc-950 border border-zinc-850 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
                  <div className="w-full md:w-72">
                    <input
                      type="text"
                      placeholder="Поиск по имени или телефону..."
                      value={leadsSearchQuery}
                      onChange={(e) => setLeadsSearchQuery(e.target.value)}
                      className="w-full bg-zinc-900 text-xs text-white border border-zinc-800 rounded-lg px-3.5 py-2 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto shrink-0 select-none pb-2 md:pb-0">
                    {(['all', 'new', 'processing', 'completed', 'canceled'] as const).map((status) => (
                      <button
                        key={status}
                        onClick={() => setLeadsStatusFilter(status)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border ${
                          leadsStatusFilter === status
                            ? 'bg-cyan-500 text-black border-cyan-500'
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

                {/* Leads list table or grid */}
                {isLoadingLeads ? (
                  <div className="py-12 text-center text-zinc-500 flex items-center justify-center gap-2">
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Загрузка актуальных заявок...
                  </div>
                ) : localLeads.length === 0 ? (
                  <div className="py-12 text-center text-zinc-500 bg-zinc-900/40 border border-zinc-800 rounded-2xl">
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
                          className={`bg-zinc-900/60 border rounded-2xl p-5 transition-all ${
                            l.status === 'new' ? 'border-cyan-500/30 bg-cyan-500/[0.02]' : 'border-zinc-800'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800/50 mb-4">
                            <div className="flex items-center gap-2">
                              {l.status === 'new' && (
                                <span className="w-2.5 h-2.5 bg-cyan-400 rounded-full animate-ping mr-1" />
                              )}
                              <h5 className="text-sm font-black text-white">{l.name}</h5>
                              <span className="text-[10px] text-zinc-500 font-mono">
                                от {new Date(l.createdAt).toLocaleDateString('ru-RU')} в {new Date(l.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>

                            {/* Status controls */}
                            <div className="flex items-center gap-2">
                              <select
                                value={l.status}
                                onChange={(e) => handleUpdateLeadStatus(l.id, e.target.value as any)}
                                className={`text-[10px] font-black uppercase tracking-wider rounded-lg px-2.5 py-1.5 border bg-zinc-950 focus:outline-none cursor-pointer ${
                                  l.status === 'new' ? 'text-cyan-400 border-cyan-500/30' :
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
                                className="w-8 h-8 rounded-lg bg-red-950/20 border border-red-900/30 flex items-center justify-center text-red-400 hover:text-white transition-all hover:bg-red-900"
                                title="Удалить заявку"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div>
                              <span className="block text-[9px] font-black text-zinc-500 uppercase tracking-wider mb-1">Номер телефона</span>
                              <a href={`tel:${l.phone}`} className="text-xs font-bold text-white hover:text-cyan-400 transition-colors flex items-center gap-1.5 font-mono">
                                <Phone className="w-3.5 h-3.5 text-zinc-500" />
                                {l.phone}
                              </a>
                            </div>

                            <div>
                              <span className="block text-[9px] font-black text-zinc-500 uppercase tracking-wider mb-1">Выбранная Дата</span>
                              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                                {new Date(l.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                              </div>
                            </div>

                            <div>
                              <span className="block text-[9px] font-black text-zinc-500 uppercase tracking-wider mb-1">Кол-во игроков</span>
                              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                                <Users className="w-3.5 h-3.5 text-zinc-500" />
                                {l.guests} человек
                              </div>
                            </div>

                            <div>
                              <span className="block text-[9px] font-black text-zinc-500 uppercase tracking-wider mb-1">Пакет / Бюджет</span>
                              <div className="text-xs font-bold text-cyan-400">
                                {l.packageName ? `${l.packageName} (${l.packagePrice} ₽)` : 'Общий расчет'}
                              </div>
                            </div>
                          </div>

                          {l.comment && (
                            <div className="mt-4 bg-zinc-950/40 border border-zinc-800/50 p-3 rounded-xl">
                              <span className="block text-[8px] font-black text-zinc-500 uppercase tracking-wider mb-1.5">Комментарий или пожелания клиента:</span>
                              <p className="text-[11px] text-zinc-300 italic leading-relaxed">«{l.comment}»</p>
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
