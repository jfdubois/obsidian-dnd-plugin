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

export { type SourceFileRole, type SourceFileRoleMetadata, classifySourceFileRole, isCanonicalCopyCandidateSource } from "./source-file-role";

export {
  /* Raw boundary types */
  type FieldClassificationKind,
  type FieldClassification,
  type UnclaimedFieldDiagnostic,
  type RawRecord,
  type ValidatedCollection,
  type ValidatedFileEnvelope,
  type RawBoundaryDiagnostic,
  type SourceFileRoleInventory,
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
  type AmbiguityCandidate,
  type IneligibleCopyCandidate,
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
  /* Record access classifier types */
  type ContentAccess,
  type RecordAccessClassificationMethod,
  type CoreAccessMarkerField,
  type CoreAccessMarker,
  type RecordAccessClassification,
  type RecordAccessBatchResult,
  /* Record access classifier functions */
  classifyRecordAccess,
  classifyResolvedRecordAccess,
} from "./record-access-classifier";

export {
  /* Source metadata normalizer types */
  type SourceMetadataNormalizerDiagnosticCode,
  type SourceMetadataProvenance,
  type NormalizedSourceMetadata,
  type SourceMetadataNormalizerDiagnostic,
  type SourceMetadataInput,
  type SourceMetadataNormalizerResult,
  /* Source metadata normalizer functions */
  normalizeSourceMetadata,
} from "./source-metadata-normalizer";

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
  type MaterializationDiagnostic,
  type MaterializationDiagnosticCode,
  type MaterializedResolvedRecord,
  type CopyModRawRecord,
  /* Mod mode registry */
  KNOWN_MOD_MODES_SET,
} from "./mod-types";

export {
  /* Mod copy resolver types */
  type CopyModContext,
  type CopyModResolutionResult,
  /* Mod copy resolver functions */
  resolveCopyWithMods,
  materializeCopyWithMods,
} from "./mod-copy-resolver";

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

export {
  /* Semantic mapping types */
  type SemanticMappingKey,
  type SemanticMappingEntry,
  type SemanticMappingRegistry,
  type SemanticMappingDiagnosticCode,
  type SemanticMappingDiagnostic,
  type MappingMethod,
  type SemanticMappingResult,
  type SemanticMappingSuccess,
  type SemanticMappingFailure,
  /* Semantic mapping schema version */
  SEMANTIC_MAPPING_SCHEMA_VERSION,
  /* Semantic mapping guards */
  isSemanticMappingKey,
  isSemanticMappingEntry,
  isSemanticMappingRegistry,
  /* Semantic mapping validation */
  validateSemanticMappingEntry,
  validateSemanticMappingRegistry,
  /* Semantic mapping factory */
  createSemanticMappingRegistry,
} from "./semantic-mapping";

export {
  /* Semantic mapping resolution types */
  type SemanticMappingResolutionContext,
  type SemanticMappingBatchInput,
  type SemanticMappingBatchResult,
  /* Semantic mapping resolution */
  resolveSemanticMapping,
  resolveSemanticMappings,
} from "./semantic-mapping-resolution";

export {
  /* Semantic mapping fingerprint */
  computeSourceFingerprint,
} from "./semantic-mapping-fingerprint";

export {
  /* Projection types */
  type MechanicProjection,
  type ProjectionDiagnosticCode,
  type ProjectionDiagnostic,
  type ProjectionResult,
  /* Default projections registry */
  DEFAULT_PROJECTIONS,
  /* Projection guards */
  isMechanicProjection,
  /* Projection resolution */
  getDefaultProjection,
  createDefaultEffectPresentation,
  /* Projection validation */
  validateProjectionAssignment,
  validateDefaultProjections,
} from "./projection-defaults";

export {
  /* Species source inventory types */
  type FrozenReadonlySet,
  type SpeciesSourceInventoryDiagnostic,
  type KnownSpeciesSourceInventoryResult,
  /* Species source inventory functions */
  collectKnownSpeciesSources,
} from "./species-source-inventory";

export {
  /* Species source scope types */
  type SupportedSpeciesSourceEntry,
  type SupportedSpeciesSource,
  type SupportedSpeciesRuleset,
  type SpeciesSourceScopeContext,
  type SpeciesSourceScopeInput,
  type SpeciesParentIdentity,
  type SpeciesSourceScopeDiagnosticCode,
  type SpeciesSourceScopeDiagnostic,
  type SpeciesSourceScopeSuccess,
  type SpeciesSourceScopeFailure,
  type SpeciesSourceScopeResult,
  type SpeciesSourceScopeClassification,
  type SpeciesSourceScopeBatchResult,
  /* Species source scope registry */
  SUPPORTED_SPECIES_SOURCES,
  /* Species source scope functions */
  classifySpeciesSourceScope,
  classifySpeciesSourceScopeBatch,
} from "./species-source-scope";

