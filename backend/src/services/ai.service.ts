import { logger } from '../utils/logger';

// ============================================================
// AI Service (Mock Interview Evaluation using Gemini API)
// Provides structured evaluation scores, strengths, and improvements
// ============================================================

export interface InterviewEvaluationResult {
  score: number; // 0 - 100
  feedback: string;
  strengths: string[];
  improvements: string[];
}

/**
 * Evaluates candidate response to a behavioral or technical mock interview question
 */
export async function evaluateMockInterview(
  question: string,
  answer: string
): Promise<InterviewEvaluationResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    logger.info('[AI SERVICE DEVELOPMENT] Gemini API Key is not set. Falling back to local validator.');
    return evaluateMockInterviewMock(question, answer);
  }

  try {
    const axios = require('axios');
    const prompt = `
You are an expert technical recruiter. Evaluate the candidate's response to this interview question.
Question: "${question}"
Candidate Answer: "${answer}"

Provide a structured JSON evaluation matching this schema:
{
  "score": number, // an integer score between 0 and 100
  "feedback": "string summarizing the evaluation",
  "strengths": ["list of 1 to 3 specific strengths"],
  "improvements": ["list of 1 to 3 specific action-oriented areas of improvement"]
}

Return ONLY the raw JSON text. Do not wrap in markdown tags like \`\`\`json.
`;

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json"
        }
      }
    );

    const resultText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!resultText) {
      throw new Error('Empty response from Gemini API');
    }

    const evaluation = JSON.parse(resultText.trim());
    return {
      score: typeof evaluation.score === 'number' ? evaluation.score : 70,
      feedback: evaluation.feedback || 'Evaluation completed successfully.',
      strengths: Array.isArray(evaluation.strengths) ? evaluation.strengths : [],
      improvements: Array.isArray(evaluation.improvements) ? evaluation.improvements : []
    };
  } catch (error: any) {
    logger.error('Gemini API evaluation failed:', error.message);
    return evaluateMockInterviewMock(question, answer);
  }
}

/**
 * Fallback local pattern matching evaluation
 */
function evaluateMockInterviewMock(question: string, answer: string): InterviewEvaluationResult {
  const wordCount = answer.split(/\s+/).filter(Boolean).length;
  const lowercaseAnswer = answer.toLowerCase();
  
  const keywords = ['challenge', 'solved', 'project', 'team', 'database', 'debug', 'code', 'result', 'improve', 'api'];
  const matchedKeywords = keywords.filter(k => lowercaseAnswer.includes(k));

  let score = 55;
  if (wordCount > 30) score += 15;
  if (wordCount > 60) score += 10;
  score += matchedKeywords.length * 3;
  score = Math.min(Math.max(score, 10), 95);

  const strengths: string[] = [];
  const improvements: string[] = [];
  let feedback = '';

  if (wordCount < 20) {
    feedback = 'Your response is too brief. Try to follow the STAR methodology (Situation, Task, Action, Result) to structure your answer.';
    improvements.push('Add specific details about the actions you took.');
    improvements.push('Detail the overall result or quantitative outcome.');
  } else {
    feedback = 'A solid attempt at describing your experience. Good use of tech vocabulary.';
    strengths.push('Clear articulation of context.');
    if (matchedKeywords.length > 2) {
      strengths.push('Good usage of project-relevant technical keywords.');
    } else {
      improvements.push('Incorporate more specific technical verbs and tool names.');
    }
    improvements.push('Include metrics or numbers (e.g. "reduced loading time by 30%") to highlight achievements.');
  }

  return {
    score,
    feedback,
    strengths,
    improvements,
  };
}
