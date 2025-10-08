// Types para la base de datos
export interface User {
  id: string;
  email: string;
  name: string | null;
  google_id: string | null;
  credits: number;
  total_purchased: number;
  created_at: string;
}

export interface Split {
  id: string;
  user_id: string;
  receipt_url: string | null;
  restaurant_name: string | null;
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
  user_amount: number;
  people_count: number;
  created_at: string;
}

export interface Purchase {
  id: string;
  user_id: string;
  pack_type: string;
  credits_purchased: number;
  amount_paid: number;
  paypal_order_id: string | null;
  status: string;
  created_at: string;
}

// Types para el flujo de la app
export interface ReceiptItem {
  name: string;
  price: number;
  assignedTo: string[];
}

export interface Person {
  id: string;
  name: string;
}

export interface SplitResult {
  personId: string;
  personName: string;
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
}