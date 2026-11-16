import type { DocType } from "@/lib/documents/types";

export type FieldKind = "money" | "months" | "days" | "hours" | "percent" | "text" | "boolean" | "party";

export const PARTIES = ["tenant", "landlord", "shared"] as const;
export type Party = (typeof PARTIES)[number];

export interface ScalarFieldDef {
  key: string;
  label: string;
  kind: FieldKind;
  /** Instruction for the model: what exactly this field means. */
  hint: string;
  /** Which way is better for the person signing, used by the compare view. */
  better?: "higher" | "lower";
  group: string;
}

export interface ListFieldDef {
  key: string;
  label: string;
  hint: string;
  group: string;
}

export interface DocCatalog {
  scalars: ScalarFieldDef[];
  lists: ListFieldDef[];
}

const OFFER_LETTER: DocCatalog = {
  scalars: [
    { key: "employer", label: "Company", kind: "text", hint: "Name of the employer", group: "The job" },
    { key: "role", label: "Role", kind: "text", hint: "Job title / designation offered", group: "The job" },
    { key: "location", label: "Work location", kind: "text", hint: "City or office of posting", group: "The job" },
    { key: "joiningDate", label: "Joining date", kind: "text", hint: "Date of joining exactly as written", group: "The job" },
    { key: "ctcAnnual", label: "Total CTC (per year)", kind: "money", hint: "Total cost to company per year in rupees", better: "higher", group: "Pay" },
    { key: "fixedAnnual", label: "Fixed pay (per year)", kind: "money", hint: "Guaranteed fixed component per year in rupees, excluding variable pay, bonuses and stocks", better: "higher", group: "Pay" },
    { key: "basicAnnual", label: "Basic salary (per year)", kind: "money", hint: "Basic salary per year in rupees (often in a salary annexure)", group: "Pay" },
    { key: "hraAnnual", label: "HRA (per year)", kind: "money", hint: "House rent allowance per year in rupees", group: "Pay" },
    { key: "employerPfAnnual", label: "Employer PF (per year)", kind: "money", hint: "Employer provident fund contribution per year in rupees, if listed as part of CTC", group: "Pay" },
    { key: "variableAnnual", label: "Variable / performance pay (per year)", kind: "money", hint: "Target variable or performance pay per year in rupees", better: "higher", group: "Pay" },
    { key: "joiningBonus", label: "Joining bonus", kind: "money", hint: "One-time joining or sign-on bonus in rupees", better: "higher", group: "Pay" },
    { key: "joiningBonusClawbackMonths", label: "Joining bonus payback period", kind: "months", hint: "Months within which leaving means repaying the joining bonus", better: "lower", group: "Pay" },
    { key: "stocks", label: "Stocks / ESOPs", kind: "text", hint: "Stock, RSU or ESOP grant with vesting, as written", group: "Pay" },
    { key: "benefits", label: "Other benefits", kind: "text", hint: "Insurance, meals, allowances etc. listed as benefits", group: "Pay" },
    { key: "probationMonths", label: "Probation", kind: "months", hint: "Probation period in months", better: "lower", group: "Rules" },
    { key: "noticeDays", label: "Notice period", kind: "days", hint: "Notice period after confirmation, in days (1 month = 30 days)", better: "lower", group: "Rules" },
    { key: "noticeDaysProbation", label: "Notice during probation", kind: "days", hint: "Notice period during probation, in days", better: "lower", group: "Rules" },
    { key: "bondAmount", label: "Service bond amount", kind: "money", hint: "Amount payable if leaving before the bond / service agreement period ends", better: "lower", group: "Rules" },
    { key: "bondMonths", label: "Service bond period", kind: "months", hint: "Length of the bond / minimum service period in months", better: "lower", group: "Rules" },
    { key: "nonCompeteMonths", label: "Non-compete period", kind: "months", hint: "Months after leaving during which joining competitors is restricted", better: "lower", group: "Rules" },
    { key: "relocation", label: "Relocation / transfer", kind: "text", hint: "Relocation support or transfer clause, as written", group: "Rules" },
  ],
  lists: [],
};

