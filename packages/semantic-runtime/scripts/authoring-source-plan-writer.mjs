import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

export async function writeAuthoringSourcePlan(sourcePlan, summary) {
  if (sourcePlan == null || !sourcePlan.hasCompleteFileText) {
    throw new Error(`${summary} source plan must contain complete source text.`);
  }
  for (const file of sourcePlan.projectTooling?.files ?? []) {
    const absolutePath = path.resolve(sourcePlan.rootDir, file.path);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, file.text, 'utf8');
  }
  for (const file of sourcePlan.files) {
    if (file.text == null) {
      throw new Error(`Source plan file ${file.path} has no text.`);
    }
    const absolutePath = path.resolve(sourcePlan.rootDir, file.path);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, file.text.text, 'utf8');
  }
}
