export interface JourneyEvent {
  year: string;
  title: string;
  when: string;
  text: string;
}

export const journey: JourneyEvent[] = [
  { year: "2004", title: "Born", when: "07 Jul 2004 · Chennai", text: "Where it all begins: Chennai, India. The city I still build from." },
  { year: "2022", title: "Finished school", when: "Chettinad Vidyashram · 2022", text: "Wrapped up schooling at Chettinad Vidyashram and pointed everything toward engineering." },
  { year: "2022", title: "Started engineering", when: "Rajalakshmi Engineering College · Nov 2022", text: "Began my B.E. in Computer Science, where code went from hobby to craft." },
  { year: "2024", title: "1st place · Techno Kallos", when: "Design summit · Nov 2024", text: "Took first prize at Techno Kallos for a luxury e-commerce site, proof the design eye was earning its keep." },
  { year: "2024", title: "First internship", when: "Finsol Consultancy, Vizag · Dec 2024 – Jan 2025", text: "My first taste of shipping in industry, a winter internship at Finsol Consultancy, migrating a legacy app to React." },
  { year: "2025", title: "2nd place · RESONANCE’25", when: "Build-a-site sprint · 2025", text: "Second place at RESONANCE’25: a complete website built from scratch in two hours." },
  { year: "2025", title: "Ran Xynthraa 26", when: "Organiser & web design · Jun 2025", text: "Flipped to the other side of the table: managed the Xynthraa 26 hackathon end to end and designed its website." },
  { year: "2026", title: "Full-Stack Intern", when: "Zingbizz Digital Solution · Feb – May 2026", text: "Built a SaaS automation platform, a 38-module warehouse system and an image pipeline that made load times 5x faster." },
  { year: "2026", title: "Graduated", when: "B.E. CSE · May 2026", text: "Degree in hand and building full-time. The best part of the road is the next stretch." },
];
