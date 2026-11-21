import type { Container } from '../di/container.js';
import { frameworkRegistrationKindForOperation, type ContainerRegistrationOperation } from '../di/container-registration.js';
import { ContainerLookupKey, ContainerLookupKeyKind } from '../di/container-key.js';
import { DiKeyIdentityEmitter } from '../di/di-key-identity-emitter.js';
import { registrationHidingOpenPressureAtContainerLoci, registrationOpenSeamCanHideDirectKey } from '../di/registration-open-pressure.js';
import type { DiWorldConstructionEmission } from '../di/world-construction.js';
import { SourceSpanRole } from '../kernel/address.js';
import type { IdentityHandle } from '../kernel/handles.js';
import type { KernelPublicationContext } from '../kernel/publication.js';
import { RegistryRegistrationAdmission, ResolverRegistrationAdmission } from '../registration/registration-admission.js';
import { FrameworkRegistrationKind } from '../registration/registration-reference.js';
import { sourceSpanForCheckerDeclaration } from '../type-system/declaration-source.js';
import type { TypeSystemProject } from '../type-system/project.js';
import type { ConfigurationRecognitionProjectResult } from './configuration-recognition-project-pass.js';

/** The default ISVGAnalyzer is a no-op. The full table is supplied by SVGAnalyzer.register. */
export type SvgAnalyzerService = 'noop' | 'standard' | 'open';

export function svgAnalyzerServiceLookup(
  publication: KernelPublicationContext,
  typeSystem: TypeSystemProject,
  configuration: ConfigurationRecognitionProjectResult,
  world: DiWorldConstructionEmission,
): (requestor: Container) => SvgAnalyzerService {
  const symbol = typeSystem.readProgramExportedSymbol('@aurelia/runtime-html', 'SVGAnalyzer');
  const analyzer = symbol == null ? null : sourceSpanForCheckerDeclaration(
    publication, typeSystem.checker, symbol, symbol.declarations ?? [], SourceSpanRole.Name,
  )?.identity.handle ?? null;
  const keyIdentity = new DiKeyIdentityEmitter(publication).emitExportedKeyIdentity(
    [], publication, typeSystem, ['@aurelia/runtime-html'], 'ISVGAnalyzer',
    publication.handles.identity('svg-analyzer:unresolved-interface'), null,
  );
  const key = new ContainerLookupKey(keyIdentity.identityHandle, ContainerLookupKeyKind.Interface, 'ISVGAnalyzer');
  const isStandardRegistration = (admission: ContainerRegistrationOperation['admission']) =>
    analyzer != null && admission instanceof RegistryRegistrationAdmission && admission.registryValue?.identityHandle === analyzer;
  return (requestor) => {
    const consulted = new Set<IdentityHandle>();
    let selected: ContainerRegistrationOperation | undefined;
    for (let container: Container | null = requestor; container != null; container = container.parent) {
      const identity = container.identityHandle;
      consulted.add(identity);
      selected = world.registrationOperations.find(({ container, admission }) => container.identityHandle === identity
        && (isStandardRegistration(admission) || (admission instanceof ResolverRegistrationAdmission && admission.targetKey?.identityHandle === key.identityHandle)));
      if (selected) break;
    }
    const unresolved = registrationHidingOpenPressureAtContainerLoci(
      world, configuration.readConfiguration().openSeamScopes, consulted,
      // StandardConfiguration's unresolved resource/syntax families do not install an SVG analyzer.
      operation => operation === null || (
        frameworkRegistrationKindForOperation(operation) !== FrameworkRegistrationKind.StandardConfiguration
        && !isStandardRegistration(operation.admission) && registrationOpenSeamCanHideDirectKey(operation, key)
      ),
    );
    if (unresolved.some(fact => !selected || fact.operation == null || fact.containerIdentityHandle !== selected.container.identityHandle
      || fact.operation.ordinal < selected.ordinal)) return 'open';
    if (!selected) return 'noop';
    return isStandardRegistration(selected.admission) ? 'standard' : 'open';
  };
}
