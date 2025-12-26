
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
        gallery: ['https://picsum.photos/seed/corte1/300/200', 'https://picsum.photos/seed/corte2/300/200'], 
        professionLevel: 'Maestro Barbero',
        rating: 4.8,
        reviewCount: 124,
        reviews: [
            { id: 'r1', userName: 'Juan D.', rating: 5, comment: '¡El mejor corte que he tenido! La atención al detalle es increíble.', date: '2023-10-15' },
            { id: 'r2', userName: 'Andrés M.', rating: 4, comment: 'Muy buen servicio, aunque hubo un poco de espera.', date: '2023-10-10' }
        ]
    },
    { 
        id: 'b2', 
        name: 'Luis "Navaja" Pérez', 
        isAvailable: true, 
        experience: '5 años', 
        specialty: 'Diseños y Tribales', 
        bio: 'Creatividad y precisión en cada diseño. Trae tu idea y la hacemos realidad.', 
        location: { address: 'El Poblado, Medellín', distance: '1.2 km', lat: 6.2057, lng: -75.5670 }, 
        profilePicUrl: 'https://picsum.photos/seed/luis/100/100', 
        gallery: ['https://picsum.photos/seed/diseno1/300/200'], 
        professionLevel: 'Barbero Artista',
        rating: 4.6,
        reviewCount: 89,
        reviews: [
            { id: 'r3', userName: 'Kevin S.', rating: 5, comment: 'El diseño quedó brutal, idéntico a la foto que llevé.', date: '2023-10-20' }
        ]
    },
    { 
        id: 'b3', 
        name: 'Sofía "Tijeras" Gómez', 
        isAvailable: false, 
        experience: '7 años', 
        specialty: 'Corte con Tijera y Facial', 
        bio: 'Especialista en cortes largos y cuidado facial. Relájate y renuévate.', 
        location: { address: 'Ciudad Jardín, Cali', distance: '4.8 km', lat: 3.4516, lng: -76.5320 }, 
        profilePicUrl: 'https://picsum.photos/seed/sofia/100/100', 
        gallery: ['https://picsum.photos/seed/facial1/300/200'], 
        professionLevel: 'Estilista Senior',
        rating: 4.9,
        reviewCount: 215,
        reviews: [
            { id: 'r4', userName: 'Maria F.', rating: 5, comment: 'Manos de ángel para el facial, salí renovada.', date: '2023-10-18' },
            { id: 'r5', userName: 'Carlos R.', rating: 5, comment: 'Excelente técnica con tijera.', date: '2023-09-25' }
        ]
    }
];

export const MOCK_PRODUCTS: Product[] = [
    { id: 'p1', name: 'Cera Moldeadora Fuerte', brand: 'BarberPro', reference: 'BP-W01', price: 45000, imageUrl: 'https://picsum.photos/seed/cera/150/150', sellerId: 'b1', dateAdded: { seconds: new Date().getTime()/1000 } },
    { id: 'p2', name: 'Máquina "Legend" Wahl', brand: 'Wahl', reference: 'WHL-LGND', price: 350000, imageUrl: 'https://picsum.photos/seed/wahl/150/150', sellerId: 'b2', dateAdded: { seconds: (new Date().getTime()/1000) - 86400 } },
    { id: 'p3', name: 'Tijera de Filo Dulce 6"', brand: 'Jaguar', reference: 'JGR-F06', price: 210000, imageUrl: 'https://picsum.photos/seed/tijera/150/150', sellerId: 'b3', dateAdded: { seconds: (new Date().getTime()/1000) - 172800 } },
    { id: 'p4', name: 'Aceite de Barba', brand: 'BeardOil', reference: 'BO-50', price: 30000, imageUrl: 'https://picsum.photos/seed/aceite/150/150', sellerId: 'b3', dateAdded: { seconds: (new Date().getTime()/1000) - 172800 } }
];

export const ALL_SERVICES: Service[] = [
    { id: 's1', name: 'Corte Normal', price: 25000, duration: 30, barberType: 'Maestro Barbero, Barbero Artista, Estilista Senior' }, 
    { id: 's2', name: 'Corte Clásico con Tijera', price: 40000, duration: 45, barberType: 'Maestro Barbero, Estilista Senior' },
    { id: 's3', name: 'Corte + Barba', price: 55000, duration: 60, barberType: 'Maestro Barbero, Barbero Artista' },
    { id: 's4', name: 'Arreglo de Barba', price: 20000, duration: 30, barberType: 'Maestro Barbero' },
    { id: 's5', name: 'Limpieza Facial Básica', price: 60000, duration: 60, barberType: 'Estilista Senior' },
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
