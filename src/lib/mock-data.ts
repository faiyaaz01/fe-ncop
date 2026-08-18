export type MockClient = {
  id: string;
  name: string;
  code: string;
  country: string;
  countryCode: string;
  city: string;
  segment: "Distributor" | "Manufacturer" | "Government Tender" | "Wholesaler";
  status: "Active" | "On Hold" | "Prospect";
  contactPerson: string;
  designation: string;
  email: string;
  phone: string;
  address: string;
  paymentTerms: string;
  currency: string;
  creditLimit: string;
  registeredSince: string;
  bank: { name: string; account: string; swift: string; branch: string };
  documents: { name: string; type: string; size: string; date: string }[];
  timeline: { date: string; title: string; detail: string }[];
  revenue: number;
  openOrders: number;
};

export const mockClients: MockClient[] = [
  {
    id: "CL-1042",
    name: "Novartis Bio",
    code: "NVB-CH",
    country: "Switzerland",
    countryCode: "CH",
    city: "Basel",
    segment: "Manufacturer",
    status: "Active",
    contactPerson: "Dr. Elena Roth",
    designation: "Head of Sourcing",
    email: "e.roth@novartisbio.example",
    phone: "+41 61 324 8890",
    address: "Lichtstrasse 35, 4056 Basel, Switzerland",
    paymentTerms: "Net 45 · LC at sight",
    currency: "CHF",
    creditLimit: "CHF 2,400,000",
    registeredSince: "12 Mar 2018",
    bank: {
      name: "UBS Switzerland AG",
      account: "CH93 0076 2011 6238 5295 7",
      swift: "UBSWCHZH80A",
      branch: "Basel Corporate",
    },
    documents: [
      { name: "GMP_Certificate_2026.pdf", type: "Regulatory", size: "2.4 MB", date: "04 Jan 2026" },
      { name: "Trade_License.pdf", type: "Legal", size: "820 KB", date: "18 Nov 2025" },
      { name: "Quality_Agreement.docx", type: "QA", size: "310 KB", date: "02 Sep 2025" },
    ],
    timeline: [
      { date: "28 Jul 2026", title: "Order ORD-2291 shipped", detail: "42 pallets · Rotterdam → Basel" },
      { date: "14 Jul 2026", title: "RFQ-8841 quoted", detail: "Amoxicillin 500mg · CHF 184,500" },
      { date: "02 Jun 2026", title: "Audit closed", detail: "Annual GMP audit passed with 0 critical findings" },
    ],
    revenue: 4820000,
    openOrders: 6,
  },
  {
    id: "CL-1078",
    name: "Apex Pharma Ltd.",
    code: "APX-IN",
    country: "India",
    countryCode: "IN",
    city: "Ahmedabad",
    segment: "Distributor",
    status: "Active",
    contactPerson: "Rahul Mehta",
    designation: "Procurement Director",
    email: "rahul.mehta@apexpharma.example",
    phone: "+91 79 4005 1122",
    address: "Plot 22, Sanand GIDC, Ahmedabad 382110, India",
    paymentTerms: "Net 30 · TT advance 30%",
    currency: "USD",
    creditLimit: "USD 1,100,000",
    registeredSince: "07 Aug 2020",
    bank: {
      name: "HDFC Bank",
      account: "5010 0284 9917 34",
      swift: "HDFCINBBAHM",
      branch: "Ahmedabad Prahladnagar",
    },
    documents: [
      { name: "WHO_GMP_Apex.pdf", type: "Regulatory", size: "1.9 MB", date: "22 Feb 2026" },
      { name: "Import_License.pdf", type: "Legal", size: "640 KB", date: "10 Jan 2026" },
    ],
    timeline: [
      { date: "30 Jul 2026", title: "Follow-up call scheduled", detail: "Q4 forecast alignment" },
      { date: "19 Jul 2026", title: "RFQ-8850 received", detail: "Metformin 850mg · 6M tablets" },
      { date: "05 May 2026", title: "Contract renewed", detail: "Annual supply agreement FY26-27" },
    ],
    revenue: 3140000,
    openOrders: 9,
  },
  {
    id: "CL-1110",
    name: "Meridian Healthcare",
    code: "MRD-AE",
    country: "United Arab Emirates",
    countryCode: "AE",
    city: "Dubai",
    segment: "Wholesaler",
    status: "Active",
    contactPerson: "Layla Haddad",
    designation: "Supply Chain Manager",
    email: "l.haddad@meridianhc.example",
    phone: "+971 4 388 7712",
    address: "Dubai Science Park, Block B, Dubai, UAE",
    paymentTerms: "Net 60",
    currency: "AED",
    creditLimit: "AED 3,800,000",
    registeredSince: "23 Jan 2021",
    bank: {
      name: "Emirates NBD",
      account: "AE07 0331 2345 6789 0123 456",
      swift: "EBILAEAD",
      branch: "Dubai Main",
    },
    documents: [
      { name: "MOH_Registration.pdf", type: "Regulatory", size: "1.2 MB", date: "11 Mar 2026" },
    ],
    timeline: [
      { date: "26 Jul 2026", title: "Payment received", detail: "AED 412,000 against INV-5521" },
      { date: "12 Jun 2026", title: "New product listing", detail: "Added 4 SKUs to catalogue" },
    ],
    revenue: 2260000,
    openOrders: 4,
  },
  {
    id: "CL-1156",
    name: "Helix Laboratories",
    code: "HLX-DE",
    country: "Germany",
    countryCode: "DE",
    city: "Frankfurt",
    segment: "Manufacturer",
    status: "On Hold",
    contactPerson: "Markus Weber",
    designation: "Category Lead",
    email: "m.weber@helixlabs.example",
    phone: "+49 69 2710 4408",
    address: "Mainzer Landstraße 61, 60329 Frankfurt, Germany",
    paymentTerms: "Net 30",
    currency: "EUR",
    creditLimit: "EUR 900,000",
    registeredSince: "16 Oct 2019",
    bank: {
      name: "Deutsche Bank AG",
      account: "DE89 3704 0044 0532 0130 00",
      swift: "DEUTDEFF",
      branch: "Frankfurt Zentrale",
    },
    documents: [],
    timeline: [
      { date: "21 Jul 2026", title: "Account placed on hold", detail: "Pending renewed QA dossier" },
    ],
    revenue: 1480000,
    openOrders: 1,
  },
  {
    id: "CL-1188",
    name: "Andes Farmacéutica",
    code: "AND-BR",
    country: "Brazil",
    countryCode: "BR",
    city: "São Paulo",
    segment: "Distributor",
    status: "Active",
    contactPerson: "Camila Duarte",
    designation: "Commercial Manager",
    email: "c.duarte@andesfarma.example",
    phone: "+55 11 3045 9921",
    address: "Av. Paulista 1374, São Paulo 01310-100, Brazil",
    paymentTerms: "Net 45 · LC 90 days",
    currency: "USD",
    creditLimit: "USD 750,000",
    registeredSince: "04 Feb 2022",
    bank: {
      name: "Itaú Unibanco",
      account: "0341 4419 00092331",
      swift: "ITAUBRSP",
      branch: "Paulista",
    },
    documents: [
      { name: "ANVISA_Approval.pdf", type: "Regulatory", size: "3.1 MB", date: "29 Apr 2026" },
    ],
    timeline: [
      { date: "23 Jul 2026", title: "Sample dispatch", detail: "Azithromycin 250mg · 3 batches" },
    ],
    revenue: 1120000,
    openOrders: 3,
  },
  {
    id: "CL-1203",
    name: "Sakura Medico KK",
    code: "SKM-JP",
    country: "Japan",
    countryCode: "JP",
    city: "Osaka",
    segment: "Government Tender",
    status: "Prospect",
    contactPerson: "Kenji Nakamura",
    designation: "Tender Coordinator",
    email: "k.nakamura@sakuramedico.example",
    phone: "+81 6 6210 3345",
    address: "2-3-9 Kitahama, Chuo-ku, Osaka 541-0041, Japan",
    paymentTerms: "Net 30",
    currency: "JPY",
    creditLimit: "Pending assessment",
    registeredSince: "18 Jun 2026",
    bank: {
      name: "MUFG Bank",
      account: "0005 221 7788341",
      swift: "BOTKJPJT",
      branch: "Osaka Chuo",
    },
    documents: [],
    timeline: [
      { date: "18 Jun 2026", title: "Prospect created", detail: "Introduced at CPHI Osaka" },
    ],
    revenue: 0,
    openOrders: 0,
  },
];

