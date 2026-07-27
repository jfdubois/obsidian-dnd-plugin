import type {
  CopyChainStep,
  CopyResolverContext,
  StructuredIdentity,
} from "./copy-resolver";
import {
  applyDirectFieldOverlay,
  cloneObject,
  cloneRecord,
  cloneUnknown,
  deepFreeze,
  isPlainObject,
  stripCopyDirectives,
} from "./copy-materialization-merge";
import { applyModBlock } from "./copy-materialization-mods";
import {
  convertModDiagnostic,
  convertPreserveDiagnostic,
} from "./copy-materialization-diagnostics";
import { validatePreservePayload } from "./copy-preserve-policy";
import {
  validateTemplateReferences,
} from "./copy-template-diagnostics";
import {
  buildCopyTemplateRegistry,
  resolveCopyTemplate,
  type CopyTemplateRecord,
} from "./copy-template-registry";
import type {
  AppliedCopyTemplateMetadata,
  CopyModRawRecord,
  MaterializationDiagnostic,
} from "./mod-types";

export interface CopyLevelMaterializationContext {
  readonly resolverContext: CopyResolverContext;
  readonly sourcePath: string;
  readonly sourceEntityKind: string;
  readonly requestedIdentity?: StructuredIdentity;
  readonly inheritanceChain?: readonly CopyChainStep[];
}

export type CopyLevelMaterializationResult =
  | {
      readonly ok: true;
      readonly record: CopyModRawRecord;
      readonly appliedTemplates: readonly AppliedCopyTemplateMetadata[];
    }
  | {
      readonly ok: false;
      readonly diagnostics: readonly MaterializationDiagnostic[];
    };

function operations(value: unknown): readonly unknown[] {
  return Array.isArray(value) ? value : [value];
}

function combineModBlocks(recordMod: unknown, templates: readonly CopyTemplateRecord[]): unknown {
  let combined = isPlainObject(recordMod) ? cloneObject(recordMod) : recordMod;
  for (const template of templates) {
    const templateMod = template.apply._mod;
    if (!isPlainObject(templateMod)) continue;
    if (combined === undefined) {
      combined = cloneObject(templateMod);
      continue;
    }
    if (!isPlainObject(combined)) continue;
    for (const [field, rawOps] of Object.entries(templateMod)) {
      const clonedOps = operations(rawOps).map((operation) => cloneUnknown(operation));
      if (combined[field] === undefined) {
        combined[field] = Array.isArray(rawOps) ? clonedOps : clonedOps[0];
      } else {
        combined[field] = [
          ...operations(combined[field]).map((operation) => cloneUnknown(operation)),
          ...clonedOps,
        ];
      }
    }
  }
  return combined;
}

function applyTemplateRoots(
  remaining: Record<string, unknown>,
  directRootFields: ReadonlySet<string>,
  templates: readonly CopyTemplateRecord[],
): void {
  for (const template of templates) {
    const root = template.apply._root;
    if (root === undefined) continue;
    for (const [key, value] of Object.entries(root)) {
      if (!directRootFields.has(key)) {
        remaining[key] = cloneUnknown(value);
      }
    }
  }
}

export function materializeCopyLevel(
  base: CopyModRawRecord,
  derived: CopyModRawRecord,
  context: CopyLevelMaterializationContext,
): CopyLevelMaterializationResult {
  const copyValue = derived.remaining._copy;
  const templates: CopyTemplateRecord[] = [];
  const appliedTemplates: AppliedCopyTemplateMetadata[] = [];

  if (isPlainObject(copyValue) && copyValue._templates !== undefined) {
    const references = validateTemplateReferences(
      copyValue._templates,
      derived,
      context.sourcePath,
      context.sourceEntityKind,
    );
    if (!references.ok) {
      return { ok: false, diagnostics: [references.diagnostic] };
    }
    const registry = buildCopyTemplateRegistry(context.resolverContext.validatedFiles);
    for (let i = 0; i < references.references.length; i += 1) {
      const resolvedTemplate = resolveCopyTemplate(
        registry,
        context.sourceEntityKind,
        references.references[i]!,
        i,
        derived,
        context.sourcePath,
      );
      if (!resolvedTemplate.ok) {
        return {
          ok: false,
          diagnostics: [
            Object.freeze({
              ...resolvedTemplate.diagnostic,
              requestedIdentity: context.requestedIdentity,
              inheritanceChain: context.inheritanceChain,
            }),
          ],
        };
      }
      templates.push(resolvedTemplate.template);
      appliedTemplates.push(deepFreeze(cloneUnknown(resolvedTemplate.template.metadata) as AppliedCopyTemplateMetadata));
    }
  }

  const preserveRaw = isPlainObject(copyValue) ? copyValue._preserve : undefined;
  let preservePayload = {};
  if (preserveRaw !== undefined) {
    const validation = validatePreservePayload(preserveRaw, context.sourceEntityKind);
    if (!validation.valid) {
      return {
        ok: false,
        diagnostics: Object.freeze(
          validation.diagnostics.map((d) =>
            convertPreserveDiagnostic(
              d,
              derived,
              context.sourcePath,
              context.sourceEntityKind,
              {
                requestedIdentity: context.requestedIdentity,
                inheritanceChain: context.inheritanceChain,
              },
            ),
          ),
        ),
      };
    }
    preservePayload = validation.payload;
  }

  const current = cloneRecord(base);
  const directRootFields = new Set(Object.keys(derived.remaining));
  const combinedMod = isPlainObject(copyValue)
    ? combineModBlocks(copyValue._mod, templates)
    : undefined;

  applyDirectFieldOverlay(
    current.remaining,
    derived.remaining,
    preservePayload,
    context.sourceEntityKind,
  );
  applyTemplateRoots(current.remaining, directRootFields, templates);

  if (combinedMod !== undefined) {
    const diagnostics = convertModDiagnostic(
      applyModBlock(current.remaining, derived, combinedMod, context.sourcePath),
      {
        sourceEntityKind: context.sourceEntityKind,
        requestedIdentity: context.requestedIdentity,
        inheritanceChain: context.inheritanceChain,
      },
    );
    if (diagnostics.length > 0) {
      return { ok: false, diagnostics };
    }
  }

  return {
    ok: true,
    record: { name: derived.name, source: derived.source, remaining: stripCopyDirectives(current.remaining) },
    appliedTemplates: deepFreeze(appliedTemplates),
  };
}
