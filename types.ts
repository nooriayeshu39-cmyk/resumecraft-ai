export interface PersonalInfo {
  fullName: string;
  jobTitle: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  website?: string;
}

export interface WorkExperience {
  id: string;
  company: string;
  jobTitle: string;
  duration: string;
  description: string;
  bullets: string[];
}

export interface Education {
  id: string;
  degree: string;
  institution: string;
  year: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  technologies?: string;
  link?: string;
}

export interface ResumeData {
  personalInfo: PersonalInfo;
  summary: string;
  experiences: WorkExperience[];
  education: Education[];
  skills: string[];
  projects: Project[];
}

export type TemplateId = 'modern' | 'minimal' | 'classic';

export interface TemplateConfig {
  id: TemplateId;
  name: string;
  description: string;
  previewColor: string;
}

export interface AccentColor {
  name: string;
  hex: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
}