export type Product = {
  id: string;
  name: string;
  generic: string;
  category: string;
  dosageForm: string;
  strength: string;
  packaging: string;
  moq: string;
  price: number;
  currency: string;
  status: "Available" | "Low Stock" | "Discontinued";
  shelfLife: string;
  storage: string;
  registrations: string[];
  description: string;
};

export const products: Product[] = [
  {
    id: "PRD-4501",
    name: "Amoxicillin 500mg Capsule",
    generic: "Amoxicillin Trihydrate",
    category: "Antibiotics",
    dosageForm: "Capsule",
    strength: "500 mg",
    packaging: "10 x 10 Blister / Carton",
    moq: "500,000 caps",
    price: 0.042,
    currency: "USD",
    status: "Available",
    shelfLife: "36 months",
    storage: "Below 25°C, protect from moisture",
    registrations: ["EU-GMP", "WHO-GMP", "ANVISA"],
    description:
      "Broad-spectrum penicillin antibiotic indicated for respiratory, urinary and soft-tissue infections.",
  },
  {
    id: "PRD-4522",
    name: "Metformin HCl 850mg Tablet",
    generic: "Metformin Hydrochloride",
    category: "Anti-Diabetic",
    dosageForm: "Film-coated Tablet",
    strength: "850 mg",
    packaging: "3 x 10 Blister / Carton",
    moq: "1,000,000 tabs",
    price: 0.019,
    currency: "USD",
    status: "Available",
    shelfLife: "24 months",
    storage: "Below 30°C, dry place",
    registrations: ["WHO-GMP", "MOH-UAE"],
    description: "First-line oral biguanide therapy for type 2 diabetes mellitus.",
  },
  {
    id: "PRD-4560",
    name: "Azithromycin 250mg Tablet",
    generic: "Azithromycin Dihydrate",
    category: "Antibiotics",
    dosageForm: "Film-coated Tablet",
    strength: "250 mg",
    packaging: "6's Blister / Carton",
    moq: "300,000 tabs",
    price: 0.087,
    currency: "USD",
    status: "Low Stock",
    shelfLife: "36 months",
    storage: "Below 25°C",
    registrations: ["EU-GMP", "ANVISA"],
    description: "Macrolide antibiotic for community-acquired respiratory tract infections.",
  },
  {
    id: "PRD-4588",
    name: "Paracetamol 650mg Tablet",
    generic: "Acetaminophen",
    category: "Analgesics",
    dosageForm: "Tablet",
    strength: "650 mg",
    packaging: "15 x 10 Blister",
    moq: "2,000,000 tabs",
    price: 0.008,
    currency: "USD",
    status: "Available",
    shelfLife: "48 months",
    storage: "Below 30°C",
    registrations: ["WHO-GMP"],
    description: "Antipyretic and analgesic for mild to moderate pain and fever.",
  },
  {
    id: "PRD-4611",
    name: "Atorvastatin 20mg Tablet",
    generic: "Atorvastatin Calcium",
    category: "Cardiovascular",
    dosageForm: "Film-coated Tablet",
    strength: "20 mg",
    packaging: "3 x 10 Blister / Carton",
    moq: "800,000 tabs",
    price: 0.031,
    currency: "USD",
    status: "Available",
    shelfLife: "36 months",
    storage: "Below 25°C",
    registrations: ["EU-GMP", "WHO-GMP"],
    description: "HMG-CoA reductase inhibitor for hypercholesterolaemia management.",
  },
  {
    id: "PRD-4640",
    name: "Omeprazole 20mg Capsule",
    generic: "Omeprazole",
    category: "Gastrointestinal",
    dosageForm: "Enteric Capsule",
    strength: "20 mg",
    packaging: "2 x 7 Alu-Alu",
    moq: "600,000 caps",
    price: 0.026,
    currency: "USD",
    status: "Available",
    shelfLife: "24 months",
    storage: "Below 25°C, protect from light",
    registrations: ["WHO-GMP", "MOH-UAE"],
    description: "Proton pump inhibitor indicated for GERD and peptic ulcer disease.",
  },
  {
    id: "PRD-4677",
    name: "Salbutamol Inhaler 100mcg",
    generic: "Salbutamol Sulphate",
    category: "Respiratory",
    dosageForm: "Metered Dose Inhaler",
    strength: "100 mcg/dose",
    packaging: "200 doses / Canister",
    moq: "50,000 units",
    price: 1.42,
    currency: "USD",
    status: "Low Stock",
    shelfLife: "24 months",
    storage: "Below 30°C, do not freeze",
    registrations: ["EU-GMP"],
    description: "Short-acting beta-2 agonist for acute bronchospasm relief.",
  },
  {
    id: "PRD-4702",
    name: "Ceftriaxone 1g Injection",
    generic: "Ceftriaxone Sodium",
    category: "Antibiotics",
    dosageForm: "Powder for Injection",
    strength: "1 g",
    packaging: "Vial + WFI ampoule",
    moq: "200,000 vials",
    price: 0.54,
    currency: "USD",
    status: "Available",
    shelfLife: "36 months",
    storage: "Below 25°C, protect from light",
    registrations: ["EU-GMP", "WHO-GMP", "ANVISA"],
    description: "Third-generation cephalosporin for severe systemic infections.",
  },
  {
    id: "PRD-4733",
    name: "Ibuprofen 400mg Tablet",
    generic: "Ibuprofen",
    category: "Analgesics",
    dosageForm: "Film-coated Tablet",
    strength: "400 mg",
    packaging: "10 x 10 Blister",
    moq: "1,500,000 tabs",
    price: 0.012,
    currency: "USD",
    status: "Discontinued",
    shelfLife: "36 months",
    storage: "Below 30°C",
    registrations: [],
    description: "NSAID for pain, inflammation and fever. Line discontinued in Q2 2026.",
  },
  {
    id: "PRD-4760",
    name: "Insulin Glargine 100IU/mL",
    generic: "Insulin Glargine",
    category: "Anti-Diabetic",
    dosageForm: "Pre-filled Pen",
    strength: "100 IU/mL · 3 mL",
    packaging: "5 pens / Carton",
    moq: "20,000 pens",
    price: 6.85,
    currency: "USD",
    status: "Available",
    shelfLife: "30 months",
    storage: "2–8°C cold chain",
    registrations: ["EU-GMP", "MOH-UAE"],
    description: "Long-acting basal insulin analogue for glycaemic control.",
  },
];

