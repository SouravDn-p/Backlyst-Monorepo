const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'validation.engine.ts');
let code = fs.readFileSync(filePath, 'utf8');

code = code.replace(
  "import { PrismaService } from 'src/prisma/prisma.service';",
  "import { PrismaService } from 'src/prisma/prisma.service';\nimport { Prisma, PrismaClient } from '@prisma/client';\n\ntype TxClient = PrismaClient | Prisma.TransactionClient;"
);

// 1. Update getBlockedDirection
code = code.replace(
  /async getBlockedDirection\([\s\S]*?reciprocalDays: number,\s*\): Promise<'REPEAT' \| 'RECIPROCAL' \| null> \{/,
  "async getBlockedDirection(\n    sourceDomain: string,\n    targetDomain: string,\n    repeatDays: number,\n    reciprocalDays: number,\n    tx?: TxClient\n  ): Promise<'REPEAT' | 'RECIPROCAL' | null> {\n    const client = tx ?? this.prisma;"
);
code = code.replace(
  "const pairStat = await this.prisma.domainPairStat.findUnique({",
  "const pairStat = await client.domainPairStat.findUnique({"
);

// 2. Update validateTransition
code = code.replace(
  /async validateTransition\(input: \{[\s\S]*?\}\): Promise<ValidationResult> \{/,
  function(match) {
    return match.replace('}): Promise<ValidationResult> {', '}, tx?: TxClient): Promise<ValidationResult> {\n    const client = tx ?? this.prisma;');
  }
);

// Replace this.prisma inside validateTransition
// Need to do this only in the scope of validateTransition.
// We'll just replace `this.prisma.` with `client.` everywhere after `async validateTransition` except inside logValidation
let p1 = code.indexOf('async validateTransition(');
let p2 = code.indexOf('private isDirectionAllowed(');

let before = code.slice(0, p1);
let vtBody = code.slice(p1, p2);
let after = code.slice(p2);

vtBody = vtBody.replace(/this\.prisma\./g, 'client.');
vtBody = vtBody.replace(/this\.getBlockedDirection\(([^,]+),\s*([^,]+),\s*([^,]+),\s*([^,]+?)\)/g, 'this.getBlockedDirection($1, $2, $3, $4, tx)');
vtBody = vtBody.replace(/this\.tierEngine\.countDomainWeeklyInteractions\(([^)]+)\)/g, 'this.tierEngine.countDomainWeeklyInteractions($1, tx)');
vtBody = vtBody.replace(/this\.tierEngine\.resolveTierLimits\(([^,]+),\s*([^)]+)\)/g, 'this.tierEngine.resolveTierLimits($1, $2, tx)');
vtBody = vtBody.replace(/this\.distributionEngine\.isNetworkConcentrationAllowed\(([^,]+),\s*([^,]+),\s*([^)]+)\)/g, 'this.distributionEngine.isNetworkConcentrationAllowed($1, $2, $3, tx)');
vtBody = vtBody.replace(/this\.distributionEngine\.getNicheConcentrationLevel\(([^,]+),\s*([^)]+)\)/g, "this.distributionEngine.getNicheConcentrationLevel($1, $2, tx)");
vtBody = vtBody.replace(/this\.logValidation\(input, result\)/g, 'this.logValidation(input, result, tx)');

code = before + vtBody + after;

// 3. Update logValidation
code = code.replace(
  /private async logValidation\([\s\S]*?result: ValidationResult,\s*\) \{/,
  "private async logValidation(\n    input: {\n      actorUserId: string;\n      providerWebsiteId?: string;\n      requesterWebsiteId?: string;\n      taskId?: string;\n      stage: ValidationStage;\n    },\n    result: ValidationResult,\n    tx?: TxClient\n  ) {\n    const client = tx ?? this.prisma;"
);
code = code.replace(
  "await this.prisma.marketplaceValidationLog",
  "await client.marketplaceValidationLog"
);

fs.writeFileSync(filePath, code);
console.log('Done refactoring validation.engine.ts (version 2)');
