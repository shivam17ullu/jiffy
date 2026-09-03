export interface SellerFirstStepBody {
  phone_number: string;
  password?: string;
}

export interface SellerOnboardingBody {
  userId: string;
  email?: string;
  store: StoreAttributes;
  bankDetails: BankDetailAttributes;
  documents: DocumentAttributes;
}

export interface StoreAttributes {
  id: number;
  sellerId: number;
  storeName: string;
  storeAddress: string;
  pincode: string;
  storeCategory?: string[] | string;
  phone?: string;
  city?: string;
  state?: string;
  is_active?: boolean;
  isSellerOpen?: boolean;
  latitude?: number;
  longitude?: number;
  openingDays?: string[];
  openingTime?: string;
  closingTime?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface BankDetailAttributes {
  id: number;
  sellerId: number;
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  termsAccepted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface DocumentAttributes {
  id: number;
  sellerId: number;
  aadhaarUrl?: string;
  panUrl?: string;
  gstUrl?: string;
  storeDocUrl?: string;
  storeImageUrl?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