export type Rfq = {
  id: string;
  client: string;
  country: string;
  product: string;
  quantity: string;
  value: number;
  currency: string;
  status: "Draft" | "Submitted" | "Under Review" | "Quoted" | "Won" | "Lost";
  owner: string;
  created: string;
};

export const rfqs: Rfq[] = [
  { id: "RFQ-8841", client: "Novartis Bio", country: "Switzerland", product: "Amoxicillin 500mg Capsule", quantity: "4,000,000 caps", value: 184500, currency: "USD", status: "Quoted", owner: "Shayban Saiyed", created: "14 Jul 2026" },
  { id: "RFQ-8850", client: "Apex Pharma Ltd.", country: "India", product: "Metformin HCl 850mg Tablet", quantity: "6,000,000 tabs", value: 121000, currency: "USD", status: "Under Review", owner: "Daniel Okafor", created: "19 Jul 2026" },
  { id: "RFQ-8862", client: "Meridian Healthcare", country: "UAE", product: "Ceftriaxone 1g Injection", quantity: "260,000 vials", value: 143200, currency: "USD", status: "Submitted", owner: "Shayban Saiyed", created: "22 Jul 2026" },
  { id: "RFQ-8871", client: "Andes Farmacéutica", country: "Brazil", product: "Azithromycin 250mg Tablet", quantity: "900,000 tabs", value: 79800, currency: "USD", status: "Won", owner: "Priya Raman", created: "25 Jul 2026" },
  { id: "RFQ-8879", client: "Helix Laboratories", country: "Germany", product: "Atorvastatin 20mg Tablet", quantity: "1,200,000 tabs", value: 38400, currency: "USD", status: "Lost", owner: "Daniel Okafor", created: "27 Jul 2026" },
  { id: "RFQ-8884", client: "Sakura Medico KK", country: "Japan", product: "Insulin Glargine 100IU/mL", quantity: "40,000 pens", value: 274000, currency: "USD", status: "Draft", owner: "Priya Raman", created: "30 Jul 2026" },
];

