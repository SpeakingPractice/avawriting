export interface CriterionDetail {
  band: number;
  name: string;
  feedback: string;
  example: string;
}

export interface StrengthDetail {
  title: string;
  explanation: string;
  example: string;
}

export interface ImprovementDetail {
  title: string;
  explanation: string;
  impact: string;
}

export interface UpgradeDetail {
  before: string;
  after: string;
  explanation: string;
}

export interface GradingReport {
  wordCount: number;
  wordCountRequirement: 'meets' | 'under';
  overallBand: number;
  criteria: {
    taOrTr: CriterionDetail;
    cc: CriterionDetail;
    lr: CriterionDetail;
    gra: CriterionDetail;
  };
  strengths: StrengthDetail[];
  improvements: ImprovementDetail[];
  upgrades?: UpgradeDetail[];
  nextBandSteps: string[];
  fullUpgradeEssay: string;
  vietnameseGreeting?: string;
}

export interface EssayHistoryItem {
  id: string;
  date: string;
  essay: string;
  taskType: 'task1' | 'task2';
  prompt: string;
  report: GradingReport;
}
