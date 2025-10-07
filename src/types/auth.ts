export interface SellerFirstStepBody {
  phone_number: string;
  email: string;
  password: string;
}

export interface SellerOnboardingBody {
  userId: string;
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
  phone?: string;
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
  createdAt?: Date;
  updatedAt?: Date;
}