export type Order = {
  id: string;
  client: string;
  country: string;
  items: number;
  value: number;
  incoterm: string;
  status: "Confirmed" | "In Production" | "QA Release" | "Shipped" | "Delivered";
  eta: string;
  progress: number;
};

export const orders: Order[] = [
  { id: "ORD-2291", client: "Novartis Bio", country: "Switzerland", items: 4, value: 184500, incoterm: "CIF Rotterdam", status: "Shipped", eta: "12 Aug 2026", progress: 80 },
  { id: "ORD-2288", client: "Apex Pharma Ltd.", country: "India", items: 7, value: 121000, incoterm: "FOB Mundra", status: "In Production", eta: "26 Aug 2026", progress: 40 },
  { id: "ORD-2284", client: "Meridian Healthcare", country: "UAE", items: 3, value: 143200, incoterm: "CIF Jebel Ali", status: "QA Release", eta: "18 Aug 2026", progress: 60 },
  { id: "ORD-2279", client: "Andes Farmacéutica", country: "Brazil", items: 5, value: 79800, incoterm: "CFR Santos", status: "Confirmed", eta: "04 Sep 2026", progress: 20 },
  { id: "ORD-2265", client: "Novartis Bio", country: "Switzerland", items: 2, value: 96400, incoterm: "CIF Rotterdam", status: "Delivered", eta: "21 Jul 2026", progress: 100 },
  { id: "ORD-2251", client: "Meridian Healthcare", country: "UAE", items: 6, value: 210300, incoterm: "CIF Jebel Ali", status: "Delivered", eta: "09 Jul 2026", progress: 100 },
];

