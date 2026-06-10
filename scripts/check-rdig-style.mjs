import { readFile } from 'node:fs/promises';
import { relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const files = [
  'src/app/conference_form/pages/conference-application/conference-application.ts',
  'src/app/journal_publication_form/journal-publication-form.component.html',
  'src/app/journal_publication_form/journal-publication-form.component.scss',
  'src/app/RA-GRA_form/RA-GRA_form.component.html',
  'src/app/RA-GRA_form/RA-GRA_form.component.scss',
  'src/app/partnership_form/partnership_form.component.html',
  'src/app/travel_authorization_form/pages/travel-authorization-application/travel-authorization-application.component.html',
  'src/app/travel_authorization_form/pages/travel-authorization-application/travel-authorization-application.component.scss',
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

if (failures.length) {
  console.error('Application form style standard violations:\n' + failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Application form style standard check passed.');
}
