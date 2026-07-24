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
