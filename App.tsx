
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Appointment, Barber, Product, Service, Page, ModalState, ModalType, StyleRecommendation, AppNotification, UserProfile, Review, AppointmentService, CartItem } from './types';
import { MOCK_BARBERS, MOCK_PRODUCTS, ALL_SERVICES, MOCK_NOTIFICATIONS } from './constants';
import { getStyleRecommendation, generateProductDescription } from './services/geminiService';

// Fix for ion-icon property errors in JSX
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'ion-icon': any;
    }
  }
}

// Declare Leaflet globally as it is loaded via script tag
declare const L: any;

// UTILITY FUNCTIONS
const formatCurrency = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);

const timeToMinutes = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
};

const calculateEndTime = (startTime: string, durationMinutes: number) => {
    const totalMinutes = timeToMinutes(startTime) + durationMinutes;
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMinutes = totalMinutes % 60;
    return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
};

const isAppointment = (item: any): item is Appointment => {
    return item && 'barberName' in item && 'total' in item;
}

const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; 
};

// Helper to trigger Service Worker Notifications
const triggerSWNotification = async (title: string, body: string) => {
    if (!('serviceWorker' in navigator)) return;
    
    const registration = await navigator.serviceWorker.ready;
    
    // Check permission
    if (Notification.permission === 'granted') {
        registration.showNotification(title, {
            body: body,
            icon: 'https://cdn-icons-png.flaticon.com/512/1256/1256650.png',
            vibrate: [200, 100, 200],
            tag: 'barber-notification'
        } as any);
    }
};

// Request Permission Helper
const requestNotificationPermission = async () => {
    if (!('Notification' in window)) return;
    const permission = await Notification.requestPermission();
    return permission;
};

// Persistence Helpers
const SAVE_KEYS = {
    APPOINTMENTS: 'w8_appointments',
    SERVICES: 'w8_services',
    BARBERS: 'w8_barbers',
    PRODUCTS: 'w8_products',
    CART: 'w8_cart',
    PROFILE: 'w8_profile',
    ADMIN_MODE: 'w8_admin_mode'
};

const loadLocalData = <T,>(key: string, defaultValue: T): T => {
    try {
        const saved = localStorage.getItem(key);
        return saved ? JSON.parse(saved) : defaultValue;
    } catch (e) {
        console.warn(`Error loading ${key} from storage:`, e);
        return defaultValue;
    }
};

const saveLocalData = (key: string, data: any) => {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        console.error(`Error saving ${key} to storage:`, e);
    }
};


