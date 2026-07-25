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
  /* Mod operation types */
  type AppendArrMod,
  type PrependArrMod,
  type AppendIfNotExistsArrMod,
  type InsertArrMod,
  type RemoveArrMod,
  type RenameArrMod,
  type ReplaceArrMod,
  type ReplaceTxtMod,
  type AddSpellsMod,
  type RemoveSpellsMod,
  type ReplaceSpellsMod,
  type AddSensesMod,
  type AddSkillsMod,
  type ScalarAddDcMod,
  type ScalarAddHitMod,
  type ScalarAddPropMod,
  type ScalarMultPropMod,
  type ScalarMultXpMod,
  type MaxSizeMod,
  type SetPropMod,
  type PrefixSuffixStringPropMod,
  type KnownModOperation,
  type RawModOperation,
  type RawModBlock,
  type ParsedModBlock,
  type ParsedModOperation,
  type UnknownModDiagnostic,
  /* Known mod modes registry */
  KNOWN_MOD_OPERATION_MODES,
  /* Parsing functions */
  parseModOperation,
  parseModBlock,
  /* Type guards */
  isKnownModMode,
  isKnownModOperation,
  isUnknownModDiagnostic,
  isRawModBlock,
} from "./mod-parser";
