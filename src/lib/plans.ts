/**
 * The plans, in one place, so the pricing page and the signup page cannot disagree.
 * Minutes are the unit: a call is as long as the conversation, and a hang-up should not
 * cost the same as a negotiation.
 */

export interface Plan {
  id: string;
  name: string;
  price: string;
  cadence: string;
  minutes: string;
  who: string;
  features: string[];
  cta: string;
  featured?: boolean;
}

export const PLANS: Plan[] = [
  {
    id: "solo",
    name: "Solo",
    price: "$19",
    cadence: "a month",
    minutes: "60 minutes a month",
    who: "One person with a meeting on Thursday.",
    features: [
      "Every caller, every tone and intent",
      "Build three of your own from a profile",
      "The full review, with flags",
      "Overage $0.40 a minute, capped by you",
    ],
    cta: "Start on Solo",
  },
  {
    id: "fixed",
    name: "Fixed",
    price: "$49",
    cadence: "per seat a month, from 3 seats",
    minutes: "150 minutes a seat, pooled across the team",
    who: "A team leader, a brokerage office, a sales floor.",
    features: [
      "Minutes pool, so the people who drill hardest use the most",
      "Unlimited callers, CSV upload of your whole audience",
      "Shared library, manager view, progress by rep",
      "$39 a seat billed yearly",
    ],
    cta: "Start on Fixed",
    featured: true,
  },
  {
    id: "custom",
    name: "Custom",
    price: "$0.40",
    cadence: "a minute, to $0.25 at volume",
    minutes: "No seats, no minimum minutes",
    who: "Brokerages, coaches, bootcamps and anyone handing practice to a cohort.",
    features: [
      "$0.25 a minute above 10,000 minutes a month",
      "Your own scripts as callers, white label, SSO, API",
      "$500 a month platform fee, waived on a year",
      "Invoiced monthly on minutes actually connected",
    ],
    cta: "Talk to us",
  },
];

/** What a minute really costs to serve, published so the pricing page can be honest. */
export const COST_NOTE =
  "A minute of talking costs us between six and twenty-four cents depending on the voice stack, and we price every plan to work at twelve.";
