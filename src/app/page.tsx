import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { HomeClient } from "./HomeClient";

export const metadata: Metadata = {
  title: "Captura — Collect Event Photos from Guests via QR Code",
  description:
    "Captura lets event hosts create shared photo albums and collect photos from guests using a QR code — no app download needed. Perfect for weddings, birthdays, corporate events, and parties. Guests scan, upload, done.",
  keywords: [
    "event photo collection app",
    "shared album for events",
    "collect photos from wedding guests",
    "QR code photo sharing",
    "crowd-sourced event photos",
    "guest photo upload app",
    "wedding photo app no download",
    "shared photo album QR code",
    "event photography crowd source",
    "collect party photos from guests",
    "photo sharing app for events",
    "guest photo collection wedding",
  ],
  authors: [{ name: "Captura" }],
  creator: "Captura",
  metadataBase: new URL("https://captura.app"),
  openGraph: {
    title: "Captura — Collect Event Photos from Guests via QR Code",
    description:
      "Create a shared album, share a QR code. Guests upload photos from their phone — no account, no friction. Perfect for weddings, birthdays, and any event.",
    url: "https://captura.app",
    siteName: "Captura",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Captura — Crowd-sourced event photo collection",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Captura — Collect Event Photos from Guests via QR Code",
    description:
      "Create a shared album, share a QR code. Guests upload photos from their phone — no account, no friction.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  alternates: {
    canonical: "https://captura.app",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: "Captura",
      applicationCategory: "PhotoApplication",
      operatingSystem: "Web",
      url: "https://captura.app",
      description:
        "Captura is a web app that lets event hosts create shared photo albums and collect photos from guests using a QR code — no app download required for guests. Ideal for weddings, birthday parties, corporate events, reunions, and any occasion where you want to crowdsource photos from attendees.",
      offers: [
        { "@type": "Offer", name: "Starter", price: "0", priceCurrency: "USD", description: "Free plan with 1 album and 5 GB storage" },
        { "@type": "Offer", name: "Pro", price: "19", priceCurrency: "USD", description: "10 albums, 100 GB storage, face detection, multiple QR codes" },
        { "@type": "Offer", name: "Business", price: "79", priceCurrency: "USD", description: "Unlimited albums, 1 TB storage, custom branding" },
      ],
      featureList: [
        "QR code guest photo upload — no app download needed",
        "Shared event photo albums",
        "Face detection to filter photos by person",
        "Bulk ZIP download of all event photos",
        "Time-gated upload windows (open and close dates)",
        "Welcome card with event cover photo and message",
        "Guest gallery visibility control",
        "Multiple QR codes per album",
        "Photo and video support",
      ],
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "What is Captura?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Captura is a web app for collecting photos from event guests. You create a shared album, generate a QR code, and guests scan it to upload their photos and videos directly — no app download or account required for guests.",
          },
        },
        {
          "@type": "Question",
          name: "How do guests upload photos at an event?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Guests scan a QR code you display at the event. This opens a web page on their phone where they can upload photos and videos directly to your album. No app installation or account creation is needed.",
          },
        },
        {
          "@type": "Question",
          name: "Is there an app for collecting photos from wedding guests?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Captura is a web-based solution for collecting photos from wedding guests. You share a QR code — guests scan and upload from any phone browser. No app download required. You can download all photos as a ZIP file after the event.",
          },
        },
        {
          "@type": "Question",
          name: "Can I collect photos from guests at a birthday party?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Captura works for any event — weddings, birthday parties, corporate events, reunions, graduations, and more. Create an album, share the QR code, and collect photos from everyone.",
          },
        },
        {
          "@type": "Question",
          name: "Does Captura have face recognition for event photos?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Captura includes face detection that automatically groups photos by the faces that appear in them. Hosts can filter their gallery to see all photos of a specific person.",
          },
        },
      ],
    },
  ],
};

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HomeClient isLoggedIn={!!user} />
    </>
  );
}
