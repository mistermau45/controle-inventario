import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface InventoryItem {
  id: string;
  name: string;
  description: string;
  unit_price: number;
  quantity: number;
  stock_value: number;
  stock_level: number;
  reorder_days: number;
  reorder_quantity: number;
  discontinued: boolean;
}

export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};
