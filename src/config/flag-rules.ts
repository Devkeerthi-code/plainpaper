/**
 * "Watch out" rules. Thresholds are deliberately conservative and describe what is
 * common in practice, not what is legal. Wording never says a clause is illegal and
 * never tells the reader what to do; it explains and suggests questions to ask.
 */
import type { DocType, FlagSeverity } from "@/lib/documents/types";
import { formatINRShort, plural } from "@/lib/format";

export const FLAG_THRESHOLDS = {
  offer: {
    bondRedAmount: 100_000,
    bondRedMonths: 24,
    noticeAmberDays: 60,
    noticeRedDays: 90,
    probationAmberMonths: 6,
    nonCompeteRedMonths: 12,
    variableShareAmber: 0.2,
    fixedShareAmber: 0.75,
    clawbackAmberMonths: 12,
  },
  rent: {
    lockInAmberMonths: 6,
    lockInRedMonths: 12,
    depositAmberMonthsOfRent: 3,
    depositRedMonthsOfRent: 6,
    incrementAmberPercent: 10,
    tenantNoticeAmberMonths: 2,
    depositRefundAmberDays: 30,
  },
  insurance: {
    copayAmberPercent: 10,
    copayRedPercent: 20,
    preExistingAmberMonths: 24,
    preExistingRedMonths: 48,
    specificDiseaseAmberMonths: 24,
    initialWaitingAmberDays: 30,
    claimIntimationAmberHours: 24,
  },
} as const;

export interface FieldReader {
  num(key: string): number | null;
  text(key: string): string | null;
  bool(key: string): boolean | null;
  listCount(key: string): number;
}

export interface FlagOutcome {
  severity: FlagSeverity;
  title: string;
  why: string;
  questions: string[];
}

export interface FlagRule {
  id: string;
  docType: DocType;
  /** The field whose clause the margin note is pinned to. */
  anchor: string;
  evaluate(f: FieldReader): FlagOutcome | null;
}

const T = FLAG_THRESHOLDS;

