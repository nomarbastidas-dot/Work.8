
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Appointment, Barber, Product, Service, Page, ModalState, UserProfile, FeaturedWork, StyleRecommendation, CartItem } from './types';
import { MOCK_BARBERS, MOCK_PRODUCTS, ALL_SERVICES } from './constants';
import { getStyleRecommendation, generateProductDescription } from './services/geminiService';

// Declare Leaflet globally
declare const L: any;

// UTILS
const formatCurrency = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

const loadLocalData = <T,>(key: string, defaultValue: T): T => {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : defaultValue;
};

const saveLocalData = (key: string, data: any) => {
    localStorage.setItem(key, JSON.stringify(data));
};

const SAVE_KEYS = {
    BARBERS: 'w8_barbers_v2',
    PRODUCTS: 'w8_products_v2',
    PROFILE: 'w8_profile_v2',
    ADMIN_MODE: 'w8_admin_v2',
    FEATURED_WORKS: 'w8_featured_v2',
    APPOINTMENTS: 'w8_appointments_v2',
    CART: 'w8_cart_v2'
};

// --- MODAL COMPONENTS ---

const CheckoutModal: React.FC<{ cart: CartItem[]; close: () => void; confirm: () => void; updateQty: (id: string, q: number) => void }> = ({ cart, close, confirm, updateQty }) => {
    const total = useMemo(() => cart.reduce((acc, item) => acc + (item.price * item.quantity), 0), [cart]);
    const [method, setMethod] = useState<'nequi' | 'bancolombia' | 'efectivo' | null>(null);

    return (
        <div className="fixed inset-0 bg-gray-950/95 z-[70] backdrop-blur-2xl flex items-center justify-center p-6 animate-fade-in overflow-y-auto">
            <div className="bg-gray-900 w-full max-w-2xl rounded-[3rem] border border-amber-500/20 overflow-hidden relative shadow-2xl flex flex-col p-8 sm:p-12">
                <button onClick={close} className="absolute top-6 right-6 w-12 h-12 rounded-full bg-gray-950/50 backdrop-blur-md flex items-center justify-center text-white hover:bg-white hover:text-black transition-all z-20">
                    <ion-icon name="close" class="text-3xl"></ion-icon>
                </button>

                <div className="space-y-8">
                    <div className="space-y-2 text-center sm:text-left">
                        <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter leading-none">Confirmar Pedido</h2>
                        <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.4em]">Resumen de tu compra premium</p>
                    </div>

                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 no-scrollbar">
                        {cart.map(item => (
                            <div key={item.id} className="flex items-center gap-4 bg-gray-800/40 p-4 rounded-2xl border border-gray-700/50">
                                <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-950 flex-shrink-0">
                                    <img src={item.imageUrl} className="w-full h-full object-cover" alt={item.name} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-black text-white uppercase italic truncate">{item.name}</h4>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase">{formatCurrency(item.price)} la unidad</p>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <div className="flex items-center gap-2 bg-gray-950 rounded-lg p-1 border border-gray-800">
                                        <button onClick={() => updateQty(item.id, -1)} className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-amber-500 transition-colors"><ion-icon name="remove"></ion-icon></button>
                                        <span className="text-xs font-black text-white w-4 text-center">{item.quantity}</span>
                                        <button onClick={() => updateQty(item.id, 1)} className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-amber-500 transition-colors"><ion-icon name="add"></ion-icon></button>
                                    </div>
                                    <span className="text-xs font-black text-white">{formatCurrency(item.price * item.quantity)}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="pt-6 border-t border-gray-800 flex justify-between items-end">
                        <div className="space-y-1">
                            <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Total a pagar</span>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                                <span className="text-4xl font-black text-white">{formatCurrency(total)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Método de Pago</h4>
                        <div className="grid grid-cols-3 gap-3">
                            <button onClick={() => setMethod('nequi')} className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all ${method === 'nequi' ? 'bg-purple-500/10 border-purple-500 text-purple-400' : 'bg-gray-800/50 border-gray-700 text-gray-500'}`}>
                                <ion-icon name="wallet-outline" class="text-2xl"></ion-icon>
                                <span className="text-[9px] font-black uppercase">Nequi</span>
                            </button>
                            <button onClick={() => setMethod('bancolombia')} className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all ${method === 'bancolombia' ? 'bg-amber-500/10 border-amber-500 text-amber-500' : 'bg-gray-800/50 border-gray-700 text-gray-500'}`}>
                                <ion-icon name="business-outline" class="text-2xl"></ion-icon>
                                <span className="text-[9px] font-black uppercase">Banco</span>
                            </button>
                            <button onClick={() => setMethod('efectivo')} className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all ${method === 'efectivo' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-gray-800/50 border-gray-700 text-gray-500'}`}>
                                <ion-icon name="cash-outline" class="text-2xl"></ion-icon>
                                <span className="text-[9px] font-black uppercase">Efectivo</span>
                            </button>
                        </div>
                    </div>

                    <button 
                        onClick={confirm}
                        disabled={!method || cart.length === 0}
                        className="w-full bg-amber-500 text-gray-950 py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 disabled:opacity-20 active:scale-95 transition-all"
                    >
                        {method ? `PAGAR CON ${method.toUpperCase()}` : 'SELECCIONA PAGO'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const ProductDetailsModal: React.FC<{ product: Product; close: () => void; addToCart: (p: Product, q: number) => void }> = ({ product, close, addToCart }) => {
    const [qty, setQty] = useState(1);
    
    return (
        <div className="fixed inset-0 bg-gray-950/95 z-[70] backdrop-blur-2xl flex items-center justify-center p-6 animate-fade-in overflow-y-auto">
            <div className="bg-gray-900 w-full max-w-4xl rounded-[3.5rem] border border-amber-500/20 overflow-hidden relative shadow-2xl flex flex-col md:flex-row min-h-[500px]">
                <button onClick={close} className="absolute top-6 right-6 w-12 h-12 rounded-full bg-gray-950/50 backdrop-blur-md flex items-center justify-center text-white hover:bg-white hover:text-black transition-all z-20">
                    <ion-icon name="close" class="text-3xl"></ion-icon>
                </button>
                <div className="md:w-1/2 relative bg-gray-950 overflow-hidden group">
                    <img src={product.imageUrl} className="w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-110" alt={product.name} />
                </div>
                <div className="md:w-1/2 p-10 md:p-14 flex flex-col justify-between space-y-10">
                    <div className="space-y-8">
                        <div className="space-y-2">
                            <span className="text-[11px] font-black text-amber-500 uppercase tracking-[0.5em] block">{product.brand}</span>
                            <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter leading-none">{product.name}</h2>
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest border border-gray-800 px-2 py-1 rounded-md">REF: {product.reference}</span>
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                <span className="text-[9px] font-black text-emerald-500 uppercase">En Stock</span>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Experiencia Work8</h4>
                            <p className="text-base text-gray-300 leading-relaxed font-medium line-clamp-4">
                                {product.description || "Un producto de alta calidad diseñado para el cuidado profesional y personal. Obtén resultados excepcionales con nuestra línea exclusiva de barbería."}
                            </p>
                        </div>
                        <div className="flex items-end justify-between border-t border-gray-800 pt-8">
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Precio Total</p>
                                <span className="text-4xl font-black text-white">{formatCurrency(product.price * qty)}</span>
                            </div>
                            <div className="flex items-center gap-4 bg-gray-800/50 rounded-2xl p-2 border border-gray-700/50">
                                <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 rounded-xl transition-all"><ion-icon name="remove" class="text-xl"></ion-icon></button>
                                <span className="text-lg font-black text-white w-6 text-center">{qty}</span>
                                <button onClick={() => setQty(qty + 1)} className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 rounded-xl transition-all"><ion-icon name="add" class="text-xl"></ion-icon></button>
                            </div>
                        </div>
                    </div>
                    <button onClick={() => { addToCart(product, qty); close(); }} className="add-to-cart-btn flex-1 bg-amber-500 text-gray-950 py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 active:scale-95">
                        <ion-icon name="cart" class="text-2xl"></ion-icon>
                        AÑADIR AL CARRITO
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- AGENDA COMPONENTS ---

const TimeSlot: React.FC<{ 
    time: string; 
    appointment?: Appointment; 
    color: string; 
    onClick: () => void 
}> = ({ time, appointment, color, onClick }) => {
    const isOccupied = !!appointment;
    
    return (
        <div 
            onClick={!isOccupied ? onClick : undefined}
            className={`group relative p-4 rounded-3xl border transition-all duration-300 flex items-center gap-6 cursor-pointer overflow-hidden ${
                isOccupied 
                ? 'bg-gray-800/30 border-gray-800 opacity-80 cursor-not-allowed' 
                : 'bg-gray-900/40 border-gray-800 hover:border-amber-500/50 hover:bg-gray-900/60'
            }`}
        >
            <div className="w-20 flex-shrink-0">
                <span className={`text-xs font-black uppercase tracking-widest ${isOccupied ? 'text-gray-600' : 'text-gray-400 group-hover:text-amber-500'}`}>
                    {time}
                </span>
            </div>

            <div className="flex-1 flex flex-col gap-1">
                {isOccupied ? (
                    <>
                        <h4 className="text-sm font-black text-white uppercase italic">{appointment.barberName}</h4>
                        <div className="flex gap-2">
                            {appointment.services.map((s, i) => (
                                <span key={i} className="text-[9px] font-black text-amber-500 uppercase tracking-tight bg-amber-500/10 px-2 py-0.5 rounded-lg border-amber-500/20">
                                    {s.name}
                                </span>
                            ))}
                        </div>
                    </>
                ) : (
                    <span className="text-[10px] font-black text-gray-700 uppercase tracking-[0.3em] group-hover:text-gray-400 transition-colors">Disponible para reserva</span>
                )}
            </div>

            {!isOccupied && (
                <div className="w-10 h-10 rounded-full bg-amber-500/5 flex items-center justify-center text-amber-500 opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100">
                    <ion-icon name="add-outline" class="text-xl"></ion-icon>
                </div>
            )}
            
            {isOccupied && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                    <span className="text-[8px] font-black text-red-500 uppercase tracking-widest">Ocupado</span>
                </div>
            )}
        </div>
    );
};

const BookingTab: React.FC<{ 
    time: string; 
    close: () => void; 
    onSave: (name: string, serviceId: string) => void 
}> = ({ time, close, onSave }) => {
    const [name, setName] = useState('');
    const [serviceId, setServiceId] = useState('s1');

    const handleConfirm = () => {
        if (!name.trim()) return;
        onSave(name, serviceId);
    };

    return (
        <div className="fixed inset-0 bg-gray-950/90 z-[90] backdrop-blur-2xl flex items-center justify-center p-6 animate-fade-in">
            <div className="bg-gray-900 w-full max-w-lg rounded-[3rem] border border-amber-500/30 p-10 relative shadow-2xl animate-blue-flash">
                <button onClick={close} className="absolute top-8 right-8 w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 hover:text-white transition-all">
                    <ion-icon name="close" class="text-2xl"></ion-icon>
                </button>

                <div className="space-y-8">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-amber-500">
                            <ion-icon name="calendar-outline"></ion-icon>
                            <span className="text-[10px] font-black uppercase tracking-[0.4em]">{time}</span>
                        </div>
                        <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter">Agendar Cita</h3>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Nombre del Cliente</label>
                            <input 
                                autoFocus
                                type="text" 
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="w-full bg-gray-950 border border-gray-800 rounded-2xl py-4 px-6 text-sm text-white focus:border-amber-500 outline-none transition-all" 
                                placeholder="Ingresa tu nombre completo..." 
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Servicio Requerido</label>
                            <div className="grid grid-cols-1 gap-3">
                                <button 
                                    onClick={() => setServiceId('s1')}
                                    className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${serviceId === 's1' ? 'bg-amber-500/10 border-amber-500 text-amber-500' : 'bg-gray-800/50 border-gray-700 text-gray-500'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <ion-icon name="cut-outline" class="text-xl"></ion-icon>
                                        <span className="text-xs font-black uppercase">Corte Normal</span>
                                    </div>
                                    <span className="text-[9px] font-bold">30 MIN</span>
                                </button>
                                <button 
                                    onClick={() => setServiceId('s3')}
                                    className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${serviceId === 's3' ? 'bg-amber-500/10 border-amber-500 text-amber-500' : 'bg-gray-800/50 border-gray-700 text-gray-500'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <ion-icon name="brush-outline" class="text-xl"></ion-icon>
                                        <span className="text-xs font-black uppercase">Corte y Barba</span>
                                    </div>
                                    <span className="text-[9px] font-bold">60 MIN</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <button 
                        onClick={handleConfirm}
                        disabled={!name.trim()}
                        className="w-full bg-amber-500 text-gray-950 py-5 rounded-3xl font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 disabled:opacity-20 active:scale-95 transition-all"
                    >
                        CONFIRMAR CITA
                    </button>
                </div>
            </div>
        </div>
    );
};

// SHARED COMPONENTS
const ImagePicker: React.FC<{ value: string; onChange: (val: string) => void; label: string }> = ({ value, onChange, label }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState(value);

    useEffect(() => {
        setPreview(value);
    }, [value]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const base64 = await fileToBase64(file);
            setPreview(base64);
            onChange(base64);
        }
    };

    return (
        <div className="space-y-2">
            <label className="block text-xs font-black text-amber-500 uppercase tracking-widest">{label}</label>
            <div className="flex items-center gap-4 bg-gray-900/50 p-4 rounded-[2rem] border border-gray-800 hover:border-amber-500/30 transition-all group">
                <div className="w-24 h-24 rounded-2xl overflow-hidden bg-gray-800 flex-shrink-0 border border-gray-700 shadow-inner group-hover:scale-105 transition-transform duration-500">
                    {preview ? <img src={preview} className="w-full h-full object-cover" alt="Preview" /> : <div className="w-full h-full flex items-center justify-center text-gray-700"><i className="fas fa-image text-2xl"></i></div>}
                </div>
                <div className="flex-1 space-y-3">
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tight">Formatos: JPG, PNG. Máx 2MB.</p>
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full text-xs bg-amber-500/10 hover:bg-amber-500 text-amber-500 hover:text-gray-950 font-black py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 border border-amber-500/20">
                        <ion-icon name="cloud-upload-outline"></ion-icon> SUBIR FOTO
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                </div>
            </div>
        </div>
    );
};

// CIRCULAR BUTTON COMPONENT
const CircleButton: React.FC<{ icon: string; label: string; onClick: () => void; isActive?: boolean; glow?: boolean; badge?: number }> = ({ icon, label, onClick, isActive, glow, badge }) => (
    <button onClick={onClick} className={`flex flex-col items-center gap-2 group transition-all relative`}>
        <div className={`w-14 h-14 rounded-full flex items-center justify-center border-2 transition-all duration-300 relative ${
            glow ? 'border-amber-500 animate-glow-pulse shadow-[0_0_20px_rgba(245,158,11,0.4)]' : 
            isActive ? 'border-amber-500 bg-amber-500/10' : 'border-gray-800 bg-gray-900/50 group-hover:border-gray-600'
        }`}>
            <ion-icon name={icon} class={`text-2xl ${isActive || glow ? 'text-amber-500' : 'text-gray-400 group-hover:text-white'}`}></ion-icon>
            {isActive && <div className="absolute -bottom-1 w-2 h-2 bg-amber-500 rounded-full shadow-[0_0_8px_#f59e0b]"></div>}
            
            {badge !== undefined && badge > 0 && (
                <div className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-amber-500 rounded-full flex items-center justify-center border-2 border-gray-950 shadow-lg animate-bounce">
                    <span className="text-[10px] font-black text-gray-950">{badge > 99 ? '99+' : badge}</span>
                </div>
            )}
        </div>
        <span className={`text-[9px] font-black uppercase tracking-widest ${isActive || glow ? 'text-amber-500' : 'text-gray-500 group-hover:text-gray-300'}`}>{label}</span>
    </button>
);

const Header: React.FC<{ user: UserProfile; onProfile: () => void; isAdmin: boolean }> = ({ user, onProfile, isAdmin }) => (
    <header className={`sticky top-0 z-40 backdrop-blur-xl border-b transition-colors duration-500 ${isAdmin ? 'bg-red-950/20 border-red-500/30' : 'bg-gray-950/80 border-gray-800'}`}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20 rotate-3">
                    <i className="fas fa-cut text-gray-950 text-xl"></i>
                </div>
                <div>
                    <h1 className="text-xl font-black tracking-tighter text-white leading-none">WORK8<span className="text-amber-500">PRO</span></h1>
                    <p className="text-[10px] font-bold text-gray-500 tracking-[0.2em] uppercase">{isAdmin ? 'Master Admin' : 'Barber Studio'}</p>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <button onClick={onProfile} className="group relative">
                    <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-gray-800 group-hover:border-amber-500 transition-all p-0.5">
                        <img src={user.pic || 'https://picsum.photos/seed/user/100/100'} className="w-full h-full rounded-full object-cover" alt="User" />
                    </div>
                </button>
            </div>
        </div>
    </header>
);

const ProfileView: React.FC<{ 
    user: UserProfile; 
    setUser: React.Dispatch<React.SetStateAction<UserProfile>>; 
    isAdmin: boolean; 
    setIsAdmin: React.Dispatch<React.SetStateAction<boolean>>; 
    showToast: (m: string, t?: 'success' | 'error' | 'info') => void;
    onBack: () => void 
}> = ({ user, setUser, isAdmin, setIsAdmin, showToast, onBack }) => {
    const [editing, setEditing] = useState(false);
    const [formData, setFormData] = useState(user);

    const handleSave = () => {
        setUser(formData);
        setEditing(false);
        showToast("Perfil actualizado correctamente");
    };

    return (
        <section className="p-6 fade-in space-y-8 pb-32">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="w-12 h-12 rounded-2xl bg-gray-900 border border-gray-800 flex items-center justify-center text-amber-500 hover:bg-amber-500 hover:text-gray-950 transition-all shadow-lg active:scale-95">
                        <ion-icon name="chevron-back" class="text-2xl font-black"></ion-icon>
                    </button>
                    <div className="space-y-0.5">
                        <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter">Mi Perfil</h2>
                        <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.4em]">Configuración de Cuenta</p>
                    </div>
                </div>
                <button 
                    onClick={() => setIsAdmin(!isAdmin)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${isAdmin ? 'bg-red-500/10 border-red-500 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'bg-gray-800 border-gray-700 text-gray-400'}`}
                >
                    {isAdmin ? 'MODO ADMIN: ON' : 'MODO ADMIN: OFF'}
                </button>
            </div>

            <div className="bg-gray-900/40 rounded-[3rem] border border-gray-800 p-8 space-y-8 backdrop-blur-md">
                <div className="flex flex-col items-center gap-8">
                    <ImagePicker 
                        value={formData.pic || ''} 
                        onChange={(val) => setFormData({ ...formData, pic: val })} 
                        label="Foto de Perfil" 
                    />
                    
                    {!editing ? (
                        <div className="text-center space-y-4 w-full">
                            <div className="space-y-1">
                                <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter leading-none">{user.name}</h3>
                                <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">{user.email}</p>
                            </div>
                            
                            <p className="text-gray-400 text-sm max-w-xs mx-auto italic">"{user.bio || 'Sin biografía disponible'}"</p>

                            <button onClick={() => setEditing(true)} className="w-full text-xs font-black text-amber-500 uppercase tracking-widest border border-amber-500/20 py-4 rounded-2xl bg-amber-500/5 hover:bg-amber-500 hover:text-gray-950 transition-all flex items-center justify-center gap-2">
                                <ion-icon name="create-outline"></ion-icon>
                                Editar Datos
                            </button>
                        </div>
                    ) : (
                        <div className="w-full space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Nombre Completo</label>
                                <input 
                                    type="text" 
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-gray-950 border border-gray-800 rounded-2xl py-4 px-6 text-sm text-white focus:border-amber-500 outline-none transition-all" 
                                    placeholder="Tu nombre completo"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Biografía</label>
                                <textarea 
                                    value={formData.bio}
                                    onChange={e => setFormData({ ...formData, bio: e.target.value })}
                                    className="w-full bg-gray-950 border border-gray-800 rounded-2xl py-4 px-6 text-sm text-white focus:border-amber-500 outline-none transition-all min-h-[120px] resize-none" 
                                    placeholder="Escribe algo sobre ti..."
                                />
                            </div>
                            <div className="flex gap-4 pt-4">
                                <button onClick={() => setEditing(false)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-5 rounded-3xl font-black uppercase tracking-widest text-[10px] transition-all">Cancelar</button>
                                <button onClick={handleSave} className="flex-1 bg-amber-500 hover:bg-white text-gray-950 py-5 rounded-3xl font-black uppercase tracking-widest text-[10px] transition-all shadow-xl shadow-amber-500/20">Guardar</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
};

// --- APP COMPONENT ---

const App: React.FC = () => {
    const [page, setPage] = useState<Page>('inicio');
    const [isAdmin, setIsAdmin] = useState(() => loadLocalData(SAVE_KEYS.ADMIN_MODE, false));
    const [user, setUser] = useState<UserProfile>(() => loadLocalData(SAVE_KEYS.PROFILE, { name: 'Dandy User', email: 'hola@work8.com', phone: '', bio: '', pic: null }));
    const [products, setProducts] = useState<Product[]>(() => loadLocalData(SAVE_KEYS.PRODUCTS, MOCK_PRODUCTS));
    const [barbers, setBarbers] = useState<Barber[]>(() => loadLocalData(SAVE_KEYS.BARBERS, MOCK_BARBERS));
    const [appointments, setAppointments] = useState<Appointment[]>(() => loadLocalData(SAVE_KEYS.APPOINTMENTS, []));
    const [cart, setCart] = useState<CartItem[]>(() => loadLocalData(SAVE_KEYS.CART, []));
    const [featured, setFeatured] = useState<FeaturedWork[]>(() => loadLocalData(SAVE_KEYS.FEATURED_WORKS, [
        { id: 'f1', imageUrl: 'https://images.unsplash.com/photo-1599351431247-f10b218a192d?auto=format&fit=crop&w=400&q=80', label: 'Skin Fade Art' },
        { id: 'f2', imageUrl: 'https://images.unsplash.com/photo-1593702288056-7927b442d0fa?auto=format&fit=crop&w=400&q=80', label: 'Beard Sculpting' },
        { id: 'f3', imageUrl: 'https://images.unsplash.com/photo-1532710093739-9470acff878f?auto=format&fit=crop&w=400&q=80', label: 'Classic Scissor' }
    ]));
    const [modal, setModal] = useState<ModalState>({ type: 'none' });
    const [toast, setToast] = useState<{ m: string; t: 'success' | 'error' | 'info' } | null>(null);

    const [selectedDate, setSelectedDate] = useState(new Date());
    const [bookingSlot, setBookingSlot] = useState<string | null>(null);

    const [aiInput, setAiInput] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);

    useEffect(() => {
        saveLocalData(SAVE_KEYS.PRODUCTS, products);
        saveLocalData(SAVE_KEYS.BARBERS, barbers);
        saveLocalData(SAVE_KEYS.FEATURED_WORKS, featured);
        saveLocalData(SAVE_KEYS.ADMIN_MODE, isAdmin);
        saveLocalData(SAVE_KEYS.PROFILE, user);
        saveLocalData(SAVE_KEYS.APPOINTMENTS, appointments);
        saveLocalData(SAVE_KEYS.CART, cart);
    }, [products, barbers, featured, isAdmin, user, appointments, cart]);

    const showToast = useCallback((m: string, t: 'success' | 'error' | 'info' = 'success') => {
        setToast({ m, t });
        setTimeout(() => setToast(null), 3000);
    }, []);

    const addToCart = useCallback((product: Product, quantity: number = 1) => {
        setCart(prev => {
            const existing = prev.find(item => item.id === product.id);
            if (existing) {
                return prev.map(item => 
                    item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item
                );
            }
            return [...prev, { ...product, quantity }];
        });
        showToast(`¡${product.name} añadido al carrito!`, "success");
    }, [showToast]);

    const updateCartQty = useCallback((id: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.id === id) {
                const newQty = Math.max(0, item.quantity + delta);
                return { ...item, quantity: newQty };
            }
            return item;
        }).filter(item => item.quantity > 0));
    }, []);

    const handleBooking = (clientName: string, serviceId: string) => {
        const service = ALL_SERVICES.find(s => s.id === serviceId);
        if (!service || !bookingSlot) return;

        const newAppointment: Appointment = {
            id: 'apt-' + Date.now(),
            barberId: 'any',
            barberName: clientName, 
            userId: user.email,
            services: [service],
            total: service.price,
            date: selectedDate.toISOString().split('T')[0],
            time: bookingSlot,
            endTime: '', 
            status: 'confirmed'
        };

        setAppointments(prev => [...prev, newAppointment]);
        setBookingSlot(null);
        showToast("Agendado con Éxito", "success");
    };

    const handleAiStyle = async () => {
        if (!aiInput.trim()) return showToast("Describe tu estilo", 'info');
        setIsAiLoading(true);
        try {
            const res = await getStyleRecommendation(aiInput, ALL_SERVICES);
            setModal({ type: 'styleAI', item: res });
        } catch (e) {
            showToast("Error en la IA", 'error');
        } finally {
            setIsAiLoading(false);
        }
    };

    // Calculate slots for the selected day
    const daySlots = useMemo(() => {
        const slots = [];
        const startHour = 8;
        const endHour = 20;
        
        for (let hour = startHour; hour < endHour; hour++) {
            slots.push(`${hour}:00`);
            slots.push(`${hour}:30`);
        }
        return slots;
    }, []);

    const dayColor = useMemo(() => {
        const colors = ['#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899'];
        return colors[selectedDate.getDay()];
    }, [selectedDate]);

    const nextDays = useMemo(() => {
        const days = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date();
            d.setDate(d.getDate() + i);
            days.push(d);
        }
        return days;
    }, []);

    const completePurchase = useCallback(() => {
        setCart([]);
        setModal({ type: 'purchaseSuccess' });
    }, []);

    const handleBack = () => setPage('inicio');

    const renderModalContent = () => {
        if (modal.type === 'none') return null;
        const close = () => setModal({ type: 'none' });
        switch(modal.type) {
            case 'viewProduct':
                return <ProductDetailsModal product={modal.item} close={close} addToCart={addToCart} />;
            case 'checkout':
                return <CheckoutModal cart={cart} close={close} confirm={completePurchase} updateQty={updateCartQty} />;
            case 'purchaseSuccess':
                return (
                    <div className="fixed inset-0 bg-gray-950/98 z-[80] backdrop-blur-3xl flex items-center justify-center p-6 animate-fade-in overflow-y-auto">
                        <div className="bg-gray-900 w-full max-w-lg rounded-[4rem] border-4 border-blue-500 animate-blue-flash p-12 text-center space-y-8 animate-explosion relative overflow-hidden">
                            <div className="w-32 h-32 bg-blue-500 rounded-full flex items-center justify-center mx-auto shadow-[0_0_50px_rgba(59,130,246,0.8)] animate-pulse">
                                <ion-icon name="checkmark" class="text-7xl text-white"></ion-icon>
                            </div>
                            <div className="space-y-4">
                                <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter leading-tight">¡Compra Exitosa!</h2>
                                <p className="text-lg text-gray-300 font-medium leading-relaxed uppercase tracking-wide">Gracias por confiar en <span className="text-blue-400">Work8 Pro</span>.</p>
                            </div>
                            <button onClick={close} className="w-full bg-white text-gray-950 py-5 rounded-3xl font-black uppercase tracking-widest hover:bg-blue-500 hover:text-white transition-all shadow-2xl active:scale-95">VOLVER A LA TIENDA</button>
                        </div>
                    </div>
                );
            case 'styleAI':
                const aiResult = modal.item as StyleRecommendation;
                return (
                    <div className="fixed inset-0 bg-gray-950/90 z-[60] backdrop-blur-xl flex items-center justify-center p-6 animate-fade-in overflow-y-auto">
                        <div className="bg-gray-900 w-full max-w-2xl rounded-[2.5rem] border border-amber-500/30 p-8 space-y-6">
                            <div className="flex justify-between items-center"><h3 className="text-xl font-black text-white uppercase italic tracking-tighter flex items-center gap-2"><ion-icon name="sparkles" class="text-amber-500"></ion-icon> Recomendación IA</h3><button onClick={close} className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 hover:text-white transition-all"><ion-icon name="close" class="text-2xl"></ion-icon></button></div>
                            <div className="space-y-4">
                                <div className="bg-amber-500/10 p-4 rounded-2xl border border-amber-500/20"><p className="text-sm text-gray-200 leading-relaxed italic">"{aiResult.explanation}"</p></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Servicios</h4>
                                        <div className="flex flex-wrap gap-2">{aiResult.recommendedServices.map(sid => <span key={sid} className="px-3 py-1 bg-gray-800 text-amber-500 rounded-lg text-[10px] font-black uppercase tracking-tight">{ALL_SERVICES.find(x => x.id === sid)?.name}</span>)}</div>
                                    </div>
                                    <div className="space-y-2"><h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Experto</h4><span className="px-3 py-1 bg-amber-500 text-gray-950 rounded-lg text-[10px] font-black uppercase tracking-tight">{aiResult.barberTypeRequired}</span></div>
                                </div>
                            </div>
                            <button onClick={() => { setPage('agenda'); close(); }} className="w-full bg-amber-500 text-gray-950 py-4 rounded-2xl font-black uppercase tracking-widest hover:scale-105 transition-all">BUSCAR BARBERO EN AGENDA</button>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    const cartCount = useMemo(() => cart.reduce((acc, curr) => acc + curr.quantity, 0), [cart]);

    return (
        <div className="flex flex-col h-full bg-gray-950 text-gray-100 overflow-hidden font-sans">
            <Header user={user} onProfile={() => setPage('perfil')} isAdmin={isAdmin} />
            
            {toast && (
                <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl flex items-center gap-3 shadow-2xl animate-fade-in border ${
                    toast.t === 'success' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 
                    toast.t === 'error' ? 'bg-red-500/10 border-red-500 text-red-400' : 
                    'bg-blue-500/10 border-blue-500 text-blue-400'
                } backdrop-blur-xl`}>
                    <ion-icon name={toast.t === 'success' ? 'checkmark-circle' : 'alert-circle'} class="text-xl"></ion-icon>
                    <span className="text-xs font-black uppercase tracking-widest">{toast.m}</span>
                </div>
            )}

            <main className="flex-1 overflow-y-auto">
                {page === 'inicio' && (
                    <section className="p-6 fade-in space-y-12">
                        {/* HERO SECTION */}
                        <div className="relative min-h-[36rem] w-full rounded-[4rem] overflow-hidden border border-gray-800/50 group shadow-2xl">
                            <img src="https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1200&q=80" className="absolute inset-0 w-full h-full object-cover grayscale-[0.2] transition-transform duration-[4s] group-hover:scale-105" alt="Hero" />
                            <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/40 to-transparent flex flex-col justify-center items-center p-8 sm:p-20 text-center">
                                <div className="max-w-3xl space-y-8 animate-fade-in flex flex-col items-center">
                                    <div className="space-y-3 flex flex-col items-center">
                                        <div className="inline-flex items-center gap-2 bg-amber-500/20 border border-amber-500/40 px-6 py-2.5 rounded-full backdrop-blur-xl">
                                            <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_12px_#f59e0b] animate-pulse"></div>
                                            <span className="text-[11px] font-black text-amber-500 uppercase tracking-[0.3em]">Élite Barber Studio</span>
                                        </div>
                                        
                                        <h2 className="text-6xl sm:text-8xl font-black text-white italic leading-[0.9] tracking-tighter uppercase drop-shadow-2xl">
                                            DOMINA TU <br/>
                                            <span className="text-amber-500">ESTILO.</span>
                                        </h2>
                                    </div>
                                    
                                    <p className="text-xl sm:text-2xl text-gray-200 font-semibold leading-relaxed max-w-xl mx-auto opacity-90">
                                        Cortes de autor, seguridad garantizada y maestría artesanal. Redefinimos el estándar del cuidado masculino.
                                    </p>
                                    <div className="flex flex-col sm:flex-row justify-center gap-6 pt-6">
                                        <button onClick={() => setPage('agenda')} className="bg-amber-500 text-gray-950 px-12 py-5 rounded-[2rem] font-black uppercase tracking-widest hover:bg-white transition-all shadow-2xl shadow-amber-500/30 scale-100 hover:scale-105 active:scale-95">RESERVAR AHORA</button>
                                        <button onClick={() => setPage('barberos')} className="bg-white/5 backdrop-blur-md text-white border border-white/20 px-12 py-5 rounded-[2rem] font-black uppercase tracking-widest hover:bg-white hover:text-gray-950 transition-all scale-100 hover:scale-105 active:scale-95">NUESTROS ARTISTAS</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                {page === 'servicios' && (
                    <section className="p-6 fade-in space-y-10 pb-32">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                            <div className="flex items-center gap-4">
                                <button onClick={handleBack} className="w-12 h-12 rounded-2xl bg-gray-900 border border-gray-800 flex items-center justify-center text-amber-500 hover:bg-amber-500 hover:text-gray-950 transition-all shadow-lg active:scale-95">
                                    <ion-icon name="chevron-back" class="text-2xl font-black"></ion-icon>
                                </button>
                                <div className="space-y-0.5">
                                    <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter">Cortes & Estilo</h2>
                                    <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.4em]">Experiencia & Precisión</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setPage('agenda')}
                                className="bg-amber-500 text-gray-950 px-8 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-white transition-all shadow-xl flex items-center gap-3 animate-bounce"
                            >
                                <ion-icon name="calendar-outline" class="text-xl"></ion-icon>
                                RESERVAR CON CUALQUIER BARBERO
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {ALL_SERVICES.map(service => (
                                <div 
                                    key={service.id} 
                                    onClick={() => setPage('agenda')}
                                    className="service-card p-8 rounded-[3rem] flex items-center gap-8 relative overflow-hidden group cursor-pointer"
                                >
                                    <div className="service-icon-container w-24 h-24 rounded-[2rem] bg-gray-800/80 flex items-center justify-center flex-shrink-0 border border-gray-700 shadow-xl">
                                        <ion-icon name={service.icon || 'cut-outline'} class="text-4xl text-amber-500"></ion-icon>
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <div className="flex items-center gap-3">
                                            <h3 className="text-xl font-black text-white uppercase italic tracking-tight group-hover:text-amber-400 transition-colors">{service.name}</h3>
                                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                                        </div>
                                        <div className="flex items-center gap-5">
                                            <span className="text-amber-500 font-black text-lg">{formatCurrency(service.price)}</span>
                                            <span className="text-gray-500 text-[11px] font-black uppercase tracking-widest flex items-center gap-1.5">
                                                <ion-icon name="time-outline"></ion-icon> {service.duration} MINUTOS
                                            </span>
                                        </div>
                                        <div className="pt-2 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                                            <span className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] underline">Tocar para agendar ahora</span>
                                        </div>
                                    </div>
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-bl-[4rem] group-hover:bg-amber-500/10 transition-colors"></div>
                                    <button className="absolute bottom-8 right-8 w-12 h-12 rounded-2xl bg-amber-500 text-gray-950 flex items-center justify-center opacity-0 translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 shadow-lg">
                                        <ion-icon name="chevron-forward" class="text-2xl font-black"></ion-icon>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {page === 'barberos' && (
                    <section className="p-6 fade-in space-y-8">
                        <div className="flex flex-col gap-6">
                            <div className="flex justify-between items-end">
                                <div className="flex items-center gap-4">
                                    <button onClick={handleBack} className="w-12 h-12 rounded-2xl bg-gray-900 border border-gray-800 flex items-center justify-center text-amber-500 hover:bg-amber-500 hover:text-gray-950 transition-all shadow-lg active:scale-95">
                                        <ion-icon name="chevron-back" class="text-2xl font-black"></ion-icon>
                                    </button>
                                    <div className="space-y-0.5">
                                        <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">Elite Staff</h2>
                                        <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.4em]">Expertos & Artistas</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 gap-12">
                            {barbers.map(b => (
                                <div key={b.id} className="bg-gray-900/40 rounded-[3rem] border border-gray-800/50 flex flex-col overflow-hidden group hover:border-amber-500/30 transition-all duration-500 shadow-xl" style={{ borderLeft: `6px solid ${b.themeColor}` }}>
                                    <div className="p-8 flex flex-col sm:flex-row items-center gap-8">
                                        <div className="relative flex-shrink-0">
                                            <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-[2.5rem] overflow-hidden border-2 p-1 bg-gray-950" style={{ borderColor: b.themeColor }}><img src={b.profilePicUrl} className="w-full h-full rounded-[2.2rem] object-cover" alt={b.name} /></div>
                                        </div>
                                        <div className="flex-1 text-center sm:text-left space-y-4">
                                            <div><div className="flex items-center justify-center sm:justify-start gap-3 mb-1"><span className="text-[9px] font-black uppercase tracking-widest text-amber-500/80">{b.professionLevel}</span></div><h3 className="text-2xl font-black text-white uppercase italic tracking-tighter group-hover:text-amber-400 transition-colors">{b.name}</h3></div>
                                            <p className="text-xs text-gray-400 font-medium line-clamp-2 max-w-md">{b.bio}</p>
                                        </div>
                                        <div className="flex flex-col gap-3">
                                            <button onClick={() => setPage('agenda')} className="bg-amber-500 text-gray-950 px-8 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-white transition-all shadow-lg active:scale-95">RESERVAR CITA</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {page === 'agenda' && (
                    <section className="p-6 fade-in space-y-8 pb-32">
                        <div className="flex items-center gap-4">
                            <button onClick={handleBack} className="w-12 h-12 rounded-2xl bg-gray-900 border border-gray-800 flex items-center justify-center text-amber-500 hover:bg-amber-500 hover:text-gray-950 transition-all shadow-lg active:scale-95">
                                <ion-icon name="chevron-back" class="text-2xl font-black"></ion-icon>
                            </button>
                            <div className="space-y-0.5">
                                <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter">Mi Agenda</h2>
                                <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.4em]">Planifica tu estilo</p>
                            </div>
                        </div>
                        <div className="flex overflow-x-auto gap-4 no-scrollbar py-2">
                            {nextDays.map((date, idx) => {
                                const isSelected = date.toDateString() === selectedDate.toDateString();
                                return (
                                    <button key={idx} onClick={() => setSelectedDate(date)} className={`flex-shrink-0 w-20 py-6 rounded-[2rem] border transition-all duration-500 flex flex-col items-center gap-2 ${isSelected ? 'bg-white border-white text-gray-950 scale-105 shadow-xl' : 'bg-gray-900/40 border-gray-800 text-gray-500 hover:border-gray-600'}`} style={isSelected ? { boxShadow: `0 20px 40px -10px ${dayColor}40` } : {}}>
                                        <span className="text-[10px] font-black uppercase tracking-widest">{date.toLocaleDateString('es-ES', { weekday: 'short' })}</span>
                                        <span className="text-2xl font-black italic">{date.getDate()}</span>
                                    </button>
                                );
                            })}
                        </div>
                        <div className="bg-gray-900/40 rounded-[3.5rem] border border-gray-800 p-6 space-y-3" style={{ borderColor: `${dayColor}20` }}>
                            <div className="grid grid-cols-1 gap-3 max-h-[500px] overflow-y-auto no-scrollbar pr-1">
                                {daySlots.map(time => {
                                    const dateKey = selectedDate.toISOString().split('T')[0];
                                    const apt = appointments.find(a => a.date === dateKey && a.time === time);
                                    return <TimeSlot key={time} time={time} appointment={apt} color={dayColor} onClick={() => setBookingSlot(time)} />;
                                })}
                            </div>
                        </div>
                        {bookingSlot && <BookingTab time={bookingSlot} close={() => setBookingSlot(null)} onSave={handleBooking} />}
                    </section>
                )}

                {page === 'comercio' && (
                    <section className="p-6 fade-in space-y-8 pb-40">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
                            <div className="flex items-center gap-4">
                                <button onClick={handleBack} className="w-12 h-12 rounded-2xl bg-gray-900 border border-gray-800 flex items-center justify-center text-amber-500 hover:bg-amber-500 hover:text-gray-950 transition-all shadow-lg active:scale-95">
                                    <ion-icon name="chevron-back" class="text-2xl font-black"></ion-icon>
                                </button>
                                <div className="space-y-0.5">
                                    <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter">Shop Pro</h2>
                                    <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.4em]">Cuidado Premium</p>
                                </div>
                            </div>
                            {cart.length > 0 && (
                                <button 
                                    onClick={() => setModal({ type: 'checkout' })}
                                    className="bg-amber-500 text-gray-950 px-8 py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl flex items-center gap-3 animate-blue-flash"
                                >
                                    <ion-icon name="cart" class="text-xl"></ion-icon>
                                    TERMINAR COMPRA ({cartCount})
                                </button>
                            )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                            {products.map(product => (
                                <div key={product.id} onClick={() => setModal({ type: 'viewProduct', item: product })} className="product-card p-6 flex flex-col group animate-fade-in cursor-pointer">
                                    <div className="relative aspect-square mb-6 overflow-hidden rounded-2xl bg-gray-950">
                                        <img src={product.imageUrl} alt={product.name} />
                                    </div>
                                    <div className="flex-1 flex flex-col">
                                        <div className="space-y-1 mb-4">
                                            <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{product.brand}</span>
                                            <h3 className="text-lg font-black text-white uppercase italic tracking-tight group-hover:text-amber-400 transition-colors line-clamp-1">{product.name}</h3>
                                        </div>
                                        <div className="mt-auto flex items-center justify-between gap-4">
                                            <span className="text-xl font-black text-white">{formatCurrency(product.price)}</span>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); addToCart(product); }} 
                                                className="add-to-cart-btn bg-amber-500 text-gray-950 w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"
                                            >
                                                <ion-icon name="cart-outline" class="text-2xl"></ion-icon>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {page === 'perfil' && (
                    <ProfileView user={user} setUser={setUser} isAdmin={isAdmin} setIsAdmin={setIsAdmin} showToast={showToast} onBack={handleBack} />
                )}
            </main>

            <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[95%] max-w-lg bg-gray-900/90 backdrop-blur-2xl border border-gray-800/50 rounded-full px-2 py-3 z-40 flex justify-around items-center shadow-2xl">
                <CircleButton icon="home" label="Inicio" onClick={() => setPage('inicio')} isActive={page === 'inicio'} />
                <CircleButton icon="cut" label="Cortes" onClick={() => setPage('servicios')} isActive={page === 'servicios'} />
                <CircleButton icon="people" label="Barberos" onClick={() => setPage('barberos')} isActive={page === 'barberos'} glow />
                <CircleButton icon="cart" label="Tienda" onClick={() => setPage('comercio')} isActive={page === 'comercio'} badge={cartCount} />
                <CircleButton icon="calendar" label="Agenda" onClick={() => setPage('agenda')} isActive={page === 'agenda'} />
            </nav>
            {renderModalContent()}
        </div>
    );
};

export default App;
