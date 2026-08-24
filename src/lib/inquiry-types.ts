import type { ProductSourcing } from "./product-types";

export type InquirySource =
  | "WEBSITE"
  | "EMAIL"
  | "PHONE_CALL"
  | "WHATSAPP"
  | "EXISTING_CUSTOMER"
  | "REFERRAL"
  | "EXHIBITION"
  | "DIGITAL_PLATFORM"
  | "SALES_VISIT"
  | "OTHER";
export type InquiryPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type OrderQuantityUnit = "TERTIARY" | "SECONDARY" | "MONO_BOX" | "STRIP" | "TABLET" | "JAR";

export interface InquiryLineRequestDto {
  productId: string;
  sourcing: ProductSourcing;
  quantityRequired: number;
  orderQuantityUnit?: OrderQuantityUnit;
  calculatedTabletQuantity?: number;
  tertiaryPackRequired?: number;
  secondaryPackRequired?: number;
  monoBoxPackRequired?: number;
  stripPackRequired?: number;
  tabletPackRequired?: number;
  targetPrice?: number;
  packagingNotes?: string;
}

export interface CustomerInquiryRequestDto {
  customerId: string;
  contactPersonId: string;
  inquirySource: InquirySource;
  priority: InquiryPriority;
  targetQuoteDate?: string;
  notes?: string;
  qaAssigneeId?: string;
  qcAssigneeId?: string;
  salesAssigneeId?: string;
  lines: InquiryLineRequestDto[];
}

export interface CustomerInquiry extends CustomerInquiryRequestDto {
  id: string;
  rfqNo: string;
  inquiryDate: string;
  customerName: string;
  contactPersonName: string;
  status: string;
  qaAssigneeName?: string;
  qcAssigneeName?: string;
  raisedByUserId?: string;
  raisedByUserName?: string;
  salesAssigneeId?: string;
  salesAssigneeName?: string;
  lines: Array<
    InquiryLineRequestDto & {
      productName: string;
      genericName: string;
      dosageForm: string;
      dosageVariant?: string;
      strength?: string;
      pharmacopeia?: string;
      sourcing: ProductSourcing;
    }
  >;
}
