import { readFile } from 'node:fs/promises';
import { relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const files = [
  'src/app/features/conference/pages/conference-application/conference-application.ts',
  'src/app/features/journal-publication/journal-publication-form.component.html',
  'src/app/features/journal-publication/journal-publication-form.component.scss',
  'src/app/features/ra-gra/RA-GRA_form.component.html',
  'src/app/features/ra-gra/RA-GRA_form.component.scss',
  'src/app/features/partnership/partnership_form.component.html',
  'src/app/features/travel-authorization/pages/travel-authorization-application/travel-authorization-application.component.html',
  'src/app/features/travel-authorization/pages/travel-authorization-application/travel-authorization-application.component.scss',
  'src/app/shared/components/form-main-title/form-main-title.component.scss',
  'src/app/shared/components/step-indicator/step-indicator.component.scss',
  'src/app/shared/components/form-wizard-nav/form-wizard-nav.component.scss',
];
const rules = [
  { name: 'inline style', pattern: /\sstyle\s*=/i },
  { name: 'raw hex color', pattern: /#[0-9a-f]{3,8}\b/i },
  { name: 'raw rgb color', pattern: /\brgba?\s*\(/i },
  { name: '!important', pattern: /!important\b/i },
];

const conferenceTemplates = [
  'src/app/features/conference/components/forms/conference-details-form/conference-details-form.component.html',
  'src/app/features/conference/components/forms/author-details-form/author-details-form.component.html',
  'src/app/features/conference/components/forms/supporting-documents-form/supporting-documents-form.component.html',
  'src/app/features/conference/components/forms/declaration-form/declaration-form.component.html',
];

const failures = [];
for (const relativePath of files) {
  const file = fileURLToPath(new URL(`../${relativePath}`, import.meta.url));
  const text = await readFile(file, 'utf8');
  const lines = text.split(/\r?\n/);

  lines.forEach((line, index) => {
    rules.forEach(rule => {
      if (rule.pattern.test(line)) {
        failures.push(`${relative(projectRoot, file)}:${index + 1} ${rule.name}`);
      }
    });
  });
}

for (const relativePath of conferenceTemplates) {
  const file = fileURLToPath(new URL(`../${relativePath}`, import.meta.url));
  const text = await readFile(file, 'utf8');
  const tagPattern = /<\/?(?:section|div)\b[^>]*>/gi;
  const stack = [];

  for (const match of text.matchAll(tagPattern)) {
    const tag = match[0];
    const isClosing = tag.startsWith('</');
    if (isClosing) {
      stack.pop();
      continue;
    }

    const isCard = /\bclass\s*=\s*"[^"]*\bcard\b[^"]*"/i.test(tag);
    if (isCard && stack.some(entry => entry.isCard)) {
      failures.push(`${relativePath} nested card`);
    }
    stack.push({ isCard });
  }
}

if (failures.length) {
  console.error('Application form style standard violations:\n' + failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Application form style standard check passed.');
}
