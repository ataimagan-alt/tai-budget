import React from 'react';
import {
  ShoppingCart,
  ShoppingBag,
  Home,
  Car,
  Coffee,
  Activity,
  DollarSign,
  CreditCard,
  Banknote,
  PiggyBank,
  Utensils,
  Gift,
  Smartphone,
  Heart,
  Briefcase,
  Wallet,
  GraduationCap,
  Shirt,
  Baby,
  Plane,
  Gamepad2,
  Dumbbell,
  Wifi,
  PawPrint,
  BookOpen,
  Fuel,
  Pill,
  Bus,
  Wrench,
  TrendingUp,
  Landmark,
} from 'lucide-react';

const CATEGORY_ICON_MAP = {
  'shopping-cart': ShoppingCart,
  'shopping-bag': ShoppingBag,
  'credit-card': CreditCard,
  landmark: Landmark,
  home: Home,
  car: Car,
  fuel: Fuel,
  bus: Bus,
  coffee: Coffee,
  utensils: Utensils,
  activity: Activity,
  pill: Pill,
  heart: Heart,
  shirt: Shirt,
  baby: Baby,
  'graduation-cap': GraduationCap,
  book: BookOpen,
  gamepad: Gamepad2,
  dumbbell: Dumbbell,
  plane: Plane,
  wifi: Wifi,
  smartphone: Smartphone,
  'paw-print': PawPrint,
  wrench: Wrench,
  gift: Gift,
  'dollar-sign': DollarSign,
  briefcase: Briefcase,
  'trending-up': TrendingUp,
};

/** Список ключей иконок для выбора при создании/редактировании категории */
export const CATEGORY_ICON_OPTIONS = Object.keys(CATEGORY_ICON_MAP);

const ACCOUNT_ICON_MAP = {
  card: CreditCard,
  cash: Banknote,
  savings: PiggyBank,
};

export function CategoryIcon({ name, className = 'w-5 h-5', style }) {
  const IconComponent = CATEGORY_ICON_MAP[name] || ShoppingBag;
  return <IconComponent className={className} style={style} />;
}

export function AccountIcon({ type, className = 'w-5 h-5' }) {
  const IconComponent = ACCOUNT_ICON_MAP[type] || Wallet;
  return <IconComponent className={className} />;
}
