
import { Barber, Product, Service, AppNotification } from './types';

export const MOCK_BARBERS: Barber[] = [
    { 
        id: 'b1', 
        name: 'Carlos "Filos" Mendoza', 
        isAvailable: true, 
        experience: '10 años', 
        specialty: 'Corte Clásico y Barba', 
        bio: 'Perfeccionista del degradado y amante de la navaja clásica.', 
        location: { address: 'Chapinero, Bogotá', distance: '2.5 km', lat: 4.6097, lng: -74.0817 }, 
        profilePicUrl: 'https://picsum.photos/seed/carlos/100/100', 
        gallery: [
            { id: 'g1', url: 'https://images.unsplash.com/photo-1599351431247-f10b218a192d?auto=format&fit=crop&w=400&q=80', title: 'Fade Moderno' },
            { id: 'g2', url: 'https://images.unsplash.com/photo-1593702288056-7927b442d0fa?auto=format&fit=crop&w=400&q=80', title: 'Barba Esculpida' }
        ], 
        professionLevel: 'Maestro Barbero',
        rating: 4.8,
        reviewCount: 124,
        reviews: [
            { id: 'r1', userName: 'Juan D.', rating: 5, comment: '¡El mejor corte que he tenido!', date: '2023-10-15' }
        ],
        themeColor: '#f59e0b' // Amber
    },
    { 
        id: 'b2', 
        name: 'Luis "Navaja" Pérez', 
        isAvailable: true, 
        experience: '5 años', 
        specialty: 'Diseños y Tribales', 
        bio: 'Creatividad y precisión en cada diseño. Trae tu idea.', 
        location: { address: 'El Poblado, Medellín', distance: '1.2 km', lat: 6.2057, lng: -75.5670 }, 
        profilePicUrl: 'https://picsum.photos/seed/luis/100/100', 
        gallery: [
            { id: 'g3', url: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=400&q=80', title: 'Diseño Tribal' }
        ], 
        professionLevel: 'Barbero Artista',
        rating: 4.6,
        reviewCount: 89,
        reviews: [
            { id: 'r3', userName: 'Kevin S.', rating: 5, comment: 'El diseño quedó brutal.', date: '2023-10-20' }
        ],
        themeColor: '#3b82f6' // Blue
    },
    { 
        id: 'b3', 
        name: 'Sofía "Tijeras" Gómez', 
        isAvailable: false, 
        experience: '7 años', 
        specialty: 'Corte con Tijera y Facial', 
        bio: 'Especialista en cortes largos y cuidado facial.', 
        location: { address: 'Ciudad Jardín, Cali', distance: '4.8 km', lat: 3.4516, lng: -76.5320 }, 
        profilePicUrl: 'https://picsum.photos/seed/sofia/100/100', 
        gallery: [
            { id: 'g4', url: 'https://images.unsplash.com/photo-1532710093739-9470acff878f?auto=format&fit=crop&w=400&q=80', title: 'Corte Tijera' }
        ], 
        professionLevel: 'Estilista Senior',
        rating: 4.9,
        reviewCount: 215,
        reviews: [
            { id: 'r4', userName: 'Maria F.', rating: 5, comment: 'Manos de ángel.', date: '2023-10-18' }
        ],
        themeColor: '#10b981' // Emerald
    }
];

export const MOCK_PRODUCTS: Product[] = [
    { id: 'p1', name: 'Cera Moldeadora Fuerte', brand: 'BarberPro', reference: 'BP-W01', price: 45000, imageUrl: 'https://picsum.photos/seed/cera/300/300', sellerId: 'b1', dateAdded: { seconds: new Date().getTime()/1000 } },
    { id: 'p2', name: 'Máquina "Legend" Wahl', brand: 'Wahl', reference: 'WHL-LGND', price: 350000, imageUrl: 'https://picsum.photos/seed/wahl/300/300', sellerId: 'b2', dateAdded: { seconds: (new Date().getTime()/1000) - 86400 } },
    { id: 'p3', name: 'Tijera de Filo Dulce 6"', brand: 'Jaguar', reference: 'JGR-F06', price: 210000, imageUrl: 'https://picsum.photos/seed/tijera/300/300', sellerId: 'b3', dateAdded: { seconds: (new Date().getTime()/1000) - 172800 } },
    { id: 'p4', name: 'Aceite de Barba Premium', brand: 'BeardOil', reference: 'BO-50', price: 30000, imageUrl: 'https://picsum.photos/seed/aceite/300/300', sellerId: 'b3', dateAdded: { seconds: (new Date().getTime()/1000) - 172800 } },
    { id: 'p5', name: 'After Shave Refresh', brand: 'Work8', reference: 'W8-AS01', price: 55000, imageUrl: 'https://picsum.photos/seed/aftershave/300/300', sellerId: 'admin', dateAdded: { seconds: new Date().getTime()/1000 } },
    { id: 'p6', name: 'Capa de Barbero Pro', brand: 'BarberEquip', reference: 'BE-CAPE', price: 85000, imageUrl: 'https://picsum.photos/seed/cape/300/300', sellerId: 'admin', dateAdded: { seconds: new Date().getTime()/1000 } },
    { id: 'p7', name: 'Gel de Afeitar Transparente', brand: 'ClearShave', reference: 'CS-GEL', price: 38000, imageUrl: 'https://picsum.photos/seed/gel/300/300', sellerId: 'admin', dateAdded: { seconds: new Date().getTime()/1000 } },
    { id: 'p8', name: 'Talco Premium Extra Suave', brand: 'SilkTouch', reference: 'ST-TALC', price: 22000, imageUrl: 'https://picsum.photos/seed/talc/300/300', sellerId: 'admin', dateAdded: { seconds: new Date().getTime()/1000 } },
    { id: 'p9', name: 'Peine de Carbono Antiestático', brand: 'ProComb', reference: 'PC-001', price: 15000, imageUrl: 'https://picsum.photos/seed/comb/300/300', sellerId: 'admin', dateAdded: { seconds: new Date().getTime()/1000 } },
    { id: 'p10', name: 'Pomada Brillo Clásico', brand: 'OldSchool', reference: 'OS-POM', price: 42000, imageUrl: 'https://picsum.photos/seed/pomade/300/300', sellerId: 'admin', dateAdded: { seconds: new Date().getTime()/1000 } }
];

export const ALL_SERVICES: Service[] = [
    { id: 's1', name: 'Corte Normal', price: 25000, duration: 30, barberType: 'Maestro Barbero, Barbero Artista, Estilista Senior', icon: 'cut-outline' }, 
    { id: 's2', name: 'Corte Clásico con Tijera', price: 40000, duration: 45, barberType: 'Maestro Barbero, Estilista Senior', icon: 'color-palette-outline' },
    { id: 's3', name: 'Corte + Barba', price: 55000, duration: 60, barberType: 'Maestro Barbero, Barbero Artista', icon: 'brush-outline' },
    { id: 's4', name: 'Arreglo de Barba', price: 20000, duration: 30, barberType: 'Maestro Barbero', icon: 'water-outline' },
    { id: 's5', name: 'Limpieza Facial Básica', price: 60000, duration: 60, barberType: 'Estilista Senior', icon: 'sparkles-outline' },
];

export const MOCK_NOTIFICATIONS: AppNotification[] = [
    {
        id: 'n1',
        type: 'appointment',
        title: 'Cita Próxima',
        message: 'Tu cita con Carlos "Filos" Mendoza es mañana a las 10:00 AM.',
        timestamp: 'hace 2 min'
    },
    {
        id: 'n2',
        type: 'promo',
        title: '¡Oferta Especial!',
        message: '¡Esta semana, 20% de descuento en todos los aceites para barba!',
        timestamp: 'hace 1 hora'
    }
];
