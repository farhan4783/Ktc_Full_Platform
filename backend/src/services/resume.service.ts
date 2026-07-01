import pdfParse from 'pdf-parse';
import { logger } from '../utils/logger';

// ============================================================
// Resume Service
// Performs local parsing of uploaded PDF resumes and skill extraction
// ============================================================

const SKILL_DICT = [
  'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'php', 'ruby', 'go', 'rust',
  'html', 'css', 'react', 'angular', 'vue', 'next.js', 'express', 'node.js', 'django', 'flask',
  'flutter', 'dart', 'react native', 'swift', 'kotlin', 'android', 'ios',
  'postgresql', 'mysql', 'mongodb', 'redis', 'sqlite', 'prisma', 'sequelize',
  'aws', 'gcp', 'azure', 'docker', 'kubernetes', 'git', 'github', 'ci/cd',
  'nginx', 'linux', 'rest api', 'graphql', 'machine learning', 'deep learning', 'sql'
];

/**
 * Parse a PDF resume buffer and extract matched skills
 */
export async function parseResumePdf(buffer: Buffer): Promise<{ text: string; skills: string[] }> {
  try {
    const data = await pdfParse(buffer);
    const text = data.text || '';
    const textLower = text.toLowerCase();

    // Filter skills using regex boundaries to avoid false positives (e.g. 'go' in 'good')
    const skills = SKILL_DICT.filter(skill => {
      const escapedSkill = skill.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      // For skills with symbols like c++, next.js, c# allow word boundaries or specific symbol groups
      let regexStr = `\\b${escapedSkill}\\b`;
      if (skill.includes('+') || skill.includes('#')) {
        regexStr = `(?:\\b|\\s)${escapedSkill}(?:\\b|\\s)`;
      }
      const regex = new RegExp(regexStr, 'i');
      return regex.test(textLower);
    });

    return { text, skills };
  } catch (error: any) {
    logger.error('Error parsing resume PDF:', error.message);
    return { text: '', skills: [] };
  }
}
