/**
 * Domain mapping rules.
 * Maps domain patterns to canonical application names and vendors.
 */

export interface DomainRule {
  pattern: RegExp;
  appName: string;
  vendor: string;
}

export const DOMAIN_RULES: DomainRule[] = [
  { pattern: /\.google\.com$/, appName: "Google Workspace", vendor: "Google" },
  { pattern: /^kahoot\.it$/, appName: "Kahoot!", vendor: "Kahoot" },
  { pattern: /^quizlet\.com$/, appName: "Quizlet", vendor: "Quizlet Inc" },
  { pattern: /^canva\.com$/, appName: "Canva", vendor: "Canva Pty Ltd" },
  { pattern: /^clever\.com$/, appName: "Clever", vendor: "Clever Inc" },
  { pattern: /^zoom\.us$/, appName: "Zoom", vendor: "Zoom Video Communications" },
  { pattern: /^nearpod\.com$/, appName: "Nearpod", vendor: "Nearpod Inc" },
  { pattern: /^edpuzzle\.com$/, appName: "Edpuzzle", vendor: "Edpuzzle Inc" },
];
