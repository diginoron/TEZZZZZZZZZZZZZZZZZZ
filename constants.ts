
import { AcademicLevel } from './types';

export const GEMINI_MODEL_PRO = 'gemini-2.5-pro';

export const MASTER_PROMPT_INSTRUCTION = `موضوعات پژوهشی را پیشنهاد دهید که رابطه ای و چند متغیره باشند.`;
export const PHD_PROMPT_INSTRUCTION = `موضوعات پژوهشی را در سطح مدل سازی و دکتری پیشنهاد دهید.`;

export const getPromptForAcademicLevel = (
  academicLevel: AcademicLevel,
  fieldOfStudy: string,
  keywords: string,
): string => {
  const basePrompt = `من به دنبال موضوعات پژوهشی در رشته تحصیلی "${fieldOfStudy}" هستم.
  کلمات کلیدی مورد علاقه من عبارتند از: "${keywords}".
  لطفاً حداقل 3 تا 5 موضوع را ارائه دهید و توضیحات مختصری برای هر یک ارائه دهید.`;

  if (academicLevel === AcademicLevel.Masters) {
    return `${basePrompt}\n${MASTER_PROMPT_INSTRUCTION}`;
  } else {
    return `${basePrompt}\n${PHD_PROMPT_INSTRUCTION}`;
  }
};
    