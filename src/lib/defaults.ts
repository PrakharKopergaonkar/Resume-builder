import type {
  CertificationItem,
  CustomItem,
  EducationItem,
  ExperienceItem,
  ResumeContent,
  ResumeStyle,
  Section,
  SkillItem,
} from "@/types/resume";

export const newId = () => crypto.randomUUID();

export const DEFAULT_STYLE: ResumeStyle = {
  accent: "#2f5d8a",
  font: "source-sans",
  fontSize: "M",
  sectionSpacing: 1,
  lineHeight: 1.35,
  paper: "A4",
};

export const ACCENT_SWATCHES = [
  "#2f5d8a",
  "#1f2937",
  "#0f766e",
  "#4d7c0f",
  "#b45309",
  "#b91c1c",
  "#7c3aed",
  "#be185d",
];

export const emptyExperience = (): ExperienceItem => ({
  id: newId(),
  title: "",
  company: "",
  city: "",
  country: "",
  start: "",
  end: "",
  current: false,
  html: "",
});

export const emptyEducation = (): EducationItem => ({
  id: newId(),
  school: "",
  degree: "",
  field: "",
  city: "",
  gradYear: "",
  html: "",
});

export const emptySkill = (): SkillItem => ({ id: newId(), name: "", level: 0 });

export const emptyCustom = (): CustomItem => ({ id: newId(), heading: "", date: "", html: "" });

export const emptyCertification = (): CertificationItem => ({
  id: newId(),
  name: "",
  issuer: "",
  issueMonth: 0,
  issueYear: "",
  expiryMonth: 0,
  expiryYear: "",
  credentialId: "",
  credentialUrl: "",
});

/** Sections a user can add from the "Add section" panel. */
export const SECTION_PRESETS: { key: string; title: string; type: Section["type"]; column: 0 | 1 }[] = [
  { key: "summary", title: "Summary", type: "summary", column: 1 },
  { key: "experience", title: "Work History", type: "experience", column: 1 },
  { key: "education", title: "Education", type: "education", column: 1 },
  { key: "skills", title: "Skills", type: "skills", column: 0 },
  { key: "languages", title: "Languages", type: "skills", column: 0 },
  { key: "certifications", title: "Certifications", type: "certifications", column: 1 },
  { key: "projects", title: "Projects", type: "custom", column: 1 },
  { key: "awards", title: "Awards", type: "custom", column: 1 },
  { key: "interests", title: "Interests", type: "skills", column: 0 },
];

export function makeSection(type: Section["type"], title: string, column: 0 | 1): Section {
  const base = { id: newId(), title, hidden: false, column };
  switch (type) {
    case "summary":
      return { ...base, type, html: "" };
    case "experience":
      return { ...base, type, items: [emptyExperience()] };
    case "education":
      return { ...base, type, items: [emptyEducation()] };
    case "skills":
      return { ...base, type, items: [emptySkill()] };
    case "custom":
      return { ...base, type, items: [emptyCustom()] };
    case "certifications":
      return { ...base, type, items: [emptyCertification()] };
  }
}

export function blankContent(): ResumeContent {
  return {
    header: { firstName: "", lastName: "", title: "", email: "", phone: "", city: "", country: "", links: [] },
    sections: [
      makeSection("summary", "Summary", 1),
      makeSection("experience", "Work History", 1),
      makeSection("education", "Education", 1),
      makeSection("skills", "Skills", 0),
    ],
  };
}

export function sampleContent(): ResumeContent {
  return {
    header: {
      firstName: "Alex",
      lastName: "Morgan",
      title: "Full Stack Engineer",
      email: "alex.morgan@example.com",
      phone: "+1 555 010 2030",
      city: "Austin",
      country: "USA",
      links: [{ id: newId(), label: "LinkedIn", url: "https://linkedin.com/in/alex-morgan" }],
    },
    sections: [
      {
        id: newId(),
        type: "summary",
        title: "Summary",
        hidden: false,
        column: 1,
        html: "<p>Full stack engineer with 5+ years building React and Node.js products, from UI to API. Comfortable owning features end to end and shipping quickly with strong test coverage.</p>",
      },
      {
        id: newId(),
        type: "experience",
        title: "Work History",
        hidden: false,
        column: 1,
        items: [
          {
            id: newId(),
            title: "Software Engineer II",
            company: "Acme Corp",
            city: "Austin",
            country: "USA",
            start: "2023-07",
            end: "",
            current: true,
            html: "<ul><li>Built a Kafka-driven event pipeline that cut data latency by 40%.</li><li>Led the migration of the admin dashboard to Next.js and Tailwind CSS.</li><li>Kept unit test coverage above 85% with Jest and Vitest.</li></ul>",
          },
          {
            id: newId(),
            title: "Software Engineer",
            company: "Globex",
            city: "Dallas",
            country: "USA",
            start: "2020-06",
            end: "2023-06",
            current: false,
            html: "<ul><li>Shipped REST APIs in Express and PostgreSQL serving 2M requests/day.</li><li>Designed reusable React components for the internal design system.</li></ul>",
          },
        ],
      },
      {
        id: newId(),
        type: "education",
        title: "Education",
        hidden: false,
        column: 1,
        items: [
          {
            id: newId(),
            school: "University of Texas",
            degree: "B.S.",
            field: "Computer Science",
            city: "Austin",
            gradYear: "2020",
            html: "",
          },
        ],
      },
      {
        id: newId(),
        type: "skills",
        title: "Skills",
        hidden: false,
        column: 0,
        items: ["React", "TypeScript", "Node.js", "PostgreSQL", "Kafka", "AWS"].map((name) => ({
          id: newId(),
          name,
          level: 0,
        })),
      },
      {
        id: newId(),
        type: "certifications",
        title: "Certifications",
        hidden: false,
        column: 0,
        items: [
          {
            id: newId(),
            name: "AWS Certified Developer – Associate",
            issuer: "Amazon Web Services",
            issueMonth: 3,
            issueYear: "2024",
            expiryMonth: 3,
            expiryYear: "2027",
            credentialId: "AWS-DVA-123456",
            credentialUrl: "https://www.credly.com/badges/example",
          },
        ],
      },
    ],
  };
}

/**
 * The resume every new account starts with: the example content above (so users see what each section can hold),
 * with their own name and email in the header and a Languages section showing skill levels.
 */
export function starterContent(user: { name: string; email: string }): ResumeContent {
  const content = sampleContent();
  const [firstName, ...rest] = user.name.trim().split(/\s+/);
  content.header = {
    ...content.header,
    firstName: firstName ?? "",
    lastName: rest.join(" "),
    email: user.email,
    links: [{ id: newId(), label: "LinkedIn", url: "linkedin.com/in/your-profile" }],
  };
  content.sections.push({
    id: newId(),
    type: "skills",
    title: "Languages",
    hidden: false,
    column: 0,
    items: [
      { id: newId(), name: "English", level: 5 },
      { id: newId(), name: "Spanish", level: 3 },
    ],
  });
  return content;
}

export const STARTER_RESUME_NAME = "Sample Resume";