const offerRules: FlagRule[] = [
  {
    id: "offer.bond",
    docType: "OFFER_LETTER",
    anchor: "bondAmount",
    evaluate(f) {
      const amount = f.num("bondAmount");
      if (!amount) return null;
      const months = f.num("bondMonths");
      const big = amount >= T.offer.bondRedAmount || (months ?? 0) >= T.offer.bondRedMonths;
      return {
        severity: big ? "red" : "amber",
        title: `Service bond of ${formatINRShort(amount)}${months ? ` for ${plural(months, "month")}` : ""}`,
        why: `If you leave before the bond period ends, the letter says you pay ${formatINRShort(amount)}. That can be more than several months of in-hand pay, so it affects how freely you can switch jobs early.`,
        questions: [
          "Does the amount reduce month by month as I complete service?",
          "What exactly is the bond for (training, certification, relocation)?",
          "Is the bond waived if the company ends my employment?",
        ],
      };
    },
  },
  {
    id: "offer.notice",
    docType: "OFFER_LETTER",
    anchor: "noticeDays",
    evaluate(f) {
      const days = f.num("noticeDays");
      if (!days || days < T.offer.noticeAmberDays) return null;
      return {
        severity: days >= T.offer.noticeRedDays ? "red" : "amber",
        title: `Notice period of ${plural(days, "day")}`,
        why: `When you resign you will need to keep working for about ${plural(Math.round(days / 30), "month")}. Many new employers want people sooner, so a long notice period can cost you a future offer.`,
        questions: [
          "Can the notice period be bought out, and how is the amount calculated?",
          "Can unused leave be adjusted against notice?",
          "Is the notice period the same for both sides?",
        ],
      };
    },
  },
  {
    id: "offer.probation",
    docType: "OFFER_LETTER",
    anchor: "probationMonths",
    evaluate(f) {
      const months = f.num("probationMonths");
      if (!months || months <= T.offer.probationAmberMonths) return null;
      return {
        severity: "amber",
        title: `Probation of ${plural(months, "month")}`,
        why: "This is longer than the usual 3 to 6 months. During probation, notice rules and some benefits can be different.",
        questions: ["Which benefits start only after confirmation?", "Can probation be extended, and on what basis?"],
      };
    },
  },
  {
    id: "offer.noncompete",
    docType: "OFFER_LETTER",
    anchor: "nonCompeteMonths",
    evaluate(f) {
      const months = f.num("nonCompeteMonths");
      if (!months) return null;
      return {
        severity: months >= T.offer.nonCompeteRedMonths ? "red" : "amber",
        title: `Limit on joining competitors for ${plural(months, "month")}`,
        why: "The letter restricts where you can work after leaving. It is worth knowing which companies or roles it covers before you sign.",
        questions: [
          "Which companies or kinds of roles count as competitors?",
          "Does this apply if I am laid off?",
        ],
      };
    },
  },
  {
    id: "offer.variable-heavy",
    docType: "OFFER_LETTER",
    anchor: "variableAnnual",
    evaluate(f) {
      const ctc = f.num("ctcAnnual");
      const variable = f.num("variableAnnual");
      if (!ctc || !variable || variable / ctc < T.offer.variableShareAmber) return null;
      const share = Math.round((variable / ctc) * 100);
      return {
        severity: "amber",
        title: `${share}% of the CTC is variable pay`,
        why: `${formatINRShort(variable)} of your CTC depends on performance or company results and is not guaranteed. Plan your monthly budget on the fixed part.`,
        questions: [
          "What percentage of the variable pay was actually paid out last year?",
          "How often is it paid, and do I need to be employed on the payout date?",
        ],
      };
    },
  },
  {
    id: "offer.ctc-vs-fixed",
    docType: "OFFER_LETTER",
    anchor: "ctcAnnual",
    evaluate(f) {
      const ctc = f.num("ctcAnnual");
      const fixed = f.num("fixedAnnual");
      if (!ctc || !fixed || fixed / ctc >= T.offer.fixedShareAmber) return null;
      return {
        severity: "amber",
        title: "Fixed pay is much lower than the CTC",
        why: `Only ${formatINRShort(fixed)} of the ${formatINRShort(ctc)} CTC is fixed pay. The rest is bonuses, stocks or benefits you may not receive as monthly cash.`,
        questions: ["Can you share the month-by-month salary breakup?", "Which parts of the CTC are one-time?"],
      };
    },
  },
  {
    id: "offer.bonus-clawback",
    docType: "OFFER_LETTER",
    anchor: "joiningBonusClawbackMonths",
    evaluate(f) {
      const months = f.num("joiningBonusClawbackMonths");
      if (!months || months < T.offer.clawbackAmberMonths) return null;
      return {
        severity: "amber",
        title: `Joining bonus must be repaid if you leave within ${plural(months, "month")}`,
        why: "The joining bonus is not fully yours until this period ends. Repayment is often the full amount, before tax adjustments.",
        questions: ["Is repayment pro-rated?", "Is it the amount before or after tax?"],
      };
    },
  },
];