export {
  /* Background source scope types */
  type SupportedBackgroundSourceEntry,
  type SupportedBackgroundSource,
  type SupportedBackgroundRuleset,
  type BackgroundSourceScopeContext,
  type BackgroundSourceScopeInput,
  type BackgroundSourceScopeDiagnosticCode,
  type BackgroundSourceScopeDiagnostic,
  type BackgroundSourceScopeSuccess,
  type BackgroundSourceScopeFailure,
  type BackgroundSourceScopeResult,
  type BackgroundSourceScopeClassification,
  type BackgroundSourceScopeBatchResult,
  /* Background source scope registry */
  SUPPORTED_BACKGROUND_SOURCES,
  /* Background source scope functions */
  classifyBackgroundSourceScope,
  classifyBackgroundSourceScopeBatch,
} from "./background-source-scope";

export {
  /* Class source scope types */
  type SupportedClassSourceEntry,
  type SupportedClassSource,
  type SupportedClassRuleset,
  type ClassSourceScopeContext,
  type ClassSourceScopeInput,
  type ClassSourceScopeDiagnosticCode,
  type ClassSourceScopeDiagnostic,
  type ClassSourceScopeSuccess,
  type ClassSourceScopeFailure,
  type ClassSourceScopeResult,
  type ClassSourceScopeClassification,
  type ClassSourceScopeBatchResult,
  /* Class source scope registry */
  SUPPORTED_CLASS_SOURCES,
  /* Class source scope functions */
  classifyClassSourceScope,
  classifyClassSourceScopeBatch,
} from "./class-source-scope";

export {
  /* Class index loader types */
  type ClassIndexDiagnosticCode,
  type ClassIndexDiagnostic,
  type IndexedClassEntry,
  type ClassIndexLoaderInput,
  type ClassIndexLoaderResult,
  /* Class index loader functions */
  loadClassIndex,
} from "./class-index-loader";

export {
  /* Optional-feature source scope types */
  type SupportedOptionalFeatureSourceEntry,
  type SupportedOptionalFeatureSource,
  type SupportedOptionalFeatureRuleset,
  type OptionalFeatureSourceScopeContext,
  type OptionalFeatureSourceScopeInput,
  type OptionalFeatureSourceScopeDiagnosticCode,
  type OptionalFeatureSourceScopeDiagnostic,
  type OptionalFeatureSourceScopeSuccess,
  type OptionalFeatureSourceScopeFailure,
  type OptionalFeatureSourceScopeResult,
  /* Optional-feature source scope registry */
  SUPPORTED_OPTIONAL_FEATURE_SOURCES,
  /* Optional-feature source scope functions */
  classifyOptionalFeatureSourceScope,
} from "./optional-feature-source-scope";

export {
  /* Optional-feature normalizer types */
  type OptionalFeatureNormalizerDiagnosticCode,
  type OptionalFeatureNormalizerDiagnostic,
  type OptionalFeatureNormalizerInput,
  type OptionalFeatureNormalizerResult,
  /* Optional-feature normalizer functions */
  normalizeOptionalFeatures,
} from "./optional-feature-normalizer";

export {
  /* Reference resolver types */
  type NormalizedEntity,
  type ReferenceLink,
  type RefResolverDiagnosticCode,
  type RefResolverDiagnostic,
  type ReferenceResolverInput,
  type ReferenceResolverResult,
  /* Reference resolver function */
  resolveReferences,
} from "./reference-resolver";

export {
  /* Compact index builder types */
  type CatalogableEntity,
  type CompactIndexDiagnosticCode,
  type CompactIndexDiagnostic,
  type CatalogIndexResult,
  type CompactIndexResult,
  /* Compact index builder functions */
  buildCompactIndex,
  entityToSummary,
  buildDetailPath,
} from "./compact-index-builder";

export {
  /* Compact index tag generator */
  generateTags,
} from "./compact-index-tag-generator";

export {
  /* Checksum functions */
  computeChecksum,
  computeChecksums,
} from "./checksum";

export {
  /* Manifest generator types */
  type ManifestGeneratorInput,
  /* Manifest generator function */
  generateManifest,
} from "./manifest-generator";

export {
  /* Validation report types */
  type Diagnostic,
  type UnresolvedReference,
  type ValidationReportInput,
  type ValidationReport,
  /* Validation report function */
  buildValidationReport,
} from "./validation-report";

export {
  /* Inventory report types */
  type InventoryReportInput,
  type InventoryReport,
  /* Inventory report function */
  buildInventoryReport,
} from "./inventory-report";

export {
  /* Catalog publisher types */
  type CatalogPublisherInput,
  type PublishResult,
  type PublishCurrentResult,
  type PublishCatalogReleaseResult,
  /* Catalog publisher function */
  publishCatalog,
  publishCurrentCatalogRevision,
  publishCatalogRelease,
} from "./catalog-publisher";

export { createSmokeCatalogInput, SMOKE_SOURCE_REVISION } from "./smoke-catalog";