export const monthlySales = [
  { month: "Jan", sales: 412, revenue: 318 },
  { month: "Feb", sales: 468, revenue: 352 },
  { month: "Mar", sales: 521, revenue: 401 },
  { month: "Apr", sales: 494, revenue: 388 },
  { month: "May", sales: 602, revenue: 466 },
  { month: "Jun", sales: 655, revenue: 512 },
  { month: "Jul", sales: 731, revenue: 588 },
  { month: "Aug", sales: 690, revenue: 545 },
  { month: "Sep", sales: 742, revenue: 601 },
  { month: "Oct", sales: 810, revenue: 648 },
  { month: "Nov", sales: 878, revenue: 702 },
  { month: "Dec", sales: 935, revenue: 761 },
];

export const countryDistribution = [
  { country: "Switzerland", value: 32, revenue: 4.82 },
  { country: "India", value: 24, revenue: 3.14 },
  { country: "UAE", value: 18, revenue: 2.26 },
  { country: "Germany", value: 12, revenue: 1.48 },
  { country: "Brazil", value: 9, revenue: 1.12 },
  { country: "Japan", value: 5, revenue: 0.62 },
];

export const inquiryStatusData = [
  { status: "Quoted", count: 34 },
  { status: "Under Review", count: 21 },
  { status: "Submitted", count: 18 },
  { status: "Won", count: 27 },
  { status: "Lost", count: 11 },
];

export const productPerformance = [
  { name: "Amoxicillin 500mg", units: 8.4, margin: 22 },
  { name: "Metformin 850mg", units: 12.1, margin: 18 },
  { name: "Ceftriaxone 1g", units: 2.6, margin: 31 },
  { name: "Omeprazole 20mg", units: 6.3, margin: 26 },
  { name: "Insulin Glargine", units: 0.4, margin: 38 },
];

export const followUps = [
  { date: "03 Aug", client: "Apex Pharma Ltd.", note: "Q4 forecast alignment call", owner: "Daniel Okafor" },
  { date: "05 Aug", client: "Meridian Healthcare", note: "Cold-chain logistics review", owner: "Shayban Saiyed" },
  { date: "08 Aug", client: "Sakura Medico KK", note: "Tender dossier submission", owner: "Priya Raman" },
  { date: "11 Aug", client: "Novartis Bio", note: "Annual pricing negotiation", owner: "Shayban Saiyed" },
];

export const notifications = [
  { title: "RFQ-8871 marked as Won", detail: "Andes Farmacéutica · USD 79,800", time: "12 min ago", tone: "success" as const },
  { title: "QA release pending", detail: "ORD-2284 awaiting batch certificate", time: "1 h ago", tone: "warning" as const },
  { title: "New inquiry received", detail: "Sakura Medico KK · Insulin Glargine", time: "3 h ago", tone: "info" as const },
  { title: "Document expiring", detail: "Helix Laboratories GMP certificate", time: "Yesterday", tone: "warning" as const },
];

export const demoAccounts = [
  { role: "Administrator", email: "admin@pharmaERP.io", password: "demo1234", desc: "Full system access", initials: "AD" },
  { role: "Sales", email: "sales@pharmaERP.io", password: "demo1234", desc: "Clients, RFQs & orders", initials: "SL" },
  { role: "QA", email: "qa@pharmaERP.io", password: "demo1234", desc: "Batch & document control", initials: "QA" },
  { role: "Regulatory", email: "regulatory@pharmaERP.io", password: "demo1234", desc: "Registrations & dossiers", initials: "RG" },
];

export const currencies = ["USD", "EUR", "CHF", "AED", "JPY", "INR", "BRL"];
export const incoterms = ["EXW", "FOB", "CFR", "CIF", "DDP", "DAP"];

export const currency = (n: number, code = "USD") =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: code,
    maximumFractionDigits: n < 10 ? 3 : 0,
  }).format(n);