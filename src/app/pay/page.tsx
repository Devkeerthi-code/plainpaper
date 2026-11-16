import type { Metadata } from "next";
import { AdviceStrip } from "@/components/chrome/BrandMark";
import { PayCalculator } from "@/components/pay/PayCalculator";

export const metadata: Metadata = {
  title: "In-hand pay calculator",
  description: "Turn a CTC into the monthly amount that reaches your bank account, under both tax regimes, with every step shown.",
};

export default function PayPage() {
  return (
    <>
      <PayCalculator standalone />
      <AdviceStrip />
    </>
  );
}