// HEADER COMPONENT
interface HeaderProps {
    userProfilePic: string | null;
    onProfileClick: () => void;
    hasUnread: boolean;
    onNotificationClick: () => void;
    isAdmin: boolean;
}
const Header: React.FC<HeaderProps> = ({ userProfilePic, onProfileClick, hasUnread, onNotificationClick, isAdmin }) => (
    <header className={`shadow-xl sticky top-0 z-20 transition-colors duration-500 ${isAdmin ? 'bg-gray-800 border-b border-red-500' : 'bg-gray-900'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
            <div className="flex items-center space-x-2">
                <i className="fas fa-cut text-3xl text-amber-400"></i>
                <div>
                    <h1 className="text-2xl font-extrabold tracking-wider text-white leading-none">
                        Work8<span className="text-amber-400">-Barber</span>
                    </h1>
                    {isAdmin && <span className="text-[10px] font-bold text-red-400 tracking-widest uppercase">MODO DUEÑO</span>}
                </div>
            </div>
            <div className="flex items-center space-x-3">
                <button onClick={onNotificationClick} className="relative text-gray-300 hover:text-amber-400">
                    <ion-icon name="notifications-outline" className="text-2xl"></ion-icon>
                    {hasUnread && <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-gray-900"></span>}
                </button>
                <button onClick={onProfileClick} className={`text-gray-300 hover:text-amber-400 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 ${isAdmin ? 'focus:ring-red-500' : 'focus:ring-amber-500'}`}>
                    {userProfilePic ? (
                        <img src={userProfilePic} alt="Foto de perfil" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                        <ion-icon name="person-circle-outline" className="text-2xl"></ion-icon>
                    )}
                </button>
            </div>
        </div>
    </header>
);

// NOTIFICATIONS PANEL COMPONENT
const NotificationsPanel: React.FC<{ notifications: AppNotification[]; onClose: () => void; onEnablePush: () => void; pushEnabled: boolean }> = ({ notifications, onClose, onEnablePush, pushEnabled }) => {
    const getNotificationIcon = (type: AppNotification['type']) => {
        switch (type) {
            case 'appointment': return 'fas fa-calendar-check text-blue-400';
            case 'promo': return 'fas fa-tags text-green-400';
            default: return 'fas fa-bell text-gray-400';
        }
    };
    
    return (
        <div className="absolute top-16 right-0 sm:right-4 w-full sm:w-80 md:w-96 bg-gray-900/95 backdrop-blur-sm border border-amber-500 rounded-lg shadow-2xl z-50 animate-fade-in-down">
            <div className="p-3 border-b border-gray-700 flex justify-between items-center">
                <h3 className="font-bold text-white">Notificaciones</h3>
                <button onClick={onClose} className="text-gray-400 hover:text-white">
                    <ion-icon name="close-outline" className="text-2xl"></ion-icon>
                </button>
            </div>
            
            {!pushEnabled && (
                <div className="p-3 bg-gray-800 border-b border-gray-700">
                    <p className="text-xs text-gray-300 mb-2">Activa las notificaciones para no perderte tus citas.</p>
                    <button onClick={onEnablePush} className="w-full bg-amber-600 text-white text-xs py-1 rounded hover:bg-amber-500 transition">
                        Activar Notificaciones Push
                    </button>
                </div>
            )}

            <div className="p-2 max-h-80 overflow-y-auto">
                {notifications.length > 0 ? notifications.map(notif => (
                    <div key={notif.id} className="p-3 hover:bg-gray-800 rounded-md flex items-start space-x-3 transition-colors">
                        <div className="mt-1 flex-shrink-0">
                            <i className={getNotificationIcon(notif.type)}></i>
                        </div>
                        <div>
                            <p className="font-semibold text-white">{notif.title}</p>
                            <p className="text-sm text-gray-300">{notif.message}</p>
                            <p className="text-xs text-gray-500 mt-1">{notif.timestamp}</p>
                        </div>
                    </div>
                )) : (
                    <div className="text-center p-8">
                        <i className="fas fa-bell-slash text-3xl text-gray-600 mb-2"></i>
                        <p className="text-gray-500">No tienes notificaciones nuevas.</p>
                    </div>
                )}
            </div>
        </div>
    );
};


// BOTTOM NAVIGATION COMPONENT
interface BottomNavProps {
    currentPage: Page;
    onPageChange: (page: Page) => void;
}
const BottomNav: React.FC<BottomNavProps> = ({ currentPage, onPageChange }) => {
    const navItems: { page: Page; icon: string; label: string }[] = [
        { page: 'inicio', icon: 'home-outline', label: 'Inicio' },
        { page: 'servicios', icon: 'cut-outline', label: 'Servicios' },
        { page: 'barberos', icon: 'map-outline', label: 'Barberos' },
        { page: 'comercio', icon: 'storefront-outline', label: 'Comercio' },
        { page: 'agenda', icon: 'calendar-outline', label: 'Agenda' },
    ];

    return (
        <nav id="bottom-nav" className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t-2 border-amber-500 shadow-xl flex justify-around z-20 pb-safe">
            {navItems.map(({ page, icon, label }) => (
                <button key={page} onClick={() => onPageChange(page)} className={`flex-1 flex flex-col items-center p-2 hover:text-amber-400 transition-colors duration-200 ${currentPage === page ? 'text-amber-400' : 'text-gray-400'}`}>
                    {page === 'barberos' ? (
                         <div className={`w-10 h-10 rounded-full overflow-hidden border-2 mb-0.5 transition-all duration-300 ${currentPage === page ? 'border-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.6)] scale-110' : 'border-gray-500 grayscale opacity-70'}`}>
                             <img 
                                src="https://placehold.co/200x200/000000/F59E0B?text=WORK+8" 
                                alt="Barberos" 
                                className="w-full h-full object-cover"
                             />
                         </div>
                    ) : (
                        <ion-icon name={icon} className="text-2xl mb-0.5"></ion-icon>
                    )}
                    <span className="text-[10px] font-medium">{label}</span>
                </button>
            ))}
        </nav>
    );
};


// PAGES
const HomePage: React.FC<{ products: Product[]; onPageChange: (page: Page) => void; setModal: (modal: ModalState) => void; isAdmin: boolean; addToCart: (p: Product) => void }> = ({ products, onPageChange, setModal, isAdmin, addToCart }) => (
    <section id="page-inicio" className="p-4 fade-in">
        <div className="relative h-64 sm:h-96 w-full mb-10 rounded-3xl overflow-hidden shadow-2xl group border border-gray-800">
            <img 
                src="https://images.unsplash.com/photo-1503951914875-452162b0f3f1?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80" 
                alt="Barber Shop Hero" 
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-900/60 to-transparent flex flex-col justify-end p-6 sm:p-12">
                <h2 className="text-3xl sm:text-6xl font-black text-white mb-3 drop-shadow-2xl tracking-tighter uppercase italic">
                    {isAdmin ? 'Master Dashboard' : 'Define tu Estilo'}
                </h2>
                <p className="text-gray-300 text-sm sm:text-xl mb-8 max-w-xl drop-shadow font-medium leading-relaxed">
                    {isAdmin 
                        ? 'Gestiona cada detalle de tu negocio: precios, staff y inventario en tiempo real.' 
                        : 'Accede a los mejores barberos del país. Cortes premium, servicios exclusivos y productos de alto nivel.'}
                </p>
                <div className="flex flex-wrap gap-4">
                    <button 
                        onClick={() => onPageChange('servicios')} 
                        className={`font-black py-3 px-8 sm:px-10 rounded-2xl transition-all shadow-[0_10px_20px_rgba(0,0,0,0.4)] flex items-center gap-3 active:scale-95 uppercase tracking-wider ${isAdmin ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-amber-500 hover:bg-amber-400 text-gray-950'}`}
                    >
                        <i className={`fas ${isAdmin ? 'fa-chart-line' : 'fa-bolt'} text-lg`}></i>
                        {isAdmin ? 'Administrar Local' : 'Agendar Ahora'}
                    </button>
                    {!isAdmin && (
                        <button 
                            onClick={() => onPageChange('comercio')} 
                            className="bg-white/10 backdrop-blur-md text-white font-bold py-3 px-8 sm:px-10 rounded-2xl hover:bg-white/20 transition-all border border-white/20 uppercase tracking-wider"
                        >
                            Ver Tienda
                        </button>
                    )}
                </div>
            </div>
        </div>

        <section className="mb-10">
            <h2 className="section-title text-2xl font-bold mb-6 text-white"><i className="fas fa-images mr-2 text-amber-400"></i>Trabajos Destacados</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                <img src="https://picsum.photos/seed/fade/400/400" className="w-full h-40 sm:h-56 object-cover rounded-lg shadow-md border border-gray-700 hover:scale-[1.02] transition" alt="Corte FADE"/>
                <img src="https://picsum.photos/seed/tribal/400/400" className="w-full h-40 sm:h-56 object-cover rounded-lg shadow-md border border-gray-700 hover:scale-[1.02] transition" alt="Diseño Tribal"/>
                <img src="https://picsum.photos/seed/barba/400/400" className="w-full h-40 sm:h-56 object-cover rounded-lg shadow-md border border-gray-700 hover:scale-[1.02] transition" alt="Barba Esculpida"/>
                <img src="https://picsum.photos/seed/texturizado/400/400" className="w-full h-40 sm:h-56 object-cover rounded-lg shadow-md border border-gray-700 hover:scale-[1.02] transition" alt="Corte Texturizado"/>
            </div>
            <div className="text-center mt-6"><button onClick={() => onPageChange('barberos')} className="text-amber-400 hover:text-amber-300 font-semibold transition">Ver Perfiles de Barberos <i className="fas fa-arrow-right ml-1"></i></button></div>
        </section>
        <section className="mb-6">
            <h2 className="section-title text-2xl font-bold mb-6 text-white"><i className="fas fa-store mr-2 text-amber-400"></i>Insumos Destacados</h2>
            <div id="inicio-products-list" className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {products.slice(0, 4).map(product => (
                    <div key={product.id} className="bg-gray-800 rounded-xl overflow-hidden shadow-lg p-4 text-center border border-gray-700 hover:border-amber-500 transition duration-300 relative group">
                        {isAdmin && (
                            <div className="absolute top-2 right-2 z-10 flex gap-1">
                                <button onClick={(e) => { e.stopPropagation(); setModal({type: 'editItem', item: product, title: 'Editar Producto'}); }} className="bg-blue-600 text-white p-1.5 rounded shadow hover:bg-blue-500"><i className="fas fa-pencil-alt"></i></button>
                            </div>
                        )}
                        <img src={product.imageUrl} className="w-2/3 mx-auto h-auto object-contain mb-3 rounded-md" alt={product.name} />
                        <h3 className="font-semibold text-gray-100 truncate">{product.name}</h3>
                        <p className="text-amber-400 font-bold mt-1">{formatCurrency(product.price)}</p>
                        <button onClick={() => addToCart(product)} className="mt-3 w-full bg-amber-500 text-gray-900 text-sm py-1.5 rounded-lg hover:bg-amber-600 transition">Agregar al Carrito</button>
                    </div>
                ))}
            </div>
            <div className="text-center mt-6"><button onClick={() => onPageChange('comercio')} className="text-amber-400 hover:text-amber-300 font-semibold transition">Ir al Comercio <i className="fas fa-arrow-right ml-1"></i></button></div>
        </section>
    </section>
);

interface ServicesPageProps {
    availableServices: Service[];
    selectedServices: Service[];
    toggleService: (service: Service) => void;
    onPageChange: (page: Page) => void;
    setModal: (modal: ModalState) => void;
    applyLLMRecommendation: (ids: string[]) => void;
    isAdmin: boolean;
    onDeleteService: (id: string) => void;
}
const ServicesPage: React.FC<ServicesPageProps> = ({ availableServices, selectedServices, toggleService, onPageChange, setModal, applyLLMRecommendation, isAdmin, onDeleteService }) => {
    const [styleDescription, setStyleDescription] = useState('');
    const [aiImages, setAiImages] = useState<string[]>([]);
    const [webSources, setWebSources] = useState<{title: string; uri: string}[]>([]);

    const handleStyleRecommendation = async () => {
        if (!styleDescription.trim()) {
            setModal({ type: 'message', title: "Atención", message: "Por favor, describe el estilo que deseas." });
            return;
        }
        setModal({ type: 'loading', title: "Buscando Estilos...", message: "La IA está buscando referencias en internet y analizando servicios." });
        setAiImages([]);
        setWebSources([]);
        
        try {
            const result: StyleRecommendation = await getStyleRecommendation(styleDescription, availableServices);
            applyLLMRecommendation(result.recommendedServices || []);
            
            if (result.imageUrls && result.imageUrls.length > 0) {
                setAiImages(result.imageUrls);
            }
            if (result.webSources && result.webSources.length > 0) {
                setWebSources(result.webSources);
            }

            setModal({ type: 'message', title: "✨ Recomendación de Estilo AI", message: result.explanation || "No se pudo generar una explicación." });
        } catch (error) {
            console.error("Error al obtener recomendación de estilo:", error);
            setModal({ type: 'message', title: "Error AI", message: "No se pudo generar la recomendación de estilo. Intenta con una descripción más clara." });
        }
    };
    
    const totalDuration = selectedServices.reduce((acc, s) => acc + s.duration, 0);
    const totalPrice = selectedServices.reduce((acc, s) => acc + s.price, 0);

    return (
        <section id="page-servicios" className="p-4 fade-in pb-24">
            <h2 className="section-title text-2xl font-bold text-white mb-6">
                {isAdmin ? 'Gestión de Servicios (Dueño)' : '1. Elige Servicios'}
            </h2>
            
            <div className="bg-blue-900/40 border border-blue-700 p-6 rounded-xl mb-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl"></div>
                <h3 className="text-lg font-bold text-blue-300 mb-3 flex items-center relative z-10"><i className="fas fa-brain mr-2"></i> Asistente de Estilo AI ✨</h3>
                <p className="text-sm text-gray-300 mb-4 relative z-10">Describe el estilo o el *vibe* que buscas, y la IA buscará referencias en internet y te sugerirá servicios.</p>
                <div className="group relative rounded-lg p-[2px] bg-gradient-to-r from-amber-600/50 to-orange-600/50 hover:from-amber-500 hover:to-orange-500 focus-within:from-amber-400 focus-within:to-orange-500 focus-within:shadow-lg focus-within:shadow-amber-500/20 transition-all duration-300 mb-4">
                    <textarea value={styleDescription} onChange={e => setStyleDescription(e.target.value)} rows={3} placeholder="Ej: Quiero un Mullet moderno..." className="w-full bg-gray-900 rounded-[6px] p-3 text-white placeholder-gray-500 focus:outline-none resize-none transition-colors"></textarea>
                </div>
                <button onClick={handleStyleRecommendation} className="w-full relative overflow-hidden group bg-gradient-to-r from-amber-500 to-orange-600 text-gray-900 font-bold py-3 px-4 rounded-lg shadow-lg shadow-orange-900/20 hover:shadow-amber-500/40 hover:-translate-y-0.5 transition-all duration-300">
                    <span className="relative z-10 flex items-center justify-center"><i className="fas fa-search mr-2 group-hover:animate-pulse"></i> Buscar Referencias y Sugerir</span>
                    <div className="absolute inset-0 h-full w-full scale-0 rounded-lg transition-all duration-300 group-hover:scale-100 group-hover:bg-white/20"></div>
                </button>
            </div>

            {aiImages.length > 0 && (
                <div className="mb-6 bg-gray-800/50 p-4 rounded-xl border border-gray-700">
                    <h3 className="text-white font-bold mb-3 flex items-center"><i className="fas fa-images text-amber-400 mr-2"></i> Referencias Visuales Encontradas</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {aiImages.slice(0, 6).map((imgUrl, idx) => (
                            <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-gray-600 hover:border-amber-500 transition-colors group">
                                <img src={imgUrl} alt={`Referencia ${idx + 1}`} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/300x300/1f2937/f59e0b?text=Img+No+Disponible'; }} />
                                <a href={imgUrl} target="_blank" rel="noopener noreferrer" className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"><i className="fas fa-external-link-alt"></i></a>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {webSources.length > 0 && (
                <div className="mb-6 px-2">
                    <p className="text-xs text-gray-500 mb-2 font-semibold uppercase">Fuentes de Búsqueda (Google):</p>
                    <div className="flex flex-wrap gap-2">
                        {webSources.map((source, idx) => (
                            <a key={idx} href={source.uri} target="_blank" rel="noopener noreferrer" className="text-[10px] bg-gray-800 text-blue-300 border border-gray-700 px-2 py-1 rounded hover:bg-gray-700 hover:border-blue-500 truncate max-w-[150px]">{source.title}</a>
                        ))}
                    </div>
                </div>
            )}

            {isAdmin && (
                 <div className="mb-4 p-2 bg-red-900/30 border border-red-500/50 rounded text-center">
                    <p className="text-red-300 text-sm"><i className="fas fa-info-circle"></i> Toca "Editar" en cualquier tarjeta para cambiar precio o nombre.</p>
                 </div>
            )}

            <div id="services-container" className="grid grid-cols-2 gap-4">
                {availableServices.map(service => {
                    const isSelected = selectedServices.some(s => s.id === service.id);
                    return (
                        <div key={service.id} onClick={() => !isAdmin && toggleService(service)} className={`service-card border rounded-lg p-4 text-center transition-all hover:shadow-lg relative group ${isSelected ? 'bg-amber-700 border-white shadow-amber-500/30' : 'bg-gray-800 border-blue-800 hover:bg-amber-900'}`}>
                            <h3 className="text-white font-semibold">{service.name}</h3>
                            <p className="text-amber-300">{formatCurrency(service.price)} ({service.duration} min)</p>
                            
                            {isAdmin && (
                                <div className="absolute top-2 right-2 flex space-x-1">
                                    <button onClick={(e) => { e.stopPropagation(); setModal({type: 'editItem', item: service, title: 'Editar Servicio'}); }} className="bg-blue-600 hover:bg-blue-500 text-white p-1.5 rounded shadow-lg text-xs"><i className="fas fa-pencil-alt"></i></button>
                                    <button onClick={(e) => { e.stopPropagation(); onDeleteService(service.id); }} className="bg-red-600 hover:bg-red-500 text-white p-1.5 rounded shadow-lg text-xs"><i className="fas fa-trash"></i></button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {!isAdmin && selectedServices.length > 0 && (
                <div id="service-summary" className="fixed bottom-20 left-4 right-4 bg-gray-900 border-t-2 border-amber-500 p-4 rounded-t-lg shadow-lg z-10">
                    <h4 className="text-white font-semibold mb-2">Servicios Seleccionados:</h4>
                    <ul className="space-y-2 mb-3 max-h-32 overflow-y-auto">
                        {selectedServices.map(s => (
                            <li key={s.id} className="flex justify-between items-center bg-gray-800 p-2 rounded border border-gray-700 text-sm">
                                <span className="text-gray-300">{s.name} ({s.duration} min)</span>
                                <button onClick={(e) => { e.stopPropagation(); toggleService(s); }} className="text-red-400 hover:text-red-300 hover:bg-red-900/30 p-1 rounded transition-colors focus:outline-none" title="Eliminar servicio"><i className="fas fa-trash-alt"></i></button>
                            </li>
                        ))}
                    </ul>
                    <p className="text-lg font-bold text-amber-400 mb-3">Total: {formatCurrency(totalPrice)} ({totalDuration} min)</p>
                    <button onClick={() => onPageChange('barberos')} className="w-full bg-amber-500 text-gray-900 font-bold py-2 px-4 rounded-lg hover:bg-amber-400 transition-colors shadow-lg">2. Seleccionar Barbero</button>
                </div>
            )}
        </section>
    );
};

interface BarbersPageProps {
    barbers: Barber[];
    onSelectBarber: (barber: Barber) => void;
    selectedBarber: Barber | null;
    availabilityFilter: boolean;
    onAvailabilityChange: (checked: boolean) => void;
    specialtyFilter: string;
    onSpecialtyChange: (value: string) => void;
    levelFilter: string;
    onLevelChange: (value: string) => void;
    radiusFilter: string;
    onRadiusChange: (value: string) => void;
    userLocation: { lat: number, lng: number } | null;
    onRefreshLocation: () => void;
    allSpecialties: string[];
    allLevels: string[];
    isAdmin: boolean;
    setModal: (modal: ModalState) => void;
}
const BarbersPage: React.FC<BarbersPageProps> = ({ barbers, onSelectBarber, selectedBarber, availabilityFilter, onAvailabilityChange, specialtyFilter, onSpecialtyChange, levelFilter, onLevelChange, radiusFilter, onRadiusChange, userLocation, onRefreshLocation, allSpecialties, allLevels, isAdmin, setModal }) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const markersRef = useRef<any>(null);
    const radiusCircleRef = useRef<any>(null);
    const [isMapExpanded, setIsMapExpanded] = useState(false);

    const getBarberIcon = (level: Barber['professionLevel']) => {
        if (level === 'Maestro Barbero') return { icon: 'fas fa-crown', color: 'text-yellow-400', label: 'Maestro' };
        if (level === 'Barbero Artista') return { icon: 'fas fa-pen-fancy', color: 'text-pink-400', label: 'Artista' };
        return { icon: 'fas fa-scissors', color: 'text-amber-400', label: 'Barbero' };
    };

    useEffect(() => {
        if (!mapContainerRef.current || typeof L === 'undefined' || mapInstanceRef.current) return;

        const map = L.map(mapContainerRef.current).setView([4.5709, -74.2973], 5);
        
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 20
        }).addTo(map);

        mapInstanceRef.current = map;
        markersRef.current = L.featureGroup().addTo(map);

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        const map = mapInstanceRef.current;
        const markersGroup = markersRef.current;

        if (!map || !markersGroup) return;

        markersGroup.clearLayers();

        barbers.forEach(barber => {
            const statusColor = barber.isAvailable ? '#22c55e' : '#ef4444';
            const pulseClass = barber.isAvailable ? 'barber-marker-pulse' : '';
            const levelInfo = getBarberIcon(barber.professionLevel);
            
            const customIconHtml = `
                <div class="barber-marker ${pulseClass} bg-gray-900 border-2" style="border-color: ${statusColor}; width: 36px; height: 36px;">
                    <i class="${levelInfo.icon} ${levelInfo.color} text-sm"></i>
                </div>
            `;

            const customIcon = L.divIcon({
                html: customIconHtml,
                className: 'custom-div-icon',
                iconSize: [36, 36],
                iconAnchor: [18, 36],
                popupAnchor: [0, -36]
            });

            const marker = L.marker([barber.location.lat, barber.location.lng], { icon: customIcon })
                .bindPopup(`
                    <div class="text-gray-900 text-center">
                        <strong class="block text-sm font-bold mb-1">${barber.name}</strong>
                        <span class="text-xs text-gray-600">${barber.location.address}</span>
                        <div class="mt-1 text-xs ${barber.isAvailable ? 'text-green-600 font-bold' : 'text-red-600'}">
                            ${barber.isAvailable ? 'Disponible' : 'Ocupado'}
                        </div>
                        <button onclick="window.handleBarberSelect('${barber.id}')" class="mt-2 bg-amber-500 text-white text-xs px-2 py-1 rounded hover:bg-amber-600 w-full">Ver Perfil</button>
                    </div>
                `);

            (marker as any).barberId = barber.id;
            marker.on('click', () => onSelectBarber(barber));
            markersGroup.addLayer(marker);
        });

    }, [barbers, onSelectBarber]);

    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map) return;

        if (radiusCircleRef.current) {
            map.removeLayer(radiusCircleRef.current);
            radiusCircleRef.current = null;
        }

        if (userLocation && radiusFilter !== 'all') {
            const radiusInMeters = parseInt(radiusFilter) * 1000;
            radiusCircleRef.current = L.circle([userLocation.lat, userLocation.lng], {
                radius: radiusInMeters,
                color: '#f59e0b',
                fillColor: '#f59e0b',
                fillOpacity: 0.1,
                weight: 1,
                dashArray: '5, 5'
            }).addTo(map);

            if (!isMapExpanded) setIsMapExpanded(true);
            map.flyTo([userLocation.lat, userLocation.lng], map.getBoundsZoom(radiusCircleRef.current.getBounds()));
        }
    }, [userLocation, radiusFilter, isMapExpanded]);

    useEffect(() => {
        if (isMapExpanded && mapInstanceRef.current) {
            setTimeout(() => {
                mapInstanceRef.current.invalidateSize();
                if (selectedBarber) {
                     mapInstanceRef.current.flyTo([selectedBarber.location.lat, selectedBarber.location.lng], 15);
                } else if (radiusCircleRef.current) {
                    mapInstanceRef.current.flyTo([userLocation!.lat, userLocation!.lng], mapInstanceRef.current.getBoundsZoom(radiusCircleRef.current.getBounds()));
                } else if (markersRef.current && markersRef.current.getLayers().length > 0) {
                    try { mapInstanceRef.current.fitBounds(markersRef.current.getBounds().pad(0.2)); } catch(e) {}
                }
            }, 300);
        }
    }, [isMapExpanded, selectedBarber, userLocation]);

    useEffect(() => {
        (window as any).handleBarberSelect = (id: string) => {
            const barber = barbers.find(b => b.id === id);
            if(barber) onSelectBarber(barber);
        };
    }, [barbers, onSelectBarber]);

    return (
        <section id="page-barberos" className="p-4 fade-in pb-24">
            <div>
                <h2 className="section-title text-2xl font-bold text-white mb-6">
                    {isAdmin ? 'Gestión de Equipo (Dueño)' : '2. Elige Barbero y Ubicación'}
                </h2>
                
                <div className="bg-gray-800/50 p-4 rounded-lg mb-6 border border-gray-700 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
                        <div className="flex items-center space-x-3 flex-shrink-0 mb-4 md:mb-0">
                            <label htmlFor="availability-toggle" className="text-sm font-medium text-gray-300">Solo disponibles</label>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" id="availability-toggle" checked={availabilityFilter} onChange={(e) => onAvailabilityChange(e.target.checked)} className="sr-only peer" />
                                <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-amber-500 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                            </label>
                        </div>
                        <div className="flex-1 min-w-0">
                            <label htmlFor="specialty-filter" className="block text-sm font-medium text-gray-300 mb-1">Especialidad</label>
                            <select id="specialty-filter" value={specialtyFilter} onChange={(e) => onSpecialtyChange(e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded-md p-2 text-white focus:ring-amber-500 focus:border-amber-500">
                                {allSpecialties.map(spec => (
                                    <option key={spec} value={spec}>{spec === 'all' ? 'Todas' : spec}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex-1 min-w-0">
                            <label htmlFor="level-filter" className="block text-sm font-medium text-gray-300 mb-1">Nivel Profesional</label>
                            <select id="level-filter" value={levelFilter} onChange={(e) => onLevelChange(e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded-md p-2 text-white focus:ring-amber-500 focus:border-amber-500">
                                {allLevels.map(level => (
                                    <option key={level} value={level}>{level === 'all' ? 'Todos' : level}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="pt-2 border-t border-gray-700/50 flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-1 w-full">
                            <label htmlFor="radius-filter" className="block text-sm font-medium text-gray-300 mb-1 flex justify-between items-center">
                                <span>Distancia Máxima</span>
                                {userLocation && <span className="text-[10px] text-amber-500 bg-amber-500/10 px-1 rounded">GPS Activo</span>}
                            </label>
                            <div className="flex space-x-2">
                                <select id="radius-filter" value={radiusFilter} onChange={(e) => onRadiusChange(e.target.value)} className="flex-1 bg-gray-900 border border-gray-600 rounded-md p-2 text-white focus:ring-amber-500 focus:border-amber-500">
                                    <option value="all">Cualquier distancia</option>
                                    <option value="5">Hasta 5 km</option>
                                    <option value="10">Hasta 10 km</option>
                                    <option value="20">Hasta 20 km</option>
                                </select>
                                <button onClick={onRefreshLocation} className="bg-gray-700 text-amber-400 p-2 rounded-md hover:bg-gray-600 transition-colors border border-gray-600" title="Actualizar ubicación">
                                    <i className="fas fa-location-arrow"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    {barbers.length > 0 ? barbers.map(barber => {
                        const levelInfo = getBarberIcon(barber.professionLevel);
                        const isSelected = selectedBarber?.id === barber.id;
                        const distance = userLocation ? getDistance(userLocation.lat, userLocation.lng, barber.location.lat, barber.location.lng).toFixed(1) : null;
                        
                        return (
                        <div key={barber.id} onClick={() => onSelectBarber(barber)} className={`bg-gray-800 bg-opacity-80 backdrop-blur-sm border rounded-lg p-4 flex items-center space-x-4 shadow-xl transition-all duration-300 cursor-pointer relative group ${isSelected ? 'border-green-400 scale-105 bg-gray-700' : 'border-amber-500 hover:border-amber-400 hover:scale-[1.02] hover:bg-gray-800/90 hover:shadow-2xl hover:shadow-amber-500/10'}`}>
                            {isAdmin && (
                                <div className="absolute top-2 right-2 z-10">
                                     <button onClick={(e) => { e.stopPropagation(); setModal({type: 'editItem', item: barber, title: 'Editar Barbero'}); }} className="bg-blue-600 hover:bg-blue-500 text-white p-1.5 rounded-full shadow"><i className="fas fa-pencil-alt text-xs"></i></button>
                                </div>
                            )}
                            <div className="relative">
                                <img src={barber.profilePicUrl} alt={barber.name} className="w-16 h-16 rounded-full border-2 border-white object-cover" />
                                {distance && (
                                    <span className="absolute -bottom-1 -right-1 bg-amber-500 text-gray-900 text-[10px] font-bold px-1 rounded-sm shadow-sm">{distance}km</span>
                                )}
                            </div>
                            <div className="flex-1">
                                <h3 className="text-white font-semibold">{barber.name}</h3>
                                <p className="text-amber-300 text-sm">{barber.specialty}</p>
                                <p className="text-gray-400 text-xs mt-1 flex items-center"><i className={`${levelInfo.icon} mr-1 ${levelInfo.color}`}></i> {barber.professionLevel}</p>
                            </div>
                            <div className="flex flex-col items-center space-y-2">
                                <button onClick={(e) => { e.stopPropagation(); onSelectBarber(barber); }} disabled={!barber.isAvailable && !isAdmin} className="text-xs bg-amber-500 text-gray-900 px-3 py-1 rounded-full hover:bg-amber-400 disabled:bg-gray-600">{isSelected ? 'Ver Perfil' : 'Seleccionar'}</button>
                            </div>
                        </div>
                    )}) : <p className="col-span-2 text-center text-gray-500">No se encontraron barberos con los filtros actuales.</p>}
                </div>
            </div>
            <div>
                <button
                    onClick={() => setIsMapExpanded(!isMapExpanded)}
                    className="w-full flex justify-between items-center bg-gray-800 p-3 rounded-lg border border-gray-700 hover:border-amber-500 transition-colors shadow-lg"
                >
                     <h3 className="text-lg font-semibold text-white flex items-center">
                        <i className="fas fa-map-marker-alt mr-2 text-blue-400"></i>
                        Localizador GPS {radiusFilter !== 'all' && <span className="ml-2 text-xs bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded-full border border-amber-500/30">Radio: {radiusFilter}km</span>}
                    </h3>
                    <ion-icon name={isMapExpanded ? "chevron-up-outline" : "chevron-down-outline"} className="text-xl text-amber-400"></ion-icon>
                </button>
                <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isMapExpanded ? 'max-h-[500px] opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
                     <div ref={mapContainerRef} className="w-full h-80 border-2 border-blue-500 rounded-lg shadow-xl z-0 relative"></div>
                </div>
            </div>
        </section>
    );
};

interface CommercePageProps {
    products: Product[];
    setModal: (modal: ModalState) => void;
    isAdmin: boolean;
    onDeleteProduct: (id: string) => void;
    cart: CartItem[];
    addToCart: (p: Product) => void;
    removeFromCart: (id: string) => void;
    updateCartQuantity: (id: string, delta: number) => void;
}
const CommercePage: React.FC<CommercePageProps> = ({ products, setModal, isAdmin, onDeleteProduct, cart, addToCart, removeFromCart, updateCartQuantity }) => {
    const [activeTab, setActiveTab] = useState('comprar');
    const [productName, setProductName] = useState('');
    const [productDesc, setProductDesc] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isCartOpen, setIsCartOpen] = useState(false);

    const handleGenerateDesc = async () => {
        if (!productName.trim() || !productDesc.trim()) {
            setModal({type: 'message', title: 'Atención', message: 'Por favor, ingresa el nombre y una descripción básica del producto.'});
            return;
        }
        setIsGenerating(true);
        try {
            const newDescription = await generateProductDescription(productName, productDesc);
            setProductDesc(newDescription);
            setModal({type: 'message', title: '✨ Descripción AI Generada', message: 'La descripción de tu producto ha sido mejorada por la IA.'});
        } catch (error) {
            setModal({type: 'message', title: 'Error AI', message: 'No se pudo generar la descripción.'});
        } finally {
            setIsGenerating(false);
        }
    };

    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    return (
        <section id="page-comercio" className="p-4 fade-in pb-24">
            <h2 className="section-title text-2xl font-bold text-white mb-6">
                {isAdmin ? 'Inventario (Dueño)' : 'Comercio Pro'}
            </h2>
            <div className="border-b border-gray-700 mb-6 flex justify-between items-center">
                <nav className="flex space-x-4">
                    <button onClick={() => setActiveTab('comprar')} className={`px-3 py-2 text-sm font-bold transition-all ${activeTab === 'comprar' ? 'text-amber-400 border-b-2 border-amber-400' : 'text-gray-400 hover:text-gray-300'}`}>Comprar</button>
                    <button onClick={() => setActiveTab('vender')} className={`px-3 py-2 text-sm font-bold transition-all ${activeTab === 'vender' ? 'text-amber-400 border-b-2 border-amber-400' : 'text-gray-400 hover:text-gray-300'}`}>Vender</button>
                </nav>
                {activeTab === 'comprar' && (
                    <button onClick={() => setIsCartOpen(true)} className="relative p-2 text-amber-400 hover:scale-110 transition-transform">
                        <ion-icon name="cart-outline" className="text-3xl"></ion-icon>
                        {cartCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold h-5 w-5 flex items-center justify-center rounded-full animate-pulse">{cartCount}</span>}
                    </button>
                )}
            </div>

            {activeTab === 'comprar' ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {products.map(p => (
                        <div key={p.id} className="bg-gray-800 rounded-xl p-4 border border-gray-700 flex flex-col hover:border-amber-500 transition shadow-lg group relative">
                            {isAdmin && (
                                <div className="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={(e) => { e.stopPropagation(); setModal({type: 'editItem', item: p, title: 'Editar Producto'}); }} className="bg-blue-600 p-1.5 rounded text-xs"><i className="fas fa-edit"></i></button>
                                    <button onClick={(e) => { e.stopPropagation(); onDeleteProduct(p.id); }} className="bg-red-600 p-1.5 rounded text-xs"><i className="fas fa-trash"></i></button>
                                </div>
                            )}
                            <div className="h-32 w-full mb-3 flex items-center justify-center bg-gray-900 rounded-lg p-2 overflow-hidden">
                                <img src={p.imageUrl} className="max-h-full max-w-full object-contain transform group-hover:scale-110 transition" alt={p.name} />
                            </div>
                            <p className="text-[10px] text-amber-500 font-bold uppercase tracking-widest mb-1">{p.brand}</p>
                            <h3 className="text-sm font-bold text-gray-100 leading-tight mb-2 flex-grow line-clamp-2">{p.name}</h3>
                            <div className="flex flex-col mt-auto">
                                <p className="text-xs text-gray-400 mb-1">Ref: {p.reference}</p>
                                <p className="text-amber-400 font-black text-lg mb-3">{formatCurrency(p.price)}</p>
                                <button onClick={() => addToCart(p)} className="w-full bg-amber-500 text-gray-950 py-2 rounded-lg text-xs font-black uppercase tracking-wider hover:bg-amber-400 transition-colors shadow-md flex items-center justify-center gap-2">
                                    <i className="fas fa-cart-plus"></i> Añadir
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="space-y-6 max-w-2xl mx-auto bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-2xl">
                    <div className="text-center">
                        <i className="fas fa-tags text-4xl text-amber-400 mb-2"></i>
                        <h3 className="text-xl font-bold text-white">Publica tu Producto</h3>
                        <p className="text-sm text-gray-400">Vende tus insumos a la comunidad Work8.</p>
                    </div>
                    <div>
                        <label className="block text-xs font-black text-amber-400 uppercase mb-2">Nombre del producto</label>
                        <input value={productName} onChange={e => setProductName(e.target.value)} placeholder="Ej: Máquina Wahl Professional" className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-amber-500 outline-none" />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-amber-400 uppercase mb-2">Descripción del producto</label>
                        <textarea value={productDesc} onChange={e => setProductDesc(e.target.value)} placeholder="Describe el estado, marca y detalles..." className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-amber-500 outline-none resize-none" rows={4} />
                    </div>
                    <button onClick={handleGenerateDesc} disabled={isGenerating} className={`w-full bg-gradient-to-r from-blue-600 to-indigo-700 py-3 rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg transition-all ${isGenerating ? 'opacity-50 cursor-not-allowed' : 'hover:-translate-y-1 hover:shadow-blue-500/20'}`}>
                        {isGenerating ? <div className="animate-spin h-5 w-5 border-2 border-white/30 border-t-white rounded-full"></div> : <i className="fas fa-magic"></i>}
                        Optimizar con IA
                    </button>
                    <div className="bg-gray-900/50 p-4 rounded-xl border border-dashed border-gray-600 text-center">
                        <i className="fas fa-cloud-upload-alt text-gray-500 text-2xl mb-2"></i>
                        <p className="text-xs text-gray-500 italic">Sube una foto real del producto para aumentar tus ventas.</p>
                    </div>
                </div>
            )}

            {isCartOpen && (
                <div className="fixed inset-0 z-50 overflow-hidden">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsCartOpen(false)}></div>
                    <div className="absolute right-0 top-0 h-full w-full max-w-md bg-gray-900 shadow-2xl animate-fade-in-right border-l border-amber-500/30 flex flex-col">
                        <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-800/50">
                            <h3 className="text-xl font-black text-white flex items-center gap-2">
                                <ion-icon name="cart-outline"></ion-icon> Tu Carrito
                            </h3>
                            <button onClick={() => setIsCartOpen(false)} className="text-gray-400 hover:text-white p-2">
                                <ion-icon name="close-outline" className="text-3xl"></ion-icon>
                            </button>
                        </div>
                        <div className="flex-grow overflow-y-auto p-4 space-y-4">
                            {cart.length > 0 ? cart.map(item => (
                                <div key={item.id} className="bg-gray-800 rounded-xl p-3 flex gap-4 items-center border border-gray-700">
                                    <img src={item.imageUrl} className="w-16 h-16 object-contain rounded bg-gray-900 p-1" alt={item.name} />
                                    <div className="flex-grow min-w-0">
                                        <h4 className="text-sm font-bold text-white truncate">{item.name}</h4>
                                        <p className="text-amber-400 font-black text-sm">{formatCurrency(item.price)}</p>
                                        <div className="flex items-center gap-3 mt-2">
                                            <button onClick={() => updateCartQuantity(item.id, -1)} className="h-6 w-6 bg-gray-700 rounded flex items-center justify-center text-white hover:bg-gray-600">-</button>
                                            <span className="text-white text-sm font-bold">{item.quantity}</span>
                                            <button onClick={() => updateCartQuantity(item.id, 1)} className="h-6 w-6 bg-gray-700 rounded flex items-center justify-center text-white hover:bg-gray-600">+</button>
                                        </div>
                                    </div>
                                    <button onClick={() => removeFromCart(item.id)} className="text-red-500 p-2 hover:bg-red-500/10 rounded-full transition-colors">
                                        <ion-icon name="trash-outline" className="text-xl"></ion-icon>
                                    </button>
                                </div>
                            )) : (
                                <div className="h-full flex flex-col items-center justify-center text-center p-12">
                                    <ion-icon name="basket-outline" className="text-7xl text-gray-700 mb-4"></ion-icon>
                                    <h4 className="text-xl font-bold text-gray-500">Carrito Vacío</h4>
                                    <p className="text-sm text-gray-600 mt-2">Agrega productos premium para verlos aquí.</p>
                                </div>
                            )}
                        </div>
                        {cart.length > 0 && (
                            <div className="p-6 border-t border-gray-800 bg-gray-800/50 space-y-4">
                                <div className="flex justify-between items-center text-gray-300">
                                    <span>Subtotal</span>
                                    <span>{formatCurrency(cartTotal)}</span>
                                </div>
                                <div className="flex justify-between items-center text-white font-black text-xl">
                                    <span>Total</span>
                                    <span className="text-amber-400">{formatCurrency(cartTotal)}</span>
                                </div>
                                <button onClick={() => { setIsCartOpen(false); setModal({ type: 'checkout', item: { total: cartTotal, cart } }); }} className="w-full bg-amber-500 text-gray-950 py-4 rounded-xl font-black uppercase tracking-widest hover:bg-amber-400 transition-all shadow-[0_10px_20px_rgba(245,158,11,0.2)]">
                                    Finalizar Compra
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </section>
    );
};

const AgendaPage: React.FC<{ appointments: Appointment[]; onCancel: (appointment: Appointment) => void; onEdit: (appointment: Appointment) => void; isAdmin: boolean }> = ({ appointments, onCancel, onEdit, isAdmin }) => {
    const today = new Date().toISOString().split('T')[0];
    const [selectedDate, setSelectedDate] = useState(today);
    const [view, setView] = useState<'upcoming' | 'history'>('upcoming');
    const [expandedDays, setExpandedDays] = useState<string[]>([]);

    const upcomingAppointments = appointments
        .filter(app => app.date >= today && app.status !== 'cancelled')
        .sort((a, b) => {
            const dateComp = a.date.localeCompare(b.date);
            return dateComp !== 0 ? dateComp : a.time.localeCompare(b.time);
        });

    const historyAppointments = appointments
        .filter(app => app.date < today || app.status === 'cancelled')
        .sort((a, b) => b.date.localeCompare(a.date));

    const groupedHistory = useMemo(() => {
        const groups: Record<string, Appointment[]> = {};
        historyAppointments.forEach(app => {
            if (!groups[app.date]) groups[app.date] = [];
            groups[app.date].push(app);
        });
        return groups;
    }, [historyAppointments]);

    const toggleDay = (date: string) => {
        setExpandedDays(prev => prev.includes(date) ? prev.filter(d => d !== date) : [...prev, date]);
    };

    const filteredUpcomingForDate = upcomingAppointments.filter(app => app.date === selectedDate);

    return (
        <section id="page-agenda" className="p-4 fade-in pb-24">
            <h2 className="section-title text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <i className="fas fa-calendar-alt text-amber-500"></i> Mi Agenda
            </h2>

            <div className="flex bg-gray-900/50 p-1 rounded-xl mb-6 border border-gray-800">
                <button 
                    onClick={() => setView('upcoming')} 
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${view === 'upcoming' ? 'bg-amber-500 text-gray-950 shadow-lg' : 'text-gray-400 hover:text-white'}`}
                >
                    Próximas Citas
                </button>
                <button 
                    onClick={() => setView('history')} 
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${view === 'history' ? 'bg-amber-500 text-gray-950 shadow-lg' : 'text-gray-400 hover:text-white'}`}
                >
                    Historial
                </button>
            </div>

            {view === 'upcoming' ? (
                <div className="space-y-6">
                    <div className="bg-gray-800/40 p-4 rounded-xl border border-gray-700">
                        <label className="block text-[10px] font-black text-amber-500 uppercase tracking-widest mb-2">Filtrar por día</label>
                        <input 
                            type="date" 
                            min={today} 
                            value={selectedDate} 
                            onChange={e => setSelectedDate(e.target.value)} 
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-amber-500 outline-none font-bold" 
                        />
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest px-2">Agenda para: {selectedDate === today ? 'Hoy' : selectedDate}</h3>
                        {filteredUpcomingForDate.length > 0 ? filteredUpcomingForDate.map((app) => (
                            <div key={app.id} className="bg-gray-800/80 backdrop-blur-sm border-l-4 border-amber-500 p-5 rounded-xl shadow-xl hover:translate-x-1 transition-transform border border-gray-700/50 group">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xl font-black text-white italic">{app.time}</span>
                                            <span className="text-gray-500">—</span>
                                            <span className="text-sm font-bold text-gray-400">{app.endTime}</span>
                                        </div>
                                        <p className="text-amber-400 font-black text-lg">{app.barberName}</p>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {app.services.map((s, idx) => (
                                                <span key={idx} className="bg-gray-900 text-gray-300 text-[10px] px-2 py-0.5 rounded border border-gray-700 uppercase font-bold">{s.name}</span>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-3">
                                        <span className="bg-green-500/10 text-green-500 text-[10px] font-black px-2 py-1 rounded border border-green-500/20 uppercase tracking-widest">Confirmada</span>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => onEdit(app)} className="h-8 w-8 bg-blue-600 text-white rounded-lg flex items-center justify-center hover:bg-blue-500 shadow-lg"><i className="fas fa-edit text-xs"></i></button>
                                            <button onClick={() => onCancel(app)} className="h-8 w-8 bg-red-600 text-white rounded-lg flex items-center justify-center hover:bg-red-500 shadow-lg"><i className="fas fa-trash text-xs"></i></button>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-4 pt-4 border-t border-gray-700/50 flex justify-between items-center">
                                    <span className="text-gray-500 text-xs">Valor del servicio:</span>
                                    <span className="text-white font-black text-sm">{formatCurrency(app.total)}</span>
                                </div>
                            </div>
                        )) : (
                            <div className="flex flex-col items-center justify-center py-12 text-center opacity-50 grayscale">
                                <ion-icon name="calendar-clear-outline" className="text-6xl mb-4"></ion-icon>
                                <p className="text-gray-400 font-bold">No tienes citas agendadas para este día.</p>
                                <button className="text-amber-500 text-sm mt-2 underline">Agendar nueva cita</button>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest px-2 mb-4">Historial de Servicios</h3>
                    {Object.keys(groupedHistory).length > 0 ? Object.entries(groupedHistory).map(([date, dailyApps]) => {
                        const apps = dailyApps as Appointment[];
                        const isExpanded = expandedDays.includes(date);
                        const dayTotal = apps.reduce((sum, app) => sum + app.total, 0);
                        return (
                            <div key={date} className="overflow-hidden bg-gray-900 border border-gray-800 rounded-xl transition-all">
                                <button 
                                    onClick={() => toggleDay(date)}
                                    className={`w-full p-4 flex items-center justify-between text-left transition-colors ${isExpanded ? 'bg-amber-500/10' : 'hover:bg-gray-800'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center border ${isExpanded ? 'bg-amber-500 text-gray-950 border-amber-600' : 'bg-gray-800 text-amber-500 border-gray-700'}`}>
                                            <i className={`fas ${isExpanded ? 'fa-folder-open' : 'fa-folder'}`}></i>
                                        </div>
                                        <div>
                                            <p className="text-white font-black text-sm">{date === today ? 'Hoy (Cerrado)' : date}</p>
                                            <p className="text-xs text-gray-500 font-bold uppercase">{apps.length} Servicios realizados</p>
                                        </div>
                                    </div>
                                    <div className="text-right flex flex-col items-end">
                                        <p className="text-amber-400 font-black text-sm">{formatCurrency(dayTotal)}</p>
                                        <i className={`fas fa-chevron-down text-[10px] text-gray-600 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}></i>
                                    </div>
                                </button>

                                <div className={`transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[2000px] opacity-100 p-4 border-t border-gray-800 bg-gray-950/30' : 'max-h-0 opacity-0 invisible p-0 overflow-hidden'}`}>
                                    <div className="space-y-3">
                                        {apps.map(app => (
                                            <div key={app.id} className="p-3 bg-gray-900/50 rounded-lg border border-gray-800/50 flex justify-between items-center group">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-black text-gray-300">{app.time}</span>
                                                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-tighter ${app.status === 'cancelled' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}>
                                                            {app.status === 'cancelled' ? 'Cancelado' : 'Finalizado'}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm font-bold text-white mt-1">{app.barberName}</p>
                                                    <p className="text-[10px] text-gray-500 italic">{app.services.map(s => s.name).join(', ')}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs font-black text-gray-300">{formatCurrency(app.total)}</p>
                                                    <button className="text-[10px] text-amber-500 font-bold hover:underline opacity-0 group-hover:opacity-100 transition-opacity">Ver Recibo</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        );
                    }) : (
                        <div className="text-center py-20 opacity-30">
                            <i className="fas fa-history text-5xl mb-4"></i>
                            <p className="font-bold">No hay registros históricos todavía.</p>
                        </div>
                    )}
                </div>
            )}
        </section>
    );
};

const ProfilePage: React.FC<{ profile: UserProfile; onUpdate: (p: UserProfile) => void; isAdmin: boolean; onToggleAdmin: () => void; onManualSave: () => void }> = ({ profile, onUpdate, isAdmin, onToggleAdmin, onManualSave }) => {
    const [localProfile, setLocalProfile] = useState(profile);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        onUpdate(localProfile);
    };

    return (
        <section id="page-perfil" className="p-4 fade-in">
            <h2 className="section-title text-2xl font-bold text-white mb-6">Perfil</h2>
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                <form onSubmit={handleSave} className="space-y-4">
                    <div className="flex flex-col items-center mb-4">
                        <div className="relative">
                            <img src={localProfile.pic || 'https://picsum.photos/seed/user/100/100'} className="w-24 h-24 rounded-full border-4 border-amber-500 object-cover" alt="Avatar" />
                            <button type="button" onClick={() => fileInputRef.current?.click()} className="absolute bottom-0 right-0 bg-amber-500 text-gray-950 p-2 rounded-full shadow-lg border-2 border-gray-800"><i className="fas fa-camera"></i></button>
                        </div>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-amber-400 uppercase mb-1">Nombre Completo</label>
                        <input value={localProfile.name} onChange={e => setLocalProfile({...localProfile, name: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:ring-amber-500 outline-none" placeholder="Nombre" />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-amber-400 uppercase mb-1">Email</label>
                        <input value={localProfile.email} onChange={e => setLocalProfile({...localProfile, email: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:ring-amber-500 outline-none" placeholder="Email" />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-amber-400 uppercase mb-1">Dirección de Envío</label>
                        <input value={localProfile.address || ''} onChange={e => setLocalProfile({...localProfile, address: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:ring-amber-500 outline-none" placeholder="Tu dirección para domicilios" />
                    </div>
                    <button type="submit" className="w-full bg-amber-500 text-gray-900 py-3 rounded-xl font-black uppercase tracking-widest mt-4">Actualizar Perfil</button>
                </form>

                <div className="mt-8 pt-6 border-t border-gray-700 space-y-6">
                    <div>
                        <h3 className="text-xs font-black text-amber-400 uppercase tracking-widest mb-3">Backup de Datos</h3>
                        <button 
                            onClick={onManualSave}
                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-4 rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg"
                        >
                            <i className="fas fa-cloud-upload-alt text-xl"></i>
                            Guardar Información Diaria
                        </button>
                        <p className="text-[10px] text-gray-500 text-center mt-2 italic">Esto sincronizará tus cambios actuales en el almacenamiento local seguro del dispositivo.</p>
                    </div>

                    <div className="flex justify-between items-center bg-gray-900/50 p-4 rounded-xl border border-gray-700">
                        <div>
                            <span className="text-sm font-bold block text-white">Modo Administrador</span>
                            <span className="text-[10px] text-gray-500">Solo para dueños de barbería</span>
                        </div>
                        <button onClick={onToggleAdmin} className={`w-14 h-7 rounded-full transition-colors ${isAdmin ? 'bg-red-600' : 'bg-gray-600'} relative p-1`}>
                            <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-all ${isAdmin ? 'right-1' : 'left-1'}`} />
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
};

const App: React.FC = () => {
    // Initial state loading from localStorage or constants
    const [appointments, setAppointments] = useState<Appointment[]>(() => loadLocalData(SAVE_KEYS.APPOINTMENTS, []));
    const [services, setServices] = useState<Service[]>(() => loadLocalData(SAVE_KEYS.SERVICES, ALL_SERVICES));
    const [barbers, setBarbers] = useState<Barber[]>(() => loadLocalData(SAVE_KEYS.BARBERS, MOCK_BARBERS));
    const [products, setProducts] = useState<Product[]>(() => loadLocalData(SAVE_KEYS.PRODUCTS, MOCK_PRODUCTS));
    const [cart, setCart] = useState<CartItem[]>(() => loadLocalData(SAVE_KEYS.CART, []));
    const [isAdmin, setIsAdmin] = useState<boolean>(() => loadLocalData(SAVE_KEYS.ADMIN_MODE, false));
    const [userProfile, setUserProfile] = useState<UserProfile>(() => loadLocalData(SAVE_KEYS.PROFILE, {
        name: 'Usuario Demo', email: 'usuario@ejemplo.com', phone: '3001234567', bio: '', pic: null, address: 'Carrera 7 # 100-20, Bogotá'
    }));

    const [currentPage, setCurrentPage] = useState<Page>('inicio');
    const [selectedServices, setSelectedServices] = useState<Service[]>([]);
    const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);
    const [modalState, setModalState] = useState<ModalState>({ type: 'none' });
    const [showNotifications, setShowNotifications] = useState(false);
    const [pushPermission, setPushPermission] = useState(Notification.permission);
    
    // Toast Notification State
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);

    const [availabilityFilter, setAvailabilityFilter] = useState(false);
    const [specialtyFilter, setSpecialtyFilter] = useState('all');
    const [levelFilter, setLevelFilter] = useState('all');
    const [radiusFilter, setRadiusFilter] = useState('all');
    const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null);

    // AUTO-SAVE EFFECTS
    useEffect(() => { saveLocalData(SAVE_KEYS.APPOINTMENTS, appointments); }, [appointments]);
    useEffect(() => { saveLocalData(SAVE_KEYS.SERVICES, services); }, [services]);
    useEffect(() => { saveLocalData(SAVE_KEYS.BARBERS, barbers); }, [barbers]);
    useEffect(() => { saveLocalData(SAVE_KEYS.PRODUCTS, products); }, [products]);
    useEffect(() => { saveLocalData(SAVE_KEYS.CART, cart); }, [cart]);
    useEffect(() => { saveLocalData(SAVE_KEYS.PROFILE, userProfile); }, [userProfile]);
    useEffect(() => { saveLocalData(SAVE_KEYS.ADMIN_MODE, isAdmin); }, [isAdmin]);

    const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    }, []);

    const handleManualSave = () => {
        saveLocalData(SAVE_KEYS.APPOINTMENTS, appointments);
        saveLocalData(SAVE_KEYS.SERVICES, services);
        saveLocalData(SAVE_KEYS.BARBERS, barbers);
        saveLocalData(SAVE_KEYS.PRODUCTS, products);
        saveLocalData(SAVE_KEYS.CART, cart);
        saveLocalData(SAVE_KEYS.PROFILE, userProfile);
        saveLocalData(SAVE_KEYS.ADMIN_MODE, isAdmin);
        
        showToast('Backup completado con éxito', 'info');
        setModalState({ 
            type: 'message', 
            title: '✨ Información Respaldada', 
            message: 'Toda tu información (citas, productos y perfil) ha sido guardada exitosamente en este dispositivo.' 
        });
    };

    const refreshLocation = useCallback(() => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setUserLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    });
                },
                (error) => {
                    console.error("Error getting location:", error);
                    setModalState({ type: 'message', title: 'Ubicación Desactivada', message: 'No pudimos obtener tu ubicación GPS. Revisa tus permisos.' });
                }
            );
        }
    }, []);

    const addToCart = (product: Product) => {
        setCart(prev => {
            const existing = prev.find(item => item.id === product.id);
            if (existing) {
                return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
            }
            return [...prev, { ...product, quantity: 1 }];
        });
        showToast(`${product.name} añadido`, 'success');
        triggerSWNotification('🛒 Carrito Actualizado', `${product.name} añadido.`);
    };

    const removeFromCart = (id: string) => {
        setCart(prev => prev.filter(item => item.id !== id));
    };

    const updateCartQuantity = (id: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.id === id) {
                const newQty = Math.max(1, item.quantity + delta);
                return { ...item, quantity: newQty };
            }
            return item;
        }));
    };

    const filteredBarbers = useMemo(() => {
        return barbers.filter(b => {
            if (availabilityFilter && !b.isAvailable) return false;
            if (specialtyFilter !== 'all' && b.specialty !== specialtyFilter) return false;
            if (levelFilter !== 'all' && b.professionLevel !== levelFilter) return false;
            
            if (radiusFilter !== 'all' && userLocation) {
                const distance = getDistance(userLocation.lat, userLocation.lng, b.location.lat, b.location.lng);
                if (distance > parseInt(radiusFilter)) return false;
            }

            return true;
        });
    }, [barbers, availabilityFilter, specialtyFilter, levelFilter, radiusFilter, userLocation]);

    const handleEnablePush = async () => {
        const p = await requestNotificationPermission();
        if (p) setPushPermission(p);
    };

    const handlePageChange = (page: Page) => {
        setCurrentPage(page);
        window.scrollTo(0, 0);
    };

    const toggleService = (service: Service) => {
        setSelectedServices(prev => prev.find(s => s.id === service.id) ? prev.filter(s => s.id !== service.id) : [...prev, service]);
    };

    const isConflict = (barberId: string, date: string, time: string, duration: number) => {
        const newStart = timeToMinutes(time);
        const newEnd = newStart + duration;
        return appointments.some(app => {
            if (app.barberId !== barberId || app.date !== date || app.status === 'cancelled') return false;
            const appStart = timeToMinutes(app.time);
            const appEnd = timeToMinutes(app.endTime);
            return (newStart < appEnd && newEnd > appStart);
        });
    };

    const handleConfirmBooking = (date: string, time: string) => {
        if (!selectedBarber || selectedServices.length === 0) return;
        
        const totalDuration = selectedServices.reduce((acc, s) => acc + s.duration, 0);
        const totalPrice = selectedServices.reduce((acc, s) => acc + s.price, 0);

        const now = new Date();
        const selectedDateObj = new Date(date + 'T' + time);
        if (selectedDateObj < now) {
            alert("No puedes agendar en el pasado.");
            return;
        }

        const startMin = timeToMinutes(time);
        if (startMin < 480 || startMin > 1200) {
            alert("Nuestro horario de atención es de 08:00 AM a 08:00 PM.");
            return;
        }

        if (isConflict(selectedBarber.id, date, time, totalDuration)) {
            alert("El barbero ya tiene una cita en ese horario. Por favor elige otro.");
            return;
        }
        
        const newAppointment: Appointment = {
            id: Date.now().toString(),
            barberId: selectedBarber.id,
            barberName: selectedBarber.name,
            userId: userProfile.name,
            services: selectedServices.map(s => ({ name: s.name, price: s.price, duration: s.duration })),
            total: totalPrice,
            date: date,
            time: time,
            endTime: calculateEndTime(time, totalDuration),
            status: 'confirmed'
        };

        setAppointments([...appointments, newAppointment]);
        setSelectedServices([]);
        setSelectedBarber(null);
        setModalState({ type: 'none' });
        showToast('Cita confirmada con éxito', 'success');
        triggerSWNotification('📅 Cita Confirmada', `Cita con ${selectedBarber.name} el ${date}.`);
        setCurrentPage('agenda');
    };

    const renderModalContent = () => {
        if (modalState.type === 'none') return null;
        const closeModal = () => setModalState({ type: 'none' });

        if (modalState.type === 'checkout' && modalState.item) {
            const checkoutData = modalState.item as { total: number; cart: CartItem[] };
            const total = checkoutData.total;
            const cartItems = checkoutData.cart;
            return (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-md">
                    <div className="bg-gray-900 w-full max-w-lg rounded-2xl border border-amber-500 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-4 bg-gray-800 border-b border-amber-500/30 flex justify-between items-center">
                            <h3 className="text-xl font-black text-white italic uppercase tracking-tighter">Checkout Pro</h3>
                            <button onClick={closeModal} className="text-gray-400 hover:text-white p-2"><ion-icon name="close-outline" className="text-3xl"></ion-icon></button>
                        </div>
                        <div className="p-6 overflow-y-auto space-y-6">
                            <section>
                                <h4 className="text-xs font-black text-amber-400 uppercase tracking-widest mb-3">Resumen de Pedido</h4>
                                <div className="space-y-2">
                                    {cartItems && cartItems.map((item: CartItem) => (
                                        <div key={item.id} className="flex justify-between text-sm text-gray-300">
                                            <span>{item.name} x{item.quantity}</span>
                                            <span className="font-bold">{formatCurrency(item.price * item.quantity)}</span>
                                        </div>
                                    ))}
                                    <div className="border-t border-gray-700 pt-2 flex justify-between text-white font-black">
                                        <span>TOTAL A PAGAR</span>
                                        <span className="text-amber-400 text-lg">{formatCurrency(total)}</span>
                                    </div>
                                </div>
                            </section>
                            <section>
                                <h4 className="text-xs font-black text-amber-400 uppercase tracking-widest mb-3">Método de Pago</h4>
                                <div className="grid grid-cols-1 gap-3">
                                    <button onClick={() => setModalState({ type: 'message', title: 'Pago con Tarjeta', message: 'Serás redirigido a la pasarela de pagos segura (Visa/Mastercard/AMEX) para completar la transacción.' })} className="flex items-center gap-4 p-4 bg-blue-900/40 border border-blue-500 rounded-xl hover:bg-blue-900/60 transition group">
                                        <div className="h-10 w-10 bg-blue-600 rounded-lg flex items-center justify-center text-white"><i className="fas fa-credit-card"></i></div>
                                        <div className="text-left">
                                            <p className="font-bold text-white">Tarjeta de Crédito / Débito</p>
                                            <p className="text-[10px] text-blue-300">Visa, Mastercard, AMEX</p>
                                        </div>
                                    </button>
                                    <button onClick={() => setModalState({ type: 'message', title: 'Transferencia Nequi', message: 'Transfiere a la línea 3001234567 y adjunta el soporte vía WhatsApp para procesar tu envío.' })} className="flex items-center gap-4 p-4 bg-purple-900/40 border border-purple-500 rounded-xl hover:bg-purple-900/60 transition">
                                        <div className="h-10 w-10 bg-[#e0196d] rounded-lg flex items-center justify-center font-black italic text-white">N</div>
                                        <div className="text-left">
                                            <p className="font-bold text-white">Nequi</p>
                                            <p className="text-[10px] text-purple-300">Transferencia inmediata</p>
                                        </div>
                                    </button>
                                    <button onClick={() => setModalState({ type: 'message', title: 'Transferencia Bancolombia', message: 'Cuenta de Ahorros: 123-456789-01. Envía el comprobante para despachar.' })} className="flex items-center gap-4 p-4 bg-blue-900/40 border border-blue-500 rounded-xl hover:bg-blue-900/60 transition">
                                        <div className="h-10 w-10 bg-[#fdcb00] rounded-lg flex items-center justify-center font-black italic text-[#000000]">B</div>
                                        <div className="text-left">
                                            <p className="font-bold text-white">Bancolombia</p>
                                            <p className="text-[10px] text-blue-300">Ahorros / A la mano</p>
                                        </div>
                                    </button>
                                    <button onClick={() => { setCart([]); showToast('Pedido realizado', 'success'); setModalState({ type: 'message', title: 'Pedido Confirmado', message: 'Tu pedido será entregado en la dirección proporcionada. Pagas al recibir.' }); }} className="flex items-center gap-4 p-4 bg-green-900/40 border border-green-500 rounded-xl hover:bg-green-900/60 transition">
                                        <div className="h-10 w-10 bg-green-600 rounded-lg flex items-center justify-center text-white"><i className="fas fa-truck"></i></div>
                                        <div className="text-left">
                                            <p className="font-bold text-white">Pago Contra Entrega</p>
                                            <p className="text-[10px] text-green-300">Efectivo al recibir</p>
                                        </div>
                                    </button>
                                </div>
                            </section>
                        </div>
                    </div>
                </div>
            );
        }

        if (modalState.type === 'agenda' && modalState.item) {
            const barber = modalState.item as Barber;
            const today = new Date().toISOString().split('T')[0];
            return (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-gray-900 p-6 rounded-xl border border-amber-500 shadow-2xl max-sm w-full">
                        <h3 className="text-xl font-bold text-white mb-4">Seleccionar Agenda</h3>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const formData = new FormData(e.currentTarget);
                            handleConfirmBooking(formData.get('date') as string, formData.get('time') as string);
                        }}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs text-amber-400 font-bold uppercase mb-1">Día</label>
                                    <input name="date" type="date" min={today} defaultValue={today} required className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white" />
                                </div>
                                <div>
                                    <label className="block text-xs text-amber-400 font-bold uppercase mb-1">Hora</label>
                                    <input name="time" type="time" required className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white" />
                                </div>
                            </div>
                            <div className="mt-6 flex space-x-3">
                                <button type="submit" className="flex-1 bg-amber-500 text-gray-900 font-bold py-2 rounded">Confirmar</button>
                                <button type="button" onClick={closeModal} className="flex-1 bg-gray-700 text-white py-2 rounded">Cerrar</button>
                            </div>
                        </form>
                    </div>
                </div>
            );
        }

        if (modalState.type === 'loading' || modalState.type === 'message') {
             return (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className={`bg-gray-900 p-6 rounded-xl border shadow-2xl flex flex-col items-center max-w-sm w-full ${modalState.type === 'loading' ? 'border-amber-500 animate-pulse' : 'border-gray-700'}`}>
                        {modalState.type === 'loading' ? <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mb-4"></div> : <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-amber-100 mb-4"><i className="fas fa-info text-amber-600 text-xl"></i></div>}
                        <h3 className="text-xl font-bold text-white text-center">{modalState.title}</h3>
                        <p className="text-gray-300 mt-2 text-center">{modalState.message}</p>
                        {modalState.type === 'message' && <button onClick={closeModal} className="mt-5 w-full bg-amber-600 text-white py-2 rounded-md hover:bg-amber-700">Entendido</button>}
                    </div>
                </div>
            );
        }

        if (modalState.type === 'barberProfile' && modalState.item) {
            const barber = modalState.item as Barber;
            return (
                <div className="fixed inset-0 bg-black/90 z-50 overflow-y-auto">
                    <div className="min-h-screen px-4 py-12 flex items-center justify-center">
                        <div className="bg-gray-900 w-full max-w-md p-6 rounded-2xl border border-gray-700 relative">
                            <button onClick={closeModal} className="absolute top-4 right-4 text-gray-400"><ion-icon name="close-circle" className="text-3xl"></ion-icon></button>
                            <img src={barber.profilePicUrl} className="w-24 h-24 rounded-full mx-auto border-4 border-amber-500 object-cover" />
                            <h3 className="text-2xl font-bold text-white text-center mt-4">{barber.name}</h3>
                            <p className="text-amber-400 text-center uppercase text-xs font-black tracking-widest">{barber.professionLevel}</p>
                            <p className="text-gray-400 text-sm text-center mt-3">{barber.bio}</p>
                            <div className="mt-6">
                                {selectedServices.length > 0 ? (
                                    <div className="bg-gray-800 p-4 rounded-lg border border-amber-500/30">
                                        <p className="text-sm font-bold text-white mb-2">Servicios:</p>
                                        {selectedServices.map(s => <div key={s.id} className="text-xs text-gray-400 mb-1 flex justify-between"><span>{s.name}</span> <span>{formatCurrency(s.price)}</span></div>)}
                                        <button onClick={() => setModalState({ type: 'agenda', item: barber })} className="w-full mt-4 bg-amber-500 text-gray-900 py-3 rounded-xl font-black uppercase tracking-wider shadow-lg">Agendar Cita</button>
                                    </div>
                                ) : (
                                    <div className="text-center p-4 border border-dashed border-gray-700 rounded-lg">
                                        <p className="text-sm text-gray-500">Debes elegir servicios primero.</p>
                                        <button onClick={() => { closeModal(); handlePageChange('servicios'); }} className="mt-2 text-amber-500 text-xs font-bold underline">Ir a Servicios</button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            );
        }
        
        if (modalState.type === 'confirmCancel' && modalState.item && isAppointment(modalState.item)) {
             return (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-900 p-6 rounded-xl border border-red-500 shadow-2xl max-sm w-full text-center">
                        <h3 className="text-xl font-bold text-white mb-6">¿Cancelar cita?</h3>
                        <div className="flex space-x-3">
                            <button onClick={() => { 
                                setAppointments(appointments.filter(a => a.id !== (modalState.item as any).id)); 
                                closeModal();
                                showToast('Cita cancelada correctamente', 'error');
                            }} className="flex-1 bg-red-600 py-2 rounded font-bold">Sí, Cancelar</button>
                            <button onClick={closeModal} className="flex-1 bg-gray-700 py-2 rounded">No</button>
                        </div>
                    </div>
                </div>
            );
        }

        return null;
    };

    return (
        <div className="flex flex-col h-full bg-gray-950 text-gray-200 font-sans">
            <Header userProfilePic={userProfile.pic} onProfileClick={() => handlePageChange('perfil')} hasUnread={MOCK_NOTIFICATIONS.length > 0} onNotificationClick={() => setShowNotifications(!showNotifications)} isAdmin={isAdmin} />
            {showNotifications && <NotificationsPanel notifications={MOCK_NOTIFICATIONS} onClose={() => setShowNotifications(false)} onEnablePush={handleEnablePush} pushEnabled={pushPermission === 'granted'} />}
            
            {/* Toast System */}
            {toast && (
                <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-[60] px-6 py-3 rounded-xl shadow-2xl border-l-4 flex items-center gap-3 animate-fade-in-down transition-all ${
                    toast.type === 'success' ? 'bg-green-900/95 border-green-500 text-green-100' : 
                    toast.type === 'error' ? 'bg-red-900/95 border-red-500 text-red-100' : 
                    'bg-blue-900/95 border-blue-500 text-blue-100'
                }`}>
                    <i className={`fas ${
                        toast.type === 'success' ? 'fa-check-circle text-green-400' : 
                        toast.type === 'error' ? 'fa-trash-alt text-red-400' : 
                        'fa-info-circle text-blue-400'
                    }`}></i>
                    <span className="font-bold text-sm tracking-tight">{toast.message}</span>
                </div>
            )}

            <main className="flex-1 overflow-y-auto pb-20 relative scroll-smooth">
                {currentPage === 'inicio' && <HomePage products={products} onPageChange={handlePageChange} setModal={setModalState} isAdmin={isAdmin} addToCart={addToCart} />}
                {currentPage === 'servicios' && <ServicesPage availableServices={services} selectedServices={selectedServices} toggleService={toggleService} onPageChange={handlePageChange} setModal={setModalState} applyLLMRecommendation={(ids) => setSelectedServices(services.filter(s => ids.includes(s.id)))} isAdmin={isAdmin} onDeleteService={(id) => setServices(services.filter(s => s.id !== id))} />}
                {currentPage === 'barberos' && <BarbersPage barbers={filteredBarbers} onSelectBarber={(b) => { setSelectedBarber(b); setModalState({ type: 'barberProfile', item: b }); }} selectedBarber={selectedBarber} availabilityFilter={availabilityFilter} onAvailabilityChange={setAvailabilityFilter} specialtyFilter={specialtyFilter} onSpecialtyChange={setSpecialtyFilter} levelFilter={levelFilter} onLevelChange={setLevelFilter} radiusFilter={radiusFilter} onRadiusChange={setRadiusFilter} userLocation={userLocation} onRefreshLocation={refreshLocation} allSpecialties={['all', ...new Set(barbers.map(b => b.specialty))]} allLevels={['all', ...new Set(barbers.map(b => b.professionLevel))]} isAdmin={isAdmin} setModal={setModalState} />}
                {currentPage === 'comercio' && <CommercePage products={products} setModal={setModalState} isAdmin={isAdmin} onDeleteProduct={(id) => setProducts(products.filter(p => p.id !== id))} cart={cart} addToCart={addToCart} removeFromCart={removeFromCart} updateCartQuantity={updateCartQuantity} />}
                {currentPage === 'agenda' && <AgendaPage appointments={appointments} onCancel={(app) => setModalState({type: 'confirmCancel', item: app})} onEdit={(app) => setModalState({type: 'agenda', item: barbers.find(b=>b.id===app.barberId)})} isAdmin={isAdmin} />}
                {currentPage === 'perfil' && <ProfilePage profile={userProfile} onUpdate={setUserProfile} isAdmin={isAdmin} onToggleAdmin={() => setIsAdmin(!isAdmin)} onManualSave={handleManualSave} />}
            </main>
            <BottomNav currentPage={currentPage} onPageChange={handlePageChange} />
            {renderModalContent()}
        </div>
    );
};

export default App;
