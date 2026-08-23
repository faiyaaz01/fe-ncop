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

export interface InquiryLineRequestDto {
  productId: string;
  qualityAssigneeId: string;
  quantityRequired: number;
  shipperPackRequired?: number;
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
  lines: InquiryLineRequestDto[];
}

export interface CustomerInquiry extends CustomerInquiryRequestDto {
  id: string;
  rfqNo: string;
  inquiryDate: string;
  customerName: string;
  contactPersonName: string;
  status: string;
  lines: Array<
    InquiryLineRequestDto & {
      productName: string;
      genericName: string;
      dosageForm: string;
      dosageVariant?: string;
      strength?: string;
      pharmacopeia?: string;
      sourcing: ProductSourcing;
      qualityAssigneeName: string;
    }
  >;
}