const rentRules: FlagRule[] = [
  {
    id: "rent.lock-in",
    docType: "RENT_AGREEMENT",
    anchor: "lockInMonths",
    evaluate(f) {
      const months = f.num("lockInMonths");
      if (!months || months < T.rent.lockInAmberMonths) return null;
      return {
        severity: months >= T.rent.lockInRedMonths ? "red" : "amber",
        title: `Lock-in of ${plural(months, "month")}`,
        why: "If you need to move out during the lock-in, the agreement may ask you to pay rent for the remaining months or lose part of the deposit.",
        questions: [
          "What exactly do I pay if I leave during the lock-in?",
          "Does the lock-in apply to the owner too?",
          "Can it be shortened if I find a replacement tenant?",
        ],
      };
    },
  },
  {
    id: "rent.deposit-size",
    docType: "RENT_AGREEMENT",
    anchor: "deposit",
    evaluate(f) {
      const rent = f.num("monthlyRent");
      const deposit = f.num("deposit");
      if (!rent || !deposit) return null;
      const months = deposit / rent;
      if (months < T.rent.depositAmberMonthsOfRent) return null;
      return {
        severity: months >= T.rent.depositRedMonthsOfRent ? "red" : "amber",
        title: `Deposit is ${Number(months.toFixed(1))} months of rent`,
        why: `You hand over ${formatINRShort(deposit)} up front. A larger deposit means more money at risk if there is a dispute when you leave.`,
        questions: ["Can the deposit be reduced or paid in parts?", "Will I get a receipt for the deposit?"],
      };
    },
  },
  {
    id: "rent.non-refundable",
    docType: "RENT_AGREEMENT",
    anchor: "depositNonRefundable",
    evaluate(f) {
      if (f.bool("depositNonRefundable") !== true) return null;
      return {
        severity: "red",
        title: "Part of the deposit is not refundable",
        why: "Some of the deposit will not come back even if you leave the home in good condition.",
        questions: ["How much exactly is kept, and what is it for?", "Can this be written as a fixed cleaning or painting charge instead?"],
      };
    },
  },
  {
    id: "rent.increment",
    docType: "RENT_AGREEMENT",
    anchor: "incrementPercent",
    evaluate(f) {
      const pct = f.num("incrementPercent");
      if (!pct || pct <= T.rent.incrementAmberPercent) return null;
      return {
        severity: "amber",
        title: `Rent goes up by ${pct}%`,
        why: "Increases of 5 to 10% a year are more common. Over a few renewals this adds up quickly.",
        questions: ["Is the increase yearly or at each renewal?", "Can the increase be capped in writing?"],
      };
    },
  },
  {
    id: "rent.major-repairs",
    docType: "RENT_AGREEMENT",
    anchor: "majorRepairsBy",
    evaluate(f) {
      if (f.text("majorRepairsBy") !== "tenant") return null;
      return {
        severity: "amber",
        title: "You pay for major repairs",
        why: "Structural repairs such as wiring, pipelines or seepage are usually the owner's cost. Here they fall on you.",
        questions: ["Which repairs exactly count as major?", "Can we note the current condition of the home with photos before moving in?"],
      };
    },
  },
  {
    id: "rent.notice-imbalance",
    docType: "RENT_AGREEMENT",
    anchor: "tenantNoticeMonths",
    evaluate(f) {
      const tenant = f.num("tenantNoticeMonths");
      if (!tenant) return null;
      const owner = f.num("landlordNoticeMonths");
      const longer = owner !== null && tenant > owner;
      if (tenant < T.rent.tenantNoticeAmberMonths && !longer) return null;
      return {
        severity: "amber",
        title: longer ? "You must give more notice than the owner" : `Notice of ${plural(tenant, "month")} to move out`,
        why: longer
          ? `You need to give ${plural(tenant, "month")} notice, but the owner only ${plural(owner ?? 0, "month")}.`
          : "A longer notice period means planning a move well in advance.",
        questions: ["Can the notice period be the same for both sides?"],
      };
    },
  },
  {
    id: "rent.slow-refund",
    docType: "RENT_AGREEMENT",
    anchor: "depositRefundDays",
    evaluate(f) {
      const days = f.num("depositRefundDays");
      if (!days || days <= T.rent.depositRefundAmberDays) return null;
      return {
        severity: "amber",
        title: `Deposit returned only within ${plural(days, "day")}`,
        why: "You may need money for the next home's deposit before this one comes back.",
        questions: ["Can the deposit be returned on the day I hand over the keys?"],
      };
    },
  },
];

