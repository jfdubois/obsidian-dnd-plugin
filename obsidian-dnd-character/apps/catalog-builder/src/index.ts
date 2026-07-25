export {
  /* Types */
  type BuildMode,
  type BuilderConfig,
  /* Constants */
  BUILD_MODES,
  /* Guards */
  isBuildMode,
  isBuilderConfig,
  /* Factory */
  createBuilderConfig,
  /* Default */
  defaultBuilderConfig,
} from "./config";

export {
  /* Source manifest types */
  type SourceManifest,
  /* Source manifest error */
  SourceManifestError,
  /* Source manifest reader */
  readSourceManifest,
  /* Source manifest validator */
  isSourceManifest,
  /* Source manifest factory */
  createSourceManifest,
} from "./source-manifest";

export {
  /* Raw loader types */
  type RawLoaderDiagnostic,
  type RawLoadSummary,
  type RawLoadResult,
  type DiagnosticSeverity,
  /* Raw loader error */
  RawLoaderError,
  /* Raw loader */
  loadRawJsonFiles,
} from "./raw-loader";

export {
  /* Raw boundary types */
  type FieldClassificationKind,
  type FieldClassification,
  type UnclaimedFieldDiagnostic,
  type RawRecord,
  type ValidatedFileEnvelope,
  type RawBoundaryDiagnostic,
  type FieldInventory,
  type RawBoundaryResult,
  /* Known raw fields registry */
  KNOWN_RAW_FIELDS,
  /* Validation function */
  validateRawBoundary,
} from "./raw-boundary";

export {
  /* Reference types */
  type CanonicalReference,
  type StructuredReference,
  type SubclassFeatureReference,
  type ParsedReference,
  type ReferenceDiagnostic,
  type ReferenceDiagnosticCode,
  /* Reference error */
  ReferenceParserError,
  /* Parsing functions */
  parseCanonicalReference,
  parseSubclassFeatureRef,
  parseInlineReference,
  parseStructuredReference,
  parseReference,
  /* Factory */
  createCanonicalReference,
  /* Type guards */
  isCanonicalReference,
  isStructuredReference,
  isParsedReference,
  isSuccessParsedReference,
  isDiagnosticParsedReference,
  isCanonicalParsedReference,
  isSubclassFeatureParsedReference,
  isInlineParsedReference,
  isPipeDelimitedReference,
  isInlineReferenceString,
  /* Extractors */
  extractSourceAbbr,
  extractEntityName,
} from "./ref-parser";

export {
  /* Copy resolver types */
  type RawCopyValue,
  type CopyChainStep,
  type CopyResolutionResult,
  type CopyResolutionSuccess,
  type CopyResolutionFailure,
  type CopyResolverDiagnostic,
  type CopyDiagnosticCode,
  type CopyResolverContext,
  /* Copy resolver error */
  CopyResolverError,
  /* Copy resolver functions */
  resolveCopy,
  resolveCopyOrThrow,
  resolveCopies,
  collectCopyFailures,
  /* Copy resolver guards */
  isRawCopyValue,
  isCopyResolutionSuccess,
  isCopyResolutionFailure,
} from "./copy-resolver";

export {
  /* Resolved-record debug fixture types */
  type ResolvedRecordDebugIdentity,
  type ResolvedRecordDebugChainStep,
  type ResolvedRecordFieldInventory,
  type ResolvedRecordDebugFixture,
  type ResolvedRecordDebugDiagnostic,
  type ResolvedRecordDebugFixtureResult,
  type ResolvedRecordDebugFixtureOptions,
  /* Resolved-record debug fixture functions */
  collectResolvedFieldInventory,
  createResolvedRecordDebugFixture,
} from "./resolved-record-debug-fixtures";

export {
  /* Ingestion diagnostic report types */
  type EntityFieldInventoryReport,
  type IngestionDiagnosticReport,
  type IngestionDiagnosticReportInput,
  type IngestionParseFailure,
  type IngestionResolutionFailure,
  type StructuredValueKind,
  type UnclaimedCandidateMechanicalField,
  type UnclaimedFieldReport,
  /* Ingestion diagnostic report functions */
  createIngestionDiagnosticReport,
} from "./ingestion-diagnostic-report";

export {
  /* Version expansion types */
  type VersionExpansionDiagnosticCode,
  type VersionExpansionDiagnostic,
  type VersionExpansionResult,
  type VersionExpansionFilesResult,
  /* Version expansion functions */
  expandVersions,
  expandVersionsInFile,
} from "./versions-expander";

export {
  /* Ruleset classifier types */
  type RulesetClassificationMethod,
  type RulesetSourceClassification,
  type RulesetClassificationDiagnosticCode,
  type RulesetClassificationDiagnostic,
  type RulesetRecordClassification,
  type RulesetClassificationResult,
  type RulesetRecordInput,
  type RulesetClassifierOptions,
  type RulesetClassificationBatchResult,
  /* Ruleset classifier registry */
  RULESET_SOURCE_CLASSIFICATIONS,
  /* Ruleset classifier functions */
  classifyRecordRuleset,
  classifyResolvedRecordRulesets,
} from "./ruleset-classifier";

export {
  /* Mod types */
  type ModOperationPayload,
  type ModAppendArr,
  type ModAppendIfNotExistsArr,
  type ModInsertArr,
  type ModPrependArr,
  type ModRemoveArr,
  type ModRenameArr,
  type ModReplaceArr,
  type ModRenameEntry,
  type ModOperationDiagnostic,
  type ModDiagnosticCode,
  type ModApplyResult,
  type RawModBlock,
  /* Mod mode registry */
  KNOWN_MOD_MODES_SET,
} from "./mod-types";

export {
  /* Array mod operations */
  applyArrayModOperation,
  execAppendArr,
  execAppendIfNotExistsArr,
  execInsertArr,
  execPrependArr,
  execRemoveArr,
  execRenameArr,
  execReplaceArr,
} from "./mod-array-operations";
