import { cloneUnknown } from "./copy-materialization-merge";
import type { VersionExpansionDiagnostic, VersionExpansionDiagnosticCode } from "./version-diagnostics";

type VariableValue = string | readonly string[];

export interface VersionAbstractExpansionContext {
  readonly sourcePath: string;
  readonly entityKind: string;
  readonly recordName: string;
  readonly recordSource: string;
  readonly versionIndex: number;
}

export interface VersionAbstractExpansionResult {
  readonly ok: boolean;
  readonly versions: readonly unknown[];
  readonly diagnostics: readonly VersionExpansionDiagnostic[];
}

function isStrictPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function diagnostic(
  code: VersionExpansionDiagnosticCode,
  context: VersionAbstractExpansionContext,
  message: string,
  rawPayload: unknown,
  invalidField: string,
  validationReason: string,
  implementationIndex?: number,
): VersionExpansionDiagnostic {
  return Object.freeze({
    code,
    severity: "error",
    message,
    sourcePath: context.sourcePath,
    entityKind: context.entityKind,
    recordName: context.recordName,
    recordSource: context.recordSource,
    versionIndex: context.versionIndex,
    implementationIndex,
    invalidField,
    validationReason,
    rawPayload,
  });
}

function failure(diagnosticValue: VersionExpansionDiagnostic): VersionAbstractExpansionResult {
  return { ok: false, versions: [], diagnostics: [diagnosticValue] };
}

function validatePlainTree(
  value: unknown,
  path: string,
): { readonly ok: true } | { readonly ok: false; readonly path: string; readonly rawPayload: unknown } {
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i += 1) {
      const result = validatePlainTree(value[i], `${path}.${i}`);
      if (!result.ok) return result;
    }
    return { ok: true };
  }
  if (typeof value !== "object" || value === null) return { ok: true };
  if (!isStrictPlainObject(value)) {
    return { ok: false, path, rawPayload: value };
  }
  for (const [key, child] of Object.entries(value)) {
    const result = validatePlainTree(child, `${path}.${key}`);
    if (!result.ok) return result;
  }
  return { ok: true };
}

function validateVariables(
  rawVariables: unknown,
  context: VersionAbstractExpansionContext,
  implementationIndex: number,
): { readonly ok: true; readonly variables: ReadonlyMap<string, VariableValue> } | {
  readonly ok: false;
  readonly diagnostic: VersionExpansionDiagnostic;
} {
  if (rawVariables === undefined) {
    return { ok: true, variables: new Map() };
  }

  if (!isStrictPlainObject(rawVariables)) {
    return {
      ok: false,
      diagnostic: diagnostic(
        "INVALID_VERSION_VARIABLES",
        context,
        `_versions[${context.versionIndex}]._implementations[${implementationIndex}]._variables must be a plain object`,
        rawVariables,
        "_variables",
        "NOT_PLAIN_OBJECT",
        implementationIndex,
      ),
    };
  }

  const variables = new Map<string, VariableValue>();
  for (const [key, value] of Object.entries(rawVariables)) {
    const isValidArray = Array.isArray(value) && value.every((item) => typeof item === "string");
    if (typeof value !== "string" && !isValidArray) {
      return {
        ok: false,
        diagnostic: diagnostic(
          "INVALID_VERSION_VARIABLES",
          context,
          `_versions[${context.versionIndex}]._implementations[${implementationIndex}]._variables.${key} must be a string or string array`,
          value,
          `_variables.${key}`,
          "INVALID_VARIABLE_VALUE",
          implementationIndex,
        ),
      };
    }
    variables.set(key, value);
  }

  return { ok: true, variables };
}

function substituteString(
  value: string,
  variables: ReadonlyMap<string, VariableValue>,
  path: string,
): { readonly ok: true; readonly value: string } | {
  readonly ok: false;
  readonly variableName: string;
  readonly path: string;
} {
  let unresolved: string | undefined;
  const replaced = value.replace(/{{([^}]+)}}/g, (match, variableName: string) => {
    const replacement = variables.get(variableName);
    if (replacement === undefined) {
      unresolved = variableName;
      return match;
    }
    return String(replacement);
  });
  if (unresolved !== undefined) {
    return { ok: false, variableName: unresolved, path };
  }
  return { ok: true, value: replaced };
}