const insuranceRules: FlagRule[] = [
  {
    id: "insurance.copay",
    docType: "INSURANCE_POLICY",
    anchor: "copayPercent",
    evaluate(f) {
      const pct = f.num("copayPercent");
      if (!pct || pct < T.insurance.copayAmberPercent) return null;
      return {
        severity: pct >= T.insurance.copayRedPercent ? "red" : "amber",
        title: `You pay ${pct}% of every claim`,
        why: `On a ₹2 lakh hospital bill you would pay about ${formatINRShort((200000 * pct) / 100)} yourself, even within the sum insured.`,
        questions: ["Does the co-pay apply to every claim or only some (age, city, non-network hospital)?", "Is there a plan option without co-pay?"],
      };
    },
  },
  {
    id: "insurance.room-rent",
    docType: "INSURANCE_POLICY",
    anchor: "roomRentLimit",
    evaluate(f) {
      const limit = f.text("roomRentLimit");
      if (!limit || /\bno\b[^.]*\b(limits?|cap|capping|ceiling)\b|any room/i.test(limit)) return null;
      return {
        severity: "amber",
        title: "Room rent has a limit",
        why: "If you pick a room above the limit, many policies reduce the whole claim in the same ratio, not just the room charge.",
        questions: ["Are other charges reduced proportionally if I exceed the room limit?", "What room category does the limit cover in my city?"],
      };
    },
  },
  {
    id: "insurance.pre-existing",
    docType: "INSURANCE_POLICY",
    anchor: "preExistingWaitingMonths",
    evaluate(f) {
      const months = f.num("preExistingWaitingMonths");
      if (!months || months < T.insurance.preExistingAmberMonths) return null;
      return {
        severity: months >= T.insurance.preExistingRedMonths ? "red" : "amber",
        title: `Existing illnesses covered only after ${plural(months, "month")}`,
        why: "Any illness you already have (like diabetes or blood pressure) will not be covered until this waiting period ends.",
        questions: ["Can the waiting period be reduced with an add-on?", "Which of my existing conditions count as pre-existing?"],
      };
    },
  },
  {
    id: "insurance.specific-disease",
    docType: "INSURANCE_POLICY",
    anchor: "specificDiseaseWaitingMonths",
    evaluate(f) {
      const months = f.num("specificDiseaseWaitingMonths");
      if (!months || months < T.insurance.specificDiseaseAmberMonths) return null;
      return {
        severity: "amber",
        title: `Some treatments covered only after ${plural(months, "month")}`,
        why: "Listed treatments (often cataract, hernia, joint replacement) are not covered in the first years.",
        questions: ["Can I see the full list of treatments with a waiting period?"],
      };
    },
  },
  {
    id: "insurance.initial-wait",
    docType: "INSURANCE_POLICY",
    anchor: "initialWaitingDays",
    evaluate(f) {
      const days = f.num("initialWaitingDays");
      if (!days || days <= T.insurance.initialWaitingAmberDays) return null;
      return {
        severity: "amber",
        title: `No illness cover for the first ${plural(days, "day")}`,
        why: "Only accidents are covered at the start. Most policies wait 30 days.",
        questions: ["Is the initial waiting period waived if I am moving from another policy?"],
      };
    },
  },
  {
    id: "insurance.sub-limits",
    docType: "INSURANCE_POLICY",
    anchor: "subLimits",
    evaluate(f) {
      const count = f.listCount("subLimits");
      if (!count) return null;
      return {
        severity: "amber",
        title: `${count} treatment${count === 1 ? " has its" : "s have their"} own cap`,
        why: "Even if your sum insured is large, these treatments are paid only up to a smaller limit.",
        questions: ["Which common treatments have a cap, and how much is it?"],
      };
    },
  },
  {
    id: "insurance.short-intimation",
    docType: "INSURANCE_POLICY",
    anchor: "claimIntimationHours",
    evaluate(f) {
      const hours = f.num("claimIntimationHours");
      if (!hours || hours > T.insurance.claimIntimationAmberHours) return null;
      return {
        severity: "amber",
        title: `Insurer must be told within ${plural(hours, "hour")}`,
        why: "Missing this window can delay or complicate a claim. Save the claim phone number somewhere your family can find it.",
        questions: ["Is a late intimation accepted in an emergency?"],
      };
    },
  },
];

export const FLAG_RULES: FlagRule[] = [...offerRules, ...rentRules, ...insuranceRules];
