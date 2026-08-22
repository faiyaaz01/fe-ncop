// Product Master and Dosage Configuration TypeScript Types

export type ProductStatus = "ACTIVE" | "UNDER_DEVELOPMENT" | "DISCONTINUED" | "DRAFT";

export type ProductDocumentType =
  | "ARTWORK"
  | "COA"
  | "STABILITY_DATA"
  | "REGULATORY_APPROVAL"
  | "MSDS"
  | "OTHER";

export interface ProductIngredient {
  api: string;
  strength: string;
  unit: string;
  pharmacopeia: string;
}

export interface ProductDocument {
  id: string;
  documentType: ProductDocumentType;
  fileName: string;
  originalFileName: string;
  contentType: string;
  fileSize: number;
  fileUrl: string;
  storageType: "GCS" | "LOCAL";
  storagePath: string;
  uploadedAt: string;
}

export interface Product {
  id: string;
  productCode: string;
  brandName: string;
  category: string;
  therapeuticClass?: string;
  dosageForm: string;
  dosageVariant?: string;
  ingredients: ProductIngredient[];
  composition: string;
  packaging?: string;
  moq?: number;
  unitPrice?: number;
  currency?: string;
  shelfLife?: string;
  storageCondition?: string;
  description?: string;
  status: ProductStatus;
  documents?: ProductDocument[];
  createdOn?: string;
  lastUpdatedOn?: string;
}

export interface ProductRequestDto {
  productCode?: string | undefined;
  brandName: string;
  category?: string | undefined;
  therapeuticClass?: string | undefined;
  dosageForm: string;
  dosageVariant?: string | undefined;
  ingredients: ProductIngredient[];
  customComposition?: string | undefined;
  packaging?: string | undefined;
  moq?: number | undefined;
  unitPrice?: number | undefined;
  currency?: string | undefined;
  shelfLife?: string | undefined;
  storageCondition?: string | undefined;
  description?: string | undefined;
  status?: ProductStatus | undefined;
}

export interface DosageVariant {
  name: string;
  description?: string;
  active: boolean;
}

export interface DosageForm {
  id: string;
  name: string;
  description?: string;
  variants: DosageVariant[];
  active: boolean;
  sortOrder?: number;
  createdOn?: string;
  lastUpdatedOn?: string;
}

export interface DosageFormRequestDto {
  name: string;
  description?: string | undefined;
  variants?: DosageVariant[] | undefined;
  active?: boolean | undefined;
  sortOrder?: number | undefined;
}

export interface ProductMetrics {
  total: number;
  active: number;
  underDevelopment: number;
  discontinued: number;
}
