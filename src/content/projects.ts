export interface Project {
  slug: string;
  title: string;
  client: string;
  year: string;
  sector: string;
  role: string;
  tags: string[];
  lede: string;
  video?: string;
}

export const projects: Project[] = [
  { slug: "zingbot", title: "ZINGBOT", client: "Zingbizz Digital", year: "2026", sector: "SaaS Platform", role: "Full-Stack Intern", tags: ["Next.js", "Node.js", "Supabase"], lede: "A multi-tenant SaaS for WhatsApp & Instagram automation: a visual workflow builder, analytics dashboard and live bot-preview, with capacity for 50+ clients." },
  { slug: "wms", title: "WMS", client: "Zingbizz Digital", year: "2026", sector: "Enterprise", role: "Full-Stack Intern", tags: ["NestJS", "Prisma"], lede: "A warehouse management system: 38+ modules with JWT role-based access control across 8 user roles, on NestJS, Prisma and PostgreSQL.", video: "media/wms.mp4" },
  { slug: "pixelpipe", title: "PIXELPIPE", client: "Zingbizz Digital", year: "2026", sector: "Infrastructure", role: "Full-Stack Intern", tags: ["Nginx", "WebP/AVIF"], lede: "A self-hosted image-delivery pipeline with dynamic WebP/AVIF optimization and Nginx disk caching, cutting front-end image load times by 5x." },
  { slug: "vmeet", title: "V-MEET", client: "Academic Project", year: "2025", sector: "Cloud Platform", role: "Full-Stack Developer", tags: ["Azure", "Gemini AI"], lede: "Automated Azure VM provisioning for academic labs: one-click deployment for whole classes, role-based teacher/student/admin portals and a Gemini assistant.", video: "media/vmeet.mp4" },
  { slug: "neurorythm", title: "NEURORYTHM", client: "Academic Project", year: "2025", sector: "Health Tech", role: "Full-Stack Developer", tags: ["IEEE Publication", "FastAPI"], lede: "An EEG-to-music mapper for autism support, published with IEEE: brainwave bands (Delta to Gamma) translated into therapeutic MIDI, with real-time processing and visualization." },
  { slug: "scholar", title: "SCHOLAR", client: "Academic Project", year: "2025", sector: "Data Viz", role: "Full-Stack Developer", tags: ["React", "Chart.js"], lede: "Journalist Profile Viewer: citations, co-authors and scholarly metrics pulled from Google Scholar via SerpAPI, with AI-generated author summaries." },
  { slug: "kallos", title: "KALLOS", client: "Techno Kallos ’24", year: "2024", sector: "E-Commerce", role: "Designer & Front-End", tags: ["UI Design", "1st Place"], lede: "A luxury e-commerce site and full UI redesign, hand-built over two timed rounds, 1st place at the Techno Kallos design summit.", video: "media/kallos.mp4" },
  { slug: "finsol", title: "FINSOL", client: "Finsol Consultancy", year: "2025", sector: "Fintech", role: "Front-End Intern", tags: ["React", "Redux"], lede: "Migrated a legacy AngularJS app to React in a team of four, with Tailwind styling, Axios API integration and Redux global state." },
];
