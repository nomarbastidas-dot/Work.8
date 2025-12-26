
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'ion-icon': any;
      [elemName: string]: any;
    }
  }
}

export interface Location {
  address: string;
  distance: string;
  lat: number;
  lng: number;
}

export interface Review {
  id: string;
  userName: string;
  rating: number; // 1 to 5
  comment: string;
  date: string;
}

export interface Barber {
  id: string;
  name: string;
  isAvailable: boolean;
  experience: string;
  specialty: string;
  bio: string;
  location: Location;
  profilePicUrl: string;
  gallery: string[];
  professionLevel: 'Maestro Barbero' | 'Barbero Artista' | 'Estilista Senior';
  rating: number;
  reviewCount: number;
  reviews: Review[];
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  reference: string;
  price: number;
  imageUrl: string;
  sellerId: string;
  dateAdded: { seconds: number };
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
  barberType: string;
}

export interface AppointmentService {
    id?: string;
    name: string;
    price: number;
    duration: number;
}

export interface Appointment {
  id?: string;
  barberId: string;
  barberName: string;
  userId: string;
  services: AppointmentService[];
  total: number;
  date: string;
  time: string;
  endTime: string;
  createdAt?: { seconds: number };
  status: 'pending_payment' | 'confirmed' | 'cancelled';
}

export interface StyleRecommendation {
  recommendedServices: string[];
  barberTypeRequired: string;
  explanation: string;
  imageUrls?: string[];
  webSources?: { title: string; uri: string }[];
}

export interface AppNotification {
  id: string;
  type: 'appointment' | 'promo';
  title: string;
  message: string;
  timestamp: string;
}

export interface UserProfile {
  name: string;
  email: string;
  phone: string;
  address?: string;
  bio: string;
  pic: string | null;
}

export type Page = 'inicio' | 'servicios' | 'barberos' | 'comercio' | 'agenda' | 'perfil';

export type ModalType = 'loading' | 'message' | 'barberProfile' | 'agenda' | 'payment' | 'confirmCancel' | 'editAppointment' | 'editItem' | 'checkout' | 'none';

export interface ModalState {
  type: ModalType;
  title?: string;
  message?: string;
  item?: Appointment | Product | Barber | Service | any;
}