const RENT_AGREEMENT: DocCatalog = {
  scalars: [
    { key: "landlord", label: "Owner", kind: "text", hint: "Landlord / licensor name", group: "The home" },
    { key: "property", label: "Property", kind: "text", hint: "Address or description of the property", group: "The home" },
    { key: "startDate", label: "Start date", kind: "text", hint: "Start date of the agreement as written", group: "The home" },
    { key: "agreementMonths", label: "Agreement length", kind: "months", hint: "Total term of the agreement in months", group: "The home" },
    { key: "monthlyRent", label: "Monthly rent", kind: "money", hint: "Monthly rent in rupees", better: "lower", group: "Money" },
    { key: "deposit", label: "Security deposit", kind: "money", hint: "Refundable security deposit in rupees", better: "lower", group: "Money" },
    { key: "depositRefundDays", label: "Deposit returned within", kind: "days", hint: "Days after vacating within which the deposit is returned", better: "lower", group: "Money" },
    { key: "depositNonRefundable", label: "Part of deposit not refundable", kind: "boolean", hint: "true if any part of the deposit is stated as non-refundable", group: "Money" },
    { key: "depositDeductions", label: "Deposit deductions", kind: "text", hint: "What can be deducted from the deposit, as written", group: "Money" },
    { key: "incrementPercent", label: "Rent increase", kind: "percent", hint: "Rent increase percentage", better: "lower", group: "Money" },
    { key: "incrementEveryMonths", label: "Rent increases every", kind: "months", hint: "Months between rent increases", better: "higher", group: "Money" },
    { key: "maintenanceMonthly", label: "Maintenance (per month)", kind: "money", hint: "Monthly maintenance charge in rupees", better: "lower", group: "Money" },
    { key: "maintenancePaidBy", label: "Maintenance paid by", kind: "party", hint: "Who pays maintenance: tenant, landlord or shared", group: "Upkeep" },
    { key: "minorRepairsBy", label: "Small repairs paid by", kind: "party", hint: "Who pays minor / day-to-day repairs", group: "Upkeep" },
    { key: "majorRepairsBy", label: "Major repairs paid by", kind: "party", hint: "Who pays structural or major repairs (plumbing lines, wiring, roof)", group: "Upkeep" },
    { key: "lockInMonths", label: "Lock-in period", kind: "months", hint: "Months during which the tenant cannot leave without penalty", better: "lower", group: "Leaving" },
    { key: "tenantNoticeMonths", label: "Your notice period", kind: "months", hint: "Notice the tenant must give before leaving, in months", better: "lower", group: "Leaving" },
    { key: "landlordNoticeMonths", label: "Owner's notice period", kind: "months", hint: "Notice the landlord must give to ask the tenant to leave, in months", better: "higher", group: "Leaving" },
    { key: "terminationRules", label: "Ending the agreement", kind: "text", hint: "Termination conditions and penalties, as written", group: "Leaving" },
  ],
  lists: [],
};

const INSURANCE_POLICY: DocCatalog = {
  scalars: [
    { key: "insurer", label: "Insurer", kind: "text", hint: "Insurance company name", group: "The policy" },
    { key: "planName", label: "Plan", kind: "text", hint: "Plan / product name", group: "The policy" },
    { key: "sumInsured", label: "Sum insured", kind: "money", hint: "Sum insured / cover amount in rupees", better: "higher", group: "The policy" },
    { key: "premiumAnnual", label: "Premium (per year)", kind: "money", hint: "Annual premium in rupees including GST if stated", better: "lower", group: "The policy" },
    { key: "initialWaitingDays", label: "Initial waiting period", kind: "days", hint: "Days from start during which illness claims (except accidents) are not paid", better: "lower", group: "Waiting periods" },
    { key: "preExistingWaitingMonths", label: "Pre-existing illness waiting", kind: "months", hint: "Waiting period for pre-existing diseases, in months", better: "lower", group: "Waiting periods" },
    { key: "specificDiseaseWaitingMonths", label: "Specific illness waiting", kind: "months", hint: "Waiting period for listed specific diseases/surgeries, in months", better: "lower", group: "Waiting periods" },
    { key: "copayPercent", label: "Co-pay", kind: "percent", hint: "Percentage of each claim the policyholder must pay", better: "lower", group: "What you pay at claim time" },
    { key: "roomRentLimit", label: "Room rent limit", kind: "text", hint: "Room rent cap as written (e.g. 1% of sum insured per day)", group: "What you pay at claim time" },
    { key: "cashless", label: "Cashless treatment", kind: "boolean", hint: "true if cashless treatment at network hospitals is offered", group: "Claims" },
    { key: "claimIntimationHours", label: "Tell insurer within", kind: "hours", hint: "Hours within which the insurer must be informed of a hospitalisation", better: "higher", group: "Claims" },
    { key: "claimProcess", label: "How to claim", kind: "text", hint: "Claim process steps, as written", group: "Claims" },
  ],
  lists: [
    { key: "exclusions", label: "Not covered", hint: "Each permanent exclusion (one item each)", group: "Not covered" },
    { key: "subLimits", label: "Sub-limits", hint: "Each cap on a specific treatment or expense (one item each)", group: "What you pay at claim time" },
  ],
};

export const CATALOG: Record<DocType, DocCatalog> = { OFFER_LETTER, RENT_AGREEMENT, INSURANCE_POLICY };

export function scalarDef(docType: DocType, key: string): ScalarFieldDef | undefined {
  return CATALOG[docType].scalars.find((f) => f.key === key);
}
