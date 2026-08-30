import {
  Banknote,
  Coins,
  FileText,
  Landmark,
  Rocket,
  Send,
  ShieldCheck,
  Sprout,
  UserPlus,
  Wrench,
  type LucideIcon,
} from "lucide-react";

/**
 * Scheme figures reflect published Government of India guidance as of August
 * 2026 (PMMY, CGTMSE, PMEGP, SISFS, CLCSS). Limits change by circular and
 * budget announcement — re-verify with the nodal agency before relying on them.
 */

export interface ProgramCard {
  name: string;
  icon: LucideIcon;
  amount: string;
  summary: string;
  highlights: string[];
}

export const LOAN_PROGRAMS: ProgramCard[] = [
  {
    name: "PM MUDRA Yojana",
    icon: Coins,
    amount: "Up to ₹20 lakh",
    summary:
      "Collateral-free loans for micro units in manufacturing, trading, services, and allied agriculture.",
    highlights: [
      "Shishu up to ₹50,000 · Kishore up to ₹5 lakh",
      "Tarun up to ₹10 lakh · Tarun Plus up to ₹20 lakh",
      "Backed by the CGFMU guarantee",
    ],
  },
  {
    name: "CGTMSE-backed MSME loan",
    icon: ShieldCheck,
    amount: "Up to ₹10 crore",
    summary:
      "Credit guarantee cover that lets banks lend to micro and small enterprises without collateral or third-party security.",
    highlights: [
      "Ceiling raised from ₹5 crore in April 2025",
      "Guarantee cover of 75%–85% by category",
      "Term loans and working capital both eligible",
    ],
  },
  {
    name: "Stand-Up India",
    icon: Landmark,
    amount: "₹10 lakh – ₹1 crore",
    summary:
      "Composite loans for greenfield ventures promoted by SC/ST and women entrepreneurs, via scheduled commercial banks.",
    highlights: [
      "One borrower per bank branch, at minimum",
      "Covers manufacturing, services, and trading",
      "Working capital bundled with the term loan",
    ],
  },
  {
    name: "PMEGP",
    icon: Banknote,
    amount: "Up to ₹50 lakh",
    summary:
      "Credit-linked subsidy for new micro enterprises in the non-farm sector, routed through KVIC, KVIB, and District Industries Centres.",
    highlights: [
      "₹50 lakh manufacturing · ₹20 lakh services",
      "Margin money subsidy of 15%–35%",
      "Promoter contribution of just 5%–10%",
    ],
  },
];

export const GRANT_PROGRAMS: ProgramCard[] = [
  {
    name: "Startup India Seed Fund",
    icon: Rocket,
    amount: "Up to ₹20 lakh grant",
    summary:
      "Non-repayable seed capital for proof of concept and prototyping, disbursed through DPIIT-approved incubators.",
    highlights: [
      "A further ₹50 lakh available as convertible debt",
      "DPIIT recognition and under two years old",
      "At least 51% Indian promoter shareholding",
    ],
  },
  {
    name: "PMEGP margin money",
    icon: Sprout,
    amount: "15% – 35% subsidy",
    summary:
      "The subsidy component of PMEGP, held in a locked term deposit and adjusted against your principal after three years of operation.",
    highlights: [
      "35% for SC/ST, women, and NER in rural areas",
      "15% for general category in urban areas",
      "Applies to new micro enterprises only",
    ],
  },
  {
    name: "CLCSS",
    icon: Wrench,
    amount: "Up to ₹15 lakh",
    summary:
      "A 15% upfront capital subsidy for micro and small manufacturers upgrading to approved modern plant and machinery.",
    highlights: [
      "On institutional finance up to ₹1 crore",
      "20% and ₹20 lakh for NER and hill states",
      "Credited against your loan principal",
    ],
  },
];

export interface Stat {
  value: string;
  label: string;
}

export const STATS: Stat[] = [
  { value: "₹20 lakh", label: "MUDRA ceiling after Tarun Plus" },
  { value: "₹10 crore", label: "CGTMSE collateral-free cover" },
  { value: "35%", label: "Top PMEGP margin money subsidy" },
  { value: "₹70 lakh", label: "Total seed support for DPIIT startups" },
];

export interface Step {
  icon: LucideIcon;
  title: string;
  description: string;
}

export const STEPS: Step[] = [
  {
    icon: UserPlus,
    title: "Create your account",
    description:
      "Sign up in two minutes with a quick human verification check.",
  },
  {
    icon: FileText,
    title: "Build your business profile",
    description:
      "One adaptive form covering Udyam details, ownership, and turnover. Progress saves as you go.",
  },
  {
    icon: Send,
    title: "Apply and track",
    description:
      "See the schemes you qualify for, upload documents once, and follow every status change.",
  },
];
