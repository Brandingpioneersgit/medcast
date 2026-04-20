export const VENDOR_KINDS = {
  hotel: {
    label: "Hotels & Stays",
    singular: "Hotel",
    description: "Patient-friendly accommodations near partner hospitals.",
    defaultPriceUnit: "night",
  },
  interpreter: {
    label: "Medical Interpreters",
    singular: "Interpreter",
    description: "Language support during consultations, surgery, and recovery.",
    defaultPriceUnit: "hour",
  },
  driver: {
    label: "Airport & Hospital Transfer",
    singular: "Driver",
    description: "Vetted drivers for airport pickup, hospital transfers, and city travel.",
    defaultPriceUnit: "trip",
  },
  concierge: {
    label: "Concierge & Coordination",
    singular: "Concierge",
    description: "End-to-end trip support — visa, SIM, groceries, companion care.",
    defaultPriceUnit: "day",
  },
  pharmacy: {
    label: "Pharmacies",
    singular: "Pharmacy",
    description: "Pharmacies delivering internationally or to hospital rooms.",
    defaultPriceUnit: "order",
  },
} as const;

export type VendorKind = keyof typeof VENDOR_KINDS;

export function isVendorKind(x: string): x is VendorKind {
  return x in VENDOR_KINDS;
}

export const VENDOR_KIND_LIST = Object.keys(VENDOR_KINDS) as VendorKind[];
