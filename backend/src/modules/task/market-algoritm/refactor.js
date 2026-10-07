const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'validation.engine.ts');
let code = fs.readFileSync(filePath, 'utf8');

// Add TxClient import
code = code.replace(
  "import { PrismaService } from 'src/prisma/prisma.service';",
  "import { PrismaService } from 'src/prisma/prisma.service';\nimport { Prisma, PrismaClient } from '@prisma/client';\n\ntype TxClient = PrismaClient | Prisma.TransactionClient;"
);

// We need to add `tx?: TxClient` to:
// - isMarketplaceWebsiteEligible
// - isWebsiteEligible
// - ensureProfile
// - isWebsiteRowMarketplaceEligible
// - getBlockedDirection
// - validateTransition
// - logValidation

const methodsToUpdate = [
  { name: 'isMarketplaceWebsiteEligible', regex: /async isMarketplaceWebsiteEligible\(websiteId: string\): Promise<boolean> {/, replace: 'async isMarketplaceWebsiteEligible(websiteId: string, tx?: TxClient): Promise<boolean> {' },
  { name: 'isWebsiteEligible', regex: /async isWebsiteEligible\(websiteId: string, userId: string\): Promise<boolean> {/, replace: 'async isWebsiteEligible(websiteId: string, userId: string, tx?: TxClient): Promise<boolean> {' },
  { name: 'ensureProfile', regex: /private async ensureProfile\(website: any\): Promise<boolean> {/, replace: 'private async ensureProfile(website: any, tx?: TxClient): Promise<boolean> {' },
  { name: 'isWebsiteRowMarketplaceEligible', regex: /private async isWebsiteRowMarketplaceEligible\(website: any\): Promise<boolean> {/, replace: 'private async isWebsiteRowMarketplaceEligible(website: any, tx?: TxClient): Promise<boolean> {' },
  { name: 'getBlockedDirection', regex: /async getBlockedDirection\([\s\S]*?reciprocalDays: number,\s*\): Promise<'REPEAT' \| 'RECIPROCAL' \| null> {/, replace: "async getBlockedDirection(\n    sourceDomain: string,\n    targetDomain: string,\n    repeatDays: number,\n    reciprocalDays: number,\n    tx?: TxClient\n  ): Promise<'REPEAT' | 'RECIPROCAL' | null> {" },
  { name: 'logValidation', regex: /private async logValidation\([\s\S]*?result: ValidationResult,\s*\) {/, replace: "private async logValidation(\n    input: {\n      actorUserId: string;\n      providerWebsiteId?: string;\n      requesterWebsiteId?: string;\n      taskId?: string;\n      stage: ValidationStage;\n    },\n    result: ValidationResult,\n    tx?: TxClient\n  ) {" }
];

methodsToUpdate.forEach(m => {
  code = code.replace(m.regex, m.replace);
});

// For validateTransition, we need to add tx
code = code.replace(
  /async validateTransition\(input: \{[\s\S]*?\}\): Promise<ValidationResult> \{/,
  function(match) {
    return match.replace('}): Promise<ValidationResult> {', '}, tx?: TxClient): Promise<ValidationResult> {');
  }
);

// Now we need to inject `const client = tx ?? this.prisma;` into these methods,
// and replace `this.prisma.` with `client.`.
// And we need to pass `tx` down.

const methodsBodyRegex = {
  isMarketplaceWebsiteEligible: /async isMarketplaceWebsiteEligible[\s\S]*?isWebsiteRowMarketplaceEligible\(website\);\n  \}/,
  isWebsiteEligible: /async isWebsiteEligible[\s\S]*?isMarketplaceWebsiteEligible\(websiteId\);\n  \}/,
  ensureProfile: /private async ensureProfile[\s\S]*?return true;\n  \}/,
  isWebsiteRowMarketplaceEligible: /private async isWebsiteRowMarketplaceEligible[\s\S]*?return true;\n  \}/,
  getBlockedDirection: /async getBlockedDirection[\s\S]*?return null;\n  \}/,
  validateTransition: /async validateTransition[\s\S]*?return result;\n  \}/,
  logValidation: /private async logValidation[\s\S]*?\}\);\n  \}/
};

for (const [name, regex] of Object.entries(methodsBodyRegex)) {
  code = code.replace(regex, (match) => {
    let newBody = match;
    
    // insert client definition
    if (newBody.indexOf('const client = tx ?? this.prisma;') === -1) {
      newBody = newBody.replace(/\{/, '{\n    const client = tx ?? this.prisma;');
    }
    
    // replace this.prisma with client
    newBody = newBody.replace(/this\.prisma\./g, 'client.');
    
    // pass down tx
    newBody = newBody.replace(/this\.isWebsiteEligible\(([^)]+)\)/g, 'this.isWebsiteEligible($1, tx)');
    newBody = newBody.replace(/this\.isMarketplaceWebsiteEligible\(([^)]+)\)/g, 'this.isMarketplaceWebsiteEligible($1, tx)');
    newBody = newBody.replace(/this\.isWebsiteRowMarketplaceEligible\(([^)]+)\)/g, 'this.isWebsiteRowMarketplaceEligible($1, tx)');
    newBody = newBody.replace(/this\.ensureProfile\(([^)]+)\)/g, 'this.ensureProfile($1, tx)');
    newBody = newBody.replace(/this\.getBlockedDirection\(([\s\S]*?)\)/g, 'this.getBlockedDirection($1, tx)');
    newBody = newBody.replace(/this\.logValidation\(([^)]+),([^)]+)\)/g, 'this.logValidation($1, $2, tx)');
    
    // pass tx to other engines
    newBody = newBody.replace(/this\.tierEngine\.countDomainWeeklyInteractions\(([^)]+)\)/g, 'this.tierEngine.countDomainWeeklyInteractions($1, tx)');
    newBody = newBody.replace(/this\.tierEngine\.resolveTierLimits\(([^)]+),([^)]+)\)/g, 'this.tierEngine.resolveTierLimits($1, $2, tx)');
    newBody = newBody.replace(/this\.distributionEngine\.isNetworkConcentrationAllowed\(([^)]+),([^)]+),([^)]+)\)/g, 'this.distributionEngine.isNetworkConcentrationAllowed($1, $2, $3, tx)');
    newBody = newBody.replace(/this\.distributionEngine\.getNicheConcentrationLevel\(([^)]+),([^)]+)\)/g, "this.distributionEngine.getNicheConcentrationLevel($1, $2, tx)");
    
    return newBody;
  });
}

// Fix logValidation argument parsing in regex
code = code.replace(/this\.logValidation\(input, result\)/g, 'this.logValidation(input, result, tx)');

fs.writeFileSync(filePath, code);
console.log('Done refactoring validation.engine.ts');
