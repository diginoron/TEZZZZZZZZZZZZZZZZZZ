
export enum AcademicLevel {
  Masters = 'کارشناسی ارشد',
  PhD = 'دکتری',
}

export interface GenerateTopicRequest {
  keywords: string;
  fieldOfStudy: string;
  academicLevel: AcademicLevel;
}

export interface GenerateTopicResponseChunk {
  text: string;
  done: boolean;
}
    