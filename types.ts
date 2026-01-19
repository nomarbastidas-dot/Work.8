
import React from 'react';

// Fix: Use declare global to augment the JSX namespace for custom elements like 'ion-icon'.
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
  rating: number;
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
  gallery: { id: string; url: string; title: string }[];
  professionLevel: 'Maestro Barbero' | 'Barbero Artista' | 'Estilista Senior';
  rating: number;
  reviewCount: number;
  reviews: Review[];
  themeColor: string; // Personalized palette
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  reference: string;
  description?: string;
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
  icon?: string;
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
  remindersSent?: {
    oneDay?: boolean;
    oneHour?: boolean;
  };
}

export interface StyleRecommendation {
  recommendedServices: string[];
  barberTypeRequired: string;
  explanation: string;
  imageUrls?: string[];
  webSources?: { title: string; uri: string }[];
}

export interface UserProfile {
  name: string;
  email: string;
  phone: string;
  address?: string;
  bio: string;
  pic: string | null;
}

export interface FeaturedWork {
  id: string;
  imageUrl: string;
  label: string;
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  timestamp: string;
}

export type Page = 'inicio' | 'servicios' | 'barberos' | 'agenda' | 'comercio' | 'perfil';

export type ModalType = 'editItem' | 'editFeaturedWork' | 'addBarber' | 'editBarber' | 'viewBarber' | 'viewProduct' | 'styleAI' | 'message' | 'bookAppointment' | 'checkout' | 'purchaseSuccess' | 'none';

export interface ModalState {
  type: ModalType;
  title?: string;
  message?: string;
  item?: any;
}