function substituteVariables(
  value: unknown,
  variables: ReadonlyMap<string, VariableValue>,
  path = "",
): { readonly ok: true; readonly value: unknown } | {
  readonly ok: false;
  readonly variableName: string;
  readonly path: string;
} {
  if (typeof value === "string") {
    return substituteString(value, variables, path);
  }
  if (Array.isArray(value)) {
    const result: unknown[] = [];
    for (let i = 0; i < value.length; i += 1) {
      const substituted = substituteVariables(value[i], variables, `${path}.${i}`);
      if (!substituted.ok) return substituted;
      result.push(substituted.value);
    }
    return { ok: true, value: result };
  }
  if (isStrictPlainObject(value)) {
    const result: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) {
      const substituted = substituteVariables(child, variables, path ? `${path}.${key}` : key);
      if (!substituted.ok) return substituted;
      result[key] = substituted.value;
    }
    return { ok: true, value: result };
  }
  return { ok: true, value };
}

function invalidPlainTreeDiagnostic(
  context: VersionAbstractExpansionContext,
  implementationIndex: number | undefined,
  invalidField: string,
  rawPayload: unknown,
): VersionExpansionDiagnostic {
  return diagnostic(
    implementationIndex === undefined ? "INVALID_VERSION_ABSTRACT" : "INVALID_VERSION_IMPLEMENTATION",
    context,
    `_versions[${context.versionIndex}] contains a non-plain object at ${invalidField}`,
    rawPayload,
    invalidField,
    "NON_PLAIN_OBJECT",
    implementationIndex,
  );
}

export function expandAbstractVersionEntry(
  rawVersion: unknown,
  context: VersionAbstractExpansionContext,
): VersionAbstractExpansionResult {
  if (!isStrictPlainObject(rawVersion) || (rawVersion._abstract === undefined && rawVersion._implementations === undefined)) {
    return { ok: true, versions: [cloneUnknown(rawVersion)], diagnostics: [] };
  }

  if (!isStrictPlainObject(rawVersion._abstract)) {
    return failure(diagnostic(
      "INVALID_VERSION_ABSTRACT",
      context,
      `_versions[${context.versionIndex}]._abstract must be a plain object`,
      rawVersion._abstract,
      "_abstract",
      "NOT_PLAIN_OBJECT",
    ));
  }

  if (!Array.isArray(rawVersion._implementations) || rawVersion._implementations.length === 0) {
    return failure(diagnostic(
      "INVALID_VERSION_IMPLEMENTATIONS",
      context,
      `_versions[${context.versionIndex}]._implementations must be a non-empty array`,
      rawVersion._implementations,
      "_implementations",
      "NOT_NON_EMPTY_ARRAY",
    ));
  }

  const abstractTree = validatePlainTree(rawVersion._abstract, "_abstract");
  if (!abstractTree.ok) {
    return failure(invalidPlainTreeDiagnostic(context, undefined, abstractTree.path, abstractTree.rawPayload));
  }

  const concreteVersions: unknown[] = [];
  const diagnostics: VersionExpansionDiagnostic[] = [];

  rawVersion._implementations.forEach((implementation, implementationIndex) => {
    if (!isStrictPlainObject(implementation)) {
      diagnostics.push(diagnostic(
        "INVALID_VERSION_IMPLEMENTATION",
        context,
        `_versions[${context.versionIndex}]._implementations[${implementationIndex}] must be a plain object`,
        implementation,
        "_implementations",
        "NOT_PLAIN_OBJECT",
        implementationIndex,
      ));
      return;
    }

    const implementationTree = validatePlainTree(implementation, `_implementations.${implementationIndex}`);
    if (!implementationTree.ok) {
      diagnostics.push(invalidPlainTreeDiagnostic(
        context,
        implementationIndex,
        implementationTree.path,
        implementationTree.rawPayload,
      ));
      return;
    }

    const variables = validateVariables(implementation._variables, context, implementationIndex);
    if (!variables.ok) {
      diagnostics.push(variables.diagnostic);
      return;
    }

    const abstractClone = cloneUnknown(rawVersion._abstract);
    const implementationClone = cloneUnknown(implementation) as Record<string, unknown>;
    const substituted = substituteVariables(abstractClone, variables.variables);
    if (!substituted.ok) {
      diagnostics.push(diagnostic(
        "UNRESOLVED_VERSION_VARIABLE",
        context,
        `_versions[${context.versionIndex}] unresolved variable "${substituted.variableName}"`,
        rawVersion._abstract,
        substituted.path,
        `UNRESOLVED_VARIABLE:${substituted.variableName}`,
        implementationIndex,
      ));
      return;
    }

    delete implementationClone._variables;
    concreteVersions.push({ ...(substituted.value as Record<string, unknown>), ...implementationClone });
  });

  return {
    ok: diagnostics.length === 0,
    versions: concreteVersions,
    diagnostics,
  };
}
