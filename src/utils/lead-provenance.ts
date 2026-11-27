export interface PropertyWithMeta {
  name: string;
  meta?: { lastEditedBy?: { actorType: string } };
}

export interface TemplateTitle {
  code?: string;
  propertyName?: string;
  title?: string;
}

/**
 * Titles of the forms a partner changed on the customer's behalf, in program order. A form counts when its last
 * change came from the partner. Forms the customer changed themselves are not listed.
 */
export function agentEditedForms(properties: PropertyWithMeta[], templates: TemplateTitle[]): string[] {
  const titles: string[] = [];
  for (const template of templates) {
    const name = template.propertyName ?? template.code;
    const property = properties.find((candidate) => candidate.name === name);
    if (property?.meta?.lastEditedBy?.actorType === "PARTNER" && template.title) {
      titles.push(template.title);
    }
  }
  return titles;
}
